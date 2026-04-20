import { useMemo } from 'react';

import { useReplay } from '@/app/hooks/useReplay';

import type { SceneModeController } from './types';

interface NativeReplayControllerOptions {
  profileId: string;
  speed: number;
  paused: boolean;
  replaySeekSec: number | null;
}

export function useNativeReplayController({
  profileId,
  speed,
  paused,
  replaySeekSec,
}: NativeReplayControllerOptions): SceneModeController {
  const result = useReplay({ profileId, speed, paused, initialSeekSec: replaySeekSec });

  return useMemo(() => ({
    bridge: {
      kind: 'native-replay',
      snapshot: result.snapshot,
      validationSnapshot: result.snapshot,
      stats: {
        simTimeSec: result.replayState?.currentTimeSec ?? 0,
        totalDurationSec: result.replayState?.windowEndSec ?? 0,
        satelliteCount: result.satelliteCount,
        visibleCount: result.visibleCount,
        servingSatId: result.servingSatId,
        handoverCount: 0,
        profileId: result.profileId,
        isReady: result.isReady,
        replaySelection: result.selectionReason,
        replayWindowStartSec: result.replayManifest?.windowStartSec ?? null,
        replayWindowEndSec: result.replayManifest?.windowEndSec ?? null,
      },
      exportKpi: null,
      profileId: result.profileId,
      isBhProfile: profileId.startsWith('bh-'),
    },
  }), [
    profileId,
    result.isReady,
    result.profileId,
    result.replayManifest,
    result.replayState,
    result.selectionReason,
    result.servingSatId,
    result.snapshot,
    result.satelliteCount,
    result.visibleCount,
  ]);
}
