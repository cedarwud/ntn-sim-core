/**
 * Phase 03A Consumer Adapter — Typed bundle and replay domain model.
 *
 * Shapes mirror the producer surface in
 * `modqn-paper-reproduction/src/modqn_paper_reproduction/export/replay_bundle.py`,
 * but remain consumer-owned so future producer drift must come through an
 * explicit consumer update rather than structural coupling.
 *
 * Governance:
 *   - Consumer SDD: sdd/modqn-bundle-replay-consumer-sdd.md
 *   - Producer SDD: modqn-paper-reproduction/docs/phases/phase-03a-ntn-sim-core-bundle-replay-integration-sdd.md
 *   - Non-negotiable: the adapter MUST NOT recompute handover or geometry.
 *     If the bundle is missing a required field, loading MUST fail loudly.
 */

// ---------------------------------------------------------------------------
// Primitive geometry carriers
// ---------------------------------------------------------------------------

export interface LocalTangentKm {
  east: number;
  north: number;
}

export interface GeodeticPoint {
  latDeg: number;
  lonDeg: number;
}

export interface PositionEciKm {
  x: number;
  y: number;
  z: number;
}

// ---------------------------------------------------------------------------
// Bundle meta surfaces
// ---------------------------------------------------------------------------

export interface ModqnBundleCoordinateFrame {
  userPosition: string;
  satellitePosition: string;
  beamCenter: string;
  /**
   * Geodetic anchor used by the producer for the local tangent frame in
   * `userPosition.localTangentKm` and `beamStates[*].centerLocalTangentKm`.
   *
   * Producer-side added in Phase 03A Slice A hardening (see
   * `modqn-paper-reproduction/src/modqn_paper_reproduction/export/replay_bundle.py`).
   * The consumer treats it as optional so older bundles keep loading, but
   * Slice C view-model code SHOULD prefer this anchor over parsing the
   * free-text axis description strings.
   */
  groundPoint?: GeodeticPoint;
}

/**
 * Explicit disclosure of the slot index numbering convention. Producer
 * added in Phase 03A Slice A hardening; slot indices start at 1 (post-step
 * state after the first environment tick), not 0. The consumer treats
 * this as optional for backward compatibility but Slice C seek controls
 * should honour `firstIndex`.
 */
export interface ModqnBundleSlotIndexSemantics {
  firstIndex: number;
  note: string;
}

/**
 * Sample-subset disclosure for trimmed/fixture bundles. Producer attaches
 * this to trimmed sample bundles so the consumer can tell the bundle is a
 * subset of a larger real export. All fields are copied verbatim; they do
 * NOT override the authoritative aggregate counts on
 * `ModqnBundleReplaySummary`.
 */
export interface ModqnBundleSampleSubset {
  maxUsers: number;
  maxSlots: number | null;
  userIndices: number[];
  slotIndices: number[];
  sourceFullRowCount: number;
  sourceFullSlotCount: number;
  sourceFullHandoverEventCount: number;
}

export interface ModqnBundleReplaySummary {
  checkpointPath: string;
  checkpointKind: string;
  policyEpisode: number;
  timelineSeed: number;
  /** Labels which seed-priority branch produced `timelineSeed`. */
  replaySeedSource?: string;
  /** Mirrors `slotIndexSemantics.firstIndex` for consumers that want a number. */
  slotIndexOffset?: number;
  rowCount: number;
  slotCount: number;
  handoverEventCount: number;
  rewardWeights: number[];
  diagnostics: Record<string, unknown>;
  /** Present only for trimmed/fixture bundles; see `ModqnBundleSampleSubset`. */
  sampleSubset?: ModqnBundleSampleSubset;
}

/**
 * Structured checkpoint-rule record from `run_metadata.checkpoint_rule`.
 * Producer emits it as a nested object in the Phase 03A Slice A bundle.
 * The consumer keeps every field optional so older string-shaped producer
 * outputs still load via the top-level `checkpointRule` union.
 */
export interface ModqnBundleCheckpointRule {
  assumption_id?: string;
  primary_report?: string;
  secondary_report?: string | null;
  secondary_implemented?: boolean;
  secondary_status?: string;
}

export type ModqnBundleCheckpointRuleValue =
  | string
  | ModqnBundleCheckpointRule
  | null;

export interface ModqnBundleManifest {
  paperId: string;
  runId: string;
  bundleSchemaVersion: string;
  producerVersion: string;
  exportedAt: string;
  sourceArtifactDir: string;
  inputArtifactDir?: string;
  outputDir?: string;
  configPath?: string | null;
  checkpointRule: ModqnBundleCheckpointRuleValue;
  replayTruthMode: string;
  timelineFormatVersion: string;
  coordinateFrame: ModqnBundleCoordinateFrame;
  beamCatalogOrder?: string;
  /** Phase 03A Slice A hardening — slot index numbering convention. */
  slotIndexSemantics?: ModqnBundleSlotIndexSemantics;
  replaySummary?: ModqnBundleReplaySummary;
  /** Free-text disclosure when this bundle is a trimmed sample/fixture. */
  sampleNote?: string;
}

