import type { SceneConsumerProofReadModel } from './scene-consumer-proof';

export type SceneConsumerHarnessPathKind =
  | 'bundle-sample'
  | 'native-replay'
  | 'other';

export type SceneConsumerHarnessSnapshotRelationship =
  | 'same-reference'
  | 'distinct-reference'
  | 'missing';

export interface SceneConsumerHarnessViewModel {
  readonly source: {
    readonly mode: SceneConsumerProofReadModel['source']['mode'];
    readonly profileId: string;
    readonly pathKind: SceneConsumerHarnessPathKind;
    readonly truthSourceLabel: string | null;
    readonly replaySelection: string | null;
    readonly bundleSlotIndex: number | null;
    readonly bundleSlotCount: number | null;
    readonly handoverCount: number;
    readonly statusLabel: string | null;
  };
  readonly truth: {
    readonly sceneServingSatId: string | null;
    readonly publishedServingSatId: string | null;
    readonly snapshotRelationship: SceneConsumerHarnessSnapshotRelationship;
    readonly continuityState: string | null;
    readonly nativeServingTransitionKind: string | null;
    readonly bundleProducerHandoverKind: string | null;
  };
  readonly presentation: {
    readonly focusMode: string | null;
    readonly narrativePhase: string | null;
    readonly displaySatIds: readonly string[];
    readonly beamSatIds: readonly string[];
  };
  readonly render: {
    readonly sourceLine: string;
    readonly truthLine: string;
    readonly presentationLine: string;
  };
}

function inferPathKind(
  proof: SceneConsumerProofReadModel,
): SceneConsumerHarnessPathKind {
  if (proof.source.mode === 'modqn-bundle' && proof.source.truthSourceLabel === 'sample-bundle-v1') {
    return 'bundle-sample';
  }
  if (proof.source.mode === 'native-replay') {
    return 'native-replay';
  }
  return 'other';
}

function inferSnapshotRelationship(
  proof: SceneConsumerProofReadModel,
): SceneConsumerHarnessSnapshotRelationship {
  if (proof.truth.sceneConsumed.tick === null && proof.truth.published.tick === null) {
    const hasSceneServing = Boolean(proof.truth.sceneConsumed.servingSatId);
    const hasPublishedServing = Boolean(proof.truth.published.servingSatId);
    if (!hasSceneServing && !hasPublishedServing) {
      return 'missing';
    }
  }
  return proof.truth.snapshotRelationship.scenePublishedSameReference
    ? 'same-reference'
    : 'distinct-reference';
}

function buildSourceLine(source: SceneConsumerHarnessViewModel['source']): string {
  const slotLabel = source.bundleSlotIndex === null || source.bundleSlotCount === null
    ? 'slot=n/a'
    : `slot=${source.bundleSlotIndex}/${source.bundleSlotCount}`;
  const sourceLabel = source.truthSourceLabel ?? source.replaySelection ?? 'n/a';
  return [
    `path=${source.pathKind}`,
    `mode=${source.mode}`,
    `profile=${source.profileId}`,
    `source=${sourceLabel}`,
    slotLabel,
    `handovers=${source.handoverCount}`,
  ].join(' | ');
}

function buildTruthLine(truth: SceneConsumerHarnessViewModel['truth']): string {
  return [
    `scene=${truth.sceneServingSatId ?? 'none'}`,
    `published=${truth.publishedServingSatId ?? 'none'}`,
    `snapshot=${truth.snapshotRelationship}`,
    `continuity=${truth.continuityState ?? 'none'}`,
    `native=${truth.nativeServingTransitionKind ?? 'none'}`,
    `bundle=${truth.bundleProducerHandoverKind ?? 'none'}`,
  ].join(' | ');
}

function buildPresentationLine(
  presentation: SceneConsumerHarnessViewModel['presentation'],
): string {
  return [
    `focus=${presentation.focusMode ?? 'none'}`,
    `narrative=${presentation.narrativePhase ?? 'none'}`,
    `display=${presentation.displaySatIds.length}`,
    `beams=${presentation.beamSatIds.length}`,
  ].join(' | ');
}

export function buildSceneConsumerHarnessViewModel(
  proof: SceneConsumerProofReadModel | null,
): SceneConsumerHarnessViewModel | null {
  if (!proof) return null;

  const source: SceneConsumerHarnessViewModel['source'] = {
    mode: proof.source.mode,
    profileId: proof.source.profileId,
    pathKind: inferPathKind(proof),
    truthSourceLabel: proof.source.truthSourceLabel,
    replaySelection: proof.source.replaySelection,
    bundleSlotIndex: proof.source.bundleSlotIndex,
    bundleSlotCount: proof.source.bundleSlotCount,
    handoverCount: proof.source.handoverCount,
    statusLabel: proof.source.statusLabel,
  };
  const truth: SceneConsumerHarnessViewModel['truth'] = {
    sceneServingSatId: proof.truth.sceneConsumed.servingSatId,
    publishedServingSatId: proof.truth.published.servingSatId,
    snapshotRelationship: inferSnapshotRelationship(proof),
    continuityState: proof.truth.nativeRuntime.continuityState ?? null,
    nativeServingTransitionKind: proof.truth.nativeRuntime.servingTransitionKind,
    bundleProducerHandoverKind: proof.truth.bundleReplay.producerHandoverKind,
  };
  const presentation: SceneConsumerHarnessViewModel['presentation'] = {
    focusMode: proof.presentation.focusMode,
    narrativePhase: proof.presentation.narrativePhase,
    displaySatIds: proof.presentation.displaySatIds,
    beamSatIds: proof.presentation.beamSatIds,
  };

  return {
    source,
    truth,
    presentation,
    render: {
      sourceLine: buildSourceLine(source),
      truthLine: buildTruthLine(truth),
      presentationLine: buildPresentationLine(presentation),
    },
  };
}
