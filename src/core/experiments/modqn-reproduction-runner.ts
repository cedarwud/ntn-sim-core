import { createSimEngine } from '@/core/engine';
import { MODQN_DEFAULT_HANDOVER_PENALTIES } from '@/core/algorithms/modqn-baseline-types';
import type { ProfileConfig } from '@/core/profiles/types';
import { loadProfile, resolveProfile } from '@/core/profiles/loader';
import { buildProfileTrajectoryCache, resolveProfileOrbitElements } from '@/core/orbit/profile-runtime';
import { getProfileProvenanceView } from '@/core/config/profile-provenance-view';
import type { KpiBundle } from '@/core/contracts/kpi-v1';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import {
  createReplayArtifact,
  createResolvedConfig,
  createRunArtifactBundle,
  createRunManifest,
  createSourceTrace,
} from '@/core/trace/factory';
import type { EventLog, RunArtifactBundle } from '@/core/trace/types';
import { recomputeKpiFromSnapshots } from '@/core/kpi/recompute';
import { MODQN_REPRODUCTION_MANIFEST } from './modqn-reproduction-manifest';
import type {
  ModqnEpisodeSummary,
  ModqnHeldOutWindowResult,
  ModqnReproductionResult,
  ModqnSamplingPlan,
  ModqnSamplingWindow,
  ModqnTrainingManifest,
} from './modqn-reproduction-types';
import { buildModqnSamplingPlan } from './modqn-sampling';
import {
  addRewardVectors,
  averageKpiBundles,
  averageRewardVectors,
  buildBaselineObservationFromRuntime,
  buildBeamCatalog,
  buildRewardInputFromSnapshot,
  encodePaperState,
  scalarizeReward,
} from './modqn-runtime-bridge';
import { ModqnTrainer, summarizeEpisodeReward } from './modqn-trainer';

export interface RunModqnBaselineReproductionOptions {
  readonly manifest?: ModqnTrainingManifest;
  readonly trainingEpisodeLimit?: number;
  readonly heldOutEpisodeLimit?: number;
}

interface EpisodeExecution {
  readonly summary: ModqnEpisodeSummary;
  readonly averageLoss: {
    readonly throughput: number;
    readonly handover: number;
    readonly loadBalance: number;
  };
  readonly kpiBundle?: KpiBundle;
  readonly artifactBundle?: RunArtifactBundle;
}

