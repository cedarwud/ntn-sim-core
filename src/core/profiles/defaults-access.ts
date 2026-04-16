/**
 * Access / A4 / DAPS / reproduction profile defaults.
 *
 * Profiles: case9-access-baseline, case9-daps-baseline,
 *           sinr-elevation-reproduction, timer-cho-reproduction
 *
 * Authority: sdd/phase3-scenario-profile-experiment-split.md §8.3
 * Phase 3 Group 3 (P3-4a): extracted from defaults.ts.
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
} from './observers';

const CASE9_BOUNDED_STEERING_KM = 4 * 50;

// ---------------------------------------------------------------------------
// 1. case9-access-baseline (profile-baselines §4)
// ---------------------------------------------------------------------------

export const CASE9_ACCESS_BASELINE_BUNDLE: ProfileBundle = {
  id: 'case9-access-baseline',
  family: 'case9-access-baseline',
  version: '0.1.0',
  exposurePreset: { tier: 'Advanced', label: 'Advanced — Case-9 Access (S-band A4)' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    ueTopology: { count: 100, distribution: 'uniform' },
  },
  models: {
    beamSemantics: 'earth-moving',
    antenna: { model: 'rpsat-3gpp' },
    beam: {
      layout: 'hexagonal',
      tracking_mode: 'nadir-relative-bounded-steering',
    },
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
    altitude_km: 600,
    inclination_deg: 53,
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
  beam: {
    num_beams: 19,
    steering_bound_km: CASE9_BOUNDED_STEERING_KM,
    frf: 1,
    interference_beams: 42,
  },
  channel: { deployment_environment: SUBURBAN },
  handover: {
    trigger_threshold_db: -6,
    ttt_ms: 640,
    hysteresis_db: 1,
    min_elevation_deg: 10,
    sinr_ema_alpha: 0.3,
    pingPongWindowSec: 30,
  },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2022-A4EVENT-CORE', parameterPath: 'orbital.altitude_km', note: 'orbit altitude 600km, A4 event trigger' },
    { tier: 'paper-backed', id: 'PAP-2022-SINR-ELEVATION', parameterPath: 'rf.frequency_ghz', note: 'S-band 2GHz — carrier frequency' },
    { tier: 'paper-backed', id: 'PAP-2025-TIMERCHO-CORE', parameterPath: 'rf.bandwidth_mhz', note: '20MHz bandwidth access-family baseline (accepted envelope 20-30 MHz)' },
    { tier: 'paper-backed', id: 'PAP-2022-SINR-ELEVATION', parameterPath: 'rf.eirp_density_dbw_per_mhz', note: 'EIRP 34dBW/MHz' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'paper-backed', id: 'PAP-2022-SINR-ELEVATION', parameterPath: 'handover.trigger_threshold_db', note: 'trigger threshold −3 dB reference' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'paper-backed', id: 'PAP-2022-SINR-ELEVATION', parameterPath: 'handover.min_elevation_deg', note: 'min elevation 10°' },
    { tier: 'paper-backed', id: 'PAP-2025-TIMERCHO-CORE', parameterPath: 'beam.num_beams', note: '19 beams, earth-moving, 600km' },
    { tier: 'paper-backed', id: 'PAP-2024-MCCHO-CORE', note: 'access handover baseline' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.tier1_large_scale', note: 'channel tiers 0-2, NTN channel model' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', parameterPath: 'rf.noise_figure_db', note: 'noise_figure_db=9 dB (handheld UE, S-band case 9)' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-TRACK-001', parameterPath: 'beam.tracking_mode', specMode: 'Advanced', note: 'research-facing earth-moving access profiles now use nadir-relative-bounded-steering instead of legacy UE-anchored steering' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-TRACK-001', parameterPath: 'beam.steering_bound_km', specMode: 'Advanced', note: 'bounded steering radius = 200 km ground-plane clamp (= 4 x 50 km beam diameter) for the first narrow earth-moving correction slice' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-001', parameterPath: 'orbital.num_planes', specMode: 'Advanced', note: 'Walker 72x22=1584 Starlink shell-1 nominal at 600km/53°, F=P/2=36 (PAP-2021-SESSION-DURATION); paper does not mandate exact constellation' },
    { tier: 'assumption-backed', id: 'ASSUME-CUR-002', parameterPath: 'rf.noise_temperature_k', specMode: 'Internal-only', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); spec R7: Internal-only fixed engineering constant; must NOT be exposed as UI slider' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-TTT-NTN', parameterPath: 'handover.ttt_ms', specMode: 'Advanced', note: 'TTT=640ms: NTN-extended assumption (not in spec H2 paper-backed presets of 0/40/256ms); conservative NTN value accounting for propagation delay; spec mode Advanced, not Realistic' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-THRESHOLD-SINR', parameterPath: 'handover.trigger_threshold_db', specMode: 'Advanced', note: 'trigger_threshold_db=−6 dB: SINR-relative simplification vs spec H3 absolute derivation (N_floor + Q_out); assumption-backed; spec mode Advanced' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-SINR-EMA', parameterPath: 'handover.sinr_ema_alpha', specMode: 'Advanced', note: 'SINR EMA α=0.3 with stepSec=1s: time-constant ≈2.6s, suppresses single-tick SINR fluctuations without masking genuine fades; implementation-level smoothing filter' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-PP-GUARD', parameterPath: 'handover.pingPongWindowSec', specMode: 'Advanced', note: 'Ping-pong guard 30s: blocks oscillating handovers back to recently-served satellite; standard stability mechanism in NTN handover studies (PAP-2021-SESSION-DURATION)' },
  ],
};

export const CASE9_ACCESS_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 3600, stepSec: 1 },
};

export const CASE9_ACCESS_BASELINE: ProfileConfig =
  materializeRuntimeProfile(CASE9_ACCESS_BASELINE_BUNDLE, CASE9_ACCESS_DEFAULT_EXP);

// ---------------------------------------------------------------------------
// 2. case9-daps-baseline — DAPS dual-active handover showcase
// ---------------------------------------------------------------------------

export const CASE9_DAPS_BASELINE_BUNDLE: ProfileBundle = {
  id: 'case9-daps-baseline',
  family: 'case9-daps-baseline',
  version: '0.1.0',
  exposurePreset: { tier: 'Advanced', label: 'Advanced — DAPS Dual-Active' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 20, 0),
    ueTopology: { count: 10, distribution: 'uniform' },
  },
  models: {
    beamSemantics: 'earth-moving',
    antenna: { model: 'rpsat-3gpp' },
    beam: {
      layout: 'hexagonal',
      tracking_mode: 'nadir-relative-bounded-steering',
      bh_strategy: 'round-robin',
      bh_traffic_model: 'uniform',
    },
    channel: {
      tier0_fspl: true,
      tier1_large_scale: true,
      tier2_clutter: true,
      tier3_beam_gain: true,
      tier4_atmospheric: false,
      tier5_fading: false,
      large_scale_model: BASELINE_LARGE_SCALE,
    },
    handover: { type: 'daps' },
    energy: { layer1_enabled: false, layer2_enabled: false },
    ueConfig: {},
  },
  orbital: {
    altitude_km: 600,
    inclination_deg: 53,
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
  beam: {
    num_beams: 19,
    steering_bound_km: CASE9_BOUNDED_STEERING_KM,
    frf: 1,
    interference_beams: 42,
    bh_max_active_per_slot: 7,
    bh_frame_duration_sec: 5,
    bh_slots_per_frame: 3,
  },
  channel: { deployment_environment: SUBURBAN },
  handover: {
    trigger_threshold_db: -6,
    ttt_ms: 640,
    hysteresis_db: 1,
    min_elevation_deg: 10,
    daps_preparation_time_sec: 0,
    daps_max_dual_active_sec: 3.0,
    daps_prepare_elevation_deg: 30,
    sinr_ema_alpha: 0.3,
    pingPongWindowSec: 30,
  },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2025-DAPS-CORE', note: 'DAPS dual-active handover, 600km, S-band' },
    { tier: 'paper-backed', id: 'PAP-2022-A4EVENT-CORE', note: 'orbit altitude 600km, A4 event trigger baseline' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=9 dB (handheld UE, S-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-TRACK-001', parameterPath: 'beam.tracking_mode', specMode: 'Advanced', note: 'DAPS baseline now uses the same nadir-relative-bounded-steering access truth as case9-access-baseline' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-TRACK-001', parameterPath: 'beam.steering_bound_km', specMode: 'Advanced', note: 'bounded steering radius = 200 km ground-plane clamp (= 4 x 50 km beam diameter) for the first narrow earth-moving correction slice' },
    { tier: 'assumption-backed', id: 'ASSUME-CUR-002', specMode: 'Internal-only', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); spec R7 Internal-only fixed constant' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-DAPS', specMode: 'Advanced', note: 'DAPS profile matches case9-access-baseline constellation; ueCount=10 for clearer dual-active visualization and epoch is shifted so live playback reaches prepared/dual-active continuity earlier while replay uses continuity-aware window selection' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-DAPS-OVERLAP', parameterPath: 'handover.daps_max_dual_active_sec', specMode: 'Advanced', note: 'DAPS dual-active window extended to 3.0 s for the 1 s discrete runtime so prepared/dual-active execution can complete before fallback; keeps overlap visible without forcing long low-elevation source retention' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-SINR-EMA', parameterPath: 'handover.sinr_ema_alpha', specMode: 'Advanced', note: 'SINR EMA α=0.3 with stepSec=1s: time-constant ≈2.6s, stabilizes serving SINR estimates for DAPS dual-active window evaluation' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-PP-GUARD', parameterPath: 'handover.pingPongWindowSec', specMode: 'Advanced', note: 'Ping-pong guard 30s: blocks oscillating handovers back to recently-served satellite' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-DAPS-PREP-ELEV', parameterPath: 'handover.daps_prepare_elevation_deg', specMode: 'Advanced', note: 'DAPS TTT accelerant 30°: when serving elevation drops below this threshold, effective TTT is scaled down (50–100%), accelerating handover completion at low elevation; 10° remains the hard release floor; handover trigger is purely A3-style (candidate > serving + hysteresis) regardless of elevation' },
    { tier: 'assumption-backed', id: 'ASSUME-BH-DAPS-001', parameterPath: 'beam.bh_max_active_per_slot', specMode: 'Advanced', note: 'BH frame for earth-moving DAPS: bh_max_active_per_slot=7 (ceil(19/3)), bh_slots_per_frame=3, bh_frame_duration_sec=5, round-robin; no corpus paper combines BH + DAPS' },
  ],
};

export const CASE9_DAPS_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 3600, stepSec: 1 },
};

export const CASE9_DAPS_BASELINE: ProfileConfig =
  materializeRuntimeProfile(CASE9_DAPS_BASELINE_BUNDLE, CASE9_DAPS_DEFAULT_EXP);

// ---------------------------------------------------------------------------
// 3. case9-daps-showcase — truth-preserving DAPS showcase split
// ---------------------------------------------------------------------------

export const CASE9_DAPS_SHOWCASE_BUNDLE: ProfileBundle = {
  id: 'case9-daps-showcase',
  family: 'case9-daps-showcase',
  version: '0.1.0',
  exposurePreset: { tier: 'Advanced', label: 'Advanced — DAPS Showcase (truth-preserving)' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 45, 0),
    ueTopology: { count: 1, distribution: 'uniform' },
  },
  models: {
    beamSemantics: 'earth-moving',
    antenna: { model: 'rpsat-3gpp' },
    beam: {
      layout: 'hexagonal',
      tracking_mode: 'nadir-relative-bounded-steering',
    },
    channel: {
      tier0_fspl: true,
      tier1_large_scale: true,
      tier2_clutter: true,
      tier3_beam_gain: true,
      tier4_atmospheric: false,
      tier5_fading: false,
      large_scale_model: BASELINE_LARGE_SCALE,
    },
    handover: { type: 'daps' },
    energy: { layer1_enabled: false, layer2_enabled: false },
    ueConfig: {},
  },
  orbital: {
    altitude_km: 600,
    inclination_deg: 53,
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
  beam: {
    num_beams: 19,
    steering_bound_km: CASE9_BOUNDED_STEERING_KM,
    frf: 1,
    interference_beams: 42,
  },
  channel: { deployment_environment: SUBURBAN },
  handover: {
    trigger_threshold_db: -6,
    ttt_ms: 640,
    hysteresis_db: 0,
    min_elevation_deg: 10,
    daps_preparation_time_sec: 0,
    daps_max_dual_active_sec: 3.0,
    daps_prepare_elevation_deg: 30,
    sinr_ema_alpha: 0.3,
    pingPongWindowSec: 15,
  },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2025-DAPS-CORE', note: 'same DAPS runtime truth family as the benchmark-facing baseline' },
    { tier: 'paper-backed', id: 'PAP-2022-A4EVENT-CORE', note: 'same 600 km access-shell orbit envelope as case9 access / DAPS baselines' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=9 dB (handheld UE, S-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-TRACK-001', parameterPath: 'beam.tracking_mode', specMode: 'Advanced', note: 'showcase profile keeps the same bounded-steering truth as the benchmark-facing access / DAPS baselines' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-TRACK-001', parameterPath: 'beam.steering_bound_km', specMode: 'Advanced', note: 'bounded steering radius = 200 km ground-plane clamp (= 4 x 50 km beam diameter)' },
    { tier: 'assumption-backed', id: 'ASSUME-CUR-002', specMode: 'Internal-only', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); spec R7 Internal-only fixed constant' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-DAPS', specMode: 'Advanced', note: 'truth-preserving showcase split: single-UE, no-BH DAPS profile with a measured epoch chosen so fresh-start live playback reaches a central high-elevation two-satellite beam scene quickly and shows denser early continuity / handover behavior without restoring fake beam recentering; benchmark-facing case9-daps-baseline remains unchanged' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-DAPS-OVERLAP', parameterPath: 'handover.daps_max_dual_active_sec', specMode: 'Advanced', note: 'dual-active overlap remains widened to 3.0 s so the 1 s discrete runtime can complete the path switch cleanly' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-SINR-EMA', parameterPath: 'handover.sinr_ema_alpha', specMode: 'Advanced', note: 'SINR EMA α=0.3 with stepSec=1s: stabilizes serving SINR estimates for DAPS continuity presentation without mutating engine truth' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-PP-GUARD', parameterPath: 'handover.pingPongWindowSec', specMode: 'Advanced', note: 'Showcase ping-pong guard 15s: still shorter than the benchmark-facing DAPS baseline, but long enough to suppress the visible post-switch return-to-source oscillation seen with the earlier 5s showcase tuning while keeping early continuity / path-switch behavior truth-driven' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-DAPS-PREP-ELEV', parameterPath: 'handover.daps_prepare_elevation_deg', specMode: 'Advanced', note: 'DAPS TTT accelerant 30° retained for the showcase profile; not a trigger gate' },
    { tier: 'assumption-backed', id: 'ASSUME-UE-001', parameterPath: 'ueConfig.count', specMode: 'Advanced', note: 'single-UE showcase input improves first-screen readability without changing SINR / HO / beam-tracking truth paths' },
  ],
};

export const CASE9_DAPS_SHOWCASE_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 3600, stepSec: 1 },
};

export const CASE9_DAPS_SHOWCASE: ProfileConfig =
  materializeRuntimeProfile(CASE9_DAPS_SHOWCASE_BUNDLE, CASE9_DAPS_SHOWCASE_DEFAULT_EXP);

// ---------------------------------------------------------------------------
// 4. sinr-elevation-reproduction (RT-1: PAP-2022-SINR-ELEVATION)
// ---------------------------------------------------------------------------

export const SINR_ELEVATION_REPRODUCTION_BUNDLE: ProfileBundle = {
  id: 'sinr-elevation-reproduction',
  family: 'case9-access-baseline',
  version: '0.1.0',
  exposurePreset: { tier: 'Sensitivity', label: 'Sensitivity — SINR-Elevation Repro' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    ueTopology: { count: 1, distribution: 'uniform' },
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
  // Walker(53°, 66 sats, 6 planes, F=1) — Paper Table I
  orbital: {
    altitude_km: 600,
    inclination_deg: 53,
    num_planes: 6,
    sats_per_plane: 11,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
    phasing_factor: 1, // paper-backed: F=1 from Paper Table I
  },
  // Paper Table II: S-band 2GHz, 30MHz BW, 34 dBW/MHz EIRP, 290K noise
  rf: {
    frequency_ghz: 2.0,
    bandwidth_mhz: 30,
    eirp_density_dbw_per_mhz: 34,
    max_tx_power_dbm: null,
    noise_temperature_k: 290,
    noise_figure_db: 9,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  // Paper §III: 3GPP TR 38.821 RPsat beam model, 50km footprint
  antenna: { peak_gain_dbi: 30, beam_diameter_km: 50 },
  // Paper Table II: 19 beams, FRF=1
  beam: { num_beams: 19, frf: 1, interference_beams: 42 },
  channel: { deployment_environment: SUBURBAN },
  // Paper §IV: A4-event, TTT=640ms, threshold=-6dB, hysteresis=1dB
  handover: { trigger_threshold_db: -6, ttt_ms: 640, hysteresis_db: 1, min_elevation_deg: 10 },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2022-SINR-ELEVATION', note: 'RT-1 reproduction: Walker(53°,66,6,F=1), 600km, S-band 2GHz, EIRP 34dBW/MHz, 19 beams FRF=1, RPsat gain, 290K noise' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', note: '10deg min elevation, shadow fading suburban S-band' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=9 dB (handheld UE, S-band case 9)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-REPRO-RT1', specMode: 'Advanced', note: 'Walker F=1 used; paper does not specify exact epoch or phasing' },
  ],
};

export const SINR_ELEVATION_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 600, stepSec: 1 },
};

export const SINR_ELEVATION_REPRODUCTION: ProfileConfig =
  materializeRuntimeProfile(SINR_ELEVATION_REPRODUCTION_BUNDLE, SINR_ELEVATION_DEFAULT_EXP);

// ---------------------------------------------------------------------------
// 4. timer-cho-reproduction (RT-3: PAP-2025-TIMERCHO-CORE)
// ---------------------------------------------------------------------------

export const TIMER_CHO_REPRODUCTION_BUNDLE: ProfileBundle = {
  id: 'timer-cho-reproduction',
  family: 'case9-access-baseline',
  version: '0.1.0',
  exposurePreset: { tier: 'Sensitivity', label: 'Sensitivity — Timer-CHO Repro' },

  scenario: {
    orbitMode: 'synthetic',
    observer: BEIJING_OBSERVER,
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    ueTopology: { count: 1, distribution: 'uniform' },
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
    // Paper Table I: Timer-CHO
    handover: { type: 'timer-cho' },
    energy: { layer1_enabled: false, layer2_enabled: false },
    ueConfig: {},
  },
  // Paper §IV: Starlink-like, 550km, 72 planes
  orbital: {
    altitude_km: 550,
    inclination_deg: 53,
    num_planes: 72,
    sats_per_plane: 22,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
  },
  // Paper §IV: S-band 2GHz
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
  channel: { deployment_environment: RURAL },
  // Paper Table I: Timer-CHO, α=0.85, L3 filter k=4, TTT=640ms, offset=0dB
  handover: {
    trigger_threshold_db: -6,
    ttt_ms: 640,
    hysteresis_db: 0,
    min_elevation_deg: 10,
    cho_alpha: 0.85,
    cho_filter_k: 4,
    cho_offset_db: 0,
  },
  energy: {},
  ueConfig: { speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2025-TIMERCHO-CORE', note: 'RT-3 reproduction: Starlink-like 550km, S-band 2GHz, Timer-CHO α=0.85, L3 filter k=4, TTT=640ms' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'rural SF/CL lookup environment' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', note: '10deg min elevation' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=9 dB (handheld UE, S-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-REPRO-RT3', specMode: 'Advanced', note: 'Walker 72x22=1584 Starlink shell-1 nominal, F=P/2=36 (PAP-2021-SESSION-DURATION); paper describes Starlink-like 550km/72-planes' },
    { tier: 'assumption-backed', id: 'ASSUME-TIMERCHO-GEOM', specMode: 'Advanced', note: 'Timer-CHO geometry timer simplified to α×TTT; full ToS_remain model requires beam radius and satellite velocity beyond HO manager scope' },
  ],
};

export const TIMER_CHO_DEFAULT_EXP: ExperimentBundle = {
  seed: 42,
  timeControl: { durationSec: 600, stepSec: 1 },
};

export const TIMER_CHO_REPRODUCTION: ProfileConfig =
  materializeRuntimeProfile(TIMER_CHO_REPRODUCTION_BUNDLE, TIMER_CHO_DEFAULT_EXP);
