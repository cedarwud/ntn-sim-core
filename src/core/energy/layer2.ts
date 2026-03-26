/**
 * Energy Layer 2: onboard energy state tracking (battery/solar).
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.4.1
 *   - Tier: assumption-backed (battery/solar values vary widely by satellite)
 *   - This file must not import React, Three.js, or scene code.
 *
 * Paper sources:
 *   - PAP-2025-SMASH-MADQL: explicit TX/RX/idle power states, NS-3 energy model
 *   - PAP-2025-EAQL: energy-aware reward with λ=0.2 weight
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface EnergyLayer2Config {
  /** Battery capacity in watt-hours. */
  batteryCapacityWh: number;
  /** Initial state of charge (0-1). */
  initialSoc: number;
  /** Solar panel power generation in watts (when in sunlight). */
  solarPowerW: number;
  /** Minimum SoC threshold below which service is blocked. */
  blockingThresholdSoc: number;
  /** Orbital period in seconds (for shadow calculation). */
  orbitalPeriodSec: number;
  /** Fallback fraction of orbit in shadow. Used only when betaAngleDeg is not provided. */
  shadowFraction: number;
  /** Altitude in km (for beta angle shadow calculation). M7 fix. */
  altitudeKm?: number;
  /** Beta angle in degrees — angle between orbital plane and Sun direction.
   *  If provided, shadow fraction is computed from geometry instead of using fixed value.
   *  @source PAP-2025-SMASH-MADQL, standard orbital mechanics */
  betaAngleDeg?: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface SatelliteEnergyLayer2State {
  satId: string;
  /** State of charge (0-1). */
  soc: number;
  /** Current energy in watt-hours. */
  currentEnergyWh: number;
  /** Whether satellite is in sunlight or shadow. */
  isInSunlight: boolean;
  /** Whether service is blocked due to low energy. */
  isEnergyBlocked: boolean;
  /** Cumulative energy consumed in Wh since reset. */
  totalConsumedWh: number;
  /** Cumulative energy generated in Wh since reset. */
  totalGeneratedWh: number;
}

// ---------------------------------------------------------------------------
// Manager interface
// ---------------------------------------------------------------------------

export interface EnergyLayer2Manager {
  /** Initialize a satellite's energy state. */
  initSatellite(satId: string): void;
  /** Update energy state for one tick. */
  tick(satId: string, powerConsumptionW: number, timeSec: number, stepSec: number): void;
  /** Check if a satellite is energy-blocked. */
  isBlocked(satId: string): boolean;
  /** Get current state. */
  getState(satId: string): SatelliteEnergyLayer2State | null;
  /** Get all satellite states. */
  getAllStates(): SatelliteEnergyLayer2State[];
  /**
   * One-shot energy debit in Joules (A8: HO transaction cost).
   * Converts joules to Wh and deducts from battery immediately.
   */
  debitEnergy(satId: string, joules: number): void;
  /** Reset all state. */
  reset(): void;
}

// ---------------------------------------------------------------------------
// Default config (assumption-backed)
// ---------------------------------------------------------------------------

export const DEFAULT_ENERGY_LAYER2_CONFIG: EnergyLayer2Config = {
  batteryCapacityWh: 1000, // assumption-backed
  initialSoc: 1.0,
  solarPowerW: 200, // assumption-backed
  blockingThresholdSoc: 0.1,
  orbitalPeriodSec: 5760, // 96 min typical LEO
  shadowFraction: 0.35, // typical LEO eclipse fraction
};

// ---------------------------------------------------------------------------
// M7 fix: Beta angle shadow fraction
// ---------------------------------------------------------------------------

import { EARTH_RADIUS_KM } from '@/core/common/constants';

/**
 * Compute eclipse (shadow) fraction from beta angle and altitude.
 *
 * beta_critical = arcsin(R_E / (R_E + h))
 * If |beta| >= beta_critical: always in sunlight → shadow fraction = 0
 * Otherwise: shadowFraction = (1/π) * arccos(sqrt(h² + 2·R·h) / ((R+h)·cos(β)))
 *
 * @source Standard orbital mechanics, PAP-2025-SMASH-MADQL
 */
