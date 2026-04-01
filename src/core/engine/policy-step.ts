import type { SimEngineState } from './state';
import type { PolicyObservation, PolicyAction, SatelliteObservation, UeObservation } from '../policy/types';
import type { TrajectorySample } from '../orbit/types';
import {
  buildSortedUeCandidates,
  computeSharedServingUeSinr,
  resolveSharedServingPrimarySinr,
} from './channel-step';
import type { ServingState } from '../handover/types';

/**
 * Phase 5 Core Structural Split: Policy step.
 * Ownership: Building PolicyObservation and applying PolicyAction.
 */

export function runPolicyStep(
  state: SimEngineState,
  timeSec: number,
  tickNumber: number,
  satSinrs: Array<{
    satId: string;
    sample: TrajectorySample;
    sinrDb: number;
    bestBeamId: string;
    referenceOffAxisAngleDeg: number;
  }>,
  representativeServing: { satId: string; beamId: string } | null
) {
  const { isMultiBeam, beamLayouts, lastBhSlotDecision, energyL2Manager, uePositions, independentHandover, hoManagers, hoManager, bundle } = state;
  const sharedServing = independentHandover
    ? null
    : resolveSharedServingPrimarySinr(state, satSinrs, representativeServing);

  // 1. Build observation
  const satelliteObs: SatelliteObservation[] = satSinrs.map((s) => {
    const activeBeams = lastBhSlotDecision?.activeBeamsPerSat.get(s.satId);
    return {
      satId: s.satId,
      elevationDeg: s.sample.elevationDeg,
      rangeKm: s.sample.rangeKm,
      sinrDb: s.sinrDb,
      activeBeamCount: activeBeams ? activeBeams.length : (isMultiBeam ? 0 : 1),
      soc: energyL2Manager ? (energyL2Manager.getState(s.satId)?.soc ?? null) : null,
      isServing: representativeServing?.satId === s.satId,
    };
  });

  const ueObs: UeObservation[] = uePositions.map((ue) => {
    let ueServing: ServingState | { satId: string; beamId: string } | null = null;
    let ueSinr = 0;

    if (independentHandover) {
      const mgr = hoManagers.get(ue.id);
      if (mgr) {
        ueServing = mgr.getState().serving;
        const postTickCandidate = ueServing
          ? buildSortedUeCandidates(state, ue, satSinrs).find(
              (candidate) =>
                candidate.satId === ueServing!.satId &&
                candidate.beamId === ueServing!.beamId,
            )
          : null;
        if (postTickCandidate) ueSinr = postTickCandidate.sinrDb;
      }
    } else {
      ueServing = representativeServing;
      if (ueServing && sharedServing) {
        ueSinr = computeSharedServingUeSinr(
          state,
          ue,
          sharedServing.primarySinrDb,
          sharedServing.servingEntry,
        ).sinrDb;
      }
    }

    return {
      ueId: ue.id,
      sinrDb: ueSinr,
      servingSatId: ueServing?.satId ?? null,
      distanceFromCenterKm: ue.distanceFromCenterKm,
    };
  });

  const meanSinr = ueObs.length > 0 ? ueObs.reduce((s, u) => s + u.sinrDb, 0) / ueObs.length : 0;

  const observation: PolicyObservation = {
    tick: tickNumber,
    timeSec,
    satellites: satelliteObs,
    ues: ueObs,
    global: {
      totalActiveSatellites: new Set(satelliteObs.filter(s => s.activeBeamCount > 0).map(s => s.satId)).size,
      totalActiveBeams: satelliteObs.reduce((sum, s) => sum + s.activeBeamCount, 0),
      totalPowerW: state.lastEnergyMetrics?.totalPowerW ?? 0,
      meanSinrDb: meanSinr,
    },
  };

  state.lastObservation = observation;

  // 2. Queue policy output for the NEXT tick's handover step.
  let action: PolicyAction | null = null;
  if (bundle.policy.name !== 'no-op') {
    action = bundle.policy.selectAction(observation);
  }

  state.pendingPolicyAction = action;

  // Beam-scheduler overrides remain immediate because the slot plan is already
  // part of the current discrete tick state.
  if (action && action.satelliteActions.length > 0 && lastBhSlotDecision) {
    for (const satAct of action.satelliteActions) {
      if (satAct.activeBeamIds) {
        lastBhSlotDecision.activeBeamsPerSat.set(satAct.satId, satAct.activeBeamIds);
      }
    }
  }
}
