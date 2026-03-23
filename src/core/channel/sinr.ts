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
 * Signal power: txEirpDbm + servingBeamGainDb - servingPathLossDb - servingShadowFadingDb - servingClutterLossDb
 * Per-interferer power: txEirpDbm + iGainDb - iPathLossDb - iShadowDb - iClutterDb
 * SINR = S_linear / (I_linear + N_linear)
 *
 * @tier paper-backed
 * @source PAP-2022-SINR-ELEVATION
 */
export function computeSinr(opts: SinrComputeOptions): SinrResult {
  const {
    servingBeamGainDb,
    servingPathLossDb,
    servingShadowFadingDb,
    servingClutterLossDb,
    txEirpDbm,
    noisePowerDbm,
    interferingSignals,
  } = opts;

  // Serving signal power (dBm)
  const signalDbm =
    txEirpDbm + servingBeamGainDb - servingPathLossDb - servingShadowFadingDb - servingClutterLossDb;

  // Interference: each interferer uses its own channel parameters (C1 fix)
  let interferenceLinear = 0;
  for (const iSig of interferingSignals) {
    const iPowerDbm =
      txEirpDbm + iSig.beamGainDb - iSig.pathLossDb - iSig.shadowFadingDb - iSig.clutterLossDb;
    interferenceLinear += dbmToLinear(iPowerDbm);
  }

  const signalLinear = dbmToLinear(signalDbm);
  const noiseLinear = dbmToLinear(noisePowerDbm);

  const sinrLinear = signalLinear / (interferenceLinear + noiseLinear);
  const sinrDb = 10 * Math.log10(sinrLinear);

  const interferenceDbm =
    interferenceLinear > 0 ? linearToDbm(interferenceLinear) : -Infinity;

  return {
    signalDbm,
    interferenceDbm,
    noiseDbm: noisePowerDbm,
    sinrDb,
  };
}
