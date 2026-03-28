/**
 * ControlPanel — Interactive HTML overlay for simulation controls.
 *
 * Rendered OUTSIDE the R3F Canvas. Uses pointer-events: auto
 * so users can interact with controls.
 */

import React, { useCallback } from 'react';
import type { HandoverType } from '@/core/profiles/types';

export interface ControlPanelProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
  paused: boolean;
  onPauseToggle: () => void;
  showBeams: boolean;
  onShowBeamsToggle: () => void;
  showLabels: boolean;
  onShowLabelsToggle: () => void;
  replayMode?: boolean;
  onReplayToggle?: () => void;
  showSinrChart?: boolean;
  onShowSinrChartToggle?: () => void;
  showHoLog?: boolean;
  onShowHoLogToggle?: () => void;
  showSinrCdf?: boolean;
  onShowSinrCdfToggle?: () => void;
  showElevScatter?: boolean;
  onShowElevScatterToggle?: () => void;
  onExportKpi?: () => void;
  onOpenBatchKpi?: () => void;
  hoTypeOverride?: HandoverType | null;
  onHoTypeOverrideChange?: (type: HandoverType | null) => void;
  /** Current active profile ID (spec §10 tier-based selector). */
  profileId?: string;
  /** Callback to switch profile (profile change reloads the simulation). */
  onProfileChange?: (profileId: string) => void;
}

// ---------------------------------------------------------------------------
// Profile tier groups (simulator-parameter-spec.md §0 Mode Classification)
// ---------------------------------------------------------------------------
//
// Realistic: paper/standard-backed defaults; safe for thesis comparison tables.
// Advanced:  valid secondary settings from papers; requires explicit justification.
// Sensitivity: reproduction targets & parameter sweeps for analysis.
// Internal-only: not listed here — kept in runtime only, never exposed in UI.

