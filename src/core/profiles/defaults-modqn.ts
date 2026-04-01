/**
 * MODQN paper-baseline profile defaults.
 *
 * Profiles: modqn-paper-baseline
 *
 * Authority:
 *   - sdd/modqn-baseline-spec-outline.md
 *   - sdd/modqn-runtime-outline.md
 *   - sdd/ntn-sim-core-profile-baselines.md
 */

import type { ProfileConfig, ProfileBundle, ExperimentBundle } from './types';
import { materializeRuntimeProfile } from './runtime-materialization';
import {
  BEIJING_OBSERVER,
  EXTENDED_LARGE_SCALE,
  SUBURBAN,
} from './observers';

export const MODQN_PAPER_BASELINE_BUNDLE: ProfileBundle = {
  id: 'modqn-paper-baseline',
  family: 'modqn-paper-baseline',
  version: '0.1.0',
  exposurePreset: { tier: 'Advanced', label: 'Advanced — MODQN 2024 Baseline' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 3, 36, 0),
    ueTopology: { count: 100, distribution: 'uniform' },
  },
  models: {
    beamSemantics: 'earth-moving',
    antenna: { model: 'bessel-j1' },
    beam: { layout: 'hexagonal' },
    channel: {
      tier0_fspl: true,
      tier1_large_scale: false,
      tier2_clutter: false,
      tier3_beam_gain: true,
      tier4_atmospheric: true,
      tier5_fading: true,
      large_scale_model: EXTENDED_LARGE_SCALE,
    },
    handover: { type: 'hard-ho' },
    energy: { layer1_enabled: false, layer2_enabled: false },
    ueConfig: { independentHandover: true },
    policy: { policyId: 'modqn-baseline' },
  },
  orbital: {
    altitude_km: 780,
    inclination_deg: 53,
    num_planes: 2,
    sats_per_plane: 2,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
  },
  rf: {
    frequency_ghz: 20,
    bandwidth_mhz: 500,
    eirp_density_dbw_per_mhz: 26,
    tx_power_per_beam_dbm: 33.0103,
    max_tx_power_dbm: null,
    noise_temperature_k: 290,
    noise_figure_db: 0,
    implementation_loss_db: 0,
  },
  antenna: {
    peak_gain_dbi: 60,
    beam_diameter_km: 90,
  },
  beam: {
    num_beams: 7,
    frf: 1,
    interference_beams: 0,
  },
  channel: {
    deployment_environment: SUBURBAN,
  },
  handover: {
    trigger_threshold_db: -30,
    ttt_ms: 0,
    hysteresis_db: 0,
    min_elevation_deg: 10,
    pingPongWindowSec: 10,
  },
  energy: {},
  ueConfig: { speed_kmh: 30 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2024-MORL-MULTIBEAM', note: 'baseline paper anchor: 4 satellites, 780 km, 7 beams/satellite, 100 users, 20 GHz, 500 MHz, 2 W per link, random wandering, weights [0.5,0.3,0.2]' },
    { tier: 'paper-backed', id: 'PAP-2024-MORL-MULTIBEAM', parameterPath: 'orbital.altitude_km', note: '780 km altitude (simulation parameters)' },
    { tier: 'paper-backed', id: 'PAP-2024-MORL-MULTIBEAM', parameterPath: 'rf.frequency_ghz', note: '20 GHz carrier frequency' },
    { tier: 'paper-backed', id: 'PAP-2024-MORL-MULTIBEAM', parameterPath: 'rf.bandwidth_mhz', note: '500 MHz channel bandwidth' },
    { tier: 'paper-backed', id: 'PAP-2024-MORL-MULTIBEAM', parameterPath: 'rf.tx_power_per_beam_dbm', note: 'transmit power p_i,l,v = 2 W = 33.01 dBm' },
    { tier: 'paper-backed', id: 'PAP-2024-MORL-MULTIBEAM', parameterPath: 'rf.noise_figure_db', note: 'noise PSD specified as -174 dBm/Hz, represented here as NF = 0 dB at T0 = 290 K' },
    { tier: 'paper-backed', id: 'PAP-2024-MORL-MULTIBEAM', parameterPath: 'beam.num_beams', note: '7 beams per satellite' },
    { tier: 'paper-backed', id: 'PAP-2024-MORL-MULTIBEAM', parameterPath: 'ueConfig.speed_kmh', note: '30 km/h random wandering user speed' },
    { tier: 'assumption-backed', id: 'ASSUME-MODQN-ORBIT', parameterPath: 'orbital.inclination_deg', specMode: 'Advanced', note: 'paper gives 4 satellites at 780 km but not the STK orbital plane layout; runtime uses a synthetic 2x2 Walker proxy at 53° inclination' },
    { tier: 'assumption-backed', id: 'ASSUME-MODQN-ORBIT', parameterPath: 'orbital.num_planes', specMode: 'Advanced', note: '2 orbital planes x 2 satellites approximates the unspecified 4-satellite STK constellation' },
    { tier: 'assumption-backed', id: 'ASSUME-MODQN-ORBIT', parameterPath: 'orbital.sats_per_plane', specMode: 'Advanced', note: '2 satellites per plane for the 4-satellite proxy shell' },
    { tier: 'assumption-backed', id: 'ASSUME-MODQN-BEAM', parameterPath: 'antenna.peak_gain_dbi', specMode: 'Advanced', note: 'paper does not specify antenna gain; runtime pins 60 dBi to keep the Ka-band spot-beam baseline numerically usable without importing foreign profile assumptions' },
    { tier: 'assumption-backed', id: 'ASSUME-MODQN-BEAM', parameterPath: 'antenna.beam_diameter_km', specMode: 'Advanced', note: 'paper specifies a 200 km x 90 km user area but not beam footprint; runtime uses a 90 km beam diameter for a 7-beam hexagonal proxy' },
    { tier: 'assumption-backed', id: 'ASSUME-MODQN-BEAM', parameterPath: 'rf.eirp_density_dbw_per_mhz', specMode: 'Advanced', note: 'derived spectral density from the assumed beam gain + 2 W per-link power; kept explicit for runtime auditability' },
    { tier: 'assumption-backed', id: 'ASSUME-MODQN-RUNTIME', specMode: 'Advanced', note: 'episode epoch shifted to 2026-01-01T03:36:00Z so the disclosed 10 s MODQN runtime window intersects a visible pass for the 2x2 proxy shell' },
    { tier: 'assumption-backed', id: 'ASSUME-MODQN-RUNTIME', parameterPath: 'handover.trigger_threshold_db', specMode: 'Advanced', note: 'policy-driven hard handover uses a permissive attach floor because beam choice comes from MODQN, not A3/A4 thresholding' },
    { tier: 'assumption-backed', id: 'ASSUME-MODQN-RUNTIME', parameterPath: 'handover.ttt_ms', specMode: 'Advanced', note: 'runtime uses TTT = 0 ms so each slot-wise MODQN decision can execute immediately' },
    { tier: 'assumption-backed', id: 'ASSUME-MODQN-RUNTIME', parameterPath: 'handover.hysteresis_db', specMode: 'Advanced', note: 'runtime sets hysteresis = 0 to match slot-wise policy decisions' },
    { tier: 'assumption-backed', id: 'ASSUME-MODQN-RUNTIME', parameterPath: 'handover.pingPongWindowSec', specMode: 'Advanced', note: '10 s diagnostic ping-pong window for KPI bookkeeping; not a paper baseline constant' },
    { tier: 'assumption-backed', id: 'ASSUME-MODQN-RUNTIME', parameterPath: 'ueConfig.independentHandover', specMode: 'Advanced', note: 'per-user MODQN decisions map to the existing independent-handover runtime path' },
  ],
};

export const MODQN_PAPER_BASELINE_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 10, stepSec: 1 },
};

export const MODQN_PAPER_BASELINE: ProfileConfig =
  materializeRuntimeProfile(MODQN_PAPER_BASELINE_BUNDLE, MODQN_PAPER_BASELINE_DEFAULT_EXP);
