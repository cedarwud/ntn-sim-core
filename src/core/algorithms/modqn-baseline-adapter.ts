import type { Policy, PolicyObservation, PolicyAction, PolicyReward } from '@/core/contracts/policy-v1';
import {
  MODQN_BASELINE_OBJECTIVE_WEIGHTS,
  type ModqnActionVector,
  type ModqnBaselineObservation,
  type ModqnObjectiveQValue,
  type ModqnPaperState,
  type ModqnRewardInput,
  type ModqnRewardVector,
} from '@/core/contracts/modqn-contracts';
import {
  MODQN_DEFAULT_HANDOVER_PENALTIES,
  type ModqnAdapterOptions,
  type ModqnPaperDecision,
  type ModqnScoredQValue,
} from './modqn-baseline-types';

/**
 * ModqnBaselineAdapter — Faithful implementation of PAP-2024-MORL-MULTIBEAM.
 * 
 * This adapter bridges the simulator's frozen policy-v1 contract to the 
 * MODQN algorithm's state/action/reward definitions.
 * 
 * @layer algorithms
 * @version M1
 * @authority sdd/modqn-baseline-spec-outline.md
 */
export class ModqnBaselineAdapter implements Policy {
  public readonly name = 'modqn-baseline';
  private readonly truthSource: ModqnAdapterOptions['truthSource'];
  private readonly weights: readonly [number, number, number];
  private readonly intraSatellitePenalty: number;
  private readonly interSatellitePenalty: number;

  constructor(options: ModqnAdapterOptions = {}) {
    this.truthSource = options.truthSource;
    this.weights = options.weights ?? MODQN_BASELINE_OBJECTIVE_WEIGHTS;
    this.intraSatellitePenalty =
      options.intraSatellitePenalty ?? MODQN_DEFAULT_HANDOVER_PENALTIES.intraSatellite;
    this.interSatellitePenalty =
      options.interSatellitePenalty ?? MODQN_DEFAULT_HANDOVER_PENALTIES.interSatellite;
  }

  /**
   * Selects action using scalarized Q-values.
   * Q_scalar = \sum \omega_j * Q_j(s, a)
   */
  public selectAction(obs: PolicyObservation): PolicyAction {
    const baselineObservation = this.truthSource?.getObservation({ policyObservation: obs });
    if (!baselineObservation) {
      return {
        satelliteActions: [],
        handoverAction: { mode: 'auto' },
      };
    }

    const decision = this.selectPaperAction(baselineObservation);
    return this.buildPolicyAction(decision.action, baselineObservation);
  }

  public onReward(_reward: PolicyReward): void {
    // policy-v1 reward remains a generic runtime bridge. Paper-faithful MODQN
    // training consumes ModqnRewardVector via buildRewardVector().
  }

  public reset(): void {
    // Reset any transient internal state
  }

  /**
   * Builds the exact paper state:
   * s_i_t = (u_i(t), G_i(t), Γ(t), N(t))
   */
  public buildPaperState(obs: ModqnBaselineObservation): ModqnPaperState {
    return {
      accessVector: obs.beams.map((beam) => (
        obs.currentSatId === beam.satId && obs.currentBeamId === beam.beamId ? 1 : 0
      )),
      channelGainsLinear: obs.beams.map((beam) => beam.channelGainLinear),
      beamLocationsKm: obs.beams.map((beam) => ({
        eastKm: beam.beamCenterEastKm,
        northKm: beam.beamCenterNorthKm,
      })),
      usersPerBeam: obs.beams.map((beam) => beam.userCount),
    };
  }

