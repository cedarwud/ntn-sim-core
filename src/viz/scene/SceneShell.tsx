import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { VISUAL_SCENE_CONFIG } from '@/config/visual-scene.config';
import { CameraRig } from './CameraRig';
import { LightingRig } from './LightingRig';
import { LoaderOverlay } from './LoaderOverlay';
import { NTPUScene } from './NTPUScene';
import { UAV } from './UAV';
import { Starfield } from '@/viz/overlays/Starfield';
import { SimHud } from '@/viz/overlays/SimHud';
import type { SimHudProps } from '@/viz/overlays/SimHud';
import { ControlPanel } from '@/viz/overlays/ControlPanel';
import { useSimulation } from '@/app/hooks/useSimulation';
import { useReplay } from '@/app/hooks/useReplay';
import { useSceneQueryState } from '@/app/hooks/useSceneQueryState';
import { useModqnBundleReplay } from '@/app/hooks/useModqnBundleReplay';
import { SatelliteSkyLayer } from '@/viz/satellite/SatelliteSkyLayer';
import { EarthMovingBeamLayer, EarthFixedCellLayer } from '@/viz/beam';
import { BeamInfoOverlay } from '@/viz/overlays/BeamInfoOverlay';
import { HandoverLinkOverlay } from '@/viz/overlays/HandoverLinkOverlay';
import { HandoverExplainabilityPanel } from '@/viz/overlays/HandoverExplainabilityPanel';
import { ValidationProbe } from '@/viz/overlays/ValidationProbe';
import SinrTimeSeriesOverlay from '@/viz/overlays/SinrTimeSeriesOverlay';
import HoEventLogOverlay from '@/viz/overlays/HoEventLogOverlay';
import SinrCdfOverlay from '@/viz/overlays/SinrCdfOverlay';
import SinrElevationScatter from '@/viz/overlays/SinrElevationScatter';
import { BaselineResultPanel } from '@/viz/overlays/BaselineResultPanel';
import { ParameterPanel } from '@/viz/overlays/ParameterPanel';
import { ModqnBundleMetadataPanel } from '@/viz/overlays/ModqnBundleMetadataPanel';
import { usePublishValidationSection } from '@/viz/validation/store';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import type { HandoverType } from '@/core/contracts/exposure-v1';
import type { KpiBundle } from '@/core/contracts/kpi-v1';
import { DEFAULT_INTERACTIVE_PROFILE_ID } from '@/core/profiles/default-profile';
import type { ModqnBundleReplayViewModel } from '@/viz/view-models/modqn-bundle-replay-view-model';

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
const LOW_SINR_THRESHOLD_DB = 5;
const HANDOVER_FOCUS_SPEED = 1;
const MODQN_BUNDLE_PROFILE_ID = 'modqn-bundle-replay';

// ---------------------------------------------------------------------------
// Shared snapshot → validation / HUD helpers
// ---------------------------------------------------------------------------

function buildRuntimeSummary(
  snapshot: SimulationSnapshot | null,
  mode: 'live' | 'replay' | 'modqn-bundle',
  showBeams: boolean,
  showLabels: boolean,
  replaySelection: string | null,
  replayWindowStartSec: number | null,
  replayWindowEndSec: number | null,
  activeProfileId: string = DEFAULT_INTERACTIVE_PROFILE_ID,
  extras?: {
    truthSourceKind?: 'native-live' | 'native-replay' | 'modqn-bundle';
    truthSourceLabel?: string | null;
    bundleSlotIndex?: number | null;
    bundleSlotCount?: number | null;
  },
) {
  const ue = snapshot?.ues[0];
  const lowSinrUeCount = snapshot?.ues.filter(
    (u) => u.sinrDb !== null && u.sinrDb < LOW_SINR_THRESHOLD_DB,
  ).length ?? 0;

  return {
    mode,
    profileId: activeProfileId,
    showBeams,
    showLabels,
    tick: snapshot?.tick ?? null,
    timeSec: snapshot?.timeSec ?? null,
    visibleSatelliteIds: snapshot?.satellites.filter((s) => s.isVisible).map((s) => s.id) ?? [],
    primaryUe: {
      servingSatId: ue?.servingSatId ?? null,
      targetSatId: ue?.targetSatId ?? null,
      secondarySatId: ue?.secondarySatId ?? null,
      continuityState: ue?.continuityState ?? null,
      sinrDb: ue?.sinrDb ?? null,
    },
    lowSinrUeCount,
    lowSinrThresholdDb: LOW_SINR_THRESHOLD_DB,
    dapsPhase: snapshot?.daps?.phase ?? null,
    replaySelection,
    replayWindowStartSec,
    replayWindowEndSec,
    truthSourceKind: extras?.truthSourceKind,
    truthSourceLabel: extras?.truthSourceLabel ?? null,
    bundleSlotIndex: extras?.bundleSlotIndex ?? null,
    bundleSlotCount: extras?.bundleSlotCount ?? null,
  };
}

