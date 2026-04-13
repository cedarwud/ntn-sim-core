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
import { createReplayIdentityRecord } from '@/core/trace/factory';
import type { ReplayArtifact } from '@/core/trace/types';
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

/**
 * Run the engine from tick 0, but only retain snapshots that fall inside
 * the requested replay window. This preserves stateful HO/channel evolution
 * before the selected showcase window while keeping replay deterministic.
 */
export function recordWindow(
  engine: RecordableEngine,
  totalTicks: number,
  stepSec: number,
  windowStartSec: number,
  windowEndSec: number,
): SimulationSnapshot[] {
  engine.reset();
  const snapshots: SimulationSnapshot[] = [];
  for (let tick = 0; tick < totalTicks; tick++) {
    const timeSec = tick * stepSec;
    const snapshot = engine.tick(timeSec, tick);
    if (timeSec >= windowStartSec && timeSec <= windowEndSec) {
      snapshots.push(snapshot);
    }
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

    setPlaybackSpeed(playbackSpeed: number) {
      speed = Math.max(0, playbackSpeed);
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

export interface ReplayArtifactControllerConfig {
  replayArtifact: ReplayArtifact;
  stepSec: number;
  playbackSpeed?: number;
}

export function createReplayControllerFromArtifact(
  config: ReplayArtifactControllerConfig,
): ReplayController & { advance(deltaMs: number): void } {
  const { replayArtifact, stepSec, playbackSpeed } = config;
  const { replayManifest, identity, snapshots } = replayArtifact;

  if (snapshots.length === 0) {
    throw new Error('[createReplayControllerFromArtifact] replay artifact snapshots are empty');
  }

  const regeneratedIdentity = createReplayIdentityRecord(snapshots);
  if (regeneratedIdentity.signature !== identity.signature) {
    throw new Error(
      `[createReplayControllerFromArtifact] replay identity signature mismatch: ${regeneratedIdentity.signature} !== ${identity.signature}`,
    );
  }

  if (snapshots[0].timeSec !== replayManifest.windowStartSec) {
    throw new Error('[createReplayControllerFromArtifact] first snapshot does not match replayManifest.windowStartSec');
  }
  if (snapshots[snapshots.length - 1].timeSec !== replayManifest.windowEndSec) {
    throw new Error('[createReplayControllerFromArtifact] last snapshot does not match replayManifest.windowEndSec');
  }

  return createSnapshotReplayController({
    snapshots,
    stepSec,
    playbackSpeed,
  });
}

// ---------------------------------------------------------------------------
// Deprecated legacy artifact-bundle controller (kept for API compat)
// ---------------------------------------------------------------------------

import type { ReplayRunConfig } from './types';

export function createReplayController(
  config: ReplayRunConfig,
): ReplayController & { advance(deltaMs: number): void } {
  const replayArtifact = config.artifactBundle.replayArtifact;
  if (!replayArtifact) {
    throw new Error('[createReplayController] artifact bundle does not carry replayArtifact');
  }
  if (replayArtifact.replayManifest.windowStartSec !== config.replayManifest.windowStartSec ||
      replayArtifact.replayManifest.windowEndSec !== config.replayManifest.windowEndSec ||
      replayArtifact.replayManifest.selectionCriteria !== config.replayManifest.selectionCriteria ||
      replayArtifact.replayManifest.selectionMethod !== config.replayManifest.selectionMethod) {
    throw new Error('[createReplayController] artifact replayManifest does not match requested replayManifest');
  }

  return createReplayControllerFromArtifact({
    replayArtifact,
    stepSec: config.artifactBundle.manifest.stepSec,
    playbackSpeed: config.playbackSpeed,
  });
}
