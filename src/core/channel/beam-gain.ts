/**
 * Beam gain models for NTN multi-beam antennas.
 *
 * Tier: paper-backed / standard-backed / debug-only (per model)
 */

import { EARTH_RADIUS_KM } from '@/core/common/constants';
import type { BeamGainInput } from './types';

// Guard for EARTH_RADIUS_KM if import fails or is undefined
const R_E = EARTH_RADIUS_KM || 6371;

/**
 * First-kind Bessel function J1(x) approximation.
 */
function besselJ1(x: number): number {
  const ax = Math.abs(x);
  if (ax < 1e-12) return 0; // Pure boresight

  if (ax < 3.0) {
    const y = x * x;
    return x * (0.5 + y * (-0.56249985 + y * (0.21093573 + y * (-0.03954289 + y * (0.00443319 + y * (-0.00031761 + y * 0.00001109))))));
  }

  const z = 3.0 / ax;
  const zz = z * z;
  const theta = ax - 2.356194491 + z * (0.183105 + zz * (-0.02457 + zz * (0.00753 + zz * (-0.00908))));
  const p0 = 1.0 + zz * (-0.001098628627 + zz * (0.00002734510407 + zz * (-0.000002073370639)));
  const q0 = z * (-0.01562499995 + zz * (0.0001430488765 + zz * (-0.000006911147651)));

  const result = Math.sqrt(0.636619772 / ax) * (Math.cos(theta) * p0 - Math.sin(theta) * q0);
  return x < 0 ? -result : result;
}

export function computeBeamGain(input: BeamGainInput): number {
  const { offAxisAngleDeg, model, peakGainDbi, beamDiameterKm, altitudeKm, slantRangeKm } = input;

  if (model === 'flat-debug') return peakGainDbi;

  const rangeForTheta = slantRangeKm ?? altitudeKm;
  const theta3dbRad = Math.atan(beamDiameterKm / (2 * rangeForTheta));
  const theta3dbDeg = theta3dbRad * (180 / Math.PI);

  if (model === 'rpsat-3gpp' || model === 'itu-r') {
    const SLA_MAX = 30;
    const ratio = offAxisAngleDeg / (theta3dbDeg || 0.001);
    const reduction = Math.min(12 * ratio * ratio, SLA_MAX);
    return -reduction; 
  }

  if (model === 'bessel-j1') {
    const offAxisRad = offAxisAngleDeg * (Math.PI / 180);
    const sinTheta = Math.sin(offAxisRad);
    const sinTheta3db = Math.sin(theta3dbRad);

    if (Math.abs(sinTheta) < 1e-12) return 0;

    const u = 2.07123 * sinTheta / (sinTheta3db || 0.001);
    const j1u = besselJ1(u);
    const pattern = (2 * j1u / (u || 0.001)) ** 2;
    return pattern > 1e-30 ? 10 * Math.log10(pattern) : -300;
  }

  return 0;
}

/**
 * Compute the off-axis angle in degrees.
 * Fixed: HAversine sqrt guard to prevent NaN.
 */
export function computeOffAxisAngle(
  beamCenterLatDeg: number,
  beamCenterLonDeg: number,
  ueLatDeg: number,
  ueLonDeg: number,
  altitudeKm: number,
): number {
  if (isNaN(beamCenterLatDeg) || isNaN(ueLatDeg)) return 0;

  const toRad = Math.PI / 180;
  const lat1 = beamCenterLatDeg * toRad;
  const lat2 = ueLatDeg * toRad;
  const dLat = (ueLatDeg - beamCenterLatDeg) * toRad;
  const dLon = (ueLonDeg - beamCenterLonDeg) * toRad;

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  // Parity Fix: Clamp 'a' to [0, 1] before sqrt to prevent NaN from float errors
  const centralAngleRad = 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));

  // Law of cosines at satellite
  const offAxisRad = Math.atan2(
    R_E * Math.sin(centralAngleRad),
    R_E + altitudeKm - R_E * Math.cos(centralAngleRad),
  );

  const res = offAxisRad * (180 / Math.PI);
  return isNaN(res) ? 0 : res;
}
