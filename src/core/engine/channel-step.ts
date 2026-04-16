import type { TrajectorySample } from '../orbit/types';
import type { BeamSelectionResult } from '../beam/types';
import { computeOffAxisAngle } from '../channel/beam-gain';
import type { LinkGeometry } from '../channel/slant-range';
import { computeUeLinkGeometry } from '../channel/slant-range';
import type { SimEngineState } from './state';
import { getOrCreateBeamLayout } from './bootstrap';
import {
  evaluateTrackedBeamSelection,
  evaluateShiftedBeamSelection,
} from './beam-tracking';
import {
  computeDopplerDegradationDb,
  computeReceivedPowerDbm,
} from './channel-sinr-helpers';

/**
 * Phase 5 Core Structural Split: Channel logic.
 * Ownership: SINR computation helpers and UE-specific adjustments.
 */

const PRIMARY_UE_ID = 'ue-0';
const MAX_SINR_INTERFERERS = 15;

export interface SatSinrSeed {
  satId: string;
  sample: TrajectorySample;
  sinrDb: number;
  bestBeamId: string;
  referenceOffAxisAngleDeg: number;
  serviceEligible?: boolean;
  beamCenterOffsetEastKm?: number;
  beamCenterOffsetNorthKm?: number;
}

type UeLike = {
  id: string;
  latitudeDeg: number;
  longitudeDeg: number;
  offsetEastKm: number;
  offsetNorthKm: number;
  distanceFromCenterKm?: number;
};

interface UeSatEvaluation {
  satId: string;
  sample: TrajectorySample;
  selection: BeamSelectionResult;
  serviceEligible: boolean;
  linkGeometry?: LinkGeometry;
}

interface UeChannelCacheBucket {
  evaluationsByUe: Map<string, UeSatEvaluation[]>;
  sharedEvaluationsByUe: Map<string, UeSatEvaluation[]>;
  candidateLists: Map<string, UeServingCandidate[]>;
  forcedServingResults: Map<string, { sinrDb: number; beamId: string } | null>;
}

const UE_CHANNEL_CACHE = new WeakMap<ReadonlyArray<SatSinrSeed>, UeChannelCacheBucket>();

function getUeChannelCacheBucket(
  satSinrs: ReadonlyArray<SatSinrSeed>,
): UeChannelCacheBucket {
  let bucket = UE_CHANNEL_CACHE.get(satSinrs);
  if (!bucket) {
    bucket = {
      evaluationsByUe: new Map(),
      sharedEvaluationsByUe: new Map(),
      candidateLists: new Map(),
      forcedServingResults: new Map(),
    };
    UE_CHANNEL_CACHE.set(satSinrs, bucket);
  }
  return bucket;
}

function computeSingleBeamSelection(
  state: Pick<SimEngineState, 'profile'>,
  ue: Pick<UeLike, 'latitudeDeg' | 'longitudeDeg'>,
  satId: string,
  sample: TrajectorySample,
): BeamSelectionResult {
  const beamId = `${satId}-b0`;
  const offAxisAngleDeg = computeOffAxisAngle(
    sample.latDeg,
    sample.lonDeg,
    ue.latitudeDeg,
    ue.longitudeDeg,
    sample.altKm,
  );
  return {
    bestBeamId: beamId,
    offAxisAngleDeg: isNaN(offAxisAngleDeg) ? 0 : offAxisAngleDeg,
    beamGainDbi: state.profile.antenna.peak_gain_dbi,
    allBeams: [
      {
        beamId,
        offAxisAngleDeg: isNaN(offAxisAngleDeg) ? 0 : offAxisAngleDeg,
        reuseGroup: 0,
      },
    ],
  };
}

function buildUeSatelliteEvaluation(
  state: SimEngineState,
  ue: UeLike,
  satEntry: SatSinrSeed,
): UeSatEvaluation | null {
  const activeBeamIds = state.lastBhSlotDecision?.activeBeamsPerSat.get(satEntry.satId);
  if (state.lastBhSlotDecision && (!activeBeamIds || activeBeamIds.length === 0)) {
    return null;
  }

  const linkGeometry = state.profile.channel.ue_geometry_mode === 'per-ue-topocentric'
    ? computeUeLinkGeometry(satEntry.sample, ue)
    : undefined;

  if (!state.isMultiBeam) {
    return {
      satId: satEntry.satId,
      sample: satEntry.sample,
      selection: computeSingleBeamSelection(state, ue, satEntry.satId, satEntry.sample),
      serviceEligible: true,
      linkGeometry,
    };
  }

  const layout = getOrCreateBeamLayout(state, satEntry.satId, satEntry.sample.altKm);
  const trackedSelection = evaluateTrackedBeamSelection(
    state.profile,
    layout,
    satEntry.sample,
    {
      latitudeDeg: ue.latitudeDeg ?? state.profile.observer.latitudeDeg,
      longitudeDeg: ue.longitudeDeg ?? state.profile.observer.longitudeDeg,
    },
    activeBeamIds,
  );

  return {
    satId: satEntry.satId,
    sample: satEntry.sample,
    selection: trackedSelection.selection,
    serviceEligible: trackedSelection.serviceEligible,
    linkGeometry,
  };
}

