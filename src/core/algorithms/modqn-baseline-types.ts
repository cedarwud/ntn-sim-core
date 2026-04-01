import type {
  ModqnActionVector,
  ModqnBaselineObservation,
  ModqnObjectiveQValue,
  ModqnObjectiveWeights,
  ModqnRewardInput,
  ModqnRewardVector,
  ModqnTruthSource,
} from '@/core/contracts/modqn-contracts';

export type {
  ModqnActionVector,
  ModqnBaselineObservation,
  ModqnObjectiveQValue,
  ModqnObjectiveWeights,
  ModqnRewardInput,
  ModqnRewardVector,
  ModqnTruthSource,
};

export interface ModqnScoredQValue extends ModqnObjectiveQValue {
  scalarQ: number;
}

export interface ModqnPaperDecision {
  action: ModqnActionVector;
  scoredQValues: ModqnScoredQValue[];
}

export interface ModqnAdapterOptions {
  truthSource?: ModqnTruthSource;
  weights?: ModqnObjectiveWeights;
  intraSatellitePenalty?: number;
  interSatellitePenalty?: number;
}

export const MODQN_DEFAULT_HANDOVER_PENALTIES = {
  intraSatellite: 1,
  interSatellite: 2,
} as const;
