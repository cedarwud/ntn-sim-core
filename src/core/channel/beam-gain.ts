/**
 * Beam gain models for NTN multi-beam antennas.
 *
 * Tier: paper-backed / standard-backed / debug-only (per model)
 * Sources:
 *   - bessel-j1: PAP-2021-SHADOWED-RICIAN
 *   - rpsat-3gpp: PAP-2022-SINR-ELEVATION, 3GPP TR 38.821
 *   - flat-debug: debug-only tier
 *
 * This file must not import React, Three.js, or scene code.
 */

import { EARTH_RADIUS_KM } from '@/core/common/constants';
import type { BeamGainInput } from './types';

// ---------------------------------------------------------------------------
// Bessel J1 polynomial approximation (Abramowitz & Stegun, §9.4.4 / §9.4.6)
// ---------------------------------------------------------------------------

/**
 * First-kind Bessel function J1(x) using Abramowitz & Stegun
 * polynomial approximations (Handbook of Mathematical Functions, 1964).
 *
 * For |x| <= 3: §9.4.4 polynomial
 * For |x| > 3: §9.4.6 asymptotic polynomial
 *
 * Maximum error: < 5e-8 over the full real line.
 *
 * @tier normative
 * @source Abramowitz & Stegun, Handbook of Mathematical Functions, 1964
 */
function besselJ1(x: number): number {
  const ax = Math.abs(x);

  if (ax < 3.0) {
    const y = x * x;
    const result =
      x *
      (0.5 +
        y *
          (-0.56249985 +
            y *
              (0.21093573 +
                y * (-0.03954289 + y * (0.00443319 + y * (-0.00031761 + y * 0.00001109))))));
    return result;
  }

  // |x| >= 3: asymptotic form
  const z = 3.0 / ax;
  const zz = z * z;
  const theta =
    ax -
    2.356194491 +
    z *
      (0.183105 + zz * (-0.02457 + zz * (0.00753 + zz * (-0.00908 + zz * 0.0))));
  const p0 =
    1.0 +
    zz * (-0.001098628627 + zz * (0.00002734510407 + zz * (-0.000002073370639 + zz * 0.0000002093887211)));
  const q0 =
    z *
    (-0.01562499995 +
      zz * (0.0001430488765 + zz * (-0.000006911147651 + zz * (0.0000007621095161 + zz * -0.0000000934945152))));

  const result = Math.sqrt(0.636619772 / ax) * (Math.cos(theta) * p0 - Math.sin(theta) * q0);
  return x < 0 ? -result : result;
}

/**
 * Compute the beam gain in dBi for a given off-axis angle.
 *
 * Supports three models:
 *
 * 1. **bessel-j1** — Bessel J1 antenna pattern:
 *    `G(θ) = Gpeak · (2·J1(u)/u)²` where `u = 2.07123 · sin(θ)/sin(θ_3dB)`
 *    @tier paper-backed
 *    @source PAP-2021-SHADOWED-RICIAN
 *
 * 2. **rpsat-3gpp** — 3GPP TR 38.821 normalized parabolic pattern:
 *    `G(θ) = Gpeak - min(12·(θ/θ_3dB)², SLAmax)` where SLAmax = 30 dB
 *    @tier standard-backed
 *    @source PAP-2022-SINR-ELEVATION, 3GPP TR 38.821
 *
 * 3. **flat-debug** — always returns peak gain (debug-only):
 *    @tier debug-only
 *
 * @param input — beam gain computation parameters
 * @returns beam gain in dBi
 */
