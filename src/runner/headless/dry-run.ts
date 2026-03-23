/**
 * Dry-run executor for ntn-sim-core headless runner.
 *
 * Phase 0: NOOP simulation that proves the I/O contract works.
 * No orbit, no channel, no handover — just manifest + empty artifacts.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §7
 *   - Roadmap: sdd/ntn-sim-core-roadmap.md Phase 0
 *   - This file must not import React, Three.js, or scene code.
 */

import type { KpiBundleShell } from '@/core/common/types';
import type {
  RunManifest,
  ResolvedConfig,
  SourceTrace,
  EventLog,
  RunArtifactBundle,
} from '@/core/trace/types';
import type { HeadlessRunConfig, HeadlessRunResult } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a v4-like UUID using Math.random (determinism not required for run IDs). */
function generateRunId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const ENGINE_VERSION = '0.0.1-phase0';

// ---------------------------------------------------------------------------
// Dry Run
// ---------------------------------------------------------------------------

export function executeDryRun(config: HeadlessRunConfig): HeadlessRunResult {
  const t0 = performance.now();

  try {
    // 1. Create RunManifest
    const manifest: RunManifest = {
      runId: generateRunId(),
      timestamp: new Date().toISOString(),
      profileId: config.profile.id,
      profileFamily: config.profile.family,
      presentationMode: config.presentationMode,
      orbitMode: config.profile.orbitMode,
      seed: config.profile.seed,
      durationSec: config.profile.timeControl.durationSec,
      stepSec: config.profile.timeControl.stepSec,
      engineVersion: ENGINE_VERSION,
    };

    // 2. Resolved config
    const resolvedConfig: ResolvedConfig = {
      manifest,
      profileSnapshot: { ...config.profile } as unknown as Record<string, unknown>,
      overrides: config.overrides ?? {},
    };

    // 3. Empty source trace
    const sourceTrace: SourceTrace = { entries: [] };

    // 4. Empty event log
    const eventLog: EventLog = { events: [] };

    // 5. Empty KPI bundle shell
    const wallClockMs = performance.now() - t0;
    const kpiBundle: KpiBundleShell = {
      totalTicks: 0,
      wallClockMs,
      metrics: {},
    };

    // 6. Assemble artifact bundle
    const artifactBundle: RunArtifactBundle = {
      manifest,
      resolvedConfig,
      sourceTrace,
      eventLog,
      kpiBundle,
    };

    // 7. Return success
    return {
      success: true,
      artifactBundle,
      wallClockMs: performance.now() - t0,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      wallClockMs: performance.now() - t0,
    };
  }
}
