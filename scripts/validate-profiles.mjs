/**
 * validate-profiles.mjs — canonical profile validation gate
 *
 * Absorbs the Phase 1 layout checks from validate-profile-layout.mjs and adds:
 *   VAL-PLAT-006: static export + no-circular-import checks on Phase 3 new files
 *   VAL-PLAT-007: decomposeProfile → composeProfile round-trip for all 14 profiles
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
const composerTs = readFileSync(
  path.join(rootDir, 'src/core/profiles/profile-composer.ts'),
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

// Check 3: composeProfile and decomposeProfile exported from profile-composer.ts
const requiredFunctionExports = ['composeProfile', 'decomposeProfile'];
for (const fnName of requiredFunctionExports) {
  const pattern = new RegExp(`export\\s+function\\s+${fnName}\\b`);
  if (pattern.test(composerTs)) {
    pass(`VAL-PLAT-006 — ${fnName} exported from profile-composer.ts`);
  } else {
    fail('VAL-PLAT-006', `missing function export: ${fnName} not found in profile-composer.ts`);
  }
}

// Check 4: No circular imports — profiles/types.ts must not import from L4–L7 layers
// L4: src/sim, L5: src/services, L6: src/app, L7: src/viz
const forbiddenLayerPatterns = [
  { pattern: /from\s+['"].*\/sim\//, label: 'src/sim (L4)' },
  { pattern: /from\s+['"].*\/services\//, label: 'src/services (L5)' },
  { pattern: /from\s+['"].*\/app\//, label: 'src/app (L6)' },
  { pattern: /from\s+['"].*\/viz\//, label: 'src/viz (L7)' },
];

let typesCircular = false;
for (const { pattern, label } of forbiddenLayerPatterns) {
  if (pattern.test(typesTs)) {
    fail('VAL-PLAT-006', `circular import detected: profiles/types.ts imports from ${label}`);
    typesCircular = true;
  }
}
if (!typesCircular) {
  pass('VAL-PLAT-006 — no circular imports in profiles/types.ts');
}

let composerCircular = false;
for (const { pattern, label } of forbiddenLayerPatterns) {
  if (pattern.test(composerTs)) {
    fail('VAL-PLAT-006', `circular import detected: profile-composer.ts imports from ${label}`);
    composerCircular = true;
  }
}
if (!composerCircular) {
  pass('VAL-PLAT-006 — no circular imports in profile-composer.ts');
}

// ---------------------------------------------------------------------------
// VAL-PLAT-007: composeProfile round-trip for all 14 profiles
// Authority: sdd/phase3-scenario-profile-experiment-split.md §9 VAL-PLAT-007
// ---------------------------------------------------------------------------

// Dynamic import requires node --import tsx
const { DEFAULT_PROFILES } = await import('../src/core/profiles/defaults.ts');
const { composeProfile, decomposeProfile } = await import('../src/core/profiles/profile-composer.ts');

/**
 * Recursive deep-equality comparison that returns a list of paths that differ.
 */
function deepDiff(expected, actual, path = '') {
  const diffs = [];

  if (expected === actual) return diffs;

  if (
    expected === null || actual === null ||
    typeof expected !== 'object' || typeof actual !== 'object'
  ) {
    diffs.push({ path: path || '<root>', expected, actual });
    return diffs;
  }

  const allKeys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  for (const key of allKeys) {
    const childPath = path ? `${path}.${key}` : key;
    const eVal = expected[key];
    const aVal = actual[key];

    if (eVal === undefined && aVal !== undefined) {
      diffs.push({ path: childPath, expected: undefined, actual: aVal });
    } else if (eVal !== undefined && aVal === undefined) {
      diffs.push({ path: childPath, expected: eVal, actual: undefined });
    } else {
      const childDiffs = deepDiff(eVal, aVal, childPath);
      diffs.push(...childDiffs);
    }
  }

  return diffs;
}

const profileIds = Object.keys(DEFAULT_PROFILES);
if (profileIds.length !== 14) {
  fail('VAL-PLAT-007', `expected 14 profiles in DEFAULT_PROFILES, found ${profileIds.length}`);
} else {
  pass(`VAL-PLAT-007 — DEFAULT_PROFILES contains ${profileIds.length} profiles`);
}

let roundTripAllPass = true;

for (const id of profileIds) {
  const original = DEFAULT_PROFILES[id];
  const { bundle, exp } = decomposeProfile(original);
  const recomposed = composeProfile(bundle, exp);

  const diffs = deepDiff(original, recomposed);

  if (diffs.length === 0) {
    pass(`VAL-PLAT-007 — round-trip OK: ${id}`);
  } else {
    roundTripAllPass = false;
    for (const d of diffs) {
      fail(
        'VAL-PLAT-007',
        `round-trip mismatch for profile "${id}":\n` +
        `  path:     ${d.path}\n` +
        `  expected: ${JSON.stringify(d.expected)}\n` +
        `  got:      ${JSON.stringify(d.actual)}`
      );
    }
  }
}

if (roundTripAllPass && profileIds.length === 14) {
  console.log('VAL-PLAT-007: PASS — composeProfile round-trip verified for all 14 profiles');
}

// ---------------------------------------------------------------------------
// Final summary
// ---------------------------------------------------------------------------

if (errors.length > 0) {
  console.error(`\nvalidate-profiles: FAILED (${errors.length} error(s))`);
  process.exit(1);
}

console.log('\nvalidate-profiles: OK');
