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
  /** Fraction of orbit in shadow (eclipse). */
  shadowFraction: number;
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
// Factory
// ---------------------------------------------------------------------------

export function createEnergyLayer2(
  config: EnergyLayer2Config = DEFAULT_ENERGY_LAYER2_CONFIG,
): EnergyLayer2Manager {
  const states = new Map<string, SatelliteEnergyLayer2State>();

  function initSatellite(satId: string): void {
    const initialEnergy = config.batteryCapacityWh * config.initialSoc;
    states.set(satId, {
      satId,
      soc: config.initialSoc,
      currentEnergyWh: initialEnergy,
      isInSunlight: true,
      isEnergyBlocked: config.initialSoc < config.blockingThresholdSoc,
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
    const phase = (timeSec % config.orbitalPeriodSec) / config.orbitalPeriodSec;
    s.isInSunlight = phase < 1 - config.shadowFraction;

    // 2. Energy generated (only in sunlight)
    const generatedWh = s.isInSunlight
      ? (config.solarPowerW * stepSec) / 3600
      : 0;

    // 3. Energy consumed
    const consumedWh = (powerConsumptionW * stepSec) / 3600;

    // 4. Update energy, clamped to [0, capacity]
    const newEnergy = s.currentEnergyWh + generatedWh - consumedWh;
    s.currentEnergyWh = Math.max(0, Math.min(config.batteryCapacityWh, newEnergy));

    // 5. Update SoC
    s.soc = s.currentEnergyWh / config.batteryCapacityWh;

    // 6. Blocking check (VAL-EE-002)
    s.isEnergyBlocked = s.soc < config.blockingThresholdSoc;

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

    reset(): void {
      states.clear();
    },
  };

  return manager;
}
