import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { VISUAL_SCENE_CONFIG } from '@/config/visual-scene.config';

interface UAVProps {
  position?: [number, number, number];
  scale?: number;
}

export function UAV({
  position = VISUAL_SCENE_CONFIG.uav.defaultPosition,
  scale = VISUAL_SCENE_CONFIG.uav.defaultScale,
}: UAVProps) {
  const { scene } = useGLTF(VISUAL_SCENE_CONFIG.uav.modelPath);

  const clonedScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene);

    cloned.traverse((obj: THREE.Object3D) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return cloned;
  }, [scene]);

  return (
    <group position={position} scale={scale}>
      <primitive object={clonedScene} />
      <pointLight
        intensity={0.3}
        distance={50}
        decay={2}
        color="#ffffff"
        position={[0, 2, 0]}
      />
    </group>
  );
}

useGLTF.preload(VISUAL_SCENE_CONFIG.uav.modelPath);
