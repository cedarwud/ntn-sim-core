/**
 * modqn-contracts — Frozen MODQN baseline contract extension.
 *
 * @version v1
 * @frozen 2026-04-01 (MODQN M1 contract review — PAP-2024-MORL-MULTIBEAM)
 *
 * Rationale:
 *   `policy-v1` remains the generic pull-model bridge for engine/runtime
 *   integration. The 2024 MODQN baseline requires a paper-specific
 *   per-beam state/action/reward surface that `policy-v1` intentionally does
 *   not encode. This file provides that reviewed extension without reopening
 *   frozen v1 contracts.
 *
 * Authority:
 *   - sdd/modqn-baseline-spec-outline.md
 *   - sdd/modqn-runtime-outline.md
 *   - sdd/phase0-architecture-spec.md §0C.6 (MODQN contract-extension gate)
 */

import type { PolicyAction, PolicyObservation } from './policy-v1';

/**
 * Stable per-beam truth record for one user at one slot.
 *
 * Paper basis:
 *   - u_i(t): current access vector
 *   - G_i(t): channel gains to all beams
 *   - Γ(t): beam locations
 *   - N(t): number of users per beam
 */
export interface ModqnBeamTruth {
  satId: string;
  beamId: string;
  beamIndex: number;
  /** Paper symbol: G_i(t) component for this beam. */
  channelGainLinear: number;
  /** Paper Eq.(2) SNR, kept to avoid repeated gain→SNR conversion in trainers. */
  snrLinear: number;
  /** Paper symbol: Γ(t) beam-center location (east offset from reference frame). */
  beamCenterEastKm: number;
  /** Paper symbol: Γ(t) beam-center location (north offset from reference frame). */
  beamCenterNorthKm: number;
  /** Paper symbol: N_l,v(t). */
  userCount: number;
  /** Optional per-beam throughput truth used by reward r3. */
  beamThroughputMbps?: number;
}

/**
 * Paper-faithful MODQN observation for one user at one slot.
 */
export interface ModqnBaselineObservation {
  tick: number;
  timeSec: number;
  userId: string;
  currentSatId: string | null;
  currentBeamId: string | null;
  beams: ModqnBeamTruth[];
}

/**
 * Paper state s_i(t) = (u_i(t), G_i(t), Γ(t), N(t)).
 */
export interface ModqnPaperState {
  accessVector: number[];
  channelGainsLinear: number[];
  beamLocationsKm: Array<{
    eastKm: number;
    northKm: number;
  }>;
  usersPerBeam: number[];
}

/**
 * One per-beam Q-value triplet from the three parallel DQNs.
 */
export interface ModqnObjectiveQValue {
  satId: string;
  beamId: string;
  beamIndex: number;
  throughputQ: number;
  handoverQ: number;
  loadBalanceQ: number;
}

export type ModqnObjectiveWeights = readonly [number, number, number];

/**
 * Paper action a_i(t): one-hot beam selection over all candidate beams.
 */
export interface ModqnActionVector {
  selectedIndex: number;
  satId: string;
  beamId: string;
  oneHot: number[];
}

/**
 * Exact reward input needed to compute R_i(t) = (r1, r2, r3).
 */
export interface ModqnRewardInput {
  previousSatId: string | null;
  previousBeamId: string | null;
  selectedSatId: string;
  selectedBeamId: string;
  userThroughputMbps: number;
  beamThroughputsMbps: number[];
  totalUsers: number;
  intraSatellitePenalty: number;
  interSatellitePenalty: number;
}

/**
 * Paper reward vector:
 *   r1 = throughput of user i
 *   r2 = -phi1 / -phi2 / 0
 *   r3 = -(max_beam_throughput - min_beam_throughput) / I
 */
export interface ModqnRewardVector {
  throughput: number;
  handoverPenalty: number;
  loadBalance: number;
}

/**
 * Frozen training protocol from PAP-2024-MORL-MULTIBEAM.
 */
export interface ModqnTrainingProtocol {
  hiddenLayers: readonly [100, 50, 50];
  activation: 'tanh';
  optimizer: 'Adam';
  exploration: 'epsilon-greedy';
  learningRate: number;
  discountFactor: number;
  batchSize: number;
  timeSlotSec: number;
  episodeDurationSec: number;
  episodes: number;
  weights: ModqnObjectiveWeights;
}

export const MODQN_BASELINE_OBJECTIVE_WEIGHTS: ModqnObjectiveWeights = [0.5, 0.3, 0.2] as const;

export const MODQN_BASELINE_TRAINING_PROTOCOL: ModqnTrainingProtocol = {
  hiddenLayers: [100, 50, 50],
  activation: 'tanh',
  optimizer: 'Adam',
  exploration: 'epsilon-greedy',
  learningRate: 0.01,
  discountFactor: 0.9,
  batchSize: 128,
  timeSlotSec: 1,
  episodeDurationSec: 10,
  episodes: 9000,
  weights: MODQN_BASELINE_OBJECTIVE_WEIGHTS,
};

/**
 * Stable truth-source interface reviewed for M1→M2 promotion.
 *
 * The engine-facing `PolicyObservation` remains generic. A future M2 runner
 * or replay adapter may provide the paper-faithful per-beam observation via
 * this hook without importing engine internals into `src/core/algorithms/`.
 */
export interface ModqnTruthSource {
  getObservation(args: {
    policyObservation: PolicyObservation;
  }): ModqnBaselineObservation | null;
}

/**
 * Stable bridge record from paper action to generic policy-v1 action.
 */
export interface ModqnPolicyBridge {
  observation: ModqnBaselineObservation;
  actionVector: ModqnActionVector;
  policyAction: PolicyAction;
}
