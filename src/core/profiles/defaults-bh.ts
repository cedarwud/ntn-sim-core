/**
 * Beam-hopping profile defaults.
 *
 * Profiles: bh-resource-baseline, bh-resource-energy-proof,
 *           bh-pf-baseline, bh-sinr-greedy-baseline
 *
 * Authority: sdd/phase3-scenario-profile-experiment-split.md §8.3
 * Phase 3 Group 3 (P3-4c): extracted from defaults.ts.
 * This file must not import React, Three.js, or scene code.
 */

import type { ProfileConfig, ProfileBundle, ExperimentBundle } from './types';
import { composeProfile } from './profile-composer';
import {
  BEIJING_OBSERVER,
  DEFAULT_IMPLEMENTATION_LOSS_DB,
  SUBURBAN,
  EXTENDED_LARGE_SCALE,
} from './observers';

// Shared BH orbital / RF / antenna / beam / channel / handover defaults
const BH_ORBITAL = {
  altitude_km: 780,
  inclination_deg: 86.4,
  num_planes: 18,
  sats_per_plane: 18,
  raan_spread_deg: 360,
  phase_offset_deg: 0,
} as const;

const BH_RF = {
  frequency_ghz: 20.0,
  bandwidth_mhz: 500,
  eirp_density_dbw_per_mhz: 46,
  max_tx_power_dbm: 43 as number | null,
  noise_temperature_k: 290,
  noise_figure_db: 5,
  implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
};

// ---------------------------------------------------------------------------
// 1. bh-resource-baseline (profile-baselines §6, subprofile bh-sfr-780)
// ---------------------------------------------------------------------------

const BH_RESOURCE_BASELINE_BUNDLE: ProfileBundle = {
  id: 'bh-resource-baseline',
  family: 'bh-resource-baseline',
  version: '0.1.0',
  exposurePreset: { tier: 'Advanced', label: 'Advanced — BH Resource (Ka 20 GHz)' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    ueTopology: { count: 100, distribution: 'uniform' },
  },
  models: {
    beamSemantics: 'earth-fixed-bh',
    antenna: { model: 'bessel-j1' },
    beam: { layout: 'hexagonal', bh_strategy: 'round-robin', bh_traffic_model: 'uniform' },
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
  orbital: { ...BH_ORBITAL },
  rf: { ...BH_RF },
  antenna: { peak_gain_dbi: 35, beam_diameter_km: 30 },
  beam: {
    num_beams: 12,
    frf: 3,
    interference_beams: 0,
    bh_max_active_per_slot: 4,
    bh_frame_duration_sec: 5,
    bh_slots_per_frame: 3,
  },
  channel: { deployment_environment: SUBURBAN },
  handover: { trigger_threshold_db: -6, ttt_ms: 640, hysteresis_db: 1, min_elevation_deg: 10 },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2026-BHFREQREUSE', note: '780km, 66 sats (6x11), 12 beams, soft frequency reuse' },
    { tier: 'paper-backed', id: 'PAP-2025-EEBH-UPLINK', note: 'BH energy efficiency reference' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'paper-backed', id: 'PAP-2025-MAAC-BHPOWER', parameterPath: 'rf.max_tx_power_dbm', note: '13 dBW aggregate satellite TX budget (43 dBm) from [S10]' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', parameterPath: 'rf.noise_figure_db', note: 'noise_figure_db=5 dB (VSAT/laptop UE, Ka-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-CUR-002', parameterPath: 'rf.noise_temperature_k', specMode: 'Internal-only', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); spec R7 Internal-only fixed constant' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-002', parameterPath: 'antenna.peak_gain_dbi', specMode: 'Advanced', note: 'peak gain 35dBi — representative Ka/Ku-band BH value; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-002', parameterPath: 'antenna.beam_diameter_km', specMode: 'Advanced', note: 'beam diameter 30km — representative Ka/Ku-band BH value; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-RF-001', parameterPath: 'rf.frequency_ghz', specMode: 'Advanced', note: 'Ka-band 20GHz — representative for BH resource studies; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-BW-001', parameterPath: 'rf.bandwidth_mhz', specMode: 'Advanced', note: '500MHz BW — representative for BH resource studies; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-TTT-NTN', parameterPath: 'handover.ttt_ms', specMode: 'Advanced', note: 'TTT=640ms: NTN-extended assumption; spec H2 paper-backed presets are 0/40/256ms' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-THRESHOLD-SINR', parameterPath: 'handover.trigger_threshold_db', specMode: 'Advanced', note: 'trigger_threshold_db=−6 dB SINR-relative; spec H3 requires absolute derivation' },
    { tier: 'assumption-backed', id: 'ASSUME-ENERGY-001', parameterPath: 'energy.layer1_enabled', specMode: 'Internal-only', note: 'activeBeamPowerW=20, idlePowerW=5 are GAP-5 unverified calibration values (spec P5/P6 Internal-only)' },
  ],
};

const BH_RESOURCE_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 600, stepSec: 1 },
};

