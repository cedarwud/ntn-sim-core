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

/**
 * Select satellites whose beams should be rendered as 3D cones.
 * Includes: serving, target, secondary, DAPS, and any with special beam roles.
 */
export function selectBeamSatellites(snapshot: SimulationSnapshot): SatelliteState[] {
  const primaryUe = snapshot.ues[0];
  const ids = new Set<string>();

  if (primaryUe?.servingSatId) ids.add(primaryUe.servingSatId);
  if (primaryUe?.targetSatId) ids.add(primaryUe.targetSatId);
  if (primaryUe?.secondarySatId) ids.add(primaryUe.secondarySatId);
  if (snapshot.daps?.targetSatId) ids.add(snapshot.daps.targetSatId);

  for (const sat of snapshot.satellites) {
    if (sat.beams?.some((b) => b.role === 'prepared' || b.role === 'secondary' || b.role === 'post-ho')) {
      ids.add(sat.id);
    }
  }

  return snapshot.satellites.filter(
    (s) => s.isVisible && s.elevationDeg >= MIN_BEAM_ELEVATION_DEG && s.beams && s.beams.length > 0 && ids.has(s.id),
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
