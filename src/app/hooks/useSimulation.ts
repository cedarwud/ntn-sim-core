/**
 * useSimulation — R3F hook that drives the simulation loop.
 *
 * Loads a profile, builds a Walker constellation + trajectory cache on mount,
 * then creates a SimEngine and advances simulation time each frame via useFrame.
 *
 * Must be used inside an R3F <Canvas>.
 */

import { useFrame } from '@react-three/fiber';
import { useState, useMemo, useRef } from 'react';

import { loadProfile } from '@/core/profiles';
import { generateWalkerConstellation } from '@/core/orbit';
import { buildTrajectoryCache } from '@/core/orbit/trajectory-cache';
import { loadOmmRecords, ommToSatrecs, sampleRecords } from '@/core/orbit/tle-loader';
import { satrecsToOrbitElements } from '@/core/orbit/sgp4-adapter';
import { createSimEngine } from '@/core/engine';
import type { SimEngine } from '@/core/engine';
import type { SimulationSnapshot } from '@/core/common/types';
import type { WalkerConfig } from '@/core/orbit/types';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseSimulationOptions {
  profileId?: string;   // default: 'case9-access-baseline'
  speed?: number;       // playback speed multiplier, default 1
  paused?: boolean;
}

export interface UseSimulationResult {
  snapshot: SimulationSnapshot | null;
  isReady: boolean;
  simTimeSec: number;
  totalDurationSec: number;
  satelliteCount: number;
  visibleCount: number;
  servingSatId: string | null;
  servingBeamId: string | null;
  handoverCount: number;
  profileId: string;
}

// ---------------------------------------------------------------------------
// Throttle interval (ms) — cap snapshot state updates to ~20 fps
// ---------------------------------------------------------------------------

const SNAPSHOT_INTERVAL_MS = 50;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSimulation(
  options?: UseSimulationOptions,
): UseSimulationResult {
  const {
    profileId = 'case9-access-baseline',
    speed = 1,
    paused = false,
  } = options ?? {};

  // ── 1. Build constellation + cache + engine (once per profileId) ──

  const { engine, profile, durationSec, satelliteCount } = useMemo(() => {
    const prof = loadProfile(profileId);

    // Cache step is 10s for performance; engine tick rate (stepSec) is separate.
    const CACHE_STEP_SEC = 10;

    let elements;

    if (prof.orbitMode === 'real-trace' && prof.tleDataPath) {
      // 4V-1/4V-2: TLE/SGP4 path — load OMM fixture and build real-trace elements
      // Dynamic import is async, so we use a synchronous fetch for the fixture.
      // The fixture file is served as a static asset from the public or fixtures dir.
      let ommJson: unknown[] = [];
      try {
        // Use synchronous XHR to load fixture at hook init time (inside useMemo).
        // This is acceptable here: it runs once on mount, not in the frame loop.
        const xhr = new XMLHttpRequest();
        xhr.open('GET', prof.tleDataPath, false /* synchronous */);
        xhr.send(null);
        if (xhr.status === 200) {
          ommJson = JSON.parse(xhr.responseText) as unknown[];
        }
      } catch {
        console.warn('[useSimulation] Failed to load TLE fixture:', prof.tleDataPath);
      }

      const maxSats = prof.tleMaxSatellites ?? 200;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records = loadOmmRecords(ommJson as any[]);
      const sampled = sampleRecords(records, maxSats, prof.seed);
      const satrecs = ommToSatrecs(sampled);
      elements = satrecsToOrbitElements(satrecs);
    } else {
      // Synthetic Walker path
      const walkerConfig: WalkerConfig = {
        shells: [
          {
            id: 'shell-0',
            altitudeKm: prof.orbital.altitude_km,
            inclinationDeg: prof.orbital.inclination_deg,
            planes: prof.orbital.num_planes,
            satsPerPlane: prof.orbital.sats_per_plane,
          },
        ],
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

    const eng = createSimEngine({
      profile: prof,
      trajectoryCache: cache,
    });

    return {
      engine: eng,
      profile: prof,
      durationSec: prof.timeControl.durationSec,
      satelliteCount: elements.length,
    };
  }, [profileId]);

  // ── 2. Mutable sim-time ref (avoids per-frame re-renders) ──

  const simTimeRef = useRef(0);
  const lastSnapshotTimeRef = useRef(0);

  // ── 3. Snapshot state (updated at throttled rate) ──

  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const handoverCountRef = useRef(0);
  const prevServingSatIdRef = useRef<string | null>(null);

  // ── 4. Frame loop ──

  useFrame((_, delta) => {
    if (paused) return;

    // Advance time, wrap at end
    simTimeRef.current += delta * speed;
    if (simTimeRef.current >= durationSec) {
      simTimeRef.current %= durationSec;
      engine.reset();
      handoverCountRef.current = 0;
      prevServingSatIdRef.current = null;
    }
    if (simTimeRef.current < 0) {
      simTimeRef.current = 0;
    }

    // Throttle snapshot updates to ~20 fps
    const now = performance.now();
    if (now - lastSnapshotTimeRef.current < SNAPSHOT_INTERVAL_MS) return;
    lastSnapshotTimeRef.current = now;

    const timeSec = simTimeRef.current;
    const tickNumber = Math.floor(timeSec / profile.timeControl.stepSec);

    const snap = engine.tick(timeSec, tickNumber);

    // Track handover count by detecting serving satellite changes
    const currentServing = snap.ues[0]?.servingSatId ?? null;
    if (
      currentServing !== null &&
      prevServingSatIdRef.current !== null &&
      currentServing !== prevServingSatIdRef.current
    ) {
      handoverCountRef.current += 1;
    }
    prevServingSatIdRef.current = currentServing;

    setSnapshot(snap);
  });

  // ── 5. Derived counts ──

  const visibleCount = snapshot?.satellites.filter((s) => s.isVisible).length ?? 0;
  const servingSatId = snapshot?.ues[0]?.servingSatId ?? null;
  const servingBeamId = snapshot?.ues[0]?.servingBeamId ?? null;

  return {
    snapshot,
    isReady: engine != null,
    simTimeSec: simTimeRef.current,
    totalDurationSec: durationSec,
    satelliteCount,
    visibleCount,
    servingSatId,
    servingBeamId,
    handoverCount: handoverCountRef.current,
    profileId,
  };
}
