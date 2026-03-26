import type { SatelliteBeamSnapshot, SimulationSnapshot, SatelliteState } from '@/core/common/types';
import type {
  BeamPresentationInput,
  BeamPresentationSatSelection,
  BeamSelectionReason,
  LeoParityBeamPresentation,
} from './types';

const MAX_DISPLAY_SATS = 12;
const MAX_EVENT_SATS = 8;
const MIN_ELEVATION_DEG = 5;

function countRenderableBeams(beams: SatelliteBeamSnapshot[] | undefined): number {
  return (
    beams?.filter(
      (beam) =>
        beam.isActive ||
        beam.role === 'serving' ||
        beam.role === 'prepared' ||
        beam.role === 'secondary' ||
        beam.role === 'post-ho',
    ).length ?? 0
  );
}

function countSpecialRoles(beams: SatelliteBeamSnapshot[] | undefined): number {
  return beams?.filter((beam) => beam.role !== 'neutral' && beam.role !== 'inactive').length ?? 0;
}

function continuityReasonForSat(sat: SatelliteState, input: BeamPresentationInput): BeamSelectionReason | null {
  if (sat.id === input.servingSatId) return 'serving';
  if (sat.id === input.secondarySatId) return 'secondary';
  if (sat.id === input.targetSatId) return 'prepared';
  if (sat.id === input.dapsSourceSatId) return 'daps-source';
  if (sat.id === input.dapsTargetSatId) return 'daps-target';
  if (sat.beams?.some((beam) => beam.role === 'prepared' || beam.role === 'secondary' || beam.role === 'post-ho')) {
    return 'role-derived';
  }
  return null;
}

function fallbackReason(sat: SatelliteState): BeamSelectionReason {
  const renderableBeamCount = countRenderableBeams(sat.beams);
  return renderableBeamCount >= 12 ? 'candidate-rich' : 'high-elevation';
}

function scoreSat(sat: SatelliteState, reason: BeamSelectionReason | null): number {
  const renderableBeamCount = countRenderableBeams(sat.beams);
  const specialRoleCount = countSpecialRoles(sat.beams);

  const continuityBias =
    reason === 'serving'
      ? 2200
      : reason === 'secondary'
        ? 1800
        : reason === 'prepared'
          ? 1700
          : reason === 'daps-source' || reason === 'daps-target'
            ? 1600
            : reason === 'role-derived'
              ? 1200
              : 0;

  const elevationScore = sat.elevationDeg * 18 + Math.max(sat.elevationDeg - 45, 0) * 8;
  const beamDensityScore = renderableBeamCount * 28 + specialRoleCount * 180;

  return continuityBias + elevationScore + beamDensityScore;
}

function selectionRecord(
  sat: SatelliteState,
  emphasis: BeamPresentationSatSelection['emphasis'],
  reason: BeamSelectionReason | null,
): BeamPresentationSatSelection {
  const finalReason = reason ?? fallbackReason(sat);
  return {
    satId: sat.id,
    emphasis,
    reason: finalReason,
    score: scoreSat(sat, reason),
    elevationDeg: sat.elevationDeg,
    renderableBeamCount: countRenderableBeams(sat.beams),
    specialRoleCount: countSpecialRoles(sat.beams),
  };
}

function dedupeBySatId(entries: BeamPresentationSatSelection[]): BeamPresentationSatSelection[] {
  const seen = new Set<string>();
  const result: BeamPresentationSatSelection[] = [];
  for (const entry of entries) {
    if (seen.has(entry.satId)) continue;
    seen.add(entry.satId);
    result.push(entry);
  }
  return result;
}

export function createLeoParityBeamPresentation(
  snapshot: SimulationSnapshot | null | undefined,
): LeoParityBeamPresentation | null {
  if (!snapshot) return null;

  const primaryUe = snapshot.ues[0];
  const input: BeamPresentationInput = {
    satellites: snapshot.satellites,
    servingSatId: primaryUe?.servingSatId ?? null,
    targetSatId: primaryUe?.targetSatId ?? null,
    secondarySatId: primaryUe?.secondarySatId ?? null,
    dapsSourceSatId: snapshot.daps?.sourceSatId ?? null,
    dapsTargetSatId: snapshot.daps?.targetSatId ?? null,
  };

  const candidateSats = snapshot.satellites.filter(
    (sat) =>
      sat.isVisible &&
      sat.elevationDeg > MIN_ELEVATION_DEG &&
      sat.beams &&
      sat.beams.length > 0 &&
      countRenderableBeams(sat.beams) > 0,
  );

  if (candidateSats.length === 0) {
    return {
      mode: 'leo-parity',
      displaySatIds: [],
      eventSatIds: [],
      beamSatIds: [],
      selections: [],
    };
  }

  const continuitySelections = dedupeBySatId(
    candidateSats
      .map((sat) => {
        const reason = continuityReasonForSat(sat, input);
        return reason ? selectionRecord(sat, 'continuity', reason) : null;
      })
      .filter((entry): entry is BeamPresentationSatSelection => entry !== null)
      .sort((a, b) => b.score - a.score || a.satId.localeCompare(b.satId)),
  );

  const continuitySatIds = new Set(continuitySelections.map((entry) => entry.satId));

  const rankedCandidates = candidateSats
    .filter((sat) => !continuitySatIds.has(sat.id))
    .map((sat) => selectionRecord(sat, 'event', null))
    .sort((a, b) => b.score - a.score || a.satId.localeCompare(b.satId));

  const eventSelections = [...continuitySelections];
  for (const candidate of rankedCandidates) {
    if (eventSelections.length >= MAX_EVENT_SATS) break;
    eventSelections.push({ ...candidate, emphasis: 'event' });
  }

  const eventSatIds = new Set(eventSelections.map((entry) => entry.satId));
  const displaySelections = [...eventSelections];
  for (const candidate of rankedCandidates) {
    if (displaySelections.length >= MAX_DISPLAY_SATS) break;
    if (eventSatIds.has(candidate.satId)) continue;
    displaySelections.push({ ...candidate, emphasis: 'context' });
  }

  const orderedDisplay = dedupeBySatId(displaySelections);
  const beamSelections = continuitySelections.length > 0
    ? continuitySelections
    : orderedDisplay.slice(0, 1);

  return {
    mode: 'leo-parity',
    displaySatIds: orderedDisplay.map((entry) => entry.satId),
    eventSatIds: eventSelections.map((entry) => entry.satId),
    beamSatIds: beamSelections.map((entry) => entry.satId),
    selections: orderedDisplay,
  };
}
