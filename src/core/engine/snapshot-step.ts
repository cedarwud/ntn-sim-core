import type { SimEngineState } from './state';
import type {
  SimulationSnapshot,
  SatelliteState,
  SatelliteBeamSnapshot,
  UeState,
  BhSlotSnapshot,
  DapsSnapshot,
  HoLogEntry,
  BeamRole,
  HoExplanation,
  PublishedServiceState,
  PublishedServingTransition,
} from '../common/types';
import type { TrajectorySample } from '../orbit/types';
import type { ServingState } from '../handover/types';
import {
  buildSortedUeCandidates,
  computeSharedServingUeSinr,
} from './channel-step';

/**
 * Phase 5 Core Structural Split: Snapshot assembly step.
 * Ownership: Converting runtime state to SimulationSnapshot.
 */

type ContinuityEndpoint = {
  satId: string;
  beamId: string | null;
};

type ContinuityTruth = {
  source: ContinuityEndpoint | null;
  target: ContinuityEndpoint | null;
  secondary: ContinuityEndpoint | null;
  continuityState: UeState['continuityState'] | null;
  continuityPhase: string | null;
};

function buildPublishedServiceState(
  serving: ServingState | null,
  hasEligibleService: boolean,
): PublishedServiceState {
  if (serving) {
    return { state: 'serving' };
  }
  return hasEligibleService
    ? { state: 'no-service', reason: 'no-eligible-service' }
    : { state: 'no-service', reason: 'out-of-reach' };
}

function getPublishedServingTransition(
  state: SimEngineState,
  ueId: string,
): PublishedServingTransition {
  return state.lastPublishedServingTransitions[ueId] ?? {
    kind: 'none',
    sourceSatId: null,
    sourceBeamId: null,
    targetSatId: null,
    targetBeamId: null,
  };
}

function endpointFromServing(serving: ServingState | null | undefined): ContinuityEndpoint | null {
  return serving ? { satId: serving.satId, beamId: serving.beamId } : null;
}

