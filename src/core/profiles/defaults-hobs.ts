/**
 * HOBS multi-beam profile defaults.
 *
 * Profiles: hobs-multibeam-baseline, hobs-reproduction, hobs-tr38811-research
 *
 * Authority: sdd/phase3-scenario-profile-experiment-split.md §8.3
 * Phase 3 Group 3 (P3-4b): extracted from defaults.ts.
 * This file must not import React, Three.js, or scene code.
 */

import type { ProfileConfig, ProfileBundle, ExperimentBundle } from './types';
import { materializeRuntimeProfile } from './runtime-materialization';
import {
  BEIJING_OBSERVER,
  MONTREAL_OBSERVER,
  DEFAULT_IMPLEMENTATION_LOSS_DB,
  SUBURBAN,
  EXTENDED_LARGE_SCALE,
} from './observers';

const HOBS_ALTITUDE_KM = 550;
const HOBS_BANDWIDTH_MHZ = 100;
const HOBS_TX_POWER_DBM = 50;
const HOBS_PEAK_GAIN_DBI = 40;
const HOBS_THETA_3DB_RAD = 0.058;
const HOBS_TOTAL_LEOS = 165;
const HOBS_SYNTHETIC_NUM_PLANES = 15;
const HOBS_SYNTHETIC_SATS_PER_PLANE = HOBS_TOTAL_LEOS / HOBS_SYNTHETIC_NUM_PLANES;
const HOBS_SYNTHETIC_INCLINATION_DEG = 53;
const HOBS_SYNTHETIC_PHASING_FACTOR = Math.floor(HOBS_SYNTHETIC_NUM_PLANES / 2);
const HOBS_BEAM_DIAMETER_KM = 2 * HOBS_ALTITUDE_KM * Math.tan(HOBS_THETA_3DB_RAD);
const HOBS_BOUNDED_STEERING_KM = 4 * HOBS_BEAM_DIAMETER_KM;
const HOBS_EIRP_DENSITY_DBW_PER_MHZ =
  (HOBS_TX_POWER_DBM - 30) + HOBS_PEAK_GAIN_DBI - 10 * Math.log10(HOBS_BANDWIDTH_MHZ);

// ---------------------------------------------------------------------------
// 1. hobs-multibeam-baseline (profile-baselines §5)
// ---------------------------------------------------------------------------

