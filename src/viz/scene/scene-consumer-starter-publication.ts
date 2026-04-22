import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import type { BeamPresentationFrame } from '@/viz/presentation';

import {
  buildSceneConsumerStarterExportV2,
  type SceneConsumerStarterExportV2,
} from './scene-consumer-starter';

type SceneConsumerStarterPublicationMode =
  | 'native-live'
  | 'native-replay'
  | 'modqn-bundle';

interface BuildPublishedSceneConsumerStarterV2Options {
  readonly showcasePath: 'native-replay' | 'bundle-sample';
  readonly mode: SceneConsumerStarterPublicationMode;
  readonly profileId: string | null;
  readonly replaySelection: string | null;
  readonly sourceLabel: string | null;
  readonly sceneConsumedSnapshot: SimulationSnapshot | null;
  readonly beamPresentationFrame: BeamPresentationFrame | null;
}

const PHASE_2A_MODE = 'native-replay';
const PHASE_2A_PROFILE_ID = 'hobs-multibeam-baseline';
const PHASE_2A_REPLAY_SELECTION = 'continuity-window';
const PHASE_2B_NATIVE_PATH = 'native-replay';
const PHASE_2B_BUNDLE_PATH = 'bundle-sample';
const PHASE_2B_BUNDLE_MODE = 'modqn-bundle';
const PHASE_2B_BUNDLE_SOURCE_LABEL = 'sample-bundle-v1';

export function buildPublishedSceneConsumerStarterV2(
  options: BuildPublishedSceneConsumerStarterV2Options,
): SceneConsumerStarterExportV2 | null {
  if (options.showcasePath === PHASE_2B_NATIVE_PATH) {
    if (
      options.mode !== PHASE_2A_MODE
      || options.profileId !== PHASE_2A_PROFILE_ID
      || options.replaySelection !== PHASE_2A_REPLAY_SELECTION
      || options.sourceLabel !== null
    ) {
      return null;
    }

    return buildSceneConsumerStarterExportV2({
      deterministicPathId: `native-replay:${options.profileId}:${options.replaySelection}`,
      mode: 'native-replay',
      profileId: options.profileId,
      replaySelection: options.replaySelection,
      sourceLabel: null,
      sceneConsumedSnapshot: options.sceneConsumedSnapshot,
      beamPresentationFrame: options.beamPresentationFrame,
    });
  }

  if (options.showcasePath === PHASE_2B_BUNDLE_PATH) {
    if (
      options.mode !== PHASE_2B_BUNDLE_MODE
      || options.profileId !== null
      || options.replaySelection !== null
      || options.sourceLabel !== PHASE_2B_BUNDLE_SOURCE_LABEL
    ) {
      return null;
    }

    return buildSceneConsumerStarterExportV2({
      deterministicPathId: `modqn-bundle:${options.sourceLabel}`,
      mode: 'modqn-bundle',
      profileId: null,
      replaySelection: null,
      sourceLabel: options.sourceLabel,
      sceneConsumedSnapshot: options.sceneConsumedSnapshot,
      beamPresentationFrame: options.beamPresentationFrame,
    });
  }

  return null;
}
