import type { SceneConsumerFacade } from './scene-consumer-facade';

type SceneConsumerSnapshot = SceneConsumerFacade['truth']['sceneConsumedSnapshot'];
type SceneConsumerPrimaryUe = NonNullable<NonNullable<SceneConsumerSnapshot>['ues'][number]>;

export interface SceneConsumerProofSnapshotSummary {
  readonly tick: number | null;
  readonly timeSec: number | null;
  readonly servingSatId: SceneConsumerPrimaryUe['servingSatId'];
  readonly servingBeamId: SceneConsumerPrimaryUe['servingBeamId'];
  readonly targetSatId: SceneConsumerPrimaryUe['targetSatId'];
  readonly targetBeamId: SceneConsumerPrimaryUe['targetBeamId'];
  readonly secondarySatId: SceneConsumerPrimaryUe['secondarySatId'];
  readonly continuityState: SceneConsumerPrimaryUe['continuityState'] | null;
}

export interface SceneConsumerProofReadModel {
  readonly source: {
    readonly mode: SceneConsumerFacade['source']['mode'];
    readonly profileId: string;
    readonly isReady: boolean;
    readonly truthSourceLabel: string | null;
    readonly bundleSlotIndex: number | null;
    readonly bundleSlotCount: number | null;
    readonly handoverCount: number;
    readonly replaySelection: string | null;
    readonly statusLabel: string | null;
  };
  readonly truth: {
    readonly sceneConsumed: SceneConsumerProofSnapshotSummary;
    readonly published: SceneConsumerProofSnapshotSummary;
    readonly snapshotRelationship: {
      readonly scenePublishedSameReference: boolean;
    };
    readonly nativeRuntime: {
      readonly continuityState: SceneConsumerFacade['truth']['nativeRuntime']['continuityState'];
      readonly servingTransitionKind: NonNullable<SceneConsumerFacade['truth']['nativeRuntime']['servingTransition']>['kind'] | null;
      readonly serviceState: NonNullable<SceneConsumerFacade['truth']['nativeRuntime']['serviceState']>['state'] | null;
      readonly serviceReason: NonNullable<SceneConsumerFacade['truth']['nativeRuntime']['serviceState']>['reason'] | null;
      readonly recentHoEventCount: number;
      readonly dapsPhase: NonNullable<SceneConsumerFacade['truth']['nativeRuntime']['daps']>['phase'] | null;
    };
    readonly bundleReplay: {
      readonly producerHandoverKind: SceneConsumerFacade['truth']['bundleReplay']['producerHandoverKind'];
    };
  };
  readonly presentation: {
    readonly focusMode: NonNullable<SceneConsumerFacade['presentation']['beamPresentationFrame']>['focusMode'] | null;
    readonly narrativePhase: NonNullable<SceneConsumerFacade['presentation']['continuityNarrative']>['phase'] | null;
    readonly narrativeServingSatId: NonNullable<SceneConsumerFacade['presentation']['continuityNarrative']>['servingSatId'] | null;
    readonly narrativeTargetSatId: NonNullable<SceneConsumerFacade['presentation']['continuityNarrative']>['targetSatId'] | null;
    readonly displaySatIds: readonly string[];
    readonly beamSatIds: readonly string[];
  };
}

function summarizeSnapshot(
  snapshot: SceneConsumerFacade['truth']['sceneConsumedSnapshot'],
): SceneConsumerProofSnapshotSummary {
  const primaryUe = snapshot?.ues[0] ?? null;

  return {
    tick: snapshot?.tick ?? null,
    timeSec: snapshot?.timeSec ?? null,
    servingSatId: primaryUe?.servingSatId ?? null,
    servingBeamId: primaryUe?.servingBeamId ?? null,
    targetSatId: primaryUe?.targetSatId ?? null,
    targetBeamId: primaryUe?.targetBeamId ?? null,
    secondarySatId: primaryUe?.secondarySatId ?? null,
    continuityState: primaryUe?.continuityState ?? null,
  };
}

export function buildSceneConsumerProofReadModel(
  facade: SceneConsumerFacade | null,
): SceneConsumerProofReadModel | null {
  if (!facade) return null;

  const sceneConsumedSnapshot = facade.truth.sceneConsumedSnapshot;
  const publishedTruthSnapshot = facade.truth.publishedTruthSnapshot;
  const continuityNarrative = facade.presentation.continuityNarrative
    ?? facade.presentation.beamPresentationFrame?.continuityNarrative
    ?? null;

  return {
    source: {
      mode: facade.source.mode,
      profileId: facade.source.profileId,
      isReady: facade.source.isReady,
      truthSourceLabel: facade.source.truthSourceLabel,
      bundleSlotIndex: facade.source.bundleSlotIndex,
      bundleSlotCount: facade.source.bundleSlotCount,
      handoverCount: facade.source.handoverCount,
      replaySelection: facade.source.replaySelection,
      statusLabel: facade.source.statusLabel,
    },
    truth: {
      sceneConsumed: summarizeSnapshot(sceneConsumedSnapshot),
      published: summarizeSnapshot(publishedTruthSnapshot),
      snapshotRelationship: {
        scenePublishedSameReference: sceneConsumedSnapshot !== null
          && sceneConsumedSnapshot === publishedTruthSnapshot,
      },
      nativeRuntime: {
        continuityState: facade.truth.nativeRuntime.continuityState,
        servingTransitionKind: facade.truth.nativeRuntime.servingTransition?.kind ?? null,
        serviceState: facade.truth.nativeRuntime.serviceState?.state ?? null,
        serviceReason: facade.truth.nativeRuntime.serviceState?.reason ?? null,
        recentHoEventCount: facade.truth.nativeRuntime.recentHoEvents.length,
        dapsPhase: facade.truth.nativeRuntime.daps?.phase ?? null,
      },
      bundleReplay: {
        producerHandoverKind: facade.truth.bundleReplay.producerHandoverKind,
      },
    },
    presentation: {
      focusMode: facade.presentation.beamPresentationFrame?.focusMode ?? null,
      narrativePhase: continuityNarrative?.phase ?? null,
      narrativeServingSatId: continuityNarrative?.servingSatId ?? null,
      narrativeTargetSatId: continuityNarrative?.targetSatId ?? null,
      displaySatIds: facade.presentation.beamPresentationFrame?.displaySatIds ?? [],
      beamSatIds: facade.presentation.beamPresentationFrame?.beamSatIds ?? [],
    },
  };
}
