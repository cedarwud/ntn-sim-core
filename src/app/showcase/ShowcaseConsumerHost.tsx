import { useEffect, useRef } from 'react';

import {
  loadBundledModqnSampleBundle,
  MODQN_SAMPLE_BUNDLE_SOURCE_LABEL,
} from '@/app/hooks/modqn-bundle-sample';
import { publishWithTransientTruthHold } from '@/app/hooks/transient-truth-hold';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import { createSimEngine } from '@/core/engine';
import { buildInteractiveProfileRuntime } from '@/core/orbit/profile-runtime';
import { loadProfile } from '@/core/profiles';
import { createReplaySelectionPlan } from '@/runner/curation';
import { recordWindow } from '@/runner/replay/controller';
import { createReplayArtifact } from '@/core/trace/factory';
import { createReplayControllerFromArtifact } from '@/runner/replay/controller';
import {
  buildBeamPresentationFrame,
  buildContinuityNarrativeState,
  type ContinuityNarrativeState,
} from '@/viz/presentation';
import {
  buildPublishedSceneConsumerStarterV2,
} from '@/viz/scene/scene-consumer-starter-publication';
import { publishValidationSection } from '@/viz/validation/store';
import {
  advanceBundleReplayFrameIndex,
  ModqnBundleReplayViewModel,
} from '@/viz/view-models/modqn-bundle-replay-view-model';

import {
  ShowcaseConsumerApp,
  type ShowcaseConsumerAppProps,
} from './ShowcaseConsumerApp';
import {
  PHASE_2A_PROFILE_ID,
  PHASE_2A_REPLAY_SELECTION,
  SHOWCASE_BUNDLE_SAMPLE_PATH,
  SHOWCASE_NATIVE_REPLAY_PATH,
  readShowcaseConsumerPath,
  type ShowcaseConsumerPath,
} from './showcase-consumer-window';

const SNAPSHOT_INTERVAL_MS = 50;

function resetPresentationState(args: {
  continuityNarrativeRef: { current: ContinuityNarrativeState | null };
  previousDisplaySatIdsRef: { current: Set<string> };
}) {
  args.continuityNarrativeRef.current = null;
  args.previousDisplaySatIdsRef.current = new Set();
}

function NativeReplayShowcaseStarterPublisher() {
  const continuityNarrativeRef = useRef<ContinuityNarrativeState | null>(null);
  const previousDisplaySatIdsRef = useRef<Set<string>>(new Set());
  const stickySnapshotRef = useRef<SimulationSnapshot | null>(null);
  const stickySnapshotHoldUntilRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    resetPresentationState({
      continuityNarrativeRef,
      previousDisplaySatIdsRef,
    });
    stickySnapshotRef.current = null;
    stickySnapshotHoldUntilRef.current = 0;
    publishValidationSection('sceneConsumerStarter', null);

    void (async () => {
      const profile = loadProfile(PHASE_2A_PROFILE_ID);
      const { trajectoryCache } = await buildInteractiveProfileRuntime(profile);

      if (disposed) return;

      const engine = createSimEngine({ profile, trajectoryCache });
      const replayPlan = createReplaySelectionPlan(
        profile,
        trajectoryCache,
        `replay-${profile.id}-${profile.seed}`,
        'showcase',
      );
      const { selectedWindow, replayManifest } = replayPlan;
      const endTicks = Math.round(selectedWindow.endTimeSec / profile.timeControl.stepSec) + 1;
      const snapshots = recordWindow(
        engine,
        endTicks,
        profile.timeControl.stepSec,
        selectedWindow.startTimeSec,
        selectedWindow.endTimeSec,
      );
      const replayArtifact = createReplayArtifact(replayManifest, snapshots);
      const controller = createReplayControllerFromArtifact({
        replayArtifact,
        stepSec: profile.timeControl.stepSec,
        playbackSpeed: 1,
      });

      if (disposed) return;

      controller.play();
      let lastTime = performance.now();

      const publishCurrentStarter = () => {
        const now = performance.now();
        const deltaMs = now - lastTime;
        lastTime = now;
        controller.advance(deltaMs);

        const snapshot = publishWithTransientTruthHold({
          candidateSnapshot: controller.getSnapshot(),
          nowMs: now,
          stickySnapshotRef,
          stickySnapshotHoldUntilRef,
        });

        if (!snapshot) {
          resetPresentationState({
            continuityNarrativeRef,
            previousDisplaySatIdsRef,
          });
          publishValidationSection('sceneConsumerStarter', null);
          return;
        }

        const continuityNarrative = buildContinuityNarrativeState(
          snapshot,
          continuityNarrativeRef.current,
        );
        const presentationFrame = buildBeamPresentationFrame(snapshot, {
          previousDisplaySatIds: previousDisplaySatIdsRef.current,
          beamVisualsEnabled: true,
          continuityNarrative,
        });
        continuityNarrativeRef.current = presentationFrame.continuityNarrative;
        previousDisplaySatIdsRef.current = new Set(presentationFrame.displaySatIds);

        const starter = buildPublishedSceneConsumerStarterV2({
          showcasePath: SHOWCASE_NATIVE_REPLAY_PATH,
          mode: 'native-replay',
          profileId: PHASE_2A_PROFILE_ID,
          replaySelection: PHASE_2A_REPLAY_SELECTION,
          sourceLabel: null,
          sceneConsumedSnapshot: snapshot,
          beamPresentationFrame: presentationFrame,
        });
        publishValidationSection('sceneConsumerStarter', starter);
      };

      publishCurrentStarter();
      intervalId = setInterval(publishCurrentStarter, SNAPSHOT_INTERVAL_MS);
    })().catch((error: unknown) => {
      console.warn('[NativeReplayShowcaseStarterPublisher] Failed to bootstrap starter publisher:', error);
      publishValidationSection('sceneConsumerStarter', null);
    });

    return () => {
      disposed = true;
      if (intervalId) clearInterval(intervalId);
      resetPresentationState({
        continuityNarrativeRef,
        previousDisplaySatIdsRef,
      });
      stickySnapshotRef.current = null;
      stickySnapshotHoldUntilRef.current = 0;
      publishValidationSection('sceneConsumerStarter', null);
    };
  }, []);

  return null;
}

