import type { SimulationSnapshot, SatelliteState } from '@/core/contracts/runtime-v1';

function hasExplicitBeamContinuityRole(sat: SatelliteState): boolean {
  return sat.beams?.some(
    (beam) =>
      beam.role === 'prepared'
      || beam.role === 'secondary'
      || beam.role === 'post-ho',
  ) ?? false;
}

/**
 * Collect the satellites that are continuity-relevant for the current frame.
 *
 * This is the shared Tier-1 source for beam and sky renderers:
 * serving / target / secondary / DAPS target satellites are always included,
 * and any satellite that already carries an explicit continuity beam role in
 * the snapshot is promoted into the same set.
 */
export function collectTier1SatelliteIds(snapshot: SimulationSnapshot): Set<string> {
  const ids = new Set<string>();
  const primaryUe = snapshot.ues[0];

  if (primaryUe?.servingSatId) ids.add(primaryUe.servingSatId);
  if (primaryUe?.targetSatId) ids.add(primaryUe.targetSatId);
  if (primaryUe?.secondarySatId) ids.add(primaryUe.secondarySatId);
  if (snapshot.daps?.targetSatId) ids.add(snapshot.daps.targetSatId);

  for (const sat of snapshot.satellites) {
    if (hasExplicitBeamContinuityRole(sat)) {
      ids.add(sat.id);
    }
  }

  return ids;
}