function getUeSatelliteEvaluations(
  state: SimEngineState,
  ue: UeLike,
  satSinrs: ReadonlyArray<SatSinrSeed>,
): UeSatEvaluation[] {
  const bucket = getUeChannelCacheBucket(satSinrs);
  const cached = bucket.evaluationsByUe.get(ue.id);
  if (cached) return cached;

  const evaluations = satSinrs
    .map((satEntry) => buildUeSatelliteEvaluation(state, ue, satEntry))
    .filter((entry): entry is UeSatEvaluation => entry !== null);

  bucket.evaluationsByUe.set(ue.id, evaluations);
  return evaluations;
}

function getSharedServingSatelliteEvaluations(
  state: SimEngineState,
  ue: UeLike,
  satSinrs: ReadonlyArray<SatSinrSeed>,
): UeSatEvaluation[] {
  const bucket = getUeChannelCacheBucket(satSinrs);
  const cached = bucket.sharedEvaluationsByUe.get(ue.id);
  if (cached) return cached;

  const evaluations = satSinrs
    .map((satEntry): UeSatEvaluation | null => {
      const activeBeamIds = state.lastBhSlotDecision?.activeBeamsPerSat.get(satEntry.satId);
      if (state.lastBhSlotDecision && (!activeBeamIds || activeBeamIds.length === 0)) {
        return null;
      }

      if (!state.isMultiBeam || state.profile.beamSemantics !== 'earth-moving') {
        return buildUeSatelliteEvaluation(state, ue, satEntry);
      }

      const layout = getOrCreateBeamLayout(state, satEntry.satId, satEntry.sample.altKm);
      // Reuse the primary UE's tracked lattice shift published in satSinrs so
      // shared-serving KPI/SINR paths stay aligned with the engine's serving truth.
      const trackedSelection = evaluateShiftedBeamSelection(
        state.profile,
        layout,
        satEntry.sample,
        {
          latitudeDeg: ue.latitudeDeg ?? state.profile.observer.latitudeDeg,
          longitudeDeg: ue.longitudeDeg ?? state.profile.observer.longitudeDeg,
        },
        {
          eastKm: satEntry.beamCenterOffsetEastKm ?? 0,
          northKm: satEntry.beamCenterOffsetNorthKm ?? 0,
        },
        activeBeamIds,
      );

      return {
        satId: satEntry.satId,
        sample: satEntry.sample,
        selection: trackedSelection.selection,
        serviceEligible: trackedSelection.serviceEligible,
        linkGeometry: state.profile.channel.ue_geometry_mode === 'per-ue-topocentric'
          ? computeUeLinkGeometry(satEntry.sample, ue)
          : undefined,
      };
    })
    .filter((entry): entry is UeSatEvaluation => entry !== null);

  bucket.sharedEvaluationsByUe.set(ue.id, evaluations);
  return evaluations;
}

function getInterfererCap(state: Pick<SimEngineState, 'profile'>): number | null {
  const configured = state.profile.channel.max_interfering_sats;
  if (configured === null) return null;
  if (configured === undefined) return MAX_SINR_INTERFERERS;
  return Math.max(0, Math.floor(configured));
}

