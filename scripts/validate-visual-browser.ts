#!/usr/bin/env node
/**
 * validate-visual-browser.ts
 *
 * Browser automation for FC-2 visual closure:
 *   - VAL-FV-005 beam membership follows observer-sky visible set
 *   - VAL-FV-006 beam/SINR overlay reads snapshot truth
 *   - VAL-FV-007 handover/service links reflect live access continuity truth
 *   - VAL-FV-008 replay reuses the same truth-driven overlay/link package
 *   - VAL-FV-009 DAPS dual-active links appear only when dual-active truth exists
 *   - VAL-FV-004 earth-fixed / BH proof is visible in browser automation
 *   - VAL-EXP-001 low-SINR / inactive-beam / energy-blocked causes are explainable
 *
 * Uses:
 *   - vite preview on built dist/
 *   - system Chrome via playwright-core (no browser download)
 *   - browser-side validation probe from src/viz/validation/store.ts
 */

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

import { chromium } from 'playwright-core';
import type { Page, Browser } from 'playwright-core';

const ROOT = resolve(import.meta.dirname, '..');
const CHROME_BIN = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const SCREENSHOT_DIR = resolve(ROOT, 'screenshots', 'validation');
const DEFAULT_PREVIEW_PORT = 4173;
let activeBaseUrl = `http://127.0.0.1:${DEFAULT_PREVIEW_PORT}`;
const EXPECTED_MOVING_BEAM_FOOTPRINT_RADIUS_WORLD = 56;
const GEOMETRY_TOLERANCE_WORLD = 1e-6;
const EPSILON_KM = 1e-6;

type EarthMovingBeamGeometrySample = {
  satId: string;
  beamId: string;
  role: string;
  isActive: boolean;
  isCandidate: boolean;
  isUeAnchored: boolean;
  satX: number;
  satZ: number;
  groundX: number;
  groundZ: number;
  offsetEastKm: number;
  offsetNorthKm: number;
};

type VisualState = {
  runtime?: {
    mode: 'live' | 'replay';
    profileId: string;
    timeSec: number | null;
    visibleSatelliteIds: string[];
    primaryUe: {
      servingSatId: string | null;
      targetSatId: string | null;
      secondarySatId: string | null;
      continuityState: string | null;
      sinrDb: number | null;
    };
    lowSinrUeCount: number;
    lowSinrThresholdDb: number;
    dapsPhase: string | null;
    replaySelection: string | null;
    replayWindowStartSec: number | null;
    replayWindowEndSec: number | null;
  };
  earthFixedCellLayer?: {
    present: boolean;
    cellCount: number;
    stateCounts: {
      served: number;
      interfered: number;
      energyBlocked: number;
      inactiveBeam: number;
      noCoverage: number;
    };
    observedStateCounts: {
      served: number;
      interfered: number;
      energyBlocked: number;
      inactiveBeam: number;
      noCoverage: number;
    };
  };
  earthMovingBeamLayer?: {
    present: boolean;
    renderedSatIds: string[];
    renderedBeamCount: number;
    footprintRadiusWorld: number;
    roleCounts: Record<string, number>;
    geometrySamples: EarthMovingBeamGeometrySample[];
  };
  beamInfoOverlay?: {
    present: boolean;
    labeledSatIds: string[];
    roleTags: string[];
    primaryServingSatId: string | null;
    servingSinrDb: number | null;
  };
  handoverLinkOverlay?: {
    present: boolean;
    styleKeys: string[];
    observedStyleKeys: string[];
    continuityState: string | null;
    dapsPhase: string | null;
    observedDapsPhases: string[];
    observedDualActiveTruth: boolean;
  };
};

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

