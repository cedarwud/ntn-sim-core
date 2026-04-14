import {
  createObserverContext,
  computeTopocentricPoint,
} from '@/core/orbit/topocentric';
import { assertBundleReplayPresentationReady } from '@/adapters/modqn-bundle';
import type {
  BeamRole,
  HoLogEntry,
  SatelliteBeamSnapshot,
  SatelliteState,
  SimulationSnapshot,
  UeState,
} from '@/core/contracts/runtime-v1';
import type { GeodeticPoint, ModqnReplayBundle, ModqnReplayFrame, ModqnReplayUserRecord } from '@/adapters/modqn-bundle';

const WGS84_A_KM = 6378.137;
const WGS84_F = 1 / 298.257223563;
const WGS84_B_KM = WGS84_A_KM * (1 - WGS84_F);
const E2 = 1 - (WGS84_B_KM * WGS84_B_KM) / (WGS84_A_KM * WGS84_A_KM);

const CLASSIFICATION_PRIORITY = new Map<string, number>([
  ['reproduction-assumption', 0],
  ['platform-visualization-only', 1],
  ['artifact-derived', 2],
  ['recovered-from-paper', 3],
  ['paper-backed', 4],
]);

export interface ModqnBundleSummaryView {
  paperId: string;
  runId: string;
  schemaVersion: string;
  producerVersion: string;
  replayTruthMode: string;
  sourceLabel: string;
  slotCount: number;
  userCount: number;
  rowCount: number;
  handoverEventCount: number | null;
  checkpointKind: string | null;
  policyEpisode: number | null;
  timelineSeed: number | null;
  rewardWeights: number[];
  sampleNote: string | null;
}

export interface ModqnTrainingEvalSummaryView {
  episodesRequested: number | null;
  episodesCompleted: number | null;
  elapsedSec: number | null;
  finalEpisodeIndex: number | null;
  finalScalarReward: number | null;
  bestEvalEpisode: number | null;
  bestEvalMeanScalarReward: number | null;
  bestEvalStdScalarReward: number | null;
  bestEvalEvalSeedCount: number | null;
  bestEvalMeanHandovers: number | null;
}

export interface ModqnAssumptionView {
  key: string;
  assumptionId: string | null;
  valueSummary: string;
}

export interface ModqnProvenanceLegendEntry {
  classification: string;
  description: string;
}

export interface ModqnProvenanceFieldView {
  fieldPath: string;
  primaryClassification: string;
  source: string | null;
  note: string | null;
}

function geodeticToEcefKm(point: GeodeticPoint, altitudeKm: number): [number, number, number] {
  const latRad = (point.latDeg * Math.PI) / 180;
  const lonRad = (point.lonDeg * Math.PI) / 180;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);
  const n = WGS84_A_KM / Math.sqrt(1 - E2 * sinLat * sinLat);

  return [
    (n + altitudeKm) * cosLat * cosLon,
    (n + altitudeKm) * cosLat * sinLon,
    (n * (1 - E2) + altitudeKm) * sinLat,
  ];
}

function summarizeUnknown(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (!encoded) return String(value);
  return encoded.length > 120 ? `${encoded.slice(0, 117)}...` : encoded;
}

function getGroundPoint(bundle: ModqnReplayBundle): GeodeticPoint {
  return bundle.manifest.coordinateFrame.groundPoint as GeodeticPoint;
}

function getPrimaryUser(frame: ModqnReplayFrame): ModqnReplayUserRecord {
  return [...frame.users].sort((left, right) => {
    const leftIndex = left.userIndex ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = right.userIndex ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex || left.userId.localeCompare(right.userId);
  })[0];
}

function getUserBeamRole(
  frame: ModqnReplayFrame,
  beamId: string,
): BeamRole {
  let role: BeamRole = 'inactive';

  for (const user of frame.users) {
    const isSelected = user.selectedServing.beamId === beamId;
    const beamChanged = user.previousServing.beamId !== user.selectedServing.beamId;
    const satChanged = user.previousServing.satId !== user.selectedServing.satId;
    const changedServing = beamChanged || satChanged;
    const isPrevious = user.previousServing.beamId === beamId;

    if (isSelected) return 'serving';
    if (isPrevious && changedServing && user.handoverEvent.kind !== 'none') {
      role = 'post-ho';
    }
  }

  if (role === 'post-ho') return role;

  const beamIndex = frame.beamStates.find((beam) => beam.beamId === beamId)?.beamIndex ?? -1;
  const activeForAnyUser = beamIndex >= 0
    && frame.users.some((user) => Boolean(user.visibilityMask[beamIndex] || user.actionValidityMask[beamIndex]));
  return activeForAnyUser ? 'neutral' : 'inactive';
}

