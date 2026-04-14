import type { SimEngineState, UeRuntimePosition } from './state';
import type { SimulationSnapshot } from '../common/types';
import { runOrbitStep } from './orbit-step';
import { runSchedulerStep } from './scheduler-step';
import {
  computeBundleSinrSingleBeam,
  computeBundleSinrMultiBeam,
} from './channel-sinr-helpers';
import { runHandoverStep } from './handover-step';
import { runKpiStep } from './kpi-step';
import { runEnergyStep } from './energy-step';
import { runPolicyStep } from './policy-step';
import { runSnapshotStep } from './snapshot-step';
import { evaluateTrackedBeamSelection } from './beam-tracking';
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
  serviceEligible: boolean;
  beamCenterOffsetEastKm: number;
  beamCenterOffsetNorthKm: number;
}

interface SatSelectionEntry {
  satId: string;
  sample: TrajectorySample;
  selection: BeamSelectionResult;
  serviceEligible: boolean;
  beamCenterOffsetEastKm: number;
  beamCenterOffsetNorthKm: number;
}

export function executeTick(
  state: SimEngineState,
  timeSec: number,
  tickNumber: number,
  lastTickTimeSec: number | null
): SimulationSnapshot {
  const stepSec = lastTickTimeSec !== null ? timeSec - lastTickTimeSec : 1;
  const isNewDiscreteTick = state.lastDiscreteTickNumber !== tickNumber;

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
        serviceEligible: true,
        beamCenterOffsetEastKm: 0,
        beamCenterOffsetNorthKm: 0,
      });
    }
  } else {
    const allActiveSelections: SatSelectionEntry[] = [];
    const primaryUe = state.uePositions[0];
    for (const { satId, sample } of activeSatSamples) {
      const layout = state.beamLayouts.get(satId);
      const activeBeams = state.lastBhSlotDecision?.activeBeamsPerSat.get(satId);

      let selection: BeamSelectionResult;
      let serviceEligible = false;
      let beamCenterOffsetEastKm = 0;
      let beamCenterOffsetNorthKm = 0;
      if (layout) {
        const trackedSelection = evaluateTrackedBeamSelection(
          state.profile,
          layout,
          sample,
          {
            latitudeDeg: primaryUe?.latitudeDeg ?? state.profile.observer.latitudeDeg,
            longitudeDeg: primaryUe?.longitudeDeg ?? state.profile.observer.longitudeDeg,
          },
          activeBeams,
        );
        selection = trackedSelection.selection;
        serviceEligible = trackedSelection.serviceEligible;
        beamCenterOffsetEastKm = trackedSelection.beamCenterOffsetEastKm;
        beamCenterOffsetNorthKm = trackedSelection.beamCenterOffsetNorthKm;
      } else {
        selection = {
          bestBeamId: `${satId}-b0`,
          offAxisAngleDeg: 0,
          beamGainDbi: state.profile.antenna.peak_gain_dbi,
          allBeams: [],
        };
      }
      allActiveSelections.push({
        satId,
        sample,
        selection,
        serviceEligible,
        beamCenterOffsetEastKm,
        beamCenterOffsetNorthKm,
      });
    }

    // Pre-sort by elevation descending so each serving satellite can cheaply find its
    // top-K interferers without an O(N²) re-sort. Low-elevation interferers contribute
    // negligible interference (~13 dB weaker at 5° vs 80° elevation due to path loss),
    // so capping at MAX_SINR_INTERFERERS has near-zero physics impact while cutting
    // per-tick channel computations from O(N²) to O(N × K).
    const MAX_SINR_INTERFERERS = 15;
    const allActiveSortedByElev = [...allActiveSelections].sort(
      (a, b) => b.sample.elevationDeg - a.sample.elevationDeg,
    );

    for (const entry of allActiveSelections) {
      const {
        satId,
        sample,
        selection,
        serviceEligible,
        beamCenterOffsetEastKm,
        beamCenterOffsetNorthKm,
      } = entry;
      if (!visibleSatSet.has(satId)) continue;

      const activeBeams = state.lastBhSlotDecision?.activeBeamsPerSat.get(satId);
      if (state.lastBhSlotDecision && (!activeBeams || activeBeams.length === 0)) continue;

      const otherActiveSats: Array<{ satId: string; sample: TrajectorySample; selection: BeamSelectionResult }> = [];
      for (const s of allActiveSortedByElev) {
        if (s.satId === satId) continue;
        otherActiveSats.push({ satId: s.satId, sample: s.sample, selection: s.selection });
        if (otherActiveSats.length >= MAX_SINR_INTERFERERS) break;
      }
      
      const sinrDb = serviceEligible
        ? computeBundleSinrMultiBeam(state, satId, sample, selection, otherActiveSats)
        : -100;
      
      satSinrs.push({
        satId,
        sample,
        sinrDb: isNaN(sinrDb) ? -100 : sinrDb,
        bestBeamId: selection.bestBeamId,
        referenceOffAxisAngleDeg: selection.offAxisAngleDeg,
        serviceEligible,
        beamCenterOffsetEastKm,
        beamCenterOffsetNorthKm,
      });
    }
  }

  satSinrs.sort((a, b) => b.sinrDb - a.sinrDb);

  if (state.energyL2Manager) {
    satSinrs = satSinrs.filter((s) => !state.energyL2Manager!.isBlocked(s.satId));
  }

  // 5-8. Discrete engine steps must run once per simulation tick. Orbit/channel
  // may update every rendered frame, but handover/KPI/energy/policy cannot be
  // re-applied multiple times within the same integer tick or short-lived truth
  // states such as DAPS dual-active get skipped in live mode.
  let tickHoLog = state.lastTickHoLog;
  let representativeServing = state.lastRepresentativeServing;

  if (isNewDiscreteTick) {
    const handoverStep = runHandoverStep(state, timeSec, tickNumber, satSinrs);
    tickHoLog = handoverStep.tickHoLog;
    representativeServing = handoverStep.representativeServing;

    runKpiStep(state, timeSec, satSinrs, tickHoLog, representativeServing);
    runEnergyStep(state, timeSec, stepSec, activeSatSamples, satSinrs, representativeServing);
    runPolicyStep(state, timeSec, tickNumber, satSinrs, representativeServing);

    state.lastDiscreteTickNumber = tickNumber;
    state.lastTickHoLog = tickHoLog;
    state.lastRepresentativeServing = representativeServing;
  }

  // 9. Snapshot Step
  const visibleSamples = activeSatSamples.filter(s => visibleSatSet.has(s.satId));
  return runSnapshotStep(state, timeSec, tickNumber, visibleSamples, satSinrs, tickHoLog, representativeServing);
}
