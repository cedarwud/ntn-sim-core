import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { ControlPanelProps } from '@/viz/overlays/ControlPanel';
import type { ModqnBaselineCompactPanelProps } from '@/viz/overlays/ModqnBaselineCompactPanel';
import type { ModqnBundleMetadataPanelProps } from '@/viz/overlays/ModqnBundleMetadataPanel';
import type { BundleTruthHudProps } from '@/viz/overlays/SimHud';
import type { BundleReplayControls } from '@/viz/scene/modes/types';
import type { SceneConsumerFacade } from '@/viz/scene/scene-consumer-facade';
import type { ModqnBundleReplayViewModel } from '@/viz/view-models/modqn-bundle-replay-view-model';

interface UseBundleReplayShellStateOptions {
  facade: SceneConsumerFacade | null;
  showBundleMetadata: boolean;
}

export type BundleControlPanelProps = Pick<
  ControlPanelProps,
  | 'bundleLoadError'
  | 'bundleIsLoading'
  | 'bundleLoadState'
  | 'bundleSourceKind'
  | 'bundleSourceLabel'
  | 'bundleCurrentSlotIndex'
  | 'bundleSlotCount'
  | 'onLoadExternalBundleDirectory'
  | 'onResetBundleSource'
  | 'onBundleStepBackward'
  | 'onBundleStepForward'
>;

export interface BundleReplayShellState {
  truthHudProps: BundleTruthHudProps;
  compactPanelProps: ModqnBaselineCompactPanelProps;
  metadataPanelProps: ModqnBundleMetadataPanelProps;
  controlPanelProps: BundleControlPanelProps;
  setBundleControls: Dispatch<SetStateAction<BundleReplayControls | null>>;
  setBundleViewModel: Dispatch<SetStateAction<ModqnBundleReplayViewModel | null>>;
  clearBundleState: () => void;
}

function clampBundleFrameIndex(
  viewModel: ModqnBundleReplayViewModel | null,
  slotIndex: number | null | undefined,
) {
  if (!viewModel) return 0;
  if (slotIndex === null || slotIndex === undefined) return 0;
  return Math.max(0, Math.min(slotIndex - 1, viewModel.getFrameCount() - 1));
}

