/**
 * exposure-v1 — Frozen exposure / UI contract.
 *
 * @version v1
 * @frozen 2026-03-30 (Phase 4 Group 2 — phase4-runtime-contract-sdd.md §4.4)
 *
 * Consumer boundary:
 *   - src/viz/**  may import ProfileListEntry, HandoverType, getProfileList()
 *   - src/app/hooks/**  may import these types
 *
 * This file is the bridge layer: it may import from core internals
 * (profiles, common) to derive the stable consumer-facing API.
 *
 * Forbidden:
 *   This file must NOT import React, Three.js, @react-three, @/viz, @/app,
 *   or @/runner (SDD §5.1 F1–F4).
 */

import { PROFILE_EXPOSURE_PRESETS } from '@/core/profiles/profile-composer';
import { DEFAULT_PROFILES } from '@/core/profiles/defaults';

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type {
  /** @version v1 @frozen */
  HandoverType,
} from '@/core/profiles/types';

// ---------------------------------------------------------------------------
// ProfileListEntry
// ---------------------------------------------------------------------------

/**
 * A single entry in the UI profile list.
 *
 * @version v1
 * @frozen 2026-03-30 (phase4-runtime-contract-sdd.md §4.4)
 */
export interface ProfileListEntry {
  /** Stable profile identifier (matches ProfileConfig.id). */
  id: string;
  /** Profile family name (string, not the internal union). */
  family: string;
  /** UI tier classification. Internal-only profiles are excluded. */
  tier: 'Realistic' | 'Advanced' | 'Sensitivity';
  /** Human-readable display label for the UI dropdown. */
  label: string;
}

// ---------------------------------------------------------------------------
// getProfileList
// ---------------------------------------------------------------------------

/**
 * Returns the ordered list of profiles available for UI selection.
 *
 * Data source: PROFILE_EXPOSURE_PRESETS (phase3-scenario-profile-experiment-split.md §6)
 * combined with DEFAULT_PROFILES for family derivation.
 *
 * Guarantees (VAL-PLAT-010):
 *   - Returns exactly 14 entries (all non-Internal-only profiles).
 *   - Each entry has id, family, tier ∈ {Realistic, Advanced, Sensitivity}, label.
 *   - Data is NOT hardcoded here — it is derived from the authoritative presets.
 *
 * @version v1
 * @frozen 2026-03-30 (phase4-runtime-contract-sdd.md §4.4)
 */
export function getProfileList(): ProfileListEntry[] {
  const entries: ProfileListEntry[] = [];
  for (const [id, preset] of Object.entries(PROFILE_EXPOSURE_PRESETS)) {
    // Internal-only tier is excluded from the consumer-facing list
    if (preset.tier === 'Internal-only') continue;

    const profile = DEFAULT_PROFILES[id];
    const family: string = profile ? profile.family : id;

    entries.push({
      id,
      family,
      tier: preset.tier as 'Realistic' | 'Advanced' | 'Sensitivity',
      label: preset.label,
    });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// ParameterView (stub — @decision-pending DP3)
// ---------------------------------------------------------------------------

/**
 * @decision-pending DP3 (phase4-runtime-contract-sdd.md §9.3)
 * Stub for future per-parameter introspection API.
 * Shape not finalized for Phase 4 — do not build consumers against this type.
 * Will be stabilized in Phase 5 or downstream when a concrete consumer is defined.
 */
export interface ParameterView {
  path: string;
  value: unknown;
  specMode: string;
  sourceId: string;
}

/**
 * @decision-pending DP3 (phase4-runtime-contract-sdd.md §9.3)
 * Stub for future parameter metadata response.
 * Shape not finalized for Phase 4 — do not build consumers against this type.
 */
export interface ParameterMetadataResponse {
  profileId: string;
  parameters: ParameterView[];
}
