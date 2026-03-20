export interface ModelAsset {
  id: string;
  path: string;
}

export const SATELLITE_MODEL_ASSET: ModelAsset = {
  id: 'satellite',
  path: '/models/sat.glb',
};

export const UAV_MODEL_ASSET: ModelAsset = {
  id: 'uav',
  path: '/models/uav.glb',
};
