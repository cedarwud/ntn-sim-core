import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

const requiredPaths = [
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