function buildContinuityTruth(
  hoState: {
    phase: string;
    serving: ServingState | null;
    pendingTarget: { satId: string; beamId: string } | null;
  },
  manager: { getTriggerState?: () => {
    pendingTargetSatId: string | null;
    pendingTargetBeamId: string | null;
  } } | null,
): ContinuityTruth {
  const extendedHoState = hoState as any;
  const triggerState = manager?.getTriggerState?.();
  const pendingTarget = hoState.pendingTarget
    ? { satId: hoState.pendingTarget.satId, beamId: hoState.pendingTarget.beamId }
    : triggerState?.pendingTargetSatId
      ? {
          satId: triggerState.pendingTargetSatId,
          beamId: triggerState.pendingTargetBeamId,
        }
      : null;
  const source = endpointFromServing(extendedHoState.sourceServing ?? hoState.serving);
  const continuityPhase = extendedHoState.dapsPhase ?? extendedHoState.mcPhase ?? null;

  if (continuityPhase === 'dual-active' || continuityPhase === 'mc-dual-active') {
    const target = endpointFromServing(extendedHoState.targetServing) ?? pendingTarget;
    return {
      source,
      target,
      secondary: target,
      continuityState: 'dual-active',
      continuityPhase,
    };
  }

  if (
    hoState.phase === 'preparing'
    || continuityPhase === 'prepared'
    || continuityPhase === 'mc-preparing'
    || pendingTarget !== null
  ) {
    return {
      source,
      target: pendingTarget,
      secondary: null,
      continuityState: pendingTarget ? 'prepared' : null,
      continuityPhase,
    };
  }

  return {
    source,
    target: null,
    secondary: null,
    continuityState: null,
    continuityPhase,
  };
}

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
    serviceEligible?: boolean;
    beamCenterOffsetEastKm?: number;
    beamCenterOffsetNorthKm?: number;
  }>,
  tickHoLog: HoLogEntry[],
  representativeServing: { satId: string; beamId: string } | null
): SimulationSnapshot {
  const { profile, isMultiBeam, beamLayouts, lastBhSlotDecision, independentHandover, hoManagers, hoManager, uePositions, energyL2Manager } = state;

  const servingSatId = representativeServing?.satId ?? null;
  const servingBeamId = representativeServing?.beamId ?? null;

  const mainManager = independentHandover ? hoManagers.get('ue-0')! : hoManager;
  const mainHoState = independentHandover
    ? hoManagers.get('ue-0')!.getState()
    : hoManager.getState();
  const mainContinuity = buildContinuityTruth(mainHoState, mainManager);
  const preparedTarget = mainContinuity.target;
  const secondaryServing = mainContinuity.secondary;
  const sharedServing = independentHandover
    ? null
    : representativeServing;

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
      const satTruth = satSinrs.find((entry) => entry.satId === s.satId);
      if (layout && satTruth?.serviceEligible !== false) {
        const activeBeamIds = lastBhSlotDecision?.activeBeamsPerSat.get(s.satId);
        const beamCenterOffsetEastKm = satTruth?.beamCenterOffsetEastKm ?? 0;
        const beamCenterOffsetNorthKm = satTruth?.beamCenterOffsetNorthKm ?? 0;
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
            // Snapshot beam offsets stay expressed relative to satellite nadir.
            // The first bounded-steering slice publishes the tracked lattice shift
            // here so the renderer follows the same per-satellite beam truth used
            // by serving/candidate generation without changing the frozen contract.
            offsetEastKm: b.offsetEastKm + beamCenterOffsetEastKm,
            offsetNorthKm: b.offsetNorthKm + beamCenterOffsetNorthKm,
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
    let ueTarget: ContinuityEndpoint | null = null;
    let ueSecondary: ContinuityEndpoint | null = null;
    let ueContinuityState: UeState['continuityState'] | null = null;
    let ueSinr: number | null = null;
    const serviceCandidates = buildSortedUeCandidates(state, ue, satSinrs);

    if (independentHandover) {
      const mgr = hoManagers.get(ue.id);
      if (mgr) {
        const st = mgr.getState();
        const continuity = buildContinuityTruth(st, mgr);
        ueServing = st.serving;
        ueTarget = continuity.target;
        ueSecondary = continuity.secondary;
        ueContinuityState = continuity.continuityState;
      }
    } else {
      ueServing = representativeServing as ServingState | null;
      ueTarget = mainContinuity.target;
      ueSecondary = mainContinuity.secondary;
      ueContinuityState = mainContinuity.continuityState;
      if (ueServing && sharedServing) {
        ueSinr =
          computeSharedServingUeSinr(state, ue, satSinrs, sharedServing)?.sinrDb ?? null;
      }
    }

    if (independentHandover && ueServing) {
      const postTickCandidate = serviceCandidates.find(
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
      secondarySatId: ueSecondary?.satId ?? null,
      secondaryBeamId: ueSecondary?.beamId ?? null,
      continuityState: ueContinuityState ?? undefined,
      sinrDb: ueSinr,
      servingTransition: getPublishedServingTransition(state, ue.id),
      serviceState: buildPublishedServiceState(ueServing, serviceCandidates.length > 0),
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

  const daps: DapsSnapshot | undefined = mainContinuity.continuityPhase ? {
    phase: mainContinuity.continuityPhase,
    sourceSatId: mainContinuity.source?.satId ?? null,
    targetSatId: mainContinuity.secondary?.satId ?? mainContinuity.target?.satId ?? null,
  } : undefined;

  // Handover explainability (sinr-offset profiles that expose trigger state)
  let hoExplanation: HoExplanation | undefined;
  const triggerState = mainManager.getTriggerState?.();
  if (mainHoState.serving) {
    const servingEntry = satSinrs.find(
      (s) => s.satId === mainHoState.serving!.satId && s.serviceEligible !== false,
    );
    const servingSample = satSamples.find((s) => s.satId === mainHoState.serving!.satId);
    const servingSinrDb = servingEntry?.sinrDb ?? null;

    let pendingTargetSinrDb: number | null = null;
    let pendingTargetElevationDeg: number | null = null;
    let pendingTargetRangeKm: number | null = null;
    let ptSatId = triggerState?.pendingTargetSatId ?? null;
    let ptBeamId = triggerState?.pendingTargetBeamId ?? null;
    if (ptSatId) {
      const targetEntry = satSinrs.find(
        (s) => s.satId === ptSatId && s.serviceEligible !== false,
      );
      const targetSample = satSamples.find((s) => s.satId === ptSatId);
      pendingTargetSinrDb = targetEntry?.sinrDb ?? null;
      pendingTargetElevationDeg = targetSample?.sample.elevationDeg ?? null;
      pendingTargetRangeKm = targetSample?.sample.rangeKm ?? null;
    } else {
      // No pending target — show the best eligible non-serving candidate
      const minElev = profile.handover.min_elevation_deg ?? 10;
      const bestCandidate = satSinrs
        .filter(
          (s) =>
            s.serviceEligible !== false
            && s.satId !== mainHoState.serving!.satId
            && s.sample.elevationDeg >= minElev,
        )
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
