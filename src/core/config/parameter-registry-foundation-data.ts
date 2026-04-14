import type { ParameterEntry } from './parameter-registry-schema';

/**
 * Phase 5 Core Structural Split: Foundation registry data.
 * Ownership: Orbital, RF, and antenna parameter literals.
 */

export const FOUNDATION_PARAMETER_REGISTRY: ParameterEntry[] = [
  {
    spec: {
      id: 'PARAM-ORB-ALTITUDE-KM',
      parameterPath: 'orbital.altitude_km',
      semanticName: 'Orbit Altitude',
      unit: 'km',
      allowedRange: { min: 200, max: 40000 },
      isDerived: false,
      vocabularyLayer: 'scenario',
    },
    bindings: [
      { parameterId: 'PARAM-ORB-ALTITUDE-KM', profileId: 'case9-access-baseline', defaultValue: 600, sourceTier: 'paper-backed', sourceId: 'PAP-2022-A4EVENT-CORE', sourceNote: 'orbit altitude 600 km', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-ORB-ALTITUDE-KM', profileId: 'hobs-multibeam-baseline', defaultValue: 550, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: '550 km orbit altitude', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-ORB-ALTITUDE-KM', profileId: 'modqn-paper-baseline', defaultValue: 780, sourceTier: 'paper-backed', sourceId: 'PAP-2024-MORL-MULTIBEAM', sourceNote: '780 km orbit altitude (simulation parameters)', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-ORB-ALTITUDE-KM', profileId: 'bh-resource-baseline', defaultValue: 780, sourceTier: 'paper-backed', sourceId: 'PAP-2026-BHFREQREUSE', sourceNote: '780 km, 66-sat constellation', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-ORB-ALTITUDE-KM', profileId: 'real-trace-validation', defaultValue: 550, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-003', sourceNote: 'Starlink shell-1 nominal 550 km; real-trace ingest comes from external OMM/TLE records and cache samples use SatRec-backed SGP4 propagation', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ORB-ALTITUDE-KM', profileId: 'meo-constellation-baseline', defaultValue: 8062, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MEO-BASELINE', sourceNote: 'O3b-like MEO ~8062 km', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ORB-ALTITUDE-KM', profileId: 'geo-relay-baseline', defaultValue: 35786, sourceTier: 'assumption-backed', sourceId: 'ASSUME-GEO-BASELINE', sourceNote: 'GEO 35786 km geostationary', exposureMode: 'Advanced' },
    ],
  },
  {
    spec: {
      id: 'PARAM-ORB-INCLINATION-DEG',
      parameterPath: 'orbital.inclination_deg',
      semanticName: 'Orbital Inclination',
      unit: 'deg',
      allowedRange: { min: 0, max: 180 },
      isDerived: false,
      vocabularyLayer: 'scenario',
    },
    bindings: [
      { parameterId: 'PARAM-ORB-INCLINATION-DEG', profileId: '__universal__', defaultValue: 53, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-001', sourceNote: 'Walker constellation inclination; value varies per family', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ORB-INCLINATION-DEG', profileId: 'hobs-multibeam-baseline', defaultValue: 53, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-001', sourceNote: 'HOBS synthetic Walker proxy uses 53° because the paper does not disclose inclination', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ORB-INCLINATION-DEG', profileId: 'hobs-reproduction', defaultValue: 53, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-REPRO-RT2', sourceNote: 'RT-2 synthetic Walker proxy uses 53° because the paper does not disclose inclination', exposureMode: 'Sensitivity' },
      { parameterId: 'PARAM-ORB-INCLINATION-DEG', profileId: 'modqn-paper-baseline', defaultValue: 53, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MODQN-ORBIT', sourceNote: 'runtime 2x2 Walker proxy uses 53° inclination because the paper does not disclose the STK shell layout', exposureMode: 'Advanced' },
    ],
  },
  {
    spec: {
      id: 'PARAM-ORB-NUM-PLANES',
      parameterPath: 'orbital.num_planes',
      semanticName: 'Number of Orbital Planes',
      unit: null,
      allowedRange: { min: 1, max: 200 },
      isDerived: false,
      vocabularyLayer: 'scenario',
    },
    bindings: [
      { parameterId: 'PARAM-ORB-NUM-PLANES', profileId: 'case9-access-baseline', defaultValue: 72, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-001', sourceNote: 'Walker 72x22=1584 Starlink shell-1 at 600 km/53°', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ORB-NUM-PLANES', profileId: 'hobs-multibeam-baseline', defaultValue: 15, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-001', sourceNote: 'Synthetic HOBS Walker proxy uses 15 planes so the simulator realizes the paper-backed 165-LEO total as 15x11', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ORB-NUM-PLANES', profileId: 'hobs-reproduction', defaultValue: 15, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-REPRO-RT2', sourceNote: 'RT-2 synthetic Walker proxy uses 15 planes so the simulator realizes the paper-backed 165-LEO total as 15x11', exposureMode: 'Sensitivity' },
      { parameterId: 'PARAM-ORB-NUM-PLANES', profileId: 'modqn-paper-baseline', defaultValue: 2, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MODQN-ORBIT', sourceNote: '2 planes in the disclosed 4-satellite proxy shell', exposureMode: 'Advanced' },
    ],
  },
  {
    spec: {
      id: 'PARAM-ORB-SATS-PER-PLANE',
      parameterPath: 'orbital.sats_per_plane',
      semanticName: 'Satellites per Orbital Plane',
      unit: null,
      allowedRange: { min: 1, max: 200 },
      isDerived: false,
      vocabularyLayer: 'scenario',
    },
    bindings: [
      { parameterId: 'PARAM-ORB-SATS-PER-PLANE', profileId: '__universal__', defaultValue: 22, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-001', sourceNote: 'Walker sats per plane; value varies per family', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ORB-SATS-PER-PLANE', profileId: 'hobs-multibeam-baseline', defaultValue: 11, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-001', sourceNote: 'Synthetic HOBS Walker proxy uses 11 satellites per plane so the simulator realizes the paper-backed 165-LEO total as 15x11', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ORB-SATS-PER-PLANE', profileId: 'hobs-reproduction', defaultValue: 11, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-REPRO-RT2', sourceNote: 'RT-2 synthetic Walker proxy uses 11 satellites per plane so the simulator realizes the paper-backed 165-LEO total as 15x11', exposureMode: 'Sensitivity' },
      { parameterId: 'PARAM-ORB-SATS-PER-PLANE', profileId: 'modqn-paper-baseline', defaultValue: 2, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MODQN-ORBIT', sourceNote: '2 satellites per plane in the disclosed 4-satellite proxy shell', exposureMode: 'Advanced' },
    ],
  },
  {
    spec: {
      id: 'PARAM-ORB-RAAN-SPREAD-DEG',
      parameterPath: 'orbital.raan_spread_deg',
      semanticName: 'RAAN Spread',
      unit: 'deg',
      presetList: [{ value: 360, label: 'Global Walker (360°)' }],
      isDerived: false,
      vocabularyLayer: 'scenario',
    },
    bindings: [
      { parameterId: 'PARAM-ORB-RAAN-SPREAD-DEG', profileId: '__universal__', defaultValue: 360, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-001', sourceNote: 'Global Walker coverage assumes full 360° RAAN spread', exposureMode: 'Advanced' },
    ],
  },
  {
    spec: {
      id: 'PARAM-ORB-PHASE-OFFSET-DEG',
      parameterPath: 'orbital.phase_offset_deg',
      semanticName: 'Inter-Plane Phase Offset',
      unit: 'deg',
      allowedRange: { min: 0, max: 360 },
      isDerived: false,
      vocabularyLayer: 'scenario',
    },
    bindings: [
      { parameterId: 'PARAM-ORB-PHASE-OFFSET-DEG', profileId: '__universal__', defaultValue: 0, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-001', sourceNote: 'phasing offset between adjacent planes; default 0 (aligned)', exposureMode: 'Advanced' },
    ],
  },
  {
    spec: {
      id: 'PARAM-RF-FREQUENCY-GHZ',
      parameterPath: 'rf.frequency_ghz',
      semanticName: 'Carrier Frequency',
      unit: 'GHz',
      allowedRange: { min: 0.1, max: 100 },
      isDerived: false,
      vocabularyLayer: 'scenario',
    },
    bindings: [
      { parameterId: 'PARAM-RF-FREQUENCY-GHZ', profileId: 'case9-access-baseline', defaultValue: 2.0, sourceTier: 'paper-backed', sourceId: 'PAP-2022-SINR-ELEVATION', sourceNote: 'S-band 2 GHz access-family baseline', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-RF-FREQUENCY-GHZ', profileId: 'hobs-multibeam-baseline', defaultValue: 28, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'Ka-band 28 GHz carrier (Table I)', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-RF-FREQUENCY-GHZ', profileId: 'modqn-paper-baseline', defaultValue: 20, sourceTier: 'paper-backed', sourceId: 'PAP-2024-MORL-MULTIBEAM', sourceNote: '20 GHz carrier frequency', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-RF-FREQUENCY-GHZ', profileId: 'bh-resource-baseline', defaultValue: 20, sourceTier: 'assumption-backed', sourceId: 'ASSUME-RF-001', sourceNote: 'Ka-band 20 GHz representative BH baseline; no single paper locator', exposureMode: 'Advanced' },
    ],
  },
  {
    spec: {
      id: 'PARAM-RF-BANDWIDTH-MHZ',
      parameterPath: 'rf.bandwidth_mhz',
      semanticName: 'Channel Bandwidth',
      unit: 'MHz',
      allowedRange: { min: 1, max: 2000 },
      isDerived: false,
      vocabularyLayer: 'scenario',
    },
    bindings: [
      { parameterId: 'PARAM-RF-BANDWIDTH-MHZ', profileId: 'case9-access-baseline', defaultValue: 20, sourceTier: 'paper-backed', sourceId: 'PAP-2025-TIMERCHO-CORE', sourceNote: '20 MHz access-family baseline within the accepted 20-30 MHz envelope', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-RF-BANDWIDTH-MHZ', profileId: 'hobs-multibeam-baseline', defaultValue: 100, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: '100 MHz (Table I)', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-RF-BANDWIDTH-MHZ', profileId: 'modqn-paper-baseline', defaultValue: 500, sourceTier: 'paper-backed', sourceId: 'PAP-2024-MORL-MULTIBEAM', sourceNote: '500 MHz channel bandwidth', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-RF-BANDWIDTH-MHZ', profileId: 'bh-resource-baseline', defaultValue: 500, sourceTier: 'assumption-backed', sourceId: 'ASSUME-BW-001', sourceNote: '500 MHz representative BH bandwidth; no single paper locator', exposureMode: 'Advanced' },
    ],
  },
  {
    spec: {
      id: 'PARAM-RF-EIRP-DENSITY-DBW-MHZ',
      parameterPath: 'rf.eirp_density_dbw_per_mhz',
      semanticName: 'EIRP Spectral Density',
      unit: 'dBW/MHz',
      allowedRange: { min: -50, max: 50 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-EIRP-DENSITY-DBW-MHZ', profileId: 'case9-access-baseline', defaultValue: 34, sourceTier: 'paper-backed', sourceId: 'PAP-2022-SINR-ELEVATION', sourceNote: '34 dBW/MHz EIRP density', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-RF-EIRP-DENSITY-DBW-MHZ', profileId: 'hobs-multibeam-baseline', defaultValue: 40, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'derived reporting quantity from Pmax=50 dBm, G0=40 dBi, B=100 MHz => 40 dBW/MHz', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-RF-EIRP-DENSITY-DBW-MHZ', profileId: 'hobs-reproduction', defaultValue: 40, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'derived reporting quantity from Pmax=50 dBm, G0=40 dBi, B=100 MHz => 40 dBW/MHz', exposureMode: 'Sensitivity' },
      { parameterId: 'PARAM-RF-EIRP-DENSITY-DBW-MHZ', profileId: 'modqn-paper-baseline', defaultValue: 26, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MODQN-BEAM', sourceNote: 'derived spectral density from the disclosed runtime beam-gain placeholder plus 2 W per-link power', exposureMode: 'Advanced' },
    ],
  },
  {
    spec: {
      id: 'PARAM-RF-TX-POWER-BEAM-DBM',
      parameterPath: 'rf.tx_power_per_beam_dbm',
      semanticName: 'Per-Beam Max TX Power (P1)',
      unit: 'dBm',
      allowedRange: { min: 0, max: 60 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-TX-POWER-BEAM-DBM', profileId: 'hobs-multibeam-baseline', defaultValue: 50, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'beam-level Pmax = 50 dBm from Table I', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-RF-TX-POWER-BEAM-DBM', profileId: 'hobs-reproduction', defaultValue: 50, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'beam-level Pmax = 50 dBm from Table I', exposureMode: 'Sensitivity' },
      { parameterId: 'PARAM-RF-TX-POWER-BEAM-DBM', profileId: 'modqn-paper-baseline', defaultValue: 33.0103, sourceTier: 'paper-backed', sourceId: 'PAP-2024-MORL-MULTIBEAM', sourceNote: '2 W transmit power per beam-user link = 33.01 dBm', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-RF-TX-POWER-BEAM-DBM', profileId: 'realistic-first-screen', defaultValue: 40, sourceTier: 'paper-backed', sourceId: 'PAP-2025-MAAC-BHPOWER', sourceNote: 'P1 = 10 dBW = 40 dBm ([S10])', exposureMode: 'Realistic' },
    ],
  },
  {
    spec: {
      id: 'PARAM-RF-MAX-TX-POWER-DBM',
      parameterPath: 'rf.max_tx_power_dbm',
      semanticName: 'Aggregate Max TX Power (P2)',
      unit: 'dBm',
      allowedRange: { min: 0, max: 70 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-MAX-TX-POWER-DBM', profileId: 'hobs-multibeam-baseline', defaultValue: 50, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'Pmax = 50 dBm retained as the HOBS-family power anchor', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-RF-MAX-TX-POWER-DBM', profileId: 'hobs-reproduction', defaultValue: 50, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'Pmax = 50 dBm retained as the HOBS-family power anchor', exposureMode: 'Sensitivity' },
      { parameterId: 'PARAM-RF-MAX-TX-POWER-DBM', profileId: 'realistic-first-screen', defaultValue: 43, sourceTier: 'paper-backed', sourceId: 'PAP-2025-MAAC-BHPOWER', sourceNote: 'P2 = 13 dBW ≈ 43 dBm ([S10])', exposureMode: 'Realistic' },
    ],
  },
  {
    spec: {
      id: 'PARAM-RF-NOISE-TEMP-K',
      parameterPath: 'rf.noise_temperature_k',
      semanticName: 'Receiver Noise Temperature',
      unit: 'K',
      presetList: [{ value: 290, label: '290 K (IEEE Standard)' }],
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-NOISE-TEMP-K', profileId: '__universal__', defaultValue: 290, sourceTier: 'standard-backed', sourceId: 'STD-IEEE-T0', sourceNote: 'standard reference temperature 290 K', exposureMode: 'Internal-only' },
    ],
  },
  {
    spec: {
      id: 'PARAM-RF-NOISE-FIGURE-DB',
      parameterPath: 'rf.noise_figure_db',
      semanticName: 'UE Noise Figure',
      unit: 'dB',
      allowedRange: { min: 0, max: 20 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-NOISE-FIGURE-DB', profileId: '__universal__', defaultValue: 7, sourceTier: 'standard-backed', sourceId: 'STD-3GPP-38821', sourceNote: '7 dB NR typical UE (TR 38.821)', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-RF-NOISE-FIGURE-DB', profileId: 'hobs-multibeam-baseline', defaultValue: 0, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'runtime representation of paper noise PSD -174 dBm/Hz at T0=290K', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-RF-NOISE-FIGURE-DB', profileId: 'hobs-reproduction', defaultValue: 0, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'runtime representation of paper noise PSD -174 dBm/Hz at T0=290K', exposureMode: 'Sensitivity' },
      { parameterId: 'PARAM-RF-NOISE-FIGURE-DB', profileId: 'modqn-paper-baseline', defaultValue: 0, sourceTier: 'paper-backed', sourceId: 'PAP-2024-MORL-MULTIBEAM', sourceNote: 'paper gives thermal-noise PSD -174 dBm/Hz; runtime represents that as NF = 0 dB at T0', exposureMode: 'Realistic' },
    ],
  },
  {
    spec: {
      id: 'PARAM-RF-IMPL-LOSS-DB',
      parameterPath: 'rf.implementation_loss_db',
      semanticName: 'Implementation Loss',
      unit: 'dB',
      allowedRange: { min: 0, max: 10 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-IMPL-LOSS-DB', profileId: '__universal__', defaultValue: 2.5, sourceTier: 'paper-backed', sourceId: 'PAP-2022-SENSORS-BH', sourceNote: '0.5 dB feeder + 2.0 dB pointing (Table 3)', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-RF-IMPL-LOSS-DB', profileId: 'modqn-paper-baseline', defaultValue: 0, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MODQN-RUNTIME', sourceNote: 'paper does not disclose extra implementation loss; runtime pins 0 dB to avoid mixing foreign baseline constants', exposureMode: 'Advanced' },
    ],
  },
  {
    spec: {
      id: 'PARAM-RF-UE-ANT-GAIN-DBI',
      parameterPath: 'rf.ue_antenna_gain_dbi',
      semanticName: 'UE Receive Antenna Gain (G^R)',
      unit: 'dBi',
      allowedRange: { min: -20, max: 30 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-UE-ANT-GAIN-DBI', profileId: 'hobs-multibeam-baseline', defaultValue: 0, sourceTier: 'standard-backed', sourceId: 'STD-3GPP-38811-TABLE-4.4-1', sourceNote: 'runtime HOBS receive-side gain term G^R uses 0 dBi omnidirectional UE gain from TR 38.811 Table 4.4-1', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-RF-UE-ANT-GAIN-DBI', profileId: 'hobs-reproduction', defaultValue: 0, sourceTier: 'standard-backed', sourceId: 'STD-3GPP-38811-TABLE-4.4-1', sourceNote: 'runtime HOBS receive-side gain term G^R uses 0 dBi omnidirectional UE gain from TR 38.811 Table 4.4-1', exposureMode: 'Sensitivity' },
    ],
  },
  {
    spec: {
      id: 'PARAM-ANT-PEAK-GAIN-DBI',
      parameterPath: 'antenna.peak_gain_dbi',
      semanticName: 'Peak Antenna Gain',
      unit: 'dBi',
      allowedRange: { min: 0, max: 60 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-ANT-PEAK-GAIN-DBI', profileId: 'case9-access-baseline', defaultValue: 30, sourceTier: 'assumption-backed', sourceId: 'ASSUME-BEAM-001', sourceNote: '30 dBi peak gain RPsat S-band; representative value', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ANT-PEAK-GAIN-DBI', profileId: 'hobs-multibeam-baseline', defaultValue: 40, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'maximum antenna gain G0 = 40 dBi (Table I)', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ANT-PEAK-GAIN-DBI', profileId: 'hobs-reproduction', defaultValue: 40, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'maximum antenna gain G0 = 40 dBi (Table I)', exposureMode: 'Sensitivity' },
      { parameterId: 'PARAM-ANT-PEAK-GAIN-DBI', profileId: 'modqn-paper-baseline', defaultValue: 60, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MODQN-BEAM', sourceNote: 'runtime Ka-band beam-gain placeholder for the paper baseline; paper does not specify antenna gain', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ANT-PEAK-GAIN-DBI', profileId: 'bh-resource-baseline', defaultValue: 35, sourceTier: 'assumption-backed', sourceId: 'ASSUME-BEAM-002', sourceNote: '35 dBi representative Ka/Ku-band BH', exposureMode: 'Advanced' },
    ],
  },
  {
    spec: {
      id: 'PARAM-ANT-BEAM-DIAM-KM',
      parameterPath: 'antenna.beam_diameter_km',
      semanticName: 'Beam Ground Diameter',
      unit: 'km',
      allowedRange: { min: 5, max: 2000 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-ANT-BEAM-DIAM-KM', profileId: 'realistic-first-screen', defaultValue: 50, sourceTier: 'paper-backed', sourceId: 'PAP-2022-SENSORS-BH', sourceNote: 'θ_3dB=arctan(25/600)=2.386° → 50 km diameter', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-ANT-BEAM-DIAM-KM', profileId: 'hobs-multibeam-baseline', defaultValue: 63.87163746358206, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'derived from θ3dB=0.058 rad at h=550 km => D=2h·tan(θ3dB)=63.87 km', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ANT-BEAM-DIAM-KM', profileId: 'hobs-reproduction', defaultValue: 63.87163746358206, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'derived from θ3dB=0.058 rad at h=550 km => D=2h·tan(θ3dB)=63.87 km', exposureMode: 'Sensitivity' },
      { parameterId: 'PARAM-ANT-BEAM-DIAM-KM', profileId: 'modqn-paper-baseline', defaultValue: 90, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MODQN-BEAM', sourceNote: 'runtime 7-beam hexagonal proxy footprint for the paper baseline', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ANT-BEAM-DIAM-KM', profileId: 'bh-resource-baseline', defaultValue: 30, sourceTier: 'assumption-backed', sourceId: 'ASSUME-BEAM-002', sourceNote: '30 km representative Ka/Ku-band BH', exposureMode: 'Advanced' },
    ],
  },
];
