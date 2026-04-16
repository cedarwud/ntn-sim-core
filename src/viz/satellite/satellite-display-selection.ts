import type {
  SatelliteState,
  SimulationSnapshot,
} from '@/core/contracts/runtime-v1';
import { collectTier1SatelliteIds } from '@/viz/tier1-satellite-selection';

export const MAX_DISPLAY_SATS = 10;
export const MIN_DISPLAY_ELEVATION_DEG = 10;

const LOW_ELEVATION_PENALTY_THRESHOLD_DEG = 25;
const LOW_ELEVATION_PENALTY = -500;
const HO_RELEVANT_BONUS = 10000;
const CONTINUITY_BONUS = 20;
const MIN_AZIMUTH_SEPARATION_DEG = 30;
const AZIMUTH_PROXIMITY_PENALTY = -200;
const NARRATIVE_CLUSTER_BONUS = 350;
const NARRATIVE_CLUSTER_MIN_ELEVATION_DEG = 25;
const NARRATIVE_CLUSTER_MAX_AZIMUTH_SPREAD_DEG = 60;

/** Shortest angular distance between two azimuths (0-180°). */
function azimuthDistance(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

export function selectDisplaySatellites(
  satellites: SatelliteState[],
  snapshot: SimulationSnapshot,
  previousIds: ReadonlySet<string>,
  options?: {
    tier1SatIds?: ReadonlySet<string>;
    narrativeAnchorSatId?: string | null;
  },
): SatelliteState[] {
  const tier1Ids = options?.tier1SatIds ?? collectTier1SatelliteIds(snapshot);
  const servingSatId = options?.narrativeAnchorSatId
    ?? snapshot.ues[0]?.servingSatId
    ?? null;
  const servingSat = servingSatId
    ? satellites.find((sat) => sat.id === servingSatId) ?? null
    : null;
  const narrativeAnchorAzimuthDeg = servingSat?.isVisible ? servingSat.azimuthDeg : null;
  const candidates = satellites.filter(
    (sat) => sat.isVisible && sat.elevationDeg >= MIN_DISPLAY_ELEVATION_DEG,
  );

  const pool = candidates.map((sat) => {
    let score = sat.elevationDeg;
    if (tier1Ids.has(sat.id)) score += HO_RELEVANT_BONUS;
    if (previousIds.has(sat.id)) score += CONTINUITY_BONUS;
    const withinNarrativeCluster = narrativeAnchorAzimuthDeg !== null
      && sat.elevationDeg >= NARRATIVE_CLUSTER_MIN_ELEVATION_DEG
      && azimuthDistance(sat.azimuthDeg, narrativeAnchorAzimuthDeg) <= NARRATIVE_CLUSTER_MAX_AZIMUTH_SPREAD_DEG;
    if (withinNarrativeCluster) score += NARRATIVE_CLUSTER_BONUS;
    if (sat.elevationDeg < LOW_ELEVATION_PENALTY_THRESHOLD_DEG) {
      score += LOW_ELEVATION_PENALTY;
    }
    return { sat, baseScore: score, withinNarrativeCluster };
  });

  const selected: SatelliteState[] = [];
  const selectedAzimuths: number[] = [];
  const used = new Set<string>();

  for (let round = 0; round < MAX_DISPLAY_SATS && pool.length > 0; round++) {
    let bestIdx = -1;
    let bestEffective = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      if (used.has(pool[i].sat.id)) continue;
      let effective = pool[i].baseScore;

      if (!tier1Ids.has(pool[i].sat.id) && !pool[i].withinNarrativeCluster) {
        for (const azimuth of selectedAzimuths) {
          if (azimuthDistance(pool[i].sat.azimuthDeg, azimuth) < MIN_AZIMUTH_SEPARATION_DEG) {
            effective += AZIMUTH_PROXIMITY_PENALTY;
            break;
          }
        }
      }

      if (effective > bestEffective) {
        bestEffective = effective;
        bestIdx = i;
      }
    }

    if (bestIdx < 0) break;
    const pick = pool[bestIdx];
    selected.push(pick.sat);
    selectedAzimuths.push(pick.sat.azimuthDeg);
    used.add(pick.sat.id);
  }

  return selected;
}
