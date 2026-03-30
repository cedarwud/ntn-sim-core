import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

const requiredDocs = [
  'docs/architecture/ntn-sim-core-architecture-blueprint.md',
  'sdd/ntn-sim-core-sdd.md',
  'sdd/ntn-sim-core-profile-baselines.md',
  'sdd/ntn-sim-core-platform-refactor-roadmap.md',
  'sdd/ntn-sim-core-validation-matrix.md',
  'sdd/ntn-sim-core-implementation-status.md',
  'sdd/ntn-sim-core-development-constraints.md',
  'sdd/ntn-sim-core-acceptance-gates.md',
  'sdd/ntn-sim-core-assumption-policy.md',
];

const requiredDirs = [
  'src/core/profiles',
  'src/core/trace',
  'src/runner/headless',
  'src/runner/replay',
  'src/runner/curation',
];

const missing = [...requiredDocs, ...requiredDirs].filter((relativePath) => {
  return !existsSync(path.join(rootDir, relativePath));
});

if (missing.length) {
  console.error('Missing traceability placeholder paths:');
  for (const entry of missing) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────
// Phase 2: check that paper-sources.json registry is non-empty and
// contains both papers and assumptions sections (not just a placeholder).
// ─────────────────────────────────────────────────────────────────────
const registryPath = path.join(rootDir, 'src/core/config/paper-sources.json');
let registryErrors = [];
if (!existsSync(registryPath)) {
  registryErrors.push('src/core/config/paper-sources.json missing');
} else {
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const paperCount = Object.keys(registry.papers ?? {}).length;
  const assumptionCount = Object.keys(registry.assumptions ?? {}).length;
  if (paperCount < 5) registryErrors.push(`paper-sources.json: only ${paperCount} papers (expected ≥5)`);
  if (assumptionCount < 3) registryErrors.push(`paper-sources.json: only ${assumptionCount} assumptions (expected ≥3)`);
}

if (registryErrors.length) {
  console.error('Source registry validation errors:');
  for (const e of registryErrors) console.error(`- ${e}`);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────
// Phase 3: parameter-level provenance coverage check.
// Reads the per-family defaults files and verifies that the primary baselines
// carry both a healthy count of parameterPath entries and a few anchor
// parameters that must never lose provenance coverage.
// (Phase 3 Group 3: defaults.ts is now a thin re-export; profile content
// lives in defaults-access.ts, defaults-hobs.ts, defaults-misc.ts.)
// ─────────────────────────────────────────────────────────────────────
const accessSrc = readFileSync(path.join(rootDir, 'src/core/profiles/defaults-access.ts'), 'utf8');
const hobsSrc   = readFileSync(path.join(rootDir, 'src/core/profiles/defaults-hobs.ts'), 'utf8');
const miscSrc   = readFileSync(path.join(rootDir, 'src/core/profiles/defaults-misc.ts'), 'utf8');

// Count parameterPath occurrences in each baseline block.
// We split by baseline export to scope the count.
const baselineBlocks = {
  'case9-access-baseline': accessSrc.match(/CASE9_ACCESS_BASELINE[\s\S]*?(?=^export const |\Z)/m)?.[0] ?? '',
  'hobs-multibeam-baseline': hobsSrc.match(/HOBS_MULTIBEAM_BASELINE[\s\S]*?(?=^export const |\Z)/m)?.[0] ?? '',
  'realistic-first-screen': miscSrc.match(/REALISTIC_FIRST_SCREEN[\s\S]*?(?=^export const |\Z)/m)?.[0] ?? '',
};

// For the energy_per_handover_j future-proofing check, scan all family files.
const allProfilesSrc = accessSrc + hobsSrc + miscSrc +
  readFileSync(path.join(rootDir, 'src/core/profiles/defaults-bh.ts'), 'utf8');

const requiredParameterPaths = {
  'case9-access-baseline': [
    'rf.frequency_ghz',
    'rf.eirp_density_dbw_per_mhz',
    'handover.trigger_threshold_db',
  ],
  'hobs-multibeam-baseline': [
    'rf.frequency_ghz',
    'rf.bandwidth_mhz',
    'rf.max_tx_power_dbm',
  ],
  'realistic-first-screen': [
    'rf.tx_power_per_beam_dbm',
    'rf.noise_temperature_k',
    'handover.trigger_threshold_db',
    'channel.los_elevation_deg',
  ],
};

let provErrors = [];
for (const [name, block] of Object.entries(baselineBlocks)) {
  const count = (block.match(/parameterPath:/g) ?? []).length;
  if (count < 3) {
    provErrors.push(`${name}: only ${count} parameterPath entries in sourceMap (expected ≥3)`);
  } else {
    console.log(`  ${name}: ${count} parameterPath entries ✓`);
  }

  for (const requiredPath of requiredParameterPaths[name] ?? []) {
    if (!block.includes(`parameterPath: '${requiredPath}'`)) {
      provErrors.push(`${name}: missing required parameterPath '${requiredPath}'`);
    }
  }
}

// Future-proofing: if any profile starts using energy_per_handover_j, that
// field must also appear in parameter-level provenance.
if (/energy_per_handover_j\s*:/.test(allProfilesSrc) &&
    !/parameterPath:\s*'energy\.energy_per_handover_j'/.test(allProfilesSrc)) {
  provErrors.push('defaults.ts uses energy_per_handover_j but sourceMap lacks parameterPath="energy.energy_per_handover_j"');
}

if (provErrors.length) {
  console.error('Parameter-level provenance coverage errors:');
  for (const e of provErrors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('validate-traceability-placeholders: OK');
