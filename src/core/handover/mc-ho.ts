/**
 * Multi-Connectivity Handover (MC-HO) for ntn-sim-core.
 *
 * MC-HO (PAP-2024-MCCHO-CORE):
 *   UE maintains dual connectivity to source and target during handover,
 *   with packet duplication. Similar to DAPS but triggers based on A4
 *   condition and provides MC-specific event traces.
 *
 * FSM states:
 *   idle → attached → mc-preparing → mc-dual-active → attached
 *                                   ↘ (fail) → attached
 *
 * Key difference from DAPS:
 *   - DAPS has a preparation phase with timer; MC-HO enters dual-active
 *     more aggressively when the A4 condition is met + TTT expires.
 *   - MC-HO event traces use mc-ho-specific event types for traceability.
 *   - MC-HO allows selection combining (max) during dual-active,
 *     which is semantically the same as DAPS SC but with different metadata.
 *
 * Paper sources:
 *   - PAP-2024-MCCHO-CORE: MC-HO dual-connectivity, packet duplication
 *   - 3GPP TS 38.300: dual connectivity procedures
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
  ServingState,
} from './types';

// ---------------------------------------------------------------------------
// MC-HO Phase
// ---------------------------------------------------------------------------

export type McHoPhase =
  | 'idle'
  | 'attached'        // single serving
  | 'mc-preparing'    // TTT running, about to enter dual-active
  | 'mc-dual-active'  // both source and target active (MC-HO core)
  | 'mc-switching';   // completing switch to target (instant)

// ---------------------------------------------------------------------------
// Extended state
// ---------------------------------------------------------------------------

export interface McHoState extends HandoverManagerState {
  mcPhase: McHoPhase;
  sourceServing: ServingState | null;
  targetServing: ServingState | null;
  dualActiveStartSec: number | null;
  maxDualActiveSec: number;
  packetDuplication: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PING_PONG_WINDOW_SEC = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initialState(config: HandoverConfig): McHoState {
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
    rlf: { phase: 'normal', n310Count: 0, n311Count: 0, t310StartSec: null },
    events: [],
    mcPhase: 'idle',
    sourceServing: null,
    targetServing: null,
    dualActiveStartSec: null,
    maxDualActiveSec: config.mc_max_dual_sec ?? 2.0,
    packetDuplication: config.mc_packet_duplication ?? true,
  };
}

function filterCandidates(
  candidates: HandoverCandidate[],
  minElevationDeg: number,
): HandoverCandidate[] {
  return candidates.filter((c) => c.elevationDeg >= minElevationDeg);
}

function mcPhaseToHoPhase(mp: McHoPhase): HandoverManagerState['phase'] {
  switch (mp) {
    case 'idle': return 'idle';
    case 'attached': return 'attached';
    case 'mc-preparing': return 'preparing';
    case 'mc-dual-active': return 'switching';
    case 'mc-switching': return 'switching';
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an MC-HO (Multi-Connectivity Handover) manager.
 *
 * @tier paper-backed
 * @source PAP-2024-MCCHO-CORE
 */
