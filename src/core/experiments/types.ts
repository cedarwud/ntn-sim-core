/**
 * src/core/experiments/types — Downstream boundary types for experiment specs.
 *
 * This file defines the minimal type surface that the shipped M2 path and the
 * later M3 viewer-facing result surface build on for baseline experiments.
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
// Experiment manifest
// ---------------------------------------------------------------------------

/**
 * Descriptor for a single reproducible experiment run.
 *
 * M2 defines concrete manifests such as the MODQN baseline reproduction
 * manifest; later downstream surfaces should extend rather than replace this.
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
// Experiment result bundle
// ---------------------------------------------------------------------------

/**
 * Result of a completed experiment run.
 *
 * M2 fills this with held-out KPI data and wall-clock timing; M3 stabilizes
 * richer viewer-facing result bundles on top of this baseline contract.
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
