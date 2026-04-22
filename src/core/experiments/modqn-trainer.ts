import {
  MODQN_BASELINE_OBJECTIVE_WEIGHTS,
  type ModqnActionVector,
  type ModqnBaselineObservation,
  type ModqnObjectiveQValue,
  type ModqnPaperState,
  type ModqnRewardInput,
  type ModqnRewardVector,
  type ModqnTrainingProtocol,
} from '@/core/contracts/modqn-contracts';
import { createRng } from '@/core/common/types';
import { ModqnBaselineAdapter } from '@/core/algorithms/modqn-baseline-adapter';
import { MODQN_DEFAULT_HANDOVER_PENALTIES } from '@/core/algorithms/modqn-baseline-types';
import { ObjectiveDqn } from './modqn-dqn';
import type {
  ModqnEpisodeSummary,
  ModqnExperience,
  ModqnTrainerCheckpoint,
  ModqnTrainingMetrics,
} from './modqn-reproduction-types';
import { scalarizeReward } from './modqn-runtime-bridge';

export interface ModqnTrainerConfig {
  readonly protocol: ModqnTrainingProtocol;
  readonly actionCatalogSize: number;
  readonly seed: number;
}

export interface ModqnActionSelection {
  readonly action: ModqnActionVector;
  readonly explored: boolean;
  readonly qValues: readonly ModqnObjectiveQValue[];
}

export interface ModqnUpdateSummary {
  readonly throughput: number;
  readonly handover: number;
  readonly loadBalance: number;
  readonly didUpdate: boolean;
}

export class ModqnTrainer {
  private readonly protocol: ModqnTrainingProtocol;
  private readonly weights: readonly [number, number, number];
  private readonly adapter: ModqnBaselineAdapter;
  private readonly replayBuffer: ModqnExperience[] = [];
  private readonly throughputDqn: ObjectiveDqn;
  private readonly handoverDqn: ObjectiveDqn;
  private readonly loadBalanceDqn: ObjectiveDqn;
  private readonly seed: number;
  private rng;
  private epsilon = 1.0;
  private readonly minEpsilon = 0.01;
  private readonly epsilonDecay = 0.995;
  private totalUpdates = 0;

  public readonly metrics: ModqnTrainingMetrics = {
    episodes: [],
    loss: { throughput: [], handover: [], loadBalance: [] },
    reward: { throughput: [], handover: [], loadBalance: [], scalar: [] },
    epsilon: [],
    replaySize: [],
  };

  constructor(config: ModqnTrainerConfig) {
    this.protocol = config.protocol;
    this.weights = config.protocol.weights ?? MODQN_BASELINE_OBJECTIVE_WEIGHTS;
    this.seed = config.seed;
    this.adapter = new ModqnBaselineAdapter({
      weights: this.weights,
      intraSatellitePenalty: MODQN_DEFAULT_HANDOVER_PENALTIES.intraSatellite,
      interSatellitePenalty: MODQN_DEFAULT_HANDOVER_PENALTIES.interSatellite,
    });
    this.rng = createRng(config.seed);

    const sharedDqnConfig = {
      inputSize: config.actionCatalogSize * 5,
      outputSize: config.actionCatalogSize,
      hiddenLayers: config.protocol.hiddenLayers,
      learningRate: config.protocol.learningRate,
      syncEveryUpdates: 25,
      random: () => this.rng.next(),
    };

    this.throughputDqn = new ObjectiveDqn(sharedDqnConfig);
    this.handoverDqn = new ObjectiveDqn(sharedDqnConfig);
    this.loadBalanceDqn = new ObjectiveDqn(sharedDqnConfig);
  }

  public buildPaperState(obs: ModqnBaselineObservation): ModqnPaperState {
    return this.adapter.buildPaperState(obs);
  }

  public buildRewardVector(input: ModqnRewardInput): ModqnRewardVector {
    return this.adapter.buildRewardVector(input);
  }

  public buildPolicyAction(
    action: ModqnActionVector,
    obs: ModqnBaselineObservation,
  ) {
    return this.adapter.buildPolicyAction(action, obs);
  }

  public getEpsilon(): number {
    return this.epsilon;
  }

  public getReplaySize(): number {
    return this.replayBuffer.length;
  }

  public getTotalUpdates(): number {
    return this.totalUpdates;
  }

  public createCheckpoint(): ModqnTrainerCheckpoint {
    return {
      formatVersion: 1,
      algorithmId: 'modqn-baseline',
      seed: this.seed,
      rngState: this.rng.state(),
      epsilon: this.epsilon,
      totalUpdates: this.totalUpdates,
      protocol: JSON.parse(JSON.stringify(this.protocol)),
      metrics: JSON.parse(JSON.stringify(this.metrics)),
      replayBuffer: JSON.parse(JSON.stringify(this.replayBuffer)),
      objectives: {
        throughput: this.throughputDqn.snapshot(),
        handover: this.handoverDqn.snapshot(),
        loadBalance: this.loadBalanceDqn.snapshot(),
      },
    };
  }

