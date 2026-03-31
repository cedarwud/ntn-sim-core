import type { SimEngineState } from './state';
import { generateTrafficDemand } from '../traffic/generator';
import type { TrafficConfig } from '../traffic/generator';

/**
 * Phase 5 Core Structural Split: Scheduler step.
 * Ownership: BH slot decision and traffic demand generation.
 * Fix: Ensure all layouts are registered with the scheduler before decision.
 */

export function runSchedulerStep(state: SimEngineState, timeSec: number) {
  const { profile, bhScheduler, isMultiBeam, beamLayouts, lastObservation, independentHandover, hoManagers, hoManager, rng } = state;

  if (bhScheduler && isMultiBeam) {
    // Ensure scheduler knows about all currently identified beam layouts
    for (const [satId, layout] of beamLayouts) {
      bhScheduler.registerSatellite(satId, layout);
    }

    // C7: generate per-beam demand map for demand-aware/power-aware strategies
    let demandPerBeam: Map<string, number> | undefined;
    const trafficModel = profile.beam.bh_traffic_model;
    if (trafficModel && trafficModel !== 'uniform') {
      demandPerBeam = new Map();
      for (const [satId, layout] of beamLayouts) {
        const trafficCfg: TrafficConfig = {
          model: trafficModel as any,
          numCells: layout.beams.length,
          meanArrivalRatePerSec: profile.beam.bh_traffic_arrival_rate ?? 10,
        };
        const cellDemands = generateTrafficDemand(trafficCfg, () => rng.next(), timeSec);
        const sortedBeamIds = [...layout.beams.map((b) => b.beamId)].sort();
        for (let i = 0; i < cellDemands.length; i++) {
          demandPerBeam.set(sortedBeamIds[i] ?? `${satId}-b${i}`, cellDemands[i].demandBps);
        }
      }
    }

    // Build sinrPerBeam from last observation for sinr-greedy strategy (uses t-1 SINR).
    const sinrPerBeam = new Map<string, number>();
    if (lastObservation) {
      for (const satObs of lastObservation.satellites) {
        const layout = beamLayouts.get(satObs.satId);
        if (layout) {
          for (const beam of layout.beams) {
            sinrPerBeam.set(beam.beamId, satObs.sinrDb);
          }
        }
      }
    }
    state.lastBhSlotDecision = bhScheduler.getSlotDecision(timeSec, demandPerBeam, sinrPerBeam);

    // Force current serving beam active so it is never filtered out of SINR computation.
    if (state.lastBhSlotDecision) {
      const PRIMARY_UE_ID = 'ue-0';
      const servingNow = independentHandover
        ? hoManagers.get(PRIMARY_UE_ID)?.getState().serving ?? null
        : hoManager.getState().serving;
      if (servingNow) {
        const activeForSat = state.lastBhSlotDecision.activeBeamsPerSat.get(servingNow.satId);
        if (activeForSat) {
          if (!activeForSat.includes(servingNow.beamId)) {
            state.lastBhSlotDecision.activeBeamsPerSat.set(servingNow.satId, [servingNow.beamId, ...activeForSat]);
          }
        } else {
          state.lastBhSlotDecision.activeBeamsPerSat.set(servingNow.satId, [servingNow.beamId]);
        }
      }
    }
  }
}