function now(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function profileStep(profile: ProfileConfig): number {
  return profile.timeControl.stepSec;
}

function buildEpisodeProfile(
  baseProfile: ProfileConfig,
  window: ModqnSamplingWindow,
  seed: number,
  durationSec: number,
): ProfileConfig {
  return resolveProfile(baseProfile, {
    seed,
    timeControl: {
      ...baseProfile.timeControl,
      epochUtcMs: window.searchEpochUtcMs,
      durationSec,
      stepSec: baseProfile.timeControl.stepSec,
    },
  });
}

function buildArtifactProfile(
  baseProfile: ProfileConfig,
  window: ModqnSamplingWindow,
  seed: number,
  durationSec: number,
): ProfileConfig {
  return resolveProfile(baseProfile, {
    seed,
    timeControl: {
      ...baseProfile.timeControl,
      epochUtcMs: window.episodeEpochUtcMs,
      durationSec,
      stepSec: baseProfile.timeControl.stepSec,
    },
  });
}

function rebaseSnapshot(snapshot: SimulationSnapshot, offsetSec: number): SimulationSnapshot {
  return {
    ...snapshot,
    timeSec: snapshot.timeSec - offsetSec,
    recentHoEvents: snapshot.recentHoEvents?.map((event) => ({
      ...event,
      timeSec: event.timeSec - offsetSec,
    })),
  };
}

function buildEventLogFromSnapshots(snapshots: readonly SimulationSnapshot[]): EventLog {
  return {
    events: snapshots.flatMap((snapshot) => (
      (snapshot.recentHoEvents ?? []).map((event) => ({
        tick: snapshot.tick,
        timeSec: event.timeSec,
        type: event.type,
        payload: {
          sourceSatId: event.sourceSatId,
          targetSatId: event.targetSatId,
          ueId: event.ueId,
          interruptionMs: event.interruptionMs,
          sinrDb: event.sinrDb,
        },
      }))
    )),
  };
}

function buildHeldOutArtifact(args: {
  profile: ProfileConfig;
  seed: number;
  window: ModqnSamplingWindow;
  kpiBundle: KpiBundle;
  snapshots: SimulationSnapshot[];
  eventLog: EventLog;
}): RunArtifactBundle {
  const provenance = getProfileProvenanceView(args.profile.id);
  const manifest = createRunManifest({
    profileId: args.profile.id,
    profileFamily: args.profile.family,
    presentationMode: 'benchmark',
    orbitMode: args.profile.orbitMode,
    seed: args.seed,
    durationSec: args.profile.timeControl.durationSec,
    stepSec: args.profile.timeControl.stepSec,
    engineVersion: '0.1.0',
    specModeIndex: provenance.specModeIndex,
  });

  const resolvedConfig = createResolvedConfig(
    manifest,
    args.profile as unknown as Record<string, unknown>,
    {
      seed: args.seed,
      modqnWindowId: args.window.windowId,
      modqnRole: args.window.role,
    },
  );
  const sourceTrace = createSourceTrace(provenance.sourceTraceEntries);
  const replayManifest = {
    runId: manifest.runId,
    windowStartSec: 0,
    windowEndSec: args.snapshots[args.snapshots.length - 1]?.timeSec ?? 0,
    selectionCriteria: `modqn-held-out:${args.window.windowId}`,
    selectionMethod: 'deterministic-search' as const,
    presentationMode: 'benchmark' as const,
  };
  const replayArtifact = createReplayArtifact(replayManifest, args.snapshots);

  return createRunArtifactBundle(
    manifest,
    resolvedConfig,
    sourceTrace,
    replayManifest,
    replayArtifact,
    args.eventLog,
    {
      totalTicks: args.kpiBundle.totalTicks,
      wallClockMs: args.kpiBundle.wallClockMs,
      metrics: args.kpiBundle as unknown as Record<string, number>,
    },
    provenance.assumptionSet,
  );
}

function executeEpisode(args: {
  manifest: ModqnTrainingManifest;
  trainer: ModqnTrainer;
  baseProfile: ProfileConfig;
  window: ModqnSamplingWindow;
  seed: number;
  catalog: ReturnType<typeof buildBeamCatalog>;
  training: boolean;
}): EpisodeExecution {
  const { manifest, trainer, baseProfile, window, seed, catalog, training } = args;
  const runtimeDurationSec = window.windowEndSec + profileStep(baseProfile);
  const profile = buildEpisodeProfile(
    baseProfile,
    window,
    seed,
    runtimeDurationSec,
  );
  const elements = resolveProfileOrbitElements(profile);
  const trajectoryCache = buildProfileTrajectoryCache(profile, elements);
  const engine = createSimEngine({ profile, trajectoryCache });
  const totalTicks = Math.floor(profile.timeControl.durationSec / profile.timeControl.stepSec);
  const windowSnapshots: SimulationSnapshot[] = [];
  const visitedBeamIds = new Set<string>();
  let episodeReward = {
    throughput: 0,
    handoverPenalty: 0,
    loadBalance: 0,
  };
  let decisions = 0;
  let exploredDecisions = 0;
  const lossSums = {
    throughput: 0,
    handover: 0,
    loadBalance: 0,
  };
  let lossCount = 0;
  let pending:
    | {
        observation: NonNullable<ReturnType<typeof buildBaselineObservationFromRuntime>>;
        action: ReturnType<ModqnTrainer['selectAction']>['action'];
        encodedState: readonly number[];
        state: ReturnType<ModqnTrainer['buildPaperState']>;
        validActionCatalogIndices: readonly number[];
        actionCatalogIndex: number;
      }
    | null = null;

  const episodeStartUpdates = trainer.getTotalUpdates();
  const episodeStartMs = now();

  for (let tick = 0; tick < totalTicks; tick += 1) {
    const snapshot = engine.tick(tick * profile.timeControl.stepSec, tick);
    const policyObservation = engine.getObservation();
    if (!policyObservation) {
      throw new Error(`[executeEpisode] missing policy observation at tick ${tick}`);
    }

    if (tick < window.windowStartSec) {
      continue;
    }

    const baselineObservation = buildBaselineObservationFromRuntime({
      snapshot,
      policyObservation,
      profile,
      primaryUserId: manifest.params.primaryUserId,
    });
    if (!baselineObservation) {
      throw new Error(`[executeEpisode] missing baseline observation at tick ${tick}`);
    }

    windowSnapshots.push(rebaseSnapshot(snapshot, window.windowStartSec));

    const state = trainer.buildPaperState(baselineObservation);
    const encoded = encodePaperState({
      state,
      observation: baselineObservation,
      catalog,
    });

    if (pending) {
      const rewardVector = trainer.buildRewardVector(buildRewardInputFromSnapshot({
        previousObservation: pending.observation,
        action: pending.action,
        snapshot,
        profile,
        primaryUserId: manifest.params.primaryUserId,
        intraSatellitePenalty: MODQN_DEFAULT_HANDOVER_PENALTIES.intraSatellite,
        interSatellitePenalty: MODQN_DEFAULT_HANDOVER_PENALTIES.interSatellite,
      }));
      episodeReward = addRewardVectors(episodeReward, rewardVector);

      if (training) {
        const update = trainer.trainStep({
          observation: pending.observation,
          state: pending.state,
          encodedState: pending.encodedState,
          action: pending.action,
          actionCatalogIndex: pending.actionCatalogIndex,
          validActionCatalogIndices: pending.validActionCatalogIndices,
          rewardVector,
          nextObservation: baselineObservation,
          nextState: state,
          nextEncodedState: encoded.encodedState,
          nextValidActionCatalogIndices: encoded.validActionCatalogIndices,
          isDone: tick === totalTicks - 1,
        });

        if (update.didUpdate) {
          lossSums.throughput += update.throughput;
          lossSums.handover += update.handover;
          lossSums.loadBalance += update.loadBalance;
          lossCount += 1;
        }
      }
    }

    if (tick >= window.windowEndSec) {
      continue;
    }

    const selection = trainer.selectAction({
      observation: baselineObservation,
      encodedState: encoded.encodedState,
      candidateCatalogIndexByObservationIndex: encoded.candidateCatalogIndexByObservationIndex,
      training,
    });
    if (selection.action.selectedIndex < 0) {
      continue;
    }

    const actionCatalogIndex =
      encoded.candidateCatalogIndexByObservationIndex[selection.action.selectedIndex];
    if (actionCatalogIndex === undefined) {
      throw new Error('[executeEpisode] action catalog index missing for selected observation beam');
    }

    engine.applyAction(trainer.buildPolicyAction(selection.action, baselineObservation));
    visitedBeamIds.add(selection.action.beamId);
    decisions += 1;
    if (selection.explored) {
      exploredDecisions += 1;
    }

    pending = {
      observation: baselineObservation,
      action: selection.action,
      encodedState: encoded.encodedState,
      state,
      validActionCatalogIndices: encoded.validActionCatalogIndices,
      actionCatalogIndex,
    };
  }

  const wallClockMs = now() - episodeStartMs;
  const finalSnapshot = windowSnapshots[windowSnapshots.length - 1];
  const finalPrimaryUe = finalSnapshot?.ues.find((ue) => ue.id === manifest.params.primaryUserId);
  const summary = summarizeEpisodeReward({
    episodeIndex: 0,
    role: window.role,
    windowId: window.windowId,
    epochUtcMs: window.episodeEpochUtcMs,
    seed,
    totalReward: episodeReward,
    decisions,
    exploredDecisions,
    totalUpdates: trainer.getTotalUpdates() - episodeStartUpdates,
    finalServingSatId: finalPrimaryUe?.servingSatId ?? null,
    finalServingBeamId: finalPrimaryUe?.servingBeamId ?? null,
    visitedBeamIds: [...visitedBeamIds],
    weights: manifest.weights,
  });

  const averageLoss = {
    throughput: lossCount > 0 ? lossSums.throughput / lossCount : 0,
    handover: lossCount > 0 ? lossSums.handover / lossCount : 0,
    loadBalance: lossCount > 0 ? lossSums.loadBalance / lossCount : 0,
  };

  if (training) {
    return {
      summary,
      averageLoss,
    };
  }

  const artifactProfile = buildArtifactProfile(
    baseProfile,
    window,
    seed,
    manifest.protocol.episodeDurationSec,
  );
  const kpiBundle = recomputeKpiFromSnapshots({
    snapshots: windowSnapshots,
    bandwidthMhz: artifactProfile.rf.bandwidth_mhz,
    pingPongWindowSec: artifactProfile.handover.pingPongWindowSec,
    wallClockMs,
  });
  const artifactBundle = buildHeldOutArtifact({
    profile: artifactProfile,
    seed,
    window,
    kpiBundle,
    snapshots: windowSnapshots,
    eventLog: buildEventLogFromSnapshots(windowSnapshots),
  });

  return {
    summary,
    averageLoss,
    kpiBundle,
    artifactBundle,
  };
}

export function runModqnBaselineReproduction(
  options: RunModqnBaselineReproductionOptions = {},
): ModqnReproductionResult {
  const manifest = options.manifest ?? MODQN_REPRODUCTION_MANIFEST;
  const baseProfile = loadProfile(manifest.profileId);
  const samplingPlan: ModqnSamplingPlan = buildModqnSamplingPlan(manifest, baseProfile);
  const catalog = buildBeamCatalog(samplingPlan.catalogSatIds, baseProfile.beam.num_beams);
  const trainer = new ModqnTrainer({
    protocol: manifest.protocol,
    actionCatalogSize: catalog.length,
    seed: manifest.seed,
  });

  const trainingEpisodesToRun = options.trainingEpisodeLimit ?? manifest.protocol.episodes;
  const trainingEpisodes: ModqnEpisodeSummary[] = [];
  const heldOutResults: ModqnHeldOutWindowResult[] = [];
  const wallClockStartMs = now();

  for (let episodeIndex = 0; episodeIndex < trainingEpisodesToRun; episodeIndex += 1) {
    const window = samplingPlan.trainWindows[episodeIndex % samplingPlan.trainWindows.length];
    const execution = executeEpisode({
      manifest,
      trainer,
      baseProfile,
      window: { ...window, role: 'train' },
      seed: manifest.seed + episodeIndex,
      catalog,
      training: true,
    });

    const summary = {
      ...execution.summary,
      episodeIndex,
    };
    trainingEpisodes.push(summary);
    trainer.recordEpisodeMetrics({
      summary,
      loss: execution.averageLoss,
    });
  }

  const heldOutWindowLimit = options.heldOutEpisodeLimit ?? samplingPlan.heldOutWindows.length;
  for (let index = 0; index < heldOutWindowLimit; index += 1) {
    const window = samplingPlan.heldOutWindows[index % samplingPlan.heldOutWindows.length];
    const execution = executeEpisode({
      manifest,
      trainer,
      baseProfile,
      window: { ...window, role: 'held-out' },
      seed: manifest.seed + 10000 + index,
      catalog,
      training: false,
    });

    if (!execution.kpiBundle || !execution.artifactBundle) {
      throw new Error('[runModqnBaselineReproduction] held-out execution did not produce artifact data');
    }

    heldOutResults.push({
      windowId: window.windowId,
      episode: {
        ...execution.summary,
        episodeIndex: index,
      },
      kpiBundle: execution.kpiBundle,
      artifactBundle: execution.artifactBundle,
    });
  }

  const aggregateReward = averageRewardVectors(
    heldOutResults.map((result) => result.episode.totalReward),
  );
  const aggregateKpiBundle = averageKpiBundles(
    heldOutResults.map((result) => result.kpiBundle),
  );
  const wallClockMs = now() - wallClockStartMs;
  const constraints = uniqueStrings([
    ...manifest.params.runtimeDisclosure,
    ...samplingPlan.limitationNotes,
  ]);
  const completedAt = new Date().toISOString();
  const trainingSummary = {
    totalEpisodes: trainingEpisodes.length,
    totalSteps: trainingEpisodes.reduce((sum, episode) => sum + episode.decisions, 0),
    wallClockMs,
    curves: {
      episodes: [...trainer.metrics.episodes],
      throughputLoss: [...trainer.metrics.loss.throughput],
      handoverLoss: [...trainer.metrics.loss.handover],
      loadBalanceLoss: [...trainer.metrics.loss.loadBalance],
      scalarReward: [...trainer.metrics.reward.scalar],
    },
  };

  return {
    experimentId: manifest.id,
    completedAt,
    kpiBundle: aggregateKpiBundle,
    wallClockMs,
    manifest,
    samplingPlan,
    metrics: trainer.metrics,
    trainingEpisodes,
    heldOutEvaluation: {
      aggregateReward,
      scalarReward: scalarizeReward(aggregateReward, manifest.weights),
      aggregateKpiBundle,
      averageKpi: aggregateKpiBundle,
      windows: heldOutResults,
      limitationNotes: constraints,
    },
    artifactBundles: heldOutResults.map((result) => result.artifactBundle),
    trainingSummary,
    metadata: {
      paperId: 'PAP-2024-MORL-MULTIBEAM',
      constraints,
      reproductionTimestamp: completedAt,
    },
  };
}
