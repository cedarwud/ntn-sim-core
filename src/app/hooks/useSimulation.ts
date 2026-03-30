/**
 * useSimulation — R3F hook that drives the simulation loop.
 *
 * Loads a profile, builds a Walker constellation + trajectory cache on mount,
 * then creates a SimEngine and advances simulation time each frame via useFrame.
 *
 * Must be used inside an R3F <Canvas>.
 */

import { useFrame } from '@react-three/fiber';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

import { loadProfile, resolveProfile } from '@/core/profiles';
import type { HandoverType } from '@/core/profiles/types';
import { buildInteractiveTrajectoryCache, buildSyntheticOrbitElements } from '@/core/orbit';
import { loadOmmRecords, ommToSatrecs, sampleRecords } from '@/core/orbit/tle-loader';
import { satrecsToOrbitElements } from '@/core/orbit/sgp4-adapter';
import { createSimEngine } from '@/core/engine';
import type { SimEngine } from '@/core/engine';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseSimulationOptions {
  profileId?: string;   // default: 'realistic-first-screen'
  speed?: number;       // playback speed multiplier, default 1
  paused?: boolean;
  /** Override handover algorithm at runtime without reloading the profile. */
  handoverTypeOverride?: HandoverType | null;
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
  /** Finalize and return current KPI bundle. Returns null if engine not ready. */
  exportKpi: () => import('@/core/kpi/types').KpiBundle | null;
}

// ---------------------------------------------------------------------------
// Throttle interval (ms) — cap snapshot state updates to ~60 fps
// ---------------------------------------------------------------------------

const SNAPSHOT_INTERVAL_MS = 16;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSimulation(
  options?: UseSimulationOptions,
): UseSimulationResult {
  const {
    profileId = 'realistic-first-screen',
    speed = 1,
    paused = false,
    handoverTypeOverride = null,
  } = options ?? {};

  // ── 1. Build constellation + cache + engine (once per profileId + handoverTypeOverride) ──

  const { engine, profile, durationSec, satelliteCount } = useMemo(() => {
    let prof = loadProfile(profileId);
    if (handoverTypeOverride) {
      prof = resolveProfile(prof, { handover: { ...prof.handover, type: handoverTypeOverride } });
    }

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
      elements = buildSyntheticOrbitElements(prof);
    }

    const cache = buildInteractiveTrajectoryCache(prof, elements);

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
  }, [profileId, handoverTypeOverride]);

  // ── 2. Mutable sim-time ref (avoids per-frame re-renders) ──

  const simTimeRef = useRef(0);
  const lastSnapshotTimeRef = useRef(0);

  // ── 3. Snapshot state (updated at throttled rate) ──

  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const handoverCountRef = useRef(0);
  const prevServingSatIdRef = useRef<string | null>(null);
  const lastKnownServingRef = useRef<string | null>(null);

  // Reset sim time and counters when engine rebuilds (profile or strategy change)
  useEffect(() => {
    simTimeRef.current = 0;
    lastSnapshotTimeRef.current = 0;
    handoverCountRef.current = 0;
    prevServingSatIdRef.current = null;
    lastKnownServingRef.current = null;
    setSnapshot(null);
  }, [engine]);

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
      lastKnownServingRef.current = null;
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

    // Track handover count: any satellite change, including null-gap transitions.
    // lastKnownServingRef tracks the last non-null satellite to catch A→null→B paths.
    const currentServing = snap.ues[0]?.servingSatId ?? null;
    if (currentServing !== null) {
      if (
        lastKnownServingRef.current !== null &&
        currentServing !== lastKnownServingRef.current
      ) {
        handoverCountRef.current += 1;
      }
      lastKnownServingRef.current = currentServing;
    }
    prevServingSatIdRef.current = currentServing;

    setSnapshot(snap);
  });

  // ── 5. Derived counts ──

  const visibleCount = snapshot?.satellites.filter((s) => s.isVisible).length ?? 0;
  const servingSatId = snapshot?.ues[0]?.servingSatId ?? null;
  const servingBeamId = snapshot?.ues[0]?.servingBeamId ?? null;

  const exportKpi = useCallback(() => {
    if (!engine) return null;
    const wallMs = performance.now();
    return engine.getKpiAccumulator().finalize(wallMs);
  }, [engine]);

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
    exportKpi,
  };
}
