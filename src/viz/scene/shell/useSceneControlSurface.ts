import { useMemo } from 'react';

import type { SceneMode } from '@/app/hooks/useSceneQueryState';
import type { HandoverType } from '@/core/contracts/exposure-v1';
import type {
  ControlPanelProps,
  ControlPanelSurfaceModel,
} from '@/viz/overlays/ControlPanel';

import type { BundleControlPanelProps } from '../bundle/useBundleReplayShellState';
import type { ScenePanelState } from './useScenePanelState';

interface UseSceneControlSurfaceOptions {
  speed: number;
  onSpeedChange: (speed: number) => void;
  effectiveSpeed: number;
  paused: boolean;
  onPauseToggle: () => void;
  hoSlowEnabled: boolean;
  hoSlowActive: boolean;
  onHoSlowToggle: () => void;
  showBeams: boolean;
  onShowBeamsToggle: () => void;
  showLabels: boolean;
  onShowLabelsToggle: () => void;
  sceneMode: SceneMode;
  onSceneModeChange: (mode: SceneMode) => void;
  panelState: ScenePanelState;
  onExportKpi: () => void;
  hoTypeOverride: HandoverType | null;
  onHoTypeOverrideChange: (type: HandoverType | null) => void;
  profileId: string;
  onProfileChange: (profileId: string) => void;
  bundleControlPanelProps: BundleControlPanelProps;
}

function buildBundleSourceDisclosure({
  bundleLoadState = 'ready-sample',
  bundleSourceKind = 'sample',
  bundleSourceLabel,
}: BundleControlPanelProps) {
  if (bundleLoadState === 'loading-external-directory') {
    return 'Loading external-directory bundle. Keeping the current valid replay bundle active.';
  }
  if (bundleLoadState === 'resetting-to-sample') {
    return 'Resetting to sample baseline.';
  }
  if (bundleLoadState === 'boot-load-failed') {
    return 'Sample baseline boot failed before bundle truth became ready.';
  }
  if (bundleSourceKind === 'external-directory') {
    return `Current bundle source: external-directory (${bundleSourceLabel ?? 'local selection'}).`;
  }
  return 'Current bundle source: sample baseline. Default boot path and reset target.';
}

function buildBundleLoadErrorMessage({
  bundleLoadState = 'ready-sample',
  bundleLoadError,
}: BundleControlPanelProps) {
  if (!bundleLoadError) return null;
  const prefix = bundleLoadState === 'boot-load-failed'
    ? 'Bundle source is not ready.'
    : 'The current valid replay bundle stayed active.';
  return `${prefix} ${bundleLoadError}`;
}

function buildTruthNote(sceneMode: SceneMode) {
  if (sceneMode === 'modqn-bundle') {
    return 'MODQN producer export bundle replay. Leave bundle mode for native panels.';
  }
  if (sceneMode === 'native-replay') {
    return 'Native simulator truth recorded into replay window';
  }
  return 'Native simulator truth from live engine';
}

