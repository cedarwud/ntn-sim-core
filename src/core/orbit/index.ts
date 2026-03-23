/**
 * Orbit module — barrel export.
 */

export type {
  OrbitElement,
  OrbitPoint,
  ObserverContext,
  TopocentricPoint,
  WalkerShell,
  WalkerConfig,
  TrajectorySample,
  SatellitePass,
  TrajectoryCache,
} from './types';

export { degToRad, radToDeg, normalizeAngleRad, clamp } from './math';
export { propagateOrbitElement } from './propagation';
export { createObserverContext, computeTopocentricPoint } from './topocentric';
export { generateWalkerConstellation } from './walker';
export {
  buildTrajectoryCache,
  interpolatePass,
  getActivePassesAt,
} from './trajectory-cache';
export type { OmmRecord, SatrecEntry } from './tle-loader';
export { loadOmmRecords, ommToSatrecs, sampleRecords } from './tle-loader';
export { propagateSgp4, satrecsToOrbitElements } from './sgp4-adapter';
