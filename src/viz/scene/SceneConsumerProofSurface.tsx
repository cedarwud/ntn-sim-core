import { useMemo } from 'react';

import type { SceneConsumerFacade } from './scene-consumer-facade';
import { buildSceneConsumerProofReadModel } from './scene-consumer-proof';

export interface SceneConsumerProofSurfaceProps {
  facade: SceneConsumerFacade | null;
  visible?: boolean;
}

function stringify(value: unknown) {
  return JSON.stringify(value);
}

export function SceneConsumerProofSurface({
  facade,
  visible = false,
}: SceneConsumerProofSurfaceProps) {
  const proof = useMemo(() => buildSceneConsumerProofReadModel(facade), [facade]);

  if (!visible || !proof) return null;

  return (
    <div
      hidden
      data-testid="scene-consumer-proof"
      data-mode={proof.source.mode}
      data-profile-id={proof.source.profileId}
      data-replay-selection={proof.source.replaySelection ?? ''}
      data-truth-source-label={proof.source.truthSourceLabel ?? ''}
      data-bundle-slot-index={proof.source.bundleSlotIndex ?? ''}
      data-bundle-slot-count={proof.source.bundleSlotCount ?? ''}
      data-scene-tick={proof.truth.sceneConsumed.tick ?? ''}
      data-published-tick={proof.truth.published.tick ?? ''}
      data-scene-serving-sat-id={proof.truth.sceneConsumed.servingSatId ?? ''}
      data-published-serving-sat-id={proof.truth.published.servingSatId ?? ''}
      data-scene-published-same-reference={proof.truth.snapshotRelationship.scenePublishedSameReference ? 'true' : 'false'}
      data-native-serving-transition-kind={proof.truth.nativeRuntime.servingTransitionKind ?? ''}
      data-native-service-state={proof.truth.nativeRuntime.serviceState ?? ''}
      data-native-service-reason={proof.truth.nativeRuntime.serviceReason ?? ''}
      data-bundle-producer-handover-kind={proof.truth.bundleReplay.producerHandoverKind ?? ''}
      data-presentation-focus-mode={proof.presentation.focusMode ?? ''}
      data-presentation-narrative-phase={proof.presentation.narrativePhase ?? ''}
      data-display-sat-ids={stringify(proof.presentation.displaySatIds)}
      data-beam-sat-ids={stringify(proof.presentation.beamSatIds)}
    >
      {stringify(proof)}
    </div>
  );
}
