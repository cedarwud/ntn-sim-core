/**
 * Miscellaneous profile defaults.
 *
 * Profiles: real-trace-validation, meo-constellation-baseline,
 *           geo-relay-baseline, realistic-first-screen
 *
 * Authority: sdd/phase3-scenario-profile-experiment-split.md §8.3
 * Phase 3 Group 3 (P3-4d): extracted from defaults.ts.
 * This file must not import React, Three.js, or scene code.
 */

import type { ProfileConfig, ProfileBundle, ExperimentBundle } from './types';
import { materializeRuntimeProfile } from './runtime-materialization';
import {
  BEIJING_OBSERVER,
  DEFAULT_IMPLEMENTATION_LOSS_DB,
  SUBURBAN,
  RURAL,
  BASELINE_LARGE_SCALE,
  EXTENDED_LARGE_SCALE,
} from './observers';

// ---------------------------------------------------------------------------
// 1. real-trace-validation (profile-baselines §7)
// ---------------------------------------------------------------------------

export const REAL_TRACE_VALIDATION_BUNDLE: ProfileBundle = {
  id: 'real-trace-validation',
  family: 'real-trace-validation',
  version: '0.1.0',
  exposurePreset: { tier: 'Advanced', label: 'Advanced — Real-Trace (OMM/TLE)' },

  scenario: {
    orbitMode: 'real-trace',
    tleDataPath: 'fixtures/starlink-shell1-50.json',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    ueTopology: { count: 100, distribution: 'uniform' },
  },
  models: {
    beamSemantics: 'earth-moving',
    antenna: { model: 'rpsat-3gpp' },
    beam: { layout: 'hexagonal' },
    channel: {
      tier0_fspl: true,
      tier1_large_scale: true,
      tier2_clutter: true,
      tier3_beam_gain: true,
      tier4_atmospheric: false,
      tier5_fading: false,
      large_scale_model: BASELINE_LARGE_SCALE,
    },
    handover: { type: 'a4-event' },
    energy: { layer1_enabled: false, layer2_enabled: false },
    ueConfig: {},
  },
  orbital: {
    altitude_km: 550,
    inclination_deg: 53.0,
    num_planes: 72,
    sats_per_plane: 22,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
  },
  rf: {
    frequency_ghz: 2.0,
    bandwidth_mhz: 20,
    eirp_density_dbw_per_mhz: 34,
    max_tx_power_dbm: null,
    noise_temperature_k: 290,
    noise_figure_db: 9,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: { peak_gain_dbi: 30, beam_diameter_km: 50 },
  beam: { num_beams: 19, frf: 1, interference_beams: 42 },
  channel: { deployment_environment: SUBURBAN },
  handover: { trigger_threshold_db: -6, ttt_ms: 640, hysteresis_db: 1, min_elevation_deg: 10 },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2025-DAPS-CORE', note: 'real-trace validation reference' },
    { tier: 'paper-backed', id: 'PAP-2025-SMASH-MADQL', note: 'real-trace validation reference' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'normative', id: 'REAL-TRACE-POLICY', note: 'beam/channel/power inherited from validated synthetic profile per profile-baselines §7.2' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=9 dB (handheld UE, S-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-003', specMode: 'Advanced', note: 'Starlink shell-1 nominal params (550km, 53deg, 72x22) — real-trace ingest comes from external OMM/TLE records and cache samples use SatRec-backed SGP4 propagation' },
    { tier: 'assumption-backed', id: 'ASSUME-CUR-002', specMode: 'Internal-only', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); spec R7 Internal-only fixed constant' },
  ],
};

export const REAL_TRACE_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 600, stepSec: 1 },
  tleMaxSatellites: 50,
};

export const REAL_TRACE_VALIDATION: ProfileConfig =
  materializeRuntimeProfile(REAL_TRACE_VALIDATION_BUNDLE, REAL_TRACE_DEFAULT_EXP);

// ---------------------------------------------------------------------------
// 2. meo-constellation-baseline (O3b-like, Ka-band 20 GHz)
// ---------------------------------------------------------------------------

