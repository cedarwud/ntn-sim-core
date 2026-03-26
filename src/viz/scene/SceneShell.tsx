import { Suspense, useState, useEffect, useMemo } from 'react';
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
import { SatelliteSkyLayer } from '@/viz/satellite/SatelliteSkyLayer';
import { EarthMovingBeamLayer, EarthFixedCellLayer } from '@/viz/beam';
import { BeamInfoOverlay } from '@/viz/overlays/BeamInfoOverlay';
import { HandoverLinkOverlay } from '@/viz/overlays/HandoverLinkOverlay';
import { BhExplainabilityPanel } from '@/viz/overlays/BhExplainabilityPanel';
import { ValidationProbe } from '@/viz/overlays/ValidationProbe';
import { usePublishValidationSection } from '@/viz/validation/store';
import type { SimulationSnapshot } from '@/core/common/types';

const PROFILE_ID = 'hobs-multibeam-baseline';
const LOW_SINR_THRESHOLD_DB = 5;

// ---------------------------------------------------------------------------
// Shared snapshot → validation / HUD helpers
// ---------------------------------------------------------------------------

function buildRuntimeSummary(
  snapshot: SimulationSnapshot | null,
  mode: 'live' | 'replay',
  showBeams: boolean,
  showLabels: boolean,
  replaySelection: string | null,
  replayWindowStartSec: number | null,
  replayWindowEndSec: number | null,
) {
  const ue = snapshot?.ues[0];
  const lowSinrUeCount = snapshot?.ues.filter(
    (u) => u.sinrDb !== null && u.sinrDb < LOW_SINR_THRESHOLD_DB,
  ).length ?? 0;

  return {
    mode,
    profileId: PROFILE_ID,
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
  };
}

// ---------------------------------------------------------------------------
// Beam + overlay composition (inside Canvas)
// ---------------------------------------------------------------------------

function BeamLayers({ snapshot, showBeams }: { snapshot: SimulationSnapshot | null; showBeams: boolean }) {
  return (
    <>
      <EarthMovingBeamLayer snapshot={snapshot} visible={showBeams} />
      <BeamInfoOverlay snapshot={snapshot} visible={showBeams} />
      <HandoverLinkOverlay snapshot={snapshot} visible={showBeams} />
      <EarthFixedCellLayer snapshot={snapshot} visible={showBeams} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Live / Replay layers
// ---------------------------------------------------------------------------

interface DataLayerProps {
  onStatsUpdate: (data: SimHudProps) => void;
  speed: number;
  paused: boolean;
  showBeams: boolean;
  showLabels: boolean;
}

function LiveLayer({ onStatsUpdate, speed, paused, showBeams, showLabels }: DataLayerProps) {
  const result = useSimulation({ profileId: PROFILE_ID, speed, paused });

  const summary = useMemo(
    () => buildRuntimeSummary(result.snapshot, 'live', showBeams, showLabels, null, null, null),
    [result.snapshot, showBeams, showLabels],
  );
  usePublishValidationSection('runtime', summary);

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

  return (
    <>
      <SatelliteSkyLayer snapshot={result.snapshot} showLabels={showLabels} />
      <BeamLayers snapshot={result.snapshot} showBeams={showBeams} />
    </>
  );
}

function ReplayLayer({ onStatsUpdate, speed, paused, showBeams, showLabels, replaySeekSec }: DataLayerProps & { replaySeekSec: number | null }) {
  const result = useReplay({ profileId: PROFILE_ID, speed, paused, initialSeekSec: replaySeekSec });

  const summary = useMemo(
    () => buildRuntimeSummary(
      result.snapshot, 'replay', showBeams, showLabels,
      result.selectionReason,
      result.replayManifest?.windowStartSec ?? null,
      result.replayManifest?.windowEndSec ?? null,
    ),
    [result.snapshot, result.selectionReason, result.replayManifest, showBeams, showLabels],
  );
  usePublishValidationSection('runtime', summary);

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

  return (
    <>
      <SatelliteSkyLayer snapshot={result.snapshot} showLabels={showLabels} />
      <BeamLayers snapshot={result.snapshot} showBeams={showBeams} />
    </>
  );
}

// ---------------------------------------------------------------------------
// SceneShell — top-level orchestrator
// ---------------------------------------------------------------------------

export function SceneShell() {
  const {
    speed, paused, showBeams, showLabels, replayMode, replaySeekSec, validationMode,
    setSpeed, togglePaused, toggleShowBeams, toggleShowLabels, toggleReplayMode,
  } = useSceneQueryState();
  const [hudData, setHudData] = useState<SimHudProps | null>(null);

  const dataLayerProps: DataLayerProps = { onStatsUpdate: setHudData, speed, paused, showBeams, showLabels };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: VISUAL_SCENE_CONFIG.background.gradient, overflow: 'hidden' }}>
      <Starfield starCount={180} />
      {hudData && <SimHud {...hudData} />}
      <BhExplainabilityPanel />
      <ValidationProbe visible={validationMode} />
      <ControlPanel
        speed={speed}
        onSpeedChange={setSpeed}
        paused={paused}
        onPauseToggle={togglePaused}
        showBeams={showBeams}
        onShowBeamsToggle={toggleShowBeams}
        showLabels={showLabels}
        onShowLabelsToggle={toggleShowLabels}
        replayMode={replayMode}
        onReplayToggle={toggleReplayMode}
      />
      <Canvas
        shadows
        gl={{
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          alpha: true,
          powerPreference: 'high-performance',
          antialias: true,
        }}
      >
        <CameraRig />
        <LightingRig />
        <Suspense fallback={<LoaderOverlay />}><NTPUScene /></Suspense>
        <Suspense fallback={null}><UAV /></Suspense>
        <Suspense fallback={null}>
          {replayMode
            ? <ReplayLayer {...dataLayerProps} replaySeekSec={replaySeekSec} />
            : <LiveLayer {...dataLayerProps} />}
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
