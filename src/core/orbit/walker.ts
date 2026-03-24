/**
 * Walker-delta constellation generator.
 *
 * Source: adapted from leo-beam-sim/src/engine/orbit/walker-constellation.ts
 * Tier: paper-backed (standard Walker-delta pattern, widely used in LEO literature)
 *
 * Generates pure Walker(i, T, P, F=1) elements — no perturbation or clustering hacks.
 */

import { degToRad, normalizeAngleRad } from './math';
import type { OrbitElement, WalkerConfig } from './types';

const TWO_PI = Math.PI * 2;
/** Seconds per mean solar day. */
const DAY_SEC = 86400;
/** Earth gravitational parameter [km³/s²]. */
const MU_EARTH_KM3_S2 = 398600.4418;
/** WGS84 semi-major axis [km]. */
const EARTH_RADIUS_KM = 6378.137;

/**
 * Generate Walker-delta constellation orbital elements from a multi-shell config.
 *
 * Each shell produces planes × satsPerPlane elements with:
 * - RAAN evenly spaced: 2π · p / planes
 * - Phase offset per plane: 2π · p / totalSats  (Walker F=1)
 * - Mean anomaly evenly spaced within plane + phase offset
 */
export function generateWalkerConstellation(config: WalkerConfig): OrbitElement[] {
  const elements: OrbitElement[] = [];

  for (const shell of config.shells) {
    const semiMajorKm = EARTH_RADIUS_KM + shell.altitudeKm;
    const meanMotionRadPerSec = Math.sqrt(MU_EARTH_KM3_S2 / (semiMajorKm ** 3));
    const meanMotionRevPerDay = (meanMotionRadPerSec * DAY_SEC) / TWO_PI;
    const incRad = degToRad(shell.inclinationDeg);
    const totalSats = shell.planes * shell.satsPerPlane;
    const F = shell.phasingFactor ?? 1; // M1 fix: configurable Walker F parameter

    for (let p = 0; p < shell.planes; p++) {
      const raanRad = (TWO_PI * p) / shell.planes;
      const planePhaseOffset = (TWO_PI * p * F) / totalSats;

      for (let s = 0; s < shell.satsPerPlane; s++) {
        const meanAnomalyRad = normalizeAngleRad(
          (TWO_PI * s) / shell.satsPerPlane + planePhaseOffset,
        );

        elements.push({
          id: `${shell.id}-P${p}-S${s}`,
          shellId: shell.id,
          altitudeKm: shell.altitudeKm,
          epochUtcMs: config.epochUtcMs,
          eccentricity: 0.0001,
          inclinationRad: incRad,
          raanRad,
          argPerigeeRad: 0,
          meanAnomalyRad,
          meanMotionRevPerDay,
        });
      }
    }
  }

  return elements;
}
