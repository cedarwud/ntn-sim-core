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

const NTPU_OBSERVER = {
  id: 'ntpu',
  name: 'National Taipei University',
  latitudeDeg: 24.9441667,
  longitudeDeg: 121.3713889,
  altitudeM: 50,
} as const;

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
    { tier: 'paper-backed', id: 'PAP-2022-A4EVENT-CORE', note: 'orbit altitude 600km, A4 event trigger' },
    { tier: 'paper-backed', id: 'PAP-2022-SINR-ELEVATION', note: 'S-band 2GHz, EIRP 34dBW/MHz, 19 beams, 50km footprint, FRF=1, RPsat gain' },
    { tier: 'paper-backed', id: 'PAP-2025-TIMERCHO-CORE', note: '600km altitude, 19 beams, earth-moving' },
    { tier: 'paper-backed', id: 'PAP-2024-MCCHO-CORE', note: 'access handover baseline' },
    { tier: 'standard-backed', id: '3GPP-NTN-ACCESS', note: '10deg min elevation, channel tiers 0-2' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-001', note: 'Walker 24x22=528 Starlink-like constellation at 600km/53°; paper does not mandate exact constellation' },
    { tier: 'assumption-backed', id: 'ASSUME-CHAN-001', note: 'noise temperature 290K standard assumption' },
    { tier: 'assumption-backed', id: 'ASSUME-HO-001', note: 'TTT=640ms, hysteresis=1dB — representative 3GPP NTN values' },
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

  observer: BEIJING_OBSERVER,
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
    { tier: 'paper-backed', id: 'PAP-2024-HOBS', note: '550km, Ka-band 28GHz, 100MHz BW, 50dBm max TX, 19 beams FRF=3, Bessel J1 gain, DPC power control, EE=throughput/power' },
    { tier: 'paper-backed', id: 'PAP-2021-SHADOWED-RICIAN', note: 'Bessel J1 beam gain family reference' },
    { tier: 'paper-backed', id: 'PAP-2024-MADRL-CORE', note: 'multi-beam interference baseline' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-002', note: 'Walker 15x11=165 sats as synthetic reproduction of HOBS constellation scale' },
    { tier: 'assumption-backed', id: 'ASSUME-CHAN-001', note: 'noise temperature 290K standard assumption' },
    { tier: 'assumption-backed', id: 'ASSUME-BEAM-001', note: 'peak gain 38dBi, beam diameter 25km — representative Ka-band values' },
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
    max_tx_power_dbm: 50,
    noise_temperature_k: 290,
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
  },
  channel: {
    tier0_fspl: true,
    tier1_large_scale: true,
    tier2_clutter: false,
    tier3_beam_gain: true,
    tier4_atmospheric: true,
    tier5_fading: false,
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
    { tier: 'paper-backed', id: 'PAP-2025-MAAC-BHPOWER', note: 'BH power allocation reference' },
    { tier: 'assumption-backed', id: 'ASSUME-CHAN-001', note: 'noise temperature 290K standard assumption' },
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
    { tier: 'normative', id: 'REAL-TRACE-POLICY', note: 'beam/channel/power inherited from validated synthetic profile per profile-baselines §7.2' },
    { tier: 'assumption-backed', id: 'ASSUME-ORB-003', note: 'Starlink shell-1 nominal params (550km, 53deg, 72x22) — actual propagation uses TLE' },
    { tier: 'assumption-backed', id: 'ASSUME-CHAN-001', note: 'noise temperature 290K standard assumption' },
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
    { tier: 'assumption-backed', id: 'ASSUME-HO-DAPS', note: 'DAPS profile matches case9-access-baseline constellation; ueCount=10 for clearer dual-active visualization and epoch is shifted to expose dual-active inside the deterministic replay window' },
  ],
} as const satisfies ProfileConfig;

// ---------------------------------------------------------------------------
// Profile registry
// ---------------------------------------------------------------------------

export const DEFAULT_PROFILES: Record<string, ProfileConfig> = {
  'case9-access-baseline': CASE9_ACCESS_BASELINE,
  'hobs-multibeam-baseline': HOBS_MULTIBEAM_BASELINE,
  'bh-resource-baseline': BH_RESOURCE_BASELINE,
  'bh-resource-energy-proof': BH_RESOURCE_ENERGY_PROOF,
  'real-trace-validation': REAL_TRACE_VALIDATION,
  'case9-daps-baseline': CASE9_DAPS_BASELINE,
};
