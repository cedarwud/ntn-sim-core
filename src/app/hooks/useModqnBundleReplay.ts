import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

import { assertBundleReplayPresentationReady } from '@/adapters/modqn-bundle';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import {
  ModqnBundleReplayViewModel,
  advanceBundleReplayFrameIndex,
} from '@/viz/view-models/modqn-bundle-replay-view-model';
import { loadExternalModqnReplayBundleFromDirectory } from './modqn-bundle-browser-source';
import {
  loadBundledModqnSampleBundle,
  MODQN_SAMPLE_BUNDLE_SOURCE_LABEL,
} from './modqn-bundle-sample';
import { publishWithTransientTruthHold } from './transient-truth-hold';

const SNAPSHOT_INTERVAL_MS = 50;
const NOOP_DISPOSE = () => {};

export interface UseModqnBundleReplayOptions {
  speed?: number;
  paused?: boolean;
}

export type ModqnBundleSourceKind = 'sample' | 'external-directory';
export type ModqnBundleReplayLoadState =
  | 'boot-loading-sample'
  | 'boot-load-failed'
  | 'ready-sample'
  | 'loading-external-directory'
  | 'ready-external-directory'
  | 'resetting-to-sample';

export interface UseModqnBundleReplayResult {
  snapshot: SimulationSnapshot | null;
  viewModel: ModqnBundleReplayViewModel | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  loadState: ModqnBundleReplayLoadState;
  sourceKind: ModqnBundleSourceKind;
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
  loadExternalDirectory: (selectedFiles: FileList | File[]) => Promise<void>;
  resetToSample: () => Promise<void>;
  stepBackward: () => void;
  stepForward: () => void;
}

interface ActiveBundleSession {
  dispose: () => void;
  sourceKind: ModqnBundleSourceKind;
  sourceLabel: string;
  viewModel: ModqnBundleReplayViewModel;
}

function getReadyLoadState(sourceKind: ModqnBundleSourceKind): ModqnBundleReplayLoadState {
  return sourceKind === 'external-directory'
    ? 'ready-external-directory'
    : 'ready-sample';
}

function formatLoadError(prefix: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `${prefix}: ${detail}`;
}

