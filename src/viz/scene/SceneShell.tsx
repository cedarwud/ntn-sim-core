import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { VISUAL_SCENE_CONFIG } from '@/config/visual-scene.config';
import { CameraRig } from './CameraRig';
import { LightingRig } from './LightingRig';
import { LoaderOverlay } from './LoaderOverlay';
import { NTPUScene } from './NTPUScene';
import { UAV } from './UAV';
import { Starfield } from '@/viz/overlays/Starfield';

export function SceneShell() {
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
