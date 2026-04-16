import { useEffect, useMemo } from 'react';

import { useModqnBundleReplay } from '@/app/hooks/useModqnBundleReplay';
import { useReplay } from '@/app/hooks/useReplay';
import { useSimulation } from '@/app/hooks/useSimulation';
import type { HandoverType } from '@/core/contracts/exposure-v1';
import type { KpiBundle } from '@/core/contracts/kpi-v1';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import { EarthFixedCellLayer, EarthMovingBeamLayer } from '@/viz/beam';
import { BeamInfoOverlay } from '@/viz/overlays/BeamInfoOverlay';
import { HandoverLinkOverlay } from '@/viz/overlays/HandoverLinkOverlay';
import type { SimHudProps } from '@/viz/overlays/SimHud';
import {
  type BeamPresentationFrame,
  useBeamPresentationFrame,
} from '@/viz/presentation';
import { SatelliteSkyLayer } from '@/viz/satellite/SatelliteSkyLayer';
import { usePublishValidationSection } from '@/viz/validation/store';
import type { ModqnBundleReplayViewModel } from '@/viz/view-models/modqn-bundle-replay-view-model';

import {
  buildOrbitParitySummary,
  buildPresentationFrameSummary,
  buildRuntimeSummary,
  buildSnapshotBeamTruthSummary,
} from './scene-runtime-summaries';

const MODQN_BUNDLE_PROFILE_ID = 'modqn-bundle-replay';

export interface DataLayerProps {
  onStatsUpdate: (data: SimHudProps) => void;
  onSnapshotUpdate: (snapshot: SimulationSnapshot | null) => void;
  onExportKpiReady: (fn: (() => KpiBundle | null) | null) => void;
  onPresentationFrameUpdate?: (frame: BeamPresentationFrame | null) => void;
  speed: number;
  paused: boolean;
  showBeams: boolean;
  showLabels: boolean;
  profileId: string;
  handoverTypeOverride?: HandoverType | null;
}

function BeamLayers({
  snapshot,
  presentationFrame,
  showBeams,
  isBhProfile,
}: {
  snapshot: SimulationSnapshot | null;
  presentationFrame: BeamPresentationFrame | null;
  showBeams: boolean;
  isBhProfile: boolean;
}) {
  return (
    <>
      <HandoverLinkOverlay
        snapshot={snapshot}
        presentationFrame={presentationFrame}
        visible
      />
      {showBeams && (
        <>
          <EarthMovingBeamLayer
            snapshot={snapshot}
            presentationFrame={presentationFrame}
            visible
          />
          <BeamInfoOverlay
            snapshot={snapshot}
            presentationFrame={presentationFrame}
            visible
          />
          {isBhProfile && (
            <EarthFixedCellLayer
              snapshot={snapshot}
              presentationFrame={presentationFrame}
              visible
            />
          )}
        </>
      )}
    </>
  );
}

function PresentationLayers({
  snapshot,
  showBeams,
  showLabels,
  isBhProfile,
  onPresentationFrameUpdate,
}: {
  snapshot: SimulationSnapshot | null;
  showBeams: boolean;
  showLabels: boolean;
  isBhProfile: boolean;
  onPresentationFrameUpdate?: (frame: BeamPresentationFrame | null) => void;
}) {
  const presentationFrame = useBeamPresentationFrame(snapshot, {
    beamVisualsEnabled: showBeams,
  });
  const presentationSummary = useMemo(
    () => buildPresentationFrameSummary(snapshot, presentationFrame),
    [presentationFrame, snapshot],
  );

  usePublishValidationSection('beamPresentationFrame', presentationSummary);

  useEffect(() => {
    onPresentationFrameUpdate?.(presentationFrame);
    return () => onPresentationFrameUpdate?.(null);
  }, [onPresentationFrameUpdate, presentationFrame]);

  return (
    <>
      <SatelliteSkyLayer
        snapshot={snapshot}
        presentationFrame={presentationFrame}
        showLabels={showLabels}
      />
      <BeamLayers
        snapshot={snapshot}
        presentationFrame={presentationFrame}
        showBeams={showBeams}
        isBhProfile={isBhProfile}
      />
    </>
  );
}