export const HOBS_MULTIBEAM_BASELINE_BUNDLE: ProfileBundle = {
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
    antenna: { model: 'bessel-j1j3' },
    beam: {
      layout: 'hexagonal',
      tracking_mode: 'nadir-relative-bounded-steering',
    },
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
    // ASSUME-ENERGY-001: HOBS Layer-1 energy disclosure remains assumption-backed.
    energy: { layer1_enabled: true, layer2_enabled: false },
    ueConfig: {},
  },
  orbital: {
    altitude_km: HOBS_ALTITUDE_KM,
    inclination_deg: HOBS_SYNTHETIC_INCLINATION_DEG,
    num_planes: HOBS_SYNTHETIC_NUM_PLANES,
    sats_per_plane: HOBS_SYNTHETIC_SATS_PER_PLANE,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
    phasing_factor: HOBS_SYNTHETIC_PHASING_FACTOR,
  },
  rf: {
    frequency_ghz: 28.0,
    bandwidth_mhz: HOBS_BANDWIDTH_MHZ,
    eirp_density_dbw_per_mhz: HOBS_EIRP_DENSITY_DBW_PER_MHZ,
    tx_power_per_beam_dbm: HOBS_TX_POWER_DBM,
    max_tx_power_dbm: 50,
    noise_temperature_k: 290,
    noise_figure_db: 0,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
    ue_antenna_gain_dbi: 0,
  },
  antenna: { peak_gain_dbi: HOBS_PEAK_GAIN_DBI, beam_diameter_km: HOBS_BEAM_DIAMETER_KM },
  beam: {
    num_beams: 37,
    steering_bound_km: HOBS_BOUNDED_STEERING_KM,
    frf: 3,
    interference_beams: 0,
  },
  channel: { deployment_environment: SUBURBAN },
  handover: { trigger_threshold_db: 10, ttt_ms: 640, hysteresis_db: 6, min_elevation_deg: 10 },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'orbital.altitude_km', note: '550km orbit altitude' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.frequency_ghz', note: 'Ka-band 28GHz carrier' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.bandwidth_mhz', note: '100MHz bandwidth' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.tx_power_per_beam_dbm', note: 'Pmax=50 dBm on the beam-level SINR path used by Eq. (4)' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.eirp_density_dbw_per_mhz', note: 'Derived reporting quantity from Table I values Pmax=50 dBm, G0=40 dBi, and B=100 MHz => 40 dBW/MHz; runtime HOBS path uses tx_power_per_beam_dbm directly' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.max_tx_power_dbm', specMode: 'Advanced', note: 'Paper Table I max transmit power Pmax=50 dBm retained for HOBS-family reproduction only' },
    { tier: 'standard-backed', id: 'STD-IEEE-T0', parameterPath: 'rf.noise_temperature_k', note: '290 K reference temperature used together with the HOBS noise-PSD anchor (-174 dBm/Hz) so the runtime noise pipeline reproduces the paper value at 100 MHz' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.noise_figure_db', note: 'NF=0 dB is the runtime representation of the paper noise PSD anchor (-174 dBm/Hz at T0)' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', parameterPath: 'rf.ue_antenna_gain_dbi', note: 'runtime HOBS receive-side gain term G^R uses 0 dBi omnidirectional UE gain from TR 38.811 Table 4.4-1 because HOBS leaves the receive-antenna numeric value implicit' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'handover.trigger_threshold_db', note: 'SINR threshold γthr=10 dB from Table I' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'handover.hysteresis_db', note: 'γos=6 dB handover decision offset from Table I is mapped to the runtime hysteresis slot' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'antenna.peak_gain_dbi', note: 'Maximum antenna gain G0=40 dBi from Table I' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'antenna.beam_diameter_km', note: 'Derived from Table I values θ3dB=0.058 rad and h=550 km => D=2h·tan(θ3dB)=63.87 km; runtime uses fixed HOBS beamwidth semantics via the bessel-j1j3 model' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'beam.num_beams', note: '37 beams per satellite from Table I' },
    { tier: 'paper-backed', id: 'PAP-2025-JCAP-LEO', parameterPath: 'beam.frf', note: 'FR3 reused as the closest paper-backed multi-beam frequency-reuse setting because HOBS Table I does not disclose an explicit FRF' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'antenna.model', note: 'Bessel J1+J3 antenna pattern from Eq. (3) / Eq. (A1)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-TRACK-001', parameterPath: 'beam.tracking_mode', specMode: 'Advanced', note: 'research-facing HOBS multibeam profiles now use nadir-relative-bounded-steering instead of legacy UE-anchored steering' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-TRACK-001', parameterPath: 'beam.steering_bound_km', specMode: 'Advanced', note: `bounded steering radius = ${HOBS_BOUNDED_STEERING_KM.toFixed(3)} km ground-plane clamp (= 4 x HOBS beam diameter)` },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-001', parameterPath: 'orbital.inclination_deg', specMode: 'Advanced', note: 'HOBS Table I gives total LEO count and altitude, but not inclination; 53deg is a disclosed synthetic-shell assumption used to generate a stable 550 km Walker proxy' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-001', parameterPath: 'orbital.num_planes', specMode: 'Advanced', note: 'Synthetic Walker proxy uses 15 planes so the orbit generator can realize the paper-backed total of 165 LEOs exactly (15x11)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-001', parameterPath: 'orbital.sats_per_plane', specMode: 'Advanced', note: 'Synthetic Walker proxy uses 11 satellites per plane so the orbit generator realizes the paper-backed total of 165 LEOs exactly (15x11)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-001', parameterPath: 'orbital.phasing_factor', specMode: 'Internal-only', note: 'Walker phasing F=7 follows the simulator default floor(P/2) rule because HOBS does not specify phasing; this closes the orbit generator without claiming paper support' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', note: 'HOBS Table I fixes the constellation scale at 165 LEOs; the simulator materializes that count through a disclosed synthetic Walker proxy because the paper does not publish a plane-by-plane layout' },
    { tier: 'assumption-backed', id: 'ASSUME-ATM-001', parameterPath: 'channel.tier4_atmospheric', specMode: 'Advanced', note: 'Tier 4 atmospheric: ITU-R P.676/P.618 mid-latitude Ka-band; gaseous 0.6dB, rain 1.5dB, scintillation 0.4dB; spec R3 Advanced mode only' },
    { tier: 'assumption-backed', id: 'ASSUME-ENERGY-001', parameterPath: 'energy.layer1_enabled', specMode: 'Internal-only', note: 'Layer-1 power path remains EP1 disclosure-only: systemEeBitsPerJoule is active-TX-only EE, while totalPowerW is the broader beam-state communication-power proxy; the HOBS profile now sources txPowerPerBeamDbm from Table I (50 dBm), but activeBeamPowerW=20, idlePowerW=5, offBeamPowerW=0.1 remain GAP-5 assumption-backed calibration values' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-TTT-NTN', parameterPath: 'handover.ttt_ms', specMode: 'Advanced', note: 'TTT=640ms: NTN-extended assumption; spec H2 paper-backed presets are 0/40/256ms; 640ms is Advanced' },
  ],
};