export const BH_RESOURCE_BASELINE: ProfileConfig =
  composeProfile(BH_RESOURCE_BASELINE_BUNDLE, BH_RESOURCE_DEFAULT_EXP);

// ---------------------------------------------------------------------------
// 2. bh-resource-energy-proof — deterministic Phase 5 proof path
// ---------------------------------------------------------------------------

const BH_RESOURCE_ENERGY_PROOF_BUNDLE: ProfileBundle = {
  id: 'bh-resource-energy-proof',
  family: 'bh-resource-baseline',
  version: '0.1.0',
  exposurePreset: { tier: 'Sensitivity', label: 'Sensitivity — BH Energy Proof' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    ueTopology: { count: 100, distribution: 'uniform' },
  },
  models: {
    beamSemantics: 'earth-fixed-bh',
    antenna: { model: 'bessel-j1' },
    beam: { layout: 'hexagonal', bh_strategy: 'deterministic-fixed', bh_traffic_model: 'uniform' },
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
    energy: { layer1_enabled: true, layer2_enabled: true },
    ueConfig: {},
  },
  orbital: { ...BH_ORBITAL },
  rf: { ...BH_RF },
  antenna: { peak_gain_dbi: 33, beam_diameter_km: 100 },
  beam: {
    num_beams: 37,
    frf: 3,
    interference_beams: 0,
    bh_max_active_per_slot: 4,
    bh_frame_duration_sec: 5,
    bh_slots_per_frame: 3,
  },
  channel: { deployment_environment: SUBURBAN },
  handover: { trigger_threshold_db: -6, ttt_ms: 640, hysteresis_db: 1, min_elevation_deg: 10 },
  energy: {
    layer2_overrides: {
      batteryCapacityWh: 0.5,
      initialSoc: 0.6,
      solarPowerW: 0,
      blockingThresholdSoc: 0.15,
      orbitalPeriodSec: 5760,
      shadowFraction: 0.35,
    },
  },
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2026-BHFREQREUSE', note: '780km, 66 sats (6x11), 12 beams, soft frequency reuse' },
    { tier: 'paper-backed', id: 'PAP-2025-EEBH-UPLINK', note: 'BH energy efficiency reference' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'paper-backed', id: 'PAP-2025-MAAC-BHPOWER', parameterPath: 'rf.max_tx_power_dbm', note: '13 dBW aggregate satellite TX budget (43 dBm) from [S10]' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', parameterPath: 'rf.noise_figure_db', note: 'noise_figure_db=5 dB (VSAT/laptop UE, Ka-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-CUR-002', parameterPath: 'rf.noise_temperature_k', specMode: 'Internal-only', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); spec R7 Internal-only fixed constant' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-002', parameterPath: 'antenna.peak_gain_dbi', specMode: 'Advanced', note: 'peak gain 35dBi — representative Ka/Ku-band BH value; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-002', parameterPath: 'antenna.beam_diameter_km', specMode: 'Advanced', note: 'beam diameter 30km — representative Ka/Ku-band BH value; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-RF-001', parameterPath: 'rf.frequency_ghz', specMode: 'Advanced', note: 'Ka-band 20GHz — representative for BH resource studies; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-BW-001', parameterPath: 'rf.bandwidth_mhz', specMode: 'Advanced', note: '500MHz BW — representative for BH resource studies; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-TTT-NTN', parameterPath: 'handover.ttt_ms', specMode: 'Advanced', note: 'TTT=640ms: NTN-extended assumption; spec H2 paper-backed presets are 0/40/256ms' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-THRESHOLD-SINR', parameterPath: 'handover.trigger_threshold_db', specMode: 'Advanced', note: 'trigger_threshold_db=−6 dB SINR-relative; spec H3 requires absolute derivation' },
    {
      tier: 'assumption-backed',
      id: 'ASSUME-ENE-001',
      specMode: 'Internal-only',
      note: 'Layer 2 proof profile uses reduced battery capacity and zero-solar showcase overrides to expose deterministic energyBlocked service loss without changing physics code paths',
    },
    {
      tier: 'assumption-backed',
      id: 'ASSUME-CUR-002',
      specMode: 'Internal-only',
      note: 'deterministic-fixed BH scheduling plus expanded 37-beam / 100km footprint geometry is used only for proof/validation closure so inactive-beam and energy-blocked states appear repeatably in browser automation',
    },
  ],
};