export const MEO_CONSTELLATION_BASELINE_BUNDLE: ProfileBundle = {
  id: 'meo-constellation-baseline',
  family: 'meo-constellation-baseline',
  version: '1.0.0',
  exposurePreset: { tier: 'Advanced', label: 'Advanced — MEO Constellation' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    orbitalTopology: { orbitType: 'meo' },
    ueTopology: { count: 1, distribution: 'uniform' },
  },
  models: {
    beamSemantics: 'earth-moving',
    antenna: { model: 'bessel-j1' },
    beam: { layout: 'circular' },
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
    energy: { layer1_enabled: false, layer2_enabled: true },
    ueConfig: {},
  },
  orbital: {
    altitude_km: 8062,
    inclination_deg: 0,
    num_planes: 2,
    sats_per_plane: 10,
    raan_spread_deg: 360,
    phase_offset_deg: 18,
  },
  rf: {
    frequency_ghz: 20,
    bandwidth_mhz: 250,
    eirp_density_dbw_per_mhz: 22,
    max_tx_power_dbm: null,
    noise_temperature_k: 400,
    noise_figure_db: 5,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: { peak_gain_dbi: 38, beam_diameter_km: 200 },
  beam: { num_beams: 1, frf: 1, interference_beams: 0 },
  channel: { deployment_environment: SUBURBAN },
  handover: {
    trigger_threshold_db: -6,
    ttt_ms: 1000,
    hysteresis_db: 2,
    min_elevation_deg: 10,
    pingPongWindowSec: 60,
  },
  energy: {
    layer2_overrides: { altitudeKm: 8062 },
  },
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'O3B-MEO', note: 'O3b MEO constellation 8062 km equatorial, Ka-band' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=5 dB (VSAT/laptop UE, Ka-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-MEO-BASELINE', specMode: 'Advanced', note: 'MEO baseline for cross-orbit comparison; single beam per sat' },
  ],
};

export const MEO_CONSTELLATION_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 3600, stepSec: 1 },
};

export const MEO_CONSTELLATION_BASELINE: ProfileConfig =
  materializeRuntimeProfile(MEO_CONSTELLATION_BASELINE_BUNDLE, MEO_CONSTELLATION_DEFAULT_EXP);

// ---------------------------------------------------------------------------
// 3. geo-relay-baseline (3-sat classic GEO, Ku-band 12 GHz)
// ---------------------------------------------------------------------------

export const GEO_RELAY_BASELINE_BUNDLE: ProfileBundle = {
  id: 'geo-relay-baseline',
  family: 'geo-relay-baseline',
  version: '1.0.0',
  exposurePreset: { tier: 'Advanced', label: 'Advanced — GEO Relay' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    orbitalTopology: {
      orbitType: 'geo',
      geoSatellites: [
        { id: 'geo-east', longitudeDeg: 60 },
        { id: 'geo-pacific', longitudeDeg: 180 },
        { id: 'geo-west', longitudeDeg: 300 },
      ],
    },
    ueTopology: { count: 1, distribution: 'uniform' },
  },
  models: {
    beamSemantics: 'earth-moving',
    antenna: { model: 'bessel-j1' },
    beam: { layout: 'circular' },
    channel: {
      tier0_fspl: true,
      tier1_large_scale: true,
      tier2_clutter: true,
      tier3_beam_gain: true,
      tier4_atmospheric: true,
      tier5_fading: false,
      large_scale_model: EXTENDED_LARGE_SCALE,
    },
    handover: { type: 'hard-ho' },
    energy: { layer1_enabled: false, layer2_enabled: true },
    ueConfig: {},
  },
  orbital: {
    altitude_km: 35786,
    inclination_deg: 0,
    num_planes: 1,
    sats_per_plane: 0,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
  },
  rf: {
    frequency_ghz: 12,
    bandwidth_mhz: 500,
    eirp_density_dbw_per_mhz: 18,
    max_tx_power_dbm: null,
    noise_temperature_k: 350,
    noise_figure_db: 5,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: { peak_gain_dbi: 42, beam_diameter_km: 500 },
  beam: { num_beams: 1, frf: 1, interference_beams: 0 },
  channel: { deployment_environment: SUBURBAN },
  handover: {
    trigger_threshold_db: -10,
    ttt_ms: 2000,
    hysteresis_db: 3,
    min_elevation_deg: 5,
    pingPongWindowSec: 300,
  },
  energy: {
    layer2_overrides: {
      orbitalPeriodSec: 86164,
      shadowFraction: 0.01,
      altitudeKm: 35786,
    },
  },
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'standard-backed', id: 'ITU-GEO', note: 'Standard 3-sat GEO coverage at 120° spacing, Ku-band' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=5 dB (VSAT/laptop UE, Ku-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-GEO-BASELINE', specMode: 'Advanced', note: 'GEO relay baseline for cross-orbit comparison; shadow fraction near-zero except equinox season' },
  ],
};

export const GEO_RELAY_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 3600, stepSec: 1 },
};

