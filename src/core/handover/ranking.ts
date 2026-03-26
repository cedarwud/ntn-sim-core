/**
 * Ranking-based handover baselines for cross-project benchmark comparisons.
 *
 * These are greedy decision policies (no TTT, no hysteresis) used as
 * simple reference baselines in benchmark mode.
 *
 * @source beamHO-bench/src/sim/handover/baseline-decisions.ts
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.3
 *   - This file must not import React, Three.js, or scene code.
 */

import type { HandoverConfig } from '@/core/profiles/types';
import type {
  HandoverManager,
  HandoverManagerState,
  HandoverTickInput,
  HandoverDecision,
  HandoverEvent,
  RlfState,
} from './types';

// ---------------------------------------------------------------------------
// Shared initial state helper
// ---------------------------------------------------------------------------

function initialRlf(): RlfState {
  return { phase: 'normal', n310Count: 0, n311Count: 0, t310StartSec: null };
}

function initialState(): HandoverManagerState {
  return {
    phase: 'idle',
    serving: null,
    pendingTarget: null,
    tttStartTimeSec: null,
    lastHoTimeSec: -Infinity,
    totalHandovers: 0,
    totalFailures: 0,
    totalPingPongs: 0,
    totalRlfs: 0,
    rlf: initialRlf(),
    events: [],
  };
}

// ---------------------------------------------------------------------------
// Factory: shared ranking manager logic
// ---------------------------------------------------------------------------

type RankFn = (a: { elevationDeg: number }, b: { elevationDeg: number }) => number;

function createRankingManager(
  config: HandoverConfig,
  rankFn: RankFn,
  label: string,
): HandoverManager {
  let state = initialState();
  const minElevationDeg = config.min_elevation_deg;

  function emit(event: HandoverEvent): void {
    state.events.push(event);
  }

  return {
    tick(opts: HandoverTickInput): HandoverDecision {
      const { tick, timeSec, candidates, servingElevationDeg } = opts;

      // Filter by min elevation
      const eligible = candidates.filter((c) => c.elevationDeg >= minElevationDeg);

      // Detach if serving sat no longer visible or below min elevation
      if (state.serving) {
        const servStillVisible = candidates.find((c) => c.satId === state.serving!.satId);
        const servBelowMin = servingElevationDeg !== null &&
          servingElevationDeg !== undefined &&
          servingElevationDeg < minElevationDeg;
        if (!servStillVisible || servBelowMin) {
          const oldSatId = state.serving.satId;
          state.serving = null;
          state.phase = 'idle';
          emit({ tick, timeSec, type: 'release', sourceSatId: oldSatId, reason: 'below-min-elevation' });
        }
      }

      // Initial attach
      if (!state.serving) {
        if (eligible.length === 0) return { type: 'none', reason: 'no-eligible' };
        const best = [...eligible].sort((a, b) => rankFn(b, a))[0];
        state.serving = { satId: best.satId, beamId: best.beamId, sinrDb: best.sinrDb, attachTimeSec: timeSec };
        state.phase = 'attached';
        emit({ tick, timeSec, type: 'attach', targetSatId: best.satId, reason: `${label}-attach` });
        return { type: 'attach', targetSatId: best.satId, targetBeamId: best.beamId, reason: `${label}-attach` };
      }

      // Ranking: always prefer the top-ranked candidate
      if (eligible.length === 0) return { type: 'none', reason: 'no-eligible' };
      const best = [...eligible].sort((a, b) => rankFn(b, a))[0];
      if (best.satId === state.serving.satId) return { type: 'none', reason: 'already-best' };

      // Hand over to better-ranked satellite
      const oldSatId = state.serving.satId;
      state.serving = { satId: best.satId, beamId: best.beamId, sinrDb: best.sinrDb, attachTimeSec: timeSec };
      state.totalHandovers++;
      emit({ tick, timeSec, type: 'ho-complete', sourceSatId: oldSatId, targetSatId: best.satId, reason: label });
      return { type: 'handover', targetSatId: best.satId, targetBeamId: best.beamId, reason: label };
    },

    getState(): Readonly<HandoverManagerState> {
      return state;
    },

    drainEvents(): HandoverEvent[] {
      const evts = state.events;
      state = { ...state, events: [] };
      return evts;
    },

    reset(): void {
      state = initialState();
    },
  };
}

// ---------------------------------------------------------------------------
// max-elevation: always attach to highest-elevation satellite
// ---------------------------------------------------------------------------

/**
 * Max-elevation baseline: attach to the satellite with highest elevation.
 * No TTT, no hysteresis. Simple greedy benchmark reference.
 *
 * @source beamHO-bench baseline-decisions.ts
 */
export function createMaxElevationManager(config: HandoverConfig): HandoverManager {
  return createRankingManager(
    config,
    (a, b) => a.elevationDeg - b.elevationDeg,
    'max-elevation',
  );
}

// ---------------------------------------------------------------------------
// max-remaining-time: attach to satellite with most remaining pass time
// (approximated by elevation margin above min_elevation_deg)
// ---------------------------------------------------------------------------

/**
 * Max-remaining-time baseline: attach to the satellite with the most
 * elevation margin above min_elevation_deg, which is a proxy for remaining
 * visible time (satellite closest to its apex has least remaining time
 * to descend to min elevation).
 *
 * Proxy: remaining_time ∝ (elevationDeg - min_elevation_deg)
 *
 * @source beamHO-bench baseline-decisions.ts
 */
export function createMaxRemainingTimeManager(config: HandoverConfig): HandoverManager {
  const minEl = config.min_elevation_deg;
  return createRankingManager(
    config,
    (a, b) => (a.elevationDeg - minEl) - (b.elevationDeg - minEl),
    'max-remaining-time',
  );
}