function computeCandidateSinrFromEvaluations(
  state: SimEngineState,
  ue: Pick<UeLike, 'latitudeDeg' | 'longitudeDeg'>,
  servingEvaluation: UeSatEvaluation,
  allEvaluations: readonly UeSatEvaluation[],
  forcedBeamId?: string,
): { sinrDb: number; beamId: string } | null {
  const servingBeamId = forcedBeamId ?? servingEvaluation.selection.bestBeamId;
  const servingBeam =
    servingEvaluation.selection.allBeams.find((beam) => beam.beamId === servingBeamId) ?? null;
  if (!servingBeam) return null;

  const servingRxPowerDbm = computeReceivedPowerDbm(
    state,
    servingEvaluation.sample,
    state.isMultiBeam ? servingBeam.offAxisAngleDeg : 0,
    0.1,
    {
      beamId: servingBeamId,
      linkGeometry: servingEvaluation.linkGeometry,
    },
  );

  const intraInterferingRxPowersDbm: number[] = [];
  const interInterferingRxPowersDbm: number[] = [];

  if (state.isMultiBeam) {
    if (state.profile.channel.tier3_beam_gain) {
      const servingReuseGroup = servingBeam.reuseGroup ?? 0;
      for (const beam of servingEvaluation.selection.allBeams) {
        if (beam.beamId === servingBeamId) continue;
        if (state.profile.beam.frf !== 1 && beam.reuseGroup !== servingReuseGroup) continue;
        const iRxPowerDbm = computeReceivedPowerDbm(
          state,
          servingEvaluation.sample,
          beam.offAxisAngleDeg,
          0.1,
          {
            beamId: beam.beamId,
            linkGeometry: servingEvaluation.linkGeometry,
          },
        );
        if (isFinite(iRxPowerDbm)) intraInterferingRxPowersDbm.push(iRxPowerDbm);
      }

      const sortedInterEvaluations = allEvaluations
        .filter((entry) => entry.satId !== servingEvaluation.satId)
        .sort((a, b) => b.sample.elevationDeg - a.sample.elevationDeg);
      const interfererCap = getInterfererCap(state);
      const interEvaluations = interfererCap === null
        ? sortedInterEvaluations
        : sortedInterEvaluations.slice(0, interfererCap);
      for (const other of interEvaluations) {
        const crossOffAxisDeg = computeOffAxisAngle(
          other.sample.latDeg,
          other.sample.lonDeg,
          ue.latitudeDeg,
          ue.longitudeDeg,
          other.sample.altKm,
        );
        const iRxPowerDbm = computeReceivedPowerDbm(
          state,
          other.sample,
          crossOffAxisDeg,
          -5,
          {
            beamId: other.selection.bestBeamId,
            linkGeometry: other.linkGeometry,
          },
        );
        if (isFinite(iRxPowerDbm)) interInterferingRxPowersDbm.push(iRxPowerDbm);
      }
    }
  } else {
    for (const other of allEvaluations) {
      if (other.satId === servingEvaluation.satId) continue;
      const iRxPowerDbm = computeReceivedPowerDbm(
        state,
        other.sample,
        other.selection.offAxisAngleDeg,
        -5,
        {
          beamId: other.selection.bestBeamId,
          linkGeometry: other.linkGeometry,
        },
      );
      if (isFinite(iRxPowerDbm)) interInterferingRxPowersDbm.push(iRxPowerDbm);
    }
  }

  const dopplerLossDb = computeDopplerDegradationDb(
    servingEvaluation.linkGeometry?.elevationDeg ?? servingEvaluation.sample.elevationDeg,
    servingEvaluation.sample.altKm,
    state.profile.rf.frequency_ghz,
    state.profile.channel.tier6_doppler ?? false,
  );

  const sinrDb = state.bundle.sinr.computeDb({
    associationActive: true,
    servingRxPowerDbm,
    noisePowerDbm: state.noiseDbm,
    intraInterferingRxPowersDbm,
    interInterferingRxPowersDbm,
    dopplerIciDegradationDb: dopplerLossDb,
  });

  return {
    sinrDb: isNaN(sinrDb) ? -100 : sinrDb,
    beamId: servingBeamId,
  };
}

function buildNonPrimaryUeCandidates(
  state: SimEngineState,
  ue: UeLike,
  satSinrs: ReadonlyArray<SatSinrSeed>,
): UeServingCandidate[] {
  const bucket = getUeChannelCacheBucket(satSinrs);
  const cached = bucket.candidateLists.get(ue.id);
  if (cached) return cached;

  const evaluations = getUeSatelliteEvaluations(state, ue, satSinrs);
  const candidates = evaluations
    .filter((evaluation) => evaluation.serviceEligible)
    .map((evaluation): UeServingCandidate | null => {
      const result = computeCandidateSinrFromEvaluations(state, ue, evaluation, evaluations);
      if (!result) return null;
      return {
        satId: evaluation.satId,
        beamId: result.beamId,
        sinrDb: result.sinrDb,
        sample: evaluation.sample,
      };
    })
    .filter((candidate): candidate is UeServingCandidate => candidate !== null)
    .sort((a, b) => b.sinrDb - a.sinrDb);

  bucket.candidateLists.set(ue.id, candidates);
  return candidates;
}

