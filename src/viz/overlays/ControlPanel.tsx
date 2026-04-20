/**
 * ControlPanel — Interactive HTML overlay for simulation controls.
 *
 * Rendered OUTSIDE the R3F Canvas. Uses pointer-events: auto
 * so users can interact with controls.
 */

import React, { useCallback, useRef } from 'react';
import type { SceneMode } from '@/app/hooks/useSceneQueryState';
import type { HandoverType } from '@/core/contracts/exposure-v1';
import { getProfileList } from '@/core/contracts/exposure-v1';
import { DEFAULT_INTERACTIVE_PROFILE_ID } from '@/core/profiles/default-profile';

export type ControlPanelSceneMode = SceneMode;
export type ControlPanelBundleSourceKind = 'sample' | 'external-directory';
export type ControlPanelBundleLoadState =
  | 'boot-loading-sample'
  | 'boot-load-failed'
  | 'ready-sample'
  | 'loading-external-directory'
  | 'ready-external-directory'
  | 'resetting-to-sample';

export interface ControlPanelCapabilities {
  profileSelection: boolean;
  hoTypeOverride: boolean;
  hoSlow: boolean;
  labels: boolean;
  sinrChart: boolean;
  hoLog: boolean;
  sinrCdf: boolean;
  elevScatter: boolean;
  parametersPanel: boolean;
  bundleMetadataPanel: boolean;
  kpiExport: boolean;
  baselineResults: boolean;
  bundleSourceLoad: boolean;
  bundleSourceReset: boolean;
  bundleStepBackward: boolean;
  bundleStepForward: boolean;
}

export interface ControlPanelSections {
  modeSelector: boolean;
  profileSelector: boolean;
  hoTypeSelector: boolean;
  hoSlowToggle: boolean;
  labelsToggle: boolean;
  sinrChartToggle: boolean;
  hoLogToggle: boolean;
  sinrCdfToggle: boolean;
  elevScatterToggle: boolean;
  bundleStepper: boolean;
  bundleSourceActions: boolean;
  bundleSourceState: boolean;
  bundleLoadError: boolean;
  bundleMetadataToggle: boolean;
  parametersToggle: boolean;
  exportKpiButton: boolean;
  baselineResultsButton: boolean;
  actionButtons: boolean;
}

export interface ControlPanelSurfaceModel {
  mode: ControlPanelSceneMode;
  variant: 'native' | 'bundle';
  capabilities: ControlPanelCapabilities;
  sections: ControlPanelSections;
  truthNote: string;
  bundleSourceDisclosure: string | null;
  bundleLoadErrorMessage: string | null;
}

export interface ControlPanelProps {
  surface: ControlPanelSurfaceModel;
  speed: number;
  onSpeedChange: (speed: number) => void;
  effectiveSpeed?: number;
  paused: boolean;
  onPauseToggle: () => void;
  hoSlowEnabled?: boolean;
  hoSlowActive?: boolean;
  onHoSlowToggle?: () => void;
  showBeams: boolean;
  onShowBeamsToggle: () => void;
  showLabels: boolean;
  onShowLabelsToggle?: () => void;
  replayMode?: boolean;
  onReplayToggle?: () => void;
  sceneMode?: ControlPanelSceneMode;
  onSceneModeChange?: (mode: ControlPanelSceneMode) => void;
  showSinrChart?: boolean;
  onShowSinrChartToggle?: () => void;
  showHoLog?: boolean;
  onShowHoLogToggle?: () => void;
  showSinrCdf?: boolean;
  onShowSinrCdfToggle?: () => void;
  showElevScatter?: boolean;
  onShowElevScatterToggle?: () => void;
  showParameters?: boolean;
  onShowParametersToggle?: () => void;
  showBundleMetadata?: boolean;
  onShowBundleMetadataToggle?: () => void;
  onExportKpi?: () => void;
  onOpenBaselineResults?: () => void;
  hoTypeOverride?: HandoverType | null;
  onHoTypeOverrideChange?: (type: HandoverType | null) => void;
  /** Current active profile ID (spec §10 tier-based selector). */
  profileId?: string;
  /** Callback to switch profile (profile change reloads the simulation). */
  onProfileChange?: (profileId: string) => void;
  bundleSourceKind?: ControlPanelBundleSourceKind;
  bundleLoadState?: ControlPanelBundleLoadState;
  bundleIsLoading?: boolean;
  bundleLoadError?: string | null;
  bundleSourceLabel?: string;
  bundleCurrentSlotIndex?: number | null;
  bundleSlotCount?: number;
  onLoadExternalBundleDirectory?: (selectedFiles: FileList | File[]) => void | Promise<void>;
  onResetBundleSource?: () => void | Promise<void>;
  onBundleStepBackward?: () => void;
  onBundleStepForward?: () => void;
}

