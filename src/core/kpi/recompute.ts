import type { SimulationSnapshot } from '@/core/common/types';
import type { KpiBundle } from './types';
import { createKpiAccumulator } from './accumulator';

export interface RecomputeKpiFromSnapshotsConfig {
  snapshots: readonly SimulationSnapshot[];
  bandwidthMhz: number;
  sinrOutageThresholdDb?: number;
  pingPongWindowSec?: number;
  wallClockMs?: number;
}

export function recomputeKpiFromSnapshots(
  config: RecomputeKpiFromSnapshotsConfig,
): KpiBundle {
  const accumulator = createKpiAccumulator({
    sinrOutageThresholdDb: config.sinrOutageThresholdDb ?? -8,
    pingPongWindowSec: config.pingPongWindowSec ?? 5,
    bandwidthMhz: config.bandwidthMhz,
  });

  for (const snapshot of config.snapshots) {
    for (const ue of snapshot.ues) {
      accumulator.recordServiceState(
        ue.id,
        ue.servingSatId !== null,
        snapshot.timeSec,
      );

      if (ue.sinrDb !== null) {
        accumulator.recordSinr(ue.id, ue.sinrDb, snapshot.timeSec);
      }
    }

    for (const event of snapshot.recentHoEvents ?? []) {
      if (event.type !== 'ho-complete' && event.type !== 'ho-fail') {
        continue;
      }

      accumulator.recordHandover({
        timeSec: event.timeSec,
        type: event.type === 'ho-complete' ? 'complete' : 'fail',
        sourceId: event.sourceSatId ?? '',
        targetId: event.targetSatId ?? '',
        sourceSinrDb: event.sinrDb ?? 0,
        interruptionMs:
          event.type === 'ho-complete' ? (event.interruptionMs ?? 0) : 0,
      });
    }
  }

  return accumulator.finalize(config.wallClockMs ?? 0);
}
