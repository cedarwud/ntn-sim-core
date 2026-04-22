#!/usr/bin/env node
/**
 * validate-showcase-consumer-browser.ts
 *
 * Targeted browser smoke for the landed dual-app showcase-consumer surface,
 * including the consumer scene parity follow-on.
 * This remains a narrow acceptance surface, not a new `VAL-*` gate.
 *
 * Covers:
 *   - query route loads through the existing `?app=showcase-consumer` path
  *   - dedicated packaged entrypoint loads through `showcase-consumer.html`
 *   - ShowcaseConsumerHost publishes the allowlisted starter-v2 paths only
 *   - ShowcaseConsumerApp reaches ready state on both entry surfaces
 *   - the showcase surface is visible
 *   - local telemetry strip, comparison panels, and viewer controls render
 *     without widening publisher semantics
 *   - Primary SINR renders from starter truth (`snapshot.ues[0].sinrDb`)
 *   - source/path disclosure distinguishes native replay from bundled sample
 *   - illegal `showcasePath` values fall back to the native allowlist entry
 *   - the showcase viewer remains gated behind `?app=showcase-consumer`
 *   - Phase 2D first-screen identity/disclosure remains stable
 *   - packaged-viewer desktop + narrow-mobile screenshots are captured as
 *     evidence only
 *
 * Uses:
 *   - vite preview on built dist/
 *   - system Chrome via playwright-core (no browser download)
 *   - browser-side validation probe from src/viz/validation/store.ts
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { chromium, type Browser, type Page } from 'playwright-core';

import {
  PHASE_2A_PROFILE_ID,
  PHASE_2A_REPLAY_SELECTION,
  SHOWCASE_APP_QUERY_KEY,
  SHOWCASE_APP_QUERY_VALUE,
  SHOWCASE_BUNDLE_SAMPLE_DETERMINISTIC_PATH_ID,
  SHOWCASE_BUNDLE_SAMPLE_PATH,
  SHOWCASE_BUNDLE_SAMPLE_SOURCE_LABEL,
  SHOWCASE_NATIVE_REPLAY_DETERMINISTIC_PATH_ID,
  SHOWCASE_NATIVE_REPLAY_PATH,
  SHOWCASE_PATH_QUERY_KEY,
} from '../src/app/showcase/showcase-consumer-window.ts';

const ROOT = resolve(import.meta.dirname, '..');
const CHROME_BIN = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const PREVIEW_PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
const SHOWCASE_TITLE = 'Continuity Showcase Viewer';
const PACKAGED_DOCUMENT_TITLE = 'NTN Sim Core Continuity Showcase Viewer';
const CONTINUITY_COPY_PREFIX = 'Continuity phase:';
const EVIDENCE_DIR = resolve(
  process.env.SHOWCASE_CONSUMER_EVIDENCE_DIR ?? '/tmp/ntn-sim-core-showcase-consumer-browser',
);

interface ShowcaseRouteState {
  readonly surfacePresent: boolean;
  readonly surfaceApp: string | null;
  readonly surfaceReady: string | null;
  readonly titleText: string | null;
  readonly continuityCopyText: string | null;
  readonly deterministicPathText: string | null;
  readonly primarySinrText: string | null;
  readonly sourceText: string | null;
  readonly viewControlsPresent: boolean;
  readonly telemetryStripPresent: boolean;
  readonly telemetryPanelsPresent: boolean;
  readonly starter: {
    readonly entrySurfaceId: string | null;
    readonly entryContractKind: string | null;
    readonly entryDeterministicPathId: string | null;
    readonly entryDeterministicPathReady: boolean;
    readonly sourceMode: string | null;
    readonly sourceProfileId: string | null;
    readonly sourceReplaySelection: string | null;
    readonly sourceLabel: string | null;
    readonly hasSnapshot: boolean;
    readonly hasPresentationFrame: boolean;
    readonly primarySinrDb: number | null;
  } | null;
}

interface ShowcasePathExpectation {
  readonly label: string;
  readonly showcasePath: typeof SHOWCASE_NATIVE_REPLAY_PATH | typeof SHOWCASE_BUNDLE_SAMPLE_PATH;
  readonly deterministicPathId: string;
  readonly expectedSourceText: string;
  readonly requirePrimarySinrValue: boolean;
  readonly sourceMode: 'native-replay' | 'modqn-bundle';
  readonly sourceProfileId: string | null;
  readonly sourceReplaySelection: string | null;
  readonly sourceLabel: string | null;
}

interface ShowcaseEntryExpectation {
  readonly label: string;
  readonly pathname: '/' | '/showcase-consumer.html';
  readonly includeAppQuery: boolean;
}

const EXPECTATIONS: ShowcasePathExpectation[] = [
  {
    label: 'native-replay',
    showcasePath: SHOWCASE_NATIVE_REPLAY_PATH,
    deterministicPathId: SHOWCASE_NATIVE_REPLAY_DETERMINISTIC_PATH_ID,
    expectedSourceText: `native-replay / ${PHASE_2A_PROFILE_ID} / ${PHASE_2A_REPLAY_SELECTION}`,
    requirePrimarySinrValue: true,
    sourceMode: 'native-replay',
    sourceProfileId: PHASE_2A_PROFILE_ID,
    sourceReplaySelection: PHASE_2A_REPLAY_SELECTION,
    sourceLabel: null,
  },
  {
    label: 'bundle-sample',
    showcasePath: SHOWCASE_BUNDLE_SAMPLE_PATH,
    deterministicPathId: SHOWCASE_BUNDLE_SAMPLE_DETERMINISTIC_PATH_ID,
    expectedSourceText: `modqn-bundle / ${SHOWCASE_BUNDLE_SAMPLE_SOURCE_LABEL}`,
    requirePrimarySinrValue: false,
    sourceMode: 'modqn-bundle',
    sourceProfileId: null,
    sourceReplaySelection: null,
    sourceLabel: SHOWCASE_BUNDLE_SAMPLE_SOURCE_LABEL,
  },
];

const ENTRY_EXPECTATIONS: ShowcaseEntryExpectation[] = [
  {
    label: 'query-route',
    pathname: '/',
    includeAppQuery: true,
  },
  {
    label: 'dedicated-entrypoint',
    pathname: '/showcase-consumer.html',
    includeAppQuery: false,
  },
];

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

function formatPrimarySinr(sinrDb: number | null): string {
  if (sinrDb === null || Number.isNaN(sinrDb)) return 'Waiting';
  return `${sinrDb.toFixed(1)} dB`;
}

function spawnPreview(): ChildProcess {
  const child = spawn(
    'npm',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT), '--strictPort'],
    {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, BROWSER: 'none' },
    },
  );

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

function waitForPreviewReady(child: ChildProcess, timeoutMs = 20_000): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    const expectedUrl = `${BASE_URL}/`;
    let recentOutput = '';

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off('close', onClose);
      child.stdout?.off('data', onData);
      child.stderr?.off('data', onData);
      if (error) rejectPromise(error);
      else resolvePromise();
    };

    const onData = (chunk: unknown) => {
      const text = chunk instanceof Buffer ? chunk.toString() : String(chunk);
      recentOutput = `${recentOutput}${text}`.slice(-4000);
      if (text.includes(expectedUrl) || text.includes('Local:')) {
        finish();
      }
    };

    const onClose = (code: number | null) => {
      finish(
        new Error(
          `preview server exited before becoming ready (code=${code ?? 'null'})${recentOutput ? `\n${recentOutput.trim()}` : ''}`,
        ),
      );
    };

    const timer = setTimeout(() => {
      finish(
        new Error(
          `preview server did not announce readiness within ${timeoutMs}ms${recentOutput ? `\n${recentOutput.trim()}` : ''}`,
        ),
      );
    }, timeoutMs);

    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.once('close', onClose);
  });
}

function waitForChildClose(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    let settled = false;
    const onClose = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise(true);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.off('close', onClose);
      resolvePromise(false);
    }, timeoutMs);

    child.once('close', onClose);
  });
}

async function terminatePreview(child: ChildProcess) {
  child.stdout?.destroy();
  child.stderr?.destroy();

  child.kill('SIGTERM');

  const exitedAfterTerm = await waitForChildClose(child, 1_000);
  if (exitedAfterTerm) return;

  child.kill('SIGKILL');

  await waitForChildClose(child, 1_000);
}

async function readShowcaseRouteState(page: Page): Promise<ShowcaseRouteState> {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="showcase-consumer-surface"]');
    const primarySinr = document.querySelector('[data-testid="showcase-consumer-primary-sinr"]');
    const source = document.querySelector('[data-testid="showcase-consumer-source"]');
    const title = document.querySelector('[data-testid="showcase-consumer-title"]');
    const continuityCopy = document.querySelector('[data-testid="showcase-consumer-continuity-copy"]');
    const deterministicPath = document.querySelector('[data-testid="showcase-consumer-deterministic-path"]');
    const viewControls = document.querySelector('[data-testid="showcase-consumer-view-controls"]');
    const telemetryStrip = document.querySelector('[data-testid="showcase-consumer-telemetry-strip"]');
    const telemetryPanels = document.querySelector('[data-testid="showcase-consumer-telemetry-panels"]');
    const win = window as Window & {
      __NTN_SIM_CORE_VISUAL__?: {
        sceneConsumerStarter?: {
          entry?: {
            surfaceId?: string | null;
            contractKind?: string | null;
            deterministicPathId?: string | null;
            deterministicPathReady?: boolean;
          };
          source?: {
            mode?: string | null;
            profileId?: string | null;
            replaySelection?: string | null;
            sourceLabel?: string | null;
          };
          truth?: {
            sceneConsumedSnapshot?: {
              ues?: Array<{ sinrDb?: number | null }>;
            } | null;
          };
          presentation?: {
            beamPresentationFrame?: unknown;
          };
        } | null;
      };
    };

    const starter = win.__NTN_SIM_CORE_VISUAL__?.sceneConsumerStarter ?? null;
    const primarySinrDb = starter?.truth?.sceneConsumedSnapshot?.ues?.[0]?.sinrDb;

    return {
      surfacePresent: Boolean(root),
      surfaceApp: root?.getAttribute('data-app') ?? null,
      surfaceReady: root?.getAttribute('data-ready') ?? null,
      titleText: title?.textContent?.trim() ?? null,
      continuityCopyText: continuityCopy?.textContent?.trim() ?? null,
      deterministicPathText: deterministicPath?.textContent?.trim() ?? null,
      primarySinrText: primarySinr?.textContent?.trim() ?? null,
      sourceText: source?.textContent?.trim() ?? null,
      viewControlsPresent: Boolean(viewControls),
      telemetryStripPresent: Boolean(telemetryStrip),
      telemetryPanelsPresent: Boolean(telemetryPanels),
      starter: starter
        ? {
          entrySurfaceId: starter.entry?.surfaceId ?? null,
          entryContractKind: starter.entry?.contractKind ?? null,
          entryDeterministicPathId: starter.entry?.deterministicPathId ?? null,
          entryDeterministicPathReady: Boolean(starter.entry?.deterministicPathReady),
          sourceMode: starter.source?.mode ?? null,
          sourceProfileId: starter.source?.profileId ?? null,
          sourceReplaySelection: starter.source?.replaySelection ?? null,
          sourceLabel: starter.source?.sourceLabel ?? null,
          hasSnapshot: Boolean(starter.truth?.sceneConsumedSnapshot),
          hasPresentationFrame: Boolean(starter.presentation?.beamPresentationFrame),
          primarySinrDb:
            typeof primarySinrDb === 'number' && !Number.isNaN(primarySinrDb)
              ? primarySinrDb
              : null,
        }
        : null,
    };
  });
}

async function waitForShowcaseState(
  page: Page,
  predicate: (state: ShowcaseRouteState) => boolean,
  timeoutMs = 90_000,
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const state = await readShowcaseRouteState(page);
    if (predicate(state)) return state;
    await delay(250);
  }
  const finalState = await readShowcaseRouteState(page);
  console.error(`  [DEBUG] showcase route state on timeout: ${JSON.stringify(finalState)}`);
  throw new Error(`showcase-consumer route state not reached within ${timeoutMs}ms`);
}

async function validateShowcaseConsumerRoute(
  page: Page,
  entry: ShowcaseEntryExpectation,
  expectation: ShowcasePathExpectation,
) {
  console.log(`\n=== Phase 2D Browser Smoke: ${entry.label} / ${expectation.label} ===\n`);

  const url = new URL(BASE_URL);
  url.pathname = entry.pathname;
  if (entry.includeAppQuery) {
    url.searchParams.set(SHOWCASE_APP_QUERY_KEY, SHOWCASE_APP_QUERY_VALUE);
  }
  url.searchParams.set(SHOWCASE_PATH_QUERY_KEY, expectation.showcasePath);
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });

  await page.waitForSelector('[data-testid="showcase-consumer-surface"]', { timeout: 15_000 });

  const state = await waitForShowcaseState(
    page,
    (current) =>
      current.surfacePresent
      && current.surfaceApp === SHOWCASE_APP_QUERY_VALUE
      && current.surfaceReady === 'true'
      && current.starter?.entrySurfaceId === 'scene-consumer-starter-v2'
      && current.starter?.entryContractKind === 'starter-export'
      && current.starter?.entryDeterministicPathId === expectation.deterministicPathId
      && current.starter?.entryDeterministicPathReady === true
      && current.starter?.sourceMode === expectation.sourceMode
      && current.starter?.sourceProfileId === expectation.sourceProfileId
      && current.starter?.sourceReplaySelection === expectation.sourceReplaySelection
      && current.starter?.sourceLabel === expectation.sourceLabel
      && current.starter?.hasSnapshot === true
      && current.starter?.hasPresentationFrame === true
      && (!expectation.requirePrimarySinrValue || current.starter?.primarySinrDb !== null),
  );

  const activeUrl = new URL(page.url());
  check(
    `Phase 2D ${entry.label} loads on ${expectation.showcasePath}`,
    activeUrl.pathname === entry.pathname
      && activeUrl.searchParams.get(SHOWCASE_APP_QUERY_KEY)
        === (entry.includeAppQuery ? SHOWCASE_APP_QUERY_VALUE : null)
      && activeUrl.searchParams.get(SHOWCASE_PATH_QUERY_KEY) === expectation.showcasePath
      && state.surfaceApp === SHOWCASE_APP_QUERY_VALUE,
    `url=${page.url()} data-app=${state.surfaceApp ?? 'null'}`,
  );

  check(
    `Phase 2D host publishes the allowlisted ${expectation.label} starter-v2 path on ${entry.label}`,
    state.starter?.entrySurfaceId === 'scene-consumer-starter-v2'
      && state.starter?.entryContractKind === 'starter-export'
      && state.starter?.entryDeterministicPathId === expectation.deterministicPathId
      && state.starter?.entryDeterministicPathReady === true
      && state.starter?.sourceMode === expectation.sourceMode
      && state.starter?.sourceProfileId === expectation.sourceProfileId
      && state.starter?.sourceReplaySelection === expectation.sourceReplaySelection
      && state.starter?.sourceLabel === expectation.sourceLabel
      && state.starter?.hasSnapshot === true
      && state.starter?.hasPresentationFrame === true,
    JSON.stringify(state.starter),
  );

  check(
    `Phase 2D consumer reaches ready state on ${entry.label} / ${expectation.label}`,
    state.surfaceReady === 'true',
    `data-ready=${state.surfaceReady ?? 'null'}`,
  );

  check(
    `Phase 2D showcase surface keeps the dedicated viewer identity on ${entry.label} / ${expectation.label}`,
    state.surfacePresent
      && state.titleText === SHOWCASE_TITLE
      && (state.continuityCopyText?.startsWith(CONTINUITY_COPY_PREFIX) ?? false),
    `surfacePresent=${state.surfacePresent} title=${state.titleText ?? 'null'} continuity=${state.continuityCopyText ?? 'null'}`,
  );

  check(
    `Scene parity shell exposes telemetry and local viewer controls on ${entry.label} / ${expectation.label}`,
    state.viewControlsPresent
      && state.telemetryStripPresent
      && state.telemetryPanelsPresent,
    `viewControls=${state.viewControlsPresent} telemetryStrip=${state.telemetryStripPresent} telemetryPanels=${state.telemetryPanelsPresent}`,
  );

  check(
    `Phase 2D Primary SINR renders from starter truth on ${entry.label} / ${expectation.label}`,
    (!expectation.requirePrimarySinrValue || state.starter?.primarySinrDb !== null)
      && state.primarySinrText === formatPrimarySinr(state.starter?.primarySinrDb ?? null),
    `${state.primarySinrText ?? 'null'} vs ${formatPrimarySinr(state.starter?.primarySinrDb ?? null)}`,
  );

  check(
    `Phase 2D source and deterministic-path disclosure distinguish ${expectation.label} truth on ${entry.label}`,
    state.sourceText === expectation.expectedSourceText
      && state.deterministicPathText === expectation.deterministicPathId,
    `source=${state.sourceText ?? 'null'} deterministicPath=${state.deterministicPathText ?? 'null'}`,
  );

  if (entry.pathname === '/showcase-consumer.html') {
    const documentTitle = await page.title();
    check(
      `Dedicated entrypoint keeps the canonical browser title on ${expectation.label}`,
      documentTitle === PACKAGED_DOCUMENT_TITLE,
      documentTitle,
    );
  }
}

async function validateShowcaseConsumerGating(page: Page) {
  console.log('\n=== Dual-App Browser Smoke: app gating ===\n');

  const url = new URL(BASE_URL);
  url.pathname = '/';
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  await delay(750);

  const state = await readShowcaseRouteState(page);

  check(
    'Dual-app showcase viewer stays gated when ?app=showcase-consumer is absent',
    state.surfacePresent === false,
    `surfacePresent=${state.surfacePresent} data-app=${state.surfaceApp ?? 'null'}`,
  );
}

async function validateInvalidShowcasePathFallback(page: Page) {
  console.log('\n=== Dual-App Browser Smoke: invalid showcasePath fallback ===\n');

  const url = new URL(BASE_URL);
  url.pathname = '/showcase-consumer.html';
  url.searchParams.set(SHOWCASE_PATH_QUERY_KEY, 'external-directory');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="showcase-consumer-surface"]', { timeout: 15_000 });

  const state = await waitForShowcaseState(
    page,
    (current) =>
      current.surfacePresent
      && current.surfaceReady === 'true'
      && current.sourceText === EXPECTATIONS[0].expectedSourceText
      && current.deterministicPathText === SHOWCASE_NATIVE_REPLAY_DETERMINISTIC_PATH_ID,
  );

  check(
    'Illegal showcasePath falls back to the native replay allowlist entry',
    state.sourceText === EXPECTATIONS[0].expectedSourceText
      && state.deterministicPathText === SHOWCASE_NATIVE_REPLAY_DETERMINISTIC_PATH_ID,
    `source=${state.sourceText ?? 'null'} deterministicPath=${state.deterministicPathText ?? 'null'}`,
  );
}

async function captureEvidenceScreenshot(args: {
  browser: Browser;
  path: string;
  viewport: { width: number; height: number };
  fileName: string;
}) {
  const {
    browser,
    path,
    viewport,
    fileName,
  } = args;

  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 1,
  });

  try {
    const entry = ENTRY_EXPECTATIONS.find((candidate) => candidate.pathname === '/showcase-consumer.html');
    const expectation = EXPECTATIONS.find((candidate) => candidate.showcasePath === SHOWCASE_NATIVE_REPLAY_PATH);
    if (!entry || !expectation) {
      throw new Error('missing packaged showcase evidence configuration');
    }

    const url = new URL(BASE_URL);
    url.pathname = entry.pathname;
    url.searchParams.set(SHOWCASE_PATH_QUERY_KEY, expectation.showcasePath);
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="showcase-consumer-surface"]', { timeout: 15_000 });

    await waitForShowcaseState(
      page,
      (current) =>
        current.surfacePresent
        && current.surfaceReady === 'true'
        && current.titleText === SHOWCASE_TITLE
        && current.deterministicPathText === SHOWCASE_NATIVE_REPLAY_DETERMINISTIC_PATH_ID
        && current.sourceText?.startsWith('native-replay /') === true
        && current.primarySinrText !== null
        && current.primarySinrText !== 'Waiting',
    );

    await page.screenshot({
      path,
      fullPage: true,
      animations: 'disabled',
    });
    pass(`Phase 2D evidence captured (${fileName})`, path);
  } finally {
    await page.close();
  }
}

async function capturePhase2dEvidence(browser: Browser) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const desktopPath = resolve(EVIDENCE_DIR, 'phase2d-packaged-viewer-desktop.png');
  const mobilePath = resolve(EVIDENCE_DIR, 'phase2d-packaged-viewer-mobile.png');

  for (const shot of [
    {
      path: desktopPath,
      viewport: { width: 1440, height: 1000 },
      fileName: 'desktop',
    },
    {
      path: mobilePath,
      viewport: { width: 390, height: 844 },
      fileName: 'mobile',
    },
  ] as const) {
    try {
      await captureEvidenceScreenshot({
        browser,
        path: shot.path,
        viewport: shot.viewport,
        fileName: shot.fileName,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`  [WARN] Phase 2D evidence capture skipped (${shot.fileName}): ${detail}`);
    }
  }
}

async function main() {
  let previewChild: ChildProcess | null = null;
  let browser: Browser | null = null;

  try {
    previewChild = spawnPreview();
    await waitForPreviewReady(previewChild);

    browser = await chromium.launch({
      executablePath: CHROME_BIN,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--use-angle=swiftshader-webgl',
        '--enable-unsafe-swiftshader',
      ],
    });

    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
    });

    for (const entry of ENTRY_EXPECTATIONS) {
      for (const expectation of EXPECTATIONS) {
        await validateShowcaseConsumerRoute(page, entry, expectation);
      }
    }

    await validateShowcaseConsumerGating(page);
    await validateInvalidShowcasePathFallback(page);

    await capturePhase2dEvidence(browser);
  } finally {
    await browser?.close();
    if (previewChild) {
      await terminatePreview(previewChild);
    }
  }

  if (failures > 0) {
    console.log(`\nEXIT 1 — showcase-consumer browser smoke failed with ${failures} issue(s)\n`);
    process.exit(1);
  }

  console.log('\nEXIT 0 — showcase-consumer browser smoke passed\n');
}

main().catch((error) => {
  console.error('\n[FATAL] validate-showcase-consumer-browser failed to execute\n', error);
  process.exit(1);
});
