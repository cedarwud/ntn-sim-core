import { useMemo } from 'react';

import { useSimulation } from '@/app/hooks/useSimulation';
import type { HandoverType } from '@/core/contracts/exposure-v1';

import type { SceneModeController } from './types';

interface NativeLiveControllerOptions {
  profileId: string;
  speed: number;
  paused: boolean;
  handoverTypeOverride?: HandoverType | null;
}

export function useNativeLiveController({
  profileId,
  speed,
  paused,
  handoverTypeOverride,
}: NativeLiveControllerOptions): SceneModeController {
  const result = useSimulation({ profileId, speed, paused, handoverTypeOverride });

  return useMemo(() => ({
    bridge: {
      kind: 'native-live',
      snapshot: result.snapshot,
      validationSnapshot: result.snapshot,
      stats: {
        simTimeSec: result.simTimeSec,
        totalDurationSec: result.totalDurationSec,
        satelliteCount: result.satelliteCount,
        visibleCount: result.visibleCount,
        servingSatId: result.servingSatId,
        handoverCount: result.handoverCount,
        profileId: result.profileId,
        isReady: result.isReady,
        replaySelection: null,
        replayWindowStartSec: null,
        replayWindowEndSec: null,
      },
      exportKpi: result.exportKpi,
      profileId: result.profileId,
      isBhProfile: profileId.startsWith('bh-'),
    },
  }), [
    profileId,
    result.exportKpi,
    result.handoverCount,
    result.isReady,
    result.profileId,
    result.servingSatId,
    result.simTimeSec,
    result.snapshot,
    result.satelliteCount,
    result.totalDurationSec,
    result.visibleCount,
  ]);
}
