/**
 * Profile schema types for ntn-sim-core.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §6
 *   - Baselines: sdd/ntn-sim-core-profile-baselines.md
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3, §4
 *   - Assumptions: sdd/ntn-sim-core-assumption-policy.md
 *   - This file must not import React, Three.js, or scene code.
 */

import type {
  SourceTier,
  SourceReference,
  OrbitMode,
  BeamSemantics,
  ObserverLocation,
  TimeControl,
  SpecMode,
} from '@/core/common/types';
import type { OrbitType, GeoStationaryConfig } from '@/core/orbit/types';

// Re-export for convenience
export type { SourceTier, SourceReference, OrbitMode, BeamSemantics };

// ---------------------------------------------------------------------------
// Profile Family (SDD §6.2, profile-baselines §2)
// ---------------------------------------------------------------------------

export type ProfileFamily =
  | 'case9-access-baseline'
  | 'hobs-multibeam-baseline'
  | 'bh-resource-baseline'
  | 'real-trace-validation'
  | 'case9-daps-baseline'
  | 'meo-constellation-baseline'
  | 'geo-relay-baseline'
  /**
   * Spec §10 Realistic first-screen preset: all user-facing parameters are
   * paper-backed or standard-backed; no Advanced entries. One Internal-only
   * entry (ASSUME-CUR-002: noise_temperature_k=290K) is retained for audit
   * traceability but is not exposed as a UI control (spec R7). Safe for
   * thesis baseline tables.
   * Defined in defaults.ts as REALISTIC_FIRST_SCREEN.
   */
  | 'realistic-first-screen';

// ---------------------------------------------------------------------------
// Sub-config types
// ---------------------------------------------------------------------------

export interface OrbitalConfig {
  /** Orbit regime. Defaults to 'leo' when omitted. */
  orbitType?: OrbitType;
  altitude_km: number;
  inclination_deg: number;
  num_planes: number;
  sats_per_plane: number;
  /** RAAN spread in degrees (typically 360 for global Walker). */
  raan_spread_deg: number;
  /** True anomaly offset between adjacent planes in degrees. */
  phase_offset_deg: number;
  /**
   * A4: Additional shells for multi-shell Walker constellation.
   * The primary shell is defined by altitude_km / inclination_deg / num_planes / sats_per_plane.
   * Each extra shell adds an independent Walker ring at a different altitude/inclination.
   * @source leo-beam-sim/src/engine/orbit/walker-constellation.ts (5-shell model: 53°/42°/90°/125°/145°)
   */
  extra_shells?: Array<{
    id: string;
    altitude_km: number;
    inclination_deg: number;
    num_planes: number;
    sats_per_plane: number;
    phasing_factor?: number;
    orbitType?: OrbitType;
  }>;
  /** GEO fixed-position satellites. Merged into constellation alongside Walker shells. */
  geoSatellites?: GeoStationaryConfig[];
}

