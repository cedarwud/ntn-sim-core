import type {
  ModqnActionVector,
  ModqnBaselineObservation,
  ModqnPaperState,
  ModqnRewardInput,
  ModqnRewardVector,
} from '@/core/contracts/modqn-contracts';
import type { KpiBundle } from '@/core/contracts/kpi-v1';
import type { PolicyObservation } from '@/core/contracts/policy-v1';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import type { ProfileConfig } from '@/core/profiles/types';

const KM_PER_LAT_DEG = 110.574;
const KM_PER_LON_DEG = 111.32;
const MIN_SIGNAL_LINEAR = 1e-9;

export interface ModqnBeamCatalogEntry {
  readonly catalogIndex: number;
  readonly satId: string;
  readonly beamId: string;
}

export interface EncodedModqnState {
  readonly encodedState: readonly number[];
  readonly validActionCatalogIndices: readonly number[];
  readonly candidateCatalogIndexByObservationIndex: readonly number[];
}

function dbToLinear(db: number | null | undefined): number {
  if (db === null || db === undefined || !Number.isFinite(db)) {
    return MIN_SIGNAL_LINEAR;
  }
  return Math.max(MIN_SIGNAL_LINEAR, Math.pow(10, db / 10));
}

function beamShapeWeight(distanceKm: number, beamDiameterKm: number): number {
  const safeDiameterKm = Math.max(beamDiameterKm, 1);
  const normalizedDistance = distanceKm / safeDiameterKm;
  return Math.exp(-4 * Math.log(2) * normalizedDistance * normalizedDistance);
}

function toLocalEastNorthKm(
  originLatDeg: number,
  originLonDeg: number,
  targetLatDeg: number,
  targetLonDeg: number,
): { eastKm: number; northKm: number } {
  const meanLatRad = ((originLatDeg + targetLatDeg) / 2) * (Math.PI / 180);
  return {
    eastKm: (targetLonDeg - originLonDeg) * KM_PER_LON_DEG * Math.cos(meanLatRad),
    northKm: (targetLatDeg - originLatDeg) * KM_PER_LAT_DEG,
  };
}

function shannonThroughputMbps(sinrDb: number | null, bandwidthMhz: number): number {
  if (sinrDb === null || !Number.isFinite(sinrDb)) {
    return 0;
  }
  const sinrLinear = Math.pow(10, sinrDb / 10);
  return bandwidthMhz * Math.log2(1 + sinrLinear);
}

