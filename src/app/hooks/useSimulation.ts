/**
 * useSimulation — R3F hook that drives the simulation loop.
 *
 * Loads a profile, builds a Walker constellation + trajectory cache on mount,
 * then creates a SimEngine and advances simulation time each frame via useFrame.
 *
 * Must be used inside an R3F <Canvas>.
 */

import { useThree } from '@react-three/fiber';
import { useState, useEffect, useRef, useCallback } from 'react';

import { DEFAULT_INTERACTIVE_PROFILE_ID } from '@/core/profiles/default-profile';
import { loadProfile, resolveProfile } from '@/core/profiles';
import type { HandoverType } from '@/core/contracts/exposure-v1';
import type { KpiBundle } from '@/core/contracts/kpi-v1';
import { buildInteractiveProfileRuntime } from '@/core/orbit/profile-runtime';
import { createSimEngine } from '@/core/engine';
import type { SimEngine } from '@/core/engine';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import {
  getTransientTruthHoldMs,
  publishWithTransientTruthHold,
} from './transient-truth-hold';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseSimulationOptions {
  profileId?: string;   // default: continuity-first DAPS baseline
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
  exportKpi: () => KpiBundle | null;
}

// ---------------------------------------------------------------------------
// Throttle interval (ms) — cap snapshot state updates to ~60 fps
// ---------------------------------------------------------------------------

const SNAPSHOT_INTERVAL_MS = 50; // 20fps simulation updates (was 33 / 30fps)

interface EngineRuntime {
  engine: SimEngine;
  profile: ReturnType<typeof loadProfile>;
  durationSec: number;
  satelliteCount: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSimulation(
  options?: UseSimulationOptions,
): UseSimulationResult {
  const {
    profileId = DEFAULT_INTERACTIVE_PROFILE_ID,
    speed = 1,
    paused = false,
    handoverTypeOverride = null,
  } = options ?? {};

  // ── 1. Build constellation + cache + engine (once per profileId + handoverTypeOverride) ──

  const [runtime, setRuntime] = useState<EngineRuntime | null>(null);

  useEffect(() => {
    let disposed = false;
    setRuntime(null);

    let prof = loadProfile(profileId);
    if (handoverTypeOverride) {
      prof = resolveProfile(prof, { handover: { ...prof.handover, type: handoverTypeOverride } });
    }

    void (async () => {
      try {
        const { elements, trajectoryCache } = await buildInteractiveProfileRuntime(prof);
        if (disposed) return;

        setRuntime({
          engine: createSimEngine({
            profile: prof,
            trajectoryCache,
          }),
          profile: prof,
          durationSec: prof.timeControl.durationSec,
          satelliteCount: elements.length,
        });
      } catch (error) {
        console.warn('[useSimulation] Failed to bootstrap profile runtime:', prof.id, error);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [profileId, handoverTypeOverride]);

  // ── 2. Mutable sim-time ref (avoids per-frame re-renders) ──

  const simTimeRef = useRef(0);
  const lastSnapshotTimeRef = useRef(0);
  const lastProcessedTickRef = useRef<number | null>(null);
  const reachedEndRef = useRef(false);

  // ── 3. Snapshot state (updated at throttled rate) ──

  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const handoverCountRef = useRef(0);
  const prevServingSatIdRef = useRef<string | null>(null);
  const lastKnownServingRef = useRef<string | null>(null);
  const stickySnapshotRef = useRef<SimulationSnapshot | null>(null);
  const stickySnapshotHoldUntilRef = useRef(0);

  // Reset sim time and counters when engine rebuilds (profile or strategy change)
  useEffect(() => {
    simTimeRef.current = 0;
    lastSnapshotTimeRef.current = 0;
    lastProcessedTickRef.current = null;
    reachedEndRef.current = false;
    handoverCountRef.current = 0;
    prevServingSatIdRef.current = null;
    lastKnownServingRef.current = null;
    stickySnapshotRef.current = null;
    stickySnapshotHoldUntilRef.current = 0;
    setSnapshot(null);
  }, [runtime]);

  // ── 4. Simulation loop (setInterval, decoupled from render) ──

  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (paused || !runtime) return;

    let lastTime = performance.now();

    const id = setInterval(() => {
      if (reachedEndRef.current) {
        clearInterval(id);
        return;
      }

      const { engine, profile, durationSec } = runtime;
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Advance sim time
      simTimeRef.current += delta * speed;
      if (simTimeRef.current >= durationSec) {
        simTimeRef.current = durationSec;
        reachedEndRef.current = true;
      }

      const timeSec = simTimeRef.current;
      const stepSec = profile.timeControl.stepSec;
      const tickNumber = Math.floor(timeSec / stepSec);
      const lastProcessedTick = lastProcessedTickRef.current;

      // Catch up missed ticks
      let publishedSnap: SimulationSnapshot | null = null;
      if (lastProcessedTick !== null && tickNumber > lastProcessedTick + 1) {
        for (let missedTick = lastProcessedTick + 1; missedTick < tickNumber; missedTick += 1) {
          const missedSnap = engine.tick(missedTick * stepSec, missedTick);
          // Keep the latest transient missed tick so browser publication can
          // progress through prepared/dual-active/post-switch instead of
          // pinning to the earliest transient in a collapsed catch-up window.
          if (getTransientTruthHoldMs(missedSnap) > 0) {
            publishedSnap = missedSnap;
          }
        }
      }

      const finalSnap = engine.tick(timeSec, tickNumber);
      const candidateSnap = getTransientTruthHoldMs(finalSnap) > 0
        ? finalSnap
        : (publishedSnap ?? finalSnap);
      const snap = publishWithTransientTruthHold({
        candidateSnapshot: candidateSnap,
        nowMs: now,
        stickySnapshotRef,
        stickySnapshotHoldUntilRef,
      });
      lastProcessedTickRef.current = tickNumber;

      const currentServing = finalSnap.ues[0]?.servingSatId ?? null;
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
      invalidate(); // trigger one GPU render per update

      if (reachedEndRef.current) {
        clearInterval(id);
      }
    }, SNAPSHOT_INTERVAL_MS);

    return () => clearInterval(id);
  }, [runtime, paused, speed, invalidate]);

  // ── 5. Derived counts ──

  const visibleCount = snapshot?.satellites.filter((s) => s.isVisible).length ?? 0;
  const servingSatId = snapshot?.ues[0]?.servingSatId ?? null;
  const servingBeamId = snapshot?.ues[0]?.servingBeamId ?? null;

  const exportKpi = useCallback(() => {
    if (!runtime) return null;
    const wallMs = performance.now();
    return runtime.engine.getKpiAccumulator().finalize(wallMs);
  }, [runtime]);

  return {
    snapshot,
    isReady: runtime != null,
    simTimeSec: simTimeRef.current,
    totalDurationSec: runtime?.durationSec ?? 0,
    satelliteCount: runtime?.satelliteCount ?? 0,
    visibleCount,
    servingSatId,
    servingBeamId,
    handoverCount: handoverCountRef.current,
    profileId,
    exportKpi,
  };
}
