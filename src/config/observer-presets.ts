export interface ObserverPreset {
  id: string;
  name: string;
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeM: number;
}

export const OBSERVER_PRESETS = {
  ntpu: {
    id: 'ntpu',
    name: 'National Taipei University',
    latitudeDeg: 24.9441667,
    longitudeDeg: 121.3713889,
    altitudeM: 50,
  },
} as const satisfies Record<string, ObserverPreset>;

export const DEFAULT_SHOWCASE_OBSERVER_ID = 'ntpu';

export const DEFAULT_SHOWCASE_OBSERVER =
  OBSERVER_PRESETS[DEFAULT_SHOWCASE_OBSERVER_ID];
