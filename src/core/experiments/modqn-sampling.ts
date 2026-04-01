import type { ProfileConfig } from '@/core/profiles/types';
import type { SatellitePass } from '@/core/orbit/types';
import { resolveProfile, loadProfile } from '@/core/profiles/loader';
import { buildProfileTrajectoryCache, resolveProfileOrbitElements } from '@/core/orbit/profile-runtime';
import type {
  ModqnSamplingConfig,
  ModqnSamplingPlan,
  ModqnSamplingWindow,
  ModqnTrainingManifest,
} from './modqn-reproduction-types';

interface CandidateSamplingWindow extends ModqnSamplingWindow {
  readonly score: number;
}

function buildPassWindows(args: {
  pass: SatellitePass;
  role: ModqnSamplingWindow['role'];
  epochOffsetSec: number;
  searchEpochUtcMs: number;
  episodeDurationSec: number;
  windowsPerPass: ModqnSamplingConfig['windowsPerPass'];
}): CandidateSamplingWindow[] {
  const { pass, role, epochOffsetSec, searchEpochUtcMs, episodeDurationSec, windowsPerPass } = args;
  const passDurationSec = pass.endTimeSec - pass.startTimeSec + 1;
  if (passDurationSec < episodeDurationSec) {
    return [];
  }

  const lastValidStart = pass.endTimeSec - episodeDurationSec + 1;
  const entryStart = pass.startTimeSec;
  const midStart = Math.max(
    pass.startTimeSec,
    Math.min(
      lastValidStart,
      pass.startTimeSec + Math.floor((passDurationSec - episodeDurationSec) / 2),
    ),
  );
  const exitStart = lastValidStart;

  const startsByLabel = new Map([
    ['entry', entryStart],
    ['mid', midStart],
    ['exit', exitStart],
  ] as const);
  const seenStarts = new Set<number>();
  const windows: CandidateSamplingWindow[] = [];

  for (const label of windowsPerPass) {
    const startSec = startsByLabel.get(label);
    if (startSec === undefined || seenStarts.has(startSec)) {
      continue;
    }
    seenStarts.add(startSec);

    const endSec = startSec + episodeDurationSec - 1;
    const visibleSamples = pass.samples.filter((sample) => (
      sample.timeSec >= startSec
      && sample.timeSec <= endSec
      && sample.isVisible
    ));
    if (visibleSamples.length < episodeDurationSec) {
      continue;
    }

    windows.push({
      windowId: `offset-${epochOffsetSec}-${pass.satId}-${label}-${startSec}`,
      role,
      epochOffsetSec,
      searchEpochUtcMs,
      episodeEpochUtcMs: searchEpochUtcMs + startSec * 1000,
      windowStartSec: startSec,
      windowEndSec: endSec,
      satIds: [pass.satId],
      peakElevationDeg: pass.peakElevationDeg,
      selectionReason: `${label} window inside ${pass.satId} pass`,
      score: pass.peakElevationDeg - startSec * 1e-3,
    });
  }

  return windows;
}

function chooseHeldOutWindows(
  windows: readonly CandidateSamplingWindow[],
  heldOutWindowCount: number,
): CandidateSamplingWindow[] {
  const heldOut: CandidateSamplingWindow[] = [];
  const latestFirst = [...windows].sort((left, right) => (
    right.epochOffsetSec - left.epochOffsetSec
    || right.score - left.score
    || left.windowStartSec - right.windowStartSec
  ));

  for (const window of latestFirst) {
    if (heldOut.length >= heldOutWindowCount) {
      break;
    }
    if (heldOut.some((entry) => entry.windowId === window.windowId)) {
      continue;
    }
    heldOut.push({ ...window, role: 'held-out' });
  }

  return heldOut;
}

function chooseTrainWindows(args: {
  windows: readonly CandidateSamplingWindow[];
  heldOut: readonly CandidateSamplingWindow[];
  trainWindowCount: number;
}): CandidateSamplingWindow[] {
  const heldOutIds = new Set(args.heldOut.map((window) => window.windowId));
  const earliestFirst = [...args.windows].sort((left, right) => (
    left.epochOffsetSec - right.epochOffsetSec
    || right.score - left.score
    || left.windowStartSec - right.windowStartSec
  ));

  const train: CandidateSamplingWindow[] = [];
  for (const window of earliestFirst) {
    if (heldOutIds.has(window.windowId)) {
      continue;
    }
    train.push({ ...window, role: 'train' });
    if (train.length >= args.trainWindowCount) {
      break;
    }
  }

  return train;
}

export function buildModqnSamplingPlan(
  manifest: ModqnTrainingManifest,
  profile: ProfileConfig = loadProfile(manifest.profileId),
): ModqnSamplingPlan {
  const candidateWindows: CandidateSamplingWindow[] = [];

  for (const epochOffsetSec of manifest.sampling.searchEpochOffsetsSec) {
    const searchEpochUtcMs = profile.timeControl.epochUtcMs + epochOffsetSec * 1000;
    const searchProfile = resolveProfile(profile, {
      timeControl: {
        ...profile.timeControl,
        epochUtcMs: searchEpochUtcMs,
        durationSec: manifest.sampling.searchDurationSec,
      },
    });
    const elements = resolveProfileOrbitElements(searchProfile);
    const trajectoryCache = buildProfileTrajectoryCache(searchProfile, elements);

    const passes = [...trajectoryCache.passesBySatId.values()].flat().sort((left, right) => (
      left.satId.localeCompare(right.satId) || left.startTimeSec - right.startTimeSec
    ));
    for (const pass of passes) {
      candidateWindows.push(...buildPassWindows({
        pass,
        role: 'train',
        epochOffsetSec,
        searchEpochUtcMs,
        episodeDurationSec: manifest.sampling.episodeDurationSec,
        windowsPerPass: manifest.sampling.windowsPerPass,
      }));
    }
  }

  const heldOut = chooseHeldOutWindows(candidateWindows, manifest.sampling.heldOutWindowCount);
  const train = chooseTrainWindows({
    windows: candidateWindows,
    heldOut,
    trainWindowCount: manifest.sampling.trainWindowCount,
  });

  if (train.length === 0) {
    throw new Error('[buildModqnSamplingPlan] no training windows found for modqn-paper-baseline');
  }
  if (heldOut.length === 0) {
    throw new Error('[buildModqnSamplingPlan] no held-out windows found for modqn-paper-baseline');
  }

  const catalogSatIds = [...new Set([...train, ...heldOut].flatMap((window) => window.satIds))].sort();
  const limitationNotes: string[] = [];
  if (catalogSatIds.length < 2) {
    limitationNotes.push('Sampled windows expose fewer than two satellites; diversity remains constrained by the disclosed 2x2 proxy.');
  }

  const heldOutEpochOffsets = new Set(heldOut.map((window) => window.epochOffsetSec));
  if (train.some((window) => heldOutEpochOffsets.has(window.epochOffsetSec))) {
    limitationNotes.push('Held-out windows share at least one search epoch with training windows because the proxy envelope yields few valid pass windows.');
  }

  if (candidateWindows.length < manifest.sampling.trainWindowCount + manifest.sampling.heldOutWindowCount) {
    limitationNotes.push('The deterministic epoch sweep found fewer valid windows than the requested paper-scale episode diversity target; training cycles the available windows.');
  }

  return {
    config: manifest.sampling,
    trainWindows: train,
    heldOutWindows: heldOut,
    catalogSatIds,
    limitationNotes,
  };
}
