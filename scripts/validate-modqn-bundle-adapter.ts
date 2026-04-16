#!/usr/bin/env node
/**
 * VAL-MODQN-BUNDLE-001: Phase 03A consumer adapter validation.
 *
 * Covers:
 *   1. Schema/version guard (positive + negative paths)
 *   2. Timeline row parsing (including tightened null-geometry rejection
 *      and mask/beam length consistency)
 *   3. Replay frame consistency (slot grouping, deep geometry equality,
 *      decisionTimeSec drift)
 *   4. Fixture bundle load via Node fs reader
 *   5. In-memory reader round trip (including required-file / required-dir
 *      missing cases)
 *   6. Optional decision-mask fallback stays readable for legal older bundles
 *   7. Optional producer diagnostics load when present and stay absent-honest
 *      for older bundles without the additive fields
 *
 * Governance:
 *   - Consumer SDD: sdd/modqn-bundle-replay-consumer-sdd.md
 *   - Producer SDD: modqn-paper-reproduction/docs/phases/phase-03a-ntn-sim-core-bundle-replay-integration-sdd.md
 */

import { fileURLToPath } from 'node:url';
import { readFile, access, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  ModqnBundleSchemaError,
  REQUIRED_BUNDLE_DIRECTORIES,
  REQUIRED_BUNDLE_FILES,
  REQUIRED_TIMELINE_ROW_FIELDS,
  SUPPORTED_BUNDLE_SCHEMA_VERSIONS,
  SUPPORTED_REPLAY_TRUTH_MODES,
  SUPPORTED_TIMELINE_FORMAT_VERSIONS,
  assertManifestShape,
  buildReplayFrames,
  createMemoryFileReader,
  loadModqnReplayBundle,
  parseTimelineJsonl,
} from '../src/adapters/modqn-bundle';
import { ModqnBundleReplayViewModel } from '../src/viz/view-models/modqn-bundle-replay-view-model';
import type {
  ModqnBundleFileReader,
  ModqnBundleManifest,
  ModqnReplayBundle,
  ModqnTimelineRow,
} from '../src/adapters/modqn-bundle';

/**
 * Inline node-fs reader. Lives in the script (not in `src/adapters`) so the
 * library itself stays I/O-agnostic and browser-friendly. Slice C will add a
 * fetch-based reader next to the UI hook layer.
 */
function createNodeFileReader(bundleDir: string): ModqnBundleFileReader {
  return {
    async readText(relativePath: string) {
      return readFile(path.join(bundleDir, relativePath), 'utf8');
    },
    async exists(relativePath: string) {
      try {
        const info = await stat(path.join(bundleDir, relativePath));
        return info.isFile();
      } catch {
        return false;
      }
    },
    async existsDirectory(relativePath: string) {
      try {
        const info = await stat(path.join(bundleDir, relativePath));
        return info.isDirectory();
      } catch {
        return false;
      }
    },
  };
}

const failures: string[] = [];