export interface RfConfig {
  frequency_ghz: number;
  bandwidth_mhz: number;
  /**
   * EIRP spectral density in dBW/MHz.
   *
   * @spec-deviation simulator-parameter-spec.md §8 classifies
   * eirpDensityDbwPerMHz as a "derived reporting quantity"
   * (= P_beam_max · G_T(θ=0) peak on-axis) and states it must NOT be exposed
   * as an independent input or independently swept in any mode.
   *
   * This field is retained as a profile input for backwards compatibility:
   * papers specify EIRP directly, and computing it from P1 + antenna gain
   * requires the full antenna model to be evaluated first.
   *
   * @spec-mode Advanced (compatibility input only — not a Realistic free slider)
   * Claim scope: use as a provenance-tagged paper-reproduction compatibility value
   * for profiles whose source paper reports EIRP directly. Must not be swept
   * independently or presented as a UI control. Do not expose in first-screen
   * Realistic mode. Any profile that changes this field must recompute
   * dependent quantities (noise floor, HO thresholds) accordingly.
   */
  eirp_density_dbw_per_mhz: number;
  /**
   * Per-beam maximum transmit power in dBm (spec P1).
   *
   * This is the per-beam TX power cap (\(P_{\mathrm{beam},\max}\)).
   * Source: PAP-2025-MAAC-BHPOWER [S10]: P1 = 10 dBW = 40 dBm = 10 W.
   *
   * When set, the engine:
   *   1. Computes txEirp from this value + antenna.peak_gain_dbi (instead of
   *      eirp_density_dbw_per_mhz), aligning the signal path with P1.
   *   2. Uses it as the Energy Layer 1 txPowerPerBeamDbm, aligning EE path.
   *
   * When absent, falls back to eirp_density_dbw_per_mhz for signal path
   * and DEFAULT_ENERGY_LAYER1_CONFIG.txPowerPerBeamDbm (40 dBm) for EE.
   *
   * @spec-mode Realistic (spec P1, paper-backed)
   * Must NOT be confused with max_tx_power_dbm (which is P2, aggregate).
   */
  tx_power_per_beam_dbm?: number;
  /**
   * Maximum total satellite transmit power in dBm (aggregate across all beams).
   * This is the aggregate TX power budget (spec P2 = 13 dBW ≈ 43 dBm ≈ 20 W).
   * Used as the power budget ceiling for power-aware BH scheduling.
   * This is NOT the per-beam TX power; do not conflate with tx_power_per_beam_dbm
   * (spec P1 = 40 dBm = 10 W per beam).
   * Set to null to disable the power budget constraint.
   */
  max_tx_power_dbm: number | null;
  /**
   * Reference noise temperature in K (antenna + sky background).
   *
   * @spec-mode Internal-only — per simulator-parameter-spec.md R7.
   * This is a fixed engineering constant (290 K = IEEE/ITU standard T_0).
   * It must NOT be exposed as a UI slider or swept as a sensitivity parameter.
   * Runtime uses it only via T_sys = noise_temperature_k + T_0·(NF_linear − 1).
   * Profile field is retained for audit traceability; value must always be 290 K
   * for standard-backed clear-sky baselines. Non-standard values require an
   * explicit assumption entry and may only be used in Internal-only scenarios.
   */
  noise_temperature_k: number;
  /** UE receiver noise figure in dB (MS5 fix). Default 7 dB (3GPP typical UE).
   *  System noise temp = T_ant + T_0·(10^(NF/10) - 1) where T_0 = 290K */
  noise_figure_db?: number;
  /**
   * Feeder + pointing implementation loss in dB.
   * Replaces the legacy systemLossDb fudge factor from donor projects.
   * @source PAP-2022-SENSORS-BH Table 3 (0.5 dB feeder + 2.0 dB pointing)
   */
  implementation_loss_db?: number;
}

export interface AntennaConfig {
  /** Beam gain model family identifier. */
  model: 'rpsat-3gpp' | 'bessel-j1' | 'itu-r' | 'flat-debug';
  /** Peak antenna gain in dBi. */
  peak_gain_dbi: number;
  /** 3dB beam diameter on ground in km. */
  beam_diameter_km: number;
}

export interface BeamConfig {
  /** Number of serving beams per satellite. */
  num_beams: number;
  /** Beam layout pattern. */
  layout: 'hexagonal' | 'circular' | 'custom';
  /** Frequency reuse factor. */
  frf: number;
  /** Number of interference beams tracked (beyond serving set). */
  interference_beams: number;
  /** Max active beams per satellite per time slot (omit = all active). */
  bh_max_active_per_slot?: number;
  /** BH frame duration in seconds (default 0.64). */
  bh_frame_duration_sec?: number;
  /** Number of slots per BH frame (default ceil(num_beams / bh_max_active_per_slot)). */
  bh_slots_per_frame?: number;
  /** BH scheduling strategy (default 'round-robin'). */
  bh_strategy?: 'round-robin' | 'max-demand' | 'power-aware' | 'deterministic-fixed' | 'proportional-fair' | 'sinr-greedy';
  /** Power budget per satellite for power-aware BH scheduling (W). Required for 'power-aware' strategy. */
  bh_power_budget_w?: number;
  /** Traffic model for demand-aware BH scheduling. */
  bh_traffic_model?: 'poisson' | 'full-buffer' | 'hotspot' | 'uniform';
  /** Mean arrival rate per beam per second (Poisson model). Default 10. */
  bh_traffic_arrival_rate?: number;
}