export function useModqnBundleReplay(
  options?: UseModqnBundleReplayOptions,
): UseModqnBundleReplayResult {
  const {
    speed = 1,
    paused = false,
  } = options ?? {};

  const [activeSession, setActiveSession] = useState<ActiveBundleSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<ModqnBundleReplayLoadState>('boot-loading-sample');
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const lastSnapshotTimeRef = useRef(0);
  const stickySnapshotRef = useRef<SimulationSnapshot | null>(null);
  const stickySnapshotHoldUntilRef = useRef(0);
  const activeSessionRef = useRef<ActiveBundleSession | null>(null);
  const isMountedRef = useRef(true);
  const transitionTokenRef = useRef(0);

  const viewModel = activeSession?.viewModel ?? null;

  const activateSession = useCallback((nextSession: ActiveBundleSession) => {
    activeSessionRef.current = nextSession;
    setActiveSession(nextSession);
    setCurrentFrameIndex(0);
    setSnapshot(nextSession.viewModel.projectFrame(0));
    lastSnapshotTimeRef.current = 0;
    stickySnapshotRef.current = null;
    stickySnapshotHoldUntilRef.current = 0;
  }, []);

  useEffect(() => () => {
    activeSession?.dispose();
  }, [activeSession]);

  useEffect(() => () => {
    isMountedRef.current = false;
    transitionTokenRef.current += 1;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const token = transitionTokenRef.current + 1;
    transitionTokenRef.current = token;
    activeSessionRef.current = null;
    setActiveSession(null);
    setError(null);
    setLoadState('boot-loading-sample');
    setCurrentFrameIndex(0);
    setSnapshot(null);
    lastSnapshotTimeRef.current = 0;
    stickySnapshotRef.current = null;
    stickySnapshotHoldUntilRef.current = 0;

    void loadBundledModqnSampleBundle()
      .then((bundle) => {
        if (cancelled || !isMountedRef.current || transitionTokenRef.current !== token) return;
        const view = new ModqnBundleReplayViewModel(
          assertBundleReplayPresentationReady(bundle),
          MODQN_SAMPLE_BUNDLE_SOURCE_LABEL,
        );
        activateSession({
          dispose: NOOP_DISPOSE,
          sourceKind: 'sample',
          sourceLabel: MODQN_SAMPLE_BUNDLE_SOURCE_LABEL,
          viewModel: view,
        });
        setLoadState('ready-sample');
      })
      .catch((loadError) => {
        if (cancelled || !isMountedRef.current || transitionTokenRef.current !== token) return;
        setLoadState('boot-load-failed');
        setError(formatLoadError('Sample bundle load failed', loadError));
      });

    return () => {
      cancelled = true;
    };
  }, [activateSession]);

  const loadExternalDirectory = useCallback(async (selectedFiles: FileList | File[]) => {
    const token = transitionTokenRef.current + 1;
    transitionTokenRef.current = token;
    setLoadState('loading-external-directory');
    setError(null);

    let nextExternalSource:
      | Awaited<ReturnType<typeof loadExternalModqnReplayBundleFromDirectory>>
      | null = null;

    try {
      nextExternalSource = await loadExternalModqnReplayBundleFromDirectory(selectedFiles);
      if (!isMountedRef.current || transitionTokenRef.current !== token) {
        nextExternalSource.dispose();
        return;
      }

      const view = new ModqnBundleReplayViewModel(
        assertBundleReplayPresentationReady(nextExternalSource.bundle),
        nextExternalSource.sourceLabel,
      );
      activateSession({
        dispose: nextExternalSource.dispose,
        sourceKind: nextExternalSource.sourceKind,
        sourceLabel: nextExternalSource.sourceLabel,
        viewModel: view,
      });
      setLoadState('ready-external-directory');
    } catch (loadError) {
      nextExternalSource?.dispose();
      if (!isMountedRef.current || transitionTokenRef.current !== token) return;
      const activeSourceKind = activeSessionRef.current?.sourceKind ?? null;
      setLoadState(activeSourceKind ? getReadyLoadState(activeSourceKind) : 'boot-load-failed');
      setError(formatLoadError('External bundle load failed', loadError));
    }
  }, [activateSession]);

  const resetToSample = useCallback(async () => {
    const token = transitionTokenRef.current + 1;
    transitionTokenRef.current = token;
    setLoadState('resetting-to-sample');
    setError(null);

    try {
      const bundle = await loadBundledModqnSampleBundle();
      if (!isMountedRef.current || transitionTokenRef.current !== token) return;
      const view = new ModqnBundleReplayViewModel(
        assertBundleReplayPresentationReady(bundle),
        MODQN_SAMPLE_BUNDLE_SOURCE_LABEL,
      );
      activateSession({
        dispose: NOOP_DISPOSE,
        sourceKind: 'sample',
        sourceLabel: MODQN_SAMPLE_BUNDLE_SOURCE_LABEL,
        viewModel: view,
      });
      setLoadState('ready-sample');
    } catch (loadError) {
      if (!isMountedRef.current || transitionTokenRef.current !== token) return;
      const activeSourceKind = activeSessionRef.current?.sourceKind ?? null;
      setLoadState(activeSourceKind ? getReadyLoadState(activeSourceKind) : 'boot-load-failed');
      setError(formatLoadError('Reset to sample failed', loadError));
    }
  }, [activateSession]);

  useEffect(() => {
    if (!viewModel) return;
    setSnapshot(
      publishWithTransientTruthHold({
        candidateSnapshot: viewModel.projectFrame(currentFrameIndex),
        nowMs: performance.now(),
        stickySnapshotRef,
        stickySnapshotHoldUntilRef,
      }),
    );
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
    isReady: viewModel !== null,
    isLoading: loadState === 'boot-loading-sample'
      || loadState === 'loading-external-directory'
      || loadState === 'resetting-to-sample',
    error,
    loadState,
    sourceKind: activeSession?.sourceKind ?? 'sample',
    currentFrameIndex,
    currentSlotIndex: activeFrame?.slotIndex ?? null,
    slotCount: viewModel?.getFrameCount() ?? 0,
    satelliteCount: snapshot?.satellites.length ?? 0,
    visibleCount,
    servingSatId,
    handoverCount: viewModel?.getCumulativeHandoverCount(currentFrameIndex) ?? 0,
    simTimeSec: activeFrame?.timeSec ?? 0,
    totalDurationSec: viewModel?.getFrame(viewModel.getFrameCount() - 1).timeSec ?? 0,
    sourceLabel: activeSession?.sourceLabel ?? MODQN_SAMPLE_BUNDLE_SOURCE_LABEL,
    loadExternalDirectory,
    resetToSample,
    stepBackward,
    stepForward,
  };
}
