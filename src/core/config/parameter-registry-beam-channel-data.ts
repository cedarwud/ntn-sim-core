import type { ParameterEntry } from './parameter-registry-schema';

/**
 * Phase 5 Core Structural Split: Beam/channel registry data.
 * Ownership: Beam and channel parameter literals.
 */

export const BEAM_AND_CHANNEL_PARAMETER_REGISTRY: ParameterEntry[] = [
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
      { parameterId: 'PARAM-BEAM-NUM-BEAMS', profileId: 'case9-access-baseline', defaultValue: 19, sourceTier: 'paper-backed', sourceId: 'PAP-2025-TIMERCHO-CORE', sourceNote: '19 beams earth-moving 600 km', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-BEAM-NUM-BEAMS', profileId: 'hobs-multibeam-baseline', defaultValue: 19, sourceTier: 'paper-backed', sourceId: 'PAP-2025-TIMERCHO-CORE', sourceNote: '19 beams (HOBS profile)', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-BEAM-NUM-BEAMS', profileId: 'bh-resource-baseline', defaultValue: 12, sourceTier: 'paper-backed', sourceId: 'PAP-2026-BHFREQREUSE', sourceNote: '12 beams BH+FRF co-scheduling', exposureMode: 'Realistic' },
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
      { parameterId: 'PARAM-BEAM-FRF', profileId: 'case9-access-baseline', defaultValue: 1, sourceTier: 'standard-backed', sourceId: '3GPP-NTN-ACCESS', sourceNote: 'FRF-1 baseline access profile', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-BEAM-FRF', profileId: 'hobs-multibeam-baseline', defaultValue: 3, sourceTier: 'paper-backed', sourceId: 'PAP-2024-HOBS', sourceNote: 'FRF=3 (Table I)', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-BEAM-FRF', profileId: 'bh-resource-baseline', defaultValue: 3, sourceTier: 'paper-backed', sourceId: 'PAP-2026-BHFREQREUSE', sourceNote: 'FRF=3 BH+FRF co-scheduling', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-BEAM-FRF', profileId: 'realistic-first-screen', defaultValue: 3, sourceTier: 'paper-backed', sourceId: 'PAP-2025-JCAP-LEO', sourceNote: 'FR3 frequency reuse (PAP-2025-JCAP-LEO)', exposureMode: 'Realistic' },
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
      { parameterId: 'PARAM-BEAM-INTERFERENCE-BEAMS', profileId: 'bh-resource-baseline', defaultValue: 0, sourceTier: 'assumption-backed', sourceId: 'ASSUME-BEAM-002', sourceNote: '0 interference beams for BH/FRF profiles', exposureMode: 'Advanced' },
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
  {
    spec: {
      id: 'PARAM-CHAN-DEPLOY-ENV',
      parameterPath: 'channel.deployment_environment',
      semanticName: 'Deployment Environment (SF/CL lookup)',
      unit: null,
      presetList: [
        { value: 'rural', label: 'Rural' },
        { value: 'suburban', label: 'Suburban' },
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
];