/** Channel model tier enable flags (profile-baselines §8.1). */
export type LargeScaleModel = '3gpp-baseline' | '3gpp-extended';
export type DeploymentEnvironment = 'rural' | 'suburban' | 'dense-urban';

export interface ChannelConfig {
  /** Tier 0: FSPL — always mandatory. */
  tier0_fspl: true;
  /** Tier 1: large-scale NTN loss family. */
  tier1_large_scale: boolean;
  /** Tier 2: clutter / elevation-dependent attenuation. */
  tier2_clutter: boolean;
  /** Tier 3: beam-gain family (mandatory for multi-beam). */
  tier3_beam_gain: boolean;
  /** Tier 4: atmospheric Ka-band extras. */
  tier4_atmospheric: boolean;
  /** Tier 5: small-scale fading (SR / Rician / Loo). */
  tier5_fading: boolean;
  /**
   * Large-scale NTN path loss family selection.
   * `3gpp-baseline` = FSPL + SF + CL
   * `3gpp-extended` = baseline + atmospheric chain when Tier 4 is enabled
   */
  large_scale_model?: LargeScaleModel;
  /**
   * Scenario class for SF / CL lookup.
   * Current simulator spec only exposes rural / suburban / dense-urban.
   */
  deployment_environment?: DeploymentEnvironment;
  /**
   * Tier 6: Doppler ICI SINR degradation.
   * Enabled for OFDM systems at high carrier frequency or high satellite speed.
   * Reference: 3GPP TR 38.821 §6.1, PAP-2024-BEAM-MGMT-SPECTRUM.
   */
  tier6_doppler?: boolean;
  /** OFDM subcarrier spacing for Tier 6 Doppler ICI computation (kHz). Default 30. */
  subcarrier_spacing_khz?: number;
  /**
   * LOS elevation threshold (degrees).
   * UE link is classified LOS when servingSample.elevationDeg ≥ this value,
   * which gates shadow-fading and clutter-loss branch selection.
   *
   * @spec-mode Realistic (standard-backed: 3GPP TR 38.811 §6.7 LOS probability model
   *   simplified to a hard threshold; 20° is the conventional single-threshold
   *   approximation used across multiple papers in the catalog)
   * @source STD-3GPP-38811-LOS-20DEG
   * Legacy note: ASSUME-SINR-LOS-THRESHOLD is deprecated; use the STD-* id for
   * current sourceMap / UI-schema provenance.
   * @default 20 (degrees)
   */
  los_elevation_deg?: number;
}

export type HandoverType =
  | 'hard-ho'
  | 'a3-event'
  | 'a4-event'
  | 'cho'
  | 'mc-ho'
  | 'd2-distance'
  | 'timer-cho'
  | 'daps'
  | 'max-elevation'
  | 'max-remaining-time';

export interface HandoverConfig {
  type: HandoverType;
  /**
   * Link-quality floor / trigger threshold in dB. Used for A4-event and attach decisions.
   * Semantics: handover triggers when serving SINR < trigger_threshold_db.
   * Do NOT use as A3 offset — see a3_offset_db below.
   *
   * Runtime uses this field in two contexts:
   *   1. A4 / controller-style SINR trigger logic (legacy/spec-deviation path).
   *   2. Initial attach / re-attach gate, where profiles may bind it to the
   *      minimum link-quality floor (for example trigger_threshold_db = Q_out).
   *
   * @spec-deviation simulator-parameter-spec.md §6 H3 specifies a4ThresholdDbm
   * as an ABSOLUTE power threshold (dBm) derived as:
   *   noise_floor_dBm = 10·log10(k · T_sys · bandwidth_hz · 1000)  [in dBm]
   *   A4_thr_dBm = noise_floor_dBm + rlf_qout_db
   *
   * Profiles that keep the legacy SINR-relative tuning value (for example −6 dB)
   * must document it as assumption-backed / Advanced via ASSUME-HO-THRESHOLD-SINR.
   *
   * The first-screen Realistic A3 preset instead sets trigger_threshold_db = Q_out
   * = −8 dB and sources it from TS 38.133 §7.6 as a standard-backed attach floor.
   * This is still distinct from the full H3 absolute-power derivation, but it is
   * no longer the same claim as the old manual −6 dB tuning knob.
   *
   * @spec-mode Context-dependent:
   *   - Realistic when bound to the standard-backed attach floor (for example Q_out)
   *   - Advanced when used as a manual SINR-relative tuning parameter
   */
  trigger_threshold_db: number;
  /**
   * A3 relative offset (dB). Used **only** for A3-event condition.
   * Semantics: HO triggers when candidate SINR > serving SINR + a3_offset_db + hysteresis_db.
   * Defaults to 0 if omitted (no offset beyond hysteresis).
   * @source spec H1: 2 dB per PAP-2022-A4EVENT-CORE Table I + TS 38.331 §5.5.4.4
   */
  a3_offset_db?: number;
  /** Time-to-trigger in ms. */
  ttt_ms: number;
  /** Hysteresis in dB. */
  hysteresis_db: number;
  /** Minimum elevation angle for candidate cells in degrees. */
  min_elevation_deg: number;
  /** Ping-pong suppression window in seconds. Default 5 (LEO).
   *  Recommended: 60 for MEO, 300 for GEO. */
  pingPongWindowSec?: number;