function computeForcedServingUeSinr(
  state: SimEngineState,
  ue: UeLike,
  satSinrs: ReadonlyArray<SatSinrSeed>,
  serving: { satId: string; beamId: string },
): { sinrDb: number; beamId: string } | null {
  const bucket = getUeChannelCacheBucket(satSinrs);
  const cacheKey = `${ue.id}|${serving.satId}|${serving.beamId}`;
  if (bucket.forcedServingResults.has(cacheKey)) {
    return bucket.forcedServingResults.get(cacheKey) ?? null;
  }

  const evaluations = state.independentHandover
    ? getUeSatelliteEvaluations(state, ue, satSinrs)
    : getSharedServingSatelliteEvaluations(state, ue, satSinrs);
  const servingEvaluation = evaluations.find((entry) => entry.satId === serving.satId);
  if (!servingEvaluation || !servingEvaluation.serviceEligible) {
    bucket.forcedServingResults.set(cacheKey, null);
    return null;
  }

  const result = computeCandidateSinrFromEvaluations(
    state,
    ue,
    servingEvaluation,
    evaluations,
    serving.beamId,
  );
  bucket.forcedServingResults.set(cacheKey, result);
  return result;
}

function resolvePrimarySharedServingSinr(
  state: Pick<SimEngineState, 'hoManager'>,
  satSinrs: ReadonlyArray<SatSinrSeed>,
  representativeServing: { satId: string; beamId: string } | null,
): { sinrDb: number; beamId: string } | null {
  if (!representativeServing) return null;

  const servingEntry = satSinrs.find(
    (entry) =>
      entry.serviceEligible !== false &&
      entry.satId === representativeServing.satId &&
      entry.bestBeamId === representativeServing.beamId,
  );
  if (!servingEntry) return null;

  const hoState = state.hoManager.getState() as ReturnType<SimEngineState['hoManager']['getState']> & {
    dapsPhase?: string;
    mcPhase?: string;
    sourceServing?: { satId: string; beamId: string } | null;
    targetServing?: { satId: string; beamId: string } | null;
  };

  const dualActive =
    hoState.dapsPhase === 'dual-active' || hoState.mcPhase === 'mc-dual-active';
  if (dualActive && hoState.sourceServing && hoState.targetServing) {
    const sourceEntry = satSinrs.find(
      (entry) =>
        entry.serviceEligible !== false &&
        entry.satId === hoState.sourceServing!.satId &&
        entry.bestBeamId === hoState.sourceServing!.beamId,
    );
    const targetEntry = satSinrs.find(
      (entry) =>
        entry.serviceEligible !== false &&
        entry.satId === hoState.targetServing!.satId &&
        entry.bestBeamId === hoState.targetServing!.beamId,
    );
    if (sourceEntry && targetEntry) {
      return sourceEntry.sinrDb >= targetEntry.sinrDb
        ? { sinrDb: sourceEntry.sinrDb, beamId: sourceEntry.bestBeamId }
        : { sinrDb: targetEntry.sinrDb, beamId: targetEntry.bestBeamId };
    }
  }

  return {
    sinrDb: servingEntry.sinrDb,
    beamId: servingEntry.bestBeamId,
  };
}

export interface UeServingCandidate {
  satId: string;
  beamId: string;
  sinrDb: number;
  sample: TrajectorySample;
}

export interface BeamPowerSeed {
  satId: string;
  beamId: string;
  sinrDb: number;
  associatedUeId: string | null;
  source: 'best-candidate' | 'forced-serving-lattice';
}

function getEvaluationsForBeamPowerSeeds(
  state: SimEngineState,
  ue: UeLike,
  satSinrs: ReadonlyArray<SatSinrSeed>,
): UeSatEvaluation[] {
  return state.independentHandover
    ? getUeSatelliteEvaluations(state, ue, satSinrs)
    : getSharedServingSatelliteEvaluations(state, ue, satSinrs);
}

function beamPowerSeedPriority(seed: BeamPowerSeed): number {
  switch (seed.source) {
    case 'forced-serving-lattice':
      return 2;
    case 'best-candidate':
    default:
      return 1;
  }
}

