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
 *     → EE denominator uses TX power of active beams only (Option A).
 *       Idle/off beam overhead (circuit power) is tracked separately in totalPowerW
 *       but is NOT included in the EE denominator per PAP-2025-EEBH-UPLINK Eq.(5).
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
   * Apply DPC: adjust TX power for a beam to meet the configured target SINR.
   * Uses internal config.dpcTargetSinrDb and current stored txPowerDbm.
   * newPowerDbm = currentPowerDbm + (targetSinrDb - currentSinrDb),
   * clamped to [0, config.txPowerPerBeamDbm].
   * Also updates consumptionW to reflect the new TX power in watts.
   * Source: PAP-2024-HOBS DPC concept.
   */
  applyDpc(beamId: string, currentSinrDb: number): number;

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
  // @assumption ASSUME-ENERGY-001
  // txPowerPerBeamDbm=40 dBm = 10 W, aligned with spec P1 per PAP-2025-MAAC-BHPOWER [S10].
  // Previous legacy value was 43 dBm (= 20 W), an internal engineering estimate that
  // caused the EE denominator to be ~3 dB too high vs spec. Now corrected.
  // This Layer-1 cap is per-beam only. Aggregate satellite TX budgets such as
  // profile.rf.max_tx_power_dbm belong to scheduling/power-budget semantics and
  // must not be substituted here. See spec GAP-7 and ASSUME-ENERGY-001.
  txPowerPerBeamDbm: 40,
  // @assumption activeBeamPowerW=20 W and idlePowerW=5 W are unverified.
  // PAP-2025-SMASH-MADQL is cited in comments but the specific numeric values
  // could not be confirmed from the local paper text. See spec GAP-5.
  activeBeamPowerW: 20,
  idlePowerW: 5,
  offBeamPowerW: 0.1, // @assumption no paper locator; internal calibration only
  dpcEnabled: false,
  dpcTargetSinrDb: 10, // PAP-2024-HOBS Table I: γ_thr = 10 dB ✓
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

    applyDpc(beamId: string, currentSinrDb: number): number {
      // Find current beam entry
      let foundEntry: BeamPowerEntry | null = null;
      for (const sat of satellites.values()) {
        const entry = sat.beams.get(beamId);
        if (entry && entry.state === 'active') {
          foundEntry = entry;
          break;
        }
      }

      if (!config.dpcEnabled || !foundEntry) {
        return foundEntry?.txPowerDbm ?? config.txPowerPerBeamDbm;
      }

      // DPC: newPower = current + (target - actual), clamped to config max
      const adjustment = config.dpcTargetSinrDb - currentSinrDb;
      const newPower = foundEntry.txPowerDbm + adjustment;
      const clamped = Math.max(0, Math.min(config.txPowerPerBeamDbm, newPower));

      foundEntry.txPowerDbm = clamped;
      // Sync consumptionW so EE denominator reflects actual TX power
      // Simple model: consumptionW = txPowerW (ignores fixed circuit overhead)
      foundEntry.consumptionW = clamped > 0 ? Math.pow(10, clamped / 10) / 1000 : 0;

      return clamped;
    },

    computeMetrics(
      throughputs: Map<string, number>,
    ): EnergyEfficiencyMetrics {
      let totalPowerW = 0;
      // Option A (PAP-2025-EEBH-UPLINK Eq.(5)): EE denominator = TX power of
      // active beams only. Idle/off circuit overhead is tracked in totalPowerW
      // but excluded from the EE denominator.
      let activeTxPowerW = 0;
      let totalActiveBeams = 0;
      let totalBeams = 0;
      const perBeamEe: Array<{ beamId: string; eeBitsPerJoule: number }> = [];

      for (const sat of satellites.values()) {
        for (const entry of sat.beams.values()) {
          totalPowerW += entry.consumptionW;
          totalBeams += 1;

          if (entry.state === 'active') {
            totalActiveBeams += 1;
            activeTxPowerW += entry.consumptionW;
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

      // EE = R_total / Σ p_b·η_b  (active TX power only, PAP-2025-EEBH-UPLINK)
      const systemEe = activeTxPowerW > 0 ? totalThroughput / activeTxPowerW : 0;

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
