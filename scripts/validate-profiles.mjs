/**
 * validate-profiles.mjs — canonical profile validation gate
 *
 * Absorbs the Phase 1 layout checks from validate-profile-layout.mjs and adds:
 *   VAL-PLAT-006: static export + no-circular-import checks on runtime materialization files
 *   VAL-PLAT-007: authoring bundle/exp -> runtime profile parity for all active profiles
 *
 * Run: node --import tsx scripts/validate-profiles.mjs
 *
 * Authority: sdd/phase3-scenario-profile-experiment-split.md §9
 * Wired into: npm run validate:profiles → npm run validate:stage
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const EXPECTED_PROFILE_COUNT = 17;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const errors = [];

function pass(label) {
  console.log(`${label}: PASS`);
}

function fail(label, msg) {
  console.error(`${label}: FAIL — ${msg}`);
  errors.push(`${label}: ${msg}`);
}

// ---------------------------------------------------------------------------
// Phase 1 layout checks (from validate-profile-layout.mjs)
// ---------------------------------------------------------------------------

const observerConfig = readFileSync(
  path.join(rootDir, 'src/config/observer-presets.ts'),
  'utf8'
);
const visualConfig = readFileSync(
  path.join(rootDir, 'src/config/visual-scene.config.ts'),
  'utf8'
);
const assetModels = readFileSync(
  path.join(rootDir, 'src/assets/models.ts'),
  'utf8'
);

if (!observerConfig.includes('latitudeDeg') || !observerConfig.includes('longitudeDeg')) {
  fail('validate-profile-layout', 'observer-presets.ts must declare latitudeDeg and longitudeDeg.');
} else {
  pass('validate-profile-layout (observer)');
}

if (visualConfig.includes('observer:')) {
  fail('validate-profile-layout', 'visual-scene.config.ts must not define an observer block.');
} else {
  pass('validate-profile-layout (no-observer-in-visual)');
}

if (!visualConfig.includes('camera') || !visualConfig.includes('scene') || !visualConfig.includes('uav')) {
  fail('validate-profile-layout', 'visual-scene.config.ts must define scene, uav, and camera sections.');
} else {
  pass('validate-profile-layout (visual-sections)');
}

if (!assetModels.includes('/models/sat.glb') || !assetModels.includes('/models/uav.glb')) {
  fail('validate-profile-layout', 'models.ts must register both sat.glb and uav.glb.');
} else {
  pass('validate-profile-layout (model-assets)');
}

// ---------------------------------------------------------------------------
// VAL-PLAT-006: Static export scan + no-circular-import checks
// Authority: sdd/phase3-scenario-profile-experiment-split.md §9 VAL-PLAT-006
// ---------------------------------------------------------------------------

const typesTs = readFileSync(
  path.join(rootDir, 'src/core/profiles/types.ts'),
  'utf8'
);
const materializationTs = readFileSync(
  path.join(rootDir, 'src/core/profiles/runtime-materialization.ts'),
  'utf8'
);

// Check 1: four new type exports in profiles/types.ts
const requiredTypeExports = [
  'ScenarioConfig',
  'ModelBundleSelection',
  'ExperimentBundle',
  'ProfileBundle',
];

for (const typeName of requiredTypeExports) {
  const pattern = new RegExp(`export\\s+(interface|type)\\s+${typeName}\\b`);
  if (pattern.test(typesTs)) {
    pass(`VAL-PLAT-006 — ${typeName} exported from profiles/types.ts`);
  } else {
    fail('VAL-PLAT-006', `missing type export: ${typeName} not found in profiles/types.ts`);
  }
}

// Check 2: ProfileConfig still exported from profiles/types.ts
if (/export\s+(interface|type)\s+ProfileConfig\b/.test(typesTs)) {
  pass('VAL-PLAT-006 — ProfileConfig still exported from profiles/types.ts');
} else {
  fail('VAL-PLAT-006', 'ProfileConfig no longer exported from profiles/types.ts');
}

// Check 3: materializeRuntimeProfile exported from runtime-materialization.ts
if (/export\s+function\s+materializeRuntimeProfile\b/.test(materializationTs)) {
  pass('VAL-PLAT-006 — materializeRuntimeProfile exported from runtime-materialization.ts');
} else {
  fail('VAL-PLAT-006', 'missing function export: materializeRuntimeProfile not found in runtime-materialization.ts');
}

// Check 4: No circular imports
// SDD §9 VAL-PLAT-006 check 3:
//   - profiles/types.ts: no new imports from L4–L7 (sim, services, app, viz)
//   - runtime-materialization.ts: no import from engine.ts, src/viz/, src/app/, src/runner/

// L4–L7 patterns for types.ts
const typesLayerPatterns = [
  { pattern: /from\s+['"].*\/sim\//, label: 'src/sim (L4)' },
  { pattern: /from\s+['"].*\/services\//, label: 'src/services (L5)' },
  { pattern: /from\s+['"].*\/app\//, label: 'src/app (L6)' },
  { pattern: /from\s+['"].*\/viz\//, label: 'src/viz (L7)' },
];

let typesCircular = false;
for (const { pattern, label } of typesLayerPatterns) {
  if (pattern.test(typesTs)) {
    fail('VAL-PLAT-006', `circular import detected: profiles/types.ts imports from ${label}`);
    typesCircular = true;
  }
}
if (!typesCircular) {
  pass('VAL-PLAT-006 — no circular imports in profiles/types.ts');
}

// Forbidden imports for runtime-materialization.ts
const materializationForbiddenPatterns = [
  { pattern: /from\s+['"].*\/engine['"]/, label: 'engine.ts' },
  { pattern: /from\s+['"].*\/engine\./, label: 'engine.ts' },
  { pattern: /from\s+['"].*\/sim\//, label: 'src/sim' },
  { pattern: /from\s+['"].*\/services\//, label: 'src/services' },
  { pattern: /from\s+['"].*\/app\//, label: 'src/app' },
  { pattern: /from\s+['"].*\/viz\//, label: 'src/viz' },
  { pattern: /from\s+['"].*\/runner\//, label: 'src/runner' },
];

let materializationCircular = false;
for (const { pattern, label } of materializationForbiddenPatterns) {
  if (pattern.test(materializationTs)) {
    fail('VAL-PLAT-006', `circular import detected: runtime-materialization.ts imports from ${label}`);
    materializationCircular = true;
  }
}
if (!materializationCircular) {
  pass('VAL-PLAT-006 — no circular imports in runtime-materialization.ts');
}

// ---------------------------------------------------------------------------
// VAL-PLAT-007: authoring parity for all active profiles
// Authority: sdd/phase3-scenario-profile-experiment-split.md §9 (rewired in Phase 5)
// ---------------------------------------------------------------------------

// Dynamic import requires node --import tsx
const { DEFAULT_PROFILES } = await import('../src/core/profiles/defaults.ts');
const { PROFILE_AUTHORING_ENTRIES } = await import('../src/core/profiles/profile-authoring-registry.ts');
const { materializeRuntimeProfile } = await import('../src/core/profiles/runtime-materialization.ts');
const { createSimEngine } = await import('../src/core/engine.ts');
const { buildInteractiveProfileRuntime } = await import('../src/core/orbit/profile-runtime.ts');
const { loadProfile } = await import('../src/core/profiles/index.ts');

/**
 * Recursive deep-equality comparison that returns a list of paths that differ.
 *
 * SDD §9 deep-equality definition:
 *   - Primitives (number, string, boolean, null): ===
 *   - Date objects: compared by getTime()
 *   - Arrays: element-by-element in order
 *   - absent key and key set to undefined: treated as equivalent (both = absent)
 */
