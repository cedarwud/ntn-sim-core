import type {
  ModqnActionVector,
  ModqnBaselineObservation,
  ModqnObjectiveWeights,
  ModqnPaperState,
  ModqnRewardVector,
  ModqnTrainingProtocol,
} from '@/core/contracts/modqn-contracts';
import type { KpiBundle } from '@/core/contracts/kpi-v1';
import type { ProfileConfig } from '@/core/profiles/types';
import type { RunArtifactBundle } from '@/core/trace/types';
import type { ExperimentManifest, ExperimentResult } from './types';

export type ModqnWindowPlacement = 'entry' | 'mid' | 'exit';
export type ModqnWindowRole = 'train' | 'held-out';

type DeepPartialValue<T> =
  T extends readonly unknown[]
    ? T
    : T extends object
      ? { readonly [K in keyof T]?: DeepPartialValue<T[K]> }
      : T;

export type ModqnProfileOverrides = {
  readonly [K in keyof ProfileConfig]?: DeepPartialValue<ProfileConfig[K]>;
};

/**
 * Deterministic episode-sampling envelope for the M2/M3 baseline path.
 */
export interface ModqnSamplingConfig {
  readonly searchEpochOffsetsSec: readonly number[];
  readonly searchDurationSec: number;
  readonly episodeDurationSec: number;
  readonly windowsPerPass: readonly ModqnWindowPlacement[];
  readonly trainWindowCount: number;
  readonly heldOutWindowCount: number;
  readonly trainEpisodesForSmoke: number;
}

/**
 * MODQN training manifest for the baseline reproduction path.
 *
 * The M2 runtime still consumes a few paper/runtime disclosure fields directly,
 * so M3 keeps this surface additive rather than replacing it.
 */
export interface ModqnTrainingManifest extends ExperimentManifest {
  readonly algorithmId: 'modqn-baseline';
  readonly profileId: 'modqn-paper-baseline';
  readonly protocol: ModqnTrainingProtocol;
  readonly weights: ModqnObjectiveWeights;
  readonly sampling: ModqnSamplingConfig;
  readonly params: {
    readonly rewardChannel: 'buildRewardVector';
    readonly actionChannel: 'selectPaperAction+buildPolicyAction';
    readonly evaluationAggregation: 'mean-held-out-kpi';
    readonly primaryUserId: string;
    readonly useIndependentHandover: boolean;
    readonly samplingStrategy: string;
    readonly runtimeDisclosure: readonly string[];
  };
}

/**
 * Materialized train or held-out window selected from the deterministic epoch sweep.
 */
export interface ModqnSamplingWindow {
  readonly windowId: string;
  readonly role: ModqnWindowRole;
  readonly epochOffsetSec: number;
  readonly episodeEpochUtcMs: number;
  readonly searchEpochUtcMs: number;
  readonly windowStartSec: number;
  readonly windowEndSec: number;
  readonly satIds: readonly string[];
  readonly peakElevationDeg: number;
  readonly selectionReason: string;
}

export interface ModqnSamplingPlan {
  readonly config: ModqnSamplingConfig;
  readonly trainWindows: readonly ModqnSamplingWindow[];
  readonly heldOutWindows: readonly ModqnSamplingWindow[];
  readonly catalogSatIds: readonly string[];
  readonly limitationNotes: readonly string[];
}

/**
 * Replay-buffer sample used by the in-repo DQN trainer.
 */
export interface ModqnExperience {
  readonly observation: ModqnBaselineObservation;
  readonly state: ModqnPaperState;
  readonly encodedState: readonly number[];
  readonly action: ModqnActionVector;
  readonly actionCatalogIndex: number;
  readonly validActionCatalogIndices: readonly number[];
  readonly rewardVector: ModqnRewardVector;
  readonly nextObservation: ModqnBaselineObservation;
  readonly nextState: ModqnPaperState;
  readonly nextEncodedState: readonly number[];
  readonly nextValidActionCatalogIndices: readonly number[];
  readonly isDone: boolean;
}

/**
 * Per-episode summary emitted by the reproduction runner.
 */
