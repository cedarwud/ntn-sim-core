import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { VISUAL_SCENE_CONFIG } from '@/config/visual-scene.config';

export function NTPUScene() {
  const { scene } = useGLTF(VISUAL_SCENE_CONFIG.scene.modelPath);

  // Clone once per loaded GLTF scene and convert basic materials into lit materials.
  const processedScene = useMemo(() => {
    const clonedScene = scene.clone(true);

    clonedScene.traverse((obj: THREE.Object3D) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;

        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((material) => {
              if (material instanceof THREE.MeshBasicMaterial) {
                return new THREE.MeshStandardMaterial({
                  color: material.color,
                  map: material.map,
                });
              }

              return material;
            });
          } else if (mesh.material instanceof THREE.MeshBasicMaterial) {
            const basicMaterial = mesh.material;
            mesh.material = new THREE.MeshStandardMaterial({
              color: basicMaterial.color,
              map: basicMaterial.map,
            });
          }
        }
      }
    });

    return clonedScene;
  }, [scene]);

  return (
    <group
      position={VISUAL_SCENE_CONFIG.scene.position}
      rotation={VISUAL_SCENE_CONFIG.scene.rotation}
    >
      <primitive object={processedScene} scale={VISUAL_SCENE_CONFIG.scene.scale} />
    </group>
  );
}

useGLTF.preload(VISUAL_SCENE_CONFIG.scene.modelPath);
