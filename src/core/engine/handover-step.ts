import type { SimEngineState } from './state';
import type { TrajectorySample } from '../orbit/types';
import type { UePosition } from '../ue/position-generator';
import type { HoLogEntry, PublishedServingTransition } from '../common/types';
import type { HandoverCandidate, HandoverPolicyOverride } from '../handover/types';
import { buildSortedUeCandidates } from './channel-step';

/**
 * Phase 5 Core Structural Split: Handover step.
 * Ownership: Handover manager ticks and multi-UE dispatch.
 * Fix: handover managers consume per-satellite candidates from the current
 * tracked-beam truth instead of the old UE-at-origin shortcut.
 */

export interface HandoverStepResult {
  tickHoLog: HoLogEntry[];
  representativeServing: { satId: string; beamId: string } | null;
}

type ServingEndpoint = {
  satId: string;
  beamId: string;
};

function cloneServingEndpoint(
  serving: { satId: string; beamId: string } | null | undefined,
): ServingEndpoint | null {
  return serving ? { satId: serving.satId, beamId: serving.beamId } : null;
}

function buildPublishedServingTransition(
  previous: ServingEndpoint | null,
  current: ServingEndpoint | null,
): PublishedServingTransition {
  if (!previous || !current) {
    return {
      kind: 'none',
      sourceSatId: previous?.satId ?? null,
      sourceBeamId: previous?.beamId ?? null,
      targetSatId: current?.satId ?? null,
      targetBeamId: current?.beamId ?? null,
    };
  }

  if (previous.satId !== current.satId) {
    return {
      kind: 'inter-satellite-handover',
      sourceSatId: previous.satId,
      sourceBeamId: previous.beamId,
      targetSatId: current.satId,
      targetBeamId: current.beamId,
    };
  }

  if (previous.beamId !== current.beamId) {
    return {
      kind: 'same-satellite-beam-switch',
      sourceSatId: previous.satId,
      sourceBeamId: previous.beamId,
      targetSatId: current.satId,
      targetBeamId: current.beamId,
    };
  }

  return {
    kind: 'none',
    sourceSatId: previous.satId,
    sourceBeamId: previous.beamId,
    targetSatId: current.satId,
    targetBeamId: current.beamId,
  };
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
    serviceEligible?: boolean;
  }>
): HandoverStepResult {
  const { independentHandover, hoManager, hoManagers, uePositions } = state;
  const tickHoLog: HoLogEntry[] = [];
  const PRIMARY_UE_ID = 'ue-0';
  const policyOverride = extractPolicyOverride(state);
  const publishedServingTransitions: Record<string, PublishedServingTransition> = {};

  let representativeServing: { satId: string; beamId: string } | null = null;

  if (independentHandover) {
    // Phase B: multi-UE independent handover
    for (const ue of uePositions) {
      const ueHoManager = hoManagers.get(ue.id);
      if (!ueHoManager) {
        publishedServingTransitions[ue.id] = buildPublishedServingTransition(null, null);
        continue;
      }

      const candidates: HandoverCandidate[] = buildSortedUeCandidates(state, ue, satSinrs).map((candidate) => ({
        satId: candidate.satId,
        sinrDb: candidate.sinrDb,
        beamId: candidate.beamId,
        elevationDeg: candidate.sample.elevationDeg,
        rangeKm: candidate.sample.rangeKm,
      }));

      const servingState = ueHoManager.getState().serving;
      const previousServing = cloneServingEndpoint(servingState);
      // Match by satId only: candidates have one entry per satellite (best beam).
      // Preserve the current manager behavior, but publish an explicit
      // same-satellite beam-switch annotation later so this is no longer a
      // silent external side effect.
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

      publishedServingTransitions[ue.id] = buildPublishedServingTransition(
        previousServing,
        cloneServingEndpoint(ueHoManager.getState().serving),
      );

      if (ue.id === PRIMARY_UE_ID) {
        representativeServing = ueHoManager.getState().serving;
      }
    }
  } else {
    // Phase A path
    const candidates: HandoverCandidate[] = satSinrs
      .filter((s) => s.serviceEligible !== false)
      .map((s) => ({
      satId: s.satId,
      sinrDb: s.sinrDb,
      beamId: s.bestBeamId,
      elevationDeg: s.sample.elevationDeg,
      rangeKm: s.sample.rangeKm
    }));

    const servingState = hoManager.getState().serving;
    const previousServing = cloneServingEndpoint(servingState);
    // Match by satId only: candidates have one entry per satellite (best beam).
    // Preserve the current manager behavior, but publish an explicit
    // same-satellite beam-switch annotation later so this is no longer a
    // silent external side effect.
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

    const sharedTransition = buildPublishedServingTransition(
      previousServing,
      cloneServingEndpoint(hoManager.getState().serving),
    );
    for (const ue of uePositions) {
      publishedServingTransitions[ue.id] = sharedTransition;
    }
  }

  state.lastPublishedServingTransitions = publishedServingTransitions;

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
