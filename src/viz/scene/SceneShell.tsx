import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
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
import type { ViewMode } from '@/viz/overlays/ControlPanel';
import { useSimulation } from '@/app/hooks/useSimulation';
import { useReplay } from '@/app/hooks/useReplay';
import { SatelliteSkyLayer } from '@/viz/satellite/SatelliteSkyLayer';
import { EarthMovingBeamLayer, EarthFixedCellLayer, LeoParityBeamLayer } from '@/viz/beam';
import { BeamInfoOverlay } from '@/viz/overlays/BeamInfoOverlay';
import { HandoverLinkOverlay } from '@/viz/overlays/HandoverLinkOverlay';
import { LeoParityBeamOverlay } from '@/viz/overlays/LeoParityBeamOverlay';
import { LeoParityHandoverLinks } from '@/viz/overlays/LeoParityHandoverLinks';
import { BhExplainabilityPanel } from '@/viz/overlays/BhExplainabilityPanel';
import { ValidationProbe } from '@/viz/overlays/ValidationProbe';
import { usePublishValidationSection } from '@/viz/validation/store';

const LOW_SINR_EXPLAINABILITY_THRESHOLD_DB = 5;

interface SceneQueryBootstrap {
  profileId: string;
  viewMode: ViewMode;
  speed: number;
  paused: boolean;
  showBeams: boolean;
  showLabels: boolean;
  replayMode: boolean;
  replaySeekSec: number | null;
  validationMode: boolean;
}

function normalizeViewMode(value: string | null): ViewMode {
  return value === 'leo-parity' ? 'leo-parity' : 'default';
}

function readSceneQueryBootstrap(): SceneQueryBootstrap {
  if (typeof window === 'undefined') {
    return {
      profileId: 'case9-access-baseline',
      viewMode: 'default',
      speed: 10,
      paused: false,
      showBeams: true,
      showLabels: true,
      replayMode: false,
      replaySeekSec: null,
      validationMode: false,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const speedParam = Number(params.get('speed'));
  const replaySeekSecParam = Number(params.get('replaySeekSec'));

  return {
    profileId: params.get('profile') ?? 'case9-access-baseline',
    viewMode: normalizeViewMode(params.get('view') ?? params.get('presenter')),
    speed: Number.isFinite(speedParam) && speedParam > 0 ? speedParam : 10,
    paused: params.get('paused') === '1',
    showBeams: params.get('showBeams') !== '0',
    showLabels: params.get('showLabels') !== '0',
    replayMode: params.get('replay') === '1',
    replaySeekSec: Number.isFinite(replaySeekSecParam) ? replaySeekSecParam : null,
    validationMode: params.get('validate') === '1',
  };
}

function syncSceneQuery({
  profileId,
  viewMode,
  speed,
  paused,
  showBeams,
  showLabels,
  replayMode,
  replaySeekSec,
  validationMode,
}: SceneQueryBootstrap) {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);

  params.set('profile', profileId);
  params.set('view', viewMode);
  params.set('speed', String(speed));

  if (paused) params.set('paused', '1');
  else params.delete('paused');

  if (!showBeams) params.set('showBeams', '0');
  else params.delete('showBeams');

  if (!showLabels) params.set('showLabels', '0');
  else params.delete('showLabels');

  if (replayMode) params.set('replay', '1');
  else params.delete('replay');

  if (replaySeekSec !== null && Number.isFinite(replaySeekSec)) params.set('replaySeekSec', String(replaySeekSec));
  else params.delete('replaySeekSec');

  if (validationMode) params.set('validate', '1');
  else params.delete('validate');

  params.delete('presenter');

  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', next);
}

// ---------------------------------------------------------------------------
// SimulationLayer — lives inside Canvas
// ---------------------------------------------------------------------------

interface SimulationLayerProps {
  onStatsUpdate: (data: SimHudProps) => void;
  profileId: string;
  viewMode: ViewMode;
  speed: number;
  paused: boolean;
  showBeams: boolean;
  showLabels: boolean;
  replayMode: boolean;
  replaySeekSec: number | null;
}

function LiveLayer({ onStatsUpdate, profileId, viewMode, speed, paused, showBeams, showLabels }: Omit<SimulationLayerProps, 'replayMode' | 'replaySeekSec'>) {
  const result = useSimulation({ profileId, speed, paused });
  const bhParityMode = viewMode === 'leo-parity' && Boolean(result.snapshot?.bhSlot);
  const lowSinrUeCount = useMemo(
    () => result.snapshot?.ues.filter((ue) => ue.sinrDb !== null && ue.sinrDb < LOW_SINR_EXPLAINABILITY_THRESHOLD_DB).length ?? 0,
    [result.snapshot],
  );
  const runtimeSummary = useMemo(() => ({
    mode: 'live' as const,
    profileId: result.profileId,
    viewMode,
    showBeams,
    showLabels,
    tick: result.snapshot?.tick ?? null,
    timeSec: result.snapshot?.timeSec ?? null,
    visibleSatelliteIds: result.snapshot?.satellites.filter((sat) => sat.isVisible).map((sat) => sat.id) ?? [],
    primaryUe: {
      servingSatId: result.snapshot?.ues[0]?.servingSatId ?? null,
      targetSatId: result.snapshot?.ues[0]?.targetSatId ?? null,
      secondarySatId: result.snapshot?.ues[0]?.secondarySatId ?? null,
      continuityState: result.snapshot?.ues[0]?.continuityState ?? null,
      sinrDb: result.snapshot?.ues[0]?.sinrDb ?? null,
    },
    lowSinrUeCount,
    lowSinrThresholdDb: LOW_SINR_EXPLAINABILITY_THRESHOLD_DB,
    dapsPhase: result.snapshot?.daps?.phase ?? null,
    replaySelection: null,
    replayWindowStartSec: null,
    replayWindowEndSec: null,
  }), [lowSinrUeCount, result.profileId, result.snapshot, showBeams, showLabels, viewMode]);
  usePublishValidationSection('runtime', runtimeSummary);
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
      {viewMode === 'leo-parity' ? (
        <>
          {!bhParityMode && (
            <>
              <LeoParityBeamLayer snapshot={result.snapshot} visible={showBeams} showLabels={showLabels} />
              <LeoParityBeamOverlay snapshot={result.snapshot} visible={showBeams && showLabels} />
              <LeoParityHandoverLinks snapshot={result.snapshot} visible={showBeams} showLabels={showLabels} />
            </>
          )}
        </>
      ) : (
        <>
          <EarthMovingBeamLayer snapshot={result.snapshot} visible={showBeams} viewMode={viewMode} />
          <BeamInfoOverlay snapshot={result.snapshot} visible={showBeams} />
          <HandoverLinkOverlay snapshot={result.snapshot} visible={showBeams} />
        </>
      )}
      <EarthFixedCellLayer
        snapshot={result.snapshot}
        visible={showBeams}
        parityMode={viewMode === 'leo-parity'}
        showLabels={showLabels}
      />
    </>
  );
}

