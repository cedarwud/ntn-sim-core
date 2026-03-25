/**
 * Replay controller for ntn-sim-core.
 *
 * Stores a pre-recorded SimulationSnapshot array and plays it back
 * with seek/pause/step support. The snapshot array is produced by
 * recordRun() or fed from a headless benchmark run.
 *
 * Usage:
 *   const snapshots = recordRun(engine, totalTicks, stepSec);
 *   const ctrl = createSnapshotReplayController({ snapshots, stepSec, playbackSpeed: 1 });
 *   ctrl.play();
 *   // in frame loop: ctrl.advance(deltaMs); snap = ctrl.getSnapshot();
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §7
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §4.2
 *   - This file must not import React, Three.js, or scene code.
 */

import type { SimulationSnapshot } from '@/core/common/types';
import type { ReplayState, ReplayController } from './types';

// ---------------------------------------------------------------------------
// Snapshot-based replay config (new)
// ---------------------------------------------------------------------------

export interface SnapshotReplayConfig {
  /** Pre-recorded snapshots (index = tick number). */
  snapshots: SimulationSnapshot[];
  /** Simulation step size in seconds (used for time→tick mapping). */
  stepSec: number;
  /** Playback speed multiplier (1.0 = real-time). */
  playbackSpeed?: number;
}

// ---------------------------------------------------------------------------
// Record helper — runs engine headlessly and returns snapshot array
// ---------------------------------------------------------------------------

export interface RecordableEngine {
  tick(timeSec: number, tickNumber: number): SimulationSnapshot;
  reset(): void;
}

/**
 * Run the engine for totalTicks steps and return all snapshots.
 * This is a synchronous headless run — call once at init time, not in the frame loop.
 */
export function recordRun(
  engine: RecordableEngine,
  totalTicks: number,
  stepSec: number,
): SimulationSnapshot[] {
  engine.reset();
  const snapshots: SimulationSnapshot[] = [];
  for (let tick = 0; tick < totalTicks; tick++) {
    snapshots.push(engine.tick(tick * stepSec, tick));
  }
  return snapshots;
}

// ---------------------------------------------------------------------------
// Snapshot-based replay controller
// ---------------------------------------------------------------------------

export function createSnapshotReplayController(
  config: SnapshotReplayConfig,
): ReplayController & { advance(deltaMs: number): void } {
  const { snapshots, stepSec } = config;
  const playbackSpeed = config.playbackSpeed ?? 1;

  if (snapshots.length === 0) {
    throw new Error('[createSnapshotReplayController] snapshots array is empty');
  }

  const windowStartSec = snapshots[0].timeSec;
  const windowEndSec = snapshots[snapshots.length - 1].timeSec;

  let currentTimeSec = windowStartSec;
  let paused = true;
  let speed = playbackSpeed;
  // Sub-tick accumulator for smooth real-time playback
  let accumMs = 0;

  function clampTime(t: number): number {
    return Math.max(windowStartSec, Math.min(t, windowEndSec));
  }

  function tickIndex(): number {
    const idx = Math.round((currentTimeSec - windowStartSec) / stepSec);
    return Math.max(0, Math.min(idx, snapshots.length - 1));
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
      accumMs = 0;
    },

    seek(timeSec: number) {
      currentTimeSec = clampTime(timeSec);
      accumMs = 0;
    },

    /** Call each frame with wall-clock delta in ms to advance playback. */
    advance(deltaMs: number) {
      if (paused) return;
      accumMs += deltaMs * speed;
      const stepMs = stepSec * 1000;
      while (accumMs >= stepMs) {
        accumMs -= stepMs;
        currentTimeSec = clampTime(currentTimeSec + stepSec);
        if (currentTimeSec >= windowEndSec) {
          // Loop back to start
          currentTimeSec = windowStartSec;
          accumMs = 0;
        }
      }
    },

    getSnapshot(): SimulationSnapshot {
      return snapshots[tickIndex()];
    },

    getState(): ReplayState {
      return {
        currentTimeSec,
        currentTick: tickIndex(),
        paused,
        playbackSpeed: speed,
        windowStartSec,
        windowEndSec,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Deprecated legacy artifact-bundle controller (kept for API compat)
// ---------------------------------------------------------------------------

import type { ReplayRunConfig } from './types';

/**
 * @deprecated
 * Legacy artifact-bundle replay path retained for API compatibility only.
 * The frontend replay flow uses `recordRun()` + `createSnapshotReplayController()`.
 * Artifact-bundle replay parity is not implemented yet, so this controller still
 * returns placeholder empty snapshots and must not be treated as a completed
 * replay path for Phase 4 closure or paper-facing evidence.
 */
export function createReplayController(config: ReplayRunConfig): ReplayController {
  const { replayManifest, artifactBundle } = config;
  const stepSec = artifactBundle.manifest.stepSec;

  let currentTimeSec = replayManifest.windowStartSec;
  let paused = true;
  const playbackSpeed = config.playbackSpeed;

  function clampTime(t: number): number {
    return Math.max(replayManifest.windowStartSec, Math.min(t, replayManifest.windowEndSec));
  }

  function tickFromTime(t: number): number {
    return Math.floor((t - replayManifest.windowStartSec) / stepSec);
  }

  return {
    play() { paused = false; },
    pause() { paused = true; },

    step() {
      currentTimeSec = clampTime(currentTimeSec + stepSec);
    },

    seek(timeSec: number) {
      currentTimeSec = clampTime(timeSec);
    },

    getSnapshot(): SimulationSnapshot {
      // Placeholder until artifact-bundle replay parity is implemented.
      return { tick: tickFromTime(currentTimeSec), timeSec: currentTimeSec, satellites: [], ues: [] };
    },

    getState(): ReplayState {
      return {
        currentTimeSec,
        currentTick: tickFromTime(currentTimeSec),
        paused,
        playbackSpeed,
        windowStartSec: replayManifest.windowStartSec,
        windowEndSec: replayManifest.windowEndSec,
      };
    },
  };
}
