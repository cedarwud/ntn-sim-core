import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

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

const errors = [];

if (!observerConfig.includes('latitudeDeg') || !observerConfig.includes('longitudeDeg')) {
  errors.push('observer-presets.ts must declare latitudeDeg and longitudeDeg.');
}

if (visualConfig.includes('observer:')) {
  errors.push('visual-scene.config.ts must not define an observer block.');
}

if (!visualConfig.includes('camera') || !visualConfig.includes('scene') || !visualConfig.includes('uav')) {
  errors.push('visual-scene.config.ts must define scene, uav, and camera sections.');
}

if (!assetModels.includes('/models/sat.glb') || !assetModels.includes('/models/uav.glb')) {
  errors.push('models.ts must register both sat.glb and uav.glb.');
}

if (errors.length) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

console.log('validate-profile-layout: OK');
