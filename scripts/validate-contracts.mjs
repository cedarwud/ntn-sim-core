/**
 * validate-contracts.mjs
 *
 * Enforces:
 *   VAL-PLAT-008 — Contract files exist with required frozen types
 *   VAL-PLAT-009 — No forbidden import patterns in viz/hooks
 *   VAL-PLAT-010 — getProfileList() returns exactly 14 profiles with correct structure
 *
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

function readFile(filePath) {
  return readFileSync(filePath, 'utf8');
}

function rel(filePath) {
  return path.relative(rootDir, filePath);
}

const errors = [];
const warnings = [];

function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

// ---------------------------------------------------------------------------
// VAL-PLAT-008 — Contract files exist with required frozen types
// ---------------------------------------------------------------------------

const contractsDir = path.join(rootDir, 'src', 'core', 'contracts');

const REQUIRED_CONTRACT_FILES = {
  'runtime-v1.ts': {
    requiredExports: [
      'SimulationSnapshot', 'SatelliteState', 'UeState', 'BhSlotSnapshot',
      'DapsSnapshot', 'HoLogEntry', 'SatelliteBeamSnapshot', 'BeamRole', 'ContinuityState',
    ],
  },
  'kpi-v1.ts': {
    requiredExports: ['KpiBundle', 'BatchKpiEntry'],
  },
  'policy-v1.ts': {
    requiredExports: [
      'PolicyObservation', 'PolicyAction', 'PolicyReward', 'Policy',
      'SatelliteObservation', 'UeObservation', 'SatelliteAction', 'HandoverAction',
    ],
  },
  'exposure-v1.ts': {
    requiredExports: ['ProfileListEntry', 'HandoverType', 'getProfileList'],
  },
  'index.ts': {
    requiredExports: ['SimulationSnapshot', 'KpiBundle', 'BatchKpiEntry', 'getProfileList'],
  },
};

for (const [fileName, spec] of Object.entries(REQUIRED_CONTRACT_FILES)) {
  const filePath = path.join(contractsDir, fileName);
  if (!existsSync(filePath)) {
    fail(`VAL-PLAT-008: missing contract file: src/core/contracts/${fileName}`);
    continue;
  }
  const content = readFile(filePath);

  // Check @frozen annotation
  if (!content.includes('@frozen')) {
    fail(`VAL-PLAT-008: src/core/contracts/${fileName} missing @frozen annotation`);
  }

  // Check required exports are present (by name mention in file)
  for (const exportName of spec.requiredExports) {
    // Match export keyword or re-export reference
    const pattern = new RegExp(`\\b${exportName}\\b`);
    if (!pattern.test(content)) {
      fail(`VAL-PLAT-008: src/core/contracts/${fileName} missing required export: ${exportName}`);
    }
  }
}

console.log(`VAL-PLAT-008: ${errors.filter(e => e.startsWith('VAL-PLAT-008')).length === 0 ? 'PASS' : 'FAIL'} — contract files`);

// ---------------------------------------------------------------------------
// VAL-PLAT-009 — No forbidden import patterns in viz/hooks
// ---------------------------------------------------------------------------

const FORBIDDEN_PATTERNS = [
  // F1: no viz/hooks → core/common/types direct import
  {
    id: 'F1',
    dirs: ['src/viz', 'src/app/hooks'],
    pattern: /import\s+.*from\s+['"]@\/core\/common\/types['"]/,
    message: 'direct import from @/core/common/types (use @/core/contracts instead)',
    exception: null,
  },
  // F2: no viz → core/kpi/types direct import
  {
    id: 'F2',
    dirs: ['src/viz'],
    pattern: /import\s+.*from\s+['"]@\/core\/kpi\/types['"]/,
    message: 'direct import from @/core/kpi/types (use @/core/contracts instead)',
    exception: null,
  },
  // F3: no viz → core/kpi/types direct import (also hooks)
  {
    id: 'F3',
    dirs: ['src/app/hooks'],
    pattern: /import\s+.*from\s+['"]@\/core\/kpi\/types['"]/,
    message: 'direct import from @/core/kpi/types (use @/core/contracts instead)',
    exception: null,
  },
  // F4: no viz/hooks → core/runner internals
  {
    id: 'F4',
    dirs: ['src/viz', 'src/app/hooks'],
    pattern: /import\s+.*from\s+['"]@\/runner\/headless\/benchmark-runner['"]/,
    message: 'direct import from @/runner/headless/benchmark-runner (use @/runner/runner-exposure-api instead)',
    exception: null,
  },
  // F5: no viz/hooks → core/policy/types direct import
  {
    id: 'F5',
    dirs: ['src/viz', 'src/app/hooks'],
    pattern: /import\s+.*from\s+['"]@\/core\/policy\/types['"]/,
    message: 'direct import from @/core/policy/types (use @/core/contracts instead)',
    exception: null,
  },
  // F6: no viz → runner-exposure-api direct import
  {
    id: 'F6',
    dirs: ['src/viz'],
    pattern: /import\s+.*from\s+['"]@\/runner\/runner-exposure-api['"]/,
    message: 'direct import of runner-exposure-api from viz (must go via hooks)',
    exception: null,
  },
];

// Explicit exception: src/core/contracts/** is the bridge layer — allowed to import internals
const BRIDGE_LAYER_PREFIX = path.join(rootDir, 'src', 'core', 'contracts');

let f009Violations = 0;
for (const rule of FORBIDDEN_PATTERNS) {
  for (const dirRelative of rule.dirs) {
    const dir = path.join(rootDir, dirRelative);
    for (const filePath of walkDir(dir)) {
      // Bridge layer exception: contracts/ may import core internals
      if (filePath.startsWith(BRIDGE_LAYER_PREFIX)) continue;

      const content = readFile(filePath);
      if (rule.pattern.test(content)) {
        fail(`VAL-PLAT-009 [${rule.id}]: ${rel(filePath)}: ${rule.message}`);
        f009Violations++;
      }
    }
  }
}

console.log(`VAL-PLAT-009: ${f009Violations === 0 ? 'PASS' : 'FAIL'} — forbidden import patterns`);

// ---------------------------------------------------------------------------
// VAL-PLAT-010 — getProfileList() returns 14 profiles with correct structure
// ---------------------------------------------------------------------------

// We can't import TypeScript directly in .mjs, so we validate by reading the
// PROFILE_EXPOSURE_PRESETS from the compiled JS or by parsing the source.
// Strategy: parse PROFILE_EXPOSURE_PRESETS keys from profile-composer.ts source
// and validate the structure.

const EXPECTED_PROFILE_COUNT = 14;

const EXPECTED_PROFILE_IDS = [
  'realistic-first-screen',
  'case9-access-baseline',
  'hobs-multibeam-baseline',
  'bh-resource-baseline',
  'case9-daps-baseline',
  'real-trace-validation',
  'meo-constellation-baseline',
  'geo-relay-baseline',
  'sinr-elevation-reproduction',
  'hobs-reproduction',
  'timer-cho-reproduction',
  'bh-pf-baseline',
  'bh-sinr-greedy-baseline',
  'bh-resource-energy-proof',
];

const VALID_TIERS = new Set(['Realistic', 'Advanced', 'Sensitivity']);

// Parse PROFILE_EXPOSURE_PRESETS from profile-composer.ts
const composerPath = path.join(rootDir, 'src', 'core', 'profiles', 'profile-composer.ts');
const composerContent = readFile(composerPath);

// Extract all quoted profile IDs from PROFILE_EXPOSURE_PRESETS block
const presetsBlockMatch = composerContent.match(/export const PROFILE_EXPOSURE_PRESETS[^=]+=\s*\{([\s\S]*?)\};/);
if (!presetsBlockMatch) {
  fail('VAL-PLAT-010: could not parse PROFILE_EXPOSURE_PRESETS from profile-composer.ts');
} else {
  const presetsBlock = presetsBlockMatch[1];
  const idMatches = [...presetsBlock.matchAll(/'([^']+)'\s*:/g)];
  const foundIds = idMatches.map(m => m[1]);

  // Check count
  if (foundIds.length !== EXPECTED_PROFILE_COUNT) {
    fail(`VAL-PLAT-010: PROFILE_EXPOSURE_PRESETS has ${foundIds.length} entries, expected ${EXPECTED_PROFILE_COUNT}`);
  }

  // Check each expected ID is present
  for (const expectedId of EXPECTED_PROFILE_IDS) {
    if (!foundIds.includes(expectedId)) {
      fail(`VAL-PLAT-010: missing expected profile ID in PROFILE_EXPOSURE_PRESETS: ${expectedId}`);
    }
  }

  // Check Internal-only tier is not present (should not be exposed)
  if (presetsBlock.includes("'Internal-only'") || presetsBlock.includes('"Internal-only"')) {
    fail('VAL-PLAT-010: PROFILE_EXPOSURE_PRESETS contains Internal-only tier entry (must be excluded from getProfileList)');
  }

  // Check each entry has tier in VALID_TIERS
  const tierMatches = [...presetsBlock.matchAll(/tier:\s*'([^']+)'/g)];
  for (const m of tierMatches) {
    if (!VALID_TIERS.has(m[1])) {
      fail(`VAL-PLAT-010: invalid tier '${m[1]}' in PROFILE_EXPOSURE_PRESETS`);
    }
  }

  // Check exposure-v1.ts exists and getProfileList is implemented
  const exposurePath = path.join(contractsDir, 'exposure-v1.ts');
  if (!existsSync(exposurePath)) {
    fail('VAL-PLAT-010: exposure-v1.ts missing — getProfileList() not available');
  } else {
    const exposureContent = readFile(exposurePath);
    if (!exposureContent.includes('export function getProfileList')) {
      fail('VAL-PLAT-010: getProfileList() not exported from exposure-v1.ts');
    }
    if (exposureContent.includes('PROFILE_OPTIONS') && !exposureContent.includes('// legacy')) {
      warn('VAL-PLAT-010: exposure-v1.ts still references PROFILE_OPTIONS — check for hardcoded data');
    }
  }

  // Check ControlPanel no longer has hardcoded PROFILE_OPTIONS constant
  const controlPanelPath = path.join(rootDir, 'src', 'viz', 'overlays', 'ControlPanel.tsx');
  if (existsSync(controlPanelPath)) {
    const cpContent = readFile(controlPanelPath);
    // Old pattern: const PROFILE_OPTIONS: Array<...> = [
    if (/const PROFILE_OPTIONS:\s*Array/.test(cpContent)) {
      fail('VAL-PLAT-010: ControlPanel.tsx still has hardcoded PROFILE_OPTIONS array declaration');
    }
    // Must import getProfileList from contracts
    if (!cpContent.includes('getProfileList') && cpContent.includes('onProfileChange')) {
      fail('VAL-PLAT-010: ControlPanel.tsx has profile selector but does not use getProfileList()');
    }
  }
}

const v010ErrorCount = errors.filter(e => e.startsWith('VAL-PLAT-010')).length;
console.log(`VAL-PLAT-010: ${v010ErrorCount === 0 ? 'PASS' : 'FAIL'} — getProfileList() contract`);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

if (warnings.length) {
  console.warn('\nWarnings:');
  for (const w of warnings) console.warn(`  ⚠  ${w}`);
}

if (errors.length) {
  console.error('\nFAILED:');
  for (const e of errors) console.error(`  ✗  ${e}`);
  process.exit(1);
}

console.log('\nvalidate-contracts (VAL-PLAT-008/009/010): OK');
