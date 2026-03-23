/**
 * SimHud — HTML overlay showing simulation statistics.
 *
 * Rendered OUTSIDE the R3F Canvas. Uses pointer-events: none
 * so it never blocks 3D interaction.
 */

import React from 'react';

export interface SimHudProps {
  simTimeSec: number;
  totalDurationSec: number;
  satelliteCount: number;
  visibleCount: number;
  servingSatId: string | null;
  handoverCount: number;
  profileId: string;
  isReady: boolean;
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  zIndex: 10,
  pointerEvents: 'none',
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  fontSize: 13,
  lineHeight: 1.6,
  color: '#e0e0e0',
  background: 'rgba(0, 0, 0, 0.65)',
  borderRadius: 6,
  padding: '12px 16px',
  backdropFilter: 'blur(4px)',
  userSelect: 'none',
  minWidth: 280,
};

const titleStyle: React.CSSProperties = {
  color: '#4fc3f7',
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
};

export const SimHud = React.memo(function SimHud({
  simTimeSec,
  totalDurationSec,
  satelliteCount,
  visibleCount,
  servingSatId,
  handoverCount,
  profileId,
  isReady,
}: SimHudProps) {
  if (!isReady) return null;

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>
        NTN-SIM-CORE{' '}
        <span style={{ color: '#888', fontWeight: 400 }}>| {profileId}</span>
      </div>
      <div style={separatorStyle}>{'─'.repeat(36)}</div>
      <div>
        <span style={labelStyle}>Time: </span>
        {simTimeSec.toFixed(1)}s / {totalDurationSec}s
      </div>
      <div>
        <span style={labelStyle}>Satellites: </span>
        {visibleCount} visible / {satelliteCount} total
      </div>
      <div>
        <span style={labelStyle}>Serving: </span>
        {servingSatId ?? '—'}
      </div>
      <div>
        <span style={labelStyle}>Handovers: </span>
        {handoverCount}
      </div>
    </div>
  );
});
