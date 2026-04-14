/**
 * Phase 03A Consumer Adapter — Supported bundle contract constants.
 *
 * These constants mirror the producer contract frozen in
 * `modqn-paper-reproduction/src/modqn_paper_reproduction/export/replay_bundle.py`.
 * Governance:
 *   - Consumer SDD: sdd/modqn-bundle-replay-consumer-sdd.md
 *   - Producer SDD: modqn-paper-reproduction/docs/phases/phase-03a-ntn-sim-core-bundle-replay-integration-sdd.md
 *   - Authority rule: the consumer MUST NOT silently upgrade these values;
 *     any producer bump must come through an explicit consumer change.
 */

/** Supported bundle schema versions the consumer will accept. */
export const SUPPORTED_BUNDLE_SCHEMA_VERSIONS: readonly string[] = [
  'phase-03a-replay-bundle-v1',
] as const;

/** Supported `timelineFormatVersion` values. */
export const SUPPORTED_TIMELINE_FORMAT_VERSIONS: readonly string[] = [
  'step-trace.jsonl/v1',
] as const;

/** Replay truth modes the consumer knows how to render. */
export const SUPPORTED_REPLAY_TRUTH_MODES: readonly string[] = [
  'selected-checkpoint-greedy-replay',
] as const;

/**
 * Required root files for a replay-complete bundle.
 *
 * This list MUST stay aligned with the producer's
 * `validate_replay_bundle()` surface in
 * `modqn-paper-reproduction/src/modqn_paper_reproduction/export/replay_bundle.py`.
 * The loader REJECTS the bundle if any of these are missing.
 */
export const REQUIRED_BUNDLE_FILES: readonly string[] = [
  'manifest.json',
  'config-resolved.json',
  'provenance-map.json',
  'assumptions.json',
  'training/episode_metrics.csv',
  'training/loss_curves.csv',
  'evaluation/summary.json',
  'timeline/step-trace.jsonl',
] as const;

/**
 * Required directories for a replay-complete bundle.
 *
 * The producer freezes `evaluation/sweeps/` as a directory surface (one
 * subdirectory per sweep). The consumer does not descend into it yet, but
 * it MUST be present, matching the producer's `validate_replay_bundle()`
 * directory check.
 */
export const REQUIRED_BUNDLE_DIRECTORIES: readonly string[] = [
  'evaluation/sweeps',
] as const;

/** Required fields in `manifest.json`. */
export const REQUIRED_MANIFEST_FIELDS: readonly string[] = [
  'paperId',
  'runId',
  'bundleSchemaVersion',
  'producerVersion',
  'exportedAt',
  'sourceArtifactDir',
  'checkpointRule',
  'replayTruthMode',
  'timelineFormatVersion',
  'coordinateFrame',
] as const;

/** Required fields in each `timeline/step-trace.jsonl` row. */
export const REQUIRED_TIMELINE_ROW_FIELDS: readonly string[] = [
  'slotIndex',
  'timeSec',
  'userId',
  'userPosition',
  'previousServing',
  'selectedServing',
  'handoverEvent',
  'visibilityMask',
  'actionValidityMask',
  'beamLoads',
  'rewardVector',
  'scalarReward',
  'satelliteStates',
  'beamStates',
  'kpiOverlay',
] as const;
