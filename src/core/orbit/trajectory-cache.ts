/**
 * Pre-computed trajectory cache with cubic Hermite interpolation.
 *
 * Tier: normative (structural contract)
 * Source: adapted from beamHO-bench trajectory-cache pattern
 *         ASSUME-TRAJECTORY-CACHE-PRECOMPUTE
 *
 * Computes satellite az/el/range at fixed intervals, identifies passes,
 * and provides smooth interpolated positions for any simulation time.
 */

import type {
  OrbitElement,
  TrajectorySample,
  SatellitePass,
  TrajectoryCache,
} from './types';
import { MIN_VISIBLE_ELEVATION_DEG } from '@/core/common/constants';
import { propagateOrbitElement } from './propagation';
import { propagateGeo } from './geo-stationary';
import { createObserverContext, computeTopocentricPoint } from './topocentric';

// ── Public options ──

export interface BuildCacheOptions {
  elements: OrbitElement[];
  observerLatDeg: number;
  observerLonDeg: number;
  observerAltKm?: number;
  durationSec: number;
  /** Sample interval in seconds (default 10). */
  stepSec?: number;
  /** Minimum elevation for pass detection (default 5°). */
  minElevationDeg?: number;
  /** Simulation epoch in UTC milliseconds. */
  epochUtcMs: number;
}

// ── Constants ──

/** Buffer below minElevation for smooth entry/exit transitions (degrees). */
const PASS_BUFFER_DEG = 2;

/** Minimum pass duration to keep (seconds). Short blips are noise. */
const MIN_PASS_DURATION_SEC = 30;

/** Elevation threshold above which we switch to Cartesian interpolation (degrees). */
const HIGH_ELEVATION_THRESHOLD_DEG = 55;

const DEG_TO_RAD = Math.PI / 180;

// ── Cubic Hermite (Catmull-Rom) ──

function cubicHermite(
  y0: number, y1: number, y2: number, y3: number, t: number,
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * y1) +
    (-y0 + y2) * t +
    (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 +
    (-y0 + 3 * y1 - 3 * y2 + y3) * t3
  );
}

// ── Cache builder ──

export function buildTrajectoryCache(opts: BuildCacheOptions): TrajectoryCache {
  const {
    elements,
    observerLatDeg,
    observerLonDeg,
    observerAltKm = 0,
    durationSec,
    stepSec = 10,
    minElevationDeg = MIN_VISIBLE_ELEVATION_DEG,
    epochUtcMs,
  } = opts;

  const observer = createObserverContext(observerLatDeg, observerLonDeg, observerAltKm);
  const nSteps = Math.floor(durationSec / stepSec) + 1;
  const trackingThresholdDeg = minElevationDeg - PASS_BUFFER_DEG;
  const passesBySatId = new Map<string, SatellitePass[]>();

  for (const elem of elements) {
    // 1. Propagate all time steps
    const samples: TrajectorySample[] = new Array(nSteps);
    for (let i = 0; i < nSteps; i++) {
      const timeSec = i * stepSec;
      const utcMs = epochUtcMs + timeSec * 1000;
      const point = elem.orbitType === 'geo'
        ? propagateGeo(elem, utcMs)
        : propagateOrbitElement(elem, utcMs);
      const topo = computeTopocentricPoint(observer, point.ecefKm);
      samples[i] = {
        timeSec,
        azimuthDeg: topo.azimuthDeg,
        elevationDeg: topo.elevationDeg,
        rangeKm: topo.rangeKm,
        latDeg: point.latDeg,
        lonDeg: point.lonDeg,
        altKm: point.altKm,
        isVisible: topo.elevationDeg >= minElevationDeg,
      };
    }

    // 2. Unwrap azimuth for smooth interpolation (avoid 359°→1° jumps)
    for (let i = 1; i < nSteps; i++) {
      let diff = samples[i].azimuthDeg - samples[i - 1].azimuthDeg;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      samples[i] = { ...samples[i], azimuthDeg: samples[i - 1].azimuthDeg + diff };
    }

    // 3. Identify passes (continuous segments above trackingThreshold)
    const passes: SatellitePass[] = [];
    let inPass = false;
    let passStartIdx = 0;
    let peakElev = -90;

    for (let i = 0; i < nSteps; i++) {
      const above = samples[i].elevationDeg > trackingThresholdDeg;
      if (above && !inPass) {
        inPass = true;
        passStartIdx = i;
        peakElev = samples[i].elevationDeg;
      } else if (above && inPass) {
        peakElev = Math.max(peakElev, samples[i].elevationDeg);
      } else if (!above && inPass) {
        inPass = false;
        finishPass(passes, elem.id, samples, passStartIdx, i - 1, peakElev, stepSec);
      }
    }
    if (inPass) {
      finishPass(passes, elem.id, samples, passStartIdx, nSteps - 1, peakElev, stepSec);
    }

    if (passes.length > 0) {
      passesBySatId.set(elem.id, passes);
    }
  }

  return {
    epochUtcMs,
    durationSec,
    stepSec,
    totalSatellites: elements.length,
    passesBySatId,
  };
}