function upsertBeamPowerSeed(
  seedMap: Map<string, BeamPowerSeed>,
  seed: BeamPowerSeed,
): void {
  const key = `${seed.satId}|${seed.beamId}`;
  const existing = seedMap.get(key);
  if (!existing) {
    seedMap.set(key, seed);
    return;
  }

  const incomingPriority = beamPowerSeedPriority(seed);
  const existingPriority = beamPowerSeedPriority(existing);
  if (incomingPriority > existingPriority) {
    seedMap.set(key, seed);
    return;
  }

  if (incomingPriority === existingPriority && seed.sinrDb > existing.sinrDb) {
    // One beam carries one proxy-associated UE. When multiple UEs map to the same
    // beam, prefer the strongest candidate as the beam's representative served UE.
    seedMap.set(key, seed);
  }
}

export function buildSortedUeCandidates(
  state: SimEngineState,
  ue: UeLike,
  satSinrs: SatSinrSeed[],
): UeServingCandidate[] {
  if (ue.id === PRIMARY_UE_ID) {
    return satSinrs
      .filter((satEntry) => satEntry.serviceEligible !== false)
      .map((satEntry) => ({
        satId: satEntry.satId,
        beamId: satEntry.bestBeamId,
        sinrDb: satEntry.sinrDb,
        sample: satEntry.sample,
      }))
      .sort((a, b) => b.sinrDb - a.sinrDb);
  }

  return buildNonPrimaryUeCandidates(state, ue, satSinrs);
}

export function buildBeamPowerSeeds(
  state: SimEngineState,
  satSinrs: SatSinrSeed[],
  representativeServing: { satId: string; beamId: string } | null,
): BeamPowerSeed[] {
  const seedMap = new Map<string, BeamPowerSeed>();

  for (const ue of state.uePositions) {
    const candidates = buildSortedUeCandidates(state, ue, satSinrs);
    for (const candidate of candidates) {
      upsertBeamPowerSeed(seedMap, {
        satId: candidate.satId,
        beamId: candidate.beamId,
        sinrDb: candidate.sinrDb,
        associatedUeId: ue.id,
        source: 'best-candidate',
      });
    }
  }

  if (!representativeServing) {
    return Array.from(seedMap.values());
  }

  const primaryUe = state.uePositions.find((ue) => ue.id === PRIMARY_UE_ID) ?? state.uePositions[0];
  if (!primaryUe) {
    return Array.from(seedMap.values());
  }

  const evaluations = getEvaluationsForBeamPowerSeeds(state, primaryUe, satSinrs);
  const servingEvaluation = evaluations.find((entry) => entry.satId === representativeServing.satId);
  if (!servingEvaluation || !servingEvaluation.serviceEligible) {
    return Array.from(seedMap.values());
  }

  for (const beam of servingEvaluation.selection.allBeams) {
    const result = computeCandidateSinrFromEvaluations(
      state,
      primaryUe,
      servingEvaluation,
      evaluations,
      beam.beamId,
    );
    if (!result) continue;

    upsertBeamPowerSeed(seedMap, {
      satId: servingEvaluation.satId,
      beamId: beam.beamId,
      sinrDb: result.sinrDb,
      associatedUeId: primaryUe.id,
      source: 'forced-serving-lattice',
    });
  }

  return Array.from(seedMap.values());
}

export function computeSharedServingUeSinr(
  state: SimEngineState,
  ue: UeLike,
  satSinrs: SatSinrSeed[],
  representativeServing: { satId: string; beamId: string } | null,
): { sinrDb: number; beamId: string } | null {
  if (!representativeServing) return null;

  if (ue.id === PRIMARY_UE_ID) {
    return resolvePrimarySharedServingSinr(state, satSinrs, representativeServing);
  }

  const hoState = state.hoManager.getState() as ReturnType<SimEngineState['hoManager']['getState']> & {
    dapsPhase?: string;
    mcPhase?: string;
    sourceServing?: { satId: string; beamId: string } | null;
    targetServing?: { satId: string; beamId: string } | null;
  };

  const dualActive =
    hoState.dapsPhase === 'dual-active' || hoState.mcPhase === 'mc-dual-active';
  if (dualActive && hoState.sourceServing && hoState.targetServing) {
    const sourceResult = computeForcedServingUeSinr(
      state,
      ue,
      satSinrs,
      hoState.sourceServing,
    );
    const targetResult = computeForcedServingUeSinr(
      state,
      ue,
      satSinrs,
      hoState.targetServing,
    );
    if (!sourceResult) return targetResult;
    if (!targetResult) return sourceResult;
    return sourceResult.sinrDb >= targetResult.sinrDb ? sourceResult : targetResult;
  }

  return computeForcedServingUeSinr(state, ue, satSinrs, representativeServing);
}
