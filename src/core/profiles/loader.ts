/**
 * Profile loader, resolver, serializer, and validator.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §6
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §4.2, §4.3
 *   - This file must not import React, Three.js, or scene code.
 */

import type { ProfileConfig, ValidationResult } from './types';
import type { WalkerConfig } from '@/core/orbit/types';
import { DEFAULT_PROFILES } from './defaults';

// ---------------------------------------------------------------------------
// Walker constellation builder (A4: multi-shell support)
// ---------------------------------------------------------------------------

/**
 * Build a WalkerConfig from a ProfileConfig, supporting multi-shell constellations.
 *
 * The primary shell is defined by orbital.altitude_km / inclination_deg / num_planes / sats_per_plane.
 * Additional shells come from orbital.extra_shells[] (A4 extension).
 *
 * @source leo-beam-sim/src/engine/orbit/walker-constellation.ts (5-shell model)
 */
export function buildWalkerConfig(profile: ProfileConfig, epochUtcMs: number): WalkerConfig {
  const orb = profile.orbital;

  const primaryShell = {
    id: `${profile.id}-shell`,
    altitudeKm: orb.altitude_km,
    inclinationDeg: orb.inclination_deg,
    planes: orb.num_planes,
    satsPerPlane: orb.sats_per_plane,
    phasingFactor: orb.phasing_factor ?? Math.floor(orb.num_planes / 2),
    orbitType: orb.orbitType,
  };

  const extraShells = (orb.extra_shells ?? []).map((s, i) => ({
    id: s.id ?? `shell-${i + 1}`,
    altitudeKm: s.altitude_km,
    inclinationDeg: s.inclination_deg,
    planes: s.num_planes,
    satsPerPlane: s.sats_per_plane,
    phasingFactor: s.phasing_factor ?? 1,
    orbitType: s.orbitType,
  }));

  return {
    shells: [primaryShell, ...extraShells],
    epochUtcMs,
  };
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

/**
 * Load a profile by ID from the built-in defaults.
 * Throws if the profile ID is not found.
 */
export function loadProfile(id: string): ProfileConfig {
  const profile = DEFAULT_PROFILES[id];
  if (!profile) {
    const known = Object.keys(DEFAULT_PROFILES).join(', ');
    throw new Error(`Unknown profile "${id}". Known profiles: ${known}`);
  }
  // Return a deep copy to prevent mutation of defaults
  return JSON.parse(JSON.stringify(profile)) as ProfileConfig;
}

// ---------------------------------------------------------------------------
// Resolve (deep merge)
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  overrides: Partial<T>,
): T {
  const result = { ...base };
  for (const key of Object.keys(overrides) as Array<keyof T>) {
    const ov = overrides[key];
    if (ov === undefined) continue;
    const bv = base[key];
    if (isPlainObject(bv) && isPlainObject(ov)) {
      (result as Record<string, unknown>)[key as string] = deepMerge(
        bv as Record<string, unknown>,
        ov as Record<string, unknown>,
      );
    } else {
      (result as Record<string, unknown>)[key as string] = ov;
    }
  }
  return result;
}

/**
 * Resolve a profile by deep-merging overrides onto a base profile.
 * Arrays are replaced wholesale, not merged element-wise.
 */
export function resolveProfile(
  base: ProfileConfig,
  overrides: Partial<ProfileConfig>,
): ProfileConfig {
  return deepMerge(
    base as unknown as Record<string, unknown>,
    overrides as unknown as Partial<Record<string, unknown>>,
  ) as unknown as ProfileConfig;
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

/**
 * Serialize a profile to a deterministic JSON string for manifests.
 */
export function serializeProfile(config: ProfileConfig): string {
  return JSON.stringify(config, null, 2);
}

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------

const REQUIRED_TOP_LEVEL: Array<keyof ProfileConfig> = [
  'id',
  'family',
  'version',
  'orbitMode',
  'beamSemantics',
  'observer',
  'timeControl',
  'seed',
  'orbital',
  'rf',
  'antenna',
  'beam',
  'channel',
  'handover',
  'energy',
  'ueConfig',
];

/**
 * Validate a profile config for required fields and tier consistency.
 */
export function validateProfile(config: ProfileConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required top-level fields
  for (const field of REQUIRED_TOP_LEVEL) {
    if (config[field] === undefined || config[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // tier0_fspl must always be true
  if (config.channel && config.channel.tier0_fspl !== true) {
    errors.push('channel.tier0_fspl must be true (FSPL is mandatory for all profiles)');
  }

  // Multi-beam profiles must have tier3_beam_gain enabled
  if (config.beam && config.beam.num_beams > 1 && config.channel && !config.channel.tier3_beam_gain) {
    warnings.push('Multi-beam profile has tier3_beam_gain disabled — beam gain is mandatory for multi-beam/BH studies');
  }

  if (config.beam?.tracking_mode === 'nadir-relative-bounded-steering') {
    if (config.beam.steering_bound_km === undefined) {
      errors.push('beam.steering_bound_km is required when beam.tracking_mode="nadir-relative-bounded-steering"');
    } else if (!Number.isFinite(config.beam.steering_bound_km) || config.beam.steering_bound_km < 0) {
      errors.push('beam.steering_bound_km must be a finite non-negative number');
    }
  }

  // Ka-band profiles should have tier4_atmospheric
  if (config.rf && config.rf.frequency_ghz >= 26 && config.channel && !config.channel.tier4_atmospheric) {
    warnings.push('Ka-band frequency detected but tier4_atmospheric is disabled');
  }

  // Seed must be a finite integer
  if (config.seed !== undefined && (!Number.isFinite(config.seed) || config.seed !== Math.floor(config.seed))) {
    errors.push('seed must be a finite integer');
  }

  // timeControl sanity
  if (config.timeControl) {
    if (config.timeControl.durationSec <= 0) {
      errors.push('timeControl.durationSec must be positive');
    }
    if (config.timeControl.stepSec <= 0) {
      errors.push('timeControl.stepSec must be positive');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
