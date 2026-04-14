import { createSimEngine } from '@/core/engine';
import type { ProfileConfig } from '@/core/profiles/types';
import type { TrajectoryCache } from '@/core/orbit/types';
import type { SelectedWindow } from './window-selector';

const SLIDE_STEP_SEC = 10;
const SERVING_WEIGHT = 10_000;
const BEAM_TICK_WEIGHT = 100;

interface BeamTruthSample {
  timeSec: number;
  beamSatCount: number;
  hasServing: boolean;
}

/**
 * Select a replay window from actual beam/service truth instead of pure pass
 * geometry. This keeps bounded-steering replay windows inside the interval where
 * the engine is already publishing tracked beam candidates or serving truth.
 */
export function selectBeamTruthAwareWindow(
  profile: ProfileConfig,
  trajectoryCache: TrajectoryCache,
  windowDurationSec: number,
): SelectedWindow | null {
  const stepSec = profile.timeControl.stepSec;
  const totalTicks = Math.round(profile.timeControl.durationSec / stepSec) + 1;
  const engine = createSimEngine({ profile, trajectoryCache });
  const samples: BeamTruthSample[] = [];

  for (let tick = 0; tick < totalTicks; tick += 1) {
    const timeSec = tick * stepSec;
    const snapshot = engine.tick(timeSec, tick);
    samples.push({
      timeSec,
      beamSatCount: snapshot.satellites.filter((sat) => (sat.beams?.length ?? 0) > 0).length,
      hasServing: Boolean(snapshot.ues[0]?.servingSatId),
    });
  }

  if (!samples.some((sample) => sample.beamSatCount > 0 || sample.hasServing)) {
    return null;
  }

  const windowTicks = Math.max(1, Math.round(windowDurationSec / stepSec));
  const slideTicks = Math.max(1, Math.round(SLIDE_STEP_SEC / stepSec));
  let best:
    | {
      score: number;
      startIndex: number;
      beamTicks: number;
      servingTicks: number;
      maxBeamSatCount: number;
    }
    | null = null;

  for (let startIndex = 0; startIndex + windowTicks < samples.length; startIndex += slideTicks) {
    const endIndex = startIndex + windowTicks;
    let beamTicks = 0;
    let servingTicks = 0;
    let maxBeamSatCount = 0;

    for (let index = startIndex; index <= endIndex; index += 1) {
      const sample = samples[index];
      if (!sample) continue;
      if (sample.beamSatCount > 0) beamTicks += 1;
      if (sample.hasServing) servingTicks += 1;
      if (sample.beamSatCount > maxBeamSatCount) {
        maxBeamSatCount = sample.beamSatCount;
      }
    }

    const score =
      servingTicks * SERVING_WEIGHT +
      beamTicks * BEAM_TICK_WEIGHT +
      maxBeamSatCount;

    if (
      best === null ||
      score > best.score ||
      (score === best.score && startIndex < best.startIndex)
    ) {
      best = {
        score,
        startIndex,
        beamTicks,
        servingTicks,
        maxBeamSatCount,
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
    reason: `beam-truth-aware: serving=${best.servingTicks}, beamTicks=${best.beamTicks}, maxBeamSats=${best.maxBeamSatCount}`,
    visibleSatelliteCount: best.maxBeamSatCount,
    peakElevationDeg: 0,
  };
}
