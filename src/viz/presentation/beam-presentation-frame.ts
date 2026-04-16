import type {
  SatelliteState,
  SimulationSnapshot,
} from '@/core/contracts/runtime-v1';
import { selectDisplaySatellites } from '@/viz/satellite/satellite-display-selection';
import { MIN_BEAM_ELEVATION_DEG } from './beam-presentation-constants';
import { buildBeamSelectionForSat } from './beam-presentation-beam-selection';
import {
  chooseContinuityDisplayContextIds,
  chooseIdlePassBeamCandidateIds,
  chooseNarrativeAnchorSat,
  shouldRenderEventSatBeams,
} from './beam-presentation-satellite-selection';
import type {
  BeamPresentationBeamAccent,
  BeamPresentationFocusMode,
  BeamPresentationFrame,
  BeamPresentationMarkerRole,
  BuildBeamPresentationFrameOptions,
} from './beam-presentation-types';
import {
  buildContinuityNarrativeState,
  type ContinuityNarrativeState,
} from './continuity-narrative-state';

export function collectPresentationBeamIdsBySatId(
  frame: BeamPresentationFrame | null,
): Record<string, string[]> {
  if (!frame) return {};

  const beamIdsBySatId: Record<string, string[]> = {};
  for (const satId of frame.beamSatIds) {
    const primaryBeamId = frame.primaryBeamBySatId[satId];
    if (!primaryBeamId) continue;
    beamIdsBySatId[satId] = [
      primaryBeamId,
      ...(frame.contextBeamIdsBySatId[satId] ?? []),
    ];
  }
  return beamIdsBySatId;
}

function markerRolePriority(role: BeamPresentationMarkerRole): number {
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
  }
}

function deriveExplicitMarkerRole(sat: SatelliteState): BeamPresentationMarkerRole {
  const beams = sat.beams ?? [];
  if (beams.some((beam) => beam.role === 'serving')) return 'serving';
  if (beams.some((beam) => beam.role === 'prepared')) return 'prepared';
  if (beams.some((beam) => beam.role === 'secondary')) return 'secondary';
  if (beams.some((beam) => beam.role === 'post-ho')) return 'post-ho';
  return 'neutral';
}

function deriveNarrativeMarkerRole(
  satId: string,
  narrative: ContinuityNarrativeState,
): BeamPresentationMarkerRole | null {
  if (satId === narrative.servingSatId) return 'serving';
  if (narrative.phase === 'prepared' && satId === narrative.targetSatId) {
    return 'prepared';
  }
  if (narrative.phase === 'dual-active' && satId === narrative.targetSatId) {
    return 'secondary';
  }
  if (narrative.phase === 'post-switch' && satId === narrative.postHoSatId) {
    return 'post-ho';
  }
  return null;
}

function deriveMarkerRole(
  sat: SatelliteState,
  narrative: ContinuityNarrativeState,
): BeamPresentationMarkerRole {
  const explicitRole = deriveExplicitMarkerRole(sat);
  const narrativeRole = deriveNarrativeMarkerRole(sat.id, narrative);

  if (!narrativeRole) return explicitRole;
  return markerRolePriority(narrativeRole) >= markerRolePriority(explicitRole)
    ? narrativeRole
    : explicitRole;
}

function collectEventSatIds(
  snapshot: SimulationSnapshot,
  narrative: ContinuityNarrativeState,
): Set<string> {
  const ids = new Set<string>(narrative.narrativeSatIds);

  for (const sat of snapshot.satellites) {
    if (deriveExplicitMarkerRole(sat) !== 'neutral') {
      ids.add(sat.id);
    }
  }

  return ids;
}

function determineFocusMode(
  snapshot: SimulationSnapshot,
  continuityNarrative: ContinuityNarrativeState,
): BeamPresentationFocusMode {
  const hasContinuityNarrative = continuityNarrative.handoverInProgress;

  if (snapshot.bhSlot && hasContinuityNarrative) return 'bh-focus';
  return hasContinuityNarrative ? 'continuity-focus' : 'idle-pass';
}

