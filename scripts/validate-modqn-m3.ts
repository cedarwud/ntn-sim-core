#!/usr/bin/env node

import { MODQN_REPRODUCTION_MANIFEST } from '../src/core/experiments/modqn-reproduction-manifest';
import { runModqnBaselineReproduction } from '../src/core/experiments/modqn-reproduction-runner';
import { ModqnViewModel } from '../src/viz/view-models/modqn-view-model';

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

function validateResultSurface(result: ReturnType<typeof runModqnBaselineReproduction>) {
  console.log('\n== VAL-MODQN-003A: stable result surface ==');

  check('training summary present', result.trainingSummary.totalEpisodes > 0, String(result.trainingSummary.totalEpisodes));
  check('training summary matches episode log', result.trainingSummary.totalEpisodes === result.trainingEpisodes.length, `${result.trainingSummary.totalEpisodes} vs ${result.trainingEpisodes.length}`);
  check('training curves aligned',
    result.trainingSummary.curves.episodes.length === result.trainingSummary.curves.throughputLoss.length
      && result.trainingSummary.curves.episodes.length === result.trainingSummary.curves.handoverLoss.length
      && result.trainingSummary.curves.episodes.length === result.trainingSummary.curves.loadBalanceLoss.length
      && result.trainingSummary.curves.episodes.length === result.trainingSummary.curves.scalarReward.length,
    String(result.trainingSummary.curves.episodes.length),
  );
  check('held-out windows present', result.heldOutEvaluation.windows.length > 0, String(result.heldOutEvaluation.windows.length));
  check('artifact bundles aligned', result.artifactBundles.length === result.heldOutEvaluation.windows.length, `${result.artifactBundles.length} vs ${result.heldOutEvaluation.windows.length}`);
  check('average KPI mirrors aggregate KPI',
    result.heldOutEvaluation.averageKpi.meanSinrDb === result.heldOutEvaluation.aggregateKpiBundle.meanSinrDb,
    result.heldOutEvaluation.averageKpi.meanSinrDb.toFixed(4),
  );

  const constraints = result.metadata.constraints.map((entry) => entry.toLowerCase());
  check('constraint discloses 2x2 proxy', constraints.some((entry) => entry.includes('2x2 proxy')), '2x2 proxy');
  check('constraint discloses 10 s window', constraints.some((entry) => entry.includes('10 s')), '10 s window');
  check('constraint discloses single-visible-sat ceiling', constraints.some((entry) => entry.includes('one visible satellite')), 'single-visible-sat disclosure');
  check('constraint discloses ue-0 control scope', constraints.some((entry) => entry.includes('ue-0')), 'ue-0 disclosure');
  check('constraint discloses epsilon decay assumption', constraints.some((entry) => entry.includes('epsilon decay')), 'epsilon decay disclosure');

  const serialized = JSON.parse(JSON.stringify(result)) as typeof result;
  check('result bundle serializes', serialized.metadata.paperId === result.metadata.paperId, serialized.metadata.paperId);
}

function validateViewModelSurface(result: ReturnType<typeof runModqnBaselineReproduction>) {
  console.log('\n== VAL-MODQN-003B: viewer-facing projector surface ==');
  const viewModel = new ModqnViewModel(result);

  const convergence = viewModel.getTrainingConvergenceData();
  const reward = viewModel.getRewardTrajectoryData();
  const comparison = viewModel.getKpiComparison();
  const metadata = viewModel.getMetadata();

  check('convergence chart labels populated', convergence.labels.length > 0, String(convergence.labels.length));
  check('reward chart labels align', reward.labels.length === convergence.labels.length, `${reward.labels.length} vs ${convergence.labels.length}`);
  check('comparison rows consume real KPI fields', comparison.some((row) => row.metric === 'Mean Throughput' && row.reproduction === result.heldOutEvaluation.averageKpi.meanThroughputMbps.toFixed(2)), comparison.map((row) => row.metric).join(', '));
  check('paper targets stay optional', comparison.every((row) => row.paperTarget === null), 'no heuristic paper targets');
  check('metadata reflects result bundle', metadata.heldOutWindows === result.heldOutEvaluation.windows.length, String(metadata.heldOutWindows));
}

function main() {
  const result = runModqnBaselineReproduction({
    trainingEpisodeLimit: MODQN_REPRODUCTION_MANIFEST.sampling.trainEpisodesForSmoke,
    heldOutEpisodeLimit: 1,
  });

  validateResultSurface(result);
  validateViewModelSurface(result);

  console.log('');
  if (failures.length > 0) {
    console.error(`validate-modqn-m3: FAILED (${failures.length} issue(s))`);
    process.exit(1);
  }

  console.log('validate-modqn-m3: OK');
}

main();
