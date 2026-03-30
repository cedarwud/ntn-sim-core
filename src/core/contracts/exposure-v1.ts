/**
 * Exposure Contract v1 — profile-list, HandoverType, and parameter exposure contracts.
 *
 * @version v1
 * @frozen — breaking changes require a new file: exposure-v2.ts
 *
 * Sources: profiles/defaults.ts + profile-composer.ts (for getProfileList); profiles/types.ts (HandoverType)
 * Consumers: src/viz/overlays/ControlPanel.tsx, future estnet-ui-kickoff
 * Forbidden imports in this file: engine.ts, runner/, React, hardcoded profile arrays
 *
 * Phase 4 Group 2 — phase4-runtime-contract-sdd.md §4.4
 */

import { DEFAULT_PROFILES } from '@/core/profiles/defaults';
import { decomposeProfile } from '@/core/profiles/profile-composer';

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
 * Backed by ProfileBundle.exposurePreset — NOT backed by hardcoded ControlPanel arrays.
 * Ordering: Realistic → Advanced → Sensitivity; within tier: DEFAULT_PROFILES declaration order.
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
 * Data source: DEFAULT_PROFILES → decomposeProfile → bundle.exposurePreset
 * NOT backed by the hardcoded PROFILE_OPTIONS constant in ControlPanel.tsx.
 *
 * Ordering contract (stable across versions):
 *   1. 'Realistic' tier entries
 *   2. 'Advanced' tier entries
 *   3. 'Sensitivity' tier entries
 *   Within each tier: order matches DEFAULT_PROFILES declaration order.
 *
 * Expected return: 14 entries (one per profile in DEFAULT_PROFILES).
 *
 * @version v1
 * @frozen — signature is stable; the 14-entry set expands only in Phase 5+
 */
export function getProfileList(): ProfileListEntry[] {
  const tierOrder: Record<string, number> = {
    'Realistic': 0,
    'Advanced': 1,
    'Sensitivity': 2,
  };

  const raw: Array<ProfileListEntry & { _insertionOrder: number }> = [];
  let idx = 0;

  for (const [id, config] of Object.entries(DEFAULT_PROFILES)) {
    const { bundle } = decomposeProfile(config);
    const { tier, label } = bundle.exposurePreset;

    // Internal-only tier is excluded from the consumer-facing list
    if (tier === 'Internal-only') { idx++; continue; }

    raw.push({
      id,
      family: String(bundle.family),
      tier: tier as 'Realistic' | 'Advanced' | 'Sensitivity',
      label,
      _insertionOrder: idx,
    });
    idx++;
  }

  // Sort: tier order first, then insertion order within tier
  raw.sort((a, b) => {
    const ta = tierOrder[a.tier] ?? 99;
    const tb = tierOrder[b.tier] ?? 99;
    if (ta !== tb) return ta - tb;
    return a._insertionOrder - b._insertionOrder;
  });

  // Strip internal bookkeeping field
  return raw.map(({ _insertionOrder, ...entry }) => entry);
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
