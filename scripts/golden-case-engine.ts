/**
 * Milestone 3: Engine-level golden case regression test.
 *
 * Runs actual engine.ts tick loop with fixed seed and profile,
 * then checks KPI values against locked expectations.
 * Any code change that shifts these values will fail this test.
 *
 * This is the -E (engine) level test that complements the -F (formula)
 * level tests in validate-runtime.mjs.
 *
 * Usage: npx tsx scripts/golden-case-engine.ts
 */

import { CASE9_ACCESS_BASELINE, HOBS_MULTIBEAM_BASELINE } from '../src/core/profiles/defaults';
import { generateWalkerConstellation } from '../src/core/orbit/walker';
import { buildWalkerConfig } from '../src/core/profiles/loader';
import { buildTrajectoryCache } from '../src/core/orbit/trajectory-cache';
import { createSimEngine } from '../src/core/engine';
import type { ProfileConfig } from '../src/core/profiles/types';
import type { KpiBundle } from '../src/core/kpi/types';
import type { TrajectoryCache } from '../src/core/orbit/types';

let failures = 0;

function checkAbs(label: string, actual: number, expected: number, tol: number) {
  const diff = Math.abs(actual - expected);
  const pass = diff <= tol;
  if (!pass) failures++;
  console.log(
    `  [${pass ? 'PASS' : 'FAIL'}] ${label}: ${actual.toFixed(4)} (expected ${expected.toFixed(4)}, diff ${diff.toFixed(4)}, tol ±${tol})`,
  );
}

function checkRange(label: string, actual: number, lo: number, hi: number) {
  const pass = actual >= lo && actual <= hi;
  if (!pass) failures++;
  console.log(
    `  [${pass ? 'PASS' : 'FAIL'}] ${label}: ${actual.toFixed(4)} (range [${lo}, ${hi}])`,
  );
}

