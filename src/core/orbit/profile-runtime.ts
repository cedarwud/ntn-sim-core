import type { ProfileConfig } from '@/core/profiles/types';
import type { OrbitElement, TrajectoryCache } from './types';
import { buildWalkerConfig } from '@/core/profiles/loader';
import { generateWalkerConstellation } from './walker';
import { geoConfigToOrbitElements } from './geo-stationary';
import { buildTrajectoryCache } from './trajectory-cache';
import { loadOmmRecords, ommToSatrecs, sampleRecords } from './tle-loader';
import { satrecsToOrbitElements } from './sgp4-adapter';

/**
 * Phase 5 Core Structural Split: Orbit Profile Runtime.
 * Ownership: Single owner of ProfileConfig -> OrbitElement[] -> TrajectoryCache construction.
 */

export const INTERACTIVE_TRAJECTORY_CACHE_STEP_SEC = 10;

/**
 * Resolve constellation elements from profile (Walker synthetic or OMM/TLE real-trace).
 * Real-trace elements retain SatRec metadata so cache construction can sample
 * from SGP4 without changing the later cache-backed consume path.
 * Ownership: P5-4 migration from benchmark-runner.ts.
 */
export function resolveProfileOrbitElements(
  profile: ProfileConfig,
  tleOmmData?: import('./tle-loader').OmmRecord[],
): OrbitElement[] {
  if (profile.orbitMode === 'real-trace' && tleOmmData) {
    let records = loadOmmRecords(tleOmmData);
    const maxSats = profile.tleMaxSatellites ?? 200;
    if (records.length > maxSats) {
      records = sampleRecords(records, maxSats, profile.seed);
    }
    const satrecs = ommToSatrecs(records);
    return satrecsToOrbitElements(satrecs);
  }

  // Synthetic: Walker constellation (A4: multi-shell via buildWalkerConfig)
  const walkerElements = generateWalkerConstellation(
    buildWalkerConfig(profile, profile.timeControl.epochUtcMs),
  );

  // GEO fixed-position satellites
  const geoElements = profile.orbital.geoSatellites
    ? geoConfigToOrbitElements(profile.orbital.geoSatellites, profile.timeControl.epochUtcMs)
    : [];

  return [...walkerElements, ...geoElements];
}

export async function resolveProfileOrbitElementsAsync(
  profile: ProfileConfig,
): Promise<OrbitElement[]> {
  if (profile.orbitMode === 'real-trace' && profile.tleDataPath) {
    const response = await fetch(profile.tleDataPath);
    if (!response.ok) {
      throw new Error(`[resolveProfileOrbitElementsAsync] Failed to load OMM/TLE fixture: ${profile.tleDataPath}`);
    }
    const ommJson = await response.json();
    if (!Array.isArray(ommJson)) {
      throw new Error(`[resolveProfileOrbitElementsAsync] Expected OMM/TLE array fixture: ${profile.tleDataPath}`);
    }
    return resolveProfileOrbitElements(
      profile,
      ommJson as import('./tle-loader').OmmRecord[],
    );
  }

  return resolveProfileOrbitElements(profile);
}

/**
 * Build trajectory cache from profile and its resolved elements.
 * SatRec-backed real-trace elements are sampled through SGP4 during cache
 * construction; geometry/runtime still consume the cache after build time.
 * Ownership: P5-4 migration from benchmark-runner.ts.
 */
export function buildProfileTrajectoryCache(
  profile: ProfileConfig,
  elements: OrbitElement[],
  densityOverride?: number,
): TrajectoryCache {
  return buildTrajectoryCache({
    elements,
    observerLatDeg: profile.observer.latitudeDeg,
    observerLonDeg: profile.observer.longitudeDeg,
    observerAltKm: profile.observer.altitudeM / 1000,
    durationSec: profile.timeControl.durationSec,
    stepSec: densityOverride ?? profile.timeControl.stepSec,
    epochUtcMs: profile.timeControl.epochUtcMs,
  });
}

// --- Legacy / Transitional helpers (Phase 3 compatibility) ---

export function buildSyntheticOrbitElements(profile: ProfileConfig): OrbitElement[] {
  return resolveProfileOrbitElements(profile);
}

export function buildTrajectoryCacheForProfile(
  profile: ProfileConfig,
  elements: OrbitElement[],
  stepSec: number = profile.timeControl.stepSec,
): TrajectoryCache {
  return buildProfileTrajectoryCache(profile, elements, stepSec);
}

export function buildInteractiveTrajectoryCache(
  profile: ProfileConfig,
  elements: OrbitElement[],
): TrajectoryCache {
  return buildProfileTrajectoryCache(profile, elements, INTERACTIVE_TRAJECTORY_CACHE_STEP_SEC);
}

export async function buildInteractiveProfileRuntime(
  profile: ProfileConfig,
): Promise<{ elements: OrbitElement[]; trajectoryCache: TrajectoryCache }> {
  const elements = await resolveProfileOrbitElementsAsync(profile);
  return {
    elements,
    trajectoryCache: buildInteractiveTrajectoryCache(profile, elements),
  };
}
