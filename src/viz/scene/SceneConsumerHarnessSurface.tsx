import { useMemo } from 'react';

import type { SceneConsumerFacade } from './scene-consumer-facade';
import {
  buildSceneConsumerHarnessViewModel,
} from './scene-consumer-harness';
import { buildSceneConsumerProofReadModel } from './scene-consumer-proof';

function stringify(value: unknown) {
  return JSON.stringify(value);
}

export interface SceneConsumerHarnessSurfaceProps {
  facade: SceneConsumerFacade | null;
  visible?: boolean;
}

export function SceneConsumerHarnessSurface({
  facade,
  visible = false,
}: SceneConsumerHarnessSurfaceProps) {
  const proof = useMemo(() => buildSceneConsumerProofReadModel(facade), [facade]);
  const harness = useMemo(() => buildSceneConsumerHarnessViewModel(proof), [proof]);

  if (!visible || !harness) return null;

  return (
    <div
      hidden
      data-testid="scene-consumer-harness"
      data-mode={harness.source.mode}
      data-profile-id={harness.source.profileId}
      data-path-kind={harness.source.pathKind}
      data-truth-source-label={harness.source.truthSourceLabel ?? ''}
      data-replay-selection={harness.source.replaySelection ?? ''}
      data-bundle-slot-index={harness.source.bundleSlotIndex ?? ''}
      data-bundle-slot-count={harness.source.bundleSlotCount ?? ''}
      data-scene-serving-sat-id={harness.truth.sceneServingSatId ?? ''}
      data-published-serving-sat-id={harness.truth.publishedServingSatId ?? ''}
      data-snapshot-relationship={harness.truth.snapshotRelationship}
      data-native-serving-transition-kind={harness.truth.nativeServingTransitionKind ?? ''}
      data-bundle-producer-handover-kind={harness.truth.bundleProducerHandoverKind ?? ''}
      data-presentation-focus-mode={harness.presentation.focusMode ?? ''}
      data-presentation-narrative-phase={harness.presentation.narrativePhase ?? ''}
      data-display-sat-ids={stringify(harness.presentation.displaySatIds)}
      data-beam-sat-ids={stringify(harness.presentation.beamSatIds)}
      data-source-line={harness.render.sourceLine}
      data-truth-line={harness.render.truthLine}
      data-presentation-line={harness.render.presentationLine}
    >
      <div data-testid="scene-consumer-harness-source-line">{harness.render.sourceLine}</div>
      <div data-testid="scene-consumer-harness-truth-line">{harness.render.truthLine}</div>
      <div data-testid="scene-consumer-harness-presentation-line">{harness.render.presentationLine}</div>
      {stringify(harness)}
    </div>
  );
}
