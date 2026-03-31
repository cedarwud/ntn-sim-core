import type { SimEngineState, UeRuntimePosition } from './state';
import type { SimulationSnapshot } from '../common/types';
import { runOrbitStep } from './orbit-step';
import { runSchedulerStep } from './scheduler-step';
import { computeBundleSinrSingleBeam, computeBundleSinrMultiBeam } from './channel-step';
import { runHandoverStep } from './handover-step';
import { runKpiStep } from './kpi-step';
import { runEnergyStep } from './energy-step';
import { runPolicyStep } from './policy-step';
import { runSnapshotStep } from './snapshot-step';
import { selectBeamForUe } from '../beam/selection';
import type { TrajectorySample } from '../orbit/types';
import type { BeamSelectionResult } from '../beam/types';

/**
 * Phase 5 Core Structural Split: Tick Pipeline.
 */

interface SatSinrEntry {
  satId: string;
  sample: TrajectorySample;
  sinrDb: number;
  bestBeamId: string;
  referenceOffAxisAngleDeg: number;
}

interface SatSelectionEntry {
  satId: string;
  sample: TrajectorySample;
  selection: BeamSelectionResult;
}

export function executeTick(
  state: SimEngineState,
  timeSec: number,
  tickNumber: number,
  lastTickTimeSec: number | null
): SimulationSnapshot {
  const stepSec = lastTickTimeSec !== null ? timeSec - lastTickTimeSec : 1;

  // 1. UE Mobility Step (Final logic: update offsets AND coordinates)
  const KM_PER_DEG = 111.32;
  const lat = state.profile.observer.latitudeDeg || 0;
  const latRad = lat * Math.PI / 180;
  const lonScale = KM_PER_DEG * Math.max(0.01, Math.cos(latRad));

  state.mobilityUpdater.update(state.uePositions, stepSec);
  
  for (let i = 0; i < state.uePositions.length; i++) {
    const runtimeUe = state.uePositions[i] as UeRuntimePosition;
    // Robust coordinate compute
    runtimeUe.latitudeDeg = lat + (runtimeUe.offsetNorthKm / KM_PER_DEG);
    runtimeUe.longitudeDeg = state.profile.observer.longitudeDeg + (runtimeUe.offsetEastKm / lonScale);
    
    // Bounds check
    if (isNaN(runtimeUe.latitudeDeg)) runtimeUe.latitudeDeg = lat;
    if (isNaN(runtimeUe.longitudeDeg)) runtimeUe.longitudeDeg = state.profile.observer.longitudeDeg;
  }

  // 2. Orbit Step
  const { activeSatSamples, visibleSatIds } = runOrbitStep(state, timeSec, lastTickTimeSec);
  const visibleSatSet = new Set(visibleSatIds);

  // 3. Scheduler Step
  runSchedulerStep(state, timeSec);

  // 4. Channel Step (SINR Computation)
  let satSinrs: SatSinrEntry[] = [];

  if (!state.isMultiBeam) {
    for (let i = 0; i < activeSatSamples.length; i++) {
      const { satId, sample } = activeSatSamples[i];
      if (!visibleSatSet.has(satId)) continue; 

      const others = activeSatSamples.filter((_, j) => j !== i).map((s) => s.sample);
      const sinrDb = computeBundleSinrSingleBeam(state, sample, others);
      
      satSinrs.push({
        satId,
        sample,
        sinrDb: isNaN(sinrDb) ? -100 : sinrDb,
        bestBeamId: `${satId}-b0`,
        referenceOffAxisAngleDeg: 0,
      });
    }
  } else {
    const allActiveSelections: SatSelectionEntry[] = [];
    for (const { satId, sample } of activeSatSamples) {
      const layout = state.beamLayouts.get(satId);
      const activeBeams = state.lastBhSlotDecision?.activeBeamsPerSat.get(satId);
      
      let selection: BeamSelectionResult;
      if (layout) {
        selection = selectBeamForUe(layout, 0, 0, state.profile.antenna, activeBeams);
      } else {
        selection = {
          bestBeamId: `${satId}-b0`,
          offAxisAngleDeg: 0,
          beamGainDbi: state.profile.antenna.peak_gain_dbi,
          allBeams: [],
        };
      }
      allActiveSelections.push({ satId, sample, selection });
    }

    for (const entry of allActiveSelections) {
      const { satId, sample, selection } = entry;
      if (!visibleSatSet.has(satId)) continue;
      
      const activeBeams = state.lastBhSlotDecision?.activeBeamsPerSat.get(satId);
      if (state.lastBhSlotDecision && (!activeBeams || activeBeams.length === 0)) continue;

      const otherActiveSats = allActiveSelections
        .filter((s) => s.satId !== satId)
        .map((s) => ({ satId: s.satId, sample: s.sample, selection: s.selection }));
      
      const sinrDb = computeBundleSinrMultiBeam(state, satId, sample, selection, otherActiveSats);
      
      satSinrs.push({
        satId,
        sample,
        sinrDb: isNaN(sinrDb) ? -100 : sinrDb,
        bestBeamId: selection.bestBeamId,
        referenceOffAxisAngleDeg: selection.offAxisAngleDeg,
      });
    }
  }

  satSinrs.sort((a, b) => b.sinrDb - a.sinrDb);

  if (state.energyL2Manager) {
    satSinrs = satSinrs.filter((s) => !state.energyL2Manager!.isBlocked(s.satId));
  }

  // 5. Handover Step
  const { tickHoLog, representativeServing } = runHandoverStep(state, timeSec, tickNumber, satSinrs);

  // 6. KPI Step
  runKpiStep(state, timeSec, satSinrs, tickHoLog, representativeServing);

  // 7. Energy Step
  runEnergyStep(state, timeSec, stepSec, activeSatSamples, satSinrs, representativeServing);

  // 8. Policy Step
  runPolicyStep(state, timeSec, tickNumber, satSinrs, representativeServing);

  // 9. Snapshot Step
  const visibleSamples = activeSatSamples.filter(s => visibleSatSet.has(s.satId));
  return runSnapshotStep(state, timeSec, tickNumber, visibleSamples, satSinrs, tickHoLog, representativeServing);
}
