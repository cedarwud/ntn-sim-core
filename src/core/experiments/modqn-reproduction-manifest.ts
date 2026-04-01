import {
  MODQN_BASELINE_OBJECTIVE_WEIGHTS,
  MODQN_BASELINE_TRAINING_PROTOCOL,
} from '@/core/contracts/modqn-contracts';
import type { ModqnTrainingManifest } from './modqn-reproduction-types';

/**
 * MODQN Baseline Reproduction Manifest (M2).
 *
 * M2 keeps the paper's 10 s episode length but explicitly widens episode
 * diversity through deterministic epoch sweeps over the disclosed 2x2 proxy.
 */
export const MODQN_REPRODUCTION_MANIFEST: ModqnTrainingManifest = {
  id: 'modqn-reproduction-2024',
  algorithmId: 'modqn-baseline',
  profileId: 'modqn-paper-baseline',
  seed: 42,
  protocol: MODQN_BASELINE_TRAINING_PROTOCOL,
  weights: MODQN_BASELINE_OBJECTIVE_WEIGHTS,
  sampling: {
    searchEpochOffsetsSec: [0, 10800, 21600, 43200, 86400],
    searchDurationSec: 1800,
    episodeDurationSec: MODQN_BASELINE_TRAINING_PROTOCOL.episodeDurationSec,
    windowsPerPass: ['entry', 'mid', 'exit'],
    trainWindowCount: 6,
    heldOutWindowCount: 2,
    trainEpisodesForSmoke: 18,
  },
  params: {
    rewardChannel: 'buildRewardVector',
    actionChannel: 'selectPaperAction+buildPolicyAction',
    evaluationAggregation: 'mean-held-out-kpi',
    primaryUserId: 'ue-0',
    runtimeDisclosure: [
      'Training/evaluation consume the M1 handoff surface: ModqnBaselineAdapter.buildPaperState(), selectPaperAction(), buildPolicyAction(), and buildRewardVector().',
      'Episode diversity comes from deterministic epoch sweeps over the disclosed modqn-paper-baseline 2x2 proxy; it is no longer a single 10 s smoke window.',
      'The proxy remains diversity-limited: many sampled windows still expose only one visible satellite, so held-out evaluation is explicit but not paper-scale coverage.',
      'Paper exploration is specified only as epsilon-greedy; M2 uses deterministic multiplicative epsilon decay (0.995, floor 0.01) for reproducible training runs.',
      'The current frozen runtime bridge drives the primary policy-controlled user ue-0 while the remaining UEs stay as load/background truth for N(t) and r3.',
      'Paper reward does not flow through onReward(); experiments compute ModqnRewardVector directly from the reviewed M1 reward bridge.',
    ],
  },
};
