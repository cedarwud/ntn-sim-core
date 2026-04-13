/**
 * useReplay — R3F hook that pre-records a simulation run and replays it.
 *
 * On mount (once per profileId):
 *   1. Builds constellation + cache + engine (same as useSimulation)
 *   2. Selects a deterministic replay window from geometry or continuity truth
 *   3. Runs the engine headlessly and stores only the selected-window snapshots
 *   4. Returns a replay controller and exposes snapshot / state
 *
 * In each frame:
 *   - Advances the replay controller by wall-clock delta × speed
 *   - Exposes snapshot at the current playback position
 *
 * Must be used inside an R3F <Canvas>.
 *
 * @see src/runner/replay/controller.ts
 * @see sdd/ntn-sim-core-frontend-beam-visual-sdd.md §12.2 (4V-3)
 */

import { useThree } from '@react-three/fiber';
import { useState, useEffect, useRef } from 'react';

import { DEFAULT_INTERACTIVE_PROFILE_ID } from '@/core/profiles/default-profile';
import { loadProfile } from '@/core/profiles';
import { buildInteractiveProfileRuntime } from '@/core/orbit/profile-runtime';
import { createSimEngine } from '@/core/engine';
import { createReplayArtifact } from '@/core/trace/factory';
import { recordWindow, createReplayControllerFromArtifact } from '@/runner/replay/controller';
import { createReplaySelectionPlan } from '@/runner/curation';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import type { ReplayManifest } from '@/core/trace/types';
import type { ReplayState, ReplayController } from '@/runner/replay/types';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseReplayOptions {
  profileId?: string;
  speed?: number;
  paused?: boolean;
  initialSeekSec?: number | null;
}

export interface UseReplayResult {
  snapshot: SimulationSnapshot | null;
  isReady: boolean;
  replayState: ReplayState | null;
  satelliteCount: number;
  visibleCount: number;
  servingSatId: string | null;
  replayManifest: ReplayManifest | null;
  selectionReason: string | null;
  profileId: string;
}

// ---------------------------------------------------------------------------
// Throttle interval (ms)
// ---------------------------------------------------------------------------

const SNAPSHOT_INTERVAL_MS = 50;

type ReplayArtifactController = ReplayController & {
  advance(deltaMs: number): void;
};

interface ReplayRuntime {
  controller: ReplayArtifactController;
  satelliteCount: number;
  replayManifest: ReplayManifest;
  selectionReason: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReplay(options?: UseReplayOptions): UseReplayResult {
  const {
    profileId = DEFAULT_INTERACTIVE_PROFILE_ID,
    speed = 1,
    paused = false,
    initialSeekSec = null,
  } = options ?? {};

  // ── 1. Build + headless record (once per profileId) ──

  const [runtime, setRuntime] = useState<ReplayRuntime | null>(null);

  useEffect(() => {
    let disposed = false;
    setRuntime(null);
    setSnapshot(null);
    setReplayState(null);
    lastSnapshotTimeRef.current = 0;

    const prof = loadProfile(profileId);

    void (async () => {
      try {
        const { elements, trajectoryCache } = await buildInteractiveProfileRuntime(prof);
        if (disposed) return;

        const engine = createSimEngine({ profile: prof, trajectoryCache });
        const replayPlan = createReplaySelectionPlan(
          prof,
          trajectoryCache,
          `replay-${prof.id}-${prof.seed}`,
          'showcase',
        );
        const { selectedWindow, replayManifest } = replayPlan;
        // Only run ticks up to window end — full-duration recording is unnecessary
        // because we only keep window snapshots.  Engine state evolves forward from
        // tick 0 so state at the window is still correct.
        const endTicks = Math.round(selectedWindow.endTimeSec / prof.timeControl.stepSec) + 1;
        const snapshots = recordWindow(
          engine,
          endTicks,
          prof.timeControl.stepSec,
          selectedWindow.startTimeSec,
          selectedWindow.endTimeSec,
        );
        const replayArtifact = createReplayArtifact(replayManifest, snapshots);
        const ctrl = createReplayControllerFromArtifact({
          replayArtifact,
          stepSec: prof.timeControl.stepSec,
          playbackSpeed: speed,
        });
        if (initialSeekSec !== null && Number.isFinite(initialSeekSec)) {
          ctrl.seek(initialSeekSec);
        }
        ctrl.play();

        if (disposed) return;
        setRuntime({
          controller: ctrl,
          satelliteCount: elements.length,
          replayManifest,
          selectionReason: selectedWindow.reason,
        });
      } catch (error) {
        console.warn('[useReplay] Failed to bootstrap replay runtime:', prof.id, error);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [initialSeekSec, profileId]);

  useEffect(() => {
    runtime?.controller.setPlaybackSpeed(speed);
  }, [runtime, speed]);

  // ── 2. Snapshot state ──

  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [replayState, setReplayState] = useState<ReplayState | null>(null);
  const lastSnapshotTimeRef = useRef(0);

  // ── 3. Interval-based advance (decoupled from R3F demand-render loop) ──
  // Uses setInterval like useSimulation.ts so the controller advances
  // independently of R3F frame scheduling.  With frameloop="demand",
  // relying on useFrame to call invalidate() creates a chicken-and-egg
  // problem: if R3F stops scheduling frames (no pending invalidations),
  // useFrame never fires and the loop never restarts.  setInterval fires
  // unconditionally, calling invalidate() to re-drive the canvas.

  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (!runtime) return;

    let lastTime = performance.now();

    const id = setInterval(() => {
      const { controller } = runtime;
      const now = performance.now();
      const deltaMs = now - lastTime;
      lastTime = now;

      if (!paused) {
        controller.advance(deltaMs);
      }

      if (now - lastSnapshotTimeRef.current < SNAPSHOT_INTERVAL_MS) return;
      lastSnapshotTimeRef.current = now;

      setSnapshot(controller.getSnapshot());
      setReplayState(controller.getState());
      invalidate(); // trigger one GPU render per snapshot update
    }, SNAPSHOT_INTERVAL_MS);

    return () => clearInterval(id);
  }, [runtime, paused, invalidate]);

  // ── 4. Derived ──

  const visibleCount = snapshot?.satellites.filter((s) => s.isVisible).length ?? 0;
  const servingSatId = snapshot?.ues[0]?.servingSatId ?? null;

  return {
    snapshot,
    isReady: runtime != null,
    replayState,
    satelliteCount: runtime?.satelliteCount ?? 0,
    visibleCount,
    servingSatId,
    replayManifest: runtime?.replayManifest ?? null,
    selectionReason: runtime?.selectionReason ?? null,
    profileId,
  };
}
