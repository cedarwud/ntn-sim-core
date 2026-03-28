#!/usr/bin/env node

import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';

import { loadProfile } from '@/core/profiles';
import { buildInteractiveTrajectoryCache, buildSyntheticOrbitElements } from '@/core/orbit';
import { createSimEngine } from '@/core/engine';
import type { SimulationSnapshot } from '@/core/common/types';
import type { ProfileConfig } from '@/core/profiles/types';

const ROOT = resolve(import.meta.dirname, '..');
const CHROME_BIN = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const DEFAULT_PREVIEW_PORT = 4173;
const PROFILE_IDS = ['case9-access-baseline', 'hobs-multibeam-baseline'] as const;
const CHECKPOINTS_SEC = [10, 120] as const;
const POSITION_TOLERANCES = {
  azimuthDeg: 1e-4,
  elevationDeg: 1e-4,
  rangeKm: 1e-3,
  latDeg: 1e-6,
  lonDeg: 1e-6,
  altKm: 1e-6,
};

type OrbitParitySatelliteSample = {
  id: string;
  latDeg: number;
  lonDeg: number;
  altKm: number;
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
  isVisible: boolean;
};

type OrbitParityState = {
  orbitParity?: {
    present: boolean;
    mode: 'live' | 'replay';
    profileId: string;
    timeSec: number | null;
    sampleCount: number;
    satellites: OrbitParitySatelliteSample[];
  };
};

let activeBaseUrl = `http://127.0.0.1:${DEFAULT_PREVIEW_PORT}`;
let failures = 0;

function pass(label: string, detail = '') {
  console.log(`  [PASS] ${label}${detail ? `: ${detail}` : ''}`);
}

function fail(label: string, detail = '') {
  failures += 1;
  console.log(`  [FAIL] ${label}${detail ? `: ${detail}` : ''}`);
}

function check(label: string, condition: boolean, detail = '') {
  if (condition) pass(label, detail);
  else fail(label, detail);
}

function angleDiffDeg(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function spawnPreview() {
  const port = Number(new URL(activeBaseUrl).port);
  const child = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      BROWSER: 'none',
    },
  });

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    if (text.trim()) process.stdout.write(`[preview] ${text}`);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    if (text.trim()) process.stderr.write(`[preview] ${text}`);
  });

  return child;
}

async function waitForServer(url: string, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // ignore until timeout
    }
    await delay(250);
  }
  throw new Error(`vite preview did not become ready within ${timeoutMs}ms`);
}

async function resolvePreviewPort(preferredPort = DEFAULT_PREVIEW_PORT): Promise<number> {
  const tryPort = (port: number) => new Promise<number>((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      const resolvedPort = typeof address === 'object' && address ? address.port : port;
      server.close((closeError) => {
        if (closeError) reject(closeError);
        else resolvePort(resolvedPort);
      });
    });
  });

  try {
    return await tryPort(preferredPort);
  } catch {
    return await tryPort(0);
  }
}

async function readOrbitParityState(page: Page): Promise<OrbitParityState | null> {
  return page.evaluate(() => {
    const win = window as Window & { __NTN_SIM_CORE_VISUAL__?: OrbitParityState };
    return win.__NTN_SIM_CORE_VISUAL__ ?? null;
  });
}

async function gotoLiveScenario(page: Page, profileId: string) {
  const url = new URL(activeBaseUrl);
  url.searchParams.set('validate', '1');
  url.searchParams.set('profile', profileId);
  url.searchParams.set('speed', '180');
  url.searchParams.set('showBeams', '0');
  url.searchParams.set('showLabels', '0');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });

  const started = Date.now();
  while (Date.now() - started < 90000) {
    const state = await readOrbitParityState(page);
    const orbit = state?.orbitParity;
    if (orbit?.present && orbit.mode === 'live' && orbit.profileId === profileId) {
      return;
    }
    await delay(250);
  }

  throw new Error(`orbit parity state not reached within 90s for ${profileId}`);
}

async function waitForOrbitSample(
  page: Page,
  profileId: string,
  minTimeSec: number,
  previousTimeSec: number,
) {
  const started = Date.now();
  while (Date.now() - started < 20000) {
    const state = await readOrbitParityState(page);
    const orbit = state?.orbitParity;
    if (
      orbit?.present &&
      orbit.mode === 'live' &&
      orbit.profileId === profileId &&
      orbit.timeSec !== null &&
      orbit.timeSec >= minTimeSec &&
      orbit.timeSec > previousTimeSec &&
      orbit.sampleCount > 0
    ) {
      return orbit;
    }
    await delay(100);
  }

  throw new Error(`orbit sample not reached within 20s for ${profileId} @ ${minTimeSec}s`);
}

function buildHeadlessReference(profileId: string) {
  const profile = loadProfile(profileId);
  if (profile.orbitMode !== 'synthetic') {
    throw new Error(`VAL-ORB-001 expects synthetic profile, got ${profile.orbitMode} for ${profileId}`);
  }
  const elements = buildSyntheticOrbitElements(profile);
  const cache = buildInteractiveTrajectoryCache(profile, elements);
  const engine = createSimEngine({ profile, trajectoryCache: cache });
  return { profile, engine };
}

