/**
 * Conditional Handover (CHO) and Timer-CHO for ntn-sim-core.
 *
 * CHO (3GPP TS 38.331 / TS 38.300):
 *   Network sends a conditional HO command to UE in advance. UE stores the
 *   command and autonomously executes when the CHO condition is met, without
 *   waiting for a new measurement report round-trip. This reduces interruption
 *   time compared to baseline A3/A4.
 *
 * Timer-CHO (PAP-2025-TIMERCHO-CORE):
 *   CHO with a geometry-assisted timer. The timer threshold is derived from
 *   remaining time-of-service (ToS_remain). When the timer expires AND the
 *   A3 condition is met, UE executes the stored CHO command.
 *
 * FSM states:
 *   idle → attached → cho-prepared → cho-evaluating → attached
 *                                  ↘ (fail) → attached
 *
 * Paper sources:
 *   - PAP-2025-TIMERCHO-CORE: Timer-CHO geometry-based timer
 *   - PAP-2024-MCCHO-CORE: CHO baseline comparison
 *   - 3GPP TS 38.331: CondEventA3, CHO procedure
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
// CHO Phase
// ---------------------------------------------------------------------------

export type ChoPhase =
  | 'idle'
  | 'attached'         // normal serving, monitoring for CHO preparation
  | 'cho-prepared'     // CHO command stored at UE, waiting for execution condition
  | 'cho-evaluating'   // execution condition being evaluated (optional filter period)
  | 'cho-executing';   // UE autonomously executing CHO (instant in this model)

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface ChoState extends HandoverManagerState {
  choPhase: ChoPhase;
  /** Stored CHO target (pre-configured by network). */
  choTarget: HandoverCandidate | null;
  /** Time when CHO command was prepared. */
  choPreparedTimeSec: number | null;
  /** Timer-CHO: filtered SINR measurement (L3 IIR filter output). */
  filteredSinrDb: number | null;
  /** Timer-CHO: timer expiry time (computed from geometry). */
  timerExpirySec: number | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PING_PONG_WINDOW_SEC = 5;
/** Maximum time a CHO command remains valid (seconds). After this, re-prepare. */
const CHO_VALIDITY_SEC = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initialState(): ChoState {
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
    choPhase: 'idle',
    choTarget: null,
    choPreparedTimeSec: null,
    filteredSinrDb: null,
    timerExpirySec: null,
  };
}

function filterCandidates(
  candidates: HandoverCandidate[],
  minElevationDeg: number,
): HandoverCandidate[] {
  return candidates.filter((c) => c.elevationDeg >= minElevationDeg);
}

function choPhaseToHoPhase(cp: ChoPhase): HandoverManagerState['phase'] {
  switch (cp) {
    case 'idle': return 'idle';
    case 'attached': return 'attached';
    case 'cho-prepared': return 'attached'; // still serving, just has stored command
    case 'cho-evaluating': return 'preparing';
    case 'cho-executing': return 'switching';
  }
}

/**
 * L3 IIR filter for SINR measurement smoothing.
 * F_n = (1-a)·F_{n-1} + a·M_n, where a = 1/2^(k/4)
 * @source 3GPP TS 38.331, PAP-2025-TIMERCHO-CORE
 */
function l3Filter(prevFiltered: number | null, measurement: number, k: number): number {
  if (prevFiltered === null) return measurement;
  const a = 1 / Math.pow(2, k / 4);
  return (1 - a) * prevFiltered + a * measurement;
}

// ---------------------------------------------------------------------------
// Factory: CHO manager
// ---------------------------------------------------------------------------

/**
 * Create a CHO (Conditional Handover) manager.
 *
 * For type='cho': standard CHO with A3-based execution condition.
 * For type='timer-cho': CHO with geometry-assisted timer threshold.
 *
 * @tier paper-backed
 * @source PAP-2025-TIMERCHO-CORE, 3GPP TS 38.331
 */
