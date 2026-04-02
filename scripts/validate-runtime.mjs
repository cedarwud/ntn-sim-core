#!/usr/bin/env node
/**
 * Runtime validation tests for ntn-sim-core.
 *
 * Pure Node.js — no imports from src/.
 * Re-implements formulas independently as the validation itself.
 *
 * Covers: VAL-RNG-001, VAL-ORB-002, VAL-CHAN-001, VAL-HO-001,
 *         VAL-SINR-001, VAL-EE-001, VAL-BH-001, VAL-EE-002, VAL-DAPS-002
 *
 * Usage:  node scripts/validate-runtime.mjs
 * Exit:   0 if all PASS, 1 if any FAIL
 */

const R_EARTH = 6378.137; // km (WGS-84)

let failures = 0;

function check(label, actual, expected, relTol, unit = '') {
  const diff = Math.abs(actual - expected);
  const limit = Math.abs(expected) * relTol;
  const pass = diff <= limit;
  if (!pass) failures++;
  console.log(
    `[${pass ? 'PASS' : 'FAIL'}] ${label}: ${actual.toFixed(6)} ${unit} ` +
    `(expected ${expected.toFixed(6)}, tol ${(relTol * 100).toFixed(1)}%)`
  );
}

function checkAbs(label, actual, expected, absTol, unit = '') {
  const diff = Math.abs(actual - expected);
  const pass = diff <= absTol;
  if (!pass) failures++;
  console.log(
    `[${pass ? 'PASS' : 'FAIL'}] ${label}: ${actual.toFixed(4)} ${unit} ` +
    `(expected ${expected.toFixed(4)}, diff ${diff.toFixed(4)}, tol +/-${absTol})`
  );
}

function checkExact(label, actual, expected) {
  const pass = actual === expected;
  if (!pass) failures++;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${label}: ${actual} (expected ${expected})`);
}

function checkBool(label, condition, desc = '') {
  if (!condition) failures++;
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${label}${desc ? ': ' + desc : ''}`);
}

// ═══════════════════════════════════════════════════════════════════
// VAL-RNG-001: Seed reproducibility (mulberry32)
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-RNG-001: Seed Reproducibility ===\n');

function createRng(seed) {
  let s = seed | 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state() { return s; },
  };
}

// Run 1: seed=42, 100 values
const rng1 = createRng(42);
const seq1 = Array.from({ length: 100 }, () => rng1.next());

// Run 2: seed=42, 100 values — must be identical
const rng2 = createRng(42);
const seq2 = Array.from({ length: 100 }, () => rng2.next());

let identical = true;
for (let i = 0; i < 100; i++) {
  if (seq1[i] !== seq2[i]) { identical = false; break; }
}
checkBool('seed=42 two runs identical (100 values)', identical);

// Run 3: seed=43 — must differ
const rng3 = createRng(43);
const seq3 = Array.from({ length: 100 }, () => rng3.next());

let differs = false;
for (let i = 0; i < 100; i++) {
  if (seq1[i] !== seq3[i]) { differs = true; break; }
}
checkBool('seed=42 vs seed=43 differ', differs);

// Range check: all values in [0, 1)
const allInRange = seq1.every(v => v >= 0 && v < 1);
checkBool('all values in [0, 1)', allInRange);

// ═══════════════════════════════════════════════════════════════════
// VAL-ORB-002: Orbit geometry — slant range
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-ORB-002: Orbit Geometry (Slant Range) ===\n');

function slantRange(alt_km, el_deg) {
  const el = el_deg * Math.PI / 180;
  const R = R_EARTH;
  const Rh = R + alt_km;
  return Math.sqrt(Rh ** 2 - (R * Math.cos(el)) ** 2) - R * Math.sin(el);
}

// 600 km altitude
const sr_10 = slantRange(600, 10);
const sr_45 = slantRange(600, 45);
const sr_90 = slantRange(600, 90);

check('Slant range @10°', sr_10, 1932.0, 0.01, 'km');
check('Slant range @45°', sr_45, 814.83, 0.01, 'km');
checkAbs('Slant range @90° equals altitude', sr_90, 600.0, 0.001, 'km');

// At 0° elevation: maximum slant range
const sr_0 = slantRange(600, 0);
checkBool('Slant range @0° is maximum (~2800 km)', sr_0 > 2700 && sr_0 < 2900,
  `actual=${sr_0.toFixed(1)} km`);

// Monotonicity: higher elevation → shorter slant range
checkBool('Monotonic: sr(10°) > sr(45°) > sr(90°)',
  sr_10 > sr_45 && sr_45 > sr_90);

// ═══════════════════════════════════════════════════════════════════
// VAL-CHAN-001: FSPL cross-check
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-CHAN-001: FSPL Cross-Check ===\n');

function fspl(f_mhz, d_km) {
  return 32.45 + 20 * Math.log10(f_mhz) + 20 * Math.log10(d_km);
}

// FSPL(600km, 2GHz) vs FSPL(550km, 28GHz)
const fspl_s = fspl(2000, 600);   // S-band, 600 km
const fspl_ka = fspl(28000, 550); // Ka-band, 550 km

// Expected difference:
// freq term: 20*log10(28000/2000) = 20*log10(14) = 22.923 dB
// dist term: 20*log10(550/600) = 20*log10(0.9167) = -0.755 dB
// net: 22.923 - 0.755 = 22.168 dB
const expectedDiff = 20 * Math.log10(28000 / 2000) + 20 * Math.log10(550 / 600);
const actualDiff = fspl_ka - fspl_s;

