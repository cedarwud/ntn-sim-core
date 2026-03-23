/**
 * Profile module barrel export.
 */

// Types
export type {
  ProfileFamily,
  ProfileConfig,
  OrbitalConfig,
  RfConfig,
  AntennaConfig,
  BeamConfig,
  ChannelConfig,
  HandoverType,
  HandoverConfig,
  EnergyConfig,
  UeDistribution,
  UeConfig,
  ValidationResult,
} from './types';

// Re-exported common types
export type { SourceTier, SourceReference, OrbitMode, BeamSemantics } from './types';

// Default profiles
export {
  CASE9_ACCESS_BASELINE,
  HOBS_MULTIBEAM_BASELINE,
  BH_RESOURCE_BASELINE,
  REAL_TRACE_VALIDATION,
  DEFAULT_PROFILES,
} from './defaults';

// Loader functions
export {
  loadProfile,
  resolveProfile,
  serializeProfile,
  validateProfile,
} from './loader';
