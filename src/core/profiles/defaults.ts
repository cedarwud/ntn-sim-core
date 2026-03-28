/**
 * Default profile objects for the 4 canonical profile families.
 *
 * Every value is sourced from sdd/ntn-sim-core-profile-baselines.md.
 * Every KPI-impacting default has a sourceMap entry.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §6
 *   - Baselines: sdd/ntn-sim-core-profile-baselines.md §4–§7
 *   - This file must not import React, Three.js, or scene code.
 */

import type { ProfileConfig } from './types';

// ---------------------------------------------------------------------------
// Shared observers (benchmark profiles define their own; showcase uses NTPU)
// ---------------------------------------------------------------------------

const BEIJING_OBSERVER = {
  id: 'beijing',
  name: 'Beijing',
  latitudeDeg: 40.0,
  longitudeDeg: 116.0,
  altitudeM: 50,
} as const;

/** Observer in the 40–45°N sweet spot for 53° inclination Walker constellations. */
const MONTREAL_OBSERVER = {
  id: 'montreal',
  name: 'Montréal',
  latitudeDeg: 45.5,
  longitudeDeg: -73.6,
  altitudeM: 36,
} as const;

const NTPU_OBSERVER = {
  id: 'ntpu',
  name: 'National Taipei University',
  latitudeDeg: 24.9441667,
  longitudeDeg: 121.3713889,
  altitudeM: 50,
} as const;

const DEFAULT_IMPLEMENTATION_LOSS_DB = 2.5;
const SUBURBAN = 'suburban' as const;
const RURAL = 'rural' as const;
const BASELINE_LARGE_SCALE = '3gpp-baseline' as const;
const EXTENDED_LARGE_SCALE = '3gpp-extended' as const;

// ---------------------------------------------------------------------------
// 1. case9-access-baseline (profile-baselines §4)
// ---------------------------------------------------------------------------

export const CASE9_ACCESS_BASELINE = {
  id: 'case9-access-baseline',
  family: 'case9-access-baseline',
  version: '0.1.0',

  orbitMode: 'synthetic',
  beamSemantics: 'earth-moving',

  observer: BEIJING_OBSERVER,
  timeControl: {
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    durationSec: 3600,
    stepSec: 1,
  },
  seed: 42,

  orbital: {
    altitude_km: 600,
    inclination_deg: 53,
    num_planes: 24,
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
    /** 3GPP TR 38.811 Table 4.4-1: handheld UE NF = 9 dB */
    noise_figure_db: 9,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: {
    model: 'rpsat-3gpp',
    peak_gain_dbi: 30,
    beam_diameter_km: 50,
  },
  beam: {
    num_beams: 19,
    layout: 'hexagonal',
    frf: 1,
    interference_beams: 42,
  },
  channel: {
    tier0_fspl: true,
    tier1_large_scale: true,
    tier2_clutter: true,
    tier3_beam_gain: true,
    tier4_atmospheric: false,
    tier5_fading: false,
    large_scale_model: BASELINE_LARGE_SCALE,
    deployment_environment: SUBURBAN,
  },
  handover: {
    type: 'a4-event',
    trigger_threshold_db: -6,
    ttt_ms: 640,
    hysteresis_db: 1,
    min_elevation_deg: 10,
  },
  energy: {
    layer1_enabled: false,
    layer2_enabled: false,
  },
  ueConfig: {
    count: 100,
    distribution: 'uniform',
    speed_kmh: 0,
  },

  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2022-A4EVENT-CORE', parameterPath: 'orbital.altitude_km', note: 'orbit altitude 600km, A4 event trigger' },
    { tier: 'paper-backed', id: 'PAP-2022-SINR-ELEVATION', parameterPath: 'rf.frequency_ghz', note: 'S-band 2GHz — carrier frequency' },
    { tier: 'paper-backed', id: 'PAP-2022-SINR-ELEVATION', parameterPath: 'rf.eirp_density_dbw_per_mhz', note: 'EIRP 34dBW/MHz' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'paper-backed', id: 'PAP-2022-SINR-ELEVATION', parameterPath: 'handover.trigger_threshold_db', note: 'trigger threshold −3 dB reference' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'paper-backed', id: 'PAP-2022-SINR-ELEVATION', parameterPath: 'handover.min_elevation_deg', note: 'min elevation 10°' },
    { tier: 'paper-backed', id: 'PAP-2025-TIMERCHO-CORE', parameterPath: 'beam.num_beams', note: '19 beams, earth-moving, 600km' },
    { tier: 'paper-backed', id: 'PAP-2024-MCCHO-CORE', note: 'access handover baseline' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.tier1_large_scale', note: 'channel tiers 0-2, NTN channel model' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', parameterPath: 'rf.noise_figure_db', note: 'noise_figure_db=9 dB (handheld UE, S-band case 9)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-001', parameterPath: 'orbital.num_planes', note: 'Walker 24x22=528 Starlink-like constellation at 600km/53°; paper does not mandate exact constellation' },
    { tier: 'assumption-backed', id: 'ASSUME-CHAN-001', parameterPath: 'rf.noise_temperature_k', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); T_sys computed as T_ant + T0*(NF_linear-1)' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-001', parameterPath: 'handover.ttt_ms', note: 'TTT=640ms, hysteresis=1dB — representative 3GPP NTN values' },
  ],
} as const satisfies ProfileConfig;

