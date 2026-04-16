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
    // Freeze BH slot rotation during handover phases so the visual slow
    // motion shows stable beams (no hop between trigger and completion).
    const PRIMARY_UE_ID = 'ue-0';
    const hoState = independentHandover
      ? hoManagers.get(PRIMARY_UE_ID)?.getState() ?? null
      : hoManager.getState();
    const hoPhase = hoState?.phase ?? 'idle';
    if ((hoPhase === 'preparing' || hoPhase === 'switching') && state.lastBhSlotDecision) {
      // Reuse previous slot decision — beams stay frozen.
      return;
    }

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
        for (let i = 0; i < cellDemands.length; i++) {
          demandPerBeam.set(layout.beams[i]?.beamId ?? `${satId}-b${i}`, cellDemands[i].demandBps);
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

    // Force serving + DAPS target beams active so they are never filtered
    // out of SINR computation during prepared / dual-active phases.
    if (state.lastBhSlotDecision) {
      const PRIMARY_UE_ID = 'ue-0';
      const hoState = independentHandover
        ? hoManagers.get(PRIMARY_UE_ID)?.getState() ?? null
        : hoManager.getState();
      const pinBeams: Array<{ satId: string; beamId: string }> = [];
      if (hoState?.serving) pinBeams.push(hoState.serving);
      if (hoState?.pendingTarget) pinBeams.push(hoState.pendingTarget);
      for (const pin of pinBeams) {
        const active = state.lastBhSlotDecision.activeBeamsPerSat.get(pin.satId);
        if (active) {
          if (!active.includes(pin.beamId)) active.push(pin.beamId);
        } else {
          state.lastBhSlotDecision.activeBeamsPerSat.set(pin.satId, [pin.beamId]);
        }
      }
    }
  }
}
