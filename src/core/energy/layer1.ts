/**
 * Energy Layer 1: beam/power energy efficiency.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.4
 *   - Tier: assumption-backed (power values vary by paper)
 *   - This file must not import React, Three.js, or scene code.
 *
 * Paper sources:
 *   - PAP-2024-HOBS: active-TX-oriented EE + DPC concept
 *   - PAP-2025-EEBH-UPLINK: active-TX denominator template (active beams only)
 *   - PAP-2025-SMASH-MADQL: TX/RX/idle power states with explicit values
 *   - PAP-2025-EAQL: reward = lambda * throughput - (1-lambda) * energy
 *
 * EP1 semantic split:
 *   - systemEeBitsPerJoule = active-TX-power-oriented EE
 *   - totalCommunicationPowerW / totalPowerW = broader beam-state communication-power proxy
 *   - handover-aware EE and utility fallback remain disclosure/formula surfaces unless
 *     a dedicated sensitivity package is built on top of the run artifact path.
 */

import type {
  BeamPowerState,
  BeamPowerEntry,
  SatelliteEnergyState,
  EnergyEfficiencyMetrics,
  EnergyLayer1Config,
  EePowerDisclosure,
  EePowerTermDisclosure,
  EePowerSemanticDisclosure,
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
  // @assumption ASSUME-HO-THRESHOLD-SINR
  // dpcTargetSinrDb = 10 dB: this reuses γ_thr = 10 dB from PAP-2024-HOBS Table I,
  // but in this context it is used as a DPC (Dynamic Power Control) target threshold,
  // not as a handover-link SINR threshold.
  // Per spec E3: "if runtime keeps a distinct controller-specific DPC target, that
  // value must remain assumption / internal-only". The paper-backed semantic is
  // handover SINR threshold; the DPC-controller semantic is an engineering re-use.
  // Must NOT be labeled paper-backed in thesis tables when used as DPC target.
  // Spec mode: Internal-only (DPC disabled by default; only relevant when dpcEnabled=true).
  dpcTargetSinrDb: 10,
};