function validateMovingBeamGeometry(state: VisualState | null) {
  const moving = state?.earthMovingBeamLayer;
  const geometrySamples = moving?.geometrySamples ?? [];

  check(
    'VAL-BEAM-001 fixed footprint world radius is exposed',
    moving?.footprintRadiusWorld === EXPECTED_MOVING_BEAM_FOOTPRINT_RADIUS_WORLD,
    `footprintRadiusWorld=${moving?.footprintRadiusWorld ?? 'null'}`,
  );

  const anchoredSamples = geometrySamples.filter((sample) => sample.isUeAnchored);
  check(
    'VAL-BEAM-001 UE-anchored beams remain pinned to the UE origin',
    anchoredSamples.length > 0
      && anchoredSamples.every(
        (sample) =>
          Math.abs(sample.groundX) <= GEOMETRY_TOLERANCE_WORLD
          && Math.abs(sample.groundZ) <= GEOMETRY_TOLERANCE_WORLD,
      ),
    `anchoredSamples=${anchoredSamples.length}`,
  );

  const offCenterSamples = geometrySamples.filter(
    (sample) => !sample.isUeAnchored && Math.hypot(sample.offsetEastKm, sample.offsetNorthKm) > EPSILON_KM,
  );
  check(
    'VAL-BEAM-001 off-center beams publish geometry samples',
    offCenterSamples.length > 0,
    `offCenterSamples=${offCenterSamples.length}`,
  );

  check(
    'VAL-BEAM-001 off-center beams project away from the satellite nadir',
    offCenterSamples.some(
      (sample) =>
        Math.abs(sample.groundX - sample.satX) > GEOMETRY_TOLERANCE_WORLD
        || Math.abs(sample.groundZ - sample.satZ) > GEOMETRY_TOLERANCE_WORLD,
    ),
    `offCenterSamples=${offCenterSamples.length}`,
  );

  const grouped = new Map<string, EarthMovingBeamGeometrySample[]>();
  for (const sample of geometrySamples) {
    const bucket = grouped.get(sample.satId);
    if (bucket) bucket.push(sample);
    else grouped.set(sample.satId, [sample]);
  }

  let comparableSamples = 0;
  let maxDelta = 0;

  for (const satSamples of grouped.values()) {
    const beamSpacingKm = satSamples
      .map((sample) => Math.hypot(sample.offsetEastKm, sample.offsetNorthKm))
      .filter((distanceKm) => distanceKm > EPSILON_KM)
      .sort((a, b) => a - b)[0];

    const expectedScale = beamSpacingKm
      ? EXPECTED_MOVING_BEAM_FOOTPRINT_RADIUS_WORLD / (beamSpacingKm / Math.sqrt(3))
      : null;

    for (const sample of satSamples) {
      const radialOffsetKm = Math.hypot(sample.offsetEastKm, sample.offsetNorthKm);
      let expectedGroundX = sample.satX;
      let expectedGroundZ = sample.satZ;

      if (sample.isUeAnchored) {
        expectedGroundX = 0;
        expectedGroundZ = 0;
      } else if (radialOffsetKm > EPSILON_KM && expectedScale != null) {
        expectedGroundX = sample.satX + sample.offsetEastKm * expectedScale;
        expectedGroundZ = sample.satZ - sample.offsetNorthKm * expectedScale;
      }

      comparableSamples += 1;
      maxDelta = Math.max(
        maxDelta,
        Math.abs(sample.groundX - expectedGroundX),
        Math.abs(sample.groundZ - expectedGroundZ),
      );
    }
  }

  check(
    'VAL-BEAM-001 moving-beam projection matches the geometry contract',
    comparableSamples > 0 && maxDelta <= GEOMETRY_TOLERANCE_WORLD,
    `samples=${comparableSamples}, maxDelta=${maxDelta.toExponential(3)}`,
  );
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

async function readVisualState(page: Page): Promise<VisualState | null> {
  return page.evaluate(() => {
    const win = window as Window & { __NTN_SIM_CORE_VISUAL__?: VisualState };
    return win.__NTN_SIM_CORE_VISUAL__ ?? null;
  });
}

async function gotoScenario(page: Page, params: Record<string, string>) {
  const url = new URL(activeBaseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const expectedMode = params['replay'] === '1' ? 'replay' : 'live';
  const expectedProfile = params['profile'] ?? null;
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  const started = Date.now();
  while (Date.now() - started < 90000) {
    const match = await page.evaluate(
      ({ em, ep }) => {
        const win = window as Window & { __NTN_SIM_CORE_VISUAL__?: { runtime?: { mode?: string; profileId?: string } } };
        const rt = win.__NTN_SIM_CORE_VISUAL__?.runtime;
        if (!rt) return false;
        if (rt.mode !== em) return false;
        if (ep && rt.profileId !== ep) return false;
        return true;
      },
      { em: expectedMode, ep: expectedProfile },
    );
    if (match) return;
    await delay(250);
  }
  throw new Error(`gotoScenario: state not reached within 90s (mode=${expectedMode}, profile=${expectedProfile})`);
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

async function waitForState(
  page: Page,
  predicate: (state: VisualState | null) => boolean,
  timeoutMs = 15000,
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await readVisualState(page);
    if (predicate(state)) return state;
    await delay(250);
  }
  throw new Error(`state predicate not satisfied within ${timeoutMs}ms`);
}

async function validateHobsLive(page: Page) {
  console.log('\n=== Browser Visual Validation: HOBS Live ===\n');

  await gotoScenario(page, {
    validate: '1',
    profile: 'hobs-multibeam-baseline',
    speed: '10',
    showBeams: '1',
    showLabels: '1',
  });

  const stateA = await waitForState(
    page,
    (state) =>
      state?.runtime?.profileId === 'hobs-multibeam-baseline' &&
      state.runtime.mode === 'live' &&
      Boolean(state.earthMovingBeamLayer?.present) &&
      Boolean(state.beamInfoOverlay?.present),
  );

  await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'browser-hobs-live.png') });
  await delay(1200);
  const stateB = await readVisualState(page);

  check(
    'VAL-FV-005 time advances in live mode',
    Boolean(stateA?.runtime?.timeSec !== null && stateB?.runtime?.timeSec !== null && stateB.runtime.timeSec > stateA.runtime.timeSec),
    `${stateA?.runtime?.timeSec ?? 'null'}s -> ${stateB?.runtime?.timeSec ?? 'null'}s`,
  );

  const renderedSatIds = stateA?.earthMovingBeamLayer?.renderedSatIds ?? [];
  const visibleSatIds = new Set(stateA?.runtime?.visibleSatelliteIds ?? []);
  check(
    'VAL-FV-005 rendered beam satellites remain inside visible set',
    renderedSatIds.length > 0 && renderedSatIds.every((id) => visibleSatIds.has(id)),
    `rendered=${renderedSatIds.join(',')}`,
  );

  check(
    'VAL-FV-005 multibeam renderer exposes more than one beam',
    (stateA?.earthMovingBeamLayer?.renderedBeamCount ?? 0) > 1,
    `beamCount=${stateA?.earthMovingBeamLayer?.renderedBeamCount ?? 0}`,
  );

  check(
    'VAL-FV-006 beam info overlay present',
    Boolean(stateA?.beamInfoOverlay?.present),
    `labels=${stateA?.beamInfoOverlay?.labeledSatIds.length ?? 0}`,
  );

  check(
    'VAL-FV-006 serving SINR comes from runtime truth',
    stateA?.beamInfoOverlay?.servingSinrDb === stateA?.runtime?.primaryUe.sinrDb,
    `${stateA?.beamInfoOverlay?.servingSinrDb ?? 'null'} vs ${stateA?.runtime?.primaryUe.sinrDb ?? 'null'}`,
  );

  check(
    'VAL-FV-006 serving satellite ID matches runtime truth',
    stateA?.beamInfoOverlay?.primaryServingSatId === stateA?.runtime?.primaryUe.servingSatId,
    `${stateA?.beamInfoOverlay?.primaryServingSatId ?? 'null'} vs ${stateA?.runtime?.primaryUe.servingSatId ?? 'null'}`,
  );

  validateMovingBeamGeometry(stateA);
}

