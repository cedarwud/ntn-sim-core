/**
 * KPI module barrel export.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.5
 *   - This file must not import React, Three.js, or scene code.
 */

export type { KpiBundle } from './types';
export type { KpiAccumulatorConfig, KpiAccumulator } from './accumulator';
export { createKpiAccumulator } from './accumulator';
