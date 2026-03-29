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
   * Tier 3.5: phased-array scan loss (Ka-band only).
   * NOT YET WIRED — setting this flag has no effect until the engine
   * computes per-beam scan angles and passes them to computeLinkBudget().
   * The underlying formula exists in link-budget.ts (tier35ScanLoss path)
   * but the engine does not yet supply scanAngleDeg per beam.
   * @status dead-path — do not use in benchmark claims.
   */
  tier3_5_scan_loss?: boolean;
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
   */
  sourceMap: SourceReference[];
}

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