const BH_RESOURCE_ENERGY_PROOF_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 240, stepSec: 1 },
};

export const BH_RESOURCE_ENERGY_PROOF: ProfileConfig =
  composeProfile(BH_RESOURCE_ENERGY_PROOF_BUNDLE, BH_RESOURCE_ENERGY_PROOF_EXP);

// ---------------------------------------------------------------------------
// 3. bh-pf-baseline — Proportional Fair BH scheduler
// ---------------------------------------------------------------------------

const BH_PF_BASELINE_BUNDLE: ProfileBundle = {
  id: 'bh-pf-baseline',
  family: 'bh-resource-baseline',
  version: '0.1.0',
  exposurePreset: { tier: 'Sensitivity', label: 'Sensitivity — BH Proportional-Fair' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    ueTopology: { count: 10, distribution: 'hotspot' },
  },
  models: {
    beamSemantics: 'earth-fixed-bh',
    antenna: { model: 'bessel-j1' },
    beam: { layout: 'hexagonal', bh_strategy: 'proportional-fair', bh_traffic_model: 'hotspot' },
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
    ueConfig: { independentHandover: true },
  },
  orbital: { ...BH_ORBITAL },
  rf: { ...BH_RF },
  antenna: { peak_gain_dbi: 35, beam_diameter_km: 30 },
  beam: {
    num_beams: 12,
    frf: 3,
    interference_beams: 0,
    bh_max_active_per_slot: 4,
    bh_frame_duration_sec: 5,
    bh_slots_per_frame: 3,
    bh_traffic_arrival_rate: 15,
  },
  channel: { deployment_environment: SUBURBAN },
  handover: { trigger_threshold_db: -6, ttt_ms: 640, hysteresis_db: 1, min_elevation_deg: 10 },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2026-BHFREQREUSE', note: '780km, 66 sats (6x11), 12 beams, soft frequency reuse' },
    { tier: 'paper-backed', id: 'PAP-2025-EEBH-UPLINK', note: 'BH energy efficiency reference' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'paper-backed', id: 'PAP-2025-MAAC-BHPOWER', parameterPath: 'rf.max_tx_power_dbm', note: '13 dBW aggregate satellite TX budget (43 dBm) from [S10]' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', parameterPath: 'rf.noise_figure_db', note: 'noise_figure_db=5 dB (VSAT/laptop UE, Ka-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-CUR-002', parameterPath: 'rf.noise_temperature_k', specMode: 'Internal-only', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); spec R7 Internal-only fixed constant' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-002', parameterPath: 'antenna.peak_gain_dbi', specMode: 'Advanced', note: 'peak gain 35dBi — representative Ka/Ku-band BH value; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-002', parameterPath: 'antenna.beam_diameter_km', specMode: 'Advanced', note: 'beam diameter 30km — representative Ka/Ku-band BH value; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-RF-001', parameterPath: 'rf.frequency_ghz', specMode: 'Advanced', note: 'Ka-band 20GHz — representative for BH resource studies; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-BW-001', parameterPath: 'rf.bandwidth_mhz', specMode: 'Advanced', note: '500MHz BW — representative for BH resource studies; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-TTT-NTN', parameterPath: 'handover.ttt_ms', specMode: 'Advanced', note: 'TTT=640ms: NTN-extended assumption; spec H2 paper-backed presets are 0/40/256ms' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-THRESHOLD-SINR', parameterPath: 'handover.trigger_threshold_db', specMode: 'Advanced', note: 'trigger_threshold_db=−6 dB SINR-relative; spec H3 requires absolute derivation' },
    { tier: 'assumption-backed', id: 'ASSUME-ENERGY-001', parameterPath: 'energy.layer1_enabled', specMode: 'Internal-only', note: 'activeBeamPowerW=20, idlePowerW=5 are GAP-5 unverified calibration values (spec P5/P6 Internal-only)' },
    {
      tier: 'paper-backed',
      id: 'PAP-2024-HOBS',
      note: 'PF scheduler is the non-DRL baseline in HOBS paper Fig.6 comparison',
    },
    {
      tier: 'paper-backed',
      id: 'PAP-2025-SMASH-MADQL',
      note: 'PF scheduler is baseline strategy in multi-agent BH comparison Table II',
    },
  ],
};