// ---------------------------------------------------------------------------
// Profile tier groups — derived from exposure contract (Phase 4 Group 2)
// ---------------------------------------------------------------------------
//
// Data source: getProfileList() from @/core/contracts/exposure-v1
//   - Backed by profile-exposure-catalog.ts authoring metadata
//   - Replaces the former hardcoded profile-options constant
//   - Internal-only profiles are excluded by getProfileList()
//
// Phase 4 Group 2: phase4-runtime-contract-sdd.md §4.4 / P4-7

const profileEntries = getProfileList().map((e) => ({
  value: e.id,
  label: e.label,
  tier: e.tier,
}));
const profileTiers = (['Realistic', 'Advanced', 'Sensitivity'] as const).filter((tier) => (
  profileEntries.some((entry) => entry.tier === tier)
));

const SPEEDS = [1, 5, 10, 20] as const;

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 16,
  left: 16,
  zIndex: 10,
  pointerEvents: 'auto',
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  fontSize: 13,
  lineHeight: 1.6,
  color: '#e0e0e0',
  background: 'rgba(26, 26, 46, 0.85)',
  borderRadius: 6,
  padding: '12px 16px',
  backdropFilter: 'blur(4px)',
  userSelect: 'none',
  minWidth: 300,
};

const titleStyle: React.CSSProperties = {
  color: '#00d4ff',
  fontWeight: 700,
  fontSize: 14,
  marginBottom: 4,
};

const separatorStyle: React.CSSProperties = {
  color: '#555',
  margin: '2px 0 4px',
};

const labelStyle: React.CSSProperties = {
  color: '#888',
  marginRight: 8,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 4,
};

const btnBase: React.CSSProperties = {
  background: '#222',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 4,
  padding: '2px 10px',
  fontFamily: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
  outline: 'none',
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: '#00d4ff',
  color: '#1a1a2e',
  borderColor: '#00d4ff',
  fontWeight: 700,
};

const btnSecondaryStyle: React.CSSProperties = {
  ...btnBase,
  color: '#a7b6c7',
  borderColor: '#556273',
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  cursor: 'pointer',
  fontSize: 12,
};

