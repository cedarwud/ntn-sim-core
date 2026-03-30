/**
 * RunnerExposureApi — thin adapter between hooks and the headless benchmark runner.
 *
 * @version v1
 * @frozen 2026-03-30 (Phase 4 Group 2 — phase4-runtime-contract-sdd.md §4.5)
 *
 * Consumer boundary:
 *   - src/app/hooks/**  MAY import this file (only hooks, not viz)
 *   - src/viz/**        MUST NOT import this file (SDD §5.1 F6)
 *   - src/core/**       MUST NOT import this file (SDD §5.1 F4)
 *
 * This file wraps the internal benchmark-runner to provide a stable,
 * narrow surface for hook-layer consumers.
 *
 * Re-exports getProfileList from exposure-v1 for hook convenience.
 *
 * Pure computation — NO React, Three.js, or scene code.
 */

import type { KpiBundle } from '@/core/contracts/kpi-v1';
import type { HandoverType } from '@/core/contracts/exposure-v1';
import type { ProfileListEntry } from '@/core/contracts/exposure-v1';
import { getProfileList as _getProfileList } from '@/core/contracts/exposure-v1';
import { executeBenchmarkRun } from '@/runner/headless/benchmark-runner';

// ---------------------------------------------------------------------------
// RunnerBenchmarkRequest / Response
// ---------------------------------------------------------------------------

/**
 * Request to execute a single benchmark run.
 *
 * @version v1
 * @frozen 2026-03-30 (phase4-runtime-contract-sdd.md §4.5)
 */
export interface RunnerBenchmarkRequest {
  /** Profile to run. Must exist in getProfileList(). */
  profileId: string;
  /** Optional handover type override for A/B comparison. */
  handoverTypeOverride?: HandoverType;
  /** Optional seed override for reproducibility. */
  seedOverride?: number;
}

/**
 * Result of a single benchmark run.
 *
 * @version v1
 * @frozen 2026-03-30 (phase4-runtime-contract-sdd.md §4.5)
 */
export interface RunnerBenchmarkResponse {
  /** Echoes back the profile ID. */
  profileId: string;
  /** Full KPI results. */
  kpiBundle: KpiBundle;
  /** Wall-clock duration of the run in milliseconds. */
  wallClockMs: number;
}

// ---------------------------------------------------------------------------
// RunnerExposureApi interface
// ---------------------------------------------------------------------------

/**
 * Stable hook-layer API for executing benchmarks and discovering profiles.
 *
 * @version v1
 * @frozen 2026-03-30 (phase4-runtime-contract-sdd.md §4.5)
 */
export interface RunnerExposureApi {
  /** Execute a single benchmark run synchronously. */
  executeBenchmark(req: RunnerBenchmarkRequest): RunnerBenchmarkResponse;
  /** Return the ordered list of available profiles (delegates to exposure-v1). */
  getProfileList(): ProfileListEntry[];
}

// ---------------------------------------------------------------------------
// Default implementation
// ---------------------------------------------------------------------------

/**
 * Default RunnerExposureApi implementation backed by the headless benchmark runner.
 *
 * useBatchKpi.ts uses this singleton. Tests may substitute their own implementation.
 */
export const defaultRunnerExposureApi: RunnerExposureApi = {
  executeBenchmark(req: RunnerBenchmarkRequest): RunnerBenchmarkResponse {
    const result = executeBenchmarkRun({
      profileId: req.profileId,
      handoverTypeOverride: req.handoverTypeOverride,
      seedOverride: req.seedOverride,
    });
    return {
      profileId: result.profileId,
      kpiBundle: result.kpiBundle,
      wallClockMs: result.wallClockMs,
    };
  },

  getProfileList(): ProfileListEntry[] {
    return _getProfileList();
  },
};

// Re-export getProfileList for hook convenience
export { getProfileList } from '@/core/contracts/exposure-v1';
