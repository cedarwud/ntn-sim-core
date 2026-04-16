import type {
  SatelliteBeamSnapshot,
  SatelliteState,
} from '@/core/contracts/runtime-v1';
import {
  computeMovingBeamGroundTarget,
  isUeAnchoredMovingBeam,
  resolveMovingBeamProjection,
} from './moving-beam-geometry';

export interface RenderedBeamPlan {
  beam: SatelliteBeamSnapshot;
  beamIndex: number;
  satPos: [number, number, number];
  groundX: number;
  groundZ: number;
  footprintRadiusWorld: number;
  isUeAnchored: boolean;
}

export function buildRenderedBeamPlans(
  sat: SatelliteState,
  beams: readonly SatelliteBeamSnapshot[],
): RenderedBeamPlan[] {
  const projection = resolveMovingBeamProjection(sat, beams);

  return beams.map((beam, beamIndex) => {
    const target = computeMovingBeamGroundTarget(
      projection,
      beam,
      isUeAnchoredMovingBeam(beam),
    );

    return {
      beam,
      beamIndex,
      satPos: projection.satPos,
      groundX: target.groundX,
      groundZ: target.groundZ,
      footprintRadiusWorld: target.footprintRadiusWorld,
      isUeAnchored: target.isUeAnchored,
    };
  });
}
