/**
 * Exposure Contract v1 — profile-list, HandoverType, and parameter exposure contracts.
 *
 * @version v1
 * @frozen — breaking changes require a new file: exposure-v2.ts
 *
 * Sources: profiles/profile-exposure-catalog.ts (for getProfileList);
 *          parameter-registry + profile loader (for getParameterView);
 *          profiles/types.ts (HandoverType)
 * Consumers: src/viz/overlays/ControlPanel.tsx, future standalone ESTNET consumer
 * Forbidden imports in this file: engine.ts, runner/, React, hardcoded profile arrays
 *
 * Phase 4 Group 2 — phase4-runtime-contract-sdd.md §4.4
 */

import { PARAMETER_REGISTRY } from '@/core/config/parameter-registry';
import type { ParameterEntry, ProfileParameterBinding } from '@/core/config/parameter-registry-schema';
import { loadProfile } from '@/core/profiles/loader';
import { getProfileExposureCatalog } from '@/core/profiles/profile-exposure-catalog';

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

/**
 * Handover algorithm type union.
 *
 * @version v1
 * @frozen — the union member set is stable; new members require a version note
 */
export type { HandoverType } from '@/core/profiles/types';

// ---------------------------------------------------------------------------
// ProfileListEntry
// ---------------------------------------------------------------------------

/**
 * One entry in the profile selector list.
 *
 * Backed by authoring exposure metadata — NOT backed by hardcoded ControlPanel arrays.
 * Ordering: Realistic → Advanced → Sensitivity; within tier: authoring registry declaration order.
 *
 * @version v1
 * @frozen
 */
export interface ProfileListEntry {
  /** Profile ID matching ProfileConfig.id and ProfileBundle.id. */
  id: string;
  /** Profile family identifier (ProfileFamily union string). */
  family: string;
  /** Spec-mode tier for grouping in the UI. */
  tier: 'Realistic' | 'Advanced' | 'Sensitivity';
  /** Display label for the profile selector. */
  label: string;
}

// ---------------------------------------------------------------------------
// getProfileList
// ---------------------------------------------------------------------------

/**
 * Returns the ordered list of all active profiles for UI display.
 *
 * Data source: profile-exposure-catalog.ts authoring registry.
 * NOT backed by the hardcoded PROFILE_OPTIONS constant in ControlPanel.tsx.
 *
 * Ordering contract (stable across versions):
 *   1. 'Realistic' tier entries
 *   2. 'Advanced' tier entries
 *   3. 'Sensitivity' tier entries
 *   Within each tier: order matches the authoring registry declaration order.
 *
 * Expected return: one entry per active profile in the authoring registry
 * (currently 15 entries).
 *
 * @version v1
 * @frozen — signature is stable; active profile count may expand via registry updates
 */
export function getProfileList(): ProfileListEntry[] {
  return getProfileExposureCatalog().map(({ id, family, tier, label }) => ({
    id,
    family,
    tier,
    label,
  }));
}

// ---------------------------------------------------------------------------
// getParameterView
// ---------------------------------------------------------------------------

/**
 * Returns the parameter metadata for a given profile, filtering out Internal-only fields.
 *
 * @version v1
 */
export function getParameterView(profileId: string): ParameterMetadataResponse {
  const profile = loadProfile(profileId);
  const parameters: ParameterView[] = [];

  for (const entry of PARAMETER_REGISTRY) {
    const binding = resolveBinding(entry, profileId);
    if (!binding || binding.exposureMode === 'Internal-only' || binding.sourceTier === 'debug-only') continue;

    parameters.push({
      parameterId: entry.spec.id,
      profileId,
      value: resolveExposedValue(entry, binding, profile),
      unit: entry.spec.unit ?? undefined,
      tier: toParameterViewTier(binding.sourceTier),
      specMode: binding.exposureMode,
      sourceId: binding.sourceId,
    });
  }

  parameters.sort(compareParameterViews);

  return {
    profileId,
    parameters,
  };
}

function resolveBinding(
  entry: ParameterEntry,
  profileId: string,
): ProfileParameterBinding | undefined {
  const exact = entry.bindings.find((binding) => binding.profileId === profileId);
  if (exact) return exact;
  return entry.bindings.find((binding) => binding.profileId === '__universal__');
}

function getValueAtPath(profile: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((current, segment) => {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      return (current as Record<string, unknown>)[segment];
    }, profile);
}

function resolveExposedValue(
  entry: ParameterEntry,
  binding: ProfileParameterBinding,
  profile: unknown,
): number | string | boolean {
  const runtimeValue = getValueAtPath(profile, entry.spec.parameterPath);
  if (typeof runtimeValue === 'number' || typeof runtimeValue === 'string' || typeof runtimeValue === 'boolean') {
    return runtimeValue;
  }

  const boundValue = binding.defaultValue;
  if (typeof boundValue === 'number' || typeof boundValue === 'string' || typeof boundValue === 'boolean') {
    return boundValue;
  }

  return entry.spec.isDerived ? 'derived' : 'not-set';
}

function toParameterViewTier(
  tier: ProfileParameterBinding['sourceTier'],
): ParameterView['tier'] {
  switch (tier) {
    case 'normative':
    case 'paper-backed':
    case 'standard-backed':
    case 'assumption-backed':
      return tier;
    case 'debug-only':
      return 'assumption-backed';
  }
}

function specModeRank(specMode: ParameterView['specMode']): number {
  switch (specMode) {
    case 'Realistic':
      return 0;
    case 'Advanced':
      return 1;
    case 'Sensitivity':
      return 2;
    case 'Internal-only':
      return 3;
    default:
      return 4;
  }
}

function compareParameterViews(left: ParameterView, right: ParameterView): number {
  const modeDelta = specModeRank(left.specMode) - specModeRank(right.specMode);
  if (modeDelta !== 0) return modeDelta;
  return left.parameterId.localeCompare(right.parameterId);
}

// ---------------------------------------------------------------------------
// ParameterView
// ---------------------------------------------------------------------------

/**
 * Per-profile view of one parameter registry entry.
 * Backed by Phase 1 PARAMETER_REGISTRY + ProfileParameterBinding.
 *
 * @version v1-draft
 */
export interface ParameterView {
  parameterId: string;
  profileId: string;
  value: number | string | boolean;
  unit?: string;
  tier: 'normative' | 'paper-backed' | 'standard-backed' | 'assumption-backed';
  specMode?: 'Realistic' | 'Advanced' | 'Sensitivity' | 'Internal-only';
  sourceId?: string;
}

/**
 * Response to a parameter metadata query for one profile.
 *
 * @version v1-draft
 */
export interface ParameterMetadataResponse {
  profileId: string;
  parameters: ParameterView[];
}
