/**
 * Default profile registry — thin re-export index.
 *
 * Every profile is authored in its per-family file and re-exported here.
 * `DEFAULT_PROFILES` assembles the full runtime registry.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §6
 *   - Baselines: sdd/ntn-sim-core-profile-baselines.md §4–§7
 *   - Phase 3 Group 3: sdd/phase3-scenario-profile-experiment-split.md §8.3 (P3-4)
 *   - This file must not import React, Three.js, or scene code.
 */

import type { ProfileConfig } from './types';

// Per-family profile exports
export {
  CASE9_ACCESS_BASELINE,
  CASE9_DAPS_BASELINE,
  SINR_ELEVATION_REPRODUCTION,
  TIMER_CHO_REPRODUCTION,
} from './defaults-access';

export {
  HOBS_MULTIBEAM_BASELINE,
  HOBS_REPRODUCTION,
} from './defaults-hobs';

export {
  BH_RESOURCE_BASELINE,
  BH_RESOURCE_ENERGY_PROOF,
  BH_PF_BASELINE,
  BH_SINR_GREEDY_BASELINE,
} from './defaults-bh';

export {
  REAL_TRACE_VALIDATION,
  MEO_CONSTELLATION_BASELINE,
  GEO_RELAY_BASELINE,
  REALISTIC_FIRST_SCREEN,
} from './defaults-misc';

// Re-import for DEFAULT_PROFILES assembly
import {
  CASE9_ACCESS_BASELINE,
  CASE9_DAPS_BASELINE,
  SINR_ELEVATION_REPRODUCTION,
  TIMER_CHO_REPRODUCTION,
} from './defaults-access';

import {
  HOBS_MULTIBEAM_BASELINE,
  HOBS_REPRODUCTION,
} from './defaults-hobs';

import {
  BH_RESOURCE_BASELINE,
  BH_RESOURCE_ENERGY_PROOF,
  BH_PF_BASELINE,
  BH_SINR_GREEDY_BASELINE,
} from './defaults-bh';

import {
  REAL_TRACE_VALIDATION,
  MEO_CONSTELLATION_BASELINE,
  GEO_RELAY_BASELINE,
  REALISTIC_FIRST_SCREEN,
} from './defaults-misc';

// ---------------------------------------------------------------------------
// DEFAULT_PROFILES registry
// ---------------------------------------------------------------------------

export const DEFAULT_PROFILES: Record<string, ProfileConfig> = {
  'case9-access-baseline': CASE9_ACCESS_BASELINE,
  'hobs-multibeam-baseline': HOBS_MULTIBEAM_BASELINE,
  'bh-resource-baseline': BH_RESOURCE_BASELINE,
  'bh-resource-energy-proof': BH_RESOURCE_ENERGY_PROOF,
  'bh-pf-baseline': BH_PF_BASELINE,
  'bh-sinr-greedy-baseline': BH_SINR_GREEDY_BASELINE,
  'real-trace-validation': REAL_TRACE_VALIDATION,
  'case9-daps-baseline': CASE9_DAPS_BASELINE,
  'meo-constellation-baseline': MEO_CONSTELLATION_BASELINE,
  'geo-relay-baseline': GEO_RELAY_BASELINE,
  'sinr-elevation-reproduction': SINR_ELEVATION_REPRODUCTION,
  'hobs-reproduction': HOBS_REPRODUCTION,
  'timer-cho-reproduction': TIMER_CHO_REPRODUCTION,
  'realistic-first-screen': REALISTIC_FIRST_SCREEN,
};
