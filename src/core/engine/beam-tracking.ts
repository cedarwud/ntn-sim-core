import type { BeamSelectionResult, SatelliteBeamLayout } from '../beam/types';
import { selectBeamForUe } from '../beam/selection';
import type {
  AntennaConfig,
  BeamConfig,
  BeamSemantics,
  EarthMovingBeamTrackingMode,
} from '../profiles/types';
import type { TrajectorySample } from '../orbit/types';
import { computeUeOffsetFromNadir } from './ue-nadir-offset';

const ELIGIBILITY_EPSILON_KM = 1e-6;

export interface BeamTrackingSelection {
  selection: BeamSelectionResult;
  trackingMode: EarthMovingBeamTrackingMode | 'earth-fixed-bh';
  serviceEligible: boolean;
  beamCenterOffsetEastKm: number;
  beamCenterOffsetNorthKm: number;
  ueOffsetFromNadirEastKm: number;
  ueOffsetFromNadirNorthKm: number;
  residualOffsetEastKm: number;
  residualOffsetNorthKm: number;
}

type BeamTrackingProfile = {
  beamSemantics: BeamSemantics;
  beam: Pick<BeamConfig, 'tracking_mode' | 'steering_bound_km'>;
  antenna: AntennaConfig;
};

type BeamCenterShift = {
  eastKm: number;
  northKm: number;
};

function resolveEarthMovingTrackingMode(
  profile: BeamTrackingProfile,
): EarthMovingBeamTrackingMode {
  return profile.beam.tracking_mode ?? 'ue-anchored-steering';
}

function clampVectorToMagnitude(
  eastKm: number,
  northKm: number,
  maxMagnitudeKm: number,
): { eastKm: number; northKm: number } {
  if (maxMagnitudeKm <= 0) return { eastKm: 0, northKm: 0 };

  const magnitudeKm = Math.hypot(eastKm, northKm);
  if (magnitudeKm <= maxMagnitudeKm || magnitudeKm <= ELIGIBILITY_EPSILON_KM) {
    return { eastKm, northKm };
  }

  const scale = maxMagnitudeKm / magnitudeKm;
  return {
    eastKm: eastKm * scale,
    northKm: northKm * scale,
  };
}

function computeBestBeamGroundDistanceKm(
  layout: SatelliteBeamLayout,
  selection: BeamSelectionResult,
  residualOffsetEastKm: number,
  residualOffsetNorthKm: number,
  activeBeamIds?: readonly string[],
): number {
  const activeBeamSet = activeBeamIds ? new Set(activeBeamIds) : null;
  const bestBeam = layout.beams.find(
    (beam) =>
      beam.beamId === selection.bestBeamId
      && (!activeBeamSet || activeBeamSet.has(beam.beamId)),
  );
  if (!bestBeam) return Number.POSITIVE_INFINITY;

  return Math.hypot(
    residualOffsetEastKm - bestBeam.offsetEastKm,
    residualOffsetNorthKm - bestBeam.offsetNorthKm,
  );
}

function buildTrackedSelection(
  profile: BeamTrackingProfile,
  layout: SatelliteBeamLayout,
  ueOffset: BeamCenterShift,
  beamCenterShift: BeamCenterShift,
  activeBeamIds?: readonly string[],
  trackingMode: BeamTrackingSelection['trackingMode'] = 'earth-fixed-bh',
): BeamTrackingSelection {
  const residualOffsetEastKm = ueOffset.eastKm - beamCenterShift.eastKm;
  const residualOffsetNorthKm = ueOffset.northKm - beamCenterShift.northKm;

  const selection = selectBeamForUe(
    layout,
    residualOffsetEastKm,
    residualOffsetNorthKm,
    profile.antenna,
    activeBeamIds,
  );

  const bestBeamGroundDistanceKm = computeBestBeamGroundDistanceKm(
    layout,
    selection,
    residualOffsetEastKm,
    residualOffsetNorthKm,
    activeBeamIds,
  );
  const footprintRadiusKm = layout.beamDiameterKm / 2;

  return {
    selection,
    trackingMode,
    serviceEligible: bestBeamGroundDistanceKm <= footprintRadiusKm + ELIGIBILITY_EPSILON_KM,
    beamCenterOffsetEastKm: beamCenterShift.eastKm,
    beamCenterOffsetNorthKm: beamCenterShift.northKm,
    ueOffsetFromNadirEastKm: ueOffset.eastKm,
    ueOffsetFromNadirNorthKm: ueOffset.northKm,
    residualOffsetEastKm,
    residualOffsetNorthKm,
  };
}

/**
 * Re-evaluate a UE against an already-tracked lattice shift.
 *
 * Shared-serving Phase-A KPI/SINR paths use this helper so every UE sees the
 * same per-satellite tracked lattice truth that drove candidate generation,
 * instead of re-steering each satellite independently toward every UE.
 */
export function evaluateShiftedBeamSelection(
  profile: BeamTrackingProfile,
  layout: SatelliteBeamLayout,
  satSample: Pick<TrajectorySample, 'latDeg' | 'lonDeg'>,
  uePosition: { latitudeDeg: number; longitudeDeg: number },
  beamCenterShift: BeamCenterShift,
  activeBeamIds?: readonly string[],
): BeamTrackingSelection {
  const ueOffset = computeUeOffsetFromNadir(
    satSample.latDeg,
    satSample.lonDeg,
    uePosition.latitudeDeg,
    uePosition.longitudeDeg,
  );

  return buildTrackedSelection(
    profile,
    layout,
    ueOffset,
    beamCenterShift,
    activeBeamIds,
    profile.beamSemantics === 'earth-moving'
      ? resolveEarthMovingTrackingMode(profile)
      : 'earth-fixed-bh',
  );
}

export function evaluateTrackedBeamSelection(
  profile: BeamTrackingProfile,
  layout: SatelliteBeamLayout,
  satSample: Pick<TrajectorySample, 'latDeg' | 'lonDeg'>,
  uePosition: { latitudeDeg: number; longitudeDeg: number },
  activeBeamIds?: readonly string[],
): BeamTrackingSelection {
  const ueOffset = computeUeOffsetFromNadir(
    satSample.latDeg,
    satSample.lonDeg,
    uePosition.latitudeDeg,
    uePosition.longitudeDeg,
  );

  let beamCenterOffsetEastKm = 0;
  let beamCenterOffsetNorthKm = 0;
  let trackingMode: BeamTrackingSelection['trackingMode'] = 'earth-fixed-bh';

  if (profile.beamSemantics === 'earth-moving') {
    trackingMode = resolveEarthMovingTrackingMode(profile);
    if (trackingMode === 'ue-anchored-steering') {
      beamCenterOffsetEastKm = ueOffset.eastKm;
      beamCenterOffsetNorthKm = ueOffset.northKm;
    } else {
      const steeringBoundKm = profile.beam.steering_bound_km ?? 0;
      const boundedShift = clampVectorToMagnitude(
        ueOffset.eastKm,
        ueOffset.northKm,
        steeringBoundKm,
      );
      beamCenterOffsetEastKm = boundedShift.eastKm;
      beamCenterOffsetNorthKm = boundedShift.northKm;
    }
  }

  return buildTrackedSelection(
    profile,
    layout,
    ueOffset,
    {
      eastKm: beamCenterOffsetEastKm,
      northKm: beamCenterOffsetNorthKm,
    },
    activeBeamIds,
    trackingMode,
  );
}
