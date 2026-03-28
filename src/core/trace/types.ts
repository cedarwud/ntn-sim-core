/**
 * Trace-related type definitions for ntn-sim-core.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.5, §10, §11
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3, §4.2
 *   - Assumption policy: sdd/ntn-sim-core-assumption-policy.md §4-5
 *   - This file must not import React, Three.js, or scene code.
 */

import type {
  PresentationMode,
  OrbitMode,
  SourceReference,
  KpiBundleShell,
  SimulationSnapshot,
} from '@/core/common/types';

// Re-export so consumers can get KpiBundleShell from trace module
export type { KpiBundleShell };

// ---------------------------------------------------------------------------
// Run Manifest
// ---------------------------------------------------------------------------

export interface RunManifest {
  runId: string;
  timestamp: string;
  profileId: string;
  profileFamily: string;
  presentationMode: PresentationMode;
  orbitMode: OrbitMode;
  seed: number;
  durationSec: number;
  stepSec: number;
  engineVersion: string;
  /**
   * Index of SpecMode-classified source entries in this run.
   * Populated by the benchmark runner from the profile's sourceMap.
   * Used to gate thesis claim review: Internal-only entries must never
   * be presented as paper-backed; Advanced entries require explicit justification.
   * Omitted when sourceMap is empty or runner does not classify entries.
   */
  specModeIndex?: {
    /** parameterPaths or source IDs with specMode='Internal-only' */
    internalOnly: string[];
    /** parameterPaths or source IDs with specMode='Advanced' */
    advanced: string[];
    /** parameterPaths or source IDs with specMode='Sensitivity' */
    sensitivity: string[];
  };
}

// ---------------------------------------------------------------------------
// Resolved Config
// ---------------------------------------------------------------------------

export interface ResolvedConfig {
  manifest: RunManifest;
  profileSnapshot: Record<string, unknown>;
  overrides: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Source Trace
// ---------------------------------------------------------------------------

export interface SourceTraceEntry {
  modelFamily: string;
  source: SourceReference;
  claimScope: string;
}

export interface SourceTrace {
  entries: SourceTraceEntry[];
}

// ---------------------------------------------------------------------------
// Event Log
// ---------------------------------------------------------------------------

export interface EventRecord {
  tick: number;
  timeSec: number;
  type: string;
  payload: Record<string, unknown>;
}

export interface EventLog {
  events: EventRecord[];
}

// ---------------------------------------------------------------------------
// Replay Manifest
// ---------------------------------------------------------------------------

export interface ReplayManifest {
  runId: string;
  windowStartSec: number;
  windowEndSec: number;
  selectionCriteria: string;
  selectionMethod: 'deterministic-search' | 'manual-override';
  presentationMode: PresentationMode;
}

export interface ReplayIdentitySample {
  index: number;
  tick: number;
  timeSec: number;
  primaryServingSatId: string | null;
  primaryContinuityState: string | null;
  dapsPhase: string | null;
  visibleSatelliteCount: number;
}

export interface ReplayIdentityRecord {
  snapshotCount: number;
  firstTick: number;
  lastTick: number;
  firstTimeSec: number;
  lastTimeSec: number;
  signature: string;
  samples: ReplayIdentitySample[];
}

export interface ReplayArtifact {
  replayManifest: ReplayManifest;
  identity: ReplayIdentityRecord;
  snapshots: SimulationSnapshot[];
}

// ---------------------------------------------------------------------------
// Run Artifact Bundle
// ---------------------------------------------------------------------------

export interface RunArtifactBundle {
  manifest: RunManifest;
  resolvedConfig: ResolvedConfig;
  sourceTrace: SourceTrace;
  eventLog: EventLog;
  kpiBundle: KpiBundleShell;
  replayManifest?: ReplayManifest;
  replayArtifact?: ReplayArtifact;
  /**
   * Assumption records collected from this run's profile sourceMap.
   * Populated for any source entry with tier='assumption-backed' or
   * specMode='Internal-only'. Required for thesis audit compliance:
   * every assumption affecting KPI-impacting paths must appear here.
   * Omitted when no assumption-backed entries are present.
   */
  assumptionSet?: AssumptionRecord[];
}

// ---------------------------------------------------------------------------
// Assumption Record (assumption-policy §4-5)
// ---------------------------------------------------------------------------

export interface AssumptionRecord {
  id: string;
  category: 'parameter' | 'range-selection' | 'placeholder' | 'curation';
  affectedModule: string;
  chosenValue: string;
  unit?: string;
  rationale: string;
  impactScope: string;
  claimScope: string;
  replacementTarget?: string;
}