function dbmToWatts(dbm: number): number {
  return Math.pow(10, (dbm - 30) / 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readBooleanPath(root: Record<string, unknown>, path: string[]): boolean {
  let current: unknown = root;
  for (const segment of path) {
    if (!isRecord(current) || !(segment in current)) {
      return false;
    }
    current = current[segment];
  }
  return current === true;
}

function readNumberPath(root: Record<string, unknown>, path: string[]): number | null {
  let current: unknown = root;
  for (const segment of path) {
    if (!isRecord(current) || !(segment in current)) {
      return null;
    }
    current = current[segment];
  }
  return typeof current === 'number' ? current : null;
}

export function buildEePowerDisclosureFromProfileSnapshot(
  profileSnapshot: Record<string, unknown>,
  assumptionIds: string[] = [],
  config: EnergyLayer1Config = DEFAULT_ENERGY_LAYER1_CONFIG,
): EePowerDisclosure | undefined {
  const layer1Enabled = readBooleanPath(profileSnapshot, ['energy', 'layer1_enabled']);
  const hoEnergyJoules = readNumberPath(profileSnapshot, ['energy', 'energy_per_handover_j']);

  if (!layer1Enabled && hoEnergyJoules === null) {
    return undefined;
  }

  const mergedAssumptionIds = Array.from(
    new Set([
      ...assumptionIds,
      ...(layer1Enabled ? ['ASSUME-ENERGY-001'] : []),
      ...(hoEnergyJoules !== null ? ['ASSUME-HO-ENERGY-001'] : []),
    ]),
  );

  const denominatorTerms: EePowerTermDisclosure[] = [
    {
      id: 'active-tx-power',
      symbol: '\\sum_b p_{s,b}^t',
      sourceRole: 'synthesized',
      runtimeStatus: layer1Enabled ? 'reported' : 'unavailable',
      runtimeField: layer1Enabled ? 'kpiBundle.systemEeBitsPerJoule' : undefined,
      note: 'Runtime active-TX denominator is aggregated from per-beam TX power; numeric beam cap is paper-backed via PAP-2025-MAAC-BHPOWER and the active-beam-only EE structure follows PAP-2025-EEBH-UPLINK.',
    },
    {
      id: 'active-beam-power-proxy',
      symbol: 'P_{active}^{proxy}',
      sourceRole: 'assumption-backed',
      runtimeStatus: layer1Enabled ? 'reported' : 'unavailable',
      runtimeField: layer1Enabled ? 'kpiBundle.totalPowerW' : undefined,
      assumptionIds: ['ASSUME-ENERGY-001'],
      note: `Active beam communication-power proxy uses activeBeamPowerW=${config.activeBeamPowerW} W and retains fixed overhead when DPC changes the TX term.`,
    },
    {
      id: 'idle-beam-power-proxy',
      symbol: 'P_{idle}^{proxy}',
      sourceRole: 'assumption-backed',
      runtimeStatus: layer1Enabled ? 'reported' : 'unavailable',
      runtimeField: layer1Enabled ? 'kpiBundle.totalPowerW' : undefined,
      assumptionIds: ['ASSUME-ENERGY-001'],
      note: `Idle beam communication-power proxy uses idlePowerW=${config.idlePowerW} W and is disclosed as an assumption-backed total-power term, not as the active-TX EE denominator.`,
    },
    {
      id: 'off-beam-power-proxy',
      symbol: 'P_{off}^{proxy}',
      sourceRole: 'assumption-backed',
      runtimeStatus: layer1Enabled ? 'configured-not-materialized' : 'unavailable',
      assumptionIds: ['ASSUME-ENERGY-001'],
      note: `offBeamPowerW=${config.offBeamPowerW} W remains configured as an internal beam-state assumption but is not part of the current active/idle runtime path.`,
    },
    {
      id: 'circuit-power',
      symbol: 'P_{c,s}',
      sourceRole: 'assumption-backed',
      runtimeStatus: 'derived-disclosure-only',
      assumptionIds: ['ASSUME-ENERGY-001'],
      note: 'Formal total communication power keeps circuit power as an explicit assumption-backed denominator term in docs/provenance, but the current runtime does not materialize a separate paper-safe numeric Pc,s field.',
    },
    {
      id: 'pa-efficiency',
      symbol: '\\rho_s',
      sourceRole: 'assumption-backed',
      runtimeStatus: 'derived-disclosure-only',
      assumptionIds: ['ASSUME-ENERGY-001'],
      note: 'Formal total communication power keeps PA efficiency as an assumption-backed denominator term; no LEO-specific numeric runtime value is promoted into the paper-safe baseline.',
    },
    {
      id: 'handover-energy',
      symbol: 'E_{u,HO}',
      sourceRole: 'assumption-backed',
      runtimeStatus: hoEnergyJoules !== null ? 'derived-disclosure-only' : 'unavailable',
      assumptionIds: hoEnergyJoules !== null ? ['ASSUME-HO-ENERGY-001'] : undefined,
      note: hoEnergyJoules !== null
        ? `Per-handover energy is set to ${hoEnergyJoules} J for this run and therefore remains sensitivity-only.`
        : 'Per-handover energy is unset in this run; handover-aware EE must stay out of the headline claim path.',
    },
    {
      id: 'handover-penalty-weight',
      symbol: '\\lambda_{HO}',
      sourceRole: 'paper-backed',
      runtimeStatus: 'derived-disclosure-only',
      note: 'Utility-form fallback keeps lambda_HO = 0.2 as the paper-backed EAQL weight while still requiring disclosure of any handover-energy assumption when instantiated.',
    },
  ];

  const semantics: EePowerSemanticDisclosure[] = [
    {
      id: 'active-tx-power-oriented-ee',
      runtimeStatus: layer1Enabled ? 'reported' : 'unavailable',
      runtimeField: layer1Enabled ? 'kpiBundle.systemEeBitsPerJoule' : undefined,
      numerator: '\\sum_t \\sum_u R_u^t \\Delta t',
      denominatorTerms: ['active-tx-power'],
      note: 'This is the runtime meaning of systemEeBitsPerJoule. It is narrower than total communication power and should be described explicitly as active-TX-only EE.',
      claimGuard: 'Safe as a secondary metric with disclosure; do not relabel it as total communication power or handover-aware EE.',
    },
    {
      id: 'total-communication-power',
      runtimeStatus: layer1Enabled ? 'reported' : 'unavailable',
      runtimeField: layer1Enabled ? 'kpiBundle.totalPowerW' : undefined,
      numerator: 'power accounting only',
      denominatorTerms: ['active-beam-power-proxy', 'idle-beam-power-proxy', 'off-beam-power-proxy'],
      note: 'The current runtime reports totalPowerW as a broader beam-state communication-power proxy. It is assumption-backed and must not be described as the denominator of systemEeBitsPerJoule.',
      claimGuard: 'Requires explicit assumption disclosure before paper use; not a Realistic paper-backed denominator.',
    },
    {
      id: 'handover-aware-ee',
      runtimeStatus: hoEnergyJoules !== null ? 'derived-disclosure-only' : 'unavailable',
      numerator: '\\sum_t \\sum_u R_u^t \\Delta t',
      denominatorTerms: ['circuit-power', 'pa-efficiency', 'handover-energy'],
      note: hoEnergyJoules !== null
        ? 'Handover-aware EE remains assumption-sensitive even when instantiated; it should travel only with an explicit assumptionSet and a sensitivity path.'
        : 'Handover-aware EE stays unavailable on this run because no per-handover energy parameter was declared.',
      claimGuard: 'Energy-centered headline claims require a separate sensitivity package; otherwise downgrade to robustness/sensitivity.',
    },
    {
      id: 'utility-form-fallback-objective',
      runtimeStatus: 'derived-disclosure-only',
      numerator: '\\sum_t \\sum_u R_u^t \\Delta t - C_{HO}',
      denominatorTerms: ['handover-energy', 'handover-penalty-weight'],
      note: 'Utility-form fallback is the paper-safe escape hatch when ratio-style EE claims would overstate assumption-backed denominator realism.',
      claimGuard: 'Prefer this fallback over headline EE-ratio wording when HO-energy assumptions are not sweep-qualified.',
    },
  ];

  return {
    denominatorTerms,
    semantics,
    assumptionIds: mergedAssumptionIds,
    headlineClaimStatus: mergedAssumptionIds.length > 0
      ? 'robustness-or-sensitivity-only'
      : 'secondary-only',
    sensitivityRequirement: 'Energy-centered claim paths require at least one declared sensitivity path over material denominator assumptions before headline use.',
    recommendedFallback: hoEnergyJoules !== null
      ? 'utility-form-fallback-objective'
      : 'secondary-metric-only',
  };
}

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
    const defaultActiveTxPowerW = dbmToWatts(config.txPowerPerBeamDbm);
    const activeBeamOverheadW = Math.max(
      0,
      config.activeBeamPowerW - defaultActiveTxPowerW,
    );
    switch (state) {
      case 'active':
        return activeBeamOverheadW + defaultActiveTxPowerW;
      case 'idle':
        return config.idlePowerW;
      case 'off':
        return config.offBeamPowerW;
    }
  }

  function txPowerForState(state: BeamPowerState): number {
    return state === 'active' ? config.txPowerPerBeamDbm : 0;
  }

  function txPowerWattsForState(state: BeamPowerState): number {
    return state === 'active' ? dbmToWatts(config.txPowerPerBeamDbm) : 0;
  }

  function activeBeamOverheadW(): number {
    return Math.max(0, config.activeBeamPowerW - dbmToWatts(config.txPowerPerBeamDbm));
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
          txPowerW: txPowerWattsForState(state),
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
      foundEntry.txPowerW = clamped > 0 ? dbmToWatts(clamped) : 0;
      foundEntry.consumptionW = activeBeamOverheadW() + foundEntry.txPowerW;

      return clamped;
    },

    computeMetrics(
      throughputs: Map<string, number>,
    ): EnergyEfficiencyMetrics {
      let totalCommunicationPowerW = 0;
      // EP1: active-TX EE denominator is separate from the broader communication-
      // power proxy. The former follows PAP-2025-EEBH-UPLINK; the latter is a
      // beam-state proxy that keeps idle/off assumptions explicit.
      let activeTxPowerW = 0;
      let activeBeamCount = 0;
      let idleBeamCount = 0;
      let offBeamCount = 0;
      let totalBeams = 0;
      const perBeamEe: Array<{ beamId: string; eeBitsPerJoule: number }> = [];

      for (const sat of satellites.values()) {
        for (const entry of sat.beams.values()) {
          totalCommunicationPowerW += entry.consumptionW;
          totalBeams += 1;

          if (entry.state === 'active') {
            activeBeamCount += 1;
            activeTxPowerW += entry.txPowerW;
          } else if (entry.state === 'idle') {
            idleBeamCount += 1;
          } else {
            offBeamCount += 1;
          }

          const throughput = throughputs.get(entry.beamId) ?? 0;
          const ee =
            entry.txPowerW > 0 ? throughput / entry.txPowerW : 0;
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
        activeTxPowerW,
        totalCommunicationPowerW,
        totalPowerW: totalCommunicationPowerW,
        activeBeamCount,
        idleBeamCount,
        offBeamCount,
        activeBeamRatio: totalBeams > 0 ? activeBeamCount / totalBeams : 0,
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
