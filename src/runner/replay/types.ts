/**
 * Replay runner types for ntn-sim-core.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §4, §7
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §4.2
 *   - This file must not import React, Three.js, or scene code.
 */

import type { SimulationSnapshot } from '@/core/common/types';
import type { RunArtifactBundle, ReplayManifest } from '@/core/trace/types';

// ---------------------------------------------------------------------------
// Replay Run Config
// ---------------------------------------------------------------------------

export interface ReplayRunConfig {
  /** The artifact bundle to replay. */
  artifactBundle: RunArtifactBundle;
  /** Replay window and selection metadata. */
  replayManifest: ReplayManifest;
  /** Playback speed multiplier (1.0 = real-time). */
  playbackSpeed: number;
}

// ---------------------------------------------------------------------------
// Replay State
// ---------------------------------------------------------------------------

export interface ReplayState {
  /** Current playback position in simulation seconds. */
  currentTimeSec: number;
  /** Current tick index. */
  currentTick: number;
  /** Whether playback is paused. */
  paused: boolean;
  /** Current playback speed multiplier. */
  playbackSpeed: number;
  /** Window start in seconds. */
  windowStartSec: number;
  /** Window end in seconds. */
  windowEndSec: number;
}

// ---------------------------------------------------------------------------
// Replay Controller
// ---------------------------------------------------------------------------

export interface ReplayController {
  play(): void;
  pause(): void;
  /** Advance one tick. */
  step(): void;
  /** Jump to a specific simulation time. */
  seek(timeSec: number): void;
  /** Update playback speed without rebuilding the controller. */
  setPlaybackSpeed(playbackSpeed: number): void;
  /** Get the simulation snapshot at the current playback position. */
  getSnapshot(): SimulationSnapshot;
  /** Get the current playback state. */
  getState(): ReplayState;
}
