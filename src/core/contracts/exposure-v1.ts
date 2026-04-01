/**
 * Exposure Contract v1 — profile-list, HandoverType, and parameter exposure contracts.
 *
 * @version v1
 * @frozen — breaking changes require a new file: exposure-v2.ts
 *
 * Sources: profiles/profile-exposure-catalog.ts (for getProfileList); profiles/types.ts (HandoverType)
 * Consumers: src/viz/overlays/ControlPanel.tsx, future estnet-ui-kickoff
 * Forbidden imports in this file: engine.ts, runner/, React, hardcoded profile arrays
 *
 * Phase 4 Group 2 — phase4-runtime-contract-sdd.md §4.4
 */

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
// ParameterView (stub — @decision-pending DP3)
// ---------------------------------------------------------------------------

/**
 * Per-profile view of one parameter registry entry.
 * Backed by Phase 1 PARAMETER_REGISTRY + ProfileParameterBinding.
 *
 * @version v1-draft
 * @decision-pending — DECISION-POINT-DP3: full field set deferred until first active consumer (MODQN/estnet).
 *   Group 2 must create this stub; Group 2 must NOT expand it beyond this definition unless an active
 *   Phase 4 consumer (ControlPanel, useBatchKpi, runner-exposure-api) explicitly requires it.
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
 * @decision-pending — DECISION-POINT-DP3: deferred until MODQN/estnet needs it.
 */
export interface ParameterMetadataResponse {
  profileId: string;
  parameters: ParameterView[];
}
