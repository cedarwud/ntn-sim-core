/**
 * SINR-offset handover manager for ntn-sim-core.
 *
 * Ported from leo-beam-sim's HandoverManager (sinr-offset policy).
 * Combines per-candidate SINR EMA smoothing, pending-target hysteresis,
 * intra-satellite beam switching, ping-pong guard, and 3GPP RLF detection.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md S9.3
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md S3, S4
 *   - This file must not import React, Three.js, or scene code.
 *
 * @source leo-beam-sim/src/engine/handover/handover-manager.ts
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
// Constants (defaults matching leo-beam-sim reference)
// ---------------------------------------------------------------------------

const DEFAULT_OFFSET_DB = 3;
const DEFAULT_TRIGGER_TIME_SEC = 3.5;
const DEFAULT_PENDING_HOLD_SEC = 1.5;
const DEFAULT_SMOOTHING_SEC = 0.5;
const DEFAULT_INTRA_SWITCH_SEC = 0.75;
const DEFAULT_PING_PONG_WINDOW_SEC = 5;

/** Relaxed threshold for re-attach after service loss (leo-beam-sim: 3 dB). */
const REATTACH_THRESHOLD_RELAX_DB = 3;

// RLF defaults (3GPP TS 38.331 + TR 38.821 NTN) — same as manager.ts
const DEFAULT_RLF_QOUT_DB = -8.0;
const DEFAULT_RLF_QIN_DB = -6.0;
const DEFAULT_RLF_N310 = 1;
const DEFAULT_RLF_N311 = 1;
const DEFAULT_RLF_T310_MS = 2000;

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

