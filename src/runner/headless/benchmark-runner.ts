/**
 * Headless benchmark runner for A/B comparison (e.g. baseline vs DAPS).
 *
 * Pure computation — NO React, Three.js, or scene code.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §4, §7, §9
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §4.1, §4.2
 */

import type { PresentationMode } from '@/core/common/types';
import type { ProfileConfig, HandoverType } from '@/core/profiles/types';
import type { KpiBundle } from '@/core/kpi/types';
import type { RunArtifactBundle } from '@/core/trace/types';
import { loadProfile, resolveProfile, buildWalkerConfig } from '@/core/profiles/loader';
import { generateWalkerConstellation } from '@/core/orbit/walker';
import { buildTrajectoryCache } from '@/core/orbit/trajectory-cache';
import { createSimEngine } from '@/core/engine';
import { loadOmmRecords, ommToSatrecs, sampleRecords } from '@/core/orbit/tle-loader';
import { satrecsToOrbitElements } from '@/core/orbit/sgp4-adapter';
import {
  createRunManifest,
  createResolvedConfig,
  createSourceTrace,
  createReplayArtifact,
  createRunArtifactBundle,
} from '@/core/trace/factory';
import { createReplaySelectionPlan } from '@/runner/curation';
import { recordWindow } from '@/runner/replay/controller';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface BenchmarkRunConfig {
  profileId: string;
  /** Override handover type for A/B comparison. */
  handoverTypeOverride?: HandoverType;
  /** Override presentation mode. */
  presentationMode?: PresentationMode;
  /** Custom seed override. */
  seedOverride?: number;
  /** OMM JSON records for real-trace mode. Caller is responsible for loading from file. */
  tleOmmData?: import('@/core/orbit/tle-loader').OmmRecord[];
}

export interface BenchmarkRunResult {
  profileId: string;
  handoverType: string;
  seed: number;
  durationSec: number;
  kpiBundle: KpiBundle;
  artifactBundle: RunArtifactBundle;
  wallClockMs: number;
}

export interface ComparisonResult {
  baseline: BenchmarkRunResult;
  daps: BenchmarkRunResult;
  diff: KpiDiff;
}

