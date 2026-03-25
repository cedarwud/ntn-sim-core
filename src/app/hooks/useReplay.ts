/**
 * useReplay — R3F hook that pre-records a simulation run and replays it.
 *
 * On mount (once per profileId):
 *   1. Builds constellation + cache + engine (same as useSimulation)
 *   2. Runs the engine headlessly for the full durationSec (synchronous)
 *   3. Stores all snapshots in memory
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
import { generateWalkerConstellation } from '@/core/orbit';
import { buildTrajectoryCache } from '@/core/orbit/trajectory-cache';
import { loadOmmRecords, ommToSatrecs, sampleRecords } from '@/core/orbit/tle-loader';
import { satrecsToOrbitElements } from '@/core/orbit/sgp4-adapter';
import { createSimEngine } from '@/core/engine';
import { recordRun, createSnapshotReplayController } from '@/runner/replay/controller';
import type { SimulationSnapshot } from '@/core/common/types';
import type { ReplayState } from '@/runner/replay/types';
import type { WalkerConfig } from '@/core/orbit/types';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseReplayOptions {
  profileId?: string;
  speed?: number;
  paused?: boolean;
}

export interface UseReplayResult {
  snapshot: SimulationSnapshot | null;
  isReady: boolean;
  replayState: ReplayState | null;
  satelliteCount: number;
  visibleCount: number;
  servingSatId: string | null;
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
    profileId = 'case9-access-baseline',
    speed = 1,
    paused = false,
  } = options ?? {};

  // ── 1. Build + headless record (once per profileId) ──

  const { controller, satelliteCount } = useMemo(() => {
    const prof = loadProfile(profileId);
    const CACHE_STEP_SEC = 10;

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
      const walkerConfig: WalkerConfig = {
        shells: [{
          id: 'shell-0',
          altitudeKm: prof.orbital.altitude_km,
          inclinationDeg: prof.orbital.inclination_deg,
          planes: prof.orbital.num_planes,
          satsPerPlane: prof.orbital.sats_per_plane,
        }],
        epochUtcMs: prof.timeControl.epochUtcMs,
      };
      elements = generateWalkerConstellation(walkerConfig);
    }

    const cache = buildTrajectoryCache({
      elements,
      observerLatDeg: prof.observer.latitudeDeg,
      observerLonDeg: prof.observer.longitudeDeg,
      observerAltKm: prof.observer.altitudeM / 1000,
      durationSec: prof.timeControl.durationSec,
      stepSec: CACHE_STEP_SEC,
      epochUtcMs: prof.timeControl.epochUtcMs,
    });

    const engine = createSimEngine({ profile: prof, trajectoryCache: cache });

    // Headless record — synchronous, runs entire simulation upfront
    const totalTicks = Math.floor(prof.timeControl.durationSec / prof.timeControl.stepSec);
    const snapshots = recordRun(engine, totalTicks, prof.timeControl.stepSec);

    const ctrl = createSnapshotReplayController({
      snapshots,
      stepSec: prof.timeControl.stepSec,
      playbackSpeed: speed,
    });
    ctrl.play();

    return { controller: ctrl, satelliteCount: elements.length };
  }, [profileId]);

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
    profileId,
  };
}
