/**
 * Batch KPI Panel — runs multiple profiles headlessly and shows a comparison table.
 *
 * Accessible via ControlPanel button. Runs profiles sequentially in the browser,
 * shows progress, then displays a KPI comparison table with download options.
 *
 * This file must not import Three.js or R3F code.
 */

import React, { useCallback } from 'react';
import { useBatchKpi } from '@/app/hooks/useBatchKpi';
import type { BatchKpiEntry } from '@/app/hooks/useBatchKpi';
import type { KpiBundle } from '@/core/contracts/kpi-v1';

// ---------------------------------------------------------------------------
// Profiles to compare (the 3 synthetic families)
// ---------------------------------------------------------------------------

const BATCH_PROFILES = [
  'case9-access-baseline',
  'hobs-multibeam-baseline',
  'bh-resource-baseline',
  'bh-pf-baseline',
  'bh-sinr-greedy-baseline',
];

// ---------------------------------------------------------------------------
// KPI fields to display in the table
// ---------------------------------------------------------------------------

interface KpiField { key: keyof KpiBundle; label: string; fmt: (v: number) => string }

const KPI_FIELDS: KpiField[] = [
  { key: 'totalHandovers',            label: 'Total HOs',       fmt: (v) => v.toFixed(0) },
  { key: 'handoverFailures',          label: 'HO Failures',     fmt: (v) => v.toFixed(0) },
  { key: 'pingPongCount',             label: 'Ping-Pong',       fmt: (v) => v.toFixed(0) },
  { key: 'handoverRate',              label: 'HO Rate (/min)',  fmt: (v) => v.toFixed(2) },
  { key: 'meanHandoverInterruptionMs',label: 'Mean Int. (ms)',  fmt: (v) => v.toFixed(1) },
  { key: 'meanSinrDb',                label: 'Mean SINR (dB)',  fmt: (v) => v.toFixed(2) },
  { key: 'sinrPercentile5Db',         label: 'P5 SINR (dB)',   fmt: (v) => v.toFixed(2) },
  { key: 'sinrPercentile50Db',        label: 'P50 SINR (dB)',  fmt: (v) => v.toFixed(2) },
  { key: 'outageRatio',               label: 'Outage Ratio',   fmt: (v) => (v * 100).toFixed(2) + '%' },
  { key: 'meanThroughputMbps',        label: 'Mean Tput (Mbps)', fmt: (v) => v.toFixed(2) },
  { key: 'cellEdgeThroughputMbps',    label: 'Edge Tput (Mbps)', fmt: (v) => v.toFixed(2) },
  { key: 'serviceAvailability',       label: 'Availability',   fmt: (v) => (v * 100).toFixed(2) + '%' },
  { key: 'jainFairnessIndex',         label: 'Jain Fairness',  fmt: (v) => v.toFixed(4) },
];

// ---------------------------------------------------------------------------
// Download helpers
// ---------------------------------------------------------------------------

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildCsv(entries: BatchKpiEntry[]): string {
  const header = ['metric', ...entries.map((e) => e.profileId)].join(',');
  const rows = KPI_FIELDS.map(({ key, label }) => {
    const vals = entries.map((e) => e.kpi[key].toString());
    return [label, ...vals].join(',');
  });
  const meta = [
    ['wallClockMs', ...entries.map((e) => e.wallClockMs.toFixed(0))].join(','),
  ];
  return [header, ...rows, ...meta].join('\n');
}