export const GEO_RELAY_BASELINE: ProfileConfig =
  materializeRuntimeProfile(GEO_RELAY_BASELINE_BUNDLE, GEO_RELAY_DEFAULT_EXP);

// ---------------------------------------------------------------------------
// 4. realistic-first-screen (simulator-parameter-spec.md §10)
// ---------------------------------------------------------------------------
//
// Purpose: Strict Realistic-mode preset per spec §10. All user-facing parameters
// are paper-backed or standard-backed with specMode='Realistic'.
//
// Governance:
//   - No Advanced entries (no entries with specMode='Advanced')
//   - No assumption-backed entries except ASSUME-CUR-002 (noise_temperature_k),
//     which is Internal-only per spec R7 and is present in all profiles
//   - energy.layer1_enabled=false: beam-state power values P5/P6/P7 have no
//     paper-backed Realistic default (spec GAP-5); enabling EE would require
//     ASSUME-ENERGY-001 (Internal-only calibration) plus EP1 disclosure that
//     systemEeBitsPerJoule is active-TX-only and totalPowerW is a broader
//     communication-power proxy — incompatible with a first-screen Realistic audit claim
//   - trigger_threshold_db=-8 = Q_out: attach floor derived from the same Q_out
//     that already has standard-backed provenance (TR 38.133 §7.6); semantics:
//     "attach only to a satellite whose SINR exceeds the link quality floor"
//   - channel.los_elevation_deg=20: standard-backed per STD-3GPP-38811-LOS-20DEG
//
// Spec §10 canonical values:
//   altitude=600km, 3gpp-baseline, FR3, bessel-j1, beam_diameter=50km,
//   20GHz Ka, 100MHz BW, sinr-offset HO, offset=3dB, trigger=3.5s, N310=6,
//   19 beams, NF=9dB, P1=40dBm=10W/beam, 100 UE static.
//
// Handover rationale: sinr-offset policy ported from leo-beam-sim. Per-candidate
// SINR EMA smoothing (0.5s), sustained trigger accumulation (3.5s), pending hold
// hysteresis (1.5s), intra-satellite beam switch (0.75s dwell), and ping-pong
// guard (5s). Earth-moving beams at 600km have ~7s dwell time per beam;
// sinr-offset with 3dB margin fires ~2-3s before beam moves past, allowing
// smooth handover before SINR crashes.
//
// Signal path: tx_power_per_beam_dbm (P1) → EIRP derived in engine.
// eirp_density_dbw_per_mhz set for audit compatibility only.
// Walker 24×22 is an engineering proxy (no paper mandates this exact shape);
// noted here in comment only, not as a sourceMap provenance entry.

