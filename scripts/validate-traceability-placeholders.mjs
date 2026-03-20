import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

const requiredDocs = [
  'docs/architecture/ntn-sim-core-architecture-blueprint.md',
  'sdd/ntn-sim-core-sdd.md',
  'sdd/ntn-sim-core-profile-baselines.md',
  'sdd/ntn-sim-core-roadmap.md',
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

console.log('validate-traceability-placeholders: OK');
