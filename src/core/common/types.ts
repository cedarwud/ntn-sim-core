/**
 * Core shared types for ntn-sim-core.
 *
 * These types define the foundational contracts used across
 * profiles, traces, runners, and KPI bundles.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §4, §6, §9
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3
 *   - This file must not import React, Three.js, or scene code.
 */

// ---------------------------------------------------------------------------
// Source Tier (dev-constraints §3)
// ---------------------------------------------------------------------------

/**
 * Every KPI-impacting path must declare its source tier.
 * `debug-only` must never appear in benchmark outputs.
 */
export type SourceTier =
  | 'normative'
  | 'paper-backed'
  | 'standard-backed'
  | 'assumption-backed'
  | 'debug-only';

/**
 * Spec-mode classification per simulator-parameter-spec.md §0.
 *
 * - Realistic:      paper- or standard-backed defaults; safe for baseline experiments
 * - Advanced:       valid secondary settings from papers; requires explicit justification
 * - Sensitivity:    parameter sweeps for analysis; range may be synthesized
 * - Internal-only:  assumption-backed calibration values; must NOT be exposed in UI
 *                   or presented as paper-backed in thesis tables
 */
export type SpecMode = 'Realistic' | 'Advanced' | 'Sensitivity' | 'Internal-only';

/** Metadata for a source-tier annotation. */
export interface SourceReference {
  tier: SourceTier;
  /** e.g. "PAP-2022-SINR-ELEVATION", "3GPP TR 38.811", "ASSUME-CUR-002" */
  id: string;
  /** Human-readable note. */
  note?: string;
  /**
   * Optional parameter-level locator for fine-grained provenance.
   * Format: "<configSection>.<fieldName>" e.g. "rf.frequency_ghz", "handover.ttt_ms".
   * When set, allows validate:trace to check this specific parameter's source.
   * Omit for profile-level (whole-profile) source references.
   */
  parameterPath?: string;
  /**
   * Spec-mode classification per simulator-parameter-spec.md §0.
   * When set, the UI / audit layer uses this to gate parameter exposure:
   *   - Internal-only → must never appear in user-facing controls or thesis baselines
   *   - Sensitivity   → sweep-only; never a fixed default
   *   - Advanced      → requires explicit justification; not first-screen
   *   - Realistic     → safe for baseline experiments and paper comparison tables
   * Omit for profile-level source references where no single mode applies.
   */
  specMode?: SpecMode;
}

// ---------------------------------------------------------------------------
// Presentation / Orbit modes (SDD §7)
// ---------------------------------------------------------------------------

export type PresentationMode = 'benchmark' | 'showcase' | 'debug';

export type OrbitMode = 'synthetic' | 'real-trace';

export type BeamSemantics = 'earth-moving' | 'earth-fixed-bh';

// ---------------------------------------------------------------------------
// Observer (SDD §6.5)
// ---------------------------------------------------------------------------

export interface ObserverLocation {
  id: string;
  name: string;
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeM: number;
}

// ---------------------------------------------------------------------------
// Simulation time control
// ---------------------------------------------------------------------------

export interface TimeControl {
  /** Simulation epoch in UTC ms. */
  epochUtcMs: number;
  /** Duration of one run in seconds. */
  durationSec: number;
  /** Tick step size in seconds. */
  stepSec: number;
}

// ---------------------------------------------------------------------------
// Seed-controlled RNG (dev-constraints §4.2)
// ---------------------------------------------------------------------------

/**
 * Minimal seedable PRNG.
 * Implementation: mulberry32 (32-bit, fast, deterministic).
 */
export interface SeededRng {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns current internal state for serialization. */
  state(): number;
}

/**
 * Create a mulberry32 PRNG from a 32-bit seed.
 * Deterministic: same seed always produces the same sequence.
 */
export function createRng(seed: number): SeededRng {
  let s = seed | 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state() {
      return s;
    },
  };
}

// ---------------------------------------------------------------------------
// KPI stub (SDD §9.5)
// ---------------------------------------------------------------------------

/**
 * Minimal KPI bundle shell for Phase 0.
 * Real KPI accumulators land in Phase 2+.
 */