export const HOBS_MULTIBEAM_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 3600, stepSec: 1 },
};

export const HOBS_MULTIBEAM_BASELINE: ProfileConfig =
  materializeRuntimeProfile(HOBS_MULTIBEAM_BASELINE_BUNDLE, HOBS_MULTIBEAM_DEFAULT_EXP);

// ---------------------------------------------------------------------------
// 2. hobs-reproduction (RT-2: PAP-2024-HOBS)
// ---------------------------------------------------------------------------

export const HOBS_REPRODUCTION_BUNDLE: ProfileBundle = {
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
    antenna: { model: 'bessel-j1j3' },
    beam: {
      layout: 'hexagonal',
      tracking_mode: 'nadir-relative-bounded-steering',
    },
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
    // ASSUME-ENERGY-001: HOBS Layer-1 energy disclosure remains assumption-backed.
    energy: { layer1_enabled: true, layer2_enabled: false },
    ueConfig: {},
  },
  orbital: {
    altitude_km: HOBS_ALTITUDE_KM,
    inclination_deg: HOBS_SYNTHETIC_INCLINATION_DEG,
    num_planes: HOBS_SYNTHETIC_NUM_PLANES,
    sats_per_plane: HOBS_SYNTHETIC_SATS_PER_PLANE,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
    phasing_factor: HOBS_SYNTHETIC_PHASING_FACTOR,
  },
  rf: {
    frequency_ghz: 28,
    bandwidth_mhz: HOBS_BANDWIDTH_MHZ,
    eirp_density_dbw_per_mhz: HOBS_EIRP_DENSITY_DBW_PER_MHZ,
    tx_power_per_beam_dbm: HOBS_TX_POWER_DBM,
    max_tx_power_dbm: HOBS_TX_POWER_DBM,
    noise_temperature_k: 290,
    noise_figure_db: 0,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
    ue_antenna_gain_dbi: 0,
  },
  antenna: { peak_gain_dbi: HOBS_PEAK_GAIN_DBI, beam_diameter_km: HOBS_BEAM_DIAMETER_KM },
  beam: {
    num_beams: 37,
    steering_bound_km: HOBS_BOUNDED_STEERING_KM,
    frf: 3,
    interference_beams: 0,
  },
  channel: { deployment_environment: SUBURBAN },
  handover: { trigger_threshold_db: 10, ttt_ms: 640, hysteresis_db: 6, min_elevation_deg: 10 },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', note: 'RT-2 reproduction: 165-LEO / 550km / Ka 28GHz / 100MHz / 37 beams / Pmax=50 dBm / G0=40 dBi / θ3dB=0.058 rad / γthr=10 dB / γos=6 dB from Table I, with Eq. (3)/(4) beam-gain and SINR structure' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'orbital.altitude_km', note: '550km orbit altitude from Table I' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.frequency_ghz', note: 'Ka-band 28GHz carrier from Table I' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.bandwidth_mhz', note: '100MHz bandwidth from Table I' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.tx_power_per_beam_dbm', note: 'Pmax=50 dBm for the beam-level SINR path' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.eirp_density_dbw_per_mhz', note: 'Derived reporting value from Table I values Pmax=50 dBm, G0=40 dBi, and B=100 MHz => 40 dBW/MHz; runtime path uses tx_power_per_beam_dbm directly' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.max_tx_power_dbm', note: 'Table I max transmit power Pmax=50 dBm' },
    { tier: 'standard-backed', id: 'STD-IEEE-T0', parameterPath: 'rf.noise_temperature_k', note: '290 K reference temperature used so the runtime noise pipeline matches the paper noise PSD anchor (-174 dBm/Hz)' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.noise_figure_db', note: 'NF=0 dB is the runtime representation of the paper noise PSD anchor (-174 dBm/Hz at T0)' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', parameterPath: 'rf.ue_antenna_gain_dbi', note: 'runtime HOBS receive-side gain term G^R uses 0 dBi omnidirectional UE gain from TR 38.811 Table 4.4-1 because HOBS leaves the receive-antenna numeric value implicit' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'assumption-backed', id: 'ASSUME-ENERGY-001', specMode: 'Internal-only', note: 'EP1 disclosure rule: systemEeBitsPerJoule is active-TX-only EE and totalPowerW is a broader beam-state communication-power proxy; 20W active / 5W idle / 0.1W off remain GAP-5 assumption-backed values, HOBS Table II is beam-training accuracy only, and the SMASH-MADQL numeric locator is still unverified' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'antenna.peak_gain_dbi', note: 'Maximum antenna gain G0=40 dBi from Table I' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'antenna.beam_diameter_km', note: 'Derived from Table I values θ3dB=0.058 rad and h=550 km => D=2h·tan(θ3dB)=63.87 km; bessel-j1j3 model keeps the paper beamwidth fixed during gain evaluation' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'antenna.model', note: 'Bessel J1+J3 antenna pattern from Eq. (3) / Eq. (A1)' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'beam.num_beams', note: '37 beams per satellite from Table I' },
    { tier: 'paper-backed', id: 'PAP-2025-JCAP-LEO', parameterPath: 'beam.frf', note: 'FR3 reused as the closest paper-backed multi-beam frequency-reuse setting because HOBS Table I does not disclose an explicit FRF' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'handover.trigger_threshold_db', note: 'SINR threshold γthr=10 dB from Table I' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'handover.hysteresis_db', note: 'γos=6 dB handover decision offset from Table I is mapped to the runtime hysteresis slot' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-TRACK-001', parameterPath: 'beam.tracking_mode', specMode: 'Sensitivity', note: 'HOBS reproduction now uses the same nadir-relative-bounded-steering beam truth as the research baseline' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-TRACK-001', parameterPath: 'beam.steering_bound_km', specMode: 'Sensitivity', note: `bounded steering radius = ${HOBS_BOUNDED_STEERING_KM.toFixed(3)} km ground-plane clamp (= 4 x HOBS beam diameter)` },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-REPRO-RT2', parameterPath: 'orbital.inclination_deg', specMode: 'Advanced', note: 'HOBS does not specify inclination; the reproduction closes the orbit generator with a disclosed 53deg synthetic-shell assumption' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-REPRO-RT2', parameterPath: 'orbital.num_planes', specMode: 'Advanced', note: 'Synthetic Walker proxy uses 15 planes so the simulator realizes the paper-backed total of 165 LEOs exactly (15x11)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-REPRO-RT2', parameterPath: 'orbital.sats_per_plane', specMode: 'Advanced', note: 'Synthetic Walker proxy uses 11 satellites per plane so the simulator realizes the paper-backed total of 165 LEOs exactly (15x11)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-REPRO-RT2', parameterPath: 'orbital.phasing_factor', specMode: 'Internal-only', note: 'Walker phasing F=7 follows the simulator default floor(P/2) rule because HOBS does not specify phasing; this closes the orbit generator without claiming paper support' },
  ],
};

