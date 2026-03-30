/**
 * HOBS multi-beam profile defaults.
 *
 * Profiles: hobs-multibeam-baseline, hobs-reproduction
 *
 * Authority: sdd/phase3-scenario-profile-experiment-split.md §8.3
 * Phase 3 Group 3 (P3-4b): extracted from defaults.ts.
 * This file must not import React, Three.js, or scene code.
 */

import type { ProfileConfig, ProfileBundle, ExperimentBundle } from './types';
import { composeProfile } from './profile-composer';
import {
  BEIJING_OBSERVER,
  MONTREAL_OBSERVER,
  DEFAULT_IMPLEMENTATION_LOSS_DB,
  SUBURBAN,
  EXTENDED_LARGE_SCALE,
} from './observers';

// ---------------------------------------------------------------------------
// 1. hobs-multibeam-baseline (profile-baselines §5)
// ---------------------------------------------------------------------------

const HOBS_MULTIBEAM_BASELINE_BUNDLE: ProfileBundle = {
  id: 'hobs-multibeam-baseline',
  family: 'hobs-multibeam-baseline',
  version: '0.1.0',
  exposurePreset: { tier: 'Advanced', label: 'Advanced — HOBS Multi-Beam (Ka 28 GHz)' },

  scenario: {
    orbitMode: 'synthetic',
    observer: MONTREAL_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    ueTopology: { count: 100, distribution: 'uniform' },
  },
  models: {
    beamSemantics: 'earth-moving',
    antenna: { model: 'bessel-j1' },
    beam: { layout: 'hexagonal', bh_strategy: 'round-robin' },
    channel: {
      tier0_fspl: true,
      tier1_large_scale: true,
      tier2_clutter: false,
      tier3_beam_gain: true,
      tier4_atmospheric: true,
      tier5_fading: false,
      large_scale_model: EXTENDED_LARGE_SCALE,
    },
    handover: { type: 'hard-ho' },
    energy: { layer1_enabled: true, layer2_enabled: false },
    ueConfig: {},
  },
  orbital: {
    altitude_km: 550,
    inclination_deg: 53,
    num_planes: 24,
    sats_per_plane: 22,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
  },
  rf: {
    frequency_ghz: 28.0,
    bandwidth_mhz: 100,
    eirp_density_dbw_per_mhz: 46,
    max_tx_power_dbm: 50,
    noise_temperature_k: 290,
    noise_figure_db: 5,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: { peak_gain_dbi: 38, beam_diameter_km: 25 },
  beam: {
    num_beams: 19,
    frf: 3,
    interference_beams: 0,
    bh_max_active_per_slot: 4,
    bh_frame_duration_sec: 5,
    bh_slots_per_frame: 5,
  },
  channel: { deployment_environment: SUBURBAN },
  handover: { trigger_threshold_db: -6, ttt_ms: 640, hysteresis_db: 1, min_elevation_deg: 10 },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'orbital.altitude_km', note: '550km orbit altitude' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.frequency_ghz', note: 'Ka-band 28GHz carrier' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.bandwidth_mhz', note: '100MHz bandwidth' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    {
      tier: 'paper-backed',
      id: 'PAP-2024-HOBS',
      parameterPath: 'rf.max_tx_power_dbm',
      specMode: 'Advanced',
      note: '50 dBm (100 W) from PAP-2024-HOBS Table I Pmax — this is the HOBS *paper* total TX budget for the 28 GHz / 37-beam scenario. IMPORTANT (GAP-9): this value is NOT the adopted spec P2 baseline cap. Per simulator-parameter-spec.md GAP-9: "split source roles — HOBS provides SINR/interference structure; S10 (PAP-2025-MAAC-BHPOWER) provides power caps." The spec P2 = 13 dBW ≈ 20 W is sourced from S10 (Ku-band BH context). The 50 dBm here is retained for HOBS-specific paper reproduction only (SINR skeleton profile); do NOT cite it as the general power baseline in thesis comparison tables. Spec mode: Advanced (HOBS reproduction only, not Realistic default).',
    },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'handover.trigger_threshold_db', note: 'SINR threshold −6 dB from HOBS baseline' },
    { tier: 'paper-backed', id: 'PAP-2021-SHADOWED-RICIAN', parameterPath: 'antenna.model', note: 'bessel-j1 antenna gain model' },
    { tier: 'paper-backed', id: 'PAP-2024-MADRL-CORE', note: 'multi-beam interference baseline' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', parameterPath: 'rf.noise_figure_db', note: 'noise_figure_db=5 dB (VSAT/laptop UE, Ka-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-002', parameterPath: 'orbital.num_planes', specMode: 'Advanced', note: 'Walker 24x22=528 sats; HOBS paper constellation scale assumption' },
    { tier: 'assumption-backed', id: 'ASSUME-CUR-002', parameterPath: 'rf.noise_temperature_k', specMode: 'Internal-only', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); spec R7: Internal-only fixed constant' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-001', parameterPath: 'antenna.peak_gain_dbi', specMode: 'Advanced', note: 'peak gain 38dBi, beam diameter 25km — representative Ka-band values (no single paper locator)' },
    { tier: 'assumption-backed', id: 'ASSUME-ATM-001', parameterPath: 'channel.tier4_atmospheric', specMode: 'Advanced', note: 'Tier 4 atmospheric: ITU-R P.676/P.618 mid-latitude Ka-band; gaseous 0.6dB, rain 1.5dB, scintillation 0.4dB; spec R3 Advanced mode only' },
    { tier: 'assumption-backed', id: 'ASSUME-ENERGY-001', parameterPath: 'energy.layer1_enabled', specMode: 'Internal-only', note: 'txPowerPerBeamDbm=40 dBm (spec P1 Realistic); activeBeamPowerW=20, idlePowerW=5 are GAP-5 unverified calibration values (spec P5/P6 Internal-only)' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-TTT-NTN', parameterPath: 'handover.ttt_ms', specMode: 'Advanced', note: 'TTT=640ms: NTN-extended assumption; spec H2 paper-backed presets are 0/40/256ms; 640ms is Advanced' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-THRESHOLD-SINR', parameterPath: 'handover.trigger_threshold_db', specMode: 'Advanced', note: 'trigger_threshold_db=−6 dB SINR-relative; spec H3 requires absolute derivation' },
  ],
};

