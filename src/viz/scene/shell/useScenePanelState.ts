import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { SceneMode } from '@/app/hooks/useSceneQueryState';

interface NativePanelSnapshot {
  showSinrChart: boolean;
  showSinrCdf: boolean;
  showElevScatter: boolean;
  showBaselineResults: boolean;
  showParameters: boolean;
}

export interface ScenePanelState {
  showSinrChart: boolean;
  showHoLog: boolean;
  showSinrCdf: boolean;
  showElevScatter: boolean;
  showBaselineResults: boolean;
  showParameters: boolean;
  showBundleMetadata: boolean;
  toggleShowSinrChart: () => void;
  toggleShowHoLog: () => void;
  toggleShowSinrCdf: () => void;
  toggleShowElevScatter: () => void;
  toggleShowParameters: () => void;
  toggleShowBundleMetadata: () => void;
  openBaselineResults: () => void;
  closeBaselineResults: () => void;
}

function toggleBoolean(setter: Dispatch<SetStateAction<boolean>>) {
  setter((value) => !value);
}

export function useScenePanelState(sceneMode: SceneMode): ScenePanelState {
  const [showSinrChart, setShowSinrChart] = useState(true);
  const [showHoLog, setShowHoLog] = useState(false);
  const [showSinrCdf, setShowSinrCdf] = useState(false);
  const [showElevScatter, setShowElevScatter] = useState(false);
  const [showBaselineResults, setShowBaselineResults] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [showBundleMetadata, setShowBundleMetadata] = useState(false);

  const isBundleMode = sceneMode === 'modqn-bundle';
  const previousSceneModeRef = useRef(sceneMode);
  const nativePanelStateRef = useRef<NativePanelSnapshot>({
    showSinrChart,
    showSinrCdf,
    showElevScatter,
    showBaselineResults,
    showParameters,
  });

  useEffect(() => {
    if (isBundleMode || previousSceneModeRef.current === 'modqn-bundle') return;
    nativePanelStateRef.current = {
      showSinrChart,
      showSinrCdf,
      showElevScatter,
      showBaselineResults,
      showParameters,
    };
  }, [
    isBundleMode,
    showBaselineResults,
    showElevScatter,
    showParameters,
    showSinrCdf,
    showSinrChart,
  ]);

  useEffect(() => {
    const previousSceneMode = previousSceneModeRef.current;
    previousSceneModeRef.current = sceneMode;

    if (isBundleMode) {
      setShowBaselineResults(false);
      setShowParameters(false);
      setShowSinrChart(false);
      setShowSinrCdf(false);
      setShowElevScatter(false);
      setShowBundleMetadata(false);
      return;
    }

    if (previousSceneMode === 'modqn-bundle') {
      const previousNativePanels = nativePanelStateRef.current;
      setShowBaselineResults(previousNativePanels.showBaselineResults);
      setShowParameters(previousNativePanels.showParameters);
      setShowSinrChart(previousNativePanels.showSinrChart);
      setShowSinrCdf(previousNativePanels.showSinrCdf);
      setShowElevScatter(previousNativePanels.showElevScatter);
    }
  }, [isBundleMode, sceneMode]);

  const toggleShowSinrChart = useCallback(() => toggleBoolean(setShowSinrChart), []);
  const toggleShowHoLog = useCallback(() => toggleBoolean(setShowHoLog), []);
  const toggleShowSinrCdf = useCallback(() => toggleBoolean(setShowSinrCdf), []);
  const toggleShowElevScatter = useCallback(() => toggleBoolean(setShowElevScatter), []);
  const toggleShowParameters = useCallback(() => toggleBoolean(setShowParameters), []);
  const toggleShowBundleMetadata = useCallback(() => toggleBoolean(setShowBundleMetadata), []);
  const openBaselineResults = useCallback(() => setShowBaselineResults(true), []);
  const closeBaselineResults = useCallback(() => setShowBaselineResults(false), []);

  return {
    showSinrChart,
    showHoLog,
    showSinrCdf,
    showElevScatter,
    showBaselineResults,
    showParameters,
    showBundleMetadata,
    toggleShowSinrChart,
    toggleShowHoLog,
    toggleShowSinrCdf,
    toggleShowElevScatter,
    toggleShowParameters,
    toggleShowBundleMetadata,
    openBaselineResults,
    closeBaselineResults,
  };
}