function buildBeamSnapshots(
  bundle: ModqnReplayBundle,
  frame: ModqnReplayFrame,
): ReadonlyMap<string, SatelliteBeamSnapshot[]> {
  const groundPoint = getGroundPoint(bundle);
  const observer = createObserverContext(groundPoint.latDeg, groundPoint.lonDeg, 0);
  const satelliteOffsets = new Map<string, { eastKm: number; northKm: number }>();

  for (const sat of frame.satelliteStates) {
    const topo = computeTopocentricPoint(
      observer,
      geodeticToEcefKm(sat.subSatellitePoint, 0),
    );
    satelliteOffsets.set(sat.satId, {
      eastKm: topo.eastKm,
      northKm: topo.northKm,
    });
  }

  const grouped = new Map<string, SatelliteBeamSnapshot[]>();
  for (const beam of frame.beamStates) {
    const satOffset = satelliteOffsets.get(beam.satId);
    if (!satOffset) continue;
    const role = getUserBeamRole(frame, beam.beamId);
    const beamIndex = beam.beamIndex;
    const isActive = frame.users.some((user) => (
      Boolean(user.visibilityMask[beamIndex] || user.actionValidityMask[beamIndex])
        || user.selectedServing.beamId === beam.beamId
        || user.previousServing.beamId === beam.beamId
    ));

    const projected: SatelliteBeamSnapshot = {
      beamId: beam.beamId,
      offsetEastKm: beam.centerLocalTangentKm.east - satOffset.eastKm,
      offsetNorthKm: beam.centerLocalTangentKm.north - satOffset.northKm,
      isActive,
      reuseGroup: 0,
      role,
    };

    const next = grouped.get(beam.satId) ?? [];
    next.push(projected);
    grouped.set(beam.satId, next);
  }

  for (const beams of grouped.values()) {
    beams.sort((left, right) => left.beamId.localeCompare(right.beamId));
  }

  return grouped;
}

function buildSatelliteStates(
  bundle: ModqnReplayBundle,
  frame: ModqnReplayFrame,
): SatelliteState[] {
  const groundPoint = getGroundPoint(bundle);
  const observer = createObserverContext(groundPoint.latDeg, groundPoint.lonDeg, 0);
  const beamsBySatellite = buildBeamSnapshots(bundle, frame);
  const visibleSatelliteIds = new Set<string>();

  for (const user of frame.users) {
    frame.beamStates.forEach((beam, beamIndex) => {
      if (user.visibilityMask[beamIndex]) {
        visibleSatelliteIds.add(beam.satId);
      }
    });
  }

  return frame.satelliteStates.map((sat) => {
    const radiusKm = Math.hypot(
      sat.positionEciKm.x,
      sat.positionEciKm.y,
      sat.positionEciKm.z,
    );
    const altitudeKm = radiusKm - WGS84_A_KM;
    const topo = computeTopocentricPoint(
      observer,
      geodeticToEcefKm(sat.subSatellitePoint, altitudeKm),
    );
    const beams = beamsBySatellite.get(sat.satId) ?? [];

    return {
      id: sat.satId,
      latDeg: sat.subSatellitePoint.latDeg,
      lonDeg: sat.subSatellitePoint.lonDeg,
      altKm: altitudeKm,
      azimuthDeg: topo.azimuthDeg,
      elevationDeg: topo.elevationDeg,
      rangeKm: topo.rangeKm,
      // Presentation geometry is projected from exported positions, but
      // visibility remains bundle-owned truth from the exported masks.
      isVisible: visibleSatelliteIds.has(sat.satId),
      beams,
    };
  });
}

function buildRecentHoEvents(frame: ModqnReplayFrame): HoLogEntry[] | undefined {
  const events = frame.users
    .filter((user) => user.handoverEvent.kind !== 'none')
    .map<HoLogEntry>((user) => ({
      timeSec: frame.timeSec,
      type: user.handoverEvent.kind,
      sourceSatId: user.previousServing.satId,
      targetSatId: user.selectedServing.satId,
      sinrDb: null,
      interruptionMs: null,
      ueId: user.userId,
    }));
  return events.length > 0 ? events : undefined;
}

