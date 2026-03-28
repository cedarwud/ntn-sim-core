import type { SatelliteBeamSnapshot, SatelliteState } from '@/core/common/types';
import {
  DEFAULT_SKY_PROJECTION,
  projectToSkyDome,
} from '@/viz/satellite/observer-sky-projection';

/**
 * VISUAL-ONLY moving-beam projection constants.
 *
 * Donor-aligned contract:
 * - `leo-beam-sim` keeps one footprint radius in world units for readability
 * - beam offsets are then scaled from beam-footprint km into world units
 */
export const MOVING_BEAM_FOOTPRINT_RADIUS_WORLD = 56;
export const MOVING_BEAM_GROUND_Y = 1;

const EPSILON_KM = 1e-6;
const DEFAULT_FOOTPRINT_RADIUS_KM = 25;

export interface MovingBeamProjection {
  satPos: [number, number, number];
  beamSpacingKm: number;
  footprintRadiusKm: number;
  kmToWorld: number;
  footprintRadiusWorld: number;
}

export interface MovingBeamGroundTarget {
  satX: number;
  satY: number;
  satZ: number;
  groundX: number;
  groundZ: number;
  beamSpacingKm: number;
  footprintRadiusKm: number;
  kmToWorld: number;
  footprintRadiusWorld: number;
  isUeAnchored: boolean;
}

export function isUeAnchoredMovingBeam(beam: SatelliteBeamSnapshot): boolean {
  return beam.role === 'serving'
    || beam.role === 'prepared'
    || beam.role === 'secondary'
    || beam.role === 'post-ho';
}

export function resolveMovingBeamProjection(
  sat: SatelliteState,
  beams: readonly SatelliteBeamSnapshot[],
): MovingBeamProjection {
  const satPos = projectToSkyDome(
    sat.azimuthDeg,
    sat.elevationDeg,
    DEFAULT_SKY_PROJECTION,
  );

  const beamSpacingKm = beams
    .map((beam) => Math.hypot(beam.offsetEastKm, beam.offsetNorthKm))
    .filter((distanceKm) => distanceKm > EPSILON_KM)
    .sort((a, b) => a - b)[0] ?? (DEFAULT_FOOTPRINT_RADIUS_KM * Math.sqrt(3));

  const footprintRadiusKm = beamSpacingKm / Math.sqrt(3);
  const kmToWorld = MOVING_BEAM_FOOTPRINT_RADIUS_WORLD / Math.max(footprintRadiusKm, EPSILON_KM);

  return {
    satPos,
    beamSpacingKm,
    footprintRadiusKm,
    kmToWorld,
    footprintRadiusWorld: MOVING_BEAM_FOOTPRINT_RADIUS_WORLD,
  };
}

export function computeMovingBeamGroundTarget(
  projection: MovingBeamProjection,
  beam: SatelliteBeamSnapshot,
  isUeAnchored: boolean,
): MovingBeamGroundTarget {
  const [satX, satY, satZ] = projection.satPos;

  return {
    satX,
    satY,
    satZ,
    groundX: isUeAnchored ? 0 : satX + beam.offsetEastKm * projection.kmToWorld,
    groundZ: isUeAnchored ? 0 : satZ - beam.offsetNorthKm * projection.kmToWorld,
    beamSpacingKm: projection.beamSpacingKm,
    footprintRadiusKm: projection.footprintRadiusKm,
    kmToWorld: projection.kmToWorld,
    footprintRadiusWorld: projection.footprintRadiusWorld,
    isUeAnchored,
  };
}
