import type {
  OrbitMode,
  BeamSemantics,
  ObserverLocation,
  TimeControl,
} from '../common/types';
import type { OrbitType, GeoStationaryConfig } from '../orbit/types';

/**
 * Phase 5 Core Structural Split: Runtime Schema.
 * Ownership: Flat runtime configuration types (ProfileConfig).
 */

export type LargeScaleModel = '3gpp-baseline' | '3gpp-extended';
export type DeploymentEnvironment = 'rural' | 'suburban' | 'dense-urban';
export type UeDistribution = 'uniform' | 'clustered' | 'hotspot';
export type SlantRangeMode = 'geometry' | 'tr38811-elevation';
export type UeGeometryMode = 'observer-shared' | 'per-ue-topocentric';
export type ChannelPowerCouplingMode = 'legacy-fixed-eirp' | 'beam-power-override';
export type ChannelLosMode = 'threshold-elevation' | 'tr38811-probability';
export type EarthMovingBeamTrackingMode =
  | 'ue-anchored-steering'
  | 'nadir-relative-bounded-steering';
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
  | 'max-remaining-time'
  | 'sinr-offset';

export interface OrbitalConfig {
  orbitType?: OrbitType;
  altitude_km: number;
  inclination_deg: number;
  num_planes: number;
  sats_per_plane: number;
  raan_spread_deg: number;
  phase_offset_deg: number;
  /** Walker phasing factor F. Default: floor(num_planes/2) (PAP-2021-SESSION-DURATION). */
  phasing_factor?: number;
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
}

export interface RfConfig {
  frequency_ghz: number;
  bandwidth_mhz: number;
  eirp_density_dbw_per_mhz: number;
  tx_power_per_beam_dbm?: number;
  max_tx_power_dbm: number | null;
  noise_temperature_k: number;
  noise_figure_db?: number;
  implementation_loss_db?: number;
  ue_antenna_gain_dbi?: number;
}

export interface AntennaConfig {
  model: 'rpsat-3gpp' | 'bessel-j1' | 'bessel-j1j3' | 'itu-r' | 'flat-debug';
  peak_gain_dbi: number;
  beam_diameter_km: number;
}

export interface BeamConfig {
  num_beams: number;
  layout: 'hexagonal' | 'circular' | 'custom';
  tracking_mode?: EarthMovingBeamTrackingMode;
  steering_bound_km?: number;
  frf: number;
  interference_beams: number;
  bh_max_active_per_slot?: number;
  bh_frame_duration_sec?: number;
  bh_slots_per_frame?: number;
  bh_strategy?: 'round-robin' | 'max-demand' | 'power-aware' | 'deterministic-fixed' | 'proportional-fair' | 'sinr-greedy';
  bh_power_budget_w?: number;
  bh_traffic_model?: 'poisson' | 'full-buffer' | 'hotspot' | 'uniform';
  bh_traffic_arrival_rate?: number;
}

export interface ChannelConfig {
  tier0_fspl: true;
  tier1_large_scale: boolean;
  tier2_clutter: boolean;
  tier3_beam_gain: boolean;
  tier4_atmospheric: boolean;
  tier5_fading: boolean;
  large_scale_model?: LargeScaleModel;
  deployment_environment?: DeploymentEnvironment;
  tier6_doppler?: boolean;
  los_mode?: ChannelLosMode;
  subcarrier_spacing_khz?: number;
  los_elevation_deg?: number;
  slant_range_mode?: SlantRangeMode;
  ue_geometry_mode?: UeGeometryMode;
  power_coupling_mode?: ChannelPowerCouplingMode;
  max_interfering_sats?: number | null;
}

export interface HandoverConfig {
  type: HandoverType;
  trigger_threshold_db: number;
  a3_offset_db?: number;
  ttt_ms: number;
  hysteresis_db: number;
  min_elevation_deg: number;
  pingPongWindowSec?: number;
  daps_prepare_elevation_deg?: number;
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
  sinr_offset_db?: number;
  sinr_offset_trigger_time_sec?: number;
  sinr_offset_pending_hold_sec?: number;
  sinr_offset_smoothing_sec?: number;
  sinr_offset_intra_switch_sec?: number;
  rlf_qout_db?: number;
  rlf_qin_db?: number;
  rlf_n310?: number;
  rlf_n311?: number;
  rlf_t310_ms?: number;
}

export interface EnergyConfig {
  layer1_enabled: boolean;
  layer2_enabled: boolean;
  energy_per_handover_j?: number;
  layer1_overrides?: {
    txPowerPerBeamDbm?: number;
    activeBeamPowerW?: number;
    idlePowerW?: number;
    offBeamPowerW?: number;
    dpcEnabled?: boolean;
    dpcTargetSinrDb?: number;
  };
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

export interface UeConfig {
  count: number;
  distribution: UeDistribution;
  speed_kmh: number;
  independentHandover?: boolean;
}

export interface ProfileConfig {
  id: string;
  family: any; // Circular dep if we use ProfileFamily from bundle-vocabulary
  version: string;
  orbitMode: OrbitMode;
  tleDataPath?: string;
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
  policyId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
