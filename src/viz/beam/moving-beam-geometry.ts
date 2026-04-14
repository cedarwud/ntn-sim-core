import type { SatelliteBeamSnapshot, SatelliteState } from '@/core/contracts/runtime-v1';
import {
  DEFAULT_SKY_PROJECTION,
  projectToSkyDome,
} from '@/viz/satellite/observer-sky-projection';
import { MOVING_BEAM_FOOTPRINT_RADIUS_WORLD } from './beam-visual-constants';

/**
 * VISUAL-ONLY moving-beam projection constants.
 *
 * Beam footprint radius in world units. Independent from hex cell sizing in bh-cell-analysis.
 *   kmToWorld = MOVING_BEAM_FOOTPRINT_RADIUS_WORLD / footprintRadiusKm
 *   footprintRadiusWorld = MOVING_BEAM_FOOTPRINT_RADIUS_WORLD
 * Ring-1 beams at beamSpacingKm offset → beamSpacingKm × kmToWorld ≈ HEX_SPACING_WU.
 */
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
  void beam;
  // The bounded-steering slice publishes beam offsets from satellite nadir, so
  // renderer projection must follow those truth offsets instead of pinning
  // serving/target roles back to the observer origin.
  return false;
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

  // The moving-beam layer now projects every beam from the satellite-relative
  // ground lattice published by the engine. That keeps the frontend aligned
  // with bounded-steering truth instead of re-centering special roles locally.
  return {
    satX,
    satY,
    satZ,
    groundX: satX + beam.offsetEastKm * projection.kmToWorld,
    groundZ: satZ - beam.offsetNorthKm * projection.kmToWorld,
    beamSpacingKm: projection.beamSpacingKm,
    footprintRadiusKm: projection.footprintRadiusKm,
    kmToWorld: projection.kmToWorld,
    footprintRadiusWorld: projection.footprintRadiusWorld,
    isUeAnchored,
  };
}