function pass(label: string, detail?: string) {
  console.log(`[PASS] ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, detail: string) {
  failures.push(`${label}: ${detail}`);
  console.error(`[FAIL] ${label} — ${detail}`);
}

function check(label: string, condition: boolean, detail: string) {
  if (condition) {
    pass(label, detail);
  } else {
    fail(label, detail);
  }
}

async function expectSchemaError<T>(
  label: string,
  expectedCode: string,
  body: () => Promise<T> | T,
): Promise<void> {
  try {
    await body();
    fail(label, `expected ModqnBundleSchemaError(${expectedCode}) but no error was thrown`);
  } catch (err) {
    if (err instanceof ModqnBundleSchemaError && err.code === expectedCode) {
      pass(label, expectedCode);
      return;
    }
    if (err instanceof ModqnBundleSchemaError) {
      fail(
        label,
        `expected code ${expectedCode} but got ${err.code} (${err.message})`,
      );
      return;
    }
    fail(label, `expected ModqnBundleSchemaError but got ${(err as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Base manifest used by both the schema-guard unit tests and the in-memory
 * reader round trip. The default shape MUST mirror the real producer output
 * in `modqn-paper-reproduction/.../export/replay_bundle.py` so that fixture
 * drift can never hide a producer/consumer contract gap. The producer emits
 * `checkpointRule` as a structured dict (see
 * `MODQNTrainer.checkpoint_rule()`), so the base shape does the same.
 *
 * Back-compat for the legacy string-shaped `checkpointRule` is still exercised
 * by a dedicated test case below ("accepts legacy string-form checkpointRule").
 */
function baseManifestObject(): Record<string, unknown> {
  return {
    paperId: 'PAP-2024-MORL-MULTIBEAM',
    runId: 'unit-test',
    bundleSchemaVersion: SUPPORTED_BUNDLE_SCHEMA_VERSIONS[0],
    producerVersion: 'unit-test-0.0.0',
    exportedAt: '2026-04-13T00:00:00+00:00',
    sourceArtifactDir: '/tmp/x',
    checkpointRule: {
      assumption_id: 'ASSUME-MODQN-REP-015',
      primary_report: 'final-episode-policy',
      secondary_report: 'best-weighted-reward-on-eval',
      secondary_implemented: true,
      secondary_status:
        'best-eval checkpoint captured from mean weighted reward over 5 evaluation seeds; evaluated every 50 episodes and at the final episode',
    },
    replayTruthMode: SUPPORTED_REPLAY_TRUTH_MODES[0],
    timelineFormatVersion: SUPPORTED_TIMELINE_FORMAT_VERSIONS[0],
    coordinateFrame: {
      userPosition:
        'geodetic-deg + local-tangent-east-north-km anchored at ground_point=(0.000000, 0.000000)',
      satellitePosition: 'eci-km-no-earth-rotation',
      beamCenter:
        'geodetic-deg + local-tangent-east-north-km anchored at ground_point=(0.000000, 0.000000)',
      groundPoint: { latDeg: 0, lonDeg: 0 },
    },
    slotIndexSemantics: {
      firstIndex: 1,
      note: 'Slot indices start at 1.',
    },
  };
}

function minimalRow(slotIndex: number, userId: string): ModqnTimelineRow {
  return {
    slotIndex,
    timeSec: slotIndex,
    decisionTimeSec: slotIndex - 1,
    userId,
    userIndex: Number.parseInt(userId.replace(/[^0-9]/g, ''), 10),
    userPosition: {
      latDeg: 40,
      lonDeg: 116,
      localTangentKm: { east: 0, north: 0 },
    },
    previousServing: {
      beamId: 'sat-0-beam-0',
      beamIndex: 0,
      satId: 'sat-0',
      satIndex: 0,
      localBeamIndex: 0,
    },
    selectedServing: {
      beamId: 'sat-0-beam-0',
      beamIndex: 0,
      satId: 'sat-0',
      satIndex: 0,
      localBeamIndex: 0,
    },
    handoverEvent: { kind: 'none', eventId: null },
    visibilityMask: [true],
    actionValidityMask: [true],
    beamLoads: [1],
    rewardVector: { r1Throughput: 1, r2Handover: 0, r3LoadBalance: 1 },
    scalarReward: 1,
    satelliteStates: [
      {
        satId: 'sat-0',
        satIndex: 0,
        trueAnomalyDeg: 0,
        positionEciKm: { x: 7000, y: 0, z: 0 },
        subSatellitePoint: { latDeg: 40, lonDeg: 116 },
      },
    ],
    beamStates: [
      {
        beamId: 'sat-0-beam-0',
        beamIndex: 0,
        satId: 'sat-0',
        satIndex: 0,
        localBeamIndex: 0,
        centerPosition: { latDeg: 40, lonDeg: 116 },
        centerLocalTangentKm: { east: 0, north: 0 },
      },
    ],
    kpiOverlay: {
      userThroughputBps: 1,
      selectedBeamLoad: 1,
      selectedBeamThroughputBps: 1,
      handoverOccurred: false,
    },
  };
}

// ---------------------------------------------------------------------------
// Test sections
// ---------------------------------------------------------------------------

async function validateSchemaGuard() {
  console.log('\n== VAL-MODQN-BUNDLE-001A: schema/version guard ==');

  // Baseline shape mirrors the real producer: `checkpointRule` is a structured
  // dict (see `MODQNTrainer.checkpoint_rule()`), `coordinateFrame.groundPoint`
  // is present, and `slotIndexSemantics` is declared. A passing baseline is
  // therefore a direct "real producer bundle loads" smoke test for the guard.
  const baseline = assertManifestShape(baseManifestObject());
  check(
    'baseline manifest accepted (real producer shape)',
    baseline.bundleSchemaVersion === SUPPORTED_BUNDLE_SCHEMA_VERSIONS[0] &&
      typeof baseline.checkpointRule === 'object' &&
      baseline.checkpointRule !== null &&
      baseline.coordinateFrame.groundPoint?.latDeg === 0 &&
      baseline.slotIndexSemantics?.firstIndex === 1,
    baseline.bundleSchemaVersion,
  );

  // Legacy back-compat: a producer that still emits `checkpointRule` as a
  // plain string must keep loading. The consumer union is
  // `string | object | null`; this case covers the string arm so we do not
  // silently regress the legacy surface when the fixture moves to object form.
  const legacyStringManifest = {
    ...baseManifestObject(),
    checkpointRule: 'final-episode-policy',
  };
  const legacyString = assertManifestShape(legacyStringManifest);
  check(
    'accepts legacy string-form checkpointRule (back-compat)',
    typeof legacyString.checkpointRule === 'string' &&
      legacyString.checkpointRule === 'final-episode-policy',
    String(legacyString.checkpointRule),
  );

  // Null checkpointRule must also be accepted (producer can emit null when
  // `run_metadata.checkpoint_rule` is absent on older artifacts).
  const nullCheckpointManifest = {
    ...baseManifestObject(),
    checkpointRule: null,
  };
  const nullCheckpoint = assertManifestShape(nullCheckpointManifest);
  check(
    'accepts null checkpointRule',
    nullCheckpoint.checkpointRule === null,
    String(nullCheckpoint.checkpointRule),
  );

  // Structurally-empty checkpointRule object must also be accepted. Every
  // field on `ModqnBundleCheckpointRule` is optional; a regression from
  // five fields to zero is a producer-side concern, not a consumer schema
  // error. Consumer UI code that needs a specific field should surface a
  // "not disclosed" fallback, never fabricate a default.
  const emptyObjectCheckpointManifest = {
    ...baseManifestObject(),
    checkpointRule: {},
  };
  const emptyObjectCheckpoint = assertManifestShape(emptyObjectCheckpointManifest);
  check(
    'accepts structurally-empty checkpointRule object',
    typeof emptyObjectCheckpoint.checkpointRule === 'object' &&
      emptyObjectCheckpoint.checkpointRule !== null &&
      Object.keys(emptyObjectCheckpoint.checkpointRule).length === 0,
    'accepted',
  );

  // Positive coverage for the optionality of Slice A hardening fields:
  // producers that don't ship `coordinateFrame.groundPoint` or
  // `slotIndexSemantics` must still load, otherwise the fields are
  // effectively required, not optional.
  const absentGroundPointManifest = baseManifestObject();
  const absentCoordinateFrame = {
    ...(absentGroundPointManifest.coordinateFrame as Record<string, unknown>),
  };
  delete (absentCoordinateFrame as Record<string, unknown>).groundPoint;
  absentGroundPointManifest.coordinateFrame = absentCoordinateFrame;
  const absentGroundPoint = assertManifestShape(absentGroundPointManifest);
  check(
    'accepts bundle with absent coordinateFrame.groundPoint',
    absentGroundPoint.coordinateFrame.groundPoint === undefined,
    'absent',
  );

  const absentSlotSemanticsManifest = baseManifestObject();
  delete (absentSlotSemanticsManifest as Record<string, unknown>).slotIndexSemantics;
  const absentSlotSemantics = assertManifestShape(absentSlotSemanticsManifest);
  check(
    'accepts bundle with absent slotIndexSemantics',
    absentSlotSemantics.slotIndexSemantics === undefined,
    'absent',
  );

  // Negative: explicit `null` for optional Slice A fields is a drift
  // signal from the producer (the producer should either emit the field
  // with a valid shape or omit the key entirely). We reject these so the
  // contract is unambiguous.
  await expectSchemaError(
    'rejects coordinateFrame.groundPoint=null (explicit null is drift, not absence)',
    'MANIFEST_COORDINATE_FRAME_GROUND_POINT',
    () =>
      assertManifestShape({
        ...baseManifestObject(),
        coordinateFrame: {
          userPosition: 'x',
          satellitePosition: 'x',
          beamCenter: 'x',
          groundPoint: null as unknown as { latDeg: number; lonDeg: number },
        },
      }),
  );

  await expectSchemaError(
    'rejects slotIndexSemantics=null (explicit null is drift, not absence)',
    'MANIFEST_SLOT_INDEX_SEMANTICS_SHAPE',
    () =>
      assertManifestShape({
        ...baseManifestObject(),
        slotIndexSemantics: null as unknown as { firstIndex: number; note: string },
      }),
  );

  await expectSchemaError(
    'rejects optionalPolicyDiagnostics=null (explicit null is drift, not absence)',
    'MANIFEST_OPTIONAL_POLICY_DIAGNOSTICS_TYPE',
    () =>
      assertManifestShape({
        ...baseManifestObject(),
        optionalPolicyDiagnostics: null,
      }),
  );

  await expectSchemaError(
    'rejects unsupported bundleSchemaVersion',
    'UNSUPPORTED_BUNDLE_SCHEMA_VERSION',
    () => assertManifestShape({ ...baseManifestObject(), bundleSchemaVersion: 'phase-03a-replay-bundle-v999' }),
  );

  await expectSchemaError(
    'rejects unsupported timelineFormatVersion',
    'UNSUPPORTED_TIMELINE_FORMAT_VERSION',
    () => assertManifestShape({ ...baseManifestObject(), timelineFormatVersion: 'step-trace.jsonl/v999' }),
  );

  await expectSchemaError(
    'rejects unsupported replayTruthMode',
    'UNSUPPORTED_REPLAY_TRUTH_MODE',
    () => assertManifestShape({ ...baseManifestObject(), replayTruthMode: 'native-recompute' }),
  );

  await expectSchemaError(
    'rejects manifest missing required fields',
    'MANIFEST_MISSING_FIELDS',
    () => {
      const missing = baseManifestObject();
      delete (missing as Record<string, unknown>).coordinateFrame;
      return assertManifestShape(missing);
    },
  );

  await expectSchemaError(
    'rejects manifest with non-object root',
    'MANIFEST_NOT_OBJECT',
    () => assertManifestShape('not-a-manifest'),
  );

  await expectSchemaError(
    'rejects checkpointRule with a wrong type (number)',
    'MANIFEST_CHECKPOINT_RULE_TYPE',
    () =>
      assertManifestShape({
        ...baseManifestObject(),
        checkpointRule: 42 as unknown as string,
      }),
  );

  await expectSchemaError(
    'rejects coordinateFrame.groundPoint missing latDeg',
    'MANIFEST_COORDINATE_FRAME_GROUND_POINT',
    () =>
      assertManifestShape({
        ...baseManifestObject(),
        coordinateFrame: {
          userPosition: 'x',
          satellitePosition: 'x',
          beamCenter: 'x',
          groundPoint: { lonDeg: 0 } as unknown as { latDeg: number; lonDeg: number },
        },
      }),
  );

  await expectSchemaError(
    'rejects slotIndexSemantics with non-numeric firstIndex',
    'MANIFEST_SLOT_INDEX_SEMANTICS_SHAPE',
    () =>
      assertManifestShape({
        ...baseManifestObject(),
        slotIndexSemantics: { firstIndex: 'one', note: 'broken' },
      }),
  );
}

async function validateTimelineParser() {
  console.log('\n== VAL-MODQN-BUNDLE-001B: timeline parser ==');

  const happyJsonl = `${JSON.stringify(minimalRow(1, 'user-0'))}\n${JSON.stringify(minimalRow(2, 'user-0'))}\n`;
  const rows = parseTimelineJsonl(happyJsonl);
  check('parses two valid rows', rows.length === 2, String(rows.length));
  check('first row has slotIndex=1', rows[0].slotIndex === 1, String(rows[0].slotIndex));
  check('preserves required field set',
    REQUIRED_TIMELINE_ROW_FIELDS.every((field) => field in rows[0]),
    REQUIRED_TIMELINE_ROW_FIELDS.join(','),
  );

  await expectSchemaError(
    'rejects empty timeline',
    'TIMELINE_EMPTY',
    () => parseTimelineJsonl(''),
  );

  await expectSchemaError(
    'rejects row missing satelliteStates',
    'TIMELINE_ROW_MISSING_FIELDS',
    () => {
      const broken = minimalRow(1, 'user-0') as unknown as Record<string, unknown>;
      delete broken.satelliteStates;
      return parseTimelineJsonl(`${JSON.stringify(broken)}\n`);
    },
  );

  await expectSchemaError(
    'rejects row with empty beamStates',
    'TIMELINE_ROW_BEAM_STATES_EMPTY',
    () => {
      const broken = { ...minimalRow(1, 'user-0'), beamStates: [] };
      return parseTimelineJsonl(`${JSON.stringify(broken)}\n`);
    },
  );

  await expectSchemaError(
    'rejects line with invalid JSON',
    'TIMELINE_ROW_JSON_PARSE',
    () => parseTimelineJsonl('{not json\n'),
  );

  // Tightened: null beam center geometry must hard-fail.
  await expectSchemaError(
    'rejects row with null beamState.centerPosition',
    'TIMELINE_ROW_BEAM_GEOMETRY_NULL',
    () => {
      const broken = minimalRow(1, 'user-0');
      broken.beamStates = [
        {
          ...broken.beamStates[0],
          centerPosition: null as unknown as { latDeg: number; lonDeg: number },
        },
      ];
      return parseTimelineJsonl(`${JSON.stringify(broken)}\n`);
    },
  );

  await expectSchemaError(
    'rejects row with null beamState.centerLocalTangentKm',
    'TIMELINE_ROW_BEAM_GEOMETRY_NULL',
    () => {
      const broken = minimalRow(1, 'user-0');
      broken.beamStates = [
        {
          ...broken.beamStates[0],
          centerLocalTangentKm: null as unknown as { east: number; north: number },
        },
      ];
      return parseTimelineJsonl(`${JSON.stringify(broken)}\n`);
    },
  );

  // Tightened: satelliteStates missing finite positionEciKm must hard-fail.
  await expectSchemaError(
    'rejects row with non-finite satellite positionEciKm',
    'TIMELINE_ROW_SATELLITE_GEOMETRY_NULL',
    () => {
      const broken = minimalRow(1, 'user-0');
      broken.satelliteStates = [
        {
          ...broken.satelliteStates[0],
          positionEciKm: { x: Number.NaN, y: 0, z: 0 },
        },
      ];
      return parseTimelineJsonl(`${JSON.stringify(broken)}\n`);
    },
  );

  await expectSchemaError(
    'rejects explicit null policyDiagnostics',
    'TIMELINE_ROW_POLICY_DIAGNOSTICS_TYPE',
    () => {
      const broken = {
        ...minimalRow(1, 'user-0'),
        policyDiagnostics: null,
      };
      return parseTimelineJsonl(`${JSON.stringify(broken)}\n`);
    },
  );

  // Tightened: mask / beam array length mismatch must hard-fail.
  await expectSchemaError(
    'rejects row with visibilityMask length ≠ beamStates length',
    'TIMELINE_ROW_BEAM_ARRAY_LENGTH_MISMATCH',
    () => {
      const broken = minimalRow(1, 'user-0');
      broken.visibilityMask = [true, false]; // beamStates has length 1
      return parseTimelineJsonl(`${JSON.stringify(broken)}\n`);
    },
  );

  await expectSchemaError(
    'rejects row with beamLoads length ≠ beamStates length',
    'TIMELINE_ROW_BEAM_ARRAY_LENGTH_MISMATCH',
    () => {
      const broken = minimalRow(1, 'user-0');
      broken.beamLoads = [1, 2, 3];
      return parseTimelineJsonl(`${JSON.stringify(broken)}\n`);
    },
  );

  await expectSchemaError(
    'rejects row with beamThroughputs length ≠ beamStates length',
    'TIMELINE_ROW_BEAM_ARRAY_LENGTH_MISMATCH',
    () => {
      const broken = minimalRow(1, 'user-0');
      broken.beamThroughputs = [1.0, 2.0];
      return parseTimelineJsonl(`${JSON.stringify(broken)}\n`);
    },
  );
}

async function validateReplayFrameAdapter() {
  console.log('\n== VAL-MODQN-BUNDLE-001C: replay-frame adapter ==');

  const rows = [
    minimalRow(1, 'user-0'),
    minimalRow(1, 'user-1'),
    minimalRow(2, 'user-0'),
    minimalRow(2, 'user-1'),
  ];
  const frames = buildReplayFrames(rows);
  check('produces 2 frames for 2 slots × 2 users', frames.length === 2, String(frames.length));
  check('slot 1 frame holds 2 users', frames[0].users.length === 2, String(frames[0].users.length));
  check('frames sorted by slotIndex',
    frames[0].slotIndex < frames[1].slotIndex,
    `${frames[0].slotIndex} < ${frames[1].slotIndex}`,
  );

  // Ordering-level mismatch still caught.
  await expectSchemaError(
    'rejects mismatched satellite geometry across users in a slot (different satId)',
    'FRAME_SATELLITE_GEOMETRY_DISAGREEMENT',
    () => {
      const a = minimalRow(5, 'user-0');
      const b = minimalRow(5, 'user-1');
      b.satelliteStates = [
        { ...a.satelliteStates[0], satId: 'sat-1', satIndex: 1 },
      ];
      return buildReplayFrames([a, b]);
    },
  );

  // Tightened: same-ID numeric drift must hard-fail under deep equality.
  await expectSchemaError(
    'rejects same-slot same-ID satellite geometry drift',
    'FRAME_SATELLITE_GEOMETRY_DISAGREEMENT',
    () => {
      const a = minimalRow(6, 'user-0');
      const b = minimalRow(6, 'user-1');
      b.satelliteStates = [
        {
          ...a.satelliteStates[0],
          positionEciKm: { x: 7001, y: 0, z: 0 }, // drifted by 1 km
        },
      ];
      return buildReplayFrames([a, b]);
    },
  );

  await expectSchemaError(
    'rejects same-slot same-ID beam geometry drift',
    'FRAME_BEAM_GEOMETRY_DISAGREEMENT',
    () => {
      const a = minimalRow(7, 'user-0');
      const b = minimalRow(7, 'user-1');
      b.beamStates = [
        {
          ...a.beamStates[0],
          centerPosition: { latDeg: 40.00001, lonDeg: 116 }, // drift
        },
      ];
      return buildReplayFrames([a, b]);
    },
  );

  // Tightened: decisionTimeSec drift across the same slot must hard-fail.
  await expectSchemaError(
    'rejects decisionTimeSec drift across users in a slot',
    'FRAME_DECISION_TIME_DISAGREEMENT',
    () => {
      const a = minimalRow(8, 'user-0');
      const b = minimalRow(8, 'user-1');
      b.decisionTimeSec = (a.decisionTimeSec ?? 0) + 0.25;
      return buildReplayFrames([a, b]);
    },
  );

  await expectSchemaError(
    'rejects duplicate user in a slot',
    'FRAME_DUPLICATE_USER',
    () => buildReplayFrames([minimalRow(9, 'user-0'), minimalRow(9, 'user-0')]),
  );
}

function makeMemoryBundleFiles(): Record<string, string> {
  const manifest = baseManifestObject();
  const row1 = minimalRow(1, 'user-0');
  const row2 = minimalRow(2, 'user-0');
  row2.handoverEvent = { kind: 'inter-satellite-handover', eventId: 'handover-2-0' };

  return {
    'manifest.json': JSON.stringify(manifest),
    'config-resolved.json': JSON.stringify({ baseline: { satellites: 1 } }),
    'assumptions.json': JSON.stringify({ note: 'memory test' }),
    'provenance-map.json': JSON.stringify({ fields: {} }),
    'training/episode_metrics.csv': 'episode,mean_reward\n1,0.5\n',
    'training/loss_curves.csv': 'episode,step,loss\n1,0,0.1\n',
    'evaluation/summary.json': JSON.stringify({ slot_count: 2 }),
    'evaluation/sweeps/': '',
    'timeline/step-trace.jsonl': `${JSON.stringify(row1)}\n${JSON.stringify(row2)}\n`,
  };
}

async function validateMemoryReaderRoundTrip() {
  console.log('\n== VAL-MODQN-BUNDLE-001D: in-memory reader round trip ==');

  const memoryFiles = makeMemoryBundleFiles();
  const reader = createMemoryFileReader(memoryFiles);
  const bundle = await loadModqnReplayBundle(reader);
  check('bundle slotCount=2', bundle.slotCount === 2, String(bundle.slotCount));
  check('bundle userCount=1', bundle.userCount === 1, String(bundle.userCount));
  check('bundle rowCount=2', bundle.rowCount === 2, String(bundle.rowCount));
  check(
    'frameBySlotIndex returns slot-2 frame',
    bundle.frameBySlotIndex.get(2)?.users[0]?.handoverEvent.kind === 'inter-satellite-handover',
    bundle.frameBySlotIndex.get(2)?.users[0]?.handoverEvent.kind ?? 'missing',
  );

  // Negative: drop each required file one at a time.
  for (const relative of REQUIRED_BUNDLE_FILES) {
    const incomplete = { ...memoryFiles };
    delete incomplete[relative];
    await expectSchemaError(
      `rejects bundle missing required file: ${relative}`,
      'BUNDLE_INCOMPLETE',
      () => loadModqnReplayBundle(createMemoryFileReader(incomplete)),
    );
  }

  // Negative: drop the required directory surface.
  for (const directory of REQUIRED_BUNDLE_DIRECTORIES) {
    const incomplete = { ...memoryFiles };
    for (const key of Object.keys(incomplete)) {
      if (key === `${directory}/` || key.startsWith(`${directory}/`)) {
        delete incomplete[key];
      }
    }
    await expectSchemaError(
      `rejects bundle missing required directory: ${directory}/`,
      'BUNDLE_INCOMPLETE',
      () => loadModqnReplayBundle(createMemoryFileReader(incomplete)),
    );
  }

  // Sanity: the constants list still mentions every required file we test.
  check(
    'REQUIRED_BUNDLE_FILES covers manifest.json',
    REQUIRED_BUNDLE_FILES.includes('manifest.json'),
    REQUIRED_BUNDLE_FILES.join(','),
  );
  check(
    'REQUIRED_BUNDLE_FILES covers training/episode_metrics.csv',
    REQUIRED_BUNDLE_FILES.includes('training/episode_metrics.csv'),
    REQUIRED_BUNDLE_FILES.join(','),
  );
  check(
    'REQUIRED_BUNDLE_DIRECTORIES covers evaluation/sweeps',
    REQUIRED_BUNDLE_DIRECTORIES.includes('evaluation/sweeps'),
    REQUIRED_BUNDLE_DIRECTORIES.join(','),
  );
}

async function validateFixtureLoad() {
  console.log('\n== VAL-MODQN-BUNDLE-001E: on-disk fixture load ==');

  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixtureDir = path.resolve(here, '..', 'fixtures', 'modqn-bundle-sample');
  const reader = createNodeFileReader(fixtureDir);
  const bundle: ModqnReplayBundle = await loadModqnReplayBundle(reader);

  const manifest: ModqnBundleManifest = bundle.manifest;
  check(
    'fixture manifest schema version',
    manifest.bundleSchemaVersion === SUPPORTED_BUNDLE_SCHEMA_VERSIONS[0],
    manifest.bundleSchemaVersion,
  );
  check(
    'fixture keeps legacy string-form checkpointRule',
    typeof manifest.checkpointRule === 'string' &&
      manifest.checkpointRule === 'final-episode-policy',
    String(manifest.checkpointRule),
  );
  check('fixture has 2 slots', bundle.slotCount === 2, String(bundle.slotCount));
  check('fixture has 1 user', bundle.userCount === 1, String(bundle.userCount));

  const slot1 = bundle.frameBySlotIndex.get(1);
  const slot2 = bundle.frameBySlotIndex.get(2);
  check('fixture slot 1 present', !!slot1, slot1 ? 'present' : 'missing');
  check('fixture slot 2 present', !!slot2, slot2 ? 'present' : 'missing');

  if (slot1 && slot2) {
    check(
      'fixture slot 1 has no handover',
      slot1.users[0].handoverEvent.kind === 'none',
      slot1.users[0].handoverEvent.kind,
    );
    check(
      'fixture slot 2 has inter-satellite handover',
      slot2.users[0].handoverEvent.kind === 'inter-satellite-handover',
      slot2.users[0].handoverEvent.kind,
    );
    check(
      'fixture slot 2 selectedServing is sat-1/beam-0',
      slot2.users[0].selectedServing.beamId === 'sat-1-beam-0',
      slot2.users[0].selectedServing.beamId,
    );
    check(
      'fixture slot 2 has 4 beams',
      slot2.beamStates.length === 4,
      String(slot2.beamStates.length),
    );
    check(
      'fixture slot 2 has no null beam centers',
      slot2.beamStates.every(
        (beam) => beam.centerPosition !== null && beam.centerLocalTangentKm !== null,
      ),
      'all beams have geometry',
    );
  }

  // Check that required directories are present on disk.
  for (const directory of REQUIRED_BUNDLE_DIRECTORIES) {
    try {
      await access(path.join(fixtureDir, directory));
      pass(`fixture has required directory: ${directory}`);
    } catch {
      fail(`fixture has required directory: ${directory}`, 'missing on disk');
    }
  }

  // Provenance + evaluation summary surfaced as objects.
  check(
    'fixture provenance map preserved',
    bundle.provenanceMap !== null && typeof bundle.provenanceMap === 'object',
    'object',
  );
  check(
    'fixture evaluation summary preserved',
    bundle.evaluationSummary !== null &&
      typeof bundle.evaluationSummary === 'object' &&
      (bundle.evaluationSummary as Record<string, unknown>).bundle_schema_version ===
        SUPPORTED_BUNDLE_SCHEMA_VERSIONS[0],
    'bundle_schema_version match',
  );
}

async function validateProducerSampleBundle() {
  console.log('\n== VAL-MODQN-BUNDLE-001F: producer sample-bundle-v1 load ==');

  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixtureDir = path.resolve(here, '..', 'fixtures', 'sample-bundle-v1');
  try {
    await stat(fixtureDir);
  } catch {
    fail(
      'fixtures/sample-bundle-v1 present',
      'missing on disk — run npm run sync:modqn:fixture',
    );
    return;
  }

  const reader = createNodeFileReader(fixtureDir);
  const bundle: ModqnReplayBundle = await loadModqnReplayBundle(reader);

  const manifest: ModqnBundleManifest = bundle.manifest;
  check(
    'producer sample manifest schema version',
    manifest.bundleSchemaVersion === SUPPORTED_BUNDLE_SCHEMA_VERSIONS[0],
    manifest.bundleSchemaVersion,
  );
  check(
    'producer sample paperId',
    manifest.paperId === 'PAP-2024-MORL-MULTIBEAM',
    manifest.paperId,
  );
  check(
    'producer sample checkpointRule is structured object',
    typeof manifest.checkpointRule === 'object' && manifest.checkpointRule !== null,
    typeof manifest.checkpointRule,
  );
  if (
    typeof manifest.checkpointRule === 'object' &&
    manifest.checkpointRule !== null
  ) {
    check(
      'producer sample checkpointRule carries assumption_id',
      manifest.checkpointRule.assumption_id === 'ASSUME-MODQN-REP-015',
      manifest.checkpointRule.assumption_id ?? 'missing',
    );
  }
  check(
    'producer sample coordinateFrame.groundPoint present',
    !!manifest.coordinateFrame.groundPoint,
    manifest.coordinateFrame.groundPoint
      ? `lat=${manifest.coordinateFrame.groundPoint.latDeg}, lon=${manifest.coordinateFrame.groundPoint.lonDeg}`
      : 'missing',
  );
  check(
    'producer sample slotIndexSemantics.firstIndex is 1',
    manifest.slotIndexSemantics?.firstIndex === 1,
    String(manifest.slotIndexSemantics?.firstIndex ?? 'missing'),
  );
  check(
    'producer sample replaySeedSource recorded',
    !!manifest.replaySummary?.replaySeedSource,
    manifest.replaySummary?.replaySeedSource ?? 'missing',
  );
  check(
    'producer sample slotIndexOffset = 1',
    manifest.replaySummary?.slotIndexOffset === 1,
    String(manifest.replaySummary?.slotIndexOffset ?? 'missing'),
  );
  check(
    'producer sample sampleSubset disclosed',
    !!manifest.replaySummary?.sampleSubset,
    manifest.replaySummary?.sampleSubset
      ? `users=${manifest.replaySummary.sampleSubset.userIndices.length}, slots=${manifest.replaySummary.sampleSubset.slotIndices.length}`
      : 'missing',
  );
  check(
    'producer sample sampleNote present',
    typeof manifest.sampleNote === 'string' && manifest.sampleNote.length > 0,
    manifest.sampleNote ?? 'missing',
  );
  check(
    'producer sample slot count matches trimmed subset',
    bundle.slotCount === 10 && bundle.userCount === 1 && bundle.rowCount === 10,
    `slots=${bundle.slotCount} users=${bundle.userCount} rows=${bundle.rowCount}`,
  );
  check(
    'producer sample manifest discloses optionalPolicyDiagnostics coverage',
    manifest.optionalPolicyDiagnostics?.present === true
      && manifest.optionalPolicyDiagnostics.rowsWithDiagnostics === bundle.rowCount
      && manifest.optionalPolicyDiagnostics.rowsWithoutDiagnostics === 0,
    JSON.stringify(manifest.optionalPolicyDiagnostics ?? null),
  );

  // Smoke-check that every loaded frame has real satellite/beam geometry.
  const firstFrame = bundle.frames[0];
  check(
    'producer sample first frame has non-empty satelliteStates',
    firstFrame.satelliteStates.length > 0,
    String(firstFrame.satelliteStates.length),
  );
  check(
    'producer sample first frame has non-empty beamStates',
    firstFrame.beamStates.length > 0,
    String(firstFrame.beamStates.length),
  );
  check(
    'producer sample first row slotIndex respects slotIndexSemantics.firstIndex',
    firstFrame.slotIndex >= (manifest.slotIndexSemantics?.firstIndex ?? 1),
    `slot=${firstFrame.slotIndex}, firstIndex=${manifest.slotIndexSemantics?.firstIndex ?? 1}`,
  );
  check(
    'producer sample first row has required beam count >= 28',
    firstFrame.beamStates.length >= 28,
    String(firstFrame.beamStates.length),
  );
  check(
    'producer sample evaluation summary carries bundle_schema_version',
    bundle.evaluationSummary !== null &&
      typeof bundle.evaluationSummary === 'object' &&
      (bundle.evaluationSummary as Record<string, unknown>).bundle_schema_version ===
        SUPPORTED_BUNDLE_SCHEMA_VERSIONS[0],
    'bundle_schema_version match',
  );
  check(
    'producer sample provenance-map has classificationLegend',
    bundle.provenanceMap !== null &&
      typeof bundle.provenanceMap === 'object' &&
      typeof (bundle.provenanceMap as Record<string, unknown>).classificationLegend ===
        'object',
    'classificationLegend object',
  );
  // Producer-side fields must cover all five classifications.
  const legend = (bundle.provenanceMap as Record<string, unknown> | null)
    ?.classificationLegend as Record<string, unknown> | undefined;
  for (const category of [
    'paper-backed',
    'recovered-from-paper',
    'reproduction-assumption',
    'platform-visualization-only',
    'artifact-derived',
  ]) {
    check(
      `producer sample provenance legend covers ${category}`,
      !!legend && category in legend,
      category,
    );
  }

  const sampleViewModel = new ModqnBundleReplayViewModel(bundle, 'sample-bundle-v1');
  const explainability = sampleViewModel.getExplainability(0);
  check(
    'producer sample first slot exposes row-level policy diagnostics',
    explainability.hasDiagnostics
      && explainability.topCandidates.length >= 1
      && explainability.diagnosticsVersion === 'phase-03b-policy-diagnostics-v1',
    JSON.stringify({
      hasDiagnostics: explainability.hasDiagnostics,
      topCandidateCount: explainability.topCandidates.length,
      diagnosticsVersion: explainability.diagnosticsVersion,
    }),
  );
  check(
    'producer sample explainability keeps selected-serving identity aligned with top candidate',
    explainability.topCandidates[0]?.satId === firstFrame.users[0]?.selectedServing.satId
      && explainability.topCandidates[0]?.beamId === firstFrame.users[0]?.selectedServing.beamId,
    JSON.stringify({
      selectedServing: firstFrame.users[0]?.selectedServing ?? null,
      topCandidate: explainability.topCandidates[0] ?? null,
    }),
  );
}

async function validateOptionalDecisionMaskFallback() {
  console.log('\n== VAL-MODQN-BUNDLE-001G: optional decision-mask fallback ==');

  const bundle = await loadModqnReplayBundle(createMemoryFileReader(makeMemoryBundleFiles()));
  const viewModel = new ModqnBundleReplayViewModel(bundle, 'memory-no-decision-mask');
  const decisionStory = viewModel.getDecisionStory(0);
  const trendPoint = viewModel.getReplayTrendSeries()[0];

  check(
    'older bundle without decision-time masks keeps exported visible/action counts readable',
    decisionStory.visibleSatelliteCount === 1
      && decisionStory.visibleBeamCount === 1
      && decisionStory.validActionCount === 1,
    JSON.stringify({
      visibleSatelliteCount: decisionStory.visibleSatelliteCount,
      visibleBeamCount: decisionStory.visibleBeamCount,
      validActionCount: decisionStory.validActionCount,
    }),
  );
  check(
    'runtime-mask fallback is disclosed to downstream UI projectors',
    decisionStory.maskSource === 'runtime-fallback'
      && trendPoint?.maskSource === 'runtime-fallback'
      && trendPoint?.validActionRatio === 1,
    JSON.stringify({
      decisionMaskSource: decisionStory.maskSource,
      trendMaskSource: trendPoint?.maskSource ?? null,
      validActionRatio: trendPoint?.validActionRatio ?? null,
    }),
  );

  const explainability = viewModel.getExplainability(0);
  check(
    'older bundle without diagnostics stays explainability-honest',
    !explainability.hasDiagnostics
      && explainability.topCandidates.length === 0
      && Boolean(explainability.absenceDisclosure),
    JSON.stringify({
      hasDiagnostics: explainability.hasDiagnostics,
      topCandidateCount: explainability.topCandidates.length,
      absenceDisclosure: explainability.absenceDisclosure,
    }),
  );
}

async function main() {
  await validateSchemaGuard();
  await validateTimelineParser();
  await validateReplayFrameAdapter();
  await validateMemoryReaderRoundTrip();
  await validateFixtureLoad();
  await validateProducerSampleBundle();
  await validateOptionalDecisionMaskFallback();

  console.log('\n== Summary ==');
  if (failures.length > 0) {
    console.error(`validate-modqn-bundle-adapter: FAILED (${failures.length} check(s))`);
    for (const entry of failures) console.error(`  - ${entry}`);
    process.exit(1);
  }
  console.log('validate-modqn-bundle-adapter: OK');
}

main().catch((err) => {
  console.error('validate-modqn-bundle-adapter: unhandled error');
  console.error(err);
  process.exit(1);
});
