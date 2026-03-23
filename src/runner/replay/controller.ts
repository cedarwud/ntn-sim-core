/**
 * Minimal replay controller for ntn-sim-core.
 *
 * Phase 0: returns empty snapshots. Real orbit data comes in Phase 1.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §7
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §4.2
 *   - This file must not import React, Three.js, or scene code.
 */

import type { SimulationSnapshot } from '@/core/common/types';
import type { ReplayRunConfig, ReplayState, ReplayController } from './types';

export function createReplayController(config: ReplayRunConfig): ReplayController {
  const { replayManifest, artifactBundle } = config;
  const stepSec = artifactBundle.manifest.stepSec;

  let currentTimeSec = replayManifest.windowStartSec;
  let currentTick = 0;
  let paused = true;
  let playbackSpeed = config.playbackSpeed;

  function clampTime(t: number): number {
    return Math.max(
      replayManifest.windowStartSec,
      Math.min(t, replayManifest.windowEndSec),
    );
  }

  function tickFromTime(t: number): number {
    return Math.floor((t - replayManifest.windowStartSec) / stepSec);
  }

  return {
    play() {
      paused = false;
    },

    pause() {
      paused = true;
    },

    step() {
      currentTimeSec = clampTime(currentTimeSec + stepSec);
      currentTick = tickFromTime(currentTimeSec);
    },

    seek(timeSec: number) {
      currentTimeSec = clampTime(timeSec);
      currentTick = tickFromTime(currentTimeSec);
    },

    getSnapshot(): SimulationSnapshot {
      // Phase 0: empty snapshot — no orbit data yet.
      return {
        tick: currentTick,
        timeSec: currentTimeSec,
        satellites: [],
        ues: [],
      };
    },

    getState(): ReplayState {
      return {
        currentTimeSec,
        currentTick,
        paused,
        playbackSpeed,
        windowStartSec: replayManifest.windowStartSec,
        windowEndSec: replayManifest.windowEndSec,
      };
    },
  };
}