  // --- CHO / Timer-CHO parameters (C2) ---
  /** CHO: A3 offset for conditional execution condition (dB). Default 0. */
  cho_offset_db?: number;
  /** Timer-CHO: geometry weighting factor α for timer threshold. Default 0.85.
   *  @source PAP-2025-TIMERCHO-CORE */
  cho_alpha?: number;
  /** Timer-CHO: L3 filter coefficient k (1–7). Default 4.
   *  a = 1/2^(k/4), F_n = (1-a)·F_{n-1} + a·M_n
   *  @source 3GPP TS 38.331, PAP-2025-TIMERCHO-CORE */
  cho_filter_k?: number;

  // --- DAPS parameters ---
  /**
   * DAPS: preparation phase duration before dual-active starts (seconds).
   * Default 0.5 s — time for path setup and L2 preparation.
   * @source PAP-2025-DAPS-CORE §III-B (preparation phase semantics)
   */
  daps_preparation_time_sec?: number;
  /**
   * DAPS: maximum dual-active window before forced path switch (seconds).
   * Default 2.0 s — covers typical LEO HO window.
   * @source PAP-2025-DAPS-CORE §III-C, PAP-2024-MCCHO-CORE (dual-active duration)
   */
  daps_max_dual_active_sec?: number;

  // --- MC-HO parameters (C2) ---
  /** MC-HO: maximum dual-active duration (seconds). Default 2.0.
   *  @source PAP-2024-MCCHO-CORE */
  mc_max_dual_sec?: number;
  /** MC-HO: enable packet duplication during dual-active. Default true. */
  mc_packet_duplication?: boolean;

  // --- D2 distance-event parameters (A1) ---
  /**
   * D2: serving satellite distance (km) above which D2 OOS condition holds.
   * Default 5000 km (ntn-stack reference for LEO handover trigger distance).
   * @source ntn-stack/netstack/src/services/handover_event_trigger_service.py
   */
  d2_serving_dist_km?: number;
  /**
   * D2: target satellite distance (km) below which candidate qualifies.
   * Default 3000 km.
   * @source ntn-stack handover_event_trigger_service.py
   */
  d2_target_dist_km?: number;

  // --- SINR EMA smoothing (A6) ---
  /**
   * Exponential moving average coefficient α for SINR smoothing.
   * Smoothed = α × raw + (1−α) × prev.  α=1.0 disables smoothing (default).
   * Recommended: α=0.5 (τ≈0.5 s at 1 Hz tick rate) per leo-beam-sim.
   * Prevents transient SINR dips from triggering unnecessary handovers.
   * @source leo-beam-sim/src/engine/handover/handover-manager.ts
   */
  sinr_ema_alpha?: number;