export function buildBeamPresentationFrame(
  snapshot: SimulationSnapshot,
  options?: BuildBeamPresentationFrameOptions,
): BeamPresentationFrame {
  const beamVisualsEnabled = options?.beamVisualsEnabled ?? true;
  const continuityNarrative = options?.continuityNarrative
    ?? buildContinuityNarrativeState(snapshot, null);
  const eventSatIdSet = collectEventSatIds(snapshot, continuityNarrative);
  const focusMode = determineFocusMode(snapshot, continuityNarrative);
  const markerRoleBySatId: Record<string, BeamPresentationMarkerRole> = {};

  for (const sat of snapshot.satellites) {
    markerRoleBySatId[sat.id] = deriveMarkerRole(sat, continuityNarrative);
  }

  const displaySats = selectDisplaySatellites(
    snapshot.satellites,
    snapshot,
    options?.previousDisplaySatIds ?? new Set<string>(),
    {
      tier1SatIds: eventSatIdSet,
      narrativeAnchorSatId: continuityNarrative.servingSatId,
    },
  );
  const baseDisplaySatIds = displaySats.map((sat) => sat.id);
  const eventSatIds = displaySats
    .filter((sat) => eventSatIdSet.has(sat.id))
    .sort((left, right) => {
      const roleDelta =
        markerRolePriority(markerRoleBySatId[right.id])
        - markerRolePriority(markerRoleBySatId[left.id]);
      if (roleDelta !== 0) return roleDelta;
      return right.elevationDeg - left.elevationDeg || left.id.localeCompare(right.id);
    })
    .map((sat) => sat.id);
  const narrativeAnchorSat = chooseNarrativeAnchorSat(snapshot, displaySats, eventSatIds);
  const continuityDisplayContextIds =
    focusMode === 'continuity-focus' || focusMode === 'bh-focus'
      ? chooseContinuityDisplayContextIds(
        displaySats,
        new Set(eventSatIds),
        narrativeAnchorSat,
      )
      : [];

  const beamSatIds: string[] = [];
  const primaryBeamBySatId: Record<string, string> = {};
  const contextBeamIdsBySatId: Record<string, string[]> = {};
  const beamRoleAccentByBeamId: Record<string, BeamPresentationBeamAccent> = {};

  const eventBeamSatIds = eventSatIds.filter((satId) => {
    const sat = displaySats.find((candidate) => candidate.id === satId) ?? null;
    if (!sat) return false;
    return shouldRenderEventSatBeams(
      sat,
      snapshot,
      narrativeAnchorSat,
      continuityNarrative,
    );
  });

  const idlePassBeamCandidates = chooseIdlePassBeamCandidateIds(
    displaySats,
    eventSatIdSet,
    narrativeAnchorSat,
  );

  const orderedBeamSatIds = [...new Set([
    ...eventBeamSatIds,
    ...(focusMode === 'idle-pass' ? idlePassBeamCandidates : []),
  ])];
  const continuityDisplaySatIds = [
    ...eventSatIds,
    ...continuityDisplayContextIds,
  ];
  const displaySatIds = [...new Set([
    // Beam-off first screen needs more sky context than the compact beam-on
    // continuity frame; otherwise the handover links can feel detached.
    ...(
      focusMode === 'idle-pass' || !beamVisualsEnabled
        ? [...baseDisplaySatIds, ...continuityDisplaySatIds]
        : continuityDisplaySatIds
    ),
    ...orderedBeamSatIds,
  ])];
  const displaySatIdSet = new Set(displaySatIds);

  for (const satId of orderedBeamSatIds) {
    if (!displaySatIdSet.has(satId)) continue;
    const sat = snapshot.satellites.find((candidate) => candidate.id === satId);
    if (!sat || !sat.isVisible || sat.elevationDeg < MIN_BEAM_ELEVATION_DEG) continue;
    const selection = buildBeamSelectionForSat(
      sat,
      Boolean(snapshot.bhSlot),
      markerRoleBySatId[sat.id],
    );
    if (!selection) continue;
    beamSatIds.push(sat.id);
    primaryBeamBySatId[sat.id] = selection.primaryBeamId;
    contextBeamIdsBySatId[sat.id] = selection.contextBeamIds;
    Object.assign(beamRoleAccentByBeamId, selection.beamRoleAccentByBeamId);
  }

  return {
    focusMode,
    continuityNarrative,
    displaySatIds,
    eventSatIds,
    beamSatIds,
    primaryBeamBySatId,
    contextBeamIdsBySatId,
    markerRoleBySatId,
    beamRoleAccentByBeamId,
  };
}
