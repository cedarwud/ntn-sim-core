/**
 * Beam satellite selection — decides which satellites get beam cones rendered.
 *
 * Separated from renderer so that the composition layer (SceneShell/BeamLayers)
 * controls which satellites are selected, and renderers only draw what they receive.
 *
 * VISUAL-ONLY: Does NOT affect physics, SINR, or KPI.
 */

import type { SimulationSnapshot, SatelliteState } from '@/core/common/types';

const MIN_BEAM_ELEVATION_DEG = 10;

/** Tier 2: background candidate satellites shown faintly before handover triggers. */
const MIN_CANDIDATE_ELEVATION_DEG = 20;
const MAX_CANDIDATE_SATS = 3;

/**
 * Select satellites whose beams should be rendered as 3D cones.
 *
 * Tier 1 (HO-relevant): serving / target / secondary / DAPS / explicit beam roles.
 * Tier 2 (background candidates): top-N visible sats ≥20° elevation not already in Tier 1.
 *   These are rendered faintly (neutral role, single center beam) to show the upcoming
 *   candidate pool BEFORE a handover is actually triggered.
 */
export function selectBeamSatellites(snapshot: SimulationSnapshot): SatelliteState[] {
  const primaryUe = snapshot.ues[0];
  const tier1Ids = new Set<string>();

  if (primaryUe?.servingSatId) tier1Ids.add(primaryUe.servingSatId);
  if (primaryUe?.targetSatId) tier1Ids.add(primaryUe.targetSatId);
  if (primaryUe?.secondarySatId) tier1Ids.add(primaryUe.secondarySatId);
  if (snapshot.daps?.targetSatId) tier1Ids.add(snapshot.daps.targetSatId);

  for (const sat of snapshot.satellites) {
    if (sat.beams?.some((b) => b.role === 'prepared' || b.role === 'secondary' || b.role === 'post-ho')) {
      tier1Ids.add(sat.id);
    }
  }

  // Tier 2: top candidates by elevation (not already Tier 1)
  const candidateIds = new Set<string>(tier1Ids);
  const sorted = snapshot.satellites
    .filter(
      (s) =>
        s.isVisible &&
        s.elevationDeg >= MIN_CANDIDATE_ELEVATION_DEG &&
        s.beams && s.beams.length > 0 &&
        !tier1Ids.has(s.id),
    )
    .sort((a, b) => b.elevationDeg - a.elevationDeg);

  for (let i = 0; i < Math.min(sorted.length, MAX_CANDIDATE_SATS); i++) {
    candidateIds.add(sorted[i].id);
  }

  return snapshot.satellites.filter(
    (s) => s.isVisible && s.elevationDeg >= MIN_BEAM_ELEVATION_DEG && s.beams && s.beams.length > 0 && candidateIds.has(s.id),
  );
}

/**
 * Select satellite IDs eligible for earth-fixed hex cell analysis.
 * Uses the same satellites that have visible beam cones (selectBeamSatellites),
 * so hex cells only light up where a rendered beam actually covers them.
 */
export function selectCellCandidateSatIds(snapshot: SimulationSnapshot): Set<string> {
  const beamSats = selectBeamSatellites(snapshot);
  return new Set(beamSats.map((s) => s.id));
}
