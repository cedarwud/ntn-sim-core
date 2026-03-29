/**
 * Parameter Registry — Phase 1 output.
 *
 * Canonical machine-readable registry for all KPI-impacting parameters.
 * Every P-classified field from phase0-architecture-spec.md §0B.6 has at
 * least one entry here.
 *
 * Governance:
 *   - SDD: sdd/phase1-parameter-registry-sdd.md
 *   - Schema authority: sdd/phase1-parameter-registry-sdd.md §3 (operative); phase0 §0B.4 is historical draft only
 *   - Source IDs must resolve in src/core/config/paper-sources.json
 *   - Validated by: scripts/validate-parameter-registry.mjs (VAL-PLAT-001/002/003)
 *
 * Layer boundary (phase0 §0B.3):
 *   - This file may only import from src/core/common/types.ts (shared primitives).
 *   - Must NOT import from profiles/, engine.ts, runner/, viz/, app/, or L2–L7.
 *
 * Transitional note:
 *   - defaults.ts sourceMap[] remains the runtime authority in Phase 1.
 *   - This registry is the canonical metadata reference layer.
 *   - sourceMap[] will be removed in Phase 5 P5-7 after contract freeze.
 */

import type { SourceTier, SpecMode } from '@/core/common/types';

// ---------------------------------------------------------------------------
// Schema (operative for implementation — authority: phase1-parameter-registry-sdd.md §3)
// ---------------------------------------------------------------------------

/** Profile-agnostic registry record for one KPI-impacting parameter. */
export interface GlobalParameterSpec {
  /** PARAM-* prefix required. Distinct from source-registry namespaces (PAP-*, STD-*, ASSUME-*). */
  id: string;
  /** Dotted path in ProfileConfig (e.g. "rf.frequency_ghz"). */
  parameterPath: string;
  /** Human-readable name. */
  semanticName: string;
  /** SI unit, or null for dimensionless. */
  unit: string | null;
  /** Continuous range (mutually exclusive with presetList). */
  allowedRange?: { min: number; max: number };
  /** Discrete preset list (mutually exclusive with allowedRange). */
  presetList?: Array<{ value: string | number; label: string }>;
  /** True when computed from other parameters; must not be an independent UI control. */
  isDerived: boolean;
  /** Plain-English conditional dependency rule (optional). */
  dependencyRule?: string;
  /** Vocabulary layer classification (phase0 §0B.1). */
  vocabularyLayer: 'scenario' | 'model-bundle' | 'experiment';
}

/** Per-(parameter × profile) provenance and default value. */
export interface ProfileParameterBinding {
  /** References GlobalParameterSpec.id */
  parameterId: string;
  /** ProfileConfig.id, or "__universal__" when value is profile-agnostic. */
  profileId: string;
  /** Default value in this profile. */
  defaultValue: number | string | boolean | null;
  /** Source tier (SourceTier from core/common/types.ts). */
  sourceTier: SourceTier;
  /** Source-registry ID (PAP-*, STD-*, ASSUME-*, or other entries) from paper-sources.json. */
  sourceId: string;
  /** Optional locator within the source (e.g. "Table III"). */
  sourceNote?: string;
  /** UI/exposure tier for this (parameter, profile) pair. */
  exposureMode: SpecMode;
}