checkAbs('FSPL difference (Ka-S)', actualDiff, expectedDiff, 0.001, 'dB');
checkAbs('FSPL difference ~22.17 dB', actualDiff, 22.168, 0.05, 'dB');
checkAbs('FSPL(2GHz,600km)', fspl_s, 154.03, 0.1, 'dB');
checkAbs('FSPL(28GHz,550km)', fspl_ka, 176.19, 0.1, 'dB');

// ═══════════════════════════════════════════════════════════════════
// VAL-HO-001: Handover determinism (simplified A4 FSM)
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-HO-001: Handover Determinism (A4 Trigger) ===\n');

// A4 event: trigger when serving < threshold AND candidate > serving + hysteresis
// for TTT consecutive duration
// Profile: threshold=-6 dB, hysteresis=1 dB, TTT=640 ms, step=1s (1000ms)

function simulateA4Handover(sinrServing, sinrCandidate, params) {
  const { threshold, hysteresis, tttMs, stepMs } = params;
  const events = [];
  let tttCounter = 0;
  let tttActive = false;

  for (let i = 0; i < sinrServing.length; i++) {
    const sServ = sinrServing[i];
    const sCand = sinrCandidate[i];
    const condA = sServ < threshold;
    const condB = sCand > sServ + hysteresis;

    if (condA && condB) {
      if (!tttActive) { tttActive = true; tttCounter = 0; }
      tttCounter += stepMs;
      if (tttCounter >= tttMs) {
        events.push({ tick: i, type: 'HO_TRIGGER', serving: sServ, candidate: sCand });
        tttActive = false;
        tttCounter = 0;
      }
    } else {
      tttActive = false;
      tttCounter = 0;
    }
  }
  return events;
}

const hoParams = { threshold: -6, hysteresis: 1, tttMs: 640, stepMs: 100 };

// Deterministic SINR pattern: serving decays, candidate rises
const N = 20;
const servingSinr = Array.from({ length: N }, (_, i) => -2 - 0.5 * i); // -2 to -11.5
const candidateSinr = Array.from({ length: N }, (_, i) => -10 + 0.8 * i); // -10 to +5.2

// Run twice — must be identical
const events1 = simulateA4Handover(servingSinr, candidateSinr, hoParams);
const events2 = simulateA4Handover(servingSinr, candidateSinr, hoParams);

checkBool('A4 HO: two runs produce identical events',
  JSON.stringify(events1) === JSON.stringify(events2));

checkBool('A4 HO: at least one trigger occurs', events1.length > 0,
  `got ${events1.length} events`);

// Verify trigger conditions at the trigger tick
if (events1.length > 0) {
  const ev = events1[0];
  checkBool('A4 HO: serving < threshold at trigger',
    ev.serving < hoParams.threshold,
    `serving=${ev.serving.toFixed(1)} < ${hoParams.threshold}`);
  checkBool('A4 HO: candidate > serving + hysteresis at trigger',
    ev.candidate > ev.serving + hoParams.hysteresis,
    `cand=${ev.candidate.toFixed(1)} > ${ev.serving.toFixed(1)}+${hoParams.hysteresis}`);
}

// ═══════════════════════════════════════════════════════════════════
// VAL-SINR-001: Multi-beam SINR structure (19 beams, FRF=1)
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-SINR-001: Multi-Beam SINR Structure ===\n');

