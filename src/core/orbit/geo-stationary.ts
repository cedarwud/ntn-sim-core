/**
 * GEO satellite orbit helpers: fixed sub-satellite point, no Kepler propagation.
 *
 * Tier: paper-backed (standard GEO assumptions)
 * This file must not import React, Three.js, or scene code.
 */

import { EARTH_RADIUS_KM, MU_EARTH_KM3_S2, TWO_PI } from '@/core/common/constants';
import { degToRad } from './math';
import type { GeoStationaryConfig, OrbitElement, OrbitPoint } from './types';

/** Standard GEO altitude (km). */
const GEO_ALTITUDE_KM = 35786;

/** Sidereal day in seconds. */
const SIDEREAL_DAY_SEC = 86164.1;

/**
 * Convert GEO fixed-position configs to OrbitElement objects.
 * GEO sats are placed at 0-deg inclination, near-zero eccentricity,
 * with RAAN set to the desired longitude offset from the vernal equinox.
 */
export function geoConfigToOrbitElements(
  configs: GeoStationaryConfig[],
  epochUtcMs: number,
): OrbitElement[] {
  const altKm = GEO_ALTITUDE_KM;
  const semiMajorKm = EARTH_RADIUS_KM + altKm;
  const meanMotionRadPerSec = Math.sqrt(MU_EARTH_KM3_S2 / (semiMajorKm ** 3));
  const meanMotionRevPerDay = (meanMotionRadPerSec * 86400) / TWO_PI;

  return configs.map((cfg) => ({
    id: cfg.id,
    shellId: 'geo',
    altitudeKm: cfg.altitudeKm ?? altKm,
    orbitType: 'geo' as const,
    epochUtcMs,
    eccentricity: 0.0001,
    inclinationRad: 0,
    raanRad: degToRad(cfg.longitudeDeg),
    argPerigeeRad: 0,
    meanAnomalyRad: 0,
    meanMotionRevPerDay,
  }));
}

/**
 * Propagate a GEO satellite to a given UTC time.
 * Returns a fixed sub-satellite point that rotates with the Earth.
 * GEO sats are effectively stationary over their longitude.
 */
export function propagateGeo(element: OrbitElement, _atUtcMs: number): OrbitPoint {
  const altKm = element.altitudeKm;
  const lonDeg = (element.raanRad * 180) / Math.PI;
  const lonRad = element.raanRad;
  const r = EARTH_RADIUS_KM + altKm;

  // ECEF: GEO sat is on the equatorial plane at fixed longitude
  const x = r * Math.cos(lonRad);
  const y = r * Math.sin(lonRad);
  const z = 0;

  return {
    ecefKm: [x, y, z],
    latDeg: 0,
    lonDeg,
    altKm,
  };
}
