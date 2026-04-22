#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ModqnBaselineAdapter } from '../src/core/algorithms/modqn-baseline-adapter';
import { MODQN_REPRODUCTION_MANIFEST } from '../src/core/experiments/modqn-reproduction-manifest';
import { runModqnBaselineReproduction } from '../src/core/experiments/modqn-reproduction-runner';
import { ModqnTrainer } from '../src/core/experiments/modqn-trainer';
import type { ModqnBaselineObservation } from '../src/core/contracts/modqn-contracts';
import type { ModqnExperience } from '../src/core/experiments/modqn-reproduction-types';

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

function makeSyntheticExperience(): ModqnExperience {
  const observation = makeBaselineObservation();
  return {
    observation,
    state: {
      accessVector: [1, 0],
      channelGainsLinear: [1.2, 2.4],
      beamLocationsKm: [
        { eastKm: 0, northKm: 0 },
        { eastKm: 8, northKm: -4 },
      ],
      usersPerBeam: [6, 2],
    },
    encodedState: [1, 0, 1.2, 2.4, 0, 0, 8, -4, 0.75, 0.25],
    action: {
      selectedIndex: 1,
      satId: 'sat-a',
      beamId: 'sat-a-b1',
      oneHot: [0, 1],
    },
    actionCatalogIndex: 1,
    validActionCatalogIndices: [0, 1],
    rewardVector: {
      throughput: 9,
      handoverPenalty: -1,
      loadBalance: -0.5,
    },
    nextObservation: {
      ...observation,
      tick: 4,
      timeSec: 4,
      currentBeamId: 'sat-a-b1',
    },
    nextState: {
      accessVector: [0, 1],
      channelGainsLinear: [1.3, 2.1],
      beamLocationsKm: [
        { eastKm: 1, northKm: 0 },
        { eastKm: 9, northKm: -3 },
      ],
      usersPerBeam: [5, 3],
    },
    nextEncodedState: [0, 1, 1.3, 2.1, 1, 0, 9, -3, 0.625, 0.375],
    nextValidActionCatalogIndices: [0, 1],
    isDone: false,
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
    captureTrainerCheckpoint: true,
  });
  const lastTrainingEpisode = result.trainingEpisodes[result.trainingEpisodes.length - 1];

  check('training episodes executed', result.trainingEpisodes.length === MODQN_REPRODUCTION_MANIFEST.sampling.trainEpisodesForSmoke, String(result.trainingEpisodes.length));
  check('trainer performed updates', (lastTrainingEpisode?.totalUpdates ?? 0) > 0, String(lastTrainingEpisode?.totalUpdates ?? 0));
  check('held-out evaluation exists', result.heldOutEvaluation.windows.length > 0, String(result.heldOutEvaluation.windows.length));
  check('artifact bundle exists', result.artifactBundles.length > 0, String(result.artifactBundles.length));
  check('aggregate KPI numeric', Number.isFinite(result.kpiBundle.meanThroughputMbps) && Number.isFinite(result.kpiBundle.meanSinrDb), `tp=${result.kpiBundle.meanThroughputMbps}, sinr=${result.kpiBundle.meanSinrDb}`);
  check('sampling plan limitations disclosed', result.heldOutEvaluation.limitationNotes.length > 0, String(result.heldOutEvaluation.limitationNotes.length));
  check('trainer checkpoint captured on demand', Boolean(result.trainerCheckpoint), result.trainerCheckpoint ? 'present' : 'missing');
  check(
    'trainer checkpoint serializes',
    Boolean(result.trainerCheckpoint && JSON.parse(JSON.stringify(result.trainerCheckpoint)).formatVersion === 1),
    result.trainerCheckpoint ? `version=${result.trainerCheckpoint.formatVersion}` : 'missing',
  );
}

function validateTrainerCheckpointRoundTrip() {
  console.log('\n== VAL-MODQN-002E: trainer checkpoint round-trip ==');

  const trainer = new ModqnTrainer({
    protocol: MODQN_REPRODUCTION_MANIFEST.protocol,
    actionCatalogSize: 2,
    seed: 42,
  });
  const experience = makeSyntheticExperience();

  for (let index = 0; index < 130; index += 1) {
    trainer.trainStep(experience);
  }

  const checkpoint = trainer.createCheckpoint();
  const restoredTrainer = new ModqnTrainer({
    protocol: MODQN_REPRODUCTION_MANIFEST.protocol,
    actionCatalogSize: 2,
    seed: 42,
  });
  restoredTrainer.restoreCheckpoint(
    JSON.parse(JSON.stringify(checkpoint)) as typeof checkpoint,
  );

  const originalSelection = trainer.selectAction({
    observation: experience.observation,
    encodedState: experience.encodedState,
    candidateCatalogIndexByObservationIndex: [0, 1],
    training: false,
  });
  const restoredSelection = restoredTrainer.selectAction({
    observation: experience.observation,
    encodedState: experience.encodedState,
    candidateCatalogIndexByObservationIndex: [0, 1],
    training: false,
  });
  const originalNextStep = trainer.trainStep(experience);
  const restoredNextStep = restoredTrainer.trainStep(experience);

  check('checkpoint preserves epsilon', restoredTrainer.getEpsilon() === trainer.getEpsilon(), `${restoredTrainer.getEpsilon()} vs ${trainer.getEpsilon()}`);
  check('checkpoint preserves replay size', restoredTrainer.getReplaySize() === trainer.getReplaySize(), `${restoredTrainer.getReplaySize()} vs ${trainer.getReplaySize()}`);
  check('checkpoint preserves total updates', restoredTrainer.getTotalUpdates() === trainer.getTotalUpdates(), `${restoredTrainer.getTotalUpdates()} vs ${trainer.getTotalUpdates()}`);
  checkJson('checkpoint restores greedy action selection', restoredSelection.action, originalSelection.action);
  checkJson('checkpoint restores objective q-values', restoredSelection.qValues, originalSelection.qValues);
  checkJson('checkpoint preserves next-step training summary', restoredNextStep, originalNextStep);
}

function main() {
  validateManifestSurface();
  validateImportBoundaries();
  validateTrainerHandoffSurface();
  validateRuntimeClosure();
  validateTrainerCheckpointRoundTrip();

  console.log('');
  if (failures.length > 0) {
    console.error(`validate-modqn-m2: FAILED (${failures.length} issue(s))`);
    process.exit(1);
  }

  console.log('validate-modqn-m2: OK');
}

main();