function buildOrbitParitySummary(
  snapshot: SimulationSnapshot | null,
  mode: 'live' | 'replay' | 'modqn-bundle',
  activeProfileId: string,
) {
  const satellites = (snapshot?.satellites ?? [])
    .map((sat) => ({
      id: sat.id,
      latDeg: sat.latDeg,
      lonDeg: sat.lonDeg,
      altKm: sat.altKm,
      azimuthDeg: sat.azimuthDeg,
      elevationDeg: sat.elevationDeg,
      rangeKm: sat.rangeKm,
      isVisible: sat.isVisible,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    present: snapshot !== null,
    mode,
    profileId: activeProfileId,
    timeSec: snapshot?.timeSec ?? null,
    sampleCount: satellites.length,
    satellites,
  };
}

// ---------------------------------------------------------------------------
// Beam + overlay composition (inside Canvas)
// ---------------------------------------------------------------------------

function BeamLayers({ snapshot, showBeams, isBhProfile }: { snapshot: SimulationSnapshot | null; showBeams: boolean; isBhProfile: boolean }) {
  if (!showBeams) return null;

  return (
    <>
      <EarthMovingBeamLayer snapshot={snapshot} visible={showBeams} />
      <BeamInfoOverlay snapshot={snapshot} visible={showBeams} />
      <HandoverLinkOverlay snapshot={snapshot} visible={showBeams} />
      {isBhProfile && <EarthFixedCellLayer snapshot={snapshot} visible={showBeams} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Live / Replay layers
// ---------------------------------------------------------------------------

interface DataLayerProps {
  onStatsUpdate: (data: SimHudProps) => void;
  onSnapshotUpdate: (snapshot: SimulationSnapshot | null) => void;
  onExportKpiReady: (fn: (() => KpiBundle | null) | null) => void;
  speed: number;
  paused: boolean;
  showBeams: boolean;
  showLabels: boolean;
  profileId: string;
  handoverTypeOverride?: HandoverType | null;
}

function LiveLayer({ onStatsUpdate, onSnapshotUpdate, onExportKpiReady, speed, paused, showBeams, showLabels, profileId, handoverTypeOverride }: DataLayerProps) {
  const result = useSimulation({ profileId, speed, paused, handoverTypeOverride });

  const summary = useMemo(
    () => buildRuntimeSummary(result.snapshot, 'live', showBeams, showLabels, null, null, null, profileId),
    [result.snapshot, showBeams, showLabels, profileId],
  );
  const orbitParity = useMemo(
    () => buildOrbitParitySummary(result.snapshot, 'live', profileId),
    [result.snapshot, profileId],
  );
  usePublishValidationSection('runtime', summary);
  usePublishValidationSection('orbitParity', orbitParity);

  useEffect(() => { onSnapshotUpdate(result.snapshot); }, [result.snapshot]);
  useEffect(() => { onExportKpiReady(result.exportKpi); }, [result.exportKpi]);

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
  }, [result.snapshot]);

  const isBhProfile = profileId.startsWith('bh-');
  return (
    <>
      <SatelliteSkyLayer snapshot={result.snapshot} showLabels={showLabels} />
      <BeamLayers snapshot={result.snapshot} showBeams={showBeams} isBhProfile={isBhProfile} />
    </>
  );
}

function ReplayLayer({ onStatsUpdate, onSnapshotUpdate, onExportKpiReady, speed, paused, showBeams, showLabels, profileId, replaySeekSec }: DataLayerProps & { replaySeekSec: number | null }) {
  const result = useReplay({ profileId, speed, paused, initialSeekSec: replaySeekSec });

  useEffect(() => { onSnapshotUpdate(result.snapshot); }, [result.snapshot]);

  const summary = useMemo(
    () => buildRuntimeSummary(
      result.snapshot, 'replay', showBeams, showLabels,
      result.selectionReason,
      result.replayManifest?.windowStartSec ?? null,
      result.replayManifest?.windowEndSec ?? null,
      profileId,
    ),
    [result.snapshot, result.selectionReason, result.replayManifest, showBeams, showLabels, profileId],
  );
  const orbitParity = useMemo(
    () => buildOrbitParitySummary(result.snapshot, 'replay', profileId),
    [result.snapshot, profileId],
  );
  usePublishValidationSection('runtime', summary);
  usePublishValidationSection('orbitParity', orbitParity);

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
  }, [result.snapshot]);

  const isBhProfile = profileId.startsWith('bh-');
  return (
    <>
      <SatelliteSkyLayer snapshot={result.snapshot} showLabels={showLabels} />
      <BeamLayers snapshot={result.snapshot} showBeams={showBeams} isBhProfile={isBhProfile} />
    </>
  );
}

function BundleReplayLayer({
  onStatsUpdate,
  onSnapshotUpdate,
  onExportKpiReady,
  onViewModelUpdate,
  onControlsUpdate,
  speed,
  paused,
  showBeams,
  showLabels,
}: {
  onStatsUpdate: (data: SimHudProps) => void;
  onSnapshotUpdate: (snapshot: SimulationSnapshot | null) => void;
  onExportKpiReady: (fn: (() => KpiBundle | null) | null) => void;
  onViewModelUpdate: (viewModel: ModqnBundleReplayViewModel | null) => void;
  onControlsUpdate: (controls: { stepBackward: () => void; stepForward: () => void } | null) => void;
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

  useEffect(() => { onSnapshotUpdate(result.snapshot); }, [result.snapshot]);
  useEffect(() => { onExportKpiReady(null); }, [onExportKpiReady]);
  useEffect(() => { onViewModelUpdate(result.viewModel); }, [onViewModelUpdate, result.viewModel]);
  useEffect(() => {
    onControlsUpdate({
      stepBackward: result.stepBackward,
      stepForward: result.stepForward,
    });
    return () => onControlsUpdate(null);
  }, [onControlsUpdate, result.stepBackward, result.stepForward]);

  const summary = useMemo(
    () => buildRuntimeSummary(
      result.snapshot,
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
      },
    ),
    [
      bundleSummary?.replayTruthMode,
      result.currentSlotIndex,
      result.slotCount,
      result.snapshot,
      result.sourceLabel,
      showBeams,
      showLabels,
    ],
  );
  const orbitParity = useMemo(
    () => buildOrbitParitySummary(result.snapshot, 'modqn-bundle', MODQN_BUNDLE_PROFILE_ID),
    [result.snapshot],
  );
  usePublishValidationSection('runtime', summary);
  usePublishValidationSection('orbitParity', orbitParity);

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
    <>
      <SatelliteSkyLayer snapshot={result.snapshot} showLabels={showLabels} />
      <BeamLayers snapshot={result.snapshot} showBeams={showBeams} isBhProfile={false} />
    </>
  );
}

