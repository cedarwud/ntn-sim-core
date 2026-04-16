import type {
  BeamRole,
  SatelliteBeamSnapshot,
  SatelliteState,
} from '@/core/contracts/runtime-v1';

import {
  ACTIVE_NEIGHBOR_RING_FACTOR,
  EPSILON_KM,
  LOCAL_CONTEXT_SECTOR_COUNT,
  MAX_BH_INACTIVE_CONTEXT_BEAMS,
  MAX_LOCAL_ACTIVE_CONTEXT_BEAMS,
  MIN_NON_BH_CONTEXT_BEAMS,
} from './beam-presentation-constants';
import type {
  BeamPresentationBeamAccent,
  BeamPresentationMarkerRole,
} from './beam-presentation-types';

interface BeamSelection {
  primaryBeamId: string;
  contextBeamIds: string[];
  beamRoleAccentByBeamId: Record<string, BeamPresentationBeamAccent>;
}

function beamRolePriority(role: BeamRole): number {
  switch (role) {
    case 'serving':
      return 5;
    case 'prepared':
      return 4;
    case 'secondary':
      return 3;
    case 'post-ho':
      return 2;
    case 'neutral':
      return 1;
    case 'inactive':
      return 0;
  }
}

function rankBeamForPresentation(
  left: SatelliteBeamSnapshot,
  right: SatelliteBeamSnapshot,
): number {
  const priorityDelta = beamRolePriority(right.role) - beamRolePriority(left.role);
  if (priorityDelta !== 0) return priorityDelta;

  if (left.isActive !== right.isActive) {
    return left.isActive ? -1 : 1;
  }

  const radialLeft = Math.hypot(left.offsetEastKm, left.offsetNorthKm);
  const radialRight = Math.hypot(right.offsetEastKm, right.offsetNorthKm);
  return radialLeft - radialRight || left.beamId.localeCompare(right.beamId);
}

function beamOffsetDistanceKm(
  left: Pick<SatelliteBeamSnapshot, 'offsetEastKm' | 'offsetNorthKm'>,
  right: Pick<SatelliteBeamSnapshot, 'offsetEastKm' | 'offsetNorthKm'>,
): number {
  return Math.hypot(
    left.offsetEastKm - right.offsetEastKm,
    left.offsetNorthKm - right.offsetNorthKm,
  );
}

function estimateBeamSpacingKm(beams: readonly SatelliteBeamSnapshot[]): number {
  let minDistanceKm = Number.POSITIVE_INFINITY;

  for (let i = 0; i < beams.length; i += 1) {
    for (let j = i + 1; j < beams.length; j += 1) {
      const distanceKm = beamOffsetDistanceKm(beams[i], beams[j]);
      if (distanceKm > EPSILON_KM && distanceKm < minDistanceKm) {
        minDistanceKm = distanceKm;
      }
    }
  }

  if (Number.isFinite(minDistanceKm)) return minDistanceKm;

  return beams
    .map((beam) => Math.hypot(beam.offsetEastKm, beam.offsetNorthKm))
    .filter((distanceKm) => distanceKm > EPSILON_KM)
    .sort((left, right) => left - right)[0] ?? 0;
}

function rankBeamByPrimaryProximity(
  primaryBeam: SatelliteBeamSnapshot,
  left: SatelliteBeamSnapshot,
  right: SatelliteBeamSnapshot,
): number {
  const primaryDistanceDelta =
    beamOffsetDistanceKm(left, primaryBeam) - beamOffsetDistanceKm(right, primaryBeam);
  if (primaryDistanceDelta !== 0) return primaryDistanceDelta;
  return rankBeamForPresentation(left, right);
}

function beamSectorIndex(
  primaryBeam: SatelliteBeamSnapshot,
  beam: SatelliteBeamSnapshot,
): number {
  const relativeEastKm = beam.offsetEastKm - primaryBeam.offsetEastKm;
  const relativeNorthKm = beam.offsetNorthKm - primaryBeam.offsetNorthKm;
  const angle = Math.atan2(relativeNorthKm, relativeEastKm);
  const normalized = angle < 0 ? angle + Math.PI * 2 : angle;
  return Math.floor((normalized / (Math.PI * 2)) * LOCAL_CONTEXT_SECTOR_COUNT);
}

function collectSectorDiverseContextBeams(
  candidates: readonly SatelliteBeamSnapshot[],
  primaryBeam: SatelliteBeamSnapshot,
): SatelliteBeamSnapshot[] {
  const chosen: SatelliteBeamSnapshot[] = [];
  const occupiedSectors = new Set<number>();

  for (const beam of candidates) {
    const sector = beamSectorIndex(primaryBeam, beam);
    if (occupiedSectors.has(sector)) continue;
    chosen.push(beam);
    occupiedSectors.add(sector);
    if (chosen.length >= Math.min(MAX_LOCAL_ACTIVE_CONTEXT_BEAMS, LOCAL_CONTEXT_SECTOR_COUNT)) {
      break;
    }
  }

  for (const beam of candidates) {
    if (chosen.some((candidate) => candidate.beamId === beam.beamId)) continue;
    chosen.push(beam);
    if (chosen.length >= MAX_LOCAL_ACTIVE_CONTEXT_BEAMS) break;
  }

  return chosen;
}

