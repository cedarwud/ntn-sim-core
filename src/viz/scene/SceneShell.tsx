import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';

import { useSceneQueryState } from '@/app/hooks/useSceneQueryState';
import { VISUAL_SCENE_CONFIG } from '@/config/visual-scene.config';
import type { HandoverType } from '@/core/contracts/exposure-v1';
import type { KpiBundle } from '@/core/contracts/kpi-v1';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import { BaselineResultPanel } from '@/viz/overlays/BaselineResultPanel';
import { ControlPanel } from '@/viz/overlays/ControlPanel';
import { HandoverExplainabilityPanel } from '@/viz/overlays/HandoverExplainabilityPanel';
import { ModqnBaselineCompactPanel } from '@/viz/overlays/ModqnBaselineCompactPanel';
import HoEventLogOverlay from '@/viz/overlays/HoEventLogOverlay';
import { LoaderOverlay } from '@/viz/scene/LoaderOverlay';
import { BundleTruthHud, SimHud, type SimHudProps } from '@/viz/overlays/SimHud';
import { ModqnBundleMetadataPanel } from '@/viz/overlays/ModqnBundleMetadataPanel';
import { ParameterPanel } from '@/viz/overlays/ParameterPanel';
import SinrCdfOverlay from '@/viz/overlays/SinrCdfOverlay';
import SinrElevationScatter from '@/viz/overlays/SinrElevationScatter';
import SinrTimeSeriesOverlay from '@/viz/overlays/SinrTimeSeriesOverlay';
import { Starfield } from '@/viz/overlays/Starfield';
import { ValidationProbe } from '@/viz/overlays/ValidationProbe';
import type { BeamPresentationFrame } from '@/viz/presentation';
import type {
  ModqnBundleExplainabilityView,
  ModqnBundleReplayViewModel,
  ModqnDashboardKpiView,
  ModqnPolicyDiagnosticsDisclosureView,
  ModqnReplayTrendPointView,
} from '@/viz/view-models/modqn-bundle-replay-view-model';

import { CameraRig } from './CameraRig';
import { BundleReplayLayer, LiveLayer, ReplayLayer, type DataLayerProps } from './SceneDataLayers';
import { LightingRig } from './LightingRig';
import { NTPUScene } from './NTPUScene';
import { UAV } from './UAV';
import { downloadKpiBundle } from './scene-runtime-summaries';

const HANDOVER_FOCUS_SPEED = 1;

type BundleReplayControls = {
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
};

