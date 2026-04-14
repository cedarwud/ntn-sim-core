#!/usr/bin/env node
/**
 * validate-multibeam-gating.ts
 *
 * VAL-MB-001 multibeam closure validation:
 *   - active-beam rotation is deterministic
 *   - restricting active beams changes serviceability deterministically
 *
 * Usage:
 *   node --import tsx scripts/validate-multibeam-gating.ts
 */

import { createActiveBeamManager } from '../src/core/beam/active-beam-manager';
import { generateHexagonalBeamLayout } from '../src/core/beam/layout';
import { selectBeamForUe } from '../src/core/beam/selection';
import {
  CASE9_ACCESS_BASELINE,
  HOBS_MULTIBEAM_BASELINE,
} from '../src/core/profiles/defaults';
import { evaluateTrackedBeamSelection } from '../src/core/engine/beam-tracking';

let failures = 0;

function pass(label: string, detail = '') {
  console.log(`  [PASS] ${label}${detail ? `: ${detail}` : ''}`);
}

function fail(label: string, detail = '') {
  failures++;
  console.log(`  [FAIL] ${label}${detail ? `: ${detail}` : ''}`);
}

function checkBool(label: string, condition: boolean, detail = '') {
  if (condition) pass(label, detail);
  else fail(label, detail);
}

function offsetToLatLon(
  eastKm: number,
  northKm: number,
  originLatDeg: number = 0,
  originLonDeg: number = 0,
) {
  const kmPerDeg = 111.32;
  const lonScale = kmPerDeg * Math.max(0.01, Math.cos(originLatDeg * Math.PI / 180));
  return {
    latitudeDeg: originLatDeg + (northKm / kmPerDeg),
    longitudeDeg: originLonDeg + (eastKm / lonScale),
  };
}

const SLOT_COUNT = 6;
const UE_COUNT = 6;

function createLayout() {
  return generateHexagonalBeamLayout({
    satId: 'val-mb-001',
    numBeams: HOBS_MULTIBEAM_BASELINE.beam.num_beams,
    beamDiameterKm: HOBS_MULTIBEAM_BASELINE.antenna.beam_diameter_km,
    altitudeKm: HOBS_MULTIBEAM_BASELINE.orbital.altitude_km,
    frf: HOBS_MULTIBEAM_BASELINE.beam.frf,
  });
}

function coverageThresholdDeg(beamDiameterKm: number, altitudeKm: number): number {
  return Math.atan((beamDiameterKm / 2) / altitudeKm) * (180 / Math.PI);
}

function runServiceabilitySequence(maxActiveBeams: number) {
  const layout = createLayout();
  const thresholdDeg = coverageThresholdDeg(layout.beamDiameterKm, layout.altitudeKm);
  const beamCenterUes = layout.beams.slice(0, UE_COUNT).map((beam) => ({
    id: beam.beamId,
    offsetEastKm: beam.offsetEastKm,
    offsetNorthKm: beam.offsetNorthKm,
  }));
  const manager = createActiveBeamManager(layout, maxActiveBeams);

  const activeSequence: string[][] = [];
  const serviceMatrix: boolean[][] = [];

  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    const activeBeamIds = manager.getActiveBeams().slice().sort();
    activeSequence.push(activeBeamIds);

    const serviceable = beamCenterUes.map((ue) => {
      const selection = selectBeamForUe(
        layout,
        ue.offsetEastKm,
        ue.offsetNorthKm,
        HOBS_MULTIBEAM_BASELINE.antenna,
        activeBeamIds,
      );
      return selection.offAxisAngleDeg <= thresholdDeg + 1e-9;
    });
    serviceMatrix.push(serviceable);

    manager.advanceSlot();
  }

  return {
    activeSequence,
    serviceMatrix,
    serviceCounts: serviceMatrix.map((row) => row.filter(Boolean).length),
    totalServiceableSamples: serviceMatrix
      .flat()
      .filter(Boolean).length,
  };
}

console.log('\n=== VAL-MB-001: Active-Beam Gating Determinism ===\n');

const gatedRunA = runServiceabilitySequence(1);
const gatedRunB = runServiceabilitySequence(1);
const allActiveRun = runServiceabilitySequence(HOBS_MULTIBEAM_BASELINE.beam.num_beams);

checkBool(
  'active-beam rotation is deterministic across repeated runs',
  JSON.stringify(gatedRunA.activeSequence) === JSON.stringify(gatedRunB.activeSequence),
  gatedRunA.activeSequence.map((slot) => slot.join(',')).join(' | '),
);

