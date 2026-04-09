#!/usr/bin/env node
/**
 * validate-replay-manifest.ts
 *
 * FC-1 replay closure validation:
 *   - deterministic window selection is shared by frontend/headless paths
 *   - benchmark artifacts persist replayManifest metadata
 *   - recordWindow preserves the same truth/timing as slicing the full run
 *   - KPI bundles can be recomputed from snapshot traces deterministically
 *
 * Usage:
 *   node --import tsx scripts/validate-replay-manifest.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadProfile } from '../src/core/profiles/loader';
import { recomputeKpiFromSnapshots } from '../src/core/kpi/recompute';
import { resolveProfileOrbitElements, buildProfileTrajectoryCache } from '../src/core/orbit/profile-runtime';
import { createSimEngine } from '../src/core/engine';
import { loadOmmRecords } from '../src/core/orbit/tle-loader';
import { createReplaySelectionPlan } from '../src/runner/curation';
import { executeBenchmarkRun } from '../src/runner/headless/benchmark-runner';
import { createReplayArtifact } from '../src/core/trace/factory';
import { recordRun, recordWindow, createReplayController } from '../src/runner/replay/controller';
import type { ProfileConfig } from '../src/core/profiles/types';
import type { TrajectoryCache } from '../src/core/orbit/types';
import type { OmmRecord } from '../src/core/orbit/tle-loader';
import type { ReplayManifest } from '../src/core/trace/types';
import type { SimulationSnapshot } from '../src/core/common/types';
import type { KpiBundle } from '../src/core/kpi/types';

let failures = 0;

function pass(label: string, detail = '') {
  console.log(`  [PASS] ${label}${detail ? `: ${detail}` : ''}`);
}

function fail(label: string, detail = '') {
  failures++;
  console.log(`  [FAIL] ${label}${detail ? `: ${detail}` : ''}`);
}

function checkBool(label: string, condition: boolean, detail = '') {
  if (condition) pass(label, detail);
  else fail(label, detail);
}

function checkAbs(label: string, actual: number, expected: number, tol: number, unit = '') {
  const diff = Math.abs(actual - expected);
  const ok = diff <= tol;
  const detail = `${actual.toFixed(4)}${unit ? ` ${unit}` : ''} vs ${expected.toFixed(4)}${unit ? ` ${unit}` : ''} (tol ±${tol})`;
  if (ok) pass(label, detail);
  else fail(label, detail);
}

function loadFixtureRecords(profile: ProfileConfig): OmmRecord[] | undefined {
  if (profile.orbitMode !== 'real-trace' || !profile.tleDataPath) return undefined;
  const filePath = resolve(import.meta.dirname, '..', profile.tleDataPath);
  return JSON.parse(readFileSync(filePath, 'utf-8')) as OmmRecord[];
}

/**
 * Build trajectory cache using the same canonical path as executeBenchmarkRun.
 * Using resolveProfileOrbitElements ensures phasingFactor and extra_shells are
 * included — matching the benchmark runner exactly so window selection and KPI
 * comparisons in this script are deterministic against the artifact.
 */
function buildCache(profile: ProfileConfig, tleOmmData?: OmmRecord[]): TrajectoryCache {
  const elements = resolveProfileOrbitElements(profile, tleOmmData);
  return buildProfileTrajectoryCache(profile, elements);
}

function compareManifestIdentity(label: string, a: ReplayManifest, b: ReplayManifest) {
  checkAbs(`${label} windowStartSec`, a.windowStartSec, b.windowStartSec, 0.0001, 's');
  checkAbs(`${label} windowEndSec`, a.windowEndSec, b.windowEndSec, 0.0001, 's');
  checkBool(`${label} selectionCriteria`, a.selectionCriteria === b.selectionCriteria, a.selectionCriteria);
  checkBool(`${label} selectionMethod`, a.selectionMethod === b.selectionMethod, a.selectionMethod);
}

function snapshotSignature(snapshot: SimulationSnapshot): string {
  return JSON.stringify(snapshot);
}

