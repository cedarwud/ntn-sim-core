/**
 * KPI bundle types for ntn-sim-core.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.5
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3
 *   - This file must not import React, Three.js, or scene code.
 */

// ---------------------------------------------------------------------------
// Full KPI Bundle (Phase 2, extends Phase 0 KpiBundleShell concept)
// ---------------------------------------------------------------------------

/** Full KPI bundle extending the Phase 0 shell. */
export interface KpiBundle {
  // Run metadata
  totalTicks: number;
  wallClockMs: number;
  durationSec: number;

  // Handover KPIs
  totalHandovers: number;
  handoverFailures: number;         // HOF
  unnecessaryHandovers: number;     // UHO: HO where source SINR was still adequate
  pingPongCount: number;            // HOPP: return to previous serving within threshold
  handoverRate: number;             // HO/min
  meanHandoverInterruptionMs: number;

  // Signal KPIs
  meanSinrDb: number;
  sinrPercentile5Db: number;        // 5th percentile (cell-edge indicator)
  sinrPercentile50Db: number;       // median
  sinrPercentile95Db: number;
  outageRatio: number;              // fraction of time SINR < threshold

  // Throughput KPIs
  meanThroughputMbps: number;       // Shannon proxy: BW * log2(1 + SINR_linear)
  cellEdgeThroughputMbps: number;   // 5th percentile throughput

  // Service continuity
  meanServiceTimeSec: number;       // average time before HO or service loss
  serviceAvailability: number;      // fraction of time UE is served

  // Fairness
  jainFairnessIndex: number;        // Jain's fairness on per-UE throughput

  // Energy efficiency (populated when energy.layer1_enabled = true; 0 otherwise)
  // @source PAP-2024-HOBS, PAP-2025-EEBH-UPLINK Eq.(5): EE = R_total / Σ p_b·η_b
  // @assumption power values — see ASSUME-ENERGY-001
  systemEeBitsPerJoule: number;     // system EE = total throughput / active TX power
  totalPowerW: number;              // total satellite power (active + idle beams)
  activeBeamRatio: number;          // fraction of beams in active state
}
