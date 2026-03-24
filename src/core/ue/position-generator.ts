/**
 * UE position generator for multi-UE simulation (C3 fix).
 *
 * Generates N UE positions within the serving beam footprint.
 * Each UE has a different offset from beam center → different off-axis angle → different SINR.
 *
 * Distribution modes:
 *   - uniform: UEs evenly distributed within beam radius
 *   - clustered: UEs concentrated near beam center (Gaussian)
 *   - hotspot: UEs at beam edge (ring distribution)
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9
 *   - This file must not import React, Three.js, or scene code.
 */

import type { UeDistribution } from '@/core/profiles/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UePosition {
  id: string;
  /** Offset from beam center in km (East). */
  offsetEastKm: number;
  /** Offset from beam center in km (North). */
  offsetNorthKm: number;
  /** Distance from beam center in km. */
  distanceFromCenterKm: number;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generate UE positions within a circular beam footprint.
 *
 * @param count — number of UEs to generate
 * @param beamRadiusKm — beam radius in km (beamDiameterKm / 2)
 * @param distribution — spatial distribution type
 * @param rngNext — seeded RNG function returning [0, 1)
 * @returns array of UE positions
 */
export function generateUePositions(
  count: number,
  beamRadiusKm: number,
  distribution: UeDistribution,
  rngNext: () => number,
): UePosition[] {
  if (count <= 0) return [];

  // First UE is always at beam center (backward compatible with single-UE)
  const positions: UePosition[] = [
    { id: 'ue-0', offsetEastKm: 0, offsetNorthKm: 0, distanceFromCenterKm: 0 },
  ];

  for (let i = 1; i < count; i++) {
    let r: number;
    const theta = rngNext() * 2 * Math.PI;

    switch (distribution) {
      case 'uniform': {
        // Uniform in area: r = R * sqrt(U) for uniform disk
        r = beamRadiusKm * Math.sqrt(rngNext());
        break;
      }
      case 'clustered': {
        // Gaussian-like: most UEs near center (σ = R/3)
        const sigma = beamRadiusKm / 3;
        // Box-Muller for half-normal (distance is always positive)
        const u1 = rngNext();
        const u2 = rngNext();
        const z = Math.sqrt(-2 * Math.log(u1 === 0 ? 1e-10 : u1)) * Math.cos(2 * Math.PI * u2);
        r = Math.min(Math.abs(z) * sigma, beamRadiusKm);
        break;
      }
      case 'hotspot': {
        // Ring: UEs concentrated at 0.7-1.0 × beam radius (cell edge)
        r = beamRadiusKm * (0.7 + 0.3 * rngNext());
        break;
      }
      default:
        r = beamRadiusKm * Math.sqrt(rngNext());
    }

    const east = r * Math.cos(theta);
    const north = r * Math.sin(theta);

    positions.push({
      id: `ue-${i}`,
      offsetEastKm: east,
      offsetNorthKm: north,
      distanceFromCenterKm: r,
    });
  }

  return positions;
}
