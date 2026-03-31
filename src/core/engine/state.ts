import type { ProfileConfig } from '../profiles/types';
import type { TrajectoryCache } from '../orbit/types';
import type { ModelBundle } from '../models/model-bundle';
import type { SeededRng } from '../common/types';
import type { UePosition } from '../ue/position-generator';
import type { HandoverManager } from '../handover/types';
import type { KpiAccumulator } from '../kpi/accumulator';
import type { SatelliteBeamLayout } from '../beam/types';
import type { BhScheduler, BhSlotDecision } from '../beam/scheduler';
import type { EnergyLayer1Manager } from '../energy/layer1';
import type { EnergyLayer2Manager } from '../energy/layer2';
import type { EnergyEfficiencyMetrics } from '../energy/types';
import type { PolicyAction, PolicyObservation } from '../policy/types';
import type { HoLogEntry } from '../common/types';

/**
 * Phase 5 Core Structural Split: SimEngine state definition.
 */

export interface UeRuntimePosition extends UePosition {
  latitudeDeg: number;
  longitudeDeg: number;
}

export interface MobilityUpdater {
  update(positions: UePosition[], stepSec: number): void;
  reset(): void;
}

export interface SimEngineState {
  profile: ProfileConfig;
  trajectoryCache: TrajectoryCache;
  bundle: ModelBundle;

  // Transient State
  lastObservation: PolicyObservation | null;
  pendingExternalAction: PolicyAction | null;
  rng: SeededRng;
  
  // UE State
  uePositions: UeRuntimePosition[];
  mobilityUpdater: MobilityUpdater;

  // Handover State
  hoManager: HandoverManager; // Shared manager (Phase A)
  hoManagers: Map<string, HandoverManager>; // Per-UE managers (Phase B)
  independentHandover: boolean;

  // KPI State
  kpiAcc: KpiAccumulator;
  lastDiscreteTickNumber: number | null;
  lastTickHoLog: HoLogEntry[];
  lastRepresentativeServing: { satId: string; beamId: string } | null;

  // Beam/Scheduler State
  isMultiBeam: boolean;
  beamLayouts: Map<string, SatelliteBeamLayout>;
  bhScheduler: BhScheduler | null;
  lastBhSlotDecision: BhSlotDecision | null;

  // Energy State
  energyManager: EnergyLayer1Manager | null;
  energyL2Manager: EnergyLayer2Manager | null;
  l2InitializedSats: Set<string>;
  lastEnergyMetrics: EnergyEfficiencyMetrics | null;

  // RF Pre-computed Constants
  txEirp: number;
  noiseDbm: number;
  deploymentEnvironment: string;
  largeScaleModel: string;
  implementationLossDb: number;
}
