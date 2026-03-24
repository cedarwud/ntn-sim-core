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
    | 'mc-ho-dual-end';   // C2: MC-HO dual-connectivity ends
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
