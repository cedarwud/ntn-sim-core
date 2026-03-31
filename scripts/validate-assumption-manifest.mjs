/**
 * validate-assumption-manifest.mjs
 *
 * Checks that:
 * 1. benchmark-runner.ts collects and passes provenance-backed assumptionSet to createRunArtifactBundle.
 * 2. createRunArtifactBundle signature in factory.ts accepts assumptionSet parameter.
 * 3. RunArtifactBundle type in trace/types.ts declares assumptionSet field.
 * 4. RunManifest type declares specModeIndex field.
 * 5. CreateRunManifestOpts declares specModeIndex field.
 * 6. profile-provenance-view.ts exposes specModeIndex and assumptionSet.
 *
 * Exits 0 on pass, 1 on failure.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function readFile(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

let failures = 0;

function check(description, condition) {
  if (!condition) {
    console.error(`  FAIL: ${description}`);
    failures++;
  } else {
    console.log(`  PASS: ${description}`);
  }
}

// 1. trace/types.ts: RunArtifactBundle has assumptionSet
const traceTypes = readFile('src/core/trace/types.ts');
check(
  'RunArtifactBundle declares assumptionSet field',
  traceTypes.includes('assumptionSet?') && traceTypes.includes('AssumptionRecord[]'),
);
check(
  'RunManifest declares specModeIndex field',
  traceTypes.includes('specModeIndex?'),
);

// 2. trace/factory.ts: createRunArtifactBundle accepts assumptionSet param
const factory = readFile('src/core/trace/factory.ts');
check(
  'createRunArtifactBundle signature includes assumptionSet parameter',
  factory.includes('assumptionSet?: AssumptionRecord[]'),
);
check(
  'CreateRunManifestOpts declares specModeIndex',
  factory.includes('specModeIndex?'),
);
check(
  'createRunManifest applies specModeIndex from opts',
  factory.includes('opts.specModeIndex'),
);

// 3. benchmark-runner.ts: collects specModeIndex and assumptionSet
const runner = readFile('src/runner/headless/benchmark-runner.ts');
check(
  'benchmark-runner imports profile provenance view',
  runner.includes('getProfileProvenanceView'),
);
check(
  'benchmark-runner forwards provenance-backed specModeIndex',
  runner.includes('provenance.specModeIndex'),
);
check(
  'benchmark-runner passes assumptionSet to createRunArtifactBundle',
  runner.includes('provenance.assumptionSet'),
);

const provenanceView = readFile('src/core/config/profile-provenance-view.ts');
check(
  'profile-provenance-view exposes specModeIndex',
  provenanceView.includes('specModeIndex'),
);
check(
  'profile-provenance-view exposes assumptionSet',
  provenanceView.includes('assumptionSet'),
);

if (failures > 0) {
  console.error(`\nvalidate-assumption-manifest: FAIL (${failures} check(s) failed)`);
  process.exit(1);
} else {
  console.log(`\nvalidate-assumption-manifest: OK`);
}
