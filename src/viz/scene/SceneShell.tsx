import { Suspense, useState, useEffect, useCallback } from 'react';
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
import { SatelliteSkyLayer } from '@/viz/satellite/SatelliteSkyLayer';
import { EarthMovingBeamLayer, EarthFixedCellLayer } from '@/viz/beam';

// ---------------------------------------------------------------------------
// SimulationLayer — lives inside Canvas
// ---------------------------------------------------------------------------

interface SimulationLayerProps {
  onStatsUpdate: (data: SimHudProps) => void;
  profileId: string;
  speed: number;
  paused: boolean;
  showBeams: boolean;
  showLabels: boolean;
  replayMode: boolean;
}

function LiveLayer({ onStatsUpdate, profileId, speed, paused, showBeams, showLabels }: Omit<SimulationLayerProps, 'replayMode'>) {
  const result = useSimulation({ profileId, speed, paused });
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
    });
  }, [result.snapshot]);
  return (
    <>
      <SatelliteSkyLayer snapshot={result.snapshot} showLabels={showLabels} />
      <EarthMovingBeamLayer snapshot={result.snapshot} visible={showBeams} />
      <EarthFixedCellLayer snapshot={result.snapshot} visible={showBeams} />
    </>
  );
}

function ReplayLayer({ onStatsUpdate, profileId, speed, paused, showBeams, showLabels }: Omit<SimulationLayerProps, 'replayMode'>) {
  const result = useReplay({ profileId, speed, paused });
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
    });
  }, [result.snapshot]);
  return (
    <>
      <SatelliteSkyLayer snapshot={result.snapshot} showLabels={showLabels} />
      <EarthMovingBeamLayer snapshot={result.snapshot} visible={showBeams} />
      <EarthFixedCellLayer snapshot={result.snapshot} visible={showBeams} />
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
  const [hudData, setHudData] = useState<SimHudProps | null>(null);

  // Control panel state
  const [profileId, setProfileId] = useState('case9-access-baseline');
  const [speed, setSpeed] = useState(10);
  const [paused, setPaused] = useState(false);
  const [showBeams, setShowBeams] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [replayMode, setReplayMode] = useState(false);

  const handlePauseToggle = useCallback(() => setPaused((p) => !p), []);
  const handleShowBeamsToggle = useCallback(() => setShowBeams((b) => !b), []);
  const handleShowLabelsToggle = useCallback(() => setShowLabels((l) => !l), []);
  const handleReplayToggle = useCallback(() => setReplayMode((r) => !r), []);

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
      {hudData && <SimHud {...hudData} />}
      <ControlPanel
        profileId={profileId}
        onProfileChange={setProfileId}
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
            speed={speed}
            paused={paused}
            showBeams={showBeams}
            showLabels={showLabels}
            replayMode={replayMode}
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
