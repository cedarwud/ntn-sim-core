import type { SceneMode } from '@/app/hooks/useSceneQueryState';
import type {
  ModqnBundleReplayLoadState,
  ModqnBundleSourceKind,
} from '@/app/hooks/useModqnBundleReplay';
import type { KpiBundle } from '@/core/contracts/kpi-v1';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import type { SimHudProps } from '@/viz/overlays/SimHud';
import type { ModqnBundleReplayViewModel } from '@/viz/view-models/modqn-bundle-replay-view-model';

export type SceneModeControllerKind = SceneMode;

export type BundleReplayControls = {
  error: string | null;
  isLoading: boolean;
  loadExternalDirectory: (selectedFiles: FileList | File[]) => Promise<void>;
  loadState: ModqnBundleReplayLoadState;
  resetToSample: () => Promise<void>;
  sourceKind: ModqnBundleSourceKind;
  sourceLabel: string;
  stepBackward: () => void;
  stepForward: () => void;
};

export interface SceneModeControllerBridge {
  kind: SceneModeControllerKind;
  snapshot: SimulationSnapshot | null;
  validationSnapshot: SimulationSnapshot | null;
  stats: SimHudProps;
  exportKpi: (() => KpiBundle | null) | null;
  profileId: string;
  isBhProfile: boolean;
}

export interface BundleReplayControllerExtras {
  currentFrameIndex: number;
  viewModel: ModqnBundleReplayViewModel | null;
  controls: BundleReplayControls;
}

export interface SceneModeController {
  bridge: SceneModeControllerBridge;
  bundle?: BundleReplayControllerExtras;
}
