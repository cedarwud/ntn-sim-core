/**
 * Energy module types for ntn-sim-core.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.4 Energy (Layered)
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3, §4
 *   - This file must not import React, Three.js, or scene code.
 *
 * Paper sources:
 *   - PAP-2024-HOBS: EE = throughput / power, DPC concept
 *   - PAP-2025-EEBH-UPLINK: P_total = sum P_b * eta_b
 *   - PAP-2025-SMASH-MADQL: TX/RX/idle power states
 */

// ---------------------------------------------------------------------------
// EP1 semantics / disclosure
// ---------------------------------------------------------------------------

export type EePowerSourceRole =
  | 'paper-backed'
  | 'synthesized'
  | 'assumption-backed';

export type EePowerRuntimeStatus =
  | 'reported'
  | 'derived-disclosure-only'
  | 'configured-not-materialized'
  | 'unavailable';

export type EePowerTermId =
  | 'active-tx-power'
  | 'active-beam-power-proxy'
  | 'idle-beam-power-proxy'
  | 'off-beam-power-proxy'
  | 'circuit-power'
  | 'pa-efficiency'
  | 'handover-energy'
  | 'handover-penalty-weight';

export type EePowerSemanticId =
  | 'active-tx-power-oriented-ee'
  | 'total-communication-power'
  | 'handover-aware-ee'
  | 'utility-form-fallback-objective';

export interface EePowerTermDisclosure {
  id: EePowerTermId;
  symbol: string;
  sourceRole: EePowerSourceRole;
  runtimeStatus: EePowerRuntimeStatus;
  runtimeField?: string;
  assumptionIds?: string[];
  note: string;
}

export interface EePowerSemanticDisclosure {
  id: EePowerSemanticId;
  runtimeStatus: EePowerRuntimeStatus;
  runtimeField?: string;
  numerator: string;
  denominatorTerms: EePowerTermId[];
  note: string;
  claimGuard: string;
}

export interface EePowerDisclosure {
  denominatorTerms: EePowerTermDisclosure[];
  semantics: EePowerSemanticDisclosure[];
  assumptionIds: string[];
  headlineClaimStatus: 'secondary-only' | 'robustness-or-sensitivity-only';
  sensitivityRequirement: string;
  recommendedFallback: 'utility-form-fallback-objective' | 'secondary-metric-only';
}

// ---------------------------------------------------------------------------
// Beam Power State
// ---------------------------------------------------------------------------

/** Power state for a single beam. */
export type BeamPowerState = 'active' | 'idle' | 'off';

// ---------------------------------------------------------------------------
// Per-beam power accounting
// ---------------------------------------------------------------------------

/** Per-beam power accounting. */
export interface BeamPowerEntry {
  beamId: string;
  state: BeamPowerState;
  /** Current transmit power in dBm. */
  txPowerDbm: number;
  /** Current transmit power in watts (active-TX denominator term). */
  txPowerW: number;
  /**
   * Communication-power proxy in watts for this beam state.
   * Active beams carry fixed beam-state overhead plus the current TX power;
   * idle/off beams carry assumption-backed proxy values only.
   */
  consumptionW: number;
}

// ---------------------------------------------------------------------------
// Satellite-level energy snapshot
// ---------------------------------------------------------------------------

/** Satellite-level energy snapshot. */
export interface SatelliteEnergyState {
  satId: string;
  /** Total communication-power proxy across all beams on this satellite. */
  totalPowerW: number;
  activeBeamCount: number;
  totalBeamCount: number;
  beams: BeamPowerEntry[];
}

// ---------------------------------------------------------------------------
// Energy efficiency metrics
// ---------------------------------------------------------------------------

/** Energy efficiency metrics for a tick. */
export interface EnergyEfficiencyMetrics {
  /**
   * Runtime KPI alias kept for the frozen KPI contract.
   * Semantics: active-TX-power-oriented EE = total throughput / active TX power.
   */
  systemEeBitsPerJoule: number;
  /** Per-beam active-TX EE proxy. */
  perBeamEe: Array<{ beamId: string; eeBitsPerJoule: number }>;
  /** Active transmit power denominator actually used by systemEeBitsPerJoule. */
  activeTxPowerW: number;
  /**
   * Total communication-power proxy across active/idle/off beam states.
   * This is broader than the active-TX EE denominator and is assumption-backed.
   */
  totalCommunicationPowerW: number;
  /**
   * Frozen-KPI compatibility alias for totalCommunicationPowerW.
   * External KPI/report surfaces still read this as totalPowerW.
   */
  totalPowerW: number;
  activeBeamCount: number;
  idleBeamCount: number;
  offBeamCount: number;
  /** Active beam ratio: active/total. */
  activeBeamRatio: number;
  /** EP1 disclosure surface for denominator semantics and claim bars. */
  eePowerDisclosure?: EePowerDisclosure;
}

// ---------------------------------------------------------------------------
// Energy Layer 1 configuration
// ---------------------------------------------------------------------------

/**
 * Energy Layer 1 configuration.
 *
 * Default values are assumption-backed internal calibration values:
 *   - txPowerPerBeamDbm: 40 dBm = 10 W per beam (spec P1, PAP-2025-MAAC-BHPOWER [S10])
 *   - activeBeamPowerW: 20 W (unverified; ASSUME-ENERGY-001)
 *   - idlePowerW: 5 W (unverified; ASSUME-ENERGY-001)
 *   - offBeamPowerW: 0.1 W (internal calibration; ASSUME-ENERGY-001)
 */
export interface EnergyLayer1Config {
  /** TX power per active beam in dBm. */
  txPowerPerBeamDbm: number;
  /** Idle power per beam in watts. */
  idlePowerW: number;
  /** Active beam power consumption in watts (includes TX + processing). */
  activeBeamPowerW: number;
  /** Off beam power consumption in watts. */
  offBeamPowerW: number;
  /** Enable DPC: scale TX power based on target SINR. */
  dpcEnabled: boolean;
  /** DPC target SINR in dB. */
  dpcTargetSinrDb: number;
}
