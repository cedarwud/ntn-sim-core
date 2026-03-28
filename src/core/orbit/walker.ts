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
import { TWO_PI, DAY_SECONDS, MU_EARTH_KM3_S2, EARTH_RADIUS_KM } from '@/core/common/constants';

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
    const meanMotionRevPerDay = (meanMotionRadPerSec * DAY_SECONDS) / TWO_PI;
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
          orbitType: shell.orbitType ?? 'leo',
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