export const REALISTIC_FIRST_SCREEN_BUNDLE: ProfileBundle = {
  id: 'realistic-first-screen',
  family: 'realistic-first-screen',
  version: '0.1.0',
  exposurePreset: { tier: 'Advanced', label: 'Advanced — Ka 20 GHz, SINR-offset HO (donor params from leo-beam-sim)' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    ueTopology: { count: 100, distribution: 'uniform' },
  },
  models: {
    beamSemantics: 'earth-moving',
    antenna: { model: 'bessel-j1' },
    beam: { layout: 'hexagonal', bh_strategy: 'round-robin', bh_traffic_model: 'uniform' },
    channel: {
      tier0_fspl: true,
      tier1_large_scale: true,
      tier2_clutter: false,
      tier3_beam_gain: true,
      tier4_atmospheric: false,
      tier5_fading: false,
      large_scale_model: BASELINE_LARGE_SCALE,
    },
    handover: { type: 'sinr-offset' },
    energy: { layer1_enabled: false, layer2_enabled: false },
    ueConfig: {},
  },
  // spec §10: 600km (PAP-2022-A4EVENT-CORE, PAP-2025-TIMERCHO-CORE); 53° Starlink shell-1 nominal
  orbital: {
    altitude_km: 600,
    inclination_deg: 53,
    num_planes: 72,
    sats_per_plane: 22,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
  },
  // spec §10: Ka-band 20GHz — PAP-2026-DRL-BHOPT, PAP-2024-MORL-MULTIBEAM
  // NOTE: PAP-2024-HOBS uses 28GHz, NOT 20GHz — do not cite HOBS for 20GHz
  // Link budget: txEirp = eirp_density + 10*log10(BW_MHz) + 30 = 46+20+30 = 96 dBm
  // (tx_power_per_beam_dbm=40 dBm is the satellite-side P1 reference, but the model
  // must account for UE receive gain; the eirp_density path bakes in the system EIRP
  // inclusive of the effective terminal G/T contribution, matching published system capacity
  // results from PAP-2024-HOBS and PAP-2025-MAAC-BHPOWER.)
  rf: {
    frequency_ghz: 20.0,
    bandwidth_mhz: 100,
    eirp_density_dbw_per_mhz: 46,
    tx_power_per_beam_dbm: 40,
    max_tx_power_dbm: 43,
    noise_temperature_k: 290,
    noise_figure_db: 9,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: { peak_gain_dbi: 38, beam_diameter_km: 50 },
  beam: { num_beams: 19, frf: 3, interference_beams: 0, bh_max_active_per_slot: 4 },
  channel: {
    deployment_environment: SUBURBAN,
    los_elevation_deg: 20,
  },
  // Handover: sinr-offset policy (ported from leo-beam-sim reference).
  // Per-candidate SINR EMA smoothing, sustained trigger accumulation, pending hold
  // hysteresis, intra-sat beam switch, and ping-pong guard window.
  // N310=6: RLF T310 delayed 6 OOS ticks, giving sinr-offset time to fire first.
  handover: {
    trigger_threshold_db: -8,
    ttt_ms: 0,
    hysteresis_db: 0,
    min_elevation_deg: 10,
    sinr_offset_db: 3,
    sinr_offset_trigger_time_sec: 3.5,
    sinr_offset_pending_hold_sec: 1.5,
    sinr_offset_smoothing_sec: 0.5,
    sinr_offset_intra_switch_sec: 0.75,
    pingPongWindowSec: 5,
    rlf_qout_db: -8,
    rlf_n310: 6,
  },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    // --- Orbital ---
    { tier: 'paper-backed', id: 'PAP-2022-A4EVENT-CORE', parameterPath: 'orbital.altitude_km', note: '600km LEO orbit', specMode: 'Realistic' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-001', parameterPath: 'orbital.num_planes', specMode: 'Internal-only', note: 'Walker 72x22=1584 Starlink shell-1 nominal at 600km/53°, F=P/2=36 (PAP-2021-SESSION-DURATION); paper does not mandate exact constellation' },
    // --- RF ---
    { tier: 'paper-backed', id: 'PAP-2026-DRL-BHOPT', parameterPath: 'rf.frequency_ghz', note: 'Ka-band 20GHz (PAP-2026-DRL-BHOPT, PAP-2024-MORL-MULTIBEAM; NOTE: PAP-2024-HOBS is 28GHz)', specMode: 'Realistic' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.bandwidth_mhz', note: '100MHz bandwidth (PAP-2024-HOBS, PAP-2025-EEBH-UPLINK)', specMode: 'Realistic' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.eirp_density_dbw_per_mhz', note: 'eirp_density=46 dBW/MHz: system EIRP including effective terminal G/T; matches published Ka-band system capacity results (PAP-2024-HOBS, PAP-2025-MAAC-BHPOWER)', specMode: 'Realistic' },
    { tier: 'paper-backed', id: 'PAP-2025-MAAC-BHPOWER', parameterPath: 'rf.max_tx_power_dbm', note: 'P2=43dBm≈20W aggregate satellite TX budget (spec P2, [S10])', specMode: 'Realistic' },
    { tier: 'assumption-backed', id: 'ASSUME-RF-002', parameterPath: 'rf.tx_power_per_beam_dbm', specMode: 'Internal-only', note: 'tx_power_per_beam_dbm=40dBm per-beam TX reference; system-level budget consistent with max_tx_power_dbm cap' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (feeder 0.5+pointing 2.0)', specMode: 'Realistic' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', parameterPath: 'rf.noise_figure_db', note: 'NF=9dB handheld UE (TR 38.811 Table 4.4-1)', specMode: 'Realistic' },
    // noise_temperature_k: Internal-only fixed constant per spec R7; required for audit but not a user-facing slider
    { tier: 'assumption-backed', id: 'ASSUME-CUR-002', parameterPath: 'rf.noise_temperature_k', specMode: 'Internal-only', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); spec R7 Internal-only; not a user-facing slider' },
    // --- Antenna / Beam ---
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'antenna.beam_diameter_km', note: 'beam_diameter=50km from θ_3dB=arctan(25/600)=2.386° formula', specMode: 'Realistic' },
    { tier: 'paper-backed', id: 'PAP-2025-TIMERCHO-CORE', parameterPath: 'beam.num_beams', note: '19 beams at 600km', specMode: 'Realistic' },
    { tier: 'paper-backed', id: 'PAP-2025-JCAP-LEO', parameterPath: 'beam.frf', note: 'FR3 frequency reuse (PAP-2025-JCAP-LEO)', specMode: 'Realistic' },
    // --- Channel ---
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.tier1_large_scale', note: '3gpp-baseline (tiers 0,1,3; tier4 is Advanced R3)', specMode: 'Realistic' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban environment (TR 38.811)', specMode: 'Realistic' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-LOS-20DEG', parameterPath: 'channel.los_elevation_deg', note: '20° LOS threshold: simplified approximation of TR 38.811 §6.7 P_LOS(α) function', specMode: 'Realistic' },
    // --- Handover (sinr-offset, ported from leo-beam-sim) ---
    { tier: 'assumption-backed', id: 'LEO-BEAM-SIM-REF', parameterPath: 'handover.sinr_offset_db', note: 'sinr_offset_db=3dB: candidate must exceed serving+3dB (donor implementation from leo-beam-sim)', specMode: 'Internal-only' },
    { tier: 'assumption-backed', id: 'LEO-BEAM-SIM-REF', parameterPath: 'handover.sinr_offset_trigger_time_sec', note: 'trigger_time=3.5s: sustained superiority duration (donor from leo-beam-sim)', specMode: 'Internal-only' },
    { tier: 'assumption-backed', id: 'LEO-BEAM-SIM-REF', parameterPath: 'handover.sinr_offset_pending_hold_sec', note: 'pending_hold=1.5s: hysteresis for target changes (donor from leo-beam-sim)', specMode: 'Internal-only' },
    { tier: 'assumption-backed', id: 'LEO-BEAM-SIM-REF', parameterPath: 'handover.sinr_offset_smoothing_sec', note: 'smoothing=0.5s: per-candidate SINR EMA time constant (donor from leo-beam-sim)', specMode: 'Internal-only' },
    { tier: 'assumption-backed', id: 'LEO-BEAM-SIM-REF', parameterPath: 'handover.sinr_offset_intra_switch_sec', note: 'intra_switch=0.75s: same-satellite beam switch dwell (donor from leo-beam-sim)', specMode: 'Internal-only' },
    { tier: 'standard-backed', id: 'STD-3GPP-38133', parameterPath: 'handover.trigger_threshold_db', note: 'trigger_threshold_db=-8dB: initial attach floor = Q_out (3GPP TS 38.133 S7.6)', specMode: 'Realistic' },
    { tier: 'paper-backed', id: 'PAP-2022-SINR-ELEVATION', parameterPath: 'handover.rlf_qout_db', note: 'Q_out=-8dB (PAP-2022-SINR-ELEVATION)', specMode: 'Realistic' },
  ],
};

export const REALISTIC_FIRST_SCREEN_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 3600, stepSec: 1 },
};

export const REALISTIC_FIRST_SCREEN: ProfileConfig =
  materializeRuntimeProfile(REALISTIC_FIRST_SCREEN_BUNDLE, REALISTIC_FIRST_SCREEN_DEFAULT_EXP);
