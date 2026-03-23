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
  | 'deterministic-fixed';

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
  ): BhSlotDecision;
  /** Get current frame and slot indices. */
  getCurrentIndices(timeSec: number): { frameIndex: number; slotIndex: number };
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

  function selectForSat(
    satId: string,
    slotIndex: number,
    demandPerBeam?: Map<string, number>,
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

      default: {
        // Exhaustive check.
        const _: never = strategy;
        throw new Error(`Unknown strategy: ${_}`);
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
  ): BhSlotDecision {
    const { frameIndex, slotIndex } = computeIndices(
      timeSec,
      frameDurationSec,
      slotsPerFrame,
    );

    // Advance global counter when slot changes.
    if (frameIndex !== lastFrameIndex || slotIndex !== lastSlotIndex) {
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
        selectForSat(satId, globalSlotCounter, demandPerBeam),
      );
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
    reset() {
      globalSlotCounter = 0;
      lastFrameIndex = -1;
      lastSlotIndex = -1;
    },
  };
}
