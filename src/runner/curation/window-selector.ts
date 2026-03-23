/**
 * Showcase window selection via deterministic sliding-window search.
 *
 * Replaces manual "hand-picking pretty passes" with reproducible,
 * criteria-driven window selection (SDD $10).
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md $10
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md $4.4
 *   - This file must not import React, Three.js, or scene code.
 */

import type { TrajectoryCache, SatellitePass } from '@/core/orbit/types';
import type { ReplayManifest } from '@/core/trace/types';
import type { PresentationMode } from '@/core/common/types';
import { rankPasses, DEFAULT_RANK_CRITERIA } from './pass-ranker';
import type { PassRankCriteria } from './pass-ranker';

export interface WindowSelectionConfig {
  /** Desired window duration in seconds. */
  windowDurationSec: number;
  /** Selection strategy. */
  strategy: 'highest-elevation' | 'richest-handover' | 'best-combined';
  /** Criteria weights (for best-combined). */
  criteria?: PassRankCriteria;
}

export interface SelectedWindow {
  startTimeSec: number;
  endTimeSec: number;
  score: number;
  reason: string;
  /** How many unique satellites are visible during this window. */
  visibleSatelliteCount: number;
  /** Peak elevation among all passes in this window. */
  peakElevationDeg: number;
}

const SLIDE_STEP_SEC = 10;

/** Collect all passes from cache into a flat array. */
function collectAllPasses(cache: TrajectoryCache): SatellitePass[] {
  const all: SatellitePass[] = [];
  for (const passes of cache.passesBySatId.values()) {
    for (const p of passes) all.push(p);
  }
  return all;
}

/** Check if a pass overlaps a time window. */
function overlaps(
  pass: SatellitePass,
  wStart: number,
  wEnd: number,
): boolean {
  return pass.startTimeSec < wEnd && pass.endTimeSec > wStart;
}

/** Check if a pass starts or ends within a window (potential HO event). */
function hasTransitionInWindow(
  pass: SatellitePass,
  wStart: number,
  wEnd: number,
): boolean {
  return (
    (pass.startTimeSec >= wStart && pass.startTimeSec <= wEnd) ||
    (pass.endTimeSec >= wStart && pass.endTimeSec <= wEnd)
  );
}

/** Compute window metrics shared across strategies. */
function windowMetrics(
  allPasses: SatellitePass[],
  wStart: number,
  wEnd: number,
): { visibleSatIds: Set<string>; peakEl: number; transitions: number } {
  const visibleSatIds = new Set<string>();
  let peakEl = 0;
  let transitions = 0;

  for (const p of allPasses) {
    if (!overlaps(p, wStart, wEnd)) continue;
    visibleSatIds.add(p.satId);
    if (p.peakElevationDeg > peakEl) peakEl = p.peakElevationDeg;
    if (hasTransitionInWindow(p, wStart, wEnd)) transitions++;
  }

  return { visibleSatIds, peakEl, transitions };
}

/** Select the best replay window from a trajectory cache. */
export function selectBestWindow(
  cache: TrajectoryCache,
  config: WindowSelectionConfig,
): SelectedWindow {
  const allPasses = collectAllPasses(cache);
  const { windowDurationSec, strategy } = config;

  // Determine scan range
  const scanEnd = cache.durationSec - windowDurationSec;
  if (scanEnd < 0) {
    // Window larger than cache — use entire duration
    const m = windowMetrics(allPasses, 0, cache.durationSec);
    return {
      startTimeSec: 0,
      endTimeSec: cache.durationSec,
      score: 0,
      reason: 'window exceeds cache duration; using full range',
      visibleSatelliteCount: m.visibleSatIds.size,
      peakElevationDeg: m.peakEl,
    };
  }

  // For best-combined, pre-compute ranked pass scores keyed by identity
  let passScoreMap: Map<SatellitePass, number> | undefined;
  if (strategy === 'best-combined') {
    const ranked = rankPasses(cache, config.criteria ?? DEFAULT_RANK_CRITERIA);
    // Build a lookup from (satId, startTimeSec) to score
    const keyToScore = new Map<string, number>();
    for (const r of ranked) {
      keyToScore.set(`${r.satId}:${r.startTimeSec}`, r.score);
    }
    passScoreMap = new Map();
    for (const p of allPasses) {
      const s = keyToScore.get(`${p.satId}:${p.startTimeSec}`) ?? 0;
      passScoreMap.set(p, s);
    }
  }

  let bestScore = -Infinity;
  let bestStart = 0;

  for (let wStart = 0; wStart <= scanEnd; wStart += SLIDE_STEP_SEC) {
    const wEnd = wStart + windowDurationSec;
    let score: number;

    if (strategy === 'highest-elevation') {
      const m = windowMetrics(allPasses, wStart, wEnd);
      score = m.peakEl;
    } else if (strategy === 'richest-handover') {
      const m = windowMetrics(allPasses, wStart, wEnd);
      score = m.transitions;
    } else {
      // best-combined: sum of ranked pass scores for overlapping passes
      score = 0;
      for (const p of allPasses) {
        if (overlaps(p, wStart, wEnd)) {
          score += passScoreMap!.get(p) ?? 0;
        }
      }
    }

    if (score > bestScore || (score === bestScore && wStart < bestStart)) {
      bestScore = score;
      bestStart = wStart;
    }
  }

  const wEnd = bestStart + windowDurationSec;
  const m = windowMetrics(allPasses, bestStart, wEnd);

  const reasons: Record<string, string> = {
    'highest-elevation': `peak elevation ${m.peakEl.toFixed(1)}deg`,
    'richest-handover': `${m.transitions} pass transitions in window`,
    'best-combined': `combined score ${bestScore.toFixed(3)}`,
  };

  return {
    startTimeSec: bestStart,
    endTimeSec: wEnd,
    score: bestScore,
    reason: `${strategy}: ${reasons[strategy]}`,
    visibleSatelliteCount: m.visibleSatIds.size,
    peakElevationDeg: m.peakEl,
  };
}

/** Create a ReplayManifest from a selected window. */
export function createReplayManifestFromWindow(
  runId: string,
  window: SelectedWindow,
  presentationMode: PresentationMode,
): ReplayManifest {
  return {
    runId,
    windowStartSec: window.startTimeSec,
    windowEndSec: window.endTimeSec,
    selectionCriteria: window.reason,
    selectionMethod: 'deterministic-search',
    presentationMode,
  };
}