export function useSceneControlSurface({
  speed,
  onSpeedChange,
  effectiveSpeed,
  paused,
  onPauseToggle,
  hoSlowEnabled,
  hoSlowActive,
  onHoSlowToggle,
  showBeams,
  onShowBeamsToggle,
  showLabels,
  onShowLabelsToggle,
  sceneMode,
  onSceneModeChange,
  panelState,
  onExportKpi,
  hoTypeOverride,
  onHoTypeOverrideChange,
  profileId,
  onProfileChange,
  bundleControlPanelProps,
}: UseSceneControlSurfaceOptions): ControlPanelProps {
  return useMemo(() => {
    const isBundleMode = sceneMode === 'modqn-bundle';
    const bundleSourceLoad = isBundleMode
      && Boolean(bundleControlPanelProps.onLoadExternalBundleDirectory)
      && !bundleControlPanelProps.bundleIsLoading;
    const bundleSourceReset = isBundleMode
      && Boolean(bundleControlPanelProps.onResetBundleSource)
      && !bundleControlPanelProps.bundleIsLoading
      && Boolean(
        bundleControlPanelProps.bundleSourceKind === 'external-directory'
        || bundleControlPanelProps.bundleLoadError,
      );
    const bundleStepBackward = isBundleMode && Boolean(bundleControlPanelProps.onBundleStepBackward);
    const bundleStepForward = isBundleMode && Boolean(bundleControlPanelProps.onBundleStepForward);
    const bundleStepper = isBundleMode && Boolean(
      bundleControlPanelProps.bundleSourceLabel
      || bundleControlPanelProps.onBundleStepBackward
      || bundleControlPanelProps.onBundleStepForward,
    );
    const bundleLoadError = isBundleMode && Boolean(bundleControlPanelProps.bundleLoadError);
    const bundleMetadataToggle = isBundleMode;
    const parametersToggle = !isBundleMode;
    const exportKpiButton = !isBundleMode;
    const baselineResultsButton = !isBundleMode;

    const surface: ControlPanelSurfaceModel = {
      mode: sceneMode,
      variant: isBundleMode ? 'bundle' : 'native',
      capabilities: {
        profileSelection: !isBundleMode,
        hoTypeOverride: !isBundleMode,
        hoSlow: !isBundleMode,
        labels: !isBundleMode,
        sinrChart: !isBundleMode,
        hoLog: !isBundleMode,
        sinrCdf: !isBundleMode,
        elevScatter: !isBundleMode,
        parametersPanel: !isBundleMode,
        bundleMetadataPanel: isBundleMode,
        kpiExport: !isBundleMode,
        baselineResults: !isBundleMode,
        bundleSourceLoad,
        bundleSourceReset,
        bundleStepBackward,
        bundleStepForward,
      },
      sections: {
        modeSelector: true,
        profileSelector: !isBundleMode,
        hoTypeSelector: !isBundleMode,
        hoSlowToggle: !isBundleMode,
        labelsToggle: !isBundleMode,
        sinrChartToggle: !isBundleMode,
        hoLogToggle: !isBundleMode,
        sinrCdfToggle: !isBundleMode,
        elevScatterToggle: !isBundleMode,
        bundleStepper,
        bundleSourceActions: isBundleMode,
        bundleSourceState: isBundleMode,
        bundleLoadError,
        bundleMetadataToggle,
        parametersToggle,
        exportKpiButton,
        baselineResultsButton,
        actionButtons: bundleMetadataToggle
          || parametersToggle
          || exportKpiButton
          || baselineResultsButton,
      },
      truthNote: buildTruthNote(sceneMode),
      bundleSourceDisclosure: isBundleMode
        ? buildBundleSourceDisclosure(bundleControlPanelProps)
        : null,
      bundleLoadErrorMessage: isBundleMode
        ? buildBundleLoadErrorMessage(bundleControlPanelProps)
        : null,
    };

    return {
      surface,
      speed,
      onSpeedChange,
      effectiveSpeed,
      paused,
      onPauseToggle,
      hoSlowEnabled,
      hoSlowActive,
      onHoSlowToggle: surface.capabilities.hoSlow ? onHoSlowToggle : undefined,
      showBeams,
      onShowBeamsToggle,
      showLabels,
      onShowLabelsToggle: surface.capabilities.labels ? onShowLabelsToggle : undefined,
      sceneMode,
      onSceneModeChange,
      showSinrChart: panelState.showSinrChart,
      onShowSinrChartToggle: surface.capabilities.sinrChart
        ? panelState.toggleShowSinrChart
        : undefined,
      showHoLog: panelState.showHoLog,
      onShowHoLogToggle: surface.capabilities.hoLog
        ? panelState.toggleShowHoLog
        : undefined,
      showSinrCdf: panelState.showSinrCdf,
      onShowSinrCdfToggle: surface.capabilities.sinrCdf
        ? panelState.toggleShowSinrCdf
        : undefined,
      showElevScatter: panelState.showElevScatter,
      onShowElevScatterToggle: surface.capabilities.elevScatter
        ? panelState.toggleShowElevScatter
        : undefined,
      showParameters: panelState.showParameters,
      onShowParametersToggle: surface.capabilities.parametersPanel
        ? panelState.toggleShowParameters
        : undefined,
      showBundleMetadata: panelState.showBundleMetadata,
      onShowBundleMetadataToggle: surface.capabilities.bundleMetadataPanel
        ? panelState.toggleShowBundleMetadata
        : undefined,
      onExportKpi: surface.capabilities.kpiExport ? onExportKpi : undefined,
      onOpenBaselineResults: surface.capabilities.baselineResults
        ? panelState.openBaselineResults
        : undefined,
      hoTypeOverride,
      onHoTypeOverrideChange: surface.capabilities.hoTypeOverride
        ? onHoTypeOverrideChange
        : undefined,
      profileId,
      onProfileChange: surface.capabilities.profileSelection ? onProfileChange : undefined,
      bundleSourceKind: bundleControlPanelProps.bundleSourceKind,
      bundleLoadState: bundleControlPanelProps.bundleLoadState,
      bundleIsLoading: bundleControlPanelProps.bundleIsLoading,
      bundleLoadError: bundleControlPanelProps.bundleLoadError,
      bundleSourceLabel: bundleControlPanelProps.bundleSourceLabel,
      bundleCurrentSlotIndex: bundleControlPanelProps.bundleCurrentSlotIndex,
      bundleSlotCount: bundleControlPanelProps.bundleSlotCount,
      onLoadExternalBundleDirectory: isBundleMode
        ? bundleControlPanelProps.onLoadExternalBundleDirectory
        : undefined,
      onResetBundleSource: isBundleMode
        ? bundleControlPanelProps.onResetBundleSource
        : undefined,
      onBundleStepBackward: isBundleMode ? bundleControlPanelProps.onBundleStepBackward : undefined,
      onBundleStepForward: isBundleMode ? bundleControlPanelProps.onBundleStepForward : undefined,
    };
  }, [
    bundleControlPanelProps,
    effectiveSpeed,
    hoSlowActive,
    hoSlowEnabled,
    hoTypeOverride,
    onExportKpi,
    onHoSlowToggle,
    onHoTypeOverrideChange,
    onPauseToggle,
    onProfileChange,
    onSceneModeChange,
    onShowBeamsToggle,
    onShowLabelsToggle,
    onSpeedChange,
    panelState,
    paused,
    profileId,
    sceneMode,
    showBeams,
    showLabels,
    speed,
  ]);
}
