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

// Check 4: No circular imports
// SDD §9 VAL-PLAT-006 check 3:
//   - profiles/types.ts: no new imports from L4–L7 (sim, services, app, viz)
//   - profile-composer.ts: no import from engine.ts, src/viz/, src/app/, src/runner/

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

// Forbidden imports for profile-composer.ts (SDD §9 check 3 line 823)
const composerForbiddenPatterns = [
  { pattern: /from\s+['"].*\/engine['"]/, label: 'engine.ts' },
  { pattern: /from\s+['"].*\/engine\./, label: 'engine.ts' },
  { pattern: /from\s+['"].*\/sim\//, label: 'src/sim' },
  { pattern: /from\s+['"].*\/services\//, label: 'src/services' },
  { pattern: /from\s+['"].*\/app\//, label: 'src/app' },
  { pattern: /from\s+['"].*\/viz\//, label: 'src/viz' },
  { pattern: /from\s+['"].*\/runner\//, label: 'src/runner' },
];

let composerCircular = false;
for (const { pattern, label } of composerForbiddenPatterns) {
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
