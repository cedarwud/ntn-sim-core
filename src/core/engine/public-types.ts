import type { HandoverManager } from '../handover/types';
import type { EnergyEfficiencyMetrics } from '../energy/types';
import type { BhSlotDecision } from '../beam/scheduler';
import type { SatelliteEnergyLayer2State } from '../energy/layer2';

/**
 * Phase 5 engine public types.
 * Ownership: engine-facing public surface types re-homed under engine/.
 */

export type {
  HandoverManager,
  EnergyEfficiencyMetrics,
  BhSlotDecision,
  SatelliteEnergyLayer2State,
};
