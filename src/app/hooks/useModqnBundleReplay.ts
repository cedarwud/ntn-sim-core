import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import {
  ModqnBundleReplayViewModel,
  advanceBundleReplayFrameIndex,
} from '@/viz/view-models/modqn-bundle-replay-view-model';
import { loadBundledModqnSampleBundle } from './modqn-bundle-sample';

const SNAPSHOT_INTERVAL_MS = 50;

export interface UseModqnBundleReplayOptions {
  speed?: number;
  paused?: boolean;
}

export interface UseModqnBundleReplayResult {
  snapshot: SimulationSnapshot | null;
  viewModel: ModqnBundleReplayViewModel | null;
  isReady: boolean;
  error: string | null;
  currentFrameIndex: number;
  currentSlotIndex: number | null;
  slotCount: number;
  satelliteCount: number;
  visibleCount: number;
  servingSatId: string | null;
  handoverCount: number;
  simTimeSec: number;
  totalDurationSec: number;
  sourceLabel: string;
  stepBackward: () => void;
  stepForward: () => void;
}

export function useModqnBundleReplay(
  options?: UseModqnBundleReplayOptions,
): UseModqnBundleReplayResult {
  const {
    speed = 1,
    paused = false,
  } = options ?? {};

  const [viewModel, setViewModel] = useState<ModqnBundleReplayViewModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const lastSnapshotTimeRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setViewModel(null);
    setError(null);
    setCurrentFrameIndex(0);
    setSnapshot(null);
    lastSnapshotTimeRef.current = 0;

    void loadBundledModqnSampleBundle()
      .then((bundle) => {
        if (cancelled) return;
        const next = new ModqnBundleReplayViewModel(bundle);
        setViewModel(next);
        setSnapshot(next.projectFrame(0));
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!viewModel) return;
    setSnapshot(viewModel.projectFrame(currentFrameIndex));
  }, [currentFrameIndex, viewModel]);

  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!viewModel) return;

    let lastTime = performance.now();
    let accumMs = 0;

    const id = setInterval(() => {
      const now = performance.now();
      const deltaMs = now - lastTime;
      lastTime = now;

      if (!paused) {
        accumMs += deltaMs * speed;
        const stepMs = viewModel.getStepDurationMs();
        if (accumMs >= stepMs) {
          const deltaFrames = Math.floor(accumMs / stepMs);
          accumMs -= deltaFrames * stepMs;
          setCurrentFrameIndex((current) => advanceBundleReplayFrameIndex(
            current,
            deltaFrames,
            viewModel.getFrameCount(),
          ));
        }
      }

      if (now - lastSnapshotTimeRef.current < SNAPSHOT_INTERVAL_MS) return;
      lastSnapshotTimeRef.current = now;
      invalidate();
    }, SNAPSHOT_INTERVAL_MS);

    return () => clearInterval(id);
  }, [invalidate, paused, speed, viewModel]);

  const stepBackward = useCallback(() => {
    if (!viewModel) return;
    setCurrentFrameIndex((current) => advanceBundleReplayFrameIndex(
      current,
      -1,
      viewModel.getFrameCount(),
    ));
  }, [viewModel]);

  const stepForward = useCallback(() => {
    if (!viewModel) return;
    setCurrentFrameIndex((current) => advanceBundleReplayFrameIndex(
      current,
      1,
      viewModel.getFrameCount(),
    ));
  }, [viewModel]);

  const activeFrame = useMemo(
    () => (viewModel ? viewModel.getFrame(currentFrameIndex) : null),
    [currentFrameIndex, viewModel],
  );

  const visibleCount = snapshot?.satellites.filter((satellite) => satellite.isVisible).length ?? 0;
  const servingSatId = snapshot?.ues[0]?.servingSatId ?? null;

  return {
    snapshot,
    viewModel,
    isReady: viewModel !== null && error === null,
    error,
    currentFrameIndex,
    currentSlotIndex: activeFrame?.slotIndex ?? null,
    slotCount: viewModel?.getFrameCount() ?? 0,
    satelliteCount: snapshot?.satellites.length ?? 0,
    visibleCount,
    servingSatId,
    handoverCount: viewModel?.getCumulativeHandoverCount(currentFrameIndex) ?? 0,
    simTimeSec: activeFrame?.timeSec ?? 0,
    totalDurationSec: viewModel?.getFrame(viewModel.getFrameCount() - 1).timeSec ?? 0,
    sourceLabel: viewModel?.sourceLabel ?? 'sample-bundle-v1',
    stepBackward,
    stepForward,
  };
}