function finishPass(
  passes: SatellitePass[],
  satId: string,
  samples: TrajectorySample[],
  startIdx: number,
  endIdx: number,
  peakElev: number,
  stepSec: number,
): void {
  const duration = (endIdx - startIdx) * stepSec;
  if (duration < MIN_PASS_DURATION_SEC || peakElev <= 0) return;
  passes.push({
    satId,
    startTimeSec: samples[startIdx].timeSec,
    endTimeSec: samples[endIdx].timeSec,
    peakElevationDeg: peakElev,
    samples: samples.slice(startIdx, endIdx + 1),
  });
}

// ── Interpolation ──

export function interpolatePass(
  pass: SatellitePass, timeSec: number,
): TrajectorySample | null {
  const { samples } = pass;
  if (samples.length === 0) return null;
  if (timeSec < samples[0].timeSec || timeSec > samples[samples.length - 1].timeSec) {
    return null;
  }

  const stepSec = samples.length > 1 ? samples[1].timeSec - samples[0].timeSec : 1;
  const fi = (timeSec - samples[0].timeSec) / stepSec;
  const i1 = Math.floor(fi);
  const t = fi - i1;

  const maxIdx = samples.length - 1;
  const idx1 = Math.max(0, Math.min(i1, maxIdx));
  const idx0 = Math.max(0, idx1 - 1);
  const idx2 = Math.min(maxIdx, idx1 + 1);
  const idx3 = Math.min(maxIdx, idx1 + 2);

  const s0 = samples[idx0], s1 = samples[idx1];
  const s2 = samples[idx2], s3 = samples[idx3];

  const rangeKm = cubicHermite(s0.rangeKm, s1.rangeKm, s2.rangeKm, s3.rangeKm, t);
  const latDeg = cubicHermite(s0.latDeg, s1.latDeg, s2.latDeg, s3.latDeg, t);
  const lonDeg = cubicHermite(s0.lonDeg, s1.lonDeg, s2.lonDeg, s3.lonDeg, t);
  const altKm = cubicHermite(s0.altKm, s1.altKm, s2.altKm, s3.altKm, t);

  // High elevation: interpolate in Cartesian (E,N,U) to avoid polar singularity
  const highEl = s0.elevationDeg > HIGH_ELEVATION_THRESHOLD_DEG
    || s1.elevationDeg > HIGH_ELEVATION_THRESHOLD_DEG
    || s2.elevationDeg > HIGH_ELEVATION_THRESHOLD_DEG
    || s3.elevationDeg > HIGH_ELEVATION_THRESHOLD_DEG;

  let azimuthDeg: number;
  let elevationDeg: number;

  if (highEl) {
    // Convert az/el to hemisphere Cartesian: x=cos(el)*sin(az), y=sin(el), z=cos(el)*cos(az)
    const toCart = (s: TrajectorySample) => {
      const elR = s.elevationDeg * DEG_TO_RAD;
      const azR = s.azimuthDeg * DEG_TO_RAD;
      const ce = Math.cos(elR);
      return { x: ce * Math.sin(azR), y: Math.sin(elR), z: ce * Math.cos(azR) };
    };
    const c0 = toCart(s0), c1 = toCart(s1), c2 = toCart(s2), c3 = toCart(s3);

    const hx = cubicHermite(c0.x, c1.x, c2.x, c3.x, t);
    const hy = cubicHermite(c0.y, c1.y, c2.y, c3.y, t);
    const hz = cubicHermite(c0.z, c1.z, c2.z, c3.z, t);

    elevationDeg = Math.asin(Math.max(-1, Math.min(1, hy))) / DEG_TO_RAD;
    azimuthDeg = Math.atan2(hx, hz) / DEG_TO_RAD;
    if (azimuthDeg < 0) azimuthDeg += 360;
  } else {
    // Standard az/el interpolation (azimuth already unwrapped in cache)
    azimuthDeg = cubicHermite(
      s0.azimuthDeg, s1.azimuthDeg, s2.azimuthDeg, s3.azimuthDeg, t,
    );
    azimuthDeg = ((azimuthDeg % 360) + 360) % 360;
    elevationDeg = cubicHermite(
      s0.elevationDeg, s1.elevationDeg, s2.elevationDeg, s3.elevationDeg, t,
    );
  }

  return {
    timeSec,
    azimuthDeg,
    elevationDeg,
    rangeKm,
    latDeg,
    lonDeg,
    altKm,
    isVisible: elevationDeg >= (pass.peakElevationDeg > 0 ? 0 : -90), // approximate
  };
}

// ── Query ──

export function getActivePassesAt(
  cache: TrajectoryCache, timeSec: number,
): Array<{ satId: string; pass: SatellitePass }> {
  const result: Array<{ satId: string; pass: SatellitePass }> = [];
  for (const [satId, passes] of cache.passesBySatId) {
    for (const pass of passes) {
      if (timeSec >= pass.startTimeSec && timeSec <= pass.endTimeSec) {
        result.push({ satId, pass });
      }
    }
  }
  return result;
}
