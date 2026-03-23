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
  /** Power consumption in watts for this state. */
  consumptionW: number;
}

// ---------------------------------------------------------------------------
// Satellite-level energy snapshot
// ---------------------------------------------------------------------------

/** Satellite-level energy snapshot. */
export interface SatelliteEnergyState {
  satId: string;
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
  /** System EE: total throughput / total power (bits/Joule). */
  systemEeBitsPerJoule: number;
  /** Per-beam EE. */
  perBeamEe: Array<{ beamId: string; eeBitsPerJoule: number }>;
  /** Total power consumption across all satellites in watts. */
  totalPowerW: number;
  /** Active beam ratio: active/total. */
  activeBeamRatio: number;
}

// ---------------------------------------------------------------------------
// Energy Layer 1 configuration
// ---------------------------------------------------------------------------

/**
 * Energy Layer 1 configuration.
 *
 * Default values are assumption-backed from multiple papers:
 *   - txPowerPerBeamDbm: 43 dBm (PAP-2024-HOBS: 50 dBm / ~5 beams)
 *   - activeBeamPowerW: 20 W (PAP-2025-SMASH-MADQL typical TX power)
 *   - idlePowerW: 5 W (PAP-2025-SMASH-MADQL idle state)
 *   - offBeamPowerW: 0.1 W (assumption-backed)
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
