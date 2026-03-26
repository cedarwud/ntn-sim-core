/**
 * useSceneQueryState — URL query-param bootstrap for SceneShell controls.
 *
 * Reads initial state from URL on mount; syncs state changes back to URL via
 * history.replaceState so the page is bookmarkable / reloadable.
 *
 * Returns current state + stable setter callbacks.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface SceneQueryState {
  speed: number;
  paused: boolean;
  showBeams: boolean;
  showLabels: boolean;
  replayMode: boolean;
  replaySeekSec: number | null;
  validationMode: boolean;
}

function readQueryState(): SceneQueryState {
  if (typeof window === 'undefined') {
    return { speed: 5, paused: false, showBeams: true, showLabels: true, replayMode: false, replaySeekSec: null, validationMode: false };
  }
  const p = new URLSearchParams(window.location.search);
  const speed = Number(p.get('speed'));
  const seek = Number(p.get('replaySeekSec'));
  return {
    speed: Number.isFinite(speed) && speed > 0 ? speed : 5,
    paused: p.get('paused') === '1',
    showBeams: p.get('showBeams') !== '0',
    showLabels: p.get('showLabels') !== '0',
    replayMode: p.get('replay') === '1',
    replaySeekSec: Number.isFinite(seek) && seek > 0 ? seek : null,
    validationMode: p.get('validate') === '1',
  };
}

function syncQueryState(s: SceneQueryState) {
  if (typeof window === 'undefined') return;
  const p = new URLSearchParams(window.location.search);
  p.set('speed', String(s.speed));
  if (s.paused) p.set('paused', '1'); else p.delete('paused');
  if (!s.showBeams) p.set('showBeams', '0'); else p.delete('showBeams');
  if (!s.showLabels) p.set('showLabels', '0'); else p.delete('showLabels');
  if (s.replayMode) p.set('replay', '1'); else p.delete('replay');
  if (s.replaySeekSec !== null && Number.isFinite(s.replaySeekSec)) p.set('replaySeekSec', String(s.replaySeekSec)); else p.delete('replaySeekSec');
  if (s.validationMode) p.set('validate', '1'); else p.delete('validate');
  window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
}

export interface UseSceneQueryStateResult {
  speed: number;
  paused: boolean;
  showBeams: boolean;
  showLabels: boolean;
  replayMode: boolean;
  replaySeekSec: number | null;
  validationMode: boolean;
  setSpeed: (speed: number) => void;
  togglePaused: () => void;
  toggleShowBeams: () => void;
  toggleShowLabels: () => void;
  toggleReplayMode: () => void;
}

export function useSceneQueryState(): UseSceneQueryStateResult {
  const bootstrap = useMemo(() => readQueryState(), []);

  const [speed, setSpeedRaw] = useState(bootstrap.speed);
  const [paused, setPaused] = useState(bootstrap.paused);
  const [showBeams, setShowBeams] = useState(bootstrap.showBeams);
  const [showLabels, setShowLabels] = useState(bootstrap.showLabels);
  const [replayMode, setReplayMode] = useState(bootstrap.replayMode);
  const [replaySeekSec] = useState(bootstrap.replaySeekSec);
  const validationMode = bootstrap.validationMode;

  useEffect(() => {
    syncQueryState({ speed, paused, showBeams, showLabels, replayMode, replaySeekSec, validationMode });
  }, [paused, replayMode, replaySeekSec, showBeams, showLabels, speed, validationMode]);

  const setSpeed = useCallback((s: number) => setSpeedRaw(s), []);
  const togglePaused = useCallback(() => setPaused((p) => !p), []);
  const toggleShowBeams = useCallback(() => setShowBeams((b) => !b), []);
  const toggleShowLabels = useCallback(() => setShowLabels((l) => !l), []);
  const toggleReplayMode = useCallback(() => setReplayMode((r) => !r), []);

  return {
    speed,
    paused,
    showBeams,
    showLabels,
    replayMode,
    replaySeekSec,
    validationMode,
    setSpeed,
    togglePaused,
    toggleShowBeams,
    toggleShowLabels,
    toggleReplayMode,
  };
}
