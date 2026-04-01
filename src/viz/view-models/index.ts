/**
 * src/viz/view-models — UI view-model layer.
 *
 * Purpose: convert frozen contract outputs into UI-oriented structures,
 * keeping UI components away from raw runtime internals.
 *
 * @layer view-models
 * @created 2026-03-31 (downstream architecture Group 2)
 * @authority sdd/downstream-runtime-architecture-sdd.md §3.3, §8B
 *            sdd/ui-integration-roadmap.md §4
 *
 * Current state: baseline projector surface now includes the MODQN M3
 * result-bundle view model alongside the generic U1 projector primitives.
 *
 * Dependency rules:
 *   MAY import:   @/core/contracts, @/core/experiments (result types)
 *   MUST NOT:     @/core/engine/ internals, @/core/algorithms/ internals
 */

export type {
  KpiCardViewModel,
  ChartDataPoint,
  ChartSeriesViewModel,
  KpiBundleProjector,
} from './types';

export type { ModqnComparisonRow } from './modqn-view-model';
export { ModqnViewModel } from './modqn-view-model';
