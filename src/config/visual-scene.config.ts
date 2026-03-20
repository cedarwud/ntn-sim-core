import { SATELLITE_MODEL_ASSET, UAV_MODEL_ASSET } from '@/assets/models';
import { NTPU_SCENE_ASSET } from '@/assets/scenes';

export const VISUAL_SCENE_CONFIG = {
  scene: {
    modelPath: NTPU_SCENE_ASSET.path,
    position: [0, 0, 0] as [number, number, number],
    scale: 1,
    rotation: [0, 0, 0] as [number, number, number],
  },
  uav: {
    modelPath: UAV_MODEL_ASSET.path,
    defaultPosition: [0, 10, 0] as [number, number, number],
    defaultScale: 10,
  },
  satellite: {
    modelPath: SATELLITE_MODEL_ASSET.path,
  },
  camera: {
    initialPosition: [0, 400, 500] as [number, number, number],
    fov: 60,
    near: 0.1,
    far: 10000,
  },
  background: {
    gradient:
      'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
  },
  debug: {
    showHelpers: false,
  },
} as const;
