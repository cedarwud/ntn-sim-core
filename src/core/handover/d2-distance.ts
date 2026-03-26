/**
 * D2 Distance-Event Handover for ntn-sim-core (A1).
 *
 * D2 is an LEO-specific handover trigger defined in ntn-stack:
 *   Trigger when:  serving_range > D2_serving_dist_km  (satellite moving away)
 *              AND best_candidate_range < D2_target_dist_km  (closer sat available)
 *
 * Unlike A3/A4 (SINR-based), D2 uses geometric distance as the primary criterion.
 * This is particularly useful when SINR is still acceptable but the satellite will
 * soon become unavailable due to increasing path loss and Doppler.
 *
 * D2 does NOT run its own TTT — the inherent geometry progression serves as the
 * "time to trigger"; the handover executes as soon as both distance thresholds hold.
 *
 * Paper sources:
 *   - ntn-stack: serving_dist > 5000km AND neighbor_dist < 3000km (D2 reference)
 *   - @source ntn-stack/netstack/src/services/handover_event_trigger_service.py
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
  HandoverCandidate,
  RlfState,
} from './types';

// ---------------------------------------------------------------------------
// Constants / defaults
// ---------------------------------------------------------------------------

const DEFAULT_D2_SERVING_DIST_KM = 5000;
const DEFAULT_D2_TARGET_DIST_KM  = 3000;
const PING_PONG_WINDOW_SEC        = 5;

// ---------------------------------------------------------------------------
// Helpers
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

function filterEligible(
  candidates: HandoverCandidate[],
  minElevationDeg: number,
  targetDistKm: number,
): HandoverCandidate[] {
  return candidates.filter(
    (c) =>
      c.elevationDeg >= minElevationDeg &&
      (c.rangeKm == null || c.rangeKm <= targetDistKm),
  );
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a D2-distance handover manager.
 *
 * D2 trigger condition (evaluated every tick):
 *   serving_range > d2_serving_dist_km  (satellite receding)
 *   AND  best_candidate_range < d2_target_dist_km  (closer satellite visible)
 *
 * @source ntn-stack handover_event_trigger_service.py
 * @tier paper-backed
 */
export function createD2Manager(config: HandoverConfig): HandoverManager {
  let state = initialState();
  let previousServingSatId: string | null = null;

  const servingDistKm = config.d2_serving_dist_km ?? DEFAULT_D2_SERVING_DIST_KM;
  const targetDistKm  = config.d2_target_dist_km  ?? DEFAULT_D2_TARGET_DIST_KM;

  function emit(event: HandoverEvent): void {
    state.events.push(event);
  }

  function d2Condition(
    servingRangeKm: number | null | undefined,
    bestCandidate: HandoverCandidate | undefined,
  ): boolean {
    if (!bestCandidate) return false;
    const serving = servingRangeKm ?? 0;
    const target  = bestCandidate.rangeKm ?? 0;
    return serving > servingDistKm && target < targetDistKm;
  }

  function doRelease(input: HandoverTickInput, reason: string): HandoverDecision {
    const source = state.serving;
    state.phase = 'idle';
    state.serving = null;
    state.pendingTarget = null;
    state.tttStartTimeSec = null;
    state.rlf = initialRlf();
    emit({ tick: input.tick, timeSec: input.timeSec, type: 'release',
      sourceSatId: source?.satId, sinrDb: input.servingSinrDb ?? undefined, reason });
    return { type: 'release', reason };
  }

  function tryAttach(input: HandoverTickInput, eligible: HandoverCandidate[]): HandoverDecision {
    const best = eligible[0];
    if (!best) return { type: 'none', reason: 'no eligible candidate' };

    state.phase = 'attached';
    state.serving = { satId: best.satId, beamId: best.beamId,
      sinrDb: best.sinrDb, attachTimeSec: input.timeSec };
    emit({ tick: input.tick, timeSec: input.timeSec, type: 'attach',
      targetSatId: best.satId, sinrDb: best.sinrDb, reason: 'D2 initial attach' });
    return { type: 'attach', targetSatId: best.satId, targetBeamId: best.beamId,
      reason: 'D2 initial attach' };
  }

  function executeHandover(input: HandoverTickInput, target: HandoverCandidate): HandoverDecision {
    const source = state.serving!;
    emit({ tick: input.tick, timeSec: input.timeSec, type: 'ho-execute',
      sourceSatId: source.satId, targetSatId: target.satId,
      sinrDb: target.sinrDb, reason: 'D2 distance condition met' });

    const isPingPong = previousServingSatId === target.satId &&
      input.timeSec - state.lastHoTimeSec <= PING_PONG_WINDOW_SEC;
    if (isPingPong) state.totalPingPongs++;

    previousServingSatId = source.satId;
    state.serving = { satId: target.satId, beamId: target.beamId,
      sinrDb: target.sinrDb, attachTimeSec: input.timeSec };
    state.pendingTarget = null;
    state.lastHoTimeSec = input.timeSec;
    state.totalHandovers++;
    state.phase = 'attached';
    state.rlf = initialRlf();

    emit({ tick: input.tick, timeSec: input.timeSec, type: 'ho-complete',
      sourceSatId: source.satId, targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason: isPingPong ? 'D2 handover complete (ping-pong)' : 'D2 handover complete' });
    return { type: 'handover', targetSatId: target.satId, targetBeamId: target.beamId,
      reason: isPingPong ? 'D2 handover complete (ping-pong)' : 'D2 handover complete' };
  }

  return {
    tick(input: HandoverTickInput): HandoverDecision {
      const eligible = filterEligible(input.candidates, config.min_elevation_deg, targetDistKm);

      switch (state.phase) {
        case 'idle':
          return tryAttach(input, input.candidates.filter(
            (c) => c.elevationDeg >= config.min_elevation_deg,
          ));

        case 'attached': {
          if (input.servingSinrDb === null) {
            return doRelease(input, 'D2: serving SINR lost');
          }
          if (input.servingElevationDeg != null &&
              input.servingElevationDeg < config.min_elevation_deg) {
            return doRelease(input, `D2: serving elevation ${input.servingElevationDeg.toFixed(1)}° below minimum`);
          }
          state.serving!.sinrDb = input.servingSinrDb;

          // Best candidate closer than target threshold
          const best = eligible.find(
            (c) => c.satId !== state.serving!.satId || c.beamId !== state.serving!.beamId,
          );

          if (d2Condition(input.servingRangeKm, best)) {
            emit({ tick: input.tick, timeSec: input.timeSec, type: 'ho-trigger',
              sourceSatId: state.serving!.satId, targetSatId: best!.satId,
              sinrDb: input.servingSinrDb,
              reason: `D2: serving ${(input.servingRangeKm ?? 0).toFixed(0)} km > ${servingDistKm} km, target ${(best!.rangeKm ?? 0).toFixed(0)} km < ${targetDistKm} km` });
            return executeHandover(input, best!);
          }
          return { type: 'none', reason: 'D2 condition not met' };
        }

        default:
          return { type: 'none', reason: `D2: unexpected phase ${state.phase}` };
      }
    },

    getState(): Readonly<HandoverManagerState> { return state; },

    drainEvents(): HandoverEvent[] {
      const drained = state.events;
      state.events = [];
      return drained;
    },

    reset(): void {
      state = initialState();
      previousServingSatId = null;
    },
  };
}