  // --- RLF parameters (A2) ---
  /**
   * Qout: SINR threshold (dB) below which link is out-of-sync.
   * Default -8 dB per 3GPP TS 38.133 §7.6.
   * @source 3GPP TS 38.133 §7.6 (Qout definition)
   */
  rlf_qout_db?: number;
  /**
   * Qin: SINR threshold (dB) above which link recovers to in-sync.
   * Must satisfy Qin > Qout. Default -6 dB.
   * @source 3GPP TS 38.133 §7.6 (Qin definition)
   */
  rlf_qin_db?: number;
  /**
   * N310: consecutive out-of-sync events before T310 starts.
   * Default 1 (3GPP TS 38.331 §5.3.10, range 1–20).
   * @source 3GPP TS 38.331 §5.3.10.3
   */
  rlf_n310?: number;
  /**
   * N311: consecutive in-sync events to cancel T310.
   * Default 1 (3GPP TS 38.331 §5.3.10, range 1–10).
   * @source 3GPP TS 38.331 §5.3.10.3
   */
  rlf_n311?: number;
  /**
   * T310: RLF detection timer in ms.
   * Default 2000 ms (NTN extended from terrestrial 1000 ms per TR 38.821 §6.3.4).
   * @source 3GPP TS 38.331 §5.3.10.3, TR 38.821 §6.3.4
   */
  rlf_t310_ms?: number;
}

export interface EnergyConfig {
  /** Energy layer 1: beam/power EE (throughput / power). */
  layer1_enabled: boolean;
  /** Energy layer 2: onboard energy state and blocking. */
  layer2_enabled: boolean;
  /**
   * Energy cost per handover transaction in Joules (A8).
   * Applied as a one-shot debit to the satellite energy budget when HO executes.
   *
   * Governance:
   *   - No paper-backed default is adopted in the final simulator spec.
   *   - If a profile sets this field, it must carry an assumption-backed
   *     sourceMap entry with parameterPath = 'energy.energy_per_handover_j'.
   *   - Do not label any numeric value paper-backed unless a corpus-backed
   *     locator is added to the source registry.
   */
  energy_per_handover_j?: number;
  /**
   * Optional profile-level overrides for Layer 2 proof / showcase scenarios.
   * These remain truth-driving runtime inputs, but are not required for
   * benchmark baselines that keep Layer 2 disabled.
   */
  layer2_overrides?: {
    batteryCapacityWh?: number;
    initialSoc?: number;
    solarPowerW?: number;
    blockingThresholdSoc?: number;
    orbitalPeriodSec?: number;
    shadowFraction?: number;
    altitudeKm?: number;
    betaAngleDeg?: number;
  };
}

export type UeDistribution = 'uniform' | 'clustered' | 'hotspot';

export interface UeConfig {
  count: number;
  distribution: UeDistribution;
  /** UE speed in km/h (0 for static). */
  speed_kmh: number;
  /** Phase B: each UE has independent serving satellite and HO manager.
   *  When false (default), all UEs share the same serving satellite (Phase A).
   *  @see SDD §9.3.2 */
  independentHandover?: boolean;
}

// ---------------------------------------------------------------------------
// Phase 3 vocabulary: ScenarioConfig / ModelBundleSelection / ExperimentBundle / ProfileBundle
// Authority: sdd/phase3-scenario-profile-experiment-split.md §4
// ---------------------------------------------------------------------------

/**
 * ScenarioConfig — physical/environmental description.
 *
 * Defines: orbit mode, observer, scenario epoch, constellation topology
 * extensions, and UE spatial distribution.
 *
 * Does NOT contain:
 *   - P-classified numeric parameters (altitude_km, frequency_ghz, ttt_ms …)
 *   - MB-classified model selections (tier flags, handover.type, antenna.model …)
 *   - E-classified experiment controls (seed, durationSec, tleMaxSatellites …)
 *
 * Storage location: ProfileBundle.scenario
 * Authority: phase3-scenario-profile-experiment-split.md §4.1
 */
