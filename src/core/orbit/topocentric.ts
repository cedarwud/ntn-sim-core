/**
 * Topocentric (observer-relative) coordinate conversion.
 *
 * Source: adapted from leo-beam-sim/src/engine/orbit/topocentric.ts
 * Tier: normative (standard ENU frame on WGS84 ellipsoid)
 */

import { clamp, degToRad, radToDeg } from './math';
import type { ObserverContext, TopocentricPoint } from './types';

/** WGS84 semi-major axis [km]. */
const EARTH_A_KM = 6378.137;
/** WGS84 flattening. */
const EARTH_F = 1 / 298.257223563;
/** WGS84 semi-minor axis [km]. */
const EARTH_B_KM = EARTH_A_KM * (1 - EARTH_F);
/** Guard divisor floor. */
const EPSILON = 1e-9;

/**
 * Convert WGS84 geodetic coordinates to ECEF cartesian [km].
 */
export function geodeticToEcefKm(
  latDeg: number,
  lonDeg: number,
  altKm: number,
): [number, number, number] {
  const latRad = degToRad(latDeg);
  const lonRad = degToRad(lonDeg);
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);
  const e2 = 1 - (EARTH_B_KM * EARTH_B_KM) / (EARTH_A_KM * EARTH_A_KM);
  const n = EARTH_A_KM / Math.sqrt(1 - e2 * sinLat * sinLat);

  return [
    (n + altKm) * cosLat * cosLon,
    (n + altKm) * cosLat * sinLon,
    (n * (1 - e2) + altKm) * sinLat,
  ];
}

/**
 * Pre-compute observer context for fast repeated topocentric conversions.
 */
export function createObserverContext(
  latDeg: number,
  lonDeg: number,
  altKm = 0,
): ObserverContext {
  const latRad = degToRad(latDeg);
  const lonRad = degToRad(lonDeg);
  return {
    latDeg,
    lonDeg,
    latRad,
    lonRad,
    ecefKm: geodeticToEcefKm(latDeg, lonDeg, altKm),
    sinLat: Math.sin(latRad),
    cosLat: Math.cos(latRad),
    sinLon: Math.sin(lonRad),
    cosLon: Math.cos(lonRad),
  };
}

/**
 * Compute topocentric (East-North-Up) position of a satellite relative to an observer.
 * Returns azimuth (0°=N, 90°=E) and elevation above horizon.
 */
export function computeTopocentricPoint(
  observer: ObserverContext,
  satEcefKm: [number, number, number],
): TopocentricPoint {
  const dx = satEcefKm[0] - observer.ecefKm[0];
  const dy = satEcefKm[1] - observer.ecefKm[1];
  const dz = satEcefKm[2] - observer.ecefKm[2];

  const eastKm = -observer.sinLon * dx + observer.cosLon * dy;
  const northKm =
    -observer.sinLat * observer.cosLon * dx -
    observer.sinLat * observer.sinLon * dy +
    observer.cosLat * dz;
  const upKm =
    observer.cosLat * observer.cosLon * dx +
    observer.cosLat * observer.sinLon * dy +
    observer.sinLat * dz;

  const rangeKm = Math.hypot(eastKm, northKm, upKm);
  const elevationRad = Math.asin(clamp(upKm / Math.max(rangeKm, EPSILON), -1, 1));
  let azimuthDeg = radToDeg(Math.atan2(eastKm, northKm));
  if (azimuthDeg < 0) azimuthDeg += 360;

  return { eastKm, northKm, upKm, rangeKm, azimuthDeg, elevationDeg: radToDeg(elevationRad) };
}
