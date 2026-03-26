/**
 * DAPS (Dual Active Protocol Stack) handover manager for ntn-sim-core.
 *
 * During handover, both source and target links remain active simultaneously,
 * providing service continuity (zero interruption time).
 *
 * Paper sources:
 *   - PAP-2025-DAPS-CORE: DAPS procedure, dual-active phase, path switch
 *   - PAP-2024-MCCHO-CORE: dual connectivity + packet duplication
 *   - PAP-2025-RSMA: GEO+LEO soft HO with rate splitting
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.3, §9.3.1
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3, §4
 *   - This file must not import React, Three.js, or scene code.
 */

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
// DAPS Types
// ---------------------------------------------------------------------------

export type DapsPhase =
  | 'idle'
  | 'single-active'      // normal serving (one link)
  | 'prepared'            // target identified, preparation started
  | 'dual-active'         // both source and target active (DAPS core)
  | 'path-switched'       // traffic moved to target, source releasing
  | 'completed';          // fully switched to target

export interface DapsState extends HandoverManagerState {
  dapsPhase: DapsPhase;
  /** Source serving state (maintained during dual-active). */
  sourceServing: ServingState | null;
  /** Target serving state (active during dual-active and path-switch). */
  targetServing: ServingState | null;
  /** Time when dual-active started. */
  dualActiveStartSec: number | null;
  /** Maximum allowed dual-active duration in seconds. */
  maxDualActiveSec: number;
  /** Whether packet duplication is enabled. */
  packetDuplication: boolean;
}