export const HOBS_REPRODUCTION_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 600, stepSec: 1 },
};

export const HOBS_REPRODUCTION: ProfileConfig =
  materializeRuntimeProfile(HOBS_REPRODUCTION_BUNDLE, HOBS_REPRODUCTION_DEFAULT_EXP);

// ---------------------------------------------------------------------------
// 3. hobs-tr38811-research (HOBS Eq. (4) + TR 38.811 Eq. (6.6-3))
// ---------------------------------------------------------------------------

export const HOBS_TR38811_RESEARCH_BUNDLE: ProfileBundle = {
  ...HOBS_REPRODUCTION_BUNDLE,
  id: 'hobs-tr38811-research',
  version: '0.4.0',
  exposurePreset: { tier: 'Sensitivity', label: 'Sensitivity — HOBS TR38.811 Research' },
  models: {
    ...HOBS_REPRODUCTION_BUNDLE.models,
    channel: {
      ...HOBS_REPRODUCTION_BUNDLE.models.channel,
      los_mode: 'tr38811-probability',
      slant_range_mode: 'tr38811-elevation',
      ue_geometry_mode: 'per-ue-topocentric',
      power_coupling_mode: 'beam-power-override',
    },
  },
  channel: {
    ...HOBS_REPRODUCTION_BUNDLE.channel,
    max_interfering_sats: null,
  },
  energy: {
    layer1_overrides: {
      dpcEnabled: true,
      dpcTargetSinrDb: 10,
    },
  },
  sourceMap: [
    ...HOBS_REPRODUCTION_BUNDLE.sourceMap,
    {
      tier: 'standard-backed',
      id: 'STD-3GPP-38811',
      parameterPath: 'channel.los_mode',
      note: 'LOS/NLOS state now follows TR 38.811 Table 6.6.1-1 with nearest-angle lookup and deterministic per-link Bernoulli sampling instead of the legacy 20deg threshold shortcut',
      specMode: 'Sensitivity',
    },
    {
      tier: 'standard-backed',
      id: 'STD-3GPP-38811',
      parameterPath: 'channel.slant_range_mode',
      note: 'research profile replaces observer-truth slant range with the explicit TR 38.811 Eq. (6.6-3) d(alpha) path so H follows elevation through an auditable analytic formula',
      specMode: 'Sensitivity',
    },
    {
      tier: 'standard-backed',
      id: 'STD-3GPP-38811',
      parameterPath: 'channel.ue_geometry_mode',
      note: 'per-UE topocentric geometry feeds elevation/slant-range into H instead of reusing the observer-centric sample for every UE',
      specMode: 'Sensitivity',
    },
    {
      tier: 'paper-backed',
      id: 'PAP-2024-HOBS',
      parameterPath: 'channel.power_coupling_mode',
      note: 'beam-associated DPC power is coupled back into the channel path when a beam has a UE candidate/forced-serving SINR proxy; unmatched beams fall back to fixed power instead of sharing a whole-satellite seed',
      specMode: 'Sensitivity',
    },
    {
      tier: 'paper-backed',
      id: 'PAP-2024-HOBS',
      parameterPath: 'channel.max_interfering_sats',
      note: 'research profile removes the legacy 15-satellite interferer cap and keeps the inter-LEO sum closer to the uncapped HOBS Eq. (4) interpretation',
      specMode: 'Sensitivity',
    },
    {
      tier: 'paper-backed',
      id: 'PAP-2024-HOBS',
      parameterPath: 'energy.layer1_overrides.dpcEnabled',
      note: 'enables the HOBS-style DPC controller so the research profile can actually materialize serving-beam power adaptation',
      specMode: 'Sensitivity',
    },
  ],
};

export const HOBS_TR38811_RESEARCH_DEFAULT_EXP: ExperimentBundle = {
  ...HOBS_REPRODUCTION_DEFAULT_EXP,
};

export const HOBS_TR38811_RESEARCH: ProfileConfig =
  materializeRuntimeProfile(HOBS_TR38811_RESEARCH_BUNDLE, HOBS_TR38811_RESEARCH_DEFAULT_EXP);
