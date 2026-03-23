/**
 * Active beam manager for beam hopping / scheduling.
 *
 * Phase 3 implementation: deterministic round-robin when maxActiveBeams < total beams.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §8 Beam Semantics
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3, §4
 *   - Tier: paper-backed (round-robin baseline from PAP-2024-HOBS)
 *   - This file must not import React, Three.js, or scene code.
 */

import type { SatelliteBeamLayout, ActiveBeamState } from './types';

export interface ActiveBeamManager {
  /** Set specific beams as active (manual override). */
  setActiveBeams(beamIds: string[]): void;
  /** Check if a beam is currently active. */
  isActive(beamId: string): boolean;
  /** Get all currently active beam IDs. */
  getActiveBeams(): string[];
  /** Advance to next time slot (round-robin rotation). */
  advanceSlot(): void;
  /** Get current state snapshot. */
  getState(): ActiveBeamState;
}

/**
 * Create an active beam manager.
 *
 * If maxActiveBeams is undefined or >= total beams, all beams are always active.
 * Otherwise, beams are activated in round-robin groups of maxActiveBeams per slot.
 */
export function createActiveBeamManager(
  layout: SatelliteBeamLayout,
  maxActiveBeams?: number,
): ActiveBeamManager {
  const allBeamIds = layout.beams.map((b) => b.beamId);
  const totalBeams = allBeamIds.length;
  const effectiveMax =
    maxActiveBeams === undefined || maxActiveBeams >= totalBeams
      ? totalBeams
      : maxActiveBeams;

  const allActive = effectiveMax >= totalBeams;

  let activeSet = new Set<string>(allActive ? allBeamIds : allBeamIds.slice(0, effectiveMax));
  let slotIndex = 0;

  function applyRoundRobin(): void {
    if (allActive) return;
    const startIdx = (slotIndex * effectiveMax) % totalBeams;
    const selected: string[] = [];
    for (let i = 0; i < effectiveMax; i++) {
      selected.push(allBeamIds[(startIdx + i) % totalBeams]);
    }
    activeSet = new Set(selected);

    // Sync isActive on layout beams
    for (const beam of layout.beams) {
      beam.isActive = activeSet.has(beam.beamId);
    }
  }

  // Initialize
  applyRoundRobin();

  return {
    setActiveBeams(beamIds: string[]): void {
      activeSet = new Set(beamIds);
      for (const beam of layout.beams) {
        beam.isActive = activeSet.has(beam.beamId);
      }
    },

    isActive(beamId: string): boolean {
      return activeSet.has(beamId);
    },

    getActiveBeams(): string[] {
      return [...activeSet];
    },

    advanceSlot(): void {
      slotIndex++;
      applyRoundRobin();
    },

    getState(): ActiveBeamState {
      return {
        satId: layout.satId,
        activeBeamIds: new Set(activeSet),
        slotIndex,
      };
    },
  };
}