  /**
   * Selects one beam via weighted scalarization of the three paper objectives.
   *
   * If objective-specific Q-values are not supplied yet, M1 uses a
   * paper-shaped heuristic over the same variables; the actual three-network
   * forward path lands in M2 without changing the selection contract.
   */
  public selectPaperAction(
    obs: ModqnBaselineObservation,
    qValues?: ModqnObjectiveQValue[],
  ): ModqnPaperDecision {
    const scoredQValues = (qValues ?? this.deriveHeuristicQValues(obs))
      .map((qValue): ModqnScoredQValue => ({
        ...qValue,
        scalarQ: this.scalarize(qValue),
      }));
    const rankedQValues = [...scoredQValues]
      .sort((left, right) => right.scalarQ - left.scalarQ);

    if (rankedQValues.length === 0) {
      return {
        action: {
          selectedIndex: -1,
          satId: obs.currentSatId ?? 'none',
          beamId: obs.currentBeamId ?? 'none',
          oneHot: [],
        },
        scoredQValues: rankedQValues,
      };
    }

    const best = rankedQValues[0];
    const oneHot = scoredQValues.map((qValue) => (
      qValue.satId === best.satId && qValue.beamId === best.beamId ? 1 : 0
    ));

    return {
      action: {
        selectedIndex: best.beamIndex,
        satId: best.satId,
        beamId: best.beamId,
        oneHot,
      },
      scoredQValues: rankedQValues,
    };
  }

  /**
   * Converts the paper action into the frozen policy-v1 bridge.
   *
   * The selected beam ID is carried through `satelliteActions[].activeBeamIds`
   * so the stable runtime path can consume beam-specific policy triggers
   * without reopening `policy-v1`.
   */
  public buildPolicyAction(
    action: ModqnActionVector,
    obs: ModqnBaselineObservation,
  ): PolicyAction {
    const isSameBeam =
      obs.currentSatId === action.satId &&
      obs.currentBeamId === action.beamId;

    if (action.selectedIndex < 0) {
      return {
        satelliteActions: [],
        handoverAction: { mode: 'auto' },
      };
    }

    if (isSameBeam) {
      return {
        satelliteActions: [],
        handoverAction: { mode: 'defer' },
      };
    }

    return {
      satelliteActions: [
        {
          satId: action.satId,
          activeBeamIds: [action.beamId],
          beamPowerDbm: null,
        },
      ],
      handoverAction: {
        mode: 'trigger',
        targetSatId: action.satId,
      },
    };
  }

  /**
   * Computes the exact paper reward vector:
   *   r1 = throughput
   *   r2 = HO penalty
   *   r3 = -(max beam throughput - min beam throughput) / I
   */
  public buildRewardVector(input: ModqnRewardInput): ModqnRewardVector {
    const maxThroughput = input.beamThroughputsMbps.length > 0
      ? Math.max(...input.beamThroughputsMbps)
      : 0;
    const minThroughput = input.beamThroughputsMbps.length > 0
      ? Math.min(...input.beamThroughputsMbps)
      : 0;
    const totalUsers = Math.max(1, input.totalUsers);

    return {
      throughput: input.userThroughputMbps,
      handoverPenalty: this.resolveHandoverPenalty(input),
      loadBalance: -((maxThroughput - minThroughput) / totalUsers),
    };
  }

  private deriveHeuristicQValues(obs: ModqnBaselineObservation): ModqnObjectiveQValue[] {
    return obs.beams.map((beam) => ({
      satId: beam.satId,
      beamId: beam.beamId,
      beamIndex: beam.beamIndex,
      throughputQ: beam.snrLinear,
      handoverQ: -this.resolveTransitionPenalty(
        obs.currentSatId,
        obs.currentBeamId,
        beam.satId,
        beam.beamId,
      ),
      loadBalanceQ: -beam.userCount,
    }));
  }

  private scalarize(qValue: ModqnObjectiveQValue): number {
    return (
      this.weights[0] * qValue.throughputQ +
      this.weights[1] * qValue.handoverQ +
      this.weights[2] * qValue.loadBalanceQ
    );
  }

  private resolveHandoverPenalty(input: ModqnRewardInput): number {
    return -this.resolveTransitionPenalty(
      input.previousSatId,
      input.previousBeamId,
      input.selectedSatId,
      input.selectedBeamId,
      input.intraSatellitePenalty,
      input.interSatellitePenalty,
    );
  }

  private resolveTransitionPenalty(
    previousSatId: string | null,
    previousBeamId: string | null,
    selectedSatId: string,
    selectedBeamId: string,
    intraSatellitePenalty = this.intraSatellitePenalty,
    interSatellitePenalty = this.interSatellitePenalty,
  ): number {
    if (!previousSatId || !previousBeamId) return 0;
    if (previousSatId === selectedSatId && previousBeamId === selectedBeamId) return 0;
    if (previousSatId === selectedSatId) return intraSatellitePenalty;
    return interSatellitePenalty;
  }
}