export interface DapsConfig {
  /** Trigger threshold for starting DAPS preparation (dB). */
  triggerThresholdDb: number;
  /** Hysteresis for target selection (dB). */
  hysteresisDb: number;
  /** Preparation time before dual-active (seconds). */
  preparationTimeSec: number;
  /** Max dual-active duration (seconds). */
  maxDualActiveSec: number;
  /** Path switch threshold: target SINR must exceed this to switch (dB). */
  pathSwitchThresholdDb: number;
  /** Min elevation for candidates (degrees). */
  minElevationDeg: number;
  /** Enable packet duplication during dual-active. */
  packetDuplication: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PING_PONG_WINDOW_SEC = 5;

const DEFAULT_DAPS_CONFIG: DapsConfig = {
  triggerThresholdDb: -6,
  hysteresisDb: 2,
  preparationTimeSec: 0.5,
  maxDualActiveSec: 2.0,
  pathSwitchThresholdDb: -6,
  minElevationDeg: 10,
  packetDuplication: true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map DapsPhase to HoPhase for HandoverManagerState compatibility.
 */
function dapsPhaseToHoPhase(dp: DapsPhase): HandoverManagerState['phase'] {
  switch (dp) {
    case 'idle': return 'idle';
    case 'single-active': return 'attached';
    case 'prepared': return 'preparing';
    case 'dual-active': return 'switching';
    case 'path-switched': return 'switching';
    case 'completed': return 'completed';
  }
}

function filterCandidates(
  candidates: HandoverCandidate[],
  minElevationDeg: number,
): HandoverCandidate[] {
  return candidates.filter((c) => c.elevationDeg >= minElevationDeg);
}

function initialDapsState(config: DapsConfig): DapsState {
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
    dapsPhase: 'idle',
    sourceServing: null,
    targetServing: null,
    dualActiveStartSec: null,
    maxDualActiveSec: config.maxDualActiveSec,
    packetDuplication: config.packetDuplication,
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDapsManager(userConfig?: Partial<DapsConfig>): HandoverManager {
  const config: DapsConfig = { ...DEFAULT_DAPS_CONFIG, ...userConfig };
  let state = initialDapsState(config);
  let previousServingSatId: string | null = null;
  /** Time when preparation phase started (for preparationTimeSec timer). */
  let prepStartTimeSec: number | null = null;

  function syncPhase(): void {
    state.phase = dapsPhaseToHoPhase(state.dapsPhase);
  }

  function emit(event: HandoverEvent): void {
    state.events.push(event);
  }

  function bestNonServing(eligible: HandoverCandidate[]): HandoverCandidate | undefined {
    return eligible.find(
      (c) => !state.serving || c.satId !== state.serving.satId || c.beamId !== state.serving.beamId,
    );
  }

  // -- idle ----------------------------------------------------------------

  function tickIdle(input: HandoverTickInput, eligible: HandoverCandidate[]): HandoverDecision {
    const best = eligible[0];
    if (!best || best.sinrDb < config.triggerThresholdDb) {
      return { type: 'none', reason: 'no candidate above threshold' };
    }
    state.dapsPhase = 'single-active';
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

  // -- single-active -------------------------------------------------------

  function tickSingleActive(input: HandoverTickInput, eligible: HandoverCandidate[]): HandoverDecision {
    const servingSinr = input.servingSinrDb!;
    state.serving!.sinrDb = servingSinr;

    if (eligible.length === 0 && servingSinr < config.triggerThresholdDb) {
      return doRelease(input, 'serving SINR below threshold, no candidates');
    }

    const best = bestNonServing(eligible);
    // A4-style condition: serving below threshold AND candidate better by hysteresis
    if (
      best &&
      servingSinr < config.triggerThresholdDb &&
      best.sinrDb > servingSinr + config.hysteresisDb
    ) {
      state.dapsPhase = 'prepared';
      syncPhase();
      state.pendingTarget = best;
      prepStartTimeSec = input.timeSec;

      emit({
        tick: input.tick,
        timeSec: input.timeSec,
        type: 'ho-trigger',
        sourceSatId: state.serving!.satId,
        targetSatId: best.satId,
        sinrDb: servingSinr,
        reason: 'daps-prepare',
      });

      // If preparation time is 0, immediately go dual-active
      if (config.preparationTimeSec <= 0) {
        return enterDualActive(input);
      }
      return { type: 'none', reason: 'daps-prepare' };
    }

    return { type: 'none', reason: 'no handover condition' };
  }

  // -- prepared ------------------------------------------------------------

  function tickPrepared(input: HandoverTickInput, eligible: HandoverCandidate[]): HandoverDecision {
    const servingSinr = input.servingSinrDb!;
    state.serving!.sinrDb = servingSinr;

    const best = bestNonServing(eligible);

    // Cancel if condition no longer holds
    if (
      !best ||
      !(servingSinr < config.triggerThresholdDb && best.sinrDb > servingSinr + config.hysteresisDb)
    ) {
      state.dapsPhase = 'single-active';
      syncPhase();
      state.pendingTarget = null;
      prepStartTimeSec = null;
      return { type: 'none', reason: 'daps preparation cancelled, condition cleared' };
    }

    state.pendingTarget = best;

    // Wait for preparation timer
    if (input.timeSec - prepStartTimeSec! < config.preparationTimeSec) {
      return { type: 'none', reason: 'daps preparation in progress' };
    }

    return enterDualActive(input);
  }

  function enterDualActive(input: HandoverTickInput): HandoverDecision {
    const target = state.pendingTarget!;

    state.dapsPhase = 'dual-active';
    syncPhase();
    state.dualActiveStartSec = input.timeSec;
    state.sourceServing = { ...state.serving! };
    state.targetServing = {
      satId: target.satId,
      beamId: target.beamId,
      sinrDb: target.sinrDb,
      attachTimeSec: input.timeSec,
    };
    // Primary serving remains source during dual-active
    prepStartTimeSec = null;

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'ho-execute',
      sourceSatId: state.serving!.satId,
      targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason: 'daps-dual-active',
    });

    return { type: 'none', reason: 'daps-dual-active' };
  }

  // -- dual-active ---------------------------------------------------------

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
    if (elapsed >= config.maxDualActiveSec || !targetCandidate) {
      return dapsFallback(input, elapsed >= config.maxDualActiveSec
        ? 'daps-fallback: max dual-active duration exceeded'
        : 'daps-fallback: target lost');
    }

    // Path switch: target SINR good enough
    if (targetSinr >= config.pathSwitchThresholdDb) {
      return doPathSwitch(input);
    }

    return { type: 'none', reason: 'daps dual-active, waiting for path switch condition' };
  }

  function doPathSwitch(input: HandoverTickInput): HandoverDecision {
    const target = state.targetServing!;
    const source = state.sourceServing!;

    state.dapsPhase = 'path-switched';
    syncPhase();

    // Primary serving switches to target
    state.serving = {
      satId: target.satId,
      beamId: target.beamId,
      sinrDb: target.sinrDb,
      attachTimeSec: input.timeSec,
    };

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'ho-execute',
      sourceSatId: source.satId,
      targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason: 'daps-path-switch',
    });

