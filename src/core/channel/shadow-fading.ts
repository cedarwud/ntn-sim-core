/**
 * 3GPP TR 38.811 shadow fading and clutter loss lookup.
 *
 * Tier: paper-backed + standard-backed
 * Source: PAP-2022-SINR-ELEVATION channelParameterTable, 3GPP TR 38.811 Table 6.6.2
 * Environment: suburban, S-band
 *
 * This file must not import React, Three.js, or scene code.
 */

import type { ShadowFadingParams } from './types';

// ---------------------------------------------------------------------------
// 3GPP TR 38.811 suburban S-band lookup table
// Source: PAP-2022-SINR-ELEVATION channelParameterTable (9 elevation angles)
// ---------------------------------------------------------------------------

/** Elevation angles in degrees (ascending). */
const ELEVATIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const;

/** LOS shadow fading standard deviation σ_SF (dB). */
const LOS_SIGMA: readonly number[] = [1.79, 1.14, 1.14, 0.92, 1.42, 1.56, 0.85, 0.72, 0.72];

/** NLOS shadow fading standard deviation σ_SF (dB). */
const NLOS_SIGMA: readonly number[] = [8.93, 9.08, 8.78, 10.25, 10.56, 10.74, 10.17, 11.52, 11.52];

/** NLOS clutter loss CL (dB). */
const NLOS_CL: readonly number[] = [19.52, 18.17, 18.42, 18.28, 18.63, 17.68, 16.50, 16.30, 16.30];

/**
 * Linearly interpolate between two values.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Get shadow fading parameters for a given elevation angle by
 * linearly interpolating the 3GPP TR 38.811 suburban S-band table.
 *
 * @tier paper-backed + standard-backed
 * @source PAP-2022-SINR-ELEVATION channelParameterTable, 3GPP TR 38.811 Table 6.6.2
 *
 * @param elevationDeg — elevation angle in degrees [10, 90]
 * @param _environment — environment type (currently only 'suburban' supported)
 * @returns Shadow fading parameters (LOS σ, NLOS σ, NLOS clutter loss)
 */
export function getShadowFadingParams(
  elevationDeg: number,
  _environment: 'suburban' = 'suburban',
): ShadowFadingParams {
  // Clamp to table range
  const el = Math.max(ELEVATIONS[0], Math.min(ELEVATIONS[ELEVATIONS.length - 1], elevationDeg));

  // Find bracketing indices
  let lo = 0;
  for (let i = 0; i < ELEVATIONS.length - 1; i++) {
    if (ELEVATIONS[i + 1] >= el) {
      lo = i;
      break;
    }
  }
  const hi = Math.min(lo + 1, ELEVATIONS.length - 1);

  if (lo === hi) {
    return {
      losSigmaDb: LOS_SIGMA[lo],
      nlosSigmaDb: NLOS_SIGMA[lo],
      clutterLossDb: NLOS_CL[lo],
    };
  }

  const t = (el - ELEVATIONS[lo]) / (ELEVATIONS[hi] - ELEVATIONS[lo]);

  return {
    losSigmaDb: lerp(LOS_SIGMA[lo], LOS_SIGMA[hi], t),
    nlosSigmaDb: lerp(NLOS_SIGMA[lo], NLOS_SIGMA[hi], t),
    clutterLossDb: lerp(NLOS_CL[lo], NLOS_CL[hi], t),
  };
}

/**
 * Sample a shadow fading value from a zero-mean Gaussian distribution
 * using the Box-Muller transform with a seeded RNG.
 *
 * @tier normative
 * @source Box-Muller transform (textbook)
 *
 * @param sigmaDb — standard deviation in dB
 * @param rngNext — seeded RNG function returning [0, 1)
 * @returns shadow fading sample in dB
 */
export function sampleShadowFading(sigmaDb: number, rngNext: () => number): number {
  // Box-Muller transform: generate one standard normal sample
  const u1 = rngNext();
  const u2 = rngNext();
  // Avoid log(0)
  const r = Math.sqrt(-2 * Math.log(u1 === 0 ? Number.MIN_VALUE : u1));
  const theta = 2 * Math.PI * u2;
  const z = r * Math.cos(theta);
  return sigmaDb * z;
}
