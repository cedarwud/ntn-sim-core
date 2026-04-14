/**
 * Phase 03A Consumer Adapter — public barrel.
 *
 * Downstream code (view-models, UI, future mode-switch controller) should
 * import from this barrel, not from the sub-modules directly. See
 * `sdd/modqn-bundle-replay-consumer-sdd.md` for the consumer contract.
 */

export {
  SUPPORTED_BUNDLE_SCHEMA_VERSIONS,
  SUPPORTED_TIMELINE_FORMAT_VERSIONS,
  SUPPORTED_REPLAY_TRUTH_MODES,
  REQUIRED_BUNDLE_FILES,
  REQUIRED_BUNDLE_DIRECTORIES,
  REQUIRED_MANIFEST_FIELDS,
  REQUIRED_TIMELINE_ROW_FIELDS,
} from './constants';

export {
  ModqnBundleSchemaError,
  assertManifestShape,
  assertBundleReplayPresentationReady,
} from './schema-guard';

export { parseTimelineJsonl } from './timeline-parser';

export {
  buildReplayFrames,
  indexFramesBySlot,
} from './replay-frame-adapter';

export {
  loadModqnReplayBundle,
  createMemoryFileReader,
} from './loader';
export type { ModqnBundleFileReader } from './loader';

export type {
  ModqnBundleManifest,
  ModqnBundleCoordinateFrame,
  ModqnBundleReplaySummary,
  ModqnBundleSlotIndexSemantics,
  ModqnBundleSampleSubset,
  ModqnBundleCheckpointRule,
  ModqnBundleCheckpointRuleValue,
  ModqnTimelineRow,
  ModqnUserPosition,
  ModqnServingState,
  ModqnHandoverEvent,
  ModqnHandoverKind,
  ModqnRewardVector,
  ModqnKpiOverlay,
  ModqnSatelliteState,
  ModqnBeamState,
  ModqnReplayUserRecord,
  ModqnReplayFrame,
  ModqnReplayBundle,
  LocalTangentKm,
  GeodeticPoint,
  PositionEciKm,
} from './types';