/** Convenience wrapper bundling spec + per-profile bindings. */
export interface ParameterEntry {
  spec: GlobalParameterSpec;
  bindings: ProfileParameterBinding[];
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const PARAMETER_REGISTRY: ParameterEntry[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // ORBITAL (6 parameters)
  // ══════════════════════════════════════════════════════════════════════════

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
      { parameterId: 'PARAM-ORB-ALTITUDE-KM', profileId: 'case9-access-baseline',     defaultValue: 600,   sourceTier: 'paper-backed',       sourceId: 'PAP-2022-A4EVENT-CORE',   sourceNote: 'orbit altitude 600 km',       exposureMode: 'Realistic' },
      { parameterId: 'PARAM-ORB-ALTITUDE-KM', profileId: 'hobs-multibeam-baseline',   defaultValue: 550,   sourceTier: 'paper-backed',       sourceId: 'PAP-2024-HOBS',           sourceNote: '550 km orbit altitude',       exposureMode: 'Realistic' },
      { parameterId: 'PARAM-ORB-ALTITUDE-KM', profileId: 'bh-resource-baseline',      defaultValue: 780,   sourceTier: 'paper-backed',       sourceId: 'PAP-2026-BHFREQREUSE',    sourceNote: '780 km, 66-sat constellation', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-ORB-ALTITUDE-KM', profileId: 'real-trace-validation',     defaultValue: 550,   sourceTier: 'assumption-backed',  sourceId: 'ASSUME-ORB-003',          sourceNote: 'Starlink shell-1 nominal 550 km; actual propagation uses TLE', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ORB-ALTITUDE-KM', profileId: 'meo-constellation-baseline',defaultValue: 8062,  sourceTier: 'assumption-backed',  sourceId: 'ASSUME-MEO-BASELINE',     sourceNote: 'O3b-like MEO ~8062 km',       exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ORB-ALTITUDE-KM', profileId: 'geo-relay-baseline',        defaultValue: 35786, sourceTier: 'assumption-backed',  sourceId: 'ASSUME-GEO-BASELINE',     sourceNote: 'GEO 35786 km geostationary', exposureMode: 'Advanced' },
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
      { parameterId: 'PARAM-ORB-NUM-PLANES', profileId: 'case9-access-baseline',   defaultValue: 24, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-001', sourceNote: 'Walker 24×22=528 Starlink-like at 600 km/53°',   exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ORB-NUM-PLANES', profileId: 'hobs-multibeam-baseline', defaultValue: 24, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-002', sourceNote: 'Walker 24×22=528 sats; HOBS paper constellation scale', exposureMode: 'Advanced' },
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
      semanticName: 'Walker Phase Offset',
      unit: 'deg',
      allowedRange: { min: 0, max: 359 },
      isDerived: false,
      vocabularyLayer: 'scenario',
    },
    bindings: [
      { parameterId: 'PARAM-ORB-PHASE-OFFSET-DEG', profileId: '__universal__', defaultValue: 0, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ORB-001', sourceNote: 'Walker F parameter (phasing offset); F=0 for most profiles', exposureMode: 'Advanced' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RF (8 parameters)
  // ══════════════════════════════════════════════════════════════════════════

  {
    spec: {
      id: 'PARAM-RF-FREQ-GHZ',
      parameterPath: 'rf.frequency_ghz',
      semanticName: 'Carrier Frequency',
      unit: 'GHz',
      allowedRange: { min: 0.4, max: 50 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-FREQ-GHZ', profileId: 'case9-access-baseline',     defaultValue: 2.0,  sourceTier: 'paper-backed',      sourceId: 'PAP-2022-SINR-ELEVATION',  sourceNote: 'S-band 2 GHz carrier',             exposureMode: 'Realistic' },
      { parameterId: 'PARAM-RF-FREQ-GHZ', profileId: 'hobs-multibeam-baseline',   defaultValue: 28.0, sourceTier: 'paper-backed',      sourceId: 'PAP-2024-HOBS',            sourceNote: 'Ka-band 28 GHz',                   exposureMode: 'Realistic' },
      { parameterId: 'PARAM-RF-FREQ-GHZ', profileId: 'bh-resource-baseline',      defaultValue: 20.0, sourceTier: 'assumption-backed', sourceId: 'ASSUME-RF-001',            sourceNote: 'Ka-band 20 GHz representative for BH resource studies', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-RF-FREQ-GHZ', profileId: 'realistic-first-screen',    defaultValue: 20.0, sourceTier: 'paper-backed',      sourceId: 'PAP-2026-DRL-BHOPT',       sourceNote: 'Ka-band 20 GHz (PAP-2026-DRL-BHOPT; NOTE: PAP-2024-HOBS is 28 GHz)', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-RF-BW-MHZ',
      parameterPath: 'rf.bandwidth_mhz',
      semanticName: 'Channel Bandwidth',
      unit: 'MHz',
      allowedRange: { min: 1, max: 2000 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-BW-MHZ', profileId: 'case9-access-baseline',   defaultValue: 20,  sourceTier: 'paper-backed',      sourceId: 'PAP-2022-SINR-ELEVATION', sourceNote: 'S-band 20 MHz',                   exposureMode: 'Realistic' },
      { parameterId: 'PARAM-RF-BW-MHZ', profileId: 'hobs-multibeam-baseline', defaultValue: 100, sourceTier: 'paper-backed',      sourceId: 'PAP-2024-HOBS',           sourceNote: '100 MHz bandwidth (Table I)',      exposureMode: 'Realistic' },
      { parameterId: 'PARAM-RF-BW-MHZ', profileId: 'bh-resource-baseline',    defaultValue: 500, sourceTier: 'assumption-backed', sourceId: 'ASSUME-BW-001',           sourceNote: '500 MHz representative BH value', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-RF-EIRP-DENSITY-DBW-MHZ',
      parameterPath: 'rf.eirp_density_dbw_per_mhz',
      semanticName: 'EIRP Spectral Density (derived)',
      unit: 'dBW/MHz',
      allowedRange: { min: -10, max: 60 },
      isDerived: true,
      dependencyRule: 'derived from rf.tx_power_per_beam_dbm + antenna.peak_gain_dbi - rf.implementation_loss_db; retained for paper-reproduction backwards compatibility only',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-EIRP-DENSITY-DBW-MHZ', profileId: 'case9-access-baseline', defaultValue: 34, sourceTier: 'paper-backed', sourceId: 'PAP-2022-SINR-ELEVATION', sourceNote: 'EIRP 34 dBW/MHz (paper-reproduction compat input)', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-RF-TX-POWER-DBM',
      parameterPath: 'rf.tx_power_per_beam_dbm',
      semanticName: 'Per-Beam TX Power (P1)',
      unit: 'dBm',
      allowedRange: { min: 10, max: 60 },
      isDerived: false,
      dependencyRule: 'when set, engine uses P1 signal path instead of eirp_density_dbw_per_mhz',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-TX-POWER-DBM', profileId: 'realistic-first-screen', defaultValue: 40, sourceTier: 'paper-backed', sourceId: 'PAP-2025-MAAC-BHPOWER', sourceNote: 'P1=40 dBm=10 W per beam (spec P1, [S10])', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-RF-MAX-TX-POWER-DBM',
      parameterPath: 'rf.max_tx_power_dbm',
      semanticName: 'Aggregate Max TX Power (P2)',
      unit: 'dBm',
      allowedRange: { min: 10, max: 70 },
      isDerived: false,
      dependencyRule: 'null disables aggregate power budget; used by power-aware BH scheduler',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-MAX-TX-POWER-DBM', profileId: 'hobs-multibeam-baseline', defaultValue: 50, sourceTier: 'paper-backed',  sourceId: 'PAP-2024-HOBS',       sourceNote: 'Pmax=50 dBm (100 W) Table I — HOBS reproduction only; not general baseline', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-RF-MAX-TX-POWER-DBM', profileId: 'bh-resource-baseline',    defaultValue: 43, sourceTier: 'paper-backed',  sourceId: 'PAP-2025-MAAC-BHPOWER', sourceNote: '13 dBW aggregate satellite TX budget (43 dBm) [S10]', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-RF-NOISE-TEMP-K',
      parameterPath: 'rf.noise_temperature_k',
      semanticName: 'Antenna Noise Temperature',
      unit: 'K',
      presetList: [{ value: 290, label: '290 K (standard T_0)' }],
      isDerived: false,
      dependencyRule: 'Internal-only fixed constant; must not be exposed as UI slider (spec R7)',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-NOISE-TEMP-K', profileId: '__universal__', defaultValue: 290, sourceTier: 'assumption-backed', sourceId: 'ASSUME-CUR-002', sourceNote: 'T_ant=290 K (clear-sky conservative); spec R7 Internal-only fixed constant', exposureMode: 'Internal-only' },
    ],
  },

  {
    spec: {
      id: 'PARAM-RF-NOISE-FIGURE-DB',
      parameterPath: 'rf.noise_figure_db',
      semanticName: 'UE Receiver Noise Figure',
      unit: 'dB',
      allowedRange: { min: 0, max: 20 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-NOISE-FIGURE-DB', profileId: 'case9-access-baseline',   defaultValue: 9, sourceTier: 'standard-backed', sourceId: 'STD-3GPP-38811-TABLE-4.4-1', sourceNote: 'NF=9 dB handheld UE S-band (Table 4.4-1)', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-RF-NOISE-FIGURE-DB', profileId: 'hobs-multibeam-baseline', defaultValue: 5, sourceTier: 'standard-backed', sourceId: 'STD-3GPP-38811-TABLE-4.4-1', sourceNote: 'NF=5 dB VSAT/laptop Ka-band (Table 4.4-1)', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-RF-IMPL-LOSS-DB',
      parameterPath: 'rf.implementation_loss_db',
      semanticName: 'Implementation Loss (Feeder + Pointing)',
      unit: 'dB',
      allowedRange: { min: 0, max: 10 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-RF-IMPL-LOSS-DB', profileId: '__universal__', defaultValue: 2.5, sourceTier: 'paper-backed', sourceId: 'PAP-2022-SENSORS-BH', sourceNote: '2.5 dB = 0.5 dB feeder + 2.0 dB pointing (Table 3)', exposureMode: 'Realistic' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ANTENNA (2 parameters)
  // ══════════════════════════════════════════════════════════════════════════

  {
    spec: {
      id: 'PARAM-ANT-PEAK-GAIN-DBI',
      parameterPath: 'antenna.peak_gain_dbi',
      semanticName: 'Peak Antenna Gain',
      unit: 'dBi',
      allowedRange: { min: 10, max: 55 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-ANT-PEAK-GAIN-DBI', profileId: 'case9-access-baseline',   defaultValue: 30, sourceTier: 'assumption-backed', sourceId: 'ASSUME-BEAM-001', sourceNote: '30 dBi peak gain RPsat S-band; representative value', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ANT-PEAK-GAIN-DBI', profileId: 'hobs-multibeam-baseline', defaultValue: 38, sourceTier: 'assumption-backed', sourceId: 'ASSUME-BEAM-001', sourceNote: '38 dBi representative Ka-band multi-beam',             exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ANT-PEAK-GAIN-DBI', profileId: 'bh-resource-baseline',    defaultValue: 35, sourceTier: 'assumption-backed', sourceId: 'ASSUME-BEAM-002', sourceNote: '35 dBi representative Ka/Ku-band BH',              exposureMode: 'Advanced' },
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
      { parameterId: 'PARAM-ANT-BEAM-DIAM-KM', profileId: 'realistic-first-screen',  defaultValue: 50, sourceTier: 'paper-backed',      sourceId: 'PAP-2022-SENSORS-BH', sourceNote: 'θ_3dB=arctan(25/600)=2.386° → 50 km diameter', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-ANT-BEAM-DIAM-KM', profileId: 'hobs-multibeam-baseline', defaultValue: 25, sourceTier: 'assumption-backed',  sourceId: 'ASSUME-BEAM-001',     sourceNote: '25 km beam diameter representative Ka-band',   exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ANT-BEAM-DIAM-KM', profileId: 'bh-resource-baseline',    defaultValue: 30, sourceTier: 'assumption-backed',  sourceId: 'ASSUME-BEAM-002',     sourceNote: '30 km representative Ka/Ku-band BH',           exposureMode: 'Advanced' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BEAM (8 parameters)
  // ══════════════════════════════════════════════════════════════════════════

  {
    spec: {
      id: 'PARAM-BEAM-NUM-BEAMS',
      parameterPath: 'beam.num_beams',
      semanticName: 'Number of Beams per Satellite',
      unit: null,
      allowedRange: { min: 1, max: 200 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-BEAM-NUM-BEAMS', profileId: 'case9-access-baseline',   defaultValue: 19, sourceTier: 'paper-backed', sourceId: 'PAP-2025-TIMERCHO-CORE', sourceNote: '19 beams earth-moving 600 km',  exposureMode: 'Realistic' },
      { parameterId: 'PARAM-BEAM-NUM-BEAMS', profileId: 'hobs-multibeam-baseline', defaultValue: 19, sourceTier: 'paper-backed', sourceId: 'PAP-2025-TIMERCHO-CORE', sourceNote: '19 beams (HOBS profile)',       exposureMode: 'Realistic' },
      { parameterId: 'PARAM-BEAM-NUM-BEAMS', profileId: 'bh-resource-baseline',    defaultValue: 12, sourceTier: 'paper-backed', sourceId: 'PAP-2026-BHFREQREUSE',  sourceNote: '12 beams BH+FRF co-scheduling', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-BEAM-FRF',
      parameterPath: 'beam.frf',
      semanticName: 'Frequency Reuse Factor',
      unit: null,
      presetList: [{ value: 1, label: 'FRF-1 (full reuse)' }, { value: 3, label: 'FRF-3' }, { value: 4, label: 'FRF-4' }, { value: 7, label: 'FRF-7' }],
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-BEAM-FRF', profileId: 'case9-access-baseline',   defaultValue: 1, sourceTier: 'standard-backed',  sourceId: '3GPP-NTN-ACCESS',      sourceNote: 'FRF-1 baseline access profile',              exposureMode: 'Realistic' },
      { parameterId: 'PARAM-BEAM-FRF', profileId: 'hobs-multibeam-baseline', defaultValue: 3, sourceTier: 'paper-backed',      sourceId: 'PAP-2024-HOBS',        sourceNote: 'FRF=3 (Table I)',                            exposureMode: 'Realistic' },
      { parameterId: 'PARAM-BEAM-FRF', profileId: 'bh-resource-baseline',    defaultValue: 3, sourceTier: 'paper-backed',      sourceId: 'PAP-2026-BHFREQREUSE', sourceNote: 'FRF=3 BH+FRF co-scheduling',                 exposureMode: 'Realistic' },
      { parameterId: 'PARAM-BEAM-FRF', profileId: 'realistic-first-screen',  defaultValue: 3, sourceTier: 'paper-backed',      sourceId: 'PAP-2025-JCAP-LEO',    sourceNote: 'FR3 frequency reuse (PAP-2025-JCAP-LEO)',    exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-BEAM-INTERFERENCE-BEAMS',
      parameterPath: 'beam.interference_beams',
      semanticName: 'Interference Beam Count',
      unit: null,
      allowedRange: { min: 0, max: 200 },
      isDerived: false,
      dependencyRule: 'only relevant when FRF=1 (full frequency reuse); BH profiles typically set to 0',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-BEAM-INTERFERENCE-BEAMS', profileId: 'case9-access-baseline', defaultValue: 42, sourceTier: 'assumption-backed', sourceId: 'ASSUME-BEAM-002', sourceNote: '42 co-freq beams for FRF-1 access scenario', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-BEAM-INTERFERENCE-BEAMS', profileId: 'bh-resource-baseline',  defaultValue: 0,  sourceTier: 'assumption-backed', sourceId: 'ASSUME-BEAM-002', sourceNote: '0 interference beams for BH/FRF profiles',  exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-BEAM-BH-MAX-ACTIVE',
      parameterPath: 'beam.bh_max_active_per_slot',
      semanticName: 'BH Max Active Beams per Slot',
      unit: null,
      allowedRange: { min: 1, max: 100 },
      isDerived: false,
      dependencyRule: 'only active when beamSemantics = earth-fixed-bh',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-BEAM-BH-MAX-ACTIVE', profileId: 'bh-resource-baseline', defaultValue: 4, sourceTier: 'assumption-backed', sourceId: 'ASSUME-BH-001', sourceNote: 'engineering choice: 4 active of 12 beams per slot', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-BEAM-BH-FRAME-DUR-SEC',
      parameterPath: 'beam.bh_frame_duration_sec',
      semanticName: 'BH Frame Duration',
      unit: 's',
      allowedRange: { min: 0.1, max: 60 },
      isDerived: false,
      dependencyRule: 'only active when beamSemantics = earth-fixed-bh',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-BEAM-BH-FRAME-DUR-SEC', profileId: 'bh-resource-baseline', defaultValue: 5, sourceTier: 'assumption-backed', sourceId: 'ASSUME-BH-001', sourceNote: '5 s frame = 1 s/slot, visible hopping at stepSec=1', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-BEAM-BH-SLOTS-PER-FRAME',
      parameterPath: 'beam.bh_slots_per_frame',
      semanticName: 'BH Slots per Frame',
      unit: null,
      allowedRange: { min: 1, max: 100 },
      isDerived: true,
      dependencyRule: 'derived as ceil(num_beams / bh_max_active_per_slot); may be overridden explicitly',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-BEAM-BH-SLOTS-PER-FRAME', profileId: 'bh-resource-baseline', defaultValue: 3, sourceTier: 'assumption-backed', sourceId: 'ASSUME-BH-001', sourceNote: 'ceil(12/4)=3 slots', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-BEAM-BH-POWER-BUDGET-W',
      parameterPath: 'beam.bh_power_budget_w',
      semanticName: 'BH Power Budget per Satellite',
      unit: 'W',
      allowedRange: { min: 1, max: 10000 },
      isDerived: false,
      dependencyRule: 'only used when bh_strategy = power-aware',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-BEAM-BH-POWER-BUDGET-W', profileId: '__universal__', defaultValue: null, sourceTier: 'paper-backed', sourceId: 'PAP-2025-MAAC-BHPOWER', sourceNote: 'power budget for power-aware BH; value from [S10] when used', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-BEAM-BH-TRAFFIC-ARRIVAL-RATE',
      parameterPath: 'beam.bh_traffic_arrival_rate',
      semanticName: 'BH Traffic Arrival Rate (Poisson λ)',
      unit: 'arrivals/beam/s',
      allowedRange: { min: 0.1, max: 1000 },
      isDerived: false,
      dependencyRule: 'only active when bh_traffic_model = poisson',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-BEAM-BH-TRAFFIC-ARRIVAL-RATE', profileId: 'bh-pf-baseline', defaultValue: 15, sourceTier: 'assumption-backed', sourceId: 'ASSUME-TRAFFIC-001', sourceNote: 'hotspot scenario arrival rate; engineering placeholder', exposureMode: 'Advanced' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CHANNEL (3 parameters)
  // ══════════════════════════════════════════════════════════════════════════

  {
    spec: {
      id: 'PARAM-CHAN-DEPLOY-ENV',
      parameterPath: 'channel.deployment_environment',
      semanticName: 'Deployment Environment (SF/CL lookup)',
      unit: null,
      presetList: [
        { value: 'rural',       label: 'Rural' },
        { value: 'suburban',    label: 'Suburban' },
        { value: 'dense-urban', label: 'Dense Urban' },
      ],
      isDerived: false,
      vocabularyLayer: 'scenario',
    },
    bindings: [
      { parameterId: 'PARAM-CHAN-DEPLOY-ENV', profileId: '__universal__', defaultValue: 'suburban', sourceTier: 'standard-backed', sourceId: '3GPP-NTN-ACCESS', sourceNote: 'suburban SF/CL lookup (TR 38.811 §6.6)', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-CHAN-LOS-ELEV-DEG',
      parameterPath: 'channel.los_elevation_deg',
      semanticName: 'LOS Elevation Threshold',
      unit: 'deg',
      presetList: [{ value: 20, label: '20° (3GPP TR 38.811 §6.7 simplified)' }],
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-CHAN-LOS-ELEV-DEG', profileId: 'realistic-first-screen', defaultValue: 20, sourceTier: 'standard-backed', sourceId: 'STD-3GPP-38811-LOS-20DEG', sourceNote: '20° simplified approximation of TR 38.811 §6.7 P_LOS(α)', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-CHAN-SCS-KHZ',
      parameterPath: 'channel.subcarrier_spacing_khz',
      semanticName: 'OFDM Subcarrier Spacing (Tier 6 Doppler)',
      unit: 'kHz',
      presetList: [{ value: 15, label: '15 kHz' }, { value: 30, label: '30 kHz' }, { value: 60, label: '60 kHz' }, { value: 120, label: '120 kHz' }],
      isDerived: false,
      dependencyRule: 'only active when channel.tier6_doppler = true',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-CHAN-SCS-KHZ', profileId: '__universal__', defaultValue: 30, sourceTier: 'standard-backed', sourceId: 'STD-3GPP-38821', sourceNote: 'NR SCS 30 kHz default for NTN deployments (TR 38.821)', exposureMode: 'Advanced' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HANDOVER (21 parameters)
  // ══════════════════════════════════════════════════════════════════════════

  {
    spec: {
      id: 'PARAM-HO-TRIGGER-THRESHOLD-DB',
      parameterPath: 'handover.trigger_threshold_db',
      semanticName: 'HO Trigger Threshold / Attach Floor',
      unit: 'dB',
      allowedRange: { min: -30, max: 10 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-TRIGGER-THRESHOLD-DB', profileId: 'case9-access-baseline',  defaultValue: -6, sourceTier: 'assumption-backed', sourceId: 'ASSUME-HO-THRESHOLD-SINR',  sourceNote: '−6 dB SINR-relative simplification vs H3 absolute; Advanced', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-HO-TRIGGER-THRESHOLD-DB', profileId: 'realistic-first-screen', defaultValue: -8, sourceTier: 'standard-backed',  sourceId: 'STD-3GPP-38133',           sourceNote: 'attach floor = Q_out = −8 dB (TS 38.133 §7.6)',               exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-A3-OFFSET-DB',
      parameterPath: 'handover.a3_offset_db',
      semanticName: 'A3 Event Offset',
      unit: 'dB',
      allowedRange: { min: -10, max: 10 },
      isDerived: false,
      dependencyRule: 'only active when handover.type = a3-event',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-A3-OFFSET-DB', profileId: 'realistic-first-screen', defaultValue: 2, sourceTier: 'paper-backed', sourceId: 'PAP-2022-A4EVENT-CORE', sourceNote: 'A3 offset=2 dB (Table I, TS 38.331 §5.5.4.4)', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-TTT-MS',
      parameterPath: 'handover.ttt_ms',
      semanticName: 'Time-to-Trigger',
      unit: 'ms',
      allowedRange: { min: 0, max: 5120 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-TTT-MS', profileId: 'case9-access-baseline',   defaultValue: 640, sourceTier: 'assumption-backed', sourceId: 'ASSUME-HO-TTT-NTN',    sourceNote: 'TTT=640 ms NTN-extended assumption; H2 paper-backed presets: 0/40/256 ms', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-HO-TTT-MS', profileId: 'realistic-first-screen',  defaultValue: 40,  sourceTier: 'paper-backed',      sourceId: 'PAP-2022-A4EVENT-CORE', sourceNote: 'TTT=40 ms (Table I)',                                                    exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-HYSTERESIS-DB',
      parameterPath: 'handover.hysteresis_db',
      semanticName: 'HO Hysteresis',
      unit: 'dB',
      allowedRange: { min: 0, max: 10 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-HYSTERESIS-DB', profileId: 'case9-access-baseline',  defaultValue: 1, sourceTier: 'paper-backed', sourceId: 'PAP-2022-A4EVENT-CORE', sourceNote: 'hysteresis 1 dB', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-HO-HYSTERESIS-DB', profileId: 'realistic-first-screen', defaultValue: 2, sourceTier: 'paper-backed', sourceId: 'PAP-2022-A4EVENT-CORE', sourceNote: 'hysteresis 2 dB (Table I)', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-MIN-ELEV-DEG',
      parameterPath: 'handover.min_elevation_deg',
      semanticName: 'Minimum Serving Elevation Angle',
      unit: 'deg',
      allowedRange: { min: 0, max: 90 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-MIN-ELEV-DEG', profileId: '__universal__', defaultValue: 10, sourceTier: 'paper-backed', sourceId: 'PAP-2022-SINR-ELEVATION', sourceNote: 'min elevation 10° (§IV)', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-PINGPONG-WINDOW-SEC',
      parameterPath: 'handover.pingPongWindowSec',
      semanticName: 'Ping-Pong Suppression Window',
      unit: 's',
      allowedRange: { min: 1, max: 600 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-PINGPONG-WINDOW-SEC', profileId: '__universal__', defaultValue: 30, sourceTier: 'assumption-backed', sourceId: 'ASSUME-HO-002', sourceNote: '30 s suppression window; engineering choice', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-CHO-OFFSET-DB',
      parameterPath: 'handover.cho_offset_db',
      semanticName: 'CHO Trigger Offset',
      unit: 'dB',
      allowedRange: { min: -10, max: 10 },
      isDerived: false,
      dependencyRule: 'only active when handover.type in [cho, timer-cho]',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-CHO-OFFSET-DB', profileId: 'timer-cho-reproduction', defaultValue: 0, sourceTier: 'paper-backed', sourceId: 'PAP-2025-TIMERCHO-CORE', sourceNote: 'CHO offset=0 dB (Table I)', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-CHO-ALPHA',
      parameterPath: 'handover.cho_alpha',
      semanticName: 'Timer-CHO α Factor',
      unit: null,
      allowedRange: { min: 0, max: 1 },
      isDerived: false,
      dependencyRule: 'only active when handover.type = timer-cho',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-CHO-ALPHA', profileId: 'timer-cho-reproduction', defaultValue: 0.85, sourceTier: 'paper-backed', sourceId: 'PAP-2025-TIMERCHO-CORE', sourceNote: 'α=0.85 (Table I)', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-CHO-FILTER-K',
      parameterPath: 'handover.cho_filter_k',
      semanticName: 'CHO L3 IIR Filter Coefficient k',
      unit: null,
      allowedRange: { min: 1, max: 19 },
      isDerived: false,
      dependencyRule: 'only active when handover.type = timer-cho',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-CHO-FILTER-K', profileId: 'timer-cho-reproduction', defaultValue: 4, sourceTier: 'paper-backed', sourceId: 'PAP-2025-TIMERCHO-CORE', sourceNote: 'L3 filter k=4 (Table I)', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-DAPS-PREP-SEC',
      parameterPath: 'handover.daps_preparation_time_sec',
      semanticName: 'DAPS Preparation Time',
      unit: 's',
      allowedRange: { min: 0, max: 60 },
      isDerived: false,
      dependencyRule: 'only active when handover.type = daps',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-DAPS-PREP-SEC', profileId: '__universal__', defaultValue: 2, sourceTier: 'paper-backed', sourceId: 'PAP-2025-DAPS-CORE', sourceNote: 'DAPS preparation time (path switch timing)', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-DAPS-MAX-DUAL-SEC',
      parameterPath: 'handover.daps_max_dual_active_sec',
      semanticName: 'DAPS Maximum Dual-Active Duration',
      unit: 's',
      allowedRange: { min: 1, max: 300 },
      isDerived: false,
      dependencyRule: 'only active when handover.type = daps',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-DAPS-MAX-DUAL-SEC', profileId: '__universal__', defaultValue: 30, sourceTier: 'paper-backed', sourceId: 'PAP-2025-DAPS-CORE', sourceNote: 'max dual-active phase duration', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-MC-MAX-DUAL-SEC',
      parameterPath: 'handover.mc_max_dual_sec',
      semanticName: 'MC-HO Maximum Dual-Connectivity Duration',
      unit: 's',
      allowedRange: { min: 1, max: 300 },
      isDerived: false,
      dependencyRule: 'only active when handover.type = mc-ho',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-MC-MAX-DUAL-SEC', profileId: '__universal__', defaultValue: 30, sourceTier: 'paper-backed', sourceId: 'PAP-2024-MCCHO-CORE', sourceNote: 'MC-HO dual-active phase bound', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-MC-PACKET-DUP',
      parameterPath: 'handover.mc_packet_duplication',
      semanticName: 'MC-HO Packet Duplication Flag',
      unit: null,
      presetList: [{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }],
      isDerived: false,
      dependencyRule: 'only active when handover.type = mc-ho',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-MC-PACKET-DUP', profileId: '__universal__', defaultValue: false, sourceTier: 'paper-backed', sourceId: 'PAP-2024-MCCHO-CORE', sourceNote: 'packet duplication optional in MC-CHO', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-D2-SERVING-DIST-KM',
      parameterPath: 'handover.d2_serving_dist_km',
      semanticName: 'D2 Serving Distance Threshold',
      unit: 'km',
      allowedRange: { min: 10, max: 5000 },
      isDerived: false,
      dependencyRule: 'only active when handover.type = d2-distance',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-D2-SERVING-DIST-KM', profileId: '__universal__', defaultValue: 800, sourceTier: 'assumption-backed', sourceId: 'ASSUME-HO-002', sourceNote: 'D2 serving distance threshold; engineering choice', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-D2-TARGET-DIST-KM',
      parameterPath: 'handover.d2_target_dist_km',
      semanticName: 'D2 Target Distance Threshold',
      unit: 'km',
      allowedRange: { min: 10, max: 5000 },
      isDerived: false,
      dependencyRule: 'only active when handover.type = d2-distance',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-D2-TARGET-DIST-KM', profileId: '__universal__', defaultValue: 600, sourceTier: 'assumption-backed', sourceId: 'ASSUME-HO-002', sourceNote: 'D2 target distance threshold; engineering choice', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-SINR-EMA-ALPHA',
      parameterPath: 'handover.sinr_ema_alpha',
      semanticName: 'SINR EMA Filter Coefficient',
      unit: null,
      allowedRange: { min: 0.01, max: 1 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-SINR-EMA-ALPHA', profileId: '__universal__', defaultValue: 0.1, sourceTier: 'assumption-backed', sourceId: 'ASSUME-HO-002', sourceNote: 'SINR IIR smoothing coefficient; engineering choice', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-RLF-QOUT-DB',
      parameterPath: 'handover.rlf_qout_db',
      semanticName: 'RLF Q_out Threshold',
      unit: 'dB',
      allowedRange: { min: -30, max: 0 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-RLF-QOUT-DB', profileId: 'realistic-first-screen', defaultValue: -8, sourceTier: 'paper-backed', sourceId: 'PAP-2022-SINR-ELEVATION', sourceNote: 'Q_out=−8 dB', exposureMode: 'Realistic' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-RLF-QIN-DB',
      parameterPath: 'handover.rlf_qin_db',
      semanticName: 'RLF Q_in Threshold',
      unit: 'dB',
      allowedRange: { min: -20, max: 10 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-RLF-QIN-DB', profileId: '__universal__', defaultValue: -6, sourceTier: 'standard-backed', sourceId: 'STD-3GPP-38133', sourceNote: 'Q_in threshold (TS 38.133 §7.6)', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-RLF-N310',
      parameterPath: 'handover.rlf_n310',
      semanticName: 'RLF N310 Out-of-Sync Counter',
      unit: null,
      presetList: [1,2,3,4,6,8,10,20].map(v => ({ value: v, label: String(v) })),
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-RLF-N310', profileId: '__universal__', defaultValue: 6, sourceTier: 'standard-backed', sourceId: 'STD-3GPP-38331', sourceNote: 'N310 consecutive out-of-sync events to start T310 (TS 38.331 §5.3.10)', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-RLF-N311',
      parameterPath: 'handover.rlf_n311',
      semanticName: 'RLF N311 In-Sync Counter',
      unit: null,
      presetList: [1,2,3,4,5,6,8,10].map(v => ({ value: v, label: String(v) })),
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-RLF-N311', profileId: '__universal__', defaultValue: 1, sourceTier: 'standard-backed', sourceId: 'STD-3GPP-38331', sourceNote: 'N311 consecutive in-sync events to cancel T310 (TS 38.331 §5.3.10)', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-HO-RLF-T310-MS',
      parameterPath: 'handover.rlf_t310_ms',
      semanticName: 'RLF T310 Detection Timer',
      unit: 'ms',
      allowedRange: { min: 0, max: 6000 },
      isDerived: false,
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-RLF-T310-MS', profileId: '__universal__', defaultValue: 2000, sourceTier: 'standard-backed', sourceId: 'STD-3GPP-38821', sourceNote: 'T310=2000 ms NTN-extended from terrestrial 1000 ms (TR 38.821 §6.3.4)', exposureMode: 'Advanced' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ENERGY (9 parameters: 1 explicit + 8 layer2_overrides)
  // ══════════════════════════════════════════════════════════════════════════

  {
    spec: {
      id: 'PARAM-ENE-HO-COST-J',
      parameterPath: 'energy.energy_per_handover_j',
      semanticName: 'Per-Handover Energy Cost',
      unit: 'J',
      allowedRange: { min: 0, max: 1000 },
      isDerived: false,
      dependencyRule: 'only active when energy.layer1_enabled = true and this field is set',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-ENE-HO-COST-J', profileId: '__universal__', defaultValue: null, sourceTier: 'assumption-backed', sourceId: 'ASSUME-HO-ENERGY-001', sourceNote: 'no paper-backed default; must be declared assumption-backed if set', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-ENE-L2-BATTERY-WH',
      parameterPath: 'energy.layer2_overrides.batteryCapacityWh',
      semanticName: 'Satellite Battery Capacity',
      unit: 'Wh',
      allowedRange: { min: 0.1, max: 100000 },
      isDerived: false,
      dependencyRule: 'only active when energy.layer2_enabled = true',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-ENE-L2-BATTERY-WH', profileId: 'bh-resource-energy-proof', defaultValue: 0.5, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ENE-001', sourceNote: 'reduced capacity for deterministic proof path', exposureMode: 'Internal-only' },
    ],
  },

  {
    spec: {
      id: 'PARAM-ENE-L2-INITIAL-SOC',
      parameterPath: 'energy.layer2_overrides.initialSoc',
      semanticName: 'Initial State of Charge',
      unit: null,
      allowedRange: { min: 0, max: 1 },
      isDerived: false,
      dependencyRule: 'only active when energy.layer2_enabled = true',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-ENE-L2-INITIAL-SOC', profileId: 'bh-resource-energy-proof', defaultValue: 0.6, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ENE-001', sourceNote: 'proof path SoC = 0.6', exposureMode: 'Internal-only' },
    ],
  },

  {
    spec: {
      id: 'PARAM-ENE-L2-SOLAR-W',
      parameterPath: 'energy.layer2_overrides.solarPowerW',
      semanticName: 'Solar Panel Power Output',
      unit: 'W',
      allowedRange: { min: 0, max: 50000 },
      isDerived: false,
      dependencyRule: 'only active when energy.layer2_enabled = true',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-ENE-L2-SOLAR-W', profileId: 'bh-resource-energy-proof', defaultValue: 0, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ENE-001', sourceNote: 'zero solar for worst-case proof', exposureMode: 'Internal-only' },
    ],
  },

  {
    spec: {
      id: 'PARAM-ENE-L2-BLOCKING-SOC',
      parameterPath: 'energy.layer2_overrides.blockingThresholdSoc',
      semanticName: 'Energy Blocking SoC Threshold',
      unit: null,
      allowedRange: { min: 0, max: 1 },
      isDerived: false,
      dependencyRule: 'only active when energy.layer2_enabled = true',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-ENE-L2-BLOCKING-SOC', profileId: 'bh-resource-energy-proof', defaultValue: 0.15, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ENE-001', sourceNote: 'block service below 15% SoC (proof path)', exposureMode: 'Internal-only' },
    ],
  },

  {
    spec: {
      id: 'PARAM-ENE-L2-ORBITAL-PERIOD-SEC',
      parameterPath: 'energy.layer2_overrides.orbitalPeriodSec',
      semanticName: 'Orbital Period Override',
      unit: 's',
      allowedRange: { min: 3000, max: 90000 },
      isDerived: true,
      dependencyRule: 'derived from orbital.altitude_km; override used when altitude differs from main orbital config',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-ENE-L2-ORBITAL-PERIOD-SEC', profileId: 'bh-resource-energy-proof', defaultValue: 5760, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ENE-001', sourceNote: '≈96 min at 780 km', exposureMode: 'Internal-only' },
      { parameterId: 'PARAM-ENE-L2-ORBITAL-PERIOD-SEC', profileId: 'geo-relay-baseline',        defaultValue: 86164, sourceTier: 'assumption-backed', sourceId: 'ASSUME-GEO-BASELINE', sourceNote: 'GEO sidereal day 86164 s', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-ENE-L2-SHADOW-FRAC',
      parameterPath: 'energy.layer2_overrides.shadowFraction',
      semanticName: 'Eclipse Shadow Fraction',
      unit: null,
      allowedRange: { min: 0, max: 1 },
      isDerived: false,
      dependencyRule: 'only active when energy.layer2_enabled = true',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-ENE-L2-SHADOW-FRAC', profileId: 'bh-resource-energy-proof', defaultValue: 0.35, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ENE-001', sourceNote: '35% eclipse fraction proof path', exposureMode: 'Internal-only' },
      { parameterId: 'PARAM-ENE-L2-SHADOW-FRAC', profileId: 'geo-relay-baseline',        defaultValue: 0.01, sourceTier: 'assumption-backed', sourceId: 'ASSUME-GEO-BASELINE', sourceNote: 'GEO near-zero shadow except equinox', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-ENE-L2-ALTITUDE-KM',
      parameterPath: 'energy.layer2_overrides.altitudeKm',
      semanticName: 'Altitude Override for Layer 2 Beta Angle',
      unit: 'km',
      allowedRange: { min: 200, max: 40000 },
      isDerived: true,
      dependencyRule: 'mirrors orbital.altitude_km for L2 beta-angle computation; must match orbital config',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-ENE-L2-ALTITUDE-KM', profileId: 'meo-constellation-baseline', defaultValue: 8062,  sourceTier: 'assumption-backed', sourceId: 'ASSUME-MEO-BASELINE', sourceNote: 'MEO 8062 km for L2 beta angle', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ENE-L2-ALTITUDE-KM', profileId: 'geo-relay-baseline',          defaultValue: 35786, sourceTier: 'assumption-backed', sourceId: 'ASSUME-GEO-BASELINE', sourceNote: 'GEO 35786 km for L2 beta angle', exposureMode: 'Advanced' },
    ],
  },

  {
    spec: {
      id: 'PARAM-ENE-L2-BETA-ANGLE-DEG',
      parameterPath: 'energy.layer2_overrides.betaAngleDeg',
      semanticName: 'Solar Beta Angle Override',
      unit: 'deg',
      allowedRange: { min: -90, max: 90 },
      isDerived: false,
      dependencyRule: 'when set, overrides the computed beta angle from orbital geometry; used for deterministic test scenarios',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-ENE-L2-BETA-ANGLE-DEG', profileId: '__universal__', defaultValue: null, sourceTier: 'assumption-backed', sourceId: 'ASSUME-ENE-001', sourceNote: 'null = compute from orbital geometry; only override in specific test scenarios', exposureMode: 'Internal-only' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // UE CONFIG (1 parameter)
  // ══════════════════════════════════════════════════════════════════════════

  {
    spec: {
      id: 'PARAM-UE-SPEED-KMH',
      parameterPath: 'ueConfig.speed_kmh',
      semanticName: 'UE Speed',
      unit: 'km/h',
      allowedRange: { min: 0, max: 1000 },
      isDerived: false,
      vocabularyLayer: 'scenario',
    },
    bindings: [
      { parameterId: 'PARAM-UE-SPEED-KMH', profileId: '__universal__', defaultValue: 0, sourceTier: 'assumption-backed', sourceId: 'ASSUME-UE-001', sourceNote: 'static UE as baseline; set to non-zero only for mobility studies', exposureMode: 'Advanced' },
    ],
  },

];
