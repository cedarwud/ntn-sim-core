/**
 * src/core/experiments — Experiment manifest and result layer.
 *
 * Purpose: define reproducible run specs, manifests, and artifact assembly
 * for baseline experiments. Separates "how to run and record" from
 * "how the algorithm works".
 *
 * @layer experiments
 * @created 2026-03-31 (downstream architecture Group 2)
 * @authority sdd/downstream-runtime-architecture-sdd.md §3.2, §8B
 *
 * Current state: the baseline reproduction path is landed through M3. This
 * layer now owns deterministic MODQN sampling, training/eval manifests,
 * held-out artifact assembly, and the stabilized result bundle exported to UI.
 *
 * Dependency rules:
 *   MAY import:   @/core/contracts, @/core/algorithms, runner surfaces
 *   MUST NOT:     @/core/engine/ internals, @/viz/, @/app/, policy logic
 */

export type { ExperimentManifest, ExperimentResult } from './types';
export type {
  ModqnDenseLayerCheckpoint,
  ModqnExperience,
  ModqnMlpNetworkCheckpoint,
  ModqnObjectiveDqnCheckpoint,
  ModqnProfileOverrides,
  ModqnSamplingConfig,
  ModqnSamplingPlan,
  ModqnSamplingWindow,
  ModqnTrainerCheckpoint,
  ModqnTrainingManifest,
  ModqnTrainingMetrics,
  ModqnHeldOutEvaluation,
  ModqnHeldOutWindowResult,
  ModqnReproductionResult,
} from './modqn-reproduction-types';
export type {
  ModqnAnchorParityBundle,
  ModqnPaperReadyFigure,
  ModqnParityComparisonMode,
  ModqnParityComparisonRow,
  ModqnParityEnvelopeTarget,
  ModqnParityLabel,
  ModqnParityParameterRow,
  ModqnParityQualitativeTarget,
  ModqnParitySweepPoint,
  ModqnParitySweepTarget,
  ModqnParityTarget,
} from './modqn-targeted-parity-types';

export { ModqnTrainer } from './modqn-trainer';
export { MODQN_REPRODUCTION_MANIFEST } from './modqn-reproduction-manifest';
export { buildModqnSamplingPlan } from './modqn-sampling';
export { runModqnBaselineReproduction } from './modqn-reproduction-runner';
export {
  formatModqnAnchorParityBundleMarkdown,
  runModqnAnchorParityBundle,
} from './modqn-targeted-parity';
