/**
 * Milestone 1: End-to-end baseline benchmark run.
 *
 * Exercises the actual engine.ts code path (not formula re-implementation).
 * Runs case9-access-baseline for 600 seconds, outputs KPI summary + JSON.
 *
 * Usage: npx tsx scripts/run-baseline.ts [profileId] [durationSec]
 */

import { CASE9_ACCESS_BASELINE, HOBS_MULTIBEAM_BASELINE, MODQN_PAPER_BASELINE, BH_RESOURCE_BASELINE, REAL_TRACE_VALIDATION } from '../src/core/profiles/defaults';
import { generateWalkerConstellation } from '../src/core/orbit/walker';
import { buildWalkerConfig } from '../src/core/profiles/loader';
import { buildTrajectoryCache } from '../src/core/orbit/trajectory-cache';
import { loadOmmRecords, ommToSatrecs, sampleRecords } from '../src/core/orbit/tle-loader';
import { satrecsToOrbitElements } from '../src/core/orbit/sgp4-adapter';
import { createSimEngine } from '../src/core/engine';
import type { ProfileConfig } from '../src/core/profiles/types';
import type { OrbitElement } from '../src/core/orbit/types';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const profileId = process.argv[2] ?? 'case9-access-baseline';
const durationOverride = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;

// Select profile
const PROFILES: Record<string, unknown> = {
  'case9-access-baseline': CASE9_ACCESS_BASELINE,
  'hobs-multibeam-baseline': HOBS_MULTIBEAM_BASELINE,
  'modqn-paper-baseline': MODQN_PAPER_BASELINE,
  'bh-resource-baseline': BH_RESOURCE_BASELINE,
  'real-trace-validation': REAL_TRACE_VALIDATION,
};
const profileObj = PROFILES[profileId];
if (!profileObj) {
  console.error(`Unknown profile: ${profileId}. Available: ${Object.keys(PROFILES).join(', ')}`);
  process.exit(1);
}
const profile = profileObj as ProfileConfig;

// Override duration if specified (default: use profile's durationSec, capped at 600 for quick test)
const durationSec = durationOverride ?? Math.min(profile.timeControl.durationSec, 600);
const stepSec = profile.timeControl.stepSec;

console.log(`\n=== Milestone 1: End-to-End Baseline Run ===`);
console.log(`Profile:  ${profile.id}`);
console.log(`Duration: ${durationSec}s (step ${stepSec}s)`);
console.log(`Orbit:    ${profile.orbital.altitude_km}km, ${profile.orbital.num_planes}×${profile.orbital.sats_per_plane} sats`);
console.log(`HO type:  ${profile.handover.type}`);
console.log(`UE count: ${profile.ueConfig.count}`);
console.log(`Seed:     ${profile.seed}`);
console.log();

// ---------------------------------------------------------------------------
// Build constellation
// ---------------------------------------------------------------------------

console.log('Building constellation...');
const t0 = performance.now();

let elements: OrbitElement[];
if (profile.orbitMode === 'real-trace' && profile.tleDataPath) {
  // TLE/OMM path
  const raw = JSON.parse(readFileSync(resolve(profile.tleDataPath), 'utf-8'));
  let records = loadOmmRecords(raw);
  const maxSats = profile.tleMaxSatellites ?? 200;
  if (records.length > maxSats) {
    records = sampleRecords(records, maxSats, profile.seed);
  }
  const satrecs = ommToSatrecs(records);
  elements = satrecsToOrbitElements(satrecs);
  console.log(`  TLE loaded: ${records.length} records → ${elements.length} elements`);
} else {
  // Walker synthetic (supports extra_shells via buildWalkerConfig)
  elements = generateWalkerConstellation(buildWalkerConfig(profile, profile.timeControl.epochUtcMs));
}

console.log(`  Satellites: ${elements.length}`);