const PROFILE_OPTIONS: Array<{ value: string; label: string; tier: 'Realistic' | 'Advanced' | 'Sensitivity' }> = [
  // --- Realistic ---
  { value: 'realistic-first-screen', label: 'Realistic — Ka 20 GHz, A3 HO (spec §10)', tier: 'Realistic' },
  // --- Advanced ---
  { value: 'case9-access-baseline',     label: 'Advanced — Case-9 Access (S-band A4)',     tier: 'Advanced' },
  { value: 'hobs-multibeam-baseline',   label: 'Advanced — HOBS Multi-Beam (Ka 28 GHz)',   tier: 'Advanced' },
  { value: 'bh-resource-baseline',      label: 'Advanced — BH Resource (Ka 20 GHz)',       tier: 'Advanced' },
  { value: 'case9-daps-baseline',       label: 'Advanced — DAPS Dual-Active',              tier: 'Advanced' },
  { value: 'real-trace-validation',     label: 'Advanced — Real-Trace (TLE/SGP4)',         tier: 'Advanced' },
  { value: 'meo-constellation-baseline',label: 'Advanced — MEO Constellation',            tier: 'Advanced' },
  { value: 'geo-relay-baseline',        label: 'Advanced — GEO Relay',                    tier: 'Advanced' },
  // --- Sensitivity / Reproduction ---
  { value: 'sinr-elevation-reproduction', label: 'Sensitivity — SINR-Elevation Repro',   tier: 'Sensitivity' },
  { value: 'hobs-reproduction',           label: 'Sensitivity — HOBS Repro',              tier: 'Sensitivity' },
  { value: 'timer-cho-reproduction',      label: 'Sensitivity — Timer-CHO Repro',         tier: 'Sensitivity' },
  { value: 'bh-pf-baseline',             label: 'Sensitivity — BH Proportional-Fair',    tier: 'Sensitivity' },
  { value: 'bh-sinr-greedy-baseline',    label: 'Sensitivity — BH SINR-Greedy',          tier: 'Sensitivity' },
  { value: 'bh-resource-energy-proof',   label: 'Sensitivity — BH Energy Proof',         tier: 'Sensitivity' },
];

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
  paused,
  onPauseToggle,
  showBeams,
  onShowBeamsToggle,
  showLabels,
  onShowLabelsToggle,
  replayMode = false,
  onReplayToggle,
  showSinrChart = true,
  onShowSinrChartToggle,
  showHoLog = false,
  onShowHoLogToggle,
  showSinrCdf = false,
  onShowSinrCdfToggle,
  showElevScatter = false,
  onShowElevScatterToggle,
  onExportKpi,
  onOpenBatchKpi,
  hoTypeOverride = null,
  onHoTypeOverrideChange,
  profileId,
  onProfileChange,
}: ControlPanelProps) {
  const handleHoTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onHoTypeOverrideChange?.(val === '' ? null : val as HandoverType);
  }, [onHoTypeOverrideChange]);

  const handleProfileChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onProfileChange?.(e.target.value);
  }, [onProfileChange]);

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
    <div style={containerStyle} data-testid="control-panel">
      <div style={titleStyle}>NTN-SIM-CORE</div>
      <div style={separatorStyle}>{'─'.repeat(36)}</div>

      {/* Profile selector (spec §10 Realistic/Advanced/Sensitivity tiers) */}
      {onProfileChange && (
        <div style={rowStyle}>
          <span style={labelStyle}>Profile:</span>
          <select
            data-testid="profile-select"
            value={profileId ?? 'realistic-first-screen'}
            onChange={handleProfileChange}
            style={{ ...selectStyle, maxWidth: 220 }}
            title="Select simulation scenario. Realistic = paper/standard-backed defaults. Advanced = valid secondary settings. Sensitivity = reproduction / sweep targets."
          >
            {(['Realistic', 'Advanced', 'Sensitivity'] as const).map((tier) => (
              <optgroup key={tier} label={`── ${tier} ──`}>
                {PROFILE_OPTIONS.filter((o) => o.tier === tier).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      {/* HO Strategy override
          Realistic: A3 (profile default for realistic-first-screen), A4
          Advanced:  CHO, Timer-CHO, MC-HO, DAPS, Hard-HO
          Per spec H8: A3/A4 = Realistic; CHO/Timer-CHO/MC-HO/DAPS = Advanced */}
      {onHoTypeOverrideChange && (
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
      </div>

      {/* Play / Pause */}
      <div style={rowStyle}>
        <button style={btnBase} onClick={onPauseToggle}>
          {paused ? '\u25B6 Play' : '\u23F8 Pause'}
        </button>
      </div>

      {/* Toggles */}
      <div style={{ ...rowStyle, gap: 16 }}>
        <label style={checkboxLabelStyle}>
          <input
            data-testid="toggle-show-beams"
            type="checkbox"
            checked={showBeams}
            onChange={onShowBeamsToggle}
          />
          Show Beams
        </label>
        <label style={checkboxLabelStyle}>
          <input
            data-testid="toggle-show-labels"
            type="checkbox"
            checked={showLabels}
            onChange={onShowLabelsToggle}
          />
          Show Labels
        </label>
        {onShowSinrChartToggle && (
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
        {onShowHoLogToggle && (
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
        {onShowSinrCdfToggle && (
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
        {onShowElevScatterToggle && (
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

      {/* Replay mode */}
      {onReplayToggle && (
        <div style={rowStyle}>
          <button
            data-testid="toggle-replay-mode"
            style={replayMode ? btnActive : btnBase}
            onClick={onReplayToggle}
            title="Pre-record entire run then replay (deterministic)"
          >
            {replayMode ? '⏺ Replay ON' : '⏺ Replay OFF'}
          </button>
        </div>
      )}

      {/* KPI Export + Batch */}
      {(onExportKpi || onOpenBatchKpi) && (
        <div style={rowStyle}>
          {onExportKpi && (
            <button
              data-testid="export-kpi"
              style={btnBase}
              onClick={onExportKpi}
              title="Export current KPI as JSON + CSV"
            >
              Export KPI
            </button>
          )}
          {onOpenBatchKpi && (
            <button
              data-testid="open-batch-kpi"
              style={btnBase}
              onClick={onOpenBatchKpi}
              title="Run all profiles and compare KPIs"
            >
              Batch KPI
            </button>
          )}
        </div>
      )}
    </div>
  );
});