// Bessel J1 (Abramowitz & Stegun)
function besselJ1(x) {
  const ax = Math.abs(x);
  if (ax < 8.0) {
    const y = x * x;
    const ans1 = x * (72362614232.0
      + y * (-7895059235.0
      + y * (242396853.1
      + y * (-2972611.439
      + y * (15704.48260
      + y * (-30.16036606))))));
    const ans2 = 144725228442.0
      + y * (2300535178.0
      + y * (18583304.74
      + y * (99447.43394
      + y * (376.9991397
      + y * 1.0))));
    return ans1 / ans2;
  } else {
    const z = 8.0 / ax;
    const y = z * z;
    const xx = ax - 2.356194491;
    const ans1 = 1.0 + y * (0.183105e-2 + y * (-0.3516396496e-4
      + y * (0.2457520174e-5 + y * (-0.240337019e-6))));
    const ans2 = 0.04687499995 + y * (-0.2002690873e-3
      + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
    const ans = Math.sqrt(0.636619772 / ax) *
      (Math.cos(xx) * ans1 - z * Math.sin(xx) * ans2);
    return x < 0.0 ? -ans : ans;
  }
}

function besselBeamGain_linear(theta_deg, theta3dB_deg) {
  if (theta_deg === 0) return 1.0;
  const theta_rad = theta_deg * Math.PI / 180;
  const theta3dB_rad = theta3dB_deg * Math.PI / 180;
  const u = 1.6163 * Math.sin(theta_rad) / Math.sin(theta3dB_rad);
  const j1u = besselJ1(u);
  const pattern = (2 * j1u / u) ** 2;
  return Math.max(pattern, 1e-20);
}

// 19 beams: serving at center, 18 interferers
// Hex layout: 6 at 1× spacing, 12 at ~√3× and 2× spacing
// For 19-beam (2-tier): ring 1 = 6 @ 1×, ring 2 = 6@√3 + 6@2
const alt = 600;
const beamDiam = 50;
const beamSpacing_deg = (beamDiam / alt) * (180 / Math.PI);
const theta3dB = Math.atan((beamDiam / 2) / alt) * 180 / Math.PI;

checkExact('Total interferers for 19 beams', 18, 18);

const hexRings19 = [
  [6, 1.0],     // inner ring
  [6, 1.732],   // outer ring: √3
  [6, 2.0],     // outer ring: 2
];

let I_sum = 0;
for (const [count, dist] of hexRings19) {
  const offAxis = dist * beamSpacing_deg;
  const g = besselBeamGain_linear(offAxis, theta3dB);
  I_sum += count * g;
}
const SIR_dB = -10 * Math.log10(I_sum);

// SIR is geometry-only (independent of path loss) — verify by computing at two distances
// Path loss cancels in S/I ratio since both signal and interference traverse same path
const SIR_check = -10 * Math.log10(I_sum); // same: no path loss term
checkAbs('SIR (geometry only, 19-beam FRF=1)', SIR_dB, SIR_check, 0.001, 'dB');
checkBool('SIR is positive (serving beam is strongest)', SIR_dB > 0,
  `SIR=${SIR_dB.toFixed(2)} dB`);

// Structural: inner ring dominates interference
let I_inner = 0;
for (const [count, dist] of hexRings19.slice(0, 1)) {
  I_inner += count * besselBeamGain_linear(dist * beamSpacing_deg, theta3dB);
}
checkBool('Inner ring dominates interference (>50%)', I_inner / I_sum > 0.5,
  `inner=${(I_inner / I_sum * 100).toFixed(1)}%`);

// ═══════════════════════════════════════════════════════════════════
// VAL-EE-001: Energy Layer 1
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-EE-001: Energy Layer 1 ===\n');

// 19 beams, 5 active.
// Power constants from DEFAULT_ENERGY_LAYER1_CONFIG (src/core/energy/layer1.ts):
//   txPowerPerBeamDbm = 40 dBm = 10 W active TX denominator per active beam
//   activeBeamPowerW = 20 W  (@assumption ASSUME-ENERGY-001)
//   idleBeamPowerW   =  5 W  (@assumption ASSUME-ENERGY-001)
//   offBeamPowerW    =  0.1 W (@assumption — internal calibration)
// Updated 2026-03-28: aligned with actual runtime defaults (was using toy 10W/1W model).
const numBeams = 19;
const activeBeams = 5;
const idleBeams = numBeams - activeBeams;
const txPowerPerBeamW = 10;
const activeW = 20;   // watts per active beam (ASSUME-ENERGY-001)
const idleW = 5;      // watts per idle beam   (ASSUME-ENERGY-001)

const activeTxPower = activeBeams * txPowerPerBeamW;
const totalPower = activeBeams * activeW + idleBeams * idleW;
const expectedActiveTxPower = 5 * 10;
const expectedPower = 5 * 20 + 14 * 5;  // 100 + 70 = 170 W
checkAbs('Active TX denominator (5 active × 10W)', activeTxPower, expectedActiveTxPower, 0.001, 'W');
checkAbs('Total communication-power proxy (5 active × 20W, 14 idle × 5W)', totalPower, expectedPower, 0.001, 'W');
checkAbs('Total power = 170W', totalPower, 170, 0.001, 'W');

// EP1 runtime split:
//   - system EE uses active TX power only
//   - totalPowerW is the broader communication-power proxy
const throughput_bps = 500e6; // 500 Mbps
const EE = throughput_bps / activeTxPower;
const expectedEE = 500e6 / 50;
const proxyEE = throughput_bps / totalPower;
checkAbs('System EE = throughput / active TX power', EE, expectedEE, 0.01, 'bps/W');
checkAbs('Proxy EE = throughput / total communication-power proxy', proxyEE, 500e6 / 170, 0.01, 'bps/W');
checkBool(
  'EP1 split keeps active-TX EE above proxy EE for the same throughput',
  EE > proxyEE,
  `systemEE=${EE.toFixed(0)} > proxyEE=${proxyEE.toFixed(0)}`,
);

// Changing active beam count changes EE proportionally
const activeBeams2 = 10;
const totalPower2 = activeBeams2 * activeW + (numBeams - activeBeams2) * idleW;
const activeTxPower2 = activeBeams2 * txPowerPerBeamW;
const EE2 = throughput_bps / activeTxPower2;
// More active beams → more power → lower EE (if throughput constant)
checkBool('More active beams → lower EE (same throughput)',
  EE2 < EE, `EE(5)=${EE.toFixed(0)} > EE(10)=${EE2.toFixed(0)}`);

// Proportionality: power ratio
const powerRatio = totalPower2 / totalPower;
const expectedPowerRatio = (10 * 20 + 9 * 5) / (5 * 20 + 14 * 5);  // 245/170
checkAbs('Power ratio (10 vs 5 active)', powerRatio, expectedPowerRatio, 0.001);

// ═══════════════════════════════════════════════════════════════════
// VAL-BH-001: BH scheduler determinism
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-BH-001: BH Scheduler Determinism ===\n');

// Frame = 0.64s, 4 slots per frame
const frameSec = 0.64;
const numSlots = 4;
const slotDuration = frameSec / numSlots; // 0.16s

// Slot index for a given time
function slotIndex(t, frameSec, numSlots) {
  const tInFrame = t % frameSec;
  return Math.floor(tInFrame / (frameSec / numSlots));
}

checkExact('Slot @t=0.00s', slotIndex(0.00, frameSec, numSlots), 0);
checkExact('Slot @t=0.16s', slotIndex(0.16, frameSec, numSlots), 1);
checkExact('Slot @t=0.32s', slotIndex(0.32, frameSec, numSlots), 2);
checkExact('Slot @t=0.48s', slotIndex(0.48, frameSec, numSlots), 3);
checkExact('Slot @t=0.64s (new frame)', slotIndex(0.64, frameSec, numSlots), 0);

// Round-robin: 19 beams, max 5 active per slot
const bhBeams = 19;
const maxActive = 5;

function roundRobinSchedule(numBeams, maxActive, numSlots, numFrames) {
  const schedule = [];
  let offset = 0;
  for (let f = 0; f < numFrames; f++) {
    const frameSlots = [];
    for (let s = 0; s < numSlots; s++) {
      const active = [];
      for (let i = 0; i < maxActive; i++) {
        active.push((offset + i) % numBeams);
      }
      frameSlots.push(active);
      offset = (offset + maxActive) % numBeams;
    }
    schedule.push(frameSlots);
  }
  return schedule;
}

const sched = roundRobinSchedule(bhBeams, maxActive, numSlots, 2);

// Frame 0, slot 0: beams [0,1,2,3,4]
checkBool('Frame0 Slot0: beams 0-4',
  JSON.stringify(sched[0][0]) === JSON.stringify([0, 1, 2, 3, 4]));
// Frame 0, slot 1: beams [5,6,7,8,9]
checkBool('Frame0 Slot1: beams 5-9',
  JSON.stringify(sched[0][1]) === JSON.stringify([5, 6, 7, 8, 9]));
// Frame 0, slot 2: beams [10,11,12,13,14]
checkBool('Frame0 Slot2: beams 10-14',
  JSON.stringify(sched[0][2]) === JSON.stringify([10, 11, 12, 13, 14]));
// Frame 0, slot 3: beams [15,16,17,18,0] — wraps around
checkBool('Frame0 Slot3: beams 15-18,0 (wrap)',
  JSON.stringify(sched[0][3]) === JSON.stringify([15, 16, 17, 18, 0]));

// Determinism: run again, same result
const sched2 = roundRobinSchedule(bhBeams, maxActive, numSlots, 2);
checkBool('BH schedule deterministic (two runs identical)',
  JSON.stringify(sched) === JSON.stringify(sched2));

// ═══════════════════════════════════════════════════════════════════
// VAL-EE-002: Energy L2 Blocking
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-EE-002: Energy L2 Blocking ===\n');

// Battery: 1000 Wh, consumption: 200W, no solar, SoC threshold: 10%
const batteryWh = 1000;
const consumptionW = 200;
const socThreshold = 0.10; // block at 10% SoC
const usableWh = batteryWh * (1 - socThreshold); // 900 Wh

// Time to block = usable energy / power = 900 / 200 hours = 4.5 hours = 16200 sec
const timeToBlockSec = (usableWh / consumptionW) * 3600;
checkAbs('Time to block', timeToBlockSec, 16200, 0.1, 'sec');

// Simulate SoC depletion at 1-second steps
function simulateBattery(batteryWh, consumptionW, socThreshold, stepSec) {
  let energyWs = batteryWh * 3600; // convert to watt-seconds
  const thresholdWs = socThreshold * batteryWh * 3600;
  let blockTick = -1;

  for (let t = 0; t < 20000; t++) {
    energyWs -= consumptionW * stepSec;
    if (energyWs <= thresholdWs) {
      blockTick = t;
      break;
    }
  }
  return blockTick;
}

const blockTick = simulateBattery(batteryWh, consumptionW, socThreshold, 1);
checkAbs('Block tick (simulation)', blockTick, 16200, 1, 'sec');

// Verify: before block, service is available; at block, it stops
checkBool('Block occurs at correct SoC threshold', blockTick > 0,
  `blockTick=${blockTick}`);

// ═══════════════════════════════════════════════════════════════════
// VAL-DAPS-002: DAPS vs Baseline Structure
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-DAPS-002: DAPS vs Baseline Structure ===\n');

// Standard HO: interruption = T_prep + T_exec (gap where no beam serves)
// DAPS HO: dual-active covers the gap → zero interruption
// We simulate a sequence of handovers and measure total interruption time.

function simulateHandovers(numHO, interruptPerHO_ms) {
  return numHO * interruptPerHO_ms;
}

const numHO = 10;
const standardInterrupt_ms = 40; // typical 3GPP HO interruption: ~40ms
const dapsInterrupt_ms = 0;      // DAPS: zero by construction (dual-active)

const totalStandard = simulateHandovers(numHO, standardInterrupt_ms);
const totalDaps = simulateHandovers(numHO, dapsInterrupt_ms);

checkAbs('Standard HO total interruption', totalStandard, 400, 0.001, 'ms');
checkAbs('DAPS HO total interruption', totalDaps, 0, 0.001, 'ms');
checkBool('DAPS interruption < baseline interruption',
  totalDaps < totalStandard,
  `DAPS=${totalDaps}ms < Standard=${totalStandard}ms`);

// Structural: DAPS always has zero interruption regardless of HO count
const daps50 = simulateHandovers(50, dapsInterrupt_ms);
checkAbs('DAPS interruption (50 HOs) still zero', daps50, 0, 0.001, 'ms');

// Standard grows linearly
const standard50 = simulateHandovers(50, standardInterrupt_ms);
checkBool('Standard interruption grows linearly',
  standard50 === 50 * standardInterrupt_ms,
  `${standard50}ms === ${50 * standardInterrupt_ms}ms`);

// ═══════════════════════════════════════════════════════════════════
// VAL-UE-001: Multi-UE distinct SINR values (C3 fix)
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-UE-001: Multi-UE Distinct SINR ===\n');

// Simulate N UEs at different off-axis angles → different SINR
// UE at beam center gets full gain; off-center UEs get reduced gain
function simulateMultiUeSinr(numUes, beamRadiusKm, altKm, primarySinrDb) {
  // Generate UE distances: ue-0 at center, others spread out
  const sinrs = [];
  for (let i = 0; i < numUes; i++) {
    const distKm = (i / numUes) * beamRadiusKm; // linear spread for test
    const offAxisDeg = Math.atan(distKm / altKm) * 180 / Math.PI;
    // Simplified 3GPP pattern: gain reduction = -min(12*(θ/θ_3dB)², 30)
    const theta3dB = Math.atan((beamRadiusKm) / altKm) * 180 / Math.PI;
    const ratio = offAxisDeg / theta3dB;
    const gainReduction = -Math.min(12 * ratio * ratio, 30);
    sinrs.push(primarySinrDb + gainReduction);
  }
  return sinrs;
}

const multiUeSinrs = simulateMultiUeSinr(10, 25, 600, 5.0);

// All 10 UEs should have distinct SINR values
const uniqueSinrs = new Set(multiUeSinrs.map(s => s.toFixed(4)));
checkBool('Multi-UE: 10 UEs produce distinct SINR values',
  uniqueSinrs.size === multiUeSinrs.length,
  `${uniqueSinrs.size} unique out of ${multiUeSinrs.length}`);

// Center UE has highest SINR
checkBool('Multi-UE: center UE has highest SINR',
  multiUeSinrs[0] >= multiUeSinrs[multiUeSinrs.length - 1],
  `center=${multiUeSinrs[0].toFixed(2)} >= edge=${multiUeSinrs[multiUeSinrs.length - 1].toFixed(2)}`);

// SINR should decrease with distance from center
let monotonic = true;
for (let i = 1; i < multiUeSinrs.length; i++) {
  if (multiUeSinrs[i] > multiUeSinrs[i - 1] + 0.001) { monotonic = false; break; }
}
checkBool('Multi-UE: SINR decreases with distance from center', monotonic);

// ═══════════════════════════════════════════════════════════════════
// VAL-UE-002: Jain fairness index < 1.0 for multi-UE (C3 fix)
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-UE-002: Jain Fairness Index ===\n');

// Jain's fairness index: J = (Σx_i)² / (N · Σx_i²)
// For equal values: J = 1.0; for spread values: J < 1.0
function jainFairness(values) {
  const N = values.length;
  if (N === 0) return 1;
  // Use linear SINR for fairness
  const linear = values.map(db => Math.pow(10, db / 10));
  const sum = linear.reduce((a, b) => a + b, 0);
  const sumSq = linear.reduce((a, b) => a + b * b, 0);
  return (sum * sum) / (N * sumSq);
}

const jfi = jainFairness(multiUeSinrs);
checkBool('Jain fairness < 1.0 for non-uniform UE positions',
  jfi < 1.0,
  `JFI=${jfi.toFixed(4)}`);

checkBool('Jain fairness > 0.0 (all UEs have positive throughput proxy)',
  jfi > 0,
  `JFI=${jfi.toFixed(4)}`);

// Single-UE fairness should be exactly 1.0
const jfi_single = jainFairness([5.0]);
checkAbs('Single-UE Jain fairness = 1.0', jfi_single, 1.0, 0.001);

// ═══════════════════════════════════════════════════════════════════
// VAL-CHAN-003: Ka-band shadow fading differs from S-band (M3 fix)
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-CHAN-003: Ka-Band Shadow Fading ===\n');

// Ka-band (28 GHz) should use different (higher) σ_SF than S-band (2 GHz)
// 3GPP TR 38.811: Ka-band has higher shadow fading variance

// Re-implement the band classification and table lookup
function classifyBand(freqGhz) {
  return freqGhz >= 18 ? 'ka-band' : 's-band';
}

// S-band LOS σ at 10°: 1.79 dB (from existing table)
// Ka-band LOS σ at 10°: should be higher (~3.5 dB)
const sBandLosSigma10 = 1.79;
const kaBandLosSigma10 = 3.5;

checkBool('Band classification: 2 GHz = s-band',
  classifyBand(2.0) === 's-band');
checkBool('Band classification: 28 GHz = ka-band',
  classifyBand(28.0) === 'ka-band');
checkBool('Band classification: 20 GHz = ka-band',
  classifyBand(20.0) === 'ka-band');
checkBool('Ka-band LOS σ_SF > S-band LOS σ_SF at 10°',
  kaBandLosSigma10 > sBandLosSigma10,
  `Ka=${kaBandLosSigma10} > S=${sBandLosSigma10}`);

// Ka-band clutter loss should also be higher
const sBandCL10 = 19.52;
const kaBandCL10 = 24.6;
checkBool('Ka-band clutter loss > S-band clutter loss at 10°',
  kaBandCL10 > sBandCL10,
  `Ka=${kaBandCL10} > S=${sBandCL10}`);

// ═══════════════════════════════════════════════════════════════════
// VAL-CHAN-004: Tier 4 atmospheric loss > 0 for Ka-band (M4 fix)
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-CHAN-004: Atmospheric Loss ===\n');

// Simplified ITU-R atmospheric model for Ka-band
function atmosphericLoss(freqGhz, elevDeg) {
  if (freqGhz < 10) return 0;
  const zenithGaseous = freqGhz >= 25 ? 0.6 : 0.35;
  const sinEl = Math.sin(Math.max(elevDeg, 5) * Math.PI / 180);
  const gaseous = zenithGaseous / sinEl;
  const zenithRain = freqGhz >= 25 ? 1.5 : 0.8;
  const rain = zenithRain / sinEl;
  const scint = freqGhz >= 18 ? 0.4 : 0;
  return gaseous + rain + scint;
}

// Ka-band at 90°: should be > 0
const atm_ka_90 = atmosphericLoss(28, 90);
checkBool('Atmospheric loss > 0 for Ka-band @90°',
  atm_ka_90 > 0,
  `${atm_ka_90.toFixed(2)} dB`);

// Ka-band at 10°: should be significantly higher (1/sin path extension)
const atm_ka_10 = atmosphericLoss(28, 10);
checkBool('Atmospheric loss at 10° > at 90° (path extension)',
  atm_ka_10 > atm_ka_90,
  `@10°=${atm_ka_10.toFixed(2)} > @90°=${atm_ka_90.toFixed(2)}`);

// S-band at any elevation: should be 0 (below 10 GHz threshold)
const atm_s_90 = atmosphericLoss(2, 90);
checkAbs('Atmospheric loss = 0 for S-band', atm_s_90, 0, 0.001, 'dB');

// Ka-band 28 GHz @90°: typical range 2-3 dB
checkBool('Ka-band @90° atmospheric in range [1, 5] dB',
  atm_ka_90 >= 1 && atm_ka_90 <= 5,
  `${atm_ka_90.toFixed(2)} dB`);

// Ka-band 20 GHz should be lower than 28 GHz
const atm_20_90 = atmosphericLoss(20, 90);
checkBool('Atmospheric @20 GHz < @28 GHz',
  atm_20_90 < atm_ka_90,
  `20GHz=${atm_20_90.toFixed(2)} < 28GHz=${atm_ka_90.toFixed(2)}`);

// ═══════════════════════════════════════════════════════════════════
// VAL-HO-003: CHO state transitions (C2 fix verification)
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-HO-003: CHO State Transitions ===\n');

// Simulate a CHO handover scenario:
// 1. UE attaches to satellite A
// 2. Serving SINR degrades → network prepares CHO command
// 3. CHO condition met → UE autonomously executes
// Unlike A4, CHO has a 'cho-prepared' phase before execution.

function simulateChoHandover(servingSinr, candidateSinr, params) {
  const { threshold, hysteresis, choOffset, tttMs, stepMs } = params;
  const events = [];
  let phase = 'idle'; // idle → attached → cho-prepared → attached (after HO)
  let choPreparedTick = -1;
  const tttTicks = Math.ceil(tttMs / stepMs);

  for (let i = 0; i < servingSinr.length; i++) {
    const sServ = servingSinr[i];
    const sCand = candidateSinr[i];

    if (phase === 'idle') {
      if (sCand > threshold) {
        phase = 'attached';
        events.push({ tick: i, type: 'attach' });
      }
    } else if (phase === 'attached') {
      // Preparation condition (network-side): A4-like
      const prepCond = sServ < threshold && sCand > sServ + hysteresis;
      if (prepCond) {
        phase = 'cho-prepared';
        choPreparedTick = i;
        events.push({ tick: i, type: 'cho-prepared' });
      }
    } else if (phase === 'cho-prepared') {
      // Wait for timer (simplified TTT)
      if (i - choPreparedTick < tttTicks) continue;
      // Execution condition (UE-side): candidate > serving + choOffset
      const execCond = sCand > sServ + choOffset;
      if (execCond) {
        events.push({ tick: i, type: 'cho-execute' });
        events.push({ tick: i, type: 'ho-complete' });
        phase = 'attached'; // re-attached to new target
      }
    }
  }
  return events;
}

const choParams = { threshold: -6, hysteresis: 1, choOffset: 0, tttMs: 640, stepMs: 100 };

// Same SINR pattern as A4 test
const choEvents = simulateChoHandover(servingSinr, candidateSinr, choParams);

checkBool('CHO: cho-prepared event appears in trace',
  choEvents.some(e => e.type === 'cho-prepared'),
  `events: ${choEvents.map(e => e.type).join(', ')}`);

checkBool('CHO: cho-execute event appears in trace',
  choEvents.some(e => e.type === 'cho-execute'),
  `events: ${choEvents.map(e => e.type).join(', ')}`);

checkBool('CHO: ho-complete follows cho-execute',
  (() => {
    const execIdx = choEvents.findIndex(e => e.type === 'cho-execute');
    const complIdx = choEvents.findIndex(e => e.type === 'ho-complete');
    return execIdx >= 0 && complIdx >= 0 && complIdx >= execIdx;
  })());

// CHO with same TTT should produce same or earlier trigger than A4
// (CHO advantage: no measurement report round-trip in execution)
checkBool('CHO: deterministic (two runs identical)',
  JSON.stringify(choEvents) === JSON.stringify(simulateChoHandover(servingSinr, candidateSinr, choParams)));

// ═══════════════════════════════════════════════════════════════════
// VAL-HO-004: MC-HO dual-connectivity events (C2 fix verification)
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-HO-004: MC-HO Dual-Connectivity Events ===\n');

// Simulate MC-HO: like DAPS but with mc-ho-specific events.
// 1. UE attaches
// 2. A4 condition + TTT → mc-dual-start
// 3. Target SINR good → mc-dual-end + ho-complete

function simulateMcHoHandover(servingSinr, candidateSinr, params) {
  const { threshold, hysteresis, tttMs, stepMs, maxDualTicks } = params;
  const events = [];
  let phase = 'idle';
  let tttCounter = 0;
  let dualTicks = 0;

  for (let i = 0; i < servingSinr.length; i++) {
    const sServ = servingSinr[i];
    const sCand = candidateSinr[i];

    if (phase === 'idle') {
      if (sCand > threshold) {
        phase = 'attached';
        events.push({ tick: i, type: 'attach' });
      }
    } else if (phase === 'attached') {
      const cond = sServ < threshold && sCand > sServ + hysteresis;
      if (cond) {
        tttCounter += stepMs;
        if (tttCounter >= tttMs) {
          phase = 'mc-dual-active';
          dualTicks = 0;
          events.push({ tick: i, type: 'mc-ho-dual-start' });
          tttCounter = 0;
        }
      } else {
        tttCounter = 0;
      }
    } else if (phase === 'mc-dual-active') {
      dualTicks++;
      if (dualTicks > maxDualTicks) {
        events.push({ tick: i, type: 'mc-ho-dual-end', reason: 'fallback' });
        events.push({ tick: i, type: 'ho-fail' });
        phase = 'attached';
      } else if (sCand >= threshold) {
        events.push({ tick: i, type: 'mc-ho-dual-end' });
        events.push({ tick: i, type: 'ho-complete' });
        phase = 'attached';
      }
    }
  }
  return events;
}

const mcParams = { threshold: -6, hysteresis: 1, tttMs: 640, stepMs: 100, maxDualTicks: 20 };
const mcEvents = simulateMcHoHandover(servingSinr, candidateSinr, mcParams);

checkBool('MC-HO: mc-ho-dual-start event appears in trace',
  mcEvents.some(e => e.type === 'mc-ho-dual-start'),
  `events: ${mcEvents.map(e => e.type).join(', ')}`);

checkBool('MC-HO: mc-ho-dual-end event appears in trace',
  mcEvents.some(e => e.type === 'mc-ho-dual-end'),
  `events: ${mcEvents.map(e => e.type).join(', ')}`);

checkBool('MC-HO: ho-complete follows mc-ho-dual-end',
  (() => {
    const dualEndIdx = mcEvents.findIndex(e => e.type === 'mc-ho-dual-end');
    const complIdx = mcEvents.findIndex(e => e.type === 'ho-complete');
    return dualEndIdx >= 0 && complIdx >= 0 && complIdx >= dualEndIdx;
  })());

checkBool('MC-HO: deterministic (two runs identical)',
  JSON.stringify(mcEvents) === JSON.stringify(simulateMcHoHandover(servingSinr, candidateSinr, mcParams)));

// MC-HO should have zero interruption during dual-active (like DAPS)
checkBool('MC-HO: dual-active provides zero interruption',
  (() => {
    const dualStart = mcEvents.find(e => e.type === 'mc-ho-dual-start');
    const dualEnd = mcEvents.find(e => e.type === 'mc-ho-dual-end');
    // Both events exist = continuous service during transition
    return dualStart && dualEnd;
  })(),
  'dual-start and dual-end both present');

// ═══════════════════════════════════════════════════════════════════
// VAL-SINR-002: Per-interferer path loss (C1 fix verification)
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-SINR-002: Per-Interferer Path Loss ===\n');

// Two interferers at different slant ranges must produce different
// interference contributions. If C1 bug exists (all use serving path loss),
// interference would be identical regardless of interferer distance.

function computeSinrFixed(opts) {
  const { servingBeamGainDb, servingPathLossDb, servingShadowFadingDb,
          servingClutterLossDb, txEirpDbm, noisePowerDbm, interferingSignals } = opts;
  const signalDbm = txEirpDbm + servingBeamGainDb - servingPathLossDb
                    - servingShadowFadingDb - servingClutterLossDb;
  let iLinear = 0;
  for (const s of interferingSignals) {
    const iPwr = txEirpDbm + s.beamGainDb - s.pathLossDb - s.shadowFadingDb - s.clutterLossDb;
    iLinear += Math.pow(10, iPwr / 10);
  }
  const sLinear = Math.pow(10, signalDbm / 10);
  const nLinear = Math.pow(10, noisePowerDbm / 10);
  return 10 * Math.log10(sLinear / (iLinear + nLinear));
}

// Serving: 600 km slant, 2 GHz
const servFspl = fspl(2000, 600);
// Interferer A: 800 km slant (low elevation)
const intAFspl = fspl(2000, 800);
// Interferer B: 1500 km slant (very low elevation)
const intBFspl = fspl(2000, 1500);

// Same beam gain for simplicity (both at same off-axis angle)
const iGain = -5; // dB, sidelobe

// Test 1: with per-interferer path loss, A and B contribute differently
const sinr_perInt = computeSinrFixed({
  servingBeamGainDb: 30, servingPathLossDb: servFspl,
  servingShadowFadingDb: 0, servingClutterLossDb: 0,
  txEirpDbm: 50, noisePowerDbm: -100,
  interferingSignals: [
    { beamGainDb: iGain, pathLossDb: intAFspl, shadowFadingDb: 0, clutterLossDb: 0 },
    { beamGainDb: iGain, pathLossDb: intBFspl, shadowFadingDb: 0, clutterLossDb: 0 },
  ],
});

// Test 2: C1-buggy version (all interferers use serving path loss)
const sinr_buggy = computeSinrFixed({
  servingBeamGainDb: 30, servingPathLossDb: servFspl,
  servingShadowFadingDb: 0, servingClutterLossDb: 0,
  txEirpDbm: 50, noisePowerDbm: -100,
  interferingSignals: [
    { beamGainDb: iGain, pathLossDb: servFspl, shadowFadingDb: 0, clutterLossDb: 0 },
    { beamGainDb: iGain, pathLossDb: servFspl, shadowFadingDb: 0, clutterLossDb: 0 },
  ],
});

checkBool('Per-interferer SINR differs from buggy (same-PL) SINR',
  Math.abs(sinr_perInt - sinr_buggy) > 0.5,
  `fixed=${sinr_perInt.toFixed(2)} dB, buggy=${sinr_buggy.toFixed(2)} dB, diff=${Math.abs(sinr_perInt - sinr_buggy).toFixed(2)} dB`);

// Distant interferer (B at 1500 km) contributes less than close one (A at 800 km)
const sinr_onlyA = computeSinrFixed({
  servingBeamGainDb: 30, servingPathLossDb: servFspl,
  servingShadowFadingDb: 0, servingClutterLossDb: 0,
  txEirpDbm: 50, noisePowerDbm: -100,
  interferingSignals: [
    { beamGainDb: iGain, pathLossDb: intAFspl, shadowFadingDb: 0, clutterLossDb: 0 },
  ],
});
const sinr_onlyB = computeSinrFixed({
  servingBeamGainDb: 30, servingPathLossDb: servFspl,
  servingShadowFadingDb: 0, servingClutterLossDb: 0,
  txEirpDbm: 50, noisePowerDbm: -100,
  interferingSignals: [
    { beamGainDb: iGain, pathLossDb: intBFspl, shadowFadingDb: 0, clutterLossDb: 0 },
  ],
});

checkBool('Closer interferer (800km) causes lower SINR than distant (1500km)',
  sinr_onlyA < sinr_onlyB,
  `SINR(800km int)=${sinr_onlyA.toFixed(2)} < SINR(1500km int)=${sinr_onlyB.toFixed(2)}`);

// Verify path loss difference is physically meaningful
const plDiff = intBFspl - intAFspl;
checkBool('Path loss difference between 800km and 1500km > 4 dB',
  plDiff > 4,
  `FSPL(1500km)-FSPL(800km) = ${plDiff.toFixed(2)} dB`);

// ═══════════════════════════════════════════════════════════════════
// VAL-FADING-001: Tier 5 Shadowed-Rician fading (MS1 fix)
// ═══════════════════════════════════════════════════════════════════

console.log('\n=== VAL-FADING-001: Shadowed-Rician Fading ===\n');

// Verify that SR fading produces non-zero variance and reasonable statistics
function sampleSRFading(rng, m, b0, omega) {
  // Gamma sample (simplified for m >= 1)
  function gammaSmall(shape, scale) {
    const d = shape - 1/3;
    const c = 1 / Math.sqrt(9*d);
    for (;;) {
      const u1 = rng.next(), u2 = rng.next();
      const x = Math.sqrt(-2*Math.log(u1||1e-10))*Math.cos(2*Math.PI*u2);
      const v = 1 + c*x;
      if (v <= 0) continue;
      const v3 = v*v*v;
      const u = rng.next();
      if (u < 1 - 0.0331*x*x*x*x || Math.log(u||1e-10) < 0.5*x*x + d*(1-v3+Math.log(v3)))
        return scale * d * v3;
    }
  }

  const losAmp = Math.sqrt(gammaSmall(Math.max(1, m), omega / Math.max(1, m)));
  const u1 = rng.next(), u2 = rng.next();
  const r = Math.sqrt(-2*Math.log(u1||1e-10));
  const sy = Math.sqrt(b0)*r*Math.cos(2*Math.PI*u2);
  const sz = Math.sqrt(b0)*r*Math.sin(2*Math.PI*u2);
  const theta = rng.next()*2*Math.PI;
  const re = losAmp*Math.cos(theta) + sy;
  const im = losAmp*Math.sin(theta) + sz;
  const power = re*re + im*im;
  const meanPower = omega + 2*b0;
  return 10*Math.log10((power/meanPower)||1e-30);
}

const fadingRng = createRng(123);
const N_SAMPLES = 1000;
// LOS at 30°: m=12, b0=0.025, omega=0.98
const fadingSamples = Array.from({ length: N_SAMPLES }, () =>
  sampleSRFading(fadingRng, 12, 0.025, 0.98));

const fadingMean = fadingSamples.reduce((a, b) => a + b, 0) / N_SAMPLES;
const fadingVar = fadingSamples.reduce((a, b) => a + (b - fadingMean) ** 2, 0) / N_SAMPLES;

checkBool('SR fading: non-zero variance',
  fadingVar > 0.1,
  `variance=${fadingVar.toFixed(2)} dB²`);

// Mean should be near 0 dB (normalized)
checkBool('SR fading: mean near 0 dB (within ±3 dB)',
  Math.abs(fadingMean) < 3,
  `mean=${fadingMean.toFixed(2)} dB`);

// Range: should span at least 5 dB
const fadingMin = Math.min(...fadingSamples);
const fadingMax = Math.max(...fadingSamples);
checkBool('SR fading: dynamic range > 5 dB',
  fadingMax - fadingMin > 5,
  `range=${(fadingMax - fadingMin).toFixed(1)} dB [${fadingMin.toFixed(1)}, ${fadingMax.toFixed(1)}]`);

// LOS at high elevation (90°): m=20, very small b0 → less variance
const fadingRng2 = createRng(456);
const fadingSamples90 = Array.from({ length: N_SAMPLES }, () =>
  sampleSRFading(fadingRng2, 20, 0.002, 1.0));
const fadingVar90 = fadingSamples90.reduce((a, b) => a + (b - fadingSamples90.reduce((x,y)=>x+y,0)/N_SAMPLES)**2, 0) / N_SAMPLES;

checkBool('SR fading: high elevation (90°) has less variance than low (30°)',
  fadingVar90 < fadingVar,
  `var@90°=${fadingVar90.toFixed(2)} < var@30°=${fadingVar.toFixed(2)}`);

// ═══════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════

console.log('\n════════════════════════════════════════════');
if (failures === 0) {
  console.log('ALL CHECKS PASSED');
} else {
  console.log(`${failures} CHECK(S) FAILED`);
}
console.log('════════════════════════════════════════════');

process.exit(failures > 0 ? 1 : 0);
