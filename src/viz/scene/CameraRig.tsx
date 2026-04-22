import { useEffect, useRef } from 'react';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { PerspectiveCamera as ThreePerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { VISUAL_SCENE_CONFIG } from '@/config/visual-scene.config';

export type CameraRigPreset =
  | 'theater'
  | 'continuity'
  | 'zenith';

const CAMERA_PRESETS: Record<
  CameraRigPreset,
  {
    position: [number, number, number];
    target: [number, number, number];
  }
> = {
  theater: {
    position: VISUAL_SCENE_CONFIG.camera.initialPosition,
    target: [0, 0, 0],
  },
  continuity: {
    position: [260, 230, 270],
    target: [0, 70, 0],
  },
  zenith: {
    position: [0, 720, 120],
    target: [0, 120, 0],
  },
};

export interface CameraRigProps {
  preset?: CameraRigPreset;
}

export function CameraRig({
  preset = 'theater',
}: CameraRigProps) {
  const cameraRef = useRef<ThreePerspectiveCamera>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const activePreset = CAMERA_PRESETS[preset];

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    camera.position.set(...activePreset.position);
    controls.target.set(...activePreset.target);
    camera.lookAt(...activePreset.target);
    camera.updateProjectionMatrix();
    controls.update();
  }, [activePreset]);

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={activePreset.position}
        fov={VISUAL_SCENE_CONFIG.camera.fov}
        near={VISUAL_SCENE_CONFIG.camera.near}
        far={VISUAL_SCENE_CONFIG.camera.far}
      />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        zoomSpeed={0.4}
        minDistance={10}
        maxDistance={2000}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}
