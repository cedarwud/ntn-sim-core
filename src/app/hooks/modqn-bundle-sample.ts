import {
  createMemoryFileReader,
  loadModqnReplayBundle,
  type ModqnReplayBundle,
} from '@/adapters/modqn-bundle';

import manifestRaw from '../../../fixtures/sample-bundle-v1/manifest.json?raw';
import configResolvedRaw from '../../../fixtures/sample-bundle-v1/config-resolved.json?raw';
import assumptionsRaw from '../../../fixtures/sample-bundle-v1/assumptions.json?raw';
import provenanceRaw from '../../../fixtures/sample-bundle-v1/provenance-map.json?raw';
import evaluationSummaryRaw from '../../../fixtures/sample-bundle-v1/evaluation/summary.json?raw';
import episodeMetricsRaw from '../../../fixtures/sample-bundle-v1/training/episode_metrics.csv?raw';
import lossCurvesRaw from '../../../fixtures/sample-bundle-v1/training/loss_curves.csv?raw';
import timelineRaw from '../../../fixtures/sample-bundle-v1/timeline/step-trace.jsonl?raw';

let sampleBundlePromise: Promise<ModqnReplayBundle> | null = null;

export async function loadBundledModqnSampleBundle(): Promise<ModqnReplayBundle> {
  if (!sampleBundlePromise) {
    sampleBundlePromise = loadModqnReplayBundle(createMemoryFileReader({
      'manifest.json': manifestRaw,
      'config-resolved.json': configResolvedRaw,
      'assumptions.json': assumptionsRaw,
      'provenance-map.json': provenanceRaw,
      'evaluation/summary.json': evaluationSummaryRaw,
      'training/episode_metrics.csv': episodeMetricsRaw,
      'training/loss_curves.csv': lossCurvesRaw,
      'timeline/step-trace.jsonl': timelineRaw,
      'evaluation/sweeps/': '',
    }));
  }
  return sampleBundlePromise;
}
