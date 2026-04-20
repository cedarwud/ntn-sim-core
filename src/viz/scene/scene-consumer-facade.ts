import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import type {
  BeamPresentationFrame,
  ContinuityNarrativeState,
} from '@/viz/presentation';
import type { ModqnReplayTruthView } from '@/viz/view-models/modqn-bundle-replay-view-model';

import type { SceneModeController } from './modes/types';

type PrimaryUeSnapshot = SimulationSnapshot['ues'][number] | null;

export type SceneConsumerServingTransition = NonNullable<
  SimulationSnapshot['ues'][number]['servingTransition']
>;

export type SceneConsumerServiceState = NonNullable<
  SimulationSnapshot['ues'][number]['serviceState']
>;

export type SceneConsumerContinuityState =
  SimulationSnapshot['ues'][number]['continuityState'] | null;

export interface SceneConsumerSourceEnvelope {
  readonly mode: SceneModeController['bridge']['kind'];
  readonly isReady: boolean;
  readonly profileId: string;
  readonly isBhProfile: boolean;
  readonly simTimeSec: number;
  readonly totalDurationSec: number;
  readonly satelliteCount: number;
  readonly visibleCount: number;
  readonly servingSatId: string | null;
  readonly handoverCount: number;
  readonly replaySelection: string | null;
  readonly replayWindowStartSec: number | null;
  readonly replayWindowEndSec: number | null;
  readonly modeLabel: string | null;
  readonly truthSourceLabel: string | null;
  readonly bundleSlotIndex: number | null;
  readonly bundleSlotCount: number | null;
  readonly statusLabel: string | null;
}

export interface SceneConsumerContinuityTruth {
  readonly continuityState: SceneConsumerContinuityState;
  readonly servingTransition: SceneConsumerServingTransition | null;
  readonly serviceState: SceneConsumerServiceState | null;
  readonly recentHoEvents: readonly NonNullable<SimulationSnapshot['recentHoEvents']>[number][];
  readonly daps: SimulationSnapshot['daps'] | null;
}

export interface SceneConsumerTruthContract {
  readonly sceneConsumedSnapshot: SimulationSnapshot | null;
  readonly publishedTruthSnapshot: SimulationSnapshot | null;
  readonly nativeRuntime: SceneConsumerContinuityTruth;
  readonly bundleReplay: {
    readonly producerHandoverKind: ModqnReplayTruthView['handoverKind'] | null;
  };
}

export interface SceneConsumerPresentationContract {
  readonly beamPresentationFrame: BeamPresentationFrame | null;
  readonly continuityNarrative: ContinuityNarrativeState | null;
}

export interface SceneConsumerFacade {
  readonly source: SceneConsumerSourceEnvelope;
  readonly truth: SceneConsumerTruthContract;
  readonly presentation: SceneConsumerPresentationContract;
}

function getPrimaryUe(snapshot: SimulationSnapshot | null): PrimaryUeSnapshot {
  return snapshot?.ues[0] ?? null;
}

export function buildSceneConsumerFacade(
  controller: SceneModeController,
  presentationFrame: BeamPresentationFrame | null,
  replayTruth: ModqnReplayTruthView | null,
): SceneConsumerFacade {
  const { bridge } = controller;
  const publishedTruthSnapshot = bridge.validationSnapshot ?? bridge.snapshot;
  const primaryPublishedUe = getPrimaryUe(publishedTruthSnapshot);

  return {
    source: {
      mode: bridge.kind,
      isReady: bridge.stats.isReady,
      profileId: bridge.profileId,
      isBhProfile: bridge.isBhProfile,
      simTimeSec: bridge.stats.simTimeSec,
      totalDurationSec: bridge.stats.totalDurationSec,
      satelliteCount: bridge.stats.satelliteCount,
      visibleCount: bridge.stats.visibleCount,
      servingSatId: bridge.stats.servingSatId,
      handoverCount: bridge.stats.handoverCount,
      replaySelection: bridge.stats.replaySelection ?? null,
      replayWindowStartSec: bridge.stats.replayWindowStartSec ?? null,
      replayWindowEndSec: bridge.stats.replayWindowEndSec ?? null,
      modeLabel: bridge.stats.modeLabel ?? null,
      truthSourceLabel: bridge.stats.truthSourceLabel ?? null,
      bundleSlotIndex: bridge.stats.bundleSlotIndex ?? null,
      bundleSlotCount: bridge.stats.bundleSlotCount ?? null,
      statusLabel: bridge.stats.statusLabel ?? null,
    },
    truth: {
      sceneConsumedSnapshot: bridge.snapshot,
      publishedTruthSnapshot,
      nativeRuntime: {
        continuityState: primaryPublishedUe?.continuityState ?? null,
        servingTransition: primaryPublishedUe?.servingTransition ?? null,
        serviceState: primaryPublishedUe?.serviceState ?? null,
        recentHoEvents: publishedTruthSnapshot?.recentHoEvents ?? [],
        daps: publishedTruthSnapshot?.daps ?? null,
      },
      bundleReplay: {
        producerHandoverKind: replayTruth?.handoverKind ?? null,
      },
    },
    presentation: {
      beamPresentationFrame: presentationFrame,
      continuityNarrative: presentationFrame?.continuityNarrative ?? null,
    },
  };
}
