import { useMemo } from 'react';

import { useModqnBundleReplay } from '@/app/hooks/useModqnBundleReplay';

import type { SceneModeController } from './types';

const MODQN_BUNDLE_PROFILE_ID = 'modqn-bundle-replay';

interface BundleReplayControllerOptions {
  speed: number;
  paused: boolean;
}

export function useBundleReplayController({
  speed,
  paused,
}: BundleReplayControllerOptions): SceneModeController {
  const result = useModqnBundleReplay({ speed, paused });
  const bundleSummary = useMemo(
    () => result.viewModel?.getBundleSummary() ?? null,
    [result.viewModel],
  );
  const validationSnapshot = useMemo(
    () => result.viewModel?.projectFrame(result.currentFrameIndex) ?? null,
    [result.currentFrameIndex, result.viewModel],
  );
  const controls = useMemo(() => ({
    error: result.error,
    isLoading: result.isLoading,
    loadExternalDirectory: result.loadExternalDirectory,
    loadState: result.loadState,
    resetToSample: result.resetToSample,
    sourceKind: result.sourceKind,
    sourceLabel: result.sourceLabel,
    stepBackward: result.stepBackward,
    stepForward: result.stepForward,
  }), [
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

  return useMemo(() => ({
    bridge: {
      kind: 'modqn-bundle',
      snapshot: result.snapshot,
      validationSnapshot,
      stats: {
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
      },
      exportKpi: null,
      profileId: MODQN_BUNDLE_PROFILE_ID,
      isBhProfile: false,
    },
    bundle: {
      currentFrameIndex: result.currentFrameIndex,
      viewModel: result.viewModel,
      controls,
    },
  }), [
    bundleSummary?.checkpointKind,
    bundleSummary?.replayTruthMode,
    controls,
    result.currentFrameIndex,
    result.currentSlotIndex,
    result.error,
    result.handoverCount,
    result.isReady,
    result.servingSatId,
    result.simTimeSec,
    result.slotCount,
    result.snapshot,
    result.satelliteCount,
    result.sourceLabel,
    result.totalDurationSec,
    result.viewModel,
    result.visibleCount,
    validationSnapshot,
  ]);
}
