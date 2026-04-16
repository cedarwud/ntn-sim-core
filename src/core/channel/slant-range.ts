import { EARTH_RADIUS_KM } from '@/core/common/constants';
import type { TrajectorySample } from '../orbit/types';
import {
  createObserverContext,
  computeTopocentricPoint,
  geodeticToEcefKm,
} from '../orbit/topocentric';

export interface LinkGeometry {
  elevationDeg: number;
  slantRangeKm: number;
}

/**
 * 3GPP TR 38.811 Eq. (6.6-3): slant range as a function of elevation angle.
 * `alpha` is elevation, not HOBS off-axis angle.
 */
export function computeTr38811SlantRangeKm(
  elevationDeg: number,
  altitudeKm: number,
  earthRadiusKm: number = EARTH_RADIUS_KM,
): number {
  const alphaRad = (elevationDeg * Math.PI) / 180;
  const sinAlpha = Math.sin(alphaRad);
  const rangeKm = Math.sqrt(
    (earthRadiusKm * earthRadiusKm * sinAlpha * sinAlpha)
      + (altitudeKm * altitudeKm)
      + (2 * altitudeKm * earthRadiusKm),
  ) - (earthRadiusKm * sinAlpha);
  return Math.max(0, rangeKm);
}

/**
 * Per-UE topocentric geometry for one satellite sample.
 * This keeps access-channel truth tied to the actual UE location instead of
 * reusing the observer-centric sample for every UE.
 */
export function computeUeLinkGeometry(
  sample: Pick<TrajectorySample, 'latDeg' | 'lonDeg' | 'altKm'>,
  ue: { latitudeDeg: number; longitudeDeg: number },
): LinkGeometry {
  const observer = createObserverContext(ue.latitudeDeg, ue.longitudeDeg, 0);
  const satEcefKm = geodeticToEcefKm(sample.latDeg, sample.lonDeg, sample.altKm);
  const topocentric = computeTopocentricPoint(observer, satEcefKm);
  return {
    elevationDeg: topocentric.elevationDeg,
    slantRangeKm: topocentric.rangeKm,
  };
}
