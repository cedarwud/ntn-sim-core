/**
 * Handover engine types for ntn-sim-core.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.3
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3, §4
 *   - This file must not import React, Three.js, or scene code.
 */

// ---------------------------------------------------------------------------
// Handover Phase FSM
// ---------------------------------------------------------------------------

export type HoPhase = 'idle' | 'attached' | 'preparing' | 'switching' | 'completed' | 'failed';

// ---------------------------------------------------------------------------
// RLF State Machine (A2)
// 3GPP TS 38.331 §5.3.10 + TR 38.821 NTN adaptation
// ---------------------------------------------------------------------------

/**
 * RLF detection phase.
 *
 * normal       — serving link quality OK (Qin ≤ SINR)
 * out-of-sync  — N310 out-of-sync events accumulated; T310 running
 * reestablish  — T310 expired; RLF declared, UE initiating re-establishment
 *
 * @source 3GPP TS 38.331 §5.3.10.3 (T310/N310/N311 procedure)
 * @source TR 38.821 §6.3.4 (NTN T310 extension recommendation)
 */
export type RlfPhase = 'normal' | 'out-of-sync' | 'reestablish';

/** Per-manager RLF counter/timer state. */
export interface RlfState {
  phase: RlfPhase;
  /** Consecutive out-of-sync events (SINR < Qout) since last reset. */
  n310Count: number;
  /** Consecutive in-sync events (SINR ≥ Qin) while in out-of-sync phase. */
  n311Count: number;
  /** Wall-clock time (sim seconds) when T310 started; null if not running. */
  t310StartSec: number | null;
}

// ---------------------------------------------------------------------------
// Serving & Candidate
// ---------------------------------------------------------------------------

export interface ServingState {
  satId: string;
  beamId: string;
  sinrDb: number;
  attachTimeSec: number;
}

export interface HandoverCandidate {
  satId: string;
  beamId: string;
  sinrDb: number;
  elevationDeg: number;
  /** Slant range in km. Required for D2 distance-event evaluation (A1). */
  rangeKm?: number;
}

// ---------------------------------------------------------------------------
// Decision & Event
// ---------------------------------------------------------------------------

export interface HandoverDecision {
  type: 'attach' | 'handover' | 'release' | 'none';
  targetSatId?: string;
  targetBeamId?: string;
  reason: string;
}

export interface HandoverEvent {
  tick: number;
  timeSec: number;
  type:
    | 'attach'
    | 'ho-trigger'
    | 'ho-execute'
    | 'ho-complete'
    | 'ho-fail'
    | 'release'
    | 'cho-prepared'      // C2: CHO command sent to UE
    | 'cho-execute'       // C2: UE autonomously executes CHO
    | 'mc-ho-dual-start'  // C2: MC-HO dual-connectivity phase begins
    | 'mc-ho-dual-end'    // C2: MC-HO dual-connectivity ends
    | 'rlf-oos'           // A2: N310 threshold crossed, T310 started
    | 'rlf-recovery'      // A2: N311 threshold crossed, T310 cancelled
    | 'rlf-declared';     // A2: T310 expired, RLF declared → release
  sourceSatId?: string;
  targetSatId?: string;
  sinrDb?: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Manager State
// ---------------------------------------------------------------------------

export interface HandoverManagerState {
  phase: HoPhase;
  serving: ServingState | null;
  pendingTarget: HandoverCandidate | null;
  tttStartTimeSec: number | null;
  lastHoTimeSec: number;
  totalHandovers: number;
  totalFailures: number;
  totalPingPongs: number;
  /** A2: accumulated RLF count (T310 expiries). */
  totalRlfs: number;
  /** A2: current RLF detection state. */
  rlf: RlfState;
  events: HandoverEvent[];
}

// ---------------------------------------------------------------------------
// Tick Input
// ---------------------------------------------------------------------------

export interface HandoverTickInput {
  tick: number;
  timeSec: number;
  /** SINR of current serving cell (null if not attached). */
  servingSinrDb: number | null;
  /** Available candidates sorted by SINR descending. */
  candidates: HandoverCandidate[];
  /** One-way propagation delay to serving satellite in ms (P2).
   *  Used by HO FSMs to account for RTT in timing (effectiveTTT = ttt + 2·delay).
   *  @source 3GPP NTN: delay_ms = rangeKm / 299.792 */
  propagationDelayMs?: number;
  /** Elevation of the current serving satellite in degrees (null/undefined if idle).
   *  Serving satellite below min_elevation_deg → forced release.
   *  @source Papers: LOADAWARE, AERO-DRL Criterion A2, TADRL, MADRL-MEGACONST */
  servingElevationDeg?: number | null;
  /** Slant range to current serving satellite in km (null if idle).
   *  Required for D2 distance-event evaluation (A1).
   *  @source ntn-stack handover_event_trigger_service.py */
  servingRangeKm?: number | null;
}

// ---------------------------------------------------------------------------
// Manager Interface
// ---------------------------------------------------------------------------

export interface HandoverManager {
  /** Process one tick. Returns the decision made. */
  tick(opts: HandoverTickInput): HandoverDecision;
  /** Get current state (readonly). */
  getState(): Readonly<HandoverManagerState>;
  /** Get and clear accumulated events since last drain. */
  drainEvents(): HandoverEvent[];
  /** Reset to initial state. */
  reset(): void;
}
