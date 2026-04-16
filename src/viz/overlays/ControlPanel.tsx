/**
 * ControlPanel — Interactive HTML overlay for simulation controls.
 *
 * Rendered OUTSIDE the R3F Canvas. Uses pointer-events: auto
 * so users can interact with controls.
 */

import React, { useCallback } from 'react';
import type { HandoverType } from '@/core/contracts/exposure-v1';
import { getProfileList } from '@/core/contracts/exposure-v1';
import { DEFAULT_INTERACTIVE_PROFILE_ID } from '@/core/profiles/default-profile';

export type ControlPanelSceneMode = 'native-live' | 'native-replay' | 'modqn-bundle';

export interface ControlPanelProps {
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
  onShowLabelsToggle: () => void;
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
  bundleSourceLabel?: string;
  bundleCurrentSlotIndex?: number | null;
  bundleSlotCount?: number;
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
  replayMode,
  onReplayToggle,
  sceneMode,
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
  bundleSourceLabel,
  bundleCurrentSlotIndex,
  bundleSlotCount,
  onBundleStepBackward,
  onBundleStepForward,
}: ControlPanelProps) {
  const resolvedSceneMode = sceneMode ?? (replayMode ? 'native-replay' : 'native-live');
  const isBundleMode = resolvedSceneMode === 'modqn-bundle';
  const isNativeReplayMode = resolvedSceneMode === 'native-replay';
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

  return (
    <div style={resolvedContainerStyle} data-testid="control-panel">
      <div style={titleStyle}>NTN-SIM-CORE</div>
      <div style={separatorStyle}>{'─'.repeat(36)}</div>

      {(onSceneModeChange || onReplayToggle) && (
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
      {onProfileChange && !isBundleMode && (
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
      {onHoTypeOverrideChange && !isBundleMode && (
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
        {onHoSlowToggle && !isBundleMode && (
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
        {!isBundleMode && (
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
        {!isBundleMode && onShowSinrChartToggle && (
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
        {!isBundleMode && onShowHoLogToggle && (
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
        {!isBundleMode && onShowSinrCdfToggle && (
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
        {!isBundleMode && onShowElevScatterToggle && (
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

      {isBundleMode && (bundleSourceLabel || onBundleStepBackward || onBundleStepForward) && (
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
            disabled={!onBundleStepBackward}
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
            disabled={!onBundleStepForward}
          >
            Slot ▶
          </button>
        </div>
      )}

      {/* KPI Export + baseline viewer */}
      {(onExportKpi || onOpenBaselineResults || onShowBundleMetadataToggle || onShowParametersToggle) && (
        <div style={rowStyle}>
          {isBundleMode ? (
            onShowBundleMetadataToggle && (
              <button
                data-testid="toggle-bundle-metadata-panel"
                style={showBundleMetadata ? btnActive : btnSecondaryStyle}
                onClick={onShowBundleMetadataToggle}
                title="Show or hide bundle assumptions, provenance, and training/evaluation disclosure"
              >
                Disclosure
              </button>
            )
          ) : onShowParametersToggle && (
            <button
              data-testid="toggle-parameters-panel"
              style={showParameters ? btnActive : btnSecondaryStyle}
              onClick={onShowParametersToggle}
              title="Show or hide the registry-backed profile parameter panel"
            >
              Parameters
            </button>
          )}
          {!isBundleMode && onExportKpi && (
            <button
              data-testid="export-kpi"
              style={btnBase}
              onClick={onExportKpi}
              title="Export current KPI as JSON + CSV"
            >
              Export KPI
            </button>
          )}
          {!isBundleMode && onOpenBaselineResults && (
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
          {isBundleMode
            ? 'Now replaying a saved MODQN producer export bundle. Native simulator panels stay hidden unless you leave bundle mode.'
            : isNativeReplayMode
              ? 'Native simulator truth recorded into replay window'
              : 'Native simulator truth from live engine'}
        </span>
      </div>
    </div>
  );
});