function compareKpiBundles(label: string, actual: KpiBundle, expected: KpiBundle) {
  const mismatches: string[] = [];

  for (const key of Object.keys(expected) as (keyof KpiBundle)[]) {
    const actualValue = actual[key];
    const expectedValue = expected[key];

    if (Number.isNaN(actualValue) && Number.isNaN(expectedValue)) {
      continue;
    }

    const tol =
      Number.isInteger(actualValue) && Number.isInteger(expectedValue)
        ? 0
        : 1e-9;

    if (Math.abs(actualValue - expectedValue) > tol) {
      mismatches.push(
        `${String(key)} ${actualValue.toFixed(6)} vs ${expectedValue.toFixed(6)}`,
      );
    }
  }

  checkBool(
    label,
    mismatches.length === 0,
    mismatches.length === 0
      ? `${Object.keys(expected).length} fields matched`
      : mismatches.slice(0, 4).join('; '),
  );
}

function validateProfile(profileId: string) {
  console.log(`\n=== Replay Manifest Validation: ${profileId} ===\n`);

  const profile = loadProfile(profileId);
  const tleData = loadFixtureRecords(profile);
  const cache = buildCache(profile, tleData);

  const benchmarkRun = executeBenchmarkRun({
    profileId,
    presentationMode: 'benchmark',
    tleOmmData: tleData,
  });
  const artifactReplayManifest = benchmarkRun.artifactBundle.replayManifest;
  const artifactReplayArtifact = benchmarkRun.artifactBundle.replayArtifact;
  checkBool('artifact bundle carries replayManifest', artifactReplayManifest !== undefined);
  checkBool('artifact bundle carries replayArtifact', artifactReplayArtifact !== undefined);
  if (!artifactReplayManifest || !artifactReplayArtifact) return;

  compareManifestIdentity(
    'artifact replayArtifact manifest matches artifact replayManifest',
    artifactReplayArtifact.replayManifest,
    artifactReplayManifest,
  );

  const benchmarkPlan = createReplaySelectionPlan(
    profile,
    cache,
    benchmarkRun.artifactBundle.manifest.runId,
    'benchmark',
  );

  compareManifestIdentity(
    'benchmark artifact matches shared replay plan',
    artifactReplayManifest,
    benchmarkPlan.replayManifest,
  );

  const showcasePlanA = createReplaySelectionPlan(
    profile,
    cache,
    `replay-${profile.id}-${profile.seed}`,
    'showcase',
  );
  const showcasePlanB = createReplaySelectionPlan(
    profile,
    cache,
    `replay-${profile.id}-${profile.seed}`,
    'showcase',
  );

  compareManifestIdentity(
    'showcase replay selection deterministic',
    showcasePlanA.replayManifest,
    showcasePlanB.replayManifest,
  );

  checkAbs(
    'frontend/showcase and benchmark use same window start',
    showcasePlanA.replayManifest.windowStartSec,
    artifactReplayManifest.windowStartSec,
    0.0001,
    's',
  );
  checkAbs(
    'frontend/showcase and benchmark use same window end',
    showcasePlanA.replayManifest.windowEndSec,
    artifactReplayManifest.windowEndSec,
    0.0001,
    's',
  );
  checkBool(
    'frontend/showcase and benchmark use same selection reason',
    showcasePlanA.replayManifest.selectionCriteria === artifactReplayManifest.selectionCriteria,
    artifactReplayManifest.selectionCriteria,
  );

  const totalTicks = Math.floor(profile.timeControl.durationSec / profile.timeControl.stepSec);
  const fullEngine = createSimEngine({ profile, trajectoryCache: cache });
  const fullSnapshots = recordRun(fullEngine, totalTicks, profile.timeControl.stepSec);
  const fullReplayKpi = recomputeKpiFromSnapshots({
    snapshots: fullSnapshots,
    bandwidthMhz: profile.rf.bandwidth_mhz,
    wallClockMs: benchmarkRun.kpiBundle.wallClockMs,
  });

  compareKpiBundles(
    'headless full-run KPI matches snapshot recomputation',
    fullReplayKpi,
    benchmarkRun.kpiBundle,
  );

  const windowEngine = createSimEngine({ profile, trajectoryCache: cache });
  const windowSnapshots = recordWindow(
    windowEngine,
    totalTicks,
    profile.timeControl.stepSec,
    artifactReplayManifest.windowStartSec,
    artifactReplayManifest.windowEndSec,
  );

  const slicedSnapshots = fullSnapshots.filter(
    (snapshot) =>
      snapshot.timeSec >= artifactReplayManifest.windowStartSec &&
      snapshot.timeSec <= artifactReplayManifest.windowEndSec,
  );

  checkBool(
    'recordWindow count matches full-run slice',
    windowSnapshots.length === slicedSnapshots.length,
    `${windowSnapshots.length} vs ${slicedSnapshots.length}`,
  );

  const sameSnapshots =
    windowSnapshots.length === slicedSnapshots.length &&
    windowSnapshots.every((snapshot, index) => snapshotSignature(snapshot) === snapshotSignature(slicedSnapshots[index]));

  checkBool(
    'recordWindow preserves full-run truth inside replay window',
    sameSnapshots,
    `${windowSnapshots.length} snapshots compared`,
  );

  const slicedWindowKpi = recomputeKpiFromSnapshots({
    snapshots: slicedSnapshots,
    bandwidthMhz: profile.rf.bandwidth_mhz,
  });
  const artifactReplayKpi = recomputeKpiFromSnapshots({
    snapshots: artifactReplayArtifact.snapshots,
    bandwidthMhz: profile.rf.bandwidth_mhz,
  });

  compareKpiBundles(
    'replayArtifact window KPI matches authoritative full-run slice',
    artifactReplayKpi,
    slicedWindowKpi,
  );

  const localReplayArtifact = createReplayArtifact(artifactReplayManifest, windowSnapshots);

  checkBool(
    'replayArtifact snapshot count matches reconstructed window',
    artifactReplayArtifact.snapshots.length === localReplayArtifact.snapshots.length,
    `${artifactReplayArtifact.snapshots.length} vs ${localReplayArtifact.snapshots.length}`,
  );
  checkBool(
    'replayArtifact identity signature matches reconstructed window',
    artifactReplayArtifact.identity.signature === localReplayArtifact.identity.signature,
    `${artifactReplayArtifact.identity.signature} vs ${localReplayArtifact.identity.signature}`,
  );
  checkBool(
    'replayArtifact identity samples match reconstructed window',
    JSON.stringify(artifactReplayArtifact.identity.samples) === JSON.stringify(localReplayArtifact.identity.samples),
    `${artifactReplayArtifact.identity.samples.length} samples`,
  );

  const replayController = createReplayController({
    artifactBundle: benchmarkRun.artifactBundle,
    replayManifest: artifactReplayManifest,
    playbackSpeed: 1,
  });

  const replayState = replayController.getState();
  checkAbs(
    'replay controller windowStartSec matches manifest',
    replayState.windowStartSec,
    artifactReplayManifest.windowStartSec,
    0.0001,
    's',
  );
  checkAbs(
    'replay controller windowEndSec matches manifest',
    replayState.windowEndSec,
    artifactReplayManifest.windowEndSec,
    0.0001,
    's',
  );
  checkAbs(
    'replay controller initial snapshot time matches manifest start',
    replayController.getSnapshot().timeSec,
    artifactReplayManifest.windowStartSec,
    0.0001,
    's',
  );
  checkBool(
    'replay controller initial snapshot matches replayArtifact first snapshot',
    snapshotSignature(replayController.getSnapshot()) === snapshotSignature(artifactReplayArtifact.snapshots[0]),
  );
}

validateProfile('case9-access-baseline');
validateProfile('real-trace-validation');

console.log('\n════════════════════════════════════════════');
if (failures > 0) {
  console.log(`FAIL — ${failures} replay-manifest validation issue(s) found`);
  console.log('════════════════════════════════════════════');
  process.exit(1);
} else {
  console.log('ALL REPLAY-MANIFEST CHECKS PASSED');
  console.log('════════════════════════════════════════════');
  process.exit(0);
}