export interface ScenarioConfig {
  /** Orbit computation mode. 'synthetic' = Walker analytic; 'real-trace' = TLE/SGP4. */
  orbitMode: OrbitMode;
  /**
   * Path to OMM JSON file. Required when orbitMode === 'real-trace'.
   * Must not be set when orbitMode === 'synthetic'.
   */
  tleDataPath?: string;
  /** Observer location (lat/lon/alt) for geometry and sky-projection. */
  observer: ObserverLocation;
  /**
   * Scenario start epoch in UTC milliseconds.
   * Defines WHEN the simulation begins (orbital position, channel state).
   * Run duration and step are in ExperimentBundle.timeControl — NOT here.
   */
  epochUtcMs: number;
  /**
   * Constellation topology extensions (S-classified).
   * Only topology extensions beyond the primary Walker shell are S-classified:
   *   - orbitType (regime tag: leo/meo/geo)
   *   - extra_shells (multi-shell Walker)
   *   - geoSatellites (GEO relay satellites merged with Walker)
   * When absent, defaults apply: orbitType='leo', no extra shells, no GEO.
   */
  orbitalTopology?: {
    orbitType?: OrbitType;
    extra_shells?: Array<{
      id: string;
      altitude_km: number;
      inclination_deg: number;
      num_planes: number;
      sats_per_plane: number;
      phasing_factor?: number;
      orbitType?: OrbitType;
    }>;
    geoSatellites?: GeoStationaryConfig[];
  };
  /**
   * UE spatial distribution.
   * count and distribution define the scenario topology (S).
   * speed_kmh is P-classified and lives in ProfileBundle.ueConfig.
   */
  ueTopology: {
    count: number;
    distribution: UeDistribution;
  };
}

/**
 * ModelBundleSelection — declarative model family choices.
 *
 * Contains all MB-classified fields from phase0-architecture-spec.md §0B.6.
 *
 * Distinct from ModelBundle (Phase 2 runtime type):
 *   ModelBundleSelection = "which families are requested" (static config record)
 *   ModelBundle           = "which interfaces are instantiated" (runtime object)
 *
 * Storage location: ProfileBundle.models
 * Authority: phase3-scenario-profile-experiment-split.md §4.2
 */
export interface ModelBundleSelection {
  /** Beam semantics: earth-moving (scanning) or earth-fixed-bh (beam hopping). */
  beamSemantics: BeamSemantics;
  /** Beam gain model family. */
  antenna: {
    model: 'rpsat-3gpp' | 'bessel-j1' | 'itu-r' | 'flat-debug';
  };
  /** Beam layout and scheduling family selections. */
  beam: {
    layout: 'hexagonal' | 'circular' | 'custom';
    /**
     * BH scheduler strategy. Only meaningful when beamSemantics === 'earth-fixed-bh'.
     * Default: 'round-robin' when absent.
     */
    bh_strategy?: 'round-robin' | 'max-demand' | 'power-aware' |
      'deterministic-fixed' | 'proportional-fair' | 'sinr-greedy';
    /** Traffic demand model for demand-aware BH schedulers. Default: 'full-buffer' when absent. */
    bh_traffic_model?: 'poisson' | 'full-buffer' | 'hotspot' | 'uniform';
  };
  /** Channel model tier enable flags and path-loss family variant. */
  channel: {
    /** Tier 0: FSPL — always enabled; value must always be literal true. */
    tier0_fspl: true;
    tier1_large_scale: boolean;
    tier2_clutter: boolean;
    tier3_beam_gain: boolean;
    tier4_atmospheric: boolean;
    tier5_fading: boolean;
    tier6_doppler?: boolean;
    large_scale_model?: LargeScaleModel;
  };
  /** Handover algorithm family. */
  handover: {
    /** Which FSM family createHandoverManager() will instantiate. */
    type: HandoverType;
  };
  /** Energy model layer enable flags. */
  energy: {
    layer1_enabled: boolean;
    layer2_enabled: boolean;
  };
  /** UE model behavior flags. */
  ueConfig: {
    /** Phase B: each UE owns an independent HandoverManager. */
    independentHandover?: boolean;
  };
  /**
   * Policy preset — declares the default control algorithm for this profile.
   * When absent: defaults to 'no-op' (DP-5 ruling from phase2-model-bundle-sdd.md §5.7).
   * This is a declarative default only; SimEngineConfig.policy still overrides it.
   */
  policy?: {
    policyId: 'no-op' | 'greedy-sinr' | 'invalid-probe' | string;
  };
}

/**
 * ExperimentBundle — reproducible run definition.
 *
 * The same ProfileBundle + different ExperimentBundle = independent experiment.
 * Example: same paper baseline, 10 different seeds → 10 ExperimentBundles.
 *
 * Storage location: NOT inside ProfileBundle. Stored alongside it in per-family
 * defaults files as the paper-reported run conditions.
 * Authority: phase3-scenario-profile-experiment-split.md §4.3
 */