function beamAccentFor(
  beam: SatelliteBeamSnapshot,
  isPrimary: boolean,
  markerRoleOverride: BeamPresentationMarkerRole,
): BeamPresentationBeamAccent {
  if (markerRoleOverride === 'serving' && isPrimary) return 'serving';
  if (markerRoleOverride === 'prepared' && isPrimary) return 'prepared';
  if (markerRoleOverride === 'secondary' && isPrimary) return 'secondary';
  if (markerRoleOverride === 'post-ho' && isPrimary) return 'post-ho';
  if (beam.role === 'serving') return 'serving';
  if (beam.role === 'prepared') return 'prepared';
  if (beam.role === 'secondary') return 'secondary';
  if (beam.role === 'post-ho') return 'post-ho';
  if (!beam.isActive || beam.role === 'inactive') return 'inactive-context';
  return isPrimary ? 'neutral-primary' : 'neutral-context';
}

function collectLocalActiveContextBeams(
  beams: readonly SatelliteBeamSnapshot[],
  primaryBeam: SatelliteBeamSnapshot,
  excludedBeamIds: ReadonlySet<string>,
  hasBhSlot: boolean,
): SatelliteBeamSnapshot[] {
  const neutralActiveBeams = beams
    .filter(
      (beam) =>
        beam.role === 'neutral'
        && beam.isActive
        && !excludedBeamIds.has(beam.beamId),
    )
    .sort((left, right) => rankBeamByPrimaryProximity(primaryBeam, left, right));

  if (neutralActiveBeams.length === 0) return [];

  if (!hasBhSlot) {
    const sectorSpreadCandidates = [...neutralActiveBeams].sort((left, right) => {
      const distanceDelta =
        beamOffsetDistanceKm(right, primaryBeam) - beamOffsetDistanceKm(left, primaryBeam);
      if (distanceDelta !== 0) return distanceDelta;
      return rankBeamForPresentation(left, right);
    });
    const chosen = collectSectorDiverseContextBeams(
      sectorSpreadCandidates,
      primaryBeam,
    ).slice(0, MAX_LOCAL_ACTIVE_CONTEXT_BEAMS);

    if (chosen.length < MIN_NON_BH_CONTEXT_BEAMS) {
      for (const beam of neutralActiveBeams) {
        if (chosen.some((candidate) => candidate.beamId === beam.beamId)) continue;
        chosen.push(beam);
        if (chosen.length >= MIN_NON_BH_CONTEXT_BEAMS) break;
      }
    }

    return chosen;
  }

  const beamSpacingKm = estimateBeamSpacingKm(beams);
  const neighborhoodRadiusKm = beamSpacingKm > EPSILON_KM
    ? beamSpacingKm * ACTIVE_NEIGHBOR_RING_FACTOR
    : 0;

  const localContextBeams = neutralActiveBeams.filter(
    (beam) => beamOffsetDistanceKm(beam, primaryBeam) <= neighborhoodRadiusKm + EPSILON_KM,
  );
  const neighborhoodCandidates = (
    localContextBeams.length >= MIN_NON_BH_CONTEXT_BEAMS
      ? localContextBeams
      : neutralActiveBeams
  ).slice(0, Math.max(MAX_LOCAL_ACTIVE_CONTEXT_BEAMS * 2, MIN_NON_BH_CONTEXT_BEAMS));
  const chosen = collectSectorDiverseContextBeams(
    neighborhoodCandidates,
    primaryBeam,
  ).slice(0, MAX_LOCAL_ACTIVE_CONTEXT_BEAMS);

  return chosen;
}

export function buildBeamSelectionForSat(
  sat: SatelliteState,
  hasBhSlot: boolean,
  markerRoleOverride: BeamPresentationMarkerRole = 'neutral',
): BeamSelection | null {
  const beams = sat.beams ?? [];
  if (beams.length === 0) return null;

  const specialBeams = beams
    .filter(
      (beam) =>
        beam.role === 'serving'
        || beam.role === 'prepared'
        || beam.role === 'secondary'
        || beam.role === 'post-ho',
    )
    .sort(rankBeamForPresentation);
  const neutralActiveBeams = beams
    .filter((beam) => beam.role === 'neutral' && beam.isActive)
    .sort(rankBeamForPresentation);
  const inactiveContextBeams = beams
    .filter((beam) => beam.role === 'inactive' || !beam.isActive)
    .sort(rankBeamForPresentation);

  const accents: Record<string, BeamPresentationBeamAccent> = {};
  const orderedPrimaryCandidates = [
    ...specialBeams,
    ...neutralActiveBeams,
    ...inactiveContextBeams,
  ];
  const primaryBeam = orderedPrimaryCandidates[0];
  if (!primaryBeam) return null;

  accents[primaryBeam.beamId] = beamAccentFor(primaryBeam, true, markerRoleOverride);

  const contextBeamIds: string[] = [];
  for (const beam of specialBeams) {
    if (beam.beamId === primaryBeam.beamId) continue;
    contextBeamIds.push(beam.beamId);
    accents[beam.beamId] = beamAccentFor(beam, false, markerRoleOverride);
  }

  const localContextBeams = collectLocalActiveContextBeams(
    beams,
    primaryBeam,
    new Set([primaryBeam.beamId, ...contextBeamIds]),
    hasBhSlot,
  );
  for (const beam of localContextBeams) {
    contextBeamIds.push(beam.beamId);
    accents[beam.beamId] = beamAccentFor(beam, false, markerRoleOverride);
  }

  if (hasBhSlot) {
    for (const beam of inactiveContextBeams) {
      if (beam.beamId === primaryBeam.beamId) continue;
      if (
        contextBeamIds.filter((beamId) => accents[beamId] === 'inactive-context').length
        >= MAX_BH_INACTIVE_CONTEXT_BEAMS
      ) {
        break;
      }
      contextBeamIds.push(beam.beamId);
      accents[beam.beamId] = beamAccentFor(beam, false, markerRoleOverride);
    }
  }

  return {
    primaryBeamId: primaryBeam.beamId,
    contextBeamIds,
    beamRoleAccentByBeamId: accents,
  };
}