const BH_PF_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 600, stepSec: 1 },
};

export const BH_PF_BASELINE: ProfileConfig =
  composeProfile(BH_PF_BASELINE_BUNDLE, BH_PF_DEFAULT_EXP);

// ---------------------------------------------------------------------------
// 4. bh-sinr-greedy-baseline — SINR-Greedy BH scheduler
// ---------------------------------------------------------------------------

const BH_SINR_GREEDY_BASELINE_BUNDLE: ProfileBundle = {
  id: 'bh-sinr-greedy-baseline',
  family: 'bh-resource-baseline',
  version: '0.1.0',
  exposurePreset: { tier: 'Sensitivity', label: 'Sensitivity — BH SINR-Greedy' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    ueTopology: { count: 5, distribution: 'uniform' },
  },
  models: {
    beamSemantics: 'earth-fixed-bh',
    antenna: { model: 'bessel-j1' },
    beam: { layout: 'hexagonal', bh_strategy: 'sinr-greedy', bh_traffic_model: 'uniform' },
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
    ueConfig: { independentHandover: true },
  },
  orbital: { ...BH_ORBITAL },
  rf: { ...BH_RF },
  antenna: { peak_gain_dbi: 35, beam_diameter_km: 30 },
  beam: {
    num_beams: 12,
    frf: 3,
    interference_beams: 0,
    bh_max_active_per_slot: 4,
    bh_frame_duration_sec: 5,
    bh_slots_per_frame: 3,
  },
  channel: { deployment_environment: SUBURBAN },
  handover: { trigger_threshold_db: -6, ttt_ms: 640, hysteresis_db: 1, min_elevation_deg: 10 },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2026-BHFREQREUSE', note: '780km, 66 sats (6x11), 12 beams, soft frequency reuse' },
    { tier: 'paper-backed', id: 'PAP-2025-EEBH-UPLINK', note: 'BH energy efficiency reference' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'paper-backed', id: 'PAP-2025-MAAC-BHPOWER', parameterPath: 'rf.max_tx_power_dbm', note: '13 dBW aggregate satellite TX budget (43 dBm) from [S10]' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', parameterPath: 'rf.noise_figure_db', note: 'noise_figure_db=5 dB (VSAT/laptop UE, Ka-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-CUR-002', parameterPath: 'rf.noise_temperature_k', specMode: 'Internal-only', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); spec R7 Internal-only fixed constant' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-002', parameterPath: 'antenna.peak_gain_dbi', specMode: 'Advanced', note: 'peak gain 35dBi — representative Ka/Ku-band BH value; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-002', parameterPath: 'antenna.beam_diameter_km', specMode: 'Advanced', note: 'beam diameter 30km — representative Ka/Ku-band BH value; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-RF-001', parameterPath: 'rf.frequency_ghz', specMode: 'Advanced', note: 'Ka-band 20GHz — representative for BH resource studies; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-BW-001', parameterPath: 'rf.bandwidth_mhz', specMode: 'Advanced', note: '500MHz BW — representative for BH resource studies; no single paper locator' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-TTT-NTN', parameterPath: 'handover.ttt_ms', specMode: 'Advanced', note: 'TTT=640ms: NTN-extended assumption; spec H2 paper-backed presets are 0/40/256ms' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-THRESHOLD-SINR', parameterPath: 'handover.trigger_threshold_db', specMode: 'Advanced', note: 'trigger_threshold_db=−6 dB SINR-relative; spec H3 requires absolute derivation' },
    { tier: 'assumption-backed', id: 'ASSUME-ENERGY-001', parameterPath: 'energy.layer1_enabled', specMode: 'Internal-only', note: 'activeBeamPowerW=20, idlePowerW=5 are GAP-5 unverified calibration values (spec P5/P6 Internal-only)' },
    {
      tier: 'paper-backed',
      id: 'PAP-2026-DRL-BHOPT',
      note: 'SINR-greedy is the channel-aware upper-bound baseline for DRL BH optimization',
    },
  ],
};

const BH_SINR_GREEDY_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 600, stepSec: 1 },
};

export const BH_SINR_GREEDY_BASELINE: ProfileConfig =
  composeProfile(BH_SINR_GREEDY_BASELINE_BUNDLE, BH_SINR_GREEDY_DEFAULT_EXP);
