import type { SceneConsumerFacade } from './scene-consumer-facade';
import {
  buildSceneConsumerHarnessViewModel,
  type SceneConsumerHarnessViewModel,
} from './scene-consumer-harness';
import { buildSceneConsumerProofReadModel } from './scene-consumer-proof';

export interface SceneConsumerStarterEntry {
  readonly surfaceId: 'scene-consumer-starter-v1';
  readonly contractKind: 'starter-export';
  readonly pathKind: SceneConsumerHarnessViewModel['source']['pathKind'];
  readonly deterministicPathId: string | null;
  readonly deterministicPathReady: boolean;
}

export interface SceneConsumerStarterExport {
  readonly entry: SceneConsumerStarterEntry;
  readonly source: SceneConsumerHarnessViewModel['source'];
  readonly truth: SceneConsumerHarnessViewModel['truth'];
  readonly presentation: SceneConsumerHarnessViewModel['presentation'];
  readonly summary: SceneConsumerHarnessViewModel['render'];
}

function buildDeterministicPathId(
  source: SceneConsumerHarnessViewModel['source'],
): string | null {
  switch (source.pathKind) {
    case 'bundle-sample':
      return source.truthSourceLabel
        ? `bundle-sample:${source.truthSourceLabel}`
        : null;
    case 'native-replay':
      return source.replaySelection
        ? `native-replay:${source.profileId}:${source.replaySelection}`
        : `native-replay:${source.profileId}`;
    case 'other':
      return null;
    default:
      {
        const exhaustiveCheck: never = source.pathKind;
        return exhaustiveCheck;
      }
  }
}

export function buildSceneConsumerStarterExport(
  facade: SceneConsumerFacade | null,
): SceneConsumerStarterExport | null {
  const proof = buildSceneConsumerProofReadModel(facade);
  const harness = buildSceneConsumerHarnessViewModel(proof);

  if (!proof || !harness) return null;

  const deterministicPathId = buildDeterministicPathId(harness.source);

  return {
    entry: {
      surfaceId: 'scene-consumer-starter-v1',
      contractKind: 'starter-export',
      pathKind: harness.source.pathKind,
      deterministicPathId,
      deterministicPathReady: Boolean(
        deterministicPathId
        && harness.source.profileId
        && harness.truth.snapshotRelationship !== 'missing',
      ),
    },
    source: harness.source,
    truth: harness.truth,
    presentation: harness.presentation,
    summary: harness.render,
  };
}
