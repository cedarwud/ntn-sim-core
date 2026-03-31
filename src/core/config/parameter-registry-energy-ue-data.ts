import type { ParameterEntry } from './parameter-registry-schema';

/**
 * Phase 5 Core Structural Split: Energy/UE registry data.
 * Ownership: Energy and UE parameter literals.
 */

export const ENERGY_AND_UE_PARAMETER_REGISTRY: ParameterEntry[] = [
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
      { parameterId: 'PARAM-ENE-L2-ORBITAL-PERIOD-SEC', profileId: 'geo-relay-baseline', defaultValue: 86164, sourceTier: 'assumption-backed', sourceId: 'ASSUME-GEO-BASELINE', sourceNote: 'GEO sidereal day 86164 s', exposureMode: 'Advanced' },
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
      { parameterId: 'PARAM-ENE-L2-SHADOW-FRAC', profileId: 'geo-relay-baseline', defaultValue: 0.01, sourceTier: 'assumption-backed', sourceId: 'ASSUME-GEO-BASELINE', sourceNote: 'GEO near-zero shadow except equinox', exposureMode: 'Advanced' },
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
      { parameterId: 'PARAM-ENE-L2-ALTITUDE-KM', profileId: 'meo-constellation-baseline', defaultValue: 8062, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MEO-BASELINE', sourceNote: 'MEO 8062 km for L2 beta angle', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-ENE-L2-ALTITUDE-KM', profileId: 'geo-relay-baseline', defaultValue: 35786, sourceTier: 'assumption-backed', sourceId: 'ASSUME-GEO-BASELINE', sourceNote: 'GEO 35786 km for L2 beta angle', exposureMode: 'Advanced' },
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
