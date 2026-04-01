/**
 * src/viz/view-models/types — Downstream boundary types for UI view-models.
 *
 * This file defines the minimal type surface that U1 will extend when
 * implementing baseline KPI cards, chart series, and parameter panels.
 *
 * @layer view-models
 * @created 2026-03-31 (downstream architecture Group 2)
 *
 * Dependency rules (SDD §8B):
 *   - MAY import from @/core/contracts (kpi-v1, runtime-v1, exposure-v1)
 *   - MAY import from @/core/experiments (ExperimentResult — for M3/U1 handoff)
 *   - MUST NOT import from @/core/engine/ internals
 *   - MUST NOT import from @/core/algorithms/ internals
 *   - MUST NOT recompute simulator truth
 *   - MUST NOT invent provenance or metadata not present in contract outputs
 */

import type { KpiBundle } from '@/core/contracts/kpi-v1';

// ---------------------------------------------------------------------------
// KPI display view-models (filled by U1)
// ---------------------------------------------------------------------------

/**
 * Single KPI card for baseline result display.
 *
 * U1 will build these from KpiBundle fields.
 */
export interface KpiCardViewModel {
  /** Display label (e.g. "Avg SINR", "HO Count"). */
  readonly label: string;
  /** Formatted value string (e.g. "12.3 dB", "47"). */
  readonly formattedValue: string;
  /** Raw numeric value for sorting / comparison. */
  readonly rawValue: number;
  /** Unit string if applicable. */
  readonly unit?: string;
}

/**
 * Single detail row in a KPI section.
 */
export interface KpiDetailRowViewModel {
  readonly label: string;
  readonly formattedValue: string;
  readonly rawValue: number;
  readonly unit?: string;
}

/**
 * Grouped section for baseline result display.
 */
export interface KpiDetailSectionViewModel {
  readonly title: string;
  readonly rows: readonly KpiDetailRowViewModel[];
}

/**
 * Single data point in a chart series.
 */
export interface ChartDataPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Chart series view-model for baseline result charts.
 *
 * U1 will build these from KpiBundle or replay snapshots.
 */
export interface ChartSeriesViewModel {
  /** Series label for the legend. */
  readonly label: string;
  /** Data points. */
  readonly data: readonly ChartDataPoint[];
  /** Optional color hint. */
  readonly color?: string;
}

// ---------------------------------------------------------------------------
// Projection helpers (filled by U1)
// ---------------------------------------------------------------------------

/**
 * Project a KpiBundle into an array of display-ready KPI cards.
 *
 * Placeholder — U1 will implement the actual projection logic.
 */
export type KpiBundleProjector = (bundle: KpiBundle) => KpiCardViewModel[];
export type KpiBundleSectionProjector = (bundle: KpiBundle) => KpiDetailSectionViewModel[];
