import type { SatelliteBeamSnapshot, SatelliteState } from '@/core/contracts/runtime-v1';
import type { BeamPresentationFrame } from '@/viz/presentation';
import type { EarthMovingLayerSummary } from '@/viz/validation/store';
import { MOVING_BEAM_FOOTPRINT_RADIUS_WORLD } from './beam-visual-constants';
import { buildRenderedBeamPlans } from './earth-moving-beam-plans';

export function buildEarthMovingBeamLayerSummary(
  beamSats: SatelliteState[],
  presentationFrame: BeamPresentationFrame | null,
): EarthMovingLayerSummary {
  const roleCounts: Record<string, number> = {};
  let renderedBeamCount = 0;
  const renderedSatIds: string[] = [];
  const geometrySamples = [];
  const eventSatIdSet = new Set(presentationFrame?.eventSatIds ?? []);

  for (const sat of beamSats) {
    const primaryBeamId = presentationFrame?.primaryBeamBySatId[sat.id];
    const contextBeamIds = presentationFrame?.contextBeamIdsBySatId[sat.id] ?? [];
    const selectedBeamIds = primaryBeamId
      ? [primaryBeamId, ...contextBeamIds]
      : [];
    const chosenBeams = selectedBeamIds
      .map((beamId) => sat.beams?.find((beam) => beam.beamId === beamId) ?? null)
      .filter((beam): beam is SatelliteBeamSnapshot => beam !== null);
    const renderedBeamPlans = buildRenderedBeamPlans(sat, chosenBeams);
    if (renderedBeamPlans.length > 0) {
      renderedSatIds.push(sat.id);
    }
    renderedBeamCount += renderedBeamPlans.length;

    for (const { beam, satPos, groundX, groundZ, isUeAnchored } of renderedBeamPlans) {
      roleCounts[beam.role] = (roleCounts[beam.role] ?? 0) + 1;
      geometrySamples.push({
        satId: sat.id,
        beamId: beam.beamId,
        role: beam.role,
        isActive: beam.isActive,
        isCandidate: !eventSatIdSet.has(sat.id),
        isUeAnchored,
        satX: satPos[0],
        satZ: satPos[2],
        groundX,
        groundZ,
        offsetEastKm: beam.offsetEastKm,
        offsetNorthKm: beam.offsetNorthKm,
      });
    }
  }

  return {
    present: beamSats.length > 0,
    renderedSatIds,
    renderedBeamCount,
    footprintRadiusWorld: MOVING_BEAM_FOOTPRINT_RADIUS_WORLD,
    roleCounts,
    geometrySamples,
  };
}
