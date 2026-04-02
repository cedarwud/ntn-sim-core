#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MIN_VISIBLE_ELEVATION_DEG } from '@/core/common/constants';
import { loadProfile } from '@/core/profiles/loader';
import { buildProfileTrajectoryCache, resolveProfileOrbitElements } from '@/core/orbit/profile-runtime';
import {
  getOrbitElementSatrec,
  getOrbitElementTruthPath,
  propagateSgp4,
  SGP4_SAMPLED_CACHE_TRUTH_PATH,
} from '@/core/orbit/sgp4-adapter';
import { createObserverContext, computeTopocentricPoint } from '@/core/orbit/topocentric';
import type { OrbitElement } from '@/core/orbit/types';
import type { OmmRecord } from '@/core/orbit/tle-loader';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;

function pass(label: string, detail = '') {
  console.log(`  [PASS] ${label}${detail ? `: ${detail}` : ''}`);
}

function fail(label: string, detail = '') {
  failures += 1;
  console.log(`  [FAIL] ${label}${detail ? `: ${detail}` : ''}`);
}

function checkBool(label: string, condition: boolean, detail = '') {
  if (condition) pass(label, detail);
  else fail(label, detail);
}

function checkAbs(label: string, actual: number, expected: number, tolerance: number, unit = '') {
  const diff = Math.abs(actual - expected);
  const ok = diff <= tolerance;
  const detail = `${actual.toFixed(9)}${unit ? ` ${unit}` : ''} vs ${expected.toFixed(9)}${unit ? ` ${unit}` : ''} (diff ${diff.toExponential(3)}, tol ±${tolerance})`;
  if (ok) pass(label, detail);
  else fail(label, detail);
}

function angleDiffDeg(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

console.log('\n=== VAL-RT-003: Real-Trace Truth-Path Parity ===\n');

const profile = loadProfile('real-trace-validation');
checkBool('profile uses real-trace orbit mode', profile.orbitMode === 'real-trace', profile.orbitMode);
checkBool('profile keeps validation-sized envelope', profile.tleMaxSatellites === 50, String(profile.tleMaxSatellites));

if (profile.orbitMode !== 'real-trace' || !profile.tleDataPath) {
  console.log('\nEXIT 1 — real-trace-validation is not configured for OMM/TLE ingest\n');
  process.exit(1);
}

const fixturePath = resolve(root, profile.tleDataPath);
const ommData = JSON.parse(readFileSync(fixturePath, 'utf8')) as OmmRecord[];
const elements = resolveProfileOrbitElements(profile, ommData);
const elementById = new Map(elements.map((element) => [element.id, element]));

checkBool(
  'resolved element count matches validation-sized envelope',
  elements.length === profile.tleMaxSatellites,
  `${elements.length} elements`,
);

const satrecBackedCount = elements.filter((element) => getOrbitElementSatrec(element) !== null).length;
checkBool(
  'all real-trace elements retain SatRec metadata',
  satrecBackedCount === elements.length,
  `${satrecBackedCount}/${elements.length} SatRec-backed`,
);

const truthTaggedCount = elements.filter(
  (element) => getOrbitElementTruthPath(element) === SGP4_SAMPLED_CACHE_TRUTH_PATH,
).length;
checkBool(
  'all real-trace elements report sgp4-sampled-cache truth path',
  truthTaggedCount === elements.length,
  `${truthTaggedCount}/${elements.length} tagged`,
);

const cache = buildProfileTrajectoryCache(profile, elements);
const observer = createObserverContext(
  profile.observer.latitudeDeg,
  profile.observer.longitudeDeg,
  profile.observer.altitudeM / 1000,
);

let comparedSamples = 0;
let maxAzimuthDiff = 0;
let maxElevationDiff = 0;
let maxRangeDiff = 0;
let maxLatDiff = 0;
let maxLonDiff = 0;
let maxAltDiff = 0;
let visibilityMismatchCount = 0;
let missingSatrecCount = 0;

for (const [satId, passes] of cache.passesBySatId) {
  const element = elementById.get(satId);
  if (!element) {
    fail('cache pass references known element', satId);
    continue;
  }

  const satrec = getOrbitElementSatrec(element);
  if (!satrec) {
    missingSatrecCount += 1;
    fail('cache pass keeps SatRec-backed truth source', satId);
    continue;
  }

  for (const passEntry of passes) {
    for (const sample of passEntry.samples) {
      const utcMs = profile.timeControl.epochUtcMs + sample.timeSec * 1000;
      const point = propagateSgp4(satrec, utcMs);
      if (!point) {
        fail('propagateSgp4 returns point for cached sample tick', `${satId} @ ${sample.timeSec}s`);
        continue;
      }

      const topo = computeTopocentricPoint(observer, point.ecefKm);
      const azimuthDiff = angleDiffDeg(sample.azimuthDeg, topo.azimuthDeg);
      const elevationDiff = Math.abs(sample.elevationDeg - topo.elevationDeg);
      const rangeDiff = Math.abs(sample.rangeKm - topo.rangeKm);
      const latDiff = Math.abs(sample.latDeg - point.latDeg);
      const lonDiff = Math.abs(sample.lonDeg - point.lonDeg);
      const altDiff = Math.abs(sample.altKm - point.altKm);
      const expectedVisible = topo.elevationDeg >= MIN_VISIBLE_ELEVATION_DEG;

      maxAzimuthDiff = Math.max(maxAzimuthDiff, azimuthDiff);
      maxElevationDiff = Math.max(maxElevationDiff, elevationDiff);
      maxRangeDiff = Math.max(maxRangeDiff, rangeDiff);
      maxLatDiff = Math.max(maxLatDiff, latDiff);
      maxLonDiff = Math.max(maxLonDiff, lonDiff);
      maxAltDiff = Math.max(maxAltDiff, altDiff);
      if (sample.isVisible !== expectedVisible) {
        visibilityMismatchCount += 1;
      }
      comparedSamples += 1;
    }
  }
}

checkBool(
  'cache produced real-trace pass samples to compare',
  comparedSamples > 0,
  `${cache.passesBySatId.size} satellites / ${comparedSamples} samples`,
);
checkBool('no cached passes lost their SatRec truth source', missingSatrecCount === 0, `${missingSatrecCount} missing`);
checkAbs('max azimuth diff vs propagateSgp4()', maxAzimuthDiff, 0, 1e-9, 'deg');
checkAbs('max elevation diff vs propagateSgp4()', maxElevationDiff, 0, 1e-9, 'deg');
checkAbs('max range diff vs propagateSgp4()', maxRangeDiff, 0, 1e-9, 'km');
checkAbs('max latitude diff vs propagateSgp4()', maxLatDiff, 0, 1e-9, 'deg');
checkAbs('max longitude diff vs propagateSgp4()', maxLonDiff, 0, 1e-9, 'deg');
checkAbs('max altitude diff vs propagateSgp4()', maxAltDiff, 0, 1e-9, 'km');
checkBool('cached sample visibility matches SGP4-derived visibility', visibilityMismatchCount === 0, `${visibilityMismatchCount} mismatches`);

if (failures > 0) {
  console.log(`\nEXIT 1 — VAL-RT-003 failed with ${failures} issue(s)\n`);
  process.exit(1);
}

console.log('\nEXIT 0 — VAL-RT-003 passed\n');