// ---------------------------------------------------------------------------
// Raw timeline row (one JSONL line)
// ---------------------------------------------------------------------------

export interface ModqnUserPosition {
  latDeg: number;
  lonDeg: number;
  localTangentKm: LocalTangentKm;
}

export interface ModqnServingState {
  beamId: string;
  beamIndex: number;
  satId: string;
  satIndex: number;
  localBeamIndex: number;
  validUnderDecisionMask?: boolean;
  validUnderPostStepMask?: boolean;
}

export type ModqnHandoverKind =
  | 'none'
  | 'intra-satellite-beam-switch'
  | 'inter-satellite-handover'
  | string;

export interface ModqnHandoverEvent {
  kind: ModqnHandoverKind;
  eventId: string | null;
}

export interface ModqnRewardVector {
  r1Throughput: number;
  r2Handover: number;
  r3LoadBalance: number;
}

export interface ModqnKpiOverlay {
  userThroughputBps: number;
  selectedBeamLoad: number;
  selectedBeamThroughputBps: number;
  handoverOccurred: boolean;
}

export interface ModqnSatelliteState {
  satId: string;
  satIndex: number;
  trueAnomalyDeg: number;
  positionEciKm: PositionEciKm;
  subSatellitePoint: GeodeticPoint;
}

export interface ModqnBeamState {
  beamId: string;
  beamIndex: number;
  satId: string;
  satIndex: number;
  localBeamIndex: number;
  /**
   * Non-null per the tightened consumer contract. The producer SDD §7.4
   * states that a bundle missing beam centers is not replay-complete; the
   * consumer MUST reject null beam geometry rather than invent it.
   */
  centerPosition: GeodeticPoint;
  /**
   * Non-null per the tightened consumer contract. See note above.
   */
  centerLocalTangentKm: LocalTangentKm;
}

export interface ModqnTimelineRow {
  slotIndex: number;
  timeSec: number;
  decisionTimeSec?: number;
  userId: string;
  userIndex?: number;
  userPosition: ModqnUserPosition;
  decisionUserPosition?: ModqnUserPosition;
  previousServing: ModqnServingState;
  selectedServing: ModqnServingState;
  handoverEvent: ModqnHandoverEvent;
  visibilityMask: boolean[];
  actionValidityMask: boolean[];
  decisionVisibilityMask?: boolean[];
  decisionActionValidityMask?: boolean[];
  beamLoads: number[];
  beamThroughputs?: number[];
  rewardVector: ModqnRewardVector;
  scalarReward: number;
  satelliteStates: ModqnSatelliteState[];
  beamStates: ModqnBeamState[];
  kpiOverlay: ModqnKpiOverlay;
  beamCatalogOrder?: string;
}

// ---------------------------------------------------------------------------
// Adapter-owned replay domain model
// ---------------------------------------------------------------------------

/**
 * One policy-decision record for a user inside a slot.
 * This is the consumer's canonical shape — future UI / overlay / view-model
 * layers should project from this, not from raw JSONL rows.
 */
export interface ModqnReplayUserRecord {
  userId: string;
  userIndex: number | null;
  userPosition: ModqnUserPosition;
  decisionUserPosition: ModqnUserPosition | null;
  previousServing: ModqnServingState;
  selectedServing: ModqnServingState;
  handoverEvent: ModqnHandoverEvent;
  visibilityMask: boolean[];
  actionValidityMask: boolean[];
  decisionVisibilityMask: boolean[] | null;
  decisionActionValidityMask: boolean[] | null;
  beamLoads: number[];
  beamThroughputs: number[] | null;
  rewardVector: ModqnRewardVector;
  scalarReward: number;
  kpiOverlay: ModqnKpiOverlay;
}

/**
 * One replay frame = one slot.
 *
 * Slot-scoped geometry (satellite/beam state) is lifted once per frame,
 * because the producer emits identical per-slot geometry across users.
 */
export interface ModqnReplayFrame {
  slotIndex: number;
  timeSec: number;
  decisionTimeSec: number | null;
  satelliteStates: ModqnSatelliteState[];
  beamStates: ModqnBeamState[];
  users: ModqnReplayUserRecord[];
}

/**
 * Top-level adapter surface exposed to UI / view-model code.
 *
 * `frames` is slot-ordered ascending. `frameBySlotIndex` is a convenience
 * lookup for controls that seek by slot index.
 */
export interface ModqnReplayBundle {
  manifest: ModqnBundleManifest;
  configResolved: Record<string, unknown>;
  assumptions: Record<string, unknown> | null;
  provenanceMap: Record<string, unknown> | null;
  evaluationSummary: Record<string, unknown> | null;
  frames: ModqnReplayFrame[];
  frameBySlotIndex: ReadonlyMap<number, ModqnReplayFrame>;
  slotCount: number;
  userCount: number;
  rowCount: number;
}