function buildPrimaryUe(frame: ModqnReplayFrame): UeState {
  const primaryUser = getPrimaryUser(frame);
  const handoverOccurred = primaryUser.handoverEvent.kind !== 'none';
  const continuityState = handoverOccurred ? 'post-ho' : undefined;

  return {
    id: primaryUser.userId,
    latDeg: primaryUser.userPosition.latDeg,
    lonDeg: primaryUser.userPosition.lonDeg,
    servingSatId: primaryUser.selectedServing.satId,
    servingBeamId: primaryUser.selectedServing.beamId,
    // Runtime v1 has no dedicated beam-switch state, so bundle replay maps any
    // exported handover event to a post-HO disclosure using explicit previous
    // serving truth from the producer.
    targetSatId: handoverOccurred ? primaryUser.previousServing.satId : undefined,
    targetBeamId: handoverOccurred ? primaryUser.previousServing.beamId : undefined,
    continuityState,
    sinrDb: null,
  };
}

function sortLegendEntries(legend: Record<string, unknown>): ModqnProvenanceLegendEntry[] {
  return Object.entries(legend)
    .map(([classification, description]) => ({
      classification,
      description: typeof description === 'string' ? description : summarizeUnknown(description),
    }))
    .sort((left, right) => {
      const leftRank = CLASSIFICATION_PRIORITY.get(left.classification) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = CLASSIFICATION_PRIORITY.get(right.classification) ?? Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || left.classification.localeCompare(right.classification);
    });
}

function sortProvenanceFields(
  fields: Record<string, unknown>,
): ModqnProvenanceFieldView[] {
  return Object.entries(fields)
    .map(([fieldPath, raw]) => {
      const record = raw !== null && typeof raw === 'object'
        ? raw as Record<string, unknown>
        : {};
      return {
        fieldPath,
        primaryClassification: typeof record.primaryClassification === 'string'
          ? record.primaryClassification
          : 'unknown',
        source: typeof record.source === 'string' ? record.source : null,
        note: typeof record.note === 'string' ? record.note : null,
      };
    })
    .sort((left, right) => {
      const leftRank = CLASSIFICATION_PRIORITY.get(left.primaryClassification) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = CLASSIFICATION_PRIORITY.get(right.primaryClassification) ?? Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || left.fieldPath.localeCompare(right.fieldPath);
    });
}

export function advanceBundleReplayFrameIndex(
  currentIndex: number,
  deltaFrames: number,
  frameCount: number,
): number {
  if (frameCount <= 0) return 0;
  const normalized = (currentIndex + deltaFrames) % frameCount;
  return normalized < 0 ? normalized + frameCount : normalized;
}

export class ModqnBundleReplayViewModel {
  public readonly sourceLabel: string;

  public constructor(
    bundle: ModqnReplayBundle,
    sourceLabel = 'sample-bundle-v1',
  ) {
    this.bundle = assertBundleReplayPresentationReady(bundle);
    this.sourceLabel = sourceLabel;
  }

  public readonly bundle: ModqnReplayBundle;

  public getFrameCount(): number {
    return this.bundle.frames.length;
  }

  public getFrame(index: number): ModqnReplayFrame {
    const frameCount = this.getFrameCount();
    if (frameCount === 0) {
      throw new Error('[ModqnBundleReplayViewModel] bundle has no frames');
    }
    const clamped = Math.max(0, Math.min(index, frameCount - 1));
    return this.bundle.frames[clamped];
  }

  public getStepDurationMs(): number {
    if (this.bundle.frames.length < 2) return 1000;
    const deltaSec = this.bundle.frames[1].timeSec - this.bundle.frames[0].timeSec;
    return Math.max(1, deltaSec * 1000);
  }

  public projectFrame(index: number): SimulationSnapshot {
    const frame = this.getFrame(index);
    const satellites = buildSatelliteStates(this.bundle, frame);
    const primaryUe = buildPrimaryUe(frame);

    return {
      tick: frame.slotIndex,
      timeSec: frame.timeSec,
      satellites,
      ues: [primaryUe],
      recentHoEvents: buildRecentHoEvents(frame),
    };
  }

