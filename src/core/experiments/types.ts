/**
 * src/core/experiments/types — Downstream boundary types for experiment specs.
 *
 * This file defines the minimal type surface that M2/M3 will extend when
 * implementing baseline experiment manifests and artifact bundles.
 *
 * @layer experiments
 * @created 2026-03-31 (downstream architecture Group 2)
 *
 * Dependency rules (SDD §8B):
 *   - MAY import from @/core/contracts (kpi-v1, runtime-v1)
 *   - MAY import from @/core/algorithms (algorithm descriptors)
 *   - MUST NOT import from @/core/engine/ internals
 *   - MUST NOT import from @/viz/ or @/app/
 *   - MUST NOT own policy logic
 */

import type { KpiBundle } from '@/core/contracts/kpi-v1';

// ---------------------------------------------------------------------------
// Experiment manifest (filled by M2)
// ---------------------------------------------------------------------------

/**
 * Descriptor for a single reproducible experiment run.
 *
 * M2 will define concrete manifests (e.g. MODQN baseline training manifest).
 */
export interface ExperimentManifest {
  /** Unique experiment identifier. */
  readonly id: string;
  /** Algorithm adapter ID to use (from algorithms/ registry). */
  readonly algorithmId: string;
  /** Profile ID to run against. */
  readonly profileId: string;
  /** Random seed for reproducibility. */
  readonly seed: number;
  /** Additional run parameters (M2 will specialize). */
  readonly params: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Experiment result bundle (filled by M3)
// ---------------------------------------------------------------------------

/**
 * Result of a completed experiment run.
 *
 * M3 will fill this with KPI data, training curves, and artifact paths.
 * U1 view-models will consume this type for baseline result display.
 */
export interface ExperimentResult {
  /** Matches the manifest ID. */
  readonly experimentId: string;
  /** Timestamp of completion. */
  readonly completedAt: string;
  /** KPI bundle from the final evaluation. */
  readonly kpiBundle: KpiBundle;
  /** Wall-clock duration in milliseconds. */
  readonly wallClockMs: number;
}
