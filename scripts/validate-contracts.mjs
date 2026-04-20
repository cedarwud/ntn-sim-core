/**
 * validate-contracts.mjs
 *
 * Enforces:
 *   VAL-PLAT-008 — Contract files exist with required frozen type exports
 *   VAL-PLAT-009 — Zero forbidden import patterns (F1–F6) in viz/hooks
 *   VAL-PLAT-010 — getProfileList() runtime execution returns the active profile set
 *
 * Run via: node --import tsx scripts/validate-contracts.mjs
 * Authority: phase4-runtime-contract-sdd.md §8.1–8.3
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function walkDir(dir, ext = /\.(ts|tsx)$/) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkDir(full, ext));
    } else if (ext.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

function readFile(fp) { return readFileSync(fp, 'utf8'); }
function rel(fp)      { return path.relative(rootDir, fp); }
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasNamedExport(content, exportName) {
  const name = escapeRegExp(exportName);
  const exportPatterns = [
    new RegExp(`export\\s+type\\s*\\{[\\s\\S]*?\\b${name}\\b[\\s\\S]*?\\}`),
    new RegExp(`export\\s*\\{[\\s\\S]*?\\b${name}\\b[\\s\\S]*?\\}`),
    new RegExp(`export\\s+(?:declare\\s+)?(?:interface|type|class|function|const|let|var|enum)\\s+${name}\\b`),
  ];
  return exportPatterns.some((pattern) => pattern.test(content));
}

const errors = [];
function fail(msg) { errors.push(msg); }

// ---------------------------------------------------------------------------
// VAL-PLAT-008 — Contract files exist with required frozen types
// ---------------------------------------------------------------------------

console.log('\n── VAL-PLAT-008: contract file structure ──');

const contractsDir = path.join(rootDir, 'src', 'core', 'contracts');

const REQUIRED_FILES = {
  'runtime-v1.ts': {
    frozen: true,
    requiredExports: [
      'SimulationSnapshot', 'SatelliteState', 'UeState', 'BhSlotSnapshot',
      'DapsSnapshot', 'HoLogEntry', 'SatelliteBeamSnapshot', 'BeamRole', 'ContinuityState',
    ],
  },
  'kpi-v1.ts': {
    frozen: true,
    requiredExports: ['KpiBundle', 'BatchKpiEntry'],
  },
  'policy-v1.ts': {
    frozen: true,
    requiredExports: ['PolicyObservation', 'PolicyAction', 'Policy'],
  },
  'modqn-contracts.ts': {
    frozen: true,
    requiredExports: [
      'ModqnBaselineObservation',
      'ModqnActionVector',
      'ModqnRewardVector',
      'ModqnTrainingProtocol',
      'MODQN_BASELINE_OBJECTIVE_WEIGHTS',
      'MODQN_BASELINE_TRAINING_PROTOCOL',
    ],
  },
  'exposure-v1.ts': {
    frozen: true,
    requiredExports: ['ProfileListEntry', 'HandoverType', 'getProfileList'],
  },
  'index.ts': {
    frozen: false,   // barrel — @frozen not required
    requiredExports: [
      'SimulationSnapshot',
      'KpiBundle',
      'BatchKpiEntry',
      'ModqnBaselineObservation',
      'MODQN_BASELINE_TRAINING_PROTOCOL',
      'getProfileList',
    ],
  },
};

let v008Pass = true;
for (const [fileName, spec] of Object.entries(REQUIRED_FILES)) {
  const filePath = path.join(contractsDir, fileName);
  if (!existsSync(filePath)) {
    fail(`VAL-PLAT-008: missing contract file: src/core/contracts/${fileName}`);
    v008Pass = false;
    continue;
  }
  const content = readFile(filePath);

  if (spec.frozen && !content.includes('@version v1')) {
    fail(`VAL-PLAT-008: src/core/contracts/${fileName} missing @version v1 annotation`);
    v008Pass = false;
  }

  if (spec.frozen && !content.includes('@frozen')) {
    fail(`VAL-PLAT-008: src/core/contracts/${fileName} missing @frozen annotation`);
    v008Pass = false;
  }

  for (const name of spec.requiredExports) {
    if (!hasNamedExport(content, name)) {
      fail(`VAL-PLAT-008: src/core/contracts/${fileName} missing required export: ${name}`);
      v008Pass = false;
    }
  }
}

console.log(`VAL-PLAT-008: ${v008Pass ? 'PASS' : 'FAIL'} — contract files`);

// ---------------------------------------------------------------------------
// VAL-PLAT-009 — No forbidden import patterns in viz/hooks (F1–F6)
//
// Checks BOTH static `import ... from` AND inline `import('...')` type forms.
// Exception: src/core/contracts/** is the bridge layer — allowed to import
//            from core internals (common/types, profiles/types, kpi/types, etc.)
// ---------------------------------------------------------------------------

console.log('\n── VAL-PLAT-009: forbidden import patterns (F1–F6) ──');

const vizDir   = path.join(rootDir, 'src', 'viz');
const hooksDir = path.join(rootDir, 'src', 'app', 'hooks');
const bridgeLayerPrefix = path.join(rootDir, 'src', 'core', 'contracts');

const vizFiles   = walkDir(vizDir);
const hooksFiles = walkDir(hooksDir);

/**
 * Build a combined regex that matches both:
 *   - static:  import ... from 'module'
 *   - inline:  import('module').SomeName  (TypeScript type-import form)
 *
 * Both forms leak internal module references and must be caught.
 */
