import React from 'react';

import { useValidationStore } from '@/viz/validation/store';

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  zIndex: 11,
  minWidth: 260,
  padding: '10px 12px',
  borderRadius: 6,
  background: 'rgba(14, 18, 26, 0.86)',
  color: '#dde8f0',
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  fontSize: 12,
  lineHeight: 1.5,
  pointerEvents: 'none',
  backdropFilter: 'blur(4px)',
};

const titleStyle: React.CSSProperties = {
  color: '#8dd6ff',
  fontWeight: 700,
  marginBottom: 6,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
};

const countStyle: React.CSSProperties = {
  color: '#ffffff',
  fontWeight: 700,
};

export const BhExplainabilityPanel = React.memo(function BhExplainabilityPanel() {
  const state = useValidationStore();
  const runtime = state.runtime;
  const fixed = state.earthFixedCellLayer;
  const isBhProfile = (runtime?.profileId ?? '').startsWith('bh-');
  const lowSinrUeCount = runtime?.lowSinrUeCount ?? 0;
  const lowSinrThresholdDb = runtime?.lowSinrThresholdDb ?? 5;
  const [observedLowSinrUeCount, setObservedLowSinrUeCount] = React.useState(0);

  React.useEffect(() => {
    if (!isBhProfile) {
      setObservedLowSinrUeCount(0);
      return;
    }
    setObservedLowSinrUeCount((prev) => Math.max(prev, lowSinrUeCount));
  }, [isBhProfile, lowSinrUeCount]);

  if (!isBhProfile) return null;

  const currentStateCounts = fixed?.stateCounts ?? {
    served: 0,
    interfered: 0,
    energyBlocked: 0,
    inactiveBeam: 0,
    noCoverage: 0,
  };
  const observedStateCounts = fixed?.observedStateCounts ?? {
    served: 0,
    interfered: 0,
    energyBlocked: 0,
    inactiveBeam: 0,
    noCoverage: 0,
  };

  return (
    <div
      data-testid="bh-explainability-panel"
      data-present={String(Boolean(fixed?.present))}
      data-low-sinr-ue-count={lowSinrUeCount}
      data-low-sinr-threshold-db={lowSinrThresholdDb}
      data-inactive-beam-count={currentStateCounts.inactiveBeam}
      data-energy-blocked-count={currentStateCounts.energyBlocked}
      data-interfered-count={currentStateCounts.interfered}
      data-no-coverage-count={currentStateCounts.noCoverage}
      data-observed-low-sinr-ue-count={observedLowSinrUeCount}
      data-observed-inactive-beam-count={observedStateCounts.inactiveBeam}
      data-observed-energy-blocked-count={observedStateCounts.energyBlocked}
      style={containerStyle}
    >
      <div style={titleStyle}>BH Explainability</div>
      <div style={rowStyle}>
        <span>low-SINR UE (&lt; {lowSinrThresholdDb} dB)</span>
        <span style={countStyle}>{lowSinrUeCount} / {observedLowSinrUeCount}</span>
      </div>
      <div style={rowStyle}>
        <span>inactive-beam cells</span>
        <span style={countStyle}>{currentStateCounts.inactiveBeam} / {observedStateCounts.inactiveBeam}</span>
      </div>
      <div style={rowStyle}>
        <span>energy-blocked cells</span>
        <span style={countStyle}>{currentStateCounts.energyBlocked} / {observedStateCounts.energyBlocked}</span>
      </div>
      <div style={rowStyle}>
        <span>interfered cells</span>
        <span style={countStyle}>{currentStateCounts.interfered} / {observedStateCounts.interfered}</span>
      </div>
      <div style={rowStyle}>
        <span>no-coverage cells</span>
        <span style={countStyle}>{currentStateCounts.noCoverage} / {observedStateCounts.noCoverage}</span>
      </div>
    </div>
  );
});
