/**
 * GeometryModel — Phase 2 model-bundle interface (P2-11).
 *
 * Defines the GeometryModel interface and concrete wrappers that delegate to
 * orbit/trajectory-cache.ts (WalkerAnalyticGeometry) and orbit/sgp4-adapter.ts
 * (Sgp4TleGeometry). No orbit physics logic is implemented here.
 *
 * Layer: L2 (src/core/models/)
 * Authority: phase2-model-bundle-sdd.md §5.1
 *
 * DP-3 resolved: SatelliteGeometry carries per-UE arrays (ueOffAxisAngleDeg[],
 * ueSlantRangeKm[]). GeometryModel.compute() is called once per tick,
 * not once per UE.
 */

import { getActivePassesAt, interpolatePass } from '../orbit/trajectory-cache.js';
import { computeOffAxisAngle } from '../channel/beam-gain.js';
import type { TrajectoryCache, TrajectorySample } from '../orbit/types.js';
import type { ObserverLocation } from '../common/types.js';

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface UePositionGeometry {
  id: string;
  latDeg: number;
  lonDeg: number;
}

export interface GeometryInput {
  epochUtcMs: number;
  tickSec: number;
  observerLocation: ObserverLocation;
  uePositions: UePositionGeometry[];
}

export interface SatelliteGeometry {
  satId: string;
  positionEcef: [number, number, number]; // km (stub — TrajectorySample has latDeg/lonDeg/altKm)
  elevationDeg: number;
  slantRangeKm: number;
  azimuthDeg: number;
  dopplerHz: number;
  /** Per-UE off-axis angle from beam center (index = uePositions index). DP-3. */
  ueOffAxisAngleDeg: number[];
  /** Per-UE slant range in km (index = uePositions index). DP-3. */
  ueSlantRangeKm: number[];
  /** Raw TrajectorySample for engine internal use (beam selection, etc.). */
  sample: TrajectorySample;
}

export interface GeometryResult {
  satellites: SatelliteGeometry[];
  visibleSatIds: string[];
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface GeometryModel {
  readonly familyId: 'walker-analytic' | 'sgp4-tle' | 'kepler-debug' | string;
  compute(input: GeometryInput): GeometryResult;
}

// ---------------------------------------------------------------------------
// Concrete wrapper: TrajectoryCacheGeometry (walker-analytic + sgp4-tle)
// ---------------------------------------------------------------------------

/**
 * Wraps orbit/trajectory-cache.ts getActivePassesAt + interpolatePass.
 * Works for both synthetic (Walker) and TLE/SGP4 back-ends because
 * the trajectory cache is orbit-agnostic after build time.
 * familyId is set by the caller based on profile.orbitMode.
 */
export class TrajectoryCacheGeometry implements GeometryModel {
  readonly familyId: string;
  private readonly cache: TrajectoryCache;

  constructor(cache: TrajectoryCache, familyId: 'walker-analytic' | 'sgp4-tle') {
    this.cache = cache;
    this.familyId = familyId;
  }

  compute(input: GeometryInput): GeometryResult {
    const { epochUtcMs, uePositions } = input;
    // epochUtcMs in milliseconds; trajectory cache uses seconds
    const timeSec = epochUtcMs / 1000;

    const activePasses = getActivePassesAt(this.cache, timeSec);
    const satellites: SatelliteGeometry[] = [];
    const visibleSatIds: string[] = [];

    for (const { satId, pass } of activePasses) {
      const sample = interpolatePass(pass, timeSec);
      if (!sample) continue;
      if (sample.elevationDeg <= 0) continue;

      visibleSatIds.push(satId);

      // Per-UE off-axis angle: angle from satellite nadir to UE position as seen from sat
      // DP-3: per-UE arrays indexed by uePositions order
      const ueOffAxisAngleDeg: number[] = [];
      const ueSlantRangeKm: number[] = [];

      for (const ue of uePositions) {
        const offAxis = computeOffAxisAngle(
          sample.latDeg,
          sample.lonDeg,
          ue.latDeg,
          ue.lonDeg,
          sample.altKm,
        );
        ueOffAxisAngleDeg.push(offAxis);
        // Approximate per-UE slant range (single-observer model; per-UE refinement is Phase 5+)
        ueSlantRangeKm.push(sample.rangeKm);
      }

      satellites.push({
        satId,
        // ECEF stub: engine does not currently use positionEcef from geometry result
        positionEcef: [0, 0, 0],
        elevationDeg: sample.elevationDeg,
        slantRangeKm: sample.rangeKm,
        azimuthDeg: sample.azimuthDeg,
        dopplerHz: 0,   // Doppler computed separately by engine (channel/doppler.ts)
        ueOffAxisAngleDeg,
        ueSlantRangeKm,
        sample,
      });
    }

    return { satellites, visibleSatIds };
  }
}

// Alias: Sgp4TleGeometry delegates to same cache-based approach
// (the orbit back-end difference is in how TrajectoryCache was built, not in
//  how geometry.compute() works at simulation time)
export class Sgp4TleGeometry extends TrajectoryCacheGeometry {
  constructor(cache: TrajectoryCache) {
    super(cache, 'sgp4-tle');
  }
}

export class WalkerAnalyticGeometry extends TrajectoryCacheGeometry {
  constructor(cache: TrajectoryCache) {
    super(cache, 'walker-analytic');
  }
}