function makeModulePattern(moduleAlias) {
  // moduleAlias e.g. '@/core/common/types'
  // Escape for regex: @ / . become \@, \/, \.
  const esc = moduleAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/@/g, '\\@').replace(/\//g, '\\/');
  // Match: import ... from 'module' OR import('module')
  return new RegExp(`(?:import\\s+.*from\\s+|import\\()['"]${esc}['"]`);
}

const FORBIDDEN = [
  // F1: viz importing common/types (static or inline)
  { id: 'F1', files: vizFiles,   pattern: makeModulePattern('@/core/common/types'),
    message: 'must use @/core/contracts/runtime-v1 instead' },

  // F2: viz importing profiles/types (static or inline)
  { id: 'F2', files: vizFiles,   pattern: makeModulePattern('@/core/profiles/types'),
    message: 'must use @/core/contracts/exposure-v1 instead (HandoverType only needed in viz)' },

  // F3: hooks importing benchmark-runner directly
  { id: 'F3', files: hooksFiles, pattern: makeModulePattern('@/runner/headless/benchmark-runner'),
    message: 'must use @/runner/runner-exposure-api instead' },

  // F4: PROFILE_OPTIONS identifier in viz (any reference, not just import)
  { id: 'F4', files: vizFiles,   pattern: /\bPROFILE_OPTIONS\b/,
    message: 'PROFILE_OPTIONS must be replaced by getProfileList() call' },

  // F5: viz/hooks importing policy/types directly
  { id: 'F5', files: [...vizFiles, ...hooksFiles], pattern: makeModulePattern('@/core/policy/types'),
    message: 'must use @/core/contracts/policy-v1 instead' },

  // F6: viz importing runner-exposure-api directly
  { id: 'F6', files: vizFiles,   pattern: makeModulePattern('@/runner/runner-exposure-api'),
    message: 'viz must NOT import runner adapter; data flows via hooks → props' },
];

let v009Pass = true;
for (const { id, files, pattern, message } of FORBIDDEN) {
  const violations = [];
  for (const fp of files) {
    // Bridge layer exception: contracts/ may import core internals
    if (fp.startsWith(bridgeLayerPrefix)) continue;
    if (pattern.test(readFile(fp))) {
      violations.push(rel(fp));
    }
  }
  if (violations.length > 0) {
    for (const v of violations) {
      fail(`VAL-PLAT-009 [${id}]: ${v}: ${message}`);
    }
    v009Pass = false;
    console.log(`  ${id}: FAIL — ${violations.length} violation(s)`);
  } else {
    console.log(`  ${id}: PASS`);
  }
}

console.log(`VAL-PLAT-009: ${v009Pass ? 'PASS' : 'FAIL'} — forbidden import patterns`);

// ---------------------------------------------------------------------------
// VAL-PLAT-010 — getProfileList() runtime execution returns the active profile set
//
// Runs under node --import tsx so TypeScript imports resolve.
// Authority: phase4-runtime-contract-sdd.md §8.3
// ---------------------------------------------------------------------------