// ---------------------------------------------------------------------------
// SceneShell — top-level orchestrator
// ---------------------------------------------------------------------------

export function SceneShell() {
  const {
    speed, paused, hoSlowEnabled, showBeams, showLabels, sceneMode, replaySeekSec, validationMode, profileId,
    setSpeed, togglePaused, toggleHoSlowEnabled, toggleShowBeams, toggleShowLabels, setSceneMode, setProfileId,
  } = useSceneQueryState();
  const [hudData, setHudData] = useState<SimHudProps | null>(null);
  const [sceneSnapshot, setSceneSnapshot] = useState<SimulationSnapshot | null>(null);
  const [bundleViewModel, setBundleViewModel] = useState<ModqnBundleReplayViewModel | null>(null);
  const [bundleControls, setBundleControls] = useState<{ stepBackward: () => void; stepForward: () => void } | null>(null);
  const [showSinrChart, setShowSinrChart] = useState(true);
  const [showHoLog, setShowHoLog] = useState(false);
  const [showSinrCdf, setShowSinrCdf] = useState(false);
  const [showElevScatter, setShowElevScatter] = useState(false);
  const [showBaselineResults, setShowBaselineResults] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [showBundleMetadata, setShowBundleMetadata] = useState(true);
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
    const profileId = hudData?.profileId ?? 'unknown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // JSON download
    const jsonStr = JSON.stringify({ profile: profileId, kpi }, null, 2);
    downloadFile(`kpi-${profileId}-${timestamp}.json`, jsonStr, 'application/json');

    // CSV download
    const csvHeader = Object.keys(kpi).join(',');
    const csvRow = Object.values(kpi).join(',');
    downloadFile(`kpi-${profileId}-${timestamp}.csv`, `${csvHeader}\n${csvRow}`, 'text/csv');
  }, [hudData?.profileId]);

  useEffect(() => {
    const previousSceneMode = previousSceneModeRef.current;
    previousSceneModeRef.current = sceneMode;
    setSceneSnapshot(null);
    setHudData(null);
    exportKpiFnRef.current = null;
    if (isBundleMode) {
      setShowBaselineResults(false);
      setShowParameters(false);
      setShowSinrChart(false);
      setShowSinrCdf(false);
      setShowElevScatter(false);
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
    speed: effectiveSpeed,
    paused,
    showBeams,
    showLabels,
    profileId,
    handoverTypeOverride: hoTypeOverride,
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: VISUAL_SCENE_CONFIG.background.gradient, overflow: 'hidden' }}>
      <Starfield starCount={180} />
      {hudData && <SimHud {...hudData} />}
      {!isBundleMode && (
        <HandoverExplainabilityPanel
          snapshot={sceneSnapshot}
          profileId={profileId}
          handoverTypeOverride={hoTypeOverride}
        />
      )}
      <ValidationProbe visible={validationMode} />
      {!isBundleMode && showSinrChart && <SinrTimeSeriesOverlay key={`sinr-${sceneMode}`} snapshot={sceneSnapshot} visible />}
      {showHoLog && <HoEventLogOverlay key={`ho-log-${sceneMode}`} snapshot={sceneSnapshot} visible />}
      {!isBundleMode && showSinrCdf && <SinrCdfOverlay key={`sinr-cdf-${sceneMode}`} snapshot={sceneSnapshot} visible />}
      {!isBundleMode && showElevScatter && <SinrElevationScatter key={`sinr-elev-${sceneMode}`} snapshot={sceneSnapshot} visible />}
      {!isBundleMode && <ParameterPanel profileId={profileId} visible={showParameters && !showBaselineResults} />}
      {isBundleMode && (
        <ModqnBundleMetadataPanel
          visible={showBundleMetadata}
          bundleSummary={bundleSummary}
          trainingEvalSummary={bundleTrainingEvalSummary}
          assumptions={bundleAssumptions}
          provenanceLegend={bundleProvenanceLegend}
          provenanceFields={bundleProvenanceFields}
        />
      )}
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
        onShowSinrChartToggle={() => setShowSinrChart((v) => !v)}
        showHoLog={showHoLog}
        onShowHoLogToggle={() => setShowHoLog((v) => !v)}
        showSinrCdf={showSinrCdf}
        onShowSinrCdfToggle={() => setShowSinrCdf((v) => !v)}
        showElevScatter={showElevScatter}
        onShowElevScatterToggle={() => setShowElevScatter((v) => !v)}
        showParameters={showParameters}
        onShowParametersToggle={() => setShowParameters((v) => !v)}
        showBundleMetadata={showBundleMetadata}
        onShowBundleMetadataToggle={() => setShowBundleMetadata((v) => !v)}
        onExportKpi={isBundleMode ? undefined : handleExportKpi}
        onOpenBaselineResults={isBundleMode ? undefined : () => setShowBaselineResults(true)}
        hoTypeOverride={hoTypeOverride}
        onHoTypeOverrideChange={setHoTypeOverride}
        profileId={profileId}
        onProfileChange={setProfileId}
        bundleSourceLabel={hudData?.truthSourceLabel ?? bundleSummary?.sourceLabel ?? 'sample-bundle-v1'}
        bundleCurrentSlotIndex={hudData?.bundleSlotIndex ?? null}
        bundleSlotCount={hudData?.bundleSlotCount ?? bundleSummary?.slotCount ?? 0}
        onBundleStepBackward={bundleControls?.stepBackward}
        onBundleStepForward={bundleControls?.stepForward}
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
        <Suspense fallback={<LoaderOverlay />}><NTPUScene /></Suspense>
        <Suspense fallback={null}><UAV /></Suspense>
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
