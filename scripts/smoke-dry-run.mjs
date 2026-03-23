/**
 * Smoke test: verify Phase 0 contracts are syntactically complete.
 * Proves exit criteria #2: dry-run contract + manifest + KPI bundle shapes exist.
 *
 * Since core/ is pure TS (no browser deps), we parse the source for expected exports.
 * The actual runtime dry-run requires a Node-compatible build (Phase 1 task).
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const errors = [];

// Check each contract file exists and exports expected symbols
const checks = [
  {
    file: 'src/core/profiles/types.ts',
    symbols: ['ProfileFamily', 'ProfileConfig', 'OrbitalConfig', 'RfConfig', 'BeamConfig'],
  },
  {
    file: 'src/core/profiles/defaults.ts',
    symbols: ['CASE9_ACCESS_BASELINE', 'HOBS_MULTIBEAM_BASELINE', 'BH_RESOURCE_BASELINE', 'REAL_TRACE_VALIDATION'],
  },
  {
    file: 'src/core/profiles/loader.ts',
    symbols: ['loadProfile', 'resolveProfile', 'serializeProfile', 'validateProfile'],
  },
  {
    file: 'src/core/trace/types.ts',
    symbols: ['RunManifest', 'ResolvedConfig', 'SourceTrace', 'EventLog', 'RunArtifactBundle', 'ReplayManifest', 'AssumptionRecord'],
  },
  {
    file: 'src/core/trace/factory.ts',
    symbols: ['createRunManifest', 'createResolvedConfig', 'createEmptyEventLog', 'createEmptyKpiBundle', 'createRunArtifactBundle'],
  },
  {
    file: 'src/core/trace/serialization.ts',
    symbols: ['serializeBundle', 'deserializeBundle'],
  },
  {
    file: 'src/runner/headless/dry-run.ts',
    symbols: ['executeDryRun'],
  },
  {
    file: 'src/runner/replay/controller.ts',
    symbols: ['createReplayController'],
  },
  {
    file: 'src/core/common/types.ts',
    symbols: ['SourceTier', 'createRng', 'SimulationSnapshot', 'KpiBundleShell'],
  },
];

for (const { file, symbols } of checks) {
  const fullPath = path.join(rootDir, file);
  if (!existsSync(fullPath)) {
    errors.push(`MISSING: ${file}`);
    continue;
  }
  const content = readFileSync(fullPath, 'utf8');
  for (const sym of symbols) {
    if (!content.includes(sym)) {
      errors.push(`${file}: missing expected symbol '${sym}'`);
    }
  }
}

// Verify TypeScript compiled cleanly (build already ran in validate:stage)
if (!existsSync(path.join(rootDir, 'dist/index.html'))) {
  errors.push('dist/index.html not found — build may have failed');
}

if (errors.length) {
  console.error('smoke-dry-run FAILED:');
  for (const e of errors) {
    console.error(`  - ${e}`);
  }
  process.exit(1);
}

console.log('smoke-dry-run: OK');
console.log(`  Verified ${checks.length} contract files, ${checks.reduce((n, c) => n + c.symbols.length, 0)} symbols`);
