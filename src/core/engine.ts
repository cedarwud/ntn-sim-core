/**
 * Phase 3 simulation engine for ntn-sim-core.
 *
 * Upgrades Phase 2 single-beam to multi-beam with energy tracking.
 * Pure computation — NO React, Three.js, or scene code.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3, §4
 *   - Source tiers: per-module (see channel/, handover/, kpi/, beam/, energy/)
 */

import type { SimulationSnapshot, SatelliteState, SatelliteBeamSnapshot, BhSlotSnapshot, DapsSnapshot, UeState, HoLogEntry } from './common/types';
import { createRng } from './common/types';
import type { Policy, PolicyObservation } from './policy/types';
import type { TrajectoryCache, TrajectorySample } from './orbit/types';
import type { ProfileConfig } from './profiles/types';
import type { HandoverManager, HandoverCandidate, ServingState } from './handover/types';
import type { KpiAccumulator } from './kpi/accumulator';
import { getActivePassesAt, interpolatePass } from './orbit/trajectory-cache';
import { computeLinkBudget } from './channel/link-budget';
import { computeSinr } from './channel/sinr';
import { computeOffAxisAngle, computeBeamGain } from './channel/beam-gain';
import { computeDopplerShiftHz, estimateRadialVelocityKmS, dopplerSinrDegradationDb } from './channel/doppler';
import type { InterferingSignal } from './channel/types';
import { createBaselineFromConfig } from './handover/baselines';
import { createKpiAccumulator } from './kpi/accumulator';
import { generateUePositions } from './ue/position-generator';
import type { UePosition } from './ue/position-generator';
import { createMobilityUpdater } from './ue/mobility';
import { generateTrafficDemand } from './traffic/generator';
import type { TrafficConfig } from './traffic/generator';

// Phase 3: beam + energy imports
import { generateHexagonalBeamLayout } from './beam/layout';
import { selectBeamForUe } from './beam/selection';
import type { SatelliteBeamLayout, BeamSelectionResult } from './beam/types';
import { createEnergyLayer1, DEFAULT_ENERGY_LAYER1_CONFIG } from './energy/layer1';
import type { EnergyLayer1Manager } from './energy/layer1';
import type { EnergyEfficiencyMetrics, EnergyLayer1Config } from './energy/types';

// Phase 4/5: BH scheduler + Energy Layer 2
import { createBhScheduler } from './beam/scheduler';
import type { BhScheduler, BhSlotDecision } from './beam/scheduler';
import { createEnergyLayer2 } from './energy/layer2';
import type { EnergyLayer2Manager, SatelliteEnergyLayer2State } from './energy/layer2';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Boltzmann constant in dBW/(K·Hz). */
const K_BOLTZMANN_DBW_PER_K_HZ = -228.6;

/** Primary UE ID (beam center, used for handover decisions). */
const PRIMARY_UE_ID = 'ue-0';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface SimEngineConfig {
  profile: ProfileConfig;
  trajectoryCache: TrajectoryCache;
  /** Optional RL/DRL policy. If provided, selectAction() is called every tick. */
  policy?: Policy;
}