console.log('\n── VAL-PLAT-010: getProfileList() runtime check ──');

const EXPECTED_IDS = new Set([
  'realistic-first-screen', 'case9-access-baseline',    'hobs-multibeam-baseline',
  'bh-resource-baseline',   'case9-daps-baseline',      'case9-daps-showcase',
  'real-trace-validation',
  'meo-constellation-baseline', 'geo-relay-baseline',   'sinr-elevation-reproduction',
  'hobs-reproduction',      'hobs-tr38811-research',    'timer-cho-reproduction',   'bh-pf-baseline',
  'bh-sinr-greedy-baseline', 'bh-resource-energy-proof', 'modqn-paper-baseline',
]);
const VALID_TIERS = new Set(['Realistic', 'Advanced', 'Sensitivity']);

let v010Pass = true;

try {
  // Dynamic TypeScript import — requires node --import tsx
  const { getProfileList } = await import('../src/core/contracts/exposure-v1.ts');
  const list = getProfileList();

  if (!Array.isArray(list)) {
    fail('VAL-PLAT-010: getProfileList() did not return an Array');
    v010Pass = false;
  } else {
    if (list.length !== EXPECTED_IDS.size) {
      fail(`VAL-PLAT-010: expected ${EXPECTED_IDS.size} entries, got ${list.length}`);
      v010Pass = false;
    }

    for (const entry of list) {
      if (!EXPECTED_IDS.has(entry.id)) {
        fail(`VAL-PLAT-010: unexpected profile id: ${entry.id}`);
        v010Pass = false;
      }
      if (!VALID_TIERS.has(entry.tier)) {
        fail(`VAL-PLAT-010: invalid tier '${entry.tier}' for ${entry.id}`);
        v010Pass = false;
      }
      if (!entry.label) {
        fail(`VAL-PLAT-010: missing label for ${entry.id}`);
        v010Pass = false;
      }
      if (!entry.family) {
        fail(`VAL-PLAT-010: missing family for ${entry.id}`);
        v010Pass = false;
      }
    }

    const returnedIds = new Set(list.map(e => e.id));
    for (const id of EXPECTED_IDS) {
      if (!returnedIds.has(id)) {
        fail(`VAL-PLAT-010: missing profile id: ${id}`);
        v010Pass = false;
      }
    }

    if (v010Pass) {
      console.log(`  getProfileList() returned ${list.length} entries, all IDs and tiers valid`);
      // Show tier breakdown as a spot-check
      const byTier = {};
      for (const e of list) { byTier[e.tier] = (byTier[e.tier] ?? 0) + 1; }
      console.log(`  Tier breakdown: ${Object.entries(byTier).map(([t, n]) => `${t}=${n}`).join(', ')}`);
    }
  }
} catch (e) {
  fail(`VAL-PLAT-010: failed to import or run getProfileList() — ${e.message}`);
  fail('  Hint: this script must run under "node --import tsx" to resolve TypeScript modules');
  v010Pass = false;
}

console.log(`VAL-PLAT-010: ${v010Pass ? 'PASS' : 'FAIL'} — getProfileList() runtime check`);

// ---------------------------------------------------------------------------
// Scene-consumer proof surface — deterministic read-only proof path
//
// Ensures the next Phase 2 proof slice stays facade-only and does not regress
// into SceneShell / shell-helper imports.
// ---------------------------------------------------------------------------

console.log('\n── Scene consumer proof + harness + starter surface ──');

const sceneProofPath = path.join(rootDir, 'src', 'viz', 'scene', 'scene-consumer-proof.ts');
const sceneProofSurfacePath = path.join(rootDir, 'src', 'viz', 'scene', 'SceneConsumerProofSurface.tsx');
const sceneHarnessPath = path.join(rootDir, 'src', 'viz', 'scene', 'scene-consumer-harness.ts');
const sceneHarnessSurfacePath = path.join(rootDir, 'src', 'viz', 'scene', 'SceneConsumerHarnessSurface.tsx');
const sceneStarterPath = path.join(rootDir, 'src', 'viz', 'scene', 'scene-consumer-starter.ts');
const sceneStarterSurfacePath = path.join(rootDir, 'src', 'viz', 'scene', 'SceneConsumerStarterSurface.tsx');

