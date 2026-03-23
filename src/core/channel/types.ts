/**
 * Channel module type definitions.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.2
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3, §4
 *   - This file must not import React, Three.js, or scene code.
 */

/** Result of a full link-budget computation (all channel tiers combined). */
export interface ChannelResult {
  fsplDb: number;
  shadowFadingDb: number;
  clutterLossDb: number;
  beamGainDb: number;
  atmosphericDb: number;
  totalPathLossDb: number;
  rxPowerDbm: number;
}

/** Result of SINR computation for a UE in a multi-beam environment. */
export interface SinrResult {
  signalDbm: number;
  interferenceDbm: number;
  noiseDbm: number;
  sinrDb: number;
}

/** Input parameters for beam-gain model computation. */
export interface BeamGainInput {
  offAxisAngleDeg: number;
  model: 'rpsat-3gpp' | 'bessel-j1' | 'itu-r' | 'flat-debug';
  peakGainDbi: number;
  beamDiameterKm: number;
  altitudeKm: number;
  /** Slant range in km. Used for θ_3dB calculation (M2 fix).
   *  If omitted, falls back to altitudeKm (nadir approximation). */
  slantRangeKm?: number;
}

/** Per-interferer channel parameters for SINR computation. */
export interface InterferingSignal {
  beamGainDb: number;
  pathLossDb: number;
  shadowFadingDb: number;
  clutterLossDb: number;
}

/** Options for SINR computation. */
export interface SinrComputeOptions {
  servingBeamGainDb: number;
  servingPathLossDb: number;
  servingShadowFadingDb: number;
  servingClutterLossDb: number;
  txEirpDbm: number;
  noisePowerDbm: number;
  /** Per-interferer channel data. Each interferer uses its own path loss. */
  interferingSignals: InterferingSignal[];
}

/** Options for link-budget computation. */
export interface LinkBudgetOptions {
  distanceKm: number;
  frequencyGhz: number;
  txEirpDbm: number;
  elevationDeg: number;
  environment: 'suburban';
  beamGainInput: BeamGainInput | null;
  noisePowerDbm: number;
  /** Channel tier enable flags. */
  tier1LargeScale: boolean;
  tier2Clutter: boolean;
  tier3BeamGain: boolean;
  tier4Atmospheric: boolean;
  /** Seeded RNG for shadow fading sampling. */
  rngNext: (() => number) | null;
  /** LOS condition — true for LOS, false for NLOS. */
  isLos: boolean;
}

/** Shadow fading parameters for a given elevation angle. */
export interface ShadowFadingParams {
  losSigmaDb: number;
  nlosSigmaDb: number;
  clutterLossDb: number;
}
