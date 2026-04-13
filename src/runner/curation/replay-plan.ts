/**
 * Shared replay-window planning for frontend replay and headless artifacts.
 *
 * Keeps deterministic showcase-window selection in one place so replay
 * manifests, frontend replay, and validation all use the same policy.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §10
 *   - Historical closure reference: archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-final-closure-checklist.md FC-1
 *   - This file must not import React, Three.js, or scene code.
 */

import type { PresentationMode } from '@/core/common/types';
import type { ProfileConfig } from '@/core/profiles/types';
import type { ReplayManifest } from '@/core/trace/types';
import type { TrajectoryCache } from '@/core/orbit/types';
import type { WindowSelectionConfig, SelectedWindow } from './window-selector';
import { selectBestWindow, createReplayManifestFromWindow } from './window-selector';
import { selectContinuityAwareWindow } from './continuity-window-selector';

export interface ReplaySelectionPlan {
  selectionConfig: WindowSelectionConfig;
  selectedWindow: SelectedWindow;
  replayManifest: ReplayManifest;
}

export function buildReplaySelectionConfig(profile: ProfileConfig): WindowSelectionConfig {
  return {
    windowDurationSec: Math.min(180, profile.timeControl.durationSec),
    strategy:
      profile.orbitMode === 'real-trace'
        ? 'best-combined'
        : (profile.handover.type === 'cho' || profile.handover.type === 'mc-ho' || profile.handover.type === 'daps')
          ? 'richest-handover'
          : 'best-combined',
  };
}

export function createReplaySelectionPlan(
  profile: ProfileConfig,
  trajectoryCache: TrajectoryCache,
  runId: string,
  presentationMode: PresentationMode,
): ReplaySelectionPlan {
  const selectionConfig = buildReplaySelectionConfig(profile);
  const selectedWindow = (
    profile.handover.type === 'daps' || profile.handover.type === 'mc-ho'
  )
    ? (
      selectContinuityAwareWindow(
        profile,
        trajectoryCache,
        selectionConfig.windowDurationSec,
      ) ?? selectBestWindow(trajectoryCache, selectionConfig)
    )
    : selectBestWindow(trajectoryCache, selectionConfig);
  const replayManifest = createReplayManifestFromWindow(runId, selectedWindow, presentationMode);
  return {
    selectionConfig,
    selectedWindow,
    replayManifest,
  };
}