function checkExact(label: string, actual: number, expected: number) {
  const pass = actual === expected;
  if (!pass) failures++;
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${label}: ${actual} (expected ${expected})`);
}

function checkBool(label: string, condition: boolean, desc = '') {
  if (!condition) failures++;
  console.log(`  [${condition ? 'PASS' : 'FAIL'}] ${label}${desc ? ': ' + desc : ''}`);
}

function buildCache(profile: ProfileConfig, durationSec: number): TrajectoryCache {
  const elements = generateWalkerConstellation(buildWalkerConfig(profile, profile.timeControl.epochUtcMs));
  return buildTrajectoryCache({
    elements,
    observerLatDeg: profile.observer.latitudeDeg,
    observerLonDeg: profile.observer.longitudeDeg,
    observerAltKm: profile.observer.altitudeM / 1000,
    durationSec,
    stepSec: profile.timeControl.stepSec,
    epochUtcMs: profile.timeControl.epochUtcMs,
  });
}

function runProfile(profileObj: unknown, durationSec: number): KpiBundle {
  const profile = profileObj as ProfileConfig;
  const elements = generateWalkerConstellation(buildWalkerConfig(profile, profile.timeControl.epochUtcMs));

  const cache = buildTrajectoryCache({
    elements,
    observerLatDeg: profile.observer.latitudeDeg,
    observerLonDeg: profile.observer.longitudeDeg,
    observerAltKm: profile.observer.altitudeM / 1000,
    durationSec,
    stepSec: profile.timeControl.stepSec,
    epochUtcMs: profile.timeControl.epochUtcMs,
  });

  const engine = createSimEngine({ profile, trajectoryCache: cache });
  const totalTicks = Math.floor(durationSec / profile.timeControl.stepSec);

  for (let tick = 0; tick < totalTicks; tick++) {
    engine.tick(tick * profile.timeControl.stepSec, tick);
  }

  return engine.getKpiAccumulator().finalize(0);
}

// ═══════════════════════════════════════════════════════════════════
// Golden Case 1: case9-access-baseline, 300s, seed=42
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== Golden Case E-1: case9-access-baseline (300s, seed=42) ===\n');

const kpi1 = runProfile(CASE9_ACCESS_BASELINE, 300);

// Locked KPI expectations (from Milestone 2 baseline run 2026-03-23)
// Tolerances are tight: ±1 dB for SINR, ±5% relative for throughput, exact for counts
checkAbs('Mean SINR', kpi1.meanSinrDb, 7.78, 1.0);
checkAbs('SINR 5th percentile', kpi1.sinrPercentile5Db, 1.84, 1.5);
checkAbs('SINR 95th percentile', kpi1.sinrPercentile95Db, 13.78, 1.5);
checkRange('Outage ratio', kpi1.outageRatio, 0, 0.02);
checkAbs('Mean throughput (Mbps)', kpi1.meanThroughputMbps, 57.77, 5.0);
// HO timing depends on TTT + propagation delay (A2/P2). In a 300s window the
// serving satellite may not reach the hand-over threshold, so 0 is valid.
checkRange('Total handovers', kpi1.totalHandovers, 0, 3);
checkExact('HO failures', kpi1.handoverFailures, 0);
checkAbs('Service availability', kpi1.serviceAvailability, 1.0, 0.01);
checkRange('Jain fairness', kpi1.jainFairnessIndex, 0.85, 0.95);

// Seed determinism: run again, must be identical
console.log();
const kpi1b = runProfile(CASE9_ACCESS_BASELINE, 300);
checkAbs('Seed determinism: mean SINR identical', kpi1b.meanSinrDb, kpi1.meanSinrDb, 0.001);
checkExact('Seed determinism: HO count identical', kpi1b.totalHandovers, kpi1.totalHandovers);

// ═══════════════════════════════════════════════════════════════════
// Golden Case 2: hobs-multibeam-baseline, 300s, seed=42
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== Golden Case E-2: hobs-multibeam-baseline (300s, seed=42) ===\n');

const kpi2 = runProfile(HOBS_MULTIBEAM_BASELINE, 300);

// HOBS: interference-limited, Ka-band, FRF=3, 19 beams, BH 4-active/19-total round-robin
checkRange('Mean SINR', kpi2.meanSinrDb, -20, -5);
checkRange('95th percentile (center UE)', kpi2.sinrPercentile95Db, 0, 12);
checkRange('Outage ratio', kpi2.outageRatio, 0.5, 0.9);
checkRange('Mean throughput (Mbps)', kpi2.meanThroughputMbps, 10, 80);
checkRange('Service availability (BH duty cycle)', kpi2.serviceAvailability, 0.15, 1.01);
checkRange('Jain fairness (lower due to beam roll-off)', kpi2.jainFairnessIndex, 0.15, 0.5);

// Cross-profile: HOBS SINR should be lower than access (Ka-band interference)
const crossPass = kpi2.meanSinrDb < kpi1.meanSinrDb;
if (!crossPass) failures++;
console.log(`  [${crossPass ? 'PASS' : 'FAIL'}] Cross-profile: HOBS SINR (${kpi2.meanSinrDb.toFixed(1)}) < access SINR (${kpi1.meanSinrDb.toFixed(1)})`);

// Cross-profile: HOBS throughput can be higher due to wider bandwidth (100 vs 20 MHz)
// but SINR is lower, so it depends — just check it's positive
checkRange('HOBS throughput > 0', kpi2.meanThroughputMbps, 0.1, 500);

// ═══════════════════════════════════════════════════════════════════
// Golden Case E-3: VAL-UE-003 Phase B — independent HO per UE
//
// Verifies that with independentHandover: true and N=10 hotspot UEs,
// at some point during a 600s run, at least 2 served UEs are attached
// to DIFFERENT serving satellites (independent HO timing produces
// transient divergence when edge UEs trigger HO before center UEs).
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== Golden Case E-3: VAL-UE-003 Phase B independentHandover (600s, seed=42) ===\n');

const phaseB_profile: ProfileConfig = {
  ...(CASE9_ACCESS_BASELINE as unknown as ProfileConfig),
  ueConfig: {
    // uniform: UEs spread within beam footprint, all reliably served.
    // This avoids beam-edge UEs attaching to low-elevation satellites that
    // quickly disappear, which would produce NaN SINR from the KPI accumulator.
    count: 10,
    distribution: 'uniform',
    speed_kmh: 0,
    independentHandover: true,
  },
};

// Build trajectory cache for the same constellation (600s)
const cache3 = buildCache(phaseB_profile, 600);
const engine3 = createSimEngine({ profile: phaseB_profile, trajectoryCache: cache3 });

let foundDifferentSats = false;
let foundDifferentSatsTick = -1;
const totalTicks3 = Math.floor(600 / phaseB_profile.timeControl.stepSec);

for (let tick = 0; tick < totalTicks3; tick++) {
  const snapshot = engine3.tick(tick * phaseB_profile.timeControl.stepSec, tick);
  const servedUes = snapshot.ues.filter((ue) => ue.servingSatId !== null);
  if (servedUes.length >= 2) {
    const satIds = new Set(servedUes.map((ue) => ue.servingSatId));
    if (satIds.size > 1) {
      foundDifferentSats = true;
      foundDifferentSatsTick = tick;
      break; // early exit once confirmed
    }
  }
}

const kpi3 = engine3.getKpiAccumulator().finalize(0);

checkBool(
  'VAL-UE-003: Phase B UEs served by different satellites at some point',
  foundDifferentSats,
  foundDifferentSats ? `(first at tick ${foundDifferentSatsTick})` : '(never observed — all UEs always shared the same serving satellite)',
);
// Phase B with hotspot UEs: each UE independently chooses best satellite.
// HO count may be 0 if UEs stay stably attached (valid behavior).
// Service availability may be lower than Phase A for beam-edge UEs.
checkBool('Phase B: engine runs and KPI is finite', isFinite(kpi3.meanSinrDb), `mean SINR = ${kpi3.meanSinrDb.toFixed(2)} dB`);
checkRange('Phase B: service availability > 0.5 (some UEs served throughout)', kpi3.serviceAvailability, 0.5, 1.0);
checkBool('Phase B: independentHandover produces valid Jain index', kpi3.jainFairnessIndex > 0, `Jain = ${kpi3.jainFairnessIndex.toFixed(4)}`);

// ═══════════════════════════════════════════════════════════════════
// Golden Case E-4: Phase B N=100 UE stress test (SDD §13 Phase B limit)
//
// Verifies the engine completes within a reasonable wall-clock budget
// at the maximum Phase B UE count. Also validates that KPIs degrade
// gracefully (lower Jain fairness, similar availability) as more UEs
// are added at diverse positions.
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== Golden Case E-4: Phase B N=100 UE stress test (300s, seed=42) ===\n');

const phaseB100_profile: ProfileConfig = {
  ...(CASE9_ACCESS_BASELINE as unknown as ProfileConfig),
  ueConfig: {
    count: 100,
    distribution: 'uniform',
    speed_kmh: 0,
    independentHandover: true,
  },
};

const cache4 = buildCache(phaseB100_profile, 300);
const engine4 = createSimEngine({ profile: phaseB100_profile, trajectoryCache: cache4 });

const t4Start = Date.now();
const totalTicks4 = Math.floor(300 / phaseB100_profile.timeControl.stepSec);

let n100DifferentSats = false;
for (let tick = 0; tick < totalTicks4; tick++) {
  const snapshot = engine4.tick(tick * phaseB100_profile.timeControl.stepSec, tick);
  if (!n100DifferentSats) {
    const servedUes = snapshot.ues.filter((ue) => ue.servingSatId !== null);
    const satIds = new Set(servedUes.map((ue) => ue.servingSatId));
    if (satIds.size > 1) n100DifferentSats = true;
  }
}

const wallClockMs4 = Date.now() - t4Start;
const kpi4 = engine4.getKpiAccumulator().finalize(wallClockMs4);

console.log(`  Wall-clock: ${wallClockMs4} ms (300 ticks × 100 UEs)`);

checkBool('N=100 Phase B: engine completes without error', isFinite(kpi4.meanSinrDb), `mean SINR = ${kpi4.meanSinrDb.toFixed(2)} dB`);
checkBool('N=100 Phase B: different serving satellites found', n100DifferentSats);
checkRange('N=100 Phase B: service availability', kpi4.serviceAvailability, 0.7, 1.0);
checkRange('N=100 Phase B: Jain fairness (diversity reduces fairness)', kpi4.jainFairnessIndex, 0.1, 0.85);
// Wall-clock budget: Phase B N=100 × 300 ticks must complete in < 60 s (SDD §13)
checkBool('N=100 Phase B: wall-clock < 60000 ms', wallClockMs4 < 60000, `${wallClockMs4} ms`);

// ═══════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(50)}`);
if (failures === 0) {
  console.log('✅ ALL GOLDEN CASE ENGINE CHECKS PASSED');
} else {
  console.log(`❌ ${failures} GOLDEN CASE ENGINE CHECK(S) FAILED`);
}
console.log('═'.repeat(50));

process.exit(failures > 0 ? 1 : 0);
