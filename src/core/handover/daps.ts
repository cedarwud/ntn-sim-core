/**
 * DAPS (Dual Active Protocol Stack) handover manager for ntn-sim-core.
 * Source/target links stay active for a bounded dual-active window so the
 * source can keep serving while the target is prepared and promoted.
 * Sources: PAP-2025-DAPS-CORE, PAP-2024-MCCHO-CORE, PAP-2025-RSMA.
 * Governance: sdd/ntn-sim-core-sdd.md §9.3/§9.3.1; no React/Three imports.
 */
import type {
  HandoverManager,
  HandoverManagerState,
  HandoverTickInput,
  HandoverDecision,
  HandoverEvent,
  HandoverCandidate,
  ServingState,
  RlfState,
} from './types';
export type DapsPhase =
  | 'idle'
  | 'single-active'
  | 'prepared'
  | 'dual-active'
  | 'path-switched'
  | 'completed';
export interface DapsState extends HandoverManagerState {
  dapsPhase: DapsPhase;
  /** Source serving state maintained while dual-active is in progress. */
  sourceServing: ServingState | null;
  /** Target serving state maintained while dual-active is in progress. */
  targetServing: ServingState | null;
  /** Time when dual-active started. */
  dualActiveStartSec: number | null;
  /** Maximum allowed dual-active duration in seconds. */
  maxDualActiveSec: number;
  /** Whether packet duplication is enabled. */
  packetDuplication: boolean;
}
export interface DapsConfig {
  /** Absolute SINR threshold for attach and path-switch (dB). Not an inter-HO gate. */
  triggerThresholdDb: number;
  /** Hysteresis for target selection and path switch (dB). */
  hysteresisDb: number;
  /** Time-to-trigger before entering the DAPS preparation phase. */
  tttSec: number;
  /** Preparation time after TTT expiry and before dual-active starts. */
  preparationTimeSec: number;
  /** Maximum allowed dual-active duration in seconds. */
  maxDualActiveSec: number;
  /** Path switch threshold: target SINR must exceed this to switch (dB). */
  pathSwitchThresholdDb: number;
  /** Min elevation for candidates (degrees). */
  minElevationDeg: number;
  /** Enable packet duplication during dual-active. */
  packetDuplication: boolean;
  pingPongWindowSec: number;
  /** Elevation TTT accelerant (deg). Low elevation → shorter TTT. Not a gate. */
  prepareElevationDeg?: number;
  /** EMA smoothing factor for serving SINR. α=1 disables smoothing. */
  sinrEmaAlpha: number;
  /** RLF Qout threshold in dB. */
  rlfQoutDb: number;
  /** RLF Qin threshold in dB. */
  rlfQinDb: number;
  /** N310 out-of-sync events required to start T310. */
  rlfN310: number;
  /** N311 in-sync events required to cancel T310. */
  rlfN311: number;
  /** T310 timer in seconds. */
  rlfT310Sec: number;
}
const DEFAULT_PING_PONG_WINDOW_SEC = 5;
const DEFAULT_RLF_QOUT_DB = -8.0;
const DEFAULT_RLF_QIN_DB = -6.0;
const DEFAULT_RLF_N310 = 1;
const DEFAULT_RLF_N311 = 1;
const DEFAULT_RLF_T310_MS = 2000;
const MIN_DUAL_ACTIVE_OVERLAP_SEC = 0;
const DEFAULT_DAPS_CONFIG: DapsConfig = {
  triggerThresholdDb: -6,
  hysteresisDb: 1,
  tttSec: 0.64,
  preparationTimeSec: 0.5,
  maxDualActiveSec: 2.0,
  pathSwitchThresholdDb: -6,
  minElevationDeg: 10,
  packetDuplication: true,
  pingPongWindowSec: DEFAULT_PING_PONG_WINDOW_SEC,
  sinrEmaAlpha: 1,
  rlfQoutDb: DEFAULT_RLF_QOUT_DB,
  rlfQinDb: DEFAULT_RLF_QIN_DB,
  rlfN310: DEFAULT_RLF_N310,
  rlfN311: DEFAULT_RLF_N311,
  rlfT310Sec: DEFAULT_RLF_T310_MS / 1000,
};
function initialRlf(): RlfState {
  return { phase: 'normal', n310Count: 0, n311Count: 0, t310StartSec: null };
}
const DAPS_TO_HO_PHASE: Record<DapsPhase, HandoverManagerState['phase']> = {
  'idle': 'idle', 'single-active': 'attached', 'prepared': 'preparing',
  'dual-active': 'switching', 'path-switched': 'switching', 'completed': 'completed',
};
function filterCandidates(
  candidates: HandoverCandidate[],
  minElevationDeg: number,
): HandoverCandidate[] {
  return candidates.filter((candidate) => candidate.elevationDeg >= minElevationDeg);
}
function initialDapsState(c: DapsConfig): DapsState {
  return { phase: 'idle', serving: null, pendingTarget: null, tttStartTimeSec: null,
    lastHoTimeSec: -Infinity, totalHandovers: 0, totalFailures: 0, totalPingPongs: 0,
    totalRlfs: 0, rlf: initialRlf(), events: [], dapsPhase: 'idle', sourceServing: null,
    targetServing: null, dualActiveStartSec: null,
    maxDualActiveSec: c.maxDualActiveSec, packetDuplication: c.packetDuplication };
}
export function createDapsManager(userConfig?: Partial<DapsConfig>): HandoverManager {
  const config: DapsConfig = { ...DEFAULT_DAPS_CONFIG, ...userConfig };
  let state = initialDapsState(config);
  let previousServingSatId: string | null = null;
  let preparationStartSec: number | null = null;
  let servingEmaSinrDb: number | null = null;
  const candidateEma = new Map<string, number>();

  function syncPhase(): void {
    state.phase = DAPS_TO_HO_PHASE[state.dapsPhase];
  }

  /** Smooth candidate SINRs with the same EMA alpha used for serving. */
  function smoothCandidates(raw: HandoverCandidate[]): HandoverCandidate[] {
    const active = new Set<string>();
    const out = raw.map((c) => {
      const k = `${c.satId}:${c.beamId}`;
      active.add(k);
      const p = candidateEma.get(k);
      const s = p === undefined ? c.sinrDb : config.sinrEmaAlpha * c.sinrDb + (1 - config.sinrEmaAlpha) * p;
      candidateEma.set(k, s);
      return { ...c, sinrDb: s };
    });
    for (const k of candidateEma.keys()) if (!active.has(k)) candidateEma.delete(k);
    return out.sort((a, b) => b.sinrDb - a.sinrDb);
  }

  function emit(event: HandoverEvent): void {
    state.events.push(event);
  }

  function effectiveTttSec(delayMs?: number, elevationDeg?: number | null): number {
    let ttt = config.tttSec;
    if (ttt <= 0) return 0; // instant trigger — skip delay/elevation adjustments
    if (delayMs) ttt += 2 * delayMs / 1000;
    // Elevation accelerant: low serving elevation → shorter TTT (50–100%).
    const pe = config.prepareElevationDeg;
    if (pe !== undefined && elevationDeg != null && elevationDeg < pe) {
      const range = pe - config.minElevationDeg;
      if (range > 0) {
        const f = Math.max(0, Math.min(1, (elevationDeg - config.minElevationDeg) / range));
        ttt *= 0.5 + 0.5 * f;
      }
    }
    return ttt;
  }

  function bestNonServing(eligible: HandoverCandidate[]): HandoverCandidate | undefined {
    return eligible.find((candidate) => (
      !state.serving
      || candidate.satId !== state.serving.satId
      || candidate.beamId !== state.serving.beamId
    ));
  }

  /** Pure A3: candidate must exceed serving by hysteresis. No source-degradation gate. */
  function shouldPrepare(
    servingSinrDb: number,
    bestCandidate: HandoverCandidate | undefined,
  ): boolean {
    if (!bestCandidate) return false;
    return bestCandidate.sinrDb > servingSinrDb + config.hysteresisDb;
  }

  function attachThresholdDb(): number {
    return Math.max(config.triggerThresholdDb, config.rlfQinDb);
  }

  function resetTriggerState(): void {
    state.pendingTarget = null;
    state.tttStartTimeSec = null;
    preparationStartSec = null;
  }

  function attachTarget(
    input: HandoverTickInput,
    target: HandoverCandidate,
    reason: string,
  ): HandoverDecision {
    state.dapsPhase = 'single-active';
    syncPhase();
    state.serving = {
      satId: target.satId,
      beamId: target.beamId,
      sinrDb: target.sinrDb,
      attachTimeSec: input.timeSec,
    };
    state.sourceServing = null;
    state.targetServing = null;
    state.dualActiveStartSec = null;
    state.rlf = initialRlf();
    resetTriggerState();
    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'attach',
      targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason,
    });
    return {
      type: 'attach',
      targetSatId: target.satId,
      targetBeamId: target.beamId,
      reason,
    };
  }

  function rlfTick(sinrDb: number | null, timeSec: number, tick: number): boolean {
    const rlf = state.rlf;
    const isOos = sinrDb === null || sinrDb < config.rlfQoutDb;
    const isIn = sinrDb !== null && sinrDb >= config.rlfQinDb;

    if (rlf.phase === 'normal') {
      if (isOos) {
        rlf.n310Count += 1;
        if (rlf.n310Count >= config.rlfN310) {
          rlf.phase = 'out-of-sync';
          rlf.t310StartSec = timeSec;
          rlf.n311Count = 0;
          emit({
            tick,
            timeSec,
            type: 'rlf-oos',
            sinrDb: sinrDb ?? undefined,
            reason: `N310=${rlf.n310Count} OOS events, T310 started`,
          });
        }
      } else {
        rlf.n310Count = 0;
      }
      return false;
    }

    if (rlf.phase === 'out-of-sync') {
      if (timeSec - rlf.t310StartSec! >= config.rlfT310Sec) {
        rlf.phase = 'reestablish';
        state.totalRlfs += 1;
        emit({
          tick,
          timeSec,
          type: 'rlf-declared',
          sinrDb: sinrDb ?? undefined,
          reason: `T310 expired after ${config.rlfT310Sec * 1000} ms — RLF declared`,
        });
        return true;
      }
      if (isIn) {
        rlf.n311Count += 1;
        if (rlf.n311Count >= config.rlfN311) {
          rlf.phase = 'normal';
          rlf.n310Count = 0;
          rlf.n311Count = 0;
          rlf.t310StartSec = null;
          emit({
            tick,
            timeSec,
            type: 'rlf-recovery',
            sinrDb: sinrDb ?? undefined,
            reason: `N311=${rlf.n311Count} IS events, T310 cancelled`,
          });
        }
      } else {
        rlf.n311Count = 0;
      }
    }

    return false;
  }
  function tryAttach(
    input: HandoverTickInput,
    eligible: HandoverCandidate[],
  ): HandoverDecision {
    const best = eligible[0];
    if (!best || best.sinrDb < attachThresholdDb()) {
      return { type: 'none', reason: 'no candidate above attach threshold' };
    }
    return attachTarget(input, best, 'initial attach');
  }
  function tickSingleActive(
    input: HandoverTickInput,
    eligible: HandoverCandidate[],
  ): HandoverDecision {
    const servingSinr = input.servingSinrDb!;
    state.serving!.sinrDb = servingSinr;

    if (eligible.length === 0 && servingSinr < config.triggerThresholdDb) {
      return doRelease(input, 'serving SINR below threshold, no candidates');
    }

    const best = bestNonServing(eligible);
    if (!shouldPrepare(servingSinr, best)) {
      return { type: 'none', reason: 'no handover condition' };
    }

    if (
      best
      && previousServingSatId === best.satId
      && input.timeSec - state.lastHoTimeSec <= config.pingPongWindowSec
    ) {
      return { type: 'none', reason: 'ping-pong guard: target recently served, DAPS blocked' };
    }

    // Transition to prepared — BH scheduler freezes during this phase,
    // so beams stay stable and SINR won't fluctuate from slot rotation.
    state.dapsPhase = 'prepared';
    syncPhase();
    state.pendingTarget = best!;
    state.tttStartTimeSec = input.timeSec;
    preparationStartSec = null;

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'ho-trigger',
      sourceSatId: state.serving!.satId,
      targetSatId: best!.satId,
      sinrDb: servingSinr,
      reason: 'daps condition met, TTT started',
    });

    return { type: 'none', reason: 'daps prepared, BH frozen' };
  }
  function tickPrepared(
    input: HandoverTickInput,
    eligible: HandoverCandidate[],
  ): HandoverDecision {
    const servingSinr = input.servingSinrDb!;
    state.serving!.sinrDb = servingSinr;

    const trackedTarget = state.pendingTarget
      ? eligible.find((candidate) => candidate.satId === state.pendingTarget!.satId)
      : undefined;
    const best = trackedTarget ?? bestNonServing(eligible);
    // A3 leaving condition uses -hysteresis (enter uses +hysteresis).
    const keepPrepared = trackedTarget
      ? best !== undefined && best.sinrDb >= servingSinr - config.hysteresisDb
      : shouldPrepare(servingSinr, best);
    if (!keepPrepared || !best) {
      state.dapsPhase = 'single-active';
      syncPhase();
      resetTriggerState();
      return { type: 'none', reason: 'daps condition cleared, preparation cancelled' };
    }

    state.pendingTarget = best;

    const tttElapsedSec = input.timeSec - state.tttStartTimeSec!;
    if (tttElapsedSec < effectiveTttSec(input.propagationDelayMs, input.servingElevationDeg)) {
      return { type: 'none', reason: 'daps TTT running' };
    }

    if (preparationStartSec === null) {
      preparationStartSec = input.timeSec;
    }

    if (input.timeSec - preparationStartSec < config.preparationTimeSec) {
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
    state.tttStartTimeSec = null;
    preparationStartSec = null;

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'ho-execute',
      sourceSatId: state.serving!.satId,
      targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason: 'daps dual-active started',
    });

    return { type: 'none', reason: 'daps dual-active' };
  }
  function canPathSwitch(targetSinr: number): boolean {
    return targetSinr >= config.pathSwitchThresholdDb;
  }
  function tickDualActive(
    input: HandoverTickInput,
    eligible: HandoverCandidate[],
  ): HandoverDecision {
    const sourceSinr = input.servingSinrDb!;
    state.serving!.sinrDb = sourceSinr;
    if (state.sourceServing) state.sourceServing.sinrDb = sourceSinr;

    const targetCandidate = eligible.find((candidate) => (
      state.targetServing
      && candidate.satId === state.targetServing.satId
    ));
    if (targetCandidate && state.targetServing) {
      state.targetServing.beamId = targetCandidate.beamId;
      state.targetServing.sinrDb = targetCandidate.sinrDb;
    }

    const elapsedSec = input.timeSec - state.dualActiveStartSec!;
    const targetSinr = state.targetServing?.sinrDb ?? -Infinity;

    if (elapsedSec >= config.maxDualActiveSec || !targetCandidate) return dapsFallback(
      input,
      elapsedSec >= config.maxDualActiveSec
        ? 'daps fallback: max dual-active duration exceeded'
        : 'daps fallback: target lost',
    );
    if (elapsedSec < Math.min(config.maxDualActiveSec, MIN_DUAL_ACTIVE_OVERLAP_SEC)) {
      return { type: 'none', reason: 'daps dual-active, minimum overlap running' };
    }
    if (canPathSwitch(targetSinr)) return doPathSwitch(input);
    return { type: 'none', reason: 'daps dual-active, waiting for path switch condition' };
  }
  function doPathSwitch(input: HandoverTickInput): HandoverDecision {
    const target = state.targetServing!;
    const source = state.sourceServing!;

    state.dapsPhase = 'path-switched';
    syncPhase();
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
      reason: 'daps path switch',
    });

    return completeHandover(input, source, target);
  }
  function completeHandover(
    input: HandoverTickInput,
    source: ServingState,
    target: ServingState,
  ): HandoverDecision {
    const isPingPong = (
      previousServingSatId === target.satId
      && input.timeSec - state.lastHoTimeSec <= config.pingPongWindowSec
    );
    if (isPingPong) state.totalPingPongs += 1;

    previousServingSatId = source.satId;

    state.dapsPhase = 'single-active';
    syncPhase();
    state.sourceServing = null;
    state.targetServing = null;
    state.dualActiveStartSec = null;
    state.lastHoTimeSec = input.timeSec;
    state.totalHandovers += 1;
    state.rlf = initialRlf();
    resetTriggerState();

    emit({
      tick: input.tick,
      timeSec: input.timeSec,
      type: 'ho-complete',
      sourceSatId: source.satId,
      targetSatId: target.satId,
      sinrDb: target.sinrDb,
      reason: isPingPong ? 'daps complete (ping-pong)' : 'daps complete',
    });

    return {
      type: 'handover',
      targetSatId: target.satId,
      targetBeamId: target.beamId,
      reason: isPingPong ? 'daps complete (ping-pong)' : 'daps complete',
    };
  }
  function dapsFallback(input: HandoverTickInput, reason: string): HandoverDecision {
    state.dapsPhase = 'single-active';
    syncPhase();
    state.targetServing = null;
    state.sourceServing = null;
    state.dualActiveStartSec = null;
    state.totalFailures += 1;
    resetTriggerState();

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
  function doRelease(input: HandoverTickInput, reason: string): HandoverDecision {
    const source = state.serving;
    state.dapsPhase = 'idle';
    syncPhase();
    state.serving = null;
    state.sourceServing = null;
    state.targetServing = null;
    state.dualActiveStartSec = null;
    state.rlf = initialRlf();
    resetTriggerState();
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
      if (input.servingSinrDb !== null) {
        servingEmaSinrDb = servingEmaSinrDb === null
          ? input.servingSinrDb
          : config.sinrEmaAlpha * input.servingSinrDb + (1 - config.sinrEmaAlpha) * servingEmaSinrDb;
      } else {
        servingEmaSinrDb = null;
      }

      const smoothedInput: HandoverTickInput = { ...input, servingSinrDb: servingEmaSinrDb };
      const eligible = smoothCandidates(filterCandidates(input.candidates, config.minElevationDeg));

      switch (state.dapsPhase) {
        case 'idle':
          return tryAttach(smoothedInput, eligible);

        case 'single-active':
          if (rlfTick(smoothedInput.servingSinrDb, smoothedInput.timeSec, smoothedInput.tick)) {
            return doRelease(smoothedInput, 'RLF declared (T310 expired)');
          }
          if (
            smoothedInput.servingElevationDeg != null
            && smoothedInput.servingElevationDeg < config.minElevationDeg
          ) {
            return doRelease(
              smoothedInput,
              `serving elevation ${smoothedInput.servingElevationDeg.toFixed(1)}° < ${config.minElevationDeg}°`,
            );
          }
          if (state.rlf.phase === 'out-of-sync') {
            return { type: 'none', reason: 'RLF T310 running, DAPS evaluation suspended' };
          }
          return tickSingleActive(smoothedInput, eligible);

        case 'prepared':
          if (rlfTick(smoothedInput.servingSinrDb, smoothedInput.timeSec, smoothedInput.tick)) {
            return doRelease(smoothedInput, 'RLF declared during DAPS preparation (T310 expired)');
          }
          if (
            smoothedInput.servingElevationDeg != null
            && smoothedInput.servingElevationDeg < config.minElevationDeg
          ) {
            return doRelease(
              smoothedInput,
              `serving elevation ${smoothedInput.servingElevationDeg.toFixed(1)}° < ${config.minElevationDeg}° during preparation`,
            );
          }
          if (state.rlf.phase === 'out-of-sync') {
            return { type: 'none', reason: 'RLF T310 running, DAPS preparation suspended' };
          }
          return tickPrepared(smoothedInput, eligible);

        case 'dual-active':
          if (smoothedInput.servingSinrDb === null) {
            const targetCandidate = eligible.find((candidate) => (
              state.targetServing
              && candidate.satId === state.targetServing.satId
            ));
            if (targetCandidate && canPathSwitch(targetCandidate.sinrDb)) {
              state.targetServing!.beamId = targetCandidate.beamId;
              state.targetServing!.sinrDb = targetCandidate.sinrDb;
              return doPathSwitch(smoothedInput);
            }
            return doRelease(smoothedInput, 'both links lost during dual-active');
          }
          return tickDualActive(smoothedInput, eligible);

        case 'path-switched':
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
      preparationStartSec = null;
      servingEmaSinrDb = null;
      candidateEma.clear();
    },
  };
}
