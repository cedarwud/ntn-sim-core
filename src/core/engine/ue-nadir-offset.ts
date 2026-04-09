import type { BeamSelectionResult, SatelliteBeamLayout } from '../beam/types';
import { selectBeamForUe } from '../beam/selection';
import type { TrajectorySample } from '../orbit/types';
import type { AntennaConfig } from '../profiles/types';

/**
 * Compute UE ground-plane offset relative to a satellite's sub-satellite point.
 *
 * Beam layouts are defined in ENU coordinates centered on the nadir (sub-satellite
 * point). To select the correct beam for a UE, we need the UE's east/north offset
 * from *each satellite's* nadir -- not from the observer or from (0,0).
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md SS9.2.2 Beam-Gain Mapping
 *   - Tier: normative geometry helper
 *   - This file must not import React, Three.js, or scene code.
 */

const EARTH_RADIUS_KM = 6371;
const DEG2RAD = Math.PI / 180;

function normalizeDeltaLongitudeDeg(deltaLonDeg: number): number {
  let normalized = deltaLonDeg;
  while (normalized > 180) normalized -= 360;
  while (normalized < -180) normalized += 360;
  return normalized;
}

/**
 * Flat-Earth approximation of east/north offset from satellite nadir to UE.
 *
 * Accurate to < 0.3 % for separations under ~200 km (typical beam footprint).
 */
export function computeUeOffsetFromNadir(
  satLatDeg: number,
  satLonDeg: number,
  ueLatDeg: number,
  ueLonDeg: number,
): { eastKm: number; northKm: number } {
  const dLatRad = (ueLatDeg - satLatDeg) * DEG2RAD;
  const dLonRad = normalizeDeltaLongitudeDeg(ueLonDeg - satLonDeg) * DEG2RAD;
  return {
    eastKm: dLonRad * EARTH_RADIUS_KM * Math.cos(satLatDeg * DEG2RAD),
    northKm: dLatRad * EARTH_RADIUS_KM,
  };
}

/**
 * Select the best beam using the UE's geodetic position relative to the
 * satellite sub-point at this tick.
 */
export function selectBeamForGeodeticUe(
  layout: SatelliteBeamLayout,
  satSample: Pick<TrajectorySample, 'latDeg' | 'lonDeg'>,
  uePosition: { latitudeDeg: number; longitudeDeg: number },
  antennaConfig: AntennaConfig,
  activeBeamIds?: readonly string[],
): BeamSelectionResult {
  const offset = computeUeOffsetFromNadir(
    satSample.latDeg,
    satSample.lonDeg,
    uePosition.latitudeDeg,
    uePosition.longitudeDeg,
  );
  return selectBeamForUe(
    layout,
    offset.eastKm,
    offset.northKm,
    antennaConfig,
    activeBeamIds,
  );
}
