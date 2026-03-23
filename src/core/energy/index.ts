/**
 * Energy module barrel export.
 *
 * SDD: sdd/ntn-sim-core-sdd.md §9.4
 */

export type {
  BeamPowerState,
  BeamPowerEntry,
  SatelliteEnergyState,
  EnergyEfficiencyMetrics,
  EnergyLayer1Config,
} from './types';

export type { EnergyLayer1Manager } from './layer1';
export { createEnergyLayer1, DEFAULT_ENERGY_LAYER1_CONFIG } from './layer1';

export type {
  EnergyLayer2Config,
  SatelliteEnergyLayer2State,
  EnergyLayer2Manager,
} from './layer2';
export { createEnergyLayer2, DEFAULT_ENERGY_LAYER2_CONFIG } from './layer2';