  public restoreCheckpoint(checkpoint: ModqnTrainerCheckpoint): void {
    if (checkpoint.algorithmId !== 'modqn-baseline') {
      throw new Error(
        `[ModqnTrainer.restoreCheckpoint] unsupported algorithm id ${checkpoint.algorithmId}`,
      );
    }
    if (checkpoint.formatVersion !== 1) {
      throw new Error(
        `[ModqnTrainer.restoreCheckpoint] unsupported checkpoint version ${checkpoint.formatVersion}`,
      );
    }
    if (JSON.stringify(checkpoint.protocol) !== JSON.stringify(this.protocol)) {
      throw new Error('[ModqnTrainer.restoreCheckpoint] protocol mismatch');
    }

    this.throughputDqn.restore(checkpoint.objectives.throughput);
    this.handoverDqn.restore(checkpoint.objectives.handover);
    this.loadBalanceDqn.restore(checkpoint.objectives.loadBalance);
    this.epsilon = checkpoint.epsilon;
    this.totalUpdates = checkpoint.totalUpdates;
    this.rng = createRng(checkpoint.rngState);

    this.replayBuffer.length = 0;
    this.replayBuffer.push(...JSON.parse(JSON.stringify(checkpoint.replayBuffer)));

    this.metrics.episodes.length = 0;
    this.metrics.episodes.push(...checkpoint.metrics.episodes);
    this.metrics.loss.throughput.length = 0;
    this.metrics.loss.throughput.push(...checkpoint.metrics.loss.throughput);
    this.metrics.loss.handover.length = 0;
    this.metrics.loss.handover.push(...checkpoint.metrics.loss.handover);
    this.metrics.loss.loadBalance.length = 0;
    this.metrics.loss.loadBalance.push(...checkpoint.metrics.loss.loadBalance);
    this.metrics.reward.throughput.length = 0;
    this.metrics.reward.throughput.push(...checkpoint.metrics.reward.throughput);
    this.metrics.reward.handover.length = 0;
    this.metrics.reward.handover.push(...checkpoint.metrics.reward.handover);
    this.metrics.reward.loadBalance.length = 0;
    this.metrics.reward.loadBalance.push(...checkpoint.metrics.reward.loadBalance);
    this.metrics.reward.scalar.length = 0;
    this.metrics.reward.scalar.push(...checkpoint.metrics.reward.scalar);
    this.metrics.epsilon.length = 0;
    this.metrics.epsilon.push(...checkpoint.metrics.epsilon);
    this.metrics.replaySize.length = 0;
    this.metrics.replaySize.push(...checkpoint.metrics.replaySize);
  }

  public selectAction(args: {
    observation: ModqnBaselineObservation;
    encodedState: readonly number[];
    candidateCatalogIndexByObservationIndex: readonly number[];
    training: boolean;
  }): ModqnActionSelection {
    const { observation, encodedState, candidateCatalogIndexByObservationIndex, training } = args;

    const qValues = this.computeObjectiveQValues({
      observation,
      encodedState,
      candidateCatalogIndexByObservationIndex,
    });

    if (observation.beams.length === 0) {
      return {
        action: {
          selectedIndex: -1,
          satId: observation.currentSatId ?? 'none',
          beamId: observation.currentBeamId ?? 'none',
          oneHot: [],
        },
        explored: false,
        qValues,
      };
    }

    if (training && this.rng.next() < this.epsilon) {
      const selectedIndex = Math.floor(this.rng.next() * observation.beams.length);
      const selectedBeam = observation.beams[selectedIndex];
      return {
        action: {
          selectedIndex,
          satId: selectedBeam.satId,
          beamId: selectedBeam.beamId,
          oneHot: observation.beams.map((_, index) => (index === selectedIndex ? 1 : 0)),
        },
        explored: true,
        qValues,
      };
    }

    return {
      action: this.adapter.selectPaperAction(observation, [...qValues]).action,
      explored: false,
      qValues,
    };
  }

  public trainStep(experience: ModqnExperience): ModqnUpdateSummary {
    this.replayBuffer.push(experience);
    if (this.replayBuffer.length > 5000) {
      this.replayBuffer.shift();
    }

    let summary: ModqnUpdateSummary = {
      throughput: 0,
      handover: 0,
      loadBalance: 0,
      didUpdate: false,
    };

    if (this.replayBuffer.length >= this.protocol.batchSize) {
      const batch = this.sampleBatch(this.protocol.batchSize);
      summary = {
        throughput: this.trainObjective(batch, 'throughput'),
        handover: this.trainObjective(batch, 'handoverPenalty'),
        loadBalance: this.trainObjective(batch, 'loadBalance'),
        didUpdate: true,
      };
      this.totalUpdates += 1;
    }

    if (this.epsilon > this.minEpsilon) {
      this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);
    }

