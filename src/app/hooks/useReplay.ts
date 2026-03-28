/**
 * useReplay — R3F hook that pre-records a simulation run and replays it.
 *
 * On mount (once per profileId):
 *   1. Builds constellation + cache + engine (same as useSimulation)
 *   2. Selects a deterministic replay window from the trajectory cache
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

import { useFrame } from '@react-three/fiber';
import { useState, useMemo, useRef } from 'react';

import { loadProfile } from '@/core/profiles';
import { buildInteractiveTrajectoryCache, buildSyntheticOrbitElements } from '@/core/orbit';
import { loadOmmRecords, ommToSatrecs, sampleRecords } from '@/core/orbit/tle-loader';
import { satrecsToOrbitElements } from '@/core/orbit/sgp4-adapter';
import { createSimEngine } from '@/core/engine';
import { createReplayArtifact } from '@/core/trace/factory';
import { recordWindow, createReplayControllerFromArtifact } from '@/runner/replay/controller';
import { createReplaySelectionPlan } from '@/runner/curation';
import type { SimulationSnapshot } from '@/core/common/types';
import type { ReplayManifest } from '@/core/trace/types';
import type { ReplayState } from '@/runner/replay/types';

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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReplay(options?: UseReplayOptions): UseReplayResult {
  const {
    profileId = 'realistic-first-screen',
    speed = 1,
    paused = false,
    initialSeekSec = null,
  } = options ?? {};

  // ── 1. Build + headless record (once per profileId) ──

  const { controller, satelliteCount, replayManifest, selectionReason } = useMemo(() => {
    const prof = loadProfile(profileId);

    let elements;

    if (prof.orbitMode === 'real-trace' && prof.tleDataPath) {
      let ommJson: unknown[] = [];
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', prof.tleDataPath, false);
        xhr.send(null);
        if (xhr.status === 200) ommJson = JSON.parse(xhr.responseText) as unknown[];
      } catch {
        console.warn('[useReplay] Failed to load TLE fixture:', prof.tleDataPath);
      }
      const maxSats = prof.tleMaxSatellites ?? 200;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records = loadOmmRecords(ommJson as any[]);
      const sampled = sampleRecords(records, maxSats, prof.seed);
      const satrecs = ommToSatrecs(sampled);
      elements = satrecsToOrbitElements(satrecs);
    } else {
      elements = buildSyntheticOrbitElements(prof);
    }

    const cache = buildInteractiveTrajectoryCache(prof, elements);

    const engine = createSimEngine({ profile: prof, trajectoryCache: cache });

    const replayPlan = createReplaySelectionPlan(
      prof,
      cache,
      `replay-${prof.id}-${prof.seed}`,
      'showcase',
    );
    const { selectedWindow, replayManifest } = replayPlan;

    // Headless record — runs from tick 0 for state accuracy, but retains only
    // the deterministic curated replay window.
    const totalTicks = Math.floor(prof.timeControl.durationSec / prof.timeControl.stepSec);
    const snapshots = recordWindow(
      engine,
      totalTicks,
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

    return {
      controller: ctrl,
      satelliteCount: elements.length,
      replayManifest,
      selectionReason: selectedWindow.reason,
    };
  }, [initialSeekSec, profileId, speed]);

  // ── 2. Snapshot state ──

  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [replayState, setReplayState] = useState<ReplayState | null>(null);
  const lastSnapshotTimeRef = useRef(0);

  // ── 3. Frame loop ──

  useFrame((_, delta) => {
    if (!paused) {
      controller.advance(delta * 1000); // advance expects ms
    }

    const now = performance.now();
    if (now - lastSnapshotTimeRef.current < SNAPSHOT_INTERVAL_MS) return;
    lastSnapshotTimeRef.current = now;

    setSnapshot(controller.getSnapshot());
    setReplayState(controller.getState());
  });

  // ── 4. Derived ──

  const visibleCount = snapshot?.satellites.filter((s) => s.isVisible).length ?? 0;
  const servingSatId = snapshot?.ues[0]?.servingSatId ?? null;

  return {
    snapshot,
    isReady: true,
    replayState,
    satelliteCount,
    visibleCount,
    servingSatId,
    replayManifest,
    selectionReason,
    profileId,
  };
}