function parseBeamIndex(beamId: string): number {
  const match = /-b(\d+)$/.exec(beamId);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function zeroRewardVector(): ModqnRewardVector {
  return {
    throughput: 0,
    handoverPenalty: 0,
    loadBalance: 0,
  };
}

export function scalarizeReward(
  rewardVector: ModqnRewardVector,
  weights: readonly [number, number, number],
): number {
  return (
    rewardVector.throughput * weights[0] +
    rewardVector.handoverPenalty * weights[1] +
    rewardVector.loadBalance * weights[2]
  );
}

export function addRewardVectors(
  left: ModqnRewardVector,
  right: ModqnRewardVector,
): ModqnRewardVector {
  return {
    throughput: left.throughput + right.throughput,
    handoverPenalty: left.handoverPenalty + right.handoverPenalty,
    loadBalance: left.loadBalance + right.loadBalance,
  };
}

export function averageRewardVectors(vectors: readonly ModqnRewardVector[]): ModqnRewardVector {
  if (vectors.length === 0) {
    return zeroRewardVector();
  }
  const total = vectors.reduce(addRewardVectors, zeroRewardVector());
  return {
    throughput: total.throughput / vectors.length,
    handoverPenalty: total.handoverPenalty / vectors.length,
    loadBalance: total.loadBalance / vectors.length,
  };
}

export function averageKpiBundles(bundles: readonly KpiBundle[]): KpiBundle {
  if (bundles.length === 0) {
    throw new Error('[averageKpiBundles] bundles array is empty');
  }

  const keys = Object.keys(bundles[0]) as Array<keyof KpiBundle>;
  const aggregate: Partial<Record<keyof KpiBundle, number>> = {};

  for (const key of keys) {
    let sum = 0;
    for (const bundle of bundles) {
      sum += bundle[key];
    }
    aggregate[key] = sum / bundles.length;
  }

  return aggregate as KpiBundle;
}

export function buildBeamCatalog(
  satIds: readonly string[],
  beamsPerSatellite: number,
): ModqnBeamCatalogEntry[] {
  const sortedSatIds = [...new Set(satIds)].sort();
  const entries: ModqnBeamCatalogEntry[] = [];

  for (const satId of sortedSatIds) {
    for (let beamIndex = 0; beamIndex < beamsPerSatellite; beamIndex += 1) {
      entries.push({
        catalogIndex: entries.length,
        satId,
        beamId: `${satId}-b${beamIndex}`,
      });
    }
  }

  if (entries.length === 0) {
    throw new Error('[buildBeamCatalog] no candidate satellites available for MODQN catalog');
  }

  return entries;
}

export function buildBaselineObservationFromRuntime(args: {
  snapshot: SimulationSnapshot;
  policyObservation: PolicyObservation;
  profile: ProfileConfig;
  primaryUserId: string;
}): ModqnBaselineObservation | null {
  const { snapshot, policyObservation, profile, primaryUserId } = args;
  const primaryUe = snapshot.ues.find((ue) => ue.id === primaryUserId);
  if (!primaryUe) {
    return null;
  }

  const beamUserCounts = new Map<string, number>();
  const beamThroughputs = new Map<string, number>();
  for (const ue of snapshot.ues) {
    if (!ue.servingSatId || !ue.servingBeamId) {
      continue;
    }
    const key = `${ue.servingSatId}::${ue.servingBeamId}`;
    beamUserCounts.set(key, (beamUserCounts.get(key) ?? 0) + 1);
    beamThroughputs.set(
      key,
      (beamThroughputs.get(key) ?? 0) + shannonThroughputMbps(ue.sinrDb, profile.rf.bandwidth_mhz),
    );
  }

  const satObsById = new Map(policyObservation.satellites.map((satObs) => [satObs.satId, satObs]));
  const satellites = [...snapshot.satellites]
    .filter((sat) => sat.isVisible && sat.beams && sat.beams.length > 0)
    .sort((left, right) => left.id.localeCompare(right.id));

  if (satellites.length === 0) {
    return null;
  }

  const beams = satellites.flatMap((satellite) => {
    const satObs = satObsById.get(satellite.id);
    const baseSignalLinear = dbToLinear(
      satellite.id === primaryUe.servingSatId ? primaryUe.sinrDb : (satObs?.sinrDb ?? null),
    );
    const ueOffset = toLocalEastNorthKm(
      satellite.latDeg,
      satellite.lonDeg,
      primaryUe.latDeg,
      primaryUe.lonDeg,
    );

    return (satellite.beams ?? [])
      .slice()
      .sort((left, right) => parseBeamIndex(left.beamId) - parseBeamIndex(right.beamId))
      .map((beam) => {
        const deltaEastKm = ueOffset.eastKm - beam.offsetEastKm;
        const deltaNorthKm = ueOffset.northKm - beam.offsetNorthKm;
        const distanceFromCenterKm = Math.hypot(deltaEastKm, deltaNorthKm);
        const proxySignalLinear = Math.max(
          MIN_SIGNAL_LINEAR,
          baseSignalLinear * beamShapeWeight(distanceFromCenterKm, profile.antenna.beam_diameter_km),
        );
        const beamKey = `${satellite.id}::${beam.beamId}`;
        return {
          satId: satellite.id,
          beamId: beam.beamId,
          channelGainLinear: proxySignalLinear,
          snrLinear: proxySignalLinear,
          beamCenterEastKm: beam.offsetEastKm,
          beamCenterNorthKm: beam.offsetNorthKm,
          userCount: beamUserCounts.get(beamKey) ?? 0,
          beamThroughputMbps: beamThroughputs.get(beamKey) ?? 0,
        };
      });
  });

  if (beams.length === 0) {
    return null;
  }

  return {
    tick: snapshot.tick,
    timeSec: snapshot.timeSec,
    userId: primaryUserId,
    currentSatId: primaryUe.servingSatId,
    currentBeamId: primaryUe.servingBeamId,
    beams: beams.map((beam, beamIndex) => ({
      ...beam,
      beamIndex,
    })),
  };
}

export function encodePaperState(args: {
  state: ModqnPaperState;
  observation: ModqnBaselineObservation;
  catalog: readonly ModqnBeamCatalogEntry[];
}): EncodedModqnState {
  const { state, observation, catalog } = args;
  const encodedAccess = new Array<number>(catalog.length).fill(0);
  const encodedGains = new Array<number>(catalog.length).fill(0);
  const encodedEast = new Array<number>(catalog.length).fill(0);
  const encodedNorth = new Array<number>(catalog.length).fill(0);
  const encodedUsers = new Array<number>(catalog.length).fill(0);
  const validActionCatalogIndices: number[] = [];
  const candidateCatalogIndexByObservationIndex: number[] = [];

  const catalogIndexByBeam = new Map(
    catalog.map((entry) => [`${entry.satId}::${entry.beamId}`, entry.catalogIndex]),
  );

  observation.beams.forEach((beam, observationIndex) => {
    const catalogIndex = catalogIndexByBeam.get(`${beam.satId}::${beam.beamId}`);
    if (catalogIndex === undefined) {
      return;
    }

    encodedAccess[catalogIndex] = state.accessVector[observationIndex] ?? 0;
    encodedGains[catalogIndex] = state.channelGainsLinear[observationIndex] ?? 0;
    encodedEast[catalogIndex] = state.beamLocationsKm[observationIndex]?.eastKm ?? 0;
    encodedNorth[catalogIndex] = state.beamLocationsKm[observationIndex]?.northKm ?? 0;
    encodedUsers[catalogIndex] = state.usersPerBeam[observationIndex] ?? 0;

    validActionCatalogIndices.push(catalogIndex);
    candidateCatalogIndexByObservationIndex[observationIndex] = catalogIndex;
  });

  return {
    encodedState: [
      ...encodedAccess,
      ...encodedGains,
      ...encodedEast,
      ...encodedNorth,
      ...encodedUsers,
    ],
    validActionCatalogIndices,
    candidateCatalogIndexByObservationIndex,
  };
}

export function buildRewardInputFromSnapshot(args: {
  previousObservation: ModqnBaselineObservation;
  action: ModqnActionVector;
  snapshot: SimulationSnapshot;
  profile: ProfileConfig;
  primaryUserId: string;
  intraSatellitePenalty: number;
  interSatellitePenalty: number;
}): ModqnRewardInput {
  const { previousObservation, action, snapshot, profile, primaryUserId } = args;
  const primaryUe = snapshot.ues.find((ue) => ue.id === primaryUserId);
  const beamThroughputByKey = new Map<string, number>();

  for (const ue of snapshot.ues) {
    if (!ue.servingSatId || !ue.servingBeamId) {
      continue;
    }
    const key = `${ue.servingSatId}::${ue.servingBeamId}`;
    beamThroughputByKey.set(
      key,
      (beamThroughputByKey.get(key) ?? 0) + shannonThroughputMbps(ue.sinrDb, profile.rf.bandwidth_mhz),
    );
  }

  return {
    previousSatId: previousObservation.currentSatId,
    previousBeamId: previousObservation.currentBeamId,
    selectedSatId: action.satId,
    selectedBeamId: action.beamId,
    userThroughputMbps: shannonThroughputMbps(primaryUe?.sinrDb ?? null, profile.rf.bandwidth_mhz),
    beamThroughputsMbps: previousObservation.beams.map((beam) => (
      beamThroughputByKey.get(`${beam.satId}::${beam.beamId}`) ?? 0
    )),
    totalUsers: snapshot.ues.length,
    intraSatellitePenalty: args.intraSatellitePenalty,
    interSatellitePenalty: args.interSatellitePenalty,
  };
}
