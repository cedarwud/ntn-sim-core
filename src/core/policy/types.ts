/**
 * RL/DRL Policy Interface for ntn-sim-core (MG2).
 *
 * Defines the observation, action, and reward interfaces that connect
 * the simulation engine to external RL/DRL policy implementations.
 *
 * The engine exposes getObservation() → PolicyObservation and accepts
 * applyAction(PolicyAction). The reward is computed from KPI deltas.
 *
 * Paper sources (state/action/reward definitions from catalog algorithmDetail):
 *   - PAP-2024-HOBS: beam config + EE reward
 *   - PAP-2025-SMASH-MADQL: multi-agent beam + power + HO
 *   - PAP-2026-DRL-BHOPT: BH scheduling + traffic prediction
 *   - PAP-2024-MADRL-CORE: multi-satellite cooperative
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9
 *   - This file must not import React, Three.js, or scene code.
 */

// ---------------------------------------------------------------------------
// Observation (State)
// ---------------------------------------------------------------------------

/** Per-satellite observation visible to the policy. */
export interface SatelliteObservation {
  satId: string;
  elevationDeg: number;
  rangeKm: number;
  sinrDb: number;
  /** Number of active beams on this satellite. */
  activeBeamCount: number;
  /** Energy state of charge (0-1), if L2 active. */
  soc: number | null;
  /** Whether this satellite is currently serving. */
  isServing: boolean;
}

/** Per-UE observation. */
export interface UeObservation {
  ueId: string;
  sinrDb: number;
  servingSatId: string | null;
  /** Distance from beam center in km. */
  distanceFromCenterKm: number;
}

/** Full observation at one tick. */
export interface PolicyObservation {
  tick: number;
  timeSec: number;
  /** Per-satellite observations (visible satellites). */
  satellites: SatelliteObservation[];
  /** Per-UE observations. */
  ues: UeObservation[];
  /** Global metrics. */
  global: {
    totalActiveSatellites: number;
    totalActiveBeams: number;
    /** Total power consumption across all satellites (W). */
    totalPowerW: number;
    /** Mean SINR across all UEs (dB). */
    meanSinrDb: number;
  };
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/** Per-satellite action. */
export interface SatelliteAction {
  satId: string;
  /** Which beams to activate (by beam ID). Null = no change. */
  activeBeamIds: string[] | null;
  /** Per-beam power allocation in dBm. Null = default. */
  beamPowerDbm: Map<string, number> | null;
}

/** Handover action. */
export interface HandoverAction {
  /** 'trigger' to force HO, 'defer' to suppress, 'auto' for baseline. */
  mode: 'trigger' | 'defer' | 'auto';
  /** Preferred target satellite (for 'trigger' mode). */
  targetSatId?: string;
}

/** Full action for one tick. */
export interface PolicyAction {
  /** Per-satellite beam/power actions. */
  satelliteActions: SatelliteAction[];
  /** Handover control. */
  handoverAction: HandoverAction;
}

// ---------------------------------------------------------------------------
// Reward
// ---------------------------------------------------------------------------

/** Reward signal computed from KPI deltas. */
export interface PolicyReward {
  /** Total reward (weighted sum of components). */
  total: number;
  /** Component breakdown. */
  components: {
    /** Throughput reward (higher = better). */
    throughput: number;
    /** Energy efficiency reward (higher = better). */
    energyEfficiency: number;
    /** Handover penalty (negative when HO occurs). */
    handoverCost: number;
    /** Service continuity reward (penalty for outage). */
    serviceContinuity: number;
    /** Fairness reward (Jain index-based). */
    fairness: number;
  };
}

/** Reward weight configuration. */
export interface RewardWeights {
  throughput: number;
  energyEfficiency: number;
  handoverCost: number;
  serviceContinuity: number;
  fairness: number;
}

/** Default reward weights (balanced). */
export const DEFAULT_REWARD_WEIGHTS: RewardWeights = {
  throughput: 0.3,
  energyEfficiency: 0.2,
  handoverCost: 0.2,
  serviceContinuity: 0.2,
  fairness: 0.1,
};

// ---------------------------------------------------------------------------
// Policy Interface
// ---------------------------------------------------------------------------

/**
 * Policy interface that external RL/DRL implementations must satisfy.
 * The engine calls selectAction() each tick with the current observation.
 */
export interface Policy {
  /** Policy name/ID for logging. */
  readonly name: string;
  /** Select action given observation. */
  selectAction(obs: PolicyObservation): PolicyAction;
  /** Receive reward feedback (for online learning). */
  onReward?(reward: PolicyReward): void;
  /** Reset policy state. */
  reset(): void;
}
