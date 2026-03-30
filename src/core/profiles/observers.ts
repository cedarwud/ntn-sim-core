/**
 * Shared observer presets and profile-authoring constants.
 *
 * Extracted from defaults.ts during Phase 3 Group 3 file split
 * (phase3-scenario-profile-experiment-split.md §8.2 P3-4e).
 *
 * All per-family defaults files import from here.
 * This file must not import React, Three.js, or scene code.
 */

// ---------------------------------------------------------------------------
// Observer locations
// ---------------------------------------------------------------------------

export const BEIJING_OBSERVER = {
  id: 'beijing',
  name: 'Beijing',
  latitudeDeg: 40.0,
  longitudeDeg: 116.0,
  altitudeM: 50,
} as const;

/** Observer in the 40–45°N sweet spot for 53° inclination Walker constellations. */
export const MONTREAL_OBSERVER = {
  id: 'montreal',
  name: 'Montréal',
  latitudeDeg: 45.5,
  longitudeDeg: -73.6,
  altitudeM: 36,
} as const;

export const NTPU_OBSERVER = {
  id: 'ntpu',
  name: 'National Taipei University',
  latitudeDeg: 24.9441667,
  longitudeDeg: 121.3713889,
  altitudeM: 50,
} as const;

// ---------------------------------------------------------------------------
// Shared authoring constants (used across multiple family files)
// ---------------------------------------------------------------------------

export const DEFAULT_IMPLEMENTATION_LOSS_DB = 2.5;

export const SUBURBAN = 'suburban' as const;
export const RURAL = 'rural' as const;

export const BASELINE_LARGE_SCALE = '3gpp-baseline' as const;
export const EXTENDED_LARGE_SCALE = '3gpp-extended' as const;
