#!/usr/bin/env node

import { runModqnBaselineReproduction } from '../src/core/experiments/modqn-reproduction-runner';
import { MODQN_REPRODUCTION_MANIFEST } from '../src/core/experiments/modqn-reproduction-manifest';

function main() {
  console.log('--- MODQN M2 Smoke Test: Baseline Reproduction Path ---');

  const result = runModqnBaselineReproduction({
    trainingEpisodeLimit: MODQN_REPRODUCTION_MANIFEST.sampling.trainEpisodesForSmoke,
    heldOutEpisodeLimit: 1,
  });

  const lastTrainingEpisode = result.trainingEpisodes[result.trainingEpisodes.length - 1];
  console.log(`Training episodes: ${result.trainingEpisodes.length}`);
  console.log(`Held-out windows:  ${result.heldOutEvaluation.windows.length}`);
  console.log(`Replay artifacts:  ${result.artifactBundles.length}`);
  console.log(`Trainer updates:   ${lastTrainingEpisode?.totalUpdates ?? 0}`);
  console.log(`Final epsilon:     ${result.metrics.epsilon.at(-1)?.toFixed(4) ?? 'n/a'}`);
  console.log(`Held-out scalar:   ${result.heldOutEvaluation.scalarReward.toFixed(4)}`);
  console.log(`Held-out mean SINR: ${result.kpiBundle.meanSinrDb.toFixed(2)} dB`);
  console.log(`Held-out throughput: ${result.kpiBundle.meanThroughputMbps.toFixed(2)} Mbps`);

  if (result.heldOutEvaluation.limitationNotes.length > 0) {
    console.log('Limitations:');
    for (const note of result.heldOutEvaluation.limitationNotes) {
      console.log(`  - ${note}`);
    }
  }

  const pass =
    result.trainingEpisodes.length > 0
    && result.heldOutEvaluation.windows.length > 0
    && result.artifactBundles.length > 0
    && Number.isFinite(result.heldOutEvaluation.scalarReward)
    && Number.isFinite(result.kpiBundle.meanThroughputMbps)
    && (lastTrainingEpisode?.totalUpdates ?? 0) > 0;

  if (!pass) {
    console.error('FAIL: MODQN M2 smoke path did not close.');
    process.exit(1);
  }

  console.log('PASS: MODQN M2 runtime/training/evaluation closure confirmed.');
}

main();
