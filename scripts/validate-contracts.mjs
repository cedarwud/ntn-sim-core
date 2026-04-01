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
  'bh-resource-baseline',   'case9-daps-baseline',      'real-trace-validation',
  'meo-constellation-baseline', 'geo-relay-baseline',   'sinr-elevation-reproduction',
  'hobs-reproduction',      'timer-cho-reproduction',   'bh-pf-baseline',
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
// Summary
// ---------------------------------------------------------------------------

console.log('');
if (errors.length) {
  console.error('FAILED:');
  for (const e of errors) console.error(`  ✗  ${e}`);
  process.exit(1);
}

console.log('validate-contracts (VAL-PLAT-008/009/010): OK');