function deepDiff(expected, actual, path = '') {
  const diffs = [];

  // Normalize: treat undefined as "absent"
  const eNorm = expected === undefined ? undefined : expected;
  const aNorm = actual === undefined ? undefined : actual;

  if (eNorm === aNorm) return diffs;
  if (eNorm === undefined && aNorm === undefined) return diffs;

  // Date comparison (SDD §9: Date objects compared by getTime())
  if (eNorm instanceof Date && aNorm instanceof Date) {
    if (eNorm.getTime() !== aNorm.getTime()) {
      diffs.push({ path: path || '<root>', expected: eNorm, actual: aNorm });
    }
    return diffs;
  }

  // Primitive or type mismatch
  if (
    eNorm === null || aNorm === null ||
    eNorm === undefined || aNorm === undefined ||
    typeof eNorm !== 'object' || typeof aNorm !== 'object'
  ) {
    diffs.push({ path: path || '<root>', expected: eNorm, actual: aNorm });
    return diffs;
  }

  // Array comparison
  if (Array.isArray(eNorm) || Array.isArray(aNorm)) {
    if (!Array.isArray(eNorm) || !Array.isArray(aNorm)) {
      diffs.push({ path: path || '<root>', expected: eNorm, actual: aNorm });
      return diffs;
    }
    const maxLen = Math.max(eNorm.length, aNorm.length);
    for (let i = 0; i < maxLen; i++) {
      diffs.push(...deepDiff(eNorm[i], aNorm[i], `${path}[${i}]`));
    }
    return diffs;
  }

  // Object comparison — absent key ≡ key set to undefined (SDD §9)
  const allKeys = new Set([...Object.keys(eNorm), ...Object.keys(aNorm)]);
  for (const key of allKeys) {
    const childPath = path ? `${path}.${key}` : key;
    // Accessing a missing key yields undefined — which is equivalent to absent per SDD §9
    diffs.push(...deepDiff(eNorm[key], aNorm[key], childPath));
  }

  return diffs;
}

const profileIds = Object.keys(DEFAULT_PROFILES);
if (profileIds.length !== EXPECTED_PROFILE_COUNT) {
  fail('VAL-PLAT-007', `expected ${EXPECTED_PROFILE_COUNT} profiles in DEFAULT_PROFILES, found ${profileIds.length}`);
} else {
  pass(`VAL-PLAT-007 — DEFAULT_PROFILES contains ${profileIds.length} profiles`);
}

