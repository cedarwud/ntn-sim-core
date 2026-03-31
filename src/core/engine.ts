/**
 * Phase 5 simulation engine for ntn-sim-core.
 * Thin orchestrator refactored from monolith.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9
 *   - Phase 5 Split: sdd/phase5-cleanup-and-modularization-sdd.md §5.1
 */

import type { SimulationSnapshot } from './common/types';
import type { TrajectoryCache } from './orbit/types';
import type { ProfileConfig } from './profiles/types';
import type { Policy, PolicyObservation, PolicyAction } from './policy/types';
import type { KpiAccumulator } from './kpi/accumulator';

import type { SimEngineState } from './engine/state';
import type {
  HandoverManager,
  EnergyEfficiencyMetrics,
  BhSlotDecision,
  SatelliteEnergyLayer2State,
} from './engine/public-types';
import { bootstrapEngine } from './engine/bootstrap';
import { executeTick } from './engine/tick';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface SimEngineConfig {
  profile: ProfileConfig;
  trajectoryCache: TrajectoryCache;
  /** Optional RL/DRL policy. If provided, selectAction() is called every tick. */
  policy?: Policy;
}

export interface SimEngine {
  /** Advance by one tick. Returns the snapshot for this tick. */
  tick(timeSec: number, tickNumber: number): SimulationSnapshot;
  /** Get the handover manager (for event draining). */
  getHandoverManager(): HandoverManager;
  /** Get KPI accumulator (for finalization). */
  getKpiAccumulator(): KpiAccumulator;
  /** Get energy metrics from the last tick, or null if energy layer disabled. */
  getEnergyMetrics(): EnergyEfficiencyMetrics | null;
  /** Get all satellite energy Layer 2 states. Empty if L2 not active. */
  getEnergyLayer2States(): SatelliteEnergyLayer2State[];
  /** Get current BH slot decision, or null if BH scheduler not active. */
  getBhSlotDecision(): BhSlotDecision | null;
  /** MG2 / VAL-POLICY-001: Return the policy observation built during the last tick. */
  getObservation(): PolicyObservation | null;
  /** MG2 / VAL-POLICY-001: Queue an external policy action to be applied on the next tick. */
  applyAction(action: PolicyAction | null): void;
  /** Reset all state. */
  reset(): void;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createSimEngine(config: SimEngineConfig): SimEngine {
  let state: SimEngineState = bootstrapEngine(config);
  let lastTickTimeSec: number | null = null;

  return {
    tick(timeSec: number, tickNumber: number): SimulationSnapshot {
      const snapshot = executeTick(state, timeSec, tickNumber, lastTickTimeSec);
      lastTickTimeSec = timeSec;
      return snapshot;
    },

    getHandoverManager(): HandoverManager {
      return state.hoManager;
    },

    getKpiAccumulator(): KpiAccumulator {
      return state.kpiAcc;
    },

    getEnergyMetrics(): EnergyEfficiencyMetrics | null {
      return state.lastEnergyMetrics;
    },

    getEnergyLayer2States(): SatelliteEnergyLayer2State[] {
      return state.energyL2Manager ? state.energyL2Manager.getAllStates() : [];
    },

    getBhSlotDecision(): BhSlotDecision | null {
      return state.lastBhSlotDecision;
    },

    getObservation(): PolicyObservation | null {
      return state.lastObservation;
    },

    applyAction(action: PolicyAction | null): void {
      state.pendingExternalAction = action;
    },

    reset(): void {
      state = bootstrapEngine(config);
      lastTickTimeSec = null;
    },
  };
}
