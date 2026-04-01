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
 * Current state: skeleton only — U1 will add baseline result projectors here.
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
