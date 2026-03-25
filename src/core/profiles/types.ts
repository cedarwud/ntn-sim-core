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
  | 'timer-cho'
  | 'daps';

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
}

export interface EnergyConfig {
  /** Energy layer 1: beam/power EE (throughput / power). */
  layer1_enabled: boolean;
  /** Energy layer 2: onboard energy state and blocking. */
  layer2_enabled: boolean;
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
