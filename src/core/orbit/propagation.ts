/**
 * Keplerian orbit propagation: OrbitElement → OrbitPoint at arbitrary UTC time.
 *
 * Source: adapted from leo-beam-sim/src/engine/orbit/propagation.ts
 * Tier: paper-backed (standard two-body Kepler + WGS84 geodetic)
 *
 * Method: Newton-Raphson for eccentric anomaly, ECI→ECEF via GMST, ECEF→geodetic (iterative WGS84).
 */

import { degToRad, normalizeAngleRad, radToDeg } from './math';
import type { OrbitElement, OrbitPoint } from './types';
import { MU_EARTH_KM3_S2, EARTH_RADIUS_KM, EARTH_FLATTENING, TWO_PI, DAY_SECONDS } from '@/core/common/constants';

/** WGS84 semi-minor axis [km]. */
const EARTH_B_KM = EARTH_RADIUS_KM * (1 - EARTH_FLATTENING);
/** Newton-Raphson iteration limit for eccentric anomaly. */
const KEPLER_ITERATIONS = 8;
/** Guard divisor floor to avoid division by zero. */
const EPSILON = 1e-9;
/** Geodetic convergence iterations (Bowring-style). */
const GEODETIC_ITERATIONS = 6;

/**
 * Solve Kepler's equation M = E - e·sin(E) for eccentric anomaly E
 * using Newton-Raphson iteration.
 */
function solveEccentricAnomaly(meanAnomalyRad: number, eccentricity: number): number {
  let E = meanAnomalyRad;
  for (let i = 0; i < KEPLER_ITERATIONS; i++) {
    const f = E - eccentricity * Math.sin(E) - meanAnomalyRad;
    const fPrime = 1 - eccentricity * Math.cos(E);
    E -= f / Math.max(fPrime, EPSILON);
  }
  return E;
}

/**
 * Greenwich Mean Sidereal Time in radians for a given UTC millisecond timestamp.
 * Uses the IAU formula based on Julian centuries from J2000.0.
 */
function gmstRad(utcMs: number): number {
  const jd = utcMs / 86400000 + 2440587.5;
  const centuries = (jd - 2451545.0) / 36525.0;
  const gmstDeg =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * centuries * centuries -
    (centuries * centuries * centuries) / 38710000;
  return normalizeAngleRad(degToRad(gmstDeg));
}

/**
 * Convert ECEF cartesian coordinates to WGS84 geodetic (lat, lon, alt)
 * using iterative Bowring-style method.
 */
function ecefToGeodetic(ecefKm: [number, number, number]): {
  latDeg: number;
  lonDeg: number;
  altKm: number;
} {
  const [x, y, z] = ecefKm;
  const e2 = 1 - (EARTH_B_KM * EARTH_B_KM) / (EARTH_RADIUS_KM * EARTH_RADIUS_KM);
  const p = Math.hypot(x, y);
  const lonRad = Math.atan2(y, x);

  let latRad = Math.atan2(z, p * (1 - e2));
  let altKm = 0;

  for (let i = 0; i < GEODETIC_ITERATIONS; i++) {
    const sinLat = Math.sin(latRad);
    const n = EARTH_RADIUS_KM / Math.sqrt(1 - e2 * sinLat * sinLat);
    altKm = p / Math.max(Math.cos(latRad), EPSILON) - n;
    latRad = Math.atan2(z, p * (1 - (e2 * n) / Math.max(n + altKm, EPSILON)));
  }

  return { latDeg: radToDeg(latRad), lonDeg: radToDeg(lonRad), altKm };
}

/**
 * Propagate a Keplerian OrbitElement to a specific UTC time and return
 * ECEF position + geodetic coordinates.
 */
export function propagateOrbitElement(
  element: OrbitElement,
  atUtcMs: number,
): OrbitPoint {
  const meanMotionRadPerSec = (element.meanMotionRevPerDay * TWO_PI) / DAY_SECONDS;
  const semiMajorAxisKm = Math.cbrt(
    MU_EARTH_KM3_S2 / (meanMotionRadPerSec * meanMotionRadPerSec),
  );
  const deltaSec = (atUtcMs - element.epochUtcMs) / 1000;
  const meanAnomalyRad = normalizeAngleRad(
    element.meanAnomalyRad + meanMotionRadPerSec * deltaSec,
  );
  const E = solveEccentricAnomaly(meanAnomalyRad, element.eccentricity);

  const trueAnomaly =
    2 * Math.atan2(
      Math.sqrt(1 + element.eccentricity) * Math.sin(E / 2),
      Math.sqrt(1 - element.eccentricity) * Math.cos(E / 2),
    );

  const radiusKm = semiMajorAxisKm * (1 - element.eccentricity * Math.cos(E));
  const u = element.argPerigeeRad + trueAnomaly;

  const cosO = Math.cos(element.raanRad);
  const sinO = Math.sin(element.raanRad);
  const cosI = Math.cos(element.inclinationRad);
  const sinI = Math.sin(element.inclinationRad);
  const cosU = Math.cos(u);
  const sinU = Math.sin(u);

  /* ECI position */
  const xEci = radiusKm * (cosO * cosU - sinO * sinU * cosI);
  const yEci = radiusKm * (sinO * cosU + cosO * sinU * cosI);
  const zEci = radiusKm * (sinU * sinI);

  /* ECI → ECEF rotation by GMST */
  const theta = gmstRad(atUtcMs);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  const xEcef = cosT * xEci + sinT * yEci;
  const yEcef = -sinT * xEci + cosT * yEci;
  const zEcef = zEci;

  const geo = ecefToGeodetic([xEcef, yEcef, zEcef]);

  return {
    ecefKm: [xEcef, yEcef, zEcef],
    latDeg: geo.latDeg,
    lonDeg: geo.lonDeg,
    altKm: geo.altKm,
  };
}
