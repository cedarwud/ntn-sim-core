/**
 * Beam module barrel export.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §8
 *   - This file must not import React, Three.js, or scene code.
 */

export type {
  BeamDefinition,
  SatelliteBeamLayout,
  BeamSelectionResult,
  ActiveBeamState,
} from './types';

export { generateHexagonalBeamLayout } from './layout';
export { selectBeamForUe } from './selection';
export { createActiveBeamManager } from './active-beam-manager';
export type { ActiveBeamManager } from './active-beam-manager';
export { createBhScheduler } from './scheduler';
export type {
  SchedulerStrategy,
  BhSchedulerConfig,
  BhSlotDecision,
  BhScheduler,
} from './scheduler';
