import React, { useMemo } from 'react';
import { getParameterView } from '@/core/contracts/exposure-v1';

export interface ParameterPanelProps {
  profileId: string;
  visible: boolean;
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  bottom: 198,
  width: 'min(360px, calc(100vw - 32px))',
  maxHeight: 'min(44vh, 420px)',
  backgroundColor: 'rgba(26, 26, 46, 0.85)',
  border: '1px solid #444',
  borderRadius: 6,
  padding: '12px 16px',
  color: '#e0e0e0',
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  fontSize: 12,
  overflowY: 'auto',
  zIndex: 10,
  backdropFilter: 'blur(4px)',
  pointerEvents: 'auto',
};

const titleStyle: React.CSSProperties = {
  color: '#00d4ff',
  fontWeight: 700,
  marginBottom: 8,
  fontSize: 13,
  textTransform: 'uppercase',
};

const tierHeaderStyle: React.CSSProperties = {
  color: '#888',
  fontSize: 10,
  marginTop: 12,
  marginBottom: 4,
  borderBottom: '1px solid #333',
  paddingBottom: 2,
};

const paramRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 8,
  marginBottom: 8,
  alignItems: 'start',
};

const paramLabelStyle: React.CSSProperties = {
  color: '#aaa',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const paramValueStyle: React.CSSProperties = {
  color: '#f3f7fb',
  textAlign: 'right',
  fontWeight: 500,
};

const metaTextStyle: React.CSSProperties = {
  color: '#6e7a88',
  fontSize: 10,
};

function formatValue(value: string | number | boolean, unit?: string): string {
  if (typeof value === 'string') {
    return value;
  }
  return unit ? `${value} ${unit}` : String(value);
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({ profileId, visible }) => {
  const data = useMemo(() => getParameterView(profileId), [profileId]);

  if (!visible) return null;

  const grouped = {
    Realistic: data.parameters.filter(p => p.specMode === 'Realistic'),
    Advanced: data.parameters.filter(p => p.specMode === 'Advanced'),
    Sensitivity: data.parameters.filter(p => p.specMode === 'Sensitivity'),
  };

  return (
    <div style={containerStyle} data-testid="parameter-panel">
      <div style={titleStyle}>Profile Parameters</div>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>
        Secondary panel. Registry-backed, read-only exposure. Internal-only fields stay hidden.
      </div>

      {(['Realistic', 'Advanced', 'Sensitivity'] as const).map(tier => {
        const params = grouped[tier];
        if (params.length === 0) return null;

        return (
          <div key={tier}>
            <div style={tierHeaderStyle}>{tier}</div>
            {params.map(p => (
              <div key={p.parameterId} style={paramRowStyle} title={`${p.parameterId}: ${p.value}`}>
                <div>
                  <div style={paramLabelStyle}>{p.parameterId}</div>
                  <div style={metaTextStyle}>{p.sourceId ?? 'registry-binding'}</div>
                </div>
                <span style={paramValueStyle}>{formatValue(p.value, p.unit)}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
