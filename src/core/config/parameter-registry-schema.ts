import type { SourceTier, SpecMode } from '../common/types';

/**
 * Phase 5 Core Structural Split: Parameter Registry Schema.
 * Ownership: Registry type definitions and schema authority.
 */

/** Profile-agnostic registry record for one KPI-impacting parameter. */
export interface GlobalParameterSpec {
  /** PARAM-* prefix required. Distinct from source-registry namespaces (PAP-*, STD-*, ASSUME-*). */
  id: string;
  /** Dotted path in ProfileConfig (e.g. "rf.frequency_ghz"). */
  parameterPath: string;
  /** Human-readable name. */
  semanticName: string;
  /** SI unit, or null for dimensionless. */
  unit: string | null;
  /** Continuous range (mutually exclusive with presetList). */
  allowedRange?: { min: number; max: number };
  /** Discrete preset list (mutually exclusive with allowedRange). */
  presetList?: Array<{ value: string | number; label: string }>;
  /** True when computed from other parameters; must not be an independent UI control. */
  isDerived: boolean;
  /** Plain-English conditional dependency rule (optional). */
  dependencyRule?: string;
  /** Vocabulary layer classification (phase0 §0B.1). */
  vocabularyLayer: 'scenario' | 'model-bundle' | 'experiment';
}

/** Per-(parameter × profile) provenance and default value. */
export interface ProfileParameterBinding {
  /** References GlobalParameterSpec.id */
  parameterId: string;
  /** ProfileConfig.id, or "__universal__" when value is profile-agnostic. */
  profileId: string;
  /** Default value in this profile. */
  defaultValue: number | string | boolean | null;
  /** Source tier (SourceTier from core/common/types.ts). */
  sourceTier: SourceTier;
  /** Source-registry ID (PAP-*, STD-*, ASSUME-*, or other entries) from paper-sources.json. */
  sourceId: string;
  /** Optional locator within the source (e.g. "Table III"). */
  sourceNote?: string;
  /** UI/exposure tier for this (parameter, profile) pair. */
  exposureMode: SpecMode;
}

/** Convenience wrapper bundling spec + per-profile bindings. */
export interface ParameterEntry {
  spec: GlobalParameterSpec;
  bindings: ProfileParameterBinding[];
}