    // Immediately complete (release source)
    return completeHandover(input, source, target);
  }

  function completeHandover(
    input: HandoverTickInput,
    source: ServingState,
    target: ServingState,
  ): HandoverDecision {
    // Ping-pong detection
    const isPingPong =
      previousServingSatId === target.satId &&
      input.timeSec - state.lastHoTimeSec <= PING_PONG_WINDOW_SEC;
    if (isPingPong) state.totalPingPongs++;

    previousServingSatId = source.satId;

    state.dapsPhase = 'single-active';
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
      type: 'ho-complete',
      sourceSatId: source.satId,
      targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason: isPingPong ? 'daps-complete (ping-pong)' : 'daps-complete',
    });

    return {
      type: 'handover',
      targetSatId: target.satId,
      targetBeamId: target.beamId,
      reason: isPingPong ? 'daps-complete (ping-pong)' : 'daps-complete',
    };
  }

  function dapsFallback(input: HandoverTickInput, reason: string): HandoverDecision {
    // Revert to source only
    state.dapsPhase = 'single-active';
    syncPhase();
    // serving remains source (was never changed during dual-active)
    state.targetServing = null;
    state.sourceServing = null;
    state.dualActiveStartSec = null;
    state.pendingTarget = null;
    state.totalFailures++;

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
    state.dapsPhase = 'idle';
    syncPhase();
    state.serving = null;
    state.pendingTarget = null;
    state.sourceServing = null;
    state.targetServing = null;
    state.dualActiveStartSec = null;
    prepStartTimeSec = null;
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
      const eligible = filterCandidates(input.candidates, config.minElevationDeg);

      switch (state.dapsPhase) {
        case 'idle':
          return tickIdle(input, eligible);

        case 'single-active':
          if (input.servingSinrDb === null) {
            return doRelease(input, 'serving SINR lost');
          }
          if (input.servingElevationDeg != null && input.servingElevationDeg < config.minElevationDeg) {
            return doRelease(input, `serving elevation ${input.servingElevationDeg.toFixed(1)}° < ${config.minElevationDeg}°`);
          }
          return tickSingleActive(input, eligible);

        case 'prepared':
          if (input.servingSinrDb === null) {
            return doRelease(input, 'serving SINR lost during preparation');
          }
          if (input.servingElevationDeg != null && input.servingElevationDeg < config.minElevationDeg) {
            return doRelease(input, `serving elevation ${input.servingElevationDeg.toFixed(1)}° < ${config.minElevationDeg}° during preparation`);
          }
          return tickPrepared(input, eligible);

        case 'dual-active':
          if (input.servingSinrDb === null) {
            // Source lost — try path-switch if target is alive
            const targetCandidate = eligible.find(
              (c) =>
                state.targetServing &&
                c.satId === state.targetServing.satId &&
                c.beamId === state.targetServing.beamId,
            );
            if (targetCandidate && targetCandidate.sinrDb >= config.pathSwitchThresholdDb) {
              state.targetServing!.sinrDb = targetCandidate.sinrDb;
              return doPathSwitch(input);
            }
            return doRelease(input, 'both links lost during dual-active');
          }
          return tickDualActive(input, eligible);

        case 'path-switched':
          // Should not linger here — completion is immediate
          state.dapsPhase = 'single-active';
          syncPhase();
          return { type: 'none', reason: 'path-switch completed' };

        case 'completed':
          return { type: 'none', reason: 'in terminal state: completed' };

        default:
          return { type: 'none', reason: 'unknown daps phase' };
      }
    },

    getState(): Readonly<DapsState> {
      return state;
    },

    drainEvents(): HandoverEvent[] {
      const drained = state.events;
      state.events = [];
      return drained;
    },

    reset(): void {
      state = initialDapsState(config);
      previousServingSatId = null;
      prepStartTimeSec = null;
    },
  };
}
