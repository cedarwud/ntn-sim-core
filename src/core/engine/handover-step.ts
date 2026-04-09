import type { SimEngineState } from './state';
import type { TrajectorySample } from '../orbit/types';
import type { UePosition } from '../ue/position-generator';
import type { HoLogEntry } from '../common/types';
import type { HandoverCandidate, HandoverPolicyOverride } from '../handover/types';
import { buildSortedUeCandidates } from './channel-step';

/**
 * Phase 5 Core Structural Split: Handover step.
 * Ownership: Handover manager ticks and multi-UE dispatch.
 * Fix: Ensure HandoverManager sees ALL satellites in satSinrs as potential candidates.
 */

export interface HandoverStepResult {
  tickHoLog: HoLogEntry[];
  representativeServing: { satId: string; beamId: string } | null;
}

function extractPolicyOverride(state: SimEngineState): HandoverPolicyOverride | undefined {
  const action = state.pendingExternalAction ?? state.pendingPolicyAction;
  state.pendingExternalAction = null;
  state.pendingPolicyAction = null;

  if (!action) return undefined;

  const targetSatId =
    action.handoverAction.targetSatId ??
    action.satelliteActions[0]?.satId;
  const targetBeamId = targetSatId
    ? action.satelliteActions.find((satAction) => satAction.satId === targetSatId)?.activeBeamIds?.[0]
    : undefined;

  return {
    mode: action.handoverAction.mode,
    ...(targetSatId ? { targetSatId } : {}),
    ...(targetBeamId ? { targetBeamId } : {}),
  };
}

export function runHandoverStep(
  state: SimEngineState,
  timeSec: number,
  tickNumber: number,
  satSinrs: Array<{
    satId: string;
    sample: TrajectorySample;
    sinrDb: number;
    bestBeamId: string;
    referenceOffAxisAngleDeg: number;
  }>
): HandoverStepResult {
  const { independentHandover, hoManager, hoManagers, uePositions } = state;
  const tickHoLog: HoLogEntry[] = [];
  const PRIMARY_UE_ID = 'ue-0';
  const policyOverride = extractPolicyOverride(state);

  let representativeServing: { satId: string; beamId: string } | null = null;

  if (independentHandover) {
    // Phase B: multi-UE independent handover
    for (const ue of uePositions) {
      const ueHoManager = hoManagers.get(ue.id);
      if (!ueHoManager) continue;

      const candidates: HandoverCandidate[] = buildSortedUeCandidates(state, ue, satSinrs).map((candidate) => ({
        satId: candidate.satId,
        sinrDb: candidate.sinrDb,
        beamId: candidate.beamId,
        elevationDeg: candidate.sample.elevationDeg,
        rangeKm: candidate.sample.rangeKm,
      }));

      const servingState = ueHoManager.getState().serving;
      // Match by satId only: candidates have one entry per satellite (best beam).
      // When the satellite's best beam changes, this is an implicit intra-satellite
      // beam switch — update serving beamId silently.
      const servingEntry = servingState ? candidates.find(c => c.satId === servingState.satId) : null;
      if (servingEntry && servingState && servingEntry.beamId !== servingState.beamId) {
        (servingState as { beamId: string }).beamId = servingEntry.beamId;
      }

      ueHoManager.tick({
        tick: tickNumber,
        timeSec,
        servingSinrDb: servingEntry?.sinrDb ?? null,
        candidates,
        servingElevationDeg: servingEntry?.elevationDeg ?? null,
        servingRangeKm: servingEntry?.rangeKm ?? null,
        propagationDelayMs: (servingEntry && servingEntry.rangeKm) ? (servingEntry.rangeKm / 299.792) : undefined,
        policyOverride: ue.id === PRIMARY_UE_ID ? policyOverride : undefined,
      });

      if (ue.id === PRIMARY_UE_ID) {
        representativeServing = ueHoManager.getState().serving;
      }
    }
  } else {
    // Phase A path
    const candidates: HandoverCandidate[] = satSinrs.map((s) => ({
      satId: s.satId,
      sinrDb: s.sinrDb,
      beamId: s.bestBeamId,
      elevationDeg: s.sample.elevationDeg,
      rangeKm: s.sample.rangeKm
    }));

    const servingState = hoManager.getState().serving;
    // Match by satId only: candidates have one entry per satellite (best beam).
    // When the satellite's best beam changes, this is an implicit intra-satellite
    // beam switch — update serving beamId silently.
    const servingEntry = servingState ? candidates.find(c => c.satId === servingState.satId) : null;
    if (servingEntry && servingState && servingEntry.beamId !== servingState.beamId) {
      (servingState as { beamId: string }).beamId = servingEntry.beamId;
    }

    hoManager.tick({
      tick: tickNumber,
      timeSec,
      servingSinrDb: servingEntry?.sinrDb ?? null,
      candidates,
      servingElevationDeg: servingEntry?.elevationDeg ?? null,
      servingRangeKm: servingEntry?.rangeKm ?? null,
      propagationDelayMs: (servingEntry && servingEntry.rangeKm) ? (servingEntry.rangeKm / 299.792) : undefined,
      policyOverride,
    });
    representativeServing = hoManager.getState().serving;
  }

  return { tickHoLog, representativeServing };
}

export function computeInterruptionMs(
  state: SimEngineState,
  targetSatId: string | undefined,
  satSinrs: Array<{ satId: string; sample: { rangeKm: number } }>,
): number {
  const { profile } = state;
  const hoType = profile.handover.type;
  if (hoType === 'daps' || hoType === 'mc-ho') return 0;
  
  const entry = targetSatId ? satSinrs.find((s) => s.satId === targetSatId) : undefined;
  if (!entry) return 0;
  return (2 * entry.sample.rangeKm) / 299.792;
}