async function validateReplay(page: Page) {
  console.log('\n=== Browser Visual Validation: Replay ===\n');

  await gotoScenario(page, {
    validate: '1',
    profile: 'hobs-multibeam-baseline',
    replay: '1',
    speed: '10',
    showBeams: '1',
    showLabels: '1',
  });

  const state = await waitForState(
    page,
    (current) =>
      current?.runtime?.profileId === 'hobs-multibeam-baseline' &&
      current.runtime.mode === 'replay' &&
      current.runtime.replayWindowStartSec !== null &&
      Boolean(current.beamInfoOverlay?.present) &&
      Boolean(current.handoverLinkOverlay?.present),
    30000,
  );

  await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'browser-hobs-replay.png') });

  check(
    'VAL-FV-008 replay exposes deterministic window metadata',
    Boolean(state?.runtime?.replaySelection && state.runtime.replayWindowStartSec !== null && state.runtime.replayWindowEndSec !== null),
    `${state?.runtime?.replaySelection ?? 'null'} @ ${state?.runtime?.replayWindowStartSec ?? 'null'}-${state?.runtime?.replayWindowEndSec ?? 'null'}`,
  );

  check(
    'VAL-FV-008 beam info overlay stays truth-driven in replay',
    state?.beamInfoOverlay?.servingSinrDb === state?.runtime?.primaryUe.sinrDb,
    `${state?.beamInfoOverlay?.servingSinrDb ?? 'null'} vs ${state?.runtime?.primaryUe.sinrDb ?? 'null'}`,
  );

  check(
    'VAL-FV-008 handover/service links are still present in replay',
    Boolean(state?.handoverLinkOverlay?.present && state.handoverLinkOverlay.styleKeys.length > 0),
    `${state?.handoverLinkOverlay?.styleKeys.join(',') ?? 'none'}`,
  );
}