const HOBS_MULTIBEAM_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 3600, stepSec: 1 },
};

export const HOBS_MULTIBEAM_BASELINE: ProfileConfig =
  composeProfile(HOBS_MULTIBEAM_BASELINE_BUNDLE, HOBS_MULTIBEAM_DEFAULT_EXP);

// ---------------------------------------------------------------------------
// 2. hobs-reproduction (RT-2: PAP-2024-HOBS)
// ---------------------------------------------------------------------------

const HOBS_REPRODUCTION_BUNDLE: ProfileBundle = {
  id: 'hobs-reproduction',
  family: 'hobs-multibeam-baseline',
  version: '0.1.0',
  exposurePreset: { tier: 'Sensitivity', label: 'Sensitivity — HOBS Repro' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    ueTopology: { count: 1, distribution: 'uniform' },
  },
  models: {
    beamSemantics: 'earth-moving',
    antenna: { model: 'bessel-j1' },
    beam: { layout: 'hexagonal' },
    channel: {
      tier0_fspl: true,
      tier1_large_scale: true,
      tier2_clutter: true,
      tier3_beam_gain: true,
      tier4_atmospheric: true,
      tier5_fading: false,
      large_scale_model: EXTENDED_LARGE_SCALE,
    },
    handover: { type: 'a4-event' },
    energy: { layer1_enabled: true, layer2_enabled: false },
    ueConfig: {},
  },
  // Paper §IV: Walker(55°, 72 sats, 6 planes, F=1), 550km
  orbital: {
    altitude_km: 550,
    inclination_deg: 55,
    num_planes: 6,
    sats_per_plane: 12,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
  },
  // Paper Table I: Ka-band 28GHz, 100MHz BW, Pmax=50dBm
  rf: {
    frequency_ghz: 28,
    bandwidth_mhz: 100,
    eirp_density_dbw_per_mhz: 46,
    max_tx_power_dbm: null,
    noise_temperature_k: 290,
    noise_figure_db: 5,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  // Paper §III: Bessel-J1 beam model
  antenna: { peak_gain_dbi: 38, beam_diameter_km: 25 },
  // Paper Table I: M=37 beams, FRF=3
  beam: { num_beams: 37, frf: 3, interference_beams: 42 },
  channel: { deployment_environment: SUBURBAN },
  handover: { trigger_threshold_db: -6, ttt_ms: 640, hysteresis_db: 1, min_elevation_deg: 10 },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', note: 'RT-2 reproduction: Walker(55°,72,6,F=1), 550km, Ka 28GHz, 100MHz BW (Table I), 37 beams FRF=3 (Table I), Bessel-J1 gain' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'assumption-backed', id: 'ASSUME-ENERGY-001', specMode: 'Internal-only', note: '20W active / 5W idle are assumption-backed values (spec GAP-5 Internal-only); HOBS Table II is beam training accuracy (not power values); PAP-2025-SMASH-MADQL citation unverified' },
    { tier: 'paper-backed', id: 'PAP-2021-SHADOWED-RICIAN', note: 'Bessel J1 beam gain family reference' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=5 dB (VSAT/laptop UE, Ka-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-REPRO-RT2', specMode: 'Advanced', note: 'Walker F=1 used; paper does not specify exact epoch' },
    { tier: 'assumption-backed', id: 'ASSUME-CUR-002', specMode: 'Internal-only', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); spec R7 Internal-only fixed constant' },
  ],
};

const HOBS_REPRODUCTION_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 600, stepSec: 1 },
};

export const HOBS_REPRODUCTION: ProfileConfig =
  composeProfile(HOBS_REPRODUCTION_BUNDLE, HOBS_REPRODUCTION_DEFAULT_EXP);
