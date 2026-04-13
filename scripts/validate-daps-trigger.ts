/**
 * VAL-DAPS-003: DAPS A3-style trigger semantics validation.
 *
 * Runs the actual createDapsManager() and verifies:
 *   1. candidate > serving + hysteresis triggers preparation
 *   2. serving below threshold is NOT required
 *   3. TTT gates dual-active entry
 *   4. low elevation accelerates TTT
 *   5. full DAPS cycle completes (prepared → dual-active → path-switch)
 *
 * Usage: node --import tsx scripts/validate-daps-trigger.ts
 */

import { createDapsManager } from '../src/core/handover/daps';
import type { HandoverTickInput, HandoverCandidate } from '../src/core/handover/types';

let failures = 0;

function checkBool(label: string, ok: boolean, desc: string) {
  if (!ok) failures++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}: ${desc}`);
}

function makeTick(
  tick: number, timeSec: number, servingSinrDb: number | null,
  candidates: HandoverCandidate[], servingElevationDeg?: number,
): HandoverTickInput {
  return { tick, timeSec, servingSinrDb, candidates, servingElevationDeg };
}

function sat(id: string, sinrDb: number, elevationDeg = 45): HandoverCandidate {
  return { satId: id, beamId: `${id}-b0`, sinrDb, elevationDeg };
}

console.log('\n=== VAL-DAPS-003: DAPS A3-Style Trigger Semantics ===\n');

// ═══════════════════════════════════════════════════════════════════
// Test 1: A3 trigger with serving ABOVE threshold → enters prepared
// ═══════════════════════════════════════════════════════════════════

{
  const mgr = createDapsManager({
    triggerThresholdDb: -6, hysteresisDb: 1, tttSec: 0.5, preparationTimeSec: 0,
    maxDualActiveSec: 2, pathSwitchThresholdDb: -6, minElevationDeg: 10,
    packetDuplication: true, pingPongWindowSec: 5, sinrEmaAlpha: 1,
    rlfQoutDb: -8, rlfQinDb: -6, rlfN310: 1, rlfN311: 1, rlfT310Sec: 2,
  });

  mgr.tick(makeTick(0, 0, null, [sat('sat-A', 5)]));
  checkBool('initial attach', mgr.getState().phase === 'attached', `phase=${mgr.getState().phase}`);

  // serving=5dB ABOVE threshold(-6), candidate=8dB > 5+1 → triggers prepared
  mgr.tick(makeTick(1, 1, 5, [sat('sat-A', 5), sat('sat-B', 8)]));
  checkBool('A3 trigger above threshold → prepared',
    mgr.getState().phase === 'preparing',
    `phase=${mgr.getState().phase} (serving=5dB > threshold=-6dB)`);
}

// ═══════════════════════════════════════════════════════════════════
// Test 2: No trigger when candidate below hysteresis
// ═══════════════════════════════════════════════════════════════════

{
  const mgr = createDapsManager({
    triggerThresholdDb: -6, hysteresisDb: 2, tttSec: 0.5, preparationTimeSec: 0,
    maxDualActiveSec: 2, pathSwitchThresholdDb: -6, minElevationDeg: 10,
    packetDuplication: true, pingPongWindowSec: 5, sinrEmaAlpha: 1,
    rlfQoutDb: -8, rlfQinDb: -6, rlfN310: 1, rlfN311: 1, rlfT310Sec: 2,
  });

  mgr.tick(makeTick(0, 0, null, [sat('sat-A', 5)]));
  mgr.tick(makeTick(1, 1, 5, [sat('sat-A', 5), sat('sat-B', 6.5)]));
  checkBool('no trigger below hysteresis',
    mgr.getState().phase === 'attached' && mgr.getState().totalHandovers === 0,
    `phase=${mgr.getState().phase} (6.5 < 5+2=7)`);
}

// ═══════════════════════════════════════════════════════════════════
// Test 3: Full DAPS cycle — prepared → TTT → dual-active → complete
// ═══════════════════════════════════════════════════════════════════

{
  const mgr = createDapsManager({
    triggerThresholdDb: -6, hysteresisDb: 1, tttSec: 0.5, preparationTimeSec: 0,
    maxDualActiveSec: 3, pathSwitchThresholdDb: -6, minElevationDeg: 10,
    packetDuplication: true, pingPongWindowSec: 5, sinrEmaAlpha: 1,
    rlfQoutDb: -8, rlfQinDb: -6, rlfN310: 1, rlfN311: 1, rlfT310Sec: 2,
  });

  mgr.tick(makeTick(0, 0, null, [sat('sat-A', 5)]));

  // Tick 1: trigger → prepared
  mgr.tick(makeTick(1, 1, 5, [sat('sat-A', 5), sat('sat-B', 8)]));
  checkBool('cycle: prepared', mgr.getState().phase === 'preparing', '');

  // Tick 2: TTT done (1s > 0.5s) → dual-active
  mgr.tick(makeTick(2, 2, 5, [sat('sat-A', 5), sat('sat-B', 8)]));
  checkBool('cycle: dual-active', mgr.getState().phase === 'switching', `phase=${mgr.getState().phase}`);

  // Tick 3: path switch → complete
  mgr.tick(makeTick(3, 3, 5, [sat('sat-A', 5), sat('sat-B', 8)]));
  checkBool('cycle: completed', mgr.getState().totalHandovers >= 1, `HO=${mgr.getState().totalHandovers}`);
  checkBool('cycle: serving sat-B', mgr.getState().serving?.satId === 'sat-B', `serving=${mgr.getState().serving?.satId}`);
}

// ═══════════════════════════════════════════════════════════════════
// Test 4: Elevation accelerant shortens TTT
// ═══════════════════════════════════════════════════════════════════

{
  const mgrHigh = createDapsManager({
    triggerThresholdDb: -6, hysteresisDb: 1, tttSec: 2, preparationTimeSec: 0,
    maxDualActiveSec: 5, pathSwitchThresholdDb: -6, minElevationDeg: 10,
    packetDuplication: true, pingPongWindowSec: 5, prepareElevationDeg: 30,
    sinrEmaAlpha: 1, rlfQoutDb: -8, rlfQinDb: -6, rlfN310: 1, rlfN311: 1, rlfT310Sec: 2,
  });
  const mgrLow = createDapsManager({
    triggerThresholdDb: -6, hysteresisDb: 1, tttSec: 2, preparationTimeSec: 0,
    maxDualActiveSec: 5, pathSwitchThresholdDb: -6, minElevationDeg: 10,
    packetDuplication: true, pingPongWindowSec: 5, prepareElevationDeg: 30,
    sinrEmaAlpha: 1, rlfQoutDb: -8, rlfQinDb: -6, rlfN310: 1, rlfN311: 1, rlfT310Sec: 2,
  });

  mgrHigh.tick(makeTick(0, 0, null, [sat('sat-A', 5, 60)]));
  mgrLow.tick(makeTick(0, 0, null, [sat('sat-A', 5, 12)]));

  // Both trigger at t=1 → prepared
  mgrHigh.tick(makeTick(1, 1, 5, [sat('sat-A', 5, 60), sat('sat-B', 8, 60)], 60));
  mgrLow.tick(makeTick(1, 1, 5, [sat('sat-A', 5, 12), sat('sat-B', 8, 12)], 12));
  checkBool('elev: both enter prepared',
    mgrHigh.getState().phase === 'preparing' && mgrLow.getState().phase === 'preparing', '');

  // At t=2.2 (1.2s elapsed): low-elev effective TTT ~1.1s → done → switching.
  // high-elev TTT=2.0s → still preparing.
  mgrHigh.tick(makeTick(2, 2.2, 5, [sat('sat-A', 5, 60), sat('sat-B', 8, 60)], 60));
  mgrLow.tick(makeTick(2, 2.2, 5, [sat('sat-A', 5, 12), sat('sat-B', 8, 12)], 12));

  checkBool('elev: high-elev TTT still running',
    mgrHigh.getState().phase === 'preparing', `phase=${mgrHigh.getState().phase}`);
  checkBool('elev: low-elev completes faster',
    mgrLow.getState().phase === 'switching' || mgrLow.getState().totalHandovers >= 1,
    `phase=${mgrLow.getState().phase}, HO=${mgrLow.getState().totalHandovers}`);
}

// ═══════════════════════════════════════════════════════════════════

console.log('\n════════════════════════════════════════════');
if (failures === 0) {
  console.log('VAL-DAPS-003: ALL CHECKS PASSED');
} else {
  console.log(`VAL-DAPS-003: ${failures} CHECK(S) FAILED`);
}
console.log('════════════════════════════════════════════');

process.exit(failures > 0 ? 1 : 0);