export function useBundleReplayShellState({
  facade,
  showBundleMetadata,
}: UseBundleReplayShellStateOptions): BundleReplayShellState {
  const [bundleViewModel, setBundleViewModel] = useState<ModqnBundleReplayViewModel | null>(null);
  const [bundleControls, setBundleControls] = useState<BundleReplayControls | null>(null);

  const clearBundleState = useCallback(() => {
    setBundleViewModel(null);
    setBundleControls(null);
  }, []);

  const bundleSummary = useMemo(
    () => bundleViewModel?.getBundleSummary() ?? null,
    [bundleViewModel],
  );
  const bundleTrainingEvalSummary = useMemo(
    () => bundleViewModel?.getTrainingEvalSummary() ?? null,
    [bundleViewModel],
  );
  const bundleTrainingEvidence = useMemo(
    () => bundleViewModel?.getTrainingEvidence() ?? null,
    [bundleViewModel],
  );
  const bundleAssumptions = useMemo(
    () => bundleViewModel?.getAssumptions() ?? [],
    [bundleViewModel],
  );
  const bundleProvenanceLegend = useMemo(
    () => bundleViewModel?.getProvenanceLegend() ?? [],
    [bundleViewModel],
  );
  const bundleProvenanceFields = useMemo(
    () => bundleViewModel?.getProvenanceFields() ?? [],
    [bundleViewModel],
  );
  const bundlePolicyDiagnosticsDisclosure = useMemo(
    () => bundleViewModel?.getPolicyDiagnosticsDisclosure() ?? null,
    [bundleViewModel],
  );
  const bundleFrameIndex = useMemo(
    () => clampBundleFrameIndex(bundleViewModel, facade?.source.bundleSlotIndex),
    [bundleViewModel, facade?.source.bundleSlotIndex],
  );
  const bundleDecisionStory = useMemo(
    () => bundleViewModel?.getDecisionStory(bundleFrameIndex) ?? null,
    [bundleFrameIndex, bundleViewModel],
  );
  const bundleReplayTruth = useMemo(
    () => bundleViewModel?.getReplayTruth(bundleFrameIndex) ?? null,
    [bundleFrameIndex, bundleViewModel],
  );
  const bundleDashboardKpis = useMemo(
    () => bundleViewModel?.getDashboardKpis(bundleFrameIndex) ?? null,
    [bundleFrameIndex, bundleViewModel],
  );
  const bundleReplayTrendSeries = useMemo(
    () => bundleViewModel?.getReplayTrendSeries() ?? [],
    [bundleViewModel],
  );
  const bundleExplainability = useMemo(
    () => bundleViewModel?.getExplainability(bundleFrameIndex) ?? null,
    [bundleFrameIndex, bundleViewModel],
  );

  const sceneSnapshot = facade?.truth.sceneConsumedSnapshot ?? null;
  const publishedTruthSnapshot = facade?.truth.publishedTruthSnapshot ?? null;
  const primaryPublishedUe = publishedTruthSnapshot?.ues[0] ?? null;
  const continuityNarrative = facade?.presentation.continuityNarrative ?? null;
  const sourceLabel = bundleControls?.sourceLabel
    ?? facade?.source.truthSourceLabel
    ?? bundleSummary?.sourceLabel
    ?? 'sample-bundle-v1';
  const currentSlotIndex = facade?.source.bundleSlotIndex ?? bundleReplayTruth?.currentSlotIndex ?? null;
  const slotCount = facade?.source.bundleSlotCount ?? bundleReplayTruth?.slotCount ?? bundleSummary?.slotCount ?? null;
  const handoverCount = facade?.source.handoverCount ?? bundleReplayTruth?.cumulativeHandovers ?? 0;

  return {
    truthHudProps: {
      currentSlotIndex,
      slotCount,
      sourceLabel,
      servingSatId: primaryPublishedUe?.servingSatId ?? bundleReplayTruth?.servingSatId ?? null,
      servingBeamId: primaryPublishedUe?.servingBeamId ?? bundleReplayTruth?.servingBeamId ?? null,
      handoverCount,
      handoverKind: facade?.truth.bundleReplay.producerHandoverKind ?? null,
      continuityNarrative,
    },
    compactPanelProps: {
      visible: true,
      snapshot: sceneSnapshot,
      bundleSummary,
      trainingEvalSummary: bundleTrainingEvalSummary,
      trainingEvidence: bundleTrainingEvidence,
      decisionStory: bundleDecisionStory,
      sourceLabel,
      currentSlotIndex,
      slotCount,
      handoverCount,
      assumptionCount: bundleAssumptions.length,
      dashboardKpis: bundleDashboardKpis,
      provenanceLegend: bundleProvenanceLegend,
      provenanceFields: bundleProvenanceFields,
      replayTrendSeries: bundleReplayTrendSeries,
      explainability: bundleExplainability,
    },
    metadataPanelProps: {
      visible: showBundleMetadata,
      bundleSummary,
      trainingEvalSummary: bundleTrainingEvalSummary,
      assumptions: bundleAssumptions,
      provenanceLegend: bundleProvenanceLegend,
      provenanceFields: bundleProvenanceFields,
      policyDiagnosticsDisclosure: bundlePolicyDiagnosticsDisclosure,
    },
    controlPanelProps: {
      bundleLoadError: bundleControls?.error ?? null,
      bundleIsLoading: bundleControls?.isLoading ?? false,
      bundleLoadState: bundleControls?.loadState ?? 'boot-loading-sample',
      bundleSourceKind: bundleControls?.sourceKind ?? 'sample',
      bundleSourceLabel: sourceLabel,
      bundleCurrentSlotIndex: currentSlotIndex,
      bundleSlotCount: slotCount ?? 0,
      onLoadExternalBundleDirectory: bundleControls?.loadExternalDirectory,
      onResetBundleSource: bundleControls?.resetToSample,
      onBundleStepBackward: bundleControls?.stepBackward,
      onBundleStepForward: bundleControls?.stepForward,
    },
    setBundleControls,
    setBundleViewModel,
    clearBundleState,
  };
}
