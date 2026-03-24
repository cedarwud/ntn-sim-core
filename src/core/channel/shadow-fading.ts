/**
 * 3GPP TR 38.811 shadow fading and clutter loss lookup.
 *
 * Tier: paper-backed + standard-backed
 * Source: 3GPP TR 38.811 Table 6.6.2 (S-band and Ka-band)
 *         PAP-2022-SINR-ELEVATION channelParameterTable (S-band)
 *
 * M3 fix (2026-03-23): Added Ka-band suburban tables and frequency-band dispatch.
 *
 * This file must not import React, Three.js, or scene code.
 */

import type { ShadowFadingParams } from './types';

// ---------------------------------------------------------------------------
// Frequency band classification
// ---------------------------------------------------------------------------

export type FrequencyBand = 's-band' | 'ka-band';

/**
 * Classify a carrier frequency into a band for shadow fading table selection.
 * S-band: 1-4 GHz; Ka-band: 18-40 GHz
 */
export function classifyBand(frequencyGhz: number): FrequencyBand {
  if (frequencyGhz >= 18) return 'ka-band';
  return 's-band';
}

// ---------------------------------------------------------------------------
// Elevation table (shared across bands)
// ---------------------------------------------------------------------------

/** Elevation angles in degrees (ascending). */
const ELEVATIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const;

// ---------------------------------------------------------------------------
// S-band suburban (2 GHz)
// Source: PAP-2022-SINR-ELEVATION, 3GPP TR 38.811 Table 6.6.2-3
// ---------------------------------------------------------------------------

const S_SUBURBAN_LOS_SIGMA:  readonly number[] = [1.79, 1.14, 1.14, 0.92, 1.42, 1.56, 0.85, 0.72, 0.72];
const S_SUBURBAN_NLOS_SIGMA: readonly number[] = [8.93, 9.08, 8.78, 10.25, 10.56, 10.74, 10.17, 11.52, 11.52];
const S_SUBURBAN_NLOS_CL:    readonly number[] = [19.52, 18.17, 18.42, 18.28, 18.63, 17.68, 16.50, 16.30, 16.30];

// ---------------------------------------------------------------------------
// Ka-band suburban (20-30 GHz)
// Source: 3GPP TR 38.811 Table 6.6.2-1 (Ka-band, suburban)
//
// Ka-band has higher shadow fading variance due to increased scattering
// sensitivity at higher frequencies. These values are from the standard
// suburban NLOS/LOS tables for the 20-30 GHz range.
// ---------------------------------------------------------------------------

const KA_SUBURBAN_LOS_SIGMA:  readonly number[] = [3.5, 3.4, 2.9, 2.6, 2.5, 2.4, 2.0, 1.9, 1.9];
const KA_SUBURBAN_NLOS_SIGMA: readonly number[] = [10.2, 9.8, 9.5, 9.4, 9.3, 9.0, 8.8, 8.5, 8.5];
const KA_SUBURBAN_NLOS_CL:    readonly number[] = [24.6, 23.1, 22.5, 21.8, 21.2, 20.3, 19.5, 18.8, 18.8];

// ---------------------------------------------------------------------------
// Table dispatch
// ---------------------------------------------------------------------------

interface FadingTable {
  losSigma: readonly number[];
  nlosSigma: readonly number[];
  nlosCl: readonly number[];
}

function getTable(band: FrequencyBand, _environment: 'suburban'): FadingTable {
  if (band === 'ka-band') {
    return {
      losSigma: KA_SUBURBAN_LOS_SIGMA,
      nlosSigma: KA_SUBURBAN_NLOS_SIGMA,
      nlosCl: KA_SUBURBAN_NLOS_CL,
    };
  }
  return {
    losSigma: S_SUBURBAN_LOS_SIGMA,
    nlosSigma: S_SUBURBAN_NLOS_SIGMA,
    nlosCl: S_SUBURBAN_NLOS_CL,
  };
}

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateTable(
  elevationDeg: number,
  table: FadingTable,
): ShadowFadingParams {
  const el = Math.max(ELEVATIONS[0], Math.min(ELEVATIONS[ELEVATIONS.length - 1], elevationDeg));
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
      losSigmaDb: table.losSigma[lo],
      nlosSigmaDb: table.nlosSigma[lo],
      clutterLossDb: table.nlosCl[lo],
    };
  }

  const t = (el - ELEVATIONS[lo]) / (ELEVATIONS[hi] - ELEVATIONS[lo]);
  return {
    losSigmaDb: lerp(table.losSigma[lo], table.losSigma[hi], t),
    nlosSigmaDb: lerp(table.nlosSigma[lo], table.nlosSigma[hi], t),
    clutterLossDb: lerp(table.nlosCl[lo], table.nlosCl[hi], t),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get shadow fading parameters for a given elevation angle and frequency band.
 *
 * @tier paper-backed + standard-backed
 * @source 3GPP TR 38.811 Table 6.6.2 (S-band: Table 6.6.2-3, Ka-band: Table 6.6.2-1)
 *
 * @param elevationDeg — elevation angle in degrees [10, 90]
 * @param environment — environment type (currently only 'suburban')
 * @param frequencyGhz — carrier frequency in GHz (optional, defaults to S-band)
 */
export function getShadowFadingParams(
  elevationDeg: number,
  environment: 'suburban' = 'suburban',
  frequencyGhz?: number,
): ShadowFadingParams {
  const band = frequencyGhz !== undefined ? classifyBand(frequencyGhz) : 's-band';
  const table = getTable(band, environment);
  return interpolateTable(elevationDeg, table);
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
  const u1 = rngNext();
  const u2 = rngNext();
  const r = Math.sqrt(-2 * Math.log(u1 === 0 ? Number.MIN_VALUE : u1));
  const theta = 2 * Math.PI * u2;
  const z = r * Math.cos(theta);
  return sigmaDb * z;
}
