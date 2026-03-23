/**
 * Handover manager implementation for ntn-sim-core.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.3
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3, §4
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
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Ping-pong window in simulation seconds. */
const PING_PONG_WINDOW_SEC = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    events: [],
  };
}

function filterCandidates(
  candidates: HandoverCandidate[],
  minElevationDeg: number,
): HandoverCandidate[] {
  return candidates.filter((c) => c.elevationDeg >= minElevationDeg);
}

// ---------------------------------------------------------------------------
// A4 condition: serving SINR < threshold AND best candidate > serving + hysteresis
// ---------------------------------------------------------------------------

function a4Condition(
  servingSinrDb: number,
  bestCandidate: HandoverCandidate | undefined,
  config: HandoverConfig,
): boolean {
  if (!bestCandidate) return false;
  return (
    servingSinrDb < config.trigger_threshold_db &&
    bestCandidate.sinrDb > servingSinrDb + config.hysteresis_db
  );
}

// ---------------------------------------------------------------------------
// A3 condition: candidate SINR > serving SINR + offset (trigger_threshold_db used as offset)
// ---------------------------------------------------------------------------

function a3Condition(
  servingSinrDb: number,
  bestCandidate: HandoverCandidate | undefined,
  config: HandoverConfig,
): boolean {
  if (!bestCandidate) return false;
  return bestCandidate.sinrDb > servingSinrDb + config.trigger_threshold_db + config.hysteresis_db;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createHandoverManager(config: HandoverConfig): HandoverManager {
  let state = initialState();
  /** Track previous serving sat for ping-pong detection. */
  let previousServingSatId: string | null = null;

  const tttSec = config.ttt_ms / 1000;

  const checkCondition =
    config.type === 'a3-event' ? a3Condition : a4Condition;

  function emit(event: HandoverEvent): void {
    state.events.push(event);
  }

  function tryAttach(input: HandoverTickInput, eligible: HandoverCandidate[]): HandoverDecision {
    const best = eligible[0];
    if (!best || best.sinrDb < config.trigger_threshold_db) {
      return { type: 'none', reason: 'no candidate above threshold' };
    }
    state.phase = 'attached';
    state.serving = {
      satId: best.satId,
      beamId: best.beamId,
      sinrDb: best.sinrDb,
      attachTimeSec: input.timeSec,
    };
    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'attach',
      targetSatId: best.satId,
      sinrDb: best.sinrDb,
      reason: 'initial attach',
    });
    return { type: 'attach', targetSatId: best.satId, targetBeamId: best.beamId, reason: 'initial attach' };
  }

  function tickAttached(input: HandoverTickInput, eligible: HandoverCandidate[]): HandoverDecision {
    const servingSinr = input.servingSinrDb!;
    state.serving!.sinrDb = servingSinr;

    // Release if no candidates and serving is poor
    if (eligible.length === 0 && servingSinr < config.trigger_threshold_db) {
      return doRelease(input, 'serving SINR below threshold, no candidates');
    }

    // Find best candidate that is NOT the current serving cell
    const best = eligible.find(
      (c) => c.satId !== state.serving!.satId || c.beamId !== state.serving!.beamId,
    );

    if (checkCondition(servingSinr, best, config)) {
      // Start TTT
      state.phase = 'preparing';
      state.pendingTarget = best!;
      state.tttStartTimeSec = input.timeSec;
      emit({
        tick: input.tick,
        timeSec: input.timeSec,
        type: 'ho-trigger',
        sourceSatId: state.serving!.satId,
        targetSatId: best!.satId,
        sinrDb: servingSinr,
        reason: 'handover condition met, TTT started',
      });
      // For hard-ho (ttt=0), fall through to execute immediately
      if (tttSec <= 0) {
        return tickPreparing(input, eligible);
      }
      return { type: 'none', reason: 'TTT started' };
    }

    return { type: 'none', reason: 'no handover condition' };
  }

  function tickPreparing(input: HandoverTickInput, eligible: HandoverCandidate[]): HandoverDecision {
    const servingSinr = input.servingSinrDb!;
    state.serving!.sinrDb = servingSinr;

    // Re-check condition with current best non-serving candidate
    const best = eligible.find(
      (c) => c.satId !== state.serving!.satId || c.beamId !== state.serving!.beamId,
    );

    if (!checkCondition(servingSinr, best, config)) {
      // Condition no longer holds — cancel
      state.phase = 'attached';
      state.pendingTarget = null;
      state.tttStartTimeSec = null;
      return { type: 'none', reason: 'handover condition cleared, TTT cancelled' };
    }

    // Update pending target to current best (it may have changed)
    state.pendingTarget = best!;

    // Check TTT expiry
    const elapsed = input.timeSec - state.tttStartTimeSec!;
    if (elapsed < tttSec) {
      return { type: 'none', reason: 'TTT running' };
    }

    // TTT expired — execute handover
    return executeHandover(input);
  }

  function executeHandover(input: HandoverTickInput): HandoverDecision {
    const target = state.pendingTarget!;
    const source = state.serving!;

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'ho-execute',
      sourceSatId: source.satId,
      targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason: 'TTT expired, executing handover',
    });

    // Phase 2: switching is instantaneous (always succeeds)
    state.phase = 'switching';

    // Ping-pong detection
    const isPingPong =
      previousServingSatId === target.satId &&
      input.timeSec - state.lastHoTimeSec <= PING_PONG_WINDOW_SEC;

    if (isPingPong) {
      state.totalPingPongs++;
    }

    previousServingSatId = source.satId;

    // Complete handover
    state.serving = {
      satId: target.satId,
      beamId: target.beamId,
      sinrDb: target.sinrDb,
      attachTimeSec: input.timeSec,
    };
    state.pendingTarget = null;
    state.tttStartTimeSec = null;
    state.lastHoTimeSec = input.timeSec;
    state.totalHandovers++;
    state.phase = 'attached';

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'ho-complete',
      sourceSatId: source.satId,
      targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason: isPingPong ? 'handover complete (ping-pong)' : 'handover complete',
    });

    return {
      type: 'handover',
      targetSatId: target.satId,
      targetBeamId: target.beamId,
      reason: isPingPong ? 'handover complete (ping-pong)' : 'handover complete',
    };
  }

  function doRelease(input: HandoverTickInput, reason: string): HandoverDecision {
    const source = state.serving;
    state.phase = 'idle';
    state.serving = null;
    state.pendingTarget = null;
    state.tttStartTimeSec = null;
    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'release',
      sourceSatId: source?.satId,
      sinrDb: input.servingSinrDb ?? undefined,
      reason,
    });
    return { type: 'release', reason };
  }

  return {
    tick(input: HandoverTickInput): HandoverDecision {
      const eligible = filterCandidates(input.candidates, config.min_elevation_deg);

      switch (state.phase) {
        case 'idle':
          return tryAttach(input, eligible);

        case 'attached':
          if (input.servingSinrDb === null) {
            return doRelease(input, 'serving SINR lost');
          }
          return tickAttached(input, eligible);

        case 'preparing':
          if (input.servingSinrDb === null) {
            return doRelease(input, 'serving SINR lost during preparation');
          }
          return tickPreparing(input, eligible);

        case 'switching':
          // Phase 2: switching is instantaneous, should not remain in this state
          state.phase = 'attached';
          return { type: 'none', reason: 'switching completed' };

        case 'completed':
        case 'failed':
          // Terminal states — reset needed
          return { type: 'none', reason: `in terminal state: ${state.phase}` };

        default:
          return { type: 'none', reason: 'unknown phase' };
      }
    },

    getState(): Readonly<HandoverManagerState> {
      return state;
    },

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
