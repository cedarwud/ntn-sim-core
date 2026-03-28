import type { ProfileConfig } from '@/core/profiles/types';

import type { OrbitElement, TrajectoryCache } from './types';
import { buildWalkerConfig } from '@/core/profiles/loader';
import { generateWalkerConstellation } from './walker';
import { geoConfigToOrbitElements } from './geo-stationary';
import { buildTrajectoryCache } from './trajectory-cache';

/**
 * Interactive orbit cache step shared by browser-facing live/replay paths.
 * This keeps the frontend orbit path deterministic across its own entry points
 * without forcing benchmark-grade cache density into the browser.
 */
export const INTERACTIVE_TRAJECTORY_CACHE_STEP_SEC = 10;

export function buildSyntheticOrbitElements(profile: ProfileConfig): OrbitElement[] {
  const elements = generateWalkerConstellation(
    buildWalkerConfig(profile, profile.timeControl.epochUtcMs),
  );

  if (!profile.orbital.geoSatellites) {
    return elements;
  }

  return [
    ...elements,
    ...geoConfigToOrbitElements(profile.orbital.geoSatellites, profile.timeControl.epochUtcMs),
  ];
}

export function buildTrajectoryCacheForProfile(
  profile: ProfileConfig,
  elements: OrbitElement[],
  stepSec: number = profile.timeControl.stepSec,
): TrajectoryCache {
  return buildTrajectoryCache({
    elements,
    observerLatDeg: profile.observer.latitudeDeg,
    observerLonDeg: profile.observer.longitudeDeg,
    observerAltKm: profile.observer.altitudeM / 1000,
    durationSec: profile.timeControl.durationSec,
    stepSec,
    epochUtcMs: profile.timeControl.epochUtcMs,
  });
}

export function buildInteractiveTrajectoryCache(
  profile: ProfileConfig,
  elements: OrbitElement[],
): TrajectoryCache {
  return buildTrajectoryCacheForProfile(
    profile,
    elements,
    INTERACTIVE_TRAJECTORY_CACHE_STEP_SEC,
  );
}
