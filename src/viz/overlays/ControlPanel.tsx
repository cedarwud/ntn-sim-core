/**
 * ControlPanel — Interactive HTML overlay for simulation controls.
 *
 * Rendered OUTSIDE the R3F Canvas. Uses pointer-events: auto
 * so users can interact with controls.
 */

import React from 'react';

export interface ControlPanelProps {
  profileId: string;
  onProfileChange: (id: string) => void;
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
}

const PROFILES = [
  'case9-access-baseline',
  'hobs-multibeam-baseline',
  'bh-resource-baseline',
  'real-trace-validation',
  'case9-daps-baseline',
] as const;

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

const selectStyle: React.CSSProperties = {
  background: '#111',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 4,
  padding: '2px 6px',
  fontFamily: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
  outline: 'none',
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
  profileId,
  onProfileChange,
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
}: ControlPanelProps) {
  return (
    <div style={containerStyle}>
      <div style={titleStyle}>NTN-SIM-CORE Controls</div>
      <div style={separatorStyle}>{'─'.repeat(36)}</div>

      {/* Profile selector */}
      <div style={rowStyle}>
        <span style={labelStyle}>Profile:</span>
        <select
          style={selectStyle}
          value={profileId}
          onChange={(e) => onProfileChange(e.target.value)}
        >
          {PROFILES.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>

      {/* Speed buttons */}
      <div style={rowStyle}>
        <span style={labelStyle}>Speed:</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
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
            type="checkbox"
            checked={showBeams}
            onChange={onShowBeamsToggle}
          />
          Show Beams
        </label>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={onShowLabelsToggle}
          />
          Show Labels
        </label>
      </div>

      {/* Replay mode */}
      {onReplayToggle && (
        <div style={rowStyle}>
          <button
            style={replayMode ? btnActive : btnBase}
            onClick={onReplayToggle}
            title="Pre-record entire run then replay (deterministic)"
          >
            {replayMode ? '⏺ Replay ON' : '⏺ Replay OFF'}
          </button>
        </div>
      )}
    </div>
  );
});
