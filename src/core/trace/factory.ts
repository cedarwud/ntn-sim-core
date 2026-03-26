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
  ReplayManifest,
  ReplayArtifact,
  ReplayIdentityRecord,
  ReplayIdentitySample,
  RunArtifactBundle,
} from './types';
import type { SimulationSnapshot } from '@/core/common/types';

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

function fnv1a32(input: string, seed = 0x811c9dc5): number {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function createReplayIdentitySample(snapshot: SimulationSnapshot, index: number): ReplayIdentitySample {
  const primaryUe = snapshot.ues[0] ?? null;
  return {
    index,
    tick: snapshot.tick,
    timeSec: snapshot.timeSec,
    primaryServingSatId: primaryUe?.servingSatId ?? null,
    primaryContinuityState: primaryUe?.continuityState ?? null,
    dapsPhase: snapshot.daps?.phase ?? null,
    visibleSatelliteCount: snapshot.satellites.filter((sat) => sat.isVisible).length,
  };
}

export function createReplayIdentityRecord(snapshots: SimulationSnapshot[]): ReplayIdentityRecord {
  if (snapshots.length === 0) {
    throw new Error('[createReplayIdentityRecord] snapshots array is empty');
  }

  const lastIndex = snapshots.length - 1;
  const sampleIndices = [...new Set([
    0,
    Math.floor(lastIndex / 3),
    Math.floor((lastIndex * 2) / 3),
    lastIndex,
  ])].sort((a, b) => a - b);

  let hash = 0x811c9dc5;
  for (const snapshot of snapshots) {
    hash = fnv1a32(JSON.stringify(snapshot), hash);
    hash = fnv1a32('\n', hash);
  }

  return {
    snapshotCount: snapshots.length,
    firstTick: snapshots[0].tick,
    lastTick: snapshots[lastIndex].tick,
    firstTimeSec: snapshots[0].timeSec,
    lastTimeSec: snapshots[lastIndex].timeSec,
    signature: hash.toString(16).padStart(8, '0'),
    samples: sampleIndices.map((index) => createReplayIdentitySample(snapshots[index], index)),
  };
}

export function createReplayArtifact(
  replayManifest: ReplayManifest,
  snapshots: SimulationSnapshot[],
): ReplayArtifact {
  return {
    replayManifest,
    identity: createReplayIdentityRecord(snapshots),
    snapshots,
  };
}

export function createRunArtifactBundle(
  manifest: RunManifest,
  resolvedConfig: ResolvedConfig,
  sourceTrace: SourceTrace,
  replayManifest?: ReplayManifest,
  replayArtifact?: ReplayArtifact,
  eventLog?: EventLog,
  kpiBundle?: KpiBundleShell,
): RunArtifactBundle {
  return {
    manifest,
    resolvedConfig,
    sourceTrace,
    eventLog: eventLog ?? createEmptyEventLog(),
    kpiBundle: kpiBundle ?? createEmptyKpiBundle(),
    replayManifest,
    replayArtifact,
  };
}