export function createChoManager(config: HandoverConfig): HandoverManager {
  const isTimerCho = config.type === 'timer-cho';
  const choOffsetDb = config.cho_offset_db ?? 0;
  const alpha = config.cho_alpha ?? 0.85;
  const filterK = config.cho_filter_k ?? 4;
  const tttSec = config.ttt_ms / 1000;

  let state = initialState();
  let previousServingSatId: string | null = null;

  function syncPhase(): void {
    state.phase = choPhaseToHoPhase(state.choPhase);
  }

  function emit(event: HandoverEvent): void {
    state.events.push(event);
  }

  function bestNonServing(eligible: HandoverCandidate[]): HandoverCandidate | undefined {
    return eligible.find(
      (c) => !state.serving || c.satId !== state.serving.satId || c.beamId !== state.serving.beamId,
    );
  }

  /**
   * CHO preparation condition (network-side):
   * Serving SINR degrading below threshold — prepare CHO command for UE.
   * Uses A4-style condition: serving < threshold AND candidate > serving + hysteresis
   */
  function shouldPrepare(servingSinr: number, best: HandoverCandidate | undefined): boolean {
    if (!best) return false;
    return (
      servingSinr < config.trigger_threshold_db &&
      best.sinrDb > servingSinr + config.hysteresis_db
    );
  }

  /**
   * CHO execution condition (UE-side, CondEventA3):
   * Candidate SINR > serving SINR + cho_offset for the stored target.
   * This is evaluated autonomously by UE without network round-trip.
   */
  function choExecutionCondition(
    servingSinr: number,
    target: HandoverCandidate,
  ): boolean {
    return target.sinrDb > servingSinr + choOffsetDb;
  }

  /**
   * Timer-CHO: compute geometry-based timer threshold.
   * Timer duration = α × TTT (simplified; full model uses ToS_remain).
   * The timer shortens preparation phase compared to standard TTT.
   * @source PAP-2025-TIMERCHO-CORE: Thresh1 = α·ToS_remain
   */
  function computeTimerThresholdSec(): number {
    // Simplified: scale TTT by alpha. Full model needs satellite geometry
    // (beam radius, UE position in beam, satellite velocity) which requires
    // engine-level data not available in the handover manager alone.
    // This is a documented simplification (assumption-backed).
    return alpha * tttSec;
  }

  // -- idle ----------------------------------------------------------------

  function tickIdle(input: HandoverTickInput, eligible: HandoverCandidate[]): HandoverDecision {
    const best = eligible[0];
    if (!best || best.sinrDb < config.trigger_threshold_db) {
      return { type: 'none', reason: 'no candidate above threshold' };
    }
    state.choPhase = 'attached';
    syncPhase();
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

  // -- attached ------------------------------------------------------------

  function tickAttached(input: HandoverTickInput, eligible: HandoverCandidate[]): HandoverDecision {
    const servingSinr = input.servingSinrDb!;
    state.serving!.sinrDb = servingSinr;

    // Update L3 filter
    state.filteredSinrDb = l3Filter(state.filteredSinrDb, servingSinr, filterK);

    if (eligible.length === 0 && servingSinr < config.trigger_threshold_db) {
      return doRelease(input, 'serving SINR below threshold, no candidates');
    }

    const best = bestNonServing(eligible);

    // Check preparation condition
    const sinrForCheck = isTimerCho ? (state.filteredSinrDb ?? servingSinr) : servingSinr;
    if (shouldPrepare(sinrForCheck, best)) {
      // Network prepares CHO command and sends to UE
      state.choPhase = 'cho-prepared';
      syncPhase();
      state.choTarget = best!;
      state.choPreparedTimeSec = input.timeSec;

      if (isTimerCho) {
        // Compute geometry-based timer
        const timerDuration = computeTimerThresholdSec();
        state.timerExpirySec = input.timeSec + timerDuration;
      } else {
        // Standard CHO: use TTT as preparation window
        state.timerExpirySec = input.timeSec + tttSec;
      }

      emit({
        tick: input.tick,
        timeSec: input.timeSec,
        type: 'cho-prepared',
        sourceSatId: state.serving!.satId,
        targetSatId: best!.satId,
        sinrDb: servingSinr,
        reason: isTimerCho ? 'timer-cho command prepared' : 'cho command prepared',
      });

      return { type: 'none', reason: 'cho-prepared' };
    }

    return { type: 'none', reason: 'no handover condition' };
  }

  // -- cho-prepared --------------------------------------------------------

  function tickChoPrepared(input: HandoverTickInput, eligible: HandoverCandidate[]): HandoverDecision {
    const servingSinr = input.servingSinrDb!;
    state.serving!.sinrDb = servingSinr;
    state.filteredSinrDb = l3Filter(state.filteredSinrDb, servingSinr, filterK);

    // Check if CHO command has expired
    if (input.timeSec - state.choPreparedTimeSec! > CHO_VALIDITY_SEC) {
      // CHO command expired — go back to attached
      state.choPhase = 'attached';
      syncPhase();
      state.choTarget = null;
      state.choPreparedTimeSec = null;
      state.timerExpirySec = null;
      return { type: 'none', reason: 'cho command expired' };
    }

    // Find the stored CHO target in current candidates
    const targetInCandidates = eligible.find(
      (c) => state.choTarget && c.satId === state.choTarget.satId,
    );

    if (!targetInCandidates) {
      // Target no longer visible — cancel CHO, try re-prepare
      const lostTargetSatId = state.choTarget?.satId;
      state.choPhase = 'attached';
      syncPhase();
      state.choTarget = null;
      state.choPreparedTimeSec = null;
      state.timerExpirySec = null;
      state.totalFailures++;
      emit({
        tick: input.tick,
        timeSec: input.timeSec,
        type: 'ho-fail',
        sourceSatId: state.serving!.satId,
        targetSatId: lostTargetSatId,
        sinrDb: servingSinr,
        reason: 'cho target lost',
      });
      return { type: 'none', reason: 'cho target lost, reverting to attached' };
    }

    // Update stored target's SINR
    state.choTarget = targetInCandidates;

    // Timer-CHO: wait for timer expiry before evaluating
    if (isTimerCho && state.timerExpirySec !== null && input.timeSec < state.timerExpirySec) {
      return { type: 'none', reason: 'timer-cho waiting for timer expiry' };
    }

    // Check CHO execution condition (CondEventA3 at UE)
    // Key CHO advantage: UE evaluates this autonomously, no network round-trip
    if (choExecutionCondition(servingSinr, targetInCandidates)) {
      // UE autonomously executes CHO
      return executeChoHandover(input, targetInCandidates);
    }

    // Standard CHO: if timer expired but condition not met, wait
    // (condition is re-checked each tick until CHO command expires)
    return { type: 'none', reason: 'cho execution condition not met' };
  }

  // -- execute CHO ---------------------------------------------------------

  function executeChoHandover(
    input: HandoverTickInput,
    target: HandoverCandidate,
  ): HandoverDecision {
    const source = state.serving!;

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'cho-execute',
      sourceSatId: source.satId,
      targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason: isTimerCho ? 'timer-cho autonomous execution' : 'cho autonomous execution',
    });

    // Ping-pong detection
    const isPingPong =
      previousServingSatId === target.satId &&
      input.timeSec - state.lastHoTimeSec <= PING_PONG_WINDOW_SEC;
    if (isPingPong) state.totalPingPongs++;

    previousServingSatId = source.satId;

    // Complete handover (CHO execution is faster than baseline — no report RTT)
    state.serving = {
      satId: target.satId,
      beamId: target.beamId,
      sinrDb: target.sinrDb,
      attachTimeSec: input.timeSec,
    };
    state.choPhase = 'attached';
    syncPhase();
    state.choTarget = null;
    state.choPreparedTimeSec = null;
    state.timerExpirySec = null;
    state.pendingTarget = null;
    state.lastHoTimeSec = input.timeSec;
    state.totalHandovers++;
    state.filteredSinrDb = null; // reset filter for new serving

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'ho-complete',
      sourceSatId: source.satId,
      targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason: isPingPong
        ? `${isTimerCho ? 'timer-' : ''}cho-complete (ping-pong)`
        : `${isTimerCho ? 'timer-' : ''}cho-complete`,
    });

    return {
      type: 'handover',
      targetSatId: target.satId,
      targetBeamId: target.beamId,
      reason: `${isTimerCho ? 'timer-' : ''}cho-complete`,
    };
  }

  // -- release -------------------------------------------------------------

  function doRelease(input: HandoverTickInput, reason: string): HandoverDecision {
    const source = state.serving;
    state.choPhase = 'idle';
    syncPhase();
    state.serving = null;
    state.pendingTarget = null;
    state.choTarget = null;
    state.choPreparedTimeSec = null;
    state.timerExpirySec = null;
    state.filteredSinrDb = null;
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

  // -- public interface ----------------------------------------------------

  return {
    tick(input: HandoverTickInput): HandoverDecision {
      const eligible = filterCandidates(input.candidates, config.min_elevation_deg);

      switch (state.choPhase) {
        case 'idle':
          return tickIdle(input, eligible);

        case 'attached':
          if (input.servingSinrDb === null) {
            return doRelease(input, 'serving SINR lost');
          }
          if (input.servingElevationDeg != null && input.servingElevationDeg < config.min_elevation_deg) {
            return doRelease(input, `serving elevation ${input.servingElevationDeg.toFixed(1)}° < ${config.min_elevation_deg}°`);
          }
          return tickAttached(input, eligible);

        case 'cho-prepared':
        case 'cho-evaluating':
          if (input.servingSinrDb === null) {
            return doRelease(input, 'serving SINR lost during CHO');
          }
          if (input.servingElevationDeg != null && input.servingElevationDeg < config.min_elevation_deg) {
            return doRelease(input, `serving elevation ${input.servingElevationDeg.toFixed(1)}° < ${config.min_elevation_deg}° during CHO`);
          }
          return tickChoPrepared(input, eligible);

        case 'cho-executing':
          // Should not linger — execution is instant
          state.choPhase = 'attached';
          syncPhase();
          return { type: 'none', reason: 'cho execution completed' };

        default:
          return { type: 'none', reason: 'unknown cho phase' };
      }
    },

    getState(): Readonly<ChoState> {
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
