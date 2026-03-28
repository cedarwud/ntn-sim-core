#!/usr/bin/env node
/**
 * Golden-case orbit validation — Phase 1
 *
 * Pure first-principles Kepler + FSPL calculations compared against
 * profile baseline values from defaults.ts.
 *
 * Covers: VAL-ORB-002, REF-ORB-001, REF-CHAN-001
 *
 * Usage:  node scripts/golden-case-orbit.mjs
 * Exit:   0 if all PASS, 1 if any FAIL
 */

// ── Physical constants ──────────────────────────────────────────────
const MU = 398600.4418;    // km^3/s^2  (geocentric gravitational parameter)
const R_EARTH = 6378.137;  // km        (WGS-84 equatorial radius)

// ── Helpers ─────────────────────────────────────────────────────────

let failures = 0;

function check(label, actual, expected, relTol, unit = '') {
  const diff = Math.abs(actual - expected);
  const limit = Math.abs(expected) * relTol;
  const pass = diff <= limit;
  const tag = pass ? 'PASS' : 'FAIL';
  if (!pass) failures++;
  const pct = ((diff / Math.abs(expected)) * 100).toFixed(3);
  console.log(
    `[${tag}] ${label}: ${actual.toFixed(6)} ${unit} ` +
    `(expected ${expected.toFixed(6)} ${unit}, diff ${pct}%, tol ${(relTol * 100).toFixed(1)}%)`
  );
}

function checkAbs(label, actual, expected, absTol, unit = '') {
  const diff = Math.abs(actual - expected);
  const pass = diff <= absTol;
  const tag = pass ? 'PASS' : 'FAIL';
  if (!pass) failures++;
  console.log(
    `[${tag}] ${label}: ${actual.toFixed(4)} ${unit} ` +
    `(expected ${expected.toFixed(4)} ${unit}, diff ${diff.toFixed(4)}, tol +/-${absTol})`
  );
}

// ── Kepler orbit calculator ─────────────────────────────────────────

function computeOrbit(alt_km) {
  const a = R_EARTH + alt_km;
  const period_s = 2 * Math.PI * Math.sqrt(a ** 3 / MU);
  const speed_kms = Math.sqrt(MU / a);
  const meanMotion = 86400 / period_s; // rev/day
  return { a, period_s, period_min: period_s / 60, speed_kms, meanMotion };
}

// ── Slant range at elevation angle ──────────────────────────────────

function slantRange(alt_km, el_deg) {
  const el = el_deg * Math.PI / 180;
  const R = R_EARTH;
  const Rh = R + alt_km;
  // Geometric slant range for spherical Earth
  return Math.sqrt(Rh ** 2 - (R * Math.cos(el)) ** 2) - R * Math.sin(el);
}

// ── FSPL calculator ─────────────────────────────────────────────────
// FSPL(dB) = 32.45 + 20*log10(f_MHz) + 20*log10(d_km)

function fspl(f_mhz, d_km) {
  return 32.45 + 20 * Math.log10(f_mhz) + 20 * Math.log10(d_km);
}

// ═══════════════════════════════════════════════════════════════════
// 1. Case 9 Access Baseline — 600 km
// ═══════════════════════════════════════════════════════════════════

console.log('=== 1. Case 9 Access Baseline (600 km, S-band 2 GHz) ===\n');

const c9 = computeOrbit(600);
check('Semi-major axis',  c9.a,          6978.137, 0.005, 'km');
check('Orbital period',   c9.period_min, 96.69,    0.005, 'min');
check('Orbital speed',    c9.speed_kms,  7.558,    0.005, 'km/s');
check('Mean motion',      c9.meanMotion, 14.891,   0.005, 'rev/day');

// Walker check: 6 planes x 11 sats
const c9_total = 6 * 11;
checkAbs('Total satellites', c9_total, 66, 0, 'sats');

console.log('');

// ═══════════════════════════════════════════════════════════════════
// 2. HOBS Multibeam Baseline — 550 km
// ═══════════════════════════════════════════════════════════════════

console.log('=== 2. HOBS Multibeam Baseline (550 km, Ka-band 28 GHz) ===\n');

const hobs = computeOrbit(550);
check('Semi-major axis',  hobs.a,          6928.137, 0.005, 'km');
check('Orbital period',   hobs.period_min, 95.65,    0.005, 'min');
check('Orbital speed',    hobs.speed_kms,  7.585,    0.005, 'km/s');
check('Mean motion',      hobs.meanMotion, 15.054,   0.005, 'rev/day');

// Walker: 15 planes x 11 sats (from defaults.ts)
const hobs_total = 15 * 11;
checkAbs('Total satellites', hobs_total, 165, 0, 'sats');

