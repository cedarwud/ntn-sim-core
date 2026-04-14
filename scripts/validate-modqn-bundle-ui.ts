#!/usr/bin/env node
/**
 * VAL-MODQN-BUNDLE-002: MODQN bundle replay UI validation.
 *
 * Covers:
 *   - 002A mode switch changes the active truth source, not just labels
 *   - 002B bundle replay controls advance the exported slot timeline
 *   - 002C bundle-driven beam/link presentation loads through the shared viz path
 *   - 002D assumptions / provenance / training-eval disclosure is visible and
 *          not mislabeled as native simulator defaults
 *
 * Governance:
 *   - sdd/modqn-bundle-replay-ui-sdd.md
 *   - sdd/modqn-bundle-replay-consumer-sdd.md
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { chromium, type Browser, type Page } from 'playwright-core';

import {
  assertBundleReplayPresentationReady,
  createMemoryFileReader,
  loadModqnReplayBundle,
  type ModqnTimelineRow,
} from '../src/adapters/modqn-bundle';

const ROOT = resolve(import.meta.dirname, '..');
const CHROME_BIN = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const BASE_PORT = 4173;
const BASE_URL = `http://127.0.0.1:${BASE_PORT}`;
const MODQN_BUNDLE_PROFILE_ID = 'modqn-bundle-replay';
const SAMPLE_BUNDLE_ROOT = resolve(ROOT, 'fixtures/sample-bundle-v1');

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

async function canReach(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url: string, timeoutMs = 20_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canReach(url)) return;
    await delay(250);
  }
  throw new Error(`preview server did not become ready within ${timeoutMs}ms`);
}

function spawnPreview(): ChildProcess {
  const child = spawn(
    'npm',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(BASE_PORT), '--strictPort'],
    {
      cwd: ROOT,
      detached: true,
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

function waitForChildClose(child: ChildProcess, timeoutMs: number): Promise<boolean> {
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

async function terminatePreview(child: ChildProcess) {
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

async function ensurePreview(): Promise<ChildProcess | null> {
  if (await canReach(BASE_URL)) return null;
  const child = spawnPreview();
  await waitForServer(BASE_URL);
  return child;
}

async function getByTestIdText(page: Page, testId: string): Promise<string> {
  return (await page.locator(`[data-testid="${testId}"]`).innerText()).trim();
}

async function getByTestIdAttr(page: Page, testId: string, attr: string): Promise<string> {
  return (await page.locator(`[data-testid="${testId}"]`).getAttribute(attr)) ?? '';
}

function parseJsonAttr<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

async function readSampleBundleFiles(): Promise<Record<string, string>> {
  const relativePaths = [
    'manifest.json',
    'config-resolved.json',
    'assumptions.json',
    'provenance-map.json',
    'evaluation/summary.json',
    'training/episode_metrics.csv',
    'training/loss_curves.csv',
    'timeline/step-trace.jsonl',
  ] as const;

  const entries = await Promise.all(relativePaths.map(async (relativePath) => [
    relativePath,
    await readFile(resolve(SAMPLE_BUNDLE_ROOT, relativePath), 'utf8'),
  ] as const));

  return Object.fromEntries([
    ...entries,
    ['evaluation/sweeps/', ''],
  ]);
}

async function readFirstTimelineRow(): Promise<ModqnTimelineRow> {
  const timelineText = await readFile(
    resolve(SAMPLE_BUNDLE_ROOT, 'timeline/step-trace.jsonl'),
    'utf8',
  );
  const firstLine = timelineText.split('\n').find((line) => line.trim().length > 0);
  if (!firstLine) {
    throw new Error('sample bundle timeline is empty');
  }
  return JSON.parse(firstLine) as ModqnTimelineRow;
}

async function validatePresentationGuard() {
  const files = await readSampleBundleFiles();
  const bundle = await loadModqnReplayBundle(createMemoryFileReader(files));
  assertBundleReplayPresentationReady(bundle);
  pass('VAL-MODQN-BUNDLE-002A replay presentation accepts bundle with explicit groundPoint');

  const manifest = JSON.parse(files['manifest.json']) as Record<string, unknown>;
  const coordinateFrame = {
    ...(manifest.coordinateFrame as Record<string, unknown>),
  };
  delete coordinateFrame.groundPoint;
  const replayIncompleteBundle = {
    ...manifest,
    coordinateFrame,
  };

  try {
    const incomplete = await loadModqnReplayBundle(createMemoryFileReader({
      ...files,
      'manifest.json': JSON.stringify(replayIncompleteBundle),
    }));
    assertBundleReplayPresentationReady(incomplete);
    fail(
      'VAL-MODQN-BUNDLE-002A replay presentation rejects bundle missing groundPoint',
      'missing error',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(
      'VAL-MODQN-BUNDLE-002A replay presentation rejects bundle missing groundPoint',
      message.includes('manifest.coordinateFrame.groundPoint'),
      message,
    );
  }
}

async function waitForRuntimeMode(page: Page, mode: string) {
  await page.waitForFunction((expectedMode) => {
    return document
      .querySelector('[data-testid="validation-runtime"]')
      ?.getAttribute('data-mode') === expectedMode;
  }, mode, { timeout: 30_000 });
}

async function waitForPresent(page: Page, testId: string) {
  await page.waitForFunction((id) => {
    return document
      .querySelector(`[data-testid="${id}"]`)
      ?.getAttribute('data-present') === 'true';
  }, testId, { timeout: 30_000 });
}

async function readHandovers(page: Page): Promise<number | null> {
  const text = await getByTestIdText(page, 'sim-hud');
  const match = text.match(/Handovers:\s+(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

async function validateBundleMode(page: Page) {
  console.log('\n== VAL-MODQN-BUNDLE-002A/B/C/D ==');
  const firstTimelineRow = await readFirstTimelineRow();
  const expectedVisibleSatIds = [...new Set(
    firstTimelineRow.beamStates
      .filter((beam, beamIndex) => firstTimelineRow.visibilityMask[beamIndex])
      .map((beam) => beam.satId),
  )].sort();

  await page.goto(`${BASE_URL}/?mode=modqn-bundle&validate=1&paused=1`, { waitUntil: 'load' });
  await page.waitForSelector('[data-testid="control-panel"]');
  await page.waitForSelector('[data-testid="bundle-metadata-panel"]');
  await page.waitForSelector('[data-testid="sim-hud"]');
  await waitForRuntimeMode(page, 'modqn-bundle');
  await waitForPresent(page, 'validation-earth-moving');
  await waitForPresent(page, 'validation-beam-info');
  await waitForPresent(page, 'validation-handover-links');

  const runtimeProfileId = await getByTestIdAttr(page, 'validation-runtime', 'data-profile-id');
  const runtimeTruthSourceKind = await getByTestIdAttr(page, 'validation-runtime', 'data-truth-source-kind');
  const runtimeTruthSourceLabel = await getByTestIdAttr(page, 'validation-runtime', 'data-truth-source-label');
  const slotBefore = Number.parseInt(
    await getByTestIdAttr(page, 'validation-runtime', 'data-bundle-slot-index'),
    10,
  );
  const bundleSlotIndicator = await getByTestIdText(page, 'bundle-slot-indicator');
  const truthNote = await getByTestIdText(page, 'truth-source-note');
  const metadataText = await getByTestIdText(page, 'bundle-metadata-panel');
  const assumptionsText = await getByTestIdText(page, 'bundle-assumptions-panel');
  const provenanceText = await getByTestIdText(page, 'bundle-provenance-panel');
  const parameterPanelCount = await page.locator('[data-testid="parameter-panel"]').count();
  const runtimeServingSatId = await getByTestIdAttr(page, 'validation-runtime', 'data-serving-sat-id');
  const runtimeTargetSatId = await getByTestIdAttr(page, 'validation-runtime', 'data-target-sat-id');
  const runtimeContinuityState = await getByTestIdAttr(page, 'validation-runtime', 'data-continuity-state');
  const runtimeVisibleSatelliteIds = parseJsonAttr<string[]>(
    await getByTestIdAttr(page, 'validation-runtime', 'data-visible-satellite-ids'),
  );
  const beamRoleCounts = parseJsonAttr<Record<string, number>>(
    await getByTestIdAttr(page, 'validation-earth-moving', 'data-role-counts'),
  );
  const handoverStyleKeys = parseJsonAttr<string[]>(
    await getByTestIdAttr(page, 'validation-handover-links', 'data-style-keys'),
  );

  check(
    'VAL-MODQN-BUNDLE-002A bundle mode publishes MODQN bundle runtime identity',
    runtimeProfileId === MODQN_BUNDLE_PROFILE_ID && runtimeTruthSourceKind === 'modqn-bundle',
    `profileId=${runtimeProfileId}, truthSourceKind=${runtimeTruthSourceKind}`,
  );
  check(
    'VAL-MODQN-BUNDLE-002A truth disclosure uses bundle source label',
    runtimeTruthSourceLabel.length > 0 && truthNote.includes('producer export'),
    `sourceLabel=${runtimeTruthSourceLabel}`,
  );
  check(
    'VAL-MODQN-BUNDLE-002C bundle truth reaches shared beam/link presenters',
    true,
    [
      await getByTestIdAttr(page, 'validation-earth-moving', 'data-present'),
      await getByTestIdAttr(page, 'validation-beam-info', 'data-present'),
      await getByTestIdAttr(page, 'validation-handover-links', 'data-present'),
    ].join('/'),
  );
  check(
    'VAL-MODQN-BUNDLE-002C runtime truth matches bundle slot-1 serving / visibility surfaces',
    runtimeServingSatId === firstTimelineRow.selectedServing.satId
      && runtimeTargetSatId === firstTimelineRow.previousServing.satId
      && runtimeContinuityState === (firstTimelineRow.handoverEvent.kind !== 'none' ? 'post-ho' : '')
      && JSON.stringify([...runtimeVisibleSatelliteIds].sort()) === JSON.stringify(expectedVisibleSatIds),
    [
      `serving=${runtimeServingSatId}`,
      `target=${runtimeTargetSatId}`,
      `continuity=${runtimeContinuityState}`,
      `visible=${JSON.stringify(runtimeVisibleSatelliteIds)}`,
    ].join(', '),
  );
  check(
    'VAL-MODQN-BUNDLE-002C earth-moving beam roles reflect exported handover truth',
    (beamRoleCounts.serving ?? 0) >= 1
      && (
        firstTimelineRow.handoverEvent.kind === 'none'
          ? (beamRoleCounts['post-ho'] ?? 0) === 0
          : (beamRoleCounts['post-ho'] ?? 0) >= 1
      ),
    JSON.stringify(beamRoleCounts),
  );
  check(
    'VAL-MODQN-BUNDLE-002C handover-link overlay reflects exported continuity truth',
    firstTimelineRow.handoverEvent.kind === 'none'
      ? !handoverStyleKeys.includes('postHo')
      : handoverStyleKeys.includes('postHo'),
    JSON.stringify(handoverStyleKeys),
  );
  check(
    'VAL-MODQN-BUNDLE-002D metadata panel rejects native-default wording',
    metadataText.includes('not native simulator defaults') && parameterPanelCount === 0,
    `parameterPanelCount=${parameterPanelCount}`,
  );
  check(
    'VAL-MODQN-BUNDLE-002D assumptions/provenance disclosure is explicit',
    assumptionsText.includes('reproduction-assumption') && provenanceText.includes('must not relabel them as native defaults'),
    'assumption/provenance copy present',
  );
  check(
    'VAL-MODQN-BUNDLE-002B bundle slot indicator is initialized from replay state',
    Number.isFinite(slotBefore) && slotBefore >= 1 && bundleSlotIndicator.includes('/'),
    `slotBefore=${slotBefore}, indicator=${bundleSlotIndicator}`,
  );

  await page.locator('[data-testid="bundle-step-forward"]').click();
  await page.waitForFunction((previousSlot) => {
    const nextValue = document
      .querySelector('[data-testid="validation-runtime"]')
      ?.getAttribute('data-bundle-slot-index');
    const parsed = nextValue ? Number.parseInt(nextValue, 10) : Number.NaN;
    return Number.isFinite(parsed) && parsed !== previousSlot;
  }, slotBefore, { timeout: 10_000 });
  const slotAfter = Number.parseInt(
    await getByTestIdAttr(page, 'validation-runtime', 'data-bundle-slot-index'),
    10,
  );
  check(
    'VAL-MODQN-BUNDLE-002B slot stepping advances the exported bundle timeline',
    Number.isFinite(slotAfter) && slotAfter !== slotBefore,
    `slotBefore=${slotBefore}, slotAfter=${slotAfter}`,
  );

  let observedHandover = false;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const handoverCount = await readHandovers(page);
    if ((handoverCount ?? 0) > 0) {
      observedHandover = true;
      break;
    }
    await page.locator('[data-testid="bundle-step-forward"]').click();
    await delay(120);
  }
  check(
    'VAL-MODQN-BUNDLE-002C bundle replay surfaces exported handover truth over time',
    observedHandover,
    observedHandover ? 'handovers > 0 reached during slot stepping' : 'no handover observed within sample bundle window',
  );
}

async function validateModeSwitch(page: Page) {
  await page.locator('[data-testid="mode-native-live"]').click();
  await waitForRuntimeMode(page, 'live');
  await page.waitForFunction(() => {
    return document.querySelector('[data-testid="bundle-metadata-panel"]') === null;
  }, undefined, { timeout: 15_000 });

  const runtimeProfileId = await getByTestIdAttr(page, 'validation-runtime', 'data-profile-id');
  const runtimeTruthSourceKind = await getByTestIdAttr(page, 'validation-runtime', 'data-truth-source-kind');
  const truthNote = await getByTestIdText(page, 'truth-source-note');

  check(
    'VAL-MODQN-BUNDLE-002A switching to native live swaps the truth source',
    runtimeProfileId !== MODQN_BUNDLE_PROFILE_ID
      && runtimeTruthSourceKind === ''
      && truthNote.includes('Native simulator truth from live engine'),
    `profileId=${runtimeProfileId}, truthSourceKind=${runtimeTruthSourceKind}`,
  );

  await page.locator('[data-testid="mode-modqn-bundle"]').click();
  await page.waitForSelector('[data-testid="bundle-metadata-panel"]');
  await waitForRuntimeMode(page, 'modqn-bundle');
  const runtimeProfileAfterRestore = await getByTestIdAttr(page, 'validation-runtime', 'data-profile-id');
  check(
    'VAL-MODQN-BUNDLE-002A bundle mode can be restored after native switch',
    runtimeProfileAfterRestore === MODQN_BUNDLE_PROFILE_ID,
    runtimeProfileAfterRestore,
  );
}

async function validateNativeUiStateRestoration(page: Page) {
  await page.locator('[data-testid="mode-native-live"]').click();
  await waitForRuntimeMode(page, 'live');
  await page.locator('[data-testid="toggle-parameters-panel"]').click();
  await page.locator('[data-testid="toggle-elev-scatter"]').click();
  await page.waitForSelector('[data-testid="parameter-panel"]');
  await page.waitForSelector('[data-testid="sinr-elevation-scatter"]');

  await page.locator('[data-testid="mode-modqn-bundle"]').click();
  await page.waitForSelector('[data-testid="bundle-metadata-panel"]');
  await waitForRuntimeMode(page, 'modqn-bundle');
  await page.waitForFunction(() => {
    return document.querySelector('[data-testid="parameter-panel"]') === null
      && document.querySelector('[data-testid="sinr-elevation-scatter"]') === null;
  }, undefined, { timeout: 15_000 });

  await page.locator('[data-testid="mode-native-live"]').click();
  await waitForRuntimeMode(page, 'live');
  const restoredParameterPanel = await page.locator('[data-testid="parameter-panel"]').count();
  const restoredElevScatter = await page.locator('[data-testid="sinr-elevation-scatter"]').count();
  check(
    'VAL-MODQN-BUNDLE-002A native UI selections restore after bundle-mode detour',
    restoredParameterPanel > 0 && restoredElevScatter > 0,
    `parameterPanel=${restoredParameterPanel}, elevScatter=${restoredElevScatter}`,
  );
}

async function main() {
  console.log('\n=== VAL-MODQN-BUNDLE-002: MODQN Bundle Replay UI ===\n');
  let previewChild: ChildProcess | null = null;
  let browser: Browser | null = null;

  try {
    await validatePresentationGuard();
    previewChild = await ensurePreview();

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
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

    await validateBundleMode(page);
    await validateModeSwitch(page);
    await validateNativeUiStateRestoration(page);
  } finally {
    await browser?.close();
    if (previewChild) {
      await terminatePreview(previewChild);
    }
  }

  if (failures > 0) {
    console.log(`\nEXIT 1 — VAL-MODQN-BUNDLE-002 failed with ${failures} issue(s)\n`);
    process.exit(1);
  }

  console.log('\nEXIT 0 — VAL-MODQN-BUNDLE-002 passed\n');
}

main().catch((error) => {
  console.error('\n[FATAL] validate-modqn-bundle-ui failed to execute\n', error);
  process.exit(1);
});