if (PROFILE_AUTHORING_ENTRIES.length !== EXPECTED_PROFILE_COUNT) {
  fail('VAL-PLAT-007', `expected ${EXPECTED_PROFILE_COUNT} authoring entries, found ${PROFILE_AUTHORING_ENTRIES.length}`);
} else {
  pass(`VAL-PLAT-007 — PROFILE_AUTHORING_ENTRIES contains ${PROFILE_AUTHORING_ENTRIES.length} entries`);
}

let parityAllPass = true;

for (const entry of PROFILE_AUTHORING_ENTRIES) {
  const original = DEFAULT_PROFILES[entry.id];
  const materialized = materializeRuntimeProfile(entry.bundle, entry.exp);
  const diffs = deepDiff(original, materialized);

  if (diffs.length === 0) {
    pass(`VAL-PLAT-007 — authoring parity OK: ${entry.id}`);
  } else {
    parityAllPass = false;
    for (const d of diffs) {
      fail(
        'VAL-PLAT-007',
        `authoring parity mismatch for profile "${entry.id}":\n` +
        `  path:     ${d.path}\n` +
        `  expected: ${JSON.stringify(d.expected)}\n` +
        `  got:      ${JSON.stringify(d.actual)}`
      );
    }
  }
}

if (parityAllPass && profileIds.length === EXPECTED_PROFILE_COUNT && PROFILE_AUTHORING_ENTRIES.length === EXPECTED_PROFILE_COUNT) {
  console.log(`VAL-PLAT-007: PASS — runtime materialization parity verified for all ${EXPECTED_PROFILE_COUNT} profiles`);
}

// ---------------------------------------------------------------------------
// Showcase continuity envelope checks
// Authority: truth-preserving-showcase-visual-realignment-follow-on.md
// ---------------------------------------------------------------------------

const showcaseProfile = structuredClone(loadProfile('case9-daps-showcase'));
const { trajectoryCache: showcaseTrajectoryCache } = await buildInteractiveProfileRuntime(showcaseProfile);
const showcaseEngine = createSimEngine({
  profile: showcaseProfile,
  trajectoryCache: showcaseTrajectoryCache,
});

let firstShowcaseHoCompleteSec = null;
let latestShowcaseCompletion = null;
let immediateReturnViolation = null;
let previousServingSatId = null;

for (let tick = 0; tick <= 180; tick += 1) {
  const snapshot = showcaseEngine.tick(tick, tick);
  const primaryUe = snapshot.ues[0];

  if (
    primaryUe?.servingSatId
    && previousServingSatId
    && primaryUe.servingSatId !== previousServingSatId
  ) {
    if (firstShowcaseHoCompleteSec === null) firstShowcaseHoCompleteSec = tick;
    latestShowcaseCompletion = {
      timeSec: tick,
      sourceSatId: previousServingSatId,
      targetSatId: primaryUe.servingSatId,
    };
  }

  previousServingSatId = primaryUe?.servingSatId ?? null;

  if (
    latestShowcaseCompletion
    && primaryUe?.continuityState
    && primaryUe.targetSatId === latestShowcaseCompletion.sourceSatId
    && tick - latestShowcaseCompletion.timeSec <= (showcaseProfile.handover.pingPongWindowSec ?? 0)
  ) {
    immediateReturnViolation = {
      timeSec: tick,
      continuityState: primaryUe.continuityState,
      targetSatId: primaryUe.targetSatId,
      servingSatId: primaryUe.servingSatId,
      lastHoTimeSec: latestShowcaseCompletion.timeSec,
      lastHoSourceSatId: latestShowcaseCompletion.sourceSatId,
      lastHoTargetSatId: latestShowcaseCompletion.targetSatId,
    };
    break;
  }
}

if (firstShowcaseHoCompleteSec !== null && firstShowcaseHoCompleteSec <= 120) {
  pass(`VAL-PLAT-007 — case9-daps-showcase reaches a truthful HO completion early (t=${firstShowcaseHoCompleteSec}s)`);
} else {
  fail(
    'VAL-PLAT-007',
    `case9-daps-showcase did not reach a HO completion within 120s (first=${firstShowcaseHoCompleteSec ?? 'none'})`,
  );
}

if (!immediateReturnViolation) {
  pass('VAL-PLAT-007 — case9-daps-showcase does not immediately reopen continuity back to the just-left source satellite');
} else {
  fail(
    'VAL-PLAT-007',
    'case9-daps-showcase reopened continuity back to the just-left source satellite inside the showcase ping-pong guard window:\n'
      + `  lastHo:      t=${immediateReturnViolation.lastHoTimeSec}s ${immediateReturnViolation.lastHoSourceSatId} -> ${immediateReturnViolation.lastHoTargetSatId}\n`
      + `  violation:   t=${immediateReturnViolation.timeSec}s continuity=${immediateReturnViolation.continuityState} serving=${immediateReturnViolation.servingSatId} target=${immediateReturnViolation.targetSatId}`,
  );
}

// ---------------------------------------------------------------------------
// Final summary
// ---------------------------------------------------------------------------

if (errors.length > 0) {
  console.error(`\nvalidate-profiles: FAILED (${errors.length} error(s))`);
  process.exit(1);
}

console.log('\nvalidate-profiles: OK');