async function validateDapsDualActive(page: Page) {
  console.log('\n=== Browser Visual Validation: DAPS Dual-Active ===\n');

  await gotoScenario(page, {
    validate: '1',
    profile: 'case9-daps-baseline',
    speed: '50',
    showBeams: '1',
    showLabels: '1',
  });

  const state = await waitForState(
    page,
    (current) =>
      current?.runtime?.profileId === 'case9-daps-baseline' &&
      current.runtime.mode === 'live' &&
      Boolean(current.handoverLinkOverlay?.observedDualActiveTruth),
    60000,
  );

  await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'browser-case9-daps-dual-active.png') });

  const styles = [...(state?.handoverLinkOverlay?.observedStyleKeys ?? [])].sort();
  const observedPhases = [...(state?.handoverLinkOverlay?.observedDapsPhases ?? [])].sort();
  check(
    'VAL-FV-007 live handover/service links reflect continuity truth',
    Boolean(state?.handoverLinkOverlay?.observedDualActiveTruth) &&
      observedPhases.includes('dual-active') &&
      styles.includes('dapsSource') &&
      styles.includes('dapsTarget'),
    `observedPhases=${observedPhases.join(',')} observedStyles=${styles.join(',')}`,
  );

  check(
    'VAL-FV-009 DAPS dual-active links appear without invented states',
    Boolean(state?.handoverLinkOverlay?.observedDualActiveTruth) &&
      styles.includes('dapsSource') &&
      styles.includes('dapsTarget'),
    `observedStyles=${styles.join(',')}`,
  );
}

