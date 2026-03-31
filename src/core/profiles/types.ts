/**
 * Profile schema types for ntn-sim-core.
 * Phase 5 Core Structural Split: Barrel for runtime-schema and bundle-vocabulary.
 * Note: Uses explicit type aliases to satisfy VAL-PLAT-006 static regex validation.
 */

import * as Schema from './runtime-schema';
import * as Vocab from './bundle-vocabulary';

export type OrbitalConfig = Schema.OrbitalConfig;
export type RfConfig = Schema.RfConfig;
export type AntennaConfig = Schema.AntennaConfig;
export type BeamConfig = Schema.BeamConfig;
export type ChannelConfig = Schema.ChannelConfig;
export type HandoverConfig = Schema.HandoverConfig;
export type EnergyConfig = Schema.EnergyConfig;
export type UeConfig = Schema.UeConfig;
export type ProfileConfig = Schema.ProfileConfig;
export type ValidationResult = Schema.ValidationResult;
export type LargeScaleModel = Schema.LargeScaleModel;
export type DeploymentEnvironment = Schema.DeploymentEnvironment;
export type HandoverType = Schema.HandoverType;
export type UeDistribution = Schema.UeDistribution;

export type ProfileFamily = Vocab.ProfileFamily;
export type ScenarioConfig = Vocab.ScenarioConfig;
export type ModelBundleSelection = Vocab.ModelBundleSelection;
export type ExperimentBundle = Vocab.ExperimentBundle;
export type ProfileBundle = Vocab.ProfileBundle;

// Re-export common types for convenience
export type {
  SourceTier,
  SourceReference,
  OrbitMode,
  BeamSemantics,
  ObserverLocation,
  TimeControl,
  SpecMode,
} from '../common/types';