function ReplayLayer({ onStatsUpdate, profileId, viewMode, speed, paused, showBeams, showLabels, replaySeekSec }: Omit<SimulationLayerProps, 'replayMode'>) {
  const result = useReplay({ profileId, speed, paused, initialSeekSec: replaySeekSec });
  const bhParityMode = viewMode === 'leo-parity' && Boolean(result.snapshot?.bhSlot);
  const lowSinrUeCount = useMemo(
    () => result.snapshot?.ues.filter((ue) => ue.sinrDb !== null && ue.sinrDb < LOW_SINR_EXPLAINABILITY_THRESHOLD_DB).length ?? 0,
    [result.snapshot],
  );
  const runtimeSummary = useMemo(() => ({
    mode: 'replay' as const,
    profileId: result.profileId,
    viewMode,
    showBeams,
    showLabels,
    tick: result.snapshot?.tick ?? null,
    timeSec: result.snapshot?.timeSec ?? null,
    visibleSatelliteIds: result.snapshot?.satellites.filter((sat) => sat.isVisible).map((sat) => sat.id) ?? [],
    primaryUe: {
      servingSatId: result.snapshot?.ues[0]?.servingSatId ?? null,
      targetSatId: result.snapshot?.ues[0]?.targetSatId ?? null,
      secondarySatId: result.snapshot?.ues[0]?.secondarySatId ?? null,
      continuityState: result.snapshot?.ues[0]?.continuityState ?? null,
      sinrDb: result.snapshot?.ues[0]?.sinrDb ?? null,
    },
    lowSinrUeCount,
    lowSinrThresholdDb: LOW_SINR_EXPLAINABILITY_THRESHOLD_DB,
    dapsPhase: result.snapshot?.daps?.phase ?? null,
    replaySelection: result.selectionReason,
    replayWindowStartSec: result.replayManifest?.windowStartSec ?? null,
    replayWindowEndSec: result.replayManifest?.windowEndSec ?? null,
  }), [lowSinrUeCount, result.profileId, result.replayManifest?.windowEndSec, result.replayManifest?.windowStartSec, result.selectionReason, result.snapshot, showBeams, showLabels, viewMode]);
  usePublishValidationSection('runtime', runtimeSummary);
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
      {viewMode === 'leo-parity' ? (
        <>
          {!bhParityMode && (
            <>
              <LeoParityBeamLayer snapshot={result.snapshot} visible={showBeams} showLabels={showLabels} />
              <LeoParityBeamOverlay snapshot={result.snapshot} visible={showBeams && showLabels} />
              <LeoParityHandoverLinks snapshot={result.snapshot} visible={showBeams} showLabels={showLabels} />
            </>
          )}
        </>
      ) : (
        <>
          <EarthMovingBeamLayer snapshot={result.snapshot} visible={showBeams} viewMode={viewMode} />
          <BeamInfoOverlay snapshot={result.snapshot} visible={showBeams} />
          <HandoverLinkOverlay snapshot={result.snapshot} visible={showBeams} />
        </>
      )}
      <EarthFixedCellLayer
        snapshot={result.snapshot}
        visible={showBeams}
        parityMode={viewMode === 'leo-parity'}
        showLabels={showLabels}
      />
    </>
  );
}

