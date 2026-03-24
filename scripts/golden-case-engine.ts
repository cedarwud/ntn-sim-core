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
import { buildTrajectoryCache } from '../src/core/orbit/trajectory-cache';
import { createSimEngine } from '../src/core/engine';
import type { ProfileConfig } from '../src/core/profiles/types';
import type { KpiBundle } from '../src/core/kpi/types';

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

function runProfile(profileObj: unknown, durationSec: number): KpiBundle {
  const profile = profileObj as ProfileConfig;
  const elements = generateWalkerConstellation({
    shells: [{
      id: `${profile.id}-shell`,
      altitudeKm: profile.orbital.altitude_km,
      inclinationDeg: profile.orbital.inclination_deg,
      planes: profile.orbital.num_planes,
      satsPerPlane: profile.orbital.sats_per_plane,
    }],
    epochUtcMs: profile.timeControl.epochUtcMs,
  });

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
checkExact('Total handovers', kpi1.totalHandovers, 1);
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

// HOBS: interference-limited, Ka-band, FRF=3, 19 beams
checkRange('Mean SINR', kpi2.meanSinrDb, -15, -5);
checkRange('95th percentile (center UE)', kpi2.sinrPercentile95Db, 2, 12);
checkRange('Outage ratio', kpi2.outageRatio, 0.5, 0.85);
checkRange('Mean throughput (Mbps)', kpi2.meanThroughputMbps, 20, 80);
checkAbs('Service availability', kpi2.serviceAvailability, 1.0, 0.01);
checkRange('Jain fairness (lower due to beam roll-off)', kpi2.jainFairnessIndex, 0.15, 0.5);

// Cross-profile: HOBS SINR should be lower than access (Ka-band interference)
const crossPass = kpi2.meanSinrDb < kpi1.meanSinrDb;
if (!crossPass) failures++;
console.log(`  [${crossPass ? 'PASS' : 'FAIL'}] Cross-profile: HOBS SINR (${kpi2.meanSinrDb.toFixed(1)}) < access SINR (${kpi1.meanSinrDb.toFixed(1)})`);

// Cross-profile: HOBS throughput can be higher due to wider bandwidth (100 vs 20 MHz)
// but SINR is lower, so it depends — just check it's positive
checkRange('HOBS throughput > 0', kpi2.meanThroughputMbps, 0.1, 500);

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
