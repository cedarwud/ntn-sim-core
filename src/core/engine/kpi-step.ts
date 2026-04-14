import type { SimEngineState } from './state';
import type { TrajectorySample } from '../orbit/types';
import type { HoLogEntry } from '../common/types';
import { computeInterruptionMs } from './handover-step';
import {
  buildSortedUeCandidates,
  computeSharedServingUeSinr,
} from './channel-step';

/**
 * Phase 5 Core Structural Split: KPI step.
 */

export function runKpiStep(
  state: SimEngineState,
  timeSec: number,
  satSinrs: Array<{
    satId: string;
    sample: TrajectorySample;
    sinrDb: number;
    bestBeamId: string;
    referenceOffAxisAngleDeg: number;
  }>,
  tickHoLog: HoLogEntry[],
  representativeServing: { satId: string; beamId: string } | null
) {
  const { kpiAcc, hoManager, hoManagers, independentHandover, profile, energyL2Manager, uePositions } = state;
  const PRIMARY_UE_ID = 'ue-0';

  if (independentHandover) {
    for (const ue of uePositions) {
      const manager = hoManagers.get(ue.id);
      const ueServing = manager?.getState().serving ?? null;
      kpiAcc.recordServiceState(ue.id, ueServing !== null, timeSec);

      if (!ueServing) continue;

      const postTickCandidate = buildSortedUeCandidates(state, ue, satSinrs).find(
        (candidate) =>
          candidate.satId === ueServing.satId &&
          candidate.beamId === ueServing.beamId,
      );
      if (postTickCandidate) {
        kpiAcc.recordSinr(ue.id, postTickCandidate.sinrDb, timeSec);
      }
    }
  } else {
    const isServed = representativeServing !== null;

    for (const ue of uePositions) {
      kpiAcc.recordServiceState(ue.id, isServed, timeSec);
      if (!representativeServing) continue;

      const ueSinr = computeSharedServingUeSinr(
        state,
        ue,
        satSinrs,
        representativeServing,
      );
      if (ueSinr) kpiAcc.recordSinr(ue.id, ueSinr.sinrDb, timeSec);
    }
  }

  const managersToDrain = independentHandover
    ? Array.from(hoManagers.entries())
    : [[PRIMARY_UE_ID, hoManager] as const];

  for (const [ueId, manager] of managersToDrain) {
    for (const evt of manager.drainEvents()) {
      if (evt.type === 'ho-complete') {
        const intMs = computeInterruptionMs(state, evt.targetSatId, satSinrs);
        kpiAcc.recordHandover({
          timeSec: evt.timeSec,
          type: 'complete',
          sourceId: evt.sourceSatId ?? '',
          targetId: evt.targetSatId ?? '',
          sourceSinrDb: evt.sinrDb ?? 0,
          interruptionMs: intMs,
        });
        const hoEnergyJ = profile.energy.energy_per_handover_j ?? 0;
        if (hoEnergyJ > 0 && energyL2Manager && evt.targetSatId) {
          energyL2Manager.debitEnergy(evt.targetSatId, hoEnergyJ);
        }
        tickHoLog.push({
          timeSec: evt.timeSec,
          type: 'ho-complete',
          sourceSatId: evt.sourceSatId ?? null,
          targetSatId: evt.targetSatId ?? null,
          sinrDb: evt.sinrDb ?? null,
          interruptionMs: intMs,
          ueId,
        });
      } else if (evt.type === 'ho-fail') {
        kpiAcc.recordHandover({
          timeSec: evt.timeSec,
          type: 'fail',
          sourceId: evt.sourceSatId ?? '',
          targetId: evt.targetSatId ?? '',
          sourceSinrDb: evt.sinrDb ?? 0,
          interruptionMs: computeInterruptionMs(state, evt.sourceSatId, satSinrs),
        });
        tickHoLog.push({
          timeSec: evt.timeSec,
          type: 'ho-fail',
          sourceSatId: evt.sourceSatId ?? null,
          targetSatId: evt.targetSatId ?? null,
          sinrDb: evt.sinrDb ?? null,
          interruptionMs: null,
          ueId,
        });
      } else if (evt.type === 'cho-execute' || evt.type === 'mc-ho-dual-end' || evt.type === 'rlf-declared') {
        tickHoLog.push({
          timeSec: evt.timeSec,
          type: evt.type,
          sourceSatId: evt.sourceSatId ?? null,
          targetSatId: evt.targetSatId ?? null,
          sinrDb: evt.sinrDb ?? null,
          interruptionMs: null,
          ueId,
        });
      }
    }
  }
}
