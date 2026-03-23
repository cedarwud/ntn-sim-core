/**
 * Energy Layer 1: beam/power energy efficiency.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.4
 *   - Tier: assumption-backed (power values vary by paper)
 *   - This file must not import React, Three.js, or scene code.
 *
 * Paper sources:
 *   - PAP-2024-HOBS: system EE = throughput / power, DPC concept
 *   - PAP-2025-EEBH-UPLINK: P_total = sum P_b * eta_b where eta_b in {0,1}
 *   - PAP-2025-SMASH-MADQL: TX/RX/idle power states with explicit values
 *   - PAP-2025-EAQL: reward = lambda * throughput - (1-lambda) * energy
 */

import type {
  BeamPowerState,
  BeamPowerEntry,
  SatelliteEnergyState,
  EnergyEfficiencyMetrics,
  EnergyLayer1Config,
} from './types';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface EnergyLayer1Manager {
  /** Update beam power states based on active beam list. */
  updateBeamStates(
    satId: string,
    activeBeamIds: string[],
    allBeamIds: string[],
  ): void;

  /**
   * Apply DPC: adjust TX power for a beam to meet target SINR.
   * newPowerDbm = currentPowerDbm + (targetSinrDb - currentSinrDb),
   * clamped to [0, config.txPowerPerBeamDbm].
   * Source: PAP-2024-HOBS DPC concept.
   */
  applyDpc(
    beamId: string,
    currentSinrDb: number,
    targetSinrDb: number,
    currentTxPowerDbm: number,
  ): number;

  /** Compute EE metrics for current tick. */
  computeMetrics(throughputs: Map<string, number>): EnergyEfficiencyMetrics;

  /** Get current satellite energy state. */
  getSatelliteState(satId: string): SatelliteEnergyState | null;

  /** Reset all state. */
  reset(): void;
}

// ---------------------------------------------------------------------------
// Default config (assumption-backed, paper-derived)
// ---------------------------------------------------------------------------

export const DEFAULT_ENERGY_LAYER1_CONFIG: EnergyLayer1Config = {
  txPowerPerBeamDbm: 43, // PAP-2024-HOBS: 50 dBm / ~5 beams
  activeBeamPowerW: 20, // PAP-2025-SMASH-MADQL typical TX power
  idlePowerW: 5, // PAP-2025-SMASH-MADQL idle state
  offBeamPowerW: 0.1, // assumption-backed
  dpcEnabled: false,
  dpcTargetSinrDb: 3,
};

// ---------------------------------------------------------------------------
// Internal state per satellite
// ---------------------------------------------------------------------------

interface SatState {
  satId: string;
  /** beamId -> BeamPowerEntry */
  beams: Map<string, BeamPowerEntry>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createEnergyLayer1(
  config: EnergyLayer1Config = DEFAULT_ENERGY_LAYER1_CONFIG,
): EnergyLayer1Manager {
  const satellites = new Map<string, SatState>();

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  function consumptionForState(state: BeamPowerState): number {
    switch (state) {
      case 'active':
        return config.activeBeamPowerW;
      case 'idle':
        return config.idlePowerW;
      case 'off':
        return config.offBeamPowerW;
    }
  }

  function txPowerForState(state: BeamPowerState): number {
    return state === 'active' ? config.txPowerPerBeamDbm : 0;
  }

  // -----------------------------------------------------------------------
  // Manager implementation
  // -----------------------------------------------------------------------

  const manager: EnergyLayer1Manager = {
    updateBeamStates(
      satId: string,
      activeBeamIds: string[],
      allBeamIds: string[],
    ): void {
      const activeSet = new Set(activeBeamIds);
      const beams = new Map<string, BeamPowerEntry>();

      for (const beamId of allBeamIds) {
        const state: BeamPowerState = activeSet.has(beamId) ? 'active' : 'idle';
        beams.set(beamId, {
          beamId,
          state,
          txPowerDbm: txPowerForState(state),
          consumptionW: consumptionForState(state),
        });
      }

      satellites.set(satId, { satId, beams });
    },

    applyDpc(
      beamId: string,
      currentSinrDb: number,
      targetSinrDb: number,
      currentTxPowerDbm: number,
    ): number {
      if (!config.dpcEnabled) {
        return currentTxPowerDbm;
      }

      const adjustment = targetSinrDb - currentSinrDb;
      const newPower = currentTxPowerDbm + adjustment;

      // Clamp to [0, maxPowerDbm]
      const clamped = Math.max(0, Math.min(config.txPowerPerBeamDbm, newPower));

      // Update stored entry if it exists
      for (const sat of satellites.values()) {
        const entry = sat.beams.get(beamId);
        if (entry && entry.state === 'active') {
          entry.txPowerDbm = clamped;
          break;
        }
      }

      return clamped;
    },

    computeMetrics(
      throughputs: Map<string, number>,
    ): EnergyEfficiencyMetrics {
      let totalPowerW = 0;
      let totalActiveBeams = 0;
      let totalBeams = 0;
      const perBeamEe: Array<{ beamId: string; eeBitsPerJoule: number }> = [];

      for (const sat of satellites.values()) {
        for (const entry of sat.beams.values()) {
          totalPowerW += entry.consumptionW;
          totalBeams += 1;

          if (entry.state === 'active') {
            totalActiveBeams += 1;
          }

          const throughput = throughputs.get(entry.beamId) ?? 0;
          const ee =
            entry.consumptionW > 0 ? throughput / entry.consumptionW : 0;
          perBeamEe.push({ beamId: entry.beamId, eeBitsPerJoule: ee });
        }
      }

      const totalThroughput = Array.from(throughputs.values()).reduce(
        (sum, v) => sum + v,
        0,
      );

      const systemEe = totalPowerW > 0 ? totalThroughput / totalPowerW : 0;

      return {
        systemEeBitsPerJoule: systemEe,
        perBeamEe,
        totalPowerW,
        activeBeamRatio: totalBeams > 0 ? totalActiveBeams / totalBeams : 0,
      };
    },

    getSatelliteState(satId: string): SatelliteEnergyState | null {
      const sat = satellites.get(satId);
      if (!sat) return null;

      let totalPowerW = 0;
      let activeBeamCount = 0;
      const beamEntries: BeamPowerEntry[] = [];

      for (const entry of sat.beams.values()) {
        totalPowerW += entry.consumptionW;
        if (entry.state === 'active') activeBeamCount += 1;
        beamEntries.push({ ...entry });
      }

      return {
        satId,
        totalPowerW,
        activeBeamCount,
        totalBeamCount: sat.beams.size,
        beams: beamEntries,
      };
    },

    reset(): void {
      satellites.clear();
    },
  };

  return manager;
}
