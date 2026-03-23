/**
 * Pass ranking for showcase window selection.
 *
 * Ranks satellite passes by quality (elevation, duration, concurrency)
 * to enable deterministic selection of visually interesting replay windows.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md $10
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md $4.4
 *   - This file must not import React, Three.js, or scene code.
 */

import type { TrajectoryCache, SatellitePass } from '@/core/orbit/types';

export interface PassRankCriteria {
  /** Weight for peak elevation (higher = better view). */
  elevationWeight: number;
  /** Weight for pass duration (longer = more events). */
  durationWeight: number;
  /** Weight for simultaneous visible satellites (more = richer HO candidates). */
  concurrencyWeight: number;
}

export const DEFAULT_RANK_CRITERIA: PassRankCriteria = {
  elevationWeight: 1.0,
  durationWeight: 0.5,
  concurrencyWeight: 0.8,
};

export interface RankedPass {
  satId: string;
  startTimeSec: number;
  endTimeSec: number;
  peakElevationDeg: number;
  durationSec: number;
  score: number;
}

/** Collect all passes from a trajectory cache into a flat array. */
function collectAllPasses(cache: TrajectoryCache): SatellitePass[] {
  const all: SatellitePass[] = [];
  for (const passes of cache.passesBySatId.values()) {
    for (const p of passes) {
      all.push(p);
    }
  }
  return all;
}

/**
 * Count how many other passes are active at a given time.
 * A pass is active when startTimeSec <= t <= endTimeSec.
 */
function countConcurrentPasses(
  allPasses: SatellitePass[],
  targetPass: SatellitePass,
  atTimeSec: number,
): number {
  let count = 0;
  for (const p of allPasses) {
    if (p === targetPass) continue;
    if (p.startTimeSec <= atTimeSec && atTimeSec <= p.endTimeSec) {
      count++;
    }
  }
  return count;
}

/** Find the time of peak elevation within a pass. */
function peakTimeSec(pass: SatellitePass): number {
  if (pass.samples.length === 0) {
    return (pass.startTimeSec + pass.endTimeSec) / 2;
  }
  let best = pass.samples[0];
  for (const s of pass.samples) {
    if (s.elevationDeg > best.elevationDeg) best = s;
  }
  return best.timeSec;
}

/** Rank all passes in a trajectory cache. */
export function rankPasses(
  cache: TrajectoryCache,
  criteria?: PassRankCriteria,
): RankedPass[] {
  const c = criteria ?? DEFAULT_RANK_CRITERIA;
  const allPasses = collectAllPasses(cache);

  if (allPasses.length === 0) return [];

  // Pre-compute raw values
  const raw: Array<{
    pass: SatellitePass;
    duration: number;
    concurrent: number;
  }> = [];

  let maxEl = 0;
  let maxDur = 0;
  let maxConc = 0;

  for (const pass of allPasses) {
    const duration = pass.endTimeSec - pass.startTimeSec;
    const pt = peakTimeSec(pass);
    const concurrent = countConcurrentPasses(allPasses, pass, pt);

    if (pass.peakElevationDeg > maxEl) maxEl = pass.peakElevationDeg;
    if (duration > maxDur) maxDur = duration;
    if (concurrent > maxConc) maxConc = concurrent;

    raw.push({ pass, duration, concurrent });
  }

  // Avoid division by zero
  if (maxEl === 0) maxEl = 1;
  if (maxDur === 0) maxDur = 1;
  if (maxConc === 0) maxConc = 1;

  const ranked: RankedPass[] = raw.map(({ pass, duration, concurrent }) => ({
    satId: pass.satId,
    startTimeSec: pass.startTimeSec,
    endTimeSec: pass.endTimeSec,
    peakElevationDeg: pass.peakElevationDeg,
    durationSec: duration,
    score:
      c.elevationWeight * (pass.peakElevationDeg / maxEl) +
      c.durationWeight * (duration / maxDur) +
      c.concurrencyWeight * (concurrent / maxConc),
  }));

  // Sort descending by score, break ties by earlier start time
  ranked.sort((a, b) => b.score - a.score || a.startTimeSec - b.startTimeSec);

  return ranked;
}
