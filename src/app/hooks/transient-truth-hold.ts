import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';

const PREPARED_VISUAL_HOLD_MS = 320;
const DUAL_ACTIVE_VISUAL_HOLD_MS = 420;
const POST_HO_VISUAL_HOLD_MS = 280;

export function getTransientTruthHoldMs(
  snapshot: SimulationSnapshot | null,
): number {
  const continuityState = snapshot?.ues[0]?.continuityState ?? null;
  const phase = snapshot?.daps?.phase ?? null;
  const transitionKind = snapshot?.ues[0]?.servingTransition?.kind ?? null;

  if (continuityState === 'dual-active' || phase === 'dual-active') {
    return DUAL_ACTIVE_VISUAL_HOLD_MS;
  }
  if (continuityState === 'prepared' || phase === 'prepared') {
    return PREPARED_VISUAL_HOLD_MS;
  }
  if (
    continuityState === 'post-ho'
    || transitionKind === 'inter-satellite-handover'
  ) {
    return POST_HO_VISUAL_HOLD_MS;
  }
  return 0;
}

export function publishWithTransientTruthHold(args: {
  candidateSnapshot: SimulationSnapshot | null;
  nowMs: number;
  stickySnapshotRef: { current: SimulationSnapshot | null };
  stickySnapshotHoldUntilRef: { current: number };
}): SimulationSnapshot | null {
  const {
    candidateSnapshot,
    nowMs,
    stickySnapshotRef,
    stickySnapshotHoldUntilRef,
  } = args;
  const transientHoldMs = getTransientTruthHoldMs(candidateSnapshot);

  if (transientHoldMs > 0) {
    stickySnapshotRef.current = candidateSnapshot;
    stickySnapshotHoldUntilRef.current = nowMs + transientHoldMs;
  } else if (stickySnapshotHoldUntilRef.current <= nowMs) {
    stickySnapshotRef.current = null;
  }

  if (
    stickySnapshotRef.current
    && stickySnapshotHoldUntilRef.current > nowMs
  ) {
    return stickySnapshotRef.current;
  }

  return candidateSnapshot;
}
