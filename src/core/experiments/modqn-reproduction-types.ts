import type {
  ModqnActionVector,
  ModqnBaselineObservation,
  ModqnObjectiveWeights,
  ModqnPaperState,
  ModqnRewardVector,
  ModqnTrainingProtocol,
} from '@/core/contracts/modqn-contracts';
import type { KpiBundle } from '@/core/contracts/kpi-v1';
import type { RunArtifactBundle } from '@/core/trace/types';
import type { ExperimentManifest, ExperimentResult } from './types';

export type ModqnEpisodeRole = 'train' | 'held-out';

export interface ModqnSamplingConfig {
  readonly searchEpochOffsetsSec: readonly number[];
  readonly searchDurationSec: number;
  readonly episodeDurationSec: number;
  readonly windowsPerPass: readonly ('entry' | 'mid' | 'exit')[];
  readonly trainWindowCount: number;
  readonly heldOutWindowCount: number;
  readonly trainEpisodesForSmoke: number;
}

export interface ModqnSamplingWindow {
  readonly windowId: string;
  readonly role: ModqnEpisodeRole;
  readonly epochOffsetSec: number;
  readonly searchEpochUtcMs: number;
  readonly episodeEpochUtcMs: number;
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

export interface ModqnEpisodeSummary {
  readonly episodeIndex: number;
  readonly role: ModqnEpisodeRole;
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

export interface ModqnHeldOutWindowResult {
  readonly episode: ModqnEpisodeSummary;
  readonly kpiBundle: KpiBundle;
  readonly artifactBundle: RunArtifactBundle;
}

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
    readonly runtimeDisclosure: readonly string[];
  };
}

export interface ModqnHeldOutEvaluation {
  readonly aggregateReward: ModqnRewardVector;
  readonly scalarReward: number;
  readonly aggregateKpiBundle: KpiBundle;
  readonly windows: readonly ModqnHeldOutWindowResult[];
  readonly limitationNotes: readonly string[];
}

export interface ModqnReproductionResult extends ExperimentResult {
  readonly manifest: ModqnTrainingManifest;
  readonly samplingPlan: ModqnSamplingPlan;
  readonly metrics: ModqnTrainingMetrics;
  readonly trainingEpisodes: readonly ModqnEpisodeSummary[];
  readonly heldOutEvaluation: ModqnHeldOutEvaluation;
  readonly artifactBundles: readonly RunArtifactBundle[];
}