export function createMcHoManager(config: HandoverConfig): HandoverManager {
  const tttSec = config.ttt_ms / 1000;
  const maxDualSec = config.mc_max_dual_sec ?? 2.0;

  let state = initialState(config);
  let previousServingSatId: string | null = null;

  function syncPhase(): void {
    state.phase = mcPhaseToHoPhase(state.mcPhase);
  }

  function emit(event: HandoverEvent): void {
    state.events.push(event);
  }

  function bestNonServing(eligible: HandoverCandidate[]): HandoverCandidate | undefined {
    return eligible.find(
      (c) => !state.serving || c.satId !== state.serving.satId || c.beamId !== state.serving.beamId,
    );
  }

  /** A4 condition for MC-HO trigger. */
  function a4Condition(servingSinr: number, best: HandoverCandidate | undefined): boolean {
    if (!best) return false;
    return (
      servingSinr < config.trigger_threshold_db &&
      best.sinrDb > servingSinr + config.hysteresis_db
    );
  }

  // -- idle ----------------------------------------------------------------

  function tickIdle(input: HandoverTickInput, eligible: HandoverCandidate[]): HandoverDecision {
    const best = eligible[0];
    if (!best || best.sinrDb < config.trigger_threshold_db) {
      return { type: 'none', reason: 'no candidate above threshold' };
    }
    state.mcPhase = 'attached';
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

    if (eligible.length === 0 && servingSinr < config.trigger_threshold_db) {
      return doRelease(input, 'serving SINR below threshold, no candidates');
    }

    const best = bestNonServing(eligible);
    if (a4Condition(servingSinr, best)) {
      // Start TTT → mc-preparing
      state.mcPhase = 'mc-preparing';
      syncPhase();
      state.pendingTarget = best!;
      state.tttStartTimeSec = input.timeSec;

      emit({
        tick: input.tick,
        timeSec: input.timeSec,
        type: 'ho-trigger',
        sourceSatId: state.serving!.satId,
        targetSatId: best!.satId,
        sinrDb: servingSinr,
        reason: 'mc-ho condition met, TTT started',
      });

      // If TTT=0, immediately enter dual-active
      if (tttSec <= 0) {
        return enterDualActive(input);
      }
      return { type: 'none', reason: 'mc-ho TTT started' };
    }

    return { type: 'none', reason: 'no handover condition' };
  }

  // -- mc-preparing --------------------------------------------------------

  function tickPreparing(input: HandoverTickInput, eligible: HandoverCandidate[]): HandoverDecision {
    const servingSinr = input.servingSinrDb!;
    state.serving!.sinrDb = servingSinr;

    const best = bestNonServing(eligible);

    // Cancel if condition no longer holds
    if (!a4Condition(servingSinr, best)) {
      state.mcPhase = 'attached';
      syncPhase();
      state.pendingTarget = null;
      state.tttStartTimeSec = null;
      return { type: 'none', reason: 'mc-ho condition cleared, TTT cancelled' };
    }

    state.pendingTarget = best!;

    // Check TTT expiry
    const elapsed = input.timeSec - state.tttStartTimeSec!;
    if (elapsed < tttSec) {
      return { type: 'none', reason: 'mc-ho TTT running' };
    }

    return enterDualActive(input);
  }

  function enterDualActive(input: HandoverTickInput): HandoverDecision {
    const target = state.pendingTarget!;
    state.mcPhase = 'mc-dual-active';
    syncPhase();
    state.dualActiveStartSec = input.timeSec;
    state.sourceServing = { ...state.serving! };
    state.targetServing = {
      satId: target.satId,
      beamId: target.beamId,
      sinrDb: target.sinrDb,
      attachTimeSec: input.timeSec,
    };
    state.tttStartTimeSec = null;

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'mc-ho-dual-start',
      sourceSatId: state.serving!.satId,
      targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason: 'mc-ho dual-connectivity active',
    });

    return { type: 'none', reason: 'mc-ho dual-active' };
  }

  // -- mc-dual-active ------------------------------------------------------

  function tickDualActive(input: HandoverTickInput, eligible: HandoverCandidate[]): HandoverDecision {
    const servingSinr = input.servingSinrDb!;
    state.serving!.sinrDb = servingSinr;
    if (state.sourceServing) state.sourceServing.sinrDb = servingSinr;

    // Update target SINR from candidates
    const targetCandidate = eligible.find(
      (c) =>
        state.targetServing &&
        c.satId === state.targetServing.satId &&
        c.beamId === state.targetServing.beamId,
    );
    if (targetCandidate && state.targetServing) {
      state.targetServing.sinrDb = targetCandidate.sinrDb;
    }

    const elapsed = input.timeSec - state.dualActiveStartSec!;
    const targetSinr = state.targetServing?.sinrDb ?? -Infinity;

    // Fallback: max duration exceeded or target disappeared
    if (elapsed >= maxDualSec || !targetCandidate) {
      return mcFallback(input, elapsed >= maxDualSec
        ? 'mc-ho fallback: max dual-active duration exceeded'
        : 'mc-ho fallback: target lost');
    }

    // Switch condition: target SINR exceeds threshold
    if (targetSinr >= config.trigger_threshold_db) {
      return completeSwitch(input);
    }

    return { type: 'none', reason: 'mc-ho dual-active, waiting' };
  }

  function completeSwitch(input: HandoverTickInput): HandoverDecision {
    const target = state.targetServing!;
    const source = state.sourceServing!;

    // Ping-pong detection
    const isPingPong =
      previousServingSatId === target.satId &&
      input.timeSec - state.lastHoTimeSec <= PING_PONG_WINDOW_SEC;
    if (isPingPong) state.totalPingPongs++;

    previousServingSatId = source.satId;

    // Switch serving to target
    state.serving = {
      satId: target.satId,
      beamId: target.beamId,
      sinrDb: target.sinrDb,
      attachTimeSec: input.timeSec,
    };
    state.mcPhase = 'attached';
    syncPhase();
    state.sourceServing = null;
    state.targetServing = null;
    state.dualActiveStartSec = null;
    state.pendingTarget = null;
    state.lastHoTimeSec = input.timeSec;
    state.totalHandovers++;

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'mc-ho-dual-end',
      sourceSatId: source.satId,
      targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason: 'mc-ho dual-connectivity ended',
    });

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'ho-complete',
      sourceSatId: source.satId,
      targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason: isPingPong ? 'mc-ho complete (ping-pong)' : 'mc-ho complete',
    });

    return {
      type: 'handover',
      targetSatId: target.satId,
      targetBeamId: target.beamId,
      reason: isPingPong ? 'mc-ho complete (ping-pong)' : 'mc-ho complete',
    };
  }

  function mcFallback(input: HandoverTickInput, reason: string): HandoverDecision {
    state.mcPhase = 'attached';
    syncPhase();
    // Revert to source
    state.targetServing = null;
    state.sourceServing = null;
    state.dualActiveStartSec = null;
    state.pendingTarget = null;
    state.totalFailures++;

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'mc-ho-dual-end',
      sourceSatId: state.serving?.satId,
      sinrDb: input.servingSinrDb ?? undefined,
      reason,
    });

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'ho-fail',
      sourceSatId: state.serving?.satId,
      sinrDb: input.servingSinrDb ?? undefined,
      reason,
    });

    return { type: 'none', reason };
  }

  // -- release -------------------------------------------------------------

  function doRelease(input: HandoverTickInput, reason: string): HandoverDecision {
    const source = state.serving;
    state.mcPhase = 'idle';
    syncPhase();
    state.serving = null;
    state.pendingTarget = null;
    state.sourceServing = null;
    state.targetServing = null;
    state.dualActiveStartSec = null;
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

      switch (state.mcPhase) {
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

        case 'mc-preparing':
          if (input.servingSinrDb === null) {
            return doRelease(input, 'serving SINR lost during mc-ho preparation');
          }
          if (input.servingElevationDeg != null && input.servingElevationDeg < config.min_elevation_deg) {
            return doRelease(input, `serving elevation ${input.servingElevationDeg.toFixed(1)}° < ${config.min_elevation_deg}° during mc-ho`);
          }
          return tickPreparing(input, eligible);

        case 'mc-dual-active':
          if (input.servingSinrDb === null) {
            // Source lost — try switch if target alive
            const tgt = eligible.find(
              (c) =>
                state.targetServing &&
                c.satId === state.targetServing.satId &&
                c.beamId === state.targetServing.beamId,
            );
            if (tgt && tgt.sinrDb >= config.trigger_threshold_db) {
              state.targetServing!.sinrDb = tgt.sinrDb;
              return completeSwitch(input);
            }
            return doRelease(input, 'both links lost during mc-ho dual-active');
          }
          return tickDualActive(input, eligible);

        case 'mc-switching':
          state.mcPhase = 'attached';
          syncPhase();
          return { type: 'none', reason: 'mc-ho switching completed' };

        default:
          return { type: 'none', reason: 'unknown mc-ho phase' };
      }
    },

    getState(): Readonly<McHoState> {
      return state;
    },

    drainEvents(): HandoverEvent[] {
      const drained = state.events;
      state.events = [];
      return drained;
    },

    reset(): void {
      state = initialState(config);
      previousServingSatId = null;
    },
  };
}