function computeShadowFraction(betaDeg: number, altKm: number): number {
  const R = EARTH_RADIUS_KM;
  const h = altKm;
  const betaRad = Math.abs(betaDeg) * Math.PI / 180;
  const betaCritRad = Math.asin(R / (R + h));

  if (betaRad >= betaCritRad) return 0; // always sunlit

  const cosArgNumerator = Math.sqrt(h * h + 2 * R * h);
  const cosArgDenominator = (R + h) * Math.cos(betaRad);
  const cosArg = Math.min(1, cosArgNumerator / cosArgDenominator);
  return (1 / Math.PI) * Math.acos(cosArg);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createEnergyLayer2(
  config: Partial<EnergyLayer2Config> = {},
): EnergyLayer2Manager {
  const resolvedConfig: EnergyLayer2Config = {
    ...DEFAULT_ENERGY_LAYER2_CONFIG,
    ...config,
  };
  const states = new Map<string, SatelliteEnergyLayer2State>();

  function initSatellite(satId: string): void {
    const initialEnergy = resolvedConfig.batteryCapacityWh * resolvedConfig.initialSoc;
    states.set(satId, {
      satId,
      soc: resolvedConfig.initialSoc,
      currentEnergyWh: initialEnergy,
      isInSunlight: true,
      isEnergyBlocked: resolvedConfig.initialSoc < resolvedConfig.blockingThresholdSoc,
      totalConsumedWh: 0,
      totalGeneratedWh: 0,
    });
  }

  function tick(
    satId: string,
    powerConsumptionW: number,
    timeSec: number,
    stepSec: number,
  ): void {
    const s = states.get(satId);
    if (!s) return;

    // 1. Determine sunlight/shadow from orbital phase
    // M7 fix: use beta angle geometry when available
    const effectiveShadowFraction =
      resolvedConfig.betaAngleDeg !== undefined && resolvedConfig.altitudeKm !== undefined
        ? computeShadowFraction(resolvedConfig.betaAngleDeg, resolvedConfig.altitudeKm)
        : resolvedConfig.shadowFraction;
    const phase = (timeSec % resolvedConfig.orbitalPeriodSec) / resolvedConfig.orbitalPeriodSec;
    s.isInSunlight = phase < 1 - effectiveShadowFraction;

    // 2. Energy generated (only in sunlight)
    const generatedWh = s.isInSunlight
      ? (resolvedConfig.solarPowerW * stepSec) / 3600
      : 0;

    // 3. Energy consumed
    const consumedWh = (powerConsumptionW * stepSec) / 3600;

    // 4. Update energy, clamped to [0, capacity]
    const newEnergy = s.currentEnergyWh + generatedWh - consumedWh;
    s.currentEnergyWh = Math.max(0, Math.min(resolvedConfig.batteryCapacityWh, newEnergy));

    // 5. Update SoC
    s.soc = s.currentEnergyWh / resolvedConfig.batteryCapacityWh;

    // 6. Blocking check (VAL-EE-002)
    s.isEnergyBlocked = s.soc < resolvedConfig.blockingThresholdSoc;

    // 7. Cumulative counters
    s.totalConsumedWh += consumedWh;
    s.totalGeneratedWh += generatedWh;
  }

  const manager: EnergyLayer2Manager = {
    initSatellite,
    tick,

    isBlocked(satId: string): boolean {
      const s = states.get(satId);
      return s ? s.isEnergyBlocked : false;
    },

    getState(satId: string): SatelliteEnergyLayer2State | null {
      const s = states.get(satId);
      return s ? { ...s } : null;
    },

    getAllStates(): SatelliteEnergyLayer2State[] {
      return Array.from(states.values()).map((s) => ({ ...s }));
    },

    debitEnergy(satId: string, joules: number): void {
      const s = states.get(satId);
      if (!s) return;
      const debitWh = joules / 3600;
      s.currentEnergyWh = Math.max(0, s.currentEnergyWh - debitWh);
      s.soc = s.currentEnergyWh / resolvedConfig.batteryCapacityWh;
      s.isEnergyBlocked = s.soc < resolvedConfig.blockingThresholdSoc;
      s.totalConsumedWh += debitWh;
    },

    reset(): void {
      states.clear();
    },
  };

  return manager;
}