function candidateKey(satId: string, beamId: string): string {
  return `${satId}:${beamId}`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createSinrOffsetManager(config: HandoverConfig): HandoverManager {
  // Config extraction
  const offsetDb = config.sinr_offset_db ?? DEFAULT_OFFSET_DB;
  const triggerTimeSec = config.sinr_offset_trigger_time_sec ?? DEFAULT_TRIGGER_TIME_SEC;
  const pendingHoldSec = config.sinr_offset_pending_hold_sec ?? DEFAULT_PENDING_HOLD_SEC;
  const smoothingSec = config.sinr_offset_smoothing_sec ?? DEFAULT_SMOOTHING_SEC;
  const intraSwitchSec = config.sinr_offset_intra_switch_sec ?? DEFAULT_INTRA_SWITCH_SEC;
  const pingPongWindowSec = config.pingPongWindowSec ?? DEFAULT_PING_PONG_WINDOW_SEC;
  const minElevationDeg = config.min_elevation_deg;
  const attachThresholdDb = config.trigger_threshold_db;

  // RLF parameters
  const rlfQout = config.rlf_qout_db ?? DEFAULT_RLF_QOUT_DB;
  const rlfQin = config.rlf_qin_db ?? DEFAULT_RLF_QIN_DB;
  const rlfN310 = config.rlf_n310 ?? DEFAULT_RLF_N310;
  const rlfN311 = config.rlf_n311 ?? DEFAULT_RLF_N311;
  const rlfT310Sec = (config.rlf_t310_ms ?? DEFAULT_RLF_T310_MS) / 1000;

  // Manager state
  let state = initialState();
  let lastTimeSec: number | null = null;
  let previousServingSatId: string | null = null;
  let guardUntilSec = -Infinity;
  /** Whether an attach has occurred (for re-attach relaxed threshold). */
  let hasAttached = false;

  // Per-candidate SINR smoothing
  const smoothedSinr = new Map<string, number>();

  // Pending target tracking
  let pendingTarget: { satId: string; beamId: string } | null = null;
  let pendingSinceTimeSec = 0;
  let triggerAccumulatedSec = 0;

  // Intra-satellite beam switch tracking
  let intraSwitchBeamId: string | null = null;
  let intraSwitchAccumulatedSec = 0;

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  function emit(event: HandoverEvent): void {
    state.events.push(event);
  }

  /**
   * Advance the RLF state machine by one tick.
   * Returns true if RLF was declared (T310 expired) -- caller must do doRelease().
   * Copied from manager.ts with identical semantics.
   *
   * @source 3GPP TS 38.331 S5.3.10.3
   * @source TR 38.821 S6.3.4 (NTN T310 extension)
   */
  function rlfTick(sinrDb: number | null, timeSec: number, tick: number): boolean {
    const rlf = state.rlf;

    const isOos = sinrDb === null || sinrDb < rlfQout;
    const isIn = sinrDb !== null && sinrDb >= rlfQin;

    if (rlf.phase === 'normal') {
      if (isOos) {
        rlf.n310Count++;
        if (rlf.n310Count >= rlfN310) {
          rlf.phase = 'out-of-sync';
          rlf.t310StartSec = timeSec;
          rlf.n311Count = 0;
          emit({
            tick, timeSec, type: 'rlf-oos', sinrDb: sinrDb ?? undefined,
            reason: `N310=${rlf.n310Count} OOS events, T310 started`,
          });
        }
      } else {
        rlf.n310Count = 0;
      }
      return false;
    }

    if (rlf.phase === 'out-of-sync') {
      if (timeSec - rlf.t310StartSec! >= rlfT310Sec) {
        rlf.phase = 'reestablish';
        state.totalRlfs++;
        emit({
          tick, timeSec, type: 'rlf-declared', sinrDb: sinrDb ?? undefined,
          reason: `T310 expired after ${rlfT310Sec * 1000} ms -- RLF declared`,
        });
        return true;
      }

      if (isIn) {
        rlf.n311Count++;
        if (rlf.n311Count >= rlfN311) {
          rlf.phase = 'normal';
          rlf.n310Count = 0;
          rlf.n311Count = 0;
          rlf.t310StartSec = null;
          emit({
            tick, timeSec, type: 'rlf-recovery', sinrDb: sinrDb ?? undefined,
            reason: `N311=${rlf.n311Count} IS events, T310 cancelled`,
          });
        }
      } else {
        rlf.n311Count = 0;
      }
      return false;
    }

    // reestablish phase: waiting for doRelease() to move back to idle
    return false;
  }

  function doRelease(input: HandoverTickInput, reason: string): HandoverDecision {
    const source = state.serving;
    state.phase = 'idle';
    state.serving = null;
    state.pendingTarget = null;
    state.tttStartTimeSec = null;
    state.rlf = initialRlf();
    clearPendingTarget();
    clearIntraSwitch();
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

  function smoothCandidates(
    candidates: HandoverCandidate[],
    dt: number,
  ): Map<string, number> {
    const activeKeys = new Set<string>();
    const alpha = smoothingSec <= 0
      ? 1
      : Math.min(1, dt / (smoothingSec + dt));

    for (const c of candidates) {
      const key = candidateKey(c.satId, c.beamId);
      activeKeys.add(key);
      const prev = smoothedSinr.get(key);
      const sinrDb = prev === undefined || alpha >= 1
        ? c.sinrDb
        : prev + (c.sinrDb - prev) * alpha;
      smoothedSinr.set(key, sinrDb);
    }

    // Prune entries not in current candidates
    for (const key of smoothedSinr.keys()) {
      if (!activeKeys.has(key)) smoothedSinr.delete(key);
    }

    return smoothedSinr;
  }

  function clearPendingTarget(): void {
    pendingTarget = null;
    triggerAccumulatedSec = 0;
    pendingSinceTimeSec = 0;
  }

  function clearIntraSwitch(): void {
    intraSwitchBeamId = null;
    intraSwitchAccumulatedSec = 0;
  }

  function getSmoothedSinr(satId: string, beamId: string): number | null {
    return smoothedSinr.get(candidateKey(satId, beamId)) ?? null;
  }

  // -------------------------------------------------------------------------
  // Main tick
  // -------------------------------------------------------------------------

  return {
    tick(input: HandoverTickInput): HandoverDecision {
      const { tick, timeSec, candidates } = input;

      // 1. Compute dt
      const dt = lastTimeSec !== null ? timeSec - lastTimeSec : 1.0;
      lastTimeSec = timeSec;

      // Filter by elevation
      const eligible = candidates.filter((c) => c.elevationDeg >= minElevationDeg);

      // 2. Smooth all candidates
      smoothCandidates(eligible, dt);

      // Build smoothed-sorted list (SINR descending, elevation tiebreak <1dB)
      const smoothedCandidates = eligible.map((c) => ({
        ...c, sinrDb: getSmoothedSinr(c.satId, c.beamId) ?? c.sinrDb,
      })).sort((a, b) => {
        const d = b.sinrDb - a.sinrDb;
        return Math.abs(d) < 1.0 ? b.elevationDeg - a.elevationDeg : d;
      });

      // 3. Get smoothed serving SINR
      let servingSinrSmoothed: number | null = null;
      if (state.serving) {
        const sKey = candidateKey(state.serving.satId, state.serving.beamId);
        servingSinrSmoothed = smoothedSinr.get(sKey) ?? null;
        if (servingSinrSmoothed !== null) {
          state.serving.sinrDb = servingSinrSmoothed;
        }
      }

      // 4. RLF check (only when attached)
      if (state.serving && state.phase !== 'idle') {
        if (rlfTick(servingSinrSmoothed, timeSec, tick)) {
          return doRelease(input, 'RLF declared (T310 expired)');
        }
        // Hard release: satellite below horizon
        if (
          input.servingElevationDeg != null &&
          input.servingElevationDeg < minElevationDeg
        ) {
          return doRelease(
            input,
            `serving elevation ${input.servingElevationDeg.toFixed(1)}deg < ${minElevationDeg}deg`,
          );
        }
        // While in out-of-sync phase, skip HO trigger evaluation
        if (state.rlf.phase === 'out-of-sync') {
          return { type: 'none', reason: 'RLF T310 running, HO evaluation suspended' };
        }
      }

      // 5. If not serving (idle): initial attach or re-attach
      if (!state.serving) {
        clearPendingTarget();
        clearIntraSwitch();

        if (smoothedCandidates.length === 0) {
          return { type: 'none', reason: 'no candidates' };
        }

        const best = smoothedCandidates[0];
        // Use relaxed threshold for re-attach after service loss
        const threshold = hasAttached
          ? attachThresholdDb - REATTACH_THRESHOLD_RELAX_DB
          : attachThresholdDb;

        if (best.sinrDb >= threshold) {
          hasAttached = true;
          state.phase = 'attached';
          state.serving = {
            satId: best.satId,
            beamId: best.beamId,
            sinrDb: best.sinrDb,
            attachTimeSec: timeSec,
          };
          state.rlf = initialRlf();
          emit({
            tick,
            timeSec,
            type: 'attach',
            targetSatId: best.satId,
            sinrDb: best.sinrDb,
            reason: hasAttached ? 're-attach after service loss' : 'initial attach',
          });
          return {
            type: 'attach',
            targetSatId: best.satId,
            targetBeamId: best.beamId,
            reason: 'initial attach',
          };
        }

        return { type: 'none', reason: 'no candidate above attach threshold' };
      }

      // From here on, state.serving is guaranteed
      if (smoothedCandidates.length === 0) {
        clearPendingTarget();
        clearIntraSwitch();
        return { type: 'none', reason: 'no candidates' };
      }

      const currentSinr = servingSinrSmoothed ?? -Infinity;

      // 6. Intra-satellite beam switch check
      const bestSameBeam = smoothedCandidates.find(
        (c) =>
          c.satId === state.serving!.satId &&
          c.beamId !== state.serving!.beamId &&
          c.sinrDb > currentSinr,
      );

      if (bestSameBeam) {
        if (intraSwitchBeamId === bestSameBeam.beamId) {
          intraSwitchAccumulatedSec += dt;
        } else {
          intraSwitchBeamId = bestSameBeam.beamId;
          intraSwitchAccumulatedSec = dt;
        }

        if (intraSwitchAccumulatedSec >= intraSwitchSec) {
          // Execute intra-switch
          const source = state.serving!;
          emit({
            tick,
            timeSec,
            type: 'ho-trigger',
            sourceSatId: source.satId,
            targetSatId: source.satId,
            sinrDb: currentSinr,
            reason: `intra-switch beam ${source.beamId} -> ${bestSameBeam.beamId}`,
          });
          emit({
            tick,
            timeSec,
            type: 'ho-execute',
            sourceSatId: source.satId,
            targetSatId: source.satId,
            sinrDb: bestSameBeam.sinrDb,
            reason: `intra-switch after ${intraSwitchAccumulatedSec.toFixed(1)}s dwell`,
          });

          state.serving = {
            satId: source.satId,
            beamId: bestSameBeam.beamId,
            sinrDb: bestSameBeam.sinrDb,
            attachTimeSec: timeSec,
          };

          emit({
            tick,
            timeSec,
            type: 'ho-complete',
            sourceSatId: source.satId,
            targetSatId: source.satId,
            sinrDb: bestSameBeam.sinrDb,
            reason: 'intra-switch complete',
          });

          clearIntraSwitch();
          return {
            type: 'handover',
            targetSatId: source.satId,
            targetBeamId: bestSameBeam.beamId,
            reason: `intra-switch after ${intraSwitchAccumulatedSec.toFixed(1)}s dwell`,
          };
        }
      } else {
        clearIntraSwitch();
      }

      // 7. Ping-pong guard check
      if (timeSec < guardUntilSec) {
        clearPendingTarget();
        return { type: 'none', reason: 'ping-pong guard active' };
      }

      // 8. Inter-satellite handover
      const qualifiedTargets = smoothedCandidates.filter(
        (c) =>
          c.satId !== state.serving!.satId &&
          c.sinrDb > currentSinr + offsetDb,
      );
      const bestTarget = qualifiedTargets[0];

      if (!bestTarget) {
        clearPendingTarget();
        return { type: 'none', reason: 'no handover condition' };
      }

      // Qualified target found
      const sameAsPending =
        pendingTarget !== null &&
        pendingTarget.satId === bestTarget.satId &&
        pendingTarget.beamId === bestTarget.beamId;

      if (sameAsPending) {
        // Same target, accumulate trigger time
        triggerAccumulatedSec += dt;

        if (triggerAccumulatedSec >= triggerTimeSec) {
          // Execute inter-satellite handover
          const source = state.serving!;

          emit({
            tick,
            timeSec,
            type: 'ho-trigger',
            sourceSatId: source.satId,
            targetSatId: bestTarget.satId,
            sinrDb: currentSinr,
            reason: `sinr-offset trigger: target SINR ${bestTarget.sinrDb.toFixed(1)} > serving ${currentSinr.toFixed(1)} + ${offsetDb}dB for ${triggerAccumulatedSec.toFixed(1)}s`,
          });

          emit({
            tick,
            timeSec,
            type: 'ho-execute',
            sourceSatId: source.satId,
            targetSatId: bestTarget.satId,
            sinrDb: bestTarget.sinrDb,
            reason: 'sinr-offset handover executing',
          });

          // Ping-pong detection
          const isPingPong =
            previousServingSatId === bestTarget.satId &&
            timeSec - state.lastHoTimeSec <= pingPongWindowSec;
          if (isPingPong) {
            state.totalPingPongs++;
          }

          previousServingSatId = source.satId;
          state.serving = {
            satId: bestTarget.satId,
            beamId: bestTarget.beamId,
            sinrDb: bestTarget.sinrDb,
            attachTimeSec: timeSec,
          };
          guardUntilSec = timeSec + pingPongWindowSec;
          state.lastHoTimeSec = timeSec;
          state.totalHandovers++;
          state.phase = 'attached';
          state.rlf = initialRlf();

          emit({
            tick,
            timeSec,
            type: 'ho-complete',
            sourceSatId: source.satId,
            targetSatId: bestTarget.satId,
            sinrDb: bestTarget.sinrDb,
            reason: isPingPong ? 'handover complete (ping-pong)' : 'handover complete',
          });

          clearPendingTarget();
          clearIntraSwitch();

          return {
            type: 'handover',
            targetSatId: bestTarget.satId,
            targetBeamId: bestTarget.beamId,
            reason: isPingPong
              ? 'sinr-offset handover (ping-pong)'
              : `sinr-offset handover after ${triggerAccumulatedSec.toFixed(1)}s`,
          };
        }

        return { type: 'none', reason: `trigger accumulating ${triggerAccumulatedSec.toFixed(1)}/${triggerTimeSec.toFixed(1)}s` };
      }

      // Different target from pending
      if (pendingTarget !== null) {
        // Check if pending target is still qualified
        const pendingStillQualified = qualifiedTargets.find(
          (c) =>
            c.satId === pendingTarget!.satId &&
            c.beamId === pendingTarget!.beamId,
        );

        if (pendingStillQualified && timeSec - pendingSinceTimeSec < pendingHoldSec) {
          // Hold hysteresis: keep accumulating on old target
          triggerAccumulatedSec += dt;

          if (triggerAccumulatedSec >= triggerTimeSec) {
            // Execute on old pending target
            const source = state.serving!;

            emit({
              tick,
              timeSec,
              type: 'ho-trigger',
              sourceSatId: source.satId,
              targetSatId: pendingStillQualified.satId,
              sinrDb: currentSinr,
              reason: `sinr-offset trigger (pending hold): stable for ${triggerAccumulatedSec.toFixed(1)}s`,
            });

            emit({
              tick,
              timeSec,
              type: 'ho-execute',
              sourceSatId: source.satId,
              targetSatId: pendingStillQualified.satId,
              sinrDb: pendingStillQualified.sinrDb,
              reason: 'sinr-offset handover executing (pending hold)',
            });

            const isPingPong =
              previousServingSatId === pendingStillQualified.satId &&
              timeSec - state.lastHoTimeSec <= pingPongWindowSec;
            if (isPingPong) {
              state.totalPingPongs++;
            }

            previousServingSatId = source.satId;
            state.serving = {
              satId: pendingStillQualified.satId,
              beamId: pendingStillQualified.beamId,
              sinrDb: pendingStillQualified.sinrDb,
              attachTimeSec: timeSec,
            };
            guardUntilSec = timeSec + pingPongWindowSec;
            state.lastHoTimeSec = timeSec;
            state.totalHandovers++;
            state.phase = 'attached';
            state.rlf = initialRlf();

            emit({
              tick,
              timeSec,
              type: 'ho-complete',
              sourceSatId: source.satId,
              targetSatId: pendingStillQualified.satId,
              sinrDb: pendingStillQualified.sinrDb,
              reason: isPingPong ? 'handover complete (ping-pong)' : 'handover complete',
            });

            clearPendingTarget();
            clearIntraSwitch();

            return {
              type: 'handover',
              targetSatId: pendingStillQualified.satId,
              targetBeamId: pendingStillQualified.beamId,
              reason: isPingPong
                ? 'sinr-offset handover (ping-pong, pending hold)'
                : `sinr-offset handover after ${triggerAccumulatedSec.toFixed(1)}s (pending hold)`,
            };
          }

          return { type: 'none', reason: `pending hold active, accumulating ${triggerAccumulatedSec.toFixed(1)}/${triggerTimeSec.toFixed(1)}s` };
        }
      }

      // Set new pending target (either first time, or hold expired, or old target gone)
      pendingTarget = { satId: bestTarget.satId, beamId: bestTarget.beamId };
      pendingSinceTimeSec = timeSec;
      triggerAccumulatedSec = dt;

      return { type: 'none', reason: `new pending target ${bestTarget.satId}:${bestTarget.beamId}` };
    },

    getState(): Readonly<HandoverManagerState> {
      return state;
    },

    getTriggerState: () => ({
      triggerAccumulatedSec, triggerTimeSec,
      pendingTargetSatId: pendingTarget?.satId ?? null, pendingTargetBeamId: pendingTarget?.beamId ?? null,
    }),

    drainEvents(): HandoverEvent[] {
      const drained = state.events;
      state.events = [];
      return drained;
    },

    reset(): void {
      state = initialState();
      lastTimeSec = null;
      previousServingSatId = null;
      guardUntilSec = -Infinity;
      hasAttached = false;
      smoothedSinr.clear();
      clearPendingTarget();
      clearIntraSwitch();
    },
  };
}