// ---------------------------------------------------------------------------
// 2. hobs-multibeam-baseline (profile-baselines §5)
// ---------------------------------------------------------------------------

export const HOBS_MULTIBEAM_BASELINE = {
  id: 'hobs-multibeam-baseline',
  family: 'hobs-multibeam-baseline',
  version: '0.1.0',

  orbitMode: 'synthetic',
  beamSemantics: 'earth-moving',

  observer: MONTREAL_OBSERVER,
  timeControl: {
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    durationSec: 3600,
    stepSec: 1,
  },
  seed: 42,

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
    eirp_density_dbw_per_mhz: 46, // Ka-band: +12 dB vs S-band to partially compensate ~22 dB additional FSPL
    max_tx_power_dbm: 50,
    noise_temperature_k: 290,
    /** 3GPP TR 38.811 Table 4.4-1: VSAT/laptop NF = 5 dB (Ka-band terminal) */
    noise_figure_db: 5,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: {
    model: 'bessel-j1',
    peak_gain_dbi: 38,
    beam_diameter_km: 25,
  },
  beam: {
    num_beams: 19,
    layout: 'hexagonal',
    frf: 3,
    interference_beams: 0,
    bh_max_active_per_slot: 4,
    bh_frame_duration_sec: 5,      // 5s frame = 1s/slot, visible hopping at stepSec=1
    bh_slots_per_frame: 5,         // ceil(19/4) = 5 slots to cycle all beams
    bh_strategy: 'round-robin',
  },
  channel: {
    tier0_fspl: true,
    tier1_large_scale: true,
    tier2_clutter: false,
    tier3_beam_gain: true,
    tier4_atmospheric: true,
    tier5_fading: false,
    large_scale_model: EXTENDED_LARGE_SCALE,
    deployment_environment: SUBURBAN,
  },
  handover: {
    type: 'hard-ho',
    trigger_threshold_db: -6,
    ttt_ms: 640,
    hysteresis_db: 1,
    min_elevation_deg: 10,
  },
  energy: {
    layer1_enabled: true,
    layer2_enabled: false,
  },
  ueConfig: {
    count: 100,
    distribution: 'uniform',
    speed_kmh: 0,
  },

  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'orbital.altitude_km', note: '550km orbit altitude' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.frequency_ghz', note: 'Ka-band 28GHz carrier' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.bandwidth_mhz', note: '100MHz bandwidth' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'rf.max_tx_power_dbm', note: '50 dBm total satellite TX budget (PAP-2024-HOBS Table I Pmax); fixed-power variant (dpcEnabled=false in this baseline)' },
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', parameterPath: 'handover.trigger_threshold_db', note: 'SINR threshold −6 dB from HOBS baseline' },
    { tier: 'paper-backed', id: 'PAP-2021-SHADOWED-RICIAN', parameterPath: 'antenna.model', note: 'bessel-j1 antenna gain model' },
    { tier: 'paper-backed', id: 'PAP-2024-MADRL-CORE', note: 'multi-beam interference baseline' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', parameterPath: 'rf.noise_figure_db', note: 'noise_figure_db=5 dB (VSAT/laptop UE, Ka-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-002', parameterPath: 'orbital.num_planes', note: 'Walker 24x22=528 sats; HOBS paper constellation scale assumption' },
    { tier: 'assumption-backed', id: 'ASSUME-CHAN-001', parameterPath: 'rf.noise_temperature_k', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative)' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-001', parameterPath: 'antenna.peak_gain_dbi', note: 'peak gain 38dBi, beam diameter 25km — representative Ka-band values' },
    { tier: 'assumption-backed', id: 'ASSUME-ATM-001', parameterPath: 'channel.tier4_atmospheric', note: 'Tier 4 atmospheric: ITU-R P.676/P.618 mid-latitude Ka-band; gaseous 0.6dB, rain 1.5dB, scintillation 0.4dB' },
    { tier: 'assumption-backed', id: 'ASSUME-ENERGY-001', parameterPath: 'energy.layer1_enabled', note: 'txPowerPerBeamDbm=40 dBm (spec P1); activeBeamPowerW=20, idlePowerW=5 are unverified calibration values' },
  ],
} as const satisfies ProfileConfig;

// ---------------------------------------------------------------------------
// 3. bh-resource-baseline (profile-baselines §6, subprofile bh-sfr-780)
// ---------------------------------------------------------------------------