const trajectoryCache = buildTrajectoryCache({
  elements,
  observerLatDeg: profile.observer.latitudeDeg,
  observerLonDeg: profile.observer.longitudeDeg,
  observerAltKm: profile.observer.altitudeM / 1000,
  durationSec,
  stepSec,
  epochUtcMs: profile.timeControl.epochUtcMs,
});

const cacheMs = performance.now() - t0;
console.log(`  Cache built in ${(cacheMs / 1000).toFixed(1)}s`);
console.log(`  Passes found: ${[...trajectoryCache.passesBySatId.values()].reduce((s, p) => s + p.length, 0)}`);

if ([...trajectoryCache.passesBySatId.values()].reduce((s, p) => s + p.length, 0) === 0) {
  console.error('\n❌ ERROR: No satellite passes found! Observer may be outside coverage.');
  console.error('  Check observer lat/lon and constellation parameters.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Run engine
// ---------------------------------------------------------------------------

console.log('\nRunning simulation...');
const engine = createSimEngine({ profile, trajectoryCache });

const totalTicks = Math.floor(durationSec / stepSec);
const simStart = performance.now();

let lastSnapshotSatCount = 0;
let maxSatsVisible = 0;

for (let tick = 0; tick < totalTicks; tick++) {
  const timeSec = tick * stepSec;
  const snapshot = engine.tick(timeSec, tick);
  lastSnapshotSatCount = snapshot.satellites.length;
  if (lastSnapshotSatCount > maxSatsVisible) maxSatsVisible = lastSnapshotSatCount;

  // Progress every 100 ticks
  if (tick > 0 && tick % 100 === 0) {
    const pct = ((tick / totalTicks) * 100).toFixed(0);
    process.stdout.write(`\r  Progress: ${pct}% (tick ${tick}/${totalTicks}, ${lastSnapshotSatCount} sats visible)`);
  }
}

const simMs = performance.now() - simStart;
console.log(`\r  Simulation complete: ${totalTicks} ticks in ${(simMs / 1000).toFixed(1)}s (${(totalTicks / (simMs / 1000)).toFixed(0)} ticks/s)`);
console.log(`  Max satellites visible: ${maxSatsVisible}`);

// ---------------------------------------------------------------------------
// Finalize KPI
// ---------------------------------------------------------------------------

const kpi = engine.getKpiAccumulator().finalize(simMs);

console.log('\n=== KPI Summary ===\n');
console.log(`  Total ticks:          ${kpi.totalTicks}`);
console.log(`  Duration:             ${kpi.durationSec.toFixed(0)}s`);
console.log();
console.log('  --- SINR ---');
console.log(`  Mean SINR:            ${kpi.meanSinrDb.toFixed(2)} dB`);
console.log(`  5th percentile:       ${kpi.sinrPercentile5Db.toFixed(2)} dB`);
console.log(`  Median:               ${kpi.sinrPercentile50Db.toFixed(2)} dB`);
console.log(`  95th percentile:      ${kpi.sinrPercentile95Db.toFixed(2)} dB`);
console.log(`  Outage ratio:         ${(kpi.outageRatio * 100).toFixed(2)}%`);
console.log();
console.log('  --- Throughput ---');
console.log(`  Mean throughput:      ${kpi.meanThroughputMbps.toFixed(2)} Mbps`);
console.log(`  Cell-edge (5th pct):  ${kpi.cellEdgeThroughputMbps.toFixed(2)} Mbps`);
console.log();
console.log('  --- Handover ---');
console.log(`  Total HOs:            ${kpi.totalHandovers}`);
console.log(`  HO failures:          ${kpi.handoverFailures}`);
console.log(`  Unnecessary HOs:      ${kpi.unnecessaryHandovers}`);
console.log(`  Ping-pongs:           ${kpi.pingPongCount}`);
console.log(`  HO rate:              ${kpi.handoverRate.toFixed(2)} HO/min`);
console.log(`  Mean interruption:    ${kpi.meanHandoverInterruptionMs.toFixed(1)} ms`);
console.log();
console.log('  --- Service ---');
console.log(`  Availability:         ${(kpi.serviceAvailability * 100).toFixed(2)}%`);
console.log(`  Mean service time:    ${kpi.meanServiceTimeSec.toFixed(1)}s`);
console.log();
console.log('  --- Fairness ---');
console.log(`  Jain fairness:        ${kpi.jainFairnessIndex.toFixed(4)}`);

// ---------------------------------------------------------------------------
// Sanity checks
// ---------------------------------------------------------------------------

console.log('\n=== Sanity Checks ===\n');

let failures = 0;
function check(label: string, condition: boolean, detail: string) {
  if (!condition) failures++;
  console.log(`  [${condition ? 'PASS' : 'FAIL'}] ${label}: ${detail}`);
}

check('SINR varies (not constant)',
  kpi.sinrPercentile95Db - kpi.sinrPercentile5Db > 0.1,
  `spread=${(kpi.sinrPercentile95Db - kpi.sinrPercentile5Db).toFixed(2)} dB`);

if (profile.id === 'modqn-paper-baseline') {
  check('MODQN proxy pass exists',
    [...trajectoryCache.passesBySatId.values()].reduce((s, p) => s + p.length, 0) > 0,
    `${[...trajectoryCache.passesBySatId.values()].reduce((s, p) => s + p.length, 0)} passes in ${durationSec}s`);

  check('MODQN proxy has at least one visible satellite',
    maxSatsVisible >= 1,
    `${maxSatsVisible} visible satellites`);

  check('MODQN mean throughput > 1 Mbps',
    kpi.meanThroughputMbps > 1,
    `${kpi.meanThroughputMbps.toFixed(2)} Mbps`);

  check('MODQN service availability > 25%',
    kpi.serviceAvailability > 0.25,
    `${(kpi.serviceAvailability * 100).toFixed(1)}%`);

  check('MODQN mean SINR > -35 dB',
    kpi.meanSinrDb > -35,
    `${kpi.meanSinrDb.toFixed(2)} dB`);
} else {
  check('SINR in range [-20, 30] dB',
    kpi.meanSinrDb >= -20 && kpi.meanSinrDb <= 30,
    `mean=${kpi.meanSinrDb.toFixed(2)} dB`);

  check('Handovers occurred',
    kpi.totalHandovers > 0,
    `${kpi.totalHandovers} HOs in ${durationSec}s`);

  check('Service availability > 50%',
    kpi.serviceAvailability > 0.5,
    `${(kpi.serviceAvailability * 100).toFixed(1)}%`);

  check('Jain fairness < 1.0 (multi-UE spread)',
    kpi.jainFairnessIndex < 1.0 || profile.ueConfig.count <= 1,
    `JFI=${kpi.jainFairnessIndex.toFixed(4)}`);
}

check('No NaN in KPI',
  !isNaN(kpi.meanSinrDb) && !isNaN(kpi.serviceAvailability) && !isNaN(kpi.meanThroughputMbps),
  'all key KPIs are numeric');

// ---------------------------------------------------------------------------
// Output JSON
// ---------------------------------------------------------------------------

const outputPath = `baseline-kpi-${profileId}.json`;
const output = {
  profile: profileId,
  seed: profile.seed,
  durationSec,
  stepSec,
  totalSatellites: elements.length,
  passesFound: [...trajectoryCache.passesBySatId.values()].reduce((s, p) => s + p.length, 0),
  maxSatsVisible,
  cacheTimeMs: Math.round(cacheMs),
  simTimeMs: Math.round(simMs),
  kpi,
};

const fs = await import('fs');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nKPI JSON written to ${outputPath}`);

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

console.log(`\n${'═'.repeat(50)}`);
if (failures === 0) {
  console.log('✅ MILESTONE 1 PASSED — engine runs end-to-end, KPI in physical range');
} else {
  console.log(`❌ MILESTONE 1: ${failures} sanity check(s) failed`);
}
console.log('═'.repeat(50));

process.exit(failures > 0 ? 1 : 0);