  public getBundleSummary(): ModqnBundleSummaryView {
    const replaySummary = this.bundle.manifest.replaySummary;
    return {
      paperId: this.bundle.manifest.paperId,
      runId: this.bundle.manifest.runId,
      schemaVersion: this.bundle.manifest.bundleSchemaVersion,
      producerVersion: this.bundle.manifest.producerVersion,
      replayTruthMode: this.bundle.manifest.replayTruthMode,
      sourceLabel: this.sourceLabel,
      slotCount: this.bundle.slotCount,
      userCount: this.bundle.userCount,
      rowCount: this.bundle.rowCount,
      handoverEventCount: replaySummary?.handoverEventCount ?? null,
      checkpointKind: replaySummary?.checkpointKind ?? null,
      policyEpisode: replaySummary?.policyEpisode ?? null,
      timelineSeed: replaySummary?.timelineSeed ?? null,
      rewardWeights: replaySummary?.rewardWeights ?? [],
      sampleNote: this.bundle.manifest.sampleNote ?? null,
    };
  }

  public getTrainingEvalSummary(): ModqnTrainingEvalSummaryView {
    const summary = this.bundle.evaluationSummary ?? {};
    const trainingSummary = (
      summary.training_summary !== null && typeof summary.training_summary === 'object'
    ) ? summary.training_summary as Record<string, unknown> : {};
    const bestEvalSummary = (
      summary.best_eval_summary !== null && typeof summary.best_eval_summary === 'object'
    ) ? summary.best_eval_summary as Record<string, unknown> : {};
    const evalSeedCount = Array.isArray(bestEvalSummary.eval_seeds)
      ? bestEvalSummary.eval_seeds.length
      : null;

    return {
      episodesRequested: typeof trainingSummary.episodes_requested === 'number'
        ? trainingSummary.episodes_requested
        : null,
      episodesCompleted: typeof trainingSummary.episodes_completed === 'number'
        ? trainingSummary.episodes_completed
        : null,
      elapsedSec: typeof trainingSummary.elapsed_s === 'number'
        ? trainingSummary.elapsed_s
        : null,
      finalEpisodeIndex: typeof trainingSummary.final_episode_index === 'number'
        ? trainingSummary.final_episode_index
        : null,
      finalScalarReward: typeof trainingSummary.final_scalar_reward === 'number'
        ? trainingSummary.final_scalar_reward
        : null,
      bestEvalEpisode: typeof bestEvalSummary.episode === 'number'
        ? bestEvalSummary.episode
        : null,
      bestEvalMeanScalarReward: typeof bestEvalSummary.mean_scalar_reward === 'number'
        ? bestEvalSummary.mean_scalar_reward
        : null,
      bestEvalStdScalarReward: typeof bestEvalSummary.std_scalar_reward === 'number'
        ? bestEvalSummary.std_scalar_reward
        : null,
      bestEvalEvalSeedCount: evalSeedCount,
      bestEvalMeanHandovers: typeof bestEvalSummary.mean_total_handovers === 'number'
        ? bestEvalSummary.mean_total_handovers
        : null,
    };
  }

  public getAssumptions(): ModqnAssumptionView[] {
    const assumptions = this.bundle.assumptions ?? {};
    return Object.entries(assumptions)
      .map(([key, raw]) => {
        const record = raw !== null && typeof raw === 'object'
          ? raw as Record<string, unknown>
          : {};
        return {
          key,
          assumptionId: typeof record.assumption_id === 'string'
            ? record.assumption_id
            : null,
          valueSummary: summarizeUnknown(record.value),
        };
      })
      .sort((left, right) => left.key.localeCompare(right.key));
  }

  public getProvenanceLegend(): ModqnProvenanceLegendEntry[] {
    const provenanceMap = this.bundle.provenanceMap ?? {};
    const legendRaw = (
      provenanceMap.classificationLegend !== null
        && typeof provenanceMap.classificationLegend === 'object'
    ) ? provenanceMap.classificationLegend as Record<string, unknown> : {};
    return sortLegendEntries(legendRaw);
  }

  public getProvenanceFields(): ModqnProvenanceFieldView[] {
    const provenanceMap = this.bundle.provenanceMap ?? {};
    const fieldsRaw = (
      provenanceMap.fields !== null && typeof provenanceMap.fields === 'object'
    ) ? provenanceMap.fields as Record<string, unknown> : {};
    return sortProvenanceFields(fieldsRaw);
  }

  public getCumulativeHandoverCount(index: number): number {
    const clamped = Math.max(0, Math.min(index, this.bundle.frames.length - 1));
    let total = 0;
    for (let frameIndex = 0; frameIndex <= clamped; frameIndex += 1) {
      total += this.bundle.frames[frameIndex].users.filter(
        (user) => user.handoverEvent.kind !== 'none',
      ).length;
    }
    return total;
  }
}
