#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ModqnBaselineAdapter } from '../src/core/algorithms/modqn-baseline-adapter';
import { MODQN_REPRODUCTION_MANIFEST } from '../src/core/experiments/modqn-reproduction-manifest';
import { runModqnBaselineReproduction } from '../src/core/experiments/modqn-reproduction-runner';
import { ModqnTrainer } from '../src/core/experiments/modqn-trainer';
import type { ModqnBaselineObservation } from '../src/core/contracts/modqn-contracts';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const failures: string[] = [];

function pass(label: string, detail?: string) {
  console.log(`[PASS] ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, detail: string) {
  failures.push(`${label}: ${detail}`);
  console.error(`[FAIL] ${label} — ${detail}`);
}

function check(label: string, condition: boolean, detail: string) {
  if (condition) {
    pass(label, detail);
  } else {
    fail(label, detail);
  }
}

function checkJson(label: string, actual: unknown, expected: unknown) {
  check(label, JSON.stringify(actual) === JSON.stringify(expected), JSON.stringify(actual));
}

function makeBaselineObservation(): ModqnBaselineObservation {
  return {
    tick: 3,
    timeSec: 3,
    userId: 'ue-0',
    currentSatId: 'sat-a',
    currentBeamId: 'sat-a-b0',
    beams: [
      {
        satId: 'sat-a',
        beamId: 'sat-a-b0',
        beamIndex: 0,
        channelGainLinear: 1.2,
        snrLinear: 1.2,
        beamCenterEastKm: 0,
        beamCenterNorthKm: 0,
        userCount: 6,
        beamThroughputMbps: 18,
      },
      {
        satId: 'sat-a',
        beamId: 'sat-a-b1',
        beamIndex: 1,
        channelGainLinear: 2.4,
        snrLinear: 2.4,
        beamCenterEastKm: 8,
        beamCenterNorthKm: -4,
        userCount: 2,
        beamThroughputMbps: 9,
      },
    ],
  };
}

function validateManifestSurface() {
  console.log('\n== VAL-MODQN-002A: manifest + sampling surface ==');
  check('train window count declared', MODQN_REPRODUCTION_MANIFEST.sampling.trainWindowCount > 0, String(MODQN_REPRODUCTION_MANIFEST.sampling.trainWindowCount));
  check('held-out window count declared', MODQN_REPRODUCTION_MANIFEST.sampling.heldOutWindowCount > 0, String(MODQN_REPRODUCTION_MANIFEST.sampling.heldOutWindowCount));
  check('epoch sweep declared', MODQN_REPRODUCTION_MANIFEST.sampling.searchEpochOffsetsSec.length >= 2, MODQN_REPRODUCTION_MANIFEST.sampling.searchEpochOffsetsSec.join(', '));
  check('runtime disclosure mentions 2x2 proxy', MODQN_REPRODUCTION_MANIFEST.params.runtimeDisclosure.some((line) => line.includes('2x2 proxy')), 'disclosure present');
  check('reward channel locked to buildRewardVector', MODQN_REPRODUCTION_MANIFEST.params.rewardChannel === 'buildRewardVector', MODQN_REPRODUCTION_MANIFEST.params.rewardChannel);
}

function validateImportBoundaries() {
  console.log('\n== VAL-MODQN-002B: experiments boundary ==');

  const experimentsFiles = [
    'src/core/experiments/index.ts',
    'src/core/experiments/modqn-reproduction-runner.ts',
    'src/core/experiments/modqn-runtime-bridge.ts',
    'src/core/experiments/modqn-sampling.ts',
    'src/core/experiments/modqn-trainer.ts',
  ];
  const importPattern = /from\s+['"]([^'"]+)['"]/g;
  const forbiddenPatterns = ['@/core/engine/', '@/viz/', '@/app/'];

  for (const relativePath of experimentsFiles) {
    const content = readFileSync(path.join(rootDir, relativePath), 'utf8');
    const imports = Array.from(content.matchAll(importPattern), (match) => match[1]);
    const violations = imports.filter((importPath) => (
      forbiddenPatterns.some((pattern) => importPath.startsWith(pattern))
    ));
    check(relativePath, violations.length === 0, violations.join(', ') || 'no forbidden layer imports');
  }

  const smokeScript = readFileSync(path.join(rootDir, 'scripts/run-modqn-m2-smoke.ts'), 'utf8');
  check('smoke script no fabricated mockObs', !smokeScript.includes('mockObs'), 'mockObs removed');
  check('smoke script no any-cast', !smokeScript.includes(' as any'), 'no any-cast');
}

function validateTrainerHandoffSurface() {
  console.log('\n== VAL-MODQN-002C: M1 handoff reuse ==');

  const trainer = new ModqnTrainer({
    protocol: MODQN_REPRODUCTION_MANIFEST.protocol,
    actionCatalogSize: 2,
    seed: 42,
  });
  const adapter = new ModqnBaselineAdapter();
  const observation = makeBaselineObservation();

  checkJson('buildPaperState delegates to adapter', trainer.buildPaperState(observation), adapter.buildPaperState(observation));
  checkJson(
    'buildRewardVector delegates to adapter',
    trainer.buildRewardVector({
      previousSatId: 'sat-a',
      previousBeamId: 'sat-a-b0',
      selectedSatId: 'sat-a',
      selectedBeamId: 'sat-a-b1',
      userThroughputMbps: 9,
      beamThroughputsMbps: [18, 9],
      totalUsers: 8,
      intraSatellitePenalty: 1,
      interSatellitePenalty: 2,
    }),
    adapter.buildRewardVector({
      previousSatId: 'sat-a',
      previousBeamId: 'sat-a-b0',
      selectedSatId: 'sat-a',
      selectedBeamId: 'sat-a-b1',
      userThroughputMbps: 9,
      beamThroughputsMbps: [18, 9],
      totalUsers: 8,
      intraSatellitePenalty: 1,
      interSatellitePenalty: 2,
    }),
  );
}

function validateRuntimeClosure() {
  console.log('\n== VAL-MODQN-002D: runtime/training/evaluation closure ==');

  const result = runModqnBaselineReproduction({
    trainingEpisodeLimit: MODQN_REPRODUCTION_MANIFEST.sampling.trainEpisodesForSmoke,
    heldOutEpisodeLimit: 1,
  });
  const lastTrainingEpisode = result.trainingEpisodes[result.trainingEpisodes.length - 1];

  check('training episodes executed', result.trainingEpisodes.length === MODQN_REPRODUCTION_MANIFEST.sampling.trainEpisodesForSmoke, String(result.trainingEpisodes.length));
  check('trainer performed updates', (lastTrainingEpisode?.totalUpdates ?? 0) > 0, String(lastTrainingEpisode?.totalUpdates ?? 0));
  check('held-out evaluation exists', result.heldOutEvaluation.windows.length > 0, String(result.heldOutEvaluation.windows.length));
  check('artifact bundle exists', result.artifactBundles.length > 0, String(result.artifactBundles.length));
  check('aggregate KPI numeric', Number.isFinite(result.kpiBundle.meanThroughputMbps) && Number.isFinite(result.kpiBundle.meanSinrDb), `tp=${result.kpiBundle.meanThroughputMbps}, sinr=${result.kpiBundle.meanSinrDb}`);
  check('sampling plan limitations disclosed', result.heldOutEvaluation.limitationNotes.length > 0, String(result.heldOutEvaluation.limitationNotes.length));
}

function main() {
  validateManifestSurface();
  validateImportBoundaries();
  validateTrainerHandoffSurface();
  validateRuntimeClosure();

  console.log('');
  if (failures.length > 0) {
    console.error(`validate-modqn-m2: FAILED (${failures.length} issue(s))`);
    process.exit(1);
  }

  console.log('validate-modqn-m2: OK');
}

main();
