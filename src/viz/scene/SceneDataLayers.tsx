import type { HandoverType } from '@/core/contracts/exposure-v1';
import type { KpiBundle } from '@/core/contracts/kpi-v1';
import type { ModqnBundleReplayViewModel } from '@/viz/view-models/modqn-bundle-replay-view-model';

import { useBundleReplayController } from './modes/BundleReplayController';
import { useNativeLiveController } from './modes/NativeLiveController';
import { useNativeReplayController } from './modes/NativeReplayController';
import type { BundleReplayControls } from './modes/types';
import type { SceneConsumerFacade } from './scene-consumer-facade';
import { TruthSourceLayer } from './TruthSourceLayer';

export interface DataLayerProps {
  onFacadeUpdate: (facade: SceneConsumerFacade | null) => void;
  onExportKpiReady: (fn: (() => KpiBundle | null) | null) => void;
  speed: number;
  paused: boolean;
  showBeams: boolean;
  showLabels: boolean;
  profileId: string;
  handoverTypeOverride?: HandoverType | null;
}

export function LiveLayer({
  onFacadeUpdate,
  onExportKpiReady,
  speed,
  paused,
  showBeams,
  showLabels,
  profileId,
  handoverTypeOverride,
}: DataLayerProps) {
  const controller = useNativeLiveController({ profileId, speed, paused, handoverTypeOverride });

  return (
    <TruthSourceLayer
      controller={controller}
      onFacadeUpdate={onFacadeUpdate}
      onExportKpiReady={onExportKpiReady}
      showBeams={showBeams}
      showLabels={showLabels}
    />
  );
}

export function ReplayLayer({
  onFacadeUpdate,
  onExportKpiReady,
  speed,
  paused,
  showBeams,
  showLabels,
  profileId,
  replaySeekSec,
}: DataLayerProps & { replaySeekSec: number | null }) {
  const controller = useNativeReplayController({ profileId, speed, paused, replaySeekSec });

  return (
    <TruthSourceLayer
      controller={controller}
      onFacadeUpdate={onFacadeUpdate}
      onExportKpiReady={onExportKpiReady}
      showBeams={showBeams}
      showLabels={showLabels}
    />
  );
}

export function BundleReplayLayer({
  onFacadeUpdate,
  onExportKpiReady,
  onViewModelUpdate,
  onControlsUpdate,
  speed,
  paused,
  showBeams,
  showLabels,
}: {
  onFacadeUpdate: (facade: SceneConsumerFacade | null) => void;
  onExportKpiReady: (fn: (() => KpiBundle | null) | null) => void;
  onViewModelUpdate: (viewModel: ModqnBundleReplayViewModel | null) => void;
  onControlsUpdate: (controls: BundleReplayControls | null) => void;
  speed: number;
  paused: boolean;
  showBeams: boolean;
  showLabels: boolean;
}) {
  const controller = useBundleReplayController({ speed, paused });

  return (
    <TruthSourceLayer
      controller={controller}
      onFacadeUpdate={onFacadeUpdate}
      onExportKpiReady={onExportKpiReady}
      onViewModelUpdate={onViewModelUpdate}
      onControlsUpdate={onControlsUpdate}
      showBeams={showBeams}
      showLabels={showLabels}
    />
  );
}