function buildJson(entries: BatchKpiEntry[]): string {
  return JSON.stringify(
    entries.map((e) => ({ profileId: e.profileId, wallClockMs: e.wallClockMs, kpi: e.kpi })),
    null, 2,
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 20,
  background: 'rgba(20, 20, 36, 0.97)',
  border: '1px solid #333',
  borderRadius: 8,
  padding: '16px 20px',
  fontFamily: '"JetBrains Mono","Fira Code","Consolas",monospace',
  fontSize: 12,
  color: '#e0e0e0',
  backdropFilter: 'blur(6px)',
  minWidth: 560,
  maxWidth: '90vw',
  maxHeight: '80vh',
  overflowY: 'auto',
  pointerEvents: 'auto',
};

const titleStyle: React.CSSProperties = {
  color: '#00d4ff',
  fontWeight: 700,
  fontSize: 13,
  marginBottom: 10,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const btnStyle: React.CSSProperties = {
  background: '#00d4ff',
  color: '#1a1a2e',
  border: 'none',
  borderRadius: 4,
  padding: '3px 12px',
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const btnSecondaryStyle: React.CSSProperties = {
  background: '#222',
  color: '#aaa',
  border: '1px solid #444',
  borderRadius: 4,
  padding: '3px 10px',
  fontFamily: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 11,
  marginTop: 10,
};

const thStyle: React.CSSProperties = {
  color: '#00d4ff',
  fontWeight: 700,
  padding: '4px 10px',
  textAlign: 'left' as const,
  borderBottom: '1px solid #333',
  whiteSpace: 'nowrap' as const,
  background: 'rgba(20,20,36,0.95)',
  position: 'sticky' as const,
  top: 0,
};

const tdStyle: React.CSSProperties = {
  padding: '2px 10px',
  borderBottom: '1px solid #1e1e2e',
  whiteSpace: 'nowrap' as const,
};

const tdLabelStyle: React.CSSProperties = {
  ...tdStyle,
  color: '#888',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BatchKpiPanelProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BatchKpiPanel: React.FC<BatchKpiPanelProps> = React.memo(({ onClose }) => {
  const { status, progress, results, error, run, cancel } = useBatchKpi();

  const handleRun = useCallback(() => run(BATCH_PROFILES), [run]);

  const handleDownloadCsv = useCallback(() => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    downloadFile(`kpi-batch-${ts}.csv`, buildCsv(results), 'text/csv');
  }, [results]);

  const handleDownloadJson = useCallback(() => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    downloadFile(`kpi-batch-${ts}.json`, buildJson(results), 'application/json');
  }, [results]);

  return (
    <div style={overlayStyle} data-testid="batch-kpi-panel">
      <div style={titleStyle}>
        <span>Batch KPI Comparison</span>
        <button style={btnSecondaryStyle} onClick={onClose}>✕ close</button>
      </div>

      <div style={{ color: '#888', fontSize: 11, marginBottom: 10 }}>
        Profiles: {BATCH_PROFILES.join(' · ')}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        {status !== 'running' ? (
          <button style={btnStyle} onClick={handleRun}>
            {results.length > 0 ? '↺ Re-run' : '▶ Run All'}
          </button>
        ) : (
          <button style={{ ...btnSecondaryStyle, color: '#ff8800', borderColor: '#ff8800' }} onClick={cancel}>
            ■ Cancel
          </button>
        )}
        {results.length > 0 && status !== 'running' && (
          <>
            <button style={btnSecondaryStyle} onClick={handleDownloadCsv}>↓ CSV</button>
            <button style={btnSecondaryStyle} onClick={handleDownloadJson}>↓ JSON</button>
          </>
        )}
        {status === 'running' && (
          <span style={{ color: '#ffaa00', fontSize: 11 }}>Running {progress}…</span>
        )}
        {status === 'done' && (
          <span style={{ color: '#00ff88', fontSize: 11 }}>Done — {progress}</span>
        )}
        {error && <span style={{ color: '#ff4444', fontSize: 11 }}>{error}</span>}
      </div>

      {/* Results table */}
      {results.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Metric</th>
              {results.map((r) => (
                <th key={r.profileId} style={{ ...thStyle, color: '#e0e0e0' }}>
                  {r.profileId.replace(/-baseline$/, '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {KPI_FIELDS.map(({ key, label, fmt }) => (
              <tr key={key}>
                <td style={tdLabelStyle}>{label}</td>
                {results.map((r) => (
                  <td key={r.profileId} style={tdStyle}>{fmt(r.kpi[key])}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td style={tdLabelStyle}>Wall Clock (ms)</td>
              {results.map((r) => (
                <td key={r.profileId} style={{ ...tdStyle, color: '#888' }}>
                  {r.wallClockMs.toFixed(0)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
});

BatchKpiPanel.displayName = 'BatchKpiPanel';
