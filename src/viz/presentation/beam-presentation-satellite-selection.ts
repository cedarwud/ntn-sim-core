import type {
  SatelliteState,
  SimulationSnapshot,
} from '@/core/contracts/runtime-v1';
import type { ContinuityNarrativeState } from './continuity-narrative-state';

import {
  MAX_CONTINUITY_DISPLAY_CONTEXT_SATS,
  MAX_CONTINUITY_CONTEXT_BEAM_SATS,
  MAX_EVENT_BEAM_AZIMUTH_SPREAD_DEG,
  MAX_IDLE_PASS_BEAM_SATS,
  MAX_IDLE_PASS_CLUSTER_AZIMUTH_SPREAD_DEG,
  MAX_SUPPORT_EVENT_ELEVATION_DELTA_DEG,
  MIN_CONTINUITY_DISPLAY_CONTEXT_ELEVATION_DEG,
  MAX_TARGET_LIKE_EVENT_AZIMUTH_SPREAD_DEG,
  MIN_BEAM_ELEVATION_DEG,
  MIN_CONTINUITY_BEAM_ELEVATION_DEG,
  MIN_CONTINUITY_CONTEXT_ELEVATION_DEG,
} from './beam-presentation-constants';

function azimuthDistance(leftDeg: number, rightDeg: number): number {
  let delta = Math.abs(leftDeg - rightDeg) % 360;
  if (delta > 180) delta = 360 - delta;
  return delta;
}

function rankSatelliteByNarrativeCluster(
  anchorSat: SatelliteState | null,
  left: SatelliteState,
  right: SatelliteState,
): number {
  const leftSpread = anchorSat ? azimuthDistance(left.azimuthDeg, anchorSat.azimuthDeg) : 0;
  const rightSpread = anchorSat ? azimuthDistance(right.azimuthDeg, anchorSat.azimuthDeg) : 0;

  const leftWithinCluster = leftSpread <= MAX_IDLE_PASS_CLUSTER_AZIMUTH_SPREAD_DEG;
  const rightWithinCluster = rightSpread <= MAX_IDLE_PASS_CLUSTER_AZIMUTH_SPREAD_DEG;
  if (leftWithinCluster !== rightWithinCluster) return leftWithinCluster ? -1 : 1;

  const leftScore = left.elevationDeg * 3 - leftSpread;
  const rightScore = right.elevationDeg * 3 - rightSpread;
  return rightScore - leftScore || right.elevationDeg - left.elevationDeg || left.id.localeCompare(right.id);
}

function hasExplicitNarrativeBeamRole(sat: SatelliteState): boolean {
  return sat.beams?.some(
    (beam) =>
      beam.role === 'prepared'
      || beam.role === 'secondary'
      || beam.role === 'post-ho',
  ) ?? false;
}

export function chooseNarrativeAnchorSat(
  snapshot: SimulationSnapshot,
  displaySats: readonly SatelliteState[],
  eventSatIds: readonly string[],
): SatelliteState | null {
  const primaryServingSatId = snapshot.ues[0]?.servingSatId ?? null;

  if (primaryServingSatId) {
    const servingSat = displaySats.find((sat) => sat.id === primaryServingSatId) ?? null;
    if (servingSat) return servingSat;
  }

  for (const satId of eventSatIds) {
    const sat = displaySats.find((candidate) => candidate.id === satId) ?? null;
    if (sat) return sat;
  }

  return displaySats[0] ?? null;
}

export function shouldRenderEventSatBeams(
  sat: SatelliteState,
  snapshot: SimulationSnapshot,
  anchorSat: SatelliteState | null,
  continuityNarrative: ContinuityNarrativeState,
): boolean {
  const primaryUe = snapshot.ues[0] ?? null;
  if (!primaryUe) return false;

  if (sat.id === primaryUe.servingSatId) return true;

  const azimuthSpreadDeg = anchorSat
    ? azimuthDistance(sat.azimuthDeg, anchorSat.azimuthDeg)
    : 0;
  const withinNarrativeSpread = azimuthSpreadDeg <= MAX_EVENT_BEAM_AZIMUTH_SPREAD_DEG;
  const elevationDeltaDeg = anchorSat
    ? Math.abs(sat.elevationDeg - anchorSat.elevationDeg)
    : 0;

  if (hasExplicitNarrativeBeamRole(sat)) {
    return sat.elevationDeg >= MIN_CONTINUITY_CONTEXT_ELEVATION_DEG
      && withinNarrativeSpread
      && elevationDeltaDeg <= MAX_SUPPORT_EVENT_ELEVATION_DELTA_DEG;
  }

  if (sat.id === continuityNarrative.postHoSatId) {
    return sat.elevationDeg >= MIN_CONTINUITY_BEAM_ELEVATION_DEG
      && withinNarrativeSpread
      && elevationDeltaDeg <= MAX_SUPPORT_EVENT_ELEVATION_DELTA_DEG;
  }

  const isTargetLike =
    sat.id === continuityNarrative.targetSatId
    || sat.id === primaryUe.targetSatId
    || sat.id === primaryUe.secondarySatId
    || sat.id === snapshot.daps?.targetSatId;

  if (!isTargetLike) return false;

  return sat.elevationDeg >= MIN_CONTINUITY_CONTEXT_ELEVATION_DEG
    && azimuthSpreadDeg <= MAX_TARGET_LIKE_EVENT_AZIMUTH_SPREAD_DEG
    && elevationDeltaDeg <= MAX_SUPPORT_EVENT_ELEVATION_DELTA_DEG;
}

export function chooseIdlePassBeamCandidateIds(
  displaySats: readonly SatelliteState[],
  eventSatIdSet: ReadonlySet<string>,
  anchorSat: SatelliteState | null,
): string[] {
  return displaySats
    .filter(
      (sat) =>
        sat.isVisible
        && sat.elevationDeg >= MIN_BEAM_ELEVATION_DEG
        && (sat.beams?.length ?? 0) > 0
        && !eventSatIdSet.has(sat.id),
    )
    .sort((left, right) => rankSatelliteByNarrativeCluster(anchorSat, left, right))
    .slice(0, MAX_IDLE_PASS_BEAM_SATS)
    .map((sat) => sat.id);
}

export function chooseContinuityContextBeamCandidateIds(
  satellites: readonly SatelliteState[],
  eventSatIdSet: ReadonlySet<string>,
  anchorSat: SatelliteState | null,
): string[] {
  return satellites
    .filter(
      (sat) =>
        sat.isVisible
        && sat.elevationDeg >= MIN_CONTINUITY_CONTEXT_ELEVATION_DEG
        && (sat.beams?.length ?? 0) > 0
        && !eventSatIdSet.has(sat.id),
    )
    .sort((left, right) => rankSatelliteByNarrativeCluster(anchorSat, left, right))
    .slice(0, MAX_CONTINUITY_CONTEXT_BEAM_SATS)
    .map((sat) => sat.id);
}

export function chooseContinuityDisplayContextIds(
  satellites: readonly SatelliteState[],
  eventSatIdSet: ReadonlySet<string>,
  anchorSat: SatelliteState | null,
): string[] {
  return satellites
    .filter(
      (sat) =>
        sat.isVisible
        && sat.elevationDeg >= MIN_CONTINUITY_DISPLAY_CONTEXT_ELEVATION_DEG
        && !eventSatIdSet.has(sat.id),
    )
    .sort((left, right) => rankSatelliteByNarrativeCluster(anchorSat, left, right))
    .slice(0, MAX_CONTINUITY_DISPLAY_CONTEXT_SATS)
    .map((sat) => sat.id);
}