let sceneProofPass = true;

for (const filePath of [
  sceneProofPath,
  sceneProofSurfacePath,
  sceneHarnessPath,
  sceneHarnessSurfacePath,
  sceneStarterPath,
  sceneStarterSurfacePath,
]) {
  if (!existsSync(filePath)) {
    fail(`scene-consumer-proof: missing file: ${rel(filePath)}`);
    sceneProofPass = false;
  }
}

if (sceneProofPass) {
  const proofContent = readFile(sceneProofPath);
  const surfaceContent = readFile(sceneProofSurfacePath);
  const harnessContent = readFile(sceneHarnessPath);
  const harnessSurfaceContent = readFile(sceneHarnessSurfacePath);
  const starterContent = readFile(sceneStarterPath);
  const starterSurfaceContent = readFile(sceneStarterSurfacePath);

  for (const exportName of ['SceneConsumerProofReadModel', 'buildSceneConsumerProofReadModel']) {
    if (!hasNamedExport(proofContent, exportName)) {
      fail(`scene-consumer-proof: ${rel(sceneProofPath)} missing export ${exportName}`);
      sceneProofPass = false;
    }
  }

  for (const exportName of ['SceneConsumerHarnessViewModel', 'buildSceneConsumerHarnessViewModel']) {
    if (!hasNamedExport(harnessContent, exportName)) {
      fail(`scene-consumer-proof: ${rel(sceneHarnessPath)} missing export ${exportName}`);
      sceneProofPass = false;
    }
  }

  for (const exportName of ['SceneConsumerStarterExport', 'buildSceneConsumerStarterExport']) {
    if (!hasNamedExport(starterContent, exportName)) {
      fail(`scene-consumer-proof: ${rel(sceneStarterPath)} missing export ${exportName}`);
      sceneProofPass = false;
    }
  }

  const shellForbiddenPatterns = [
    /(?:import\s+.*from\s+|import\()['"](?:\.\/SceneShell|@\/viz\/scene\/SceneShell)['"]/,
    /(?:import\s+.*from\s+|import\()['"](?:\.\/shell\/useSceneControlSurface|@\/viz\/scene\/shell\/useSceneControlSurface)['"]/,
    /(?:import\s+.*from\s+|import\()['"](?:\.\/bundle\/useBundleReplayShellState|@\/viz\/scene\/bundle\/useBundleReplayShellState)['"]/,
  ];

  for (const [filePath, content] of [
    [sceneProofPath, proofContent],
    [sceneProofSurfacePath, surfaceContent],
    [sceneHarnessPath, harnessContent],
    [sceneHarnessSurfacePath, harnessSurfaceContent],
    [sceneStarterPath, starterContent],
    [sceneStarterSurfacePath, starterSurfaceContent],
  ]) {
    for (const pattern of shellForbiddenPatterns) {
      if (pattern.test(content)) {
        fail(`scene-consumer-proof: ${rel(filePath)} must stay facade-only and may not import shell surfaces`);
        sceneProofPass = false;
      }
    }
  }

  try {
    const { buildSceneConsumerProofReadModel } = await import('../src/viz/scene/scene-consumer-proof.ts');
    const { buildSceneConsumerHarnessViewModel } = await import('../src/viz/scene/scene-consumer-harness.ts');
    const { buildSceneConsumerStarterExport } = await import('../src/viz/scene/scene-consumer-starter.ts');

    const continuityNarrative = {
      phase: 'prepared',
      rawContinuityState: 'prepared',
      rawDapsPhase: null,
      timeSec: 12,
      phaseStartedAtSec: 10,
      servingSatId: 'sat-a',
      sourceSatId: 'sat-a',
      targetSatId: 'sat-b',
      postHoSatId: null,
      recentSourceSatId: null,
      sourceCooldownUntilSec: null,
      cooledDownSatIds: [],
      cooldownSuppressedTargetSatId: null,
      handoverInProgress: true,
      narrativeSatIds: ['sat-a', 'sat-b'],
    };

    const bundleFacadeFixture = {
      source: {
        mode: 'modqn-bundle',
        isReady: true,
        profileId: 'modqn-bundle-replay',
        isBhProfile: false,
        simTimeSec: 12,
        totalDurationSec: 120,
        satelliteCount: 8,
        visibleCount: 3,
        servingSatId: 'sat-a',
        handoverCount: 2,
        replaySelection: 'producer-bundle',
        replayWindowStartSec: null,
        replayWindowEndSec: null,
        modeLabel: 'MODQN bundle replay',
        truthSourceLabel: 'sample-bundle-v1',
        bundleSlotIndex: 2,
        bundleSlotCount: 5,
        statusLabel: 'ready-sample',
      },
      truth: {
        sceneConsumedSnapshot: {
          tick: 11,
          timeSec: 12,
          satellites: [],
          ues: [{
            id: 'ue-0',
            latDeg: 0,
            lonDeg: 0,
            servingSatId: 'sat-a',
            servingBeamId: 'beam-a',
            targetSatId: 'sat-b',
            targetBeamId: 'beam-b',
            secondarySatId: null,
            secondaryBeamId: null,
            continuityState: 'prepared',
            sinrDb: 18,
          }],
          recentHoEvents: [],
        },
        publishedTruthSnapshot: {
          tick: 11,
          timeSec: 12,
          satellites: [],
          ues: [{
            id: 'ue-0',
            latDeg: 0,
            lonDeg: 0,
            servingSatId: 'sat-a',
            servingBeamId: 'beam-a',
            targetSatId: 'sat-b',
            targetBeamId: 'beam-b',
            secondarySatId: null,
            secondaryBeamId: null,
            continuityState: 'prepared',
            sinrDb: 18,
            servingTransition: {
              kind: 'same-satellite-beam-switch',
              sourceSatId: 'sat-a',
              sourceBeamId: 'beam-x',
              targetSatId: 'sat-a',
              targetBeamId: 'beam-a',
            },
            serviceState: {
              state: 'serving',
            },
          }],
          recentHoEvents: [],
        },
        nativeRuntime: {
          continuityState: 'prepared',
          servingTransition: {
            kind: 'same-satellite-beam-switch',
            sourceSatId: 'sat-a',
            sourceBeamId: 'beam-x',
            targetSatId: 'sat-a',
            targetBeamId: 'beam-a',
          },
          serviceState: {
            state: 'serving',
          },
          recentHoEvents: [],
          daps: null,
        },
        bundleReplay: {
          producerHandoverKind: 'intra-satellite-beam-switch',
        },
      },
      presentation: {
        beamPresentationFrame: {
          focusMode: 'continuity-focus',
          continuityNarrative,
          displaySatIds: ['sat-a', 'sat-b'],
          eventSatIds: ['sat-a', 'sat-b'],
          beamSatIds: ['sat-a', 'sat-b'],
          primaryBeamBySatId: {
            'sat-a': 'beam-a',
            'sat-b': 'beam-b',
          },
          contextBeamIdsBySatId: {
            'sat-a': [],
            'sat-b': [],
          },
          markerRoleBySatId: {
            'sat-a': 'serving',
            'sat-b': 'prepared',
          },
          beamRoleAccentByBeamId: {
            'beam-a': 'serving',
            'beam-b': 'prepared',
          },
        },
        continuityNarrative,
      },
    };

    const bundleProof = buildSceneConsumerProofReadModel(bundleFacadeFixture);
    const bundleHarness = buildSceneConsumerHarnessViewModel(bundleProof);
    const bundleStarter = buildSceneConsumerStarterExport(bundleFacadeFixture);
    const bundleProofValid = Boolean(
      bundleProof
      && bundleProof.source.mode === 'modqn-bundle'
      && bundleProof.source.truthSourceLabel === 'sample-bundle-v1'
      && bundleProof.truth.snapshotRelationship.scenePublishedSameReference === false
      && bundleProof.truth.nativeRuntime.servingTransitionKind === 'same-satellite-beam-switch'
      && bundleProof.truth.bundleReplay.producerHandoverKind === 'intra-satellite-beam-switch'
      && bundleProof.presentation.focusMode === 'continuity-focus'
      && bundleProof.presentation.beamSatIds.length === 2,
    );

    if (!bundleProofValid) {
      fail('scene-consumer-proof: read model runtime proof did not preserve facade source/truth/presentation fields');
      sceneProofPass = false;
    }

    const bundleHarnessValid = Boolean(
      bundleHarness
      && bundleHarness.source.pathKind === 'bundle-sample'
      && bundleHarness.truth.snapshotRelationship === 'distinct-reference'
      && bundleHarness.truth.nativeServingTransitionKind === 'same-satellite-beam-switch'
      && bundleHarness.truth.bundleProducerHandoverKind === 'intra-satellite-beam-switch'
      && bundleHarness.presentation.focusMode === 'continuity-focus'
      && bundleHarness.render.sourceLine.includes('path=bundle-sample')
      && bundleHarness.render.truthLine.includes('snapshot=distinct-reference')
      && bundleHarness.render.presentationLine.includes('focus=continuity-focus')
    );

    if (!bundleHarnessValid) {
      fail('scene-consumer-proof: bundle-sample harness proof did not preserve deterministic consumer summary fields');
      sceneProofPass = false;
    }

    const bundleStarterValid = Boolean(
      bundleStarter
      && bundleStarter.entry.surfaceId === 'scene-consumer-starter-v1'
      && bundleStarter.entry.contractKind === 'starter-export'
      && bundleStarter.entry.pathKind === 'bundle-sample'
      && bundleStarter.entry.deterministicPathId === 'bundle-sample:sample-bundle-v1'
      && bundleStarter.entry.deterministicPathReady === true
      && bundleStarter.source.truthSourceLabel === 'sample-bundle-v1'
      && bundleStarter.truth.snapshotRelationship === 'distinct-reference'
      && bundleStarter.presentation.focusMode === 'continuity-focus'
      && bundleStarter.summary.sourceLine.includes('path=bundle-sample')
      && bundleStarter.summary.truthLine.includes('snapshot=distinct-reference')
      && bundleStarter.summary.presentationLine.includes('focus=continuity-focus')
    );

    if (!bundleStarterValid) {
      fail('scene-consumer-proof: bundle-sample starter export did not preserve deterministic entry fields');
      sceneProofPass = false;
    }

    const nativeReplaySnapshot = {
      tick: 27,
      timeSec: 81,
      satellites: [],
      ues: [{
        id: 'ue-0',
        latDeg: 0,
        lonDeg: 0,
        servingSatId: 'sat-r1',
        servingBeamId: 'beam-r1',
        targetSatId: null,
        targetBeamId: null,
        secondarySatId: null,
        secondaryBeamId: null,
        continuityState: 'single-active',
        sinrDb: 14,
        servingTransition: {
          kind: 'same-satellite-beam-switch',
          sourceSatId: 'sat-r0',
          sourceBeamId: 'beam-r0',
          targetSatId: 'sat-r1',
          targetBeamId: 'beam-r1',
        },
        serviceState: {
          state: 'serving',
        },
      }],
      recentHoEvents: [],
      daps: null,
    };

    const nativeReplayFacadeFixture = {
      source: {
        mode: 'native-replay',
        isReady: true,
        profileId: 'hobs-multibeam-baseline',
        isBhProfile: false,
        simTimeSec: 81,
        totalDurationSec: 180,
        satelliteCount: 12,
        visibleCount: 4,
        servingSatId: 'sat-r1',
        handoverCount: 0,
        replaySelection: 'continuity-window',
        replayWindowStartSec: 72,
        replayWindowEndSec: 96,
        modeLabel: null,
        truthSourceLabel: null,
        bundleSlotIndex: null,
        bundleSlotCount: null,
        statusLabel: null,
      },
      truth: {
        sceneConsumedSnapshot: nativeReplaySnapshot,
        publishedTruthSnapshot: nativeReplaySnapshot,
        nativeRuntime: {
          continuityState: 'single-active',
          servingTransition: nativeReplaySnapshot.ues[0].servingTransition,
          serviceState: nativeReplaySnapshot.ues[0].serviceState,
          recentHoEvents: [],
          daps: null,
        },
        bundleReplay: {
          producerHandoverKind: null,
        },
      },
      presentation: {
        beamPresentationFrame: {
          focusMode: 'idle-pass',
          continuityNarrative: null,
          displaySatIds: ['sat-r1', 'sat-r2'],
          eventSatIds: ['sat-r1'],
          beamSatIds: ['sat-r1'],
          primaryBeamBySatId: {
            'sat-r1': 'beam-r1',
          },
          contextBeamIdsBySatId: {
            'sat-r1': ['beam-r2'],
          },
          markerRoleBySatId: {
            'sat-r1': 'serving',
          },
          beamRoleAccentByBeamId: {
            'beam-r1': 'serving',
            'beam-r2': 'neutral-context',
          },
        },
        continuityNarrative: null,
      },
    };

    const nativeReplayProof = buildSceneConsumerProofReadModel(nativeReplayFacadeFixture);
    const nativeReplayHarness = buildSceneConsumerHarnessViewModel(nativeReplayProof);
    const nativeReplayStarter = buildSceneConsumerStarterExport(nativeReplayFacadeFixture);
    const nativeReplayProofValid = Boolean(
      nativeReplayProof
      && nativeReplayProof.source.mode === 'native-replay'
      && nativeReplayProof.source.replaySelection === 'continuity-window'
      && nativeReplayProof.truth.snapshotRelationship.scenePublishedSameReference === true
      && nativeReplayProof.truth.sceneConsumed.servingSatId === 'sat-r1'
      && nativeReplayProof.truth.published.servingSatId === 'sat-r1'
      && nativeReplayProof.presentation.focusMode === 'idle-pass'
      && nativeReplayProof.presentation.beamSatIds.length === 1,
    );

    if (!nativeReplayProofValid) {
      fail('scene-consumer-proof: native-replay proof did not preserve alias-like facade semantics');
      sceneProofPass = false;
    }

    const nativeReplayHarnessValid = Boolean(
      nativeReplayHarness
      && nativeReplayHarness.source.pathKind === 'native-replay'
      && nativeReplayHarness.truth.snapshotRelationship === 'same-reference'
      && nativeReplayHarness.truth.sceneServingSatId === 'sat-r1'
      && nativeReplayHarness.truth.publishedServingSatId === 'sat-r1'
      && nativeReplayHarness.presentation.focusMode === 'idle-pass'
      && nativeReplayHarness.render.sourceLine.includes('path=native-replay')
      && nativeReplayHarness.render.truthLine.includes('snapshot=same-reference')
      && nativeReplayHarness.render.presentationLine.includes('focus=idle-pass')
    );

    if (!nativeReplayHarnessValid) {
      fail('scene-consumer-proof: native-replay harness proof did not preserve deterministic consumer summary fields');
      sceneProofPass = false;
    }

    const nativeReplayStarterValid = Boolean(
      nativeReplayStarter
      && nativeReplayStarter.entry.surfaceId === 'scene-consumer-starter-v1'
      && nativeReplayStarter.entry.contractKind === 'starter-export'
      && nativeReplayStarter.entry.pathKind === 'native-replay'
      && nativeReplayStarter.entry.deterministicPathId === 'native-replay:hobs-multibeam-baseline:continuity-window'
      && nativeReplayStarter.entry.deterministicPathReady === true
      && nativeReplayStarter.truth.snapshotRelationship === 'same-reference'
      && nativeReplayStarter.source.replaySelection === 'continuity-window'
      && nativeReplayStarter.presentation.focusMode === 'idle-pass'
      && nativeReplayStarter.summary.sourceLine.includes('path=native-replay')
      && nativeReplayStarter.summary.truthLine.includes('snapshot=same-reference')
      && nativeReplayStarter.summary.presentationLine.includes('focus=idle-pass')
    );

    if (!nativeReplayStarterValid) {
      fail('scene-consumer-proof: native-replay starter export did not preserve deterministic entry fields');
      sceneProofPass = false;
    }
  } catch (error) {
    fail(`scene-consumer-proof: runtime proof failed: ${String(error)}`);
    sceneProofPass = false;
  }
}

console.log(`scene-consumer-proof: ${sceneProofPass ? 'PASS' : 'FAIL'} — facade-only proof, harness path, and starter export`);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('');
if (errors.length) {
  console.error('FAILED:');
  for (const e of errors) console.error(`  ✗  ${e}`);
  process.exit(1);
}

console.log('validate-contracts (VAL-PLAT-008/009/010): OK');
