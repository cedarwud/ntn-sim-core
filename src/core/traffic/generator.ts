/**
 * Traffic demand generators for beam hopping scheduling.
 *
 * BH schedulers need per-cell/per-beam demand input. This module provides
 * configurable traffic patterns: Poisson arrivals, full-buffer, and hotspot.
 *
 * Paper sources:
 *   - PAP-2026-DRL-BHOPT: LSTM traffic prediction + demand-aware BH
 *   - PAP-2025-DIST-BH-HETERO: roulette-wheel load balancing
 *   - PAP-2025-EEBH-UPLINK: demand-driven BH
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9
 *   - This file must not import React, Three.js, or scene code.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrafficModel = 'poisson' | 'full-buffer' | 'hotspot' | 'uniform';

export interface TrafficConfig {
  model: TrafficModel;
  /** Number of beams/cells to generate demand for. */
  numCells: number;
  /** Mean arrival rate per cell per second (Poisson model). */
  meanArrivalRatePerSec?: number;
  /** Packet size in bits (for throughput demand conversion). */
  packetSizeBits?: number;
  /** Full-buffer demand per cell in bps. */
  fullBufferDemandBps?: number;
  /** Hotspot: indices of high-demand cells. */
  hotspotCellIndices?: number[];
  /** Hotspot: demand multiplier for hot cells (default 5×). */
  hotspotMultiplier?: number;
}

export interface CellDemand {
  cellIndex: number;
  /** Demand in bits per second. */
  demandBps: number;
  /** Number of active users / arrivals in this cell. */
  activeUsers: number;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * Generate per-cell traffic demand for one tick.
 *
 * @param config — traffic configuration
 * @param rngNext — seeded RNG function returning [0, 1)
 * @param _timeSec — current simulation time (for future time-varying models)
 * @returns array of per-cell demand
 */
export function generateTrafficDemand(
  config: TrafficConfig,
  rngNext: () => number,
  _timeSec: number = 0,
): CellDemand[] {
  const demands: CellDemand[] = [];

  switch (config.model) {
    case 'poisson': {
      const lambda = config.meanArrivalRatePerSec ?? 10;
      const pktBits = config.packetSizeBits ?? 1500 * 8; // 1500 bytes default
      for (let i = 0; i < config.numCells; i++) {
        // Poisson: number of arrivals per tick (~1 sec)
        const arrivals = poissonSample(lambda, rngNext);
        demands.push({
          cellIndex: i,
          demandBps: arrivals * pktBits,
          activeUsers: arrivals,
        });
      }
      break;
    }

    case 'full-buffer': {
      const demandBps = config.fullBufferDemandBps ?? 100e6; // 100 Mbps default
      for (let i = 0; i < config.numCells; i++) {
        demands.push({
          cellIndex: i,
          demandBps,
          activeUsers: 1, // always active
        });
      }
      break;
    }

    case 'hotspot': {
      const baseDemandBps = config.fullBufferDemandBps ?? 50e6;
      const hotCells = new Set(config.hotspotCellIndices ?? [0]);
      const multiplier = config.hotspotMultiplier ?? 5;
      for (let i = 0; i < config.numCells; i++) {
        const isHot = hotCells.has(i);
        // Add Poisson variation on top of base demand
        const variation = 1 + 0.2 * (rngNext() - 0.5); // ±10%
        demands.push({
          cellIndex: i,
          demandBps: baseDemandBps * (isHot ? multiplier : 1) * variation,
          activeUsers: isHot ? 10 : 2,
        });
      }
      break;
    }

    case 'uniform':
    default: {
      const demandBps = config.fullBufferDemandBps ?? 50e6;
      for (let i = 0; i < config.numCells; i++) {
        const variation = 0.8 + 0.4 * rngNext(); // [0.8, 1.2]
        demands.push({
          cellIndex: i,
          demandBps: demandBps * variation,
          activeUsers: Math.max(1, Math.floor(5 * rngNext())),
        });
      }
      break;
    }
  }

  return demands;
}

// ---------------------------------------------------------------------------
// Poisson sampling (Knuth algorithm for small λ)
// ---------------------------------------------------------------------------

function poissonSample(lambda: number, rngNext: () => number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) {
    // Normal approximation for large λ
    const u1 = rngNext();
    const u2 = rngNext();
    const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
  }
  // Knuth algorithm
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rngNext();
  } while (p > L);
  return k - 1;
}
