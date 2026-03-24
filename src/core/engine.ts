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

import type { SimulationSnapshot, SatelliteState, UeState } from './common/types';
import { createRng } from './common/types';
import type { TrajectoryCache, TrajectorySample } from './orbit/types';
import type { ProfileConfig } from './profiles/types';
import type { HandoverManager, HandoverCandidate, ServingState } from './handover/types';
import type { KpiAccumulator } from './kpi/accumulator';
import { getActivePassesAt, interpolatePass } from './orbit/trajectory-cache';
import { computeLinkBudget } from './channel/link-budget';
import { computeSinr } from './channel/sinr';
import { computeOffAxisAngle, computeBeamGain } from './channel/beam-gain';
import type { InterferingSignal } from './channel/types';
import { createBaselineFromConfig } from './handover/baselines';
import { createKpiAccumulator } from './kpi/accumulator';
import { generateUePositions } from './ue/position-generator';
import type { UePosition } from './ue/position-generator';
import { createMobilityUpdater } from './ue/mobility';

// Phase 3: beam + energy imports
import { generateHexagonalBeamLayout } from './beam/layout';
import { selectBeamForUe } from './beam/selection';
import type { SatelliteBeamLayout, BeamSelectionResult } from './beam/types';
import { createEnergyLayer1 } from './energy/layer1';
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

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createSimEngine(config: SimEngineConfig): SimEngine {
  const { profile, trajectoryCache } = config;

  // Derived RF parameters (computed once)
  const txEirp = eirpDbm(profile.rf.eirp_density_dbw_per_mhz, profile.rf.bandwidth_mhz);
  const noiseDbm = noisePowerDbm(profile.rf.noise_temperature_k, profile.rf.bandwidth_mhz, profile.rf.noise_figure_db);

  // Seeded RNG for shadow fading
  let rng = createRng(profile.seed);

  // Handover manager
  let hoManager = createBaselineFromConfig(profile.handover);

  // KPI accumulator
  let kpiAcc = createKpiAccumulator({
    sinrOutageThresholdDb: -8, // PAP-2022-SINR-ELEVATION
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
    const energyConfig: EnergyLayer1Config = {
      txPowerPerBeamDbm: 43, // assumption-backed: PAP-2024-HOBS
      activeBeamPowerW: 20, // PAP-2025-SMASH-MADQL
      idlePowerW: 5, // PAP-2025-SMASH-MADQL
      offBeamPowerW: 0.1, // assumption-backed
      dpcEnabled: false,
      dpcTargetSinrDb: 3,
    };
    energyManager = createEnergyLayer1(energyConfig);
  }

  // Last tick's energy metrics
  let lastEnergyMetrics: EnergyEfficiencyMetrics | null = null;

  // ---------------------------------------------------------------------------
  // BH Scheduler (only when earth-fixed-bh + multi-beam)
  // ---------------------------------------------------------------------------

  const isBhActive = profile.beamSemantics === 'earth-fixed-bh' && isMultiBeam;
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
        strategy: 'round-robin',
        maxActiveBeamsPerSlot: Math.min(4, profile.beam.num_beams),
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
    energyL2Manager = createEnergyLayer2();
  }

  /** Set of satIds already initialized in L2. */
  const l2InitializedSats = new Set<string>();

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
      environment: 'suburban',
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
      tier1LargeScale: profile.channel.tier1_large_scale,
      tier2Clutter: profile.channel.tier2_clutter,
      tier3BeamGain: profile.channel.tier3_beam_gain,
      tier4Atmospheric: profile.channel.tier4_atmospheric,
      tier5Fading: profile.channel.tier5_fading,
      rngNext: profile.channel.tier1_large_scale || profile.channel.tier5_fading ? () => rng.next() : null,
      isLos: servingSample.elevationDeg >= 20, // simplified LOS model
    });

    // C1 fix: each interferer computes its own full link budget
    const interferingSignals: InterferingSignal[] = [];
    for (const iSample of interferingSamples) {
      const iChannel = computeLinkBudget({
        distanceKm: iSample.rangeKm,
        frequencyGhz: profile.rf.frequency_ghz,
        txEirpDbm: txEirp,
        elevationDeg: iSample.elevationDeg,
        environment: 'suburban',
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
        tier1LargeScale: false, // deterministic for interference
        tier2Clutter: false,
        tier3BeamGain: profile.channel.tier3_beam_gain,
        tier4Atmospheric: false,
        rngNext: null,
        isLos: true,
      });
      interferingSignals.push({
        beamGainDb: iChannel.beamGainDb,
        pathLossDb: iChannel.fsplDb,
        shadowFadingDb: iChannel.shadowFadingDb,
        clutterLossDb: iChannel.clutterLossDb,
      });
    }

    // Compute SINR with per-interferer channel data
    const sinrResult = computeSinr({
      servingBeamGainDb: servingChannel.beamGainDb,
      servingPathLossDb: servingChannel.fsplDb,
      servingShadowFadingDb: servingChannel.shadowFadingDb,
      servingClutterLossDb: servingChannel.clutterLossDb,
      txEirpDbm: txEirp,
      noisePowerDbm: noiseDbm,
      interferingSignals,
    });

    return sinrResult.sinrDb;
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
      environment: 'suburban',
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
      tier1LargeScale: profile.channel.tier1_large_scale,
      tier2Clutter: profile.channel.tier2_clutter,
      tier3BeamGain: profile.channel.tier3_beam_gain,
      tier4Atmospheric: profile.channel.tier4_atmospheric,
      tier5Fading: profile.channel.tier5_fading,
      rngNext: profile.channel.tier1_large_scale || profile.channel.tier5_fading ? () => rng.next() : null,
      isLos: servingSample.elevationDeg >= 20,
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
          environment: 'suburban',
          beamGainInput: {
            offAxisAngleDeg: beam.offAxisAngleDeg,
            model: profile.antenna.model,
            peakGainDbi: profile.antenna.peak_gain_dbi,
            beamDiameterKm: profile.antenna.beam_diameter_km,
            altitudeKm: servingSample.altKm,
            slantRangeKm: servingSample.rangeKm,
          },
          noisePowerDbm: noiseDbm,
          tier1LargeScale: false,
          tier2Clutter: false,
          tier3BeamGain: true,
          tier4Atmospheric: false,
          rngNext: null,
          isLos: true,
        });
        interferingSignals.push({
          beamGainDb: iChannel.beamGainDb,
          pathLossDb: iChannel.fsplDb,
          shadowFadingDb: iChannel.shadowFadingDb,
          clutterLossDb: iChannel.clutterLossDb,
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
          environment: 'suburban',
          beamGainInput: {
            offAxisAngleDeg: crossOffAxisDeg,
            model: profile.antenna.model,
            peakGainDbi: profile.antenna.peak_gain_dbi,
            beamDiameterKm: profile.antenna.beam_diameter_km,
            altitudeKm: other.sample.altKm,
            slantRangeKm: other.sample.rangeKm,
          },
          noisePowerDbm: noiseDbm,
          tier1LargeScale: false,
          tier2Clutter: false,
          tier3BeamGain: true,
          tier4Atmospheric: false,
          rngNext: null,
          isLos: true,
        });
        interferingSignals.push({
          beamGainDb: iChannel.beamGainDb,
          pathLossDb: iChannel.fsplDb,
          shadowFadingDb: iChannel.shadowFadingDb,
          clutterLossDb: iChannel.clutterLossDb,
        });
      }
    }

    const sinrResult = computeSinr({
      servingBeamGainDb: servingChannel.beamGainDb,
      servingPathLossDb: servingChannel.fsplDb,
      servingShadowFadingDb: servingChannel.shadowFadingDb,
      servingClutterLossDb: servingChannel.clutterLossDb,
      txEirpDbm: txEirp,
      noisePowerDbm: noiseDbm,
      interferingSignals,
    });

    return sinrResult.sinrDb;
  }

  // ---------------------------------------------------------------------------
  // Tick
  // ---------------------------------------------------------------------------

  function doTick(timeSec: number, tickNumber: number): SimulationSnapshot {
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
        getOrCreateBeamLayout(satId, sample.altKm);
      }
      ensureBhScheduler();
      if (bhScheduler) {
        lastBhSlotDecision = bhScheduler.getSlotDecision(timeSec);
      }
    }

    // 3. Compute SINR + beam selection for each visible satellite
    let satSinrs: Array<{
      satId: string;
      sample: TrajectorySample;
      sinrDb: number;
      bestBeamId: string;
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
        satSinrs.push({ satId, sample, sinrDb, bestBeamId: `${satId}-b0` });
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
        // Phase 3: UE at satellite sub-point → offset (0, 0)
        const selection = selectBeamForUe(layout, 0, 0, profile.antenna);

        // BH filter: if BH active, skip satellites whose best beam is not in this slot
        if (lastBhSlotDecision) {
          const activeBeams = lastBhSlotDecision.activeBeamsPerSat.get(satId);
          if (activeBeams && !activeBeams.includes(selection.bestBeamId)) {
            continue; // best beam not active this slot → satellite cannot serve
          }
        }

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
        satSinrs.push({ satId, sample, sinrDb, bestBeamId: selection.bestBeamId });
      }
    }

    // Sort by SINR descending
    satSinrs.sort((a, b) => b.sinrDb - a.sinrDb);

    // 3b. Energy Layer 2: exclude energy-blocked satellites
    if (energyL2Manager) {
      satSinrs = satSinrs.filter((s) => !energyL2Manager!.isBlocked(s.satId));
    }

    // 4. Build handover candidates
    const candidates: HandoverCandidate[] = satSinrs.map((s) => ({
      satId: s.satId,
      beamId: s.bestBeamId,
      sinrDb: s.sinrDb,
      elevationDeg: s.sample.elevationDeg,
    }));

    // Debug logging removed — use validate-runtime.mjs for SINR verification

    // 5. Determine serving SINR (DAPS-aware: track both source and target)
    const hoState = hoManager.getState();
    let servingSinrDb: number | null = null;
    if (hoState.serving) {
      const servingEntry = satSinrs.find((s) => s.satId === hoState.serving!.satId);
      servingSinrDb = servingEntry ? servingEntry.sinrDb : null;
    }

    // 5b. DAPS dual-active: also compute target SINR if in dual-active phase
    // The DAPS manager exposes sourceServing and targetServing in its state.
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

    // 6. Run handover tick (P2: propagation delay from serving satellite slant range)
    const servingEntry = hoState.serving
      ? satSinrs.find((s) => s.satId === hoState.serving!.satId)
      : null;
    const propagationDelayMs = servingEntry
      ? servingEntry.sample.rangeKm / 299.792  // one-way delay in ms
      : undefined;
    const decision = hoManager.tick({
      tick: tickNumber,
      timeSec,
      servingSinrDb,
      candidates,
      propagationDelayMs,
    });

    // 7. Record KPI — C3 fix: per-UE SINR recording
    const currentServing = hoManager.getState().serving;
    const isServed = currentServing !== null;

    // Primary UE (ue-0 at beam center) SINR for base metrics
    let primarySinrDb: number | null = null;
    if (isServed && currentServing) {
      if (dapsDualActive && dapsSourceSinrDb !== null && dapsTargetSinrDb !== null) {
        primarySinrDb = Math.max(dapsSourceSinrDb, dapsTargetSinrDb);
      } else {
        const servEntry = satSinrs.find((s) => s.satId === currentServing.satId);
        primarySinrDb = servEntry ? servEntry.sinrDb : null;
      }
    }

    // Per-UE SINR: each UE has a different off-axis angle from the serving beam
    // Phase A (C3): shared serving satellite, independent SINR per UE
    const servingSatEntry = isServed && currentServing
      ? satSamples.find((s) => s.satId === currentServing.satId)
      : null;

    for (const ue of uePositions) {
      kpiAcc.recordServiceState(ue.id, isServed, timeSec);

      if (isServed && currentServing && servingSatEntry && primarySinrDb !== null) {
        let ueSinrDb: number;
        if (ue.id === PRIMARY_UE_ID) {
          // Primary UE at beam center — use already computed SINR
          ueSinrDb = primarySinrDb;
        } else {
          // Off-center UE: approximate SINR offset from beam gain roll-off
          // off-axis angle ≈ atan(ue.distanceFromCenterKm / slantRange)
          const slantRangeKm = servingSatEntry.sample.rangeKm;
          const ueOffAxisDeg = Math.atan(ue.distanceFromCenterKm / slantRangeKm) * (180 / Math.PI);
          // Beam gain reduction at this off-axis angle (relative to boresight)
          const gainReductionDb = profile.channel.tier3_beam_gain
            ? computeBeamGain({
                offAxisAngleDeg: ueOffAxisDeg,
                model: profile.antenna.model,
                peakGainDbi: profile.antenna.peak_gain_dbi,
                beamDiameterKm: profile.antenna.beam_diameter_km,
                altitudeKm: servingSatEntry.sample.altKm,
                slantRangeKm,
              })
            : 0; // gainReductionDb is ≤ 0 (normalized pattern)
          // UE SINR ≈ primary SINR + gain offset (since primary is at boresight, gain=0)
          ueSinrDb = primarySinrDb + gainReductionDb;
        }
        kpiAcc.recordSinr(ue.id, ueSinrDb, timeSec);
      }
    }

    // Record handover events to KPI
    const hoEvents = hoManager.drainEvents();
    for (const evt of hoEvents) {
      if (evt.type === 'ho-complete') {
        kpiAcc.recordHandover({
          timeSec: evt.timeSec,
          type: 'complete',
          sourceId: evt.sourceSatId ?? '',
          targetId: evt.targetSatId ?? '',
          sourceSinrDb: evt.sinrDb ?? 0,
          interruptionMs: 0, // Phase 2/3: instantaneous switching
        });
      } else if (evt.type === 'ho-fail') {
        kpiAcc.recordHandover({
          timeSec: evt.timeSec,
          type: 'fail',
          sourceId: evt.sourceSatId ?? '',
          targetId: evt.targetSatId ?? '',
          sourceSinrDb: evt.sinrDb ?? 0,
          interruptionMs: 0,
        });
      }
    }

    // 8. Energy layer 1 update (Phase 3)
    if (energyManager && isMultiBeam) {
      // Determine active beams: the serving beam for each satellite that is
      // currently serving a UE. In single-UE mode, only one satellite has
      // an active serving beam.
      for (const { satId, sample } of satSamples) {
        const layout = getOrCreateBeamLayout(satId, sample.altKm);
        const allBeamIds = layout.beams.map((b) => b.beamId);

        // A beam is active if this satellite is serving and this is the serving beam
        const activeBeamIds: string[] = [];
        if (currentServing && currentServing.satId === satId) {
          const servEntry = satSinrs.find((s) => s.satId === satId);
          if (servEntry) {
            activeBeamIds.push(servEntry.bestBeamId);
          }
        }

        energyManager.updateBeamStates(satId, activeBeamIds, allBeamIds);
      }

      // DPC: adjust TX power for serving beam if enabled
      if (currentServing && energyManager) {
        const servEntry = satSinrs.find((s) => s.satId === currentServing.satId);
        if (servEntry) {
          // applyDpc returns adjusted power, but we don't feed it back
          // into SINR this tick (would require iteration). Logged for metrics.
          energyManager.applyDpc(
            servEntry.bestBeamId,
            servEntry.sinrDb,
            3, // dpcTargetSinrDb default
            43, // txPowerPerBeamDbm default
          );
        }
      }

      // Compute energy metrics
      // Throughput estimation: Shannon capacity per active beam
      const throughputs = new Map<string, number>();
      for (const entry of satSinrs) {
        if (currentServing && currentServing.satId === entry.satId) {
          // Shannon: C = BW * log2(1 + SINR_linear)
          const sinrLinear = Math.pow(10, entry.sinrDb / 10);
          const throughputBps = profile.rf.bandwidth_mhz * 1e6 * Math.log2(1 + sinrLinear);
          throughputs.set(entry.bestBeamId, throughputBps);
        }
      }

      lastEnergyMetrics = energyManager.computeMetrics(throughputs);
    } else {
      lastEnergyMetrics = null;
    }

    // 8b. Energy Layer 2 tick
    if (energyL2Manager) {
      for (const { satId } of satSamples) {
        // Estimate power consumption from L1 if available, else use idle baseline
        let powerW = 5; // idle default
        if (energyManager && isMultiBeam) {
          const layout = getOrCreateBeamLayout(satId, satSamples.find((s) => s.satId === satId)!.sample.altKm);
          const activeCount = currentServing && currentServing.satId === satId ? 1 : 0;
          const totalBeams = layout.beams.length;
          // active beams * 20W + idle beams * 5W + off beams * 0.1W (from L1 config)
          powerW = activeCount * 20 + (totalBeams - activeCount) * 0.1;
          if (activeCount === 0) powerW = 5; // idle satellite
        }
        energyL2Manager.tick(satId, powerW, timeSec, stepSec);
      }
    }

    // 9. Build snapshot
    const satellites: SatelliteState[] = satSamples.map((s) =>
      sampleToSatState(s.satId, s.sample),
    );

    // C3: build UE states for all UEs (positions are offsets from observer)
    const ues: UeState[] = uePositions.map((ue) => ({
      id: ue.id,
      latDeg: profile.observer.latitudeDeg + ue.offsetNorthKm / 111.32,
      lonDeg: profile.observer.longitudeDeg + ue.offsetEastKm / (111.32 * Math.cos(profile.observer.latitudeDeg * Math.PI / 180)),
      servingSatId: currentServing?.satId ?? null,
      servingBeamId: currentServing?.beamId ?? null,
    }));

    return {
      tick: tickNumber,
      timeSec,
      satellites,
      ues,
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    tick: doTick,

    getHandoverManager(): HandoverManager {
      return hoManager;
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

    reset(): void {
      rng = createRng(profile.seed);
      hoManager.reset();
      kpiAcc.reset();
      beamLayouts.clear();
      // C3: regenerate UE positions with fresh RNG
      uePositions = generateUePositions(
        ueCount, beamRadiusKm, profile.ueConfig.distribution, () => rng.next(),
      );
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
