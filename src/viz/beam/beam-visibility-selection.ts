/**
 * Beam satellite selection — decides which satellites get beam cones rendered.
 *
 * Separated from renderer so that the composition layer (SceneShell/BeamLayers)
 * controls which satellites are selected, and renderers only draw what they receive.
 *
 * VISUAL-ONLY: Does NOT affect physics, SINR, or KPI.
 */

import type { SimulationSnapshot, SatelliteState } from '@/core/contracts/runtime-v1';
import { collectTier1SatelliteIds } from '@/viz/tier1-satellite-selection';

const MIN_BEAM_ELEVATION_DEG = 10;

/** Tier 2: background candidate satellites shown faintly before handover triggers. */
const MIN_CANDIDATE_ELEVATION_DEG = 20;
const MAX_CANDIDATE_SATS = 3;

/**
 * Select satellites whose beams should be rendered as 3D cones.
 *
 * Tier 1 (HO-relevant): serving / target / secondary / DAPS / explicit beam roles.
 * Tier 2 (background candidates): top-N visible sats ≥20° elevation not already in Tier 1.
 *   These are only shown when the scene is not already focused on a BH-active
 *   tier-1 handover context; otherwise they are suppressed so the renderer and
 *   BH cell layer stay aligned on the same satellite set.
 */
export function selectBeamSatellites(snapshot: SimulationSnapshot): SatelliteState[] {
  const tier1Ids = collectTier1SatelliteIds(snapshot);
  const includeBackgroundCandidates = tier1Ids.size === 0 || !snapshot.bhSlot;

  const renderedSatIds = new Set<string>(tier1Ids);
  if (includeBackgroundCandidates) {
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
      renderedSatIds.add(sorted[i].id);
    }
  }

  return snapshot.satellites.filter(
    (s) => s.isVisible && s.elevationDeg >= MIN_BEAM_ELEVATION_DEG && s.beams && s.beams.length > 0 && renderedSatIds.has(s.id),
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