export function SceneShell() {
  const {
    speed,
    paused,
    hoSlowEnabled,
    showBeams,
    showLabels,
    sceneMode,
    replaySeekSec,
    validationMode,
    profileId,
    setSpeed,
    togglePaused,
    toggleHoSlowEnabled,
    toggleShowBeams,
    toggleShowLabels,
    setSceneMode,
    setProfileId,
  } = useSceneQueryState();

  const [hudData, setHudData] = useState<SimHudProps | null>(null);
  const [sceneSnapshot, setSceneSnapshot] = useState<SimulationSnapshot | null>(null);
  const [presentationFrame, setPresentationFrame] = useState<BeamPresentationFrame | null>(null);
  const [bundleViewModel, setBundleViewModel] = useState<ModqnBundleReplayViewModel | null>(null);
  const [bundleControls, setBundleControls] = useState<BundleReplayControls | null>(null);
  const [showSinrChart, setShowSinrChart] = useState(true);
  const [showHoLog, setShowHoLog] = useState(false);
  const [showSinrCdf, setShowSinrCdf] = useState(false);
  const [showElevScatter, setShowElevScatter] = useState(false);
  const [showBaselineResults, setShowBaselineResults] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [showBundleMetadata, setShowBundleMetadata] = useState(false);
  const [hoTypeOverride, setHoTypeOverride] = useState<HandoverType | null>(null);

  const previousSceneModeRef = useRef(sceneMode);
  const nativePanelStateRef = useRef({
    showSinrChart,
    showSinrCdf,
    showElevScatter,
    showBaselineResults,
    showParameters,
  });
  const exportKpiFnRef = useRef<(() => KpiBundle | null) | null>(null);

  const setExportKpiFn = useCallback((fn: (() => KpiBundle | null) | null) => {
    exportKpiFnRef.current = fn;
  }, []);

  const isBundleMode = sceneMode === 'modqn-bundle';
  const isNativeReplayMode = sceneMode === 'native-replay';
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
  const bundleDecisionStory = useMemo(() => {
    if (!bundleViewModel) return null;
    const slotIndex = hudData?.bundleSlotIndex;
    if (slotIndex === null || slotIndex === undefined) {
      return bundleViewModel.getDecisionStory(0);
    }
    const frameIndex = Math.max(0, Math.min(slotIndex - 1, bundleViewModel.getFrameCount() - 1));
    return bundleViewModel.getDecisionStory(frameIndex);
  }, [bundleViewModel, hudData?.bundleSlotIndex]);
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
  const bundlePolicyDiagnosticsDisclosure = useMemo<ModqnPolicyDiagnosticsDisclosureView | null>(
    () => bundleViewModel?.getPolicyDiagnosticsDisclosure() ?? null,
    [bundleViewModel],
  );
  const bundleFrameIndex = useMemo(() => {
    if (!bundleViewModel) return 0;
    const slotIndex = hudData?.bundleSlotIndex;
    if (slotIndex === null || slotIndex === undefined) return 0;
    return Math.max(0, Math.min(slotIndex - 1, bundleViewModel.getFrameCount() - 1));
  }, [bundleViewModel, hudData?.bundleSlotIndex]);
  const bundleReplayTruth = useMemo(
    () => bundleViewModel?.getReplayTruth(bundleFrameIndex) ?? null,
    [bundleFrameIndex, bundleViewModel],
  );
  const bundleDashboardKpis = useMemo<ModqnDashboardKpiView | null>(
    () => bundleViewModel?.getDashboardKpis(bundleFrameIndex) ?? null,
    [bundleFrameIndex, bundleViewModel],
  );
  const bundleReplayTrendSeries = useMemo<ModqnReplayTrendPointView[]>(
    () => bundleViewModel?.getReplayTrendSeries() ?? [],
    [bundleViewModel],
  );
  const bundleExplainability = useMemo<ModqnBundleExplainabilityView | null>(
    () => bundleViewModel?.getExplainability(bundleFrameIndex) ?? null,
    [bundleFrameIndex, bundleViewModel],
  );
  const bundleSourceLabel = bundleControls?.sourceLabel
    ?? hudData?.truthSourceLabel
    ?? bundleSummary?.sourceLabel
    ?? 'sample-bundle-v1';
  const bundleCurrentSlotIndex = bundleReplayTruth?.currentSlotIndex ?? hudData?.bundleSlotIndex ?? null;
  const bundleSlotCount = bundleReplayTruth?.slotCount ?? hudData?.bundleSlotCount ?? bundleSummary?.slotCount ?? null;
  const bundleHandoverCount = bundleReplayTruth?.cumulativeHandovers ?? hudData?.handoverCount ?? 0;
  const bundleContinuityNarrative = presentationFrame?.continuityNarrative ?? null;
  const bundleCompactPanelProps = {
    visible: true,
    snapshot: sceneSnapshot,
    bundleSummary,
    trainingEvalSummary: bundleTrainingEvalSummary,
    trainingEvidence: bundleTrainingEvidence,
    decisionStory: bundleDecisionStory,
    sourceLabel: bundleSourceLabel,
    currentSlotIndex: bundleCurrentSlotIndex,
    slotCount: bundleSlotCount,
    handoverCount: bundleHandoverCount,
    assumptionCount: bundleAssumptions.length,
    dashboardKpis: bundleDashboardKpis,
    provenanceLegend: bundleProvenanceLegend,
    provenanceFields: bundleProvenanceFields,
    replayTrendSeries: bundleReplayTrendSeries,
    explainability: bundleExplainability,
  };
  const bundleMetadataPanelProps = {
    visible: showBundleMetadata,
    bundleSummary,
    trainingEvalSummary: bundleTrainingEvalSummary,
    assumptions: bundleAssumptions,
    provenanceLegend: bundleProvenanceLegend,
    provenanceFields: bundleProvenanceFields,
    policyDiagnosticsDisclosure: bundlePolicyDiagnosticsDisclosure,
  };
  const bundleControlPanelProps = {
    bundleLoadError: bundleControls?.error ?? null,
    bundleIsLoading: bundleControls?.isLoading ?? false,
    bundleLoadState: bundleControls?.loadState ?? 'boot-loading-sample',
    bundleSourceKind: bundleControls?.sourceKind ?? 'sample',
    bundleSourceLabel,
    bundleCurrentSlotIndex,
    bundleSlotCount: bundleSlotCount ?? 0,
    onLoadExternalBundleDirectory: bundleControls?.loadExternalDirectory,
    onResetBundleSource: bundleControls?.resetToSample,
    onBundleStepBackward: bundleControls?.stepBackward,
    onBundleStepForward: bundleControls?.stepForward,
  };

  const primaryUe = sceneSnapshot?.ues[0];
  const autoSlowActive = !isBundleMode && Boolean(
    primaryUe?.targetSatId
    || primaryUe?.secondarySatId
    || primaryUe?.continuityState === 'prepared'
    || primaryUe?.continuityState === 'dual-active',
  );
  const effectiveSpeed = hoSlowEnabled && autoSlowActive
    ? Math.min(speed, HANDOVER_FOCUS_SPEED)
    : speed;

  useEffect(() => {
    if (isBundleMode || previousSceneModeRef.current === 'modqn-bundle') return;
    nativePanelStateRef.current = {
      showSinrChart,
      showSinrCdf,
      showElevScatter,
      showBaselineResults,
      showParameters,
    };
  }, [
    isBundleMode,
    showBaselineResults,
    showElevScatter,
    showParameters,
    showSinrCdf,
    showSinrChart,
  ]);

  const handleExportKpi = useCallback(() => {
    const kpi = exportKpiFnRef.current?.();
    if (!kpi) return;
    downloadKpiBundle(hudData?.profileId ?? 'unknown', kpi);
  }, [hudData?.profileId]);

  useEffect(() => {
    const previousSceneMode = previousSceneModeRef.current;
    previousSceneModeRef.current = sceneMode;
    setSceneSnapshot(null);
    setPresentationFrame(null);
    setHudData(null);
    exportKpiFnRef.current = null;

    if (isBundleMode) {
      setShowBaselineResults(false);
      setShowParameters(false);
      setShowSinrChart(false);
      setShowSinrCdf(false);
      setShowElevScatter(false);
      setShowBundleMetadata(false);
      return;
    }

    setBundleViewModel(null);
    setBundleControls(null);

    if (previousSceneMode === 'modqn-bundle') {
      const previousNativePanels = nativePanelStateRef.current;
      setShowBaselineResults(previousNativePanels.showBaselineResults);
      setShowParameters(previousNativePanels.showParameters);
      setShowSinrChart(previousNativePanels.showSinrChart);
      setShowSinrCdf(previousNativePanels.showSinrCdf);
      setShowElevScatter(previousNativePanels.showElevScatter);
    }
  }, [isBundleMode, sceneMode]);

  const dataLayerProps: DataLayerProps = {
    onStatsUpdate: setHudData,
    onSnapshotUpdate: setSceneSnapshot,
    onExportKpiReady: setExportKpiFn,
    onPresentationFrameUpdate: setPresentationFrame,
    speed: effectiveSpeed,
    paused,
    showBeams,
    showLabels,
    profileId,
    handoverTypeOverride: hoTypeOverride,
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: VISUAL_SCENE_CONFIG.background.gradient,
        overflow: 'hidden',
      }}
    >
      <Starfield starCount={180} />
      {hudData && !isBundleMode && <SimHud {...hudData} />}
      {isBundleMode && (
        <BundleTruthHud
          currentSlotIndex={bundleCurrentSlotIndex}
          slotCount={bundleSlotCount}
          sourceLabel={bundleSourceLabel}
          servingSatId={bundleReplayTruth?.servingSatId ?? sceneSnapshot?.ues[0]?.servingSatId ?? null}
          servingBeamId={bundleReplayTruth?.servingBeamId ?? sceneSnapshot?.ues[0]?.servingBeamId ?? null}
          handoverCount={bundleHandoverCount}
          handoverKind={bundleReplayTruth?.handoverKind ?? null}
          continuityNarrative={bundleContinuityNarrative}
        />
      )}
      {isBundleMode && <ModqnBaselineCompactPanel {...bundleCompactPanelProps} />}
      {!isBundleMode && (
        <HandoverExplainabilityPanel
          snapshot={sceneSnapshot}
          profileId={profileId}
          handoverTypeOverride={hoTypeOverride}
        />
      )}
      <ValidationProbe visible={validationMode} />
      {!isBundleMode && showSinrChart && (
        <SinrTimeSeriesOverlay key={`sinr-${sceneMode}`} snapshot={sceneSnapshot} visible />
      )}
      {showHoLog && (
        <HoEventLogOverlay key={`ho-log-${sceneMode}`} snapshot={sceneSnapshot} visible />
      )}
      {!isBundleMode && showSinrCdf && (
        <SinrCdfOverlay key={`sinr-cdf-${sceneMode}`} snapshot={sceneSnapshot} visible />
      )}
      {!isBundleMode && showElevScatter && (
        <SinrElevationScatter key={`sinr-elev-${sceneMode}`} snapshot={sceneSnapshot} visible />
      )}
      {!isBundleMode && (
        <ParameterPanel
          profileId={profileId}
          visible={showParameters && !showBaselineResults}
        />
      )}
      {isBundleMode && <ModqnBundleMetadataPanel {...bundleMetadataPanelProps} />}
      {!isBundleMode && showBaselineResults && (
        <BaselineResultPanel
          profileId={profileId}
          handoverTypeOverride={hoTypeOverride}
          onClose={() => setShowBaselineResults(false)}
        />
      )}
      <ControlPanel
        speed={speed}
        onSpeedChange={setSpeed}
        effectiveSpeed={effectiveSpeed}
        paused={paused}
        onPauseToggle={togglePaused}
        hoSlowEnabled={hoSlowEnabled}
        hoSlowActive={autoSlowActive}
        onHoSlowToggle={toggleHoSlowEnabled}
        showBeams={showBeams}
        onShowBeamsToggle={toggleShowBeams}
        showLabels={showLabels}
        onShowLabelsToggle={toggleShowLabels}
        sceneMode={sceneMode}
        onSceneModeChange={setSceneMode}
        showSinrChart={showSinrChart}
        onShowSinrChartToggle={() => setShowSinrChart((value) => !value)}
        showHoLog={showHoLog}
        onShowHoLogToggle={() => setShowHoLog((value) => !value)}
        showSinrCdf={showSinrCdf}
        onShowSinrCdfToggle={() => setShowSinrCdf((value) => !value)}
        showElevScatter={showElevScatter}
        onShowElevScatterToggle={() => setShowElevScatter((value) => !value)}
        showParameters={showParameters}
        onShowParametersToggle={() => setShowParameters((value) => !value)}
        showBundleMetadata={showBundleMetadata}
        onShowBundleMetadataToggle={() => setShowBundleMetadata((value) => !value)}
        onExportKpi={isBundleMode ? undefined : handleExportKpi}
        onOpenBaselineResults={isBundleMode ? undefined : () => setShowBaselineResults(true)}
        hoTypeOverride={hoTypeOverride}
        onHoTypeOverrideChange={setHoTypeOverride}
        profileId={profileId}
        onProfileChange={setProfileId}
        {...bundleControlPanelProps}
      />
      <Canvas
        frameloop="demand"
        dpr={1}
        gl={{
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          alpha: true,
          powerPreference: 'high-performance',
          antialias: false,
        }}
      >
        <CameraRig />
        <LightingRig />
        <Suspense fallback={<LoaderOverlay />}>
          <NTPUScene />
        </Suspense>
        <Suspense fallback={null}>
          <UAV />
        </Suspense>
        <Suspense fallback={null}>
          {sceneMode === 'modqn-bundle' ? (
            <BundleReplayLayer
              onStatsUpdate={setHudData}
              onSnapshotUpdate={setSceneSnapshot}
              onExportKpiReady={setExportKpiFn}
              onViewModelUpdate={setBundleViewModel}
              onControlsUpdate={setBundleControls}
              speed={effectiveSpeed}
              paused={paused}
              showBeams={showBeams}
              showLabels={showLabels}
            />
          ) : isNativeReplayMode ? (
            <ReplayLayer {...dataLayerProps} replaySeekSec={replaySeekSec} />
          ) : (
            <LiveLayer {...dataLayerProps} />
          )}
        </Suspense>
        {VISUAL_SCENE_CONFIG.debug.showHelpers && (
          <>
            <gridHelper args={[1000, 50, '#888888', '#444444']} />
            <axesHelper args={[100]} />
          </>
        )}
      </Canvas>
    </div>
  );
}