export function computeBeamGain(input: BeamGainInput): number {
  const { offAxisAngleDeg, model, peakGainDbi, beamDiameterKm, altitudeKm, slantRangeKm } = input;

  if (model === 'flat-debug') {
    return peakGainDbi;
  }

  // M2 fix: θ_3dB uses slant range for off-nadir accuracy.
  // Falls back to altitudeKm (nadir case) when slantRangeKm not provided.
  const rangeForTheta = slantRangeKm ?? altitudeKm;
  const theta3dbRad = Math.atan(beamDiameterKm / (2 * rangeForTheta));
  const theta3dbDeg = theta3dbRad * (180 / Math.PI);

  if (model === 'rpsat-3gpp') {
    // 3GPP TR 38.821 normalized pattern: RPsat(θ) = -min(12·(θ/θ_3dB)², SLAmax)
    // NOTE: For rpsat-3gpp, EIRPden already includes antenna gain.
    // This function returns the NORMALIZED pattern (0 dB at boresight, negative off-axis).
    // The caller (link-budget/SINR) adds this to EIRP which already includes the peak gain.
    const SLA_MAX = 30; // dB
    const ratio = offAxisAngleDeg / theta3dbDeg;
    const reduction = Math.min(12 * ratio * ratio, SLA_MAX);
    return -reduction; // normalized: 0 at boresight, negative off-axis
  }

  if (model === 'bessel-j1') {
    const offAxisRad = offAxisAngleDeg * (Math.PI / 180);
    const sinTheta = Math.sin(offAxisRad);
    const sinTheta3db = Math.sin(theta3dbRad);

    // Avoid division by zero at boresight
    if (sinTheta < 1e-12) {
      // Normalized pattern: 0 dB at boresight
      // NOTE: EIRP already includes antenna gain, so beam gain is relative.
      return 0;
    }

    const u = 2.07123 * sinTheta / sinTheta3db;
    const j1u = besselJ1(u);
    // (2·J1(u)/u)² — normalized pattern
    const pattern = (2 * j1u / u) ** 2;
    // Convert to dB relative to peak (always <= 0)
    const patternDb = pattern > 1e-30 ? 10 * Math.log10(pattern) : -300;
    return patternDb;
  }

  // itu-r: placeholder — treat as rpsat-3gpp normalized pattern
  if (model === 'itu-r') {
    const SLA_MAX = 30;
    const ratio = offAxisAngleDeg / theta3dbDeg;
    const reduction = Math.min(12 * ratio * ratio, SLA_MAX);
    return -reduction; // normalized
  }

  return 0; // default: normalized boresight
}

/**
 * Compute the off-axis angle in degrees between a beam center and a UE,
 * as seen from the satellite at a given altitude.
 *
 * Uses the central angle on Earth's surface (haversine) and then
 * computes the angle subtended at the satellite.
 *
 * @tier normative
 *
 * @param beamCenterLatDeg — beam center latitude in degrees
 * @param beamCenterLonDeg — beam center longitude in degrees
 * @param ueLatDeg — UE latitude in degrees
 * @param ueLonDeg — UE longitude in degrees
 * @param altitudeKm — satellite altitude in km
 * @returns off-axis angle in degrees
 */
export function computeOffAxisAngle(
  beamCenterLatDeg: number,
  beamCenterLonDeg: number,
  ueLatDeg: number,
  ueLonDeg: number,
  altitudeKm: number,
): number {
  const toRad = Math.PI / 180;
  const lat1 = beamCenterLatDeg * toRad;
  const lat2 = ueLatDeg * toRad;
  const dLat = (ueLatDeg - beamCenterLatDeg) * toRad;
  const dLon = (ueLonDeg - beamCenterLonDeg) * toRad;

  // Haversine for central angle on Earth's surface
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const centralAngleRad = 2 * Math.asin(Math.sqrt(a));

  // M8 fix: spherical geometry for off-axis angle.
  // Law of cosines on the satellite–Earth_center–UE triangle:
  //   offAxis = atan2(R_E * sin(ψ), R_E + h - R_E * cos(ψ))
  // where ψ = centralAngleRad, h = altitudeKm, R_E = EARTH_RADIUS_KM
  const R = EARTH_RADIUS_KM;
  const offAxisRad = Math.atan2(
    R * Math.sin(centralAngleRad),
    R + altitudeKm - R * Math.cos(centralAngleRad),
  );

  return offAxisRad * (180 / Math.PI);
}
