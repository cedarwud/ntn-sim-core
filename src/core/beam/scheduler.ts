/**
 * Beam hopping scheduler with time-slot semantics.
 *
 * Phase 5 implementation: four scheduling strategies backed by paper parameters.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §8.2 Earth-Fixed / BH Mode
 *   - Roadmap: sdd/ntn-sim-core-roadmap.md Phase 5
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3, §4
 *   - Frame duration 640ms from PAP-2026-BHFREQREUSE, PAP-2025-DIST-BH-HETERO
 *   - This file must not import React, Three.js, or scene code.
 */

import type { SatelliteBeamLayout } from './types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SchedulerStrategy =
  | 'round-robin'
  | 'max-demand'
  | 'power-aware'
  | 'deterministic-fixed'
  /**
   * Proportional Fair (PF): beam priority = demand / historicalServiceCount.
   * Standard cellular scheduling baseline; most DRL papers compare against PF.
   * Reference: 3GPP TS 36.213 §6.2.2 PF scheduling rule.
   */
  | 'proportional-fair'
  /**
   * SINR-Greedy: activate beams with highest current SINR estimate.
   * Upper-bound baseline for channel-aware beam selection.
   * Reference: PAP-2024-HOBS non-DRL greedy comparison.
   */
  | 'sinr-greedy';

export interface BhSchedulerConfig {
  /** BH frame duration in seconds. Default 0.64 (640 ms from papers). */
  frameDurationSec: number;
  /** Number of time slots per frame. Default 4. */
  slotsPerFrame: number;
  /** Max active beams per satellite per slot. */
  maxActiveBeamsPerSlot: number;
  /** Scheduling strategy. */
  strategy: SchedulerStrategy;
  /** For power-aware: target total power budget in watts. */
  powerBudgetW?: number;
  /**
   * Proportional-fair forgetting factor (0 < α ≤ 1).
   * Low α = long memory; high α = reactive to current demand.
   * Default 0.1 (standard PF time constant ≈ 10 slots).
   */
  pfAlpha?: number;
}

export interface BhSlotDecision {
  slotIndex: number;
  frameIndex: number;
  timeSec: number;
  /** Active beams for this slot, per satellite. Key = satId, value = beamId[]. */
  activeBeamsPerSat: Map<string, string[]>;
  /** Reason/score for this decision. */
  reason: string;
}