export function LiveLayer({
  onStatsUpdate,
  onSnapshotUpdate,
  onExportKpiReady,
  speed,
  paused,
  showBeams,
  showLabels,
  profileId,
  handoverTypeOverride,
  onPresentationFrameUpdate,
}: DataLayerProps) {
  const result = useSimulation({ profileId, speed, paused, handoverTypeOverride });

  const summary = useMemo(
    () => buildRuntimeSummary(result.snapshot, 'live', showBeams, showLabels, null, null, null, profileId, {
      handoverCount: result.handoverCount,
    }),
    [profileId, result.handoverCount, result.snapshot, showBeams, showLabels],
  );
  const orbitParity = useMemo(
    () => buildOrbitParitySummary(result.snapshot, 'live', profileId),
    [result.snapshot, profileId],
  );
  const snapshotBeamTruth = useMemo(
    () => buildSnapshotBeamTruthSummary(result.snapshot),
    [result.snapshot],
  );

  usePublishValidationSection('runtime', summary);
  usePublishValidationSection('orbitParity', orbitParity);
  usePublishValidationSection('snapshotBeamTruth', snapshotBeamTruth);

  useEffect(() => {
    onSnapshotUpdate(result.snapshot);
  }, [onSnapshotUpdate, result.snapshot]);

  useEffect(() => {
    onExportKpiReady(result.exportKpi);
  }, [onExportKpiReady, result.exportKpi]);

  useEffect(() => {
    onStatsUpdate({
      simTimeSec: result.simTimeSec,
      totalDurationSec: result.totalDurationSec,
      satelliteCount: result.satelliteCount,
      visibleCount: result.visibleCount,
      servingSatId: result.servingSatId,
      handoverCount: result.handoverCount,
      profileId: result.profileId,
      isReady: result.isReady,
      replaySelection: null,
      replayWindowStartSec: null,
      replayWindowEndSec: null,
    });
  }, [
    onStatsUpdate,
    result.handoverCount,
    result.isReady,
    result.profileId,
    result.satelliteCount,
    result.servingSatId,
    result.simTimeSec,
    result.totalDurationSec,
    result.visibleCount,
  ]);

  return (
    <PresentationLayers
      snapshot={result.snapshot}
      showBeams={showBeams}
      showLabels={showLabels}
      isBhProfile={profileId.startsWith('bh-')}
      onPresentationFrameUpdate={onPresentationFrameUpdate}
    />
  );
}

export function ReplayLayer({
  onStatsUpdate,
  onSnapshotUpdate,
  onExportKpiReady,
  speed,
  paused,
  showBeams,
  showLabels,
  profileId,
  replaySeekSec,
  onPresentationFrameUpdate,
}: DataLayerProps & { replaySeekSec: number | null }) {
  const result = useReplay({ profileId, speed, paused, initialSeekSec: replaySeekSec });

  useEffect(() => {
    onSnapshotUpdate(result.snapshot);
  }, [onSnapshotUpdate, result.snapshot]);

  const summary = useMemo(
    () => buildRuntimeSummary(
      result.snapshot,
      'replay',
      showBeams,
      showLabels,
      result.selectionReason,
      result.replayManifest?.windowStartSec ?? null,
      result.replayManifest?.windowEndSec ?? null,
      profileId,
      {
        handoverCount: 0,
      },
    ),
    [result.snapshot, result.selectionReason, result.replayManifest, showBeams, showLabels, profileId],
  );
  const orbitParity = useMemo(
    () => buildOrbitParitySummary(result.snapshot, 'replay', profileId),
    [result.snapshot, profileId],
  );
  const snapshotBeamTruth = useMemo(
    () => buildSnapshotBeamTruthSummary(result.snapshot),
    [result.snapshot],
  );

  usePublishValidationSection('runtime', summary);
  usePublishValidationSection('orbitParity', orbitParity);
  usePublishValidationSection('snapshotBeamTruth', snapshotBeamTruth);

  useEffect(() => {
    onStatsUpdate({
      simTimeSec: result.replayState?.currentTimeSec ?? 0,
      totalDurationSec: result.replayState?.windowEndSec ?? 0,
      satelliteCount: result.satelliteCount,
      visibleCount: result.visibleCount,
      servingSatId: result.servingSatId,
      handoverCount: 0,
      profileId: result.profileId,
      isReady: result.isReady,
      replaySelection: result.selectionReason,
      replayWindowStartSec: result.replayManifest?.windowStartSec ?? null,
      replayWindowEndSec: result.replayManifest?.windowEndSec ?? null,
    });
  }, [
    onStatsUpdate,
    result.isReady,
    result.profileId,
    result.replayManifest,
    result.replayState,
    result.satelliteCount,
    result.selectionReason,
    result.servingSatId,
    result.visibleCount,
  ]);

  return (
    <PresentationLayers
      snapshot={result.snapshot}
      showBeams={showBeams}
      showLabels={showLabels}
      isBhProfile={profileId.startsWith('bh-')}
      onPresentationFrameUpdate={onPresentationFrameUpdate}
    />
  );
}

