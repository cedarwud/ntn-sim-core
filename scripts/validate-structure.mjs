import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const srcCoreDir = path.join(rootDir, 'src/core');

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
  'scripts/validate-profiles.mjs',
  'scripts/validate-traceability-placeholders.mjs',
  // Phase 0 contracts
  'src/core/common/types.ts',
  'src/core/common/index.ts',
  'src/core/profiles/types.ts',
  'src/core/profiles/loader.ts',
  'src/core/profiles/runtime-materialization.ts',
  'src/core/profiles/profile-authoring-registry.ts',
  'src/core/profiles/profile-exposure-catalog.ts',
  'src/core/config/profile-provenance-view.ts',
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
  // Phase 5 structure gates
  'src/core/engine.ts',
  'src/core/engine/tick.ts',
  'src/core/engine/orbit-step.ts',
  'src/core/engine/channel-step.ts',
  'src/core/engine/handover-step.ts',
  'src/core/engine/scheduler-step.ts',
];

const forbiddenPaths = [
  'src/App.tsx',
  'src/config/ntpu.config.ts',
  'src/components',
  'src/core/profiles/profile-composer.ts',
];

function fail(message) {
  console.error(message);
  failures += 1;
}

function countLines(text) {
  return text.split('\n').length;
}

function collectSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const absPath = path.join(dir, entry);
    const stats = statSync(absPath);
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(absPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) {
      files.push(absPath);
    }
  }
  return files;
}

let failures = 0;

const missing = requiredPaths.filter((relativePath) => !existsSync(path.join(rootDir, relativePath)));
const forbidden = forbiddenPaths.filter((relativePath) => existsSync(path.join(rootDir, relativePath)));

if (missing.length) {
  console.error('Missing required structure paths:');
  for (const entry of missing) {
    console.error(`- ${entry}`);
  }
  failures += missing.length;
}

if (forbidden.length) {
  console.error('Forbidden legacy paths still present:');
  for (const entry of forbidden) {
    console.error(`- ${entry}`);
  }
  failures += forbidden.length;
}

// VAL-PLAT-011: recursive src/core file size gate
const oversizeFiles = collectSourceFiles(srcCoreDir)
  .map((absPath) => ({
    absPath,
    relativePath: path.relative(rootDir, absPath),
    lineCount: countLines(readFileSync(absPath, 'utf8')),
  }))
  .filter((entry) => entry.lineCount > 650);

if (oversizeFiles.length) {
  console.error('VAL-PLAT-011: src/core files over 650 lines:');
  for (const entry of oversizeFiles) {
    console.error(`- ${entry.relativePath}: ${entry.lineCount}`);
  }
  failures += oversizeFiles.length;
} else {
  console.log('VAL-PLAT-011: PASS — all src/core .ts/.tsx files are <= 650 lines');
}

// VAL-PLAT-012: engine.ts thin orchestrator + engine/ directory structure
const enginePath = path.join(rootDir, 'src/core/engine.ts');
if (existsSync(enginePath)) {
  const engineText = readFileSync(enginePath, 'utf8');
  const engineLineCount = countLines(engineText);
  if (engineLineCount > 200) {
    fail(`VAL-PLAT-012: src/core/engine.ts is ${engineLineCount} lines (limit 200)`);
  } else {
    console.log(`VAL-PLAT-012: PASS — src/core/engine.ts is ${engineLineCount} lines`);
  }

  const forbiddenImportPatterns = [
    /from\s+['"].*\/channel\//,
    /from\s+['"].*\/beam\//,
    /from\s+['"].*\/handover\//,
    /from\s+['"].*\/energy\//,
    /from\s+['"].*\/ue\//,
    /from\s+['"].*\/traffic\//,
  ];
  const hasForbiddenEngineImports = forbiddenImportPatterns.some((pattern) => pattern.test(engineText));
  if (hasForbiddenEngineImports) {
    fail('VAL-PLAT-012: src/core/engine.ts still imports subsystem implementation modules directly');
  } else {
    console.log('VAL-PLAT-012: PASS — src/core/engine.ts imports only orchestrator-facing modules');
  }

  const functionNames = [...engineText.matchAll(/\bfunction\s+([A-Za-z0-9_]+)/g)].map((match) => match[1]);
  const extraFunctions = functionNames.filter((name) => name !== 'createSimEngine');
  if (extraFunctions.length > 0) {
    fail(`VAL-PLAT-012: src/core/engine.ts defines helper functions (${extraFunctions.join(', ')}) instead of staying as thin orchestrator`);
  } else {
    console.log('VAL-PLAT-012: PASS — src/core/engine.ts defines only createSimEngine()');
  }
}

if (failures > 0) {
  console.error(`validate-structure: FAILED (${failures} violation(s))`);
  process.exit(1);
}

console.log('validate-structure: OK');
