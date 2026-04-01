/**
 * src/core/contracts — Frozen consumer-facing contract barrel.
 *
 * @version v1
 * @frozen 2026-03-30 (Phase 4 Group 2 — phase4-runtime-contract-sdd.md §4)
 *
 * Consumer usage:
 *   import type { SimulationSnapshot } from '@/core/contracts';
 *   import type { KpiBundle, BatchKpiEntry } from '@/core/contracts';
 *   import type { HandoverType, ProfileListEntry } from '@/core/contracts';
 *   import { getProfileList } from '@/core/contracts';
 *
 * Consumers may also import from individual versioned files directly:
 *   import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
 *
 * See phase4-runtime-contract-sdd.md §4 for the full contract spec.
 */

// runtime-v1
export type {
  SimulationSnapshot,
  SatelliteState,
  UeState,
  BhSlotSnapshot,
  DapsSnapshot,
  HoLogEntry,
  SatelliteBeamSnapshot,
  BeamRole,
  ContinuityState,
} from './runtime-v1';

// kpi-v1
export type { KpiBundle } from './kpi-v1';
export type { BatchKpiEntry } from './kpi-v1';

// policy-v1
export type {
  PolicyObservation,
  PolicyAction,
  PolicyReward,
  Policy,
  SatelliteObservation,
  UeObservation,
  SatelliteAction,
  HandoverAction,
} from './policy-v1';

// modqn-contracts
export type {
  ModqnBeamTruth,
  ModqnBaselineObservation,
  ModqnPaperState,
  ModqnObjectiveQValue,
  ModqnObjectiveWeights,
  ModqnActionVector,
  ModqnRewardInput,
  ModqnRewardVector,
  ModqnTrainingProtocol,
  ModqnTruthSource,
  ModqnPolicyBridge,
} from './modqn-contracts';
export { MODQN_BASELINE_OBJECTIVE_WEIGHTS, MODQN_BASELINE_TRAINING_PROTOCOL } from './modqn-contracts';

// exposure-v1
export type { HandoverType, ProfileListEntry, ParameterView, ParameterMetadataResponse } from './exposure-v1';
export { getProfileList } from './exposure-v1';