export interface KpiDiff {
  handoverCountDiff: number;
  hoFailureDiff: number;
  pingPongDiff: number;
  meanSinrDiffDb: number;
  meanThroughputDiffMbps: number;
  serviceAvailabilityDiff: number;
  /** Positive = DAPS is better. */
  improvements: string[];
  /** Negative = DAPS is worse. */
  regressions: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wall-clock timer compatible with both browser and Node. */
function now(): number {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  return Date.now();
}

/**
 * Build constellation elements from profile (Walker synthetic or TLE real-trace).
 */
function buildElements(
  profile: ProfileConfig,
  tleOmmData?: import('@/core/orbit/tle-loader').OmmRecord[],
): { elements: import('@/core/orbit/types').OrbitElement[]; epochUtcMs: number } {
  if (profile.orbitMode === 'real-trace' && tleOmmData) {
    // Real-trace: use provided TLE/OMM data
    let records = loadOmmRecords(tleOmmData);
    const maxSats = profile.tleMaxSatellites ?? 200;
    if (records.length > maxSats) {
      records = sampleRecords(records, maxSats, profile.seed);
    }
    const satrecs = ommToSatrecs(records);
    const elements = satrecsToOrbitElements(satrecs);
    return { elements, epochUtcMs: profile.timeControl.epochUtcMs };
  }

  // Synthetic: Walker constellation (A4: multi-shell via buildWalkerConfig)
  const elements = generateWalkerConstellation(
    buildWalkerConfig(profile, profile.timeControl.epochUtcMs),
  );
  return { elements, epochUtcMs: profile.timeControl.epochUtcMs };
}

/**
 * Build trajectory cache from profile elements.
 */
function buildConstellation(
  profile: ProfileConfig,
  tleOmmData?: import('@/core/orbit/tle-loader').OmmRecord[],
) {
  const { elements } = buildElements(profile, tleOmmData);

  const cache = buildTrajectoryCache({
    elements,
    observerLatDeg: profile.observer.latitudeDeg,
    observerLonDeg: profile.observer.longitudeDeg,
    observerAltKm: profile.observer.altitudeM / 1000,
    durationSec: profile.timeControl.durationSec,
    stepSec: profile.timeControl.stepSec,
    epochUtcMs: profile.timeControl.epochUtcMs,
  });

  return cache;
}

// ---------------------------------------------------------------------------
// executeBenchmarkRun
// ---------------------------------------------------------------------------

/**
 * Execute a single benchmark run. Returns KPI bundle + trace artifacts.
 */
export function executeBenchmarkRun(config: BenchmarkRunConfig): BenchmarkRunResult {
  // 1. Load profile
  let profile = loadProfile(config.profileId);

  // 2. Apply overrides
  const overrides: Partial<ProfileConfig> = {};

  if (config.handoverTypeOverride) {
    overrides.handover = {
      ...profile.handover,
      type: config.handoverTypeOverride,
    };
  }
  if (config.seedOverride !== undefined) {
    overrides.seed = config.seedOverride;
  }

  if (Object.keys(overrides).length > 0) {
    profile = resolveProfile(profile, overrides);
  }

  const presentationMode = config.presentationMode ?? 'benchmark';

  // 3. Build constellation + trajectory cache
  const trajectoryCache = buildConstellation(profile, config.tleOmmData);

  // 4. Create engine
  const engine = createSimEngine({ profile, trajectoryCache });

  // 5. Run simulation loop
  const { durationSec, stepSec } = profile.timeControl;
  const totalTicks = Math.floor(durationSec / stepSec);

  const startMs = now();

  for (let tickNumber = 0; tickNumber < totalTicks; tickNumber++) {
    const timeSec = tickNumber * stepSec;
    engine.tick(timeSec, tickNumber);
  }

  const wallClockMs = now() - startMs;

  // 6. Finalize KPI
  const kpiBundle = engine.getKpiAccumulator().finalize(wallClockMs);

  // 7. Create trace artifacts
  const manifest = createRunManifest({
    profileId: profile.id,
    profileFamily: profile.family,
    presentationMode,
    orbitMode: profile.orbitMode,
    seed: profile.seed,
    durationSec,
    stepSec,
    engineVersion: '0.1.0',
  });

  const resolvedConfig = createResolvedConfig(
    manifest,
    profile as unknown as Record<string, unknown>,
    overrides as unknown as Record<string, unknown>,
  );

  const sourceTrace = createSourceTrace(
    profile.sourceMap.map((s) => ({
      modelFamily: profile.family,
      source: s,
      claimScope: s.note ?? '',
    })),
  );

  const { replayManifest } = createReplaySelectionPlan(
    profile,
    trajectoryCache,
    manifest.runId,
    presentationMode,
  );

  const replaySnapshots = recordWindow(
    createSimEngine({ profile, trajectoryCache }),
    totalTicks,
    stepSec,
    replayManifest.windowStartSec,
    replayManifest.windowEndSec,
  );
  const replayArtifact = createReplayArtifact(replayManifest, replaySnapshots);

  // C8: populate eventLog from KPI accumulator and kpiBundle from finalized result
  const eventLog = engine.getKpiAccumulator().getEventLog();
  const kpiBundleShell = {
    totalTicks: kpiBundle.totalTicks,
    wallClockMs: kpiBundle.wallClockMs,
    metrics: kpiBundle as unknown as Record<string, number>,
  };
  const artifactBundle = createRunArtifactBundle(
    manifest,
    resolvedConfig,
    sourceTrace,
    replayManifest,
    replayArtifact,
    eventLog,
    kpiBundleShell,
  );

  // 8. Return result
  return {
    profileId: profile.id,
    handoverType: profile.handover.type,
    seed: profile.seed,
    durationSec,
    kpiBundle,
    artifactBundle,
    wallClockMs,
  };
}

// ---------------------------------------------------------------------------
// executeComparison
// ---------------------------------------------------------------------------

/**
 * Execute A/B comparison: baseline (A4) vs DAPS.
 * Both runs use the same seed for deterministic comparison.
 */
export function executeComparison(profileId: string): ComparisonResult {
  // Load once to get the seed (ensures both runs use same seed)
  const baseProfile = loadProfile(profileId);
  const seed = baseProfile.seed;

  const baseline = executeBenchmarkRun({
    profileId,
    handoverTypeOverride: 'a4-event',
    seedOverride: seed,
  });

  const daps = executeBenchmarkRun({
    profileId,
    handoverTypeOverride: 'daps',
    seedOverride: seed,
  });

  const diff = computeKpiDiff(baseline.kpiBundle, daps.kpiBundle);

  return { baseline, daps, diff };
}

// ---------------------------------------------------------------------------
// KPI diff computation
// ---------------------------------------------------------------------------

function computeKpiDiff(baseline: KpiBundle, daps: KpiBundle): KpiDiff {
  // Diffs: daps - baseline
  const handoverCountDiff = daps.totalHandovers - baseline.totalHandovers;
  const hoFailureDiff = daps.handoverFailures - baseline.handoverFailures;
  const pingPongDiff = daps.pingPongCount - baseline.pingPongCount;
  const meanSinrDiffDb = daps.meanSinrDb - baseline.meanSinrDb;
  const meanThroughputDiffMbps = daps.meanThroughputMbps - baseline.meanThroughputMbps;
  const serviceAvailabilityDiff = daps.serviceAvailability - baseline.serviceAvailability;

  const improvements: string[] = [];
  const regressions: string[] = [];

  // Fewer handovers = better (less signaling overhead)
  if (handoverCountDiff < 0) {
    improvements.push(`Handovers reduced by ${-handoverCountDiff}`);
  } else if (handoverCountDiff > 0) {
    regressions.push(`Handovers increased by ${handoverCountDiff}`);
  }

  // Fewer failures = better
  if (hoFailureDiff < 0) {
    improvements.push(`HO failures reduced by ${-hoFailureDiff}`);
  } else if (hoFailureDiff > 0) {
    regressions.push(`HO failures increased by ${hoFailureDiff}`);
  }

  // Fewer ping-pongs = better
  if (pingPongDiff < 0) {
    improvements.push(`Ping-pong reduced by ${-pingPongDiff}`);
  } else if (pingPongDiff > 0) {
    regressions.push(`Ping-pong increased by ${pingPongDiff}`);
  }

  // Higher SINR = better
  if (meanSinrDiffDb > 0.1) {
    improvements.push(`Mean SINR improved by ${meanSinrDiffDb.toFixed(2)} dB`);
  } else if (meanSinrDiffDb < -0.1) {
    regressions.push(`Mean SINR degraded by ${(-meanSinrDiffDb).toFixed(2)} dB`);
  }

  // Higher throughput = better
  if (meanThroughputDiffMbps > 0.1) {
    improvements.push(`Mean throughput improved by ${meanThroughputDiffMbps.toFixed(2)} Mbps`);
  } else if (meanThroughputDiffMbps < -0.1) {
    regressions.push(`Mean throughput degraded by ${(-meanThroughputDiffMbps).toFixed(2)} Mbps`);
  }

  // Higher availability = better
  if (serviceAvailabilityDiff > 0.001) {
    improvements.push(`Service availability improved by ${(serviceAvailabilityDiff * 100).toFixed(2)}%`);
  } else if (serviceAvailabilityDiff < -0.001) {
    regressions.push(`Service availability degraded by ${(-serviceAvailabilityDiff * 100).toFixed(2)}%`);
  }

  return {
    handoverCountDiff,
    hoFailureDiff,
    pingPongDiff,
    meanSinrDiffDb,
    meanThroughputDiffMbps,
    serviceAvailabilityDiff,
    improvements,
    regressions,
  };
}