export interface KpiBundleShell {
  /** Total simulated ticks. */
  totalTicks: number;
  /** Wall-clock duration of the run in ms. */
  wallClockMs: number;
  /** Placeholder for future KPI fields. */
  metrics: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Simulation snapshot (SDD §9.5, consumed by viz layer)
// ---------------------------------------------------------------------------

/**
 * BH slot snapshot for earth-fixed cell visualization (SDD §8, beamSemantics='earth-fixed-bh').
 * Serializable form of BhSlotDecision (Map replaced with Record).
 */
export interface BhSlotSnapshot {
  slotIndex: number;
  /** Active beam IDs per satellite this slot. Key = satId, value = beamId[]. */
  activeBeamsBySat: Record<string, string[]>;
  /** Satellite IDs currently energy-blocked (Layer 2 battery depleted). */
  energyBlockedSats: string[];
}

/**
 * DAPS state snapshot for dual-active visualization (Phase 6).
 * Only present when handover.type === 'daps' and DAPS FSM is not idle.
 */
export interface DapsSnapshot {
  /** Current DAPS phase: 'single-active' | 'prepared' | 'dual-active' | 'path-switched' | 'completed'. */
  phase: string;
  /** Source satellite ID (active during dual-active). */
  sourceSatId: string | null;
  /** Target satellite ID (active during dual-active). */
  targetSatId: string | null;
}

export type BeamRole =
  | 'serving'
  | 'prepared'
  | 'secondary'
  | 'post-ho'
  | 'neutral'
  | 'inactive';

export type ContinuityState =
  | 'single-active'
  | 'prepared'
  | 'dual-active'
  | 'post-ho';

/**
 * Handover event entry for the HO event log overlay.
 * Emitted per tick — overlays accumulate them into a running log.
 */
export interface HoLogEntry {
  timeSec: number;
  /** 'complete' | 'fail' | 'cho-execute' | 'mc-ho-dual-end' | 'rlf-declared' */
  type: string;
  sourceSatId: string | null;
  targetSatId: string | null;
  /** SINR at source at time of trigger (dB). Null if not available. */
  sinrDb: number | null;
  /** Estimated interruption time (ms). Null for non-complete events. */
  interruptionMs: number | null;
  ueId: string;
}

/** Handover explainability data for the UI panel (sinr-offset profiles). */
export interface HoExplanation {
  servingSinrDb: number | null;
  servingElevationDeg: number | null;
  servingRangeKm: number | null;
  pendingTargetSatId: string | null;
  pendingTargetBeamId: string | null;
  pendingTargetSinrDb: number | null;
  pendingTargetElevationDeg: number | null;
  pendingTargetRangeKm: number | null;
  sinrDeltaDb: number | null;
  triggerProgressSec: number;
  triggerThresholdSec: number;
  handoverOffsetDb: number;
  hoCount: number;
}

/**
 * A single simulation tick output.
 * This is the ONLY interface viz may consume from core.
 */
export interface SimulationSnapshot {
  tick: number;
  timeSec: number;
  /** Satellites visible from observer at this tick. */
  satellites: SatelliteState[];
  /** UE states (Phase 2+). */
  ues: UeState[];
  /** BH slot decision (earth-fixed-bh profiles only). */
  bhSlot?: BhSlotSnapshot;
  /** DAPS state (daps handover type only, non-idle phases). */
  daps?: DapsSnapshot;
  /** HO events that occurred this tick (may be empty). */
  recentHoEvents?: HoLogEntry[];
  /** Handover explainability data (sinr-offset profiles). */
  hoExplanation?: HoExplanation;
}

/** Per-beam snapshot for visualization (SDD §8, frontend-beam-visual-sdd §7). */
export interface SatelliteBeamSnapshot {
  beamId: string;
  /** Offset from satellite sub-point in km (east). */
  offsetEastKm: number;
  /** Offset from satellite sub-point in km (north). */
  offsetNorthKm: number;
  /** Whether beam is currently active (BH scheduling). */
  isActive: boolean;
  /** Frequency reuse group index. */
  reuseGroup: number;
  /** Beam role relative to current HO state. */
  role: BeamRole;
}

export interface SatelliteState {
  id: string;
  /** Geodetic latitude in degrees. */
  latDeg: number;
  /** Geodetic longitude in degrees. */
  lonDeg: number;
  /** Altitude above WGS84 ellipsoid in km. */
  altKm: number;
  /** Topocentric azimuth from observer in degrees. */
  azimuthDeg: number;
  /** Topocentric elevation from observer in degrees. */
  elevationDeg: number;
  /** Slant range from observer in km. */
  rangeKm: number;
  /** Whether the satellite is above the visibility threshold. */
  isVisible: boolean;
  /** Per-beam layout snapshot (multibeam profiles only). */
  beams?: SatelliteBeamSnapshot[];
}

export interface UeState {
  id: string;
  latDeg: number;
  lonDeg: number;
  /** Serving satellite ID, if any. */
  servingSatId: string | null;
  /** Serving beam ID, if any. */
  servingBeamId: string | null;
  /** Prepared or pending target satellite ID, when the runtime exposes it. */
  targetSatId?: string | null;
  /** Prepared or pending target beam ID, when the runtime exposes it. */
  targetBeamId?: string | null;
  /** Secondary/dual-active satellite ID, when continuity mode exposes it. */
  secondarySatId?: string | null;
  /** Secondary/dual-active beam ID, when continuity mode exposes it. */
  secondaryBeamId?: string | null;
  /** Truth-driven continuity state for overlays. */
  continuityState?: ContinuityState;
  /** Per-UE serving SINR truth in dB (null if unserved). Emitted by engine, never recomputed in frontend. */
  sinrDb: number | null;
}