function normalizeSatellites(snapshot: SimulationSnapshot): OrbitParitySatelliteSample[] {
  return snapshot.satellites
    .map((sat) => ({
      id: sat.id,
      latDeg: sat.latDeg,
      lonDeg: sat.lonDeg,
      altKm: sat.altKm,
      azimuthDeg: sat.azimuthDeg,
      elevationDeg: sat.elevationDeg,
      rangeKm: sat.rangeKm,
      isVisible: sat.isVisible,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function compareOrbitSamples(
  profile: ProfileConfig,
  browserSample: NonNullable<OrbitParityState['orbitParity']>,
  snapshot: SimulationSnapshot,
) {
  const headlessSatellites = normalizeSatellites(snapshot);
  const browserSatellites = [...browserSample.satellites].sort((a, b) => a.id.localeCompare(b.id));
  const browserIds = browserSatellites.map((sat) => sat.id);
  const headlessIds = headlessSatellites.map((sat) => sat.id);
  const sameIds = browserIds.length === headlessIds.length
    && browserIds.every((satId, index) => satId === headlessIds[index]);

  let maxAzimuthDiff = 0;
  let maxElevationDiff = 0;
  let maxRangeDiff = 0;
  let maxLatDiff = 0;
  let maxLonDiff = 0;
  let maxAltDiff = 0;
  let visibilityMismatchCount = 0;

  const pairCount = Math.min(browserSatellites.length, headlessSatellites.length);
  for (let index = 0; index < pairCount; index++) {
    const browserSat = browserSatellites[index];
    const headlessSat = headlessSatellites[index];
    if (browserSat.id !== headlessSat.id) continue;

    maxAzimuthDiff = Math.max(maxAzimuthDiff, angleDiffDeg(browserSat.azimuthDeg, headlessSat.azimuthDeg));
    maxElevationDiff = Math.max(maxElevationDiff, Math.abs(browserSat.elevationDeg - headlessSat.elevationDeg));
    maxRangeDiff = Math.max(maxRangeDiff, Math.abs(browserSat.rangeKm - headlessSat.rangeKm));
    maxLatDiff = Math.max(maxLatDiff, Math.abs(browserSat.latDeg - headlessSat.latDeg));
    maxLonDiff = Math.max(maxLonDiff, Math.abs(browserSat.lonDeg - headlessSat.lonDeg));
    maxAltDiff = Math.max(maxAltDiff, Math.abs(browserSat.altKm - headlessSat.altKm));
    if (browserSat.isVisible !== headlessSat.isVisible) {
      visibilityMismatchCount += 1;
    }
  }

  const withinTolerance =
    sameIds &&
    visibilityMismatchCount === 0 &&
    maxAzimuthDiff <= POSITION_TOLERANCES.azimuthDeg &&
    maxElevationDiff <= POSITION_TOLERANCES.elevationDeg &&
    maxRangeDiff <= POSITION_TOLERANCES.rangeKm &&
    maxLatDiff <= POSITION_TOLERANCES.latDeg &&
    maxLonDiff <= POSITION_TOLERANCES.lonDeg &&
    maxAltDiff <= POSITION_TOLERANCES.altKm;

  const detail =
    `t=${browserSample.timeSec?.toFixed(3) ?? 'null'}s `
    + `count=${browserSatellites.length} `
    + `maxΔaz=${maxAzimuthDiff.toExponential(2)} `
    + `maxΔel=${maxElevationDiff.toExponential(2)} `
    + `maxΔrange=${maxRangeDiff.toExponential(2)}km `
    + `maxΔlat=${maxLatDiff.toExponential(2)} `
    + `maxΔlon=${maxLonDiff.toExponential(2)} `
    + `maxΔalt=${maxAltDiff.toExponential(2)} `
    + `visMismatch=${visibilityMismatchCount}`;

  check(
    `VAL-ORB-001 ${profile.id} browser/headless orbit parity`,
    withinTolerance,
    detail,
  );
}

async function main() {
  console.log('\n=== Orbit Parity Validation ===\n');

  const previewPort = await resolvePreviewPort();
  activeBaseUrl = `http://127.0.0.1:${previewPort}`;
  const preview = spawnPreview();

  let browser;
  try {
    await waitForServer(activeBaseUrl);

    browser = await chromium.launch({
      executablePath: CHROME_BIN,
      headless: true,
    });

    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

    for (const profileId of PROFILE_IDS) {
      const { profile, engine } = buildHeadlessReference(profileId);
      await gotoLiveScenario(page, profileId);

      let lastTimeSec = -1;
      for (const checkpointSec of CHECKPOINTS_SEC) {
        const orbitSample = await waitForOrbitSample(page, profileId, checkpointSec, lastTimeSec);
        if (orbitSample.timeSec === null) {
          fail(`VAL-ORB-001 ${profileId} orbit sample`, 'timeSec is null');
          continue;
        }
        check(
          `VAL-ORB-001 ${profileId} live time advances`,
          orbitSample.timeSec > lastTimeSec,
          `${lastTimeSec.toFixed(3)}s -> ${orbitSample.timeSec.toFixed(3)}s`,
        );
        lastTimeSec = orbitSample.timeSec;

        const snapshot = engine.tick(
          orbitSample.timeSec,
          Math.floor(orbitSample.timeSec / profile.timeControl.stepSec),
        );
        compareOrbitSamples(profile, orbitSample, snapshot);
      }
    }
  } finally {
    await browser?.close();
    preview.kill('SIGTERM');
  }

  console.log(`\nOrbit parity failures: ${failures}`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
