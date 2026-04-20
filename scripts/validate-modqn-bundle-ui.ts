#!/usr/bin/env node
/**
 * VAL-MODQN-BUNDLE-002 / 003 / 004 / 005: MODQN bundle replay UI validation.
 *
 * Covers:
 *   - 002A mode switch changes the active truth source, not just labels
 *   - 002B bundle replay controls advance the exported slot timeline
 *   - 002C bundle-driven beam/link presentation loads through the shared viz path
 *   - 002D assumptions / provenance / training-eval disclosure is visible and
 *          not mislabeled as native simulator defaults
 *   - 002E browser-side valid external-directory load succeeds
 *   - 002F replay-incomplete external-directory load fails explicitly
 *   - 002G invalid external-directory load does not poison the current valid truth
 *   - 002H reset-to-sample restores the shipped baseline and revokes blob URLs
 *   - 003A first-screen story-dashboard obligations remain visible
 *   - 003B bundle-backed charts and KPI strip render from existing data
 *   - 003C disclosure metadata panel remains distinct from the story layer
 *   - 003D sample and external bundles both reach the same dashboard path
 *   - 004A dashboard / HUD / probe serving-slot indicators stay aligned
 *   - 004B handover narration and cumulative counts track exported replay truth
 *   - 004C shared beam/link presentation stays bundle-truth-driven
 *   - 004D a non-trivial external bundle variant drives distinct accepted truth
 *   - 005A diagnostics render only from exported producer fields
 *   - 005B older bundles without diagnostics stay valid and disclose absence
 *   - 005C manifest optionalPolicyDiagnostics remains metadata/disclosure, not
 *          primary explainability truth
 *   - 005D sample and external bundles both support explainability when
 *          diagnostics are present
 *   - 005E selected-serving identity and top-candidate identity stay aligned
 *
 * Governance:
 *   - sdd/modqn-bundle-replay-ui-sdd.md
 *   - sdd/modqn-bundle-replay-consumer-sdd.md
 *   - sdd/modqn-replay-truth-hardening-follow-on.md
 *   - sdd/modqn-producer-diagnostics-consumer-follow-on.md
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
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
const EXTERNAL_SCALAR_FIGURE_ALT = 'Producer-exported MODQN scalar reward training figure';
const EXTERNAL_OBJECTIVES_FIGURE_ALT = 'Producer-exported MODQN objective training figure';

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
  const rows = await readSampleTimelineRows();
  return rows[0];
}

async function readSampleTimelineRows(): Promise<ModqnTimelineRow[]> {
  const timelineText = await readFile(
    resolve(SAMPLE_BUNDLE_ROOT, 'timeline/step-trace.jsonl'),
    'utf8',
  );
  const rows = timelineText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as ModqnTimelineRow);
  if (rows.length === 0) {
    throw new Error('sample bundle timeline is empty');
  }
  return rows;
}

async function createExternalBundleDirectory(
  folderName: string,
  mutate?: (bundleDir: string) => Promise<void>,
): Promise<{ cleanup: () => Promise<void>; dir: string; sourceLabel: string }> {
  const tempRoot = await mkdtemp(resolve(tmpdir(), 'modqn-bundle-ui-'));
  const bundleDir = resolve(tempRoot, folderName);
  await cp(SAMPLE_BUNDLE_ROOT, bundleDir, { recursive: true });
  if (mutate) {
    await mutate(bundleDir);
  }
  return {
    cleanup: () => rm(tempRoot, { force: true, recursive: true }),
    dir: bundleDir,
    sourceLabel: basename(bundleDir),
  };
}

async function createValidExternalBundleDirectory(options?: {
  folderName?: string;
  runId?: string;
  sampleNote?: string;
}) {
  const {
    folderName = 'slice2-valid-external-bundle',
    runId = 'slice2-external-valid-run',
    sampleNote = 'validator external-directory copy',
  } = options ?? {};
  return createExternalBundleDirectory(
    folderName,
    async (bundleDir) => {
      const manifestPath = resolve(bundleDir, 'manifest.json');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
      manifest.runId = runId;
      manifest.sampleNote = sampleNote;
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    },
  );
}

async function createReplayIncompleteExternalBundleDirectory() {
  return createExternalBundleDirectory(
    'slice2-replay-incomplete-bundle',
    async (bundleDir) => {
      const manifestPath = resolve(bundleDir, 'manifest.json');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
      const coordinateFrame = {
        ...(manifest.coordinateFrame as Record<string, unknown>),
      };
      delete coordinateFrame.groundPoint;
      manifest.coordinateFrame = coordinateFrame;
      manifest.runId = 'slice2-replay-incomplete-run';
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    },
  );
}

async function createInvalidExternalBundleDirectory() {
  return createExternalBundleDirectory(
    'slice2-invalid-bundle',
    async (bundleDir) => {
      await writeFile(
        resolve(bundleDir, 'manifest.json'),
        '{"bundleSchemaVersion": ',
        'utf8',
      );
    },
  );
}

function updateBeamMask(
  row: ModqnTimelineRow,
  satId: string,
  visible: boolean,
) {
  row.beamStates.forEach((beam, beamIndex) => {
    if (beam.satId !== satId) return;
    row.visibilityMask[beamIndex] = visible;
    row.actionValidityMask[beamIndex] = visible;
    if (row.decisionVisibilityMask) {
      row.decisionVisibilityMask[beamIndex] = visible;
    }
    if (row.decisionActionValidityMask) {
      row.decisionActionValidityMask[beamIndex] = visible;
    }
  });
}

function findBeamSelection(
  row: ModqnTimelineRow,
  satId: string,
  localBeamIndex: number,
) {
  const beam = row.beamStates.find(
    (candidate) => candidate.satId === satId && candidate.localBeamIndex === localBeamIndex,
  );
  if (!beam) {
    throw new Error(`missing beam for ${satId} localBeamIndex=${localBeamIndex}`);
  }
  return {
    beamId: beam.beamId,
    beamIndex: beam.beamIndex,
    satId: beam.satId,
    satIndex: beam.satIndex,
    localBeamIndex: beam.localBeamIndex,
    validUnderDecisionMask: true,
    validUnderPostStepMask: true,
  };
}

function updateKpiOverlayForSelection(row: ModqnTimelineRow) {
  const beamIndex = row.selectedServing.beamIndex;
  row.kpiOverlay = {
    ...row.kpiOverlay,
    handoverOccurred: row.handoverEvent.kind !== 'none',
    selectedBeamLoad: row.beamLoads[beamIndex] ?? row.kpiOverlay.selectedBeamLoad,
    selectedBeamThroughputBps: row.beamThroughputs[beamIndex] ?? row.kpiOverlay.selectedBeamThroughputBps,
  };
}

function mirrorSatelliteGeometry(
  row: ModqnTimelineRow,
  sourceSatId: string,
  targetSatId: string,
) {
  const sourceSatellite = row.satelliteStates.find((sat) => sat.satId === sourceSatId);
  const targetSatellite = row.satelliteStates.find((sat) => sat.satId === targetSatId);
  if (!sourceSatellite || !targetSatellite) {
    throw new Error(`missing satellite geometry for ${sourceSatId} -> ${targetSatId}`);
  }

  targetSatellite.positionEciKm = { ...sourceSatellite.positionEciKm };
  targetSatellite.subSatellitePoint = { ...sourceSatellite.subSatellitePoint };

  const sourceBeamsByLocalIndex = new Map(
    row.beamStates
      .filter((beam) => beam.satId === sourceSatId)
      .map((beam) => [beam.localBeamIndex, beam] as const),
  );

  for (const beam of row.beamStates) {
    if (beam.satId !== targetSatId) continue;
    const sourceBeam = sourceBeamsByLocalIndex.get(beam.localBeamIndex);
    if (!sourceBeam) continue;
    beam.centerPosition = { ...sourceBeam.centerPosition };
    beam.centerLocalTangentKm = { ...sourceBeam.centerLocalTangentKm };
  }
}

async function createDistinctTruthExternalBundleDirectory() {
  return createExternalBundleDirectory(
    'slice4-distinct-truth-bundle',
    async (bundleDir) => {
      const state = await readBundleManifestRowsAndProvenance(bundleDir);
      const { manifest, rows } = state;

      if (rows.length < 3) {
        throw new Error('distinct-truth validator bundle expects at least 3 slots');
      }

      for (const row of rows) {
        mirrorSatelliteGeometry(row, 'sat-0', 'sat-1');
        updateBeamMask(row, 'sat-1', true);
      }

      rows[0].previousServing = findBeamSelection(rows[0], 'sat-0', 4);
      rows[0].selectedServing = findBeamSelection(rows[0], 'sat-1', 2);
      rows[0].handoverEvent = {
        kind: 'inter-satellite-handover',
        eventId: 'slice4-distinct-slot-1',
      };
      updateKpiOverlayForSelection(rows[0]);

      rows[1].previousServing = findBeamSelection(rows[1], 'sat-1', 2);
      rows[1].selectedServing = findBeamSelection(rows[1], 'sat-1', 5);
      rows[1].handoverEvent = {
        kind: 'intra-satellite-beam-switch',
        eventId: 'slice4-distinct-slot-2',
      };
      updateKpiOverlayForSelection(rows[1]);

      for (const row of rows.slice(2)) {
        row.previousServing = findBeamSelection(row, 'sat-1', 5);
        row.selectedServing = findBeamSelection(row, 'sat-1', 5);
        row.handoverEvent = {
          kind: 'none',
          eventId: null,
        };
        updateKpiOverlayForSelection(row);
      }

      manifest.runId = 'slice4-distinct-truth-run';
      manifest.sampleNote = 'validator non-trivial external truth variant';
      delete manifest.optionalPolicyDiagnostics;
      const replaySummary = manifest.replaySummary !== null && typeof manifest.replaySummary === 'object'
        ? manifest.replaySummary as Record<string, unknown>
        : {};
      replaySummary.handoverEventCount = rows.filter((row) => row.handoverEvent.kind !== 'none').length;
      manifest.replaySummary = replaySummary;
      for (const row of rows) {
        delete (row as ModqnTimelineRow & { policyDiagnostics?: unknown }).policyDiagnostics;
      }
      const fields = (
        state.provenance.fields !== null && typeof state.provenance.fields === 'object'
      ) ? state.provenance.fields as Record<string, unknown> : null;
      if (fields) {
        delete fields['timeline.stepTrace.policyDiagnostics'];
        delete fields['manifest.optionalPolicyDiagnostics'];
      }

      await writeBundleManifestRowsAndProvenance(bundleDir, state);
    },
  );
}

async function readBundleManifestRowsAndProvenance(bundleDir: string) {
  const manifestPath = resolve(bundleDir, 'manifest.json');
  const timelinePath = resolve(bundleDir, 'timeline/step-trace.jsonl');
  const provenancePath = resolve(bundleDir, 'provenance-map.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
  const rows = (await readFile(timelinePath, 'utf8'))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as ModqnTimelineRow);
  const provenance = JSON.parse(await readFile(provenancePath, 'utf8')) as Record<string, unknown>;
  return {
    manifestPath,
    timelinePath,
    provenancePath,
    manifest,
    rows,
    provenance,
  };
}

async function writeBundleManifestRowsAndProvenance(
  bundleDir: string,
  state: {
    manifest: Record<string, unknown>;
    rows: ModqnTimelineRow[];
    provenance: Record<string, unknown>;
  },
) {
  await writeFile(
    resolve(bundleDir, 'manifest.json'),
    JSON.stringify(state.manifest, null, 2),
    'utf8',
  );
  await writeFile(
    resolve(bundleDir, 'timeline/step-trace.jsonl'),
    `${state.rows.map((row) => JSON.stringify(row)).join('\n')}\n`,
    'utf8',
  );
  await writeFile(
    resolve(bundleDir, 'provenance-map.json'),
    JSON.stringify(state.provenance, null, 2),
    'utf8',
  );
}

async function createLegacyNoDiagnosticsExternalBundleDirectory() {
  return createExternalBundleDirectory(
    'slice5-legacy-no-diagnostics-bundle',
    async (bundleDir) => {
      const state = await readBundleManifestRowsAndProvenance(bundleDir);
      for (const row of state.rows) {
        delete (row as ModqnTimelineRow & { policyDiagnostics?: unknown }).policyDiagnostics;
      }
      delete state.manifest.optionalPolicyDiagnostics;
      state.manifest.runId = 'slice5-legacy-no-diagnostics-run';
      state.manifest.sampleNote = 'validator legacy bundle without producer diagnostics';

      const fields = (
        state.provenance.fields !== null && typeof state.provenance.fields === 'object'
      ) ? state.provenance.fields as Record<string, unknown> : null;
      if (fields) {
        delete fields['timeline.stepTrace.policyDiagnostics'];
        delete fields['manifest.optionalPolicyDiagnostics'];
      }

      await writeBundleManifestRowsAndProvenance(bundleDir, state);
    },
  );
}

async function createPartialDiagnosticsCoverageBundleDirectory() {
  return createExternalBundleDirectory(
    'slice5-partial-diagnostics-bundle',
    async (bundleDir) => {
      const state = await readBundleManifestRowsAndProvenance(bundleDir);
      if (state.rows.length < 2) {
        throw new Error('partial-diagnostics validator bundle expects at least 2 slots');
      }
      delete (state.rows[0] as ModqnTimelineRow & { policyDiagnostics?: unknown }).policyDiagnostics;
      state.manifest.runId = 'slice5-partial-diagnostics-run';
      state.manifest.sampleNote = 'validator partial diagnostics coverage bundle';

      const disclosure = (
        state.manifest.optionalPolicyDiagnostics !== null
        && typeof state.manifest.optionalPolicyDiagnostics === 'object'
      ) ? state.manifest.optionalPolicyDiagnostics as Record<string, unknown> : {};
      disclosure.present = true;
      disclosure.rowsWithDiagnostics = state.rows.filter((row) => row.policyDiagnostics !== undefined).length;
      disclosure.rowsWithoutDiagnostics = state.rows.length - Number(disclosure.rowsWithDiagnostics);
      disclosure.note = 'Validator partial-coverage bundle: manifest disclosure remains metadata only; current-slot explainability still depends on row-level policyDiagnostics.';
      state.manifest.optionalPolicyDiagnostics = disclosure;

      await writeBundleManifestRowsAndProvenance(bundleDir, state);
    },
  );
}

async function createMultiUserDiagnosticsAnchoringBundleDirectory() {
  return createExternalBundleDirectory(
    'slice5-multi-user-anchoring-bundle',
    async (bundleDir) => {
      const state = await readBundleManifestRowsAndProvenance(bundleDir);
      const exportedPrimary = state.rows[0];
      if (!exportedPrimary?.policyDiagnostics) {
        throw new Error('multi-user anchoring validator bundle expects slot 1 diagnostics on the first exported row');
      }

      exportedPrimary.userId = 'zz-exported-primary';
      exportedPrimary.userIndex = 9;

      const secondaryRow = JSON.parse(JSON.stringify(exportedPrimary)) as ModqnTimelineRow;
      secondaryRow.userId = 'aa-secondary-row';
      secondaryRow.userIndex = 0;
      delete (secondaryRow as ModqnTimelineRow & { policyDiagnostics?: unknown }).policyDiagnostics;
      state.rows.splice(1, 0, secondaryRow);

      state.manifest.runId = 'slice5-multi-user-anchoring-run';
      state.manifest.sampleNote = 'validator multi-user slot bundle; first exported row retains diagnostics and the later row does not';

      const disclosure = (
        state.manifest.optionalPolicyDiagnostics !== null
        && typeof state.manifest.optionalPolicyDiagnostics === 'object'
      ) ? state.manifest.optionalPolicyDiagnostics as Record<string, unknown> : {};
      disclosure.present = true;
      disclosure.rowsWithDiagnostics = state.rows.filter((row) => row.policyDiagnostics !== undefined).length;
      disclosure.rowsWithoutDiagnostics = state.rows.length - Number(disclosure.rowsWithDiagnostics);
      disclosure.note = 'Validator multi-user bundle: explainability must stay anchored to the first exported row in the slot, not a frontend-sorted user.';
      state.manifest.optionalPolicyDiagnostics = disclosure;

      await writeBundleManifestRowsAndProvenance(bundleDir, state);
    },
  );
}

async function setExternalBundleDirectory(page: Page, bundleDir: string) {
  await page.locator('[data-testid="external-bundle-input"]').setInputFiles(bundleDir);
}

async function waitForBundleSourceLabel(page: Page, expectedSourceLabel: string) {
  await page.waitForFunction((label) => {
    return document
      .querySelector('[data-testid="bundle-source-label"]')
      ?.textContent?.trim() === label;
  }, expectedSourceLabel, { timeout: 30_000 });
}

async function waitForBundleLoadError(page: Page, previousText: string | null = null) {
  await page.waitForFunction((previous) => {
    const next = document
      .querySelector('[data-testid="bundle-load-error"]')
      ?.textContent
      ?.trim();
    if (!next) return false;
    return previous === null ? true : next !== previous;
  }, previousText, { timeout: 30_000 });
}

async function readTrainingFigureSrc(page: Page, altText: string): Promise<string> {
  return (await page.getByAltText(altText).getAttribute('src')) ?? '';
}

function parseSlotText(value: string): { current: number; total: number } {
  const match = value.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) {
    throw new Error(`could not parse slot indicator from "${value}"`);
  }
  return {
    current: Number.parseInt(match[1], 10),
    total: Number.parseInt(match[2], 10),
  };
}

function parseInteger(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function countExpectedHandovers(rows: ModqnTimelineRow[], inclusiveFrameIndex: number): number {
  return rows
    .slice(0, inclusiveFrameIndex + 1)
    .filter((row) => row.handoverEvent.kind !== 'none')
    .length;
}

function formatHandoverKind(kind: string): string {
  if (!kind) return 'Not specified';
  return kind
    .split(/[-_]/g)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatReplayNarrativeLabel(kind: string): string {
  switch (kind) {
    case 'inter-satellite-handover':
      return 'Inter-satellite handover';
    case 'intra-satellite-beam-switch':
      return 'Intra-satellite beam switch';
    case 'none':
    default:
      return 'Stable serving';
  }
}

async function readBundleTruthAlignment(page: Page) {
  const dashboardSlot = parseSlotText(await getByTestIdText(page, 'bundle-dashboard-slot'));
  const hudSlot = parseSlotText(await getByTestIdText(page, 'bundle-hud-slot'));
  const probeSlotCurrent = parseInteger(
    await getByTestIdAttr(page, 'validation-runtime', 'data-bundle-slot-index'),
  );
  const probeSlotTotal = parseInteger(
    await getByTestIdAttr(page, 'validation-runtime', 'data-bundle-slot-count'),
  );
  const probeHandoverCount = parseInteger(
    await getByTestIdAttr(page, 'validation-runtime', 'data-handover-count'),
  );

  return {
    dashboardSlot,
    hudSlot,
    probeSlotCurrent,
    probeSlotTotal,
    dashboardServingSat: await getByTestIdText(page, 'bundle-dashboard-serving-sat'),
    hudServingSat: await getByTestIdText(page, 'bundle-hud-serving-sat'),
    probeServingSat: await getByTestIdAttr(page, 'validation-runtime', 'data-serving-sat-id'),
    dashboardServingBeam: await getByTestIdText(page, 'bundle-dashboard-serving-beam'),
    hudServingBeam: await getByTestIdText(page, 'bundle-hud-serving-beam'),
    probeServingBeam: await getByTestIdAttr(page, 'validation-runtime', 'data-serving-beam-id'),
    dashboardNarrativeLabel: await getByTestIdText(page, 'bundle-dashboard-narrative-label'),
    hudNarrativeLabel: await getByTestIdText(page, 'bundle-hud-narrative-label'),
    hudScenePhase: await getByTestIdAttr(page, 'bundle-hud-narrative-label', 'data-scene-phase'),
    dashboardHandoverKind: await getByTestIdText(page, 'bundle-dashboard-handover-kind'),
    hudHandoverKind: await getByTestIdText(page, 'bundle-hud-handover-kind'),
    probeHandoverKind: await getByTestIdAttr(page, 'validation-runtime', 'data-bundle-handover-kind'),
    dashboardHandoverCount: parseInteger(await getByTestIdText(page, 'bundle-dashboard-handover-count')),
    hudHandoverCount: parseInteger(await getByTestIdText(page, 'bundle-hud-handover-count')),
    probeHandoverCount,
    presentationNarrativePhase: await getByTestIdAttr(
      page,
      'validation-presentation-frame',
      'data-narrative-phase',
    ),
    primaryBeamBySatId: parseJsonAttr<Record<string, string>>(
      await getByTestIdAttr(page, 'validation-presentation-frame', 'data-primary-beam-by-sat-id'),
    ),
    beamRoleByKey: parseJsonAttr<Record<string, string>>(
      await getByTestIdAttr(page, 'validation-snapshot-beam-truth', 'data-beam-role-by-key'),
    ),
    beamActiveByKey: parseJsonAttr<Record<string, boolean>>(
      await getByTestIdAttr(page, 'validation-snapshot-beam-truth', 'data-beam-active-by-key'),
    ),
    handoverStyleKeys: parseJsonAttr<string[]>(
      await getByTestIdAttr(page, 'validation-handover-links', 'data-style-keys'),
    ),
    visibleSatelliteIds: parseJsonAttr<string[]>(
      await getByTestIdAttr(page, 'validation-runtime', 'data-visible-satellite-ids'),
    ),
  };
}

async function readSceneConsumerProof(page: Page) {
  await page.waitForFunction(() => {
    return document.querySelector('[data-testid="scene-consumer-proof"]') !== null;
  }, undefined, { timeout: 15_000 });

  return {
    mode: await getByTestIdAttr(page, 'scene-consumer-proof', 'data-mode'),
    profileId: await getByTestIdAttr(page, 'scene-consumer-proof', 'data-profile-id'),
    truthSourceLabel: await getByTestIdAttr(page, 'scene-consumer-proof', 'data-truth-source-label'),
    bundleSlotIndex: parseInteger(
      await getByTestIdAttr(page, 'scene-consumer-proof', 'data-bundle-slot-index'),
    ),
    bundleSlotCount: parseInteger(
      await getByTestIdAttr(page, 'scene-consumer-proof', 'data-bundle-slot-count'),
    ),
    sceneServingSatId: await getByTestIdAttr(page, 'scene-consumer-proof', 'data-scene-serving-sat-id'),
    publishedServingSatId: await getByTestIdAttr(page, 'scene-consumer-proof', 'data-published-serving-sat-id'),
    nativeServingTransitionKind: await getByTestIdAttr(
      page,
      'scene-consumer-proof',
      'data-native-serving-transition-kind',
    ),
    bundleProducerHandoverKind: await getByTestIdAttr(
      page,
      'scene-consumer-proof',
      'data-bundle-producer-handover-kind',
    ),
    presentationFocusMode: await getByTestIdAttr(
      page,
      'scene-consumer-proof',
      'data-presentation-focus-mode',
    ),
    presentationNarrativePhase: await getByTestIdAttr(
      page,
      'scene-consumer-proof',
      'data-presentation-narrative-phase',
    ),
    displaySatIds: parseJsonAttr<string[]>(
      await getByTestIdAttr(page, 'scene-consumer-proof', 'data-display-sat-ids'),
    ),
    beamSatIds: parseJsonAttr<string[]>(
      await getByTestIdAttr(page, 'scene-consumer-proof', 'data-beam-sat-ids'),
    ),
  };
}

async function readSceneConsumerHarness(page: Page) {
  await page.waitForFunction(() => {
    return document.querySelector('[data-testid="scene-consumer-harness"]') !== null;
  }, undefined, { timeout: 15_000 });

  return {
    mode: await getByTestIdAttr(page, 'scene-consumer-harness', 'data-mode'),
    profileId: await getByTestIdAttr(page, 'scene-consumer-harness', 'data-profile-id'),
    pathKind: await getByTestIdAttr(page, 'scene-consumer-harness', 'data-path-kind'),
    truthSourceLabel: await getByTestIdAttr(page, 'scene-consumer-harness', 'data-truth-source-label'),
    sceneServingSatId: await getByTestIdAttr(page, 'scene-consumer-harness', 'data-scene-serving-sat-id'),
    publishedServingSatId: await getByTestIdAttr(page, 'scene-consumer-harness', 'data-published-serving-sat-id'),
    snapshotRelationship: await getByTestIdAttr(page, 'scene-consumer-harness', 'data-snapshot-relationship'),
    bundleProducerHandoverKind: await getByTestIdAttr(
      page,
      'scene-consumer-harness',
      'data-bundle-producer-handover-kind',
    ),
    presentationFocusMode: await getByTestIdAttr(
      page,
      'scene-consumer-harness',
      'data-presentation-focus-mode',
    ),
    presentationNarrativePhase: await getByTestIdAttr(
      page,
      'scene-consumer-harness',
      'data-presentation-narrative-phase',
    ),
    displaySatIds: parseJsonAttr<string[]>(
      await getByTestIdAttr(page, 'scene-consumer-harness', 'data-display-sat-ids'),
    ),
    beamSatIds: parseJsonAttr<string[]>(
      await getByTestIdAttr(page, 'scene-consumer-harness', 'data-beam-sat-ids'),
    ),
    sourceLine: await getByTestIdAttr(page, 'scene-consumer-harness', 'data-source-line'),
    truthLine: await getByTestIdAttr(page, 'scene-consumer-harness', 'data-truth-line'),
    presentationLine: await getByTestIdAttr(page, 'scene-consumer-harness', 'data-presentation-line'),
  };
}

async function readSceneConsumerStarter(page: Page) {
  await page.waitForFunction(() => {
    return document.querySelector('[data-testid="scene-consumer-starter"]') !== null;
  }, undefined, { timeout: 15_000 });

  return {
    mode: await getByTestIdAttr(page, 'scene-consumer-starter', 'data-mode'),
    profileId: await getByTestIdAttr(page, 'scene-consumer-starter', 'data-profile-id'),
    pathKind: await getByTestIdAttr(page, 'scene-consumer-starter', 'data-path-kind'),
    deterministicPathId: await getByTestIdAttr(
      page,
      'scene-consumer-starter',
      'data-deterministic-path-id',
    ),
    deterministicPathReady: await getByTestIdAttr(
      page,
      'scene-consumer-starter',
      'data-deterministic-path-ready',
    ),
    truthSourceLabel: await getByTestIdAttr(
      page,
      'scene-consumer-starter',
      'data-truth-source-label',
    ),
    sceneServingSatId: await getByTestIdAttr(
      page,
      'scene-consumer-starter',
      'data-scene-serving-sat-id',
    ),
    publishedServingSatId: await getByTestIdAttr(
      page,
      'scene-consumer-starter',
      'data-published-serving-sat-id',
    ),
    snapshotRelationship: await getByTestIdAttr(
      page,
      'scene-consumer-starter',
      'data-snapshot-relationship',
    ),
    bundleProducerHandoverKind: await getByTestIdAttr(
      page,
      'scene-consumer-starter',
      'data-bundle-producer-handover-kind',
    ),
    presentationFocusMode: await getByTestIdAttr(
      page,
      'scene-consumer-starter',
      'data-presentation-focus-mode',
    ),
    presentationNarrativePhase: await getByTestIdAttr(
      page,
      'scene-consumer-starter',
      'data-presentation-narrative-phase',
    ),
    displaySatIds: parseJsonAttr<string[]>(
      await getByTestIdAttr(page, 'scene-consumer-starter', 'data-display-sat-ids'),
    ),
    beamSatIds: parseJsonAttr<string[]>(
      await getByTestIdAttr(page, 'scene-consumer-starter', 'data-beam-sat-ids'),
    ),
    sourceLine: await getByTestIdAttr(page, 'scene-consumer-starter', 'data-source-line'),
    truthLine: await getByTestIdAttr(page, 'scene-consumer-starter', 'data-truth-line'),
    presentationLine: await getByTestIdAttr(
      page,
      'scene-consumer-starter',
      'data-presentation-line',
    ),
  };
}

async function readSceneConsumerStarterPanel(page: Page) {
  await page.waitForFunction(() => {
    return document.querySelector('[data-testid="scene-consumer-starter-panel"]') !== null;
  }, undefined, { timeout: 15_000 });

  return {
    mode: await getByTestIdAttr(page, 'scene-consumer-starter-panel', 'data-mode'),
    profileId: await getByTestIdAttr(page, 'scene-consumer-starter-panel', 'data-profile-id'),
    pathKind: await getByTestIdAttr(page, 'scene-consumer-starter-panel', 'data-path-kind'),
    deterministicPathId: await getByTestIdAttr(
      page,
      'scene-consumer-starter-panel',
      'data-deterministic-path-id',
    ),
    deterministicPathReady: await getByTestIdAttr(
      page,
      'scene-consumer-starter-panel',
      'data-deterministic-path-ready',
    ),
    truthSourceLabel: await getByTestIdAttr(
      page,
      'scene-consumer-starter-panel',
      'data-truth-source-label',
    ),
    sceneServingSatId: await getByTestIdAttr(
      page,
      'scene-consumer-starter-panel',
      'data-scene-serving-sat-id',
    ),
    publishedServingSatId: await getByTestIdAttr(
      page,
      'scene-consumer-starter-panel',
      'data-published-serving-sat-id',
    ),
    snapshotRelationship: await getByTestIdAttr(
      page,
      'scene-consumer-starter-panel',
      'data-snapshot-relationship',
    ),
    presentationFocusMode: await getByTestIdAttr(
      page,
      'scene-consumer-starter-panel',
      'data-presentation-focus-mode',
    ),
    displaySatIds: parseJsonAttr<string[]>(
      await getByTestIdAttr(page, 'scene-consumer-starter-panel', 'data-display-sat-ids'),
    ),
    beamSatIds: parseJsonAttr<string[]>(
      await getByTestIdAttr(page, 'scene-consumer-starter-panel', 'data-beam-sat-ids'),
    ),
    sourceLine: await getByTestIdAttr(page, 'scene-consumer-starter-panel', 'data-source-line'),
    truthLine: await getByTestIdAttr(page, 'scene-consumer-starter-panel', 'data-truth-line'),
    presentationLine: await getByTestIdAttr(
      page,
      'scene-consumer-starter-panel',
      'data-presentation-line',
    ),
  };
}

async function readPolicyDiagnosticsSurface(page: Page) {
  const panel = page.locator('[data-testid="bundle-policy-diagnostics-panel"]');
  if (await panel.count() === 0) {
    return null;
  }

  const readText = async (testId: string): Promise<string | null> => {
    const locator = page.locator(`[data-testid="${testId}"]`);
    if (await locator.count() === 0) {
      return null;
    }
    return (await locator.first().innerText()).trim();
  };

  const readIntegerAttr = async (attr: string): Promise<number> => {
    const raw = (await panel.first().getAttribute(attr)) ?? '0';
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return {
    hasDiagnostics: (await panel.first().getAttribute('data-has-diagnostics')) === 'true',
    diagnosticsVersion: await panel.first().getAttribute('data-diagnostics-version'),
    selectedSatId: await panel.first().getAttribute('data-selected-sat-id'),
    selectedBeamId: await panel.first().getAttribute('data-selected-beam-id'),
    topCandidateSatId: await panel.first().getAttribute('data-top-candidate-sat-id'),
    topCandidateBeamId: await panel.first().getAttribute('data-top-candidate-beam-id'),
    rowsWithDiagnostics: await readIntegerAttr('data-rows-with-diagnostics'),
    rowsWithoutDiagnostics: await readIntegerAttr('data-rows-without-diagnostics'),
    producerOwned: (await panel.first().getAttribute('data-producer-owned')) === 'true',
    statusText: await readText('bundle-policy-diagnostics-status'),
    selectedText: await readText('bundle-policy-diagnostics-selected'),
    runnerUpText: await readText('bundle-policy-diagnostics-runner-up'),
    marginText: await readText('bundle-policy-diagnostics-margin'),
    absenceText: await readText('bundle-policy-diagnostics-absence'),
    firstCandidateText: await readText('bundle-policy-diagnostics-candidate-0'),
  };
}

async function waitForPolicyDiagnosticsState(page: Page, expected: boolean) {
  await page.waitForFunction((hasDiagnostics) => {
    return document
      .querySelector('[data-testid="bundle-policy-diagnostics-panel"]')
      ?.getAttribute('data-has-diagnostics') === String(hasDiagnostics);
  }, expected, { timeout: 30_000 });
}

function validateTruthSurfaceAgainstRow(
  labelPrefix: string,
  alignment: Awaited<ReturnType<typeof readBundleTruthAlignment>>,
  expectedRow: ModqnTimelineRow,
  expectedHandoverCount: number,
) {
  const expectedSlot = expectedRow.slotIndex;
  const expectedTotalSlots = alignment.probeSlotTotal ?? alignment.dashboardSlot.total;
  const expectedServingKey = `${expectedRow.selectedServing.satId}:${expectedRow.selectedServing.beamId}`;
  const expectedPreviousKey = `${expectedRow.previousServing.satId}:${expectedRow.previousServing.beamId}`;
  const expectedHandoverKind = formatHandoverKind(expectedRow.handoverEvent.kind);
  const expectedNarrativeLabel = formatReplayNarrativeLabel(expectedRow.handoverEvent.kind);
  const expectsHandoverNarrative = expectedRow.handoverEvent.kind !== 'none';

  check(
    `${labelPrefix} slot indicators aligned across dashboard / HUD / probe`,
    alignment.dashboardSlot.current === expectedSlot
      && alignment.hudSlot.current === expectedSlot
      && alignment.probeSlotCurrent === expectedSlot
      && alignment.dashboardSlot.total === expectedTotalSlots
      && alignment.hudSlot.total === expectedTotalSlots,
    JSON.stringify({
      dashboard: alignment.dashboardSlot,
      hud: alignment.hudSlot,
      probe: {
        current: alignment.probeSlotCurrent,
        total: alignment.probeSlotTotal,
      },
    }),
  );
  check(
    `${labelPrefix} serving satellite and beam stay aligned across dashboard / HUD / probe`,
    alignment.dashboardServingSat === expectedRow.selectedServing.satId
      && alignment.hudServingSat === expectedRow.selectedServing.satId
      && alignment.probeServingSat === expectedRow.selectedServing.satId
      && alignment.dashboardServingBeam === expectedRow.selectedServing.beamId
      && alignment.hudServingBeam === expectedRow.selectedServing.beamId
      && alignment.probeServingBeam === expectedRow.selectedServing.beamId,
    JSON.stringify({
      dashboard: {
        sat: alignment.dashboardServingSat,
        beam: alignment.dashboardServingBeam,
      },
      hud: {
        sat: alignment.hudServingSat,
        beam: alignment.hudServingBeam,
      },
      probe: {
        sat: alignment.probeServingSat,
        beam: alignment.probeServingBeam,
      },
    }),
  );
  check(
    `${labelPrefix} handover narration and cumulative counts stay tied to exported replay truth`,
    alignment.dashboardHandoverKind === expectedHandoverKind
      && alignment.hudHandoverKind === expectedHandoverKind
      && alignment.probeHandoverKind === expectedRow.handoverEvent.kind
      && alignment.dashboardHandoverCount === expectedHandoverCount
      && alignment.hudHandoverCount === expectedHandoverCount
      && alignment.probeHandoverCount === expectedHandoverCount
      && alignment.dashboardNarrativeLabel === expectedNarrativeLabel
      && alignment.hudNarrativeLabel === expectedNarrativeLabel
      && (expectsHandoverNarrative
        ? alignment.presentationNarrativePhase.length > 0
        : true),
    JSON.stringify({
      dashboard: {
        kind: alignment.dashboardHandoverKind,
        count: alignment.dashboardHandoverCount,
        narrative: alignment.dashboardNarrativeLabel,
      },
      hud: {
        kind: alignment.hudHandoverKind,
        count: alignment.hudHandoverCount,
        narrative: alignment.hudNarrativeLabel,
        scenePhase: alignment.hudScenePhase,
      },
      probe: {
        kind: alignment.probeHandoverKind,
        count: alignment.probeHandoverCount,
        phase: alignment.presentationNarrativePhase,
      },
    }),
  );
  check(
    `${labelPrefix} shared beam/link presentation remains bundle-truth-driven`,
    alignment.primaryBeamBySatId[expectedRow.selectedServing.satId] === expectedRow.selectedServing.beamId
      && alignment.beamRoleByKey[expectedServingKey] === 'serving'
      && alignment.beamActiveByKey[expectedServingKey] === true
      && (!expectsHandoverNarrative
        || (
          alignment.beamRoleByKey[expectedPreviousKey] === 'post-ho'
          && alignment.handoverStyleKeys.includes('postHo')
        )),
    JSON.stringify({
      primaryBeamBySatId: alignment.primaryBeamBySatId,
      servingRole: alignment.beamRoleByKey[expectedServingKey],
      previousRole: alignment.beamRoleByKey[expectedPreviousKey],
      handoverStyleKeys: alignment.handoverStyleKeys,
    }),
  );
}

async function canFetchObjectUrl(page: Page, objectUrl: string): Promise<boolean> {
  return page.evaluate(async (url) => {
    try {
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }, objectUrl);
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
  const compactPanel = page.locator('[data-testid="modqn-compact-panel"]');
  const compactPanelCount = await compactPanel.count();
  const text = compactPanelCount > 0
    ? (await compactPanel.innerText()).trim()
    : await getByTestIdText(page, 'sim-hud');
  const match = text.match(/(?:Cumulative\s+)?Handovers(?:\s*:\s*|\s+)(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

async function ensureTrainingEvidenceVisible(page: Page) {
  const panelCount = await page.locator('[data-testid="bundle-training-chart-panel"]').count();
  if (panelCount > 0) return;
  await page.locator('[data-testid="toggle-bundle-training-evidence"]').click();
  await page.waitForSelector('[data-testid="bundle-training-chart-panel"]');
}

async function ensurePolicyDiagnosticsVisible(page: Page) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const panelCount = await page.locator('[data-testid="bundle-policy-diagnostics-panel"]').count();
    if (panelCount > 0) return;
    await page.waitForSelector('[data-testid="toggle-bundle-policy-diagnostics"]');
    await page.locator('[data-testid="toggle-bundle-policy-diagnostics"]').click();
    try {
      await page.waitForSelector('[data-testid="bundle-policy-diagnostics-panel"]', { timeout: 2_000 });
      return;
    } catch {
      await delay(250);
    }
  }
  throw new Error('bundle-policy-diagnostics-panel did not become visible after retrying the toggle');
}

async function validateBundleMode(page: Page) {
  console.log('\n== VAL-MODQN-BUNDLE-002A/B/C/D ==');
  const firstTimelineRow = await readFirstTimelineRow();
  const expectedVisibleSatIds = [...new Set(
    firstTimelineRow.beamStates
      .filter((beam, beamIndex) => firstTimelineRow.visibilityMask[beamIndex])
      .map((beam) => beam.satId),
  )].sort();

  await page.goto(`${BASE_URL}/?mode=modqn-bundle&validate=1&paused=1&showBeams=1&showLabels=1`, { waitUntil: 'load' });
  await page.waitForSelector('[data-testid="control-panel"]');
  await page.waitForSelector('[data-testid="modqn-compact-panel"]');
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
  const compactPanelText = await getByTestIdText(page, 'modqn-compact-panel');
  const compactPanelTextLower = compactPanelText.toLowerCase();
  const metadataPanelCountBeforeDisclosure = await page.locator('[data-testid="bundle-metadata-panel"]').count();
  const simHudCount = await page.locator('[data-testid="sim-hud"]').count();
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
  const sceneConsumerProof = await readSceneConsumerProof(page);
  const sceneConsumerHarness = await readSceneConsumerHarness(page);
  const sceneConsumerStarter = await readSceneConsumerStarter(page);
  const sceneConsumerStarterPanel = await readSceneConsumerStarterPanel(page);

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
    'VAL-MODQN-BUNDLE-002A compact mode is the persistent bundle-first surface',
    compactPanelTextLower.includes('truth source')
      && compactPanelTextLower.includes('modqn bundle')
      && compactPanelTextLower.includes('replay truth mode')
      && compactPanelTextLower.includes('serving satellite')
      && compactPanelTextLower.includes('cumulative handovers'),
    compactPanelText,
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
      && runtimeTargetSatId === (
        firstTimelineRow.handoverEvent.kind !== 'none'
          ? firstTimelineRow.previousServing.satId
          : ''
      )
      && runtimeContinuityState === (
        firstTimelineRow.handoverEvent.kind !== 'none'
          ? 'post-ho'
          : ''
      )
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
    'VAL-MODQN-BUNDLE-002C scene-consumer proof surface reads facade source/truth/presentation without shell imports',
    sceneConsumerProof.mode === 'modqn-bundle'
      && sceneConsumerProof.profileId === MODQN_BUNDLE_PROFILE_ID
      && sceneConsumerProof.truthSourceLabel === runtimeTruthSourceLabel
      && sceneConsumerProof.sceneServingSatId === runtimeServingSatId
      && sceneConsumerProof.publishedServingSatId === runtimeServingSatId
      && sceneConsumerProof.presentationFocusMode.length > 0
      && sceneConsumerProof.displaySatIds.includes(runtimeServingSatId)
      && sceneConsumerProof.beamSatIds.length >= 1,
    JSON.stringify(sceneConsumerProof),
  );
  check(
    'VAL-MODQN-BUNDLE-002C stub harness consumes the bundle-sample contract without shell helpers',
    sceneConsumerHarness.mode === 'modqn-bundle'
      && sceneConsumerHarness.profileId === MODQN_BUNDLE_PROFILE_ID
      && sceneConsumerHarness.pathKind === 'bundle-sample'
      && sceneConsumerHarness.truthSourceLabel === runtimeTruthSourceLabel
      && sceneConsumerHarness.sceneServingSatId === runtimeServingSatId
      && sceneConsumerHarness.publishedServingSatId === runtimeServingSatId
      && sceneConsumerHarness.presentationFocusMode.length > 0
      && sceneConsumerHarness.displaySatIds.includes(runtimeServingSatId)
      && sceneConsumerHarness.beamSatIds.length >= 1
      && sceneConsumerHarness.sourceLine.includes('path=bundle-sample'),
    JSON.stringify(sceneConsumerHarness),
  );
  check(
    'VAL-MODQN-BUNDLE-002C starter export names a deterministic bundle-sample entry without shell helpers',
    sceneConsumerStarter.mode === 'modqn-bundle'
      && sceneConsumerStarter.profileId === MODQN_BUNDLE_PROFILE_ID
      && sceneConsumerStarter.pathKind === 'bundle-sample'
      && sceneConsumerStarter.deterministicPathReady === 'true'
      && sceneConsumerStarter.deterministicPathId === `bundle-sample:${runtimeTruthSourceLabel}`
      && sceneConsumerStarter.truthSourceLabel === runtimeTruthSourceLabel
      && sceneConsumerStarter.sceneServingSatId === runtimeServingSatId
      && sceneConsumerStarter.publishedServingSatId === runtimeServingSatId
      && sceneConsumerStarter.snapshotRelationship === 'distinct-reference'
      && sceneConsumerStarter.presentationFocusMode.length > 0
      && sceneConsumerStarter.displaySatIds.includes(runtimeServingSatId)
      && sceneConsumerStarter.beamSatIds.length >= 1
      && sceneConsumerStarter.sourceLine.includes('path=bundle-sample'),
    JSON.stringify(sceneConsumerStarter),
  );
  check(
    'VAL-MODQN-BUNDLE-002C starter consumer panel adopts the deterministic bundle-sample export',
    sceneConsumerStarterPanel.mode === sceneConsumerStarter.mode
      && sceneConsumerStarterPanel.profileId === sceneConsumerStarter.profileId
      && sceneConsumerStarterPanel.pathKind === sceneConsumerStarter.pathKind
      && sceneConsumerStarterPanel.deterministicPathReady === sceneConsumerStarter.deterministicPathReady
      && sceneConsumerStarterPanel.deterministicPathId === sceneConsumerStarter.deterministicPathId
      && sceneConsumerStarterPanel.truthSourceLabel === sceneConsumerStarter.truthSourceLabel
      && sceneConsumerStarterPanel.sceneServingSatId === sceneConsumerStarter.sceneServingSatId
      && sceneConsumerStarterPanel.publishedServingSatId === sceneConsumerStarter.publishedServingSatId
      && sceneConsumerStarterPanel.snapshotRelationship === sceneConsumerStarter.snapshotRelationship,
    JSON.stringify(sceneConsumerStarterPanel),
  );
  check(
    'VAL-MODQN-BUNDLE-002C starter consumer panel keeps starter truth/presentation summaries aligned',
    sceneConsumerStarterPanel.presentationFocusMode === sceneConsumerStarter.presentationFocusMode
      && JSON.stringify([...sceneConsumerStarterPanel.displaySatIds].sort())
        === JSON.stringify([...sceneConsumerStarter.displaySatIds].sort())
      && JSON.stringify([...sceneConsumerStarterPanel.beamSatIds].sort())
        === JSON.stringify([...sceneConsumerStarter.beamSatIds].sort())
      && sceneConsumerStarterPanel.sourceLine === sceneConsumerStarter.sourceLine
      && sceneConsumerStarterPanel.truthLine === sceneConsumerStarter.truthLine
      && sceneConsumerStarterPanel.presentationLine === sceneConsumerStarter.presentationLine,
    JSON.stringify(sceneConsumerStarterPanel),
  );
  check(
    'VAL-MODQN-BUNDLE-002D compact mode hides native-first panels by default',
    metadataPanelCountBeforeDisclosure === 0 && simHudCount === 0 && parameterPanelCount === 0,
    `metadataPanel=${metadataPanelCountBeforeDisclosure}, simHud=${simHudCount}, parameterPanel=${parameterPanelCount}`,
  );
  check(
    'VAL-MODQN-BUNDLE-002B bundle slot indicator is initialized from replay state',
    Number.isFinite(slotBefore) && slotBefore >= 1 && bundleSlotIndicator.includes('/'),
    `slotBefore=${slotBefore}, indicator=${bundleSlotIndicator}`,
  );

  await page.locator('[data-testid="toggle-bundle-metadata-panel"]').click();
  await page.waitForSelector('[data-testid="bundle-metadata-panel"]');
  const metadataText = await getByTestIdText(page, 'bundle-metadata-panel');
  const assumptionsText = await getByTestIdText(page, 'bundle-assumptions-panel');
  const provenanceText = await getByTestIdText(page, 'bundle-provenance-panel');
  check(
    'VAL-MODQN-BUNDLE-002D disclosure panel rejects native-default wording',
    metadataText.includes('not native simulator defaults'),
    metadataText,
  );
  check(
    'VAL-MODQN-BUNDLE-002D assumptions/provenance disclosure is explicit',
    assumptionsText.includes('reproduction-assumption')
      && provenanceText.includes('must not relabel them as native defaults'),
    'assumption/provenance copy present',
  );
  await page.locator('[data-testid="toggle-bundle-metadata-panel"]').click();
  await page.waitForFunction(() => {
    return document.querySelector('[data-testid="bundle-metadata-panel"]') === null;
  }, undefined, { timeout: 15_000 });

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
  if (observedHandover) {
    const proofAfterHandover = await readSceneConsumerProof(page);
    const harnessAfterHandover = await readSceneConsumerHarness(page);
    const starterAfterHandover = await readSceneConsumerStarter(page);
    const starterPanelAfterHandover = await readSceneConsumerStarterPanel(page);
    const proofRuntimeHandoverKind = await getByTestIdAttr(
      page,
      'validation-runtime',
      'data-bundle-handover-kind',
    );
    const proofNarrativePhase = await getByTestIdAttr(
      page,
      'validation-presentation-frame',
      'data-narrative-phase',
    );
    check(
      'VAL-MODQN-BUNDLE-002C scene-consumer proof surface stays aligned after bundle handover progression',
      proofAfterHandover.bundleProducerHandoverKind === proofRuntimeHandoverKind
        && proofAfterHandover.presentationNarrativePhase === proofNarrativePhase,
      JSON.stringify({
        proofBundleHandoverKind: proofAfterHandover.bundleProducerHandoverKind,
        runtimeBundleHandoverKind: proofRuntimeHandoverKind,
        proofNarrativePhase: proofAfterHandover.presentationNarrativePhase,
        runtimeNarrativePhase: proofNarrativePhase,
      }),
    );
    check(
      'VAL-MODQN-BUNDLE-002C stub harness stays aligned after bundle handover progression',
      harnessAfterHandover.bundleProducerHandoverKind === proofRuntimeHandoverKind
        && harnessAfterHandover.presentationNarrativePhase === proofNarrativePhase
        && harnessAfterHandover.truthLine.includes(`bundle=${proofRuntimeHandoverKind || 'none'}`),
      JSON.stringify({
        harnessBundleHandoverKind: harnessAfterHandover.bundleProducerHandoverKind,
        runtimeBundleHandoverKind: proofRuntimeHandoverKind,
        harnessNarrativePhase: harnessAfterHandover.presentationNarrativePhase,
        runtimeNarrativePhase: proofNarrativePhase,
        truthLine: harnessAfterHandover.truthLine,
      }),
    );
    check(
      'VAL-MODQN-BUNDLE-002C starter export stays aligned after bundle handover progression',
      starterAfterHandover.bundleProducerHandoverKind === proofRuntimeHandoverKind
        && starterAfterHandover.presentationNarrativePhase === proofNarrativePhase
        && starterAfterHandover.deterministicPathId === `bundle-sample:${runtimeTruthSourceLabel}`
        && starterAfterHandover.truthLine.includes(`bundle=${proofRuntimeHandoverKind || 'none'}`),
      JSON.stringify({
        starterBundleHandoverKind: starterAfterHandover.bundleProducerHandoverKind,
        runtimeBundleHandoverKind: proofRuntimeHandoverKind,
        starterNarrativePhase: starterAfterHandover.presentationNarrativePhase,
        runtimeNarrativePhase: proofNarrativePhase,
        deterministicPathId: starterAfterHandover.deterministicPathId,
        truthLine: starterAfterHandover.truthLine,
      }),
    );
    check(
      'VAL-MODQN-BUNDLE-002C starter consumer panel stays aligned after bundle handover progression',
      starterPanelAfterHandover.deterministicPathId === starterAfterHandover.deterministicPathId
        && starterPanelAfterHandover.sceneServingSatId === starterAfterHandover.sceneServingSatId
        && starterPanelAfterHandover.publishedServingSatId === starterAfterHandover.publishedServingSatId
        && starterPanelAfterHandover.truthLine === starterAfterHandover.truthLine
        && starterPanelAfterHandover.presentationLine === starterAfterHandover.presentationLine,
      JSON.stringify({
        starterAfterHandover,
        starterPanelAfterHandover,
      }),
    );
  }
}

async function validateStoryDashboard(page: Page) {
  const validExternalBundle = await createValidExternalBundleDirectory({
    folderName: 'slice3-valid-external-dashboard-bundle',
    runId: 'slice3-external-dashboard-run',
    sampleNote: 'validator story dashboard copy',
  });

  try {
    console.log('\n== VAL-MODQN-BUNDLE-003A/B/C/D ==');

    await page.waitForSelector('[data-testid="bundle-story-dashboard"]');
    const dashboardText = await getByTestIdText(page, 'bundle-story-dashboard');
    const kpiStripText = await getByTestIdText(page, 'bundle-kpi-strip');
    const dashboardTextLower = dashboardText.toLowerCase();
    const kpiStripTextLower = kpiStripText.toLowerCase();
    const defaultDashboardMetrics = await page.evaluate(() => {
      const dashboard = document.querySelector('[data-testid="bundle-story-dashboard"]');
      if (!dashboard) return null;
      const rect = dashboard.getBoundingClientRect();
      return {
        height: rect.height,
        viewportHeight: window.innerHeight,
        trainingMounted: Boolean(document.querySelector('[data-testid="bundle-training-chart-panel"]')),
        decisionMounted: Boolean(document.querySelector('[data-testid="bundle-decision-story-panel"]')),
      };
    });

    check(
      'VAL-MODQN-BUNDLE-003A first-screen story dashboard keeps the required bundle obligations visible',
      dashboardTextLower.includes('truth source:')
        && dashboardTextLower.includes('modqn bundle')
        && dashboardTextLower.includes('paper / run / checkpoint')
        && dashboardTextLower.includes('source label')
        && dashboardTextLower.includes('replay truth mode')
        && dashboardTextLower.includes('current slot / total slots')
        && dashboardTextLower.includes('serving satellite')
        && dashboardTextLower.includes('primary sinr')
        && dashboardTextLower.includes('cumulative handovers')
        && dashboardTextLower.includes('provenance / assumptions')
        && kpiStripTextLower.includes('throughput')
        && kpiStripTextLower.includes('scalar reward')
        && kpiStripTextLower.includes('valid actions')
        && Boolean(defaultDashboardMetrics)
        && !defaultDashboardMetrics.trainingMounted
        && !defaultDashboardMetrics.decisionMounted
        && defaultDashboardMetrics.height <= (defaultDashboardMetrics.viewportHeight * 0.8),
      JSON.stringify({
        dashboardText,
        defaultDashboardMetrics,
      }),
    );

    await page.locator('[data-testid="toggle-bundle-training-evidence"]').click();
    await page.waitForSelector('[data-testid="bundle-training-chart-panel"]');
    const trainingPanelText = await getByTestIdText(page, 'bundle-training-chart-panel');
    const trainingPanelTextLower = trainingPanelText.toLowerCase();
    const trainingImageCount = await page.locator('[data-testid="bundle-training-chart-panel"] img').count();
    const trainingSvgCount = await page.locator('[data-testid="bundle-training-chart-panel"] svg').count();

    await page.locator('[data-testid="toggle-bundle-decision-story"]').click();
    await page.waitForSelector('[data-testid="bundle-decision-story-panel"]');
    const decisionPanelText = await getByTestIdText(page, 'bundle-decision-story-panel');
    const decisionPanelTextLower = decisionPanelText.toLowerCase();
    const decisionSvgCount = await page.locator('[data-testid="bundle-decision-story-panel"] svg').count();

    await page.locator('[data-testid="toggle-bundle-source-notes"]').click();
    const sourceDisclosureText = await getByTestIdText(page, 'bundle-source-disclosure');
    const sourceDisclosureTextLower = sourceDisclosureText.toLowerCase();
    check(
      'VAL-MODQN-BUNDLE-003B bundle-backed charts and KPI strip render from the existing projector data',
      trainingPanelTextLower.includes('scalar reward track')
        && trainingPanelTextLower.includes('objective traces')
        && kpiStripTextLower.includes('throughput')
        && decisionPanelTextLower.includes('replay scalar reward')
        && decisionPanelTextLower.includes('valid actions')
        && sourceDisclosureTextLower.includes('full provenance and assumptions stay')
        && sourceDisclosureTextLower.includes('disclosure')
        && (trainingImageCount + trainingSvgCount) >= 1
        && decisionSvgCount >= 3,
      [
        `trainingImageCount=${trainingImageCount}`,
        `trainingSvgCount=${trainingSvgCount}`,
        `decisionSvgCount=${decisionSvgCount}`,
      ].join(', '),
    );

    const metadataPanelCountBefore = await page.locator('[data-testid="bundle-metadata-panel"]').count();
    await page.locator('[data-testid="toggle-bundle-metadata-panel"]').click();
    await page.waitForSelector('[data-testid="bundle-metadata-panel"]');
    const metadataPanelCountAfter = await page.locator('[data-testid="bundle-metadata-panel"]').count();
    const dashboardContainsMetadata = await page.evaluate(() => {
      const dashboard = document.querySelector('[data-testid="bundle-story-dashboard"]');
      const metadata = document.querySelector('[data-testid="bundle-metadata-panel"]');
      return Boolean(dashboard && metadata && dashboard.contains(metadata));
    });
    check(
      'VAL-MODQN-BUNDLE-003C metadata/disclosure panel remains distinct from the story layer',
      metadataPanelCountBefore === 0
        && metadataPanelCountAfter === 1
        && !dashboardContainsMetadata,
      `before=${metadataPanelCountBefore}, after=${metadataPanelCountAfter}, contains=${dashboardContainsMetadata}`,
    );
    await page.locator('[data-testid="toggle-bundle-metadata-panel"]').click();
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="bundle-metadata-panel"]') === null;
    }, undefined, { timeout: 15_000 });

    await setExternalBundleDirectory(page, validExternalBundle.dir);
    await waitForBundleSourceLabel(page, validExternalBundle.sourceLabel);
    await page.waitForSelector('[data-testid="bundle-story-dashboard"]');
    const externalDashboardText = await getByTestIdText(page, 'bundle-story-dashboard');
    const externalDecisionPanelCount = await page.locator('[data-testid="bundle-decision-story-panel"]').count();
    if (externalDecisionPanelCount === 0) {
      await page.locator('[data-testid="toggle-bundle-decision-story"]').click();
      await page.waitForSelector('[data-testid="bundle-decision-story-panel"]');
    }
    const externalDecisionSvgCount = await page.locator('[data-testid="bundle-decision-story-panel"] svg').count();
    check(
      'VAL-MODQN-BUNDLE-003D sample and external bundles both reach the same story-dashboard path',
      externalDashboardText.includes('slice3-external-dashboard-run')
        && externalDashboardText.includes(validExternalBundle.sourceLabel)
        && externalDecisionSvgCount >= 3,
      `source=${validExternalBundle.sourceLabel}, decisionSvgCount=${externalDecisionSvgCount}`,
    );

    await page.locator('[data-testid="reset-bundle-source"]').click();
    await waitForBundleSourceLabel(page, 'sample-bundle-v1');
  } finally {
    await validExternalBundle.cleanup();
  }
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
  await page.waitForSelector('[data-testid="modqn-compact-panel"]');
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
  await page.waitForSelector('[data-testid="modqn-compact-panel"]');
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

async function validateExternalBundleFlow(page: Page) {
  const validBundle = await createValidExternalBundleDirectory();
  const replayIncompleteBundle = await createReplayIncompleteExternalBundleDirectory();
  const invalidBundle = await createInvalidExternalBundleDirectory();

  try {
    console.log('\n== VAL-MODQN-BUNDLE-002E/F/G/H ==');

    await setExternalBundleDirectory(page, validBundle.dir);
    await waitForBundleSourceLabel(page, validBundle.sourceLabel);
    await ensureTrainingEvidenceVisible(page);
    const runtimeTruthSourceLabel = await getByTestIdAttr(page, 'validation-runtime', 'data-truth-source-label');
    const bundleSourceNote = await getByTestIdText(page, 'bundle-source-note');
    const compactPanelText = await getByTestIdText(page, 'modqn-compact-panel');
    const scalarFigureBlobUrl = await readTrainingFigureSrc(page, EXTERNAL_SCALAR_FIGURE_ALT);
    const objectivesFigureBlobUrl = await readTrainingFigureSrc(page, EXTERNAL_OBJECTIVES_FIGURE_ALT);
    const externalLoadErrorCount = await page.locator('[data-testid="bundle-load-error"]').count();

    check(
      'VAL-MODQN-BUNDLE-002E valid external-directory load updates source disclosure',
      runtimeTruthSourceLabel === validBundle.sourceLabel
        && bundleSourceNote.includes('external-directory')
        && compactPanelText.includes('slice2-external-valid-run')
        && externalLoadErrorCount === 0,
      `source=${runtimeTruthSourceLabel}, note=${bundleSourceNote}`,
    );
    check(
      'VAL-MODQN-BUNDLE-002E external figures render through blob object URLs',
      scalarFigureBlobUrl.startsWith('blob:')
        && objectivesFigureBlobUrl.startsWith('blob:'),
      `scalar=${scalarFigureBlobUrl}, objectives=${objectivesFigureBlobUrl}`,
    );

    await setExternalBundleDirectory(page, replayIncompleteBundle.dir);
    await waitForBundleLoadError(page, null);
    await ensureTrainingEvidenceVisible(page);
    const replayIncompleteError = await getByTestIdText(page, 'bundle-load-error');
    const sourceLabelAfterReplayIncomplete = await getByTestIdText(page, 'bundle-source-label');
    const scalarFigureAfterReplayIncomplete = await readTrainingFigureSrc(page, EXTERNAL_SCALAR_FIGURE_ALT);
    check(
      'VAL-MODQN-BUNDLE-002F replay-incomplete external-directory bundle is rejected explicitly',
      replayIncompleteError.includes('manifest.coordinateFrame.groundPoint'),
      replayIncompleteError,
    );
    check(
      'VAL-MODQN-BUNDLE-002F replay-incomplete rejection keeps the last valid external truth active',
      sourceLabelAfterReplayIncomplete === validBundle.sourceLabel
        && scalarFigureAfterReplayIncomplete === scalarFigureBlobUrl,
      `source=${sourceLabelAfterReplayIncomplete}, figure=${scalarFigureAfterReplayIncomplete}`,
    );

    await setExternalBundleDirectory(page, invalidBundle.dir);
    await waitForBundleLoadError(page, replayIncompleteError);
    await ensureTrainingEvidenceVisible(page);
    const invalidLoadError = await getByTestIdText(page, 'bundle-load-error');
    const sourceLabelAfterInvalid = await getByTestIdText(page, 'bundle-source-label');
    const runtimeTruthSourceAfterInvalid = await getByTestIdAttr(page, 'validation-runtime', 'data-truth-source-label');
    const objectivesFigureAfterInvalid = await readTrainingFigureSrc(page, EXTERNAL_OBJECTIVES_FIGURE_ALT);
    check(
      'VAL-MODQN-BUNDLE-002G invalid external-directory load fails loudly',
      invalidLoadError.includes('manifest.json'),
      invalidLoadError,
    );
    check(
      'VAL-MODQN-BUNDLE-002G invalid external-directory load does not poison the current valid truth',
      sourceLabelAfterInvalid === validBundle.sourceLabel
        && runtimeTruthSourceAfterInvalid === validBundle.sourceLabel
        && objectivesFigureAfterInvalid === objectivesFigureBlobUrl,
      [
        `source=${sourceLabelAfterInvalid}`,
        `runtime=${runtimeTruthSourceAfterInvalid}`,
        `figure=${objectivesFigureAfterInvalid}`,
      ].join(', '),
    );

    await page.locator('[data-testid="reset-bundle-source"]').click();
    await waitForBundleSourceLabel(page, 'sample-bundle-v1');
    await ensureTrainingEvidenceVisible(page);
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="bundle-load-error"]') === null;
    }, undefined, { timeout: 30_000 });
    const bundleSourceNoteAfterReset = await getByTestIdText(page, 'bundle-source-note');
    const runtimeTruthSourceAfterReset = await getByTestIdAttr(page, 'validation-runtime', 'data-truth-source-label');
    const scalarFigureAfterReset = await readTrainingFigureSrc(page, EXTERNAL_SCALAR_FIGURE_ALT);
    const blobScalarFetchAfterReset = await canFetchObjectUrl(page, scalarFigureBlobUrl);
    const blobObjectivesFetchAfterReset = await canFetchObjectUrl(page, objectivesFigureBlobUrl);

    check(
      'VAL-MODQN-BUNDLE-002H reset-to-sample restores the shipped bundle baseline',
      runtimeTruthSourceAfterReset === 'sample-bundle-v1'
        && bundleSourceNoteAfterReset.includes('sample baseline')
        && !scalarFigureAfterReset.startsWith('blob:'),
      `runtime=${runtimeTruthSourceAfterReset}, note=${bundleSourceNoteAfterReset}`,
    );
    check(
      'VAL-MODQN-BUNDLE-002H reset-to-sample revokes external figure object URLs',
      !blobScalarFetchAfterReset && !blobObjectivesFetchAfterReset,
      `scalarBlobFetch=${blobScalarFetchAfterReset}, objectivesBlobFetch=${blobObjectivesFetchAfterReset}`,
    );
  } finally {
    await validBundle.cleanup();
    await replayIncompleteBundle.cleanup();
    await invalidBundle.cleanup();
  }
}

async function validateReplayTruthHardening(page: Page) {
  console.log('\n== VAL-MODQN-BUNDLE-004A/B/C/D ==');
  const sampleRows = await readSampleTimelineRows();
  const distinctExternalBundle = await createDistinctTruthExternalBundleDirectory();

  try {
    await page.goto(`${BASE_URL}/?mode=modqn-bundle&validate=1&paused=1&showBeams=1&showLabels=1`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="bundle-story-dashboard"]');
    await page.waitForSelector('[data-testid="bundle-truth-hud"]');
    await waitForPresent(page, 'validation-earth-moving');
    await waitForPresent(page, 'validation-beam-info');
    await waitForPresent(page, 'validation-handover-links');

    const sampleSlot1 = await readBundleTruthAlignment(page);
    validateTruthSurfaceAgainstRow(
      'VAL-MODQN-BUNDLE-004A sample slot 1',
      sampleSlot1,
      sampleRows[0],
      countExpectedHandovers(sampleRows, 0),
    );

    await page.locator('[data-testid="bundle-step-forward"]').click();
    await page.waitForFunction(() => {
      return document
        .querySelector('[data-testid="validation-runtime"]')
        ?.getAttribute('data-bundle-slot-index') === '2';
    }, undefined, { timeout: 10_000 });
    const sampleSlot2 = await readBundleTruthAlignment(page);
    validateTruthSurfaceAgainstRow(
      'VAL-MODQN-BUNDLE-004B sample slot 2',
      sampleSlot2,
      sampleRows[1],
      countExpectedHandovers(sampleRows, 1),
    );

    await setExternalBundleDirectory(page, distinctExternalBundle.dir);
    await waitForBundleSourceLabel(page, distinctExternalBundle.sourceLabel);
    await page.waitForSelector('[data-testid="bundle-story-dashboard"]');

    const externalRows = (await readFile(
      resolve(distinctExternalBundle.dir, 'timeline/step-trace.jsonl'),
      'utf8',
    ))
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as ModqnTimelineRow);

    const externalSlot1 = await readBundleTruthAlignment(page);
    validateTruthSurfaceAgainstRow(
      'VAL-MODQN-BUNDLE-004D external slot 1',
      externalSlot1,
      externalRows[0],
      countExpectedHandovers(externalRows, 0),
    );
    check(
      'VAL-MODQN-BUNDLE-004D non-trivial external bundle drives distinct accepted truth through the same path',
      externalSlot1.dashboardServingSat === 'sat-1'
        && externalSlot1.probeServingSat === 'sat-1'
        && externalSlot1.dashboardServingBeam === 'sat-1-beam-2'
        && externalSlot1.hudServingBeam === 'sat-1-beam-2'
        && externalSlot1.visibleSatelliteIds.includes('sat-0')
        && externalSlot1.visibleSatelliteIds.includes('sat-1'),
      JSON.stringify({
        servingSat: externalSlot1.probeServingSat,
        servingBeam: externalSlot1.probeServingBeam,
        visibleSatelliteIds: externalSlot1.visibleSatelliteIds,
      }),
    );

    await page.locator('[data-testid="bundle-step-forward"]').click();
    await page.waitForFunction(() => {
      return document
        .querySelector('[data-testid="validation-runtime"]')
        ?.getAttribute('data-bundle-slot-index') === '2';
    }, undefined, { timeout: 10_000 });
    const externalSlot2 = await readBundleTruthAlignment(page);
    validateTruthSurfaceAgainstRow(
      'VAL-MODQN-BUNDLE-004D external slot 2',
      externalSlot2,
      externalRows[1],
      countExpectedHandovers(externalRows, 1),
    );
    check(
      'VAL-MODQN-BUNDLE-004D external variant changes cumulative replay truth instead of falling back to sample/native assumptions',
      externalSlot2.dashboardHandoverCount === 2
        && externalSlot2.hudHandoverCount === 2
        && externalSlot2.probeHandoverCount === 2
        && externalSlot2.dashboardServingSat === 'sat-1'
        && externalSlot2.probeServingSat === 'sat-1'
        && externalSlot2.dashboardServingBeam === 'sat-1-beam-5',
      JSON.stringify({
        dashboardCount: externalSlot2.dashboardHandoverCount,
        hudCount: externalSlot2.hudHandoverCount,
        probeCount: externalSlot2.probeHandoverCount,
        servingSat: externalSlot2.probeServingSat,
        servingBeam: externalSlot2.probeServingBeam,
      }),
    );

    await page.locator('[data-testid="reset-bundle-source"]').click();
    await waitForBundleSourceLabel(page, 'sample-bundle-v1');
  } finally {
    await distinctExternalBundle.cleanup();
  }
}

async function validatePolicyDiagnosticsExplainability(page: Page) {
  console.log('\n== VAL-MODQN-BUNDLE-005A/B/C/D/E ==');

  const sampleRows = await readSampleTimelineRows();
  const sampleDiagnosticsRow = sampleRows.find((row) => row.policyDiagnostics !== undefined);
  if (!sampleDiagnosticsRow?.policyDiagnostics) {
    throw new Error('sample bundle must carry policyDiagnostics for VAL-MODQN-BUNDLE-005');
  }

  const validExternalBundle = await createValidExternalBundleDirectory({
    folderName: 'slice5-valid-diagnostics-bundle',
    runId: 'slice5-external-diagnostics-run',
    sampleNote: 'validator external diagnostics copy',
  });
  const legacyNoDiagnosticsBundle = await createLegacyNoDiagnosticsExternalBundleDirectory();
  const partialCoverageBundle = await createPartialDiagnosticsCoverageBundleDirectory();
  const multiUserAnchoringBundle = await createMultiUserDiagnosticsAnchoringBundleDirectory();

  try {
    await page.goto(`${BASE_URL}/?mode=modqn-bundle&validate=1&paused=1&showBeams=1&showLabels=1`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="bundle-story-dashboard"]');
    await ensurePolicyDiagnosticsVisible(page);
    await waitForPolicyDiagnosticsState(page, true);

    const sampleSurface = await readPolicyDiagnosticsSurface(page);
    check(
      'VAL-MODQN-BUNDLE-005A diagnostics render only from exported producer fields',
      !!sampleSurface
        && sampleSurface.hasDiagnostics
        && sampleSurface.diagnosticsVersion === sampleDiagnosticsRow.policyDiagnostics.diagnosticsVersion
        && (sampleSurface.selectedText?.includes(sampleDiagnosticsRow.policyDiagnostics.selectedScalarizedQ.toFixed(3)) ?? false)
        && (sampleSurface.runnerUpText?.includes(sampleDiagnosticsRow.policyDiagnostics.runnerUpScalarizedQ?.toFixed(3) ?? '') ?? false)
        && (sampleSurface.marginText?.includes(sampleDiagnosticsRow.policyDiagnostics.scalarizedMarginToRunnerUp?.toFixed(3) ?? '') ?? false)
        && (sampleSurface.firstCandidateText?.includes(sampleDiagnosticsRow.policyDiagnostics.topCandidates[0].beamId) ?? false)
        && (sampleSurface.firstCandidateText?.includes(sampleDiagnosticsRow.policyDiagnostics.topCandidates[0].satId) ?? false),
      JSON.stringify(sampleSurface),
    );
    check(
      'VAL-MODQN-BUNDLE-005D sample bundle supports explainability when diagnostics are present',
      !!sampleSurface
        && sampleSurface.hasDiagnostics
        && Boolean(sampleSurface.firstCandidateText),
      JSON.stringify(sampleSurface),
    );
    check(
      'VAL-MODQN-BUNDLE-005E sample selected-serving identity stays aligned with top candidate identity',
      !!sampleSurface
        && sampleSurface.selectedSatId === sampleDiagnosticsRow.selectedServing.satId
        && sampleSurface.selectedBeamId === sampleDiagnosticsRow.selectedServing.beamId
        && sampleSurface.topCandidateSatId === sampleDiagnosticsRow.selectedServing.satId
        && sampleSurface.topCandidateBeamId === sampleDiagnosticsRow.selectedServing.beamId,
      JSON.stringify(sampleSurface),
    );

    await setExternalBundleDirectory(page, validExternalBundle.dir);
    await waitForBundleSourceLabel(page, validExternalBundle.sourceLabel);
    await ensurePolicyDiagnosticsVisible(page);
    await waitForPolicyDiagnosticsState(page, true);
    const externalSurface = await readPolicyDiagnosticsSurface(page);
    check(
      'VAL-MODQN-BUNDLE-005D external bundle supports explainability when diagnostics are present',
      !!externalSurface
        && externalSurface.hasDiagnostics
        && externalSurface.selectedText !== null
        && externalSurface.firstCandidateText !== null,
      JSON.stringify(externalSurface),
    );
    check(
      'VAL-MODQN-BUNDLE-005E external selected-serving identity stays aligned with top candidate identity',
      !!externalSurface
        && externalSurface.selectedSatId === externalSurface.topCandidateSatId
        && externalSurface.selectedBeamId === externalSurface.topCandidateBeamId,
      JSON.stringify(externalSurface),
    );

    const multiUserState = await readBundleManifestRowsAndProvenance(multiUserAnchoringBundle.dir);
    const multiUserExpectedRow = multiUserState.rows[0];
    if (!multiUserExpectedRow?.policyDiagnostics) {
      throw new Error('multi-user anchoring bundle must keep diagnostics on the first exported row');
    }

    await setExternalBundleDirectory(page, multiUserAnchoringBundle.dir);
    await waitForBundleSourceLabel(page, multiUserAnchoringBundle.sourceLabel);
    await ensurePolicyDiagnosticsVisible(page);
    await waitForPolicyDiagnosticsState(page, true);
    const multiUserSurface = await readPolicyDiagnosticsSurface(page);
    check(
      'VAL-MODQN-BUNDLE-005E multi-user slots stay anchored to the first exported replay row',
      !!multiUserSurface
        && multiUserSurface.hasDiagnostics
        && multiUserSurface.selectedSatId === multiUserExpectedRow.selectedServing.satId
        && multiUserSurface.selectedBeamId === multiUserExpectedRow.selectedServing.beamId
        && multiUserSurface.topCandidateSatId === multiUserExpectedRow.selectedServing.satId
        && multiUserSurface.topCandidateBeamId === multiUserExpectedRow.selectedServing.beamId
        && (multiUserSurface.selectedText?.includes(multiUserExpectedRow.policyDiagnostics.selectedScalarizedQ.toFixed(3)) ?? false)
        && multiUserSurface.absenceText === null,
      JSON.stringify(multiUserSurface),
    );

    await setExternalBundleDirectory(page, legacyNoDiagnosticsBundle.dir);
    await waitForBundleSourceLabel(page, legacyNoDiagnosticsBundle.sourceLabel);
    await ensurePolicyDiagnosticsVisible(page);
    await waitForPolicyDiagnosticsState(page, false);
    const legacySurface = await readPolicyDiagnosticsSurface(page);
    check(
      'VAL-MODQN-BUNDLE-005B older bundles without diagnostics stay valid and disclose absence',
      !!legacySurface
        && !legacySurface.hasDiagnostics
        && Boolean(
          legacySurface.absenceText?.toLowerCase().includes('does not export producer-owned policydiagnostics')
          || legacySurface.absenceText?.toLowerCase().includes('does not export producer-owned'),
        ),
      JSON.stringify(legacySurface),
    );

    await setExternalBundleDirectory(page, partialCoverageBundle.dir);
    await waitForBundleSourceLabel(page, partialCoverageBundle.sourceLabel);
    await ensurePolicyDiagnosticsVisible(page);
    await waitForPolicyDiagnosticsState(page, false);
    const partialCoverageSlot1 = await readPolicyDiagnosticsSurface(page);
    await page.locator('[data-testid="toggle-bundle-metadata-panel"]').click();
    await page.waitForSelector('[data-testid="bundle-metadata-panel"]');
    const metadataText = await getByTestIdText(page, 'bundle-policy-diagnostics-disclosure');
    const metadataPanelText = await getByTestIdText(page, 'bundle-metadata-panel');
    await page.locator('[data-testid="toggle-bundle-metadata-panel"]').click();
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="bundle-metadata-panel"]') === null;
    }, undefined, { timeout: 15_000 });

    check(
      'VAL-MODQN-BUNDLE-005C manifest optionalPolicyDiagnostics remains metadata/disclosure, not primary explainability truth',
      !!partialCoverageSlot1
        && !partialCoverageSlot1.hasDiagnostics
        && partialCoverageSlot1.rowsWithDiagnostics > 0
        && partialCoverageSlot1.rowsWithoutDiagnostics > 0
        && Boolean(partialCoverageSlot1.absenceText?.includes('current slot has no policyDiagnostics row'))
        && metadataText.includes('metadata/disclosure only')
        && metadataPanelText.includes('Rows With Diagnostics')
        && metadataPanelText.includes('Rows Without Diagnostics'),
      JSON.stringify({
        partialCoverageSlot1,
        metadataText,
      }),
    );

    await page.locator('[data-testid="bundle-step-forward"]').click();
    await waitForPolicyDiagnosticsState(page, true);
    const partialCoverageSlot2 = await readPolicyDiagnosticsSurface(page);
    check(
      'VAL-MODQN-BUNDLE-005C row-level explainability truth returns when a covered slot is selected',
      !!partialCoverageSlot2
        && partialCoverageSlot2.hasDiagnostics
        && Boolean(partialCoverageSlot2.selectedText)
        && Boolean(partialCoverageSlot2.firstCandidateText),
      JSON.stringify(partialCoverageSlot2),
    );

    await page.locator('[data-testid="reset-bundle-source"]').click();
    await waitForBundleSourceLabel(page, 'sample-bundle-v1');
    await ensurePolicyDiagnosticsVisible(page);
    await waitForPolicyDiagnosticsState(page, true);
  } finally {
    await validExternalBundle.cleanup();
    await legacyNoDiagnosticsBundle.cleanup();
    await partialCoverageBundle.cleanup();
    await multiUserAnchoringBundle.cleanup();
  }
}

async function main() {
  console.log('\n=== VAL-MODQN-BUNDLE-002 / 003 / 004 / 005: MODQN Bundle Replay UI ===\n');
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
    await validateStoryDashboard(page);
    await validateReplayTruthHardening(page);
    await validatePolicyDiagnosticsExplainability(page);
    await validateExternalBundleFlow(page);
    await validateModeSwitch(page);
    await validateNativeUiStateRestoration(page);
  } finally {
    await browser?.close();
    if (previewChild) {
      await terminatePreview(previewChild);
    }
  }

  if (failures > 0) {
    console.log(`\nEXIT 1 — VAL-MODQN-BUNDLE-002 / 003 / 004 / 005 failed with ${failures} issue(s)\n`);
    process.exit(1);
  }

  console.log('\nEXIT 0 — VAL-MODQN-BUNDLE-002 / 003 / 004 / 005 passed\n');
}

main().catch((error) => {
  console.error('\n[FATAL] validate-modqn-bundle-ui failed to execute\n', error);
  process.exit(1);
});