    return summary;
  }

  public recordEpisodeMetrics(args: {
    summary: ModqnEpisodeSummary;
    loss: { throughput: number; handover: number; loadBalance: number };
  }): void {
    const { summary, loss } = args;

    this.metrics.episodes.push(summary.episodeIndex);
    this.metrics.loss.throughput.push(loss.throughput);
    this.metrics.loss.handover.push(loss.handover);
    this.metrics.loss.loadBalance.push(loss.loadBalance);
    this.metrics.reward.throughput.push(summary.totalReward.throughput);
    this.metrics.reward.handover.push(summary.totalReward.handoverPenalty);
    this.metrics.reward.loadBalance.push(summary.totalReward.loadBalance);
    this.metrics.reward.scalar.push(summary.scalarReward);
    this.metrics.epsilon.push(this.epsilon);
    this.metrics.replaySize.push(this.replayBuffer.length);
  }

  private computeObjectiveQValues(args: {
    observation: ModqnBaselineObservation;
    encodedState: readonly number[];
    candidateCatalogIndexByObservationIndex: readonly number[];
  }): ModqnObjectiveQValue[] {
    const throughputQ = this.throughputDqn.predict(args.encodedState);
    const handoverQ = this.handoverDqn.predict(args.encodedState);
    const loadBalanceQ = this.loadBalanceDqn.predict(args.encodedState);

    return args.observation.beams.map((beam, observationIndex) => {
      const catalogIndex = args.candidateCatalogIndexByObservationIndex[observationIndex];
      return {
        satId: beam.satId,
        beamId: beam.beamId,
        beamIndex: observationIndex,
        throughputQ: throughputQ[catalogIndex] ?? 0,
        handoverQ: handoverQ[catalogIndex] ?? 0,
        loadBalanceQ: loadBalanceQ[catalogIndex] ?? 0,
      };
    });
  }

  private sampleBatch(batchSize: number): ModqnExperience[] {
    const available = [...this.replayBuffer.keys()];
    for (let index = available.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.rng.next() * (index + 1));
      [available[index], available[swapIndex]] = [available[swapIndex], available[index]];
    }
    return available.slice(0, batchSize).map((index) => this.replayBuffer[index]);
  }

  private trainObjective(
    batch: readonly ModqnExperience[],
    objective: keyof ModqnRewardVector,
  ): number {
    const dqn = objective === 'throughput'
      ? this.throughputDqn
      : objective === 'handoverPenalty'
        ? this.handoverDqn
        : this.loadBalanceDqn;

    const samples = batch.map((experience) => {
      const nextValues = dqn.predictTarget(experience.nextEncodedState);
      const maxNextQ = experience.isDone
        ? 0
        : this.maxForIndices(nextValues, experience.nextValidActionCatalogIndices);
      const reward = objective === 'throughput'
        ? experience.rewardVector.throughput
        : objective === 'handoverPenalty'
          ? experience.rewardVector.handoverPenalty
          : experience.rewardVector.loadBalance;

      return {
        input: experience.encodedState,
        actionIndex: experience.actionCatalogIndex,
        targetValue: reward + this.protocol.discountFactor * maxNextQ,
      };
    });

    return dqn.trainBatch(samples);
  }

  private maxForIndices(values: readonly number[], indices: readonly number[]): number {
    if (indices.length === 0) {
      return 0;
    }

    let maxValue = -Infinity;
    for (const index of indices) {
      maxValue = Math.max(maxValue, values[index] ?? -Infinity);
    }
    return Number.isFinite(maxValue) ? maxValue : 0;
  }
}

export function summarizeEpisodeReward(args: {
  episodeIndex: number;
  role: ModqnEpisodeSummary['role'];
  windowId: string;
  epochUtcMs: number;
  seed: number;
  totalReward: ModqnRewardVector;
  decisions: number;
  exploredDecisions: number;
  totalUpdates: number;
  finalServingSatId: string | null;
  finalServingBeamId: string | null;
  visitedBeamIds: readonly string[];
  weights?: readonly [number, number, number];
}): ModqnEpisodeSummary {
  return {
    episodeIndex: args.episodeIndex,
    role: args.role,
    windowId: args.windowId,
    epochUtcMs: args.epochUtcMs,
    seed: args.seed,
    totalReward: args.totalReward,
    scalarReward: scalarizeReward(
      args.totalReward,
      args.weights ?? MODQN_BASELINE_OBJECTIVE_WEIGHTS,
    ),
    decisions: args.decisions,
    exploredDecisions: args.exploredDecisions,
    totalUpdates: args.totalUpdates,
    finalServingSatId: args.finalServingSatId,
    finalServingBeamId: args.finalServingBeamId,
    visitedBeamIds: [...args.visitedBeamIds],
  };
}
