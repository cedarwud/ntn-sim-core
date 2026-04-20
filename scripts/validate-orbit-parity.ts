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
const LIVE_STATE_TIMEOUT_MS = 150_000;
const VALIDATION_SPEED = 10;
// Validation probe snapshots are published from the live scene loop, which runs
// at 20 fps by default. Keeping the validator below that headless catch-up edge
// makes the 10 s checkpoint observable without relaxing the bounded overshoot
// rule into arbitrary-late sample parity.
const CHECKPOINT_MAX_OVERSHOOT_SEC = 15;
const ORBIT_SAMPLE_TIMEOUT_MS = 20_000;
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
  runtime?: {
    mode: 'live' | 'replay' | 'modqn-bundle';
    profileId: string;
    timeSec: number | null;
  };
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
    detached: true,
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

function waitForChildClose(child: ReturnType<typeof spawn>, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const onClose = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.off('close', onClose);
      resolve(false);
    }, timeoutMs);

    child.once('close', onClose);
  });
}

async function terminatePreview(child: ReturnType<typeof spawn>) {
  const pid = child.pid;
  if (!pid) return;

  child.stdout?.destroy();
  child.stderr?.destroy();

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    return;
  }

  const exitedAfterTerm = await waitForChildClose(child, 1_000);
  if (exitedAfterTerm) return;

  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    return;
  }

  await waitForChildClose(child, 1_000);
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

async function resolvePreviewPort(preferredPort = 0): Promise<number> {
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
  url.searchParams.set('speed', String(VALIDATION_SPEED));
  url.searchParams.set('paused', '1');
  url.searchParams.set('showBeams', '0');
  url.searchParams.set('showLabels', '0');
  await page.goto(url.toString(), {
    waitUntil: 'domcontentloaded',
    timeout: LIVE_STATE_TIMEOUT_MS,
  });

  const started = Date.now();
  // Keep bootstrap and checkpoint timing separate. The scene can take tens of
  // seconds to become ready in headless mode, but we do not want that startup
  // delay to consume the 10 s / 120 s checkpoint budget before sampling begins.
  while (Date.now() - started < LIVE_STATE_TIMEOUT_MS) {
    const state = await readOrbitParityState(page);
    const runtime = state?.runtime;
    if (runtime?.mode === 'live' && runtime.profileId === profileId) {
      return;
    }
    await delay(250);
  }

  throw new Error(`live runtime not reached within ${LIVE_STATE_TIMEOUT_MS / 1000}s for ${profileId}`);
}

async function resumeLiveScenario(page: Page, profileId: string) {
  await page.getByRole('button', { name: /^▶\s*Play$/ }).click({ timeout: 5_000 });

  const started = Date.now();
  while (Date.now() - started < ORBIT_SAMPLE_TIMEOUT_MS) {
    const state = await readOrbitParityState(page);
    const orbit = state?.orbitParity;
    if (
      orbit?.present
      && orbit.mode === 'live'
      && orbit.profileId === profileId
      && orbit.timeSec !== null
      && orbit.sampleCount > 0
    ) {
      return orbit;
    }
    await delay(100);
  }

  throw new Error(`orbit parity sampling did not start within ${ORBIT_SAMPLE_TIMEOUT_MS / 1000}s for ${profileId}`);
}

async function waitForOrbitSample(
  page: Page,
  profileId: string,
  checkpointSec: number,
  previousTimeSec: number,
) {
  const maxTimeSec = checkpointSec + CHECKPOINT_MAX_OVERSHOOT_SEC;
  const started = Date.now();
  while (Date.now() - started < ORBIT_SAMPLE_TIMEOUT_MS) {
    const state = await readOrbitParityState(page);
    const orbit = state?.orbitParity;
    if (
      orbit?.present &&
      orbit.mode === 'live' &&
      orbit.profileId === profileId &&
      orbit.timeSec !== null &&
      orbit.timeSec > previousTimeSec &&
      orbit.sampleCount > 0
    ) {
      if (orbit.timeSec < checkpointSec) {
        await delay(100);
        continue;
      }

      if (orbit.timeSec > maxTimeSec) {
        throw new Error(
          `orbit sample skipped past checkpoint ${checkpointSec}s too far `
          + `(t=${orbit.timeSec.toFixed(3)}s, overshoot=${(orbit.timeSec - checkpointSec).toFixed(3)}s, `
          + `limit=${CHECKPOINT_MAX_OVERSHOOT_SEC}s)`,
        );
      }

      return orbit;
    }
    await delay(100);
  }

  throw new Error(
    `orbit sample not reached within ${ORBIT_SAMPLE_TIMEOUT_MS / 1000}s for ${profileId} `
    + `@ ${checkpointSec}s (max overshoot ${CHECKPOINT_MAX_OVERSHOOT_SEC}s)`,
  );
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
      // Keep this browser gate on the same stable SwiftShader path as the
      // other scene-heavy validators. The default headless GPU path can stall
      // long enough that the live orbit parity state becomes reachable only
      // near the 90s readiness timeout.
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--use-angle=swiftshader',
        '--enable-webgl',
      ],
    });

    for (const profileId of PROFILE_IDS) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
      const { profile, engine } = buildHeadlessReference(profileId);
      try {
        await gotoLiveScenario(page, profileId);
        await resumeLiveScenario(page, profileId);

        let lastOrbitSampleTimeSec = -1;
        for (const checkpointSec of CHECKPOINTS_SEC) {
          const orbitSample = await waitForOrbitSample(
            page,
            profileId,
            checkpointSec,
            lastOrbitSampleTimeSec,
          );
          if (orbitSample.timeSec === null) {
            fail(`VAL-ORB-001 ${profileId} orbit sample`, 'timeSec is null');
            continue;
          }

          check(
            `VAL-ORB-001 ${profileId} live time advances`,
            orbitSample.timeSec > lastOrbitSampleTimeSec,
            `${lastOrbitSampleTimeSec.toFixed(3)}s -> ${orbitSample.timeSec.toFixed(3)}s`,
          );
          pass(
            `VAL-ORB-001 ${profileId} checkpoint ${checkpointSec}s window`,
            `observed t=${orbitSample.timeSec.toFixed(3)}s `
            + `(overshoot=${(orbitSample.timeSec - checkpointSec).toFixed(3)}s `
            + `<= ${CHECKPOINT_MAX_OVERSHOOT_SEC}s)`,
          );
          lastOrbitSampleTimeSec = orbitSample.timeSec;

          const snapshot = engine.tick(
            orbitSample.timeSec,
            Math.floor(orbitSample.timeSec / profile.timeControl.stepSec),
          );
          compareOrbitSamples(profile, orbitSample, snapshot);
        }
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser?.close();
    await terminatePreview(preview);
  }

  console.log(`\nOrbit parity failures: ${failures}`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