export const ControlPanel = React.memo(function ControlPanel({
  surface,
  speed,
  onSpeedChange,
  effectiveSpeed = speed,
  paused,
  onPauseToggle,
  hoSlowEnabled = true,
  hoSlowActive = false,
  onHoSlowToggle,
  showBeams,
  onShowBeamsToggle,
  showLabels,
  onShowLabelsToggle,
  onReplayToggle,
  onSceneModeChange,
  showSinrChart = true,
  onShowSinrChartToggle,
  showHoLog = false,
  onShowHoLogToggle,
  showSinrCdf = false,
  onShowSinrCdfToggle,
  showElevScatter = false,
  onShowElevScatterToggle,
  showParameters = false,
  onShowParametersToggle,
  showBundleMetadata = true,
  onShowBundleMetadataToggle,
  onExportKpi,
  onOpenBaselineResults,
  hoTypeOverride = null,
  onHoTypeOverrideChange,
  profileId,
  onProfileChange,
  bundleIsLoading = false,
  bundleSourceLabel,
  bundleCurrentSlotIndex,
  bundleSlotCount,
  onLoadExternalBundleDirectory,
  onResetBundleSource,
  onBundleStepBackward,
  onBundleStepForward,
}: ControlPanelProps) {
  const bundleDirectoryInputRef = useRef<HTMLInputElement | null>(null);
  const resolvedSceneMode = surface.mode;
  const isBundleMode = surface.variant === 'bundle';
  const isNativeReplayMode = resolvedSceneMode === 'native-replay';
  const { capabilities, sections } = surface;
  const resolvedContainerStyle: React.CSSProperties = isBundleMode
    ? {
        ...containerStyle,
        border: '1px solid rgba(255, 186, 74, 0.35)',
        background: 'rgba(20, 22, 34, 0.92)',
        minWidth: 0,
        maxWidth: 360,
        padding: '10px 14px',
      }
    : containerStyle;

  const handleHoTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onHoTypeOverrideChange?.(val === '' ? null : val as HandoverType);
  }, [onHoTypeOverrideChange]);

  const handleProfileChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onProfileChange?.(e.target.value);
  }, [onProfileChange]);

  const handleSceneModeChange = useCallback((mode: ControlPanelSceneMode) => {
    onSceneModeChange?.(mode);
  }, [onSceneModeChange]);

  const handleSelectBundleDirectory = useCallback(() => {
    if (!capabilities.bundleSourceLoad) return;
    bundleDirectoryInputRef.current?.click();
  }, [capabilities.bundleSourceLoad]);

  const handleBundleDirectoryChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      void onLoadExternalBundleDirectory?.(files);
    }
    event.target.value = '';
  }, [onLoadExternalBundleDirectory]);

  const handleResetBundleSource = useCallback(() => {
    if (!capabilities.bundleSourceReset) return;
    void onResetBundleSource?.();
  }, [capabilities.bundleSourceReset, onResetBundleSource]);

  const selectStyle: React.CSSProperties = {
    background: '#222',
    color: '#e0e0e0',
    border: '1px solid #444',
    borderRadius: 4,
    padding: '2px 6px',
    fontFamily: 'inherit',
    fontSize: 12,
    cursor: 'pointer',
    outline: 'none',
  };
  const bundleDirectoryInputProps = {
    directory: '',
    webkitdirectory: '',
  } as React.InputHTMLAttributes<HTMLInputElement> & {
    directory?: string;
    webkitdirectory?: string;
  };

  return (
    <div style={resolvedContainerStyle} data-testid="control-panel">
      {isBundleMode && (
        <input
          data-testid="external-bundle-input"
          type="file"
          multiple
          ref={bundleDirectoryInputRef}
          style={{ display: 'none' }}
          onChange={handleBundleDirectoryChange}
          {...bundleDirectoryInputProps}
        />
      )}
      <div style={titleStyle}>NTN-SIM-CORE</div>
      <div style={separatorStyle}>{'─'.repeat(36)}</div>

      {sections.modeSelector && (
        <div style={rowStyle}>
          <span style={labelStyle}>Mode:</span>
          {onSceneModeChange ? (
            <>
              <button
                data-testid="mode-native-live"
                style={resolvedSceneMode === 'native-live' ? btnActive : btnBase}
                onClick={() => handleSceneModeChange('native-live')}
              >
                Native Live
              </button>
              <button
                data-testid="mode-native-replay"
                style={resolvedSceneMode === 'native-replay' ? btnActive : btnBase}
                onClick={() => handleSceneModeChange('native-replay')}
                title="Pre-record entire run with native simulator truth, then replay deterministically"
              >
                Native Replay
              </button>
              <button
                data-testid="mode-modqn-bundle"
                style={resolvedSceneMode === 'modqn-bundle' ? btnActive : btnBase}
                onClick={() => handleSceneModeChange('modqn-bundle')}
                title="Replay the frozen MODQN bundle as the primary serving/handover truth source"
              >
                MODQN Replay
              </button>
            </>
          ) : (
            <button
              data-testid="toggle-replay-mode"
              style={isNativeReplayMode ? btnActive : btnBase}
              onClick={onReplayToggle}
              title="Toggle native replay mode"
            >
              {isNativeReplayMode ? 'Native Replay' : 'Native Live'}
            </button>
          )}
        </div>
      )}

      {/* Profile selector (spec §10 Realistic/Advanced/Sensitivity tiers) */}
      {sections.profileSelector && (
        <div style={rowStyle}>
          <span style={labelStyle}>Profile:</span>
          <select
            data-testid="profile-select"
            value={profileId ?? DEFAULT_INTERACTIVE_PROFILE_ID}
            onChange={handleProfileChange}
            style={{ ...selectStyle, maxWidth: 220 }}
            title="Select simulation scenario. Realistic = paper/standard-backed defaults. Advanced = valid secondary settings. Sensitivity = reproduction / sweep targets."
          >
            {profileTiers.map((tier) => (
              <optgroup key={tier} label={`── ${tier} ──`}>
                {profileEntries.filter((o) => o.tier === tier).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      {/* HO Strategy override
          Realistic: A3, A4
          Advanced:  SINR-Offset, CHO, Timer-CHO, MC-HO, DAPS, Hard-HO
          The shipped UI default profile is DAPS-driven, but the override taxonomy
          still follows spec H8 for the individual HO families. */}
      {sections.hoTypeSelector && (
        <div style={rowStyle}>
          <span style={labelStyle}>HO:</span>
          <select
            data-testid="ho-strategy-select"
            value={hoTypeOverride ?? ''}
            onChange={handleHoTypeChange}
            style={selectStyle}
            title="Override handover mode. Realistic: A3/A4. Advanced: CHO/Timer-CHO/MC-HO/DAPS."
          >
            <option value="">profile default</option>
            <optgroup label="── Realistic ──">
              <option value="a3-event">A3 (Realistic)</option>
              <option value="a4-event">A4 (Realistic)</option>
            </optgroup>
            <optgroup label="── Advanced ──">
              <option value="sinr-offset">SINR-Offset [Adv]</option>
              <option value="cho">CHO [Adv]</option>
              <option value="timer-cho">Timer-CHO [Adv]</option>
              <option value="mc-ho">MC-HO [Adv]</option>
              <option value="daps">DAPS [Adv]</option>
              <option value="hard-ho">Hard-HO [Adv]</option>
            </optgroup>
          </select>
        </div>
      )}

      {/* Speed buttons */}
      <div style={rowStyle}>
        <span style={labelStyle}>Speed:</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            data-testid={`speed-${s}`}
            style={speed === s ? btnActive : btnBase}
            onClick={() => onSpeedChange(s)}
          >
            {s}x
          </button>
        ))}
        {effectiveSpeed !== speed && (
          <span style={{ color: '#ffd166', fontSize: 12 }}>
            active {effectiveSpeed}x
          </span>
        )}
      </div>

      {/* Play / Pause */}
      <div style={rowStyle}>
        <button style={btnBase} onClick={onPauseToggle}>
          {paused ? '\u25B6 Play' : '\u23F8 Pause'}
        </button>
        {sections.hoSlowToggle && (
          <label style={checkboxLabelStyle}>
            <input
              data-testid="toggle-ho-slow"
              type="checkbox"
              checked={hoSlowEnabled}
              onChange={onHoSlowToggle}
            />
            HO Slow{hoSlowActive ? ' On' : ''}
          </label>
        )}
      </div>

      {/* Toggles */}
      <div style={{ ...rowStyle, gap: 16, flexWrap: 'wrap' }}>
        <label style={checkboxLabelStyle}>
          <input
            data-testid="toggle-show-beams"
            type="checkbox"
            checked={showBeams}
            onChange={onShowBeamsToggle}
          />
          Show Beams
        </label>
        {sections.labelsToggle && (
          <label style={checkboxLabelStyle}>
            <input
              data-testid="toggle-show-labels"
              type="checkbox"
              checked={showLabels}
            onChange={onShowLabelsToggle}
          />
          Show Labels
        </label>
        )}
        {sections.sinrChartToggle && (
          <label style={checkboxLabelStyle}>
            <input
              data-testid="toggle-sinr-chart"
              type="checkbox"
              checked={showSinrChart}
            onChange={onShowSinrChartToggle}
          />
          SINR Chart
        </label>
        )}
        {sections.hoLogToggle && (
          <label style={checkboxLabelStyle}>
            <input
              data-testid="toggle-ho-log"
              type="checkbox"
              checked={showHoLog}
            onChange={onShowHoLogToggle}
          />
          HO Log
        </label>
        )}
        {sections.sinrCdfToggle && (
          <label style={checkboxLabelStyle}>
            <input
              data-testid="toggle-sinr-cdf"
              type="checkbox"
              checked={showSinrCdf}
            onChange={onShowSinrCdfToggle}
          />
          SINR CDF
        </label>
        )}
        {sections.elevScatterToggle && (
          <label style={checkboxLabelStyle}>
            <input
              data-testid="toggle-elev-scatter"
              type="checkbox"
              checked={showElevScatter}
            onChange={onShowElevScatterToggle}
          />
          Elev Scatter
        </label>
        )}
      </div>

      {sections.bundleStepper && (
        <div style={rowStyle}>
          <span style={labelStyle}>Bundle:</span>
          <span
            data-testid="bundle-source-label"
            style={{ color: '#8fdcff', maxWidth: 128, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={bundleSourceLabel}
          >
            {bundleSourceLabel ?? 'sample-bundle-v1'}
          </span>
          <button
            data-testid="bundle-step-backward"
            style={btnBase}
            onClick={onBundleStepBackward}
            disabled={!capabilities.bundleStepBackward}
          >
            ◀ Slot
          </button>
          <span data-testid="bundle-slot-indicator" style={{ color: '#c9d6e2' }}>
            {bundleCurrentSlotIndex ?? '—'} / {bundleSlotCount ?? '—'}
          </span>
          <button
            data-testid="bundle-step-forward"
            style={btnBase}
            onClick={onBundleStepForward}
            disabled={!capabilities.bundleStepForward}
          >
            Slot ▶
          </button>
        </div>
      )}

      {sections.bundleSourceActions && (
        <div style={{ ...rowStyle, flexWrap: 'wrap' }}>
          <span style={labelStyle}>Source:</span>
          <button
            data-testid="load-external-bundle"
            style={btnSecondaryStyle}
            onClick={handleSelectBundleDirectory}
            disabled={!capabilities.bundleSourceLoad}
            title="Select a local MODQN replay bundle directory from the browser"
          >
            Load Bundle...
          </button>
          <button
            data-testid="reset-bundle-source"
            style={btnSecondaryStyle}
            onClick={handleResetBundleSource}
            disabled={!capabilities.bundleSourceReset}
            title="Restore the shipped sample bundle baseline"
          >
            Reset To Sample
          </button>
          {bundleIsLoading && (
            <span style={{ color: '#ffd166', fontSize: 12 }}>Loading…</span>
          )}
        </div>
      )}

      {sections.bundleSourceState && (
        <div style={{ ...rowStyle, alignItems: 'flex-start' }}>
          <span style={labelStyle}>State:</span>
          <span data-testid="bundle-source-note" style={{ color: '#a7b6c7', fontSize: 12, maxWidth: 260 }}>
            {surface.bundleSourceDisclosure}
          </span>
        </div>
      )}

      {sections.bundleLoadError && surface.bundleLoadErrorMessage && (
        <div style={{ ...rowStyle, alignItems: 'flex-start' }}>
          <span style={labelStyle}>Error:</span>
          <span
            data-testid="bundle-load-error"
            style={{ color: '#ff9f80', fontSize: 12, maxWidth: 260 }}
          >
            {surface.bundleLoadErrorMessage}
          </span>
        </div>
      )}

      {/* KPI Export + baseline viewer */}
      {sections.actionButtons && (
        <div style={rowStyle}>
          {sections.bundleMetadataToggle && (
            <button
              data-testid="toggle-bundle-metadata-panel"
              style={showBundleMetadata ? btnActive : btnSecondaryStyle}
              onClick={onShowBundleMetadataToggle}
              title="Show or hide bundle assumptions, provenance, and training/evaluation disclosure"
            >
              Disclosure
            </button>
          )}
          {sections.parametersToggle && (
            <button
              data-testid="toggle-parameters-panel"
              style={showParameters ? btnActive : btnSecondaryStyle}
              onClick={onShowParametersToggle}
              title="Show or hide the registry-backed profile parameter panel"
            >
              Parameters
            </button>
          )}
          {sections.exportKpiButton && onExportKpi && (
            <button
              data-testid="export-kpi"
              style={btnBase}
              onClick={onExportKpi}
              title="Export current KPI as JSON + CSV"
            >
              Export KPI
            </button>
          )}
          {sections.baselineResultsButton && onOpenBaselineResults && (
            <button
              data-testid="open-baseline-results"
              style={profileId === 'modqn-paper-baseline' ? { ...btnSecondaryStyle, borderColor: '#00d4ff', color: '#00d4ff' } : btnSecondaryStyle}
              onClick={onOpenBaselineResults}
              title={profileId === 'modqn-paper-baseline' ? "Open MODQN Baseline Reproduction Results (M3)" : "Open the single-run baseline result viewer"}
            >
              {profileId === 'modqn-paper-baseline' ? 'MODQN Results' : 'Baseline Viewer'}
            </button>
          )}
        </div>
      )}

      <div style={{ ...rowStyle, marginBottom: 0 }}>
        <span style={labelStyle}>Truth:</span>
        <span data-testid="truth-source-note" style={{ color: '#a7b6c7', fontSize: 12 }}>
          {surface.truthNote}
        </span>
      </div>
    </div>
  );
});
