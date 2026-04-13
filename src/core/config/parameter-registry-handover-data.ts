import type { ParameterEntry } from './parameter-registry-schema';

/**
 * Phase 5 Core Structural Split: Handover registry data.
 * Ownership: Handover parameter literals.
 */

export const HANDOVER_PARAMETER_REGISTRY: ParameterEntry[] = [
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
      { parameterId: 'PARAM-HO-TRIGGER-THRESHOLD-DB', profileId: 'case9-access-baseline', defaultValue: -6, sourceTier: 'assumption-backed', sourceId: 'ASSUME-HO-THRESHOLD-SINR', sourceNote: '−6 dB SINR-relative simplification vs H3 absolute; Advanced', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-HO-TRIGGER-THRESHOLD-DB', profileId: 'modqn-paper-baseline', defaultValue: -30, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MODQN-RUNTIME', sourceNote: 'policy-driven baseline uses a permissive attach floor because beam choice comes from MODQN rather than event-trigger gating', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-HO-TRIGGER-THRESHOLD-DB', profileId: 'realistic-first-screen', defaultValue: -8, sourceTier: 'standard-backed', sourceId: 'STD-3GPP-38133', sourceNote: 'attach floor = Q_out = −8 dB (TS 38.133 §7.6)', exposureMode: 'Realistic' },
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
      { parameterId: 'PARAM-HO-A3-OFFSET-DB', profileId: '__universal__', defaultValue: 2, sourceTier: 'paper-backed', sourceId: 'PAP-2022-A4EVENT-CORE', sourceNote: 'A3 offset=2 dB default (TS 38.331 §5.5.4.4); only active when handover.type = a3-event', exposureMode: 'Advanced' },
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
      { parameterId: 'PARAM-HO-TTT-MS', profileId: 'case9-access-baseline', defaultValue: 640, sourceTier: 'assumption-backed', sourceId: 'ASSUME-HO-TTT-NTN', sourceNote: 'TTT=640 ms NTN-extended assumption; H2 paper-backed presets: 0/40/256 ms', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-HO-TTT-MS', profileId: 'modqn-paper-baseline', defaultValue: 0, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MODQN-RUNTIME', sourceNote: 'slot-wise policy actions execute immediately in the runtime bridge', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-HO-TTT-MS', profileId: 'realistic-first-screen', defaultValue: 0, sourceTier: 'assumption-backed', sourceId: 'ASSUME-HO-002', sourceNote: 'sinr-offset HO does not use TTT; set to 0 to disable A3/A4 trigger path', exposureMode: 'Realistic' },
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
      { parameterId: 'PARAM-HO-HYSTERESIS-DB', profileId: 'case9-access-baseline', defaultValue: 1, sourceTier: 'paper-backed', sourceId: 'PAP-2022-A4EVENT-CORE', sourceNote: 'hysteresis 1 dB', exposureMode: 'Realistic' },
      { parameterId: 'PARAM-HO-HYSTERESIS-DB', profileId: 'modqn-paper-baseline', defaultValue: 0, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MODQN-RUNTIME', sourceNote: 'slot-wise policy actions use zero hysteresis in the runtime bridge', exposureMode: 'Advanced' },
      { parameterId: 'PARAM-HO-HYSTERESIS-DB', profileId: 'realistic-first-screen', defaultValue: 0, sourceTier: 'assumption-backed', sourceId: 'ASSUME-HO-002', sourceNote: 'sinr-offset HO does not use hysteresis; set to 0', exposureMode: 'Realistic' },
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
      { parameterId: 'PARAM-HO-MIN-ELEV-DEG', profileId: 'modqn-paper-baseline', defaultValue: 10, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MODQN-RUNTIME', sourceNote: 'minimum elevation is kept at 10° as a runtime safety floor; the MODQN paper does not publish a separate elevation gate', exposureMode: 'Advanced' },
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
      { parameterId: 'PARAM-HO-PINGPONG-WINDOW-SEC', profileId: 'modqn-paper-baseline', defaultValue: 10, sourceTier: 'assumption-backed', sourceId: 'ASSUME-MODQN-RUNTIME', sourceNote: '10 s KPI diagnostics window for the MODQN baseline bridge', exposureMode: 'Advanced' },
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
      id: 'PARAM-HO-DAPS-PREP-ELEV-DEG',
      parameterPath: 'handover.daps_prepare_elevation_deg',
      semanticName: 'DAPS TTT Elevation Accelerant Threshold',
      unit: 'deg',
      allowedRange: { min: 10, max: 90 },
      isDerived: false,
      dependencyRule: 'only active when handover.type = daps',
      vocabularyLayer: 'model-bundle',
    },
    bindings: [
      { parameterId: 'PARAM-HO-DAPS-PREP-ELEV-DEG', profileId: 'case9-daps-baseline', defaultValue: 30, sourceTier: 'assumption-backed', sourceId: 'ASSUME-HO-DAPS-PREP-ELEV', sourceNote: 'TTT accelerant 30°: low elevation → shorter TTT (50–100%); not a trigger gate', exposureMode: 'Advanced' },
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
      presetList: [1, 2, 3, 4, 6, 8, 10, 20].map((v) => ({ value: v, label: String(v) })),
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
      presetList: [1, 2, 3, 4, 5, 6, 8, 10].map((v) => ({ value: v, label: String(v) })),
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
];
