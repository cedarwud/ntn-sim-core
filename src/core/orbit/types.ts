/**
 * Orbit module type definitions.
 *
 * Source: adapted from leo-beam-sim/src/engine/orbit/types.ts
 * Tier: normative (structural contracts)
 *
 * This file must not import React, Three.js, or scene code.
 */

/** Keplerian orbital element for a single satellite. */
export interface OrbitElement {
  id: string;
  shellId: string;
  altitudeKm: number;
  /** Reference epoch in UTC milliseconds. */
  epochUtcMs: number;
  eccentricity: number;
  inclinationRad: number;
  /** Right Ascension of Ascending Node in radians. */
  raanRad: number;
  argPerigeeRad: number;
  meanAnomalyRad: number;
  /** Revolutions per sidereal day. */
  meanMotionRevPerDay: number;
}

/** ECEF + geodetic position output from propagation. */
export interface OrbitPoint {
  ecefKm: [number, number, number];
  latDeg: number;
  lonDeg: number;
  altKm: number;
}

/** Pre-computed observer context for fast topocentric conversion. */
export interface ObserverContext {
  latDeg: number;
  lonDeg: number;
  latRad: number;
  lonRad: number;
  ecefKm: [number, number, number];
  sinLat: number;
  cosLat: number;
  sinLon: number;
  cosLon: number;
}

/** Topocentric (observer-relative) position. */
export interface TopocentricPoint {
  eastKm: number;
  northKm: number;
  upKm: number;
  rangeKm: number;
  azimuthDeg: number;
  elevationDeg: number;
}

/** Walker constellation shell definition. */
export interface WalkerShell {
  id: string;
  altitudeKm: number;
  inclinationDeg: number;
  planes: number;
  satsPerPlane: number;
  /** Walker phasing factor F (default 1). Affects inter-plane phase offset.
   *  Formula: planePhaseOffset = 2π·p·F / totalSats */
  phasingFactor?: number;
}

/** Walker constellation generation config. */
export interface WalkerConfig {
  shells: WalkerShell[];
  epochUtcMs: number;
}

/** A cached trajectory sample for one satellite at one time step. */
export interface TrajectorySample {
  timeSec: number;
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
  latDeg: number;
  lonDeg: number;
  altKm: number;
  isVisible: boolean;
}

/** A complete pass (continuous above-horizon window) for one satellite. */
export interface SatellitePass {
  satId: string;
  startTimeSec: number;
  endTimeSec: number;
  peakElevationDeg: number;
  samples: TrajectorySample[];
}

/** Full trajectory cache for the entire constellation. */
export interface TrajectoryCache {
  epochUtcMs: number;
  durationSec: number;
  stepSec: number;
  totalSatellites: number;
  /** All passes indexed by satellite ID. */
  passesBySatId: Map<string, SatellitePass[]>;
}
