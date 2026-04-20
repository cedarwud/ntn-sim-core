import type { SceneConsumerStarterExport } from './scene-consumer-starter';

export type SceneConsumerStarterDataAttributes = Readonly<Record<`data-${string}`, string>>;

export interface SceneConsumerStarterConsumerProjection {
  readonly surfaceId: SceneConsumerStarterExport['entry']['surfaceId'];
  readonly title: string;
  readonly deterministicPathId: string;
  readonly sourceLine: string;
  readonly truthLine: string;
  readonly presentationLine: string;
  readonly serializedStarter: string;
  readonly dataAttributes: SceneConsumerStarterDataAttributes;
}

function stringify(value: unknown): string {
  return JSON.stringify(value);
}

function buildPanelTitle(starter: SceneConsumerStarterExport): string {
  switch (starter.entry.pathKind) {
    case 'bundle-sample':
      return 'Starter Consumer / Bundle Sample';
    case 'native-replay':
      return 'Starter Consumer / Native Replay';
    case 'other':
      return 'Starter Consumer';
    default:
      return 'Starter Consumer';
  }
}

export function buildSceneConsumerStarterConsumerProjection(
  starter: SceneConsumerStarterExport | null,
): SceneConsumerStarterConsumerProjection | null {
  if (
    !starter
    || starter.entry.pathKind === 'other'
    || !starter.entry.deterministicPathReady
    || !starter.entry.deterministicPathId
  ) {
    return null;
  }

  return {
    surfaceId: starter.entry.surfaceId,
    title: buildPanelTitle(starter),
    deterministicPathId: starter.entry.deterministicPathId,
    sourceLine: starter.summary.sourceLine,
    truthLine: starter.summary.truthLine,
    presentationLine: starter.summary.presentationLine,
    serializedStarter: stringify(starter),
    dataAttributes: {
      'data-surface-id': starter.entry.surfaceId,
      'data-contract-kind': starter.entry.contractKind,
      'data-mode': starter.source.mode,
      'data-profile-id': starter.source.profileId,
      'data-path-kind': starter.entry.pathKind,
      'data-deterministic-path-id': starter.entry.deterministicPathId,
      'data-deterministic-path-ready': starter.entry.deterministicPathReady ? 'true' : 'false',
      'data-truth-source-label': starter.source.truthSourceLabel ?? '',
      'data-replay-selection': starter.source.replaySelection ?? '',
      'data-scene-serving-sat-id': starter.truth.sceneServingSatId ?? '',
      'data-published-serving-sat-id': starter.truth.publishedServingSatId ?? '',
      'data-snapshot-relationship': starter.truth.snapshotRelationship,
      'data-native-serving-transition-kind': starter.truth.nativeServingTransitionKind ?? '',
      'data-bundle-producer-handover-kind': starter.truth.bundleProducerHandoverKind ?? '',
      'data-presentation-focus-mode': starter.presentation.focusMode ?? '',
      'data-presentation-narrative-phase': starter.presentation.narrativePhase ?? '',
      'data-display-sat-ids': stringify(starter.presentation.displaySatIds),
      'data-beam-sat-ids': stringify(starter.presentation.beamSatIds),
      'data-source-line': starter.summary.sourceLine,
      'data-truth-line': starter.summary.truthLine,
      'data-presentation-line': starter.summary.presentationLine,
    },
  };
}
