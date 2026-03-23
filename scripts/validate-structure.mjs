import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

const requiredPaths = [
  // Preflight
  'src/app/AppShell.tsx',
  'src/assets/models.ts',
  'src/assets/scenes.ts',
  'src/config/observer-presets.ts',
  'src/config/visual-scene.config.ts',
  'src/viz/scene/SceneShell.tsx',
  'src/viz/README.md',
  'src/core/README.md',
  'src/runner/README.md',
  'scripts/validate-profile-layout.mjs',
  'scripts/validate-traceability-placeholders.mjs',
  // Phase 0 contracts
  'src/core/common/types.ts',
  'src/core/common/index.ts',
  'src/core/profiles/types.ts',
  'src/core/profiles/loader.ts',
  'src/core/profiles/index.ts',
  'src/core/trace/types.ts',
  'src/core/trace/factory.ts',
  'src/core/trace/serialization.ts',
  'src/core/trace/index.ts',
  'src/runner/headless/dry-run.ts',
  'src/runner/headless/index.ts',
  'src/runner/replay/controller.ts',
  'src/runner/replay/index.ts',
  // Phase 1 orbit + viz
  'src/core/common/constants.ts',
  'src/core/orbit/types.ts',
  'src/core/orbit/math.ts',
  'src/core/orbit/propagation.ts',
  'src/core/orbit/topocentric.ts',
  'src/core/orbit/walker.ts',
  'src/core/orbit/trajectory-cache.ts',
  'src/core/orbit/index.ts',
  'src/viz/satellite/observer-sky-projection.ts',
  'src/viz/satellite/SatelliteSkyLayer.tsx',
  'src/viz/satellite/index.ts',
];

const forbiddenPaths = [
  'src/App.tsx',
  'src/config/ntpu.config.ts',
  'src/components',
];

const missing = requiredPaths.filter((relativePath) => {
  return !existsSync(path.join(rootDir, relativePath));
});

const forbidden = forbiddenPaths.filter((relativePath) => {
  return existsSync(path.join(rootDir, relativePath));
});

if (missing.length || forbidden.length) {
  if (missing.length) {
    console.error('Missing required structure paths:');
    for (const entry of missing) {
      console.error(`- ${entry}`);
    }
  }

  if (forbidden.length) {
    console.error('Forbidden legacy paths still present:');
    for (const entry of forbidden) {
      console.error(`- ${entry}`);
    }
  }

  process.exit(1);
}

console.log('validate-structure: OK');
