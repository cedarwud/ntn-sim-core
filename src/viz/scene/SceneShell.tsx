import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';

import { useSceneQueryState } from '@/app/hooks/useSceneQueryState';
import { VISUAL_SCENE_CONFIG } from '@/config/visual-scene.config';
import type { HandoverType } from '@/core/contracts/exposure-v1';
import type { KpiBundle } from '@/core/contracts/kpi-v1';
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

import { useBundleReplayShellState } from './bundle/useBundleReplayShellState';
import { CameraRig } from './CameraRig';
import { SceneConsumerHarnessSurface } from './SceneConsumerHarnessSurface';
import { SceneConsumerStarterPanel } from './SceneConsumerStarterPanel';
import { SceneConsumerProofSurface } from './SceneConsumerProofSurface';
import { SceneConsumerStarterSurface } from './SceneConsumerStarterSurface';
import { BundleReplayLayer, LiveLayer, ReplayLayer, type DataLayerProps } from './SceneDataLayers';
import { LightingRig } from './LightingRig';
import { NTPUScene } from './NTPUScene';
import type { SceneConsumerFacade } from './scene-consumer-facade';
import { buildSceneConsumerStarterExport } from './scene-consumer-starter';
import { UAV } from './UAV';
import { downloadKpiBundle } from './scene-runtime-summaries';
import { useSceneControlSurface } from './shell/useSceneControlSurface';
import { useScenePanelState } from './shell/useScenePanelState';

const HANDOVER_FOCUS_SPEED = 1;

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

  const [sceneFacade, setSceneFacade] = useState<SceneConsumerFacade | null>(null);
  const [hoTypeOverride, setHoTypeOverride] = useState<HandoverType | null>(null);

  const exportKpiFnRef = useRef<(() => KpiBundle | null) | null>(null);

  const setExportKpiFn = useCallback((fn: (() => KpiBundle | null) | null) => {
    exportKpiFnRef.current = fn;
  }, []);

  const isBundleMode = sceneMode === 'modqn-bundle';
  const isNativeReplayMode = sceneMode === 'native-replay';
  const panelState = useScenePanelState(sceneMode);
  const bundleShell = useBundleReplayShellState({
    facade: sceneFacade,
    showBundleMetadata: panelState.showBundleMetadata,
  });
  const clearBundleState = bundleShell.clearBundleState;
  const sceneSnapshot = sceneFacade?.truth.sceneConsumedSnapshot ?? null;
  const sceneStarterExport = useMemo(
    () => buildSceneConsumerStarterExport(sceneFacade),
    [sceneFacade],
  );
  const hudData = useMemo<SimHudProps | null>(() => {
    if (!sceneFacade) return null;
    const { source } = sceneFacade;
    return {
      simTimeSec: source.simTimeSec,
      totalDurationSec: source.totalDurationSec,
      satelliteCount: source.satelliteCount,
      visibleCount: source.visibleCount,
      servingSatId: source.servingSatId,
      handoverCount: source.handoverCount,
      profileId: source.profileId,
      isReady: source.isReady,
      replaySelection: source.replaySelection,
      replayWindowStartSec: source.replayWindowStartSec,
      replayWindowEndSec: source.replayWindowEndSec,
      modeLabel: source.modeLabel ?? undefined,
      truthSourceLabel: source.truthSourceLabel,
      bundleSlotIndex: source.bundleSlotIndex,
      bundleSlotCount: source.bundleSlotCount,
      statusLabel: source.statusLabel,
    };
  }, [sceneFacade]);

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

  const handleExportKpi = useCallback(() => {
    const kpi = exportKpiFnRef.current?.();
    if (!kpi) return;
    downloadKpiBundle(hudData?.profileId ?? 'unknown', kpi);
  }, [hudData?.profileId]);
  const controlPanelProps = useSceneControlSurface({
    speed,
    onSpeedChange: setSpeed,
    effectiveSpeed,
    paused,
    onPauseToggle: togglePaused,
    hoSlowEnabled,
    hoSlowActive: autoSlowActive,
    onHoSlowToggle: toggleHoSlowEnabled,
    showBeams,
    onShowBeamsToggle: toggleShowBeams,
    showLabels,
    onShowLabelsToggle: toggleShowLabels,
    sceneMode,
    onSceneModeChange: setSceneMode,
    panelState,
    onExportKpi: handleExportKpi,
    hoTypeOverride,
    onHoTypeOverrideChange: setHoTypeOverride,
    profileId,
    onProfileChange: setProfileId,
    bundleControlPanelProps: bundleShell.controlPanelProps,
  });

  useEffect(() => {
    setSceneFacade(null);
    exportKpiFnRef.current = null;

    if (!isBundleMode) {
      clearBundleState();
    }
  }, [clearBundleState, isBundleMode, sceneMode]);

  const dataLayerProps: DataLayerProps = {
    onFacadeUpdate: setSceneFacade,
    onExportKpiReady: setExportKpiFn,
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
      {isBundleMode && <BundleTruthHud {...bundleShell.truthHudProps} />}
      {isBundleMode && <ModqnBaselineCompactPanel {...bundleShell.compactPanelProps} />}
      {!isBundleMode && (
        <HandoverExplainabilityPanel
          snapshot={sceneSnapshot}
          profileId={profileId}
          handoverTypeOverride={hoTypeOverride}
        />
      )}
      <SceneConsumerStarterPanel starter={sceneStarterExport} />
      <ValidationProbe visible={validationMode} />
      {!isBundleMode && panelState.showSinrChart && (
        <SinrTimeSeriesOverlay key={`sinr-${sceneMode}`} snapshot={sceneSnapshot} visible />
      )}
      {panelState.showHoLog && (
        <HoEventLogOverlay key={`ho-log-${sceneMode}`} snapshot={sceneSnapshot} visible />
      )}
      {!isBundleMode && panelState.showSinrCdf && (
        <SinrCdfOverlay key={`sinr-cdf-${sceneMode}`} snapshot={sceneSnapshot} visible />
      )}
      {!isBundleMode && panelState.showElevScatter && (
        <SinrElevationScatter key={`sinr-elev-${sceneMode}`} snapshot={sceneSnapshot} visible />
      )}
      {!isBundleMode && (
        <ParameterPanel
          profileId={profileId}
          visible={panelState.showParameters && !panelState.showBaselineResults}
        />
      )}
      {isBundleMode && <ModqnBundleMetadataPanel {...bundleShell.metadataPanelProps} />}
      {!isBundleMode && panelState.showBaselineResults && (
        <BaselineResultPanel
          profileId={profileId}
          handoverTypeOverride={hoTypeOverride}
          onClose={panelState.closeBaselineResults}
        />
      )}
      <SceneConsumerProofSurface facade={sceneFacade} visible={validationMode} />
      <SceneConsumerHarnessSurface facade={sceneFacade} visible={validationMode} />
      <SceneConsumerStarterSurface starter={sceneStarterExport} visible={validationMode} />
      <ControlPanel {...controlPanelProps} />
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
              onFacadeUpdate={setSceneFacade}
              onExportKpiReady={setExportKpiFn}
              onViewModelUpdate={bundleShell.setBundleViewModel}
              onControlsUpdate={bundleShell.setBundleControls}
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