function SimulationLayer(props: SimulationLayerProps) {
  return props.replayMode
    ? <ReplayLayer {...props} />
    : <LiveLayer {...props} />;
}

// ---------------------------------------------------------------------------
// SceneShell — top-level shell with Canvas + HTML overlays
// ---------------------------------------------------------------------------

export function SceneShell() {
  const bootstrap = useMemo(() => readSceneQueryBootstrap(), []);
  const [hudData, setHudData] = useState<SimHudProps | null>(null);

  // Control panel state
  const [profileId, setProfileId] = useState(bootstrap.profileId);
  const [viewMode, setViewMode] = useState<ViewMode>(bootstrap.viewMode);
  const [speed, setSpeed] = useState(bootstrap.speed);
  const [paused, setPaused] = useState(bootstrap.paused);
  const [showBeams, setShowBeams] = useState(bootstrap.showBeams);
  const [showLabels, setShowLabels] = useState(bootstrap.showLabels);
  const [replayMode, setReplayMode] = useState(bootstrap.replayMode);
  const [replaySeekSec] = useState(bootstrap.replaySeekSec);

  const handlePauseToggle = useCallback(() => setPaused((p) => !p), []);
  const handleShowBeamsToggle = useCallback(() => setShowBeams((b) => !b), []);
  const handleShowLabelsToggle = useCallback(() => setShowLabels((l) => !l), []);
  const handleReplayToggle = useCallback(() => setReplayMode((r) => !r), []);

  useEffect(() => {
    syncSceneQuery({
      profileId,
      viewMode,
      speed,
      paused,
      showBeams,
      showLabels,
      replayMode,
      replaySeekSec,
      validationMode: bootstrap.validationMode,
    });
  }, [bootstrap.validationMode, paused, profileId, replayMode, replaySeekSec, showBeams, showLabels, speed, viewMode]);

  return (
    <div
      data-view-mode={viewMode}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: VISUAL_SCENE_CONFIG.background.gradient,
        overflow: 'hidden',
      }}
    >
      <Starfield starCount={180} />
      {hudData && <SimHud {...hudData} />}
      <BhExplainabilityPanel />
      <ValidationProbe visible={bootstrap.validationMode} />
      <ControlPanel
        profileId={profileId}
        onProfileChange={setProfileId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        speed={speed}
        onSpeedChange={setSpeed}
        paused={paused}
        onPauseToggle={handlePauseToggle}
        showBeams={showBeams}
        onShowBeamsToggle={handleShowBeamsToggle}
        showLabels={showLabels}
        onShowLabelsToggle={handleShowLabelsToggle}
        replayMode={replayMode}
        onReplayToggle={handleReplayToggle}
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

        <Suspense fallback={<LoaderOverlay />}>
          <NTPUScene />
        </Suspense>

        <Suspense fallback={null}>
          <UAV />
        </Suspense>

        <Suspense fallback={null}>
          <SimulationLayer
            onStatsUpdate={setHudData}
            profileId={profileId}
            viewMode={viewMode}
            speed={speed}
            paused={paused}
            showBeams={showBeams}
            showLabels={showLabels}
            replayMode={replayMode}
            replaySeekSec={replaySeekSec}
          />
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