export interface ExperimentBundle {
  /** RNG seed for reproducible stochastic components. */
  seed: number;
  /**
   * Per-run timing controls.
   * NOTE: epochUtcMs (scenario epoch) is in ScenarioConfig, not here.
   */
  timeControl: {
    durationSec: number;
    stepSec: number;
  };
  /**
   * Maximum TLE satellites to load from the OMM JSON file.
   * Only meaningful when ScenarioConfig.orbitMode === 'real-trace'.
   * Default: 200 when absent. Classified E (performance cap, not physical).
   */
  tleMaxSatellites?: number;
  /** Optional KPI targets for automated reproduction verification. */
  kpiTargets?: Array<{
    metric: string;
    target: number;
    tolerance: number;
    toleranceMode: 'absolute' | 'relative';
  }>;
  /** Artifact recording policy. Absent = use runner defaults. */
  artifactPolicy?: {
    recordReplayManifest: boolean;
    recordSourceTrace: boolean;
    maxSnapshotHistory?: number;
  };
}

/**
 * ProfileBundle — named, versioned paper baseline.
 *
 * This is the authoring unit for a new paper baseline:
 *   - write one ProfileBundle (scenario + model selections + P-params)
 *   - write one default ExperimentBundle (paper-reported run conditions)
 *   - call composeProfile(bundle, exp) to get the ProfileConfig used at runtime
 *
 * Does NOT contain:
 *   - seed, durationSec, stepSec, tleMaxSatellites (→ ExperimentBundle)
 *   - kpiTargets, artifactPolicy (→ ExperimentBundle)
 *
 * Storage location: per-family files (see phase3-scenario-profile-experiment-split.md §8.3).
 * Assembled into ProfileConfig via composeProfile(bundle, exp).
 * Reverse operation: decomposeProfile(config): { bundle, exp }.
 * Authority: phase3-scenario-profile-experiment-split.md §4.4
 */
export interface ProfileBundle {
  // ── Profile metadata (PM) ────────────────────────────────────────────
  id: string;
  family: ProfileFamily;
  version: string;
  /**
   * Exposure preset: where this profile appears in the UI tier hierarchy.
   * Phase 4 P4-7 will consume this field to drive the profile list.
   * For Phase 3: populated from ControlPanel.PROFILE_OPTIONS current values.
   */
  exposurePreset: {
    tier: SpecMode;
    label: string;
  };

  // ── Physical/environment (S) ─────────────────────────────────────────
  scenario: ScenarioConfig;

  // ── Model family selections (MB) ─────────────────────────────────────
  models: ModelBundleSelection;

  // ── Parameter defaults (P — 58 PARAM-* values) ───────────────────────

  /** Primary Walker constellation P-params (6 fields). */
  orbital: {
    altitude_km: number;
    inclination_deg: number;
    num_planes: number;
    sats_per_plane: number;
    raan_spread_deg: number;
    phase_offset_deg: number;
    // NOTE: orbitType → scenario.orbitalTopology.orbitType
    // NOTE: extra_shells → scenario.orbitalTopology.extra_shells
    // NOTE: geoSatellites → scenario.orbitalTopology.geoSatellites
  };

  /** RF / link budget P-params (8 fields; all RfConfig fields are P-classified). */
  rf: {
    frequency_ghz: number;
    bandwidth_mhz: number;
    eirp_density_dbw_per_mhz: number;
    tx_power_per_beam_dbm?: number;
    max_tx_power_dbm: number | null;
    noise_temperature_k: number;
    noise_figure_db?: number;
    implementation_loss_db?: number;
  };

  /**
   * Antenna P-params (2 fields).
   * NOTE: antenna.model → models.antenna.model
   */
  antenna: {
    peak_gain_dbi: number;
    beam_diameter_km: number;
  };

  /**
   * Beam P-params (8 fields).
   * NOTE: beam.layout → models.beam.layout
   * NOTE: beam.bh_strategy → models.beam.bh_strategy
   * NOTE: beam.bh_traffic_model → models.beam.bh_traffic_model
   */
  beam: {
    num_beams: number;
    frf: number;
    interference_beams: number;
    bh_max_active_per_slot?: number;
    bh_frame_duration_sec?: number;
    bh_slots_per_frame?: number;
    bh_power_budget_w?: number;
    bh_traffic_arrival_rate?: number;
  };

