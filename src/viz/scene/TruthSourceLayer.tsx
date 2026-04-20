import { useEffect, useMemo } from 'react';

import type { KpiBundle } from '@/core/contracts/kpi-v1';
import {
  type BeamPresentationFrame,
  useBeamPresentationFrame,
} from '@/viz/presentation';
import { usePublishValidationSection } from '@/viz/validation/store';
import type { ModqnBundleReplayViewModel } from '@/viz/view-models/modqn-bundle-replay-view-model';

import type {
  BundleReplayControls,
  SceneModeController,
  SceneModeControllerKind,
} from './modes/types';
import { PresentationLayers } from './PresentationLayers';
import {
  buildSceneConsumerFacade,
  type SceneConsumerFacade,
} from './scene-consumer-facade';
import {
  buildOrbitParitySummary,
  buildRuntimeSummary,
  buildSnapshotBeamTruthSummary,
  type SceneRuntimeMode,
} from './scene-runtime-summaries';

function toRuntimeMode(kind: SceneModeControllerKind): SceneRuntimeMode {
  switch (kind) {
    case 'native-live':
      return 'live';
    case 'native-replay':
      return 'replay';
    case 'modqn-bundle':
      return 'modqn-bundle';
    default:
      return kind satisfies never;
  }
}

export interface TruthSourceLayerProps {
  controller: SceneModeController;
  onFacadeUpdate: (facade: SceneConsumerFacade | null) => void;
  onExportKpiReady: (fn: (() => KpiBundle | null) | null) => void;
  onViewModelUpdate?: (viewModel: ModqnBundleReplayViewModel | null) => void;
  onControlsUpdate?: (controls: BundleReplayControls | null) => void;
  showBeams: boolean;
  showLabels: boolean;
}

export function TruthSourceLayer({
  controller,
  onFacadeUpdate,
  onExportKpiReady,
  onViewModelUpdate,
  onControlsUpdate,
  showBeams,
  showLabels,
}: TruthSourceLayerProps) {
  const { bridge, bundle } = controller;
  const runtimeMode = useMemo(() => toRuntimeMode(bridge.kind), [bridge.kind]);
  const replayTruth = useMemo(
    () => bundle?.viewModel?.getReplayTruth(bundle.currentFrameIndex) ?? null,
    [bundle?.currentFrameIndex, bundle?.viewModel],
  );
  const presentationFrame = useBeamPresentationFrame(bridge.snapshot, {
    beamVisualsEnabled: showBeams,
  });
  const consumerFacade = useMemo(
    () => buildSceneConsumerFacade(controller, presentationFrame, replayTruth),
    [controller, presentationFrame, replayTruth],
  );
  const runtimeSummary = useMemo(
    () => buildRuntimeSummary(
      bridge.validationSnapshot,
      runtimeMode,
      showBeams,
      showLabels,
      bridge.stats.replaySelection ?? null,
      bridge.stats.replayWindowStartSec ?? null,
      bridge.stats.replayWindowEndSec ?? null,
      bridge.profileId,
      runtimeMode === 'modqn-bundle'
        ? {
            truthSourceKind: 'modqn-bundle',
            truthSourceLabel: bridge.stats.truthSourceLabel ?? null,
            bundleSlotIndex: bridge.stats.bundleSlotIndex ?? null,
            bundleSlotCount: bridge.stats.bundleSlotCount ?? null,
            handoverCount: bridge.stats.handoverCount,
            bundleHandoverKind: replayTruth?.handoverKind ?? null,
          }
        : {
            handoverCount: bridge.stats.handoverCount,
          },
    ),
    [bridge, replayTruth?.handoverKind, runtimeMode, showBeams, showLabels],
  );
  const orbitParity = useMemo(
    () => buildOrbitParitySummary(bridge.validationSnapshot, runtimeMode, bridge.profileId),
    [bridge.profileId, bridge.validationSnapshot, runtimeMode],
  );
  const snapshotBeamTruth = useMemo(
    () => buildSnapshotBeamTruthSummary(bridge.validationSnapshot),
    [bridge.validationSnapshot],
  );

  usePublishValidationSection('runtime', runtimeSummary);
  usePublishValidationSection('orbitParity', orbitParity);
  usePublishValidationSection('snapshotBeamTruth', snapshotBeamTruth);

  useEffect(() => {
    onFacadeUpdate(consumerFacade);
    return () => onFacadeUpdate(null);
  }, [consumerFacade, onFacadeUpdate]);

  useEffect(() => {
    onViewModelUpdate?.(bundle?.viewModel ?? null);
  }, [bundle?.viewModel, onViewModelUpdate]);

  useEffect(() => {
    if (!onControlsUpdate) return;
    onControlsUpdate(bundle?.controls ?? null);
    return () => onControlsUpdate(null);
  }, [bundle?.controls, onControlsUpdate]);

  useEffect(() => {
    onExportKpiReady(bridge.exportKpi);
  }, [bridge.exportKpi, onExportKpiReady]);

  return (
    <PresentationLayers
      snapshot={bridge.snapshot}
      presentationFrame={presentationFrame}
      showBeams={showBeams}
      showLabels={showLabels}
      isBhProfile={bridge.isBhProfile}
    />
  );
}
