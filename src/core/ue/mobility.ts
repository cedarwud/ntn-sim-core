/**
 * UE mobility models for ntn-sim-core (P4 fix).
 *
 * Supports static, linear, and random-walk mobility.
 * Updates UE positions per tick based on speed and direction.
 *
 * Paper sources:
 *   - PAP-2024-HDMMA-MOBILITY: mobility management in LEO NTN
 *   - PAP-2025-DYNLHT-VELOCITY: velocity-aware handover policies
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9
 *   - This file must not import React, Three.js, or scene code.
 */

import type { UePosition } from './position-generator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MobilityModel = 'static' | 'linear' | 'random-walk';

export interface MobilityConfig {
  model: MobilityModel;
  /** Speed in km/h. */
  speedKmh: number;
  /** Linear: heading direction in degrees (0=North, 90=East). */
  headingDeg?: number;
  /** Random-walk: maximum turn angle per step in degrees. */
  maxTurnDeg?: number;
  /** Boundary: maximum distance from origin in km (UEs bounce at boundary). */
  boundaryRadiusKm?: number;
}

export interface MobilityState {
  /** Current heading in degrees per UE. */
  headings: Map<string, number>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a mobility updater that modifies UE positions in-place per tick.
 */
export function createMobilityUpdater(config: MobilityConfig, rngNext: () => number) {
  const headings = new Map<string, number>();
  const speedKmS = config.speedKmh / 3600;

  /**
   * Update UE positions for one tick.
   * @param positions — UE positions to update (mutated in place)
   * @param stepSec — tick duration in seconds
   */
  function update(positions: UePosition[], stepSec: number): void {
    if (config.model === 'static' || speedKmS <= 0) return;

    const distKm = speedKmS * stepSec;

    for (const ue of positions) {
      if (ue.id === 'ue-0' && positions.length > 1) {
        // Keep primary UE at center for backward compatibility in multi-UE
        // (single-UE mode: ue-0 moves normally)
        if (positions.length > 1) continue;
      }

      // Get or init heading
      let heading = headings.get(ue.id);
      if (heading === undefined) {
        heading = config.model === 'linear'
          ? (config.headingDeg ?? 0)
          : rngNext() * 360; // random initial heading
        headings.set(ue.id, heading);
      }

      // Random-walk: update heading
      if (config.model === 'random-walk') {
        const maxTurn = config.maxTurnDeg ?? 45;
        heading += (rngNext() - 0.5) * 2 * maxTurn;
        headings.set(ue.id, heading);
      }

      // Move
      const headRad = heading * Math.PI / 180;
      ue.offsetEastKm += distKm * Math.sin(headRad);
      ue.offsetNorthKm += distKm * Math.cos(headRad);

      // Boundary reflection
      const boundary = config.boundaryRadiusKm;
      if (boundary && boundary > 0) {
        const dist = Math.sqrt(ue.offsetEastKm ** 2 + ue.offsetNorthKm ** 2);
        if (dist > boundary) {
          // Reflect: reverse direction and clamp
          const scale = boundary / dist;
          ue.offsetEastKm *= scale;
          ue.offsetNorthKm *= scale;
          headings.set(ue.id, (heading + 180) % 360);
        }
      }

      ue.distanceFromCenterKm = Math.sqrt(ue.offsetEastKm ** 2 + ue.offsetNorthKm ** 2);
    }
  }

  function reset(): void {
    headings.clear();
  }

  return { update, reset };
}
