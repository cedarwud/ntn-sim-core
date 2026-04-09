import type { SimEngineState } from './state';
import type { SimulationSnapshot, SatelliteState, SatelliteBeamSnapshot, UeState, BhSlotSnapshot, DapsSnapshot, HoLogEntry, BeamRole, HoExplanation } from '../common/types';
import type { TrajectorySample } from '../orbit/types';
import type { ServingState } from '../handover/types';
import {
  buildSortedUeCandidates,
  computeSharedServingUeSinr,
  resolveSharedServingPrimarySinr,
} from './channel-step';

/**
 * Phase 5 Core Structural Split: Snapshot assembly step.
 * Ownership: Converting runtime state to SimulationSnapshot.
 */

export function runSnapshotStep(
  state: SimEngineState,
  timeSec: number,
  tickNumber: number,
  satSamples: Array<{ satId: string; sample: TrajectorySample }>,
  satSinrs: Array<{
    satId: string;
    sample: TrajectorySample;
    sinrDb: number;
    bestBeamId: string;
    referenceOffAxisAngleDeg: number;
  }>,
  tickHoLog: HoLogEntry[],
  representativeServing: { satId: string; beamId: string } | null
): SimulationSnapshot {
  const { profile, isMultiBeam, beamLayouts, lastBhSlotDecision, independentHandover, hoManagers, hoManager, uePositions, energyL2Manager } = state;

  const servingSatId = representativeServing?.satId ?? null;
  const servingBeamId = representativeServing?.beamId ?? null;

  const mainHoState = independentHandover
    ? hoManagers.get('ue-0')!.getState()
    : hoManager.getState();

  const extendedHoState = mainHoState as any;

  const preparedTarget = (mainHoState.phase === 'preparing' || extendedHoState.dapsPhase === 'prepared' || extendedHoState.mcPhase === 'mc-preparing')
    ? mainHoState.pendingTarget : null;

  const secondaryServing = (extendedHoState.dapsPhase === 'dual-active' || extendedHoState.mcPhase === 'mc-dual-active')
    ? (extendedHoState.targetServing ?? null) : null;
  const sharedServing = independentHandover
    ? null
    : resolveSharedServingPrimarySinr(state, satSinrs, representativeServing);

  const satellites: SatelliteState[] = satSamples.map((s) => {
    const base: SatelliteState = {
      id: s.satId,
      latDeg: s.sample.latDeg,
      lonDeg: s.sample.lonDeg,
      altKm: s.sample.altKm,
      azimuthDeg: s.sample.azimuthDeg,
      elevationDeg: s.sample.elevationDeg,
      rangeKm: s.sample.rangeKm,
      isVisible: s.sample.isVisible,
    };

    if (isMultiBeam) {
      const layout = beamLayouts.get(s.satId);
      if (layout) {
        const activeBeamIds = lastBhSlotDecision?.activeBeamsPerSat.get(s.satId);
        base.beams = layout.beams.map((b) => {
          const isServingBeam = s.satId === servingSatId && b.beamId === servingBeamId;
          const isTargetBeam = preparedTarget && s.satId === preparedTarget.satId && b.beamId === preparedTarget.beamId;
          const isSecondaryBeam = secondaryServing && s.satId === secondaryServing.satId && b.beamId === secondaryServing.beamId;

          const isActive = activeBeamIds ? activeBeamIds.includes(b.beamId) : true;

          let role: BeamRole = 'neutral';
          if (isServingBeam) role = 'serving';
          else if (isTargetBeam) role = 'prepared';
          else if (isSecondaryBeam) role = 'secondary';
          else if (!isActive) role = 'inactive';

          return {
            beamId: b.beamId,
            offsetEastKm: b.offsetEastKm,
            offsetNorthKm: b.offsetNorthKm,
            isActive,
            reuseGroup: b.reuseGroup,
            role,
          };
        });
      }
    }
    return base;
  });

  const ues: UeState[] = uePositions.map((ue) => {
    let ueServing: ServingState | null = null;
    let ueTarget = null;
    let ueSinr: number | null = null;

    if (independentHandover) {
      const mgr = hoManagers.get(ue.id);
      if (mgr) {
        const st = mgr.getState();
        ueServing = st.serving;
        ueTarget = st.phase === 'preparing' ? st.pendingTarget : null;
      }
    } else {
      ueServing = representativeServing as ServingState | null;
      ueTarget = preparedTarget;
      if (ueServing && sharedServing) {
        ueSinr = computeSharedServingUeSinr(
          state,
          ue,
          sharedServing.primarySinrDb,
          sharedServing.servingEntry,
        ).sinrDb;
      }
    }

    if (independentHandover && ueServing) {
      const postTickCandidate = buildSortedUeCandidates(state, ue, satSinrs).find(
        (candidate) =>
          candidate.satId === ueServing!.satId &&
          candidate.beamId === ueServing!.beamId,
      );
      ueSinr = postTickCandidate?.sinrDb ?? null;
    }

    return {
      id: ue.id,
      latDeg: ue.latitudeDeg,
      lonDeg: ue.longitudeDeg,
      servingSatId: ueServing?.satId ?? null,
      servingBeamId: ueServing?.beamId ?? null,
      targetSatId: ueTarget?.satId ?? null,
      targetBeamId: ueTarget?.beamId ?? null,
      sinrDb: ueSinr,
    };
  });

  let bhSlot: BhSlotSnapshot | undefined;
  if (lastBhSlotDecision) {
    const activeBeamsBySat: Record<string, string[]> = {};
    for (const [satId, activeBeams] of lastBhSlotDecision.activeBeamsPerSat) {
      activeBeamsBySat[satId] = activeBeams;
    }
    bhSlot = {
      slotIndex: lastBhSlotDecision.slotIndex,
      activeBeamsBySat,
      energyBlockedSats: energyL2Manager
        ? energyL2Manager
            .getAllStates()
            .filter((energyState) => energyState.isEnergyBlocked)
            .map((energyState) => energyState.satId)
        : [],
    };
  }

  const daps: DapsSnapshot | undefined = (extendedHoState.dapsPhase || extendedHoState.mcPhase) ? {
    phase: extendedHoState.dapsPhase || extendedHoState.mcPhase,
    sourceSatId: extendedHoState.sourceServing?.satId ?? null,
    targetSatId: extendedHoState.targetServing?.satId ?? null,
  } : undefined;

  // Handover explainability (sinr-offset profiles that expose trigger state)
  let hoExplanation: HoExplanation | undefined;
  const mainManager = independentHandover ? hoManagers.get('ue-0')! : hoManager;
  const triggerState = mainManager.getTriggerState?.();
  if (mainHoState.serving) {
    const servingEntry = satSinrs.find((s) => s.satId === mainHoState.serving!.satId);
    const servingSample = satSamples.find((s) => s.satId === mainHoState.serving!.satId);
    const servingSinrDb = servingEntry?.sinrDb ?? null;

    let pendingTargetSinrDb: number | null = null;
    let pendingTargetElevationDeg: number | null = null;
    let pendingTargetRangeKm: number | null = null;
    let ptSatId = triggerState?.pendingTargetSatId ?? null;
    let ptBeamId = triggerState?.pendingTargetBeamId ?? null;
    if (ptSatId) {
      const targetEntry = satSinrs.find((s) => s.satId === ptSatId);
      const targetSample = satSamples.find((s) => s.satId === ptSatId);
      pendingTargetSinrDb = targetEntry?.sinrDb ?? null;
      pendingTargetElevationDeg = targetSample?.sample.elevationDeg ?? null;
      pendingTargetRangeKm = targetSample?.sample.rangeKm ?? null;
    } else {
      // No pending target — show the best eligible non-serving candidate
      const minElev = profile.handover.min_elevation_deg ?? 10;
      const bestCandidate = satSinrs
        .filter((s) => s.satId !== mainHoState.serving!.satId && s.sample.elevationDeg >= minElev)
        .sort((a, b) => b.sinrDb - a.sinrDb)[0];
      if (bestCandidate) {
        ptSatId = bestCandidate.satId;
        ptBeamId = bestCandidate.bestBeamId;
        pendingTargetSinrDb = bestCandidate.sinrDb;
        pendingTargetElevationDeg = bestCandidate.sample.elevationDeg;
        pendingTargetRangeKm = bestCandidate.sample.rangeKm;
      }
    }

    const sinrDeltaDb = (pendingTargetSinrDb !== null && servingSinrDb !== null)
      ? pendingTargetSinrDb - servingSinrDb
      : null;

    hoExplanation = {
      servingSinrDb,
      servingElevationDeg: servingSample?.sample.elevationDeg ?? null,
      servingRangeKm: servingSample?.sample.rangeKm ?? null,
      pendingTargetSatId: ptSatId,
      pendingTargetBeamId: ptBeamId,
      pendingTargetSinrDb,
      pendingTargetElevationDeg,
      pendingTargetRangeKm,
      sinrDeltaDb,
      triggerProgressSec: triggerState?.triggerAccumulatedSec ?? 0,
      triggerThresholdSec: triggerState?.triggerTimeSec ?? 0,
      handoverOffsetDb: profile.handover.sinr_offset_db ?? 3,
      hoCount: mainHoState.totalHandovers,
    };
  }

  return {
    tick: tickNumber,
    timeSec,
    satellites,
    ues,
    recentHoEvents: tickHoLog,
    bhSlot,
    daps,
    hoExplanation,
  };
}