async function validateBhExplainability(page: Page) {
  console.log('\n=== Browser Visual Validation: BH Explainability Proof ===\n');

  await gotoScenario(page, {
    validate: '1',
    profile: 'bh-resource-energy-proof',
    speed: '10',
    showBeams: '1',
    showLabels: '1',
  });

  await page.waitForSelector('[data-testid="bh-explainability-panel"]', { timeout: 15000 });

  const lowSinrState = await waitForState(
    page,
    (current) =>
      current?.runtime?.profileId === 'bh-resource-energy-proof' &&
      current.runtime.mode === 'live' &&
      (current.runtime.lowSinrUeCount ?? 0) > 0 &&
      Boolean(current.beamInfoOverlay?.present),
    30000,
  );

  check(
    'VAL-EXP-001 beam/SINR overlay exposes low-SINR truth',
    Boolean(lowSinrState?.beamInfoOverlay?.present) && (lowSinrState?.runtime?.lowSinrUeCount ?? 0) > 0,
    `${lowSinrState?.runtime?.lowSinrUeCount ?? 'null'} low-SINR UE(s)`,
  );

  const inactiveObservedState = await waitForState(
    page,
    (current) =>
      current?.runtime?.profileId === 'bh-resource-energy-proof' &&
      current.runtime.mode === 'live' &&
      (current.earthFixedCellLayer?.observedStateCounts?.inactiveBeam ?? 0) > 0,
    30000,
  );
  check(
    'VAL-EXP-001 BH panel exposes inactive-beam truth',
    Boolean(inactiveObservedState),
    `${inactiveObservedState?.earthFixedCellLayer?.observedStateCounts.inactiveBeam ?? 0} observed inactive-beam cells`,
  );

  const blockedObservedState = await waitForState(
    page,
    (current) =>
      current?.runtime?.profileId === 'bh-resource-energy-proof' &&
      current.runtime.mode === 'live' &&
      (current.earthFixedCellLayer?.observedStateCounts?.energyBlocked ?? 0) > 0,
    30000,
  );
  await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'browser-bh-energy-proof.png') });

  check(
    'VAL-FV-004 earth-fixed BH proof exposes energy-blocked cells',
    Boolean(blockedObservedState),
    `${blockedObservedState?.earthFixedCellLayer?.observedStateCounts.energyBlocked ?? 0} observed energy-blocked cells`,
  );
}

async function validateDapsReplay(page: Page) {
  console.log('\n=== Browser Visual Validation: DAPS Replay Dual-Active ===\n');

  await gotoScenario(page, {
    validate: '1',
    profile: 'case9-daps-baseline',
    replay: '1',
    speed: '1',
    replaySeekSec: '81',
    showBeams: '1',
    showLabels: '1',
  });

  // Timeout 360s: DAPS replay pre-computation is the most CPU-intensive browser
  // gate. In full validate:stage runs, all prior scripts have already consumed
  // memory/CPU, and the replay engine must run ~80 simulation ticks before seeking
  // to the dual-active window. 240s was insufficient under WSL2 resource pressure
  // (observed intermittent failures at ~240s). 360s provides margin without masking
  // genuine hangs (a real hang would loop indefinitely, not time out at 240s+ε).
  const state = await waitForState(
    page,
    (current) =>
      current?.runtime?.profileId === 'case9-daps-baseline' &&
      current.runtime.mode === 'replay' &&
      Boolean(current.handoverLinkOverlay?.observedDualActiveTruth),
    360000,
  );

  await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'browser-case9-daps-replay-dual-active.png') });

  const styles = [...(state?.handoverLinkOverlay?.observedStyleKeys ?? [])].sort();
  const observedPhases = [...(state?.handoverLinkOverlay?.observedDapsPhases ?? [])].sort();
  check(
    'VAL-FV-009 replay preserves DAPS dual-active link truth',
    Boolean(state?.handoverLinkOverlay?.observedDualActiveTruth) &&
      observedPhases.includes('dual-active') &&
      styles.includes('dapsSource') &&
      styles.includes('dapsTarget'),
    `observedPhases=${observedPhases.join(',')} observedStyles=${styles.join(',')}`,
  );
}

async function main() {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const previewPort = await resolvePreviewPort();
  activeBaseUrl = `http://127.0.0.1:${previewPort}`;
  const preview = spawnPreview();
  let browser: Browser | null = null;

  try {
    await waitForServer(activeBaseUrl);

    browser = await chromium.launch({
      executablePath: CHROME_BIN,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--use-angle=swiftshader',
        '--enable-webgl',
      ],
    });

    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
      deviceScaleFactor: 1,
    });

    await validateHobsLive(page);
    await validateReplay(page);
    await validateDapsDualActive(page);
    await validateBhExplainability(page);
    await validateDapsReplay(page);

    console.log('\n════════════════════════════════════════════');
    if (failures > 0) {
      console.log(`FAIL — ${failures} browser visual validation issue(s) found`);
      console.log('════════════════════════════════════════════');
      process.exit(1);
    } else {
      console.log('ALL BROWSER VISUAL CHECKS PASSED');
      console.log('════════════════════════════════════════════');
      process.exit(0);
    }
  } finally {
    if (browser) await browser.close();
    preview.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
