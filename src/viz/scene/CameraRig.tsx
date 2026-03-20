import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { VISUAL_SCENE_CONFIG } from '@/config/visual-scene.config';

export function CameraRig() {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={VISUAL_SCENE_CONFIG.camera.initialPosition}
        fov={VISUAL_SCENE_CONFIG.camera.fov}
        near={VISUAL_SCENE_CONFIG.camera.near}
        far={VISUAL_SCENE_CONFIG.camera.far}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={2000}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}