checkBool(
  'serviceability matrix is deterministic across repeated runs',
  JSON.stringify(gatedRunA.serviceMatrix) === JSON.stringify(gatedRunB.serviceMatrix),
  gatedRunA.serviceCounts.join(', '),
);

checkBool(
  'single-active-beam gating serves exactly one beam-center UE per slot',
  gatedRunA.serviceCounts.every((count) => count === 1),
  gatedRunA.serviceCounts.join(', '),
);

checkBool(
  'all-active reference serves every beam-center UE in every slot',
  allActiveRun.serviceCounts.every((count) => count === UE_COUNT),
  allActiveRun.serviceCounts.join(', '),
);

checkBool(
  'active-beam restriction reduces serviceable UE-slot samples',
  gatedRunA.totalServiceableSamples < allActiveRun.totalServiceableSamples,
  `${gatedRunA.totalServiceableSamples} vs ${allActiveRun.totalServiceableSamples}`,
);

const hasOpenVsGatedGap = gatedRunA.serviceMatrix.some((slot, slotIndex) =>
  slot.some((served, ueIndex) => !served && allActiveRun.serviceMatrix[slotIndex][ueIndex]),
);
checkBool(
  'at least one UE loses service when its beam is inactive',
  hasOpenVsGatedGap,
  `${gatedRunA.totalServiceableSamples} gated samples vs ${allActiveRun.totalServiceableSamples} all-active samples`,
);

console.log('\n=== VAL-MB-001b: Earth-Moving Bounded Steering ===\n');

const case9Layout = generateHexagonalBeamLayout({
  satId: 'val-case9-bound',
  numBeams: CASE9_ACCESS_BASELINE.beam.num_beams,
  beamDiameterKm: CASE9_ACCESS_BASELINE.antenna.beam_diameter_km,
  altitudeKm: CASE9_ACCESS_BASELINE.orbital.altitude_km,
  frf: CASE9_ACCESS_BASELINE.beam.frf,
});

const case9Clamped = evaluateTrackedBeamSelection(
  CASE9_ACCESS_BASELINE,
  case9Layout,
  { latDeg: 0, lonDeg: 0 },
  offsetToLatLon(350, 0),
);
checkBool(
  'case9 bounded steering clamps the lattice center to the authored ground-plane bound',
  Math.abs(
    Math.hypot(case9Clamped.beamCenterOffsetEastKm, case9Clamped.beamCenterOffsetNorthKm)
      - (CASE9_ACCESS_BASELINE.beam.steering_bound_km ?? 0),
  ) <= 1e-6,
  `${Math.hypot(case9Clamped.beamCenterOffsetEastKm, case9Clamped.beamCenterOffsetNorthKm).toFixed(3)} km`,
);

checkBool(
  'case9 off-nadir UE no longer defaults to the center beam under bounded steering',
  case9Clamped.selection.bestBeamId !== 'val-case9-bound-b0',
  case9Clamped.selection.bestBeamId,
);

const case9OutOfReach = evaluateTrackedBeamSelection(
  CASE9_ACCESS_BASELINE,
  case9Layout,
  { latDeg: 0, lonDeg: 0 },
  offsetToLatLon(450, 0),
);
checkBool(
  'case9 bounded steering marks far-out UE as ineligible once the reachable cluster is exceeded',
  case9OutOfReach.serviceEligible === false,
  `residual=${Math.hypot(case9OutOfReach.residualOffsetEastKm, case9OutOfReach.residualOffsetNorthKm).toFixed(3)} km`,
);

const hobsLayout = createLayout();
const hobsOutOfReach = evaluateTrackedBeamSelection(
  HOBS_MULTIBEAM_BASELINE,
  hobsLayout,
  { latDeg: 0, lonDeg: 0 },
  offsetToLatLon(700, 0),
);
checkBool(
  'HOBS bounded steering also produces an explicit out-of-reach ineligible state',
  hobsOutOfReach.serviceEligible === false,
  `residual=${Math.hypot(hobsOutOfReach.residualOffsetEastKm, hobsOutOfReach.residualOffsetNorthKm).toFixed(3)} km`,
);

console.log('\n════════════════════════════════════════════');
if (failures > 0) {
  console.log(`FAIL — ${failures} multibeam gating validation issue(s) found`);
  console.log('════════════════════════════════════════════');
  process.exit(1);
} else {
  console.log('ALL MULTIBEAM GATING CHECKS PASSED');
  console.log('════════════════════════════════════════════');
  process.exit(0);
}
