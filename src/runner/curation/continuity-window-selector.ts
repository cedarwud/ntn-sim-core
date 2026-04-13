import { createSimEngine } from '@/core/engine';
import type { ProfileConfig } from '@/core/profiles/types';
import type { TrajectoryCache } from '@/core/orbit/types';
import type { SelectedWindow } from './window-selector';

const SLIDE_STEP_SEC = 10;
const DUAL_ACTIVE_WEIGHT = 10_000;
const PREPARED_WEIGHT = 100;
const SERVING_CHANGE_WEIGHT = 10;

interface ContinuitySample {
  timeSec: number;
  continuityState: string | null;
  servingSatId: string | null;
}

/**
 * Select a replay window from actual continuity truth instead of pass geometry.
 * This keeps DAPS / MC-HO replay windows aligned with prepared / dual-active
 * states rather than assuming pass transitions imply visible handover truth.
 */
export function selectContinuityAwareWindow(
  profile: ProfileConfig,
  trajectoryCache: TrajectoryCache,
  windowDurationSec: number,
): SelectedWindow | null {
  const stepSec = profile.timeControl.stepSec;
  const totalTicks = Math.round(profile.timeControl.durationSec / stepSec) + 1;
  const engine = createSimEngine({ profile, trajectoryCache });
  const samples: ContinuitySample[] = [];

  for (let tick = 0; tick < totalTicks; tick += 1) {
    const timeSec = tick * stepSec;
    const snapshot = engine.tick(timeSec, tick);
    const ue = snapshot.ues[0];
    samples.push({
      timeSec,
      continuityState: ue?.continuityState ?? null,
      servingSatId: ue?.servingSatId ?? null,
    });
  }

  if (!samples.some((sample) => sample.continuityState === 'prepared' || sample.continuityState === 'dual-active')) {
    return null;
  }

  const windowTicks = Math.max(1, Math.round(windowDurationSec / stepSec));
  const slideTicks = Math.max(1, Math.round(SLIDE_STEP_SEC / stepSec));
  let best:
    | {
      score: number;
      startIndex: number;
      dualActiveTicks: number;
      preparedTicks: number;
      servingChanges: number;
    }
    | null = null;

  for (let startIndex = 0; startIndex + windowTicks < samples.length; startIndex += slideTicks) {
    const endIndex = startIndex + windowTicks;
    let dualActiveTicks = 0;
    let preparedTicks = 0;
    let servingChanges = 0;
    let lastServingSatId = samples[startIndex]?.servingSatId ?? null;

    for (let index = startIndex; index <= endIndex; index += 1) {
      const sample = samples[index];
      if (!sample) continue;
      if (sample.continuityState === 'dual-active') dualActiveTicks += 1;
      if (sample.continuityState === 'prepared') preparedTicks += 1;
      if (
        lastServingSatId !== null
        && sample.servingSatId !== null
        && sample.servingSatId !== lastServingSatId
      ) {
        servingChanges += 1;
      }
      if (sample.servingSatId !== null) lastServingSatId = sample.servingSatId;
    }

    const score =
      dualActiveTicks * DUAL_ACTIVE_WEIGHT +
      preparedTicks * PREPARED_WEIGHT +
      servingChanges * SERVING_CHANGE_WEIGHT;

    if (
      best === null ||
      score > best.score ||
      (score === best.score && startIndex < best.startIndex)
    ) {
      best = {
        score,
        startIndex,
        dualActiveTicks,
        preparedTicks,
        servingChanges,
      };
    }
  }

  if (best === null || best.score <= 0) return null;

  const startTimeSec = samples[best.startIndex]?.timeSec ?? 0;
  const endTimeSec = samples[Math.min(samples.length - 1, best.startIndex + windowTicks)]?.timeSec ?? startTimeSec;

  return {
    startTimeSec,
    endTimeSec,
    score: best.score,
    reason: `continuity-aware: dual=${best.dualActiveTicks}, prepared=${best.preparedTicks}, servingChanges=${best.servingChanges}`,
    visibleSatelliteCount: 0,
    peakElevationDeg: 0,
  };
}
