import React from 'react';

import type { BeamRole, ContinuityState } from '@/core/contracts/runtime-v1';

export interface ValidationRuntimeSummary {
  mode: 'live' | 'replay';
  profileId: string;
  showBeams: boolean;
  showLabels: boolean;
  tick: number | null;
  timeSec: number | null;
  visibleSatelliteIds: string[];
  primaryUe: {
    servingSatId: string | null;
    targetSatId: string | null;
    secondarySatId: string | null;
    continuityState: ContinuityState | null;
    sinrDb: number | null;
  };
  lowSinrUeCount: number;
  lowSinrThresholdDb: number;
  dapsPhase: string | null;
  replaySelection: string | null;
  replayWindowStartSec: number | null;
  replayWindowEndSec: number | null;
}

export interface OrbitParitySatelliteSample {
  id: string;
  latDeg: number;
  lonDeg: number;
  altKm: number;
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
  isVisible: boolean;
}

export interface OrbitParitySummary {
  present: boolean;
  mode: 'live' | 'replay';
  profileId: string;
  timeSec: number | null;
  sampleCount: number;
  satellites: OrbitParitySatelliteSample[];
}

export interface EarthMovingBeamGeometrySample {
  satId: string;
  beamId: string;
  role: BeamRole;
  isActive: boolean;
  isCandidate: boolean;
  isUeAnchored: boolean;
  satX: number;
  satZ: number;
  groundX: number;
  groundZ: number;
  offsetEastKm: number;
  offsetNorthKm: number;
}

export interface EarthMovingLayerSummary {
  present: boolean;
  renderedSatIds: string[];
  renderedBeamCount: number;
  footprintRadiusWorld: number;
  roleCounts: Partial<Record<BeamRole, number>>;
  geometrySamples: EarthMovingBeamGeometrySample[];
}

export interface EarthFixedLayerSummary {
  present: boolean;
  cellCount: number;
  stateCounts: {
    served: number;
    interfered: number;
    energyBlocked: number;
    inactiveBeam: number;
    noCoverage: number;
  };
  observedStateCounts: {
    served: number;
    interfered: number;
    energyBlocked: number;
    inactiveBeam: number;
    noCoverage: number;
  };
}

export interface BeamInfoOverlaySummary {
  present: boolean;
  labeledSatIds: string[];
  roleTags: string[];
  primaryServingSatId: string | null;
  servingSinrDb: number | null;
}

export interface HandoverLinkOverlaySummary {
  present: boolean;
  styleKeys: string[];
  observedStyleKeys: string[];
  continuityState: ContinuityState | null;
  dapsPhase: string | null;
  observedDapsPhases: string[];
  observedDualActiveTruth: boolean;
}

export interface VisualValidationState {
  updatedAt: number;
  runtime?: ValidationRuntimeSummary;
  orbitParity?: OrbitParitySummary;
  earthMovingBeamLayer?: EarthMovingLayerSummary;
  earthFixedCellLayer?: EarthFixedLayerSummary;
  beamInfoOverlay?: BeamInfoOverlaySummary;
  handoverLinkOverlay?: HandoverLinkOverlaySummary;
}

type SectionKey = Exclude<keyof VisualValidationState, 'updatedAt'>;

const GLOBAL_KEY = '__NTN_SIM_CORE_VISUAL__';
const EVENT_NAME = 'ntn-sim-core:visual-validation';

const EMPTY_STATE: VisualValidationState = {
  updatedAt: 0,
};

declare global {
  interface Window {
    __NTN_SIM_CORE_VISUAL__?: VisualValidationState;
  }
}

function getCurrentState(): VisualValidationState {
  if (typeof window === 'undefined') return EMPTY_STATE;
  return window[GLOBAL_KEY] ?? EMPTY_STATE;
}

function writeState(next: VisualValidationState) {
  if (typeof window === 'undefined') return;
  window[GLOBAL_KEY] = next;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function publishValidationSection<K extends SectionKey>(
  key: K,
  value: VisualValidationState[K],
) {
  if (typeof window === 'undefined') return;
  const prev = getCurrentState();
  writeState({
    ...prev,
    [key]: value,
    updatedAt: Date.now(),
  });
}

export function subscribeValidationStore(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

export function getValidationStoreSnapshot(): VisualValidationState {
  return getCurrentState();
}

export function usePublishValidationSection<K extends SectionKey>(
  key: K,
  value: VisualValidationState[K],
) {
  React.useEffect(() => {
    publishValidationSection(key, value);
  }, [key, value]);
}

export function useValidationStore(): VisualValidationState {
  return React.useSyncExternalStore(
    subscribeValidationStore,
    getValidationStoreSnapshot,
    () => EMPTY_STATE,
  );
}
