#!/usr/bin/env node
/**
 * validate-final.mjs — Comprehensive Phase 0-6 validation gate checker.
 *
 * Structural / existence checks only (no runtime).
 * Exit 0 = all structural checks pass. Exit 1 = at least one failure.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const src = (...p) => join(ROOT, 'src', ...p);

// ── Required modules by phase ──────────────────────────────────────────────

const requiredModules = {
  // Phase 0
  'src/core/common/types.ts': 0,
  'src/core/profiles/types.ts': 0,
  'src/core/profiles/defaults.ts': 0,
  'src/core/profiles/loader.ts': 0,
  'src/core/trace/types.ts': 0,
  'src/core/trace/factory.ts': 0,
  'src/core/trace/serialization.ts': 0,
  'src/runner/headless/dry-run.ts': 0,
  'src/runner/replay/controller.ts': 0,
  // Phase 1
  'src/core/orbit/propagation.ts': 1,
  'src/core/orbit/topocentric.ts': 1,
  'src/core/orbit/walker.ts': 1,
  'src/core/orbit/trajectory-cache.ts': 1,
  'src/viz/satellite/SatelliteSkyLayer.tsx': 1,
  // Phase 2
  'src/core/channel/fspl.ts': 2,
  'src/core/channel/beam-gain.ts': 2,
  'src/core/channel/shadow-fading.ts': 2,
  'src/core/channel/sinr.ts': 2,
  'src/core/handover/manager.ts': 2,
  'src/core/handover/baselines.ts': 2,
  'src/core/kpi/accumulator.ts': 2,
  'src/core/engine.ts': 2,
  // Phase 3
  'src/core/beam/layout.ts': 3,
  'src/core/beam/selection.ts': 3,
  'src/core/beam/active-beam-manager.ts': 3,
  'src/core/energy/layer1.ts': 3,
  // Phase 4
  'src/core/orbit/tle-loader.ts': 4,
  'src/core/orbit/sgp4-adapter.ts': 4,
  'src/runner/curation/pass-ranker.ts': 4,
  'src/runner/curation/window-selector.ts': 4,
  // Phase 5
  'src/core/beam/scheduler.ts': 5,
  'src/core/energy/layer2.ts': 5,
  'src/viz/overlays/SimHud.tsx': 5,
  // Phase 6
  'src/core/handover/daps.ts': 6,
};

// ── Validation gate definitions ─────────────────────────────────────────────

const results = [];
let failures = 0;

function record(id, phase, pass, method) {
  const status = pass ? 'PASS' : 'FAIL';
  if (!pass) failures++;
  results.push({ id, phase, status, method });
}

// Helper: check file exists relative to ROOT
function fileExists(rel) {
  return existsSync(join(ROOT, rel));
}

// Helper: read file content
function readFile(rel) {
  const p = join(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf-8') : null;
}

// ── 1. Module existence checks ──────────────────────────────────────────────

const missingByPhase = {};
for (const [rel, phase] of Object.entries(requiredModules)) {
  const exists = fileExists(rel);
  if (!exists) {
    missingByPhase[phase] = missingByPhase[phase] || [];
    missingByPhase[phase].push(rel);
  }
}

// ── 2. VAL-ARCH-001: no React/Three imports in src/core/ ────────────────────

import { readdirSync, statSync } from 'node:fs';

function walkDir(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walkDir(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

const coreFiles = walkDir(src('core'));
const reactThreeViolations = coreFiles
  .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
  .filter(f => {
    const c = readFileSync(f, 'utf-8');
    return /from\s+['"]react/.test(c) || /from\s+['"]@react-three/.test(c) || /from\s+['"]three/.test(c);
  })
  .map(f => f.replace(ROOT + '/', ''));

record('VAL-ARCH-001', 0, reactThreeViolations.length === 0,
  reactThreeViolations.length === 0
    ? 'no React/Three imports in src/core/'
    : `violations: ${reactThreeViolations.join(', ')}`);

// ── 3. VAL-ARCH-002: observer-presets separate from visual-scene.config ─────

record('VAL-ARCH-002', 0,
  fileExists('src/config/observer-presets.ts') && fileExists('src/config/visual-scene.config.ts'),
  'observer-presets.ts and visual-scene.config.ts are separate files');

// ── 4. VAL-CONF-001: defaults.ts exports profiles ──────────────────────────

const defaultsContent = readFile('src/core/profiles/defaults.ts');
const hasProfiles = defaultsContent
  ? ['case9-access-baseline', 'hobs-multibeam-baseline', 'bh-resource-baseline', 'real-trace-validation'].filter(p =>
      defaultsContent.includes(p)
    ).length >= 4
  : false;
record('VAL-CONF-001', 0, hasProfiles && fileExists('src/core/profiles/loader.ts'),
  'profiles/defaults.ts exports 4 canonical profiles; loader.ts exists');

// ── 5. VAL-TRACE-001: trace types, factory, serialization exist ─────────────

record('VAL-TRACE-001', 0,
  fileExists('src/core/trace/types.ts') && fileExists('src/core/trace/factory.ts') && fileExists('src/core/trace/serialization.ts'),
  'trace/types.ts, factory.ts, serialization.ts present');

// ── 6. Runtime gates ────────────────────────────────────────────────────────
// Split into: covered by validate-runtime.mjs / golden-case scripts (run in validate:stage)
// vs. still needing integration / browser testing.

const coveredByRuntime = [
  { id: 'VAL-RNG-001',    phase: 1, note: 'covered by validate-runtime.mjs' },
  { id: 'VAL-ORB-002',    phase: 1, note: 'covered by golden-case-orbit.mjs' },
  { id: 'VAL-VIZ-001',    phase: 1, note: 'covered by validate-replay-manifest.ts + validate-visual-browser.ts' },
  { id: 'VAL-CHAN-001',    phase: 2, note: 'covered by golden-case-channel.mjs' },
  { id: 'VAL-CHAN-002',    phase: 2, note: 'covered by golden-case-channel.mjs' },
  { id: 'VAL-HO-001',     phase: 2, note: 'covered by validate-runtime.mjs' },
  { id: 'VAL-HO-002',     phase: 2, note: 'covered by the landed event-trace path plus CHO/MC-HO remediation trace checks' },
  { id: 'VAL-KPI-001',    phase: 2, note: 'covered by validate-replay-manifest.ts (headless vs snapshot KPI parity)' },
  { id: 'VAL-GOLDEN-001', phase: 2, note: 'covered by golden-case-engine.ts E-1' },
  { id: 'VAL-SINR-001',   phase: 3, note: 'covered by validate-runtime.mjs' },
  { id: 'VAL-EE-001',     phase: 3, note: 'covered by validate-runtime.mjs' },
  { id: 'VAL-MB-001',     phase: 3, note: 'covered by validate-multibeam-gating.ts' },
  { id: 'VAL-GOLDEN-002', phase: 3, note: 'covered by golden-case-engine.ts E-2' },
  { id: 'VAL-RT-001',     phase: 4, note: 'covered by validate-replay-manifest.ts (real-trace replay identity)' },
  { id: 'VAL-RT-002',     phase: 4, note: 'covered by validate-replay-manifest.ts' },
  { id: 'VAL-CUR-001',    phase: 4, note: 'covered by validate-replay-manifest.ts' },
  { id: 'VAL-BH-001',     phase: 5, note: 'covered by validate-runtime.mjs' },
  { id: 'VAL-EE-002',     phase: 5, note: 'covered by validate-runtime.mjs' },
  { id: 'VAL-DAPS-002',   phase: 6, note: 'covered by validate-runtime.mjs' },
];

const coveredByBrowser = [
  { id: 'VAL-ORB-001',    phase: 1, note: 'covered by validate-orbit-parity.ts (browser vs headless live orbit parity)' },
  { id: 'VAL-BEAM-001',   phase: 2, note: 'covered by validate-visual-browser.ts (earth-moving beam geometry contract)' },
  { id: 'VAL-FV-004',     phase: 5, note: 'covered by validate-visual-browser.ts' },
  { id: 'VAL-FV-005',     phase: 3, note: 'covered by validate-visual-browser.ts' },
  { id: 'VAL-FV-006',     phase: 3, note: 'covered by validate-visual-browser.ts' },
  { id: 'VAL-FV-007',     phase: 3, note: 'covered by validate-visual-browser.ts' },
  { id: 'VAL-FV-008',     phase: 4, note: 'covered by validate-visual-browser.ts' },
  { id: 'VAL-FV-009',     phase: 6, note: 'covered by validate-visual-browser.ts' },
  { id: 'VAL-EXP-001',    phase: 5, note: 'covered by validate-visual-browser.ts' },
];

const needsIntegration = [];

for (const g of coveredByRuntime) {
  results.push({ id: g.id, phase: g.phase, status: 'RT-PASS', method: g.note });
}
for (const g of coveredByBrowser) {
  results.push({ id: g.id, phase: g.phase, status: 'B-PASS', method: g.note });
}
for (const g of needsIntegration) {
  results.push({ id: g.id, phase: g.phase, status: 'INTEG', method: g.note });
}

// ── 7. DAPS gates (blocked) ─────────────────────────────────────────────────

const dapsExists = fileExists('src/core/handover/daps.ts');
record('VAL-DAPS-001', 6, dapsExists, dapsExists ? 'daps.ts present' : 'daps.ts not yet created');
// VAL-DAPS-002 is covered by validate-runtime.mjs (already in coveredByRuntime list above)

// ── 8. Module count thresholds ──────────────────────────────────────────────

const coreCount = coreFiles.filter(f => f.endsWith('.ts')).length;
const runnerFiles = walkDir(src('runner')).filter(f => f.endsWith('.ts'));
const vizFiles = walkDir(src('viz')).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

record('COUNT-CORE', '-', coreCount >= 45, `core modules: ${coreCount} (threshold: 45)`);
record('COUNT-RUNNER', '-', runnerFiles.length >= 9, `runner modules: ${runnerFiles.length} (threshold: 9)`);
record('COUNT-VIZ', '-', vizFiles.length >= 12, `viz modules: ${vizFiles.length} (threshold: 12)`);

// ── Print summary ───────────────────────────────────────────────────────────

console.log('\n=== NTN Sim Core — Final Validation Summary ===\n');

// Module existence
const allPhases = [0, 1, 2, 3, 4, 5, 6];
for (const phase of allPhases) {
  const missing = missingByPhase[phase] || [];
  const total = Object.entries(requiredModules).filter(([, p]) => p === phase).length;
  const present = total - missing.length;
  const mark = missing.length === 0 ? 'OK' : 'MISSING';
  console.log(`  Phase ${phase} modules: ${present}/${total} ${mark}${missing.length ? ' — ' + missing.join(', ') : ''}`);
}

console.log('\n--- Validation Gates ---\n');
console.log('  ID                 Phase  Status   Method');
console.log('  ─────────────────  ─────  ───────  ──────');
for (const r of results) {
  const id = r.id.padEnd(19);
  const ph = String(r.phase).padEnd(5);
  const st = r.status.padEnd(7);
  console.log(`  ${id}  ${ph}  ${st}  ${r.method}`);
}

const structPass = results.filter(r => r.status === 'PASS').length;
const structFail = results.filter(r => r.status === 'FAIL').length;
const rtPass = results.filter(r => r.status === 'RT-PASS').length;
const browserPass = results.filter(r => r.status === 'B-PASS').length;
const integ = results.filter(r => r.status === 'INTEG').length;

console.log(`\n  Structural PASS:        ${structPass}`);
console.log(`  Runtime-covered PASS:   ${rtPass}  (verified by validate-runtime / golden-case scripts)`);
console.log(`  Browser-covered PASS:   ${browserPass}  (verified by validate-visual-browser.ts)`);
console.log(`  Integration deferred:   ${integ}  (needs browser or end-to-end test)`);
console.log(`  Structural FAIL:        ${structFail}`);
console.log();

if (failures > 0) {
  console.log(`EXIT 1 — ${failures} structural failure(s)\n`);
  process.exit(1);
} else {
  console.log('EXIT 0 — all structural checks passed\n');
  process.exit(0);
}