export interface ModqnEpisodeSummary {
  readonly episodeIndex: number;
  readonly role: ModqnWindowRole;
  readonly windowId: string;
  readonly epochUtcMs: number;
  readonly seed: number;
  readonly totalReward: ModqnRewardVector;
  readonly scalarReward: number;
  readonly decisions: number;
  readonly exploredDecisions: number;
  readonly totalUpdates: number;
  readonly finalServingSatId: string | null;
  readonly finalServingBeamId: string | null;
  readonly visitedBeamIds: readonly string[];
}

/**
 * Aggregate trainer-side metrics used by the stable M3 summary surface.
 */
export interface ModqnTrainingMetrics {
  readonly episodes: number[];
  readonly loss: {
    readonly throughput: number[];
    readonly handover: number[];
    readonly loadBalance: number[];
  };
  readonly reward: {
    readonly throughput: number[];
    readonly handover: number[];
    readonly loadBalance: number[];
    readonly scalar: number[];
  };
  readonly epsilon: number[];
  readonly replaySize: number[];
}

export interface ModqnDenseLayerCheckpoint {
  readonly inputSize: number;
  readonly outputSize: number;
  readonly weights: readonly number[];
  readonly biases: readonly number[];
  readonly mWeights: readonly number[];
  readonly vWeights: readonly number[];
  readonly mBiases: readonly number[];
  readonly vBiases: readonly number[];
}

export interface ModqnMlpNetworkCheckpoint {
  readonly optimizationStep: number;
  readonly layers: readonly ModqnDenseLayerCheckpoint[];
}

export interface ModqnObjectiveDqnCheckpoint {
  readonly syncEveryUpdates: number;
  readonly updateCount: number;
  readonly online: ModqnMlpNetworkCheckpoint;
  readonly target: ModqnMlpNetworkCheckpoint;
}

export interface ModqnTrainerCheckpoint {
  readonly formatVersion: 1;
  readonly algorithmId: 'modqn-baseline';
  readonly seed: number;
  readonly rngState: number;
  readonly epsilon: number;
  readonly totalUpdates: number;
  readonly protocol: ModqnTrainingProtocol;
  readonly metrics: ModqnTrainingMetrics;
  readonly replayBuffer: readonly ModqnExperience[];
  readonly objectives: {
    readonly throughput: ModqnObjectiveDqnCheckpoint;
    readonly handover: ModqnObjectiveDqnCheckpoint;
    readonly loadBalance: ModqnObjectiveDqnCheckpoint;
  };
}

/**
 * One held-out replay/evaluation window plus its artifact bundle.
 */
export interface ModqnHeldOutWindowResult {
  readonly windowId: string;
  readonly episode: ModqnEpisodeSummary;
  readonly kpiBundle: KpiBundle;
  readonly artifactBundle: RunArtifactBundle;
}

export interface ModqnHeldOutEvaluation {
  readonly aggregateReward: ModqnRewardVector;
  readonly scalarReward: number;
  readonly aggregateKpiBundle: KpiBundle;
  readonly averageKpi: KpiBundle;
  readonly windows: readonly ModqnHeldOutWindowResult[];
  readonly limitationNotes: readonly string[];
}

/**
 * Stable reproduction result exported from the experiments layer.
 *
 * M3 extends the shipped M2 bundle rather than replacing it so existing
 * validation and runner consumers keep working while UI gains a stable summary.
 */
export interface ModqnReproductionResult extends ExperimentResult {
  readonly manifest: ModqnTrainingManifest;
  readonly samplingPlan: ModqnSamplingPlan;
  readonly metrics: ModqnTrainingMetrics;
  readonly trainingEpisodes: readonly ModqnEpisodeSummary[];
  readonly heldOutEvaluation: ModqnHeldOutEvaluation;
  readonly artifactBundles: readonly RunArtifactBundle[];
  readonly trainingSummary: {
    readonly totalEpisodes: number;
    readonly totalSteps: number;
    readonly wallClockMs: number;
    readonly curves: {
      readonly episodes: readonly number[];
      readonly throughputLoss: readonly number[];
      readonly handoverLoss: readonly number[];
      readonly loadBalanceLoss: readonly number[];
      readonly scalarReward: readonly number[];
    };
  };
  readonly metadata: {
    readonly paperId: 'PAP-2024-MORL-MULTIBEAM';
    readonly constraints: readonly string[];
    readonly reproductionTimestamp: string;
  };
  readonly trainerCheckpoint?: ModqnTrainerCheckpoint;
}
