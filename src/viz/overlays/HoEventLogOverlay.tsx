/**
 * HO Event Log Overlay — scrollable table of handover events.
 *
 * Accumulates HoLogEntry items from each snapshot tick and displays
 * a fixed-height scrollable log: time | type | source → target | SINR | int.ms
 *
 * HO events are infrequent (< 1/tick), so full React re-render is acceptable.
 * This file must not import Three.js or R3F code.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { SimulationSnapshot, HoLogEntry } from '@/core/common/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HoEventLogOverlayProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
  /** Max rows to keep in the log. Default 200. */
  maxRows?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_META: Record<string, { label: string; color: string }> = {
  'ho-complete':    { label: 'HO ✓',  color: '#00ff88' },
  'ho-fail':        { label: 'HO ✗',  color: '#ff4444' },
  'cho-execute':    { label: 'CHO',   color: '#00d4ff' },
  'mc-ho-dual-end': { label: 'MC-HO', color: '#aaffaa' },
  'rlf-declared':   { label: 'RLF',   color: '#ff8800' },
};

function shortSatId(id: string | null): string {
  if (!id) return '—';
  const m = id.match(/P\d+-S\d+$/);
  if (m) return m[0];
  const parts = id.split('-');
  return parts.length >= 2 ? parts.slice(-2).join('-') : id;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 10,
  width: 480,
  pointerEvents: 'auto',
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  fontSize: 11,
  color: '#e0e0e0',
  background: 'rgba(26, 26, 46, 0.88)',
  borderRadius: 6,
  backdropFilter: 'blur(4px)',
  userSelect: 'none',
  overflow: 'hidden',
};

const titleBarStyle: React.CSSProperties = {
  color: '#00d4ff',
  fontWeight: 700,
  fontSize: 12,
  padding: '8px 12px 4px',
  borderBottom: '1px solid #333',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const scrollBodyStyle: React.CSSProperties = {
  maxHeight: 220,
  overflowY: 'auto',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 11,
};

const thStyle: React.CSSProperties = {
  color: '#888',
  fontWeight: 400,
  fontSize: 10,
  padding: '3px 8px',
  textAlign: 'left' as const,
  borderBottom: '1px solid #2a2a3a',
  whiteSpace: 'nowrap' as const,
  position: 'sticky' as const,
  top: 0,
  background: 'rgba(26, 26, 46, 0.95)',
};

const tdBase: React.CSSProperties = {
  padding: '2px 8px',
  borderBottom: '1px solid #1e1e2e',
  whiteSpace: 'nowrap' as const,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const HoEventLogOverlay: React.FC<HoEventLogOverlayProps> = React.memo(({
  snapshot,
  visible = true,
  maxRows = 200,
}) => {
  const [log, setLog] = useState<HoLogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!snapshot?.recentHoEvents?.length) return;
    setLog((prev) => {
      const next = [...snapshot.recentHoEvents!, ...prev];
      return next.length > maxRows ? next.slice(0, maxRows) : next;
    });
  }, [snapshot, maxRows]);

  // Auto-scroll to top when new events arrive (newest-first layout)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [log]);

  if (!visible) return null;

  return (
    <div style={containerStyle} data-testid="ho-event-log">
      <div style={titleBarStyle}>
        <span>HO Event Log</span>
        <span style={{ color: '#555', fontWeight: 400 }}>{log.length} events</span>
      </div>
      <div style={scrollBodyStyle} ref={scrollRef}>
        {log.length === 0 ? (
          <div style={{ color: '#555', padding: '10px 12px' }}>No handover events yet.</div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Target</th>
                <th style={thStyle}>SINR</th>
                <th style={thStyle}>Int.</th>
              </tr>
            </thead>
            <tbody>
              {log.map((entry, i) => {
                const meta = TYPE_META[entry.type] ?? { label: entry.type, color: '#aaa' };
                const sinrColor = entry.sinrDb !== null
                  ? (entry.sinrDb < 0 ? '#ff8800' : entry.sinrDb < 5 ? '#ffaa00' : '#88ff88')
                  : '#666';
                return (
                  <tr key={i}>
                    <td style={{ ...tdBase, color: '#aaa' }}>{entry.timeSec.toFixed(1)}s</td>
                    <td style={{ ...tdBase, color: meta.color, fontWeight: 700 }}>{meta.label}</td>
                    <td style={{ ...tdBase, color: '#bbb' }}>{shortSatId(entry.sourceSatId)}</td>
                    <td style={{ ...tdBase, color: '#bbb' }}>{shortSatId(entry.targetSatId)}</td>
                    <td style={{ ...tdBase, color: sinrColor }}>
                      {entry.sinrDb !== null ? `${entry.sinrDb.toFixed(1)} dB` : '—'}
                    </td>
                    <td style={{ ...tdBase, color: '#aaa' }}>
                      {entry.interruptionMs !== null ? `${entry.interruptionMs.toFixed(0)} ms` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});

HoEventLogOverlay.displayName = 'HoEventLogOverlay';
export default HoEventLogOverlay;
