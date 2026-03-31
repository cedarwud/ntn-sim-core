import type { SimEngineState } from './state';
import type { TrajectorySample } from '../orbit/types';
import { getOrCreateBeamLayout } from './bootstrap';

/**
 * Phase 5 Core Structural Split: Orbit/Geometry step.
 * Ownership: Satellite geometry compute and trajectory interpolation.
 */

export interface OrbitStepResult {
  /** Broad set of active satellites for interference computation. */
  activeSatSamples: Array<{ satId: string; sample: TrajectorySample }>;
  /** Only satellites above horizon for serving candidates. */
  visibleSatIds: string[];
}

export function runOrbitStep(state: SimEngineState, timeSec: number, lastTickTimeSec: number | null): OrbitStepResult {
  const geometryResult = state.bundle.geometry.compute({
    epochUtcMs: timeSec * 1000,
    tickSec: lastTickTimeSec !== null ? timeSec - lastTickTimeSec : 1,
    observerLocation: state.profile.observer,
    uePositions: state.uePositions.map((ue) => ({
      id: ue.id,
      latDeg: ue.latitudeDeg,
      lonDeg: ue.longitudeDeg,
    })),
  });

  const activeSatSamples: Array<{ satId: string; sample: TrajectorySample }> =
    geometryResult.satellites.map((satellite) => ({
      satId: satellite.satId,
      sample: satellite.sample,
    }));

  for (const { satId, sample } of activeSatSamples) {
    if (state.isMultiBeam) {
      getOrCreateBeamLayout(state, satId, sample.altKm);
    }
  }

  return {
    activeSatSamples,
    visibleSatIds: geometryResult.visibleSatIds,
  };
}
