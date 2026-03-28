/**
 * SINR computation for multi-beam NTN environments.
 *
 * Tier: paper-backed
 * Source: PAP-2022-SINR-ELEVATION
 * Formula: SINR = S_linear / (I_linear + N_linear)
 *
 * C1 fix (2026-03-23): each interferer now uses its own path loss,
 * shadow fading, and clutter loss instead of reusing the serving link's values.
 *
 * This file must not import React, Three.js, or scene code.
 */

import type { SinrComputeOptions, SinrResult } from './types';

/**
 * Convert dBm to linear milliwatts.
 */
function dbmToLinear(dbm: number): number {
  return 10 ** (dbm / 10);
}

/**
 * Convert linear milliwatts to dBm.
 */
function linearToDbm(linear: number): number {
  return 10 * Math.log10(linear);
}

/**
 * Compute SINR for a UE served by a single beam in a multi-beam environment.
 *
 * Signal power:      servingRxPowerDbm (= txEirp − totalPathLoss, all tiers)
 * Interferer power:  iSig.rxPowerDbm   (= txEirp − totalPathLoss, all tiers)
 * SINR = S_linear / (I_linear + N_linear)
 *
 * Both serving and interfering powers must come from computeLinkBudget().
 *
 * Tier symmetry: both serving and interfering links use the same computeLinkBudget()
 * composition path. Each interferer carries its own distance, elevation, SF/CL
 * lookup, beam gain, atmospheric loss, and optional fading draw.
 *
 * @tier paper-backed
 * @source PAP-2022-SINR-ELEVATION
 */
export function computeSinr(opts: SinrComputeOptions): SinrResult {
  const { servingRxPowerDbm, noisePowerDbm, interferingSignals } = opts;

  // Serving signal: pre-computed by computeLinkBudget (all enabled tiers)
  const signalLinear = dbmToLinear(servingRxPowerDbm);

  // Interference: each interferer's rxPowerDbm includes its own link budget
  let interferenceLinear = 0;
  for (const iSig of interferingSignals) {
    interferenceLinear += dbmToLinear(iSig.rxPowerDbm);
  }

  const noiseLinear = dbmToLinear(noisePowerDbm);

  const sinrLinear = signalLinear / (interferenceLinear + noiseLinear);
  const sinrDb = 10 * Math.log10(sinrLinear);

  const interferenceDbm =
    interferenceLinear > 0 ? linearToDbm(interferenceLinear) : -Infinity;

  return {
    signalDbm: servingRxPowerDbm,
    interferenceDbm,
    noiseDbm: noisePowerDbm,
    sinrDb,
  };
}
