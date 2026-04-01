import React from 'react';
import { ModqnViewModel } from '@/viz/view-models/modqn-view-model';

export interface ModqnResultOverlayProps {
  viewModel: ModqnViewModel | null;
  loading: boolean;
  onClose: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: '900px',
  maxHeight: '85vh',
  backgroundColor: 'rgba(13, 13, 33, 0.95)',
  border: '1px solid #00d4ff',
  borderRadius: '8px',
  color: '#e0e0e0',
  padding: '24px',
  zIndex: 100,
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  overflowY: 'auto',
  boxShadow: '0 0 30px rgba(0, 212, 255, 0.2)',
  pointerEvents: 'auto',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
  borderBottom: '1px solid #333',
  paddingBottom: '12px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#00d4ff',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  marginBottom: '12px',
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const constraintBoxStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 165, 0, 0.1)',
  borderLeft: '4px solid #ffa500',
  padding: '12px 16px',
  marginBottom: '24px',
  fontSize: '12px',
  lineHeight: '1.6',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '24px',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px',
  borderBottom: '1px solid #444',
  color: '#888',
  fontSize: '12px',
};

const tdStyle: React.CSSProperties = {
  padding: '10px',
  borderBottom: '1px solid #222',
  fontSize: '13px',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #444',
  color: '#888',
  cursor: 'pointer',
  padding: '4px 8px',
  fontSize: '12px',
};

export const ModqnResultOverlay: React.FC<ModqnResultOverlayProps> = ({ viewModel, loading, onClose }) => {
  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading MODQN Baseline Results...</div>
      </div>
    );
  }

  if (!viewModel) return null;

  const comparison = viewModel.getKpiComparison();
  const constraints = viewModel.getLimitations();
  const metadata = viewModel.getMetadata();

  return (
    <div style={overlayStyle} data-testid="modqn-result-overlay">
      <div style={headerStyle}>
        <div style={titleStyle}>MODQN Baseline Reproduction Viewer</div>
        <button style={closeButtonStyle} onClick={onClose}>[ESC] CLOSE</button>
      </div>

      <div style={constraintBoxStyle}>
        <div style={{ fontWeight: 700, marginBottom: '4px', color: '#ffa500' }}>Baseline Constraints Disclosed:</div>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {constraints.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </div>

      <div style={sectionTitleStyle}>KPI Comparison vs. Paper</div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Metric</th>
            <th style={thStyle}>Reproduction (Avg)</th>
            <th style={thStyle}>Paper Target</th>
          </tr>
        </thead>
        <tbody>
          {comparison.map((row, i) => (
            <tr key={i}>
              <td style={tdStyle}>{row.metric}</td>
              <td style={{ ...tdStyle, color: '#00d4ff' }}>{row.reproduction}</td>
              <td style={{ ...tdStyle, color: '#888' }}>{row.paperTarget ?? 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={sectionTitleStyle}>Training Summary</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#111', padding: '12px', borderRadius: '4px' }}>
          <div style={{ color: '#555', fontSize: '11px' }}>Episodes</div>
          <div style={{ fontSize: '18px' }}>{metadata.episodes}</div>
        </div>
        <div style={{ background: '#111', padding: '12px', borderRadius: '4px' }}>
          <div style={{ color: '#555', fontSize: '11px' }}>Paper ID</div>
          <div style={{ fontSize: '14px' }}>{metadata.paperId}</div>
        </div>
        <div style={{ background: '#111', padding: '12px', borderRadius: '4px' }}>
          <div style={{ color: '#555', fontSize: '11px' }}>Wall-clock</div>
          <div style={{ fontSize: '18px' }}>{metadata.wallClockSec}s</div>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: '#444', textAlign: 'right' }}>
        Reproduction Timestamp: {metadata.timestamp}
      </div>
    </div>
  );
};
