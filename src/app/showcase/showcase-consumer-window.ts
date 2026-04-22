import { useSyncExternalStore } from 'react';

import type {
  PublishedSceneConsumerStarter,
  SceneConsumerStarterExportV2,
} from '@/viz/scene/scene-consumer-starter';

export const SHOWCASE_APP_QUERY_KEY = 'app';
export const SHOWCASE_APP_QUERY_VALUE = 'showcase-consumer';
export const SHOWCASE_PATH_QUERY_KEY = 'showcasePath';
export const SHOWCASE_NATIVE_REPLAY_PATH = 'native-replay';
export const SHOWCASE_BUNDLE_SAMPLE_PATH = 'bundle-sample';

export const PHASE_2A_PROFILE_ID = 'hobs-multibeam-baseline';
export const PHASE_2A_REPLAY_SELECTION = 'continuity-window';
export const PHASE_2A_DETERMINISTIC_PATH_ID =
  `native-replay:${PHASE_2A_PROFILE_ID}:${PHASE_2A_REPLAY_SELECTION}`;
export const SHOWCASE_NATIVE_REPLAY_DETERMINISTIC_PATH_ID =
  PHASE_2A_DETERMINISTIC_PATH_ID;
export const SHOWCASE_BUNDLE_SAMPLE_SOURCE_LABEL = 'sample-bundle-v1';
export const SHOWCASE_BUNDLE_SAMPLE_DETERMINISTIC_PATH_ID =
  `modqn-bundle:${SHOWCASE_BUNDLE_SAMPLE_SOURCE_LABEL}`;

const EVENT_NAME = 'ntn-sim-core:visual-validation';

const SHOWCASE_PATH_ALLOWLIST = new Set([
  SHOWCASE_NATIVE_REPLAY_PATH,
  SHOWCASE_BUNDLE_SAMPLE_PATH,
] as const);

export type ShowcaseConsumerPath =
  | typeof SHOWCASE_NATIVE_REPLAY_PATH
  | typeof SHOWCASE_BUNDLE_SAMPLE_PATH;

type ShowcaseConsumerWindow = Window & {
  __NTN_SIM_CORE_VISUAL__?: {
    sceneConsumerStarter?: PublishedSceneConsumerStarter | null;
  };
};

function readSceneConsumedSnapshot(
  starter: PublishedSceneConsumerStarter | null,
): unknown {
  if (!starter || !('sceneConsumedSnapshot' in starter.truth)) return null;
  return starter.truth.sceneConsumedSnapshot;
}

function readBeamPresentationFrame(
  starter: PublishedSceneConsumerStarter | null,
): unknown {
  if (!starter || !('beamPresentationFrame' in starter.presentation)) return null;
  return starter.presentation.beamPresentationFrame;
}

function readSourceLabel(
  starter: PublishedSceneConsumerStarter | null,
): string | null {
  if (!starter || !('sourceLabel' in starter.source)) return null;
  return starter.source.sourceLabel ?? null;
}

export function readPublishedSceneConsumerStarter(
  currentWindow: Window | undefined = typeof window === 'undefined' ? undefined : window,
): PublishedSceneConsumerStarter | null {
  const showcaseWindow = currentWindow as ShowcaseConsumerWindow | undefined;
  return showcaseWindow?.__NTN_SIM_CORE_VISUAL__?.sceneConsumerStarter ?? null;
}

function subscribeToPublishedSceneConsumerStarter(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

export function usePublishedSceneConsumerStarter(): PublishedSceneConsumerStarter | null {
  return useSyncExternalStore(
    subscribeToPublishedSceneConsumerStarter,
    readPublishedSceneConsumerStarter,
    () => null,
  );
}

export function isPhase2ASceneConsumerStarter(
  starter: PublishedSceneConsumerStarter | null,
): boolean {
  return Boolean(
    starter
      && starter.entry.surfaceId === 'scene-consumer-starter-v1'
      && starter.entry.contractKind === 'starter-export'
      && starter.entry.deterministicPathId === PHASE_2A_DETERMINISTIC_PATH_ID
      && starter.entry.deterministicPathReady
      && starter.source.mode === 'native-replay'
      && starter.source.profileId === PHASE_2A_PROFILE_ID
      && starter.source.replaySelection === PHASE_2A_REPLAY_SELECTION
      && readSceneConsumedSnapshot(starter)
      && readBeamPresentationFrame(starter)
  );
}

export function isShowcaseSceneConsumerStarterV2(
  starter: PublishedSceneConsumerStarter | null,
): starter is SceneConsumerStarterExportV2 {
  if (
    !starter
    || starter.entry.surfaceId !== 'scene-consumer-starter-v2'
    || starter.entry.contractKind !== 'starter-export'
    || !starter.entry.deterministicPathReady
    || !readSceneConsumedSnapshot(starter)
    || !readBeamPresentationFrame(starter)
  ) {
    return false;
  }

  const starterV2 = starter as SceneConsumerStarterExportV2;

  if (
    starterV2.source.mode === 'native-replay'
    && starterV2.entry.deterministicPathId === SHOWCASE_NATIVE_REPLAY_DETERMINISTIC_PATH_ID
    && starterV2.source.profileId === PHASE_2A_PROFILE_ID
    && starterV2.source.replaySelection === PHASE_2A_REPLAY_SELECTION
    && readSourceLabel(starterV2) === null
  ) {
    return true;
  }

  return starterV2.source.mode === 'modqn-bundle'
    && starterV2.entry.deterministicPathId === SHOWCASE_BUNDLE_SAMPLE_DETERMINISTIC_PATH_ID
    && starterV2.source.profileId === null
    && starterV2.source.replaySelection === null
    && readSourceLabel(starterV2) === SHOWCASE_BUNDLE_SAMPLE_SOURCE_LABEL;
}

export function readShowcaseConsumerAppEnabled(search: string): boolean {
  return new URLSearchParams(search).get(SHOWCASE_APP_QUERY_KEY)
    === SHOWCASE_APP_QUERY_VALUE;
}

export function readShowcaseConsumerPath(search: string): ShowcaseConsumerPath {
  const candidate = new URLSearchParams(search).get(SHOWCASE_PATH_QUERY_KEY);
  if (
    candidate
    && SHOWCASE_PATH_ALLOWLIST.has(candidate as ShowcaseConsumerPath)
  ) {
    return candidate as ShowcaseConsumerPath;
  }
  return SHOWCASE_NATIVE_REPLAY_PATH;
}
