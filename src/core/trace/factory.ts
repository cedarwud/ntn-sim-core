/**
 * Factory functions for trace artifacts.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.5
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §4.2
 */

import type { KpiBundleShell } from '@/core/common/types';
import type {
  RunManifest,
  ResolvedConfig,
  SourceTrace,
  SourceTraceEntry,
  EventLog,
  RunArtifactBundle,
} from './types';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export interface CreateRunManifestOpts {
  profileId: string;
  profileFamily: string;
  presentationMode: RunManifest['presentationMode'];
  orbitMode: RunManifest['orbitMode'];
  seed: number;
  durationSec: number;
  stepSec: number;
  engineVersion: string;
}

export function createRunManifest(opts: CreateRunManifestOpts): RunManifest {
  return {
    runId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    profileId: opts.profileId,
    profileFamily: opts.profileFamily,
    presentationMode: opts.presentationMode,
    orbitMode: opts.orbitMode,
    seed: opts.seed,
    durationSec: opts.durationSec,
    stepSec: opts.stepSec,
    engineVersion: opts.engineVersion,
  };
}

export function createResolvedConfig(
  manifest: RunManifest,
  profileSnapshot: Record<string, unknown>,
  overrides: Record<string, unknown>,
): ResolvedConfig {
  return { manifest, profileSnapshot, overrides };
}

export function createSourceTrace(entries: SourceTraceEntry[]): SourceTrace {
  return { entries };
}

export function createEmptyEventLog(): EventLog {
  return { events: [] };
}

export function createEmptyKpiBundle(): KpiBundleShell {
  return { totalTicks: 0, wallClockMs: 0, metrics: {} };
}

export function createRunArtifactBundle(
  manifest: RunManifest,
  resolvedConfig: ResolvedConfig,
  sourceTrace: SourceTrace,
): RunArtifactBundle {
  return {
    manifest,
    resolvedConfig,
    sourceTrace,
    eventLog: createEmptyEventLog(),
    kpiBundle: createEmptyKpiBundle(),
  };
}