export interface SimEngine {
  /** Advance by one tick. Returns the snapshot for this tick. */
  tick(timeSec: number, tickNumber: number): SimulationSnapshot;
  /** Get the handover manager (for event draining). */
  getHandoverManager(): HandoverManager;
  /** Get KPI accumulator (for finalization). */
  getKpiAccumulator(): KpiAccumulator;
  /** Get energy metrics from the last tick, or null if energy layer disabled. */
  getEnergyMetrics(): EnergyEfficiencyMetrics | null;
  /** Get all satellite energy Layer 2 states. Empty if L2 not active. */
  getEnergyLayer2States(): SatelliteEnergyLayer2State[];
  /** Get current BH slot decision, or null if BH scheduler not active. */
  getBhSlotDecision(): BhSlotDecision | null;
  /**
   * MG2 / VAL-POLICY-001: Return the policy observation built during the last tick.
   * Returns null before the first tick. Used by external pull-model RL controllers.
   */
  getObservation(): import('./policy/types').PolicyObservation | null;
  /**
   * MG2 / VAL-POLICY-001: Queue an external policy action to be applied on the next tick.
   * Overrides any injected `policy.selectAction()` for that tick.
   * Pass null to clear any pending action.
   */
  applyAction(action: import('./policy/types').PolicyAction | null): void;
  /** Reset all state. */
  reset(): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute thermal noise power in dBm from noise temperature, bandwidth, and noise figure.
 * MS5 fix: includes UE receiver noise figure.
 * T_sys = T_ant + T_0·(10^(NF/10) - 1) where T_0 = 290K
 * N_dBm = -228.6 + 10·log10(T_sys) + 10·log10(BW_Hz) + 30
 *
 * @source beamHO-bench computeNoiseDbm(), 3GPP TR 38.821
 */
function noisePowerDbm(noiseTemperatureK: number, bandwidthMhz: number, noiseFigureDb?: number): number {
  const T0 = 290; // reference temperature in K
  const nfLinear = noiseFigureDb !== undefined ? Math.pow(10, noiseFigureDb / 10) : 1;
  const tSysK = noiseTemperatureK + T0 * (nfLinear - 1);
  const bwHz = bandwidthMhz * 1e6;
  return K_BOLTZMANN_DBW_PER_K_HZ + 10 * Math.log10(tSysK) + 10 * Math.log10(bwHz) + 30;
}

/**
 * Compute EIRP in dBm from EIRP density (dBW/MHz) and bandwidth (MHz).
 * EIRP_dBm = eirpDensity_dBW/MHz + 10·log10(BW_MHz) + 30
 */
function eirpDbm(eirpDensityDbwPerMhz: number, bandwidthMhz: number): number {
  return eirpDensityDbwPerMhz + 10 * Math.log10(bandwidthMhz) + 30;
}

/** Build a SatelliteState from interpolated trajectory sample. */
function sampleToSatState(satId: string, s: TrajectorySample): SatelliteState {
  return {
    id: satId,
    latDeg: s.latDeg,
    lonDeg: s.lonDeg,
    altKm: s.altKm,
    azimuthDeg: s.azimuthDeg,
    elevationDeg: s.elevationDeg,
    rangeKm: s.rangeKm,
    isVisible: s.isVisible,
  };
}

/** Convert dBm to linear milliwatts. */
function dbmToMw(dbm: number): number {
  return Math.pow(10, dbm / 10);
}

/** Convert linear milliwatts to dBm. */
function mwToDbm(mw: number): number {
  return 10 * Math.log10(mw);
}

/**
 * Compute Tier 6 Doppler SINR degradation in dB.
 * Uses elevation angle to estimate radial velocity, then ICI power formula.
 * Returns 0 if Tier 6 is disabled in profile.
 */
function computeDopplerDegradationDb(
  elevationDeg: number,
  altitudeKm: number,
  frequencyGhz: number,
  tier6Enabled: boolean,
  subcarrierSpacingKhz: number = 30,
): number {
  if (!tier6Enabled) return 0;
  const GM_KM3_S2 = 398600.4418;
  const R_E_KM = 6371;
  const orbitalVelocityKmS = Math.sqrt(GM_KM3_S2 / (R_E_KM + altitudeKm));
  // isApproaching: sign does not affect magnitude (dopplerSinrDegradationDb uses abs)
  const radialVelocityKmS = estimateRadialVelocityKmS(orbitalVelocityKmS, elevationDeg, true);
  const dopplerHz = computeDopplerShiftHz(radialVelocityKmS, frequencyGhz);
  return dopplerSinrDegradationDb(dopplerHz, subcarrierSpacingKhz);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createSimEngine(config: SimEngineConfig): SimEngine {
  const { profile, trajectoryCache, policy = null } = config;

  // Derived RF parameters (computed once)
  // P1-path: if tx_power_per_beam_dbm (spec P1) is set, derive EIRP from it +
  // peak_gain_dbi - implementation_loss_db. This aligns the signal path with the
  // EE path and removes the eirp_density_dbw_per_mhz derived-quantity override.
  // Fallback: use eirp_density_dbw_per_mhz (Advanced compatibility input, spec §8).
  let txEirp: number;
  if (profile.rf.tx_power_per_beam_dbm !== undefined) {
    // EIRP(dBm) = P1(dBm) + G_peak(dBi) - L_impl(dB)
    const implLoss = profile.rf.implementation_loss_db ?? 0;
    txEirp = profile.rf.tx_power_per_beam_dbm + profile.antenna.peak_gain_dbi - implLoss;
  } else {
    txEirp = eirpDbm(profile.rf.eirp_density_dbw_per_mhz, profile.rf.bandwidth_mhz);
  }
  const noiseDbm = noisePowerDbm(profile.rf.noise_temperature_k, profile.rf.bandwidth_mhz, profile.rf.noise_figure_db);
  const deploymentEnvironment = profile.channel.deployment_environment ?? 'suburban';
  const largeScaleModel =
    profile.channel.large_scale_model ??
    (profile.channel.tier4_atmospheric ? '3gpp-extended' : '3gpp-baseline');
  const implementationLossDb = profile.rf.implementation_loss_db ?? 0;

  // MG2 / VAL-POLICY-001: pull-model RL interface state
  let lastObservation: import('./policy/types').PolicyObservation | null = null;
  let pendingExternalAction: import('./policy/types').PolicyAction | null = null;

  // Seeded RNG for shadow fading
  let rng = createRng(profile.seed);

  // Handover manager (Phase A shared, or Phase B primary fallback)
  let hoManager = createBaselineFromConfig(profile.handover);

  // MS2: Phase B independent HO — one HandoverManager per UE
  const independentHandover = profile.ueConfig.independentHandover === true;
  const hoManagers = new Map<string, HandoverManager>();

  // KPI accumulator
  let kpiAcc = createKpiAccumulator({
    sinrOutageThresholdDb: profile.handover.rlf_qout_db ?? -8, // PAP-2022-SINR-ELEVATION; configurable via handover.rlf_qout_db
    pingPongWindowSec: 5,
    bandwidthMhz: profile.rf.bandwidth_mhz,
  });

  // ---------------------------------------------------------------------------
  // C3 fix: Multi-UE position generation
  // ---------------------------------------------------------------------------

  const ueCount = Math.max(1, profile.ueConfig.count);
  const beamRadiusKm = profile.antenna.beam_diameter_km / 2;
  let uePositions: UePosition[] = generateUePositions(
    ueCount, beamRadiusKm, profile.ueConfig.distribution, () => rng.next(),
  );

  // MS2: Populate per-UE HO managers for Phase B
  if (independentHandover) {
    for (const ue of uePositions) {
      hoManagers.set(ue.id, createBaselineFromConfig(profile.handover));
    }
  }

  // P4 fix: UE mobility updater
  let mobilityUpdater = createMobilityUpdater(
    {
      model: profile.ueConfig.speed_kmh > 0 ? 'random-walk' : 'static',
      speedKmh: profile.ueConfig.speed_kmh,
      boundaryRadiusKm: beamRadiusKm,
    },
    () => rng.next(),
  );

  // ---------------------------------------------------------------------------
  // Phase 3: multi-beam flag + beam layouts + energy manager
  // ---------------------------------------------------------------------------

  const isMultiBeam = profile.beam.num_beams > 1;

  // Pre-generate beam layouts for all possible satellite IDs.
  // Layouts are generated on-demand and cached in this map.
  const beamLayouts = new Map<string, SatelliteBeamLayout>();

  function getOrCreateBeamLayout(satId: string, altKm: number): SatelliteBeamLayout {
    let layout = beamLayouts.get(satId);
    if (!layout) {
      layout = generateHexagonalBeamLayout({
        satId,
        numBeams: profile.beam.num_beams,
        beamDiameterKm: profile.antenna.beam_diameter_km,
        altitudeKm: altKm,
        frf: profile.beam.frf,
      });
      beamLayouts.set(satId, layout);
    }
    return layout;
  }

  // Energy layer 1 (optional)
  let energyManager: EnergyLayer1Manager | null = null;
  if (profile.energy.layer1_enabled) {
    // EE-path P1 convergence: if tx_power_per_beam_dbm (spec P1) is set in the
    // profile, use it as the Energy Layer 1 per-beam cap. This aligns the EE path
    // with the signal path (both driven by the same P1 value).
    // Fallback: DEFAULT_ENERGY_LAYER1_CONFIG.txPowerPerBeamDbm = 40 dBm (spec P1
    // assumption, ASSUME-ENERGY-001).
    //
    // NOTE: max_tx_power_dbm (P2 aggregate) is intentionally NOT used here; it is
    // the BH power-budget ceiling, not a per-beam cap. See types.ts RfConfig.
    const energyConfig: EnergyLayer1Config = {
      ...DEFAULT_ENERGY_LAYER1_CONFIG,
      ...(profile.rf.tx_power_per_beam_dbm !== undefined
        ? { txPowerPerBeamDbm: profile.rf.tx_power_per_beam_dbm }
        : {}),
    };
    energyManager = createEnergyLayer1(energyConfig);
  }

  // Last tick's energy metrics
  let lastEnergyMetrics: EnergyEfficiencyMetrics | null = null;

  // ---------------------------------------------------------------------------
  // BH Scheduler (only when earth-fixed-bh + multi-beam)
  // ---------------------------------------------------------------------------

  const hasBhConfig = profile.beam.bh_max_active_per_slot !== undefined;
  const isBhActive = isMultiBeam && (profile.beamSemantics === 'earth-fixed-bh' || hasBhConfig);
  let bhScheduler: BhScheduler | null = null;
  let lastBhSlotDecision: BhSlotDecision | null = null;

  // BH scheduler is created lazily once beam layouts exist (need at least one layout).
  // We track whether it has been initialized.
  let bhSchedulerInitialized = false;

  function ensureBhScheduler(): void {
    if (!isBhActive || bhSchedulerInitialized) return;
    if (beamLayouts.size === 0) return;
    bhScheduler = createBhScheduler(
      {
        strategy: profile.beam.bh_strategy ?? 'round-robin',
        maxActiveBeamsPerSlot: profile.beam.bh_max_active_per_slot ?? Math.min(4, profile.beam.num_beams),
        frameDurationSec: profile.beam.bh_frame_duration_sec,
        slotsPerFrame: profile.beam.bh_slots_per_frame,
        // P2 cap wiring: prefer explicit bh_power_budget_w; if absent, derive from
        // rf.max_tx_power_dbm (spec P2: 13 dBW ≈ 20 W). This keeps the BH scheduler
        // bounded by the spec power cap even when the field is not explicitly set.
        // Signal path (eirp_density) remains independent per spec §8 boundary.
        powerBudgetW:
          profile.beam.bh_power_budget_w ??
          (profile.rf.max_tx_power_dbm != null
            ? Math.pow(10, profile.rf.max_tx_power_dbm / 10) / 1000
            : undefined),
      },
      beamLayouts,
    );
    bhSchedulerInitialized = true;
  }

  // ---------------------------------------------------------------------------
  // Energy Layer 2 (optional, VAL-EE-002)
  // ---------------------------------------------------------------------------

  let energyL2Manager: EnergyLayer2Manager | null = null;
  if (profile.energy.layer2_enabled) {
    energyL2Manager = createEnergyLayer2({
      altitudeKm: profile.orbital.altitude_km,
      ...profile.energy.layer2_overrides,
    });
  }

  /** Set of satIds already initialized in L2. */
  const l2InitializedSats = new Set<string>();

  // Non-LEO satellite IDs: excluded from handover candidate selection.
  // GEO/MEO sats are visible for SINR/display but do not participate in HO.
  const nonLeoSatIds = new Set<string>();
  if (profile.orbital.geoSatellites) {
    for (const geo of profile.orbital.geoSatellites) nonLeoSatIds.add(geo.id);
  }
  if (profile.orbital.extra_shells) {
    for (const shell of profile.orbital.extra_shells) {
      if (shell.orbitType && shell.orbitType !== 'leo') {
        for (let p = 0; p < shell.num_planes; p++) {
          for (let s = 0; s < shell.sats_per_plane; s++) {
            nonLeoSatIds.add(`${shell.id}-P${p}-S${s}`);
          }
        }
      }
    }
  }
  if (profile.orbital.orbitType && profile.orbital.orbitType !== 'leo') {
    // Primary shell is non-LEO — all its sats excluded from HO
    for (let p = 0; p < profile.orbital.num_planes; p++) {
      for (let s = 0; s < profile.orbital.sats_per_plane; s++) {
        nonLeoSatIds.add(`${profile.id}-shell-P${p}-S${s}`);
      }
    }
  }

  /** Tick step size tracking for L2. */
  let lastTickTimeSec: number | null = null;

  // ---------------------------------------------------------------------------
  // Phase 2 SINR path (single beam, backwards compatible)
  // ---------------------------------------------------------------------------

  function computeSatSinrPhase2(
    servingSample: TrajectorySample,
    interferingSamples: TrajectorySample[],
  ): number {
    // Link budget for serving satellite
    const servingChannel = computeLinkBudget({
      distanceKm: servingSample.rangeKm,
      frequencyGhz: profile.rf.frequency_ghz,
      txEirpDbm: txEirp,
      elevationDeg: servingSample.elevationDeg,
      environment: deploymentEnvironment,
      largeScaleModel,
      beamGainInput: profile.channel.tier3_beam_gain
        ? {
            offAxisAngleDeg: 0, // UE at beam center for serving
            model: profile.antenna.model,
            peakGainDbi: profile.antenna.peak_gain_dbi,
            beamDiameterKm: profile.antenna.beam_diameter_km,
            altitudeKm: servingSample.altKm,
            slantRangeKm: servingSample.rangeKm,
          }
        : null,
      noisePowerDbm: noiseDbm,
      implementationLossDb,
      tier1LargeScale: profile.channel.tier1_large_scale,
      tier2Clutter: profile.channel.tier2_clutter,
      tier3BeamGain: profile.channel.tier3_beam_gain,
      tier4Atmospheric: profile.channel.tier4_atmospheric,
      tier5Fading: profile.channel.tier5_fading,
      rngNext: profile.channel.tier1_large_scale || profile.channel.tier5_fading ? () => rng.next() : null,
      isLos: servingSample.elevationDeg >= (profile.channel.los_elevation_deg ?? 20), // LOS threshold: profile.channel.los_elevation_deg (default 20°, ASSUME-SINR-LOS-THRESHOLD)
    });

    // C1 fix: each interferer computes its own full link budget
    const interferingSignals: InterferingSignal[] = [];
    for (const iSample of interferingSamples) {
      const iChannel = computeLinkBudget({
        distanceKm: iSample.rangeKm,
        frequencyGhz: profile.rf.frequency_ghz,
        txEirpDbm: txEirp,
        elevationDeg: iSample.elevationDeg,
        environment: deploymentEnvironment,
        largeScaleModel,
        beamGainInput: profile.channel.tier3_beam_gain
          ? {
              offAxisAngleDeg: computeOffAxisAngle(
                iSample.latDeg, iSample.lonDeg,
                profile.observer.latitudeDeg, profile.observer.longitudeDeg,
                iSample.altKm,
              ),
              model: profile.antenna.model,
              peakGainDbi: profile.antenna.peak_gain_dbi,
              beamDiameterKm: profile.antenna.beam_diameter_km,
              altitudeKm: iSample.altKm,
              slantRangeKm: iSample.rangeKm,
            }
          : null,
        noisePowerDbm: noiseDbm,
        implementationLossDb,
        tier1LargeScale: profile.channel.tier1_large_scale,
        tier2Clutter: profile.channel.tier2_clutter,
        tier3BeamGain: profile.channel.tier3_beam_gain,
        tier4Atmospheric: profile.channel.tier4_atmospheric,
        tier5Fading: profile.channel.tier5_fading,
        rngNext: profile.channel.tier1_large_scale || profile.channel.tier5_fading ? () => rng.next() : null,
        isLos: iSample.elevationDeg >= (profile.channel.los_elevation_deg ?? 20),
      });
      interferingSignals.push({
        rxPowerDbm: iChannel.rxPowerDbm,
      });
    }

    // Compute SINR — use rxPowerDbm from full link budget (all enabled tiers)
    const sinrResult = computeSinr({
      servingRxPowerDbm: servingChannel.rxPowerDbm,
      noisePowerDbm: noiseDbm,
      interferingSignals,
    });

    // Tier 6 Doppler ICI degradation (P1 fix: wire Doppler into SINR path)
    const dopplerLossDb = computeDopplerDegradationDb(
      servingSample.elevationDeg,
      servingSample.altKm,
      profile.rf.frequency_ghz,
      profile.channel.tier6_doppler ?? false,
      profile.channel.subcarrier_spacing_khz ?? 30,
    );

    return sinrResult.sinrDb - dopplerLossDb;
  }

  // ---------------------------------------------------------------------------
  // Phase 3 SINR path (multi-beam with intra- and inter-satellite interference)
  // ---------------------------------------------------------------------------

  /**
   * Compute SINR for a UE served by the best beam of a given satellite,
   * accounting for:
   *   (a) intra-satellite interference from co-channel (same reuse group) beams
   *   (b) inter-satellite interference from other visible satellites' beams
   */
  function computeSatSinrPhase3(
    servingSatId: string,
    servingSample: TrajectorySample,
    servingSelection: BeamSelectionResult,
    otherSats: Array<{ satId: string; sample: TrajectorySample; selection: BeamSelectionResult }>,
  ): number {
    // --- Serving signal ---
    const servingChannel = computeLinkBudget({
      distanceKm: servingSample.rangeKm,
      frequencyGhz: profile.rf.frequency_ghz,
      txEirpDbm: txEirp,
      elevationDeg: servingSample.elevationDeg,
      environment: deploymentEnvironment,
      largeScaleModel,
      beamGainInput: profile.channel.tier3_beam_gain
        ? {
            offAxisAngleDeg: servingSelection.offAxisAngleDeg,
            model: profile.antenna.model,
            peakGainDbi: profile.antenna.peak_gain_dbi,
            beamDiameterKm: profile.antenna.beam_diameter_km,
            altitudeKm: servingSample.altKm,
            slantRangeKm: servingSample.rangeKm,
          }
        : null,
      noisePowerDbm: noiseDbm,
      implementationLossDb,
      tier1LargeScale: profile.channel.tier1_large_scale,
      tier2Clutter: profile.channel.tier2_clutter,
      tier3BeamGain: profile.channel.tier3_beam_gain,
      tier4Atmospheric: profile.channel.tier4_atmospheric,
      tier5Fading: profile.channel.tier5_fading,
      rngNext: profile.channel.tier1_large_scale || profile.channel.tier5_fading ? () => rng.next() : null,
      isLos: servingSample.elevationDeg >= (profile.channel.los_elevation_deg ?? 20),
    });

    // --- C1 fix: collect per-interferer channel data ---
    const interferingSignals: InterferingSignal[] = [];

    // Find serving beam's reuse group
    const servingBeamEntry = servingSelection.allBeams.find(
      (b) => b.beamId === servingSelection.bestBeamId,
    );
    const servingReuseGroup = servingBeamEntry?.reuseGroup ?? 0;

    // (a) Intra-satellite: other beams on SAME satellite in same reuse group
    // These share the same slant range as the serving satellite
    if (profile.channel.tier3_beam_gain) {
      for (const beam of servingSelection.allBeams) {
        if (beam.beamId === servingSelection.bestBeamId) continue;
        if (beam.reuseGroup !== servingReuseGroup) continue;
        const iChannel = computeLinkBudget({
          distanceKm: servingSample.rangeKm,
          frequencyGhz: profile.rf.frequency_ghz,
          txEirpDbm: txEirp,
          elevationDeg: servingSample.elevationDeg,
          environment: deploymentEnvironment,
          largeScaleModel,
          beamGainInput: {
            offAxisAngleDeg: beam.offAxisAngleDeg,
            model: profile.antenna.model,
            peakGainDbi: profile.antenna.peak_gain_dbi,
            beamDiameterKm: profile.antenna.beam_diameter_km,
            altitudeKm: servingSample.altKm,
            slantRangeKm: servingSample.rangeKm,
          },
          noisePowerDbm: noiseDbm,
          implementationLossDb,
          tier1LargeScale: profile.channel.tier1_large_scale,
          tier2Clutter: profile.channel.tier2_clutter,
          tier3BeamGain: true,
          tier4Atmospheric: profile.channel.tier4_atmospheric,
          tier5Fading: profile.channel.tier5_fading,
          rngNext: profile.channel.tier1_large_scale || profile.channel.tier5_fading ? () => rng.next() : null,
          isLos: servingSample.elevationDeg >= (profile.channel.los_elevation_deg ?? 20),
        });
        interferingSignals.push({
          rxPowerDbm: iChannel.rxPowerDbm,
        });
      }

      // (b) Inter-satellite: beams from OTHER visible satellites
      // C1 fix: each uses its own slant range → its own FSPL
      for (const other of otherSats) {
        const crossOffAxisDeg = computeOffAxisAngle(
          other.sample.latDeg, other.sample.lonDeg,
          profile.observer.latitudeDeg, profile.observer.longitudeDeg,
          other.sample.altKm,
        );
        const iChannel = computeLinkBudget({
          distanceKm: other.sample.rangeKm,
          frequencyGhz: profile.rf.frequency_ghz,
          txEirpDbm: txEirp,
          elevationDeg: other.sample.elevationDeg,
          environment: deploymentEnvironment,
          largeScaleModel,
          beamGainInput: {
            offAxisAngleDeg: crossOffAxisDeg,
            model: profile.antenna.model,
            peakGainDbi: profile.antenna.peak_gain_dbi,
            beamDiameterKm: profile.antenna.beam_diameter_km,
            altitudeKm: other.sample.altKm,
            slantRangeKm: other.sample.rangeKm,
          },
          noisePowerDbm: noiseDbm,
          implementationLossDb,
          tier1LargeScale: profile.channel.tier1_large_scale,
          tier2Clutter: profile.channel.tier2_clutter,
          tier3BeamGain: true,
          tier4Atmospheric: profile.channel.tier4_atmospheric,
          tier5Fading: profile.channel.tier5_fading,
          rngNext: profile.channel.tier1_large_scale || profile.channel.tier5_fading ? () => rng.next() : null,
          isLos: other.sample.elevationDeg >= (profile.channel.los_elevation_deg ?? 20),
        });
        interferingSignals.push({
          rxPowerDbm: iChannel.rxPowerDbm,
        });
      }
    }

    const sinrResult = computeSinr({
      servingRxPowerDbm: servingChannel.rxPowerDbm,
      noisePowerDbm: noiseDbm,
      interferingSignals,
    });

    // Tier 6 Doppler ICI degradation (P1 fix: wire Doppler into SINR path)
    const dopplerLossDb3 = computeDopplerDegradationDb(
      servingSample.elevationDeg,
      servingSample.altKm,
      profile.rf.frequency_ghz,
      profile.channel.tier6_doppler ?? false,
      profile.channel.subcarrier_spacing_khz ?? 30,
    );

    return sinrResult.sinrDb - dopplerLossDb3;
  }

  // ---------------------------------------------------------------------------
  // MS2 helper: per-UE SINR from a pre-computed satellite entry
  //
  // For Phase B, each UE needs its own SINR from each candidate satellite.
  // We derive it from the pre-computed beam-center SINR by applying beam gain
  // roll-off at the UE's actual offset position.
  //
  // Multi-beam: selects the UE's closest beam; single-beam: applies radial roll-off.
  // ---------------------------------------------------------------------------

  function computeUeSinrFromSatEntry(
    ue: UePosition,
    satEntry: {
      satId: string;
      sample: TrajectorySample;
      sinrDb: number;
      bestBeamId: string;
      referenceOffAxisAngleDeg: number;
    },
  ): { sinrDb: number; beamId: string } | null {
    if (ue.id === PRIMARY_UE_ID) {
      // Primary UE at beam center — use pre-computed SINR directly
      return { sinrDb: satEntry.sinrDb, beamId: satEntry.bestBeamId };
    }

    const slantRangeKm = satEntry.sample.rangeKm;
    const referenceGainDb = computeBeamGain({
      offAxisAngleDeg: satEntry.referenceOffAxisAngleDeg,
      model: profile.antenna.model,
      peakGainDbi: profile.antenna.peak_gain_dbi,
      beamDiameterKm: profile.antenna.beam_diameter_km,
      altitudeKm: satEntry.sample.altKm,
      slantRangeKm,
    });
    const activeBeamIds = lastBhSlotDecision?.activeBeamsPerSat.get(satEntry.satId);
    if (lastBhSlotDecision && (!activeBeamIds || activeBeamIds.length === 0)) {
      return null;
    }

    if (isMultiBeam && profile.channel.tier3_beam_gain) {
      // Multi-beam: select closest beam for UE's ground offset
      const layout = getOrCreateBeamLayout(satEntry.satId, satEntry.sample.altKm);
      const ueSelection = selectBeamForUe(
        layout,
        ue.offsetEastKm,
        ue.offsetNorthKm,
        profile.antenna,
        activeBeamIds,
      );
      // Gain at UE position relative to the new best beam boresight
      const gainDb = computeBeamGain({
        offAxisAngleDeg: ueSelection.offAxisAngleDeg,
        model: profile.antenna.model,
        peakGainDbi: profile.antenna.peak_gain_dbi,
        beamDiameterKm: profile.antenna.beam_diameter_km,
        altitudeKm: satEntry.sample.altKm,
        slantRangeKm,
      });
      return {
        sinrDb: satEntry.sinrDb + (gainDb - referenceGainDb),
        beamId: ueSelection.bestBeamId,
      };
    }

    // Single-beam: radial beam gain roll-off from beam center
    const ueOffAxisDeg = Math.atan(ue.distanceFromCenterKm / slantRangeKm) * (180 / Math.PI);
    const gainReductionDb = computeBeamGain({
      offAxisAngleDeg: ueOffAxisDeg,
      model: profile.antenna.model,
      peakGainDbi: profile.antenna.peak_gain_dbi,
      beamDiameterKm: profile.antenna.beam_diameter_km,
      altitudeKm: satEntry.sample.altKm,
      slantRangeKm,
    });
    return {
      sinrDb: satEntry.sinrDb + (gainReductionDb - referenceGainDb),
      beamId: satEntry.bestBeamId,
    };
  }

  // ---------------------------------------------------------------------------
  // Interruption accounting (A9)
  // ---------------------------------------------------------------------------

  /**
   * Compute HO interruption duration in ms.
   *
   * Hard-HO / A3 / A4 / D2 / CHO: interruption ≈ RTT = 2 × one-way propagation delay.
   * DAPS / MC-HO: dual-active link maintained → interruption ≈ 0 by design.
   *
   * @source 3GPP TS 38.300 §6.18.2 (hard-HO interruption), TR 38.821 §6.2.1 (NTN DAPS)
   */
  function computeInterruptionMs(
    targetSatId: string | undefined,
    satSinrs: Array<{ satId: string; sample: { rangeKm: number } }>,
  ): number {
    const hoType = profile.handover.type;
    if (hoType === 'daps' || hoType === 'mc-ho') return 0;
    // RTT = 2 × one-way propagation delay (speed of light = 299.792 km/ms)
    const entry = targetSatId ? satSinrs.find((s) => s.satId === targetSatId) : undefined;
    if (!entry) return 0;
    return 2 * entry.sample.rangeKm / 299.792;
  }

  // ---------------------------------------------------------------------------
  // Tick
  // ---------------------------------------------------------------------------

  function doTick(timeSec: number, tickNumber: number): SimulationSnapshot {
    // Accumulate HO log entries across both Phase A and Phase B paths
    const tickHoLog: HoLogEntry[] = [];

    // 0. P4: update UE positions (mobility)
    const tickStepSec = lastTickTimeSec !== null ? timeSec - lastTickTimeSec : 1;
    mobilityUpdater.update(uePositions, tickStepSec);

    // 1. Get active satellites
    const activePasses = getActivePassesAt(trajectoryCache, timeSec);

    // 2. Interpolate positions for all active satellites
    const satSamples: Array<{ satId: string; sample: TrajectorySample }> = [];
    for (const { satId, pass } of activePasses) {
      const sample = interpolatePass(pass, timeSec);
      if (sample && sample.elevationDeg > 0) {
        satSamples.push({ satId, sample });
      }
    }

    // 2b. Energy Layer 2: init new satellites, filter blocked ones
    const stepSec = lastTickTimeSec !== null ? timeSec - lastTickTimeSec : 1;
    lastTickTimeSec = timeSec;

    if (energyL2Manager) {
      for (const { satId } of satSamples) {
        if (!l2InitializedSats.has(satId)) {
          energyL2Manager.initSatellite(satId);
          l2InitializedSats.add(satId);
        }
      }
    }

    // 2c. BH scheduler: ensure initialized + get slot decision
    if (isBhActive) {
      // Ensure beam layouts exist for all visible sats before scheduler init
      for (const { satId, sample } of satSamples) {
        const layout = getOrCreateBeamLayout(satId, sample.altKm);
        // Register newly-risen satellites with the BH scheduler
        if (bhScheduler) {
          bhScheduler.registerSatellite(satId, layout);
        }
      }
      ensureBhScheduler();
      if (bhScheduler) {
        // C7: generate per-beam demand map for demand-aware/power-aware strategies
        let demandPerBeam: Map<string, number> | undefined;
        const trafficModel = profile.beam.bh_traffic_model;
        if (trafficModel && trafficModel !== 'uniform') {
          demandPerBeam = new Map();
          for (const [satId, layout] of beamLayouts) {
            const trafficCfg: TrafficConfig = {
              model: trafficModel,
              numCells: layout.beams.length,
              meanArrivalRatePerSec: profile.beam.bh_traffic_arrival_rate ?? 10,
            };
            const cellDemands = generateTrafficDemand(trafficCfg, () => rng.next(), timeSec);
            const sortedBeamIds = [...layout.beams.map((b) => b.beamId)].sort();
            for (let i = 0; i < cellDemands.length; i++) {
              demandPerBeam.set(sortedBeamIds[i] ?? `${satId}-b${i}`, cellDemands[i].demandBps);
            }
          }
        }
        // Build sinrPerBeam from last observation for sinr-greedy strategy (uses t-1 SINR).
        const sinrPerBeam = new Map<string, number>();
        if (lastObservation) {
          for (const satObs of lastObservation.satellites) {
            const layout = beamLayouts.get(satObs.satId);
            if (layout) {
              for (const beam of layout.beams) {
                sinrPerBeam.set(beam.beamId, satObs.sinrDb);
              }
            }
          }
        }
        lastBhSlotDecision = bhScheduler.getSlotDecision(timeSec, demandPerBeam, sinrPerBeam);
      }

      // Force current serving beam active so it is never filtered out of SINR computation.
      if (lastBhSlotDecision) {
        const servingNow = independentHandover
          ? hoManagers.get(PRIMARY_UE_ID)?.getState().serving ?? null
          : hoManager.getState().serving;
        if (servingNow) {
          const activeForSat = lastBhSlotDecision.activeBeamsPerSat.get(servingNow.satId);
          if (activeForSat) {
            if (!activeForSat.includes(servingNow.beamId)) {
              lastBhSlotDecision.activeBeamsPerSat.set(servingNow.satId, [servingNow.beamId, ...activeForSat]);
            }
          } else {
            // Serving satellite has no BH schedule entry yet — add serving beam
            lastBhSlotDecision.activeBeamsPerSat.set(servingNow.satId, [servingNow.beamId]);
          }
        }
      }
    }

    // 3. Compute SINR + beam selection for each visible satellite
    let satSinrs: Array<{
      satId: string;
      sample: TrajectorySample;
      sinrDb: number;
      bestBeamId: string;
      referenceOffAxisAngleDeg: number;
    }>;

    if (!isMultiBeam) {
      // --- Phase 2 path: single beam per satellite ---
      satSinrs = [];
      for (let i = 0; i < satSamples.length; i++) {
        const { satId, sample } = satSamples[i];
        const others = satSamples
          .filter((_, j) => j !== i)
          .map((s) => s.sample);
        const sinrDb = computeSatSinrPhase2(sample, others);
        satSinrs.push({
          satId,
          sample,
          sinrDb,
          bestBeamId: `${satId}-b0`,
          referenceOffAxisAngleDeg: 0,
        });
      }
    } else {
      // --- Phase 3 path: multi-beam ---
      // First, compute beam selection for all satellites
      const selections: Array<{
        satId: string;
        sample: TrajectorySample;
        selection: BeamSelectionResult;
      }> = [];

      for (const { satId, sample } of satSamples) {
        const layout = getOrCreateBeamLayout(satId, sample.altKm);
        const activeBeams = lastBhSlotDecision?.activeBeamsPerSat.get(satId);
        if (lastBhSlotDecision && (!activeBeams || activeBeams.length === 0)) {
          continue;
        }
        // Phase 3: primary UE sits at beam center; if BH is active, choose among active beams only.
        const selection = selectBeamForUe(layout, 0, 0, profile.antenna, activeBeams);

        selections.push({ satId, sample, selection });
      }

      // Then compute SINR for each satellite using multi-beam interference model
      satSinrs = [];
      for (let i = 0; i < selections.length; i++) {
        const { satId, sample, selection } = selections[i];
        const otherSats = selections
          .filter((_, j) => j !== i)
          .map((s) => ({ satId: s.satId, sample: s.sample, selection: s.selection }));
        const sinrDb = computeSatSinrPhase3(satId, sample, selection, otherSats);
        satSinrs.push({
          satId,
          sample,
          sinrDb,
          bestBeamId: selection.bestBeamId,
          referenceOffAxisAngleDeg: selection.offAxisAngleDeg,
        });
      }
    }

    // Sort by SINR descending
    satSinrs.sort((a, b) => b.sinrDb - a.sinrDb);

    // 3b. Energy Layer 2: exclude energy-blocked satellites
    if (energyL2Manager) {
      satSinrs = satSinrs.filter((s) => !energyL2Manager!.isBlocked(s.satId));
    }

    // 4–7. Handover tick + KPI recording
    // representativeServing = primary UE's serving (used for energy accounting in step 8)
    let representativeServing: ServingState | null = null;
    const snapshotSinrByUe = new Map<string, number | null>();

    if (independentHandover) {
      // ======= Phase B (MS2): independent HO per UE =======
      for (const ue of uePositions) {
        const ueHoMgr = hoManagers.get(ue.id)!;

        // Build per-UE candidates: SINR from each visible satellite at UE's position
        // C2: filter to only BH-active satellites (same coupling as Phase A)
        const ueCandidates: HandoverCandidate[] = [];
        for (const satEntry of satSinrs) {
          // Exclude non-LEO satellites from HO candidates
          if (nonLeoSatIds.has(satEntry.satId)) continue;
          if (lastBhSlotDecision) {
            const activeBeams = lastBhSlotDecision.activeBeamsPerSat.get(satEntry.satId);
            if (!activeBeams || activeBeams.length === 0) continue;
          }
          const candidate = computeUeSinrFromSatEntry(ue, satEntry);
          if (!candidate) continue;
          const { sinrDb, beamId } = candidate;
          ueCandidates.push({
            satId: satEntry.satId,
            beamId,
            sinrDb,
            elevationDeg: satEntry.sample.elevationDeg,
          });
        }
        ueCandidates.sort((a, b) => b.sinrDb - a.sinrDb);

        // Serving SINR for this UE (from this tick's candidate list).
        // If serving satellite is no longer visible (below horizon / not in candidates),
        // use -100 dB to force HO re-selection rather than leaving the UE in a ghost
        // "attached but no signal" state.
        const ueHoState = ueHoMgr.getState();
        let ueServingSinrDb: number | null = null;
        let uePropDelayMs: number | undefined;
        if (ueHoState.serving) {
          const servCand = ueCandidates.find(
            (c) =>
              c.satId === ueHoState.serving!.satId &&
              c.beamId === ueHoState.serving!.beamId,
          );
          // null (not -100) so manager "servingSinrDb === null → doRelease" fires immediately
          ueServingSinrDb = servCand !== undefined ? servCand.sinrDb : null;
          const servSatEntry = satSinrs.find((s) => s.satId === ueHoState.serving!.satId);
          uePropDelayMs = servSatEntry
            ? servSatEntry.sample.rangeKm / 299.792
            : undefined;
        }

        const ueServingElevDeg = ueHoState.serving
          ? satSinrs.find((s) => s.satId === ueHoState.serving!.satId)?.sample.elevationDeg ?? null
          : null;
        ueHoMgr.tick({
          tick: tickNumber,
          timeSec,
          servingSinrDb: ueServingSinrDb,
          candidates: ueCandidates,
          propagationDelayMs: uePropDelayMs,
          servingElevationDeg: ueServingElevDeg,
        });

        // Record KPI for this UE.
        // Use POST-TICK serving state so new attachments (tick 0) are also captured.
        const ueServing = ueHoMgr.getState().serving;
        kpiAcc.recordServiceState(ue.id, ueServing !== null, timeSec);
        let snapshotSinrDb: number | null = null;
        if (ueServing !== null) {
          // Look up the post-tick serving satellite in this tick's candidate list.
          // If the satellite was just acquired this tick (pre-tick serving was null),
          // it will still be found here (since it was in ueCandidates this tick).
          const postServCand = ueCandidates.find(
            (c) =>
              c.satId === ueServing.satId &&
              c.beamId === ueServing.beamId,
          );
          if (postServCand !== undefined) {
            kpiAcc.recordSinr(ue.id, postServCand.sinrDb, timeSec);
            snapshotSinrDb = postServCand.sinrDb;
          }
        }
        snapshotSinrByUe.set(ue.id, snapshotSinrDb);

        // Drain and record HO events for this UE
        for (const evt of ueHoMgr.drainEvents()) {
          if (evt.type === 'ho-complete') {
            const intMs = computeInterruptionMs(evt.targetSatId, satSinrs);
            kpiAcc.recordHandover({
              timeSec: evt.timeSec,
              type: 'complete',
              sourceId: evt.sourceSatId ?? '',
              targetId: evt.targetSatId ?? '',
              sourceSinrDb: evt.sinrDb ?? 0,
              interruptionMs: intMs,
            });
            tickHoLog.push({ timeSec: evt.timeSec, type: 'ho-complete', sourceSatId: evt.sourceSatId ?? null, targetSatId: evt.targetSatId ?? null, sinrDb: evt.sinrDb ?? null, interruptionMs: intMs, ueId: ue.id });
            // A8: HO energy debit on target satellite (if L2 active)
            const hoEnergyJ = profile.energy.energy_per_handover_j ?? 0;
            if (hoEnergyJ > 0 && energyL2Manager && evt.targetSatId) {
              energyL2Manager.debitEnergy(evt.targetSatId, hoEnergyJ);
            }
          } else if (evt.type === 'ho-fail') {
            kpiAcc.recordHandover({
              timeSec: evt.timeSec,
              type: 'fail',
              sourceId: evt.sourceSatId ?? '',
              targetId: evt.targetSatId ?? '',
              sourceSinrDb: evt.sinrDb ?? 0,
              interruptionMs: computeInterruptionMs(evt.sourceSatId, satSinrs),
            });
            tickHoLog.push({ timeSec: evt.timeSec, type: 'ho-fail', sourceSatId: evt.sourceSatId ?? null, targetSatId: evt.targetSatId ?? null, sinrDb: evt.sinrDb ?? null, interruptionMs: null, ueId: ue.id });
          } else if (evt.type === 'cho-execute' || evt.type === 'mc-ho-dual-end' || evt.type === 'rlf-declared') {
            tickHoLog.push({ timeSec: evt.timeSec, type: evt.type, sourceSatId: evt.sourceSatId ?? null, targetSatId: evt.targetSatId ?? null, sinrDb: evt.sinrDb ?? null, interruptionMs: null, ueId: ue.id });
          }
        }
      }

      // Primary UE's serving used for energy accounting below
      representativeServing = hoManagers.get(PRIMARY_UE_ID)!.getState().serving;

    } else {
      // ======= Phase A: shared serving satellite =======

      // 4. Build handover candidates
      // C2: In BH mode, restrict HO candidates to satellites with at least one active beam
      // in the current slot (UE cannot hand over to a beam-hopping satellite that has no
      // active beam this slot — it would have no signal to measure).
      const candidates: HandoverCandidate[] = satSinrs
        .filter((s) => {
          // Exclude non-LEO satellites from HO candidates (MEO/GEO do not participate in handover)
          if (nonLeoSatIds.has(s.satId)) return false;
          if (!lastBhSlotDecision) return true; // no BH active — all candidates valid
          const activeBeams = lastBhSlotDecision.activeBeamsPerSat.get(s.satId);
          return activeBeams !== undefined && activeBeams.length > 0;
        })
        .map((s) => ({
          satId: s.satId,
          beamId: s.bestBeamId,
          sinrDb: s.sinrDb,
          elevationDeg: s.sample.elevationDeg,
        }));

      // 5. Determine serving SINR (DAPS-aware: track both source and target).
      // If serving satellite is no longer visible, use -100 dB to force HO re-selection.
      const hoState = hoManager.getState();
      let servingSinrDb: number | null = null;
      if (hoState.serving) {
        const servingEntry = satSinrs.find(
          (s) =>
            s.satId === hoState.serving!.satId &&
            s.bestBeamId === hoState.serving!.beamId,
        );
        // null (not -100) so manager.ts "servingSinrDb === null → doRelease" fires immediately
        servingSinrDb = servingEntry !== undefined ? servingEntry.sinrDb : null;
      }

      // 5b. DAPS dual-active
      const dapsState = hoState as { dapsPhase?: string; sourceServing?: ServingState | null; targetServing?: ServingState | null };
      let dapsDualActive = false;
      let dapsSourceSinrDb: number | null = null;
      let dapsTargetSinrDb: number | null = null;

      if (dapsState.dapsPhase === 'dual-active' && dapsState.sourceServing && dapsState.targetServing) {
        dapsDualActive = true;
        const srcEntry = satSinrs.find((s) => s.satId === dapsState.sourceServing!.satId);
        const tgtEntry = satSinrs.find((s) => s.satId === dapsState.targetServing!.satId);
        dapsSourceSinrDb = srcEntry ? srcEntry.sinrDb : null;
        dapsTargetSinrDb = tgtEntry ? tgtEntry.sinrDb : null;
      }

      // 5c. Policy action (C5): build observation every tick (cached for pull-model getObservation)
      // and call selectAction() if a policy is attached or an external action is queued (MG2).
      let policyFilteredCandidates = candidates;
      const tickObs: PolicyObservation = {
          tick: tickNumber,
          timeSec,
          satellites: satSinrs.map((s) => ({
            satId: s.satId,
            elevationDeg: s.sample.elevationDeg,
            rangeKm: s.sample.rangeKm,
            sinrDb: s.sinrDb,
            activeBeamCount: 1,
            soc: energyL2Manager?.getState(s.satId)?.soc ?? null,
            isServing: hoState.serving?.satId === s.satId,
          })),
          ues: uePositions.map((ue) => ({
            ueId: ue.id,
            sinrDb: servingSinrDb ?? -100,
            servingSatId: hoState.serving?.satId ?? null,
            distanceFromCenterKm: ue.distanceFromCenterKm,
          })),
          global: {
            totalActiveSatellites: satSinrs.length,
            totalActiveBeams: satSinrs.length,
            totalPowerW: lastEnergyMetrics?.totalPowerW ?? 0,
            meanSinrDb: satSinrs.length
              ? satSinrs.reduce((sum, s) => sum + s.sinrDb, 0) / satSinrs.length
              : 0,
          },
      };
      lastObservation = tickObs;

      // Determine action only when policy or pending external action is present
      if (policy || pendingExternalAction !== null) {
        const action = pendingExternalAction ?? policy?.selectAction(tickObs);
        pendingExternalAction = null; // consume queued action

        if (action) {
          const { mode, targetSatId } = action.handoverAction;
          if (mode === 'defer') {
            // Suppress HO evaluation: pass empty candidates
            policyFilteredCandidates = [];
          } else if (mode === 'trigger' && targetSatId) {
            // Force HO to target: only expose target as candidate
            const targetCand = candidates.find((c) => c.satId === targetSatId);
            if (targetCand) {
              policyFilteredCandidates = [targetCand];
              servingSinrDb = -100; // force HO trigger
            }
            // else: invalid action — fall through to 'auto' (no change)
          }
          // 'auto': policyFilteredCandidates remains unchanged
        }
      }

      // 6. Run handover tick (P2: propagation delay from serving satellite slant range)
      const servingEntry = hoState.serving
        ? satSinrs.find((s) => s.satId === hoState.serving!.satId)
        : null;
      const propagationDelayMs = servingEntry
        ? servingEntry.sample.rangeKm / 299.792  // one-way delay in ms
        : undefined;
      const servingElevationDeg = servingEntry?.sample.elevationDeg ?? null;
      hoManager.tick({
        tick: tickNumber,
        timeSec,
        servingSinrDb,
        candidates: policyFilteredCandidates,
        propagationDelayMs,
        servingElevationDeg,
      });

      // 7. Record KPI — Phase A per-UE SINR (shared serving, independent off-axis gain)
      const currentServing = hoManager.getState().serving;
      const isServed = currentServing !== null;

      let primarySinrDb: number | null = null;
      if (isServed && currentServing) {
        if (dapsDualActive && dapsSourceSinrDb !== null && dapsTargetSinrDb !== null) {
          primarySinrDb = Math.max(dapsSourceSinrDb, dapsTargetSinrDb);
        } else {
          const servEntry = satSinrs.find(
            (s) =>
              s.satId === currentServing.satId &&
              s.bestBeamId === currentServing.beamId,
          );
          primarySinrDb = servEntry ? servEntry.sinrDb : null;
        }
      }

      const servingSatEntry = isServed && currentServing
        ? satSamples.find((s) => s.satId === currentServing.satId)
        : null;

      for (const ue of uePositions) {
        kpiAcc.recordServiceState(ue.id, isServed, timeSec);

        let ueSnapshotSinrDb: number | null = null;
        if (isServed && currentServing && servingSatEntry && primarySinrDb !== null) {
          let ueSinrDb: number;
          if (ue.id === PRIMARY_UE_ID) {
            ueSinrDb = primarySinrDb;
          } else {
            const slantRangeKm = servingSatEntry.sample.rangeKm;
            const ueOffAxisDeg = Math.atan(ue.distanceFromCenterKm / slantRangeKm) * (180 / Math.PI);
            const gainReductionDb = profile.channel.tier3_beam_gain
              ? computeBeamGain({
                  offAxisAngleDeg: ueOffAxisDeg,
                  model: profile.antenna.model,
                  peakGainDbi: profile.antenna.peak_gain_dbi,
                  beamDiameterKm: profile.antenna.beam_diameter_km,
                  altitudeKm: servingSatEntry.sample.altKm,
                  slantRangeKm,
                })
              : 0;
            ueSinrDb = primarySinrDb + gainReductionDb;
          }
          kpiAcc.recordSinr(ue.id, ueSinrDb, timeSec);
          ueSnapshotSinrDb = ueSinrDb;
        }
        snapshotSinrByUe.set(ue.id, ueSnapshotSinrDb);
      }

      // Record handover events to KPI
      const hoEvents = hoManager.drainEvents();
      for (const evt of hoEvents) {
        if (evt.type === 'ho-complete') {
          const intMs = computeInterruptionMs(evt.targetSatId, satSinrs);
          kpiAcc.recordHandover({
            timeSec: evt.timeSec,
            type: 'complete',
            sourceId: evt.sourceSatId ?? '',
            targetId: evt.targetSatId ?? '',
            sourceSinrDb: evt.sinrDb ?? 0,
            interruptionMs: intMs,
          });
          // A8: HO transaction energy debit
          const hoEnergyJ = profile.energy.energy_per_handover_j ?? 0;
          if (hoEnergyJ > 0 && energyL2Manager && evt.targetSatId) {
            energyL2Manager.debitEnergy(evt.targetSatId, hoEnergyJ);
          }
          tickHoLog.push({ timeSec: evt.timeSec, type: 'ho-complete', sourceSatId: evt.sourceSatId ?? null, targetSatId: evt.targetSatId ?? null, sinrDb: evt.sinrDb ?? null, interruptionMs: intMs, ueId: 'ue-0' });
        } else if (evt.type === 'ho-fail') {
          kpiAcc.recordHandover({
            timeSec: evt.timeSec,
            type: 'fail',
            sourceId: evt.sourceSatId ?? '',
            targetId: evt.targetSatId ?? '',
            sourceSinrDb: evt.sinrDb ?? 0,
            interruptionMs: computeInterruptionMs(evt.sourceSatId, satSinrs),
          });
          tickHoLog.push({ timeSec: evt.timeSec, type: 'ho-fail', sourceSatId: evt.sourceSatId ?? null, targetSatId: evt.targetSatId ?? null, sinrDb: evt.sinrDb ?? null, interruptionMs: null, ueId: 'ue-0' });
        } else if (evt.type === 'cho-execute' || evt.type === 'mc-ho-dual-end' || evt.type === 'rlf-declared') {
          tickHoLog.push({ timeSec: evt.timeSec, type: evt.type, sourceSatId: evt.sourceSatId ?? null, targetSatId: evt.targetSatId ?? null, sinrDb: evt.sinrDb ?? null, interruptionMs: null, ueId: 'ue-0' });
        }
      }

      representativeServing = currentServing;
    }

    // 8. Energy layer 1 update (Phase 3)
    // Uses representativeServing (primary UE's serving) as active-beam proxy.
    if (energyManager && isMultiBeam) {
      for (const { satId, sample } of satSamples) {
        const layout = getOrCreateBeamLayout(satId, sample.altKm);
        const allBeamIds = layout.beams.map((b) => b.beamId);

        const activeBeamIds: string[] = [];
        if (representativeServing && representativeServing.satId === satId) {
          const servEntry = satSinrs.find((s) => s.satId === satId);
          if (servEntry) {
            activeBeamIds.push(servEntry.bestBeamId);
          }
        }

        energyManager.updateBeamStates(satId, activeBeamIds, allBeamIds);
      }

      if (representativeServing && energyManager) {
        const servEntry = satSinrs.find((s) => s.satId === representativeServing.satId);
        if (servEntry) {
          energyManager.applyDpc(
            servEntry.bestBeamId,
            servEntry.sinrDb,
          );
        }
      }

      const throughputs = new Map<string, number>();
      for (const entry of satSinrs) {
        if (representativeServing && representativeServing.satId === entry.satId) {
          const sinrLinear = Math.pow(10, entry.sinrDb / 10);
          const throughputBps = profile.rf.bandwidth_mhz * 1e6 * Math.log2(1 + sinrLinear);
          throughputs.set(entry.bestBeamId, throughputBps);
        }
      }

      lastEnergyMetrics = energyManager.computeMetrics(throughputs);
      // Inject EE into KPI accumulator so it appears in KpiBundle
      kpiAcc.recordEnergyMetrics({
        systemEeBitsPerJoule: lastEnergyMetrics.systemEeBitsPerJoule,
        totalPowerW: lastEnergyMetrics.totalPowerW,
        activeBeamRatio: lastEnergyMetrics.activeBeamRatio,
      });
    } else {
      lastEnergyMetrics = null;
    }

    // 8b. Energy Layer 2 tick
    if (energyL2Manager) {
      for (const { satId } of satSamples) {
        let powerW = 5;
        if (energyManager && isMultiBeam) {
          const layout = getOrCreateBeamLayout(satId, satSamples.find((s) => s.satId === satId)!.sample.altKm);
          const activeCount = representativeServing && representativeServing.satId === satId ? 1 : 0;
          const totalBeams = layout.beams.length;
          powerW = activeCount * 20 + (totalBeams - activeCount) * 0.1;
          if (activeCount === 0) powerW = 5;
        }
        energyL2Manager.tick(satId, powerW, timeSec, stepSec);
      }
    }

    // 9. Build snapshot
    // Derive serving/target sat+beam IDs for beam role assignment
    const servingSatId = representativeServing?.satId ?? null;
    const servingBeamId = representativeServing?.beamId ?? null;

    // Guarantee serving beam is always scheduled active (never goes off-slot).
    if (lastBhSlotDecision && servingSatId && servingBeamId) {
      const activeForSat = lastBhSlotDecision.activeBeamsPerSat.get(servingSatId);
      if (activeForSat && !activeForSat.includes(servingBeamId)) {
        lastBhSlotDecision.activeBeamsPerSat.set(servingSatId, [servingBeamId, ...activeForSat]);
      }
    }
    const hoState = independentHandover
      ? hoManagers.get(PRIMARY_UE_ID)!.getState()
      : hoManager.getState();
    const extendedPrimaryHoState = hoState as Readonly<typeof hoState> & {
      dapsPhase?: string;
      mcPhase?: string;
      sourceServing?: ServingState | null;
      targetServing?: ServingState | null;
    };

    const preparedTarget =
      hoState.phase === 'preparing' ||
      extendedPrimaryHoState.dapsPhase === 'prepared' ||
      extendedPrimaryHoState.mcPhase === 'mc-preparing'
        ? hoState.pendingTarget
        : null;

    const secondaryServing =
      extendedPrimaryHoState.dapsPhase === 'dual-active' ||
      extendedPrimaryHoState.mcPhase === 'mc-dual-active'
        ? (extendedPrimaryHoState.targetServing ?? null)
        : null;

    const satellites: SatelliteState[] = satSamples.map((s) => {
      const base = sampleToSatState(s.satId, s.sample);
      // Attach beam layout for multibeam profiles
      if (isMultiBeam) {
        const layout = beamLayouts.get(s.satId);
        if (layout) {
          const activeBeamIds = lastBhSlotDecision?.activeBeamsPerSat.get(s.satId);
          const beamSnaps: SatelliteBeamSnapshot[] = layout.beams.map((b) => {
            const isServingBeam = s.satId === servingSatId && b.beamId === servingBeamId;
            // BH active but sat not yet scheduled → all inactive (not b.isActive=true fallback)
            const isActive = isServingBeam || (lastBhSlotDecision
              ? (activeBeamIds?.includes(b.beamId) ?? false)
              : b.isActive);
            let role: SatelliteBeamSnapshot['role'] = 'neutral';
            if (s.satId === servingSatId && b.beamId === servingBeamId) {
              role = 'serving';
            } else if (
              secondaryServing &&
              s.satId === secondaryServing.satId &&
              b.beamId === secondaryServing.beamId
            ) {
              role = 'secondary';
            } else if (
              preparedTarget &&
              s.satId === preparedTarget.satId &&
              b.beamId === preparedTarget.beamId
            ) {
              role = 'prepared';
            } else if (!isActive) {
              role = 'inactive';
            }
            return {
              beamId: b.beamId,
              offsetEastKm: b.offsetEastKm,
              offsetNorthKm: b.offsetNorthKm,
              isActive,
              reuseGroup: b.reuseGroup,
              role,
            };
          });
          base.beams = beamSnaps;
        }
      }
      return base;
    });

    // UE states: Phase B = per-UE serving; Phase A = shared serving
    const cosLat = Math.cos(profile.observer.latitudeDeg * Math.PI / 180);
    const ues: UeState[] = uePositions.map((ue) => {
      const ueHoState = independentHandover
        ? hoManagers.get(ue.id)!.getState()
        : hoState;
      const extendedUeHoState = ueHoState as Readonly<typeof ueHoState> & {
        dapsPhase?: string;
        mcPhase?: string;
        sourceServing?: ServingState | null;
        targetServing?: ServingState | null;
      };

      let servingSatId: string | null;
      let servingBeamId: string | null;
      if (independentHandover) {
        const ueServing = ueHoState.serving;
        servingSatId = ueServing?.satId ?? null;
        servingBeamId = ueServing?.beamId ?? null;
      } else {
        servingSatId = representativeServing?.satId ?? null;
        servingBeamId = representativeServing?.beamId ?? null;
      }

      const uePreparedTarget =
        ueHoState.phase === 'preparing' ||
        extendedUeHoState.dapsPhase === 'prepared' ||
        extendedUeHoState.mcPhase === 'mc-preparing'
          ? ueHoState.pendingTarget
          : null;

      const ueSecondaryServing =
        extendedUeHoState.dapsPhase === 'dual-active' ||
        extendedUeHoState.mcPhase === 'mc-dual-active'
          ? (extendedUeHoState.targetServing ?? null)
          : null;

      const continuityState: UeState['continuityState'] =
        ueSecondaryServing
          ? 'dual-active'
          : uePreparedTarget
            ? 'prepared'
            : servingSatId
              ? 'single-active'
              : undefined;

      const sinrDb = snapshotSinrByUe.get(ue.id) ?? null;
      return {
        id: ue.id,
        latDeg: profile.observer.latitudeDeg + ue.offsetNorthKm / 111.32,
        lonDeg: profile.observer.longitudeDeg + ue.offsetEastKm / (111.32 * cosLat),
        servingSatId,
        servingBeamId,
        targetSatId: uePreparedTarget?.satId ?? null,
        targetBeamId: uePreparedTarget?.beamId ?? null,
        secondarySatId: ueSecondaryServing?.satId ?? null,
        secondaryBeamId: ueSecondaryServing?.beamId ?? null,
        continuityState,
        sinrDb,
      };
    });

    // Attach BH slot snapshot for earth-fixed-bh profiles
    let bhSlot: BhSlotSnapshot | undefined;
    if (lastBhSlotDecision) {
      const activeBeamsBySat: Record<string, string[]> = {};
      lastBhSlotDecision.activeBeamsPerSat.forEach((beamIds, satId) => {
        activeBeamsBySat[satId] = beamIds;
      });
      const energyBlockedSats = energyL2Manager
        ? satSamples.map((s) => s.satId).filter((id) => energyL2Manager!.isBlocked(id))
        : [];
      bhSlot = { slotIndex: lastBhSlotDecision.slotIndex, activeBeamsBySat, energyBlockedSats };
    }

    // DAPS snapshot: expose FSM phase + source/target sat IDs for viz dual-active rendering
    let daps: DapsSnapshot | undefined;
    {
      const dSnap = hoState as { dapsPhase?: string; sourceServing?: ServingState | null; targetServing?: ServingState | null };
      if (dSnap.dapsPhase && dSnap.dapsPhase !== 'idle') {
        daps = {
          phase: dSnap.dapsPhase,
          sourceSatId: dSnap.sourceServing?.satId ?? null,
          targetSatId: dSnap.targetServing?.satId ?? null,
        };
      }
    }

    return {
      tick: tickNumber,
      timeSec,
      satellites,
      ues,
      bhSlot,
      daps,
      recentHoEvents: tickHoLog.length > 0 ? tickHoLog : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    tick: doTick,

    getHandoverManager(): HandoverManager {
      // Phase B: return primary UE's HO manager; Phase A: shared hoManager
      return independentHandover
        ? (hoManagers.get(PRIMARY_UE_ID) ?? hoManager)
        : hoManager;
    },

    getKpiAccumulator(): KpiAccumulator {
      return kpiAcc;
    },

    getEnergyMetrics(): EnergyEfficiencyMetrics | null {
      return lastEnergyMetrics;
    },

    getEnergyLayer2States(): SatelliteEnergyLayer2State[] {
      return energyL2Manager ? energyL2Manager.getAllStates() : [];
    },

    getBhSlotDecision(): BhSlotDecision | null {
      return lastBhSlotDecision;
    },

    getObservation(): import('./policy/types').PolicyObservation | null {
      return lastObservation;
    },

    applyAction(action: import('./policy/types').PolicyAction | null): void {
      pendingExternalAction = action;
    },

    reset(): void {
      lastObservation = null;
      pendingExternalAction = null;
      rng = createRng(profile.seed);
      kpiAcc.reset();
      beamLayouts.clear();
      // C3: regenerate UE positions with fresh RNG
      uePositions = generateUePositions(
        ueCount, beamRadiusKm, profile.ueConfig.distribution, () => rng.next(),
      );
      // MS2: reset HO managers
      if (independentHandover) {
        hoManagers.clear();
        for (const ue of uePositions) {
          hoManagers.set(ue.id, createBaselineFromConfig(profile.handover));
        }
      } else {
        hoManager.reset();
      }
      // P4: reset mobility
      mobilityUpdater.reset();
      lastEnergyMetrics = null;
      lastBhSlotDecision = null;
      lastTickTimeSec = null;
      if (energyManager) {
        energyManager.reset();
      }
      if (bhScheduler) {
        bhScheduler.reset();
        bhSchedulerInitialized = false;
        bhScheduler = null;
      }
      if (energyL2Manager) {
        energyL2Manager.reset();
        l2InitializedSats.clear();
      }
    },
  };
}
