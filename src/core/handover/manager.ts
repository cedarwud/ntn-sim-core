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
  RlfState,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Ping-pong window in simulation seconds. */
const PING_PONG_WINDOW_SEC = 5;

// RLF defaults (3GPP TS 38.331 + TR 38.821 NTN)
const DEFAULT_RLF_QOUT_DB  = -8.0;  // out-of-sync threshold
const DEFAULT_RLF_QIN_DB   = -6.0;  // in-sync recovery threshold
const DEFAULT_RLF_N310     = 1;     // OOS events to start T310
const DEFAULT_RLF_N311     = 1;     // IS events to cancel T310
const DEFAULT_RLF_T310_MS  = 2000;  // NTN-extended T310 (ms)

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

  const baseTttSec = config.ttt_ms / 1000;

  // A6: SINR EMA state — smoothed SINR tracking per tick
  // α=1 disables smoothing; α<1 applies exponential averaging
  const emaAlpha = config.sinr_ema_alpha ?? 1.0;
  let emaSinrDb: number | null = null;

  // RLF parameters (with 3GPP defaults)
  const rlfQout   = config.rlf_qout_db  ?? DEFAULT_RLF_QOUT_DB;
  const rlfQin    = config.rlf_qin_db   ?? DEFAULT_RLF_QIN_DB;
  const rlfN310   = config.rlf_n310     ?? DEFAULT_RLF_N310;
  const rlfN311   = config.rlf_n311     ?? DEFAULT_RLF_N311;
  const rlfT310Sec = (config.rlf_t310_ms ?? DEFAULT_RLF_T310_MS) / 1000;

  const checkCondition =
    config.type === 'a3-event' ? a3Condition : a4Condition;

  /** Effective TTT accounts for propagation RTT (P2 fix). */
  function effectiveTttSec(delayMs?: number): number {
    if (!delayMs) return baseTttSec;
    return baseTttSec + 2 * delayMs / 1000; // add RTT
  }

  function emit(event: HandoverEvent): void {
    state.events.push(event);
  }

  /**
   * Advance the RLF state machine by one tick.
   *
   * Returns true if RLF was declared (T310 expired) — caller must do doRelease().
   * Returns false if link is OK or recovery is in progress.
   *
   * State transitions:
   *   normal      → out-of-sync : consecutive OOS count reaches N310
   *   out-of-sync → normal      : consecutive IS  count reaches N311
   *   out-of-sync → reestablish : T310 timer expires
   *
   * @source 3GPP TS 38.331 §5.3.10.3
   * @source TR 38.821 §6.3.4 (NTN T310 extension)
   */
  function rlfTick(sinrDb: number | null, timeSec: number, tick: number): boolean {
    const rlf = state.rlf;

    // If SINR is completely absent (satellite left view), treat as hard out-of-sync
    const isOos = sinrDb === null || sinrDb < rlfQout;
    const isIn  = sinrDb !== null && sinrDb >= rlfQin;

    if (rlf.phase === 'normal') {
      if (isOos) {
        rlf.n310Count++;
        if (rlf.n310Count >= rlfN310) {
          // Start T310
          rlf.phase = 'out-of-sync';
          rlf.t310StartSec = timeSec;
          rlf.n311Count = 0;
          emit({ tick, timeSec, type: 'rlf-oos', sinrDb: sinrDb ?? undefined,
            reason: `N310=${rlf.n310Count} OOS events, T310 started` });
        }
      } else {
        rlf.n310Count = 0;
      }
      return false;
    }

    if (rlf.phase === 'out-of-sync') {
      // Check T310 expiry first
      if (timeSec - rlf.t310StartSec! >= rlfT310Sec) {
        rlf.phase = 'reestablish';
        state.totalRlfs++;
        emit({ tick, timeSec, type: 'rlf-declared', sinrDb: sinrDb ?? undefined,
          reason: `T310 expired after ${rlfT310Sec * 1000} ms — RLF declared` });
        return true; // caller must release
      }

      if (isIn) {
        rlf.n311Count++;
        if (rlf.n311Count >= rlfN311) {
          // Cancel T310 — link recovered
          rlf.phase = 'normal';
          rlf.n310Count = 0;
          rlf.n311Count = 0;
          rlf.t310StartSec = null;
          emit({ tick, timeSec, type: 'rlf-recovery', sinrDb: sinrDb ?? undefined,
            reason: `N311=${rlf.n311Count} IS events, T310 cancelled` });
        }
      } else {
        rlf.n311Count = 0;
      }
      return false;
    }

    // reestablish phase: waiting for doRelease() to move back to idle
    return false;
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
      if (baseTttSec <= 0) {
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

    // Check TTT expiry (P2: accounts for propagation RTT)
    const elapsed = input.timeSec - state.tttStartTimeSec!;
    if (elapsed < effectiveTttSec(input.propagationDelayMs)) {
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
    state.rlf = initialRlf(); // A2: reset RLF on successful HO (new serving link)

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
    state.rlf = initialRlf(); // A2: reset RLF counters on release
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
      // A6: apply SINR EMA smoothing before any HO/RLF evaluation
      // Smoothed = α × raw + (1−α) × prev.
      // @source leo-beam-sim/src/engine/handover/handover-manager.ts
      if (input.servingSinrDb !== null) {
        emaSinrDb = emaSinrDb === null
          ? input.servingSinrDb
          : emaAlpha * input.servingSinrDb + (1 - emaAlpha) * emaSinrDb;
      } else {
        emaSinrDb = null;
      }
      // Use smoothed SINR for all downstream HO and RLF logic
      const smoothedInput: HandoverTickInput = { ...input, servingSinrDb: emaSinrDb };

      const eligible = filterCandidates(input.candidates, config.min_elevation_deg);

      switch (state.phase) {
        case 'idle':
          return tryAttach(smoothedInput, eligible);

        case 'attached': {
          // A2: RLF state machine — replaces binary null-SINR release
          if (rlfTick(smoothedInput.servingSinrDb, smoothedInput.timeSec, smoothedInput.tick)) {
            return doRelease(smoothedInput, 'RLF declared (T310 expired)');
          }
          // Hard release: satellite below horizon (elevation gate)
          if (smoothedInput.servingElevationDeg != null && smoothedInput.servingElevationDeg < config.min_elevation_deg) {
            return doRelease(smoothedInput, `serving elevation ${smoothedInput.servingElevationDeg.toFixed(1)}° < ${config.min_elevation_deg}°`);
          }
          // While in out-of-sync phase, skip HO trigger evaluation
          if (state.rlf.phase === 'out-of-sync') {
            return { type: 'none', reason: 'RLF T310 running, HO evaluation suspended' };
          }
          return tickAttached(smoothedInput, eligible);
        }

        case 'preparing': {
          // A2: RLF during preparation — abort HO and declare RLF
          if (rlfTick(smoothedInput.servingSinrDb, smoothedInput.timeSec, smoothedInput.tick)) {
            return doRelease(smoothedInput, 'RLF declared during HO preparation (T310 expired)');
          }
          if (smoothedInput.servingElevationDeg != null && smoothedInput.servingElevationDeg < config.min_elevation_deg) {
            return doRelease(smoothedInput, `serving elevation ${smoothedInput.servingElevationDeg.toFixed(1)}° < ${config.min_elevation_deg}° during preparation`);
          }
          return tickPreparing(smoothedInput, eligible);
        }

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
      state = initialState(); // initialState() already includes initialRlf()
      previousServingSatId = null;
      emaSinrDb = null;
    },
  };
}