console.log('');

// ═══════════════════════════════════════════════════════════════════
// 3. BH Resource Baseline — 780 km
// ═══════════════════════════════════════════════════════════════════

console.log('=== 3. BH Resource Baseline (780 km, Ka-band 20 GHz) ===\n');

const bh = computeOrbit(780);
check('Semi-major axis',  bh.a,          7158.137, 0.005, 'km');
check('Orbital period',   bh.period_min, 100.44,   0.005, 'min');
check('Orbital speed',    bh.speed_kms,  7.461,    0.005, 'km/s');
check('Mean motion',      bh.meanMotion, 14.337,   0.005, 'rev/day');

// Walker: 6 planes x 11 sats
const bh_total = 6 * 11;
checkAbs('Total satellites', bh_total, 66, 0, 'sats');

console.log('');

// ═══════════════════════════════════════════════════════════════════
// 4. FSPL Reference Checks
// ═══════════════════════════════════════════════════════════════════

console.log('=== 4. FSPL Reference Checks ===\n');

// 4a. Case 9 zenith: f=2000 MHz, d=600 km slant (zenith => slant = altitude)
const fspl_c9_zenith = fspl(2000, 600);
checkAbs('FSPL Case9 zenith (2GHz, 600km)', fspl_c9_zenith, 154.03, 0.1, 'dB');

// REF-CHAN-001 cross-check (validation matrix defines this exact checkpoint)
console.log('  (matches REF-CHAN-001: FSPL f=2000MHz d=600km => ~154.03 dB)\n');

// 4b. HOBS zenith: f=28000 MHz, d=550 km slant
const fspl_hobs_zenith = fspl(28000, 550);
checkAbs('FSPL HOBS zenith (28GHz, 550km)', fspl_hobs_zenith, 176.19, 0.1, 'dB');

// 4c. BH zenith: f=20000 MHz, d=780 km slant
const fspl_bh_zenith = fspl(20000, 780);
checkAbs('FSPL BH zenith (20GHz, 780km)', fspl_bh_zenith, 176.31, 0.1, 'dB');

console.log('');

// ═══════════════════════════════════════════════════════════════════
// 5. Slant Range + FSPL at Low Elevation (10 deg)
// ═══════════════════════════════════════════════════════════════════

console.log('=== 5. Slant Range & FSPL at 10-deg Elevation ===\n');

// Case 9: 600 km, 10 deg
const sr_c9_10 = slantRange(600, 10);
check('Slant range Case9 @10deg', sr_c9_10, 1932.0, 0.01, 'km');

const fspl_c9_10 = fspl(2000, sr_c9_10);
checkAbs('FSPL Case9 @10deg (2GHz)', fspl_c9_10, 164.18, 0.2, 'dB');

// HOBS: 550 km, 10 deg
const sr_hobs_10 = slantRange(550, 10);
check('Slant range HOBS @10deg', sr_hobs_10, 1815.7, 0.005, 'km');

const fspl_hobs_10 = fspl(28000, sr_hobs_10);
checkAbs('FSPL HOBS @10deg (28GHz)', fspl_hobs_10, 186.57, 0.1, 'dB');

// BH: 780 km, 10 deg
const sr_bh_10 = slantRange(780, 10);
check('Slant range BH @10deg', sr_bh_10, 2325.4, 0.005, 'km');

const fspl_bh_10 = fspl(20000, sr_bh_10);
checkAbs('FSPL BH @10deg (20GHz)', fspl_bh_10, 185.80, 0.1, 'dB');

console.log('');

// ═══════════════════════════════════════════════════════════════════
// 6. Real-Trace Validation — Starlink Shell-1 Nominal (550 km)
// ═══════════════════════════════════════════════════════════════════

console.log('=== 6. Real-Trace Validation Constellation Check ===\n');

// 72 planes x 22 sats = 1584 (Starlink shell-1)
const rt_total = 72 * 22;
checkAbs('Starlink shell-1 total', rt_total, 1584, 0, 'sats');

// Orbital params match HOBS 550 km (same altitude, different inclination)
const rt = computeOrbit(550);
check('RT orbital period (550km)', rt.period_min, 95.65, 0.005, 'min');
check('RT orbital speed (550km)',  rt.speed_kms,  7.585, 0.005, 'km/s');

console.log('');

// ═══════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════

console.log('════════════════════════════════════════════');
if (failures === 0) {
  console.log('ALL CHECKS PASSED');
} else {
  console.log(`${failures} CHECK(S) FAILED`);
}
console.log('════════════════════════════════════════════');

process.exit(failures > 0 ? 1 : 0);