export interface BhScheduler {
  /** Get the scheduling decision for the current time. */
  getSlotDecision(
    timeSec: number,
    demandPerBeam?: Map<string, number>,
    sinrPerBeam?: Map<string, number>,
  ): BhSlotDecision;
  /** Get current frame and slot indices. */
  getCurrentIndices(timeSec: number): { frameIndex: number; slotIndex: number };
  /** Register a satellite that appeared after scheduler init. */
  registerSatellite(satId: string, layout: SatelliteBeamLayout): void;
  /** Reset scheduler state. */
  reset(): void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: BhSchedulerConfig = {
  frameDurationSec: 0.64,
  slotsPerFrame: 4,
  maxActiveBeamsPerSlot: 4,
  strategy: 'round-robin',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeIndices(
  timeSec: number,
  frameDur: number,
  slotsPerFrame: number,
): { frameIndex: number; slotIndex: number } {
  const frameIndex = Math.floor(timeSec / frameDur);
  const slotDur = frameDur / slotsPerFrame;
  const slotIndex = Math.floor((timeSec % frameDur) / slotDur);
  return { frameIndex, slotIndex };
}

/** Pick top-N beamIds by demand, deterministic tie-breaking by beamId. */
function topByDemand(
  beamIds: string[],
  n: number,
  demandPerBeam: Map<string, number>,
): string[] {
  const sorted = [...beamIds].sort((a, b) => {
    const da = demandPerBeam.get(a) ?? 0;
    const db = demandPerBeam.get(b) ?? 0;
    if (db !== da) return db - da; // descending demand
    return a < b ? -1 : 1; // deterministic tie-break
  });
  return sorted.slice(0, n);
}

// ---------------------------------------------------------------------------
// Strategy implementations (per satellite)
// ---------------------------------------------------------------------------

function roundRobinSelect(
  beamIds: string[],
  max: number,
  slotIndex: number,
): string[] {
  const total = beamIds.length;
  if (max >= total) return [...beamIds];
  const start = (slotIndex * max) % total;
  const result: string[] = [];
  for (let i = 0; i < max; i++) {
    result.push(beamIds[(start + i) % total]);
  }
  return result;
}

function deterministicFixedSelect(
  beamIds: string[],
  max: number,
): string[] {
  return beamIds.slice(0, max);
}

/**
 * Proportional Fair selection: priority = demand_b / historicalServiceCount_b.
 * historicalServiceCount is updated externally after each slot decision.
 */
function proportionalFairSelect(
  beamIds: string[],
  max: number,
  demandPerBeam: Map<string, number>,
  historicalService: Map<string, number>,
): string[] {
  const scored = beamIds.map((id) => {
    const demand = demandPerBeam.get(id) ?? 1; // default 1 to avoid starvation
    const history = historicalService.get(id) ?? 1;
    return { id, score: demand / history };
  });
  scored.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  return scored.slice(0, max).map((s) => s.id);
}

/**
 * SINR-greedy: activate beams in descending order of current SINR estimate.
 * Uses round-robin as fallback when SINR data is unavailable.
 */
function sinrGreedySelect(
  beamIds: string[],
  max: number,
  sinrPerBeam: Map<string, number>,
  slotIndex: number,
): string[] {
  const hasSinr = beamIds.some((id) => sinrPerBeam.has(id));
  if (!hasSinr) return roundRobinSelect(beamIds, max, slotIndex);
  const scored = beamIds.map((id) => ({
    id,
    sinr: sinrPerBeam.get(id) ?? -100,
  }));
  scored.sort((a, b) => b.sinr - a.sinr || (a.id < b.id ? -1 : 1));
  return scored.slice(0, max).map((s) => s.id);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a beam hopping scheduler.
 *
 * @param config - Scheduler configuration (merged with defaults).
 * @param layouts - Map of satId → SatelliteBeamLayout.
 */
export function createBhScheduler(
  config: Partial<BhSchedulerConfig> & Pick<BhSchedulerConfig, 'strategy'>,
  layouts: Map<string, SatelliteBeamLayout>,
): BhScheduler {
  const cfg: BhSchedulerConfig = { ...DEFAULT_CONFIG, ...config };
  const { frameDurationSec, slotsPerFrame, maxActiveBeamsPerSlot, strategy } = cfg;

  // Pre-sort beam IDs per satellite for deterministic ordering.
  const sortedBeamIds = new Map<string, string[]>();
  for (const [satId, layout] of layouts) {
    sortedBeamIds.set(
      satId,
      [...layout.beams.map((b) => b.beamId)].sort(),
    );
  }

  // Power-aware: assume uniform power per beam = powerBudgetW / maxActiveBeamsPerSlot
  // so effective max = min(maxActiveBeamsPerSlot, floor(budget / perBeamPower)).
  // If no budget set, falls back to max-demand behaviour.
  const perBeamPowerW =
    cfg.powerBudgetW !== undefined && maxActiveBeamsPerSlot > 0
      ? cfg.powerBudgetW / maxActiveBeamsPerSlot
      : undefined;

  // PF: historical service counts per beam (exponential moving average with α = pfAlpha).
  const pfAlpha = cfg.pfAlpha ?? 0.1;
  const historicalService = new Map<string, number>();

  function selectForSat(
    satId: string,
    slotIndex: number,
    demandPerBeam?: Map<string, number>,
    sinrPerBeam?: Map<string, number>,
  ): string[] {
    const beamIds = sortedBeamIds.get(satId);
    if (!beamIds || beamIds.length === 0) return [];
    const max = Math.min(maxActiveBeamsPerSlot, beamIds.length);

    switch (strategy) {
      case 'round-robin':
        return roundRobinSelect(beamIds, max, slotIndex);

      case 'max-demand':
        return topByDemand(beamIds, max, demandPerBeam ?? new Map());

      case 'power-aware': {
        if (perBeamPowerW === undefined || perBeamPowerW <= 0) {
          // No budget constraint — fall back to max-demand.
          return topByDemand(beamIds, max, demandPerBeam ?? new Map());
        }
        const budgetMax = Math.min(
          max,
          Math.floor(cfg.powerBudgetW! / perBeamPowerW),
        );
        return topByDemand(beamIds, budgetMax, demandPerBeam ?? new Map());
      }

      case 'deterministic-fixed':
        return deterministicFixedSelect(beamIds, max);

      case 'proportional-fair':
        return proportionalFairSelect(
          beamIds, max, demandPerBeam ?? new Map(), historicalService,
        );

      case 'sinr-greedy':
        return sinrGreedySelect(beamIds, max, sinrPerBeam ?? new Map(), slotIndex);

      default: {
        // Exhaustive check.
        const _: never = strategy;
        throw new Error(`Unknown strategy: ${_}`);
      }
    }
  }

  /** Update PF historical service counts after each slot. */
  function updatePfHistory(activeBeamIds: string[]): void {
    const activeSet = new Set(activeBeamIds);
    for (const beamId of [...historicalService.keys()]) {
      const wasActive = activeSet.has(beamId) ? 1 : 0;
      historicalService.set(beamId, (1 - pfAlpha) * historicalService.get(beamId)! + pfAlpha * wasActive);
    }
    // Initialize new beams.
    for (const beamId of activeBeamIds) {
      if (!historicalService.has(beamId)) {
        historicalService.set(beamId, pfAlpha); // start with small positive value
      }
    }
  }

  // Global slot counter for round-robin (tracks across frames).
  let globalSlotCounter = 0;
  let lastFrameIndex = -1;
  let lastSlotIndex = -1;

  function getSlotDecision(
    timeSec: number,
    demandPerBeam?: Map<string, number>,
    sinrPerBeam?: Map<string, number>,
  ): BhSlotDecision {
    const { frameIndex, slotIndex } = computeIndices(
      timeSec,
      frameDurationSec,
      slotsPerFrame,
    );

    // Advance global counter when slot changes.
    const slotChanged = frameIndex !== lastFrameIndex || slotIndex !== lastSlotIndex;
    if (slotChanged) {
      if (lastFrameIndex >= 0) {
        // Count how many slots have passed.
        const prevGlobal = lastFrameIndex * slotsPerFrame + lastSlotIndex;
        const curGlobal = frameIndex * slotsPerFrame + slotIndex;
        globalSlotCounter += curGlobal - prevGlobal;
      }
      lastFrameIndex = frameIndex;
      lastSlotIndex = slotIndex;
    }

    const activeBeamsPerSat = new Map<string, string[]>();
    for (const satId of sortedBeamIds.keys()) {
      activeBeamsPerSat.set(
        satId,
        selectForSat(satId, globalSlotCounter, demandPerBeam, sinrPerBeam),
      );
    }

    // Update PF history after each slot transition.
    if (strategy === 'proportional-fair' && slotChanged) {
      const allActive = [...activeBeamsPerSat.values()].flat();
      updatePfHistory(allActive);
    }

    const totalActive = [...activeBeamsPerSat.values()].reduce(
      (s, arr) => s + arr.length,
      0,
    );

    return {
      slotIndex,
      frameIndex,
      timeSec,
      activeBeamsPerSat,
      reason: `${strategy} | frame=${frameIndex} slot=${slotIndex} active=${totalActive}`,
    };
  }

  return {
    getSlotDecision,
    getCurrentIndices(timeSec: number) {
      return computeIndices(timeSec, frameDurationSec, slotsPerFrame);
    },
    /** Register a satellite that appeared after scheduler init. */
    registerSatellite(satId: string, layout: SatelliteBeamLayout): void {
      if (sortedBeamIds.has(satId)) return;
      const beamIds = [...layout.beams.map((b) => b.beamId)].sort();
      sortedBeamIds.set(satId, beamIds);
      // Initialize PF history for new beams.
      if (strategy === 'proportional-fair') {
        for (const beamId of beamIds) {
          if (!historicalService.has(beamId)) {
            historicalService.set(beamId, pfAlpha);
          }
        }
      }
    },
    reset() {
      globalSlotCounter = 0;
      lastFrameIndex = -1;
      lastSlotIndex = -1;
      historicalService.clear();
    },
  };
}
