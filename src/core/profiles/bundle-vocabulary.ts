import type {
  SourceReference,
  OrbitMode,
  BeamSemantics,
  ObserverLocation,
  SpecMode,
} from '../common/types';
import type { OrbitType, GeoStationaryConfig } from '../orbit/types';
import type {
  HandoverType,
  LargeScaleModel,
  DeploymentEnvironment,
  UeDistribution,
} from './runtime-schema';

/**
 * Phase 5 Core Structural Split: Bundle Vocabulary.
 * Ownership: Phase 3 vocabulary types (Scenario, ModelBundleSelection, ProfileBundle).
 */

export type ProfileFamily =
  | 'case9-access-baseline'
  | 'modqn-paper-baseline'
  | 'hobs-multibeam-baseline'
  | 'bh-resource-baseline'
  | 'real-trace-validation'
  | 'case9-daps-baseline'
  | 'meo-constellation-baseline'
  | 'geo-relay-baseline'
  | 'realistic-first-screen';

export interface ScenarioConfig {
  orbitMode: OrbitMode;
  tleDataPath?: string;
  observer: ObserverLocation;
  epochUtcMs: number;
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
  ueTopology: {
    count: number;
    distribution: UeDistribution;
  };
}

export interface ModelBundleSelection {
  beamSemantics: BeamSemantics;
  antenna: {
    model: 'rpsat-3gpp' | 'bessel-j1' | 'itu-r' | 'flat-debug';
  };
  beam: {
    layout: 'hexagonal' | 'circular' | 'custom';
    bh_strategy?: 'round-robin' | 'max-demand' | 'power-aware' | 'deterministic-fixed' | 'proportional-fair' | 'sinr-greedy';
    bh_traffic_model?: 'poisson' | 'full-buffer' | 'hotspot' | 'uniform';
  };
  channel: {
    tier0_fspl: true;
    tier1_large_scale: boolean;
    tier2_clutter: boolean;
    tier3_beam_gain: boolean;
    tier4_atmospheric: boolean;
    tier5_fading: boolean;
    tier6_doppler?: boolean;
    large_scale_model?: LargeScaleModel;
  };
  handover: {
    type: HandoverType;
  };
  energy: {
    layer1_enabled: boolean;
    layer2_enabled: boolean;
  };
  ueConfig: {
    independentHandover?: boolean;
  };
  policy?: {
    policyId: 'no-op' | 'greedy-sinr' | 'invalid-probe' | string;
  };
}

export interface ExperimentBundle {
  seed: number;
  timeControl: {
    durationSec: number;
    stepSec: number;
  };
  tleMaxSatellites?: number;
  kpiTargets?: Array<{
    metric: string;
    target: number;
    tolerance: number;
    toleranceMode: 'absolute' | 'relative';
  }>;
  artifactPolicy?: {
    recordReplayManifest: boolean;
    recordSourceTrace: boolean;
    maxSnapshotHistory?: number;
  };
}

export interface ProfileBundle {
  id: string;
  family: ProfileFamily;
  version: string;
  exposurePreset: {
    tier: SpecMode;
    label: string;
  };
  scenario: ScenarioConfig;
  models: ModelBundleSelection;
  orbital: {
    altitude_km: number;
    inclination_deg: number;
    num_planes: number;
    sats_per_plane: number;
    raan_spread_deg: number;
    phase_offset_deg: number;
    /** Walker phasing factor F. Default: floor(num_planes/2) (PAP-2021-SESSION-DURATION). */
    phasing_factor?: number;
  };
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
  antenna: {
    peak_gain_dbi: number;
    beam_diameter_km: number;
  };
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
  channel: {
    deployment_environment?: DeploymentEnvironment;
    los_elevation_deg?: number;
    subcarrier_spacing_khz?: number;
  };
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
  ueConfig: {
    speed_kmh: number;
  };
  sourceMap: SourceReference[];
}