export const BH_RESOURCE_BASELINE = {
  id: 'bh-resource-baseline',
  family: 'bh-resource-baseline',
  version: '0.1.0',

  orbitMode: 'synthetic',
  beamSemantics: 'earth-fixed-bh',

  observer: BEIJING_OBSERVER,
  timeControl: {
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    durationSec: 600,
    stepSec: 1,
  },
  seed: 42,

  orbital: {
    altitude_km: 780,
    inclination_deg: 86.4,
    num_planes: 18,
    sats_per_plane: 18,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
  },
  rf: {
    frequency_ghz: 20.0,
    bandwidth_mhz: 500,
    eirp_density_dbw_per_mhz: 46, // Ka-band requires higher EIRP
    max_tx_power_dbm: 43, // 13 dBW aggregate satellite TX budget per PAP-2025-MAAC-BHPOWER [S10]
    noise_temperature_k: 290,
    /** 3GPP TR 38.811 Table 4.4-1: VSAT/laptop NF = 5 dB (Ka-band terminal) */
    noise_figure_db: 5,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: {
    model: 'bessel-j1',
    peak_gain_dbi: 35,
    beam_diameter_km: 30,
  },
  beam: {
    num_beams: 12,
    layout: 'hexagonal',
    frf: 3,
    interference_beams: 0,
    bh_max_active_per_slot: 4,
    bh_frame_duration_sec: 5,
    bh_slots_per_frame: 3,  // ceil(12/4) = 3 slots to cycle all beams
    bh_strategy: 'round-robin',
    bh_traffic_model: 'uniform',
  },
  channel: {
    tier0_fspl: true,
    tier1_large_scale: true,
    tier2_clutter: false,
    tier3_beam_gain: true,
    tier4_atmospheric: true,
    tier5_fading: false,
    large_scale_model: EXTENDED_LARGE_SCALE,
    deployment_environment: SUBURBAN,
  },
  handover: {
    type: 'hard-ho',
    trigger_threshold_db: -6,
    ttt_ms: 640,
    hysteresis_db: 1,
    min_elevation_deg: 10,
  },
  energy: {
    layer1_enabled: true,
    layer2_enabled: false,
  },
  ueConfig: {
    count: 100,
    distribution: 'uniform',
    speed_kmh: 0,
  },

  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2026-BHFREQREUSE', note: '780km, 66 sats (6x11), 12 beams, soft frequency reuse' },
    { tier: 'paper-backed', id: 'PAP-2025-EEBH-UPLINK', note: 'BH energy efficiency reference' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'paper-backed', id: 'PAP-2025-MAAC-BHPOWER', parameterPath: 'rf.max_tx_power_dbm', note: '13 dBW aggregate satellite TX budget (43 dBm) from [S10]' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=5 dB (VSAT/laptop UE, Ka-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-CHAN-001', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); T_sys computed as T_ant + T0*(NF_linear-1)' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-002', note: 'peak gain 35dBi, beam diameter 30km — representative Ka/Ku-band BH values' },
    { tier: 'assumption-backed', id: 'ASSUME-RF-001', note: 'Ka-band 20GHz, 500MHz BW — representative for BH resource studies' },
  ],
} as const satisfies ProfileConfig;

// ---------------------------------------------------------------------------
// 3b. bh-resource-energy-proof — deterministic Phase 5 proof path
// ---------------------------------------------------------------------------

export const BH_RESOURCE_ENERGY_PROOF = {
  id: 'bh-resource-energy-proof',
  family: 'bh-resource-baseline',
  version: '0.1.0',

  orbitMode: 'synthetic',
  beamSemantics: 'earth-fixed-bh',

  observer: BEIJING_OBSERVER,
  timeControl: {
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    durationSec: 240,
    stepSec: 1,
  },
  seed: 42,

  orbital: {
    ...BH_RESOURCE_BASELINE.orbital,
  },
  rf: {
    ...BH_RESOURCE_BASELINE.rf,
  },
  antenna: {
    ...BH_RESOURCE_BASELINE.antenna,
    peak_gain_dbi: 33,
    beam_diameter_km: 100,
  },
  beam: {
    ...BH_RESOURCE_BASELINE.beam,
    num_beams: 37,
    bh_strategy: 'deterministic-fixed',
  },
  channel: {
    ...BH_RESOURCE_BASELINE.channel,
  },
  handover: {
    ...BH_RESOURCE_BASELINE.handover,
  },
  energy: {
    layer1_enabled: true,
    layer2_enabled: true,
    layer2_overrides: {
      batteryCapacityWh: 0.5,
      initialSoc: 0.6,
      solarPowerW: 0,
      blockingThresholdSoc: 0.15,
      orbitalPeriodSec: 5760,
      shadowFraction: 0.35,
    },
  },
  ueConfig: {
    ...BH_RESOURCE_BASELINE.ueConfig,
  },

  sourceMap: [
    ...BH_RESOURCE_BASELINE.sourceMap,
    {
      tier: 'assumption-backed',
      id: 'ASSUME-ENE-001',
      note: 'Layer 2 proof profile uses reduced battery capacity and zero-solar showcase overrides to expose deterministic energyBlocked service loss without changing physics code paths',
    },
    {
      tier: 'assumption-backed',
      id: 'ASSUME-CUR-002',
      note: 'deterministic-fixed BH scheduling plus expanded 37-beam / 100km footprint geometry is used only for proof/validation closure so inactive-beam and energy-blocked states appear repeatably in browser automation',
    },
  ],
} as const satisfies ProfileConfig;

// ---------------------------------------------------------------------------
// 3c. bh-pf-baseline — Proportional Fair BH scheduler (paper comparison baseline)
//
// Standard PF scheduling baseline for DRL papers. Most papers (HOBS, SMASH-MADQL,
// EAQL, EEBH-UPLINK) compare DRL results against a PF or greedy baseline.
// This profile uses the same orbit/RF as bh-resource-baseline but with PF scheduler.
// Reference: PAP-2024-HOBS Fig.6, PAP-2025-SMASH-MADQL Table II baselines.
// ---------------------------------------------------------------------------

export const BH_PF_BASELINE = {
  id: 'bh-pf-baseline',
  family: 'bh-resource-baseline',
  version: '0.1.0',

  orbitMode: 'synthetic',
  beamSemantics: 'earth-fixed-bh',

  observer: BEIJING_OBSERVER,
  timeControl: {
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    durationSec: 600,
    stepSec: 1,
  },
  seed: 42,

  orbital: { ...BH_RESOURCE_BASELINE.orbital },
  rf: { ...BH_RESOURCE_BASELINE.rf },
  antenna: { ...BH_RESOURCE_BASELINE.antenna },
  beam: {
    ...BH_RESOURCE_BASELINE.beam,
    bh_strategy: 'proportional-fair',
    bh_traffic_model: 'hotspot',
    bh_traffic_arrival_rate: 15,
  },
  channel: { ...BH_RESOURCE_BASELINE.channel },
  handover: { ...BH_RESOURCE_BASELINE.handover },
  energy: { layer1_enabled: true, layer2_enabled: false },
  ueConfig: {
    count: 10,
    distribution: 'hotspot',
    speed_kmh: 0,
    independentHandover: true,
  },

  sourceMap: [
    ...BH_RESOURCE_BASELINE.sourceMap,
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
} as const satisfies ProfileConfig;

// ---------------------------------------------------------------------------
// 3d. bh-sinr-greedy-baseline — SINR-Greedy BH scheduler
//
// Channel-aware greedy scheduler that activates beams with highest SINR estimate.
// Used as upper-bound reference in beam selection papers (PAP-2026-DRL-BHOPT).
// ---------------------------------------------------------------------------

export const BH_SINR_GREEDY_BASELINE = {
  id: 'bh-sinr-greedy-baseline',
  family: 'bh-resource-baseline',
  version: '0.1.0',

  orbitMode: 'synthetic',
  beamSemantics: 'earth-fixed-bh',

  observer: BEIJING_OBSERVER,
  timeControl: {
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    durationSec: 600,
    stepSec: 1,
  },
  seed: 42,

  orbital: { ...BH_RESOURCE_BASELINE.orbital },
  rf: { ...BH_RESOURCE_BASELINE.rf },
  antenna: { ...BH_RESOURCE_BASELINE.antenna },
  beam: {
    ...BH_RESOURCE_BASELINE.beam,
    bh_strategy: 'sinr-greedy',
    bh_traffic_model: 'uniform',
  },
  channel: { ...BH_RESOURCE_BASELINE.channel },
  handover: { ...BH_RESOURCE_BASELINE.handover },
  energy: { layer1_enabled: true, layer2_enabled: false },
  ueConfig: {
    count: 5,
    distribution: 'uniform',
    speed_kmh: 0,
    independentHandover: true,
  },

  sourceMap: [
    ...BH_RESOURCE_BASELINE.sourceMap,
    {
      tier: 'paper-backed',
      id: 'PAP-2026-DRL-BHOPT',
      note: 'SINR-greedy is the channel-aware upper-bound baseline for DRL BH optimization',
    },
  ],
} as const satisfies ProfileConfig;

// ---------------------------------------------------------------------------
// 4. real-trace-validation (profile-baselines §7)
// ---------------------------------------------------------------------------

export const REAL_TRACE_VALIDATION = {
  id: 'real-trace-validation',
  family: 'real-trace-validation',
  version: '0.1.0',

  orbitMode: 'real-trace',
  tleDataPath: 'fixtures/starlink-shell1-50.json',
  tleMaxSatellites: 50,
  beamSemantics: 'earth-moving',

  observer: BEIJING_OBSERVER,
  timeControl: {
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    durationSec: 600,
    stepSec: 1,
  },
  seed: 42,

  // Orbital params are nominal — real-trace mode uses TLE/SGP4 propagation
  orbital: {
    altitude_km: 550,
    inclination_deg: 53.0,
    num_planes: 72,
    sats_per_plane: 22,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
  },
  // RF/antenna/beam inherited from the synthetic profile being validated
  rf: {
    frequency_ghz: 2.0,
    bandwidth_mhz: 20,
    eirp_density_dbw_per_mhz: 34,
    max_tx_power_dbm: null,
    noise_temperature_k: 290,
    /** 3GPP TR 38.811 Table 4.4-1: handheld UE NF = 9 dB */
    noise_figure_db: 9,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: {
    model: 'rpsat-3gpp',
    peak_gain_dbi: 30,
    beam_diameter_km: 50,
  },
  beam: {
    num_beams: 19,
    layout: 'hexagonal',
    frf: 1,
    interference_beams: 42,
  },
  channel: {
    tier0_fspl: true,
    tier1_large_scale: true,
    tier2_clutter: true,
    tier3_beam_gain: true,
    tier4_atmospheric: false,
    tier5_fading: false,
    large_scale_model: BASELINE_LARGE_SCALE,
    deployment_environment: SUBURBAN,
  },
  handover: {
    type: 'a4-event',
    trigger_threshold_db: -6,
    ttt_ms: 640,
    hysteresis_db: 1,
    min_elevation_deg: 10,
  },
  energy: {
    layer1_enabled: false,
    layer2_enabled: false,
  },
  ueConfig: {
    count: 100,
    distribution: 'uniform',
    speed_kmh: 0,
  },

  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2025-DAPS-CORE', note: 'real-trace validation reference' },
    { tier: 'paper-backed', id: 'PAP-2025-SMASH-MADQL', note: 'real-trace validation reference' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'normative', id: 'REAL-TRACE-POLICY', note: 'beam/channel/power inherited from validated synthetic profile per profile-baselines §7.2' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=9 dB (handheld UE, S-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-003', note: 'Starlink shell-1 nominal params (550km, 53deg, 72x22) — actual propagation uses TLE' },
    { tier: 'assumption-backed', id: 'ASSUME-CHAN-001', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); T_sys = T_ant + T0*(NF_linear-1)' },
  ],
} as const satisfies ProfileConfig;

// ---------------------------------------------------------------------------
// 5. case9-daps-baseline — DAPS dual-active handover showcase (profile-baselines §4 variant)
// ---------------------------------------------------------------------------

export const CASE9_DAPS_BASELINE = {
  id: 'case9-daps-baseline',
  family: 'case9-daps-baseline',
  version: '0.1.0',

  orbitMode: 'synthetic',
  beamSemantics: 'earth-moving',

  observer: BEIJING_OBSERVER,
  timeControl: {
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 8, 0),
    durationSec: 3600,
    stepSec: 1,
  },
  seed: 42,

  orbital: {
    altitude_km: 600,
    inclination_deg: 53,
    num_planes: 24,
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
    /** 3GPP TR 38.811 Table 4.4-1: handheld UE NF = 9 dB */
    noise_figure_db: 9,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: {
    model: 'rpsat-3gpp',
    peak_gain_dbi: 30,
    beam_diameter_km: 50,
  },
  beam: {
    num_beams: 19,
    layout: 'hexagonal',
    frf: 1,
    interference_beams: 42,
  },
  channel: {
    tier0_fspl: true,
    tier1_large_scale: true,
    tier2_clutter: true,
    tier3_beam_gain: true,
    tier4_atmospheric: false,
    tier5_fading: false,
    large_scale_model: BASELINE_LARGE_SCALE,
    deployment_environment: SUBURBAN,
  },
  handover: {
    type: 'daps',
    trigger_threshold_db: -6,
    ttt_ms: 640,
    hysteresis_db: 1,
    min_elevation_deg: 10,
  },
  energy: {
    layer1_enabled: false,
    layer2_enabled: false,
  },
  ueConfig: {
    count: 10,
    distribution: 'uniform',
    speed_kmh: 0,
  },

  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2025-DAPS-CORE', note: 'DAPS dual-active handover, 600km, S-band' },
    { tier: 'paper-backed', id: 'PAP-2022-A4EVENT-CORE', note: 'orbit altitude 600km, A4 event trigger baseline' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=9 dB (handheld UE, S-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-CHAN-001', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative)' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-DAPS', note: 'DAPS profile matches case9-access-baseline constellation; ueCount=10 for clearer dual-active visualization and epoch is shifted to expose dual-active inside the deterministic replay window' },
  ],
} as const satisfies ProfileConfig;

// ---------------------------------------------------------------------------
// MEO Constellation Baseline (O3b-like, Ka-band 20 GHz)
// ---------------------------------------------------------------------------

const MEO_CONSTELLATION_BASELINE: ProfileConfig = {
  id: 'meo-constellation-baseline',
  family: 'meo-constellation-baseline',
  version: '1.0.0',

  orbitMode: 'synthetic',
  beamSemantics: 'earth-moving',

  observer: BEIJING_OBSERVER,
  timeControl: { epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0), durationSec: 3600, stepSec: 1 },
  seed: 42,

  orbital: {
    orbitType: 'meo',
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
    /** 3GPP TR 38.811 Table 4.4-1: VSAT/laptop NF = 5 dB (Ka-band terminal) */
    noise_figure_db: 5,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: {
    model: 'bessel-j1',
    peak_gain_dbi: 38,
    beam_diameter_km: 200,
  },
  beam: {
    num_beams: 1,
    layout: 'circular',
    frf: 1,
    interference_beams: 0,
  },
  channel: {
    tier0_fspl: true,
    tier1_large_scale: true,
    tier2_clutter: true,
    tier3_beam_gain: true,
    tier4_atmospheric: true,
    tier5_fading: false,
    large_scale_model: EXTENDED_LARGE_SCALE,
    deployment_environment: SUBURBAN,
  },
  handover: {
    type: 'a4-event',
    trigger_threshold_db: -6,
    ttt_ms: 1000,
    hysteresis_db: 2,
    min_elevation_deg: 10,
    pingPongWindowSec: 60,
  },
  energy: {
    layer1_enabled: false,
    layer2_enabled: true,
    layer2_overrides: {
      altitudeKm: 8062,
    },
  },
  ueConfig: {
    count: 1,
    distribution: 'uniform',
    speed_kmh: 0,
  },

  sourceMap: [
    { tier: 'paper-backed', id: 'O3B-MEO', note: 'O3b MEO constellation 8062 km equatorial, Ka-band' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=5 dB (VSAT/laptop UE, Ka-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-MEO-BASELINE', note: 'MEO baseline for cross-orbit comparison; single beam per sat' },
  ],
} as const satisfies ProfileConfig;

// ---------------------------------------------------------------------------
// GEO Relay Baseline (3-sat classic GEO, Ku-band 12 GHz)
// ---------------------------------------------------------------------------

const GEO_RELAY_BASELINE: ProfileConfig = {
  id: 'geo-relay-baseline',
  family: 'geo-relay-baseline',
  version: '1.0.0',

  orbitMode: 'synthetic',
  beamSemantics: 'earth-moving',

  observer: BEIJING_OBSERVER,
  timeControl: { epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0), durationSec: 3600, stepSec: 1 },
  seed: 42,

  orbital: {
    orbitType: 'geo',
    altitude_km: 35786,
    inclination_deg: 0,
    num_planes: 1,
    sats_per_plane: 0,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
    geoSatellites: [
      { id: 'geo-east', longitudeDeg: 60 },
      { id: 'geo-pacific', longitudeDeg: 180 },
      { id: 'geo-west', longitudeDeg: 300 },
    ],
  },
  rf: {
    frequency_ghz: 12,
    bandwidth_mhz: 500,
    eirp_density_dbw_per_mhz: 18,
    max_tx_power_dbm: null,
    noise_temperature_k: 350,
    /** 3GPP TR 38.811 Table 4.4-1: VSAT/laptop NF = 5 dB (Ku-band VSAT terminal) */
    noise_figure_db: 5,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: {
    model: 'bessel-j1',
    peak_gain_dbi: 42,
    beam_diameter_km: 500,
  },
  beam: {
    num_beams: 1,
    layout: 'circular',
    frf: 1,
    interference_beams: 0,
  },
  channel: {
    tier0_fspl: true,
    tier1_large_scale: true,
    tier2_clutter: true,
    tier3_beam_gain: true,
    tier4_atmospheric: true,
    tier5_fading: false,
    large_scale_model: EXTENDED_LARGE_SCALE,
    deployment_environment: SUBURBAN,
  },
  handover: {
    type: 'hard-ho',
    trigger_threshold_db: -10,
    ttt_ms: 2000,
    hysteresis_db: 3,
    min_elevation_deg: 5,
    pingPongWindowSec: 300,
  },
  energy: {
    layer1_enabled: false,
    layer2_enabled: true,
    layer2_overrides: {
      orbitalPeriodSec: 86164,
      shadowFraction: 0.01,
      altitudeKm: 35786,
    },
  },
  ueConfig: {
    count: 1,
    distribution: 'uniform',
    speed_kmh: 0,
  },

  sourceMap: [
    { tier: 'standard-backed', id: 'ITU-GEO', note: 'Standard 3-sat GEO coverage at 120° spacing, Ku-band' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=5 dB (VSAT/laptop UE, Ku-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-GEO-BASELINE', note: 'GEO relay baseline for cross-orbit comparison; shadow fraction near-zero except equinox season' },
  ],
} as const satisfies ProfileConfig;

// ---------------------------------------------------------------------------
// Profile registry
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// RT-1: SINR vs Elevation Reproduction (PAP-2022-SINR-ELEVATION)
// Parameters: Walker(53°,66,6,F=1), 600km, S-band 2GHz, 19 beams FRF=1
// reproduction-targets.md §3
// ---------------------------------------------------------------------------

export const SINR_ELEVATION_REPRODUCTION: ProfileConfig = {
  id: 'sinr-elevation-reproduction',
  family: 'case9-access-baseline',
  version: '0.1.0',
  orbitMode: 'synthetic',
  beamSemantics: 'earth-moving',
  observer: BEIJING_OBSERVER,
  timeControl: {
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    durationSec: 600,
    stepSec: 1,
  },
  seed: 42,
  orbital: {
    // Walker(53°, 66 sats, 6 planes, F=1) — Paper Table I
    altitude_km: 600,
    inclination_deg: 53,
    num_planes: 6,
    sats_per_plane: 11,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
  },
  rf: {
    // Paper Table II: S-band 2GHz, 30MHz BW, 34 dBW/MHz EIRP, 290K noise
    frequency_ghz: 2.0,
    bandwidth_mhz: 30,
    eirp_density_dbw_per_mhz: 34,
    max_tx_power_dbm: null,
    noise_temperature_k: 290,
    /** 3GPP TR 38.811 Table 4.4-1: handheld UE NF = 9 dB (S-band case 9 scenario) */
    noise_figure_db: 9,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: {
    // Paper §III: 3GPP TR 38.821 RPsat beam model, 50km footprint
    model: 'rpsat-3gpp',
    peak_gain_dbi: 30,
    beam_diameter_km: 50,
  },
  beam: {
    // Paper Table II: 19 beams, FRF=1
    num_beams: 19,
    layout: 'hexagonal',
    frf: 1,
    interference_beams: 42,
  },
  channel: {
    // Tiers 0-3 enabled; tier4 off (S-band); tier5 off per paper
    tier0_fspl: true,
    tier1_large_scale: true,
    tier2_clutter: true,
    tier3_beam_gain: true,
    tier4_atmospheric: false,
    tier5_fading: false,
    large_scale_model: BASELINE_LARGE_SCALE,
    deployment_environment: SUBURBAN,
  },
  handover: {
    // Paper §IV: A4-event, TTT=640ms, threshold=-6dB, hysteresis=1dB
    type: 'a4-event',
    trigger_threshold_db: -6,
    ttt_ms: 640,
    hysteresis_db: 1,
    min_elevation_deg: 10,
  },
  energy: { layer1_enabled: false, layer2_enabled: false },
  ueConfig: { count: 1, distribution: 'uniform', speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2022-SINR-ELEVATION', note: 'RT-1 reproduction: Walker(53°,66,6,F=1), 600km, S-band 2GHz, EIRP 34dBW/MHz, 19 beams FRF=1, RPsat gain, 290K noise' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', note: '10deg min elevation, shadow fading suburban S-band' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=9 dB (handheld UE, S-band case 9)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-REPRO-RT1', note: 'Walker F=1 used; paper does not specify exact epoch or phasing' },
  ],
};

// ---------------------------------------------------------------------------
// RT-2: HOBS Multi-Beam EE Reproduction (PAP-2024-HOBS)
// Parameters: Walker(55°,72,6,F=1), 550km, Ka-band 28GHz, 37 beams FRF=3
// reproduction-targets.md §4
// ---------------------------------------------------------------------------

export const HOBS_REPRODUCTION: ProfileConfig = {
  id: 'hobs-reproduction',
  family: 'hobs-multibeam-baseline',
  version: '0.1.0',
  orbitMode: 'synthetic',
  beamSemantics: 'earth-moving',
  observer: BEIJING_OBSERVER,
  timeControl: {
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    durationSec: 600,
    stepSec: 1,
  },
  seed: 42,
  orbital: {
    // Paper §IV: Walker(55°, 72 sats, 6 planes, F=1), 550km
    altitude_km: 550,
    inclination_deg: 55,
    num_planes: 6,
    sats_per_plane: 12,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
  },
  rf: {
    // Paper Table I: Ka-band 28GHz, 100MHz BW, Pmax=50dBm
    frequency_ghz: 28,
    bandwidth_mhz: 100,
    eirp_density_dbw_per_mhz: 46,
    max_tx_power_dbm: null,
    noise_temperature_k: 290,
    /** 3GPP TR 38.811 Table 4.4-1: VSAT/laptop NF = 5 dB (Ka-band terminal) */
    noise_figure_db: 5,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: {
    // Paper §III: Bessel-J1 beam model
    model: 'bessel-j1',
    peak_gain_dbi: 38,
    beam_diameter_km: 25,
  },
  beam: {
    // Paper Table I: M=37 beams, FRF=3
    num_beams: 37,
    layout: 'hexagonal',
    frf: 3,
    interference_beams: 42,
  },
  channel: {
    // Full Ka-band channel model: all tiers including atmospheric
    tier0_fspl: true,
    tier1_large_scale: true,
    tier2_clutter: true,
    tier3_beam_gain: true,
    tier4_atmospheric: true,
    tier5_fading: false,
    large_scale_model: EXTENDED_LARGE_SCALE,
    deployment_environment: SUBURBAN,
  },
  handover: {
    type: 'a4-event',
    trigger_threshold_db: -6,
    ttt_ms: 640,
    hysteresis_db: 1,
    min_elevation_deg: 10,
  },
  energy: {
    // EE layer 1 enabled for throughput/power metric; power values are assumption-backed (see ASSUME-ENERGY-001)
    layer1_enabled: true,
    layer2_enabled: false,
  },
  ueConfig: { count: 1, distribution: 'uniform', speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', note: 'RT-2 reproduction: Walker(55°,72,6,F=1), 550km, Ka 28GHz, 100MHz BW (Table I), 37 beams FRF=3 (Table I), Bessel-J1 gain' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'suburban SF/CL lookup environment' },
    { tier: 'assumption-backed', id: 'ASSUME-ENERGY-001', note: '20W active / 5W idle are assumption-backed values; HOBS Table II is beam training accuracy (not power values); PAP-2025-SMASH-MADQL citation for these values is unverified — see spec GAP-5' },
    { tier: 'paper-backed', id: 'PAP-2021-SHADOWED-RICIAN', note: 'Bessel J1 beam gain family reference' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=5 dB (VSAT/laptop UE, Ka-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-REPRO-RT2', note: 'Walker F=1 used; paper does not specify exact epoch' },
    { tier: 'assumption-backed', id: 'ASSUME-CHAN-001', note: 'noise_temperature_k=290K is T_ant (clear-sky conservative); T_sys = T_ant + T0*(NF_linear-1)' },
  ],
};

// ---------------------------------------------------------------------------
// RT-3: Timer-CHO Reproduction (PAP-2025-TIMERCHO-CORE)
// Parameters: Starlink-like 550km, S-band 2GHz, Timer-CHO α=0.85
// reproduction-targets.md §5
// ---------------------------------------------------------------------------

export const TIMER_CHO_REPRODUCTION: ProfileConfig = {
  id: 'timer-cho-reproduction',
  family: 'case9-access-baseline',
  version: '0.1.0',
  orbitMode: 'synthetic',
  beamSemantics: 'earth-moving',
  observer: BEIJING_OBSERVER,
  timeControl: {
    epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
    durationSec: 600,
    stepSec: 1,
  },
  seed: 42,
  orbital: {
    // Paper §IV: Starlink-like, 550km, 72 planes
    altitude_km: 550,
    inclination_deg: 53,
    num_planes: 24,
    sats_per_plane: 22,
    raan_spread_deg: 360,
    phase_offset_deg: 0,
  },
  rf: {
    // Paper §IV: S-band 2GHz
    frequency_ghz: 2.0,
    bandwidth_mhz: 20,
    eirp_density_dbw_per_mhz: 34,
    max_tx_power_dbm: null,
    noise_temperature_k: 290,
    /** 3GPP TR 38.811 Table 4.4-1: handheld UE NF = 9 dB (S-band case 9 scenario) */
    noise_figure_db: 9,
    implementation_loss_db: DEFAULT_IMPLEMENTATION_LOSS_DB,
  },
  antenna: {
    model: 'rpsat-3gpp',
    peak_gain_dbi: 30,
    beam_diameter_km: 50,
  },
  beam: {
    num_beams: 19,
    layout: 'hexagonal',
    frf: 1,
    interference_beams: 42,
  },
  channel: {
    tier0_fspl: true,
    tier1_large_scale: true,
    tier2_clutter: true,
    tier3_beam_gain: true,
    tier4_atmospheric: false,
    tier5_fading: false,
    large_scale_model: BASELINE_LARGE_SCALE,
    deployment_environment: RURAL,
  },
  handover: {
    // Paper Table I: Timer-CHO, α=0.85, L3 filter k=4, TTT=640ms, offset=0dB
    type: 'timer-cho',
    trigger_threshold_db: -6,
    ttt_ms: 640,
    hysteresis_db: 0,
    min_elevation_deg: 10,
    cho_alpha: 0.85,
    cho_filter_k: 4,
    cho_offset_db: 0,
  },
  energy: { layer1_enabled: false, layer2_enabled: false },
  ueConfig: { count: 1, distribution: 'uniform', speed_kmh: 0 },
  sourceMap: [
    { tier: 'paper-backed', id: 'PAP-2025-TIMERCHO-CORE', note: 'RT-3 reproduction: Starlink-like 550km, S-band 2GHz, Timer-CHO α=0.85, L3 filter k=4, TTT=640ms' },
    { tier: 'paper-backed', id: 'PAP-2022-SENSORS-BH', parameterPath: 'rf.implementation_loss_db', note: 'implementation_loss_db=2.5 dB (0.5 dB feeder + 2.0 dB pointing)' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', parameterPath: 'channel.deployment_environment', note: 'rural SF/CL lookup environment' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', note: '10deg min elevation' },
    { tier: 'standard-backed', id: 'STD-3GPP-38811-TABLE-4.4-1', note: 'noise_figure_db=9 dB (handheld UE, S-band)' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-REPRO-RT3', note: 'Walker 24x22 used as Starlink-like proxy; paper does not mandate exact constellation' },
    { tier: 'assumption-backed', id: 'ASSUME-TIMERCHO-GEOM', note: 'Timer-CHO geometry timer simplified to α×TTT; full ToS_remain model requires beam radius and satellite velocity beyond HO manager scope' },
  ],
};

// ---------------------------------------------------------------------------
// DEFAULT_PROFILES registry
// ---------------------------------------------------------------------------

export const DEFAULT_PROFILES: Record<string, ProfileConfig> = {
  'case9-access-baseline': CASE9_ACCESS_BASELINE,
  'hobs-multibeam-baseline': HOBS_MULTIBEAM_BASELINE,
  'bh-resource-baseline': BH_RESOURCE_BASELINE,
  'bh-resource-energy-proof': BH_RESOURCE_ENERGY_PROOF,
  'bh-pf-baseline': BH_PF_BASELINE,
  'bh-sinr-greedy-baseline': BH_SINR_GREEDY_BASELINE,
  'real-trace-validation': REAL_TRACE_VALIDATION,
  'case9-daps-baseline': CASE9_DAPS_BASELINE,
  'meo-constellation-baseline': MEO_CONSTELLATION_BASELINE,
  'geo-relay-baseline': GEO_RELAY_BASELINE,
  'sinr-elevation-reproduction': SINR_ELEVATION_REPRODUCTION,
  'hobs-reproduction': HOBS_REPRODUCTION,
  'timer-cho-reproduction': TIMER_CHO_REPRODUCTION,
};
