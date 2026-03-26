/**
 * SGP4 adapter: bridge satellite.js propagation output to ntn-sim-core OrbitPoint interface.
 *
 * Source: satellite.js (Vallado SGP4 reference implementation)
 * Tier: standard-backed
 *
 * This file must not import React, Three.js, or scene code.
 */

import {
  propagate,
  gstime,
  eciToEcf,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from 'satellite.js';
import type { OrbitElement, OrbitPoint } from './types';
import type { SatrecEntry } from './tle-loader';
import { EARTH_RADIUS_KM, TWO_PI, MU_EARTH_KM3_S2, DAY_SECONDS } from '@/core/common/constants';

/**
 * Propagate a satellite.js SatRec to a given UTC time.
 * Returns OrbitPoint or null on propagation error.
 */
export function propagateSgp4(satrec: any, atUtcMs: number): OrbitPoint | null {
  try {
    const date = new Date(atUtcMs);
    const result = propagate(satrec, date);

    if (
      !result ||
      typeof result.position === 'boolean' ||
      !result.position ||
      !isFiniteVec(result.position)
    ) {
      return null;
    }

    const gmst = gstime(date);
    const positionEci = result.position as { x: number; y: number; z: number };
    const ecef = eciToEcf(positionEci, gmst);
    const geo = eciToGeodetic(positionEci, gmst);

    if (!isFiniteVec(ecef)) return null;

    return {
      ecefKm: [ecef.x, ecef.y, ecef.z],
      latDeg: degreesLat(geo.latitude),
      lonDeg: degreesLong(geo.longitude),
      altKm: geo.height, // satellite.js returns height in km
    };
  } catch {
    return null;
  }
}

/**
 * Convert TLE-derived SatrecEntries into OrbitElement objects for compatibility
 * with the existing trajectory cache and Walker-based pipeline.
 *
 * The resulting OrbitElements use the osculating elements embedded in the SatRec
 * and carry a reference to the SatRec for SGP4 propagation.
 */
export function satrecsToOrbitElements(satrecs: SatrecEntry[]): OrbitElement[] {
  return satrecs.map((entry) => {
    const sr = entry.satrec;

    // satellite.js stores mean motion in rad/min internally as `no`
    const meanMotionRadPerMin: number = sr.no;
    const meanMotionRevPerDay = (meanMotionRadPerMin * 60 * 24) / TWO_PI;

    // Derive altitude from mean motion: a = (mu / n^2)^(1/3) - R_earth
    const meanMotionRadPerSec = meanMotionRadPerMin / 60;
    const semiMajorKm = Math.cbrt(MU_EARTH_KM3_S2 / (meanMotionRadPerSec * meanMotionRadPerSec));
    const altitudeKm = semiMajorKm - EARTH_RADIUS_KM;

    // Epoch: satellite.js stores jdsatepoch (Julian day) and jdsatepochF (fractional)
    const jd = (sr.jdsatepoch ?? 0) + (sr.jdsatepochF ?? 0);
    const epochUtcMs = (jd - 2440587.5) * 86400000;

    return {
      id: entry.id,
      shellId: 'tle',
      altitudeKm,
      epochUtcMs,
      eccentricity: sr.ecco ?? 0,
      inclinationRad: sr.inclo ?? 0,
      raanRad: sr.nodeo ?? 0,
      argPerigeeRad: sr.argpo ?? 0,
      meanAnomalyRad: sr.mo ?? 0,
      meanMotionRevPerDay,
    } satisfies OrbitElement;
  });
}

function isFiniteVec(v: { x: number; y: number; z: number }): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}
