/**
 * src/core/models/index.ts — barrel export for Phase 2 model-bundle interfaces.
 *
 * Authority: phase2-model-bundle-sdd.md §4
 */

export type { GeometryModel, GeometryInput, SatelliteGeometry, GeometryResult, UePositionGeometry } from './geometry.js';
export { WalkerAnalyticGeometry, Sgp4TleGeometry, TrajectoryCacheGeometry } from './geometry.js';

export type { PathLossModel, PathLossInput, PathLossResult } from './path-loss.js';
export { ThreegppBaselinePathLoss } from './path-loss.js';

export type { BeamGainModel, BeamGainInput } from './beam-gain.js';
export { RpsatBeamGainModel } from './beam-gain.js';

export type { SinrModel, SinrInput } from './sinr.js';
export { StandardSinrModel } from './sinr.js';

export type { HandoverModel, HandoverConfig, HandoverManager } from './handover.js';
export { DefaultHandoverModel } from './handover.js';

export type { PowerModel, PowerInput, PowerResult, EeModel, EeInput } from './power-ee.js';
export { BasicPowerModel, BpjEeModel } from './power-ee.js';

export type { PolicyModel, PolicyObservation, PolicyAction, PolicyReward } from './policy.js';

export type { ModelBundle } from './model-bundle.js';
export { buildModelBundle } from './model-bundle.js';