  /**
   * Channel P-params (3 fields).
   * NOTE: all tier flags + large_scale_model → models.channel.*
   * NOTE: tier3_5_scan_loss deleted in P3-7 (DEAD classification)
   */
  channel: {
    deployment_environment?: DeploymentEnvironment;
    los_elevation_deg?: number;
    subcarrier_spacing_khz?: number;
  };

  /**
   * Handover P-params (21 fields).
   * NOTE: handover.type → models.handover.type
   */
  handover: {
    trigger_threshold_db: number;
    a3_offset_db?: number;
    ttt_ms: number;
    hysteresis_db: number;
    min_elevation_deg: number;
    pingPongWindowSec?: number;
    cho_offset_db?: number;
    cho_alpha?: number;
    cho_filter_k?: number;
    daps_preparation_time_sec?: number;
    daps_max_dual_active_sec?: number;
    mc_max_dual_sec?: number;
    mc_packet_duplication?: boolean;
    d2_serving_dist_km?: number;
    d2_target_dist_km?: number;
    sinr_ema_alpha?: number;
    rlf_qout_db?: number;
    rlf_qin_db?: number;
    rlf_n310?: number;
    rlf_n311?: number;
    rlf_t310_ms?: number;
  };

  /**
   * Energy P-params (9 fields).
   * NOTE: energy.layer1_enabled → models.energy.layer1_enabled
   * NOTE: energy.layer2_enabled → models.energy.layer2_enabled
   */
  energy: {
    energy_per_handover_j?: number;
    layer2_overrides?: {
      batteryCapacityWh?: number;
      initialSoc?: number;
      solarPowerW?: number;
      blockingThresholdSoc?: number;
      orbitalPeriodSec?: number;
      shadowFraction?: number;
      altitudeKm?: number;
      betaAngleDeg?: number;
    };
  };

  /**
   * UE P-params (1 field: speed_kmh).
   * NOTE: ueConfig.count → scenario.ueTopology.count
   * NOTE: ueConfig.distribution → scenario.ueTopology.distribution
   * NOTE: ueConfig.independentHandover → models.ueConfig.independentHandover
   */
  ueConfig: {
    speed_kmh: number;
  };

  // ── Provenance (PM — transitional) ──────────────────────────────────
  /**
   * Source references for KPI-impacting defaults.
   * Transitional: Phase 1 registry is now the canonical reference.
   * @deprecated Use the Phase 1 parameter registry as the canonical reference.
   *   Removal target: Phase 5 P5-7. Do not remove in Phase 3.
   */
  sourceMap: SourceReference[];
}

// ---------------------------------------------------------------------------
// Full Profile Config (SDD §6)
// ---------------------------------------------------------------------------

export interface ProfileConfig {
  /** Unique profile identifier. */
  id: string;
  /** Profile family. */
  family: ProfileFamily;
  /** Profile schema version. */
  version: string;

  orbitMode: OrbitMode;
  /** Path to OMM JSON file for real-trace mode. Required when orbitMode === 'real-trace'. */
  tleDataPath?: string;
  /** Max satellites to load from TLE (performance limit). Default 200. */
  tleMaxSatellites?: number;
  beamSemantics: BeamSemantics;

  observer: ObserverLocation;
  timeControl: TimeControl;
  seed: number;

  orbital: OrbitalConfig;
  rf: RfConfig;
  antenna: AntennaConfig;
  beam: BeamConfig;
  channel: ChannelConfig;
  handover: HandoverConfig;
  energy: EnergyConfig;
  ueConfig: UeConfig;

  /**
   * Source references for all KPI-impacting defaults.
   * dev-constraints §4.3: every KPI-impacting model must have source metadata.
   * @deprecated Use the Phase 1 parameter registry as the canonical reference.
   *   Removal target: Phase 5 P5-7. Do not remove in Phase 3.
   */
  sourceMap: SourceReference[];

  /**
   * Default policy preset identifier. Resolved by buildModelBundle() to a
   * policy plugin when SimEngineConfig.policy is absent.
   * Added in Phase 3 P3-1 for DP-5 resolution (phase2-model-bundle-sdd.md §5.7).
   * @default 'no-op' when absent.
   */
  policyId?: string;
}

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