export function BundleReplayLayer({
  onStatsUpdate,
  onSnapshotUpdate,
  onExportKpiReady,
  onViewModelUpdate,
  onControlsUpdate,
  onPresentationFrameUpdate,
  speed,
  paused,
  showBeams,
  showLabels,
}: {
  onStatsUpdate: (data: SimHudProps) => void;
  onSnapshotUpdate: (snapshot: SimulationSnapshot | null) => void;
  onExportKpiReady: (fn: (() => KpiBundle | null) | null) => void;
  onViewModelUpdate: (viewModel: ModqnBundleReplayViewModel | null) => void;
  onControlsUpdate: (controls: {
    error: string | null;
    isLoading: boolean;
    loadExternalDirectory: (selectedFiles: FileList | File[]) => Promise<void>;
    loadState:
      | 'boot-loading-sample'
      | 'boot-load-failed'
      | 'ready-sample'
      | 'loading-external-directory'
      | 'ready-external-directory'
      | 'resetting-to-sample';
    resetToSample: () => Promise<void>;
    sourceKind: 'sample' | 'external-directory';
    sourceLabel: string;
    stepBackward: () => void;
    stepForward: () => void;
  } | null) => void;
  onPresentationFrameUpdate?: (frame: BeamPresentationFrame | null) => void;
  speed: number;
  paused: boolean;
  showBeams: boolean;
  showLabels: boolean;
}) {
  const result = useModqnBundleReplay({ speed, paused });
  const bundleSummary = useMemo(
    () => result.viewModel?.getBundleSummary() ?? null,
    [result.viewModel],
  );
  const replayTruth = useMemo(
    () => result.viewModel?.getReplayTruth(result.currentFrameIndex) ?? null,
    [result.currentFrameIndex, result.viewModel],
  );
  const truthSnapshot = useMemo(
    () => result.viewModel?.projectFrame(result.currentFrameIndex) ?? null,
    [result.currentFrameIndex, result.viewModel],
  );

  useEffect(() => {
    onSnapshotUpdate(result.snapshot);
  }, [onSnapshotUpdate, result.snapshot]);

  useEffect(() => {
    onExportKpiReady(null);
  }, [onExportKpiReady]);

  useEffect(() => {
    onViewModelUpdate(result.viewModel);
  }, [onViewModelUpdate, result.viewModel]);

  useEffect(() => {
    onControlsUpdate({
      error: result.error,
      isLoading: result.isLoading,
      loadExternalDirectory: result.loadExternalDirectory,
      loadState: result.loadState,
      resetToSample: result.resetToSample,
      sourceKind: result.sourceKind,
      sourceLabel: result.sourceLabel,
      stepBackward: result.stepBackward,
      stepForward: result.stepForward,
    });
    return () => onControlsUpdate(null);
  }, [
    onControlsUpdate,
    result.error,
    result.isLoading,
    result.loadExternalDirectory,
    result.loadState,
    result.resetToSample,
    result.sourceKind,
    result.sourceLabel,
    result.stepBackward,
    result.stepForward,
  ]);

  const summary = useMemo(
    () => buildRuntimeSummary(
      truthSnapshot,
      'modqn-bundle',
      showBeams,
      showLabels,
      bundleSummary?.replayTruthMode ?? null,
      null,
      null,
      MODQN_BUNDLE_PROFILE_ID,
      {
        truthSourceKind: 'modqn-bundle',
        truthSourceLabel: result.sourceLabel,
        bundleSlotIndex: result.currentSlotIndex,
        bundleSlotCount: result.slotCount,
        handoverCount: replayTruth?.cumulativeHandovers ?? result.handoverCount,
        bundleHandoverKind: replayTruth?.handoverKind ?? null,
      },
    ),
    [
      bundleSummary?.replayTruthMode,
      replayTruth?.cumulativeHandovers,
      replayTruth?.handoverKind,
      result.currentSlotIndex,
      result.handoverCount,
      result.slotCount,
      result.sourceLabel,
      showBeams,
      showLabels,
      truthSnapshot,
    ],
  );
  const orbitParity = useMemo(
    () => buildOrbitParitySummary(truthSnapshot, 'modqn-bundle', MODQN_BUNDLE_PROFILE_ID),
    [truthSnapshot],
  );
  const snapshotBeamTruth = useMemo(
    () => buildSnapshotBeamTruthSummary(truthSnapshot),
    [truthSnapshot],
  );

  usePublishValidationSection('runtime', summary);
  usePublishValidationSection('orbitParity', orbitParity);
  usePublishValidationSection('snapshotBeamTruth', snapshotBeamTruth);

  useEffect(() => {
    onStatsUpdate({
      simTimeSec: result.simTimeSec,
      totalDurationSec: result.totalDurationSec,
      satelliteCount: result.satelliteCount,
      visibleCount: result.visibleCount,
      servingSatId: result.servingSatId,
      handoverCount: result.handoverCount,
      profileId: MODQN_BUNDLE_PROFILE_ID,
      isReady: result.isReady,
      replaySelection: bundleSummary?.replayTruthMode ?? null,
      replayWindowStartSec: null,
      replayWindowEndSec: null,
      modeLabel: 'MODQN bundle replay',
      truthSourceLabel: result.sourceLabel,
      bundleSlotIndex: result.currentSlotIndex,
      bundleSlotCount: result.slotCount,
      statusLabel: result.error ? `load-error: ${result.error}` : bundleSummary?.checkpointKind ?? null,
    });
  }, [
    bundleSummary?.checkpointKind,
    bundleSummary?.replayTruthMode,
    onStatsUpdate,
    result.currentSlotIndex,
    result.error,
    result.handoverCount,
    result.isReady,
    result.satelliteCount,
    result.servingSatId,
    result.simTimeSec,
    result.slotCount,
    result.sourceLabel,
    result.totalDurationSec,
    result.visibleCount,
  ]);

  return (
    <PresentationLayers
      snapshot={result.snapshot}
      showBeams={showBeams}
      showLabels={showLabels}
      isBhProfile={false}
      onPresentationFrameUpdate={onPresentationFrameUpdate}
    />
  );
}