function BundleSampleShowcaseStarterPublisher() {
  const continuityNarrativeRef = useRef<ContinuityNarrativeState | null>(null);
  const previousDisplaySatIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let disposed = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    resetPresentationState({
      continuityNarrativeRef,
      previousDisplaySatIdsRef,
    });
    publishValidationSection('sceneConsumerStarter', null);

    void loadBundledModqnSampleBundle()
      .then((bundle) => {
        if (disposed) return;

        const viewModel = new ModqnBundleReplayViewModel(
          bundle,
          MODQN_SAMPLE_BUNDLE_SOURCE_LABEL,
        );

        let currentFrameIndex = 0;
        let lastTime = performance.now();
        let accumulatedMs = 0;

        const publishCurrentStarter = () => {
          const now = performance.now();
          const deltaMs = now - lastTime;
          lastTime = now;
          accumulatedMs += deltaMs;

          const stepMs = viewModel.getStepDurationMs();
          if (accumulatedMs >= stepMs) {
            const deltaFrames = Math.floor(accumulatedMs / stepMs);
            accumulatedMs -= deltaFrames * stepMs;
            currentFrameIndex = advanceBundleReplayFrameIndex(
              currentFrameIndex,
              deltaFrames,
              viewModel.getFrameCount(),
            );
          }

          const snapshot = viewModel.projectFrame(currentFrameIndex);
          const continuityNarrative = buildContinuityNarrativeState(
            snapshot,
            continuityNarrativeRef.current,
          );
          const presentationFrame = buildBeamPresentationFrame(snapshot, {
            previousDisplaySatIds: previousDisplaySatIdsRef.current,
            beamVisualsEnabled: true,
            continuityNarrative,
          });
          continuityNarrativeRef.current = presentationFrame.continuityNarrative;
          previousDisplaySatIdsRef.current = new Set(presentationFrame.displaySatIds);

          const starter = buildPublishedSceneConsumerStarterV2({
            showcasePath: SHOWCASE_BUNDLE_SAMPLE_PATH,
            mode: 'modqn-bundle',
            profileId: null,
            replaySelection: null,
            sourceLabel: MODQN_SAMPLE_BUNDLE_SOURCE_LABEL,
            sceneConsumedSnapshot: snapshot,
            beamPresentationFrame: presentationFrame,
          });
          publishValidationSection('sceneConsumerStarter', starter);
        };

        publishCurrentStarter();
        intervalId = setInterval(publishCurrentStarter, SNAPSHOT_INTERVAL_MS);
      })
      .catch((error: unknown) => {
        console.warn('[BundleSampleShowcaseStarterPublisher] Failed to bootstrap starter publisher:', error);
        publishValidationSection('sceneConsumerStarter', null);
      });

    return () => {
      disposed = true;
      if (intervalId) clearInterval(intervalId);
      resetPresentationState({
        continuityNarrativeRef,
        previousDisplaySatIdsRef,
      });
      publishValidationSection('sceneConsumerStarter', null);
    };
  }, []);

  return null;
}

function ShowcaseConsumerStarterPublisher({
  showcasePath,
}: {
  showcasePath: ShowcaseConsumerPath;
}) {
  return showcasePath === SHOWCASE_BUNDLE_SAMPLE_PATH
    ? <BundleSampleShowcaseStarterPublisher />
    : <NativeReplayShowcaseStarterPublisher />;
}

export function ShowcaseConsumerHost(props: ShowcaseConsumerAppProps) {
  const showcasePath = readShowcaseConsumerPath(
    typeof window === 'undefined' ? '' : window.location.search,
  );

  return (
    <>
      <ShowcaseConsumerStarterPublisher showcasePath={showcasePath} />
      <ShowcaseConsumerApp {...props} />
    </>
  );
}
