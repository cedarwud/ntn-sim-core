/**
 * useSceneQueryState — URL query-param bootstrap for SceneShell controls.
 *
 * Reads initial state from URL on mount; syncs state changes back to URL via
 * history.replaceState so the page is bookmarkable / reloadable.
 *
 * Returns current state + stable setter callbacks.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_INTERACTIVE_PROFILE_ID } from '@/core/profiles/default-profile';

/**
 * Default profile: continuity-first interactive DAPS baseline.
 * The stricter paper-safe baseline profiles remain available in the selector,
 * but the shipped UI default prioritizes stable SINR-driven continuity truth.
 */
const DEFAULT_PROFILE_ID = DEFAULT_INTERACTIVE_PROFILE_ID;
export type SceneMode = 'native-live' | 'native-replay' | 'modqn-bundle';

const DEFAULT_SCENE_MODE: SceneMode = 'native-live';

function parseSceneMode(mode: string | null, replayFlag: string | null): SceneMode {
  if (mode === 'native-live' || mode === 'native-replay' || mode === 'modqn-bundle') {
    return mode;
  }
  return replayFlag === '1' ? 'native-replay' : DEFAULT_SCENE_MODE;
}

export interface SceneQueryState {
  speed: number;
  paused: boolean;
  hoSlowEnabled: boolean;
  showBeams: boolean;
  showLabels: boolean;
  sceneMode: SceneMode;
  replaySeekSec: number | null;
  validationMode: boolean;
  profileId: string;
}

function readQueryState(): SceneQueryState {
  if (typeof window === 'undefined') {
    return {
      speed: 5,
      paused: false,
      hoSlowEnabled: true,
      showBeams: true,
      showLabels: false,
      sceneMode: DEFAULT_SCENE_MODE,
      replaySeekSec: null,
      validationMode: false,
      profileId: DEFAULT_PROFILE_ID,
    };
  }
  const p = new URLSearchParams(window.location.search);
  const speed = Number(p.get('speed'));
  const seek = Number(p.get('replaySeekSec'));
  const labels = p.get('showLabels');
  return {
    speed: Number.isFinite(speed) && speed > 0 ? speed : 5,
    paused: p.get('paused') === '1',
    hoSlowEnabled: p.get('hoSlow') !== '0',
    showBeams: p.get('showBeams') !== '0',
    showLabels: labels === '1',
    sceneMode: parseSceneMode(p.get('mode'), p.get('replay')),
    replaySeekSec: Number.isFinite(seek) && seek > 0 ? seek : null,
    validationMode: p.get('validate') === '1',
    profileId: p.get('profile') ?? DEFAULT_PROFILE_ID,
  };
}

function syncQueryState(s: SceneQueryState) {
  if (typeof window === 'undefined') return;
  const p = new URLSearchParams(window.location.search);
  p.set('speed', String(s.speed));
  if (s.paused) p.set('paused', '1'); else p.delete('paused');
  if (!s.hoSlowEnabled) p.set('hoSlow', '0'); else p.delete('hoSlow');
  if (!s.showBeams) p.set('showBeams', '0'); else p.delete('showBeams');
  if (s.showLabels) p.set('showLabels', '1'); else p.delete('showLabels');
  if (s.sceneMode !== DEFAULT_SCENE_MODE) p.set('mode', s.sceneMode); else p.delete('mode');
  if (s.sceneMode === 'native-replay') p.set('replay', '1'); else p.delete('replay');
  if (s.replaySeekSec !== null && Number.isFinite(s.replaySeekSec)) p.set('replaySeekSec', String(s.replaySeekSec)); else p.delete('replaySeekSec');
  if (s.validationMode) p.set('validate', '1'); else p.delete('validate');
  if (s.profileId && s.profileId !== DEFAULT_PROFILE_ID) p.set('profile', s.profileId); else p.delete('profile');
  window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
}

export interface UseSceneQueryStateResult {
  speed: number;
  paused: boolean;
  hoSlowEnabled: boolean;
  showBeams: boolean;
  showLabels: boolean;
  replayMode: boolean;
  sceneMode: SceneMode;
  replaySeekSec: number | null;
  validationMode: boolean;
  profileId: string;
  setSpeed: (speed: number) => void;
  togglePaused: () => void;
  toggleHoSlowEnabled: () => void;
  toggleShowBeams: () => void;
  toggleShowLabels: () => void;
  toggleReplayMode: () => void;
  setSceneMode: (mode: SceneMode) => void;
  /** Change the active profile and sync to URL. */
  setProfileId: (id: string) => void;
}

export function useSceneQueryState(): UseSceneQueryStateResult {
  const bootstrap = useMemo(() => readQueryState(), []);

  const [speed, setSpeedRaw] = useState(bootstrap.speed);
  const [paused, setPaused] = useState(bootstrap.paused);
  const [hoSlowEnabled, setHoSlowEnabled] = useState(bootstrap.hoSlowEnabled);
  const [showBeams, setShowBeams] = useState(bootstrap.showBeams);
  const [showLabels, setShowLabels] = useState(bootstrap.showLabels);
  const [sceneMode, setSceneModeRaw] = useState<SceneMode>(bootstrap.sceneMode);
  const [replaySeekSec] = useState(bootstrap.replaySeekSec);
  const [profileId, setProfileIdRaw] = useState(bootstrap.profileId);
  const validationMode = bootstrap.validationMode;

  useEffect(() => {
    syncQueryState({
      speed,
      paused,
      hoSlowEnabled,
      showBeams,
      showLabels,
      sceneMode,
      replaySeekSec,
      validationMode,
      profileId,
    });
  }, [hoSlowEnabled, paused, profileId, replaySeekSec, sceneMode, showBeams, showLabels, speed, validationMode]);

  const setSpeed = useCallback((s: number) => setSpeedRaw(s), []);
  const togglePaused = useCallback(() => setPaused((p) => !p), []);
  const toggleHoSlowEnabled = useCallback(() => setHoSlowEnabled((enabled) => !enabled), []);
  const toggleShowBeams = useCallback(() => setShowBeams((b) => !b), []);
  const toggleShowLabels = useCallback(() => setShowLabels((l) => !l), []);
  const toggleReplayMode = useCallback(() => {
    setSceneModeRaw((mode) => (mode === 'native-replay' ? 'native-live' : 'native-replay'));
  }, []);
  const setSceneMode = useCallback((mode: SceneMode) => setSceneModeRaw(mode), []);
  const setProfileId = useCallback((id: string) => setProfileIdRaw(id), []);

  return {
    speed,
    paused,
    hoSlowEnabled,
    showBeams,
    showLabels,
    replayMode: sceneMode === 'native-replay',
    sceneMode,
    replaySeekSec,
    validationMode,
    profileId,
    setSpeed,
    togglePaused,
    toggleHoSlowEnabled,
    toggleShowBeams,
    toggleShowLabels,
    toggleReplayMode,
    setSceneMode,
    setProfileId,
  };
}
