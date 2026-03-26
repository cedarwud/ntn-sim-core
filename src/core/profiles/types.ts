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
  | 'case9-daps-baseline';

// ---------------------------------------------------------------------------
// Sub-config types
// ---------------------------------------------------------------------------

export interface OrbitalConfig {
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
  }>;
}

export interface RfConfig {
  frequency_ghz: number;
  bandwidth_mhz: number;
  /** EIRP spectral density in dBW/MHz. */
  eirp_density_dbw_per_mhz: number;
  /** Maximum transmit power in dBm (used for energy accounting). */
  max_tx_power_dbm: number | null;
  /** Noise temperature in K (antenna + sky). */
  noise_temperature_k: number;
  /** UE receiver noise figure in dB (MS5 fix). Default 7 dB (3GPP typical UE).
   *  System noise temp = T_ant + T_0·(10^(NF/10) - 1) where T_0 = 290K */
  noise_figure_db?: number;
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
  bh_strategy?: 'round-robin' | 'max-demand' | 'power-aware' | 'deterministic-fixed';
  /** Power budget per satellite for power-aware BH scheduling (W). Required for 'power-aware' strategy. */
  bh_power_budget_w?: number;
  /** Traffic model for demand-aware BH scheduling. */
  bh_traffic_model?: 'poisson' | 'full-buffer' | 'hotspot' | 'uniform';
  /** Mean arrival rate per beam per second (Poisson model). Default 10. */
  bh_traffic_arrival_rate?: number;
}

/** Channel model tier enable flags (profile-baselines §8.1). */
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
  /** A3/A4 trigger threshold in dB. */
  trigger_threshold_db: number;
  /** Time-to-trigger in ms. */
  ttt_ms: number;
  /** Hysteresis in dB. */
  hysteresis_db: number;
  /** Minimum elevation angle for candidate cells in degrees. */
  min_elevation_deg: number;

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
   * Default: 0 (disabled). Typical value: 3 J (from leo-simulator).
   * @source leo-simulator/src/config/energy.config.ts
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
