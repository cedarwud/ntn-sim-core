import React from 'react';
import type { SimulationSnapshot, HoExplanation } from '@/core/contracts/runtime-v1';

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function sinrColor(sinrDb: number): string {
  if (sinrDb >= 20) return '#00ff00';
  if (sinrDb >= 10) return '#aaff00';
  if (sinrDb >= 5) return '#ffaa00';
  return '#ff4444';
}

function deltaColor(deltaDb: number | null, offsetDb: number): string {
  if (deltaDb === null) return '#7f8896';
  if (deltaDb >= offsetDb) return '#00ff88';
  if (deltaDb >= 0) return '#ffd84a';
  return '#ff7d7d';
}

function fmt(v: number | null, suffix: string, decimals = 1): string {
  if (v === null || !Number.isFinite(v)) return '\u2014';
  return `${v.toFixed(decimals)} ${suffix}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SatCard({ title, borderColor, bgFrom, bgTo, satId, beamId, sinrDb, elevationDeg, rangeKm }: {
  title: string;
  borderColor: string;
  bgFrom: string;
  bgTo: string;
  satId: string | null;
  beamId: string | null;
  sinrDb: number | null;
  elevationDeg: number | null;
  rangeKm: number | null;
}) {
  const hasSig = satId !== null;
  return (
    <div style={{
      padding: '8px 10px',
      background: `linear-gradient(180deg, ${bgFrom}, ${bgTo})`,
      borderRadius: 8,
      borderLeft: `4px solid ${borderColor}`,
    }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#fff', marginBottom: 2 }}>
        {hasSig ? `${satId}` : 'none'}
        {beamId ? ` B${beamId}` : ''}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: hasSig && sinrDb !== null ? sinrColor(sinrDb) : '#fff' }}>
        {fmt(hasSig ? sinrDb : null, 'dB')}
      </div>
      <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 1 }}>Elev</div>
          <div style={{ color: '#fff', fontWeight: 600 }}>{fmt(hasSig ? elevationDeg : null, '\u00b0')}</div>
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 1 }}>Range</div>
          <div style={{ color: '#fff', fontWeight: 600 }}>{fmt(hasSig ? rangeKm : null, 'km', 0)}</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  zIndex: 11,
  width: 260,
  padding: '12px 14px',
  borderRadius: 10,
  background: 'rgba(3, 10, 18, 0.86)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(126, 167, 214, 0.2)',
  color: '#dde8f0',
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  fontSize: 12,
  lineHeight: 1.4,
  pointerEvents: 'none',
};

export const HandoverExplainabilityPanel = React.memo(function HandoverExplainabilityPanel({
  snapshot,
}: {
  snapshot: SimulationSnapshot | null;
}) {
  const ho: HoExplanation | undefined = snapshot?.hoExplanation;
  if (!ho) return null;

  const triggerRatio = ho.triggerThresholdSec > 0
    ? Math.min(ho.triggerProgressSec / ho.triggerThresholdSec, 1)
    : 0;

  return (
    <div style={containerStyle} data-testid="ho-explainability-panel">
      <div style={{ display: 'grid', gap: 8 }}>
        <SatCard
          title="SERVING"
          borderColor="#38b6ff"
          bgFrom="rgba(0,136,255,0.45)"
          bgTo="rgba(0,136,255,0.2)"
          satId={snapshot?.ues[0]?.servingSatId ?? null}
          beamId={snapshot?.ues[0]?.servingBeamId ?? null}
          sinrDb={ho.servingSinrDb}
          elevationDeg={ho.servingElevationDeg}
          rangeKm={ho.servingRangeKm}
        />
        <SatCard
          title={ho.triggerProgressSec > 0 ? 'PENDING TARGET' : 'BEST CANDIDATE'}
          borderColor="#ffb000"
          bgFrom="rgba(255,176,0,0.45)"
          bgTo="rgba(255,176,0,0.2)"
          satId={ho.pendingTargetSatId}
          beamId={ho.pendingTargetBeamId}
          sinrDb={ho.pendingTargetSinrDb}
          elevationDeg={ho.pendingTargetElevationDeg}
          rangeKm={ho.pendingTargetRangeKm}
        />
      </div>

      {/* SINR Delta + Offset */}
      <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>SINR Delta</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: deltaColor(ho.sinrDeltaDb, ho.handoverOffsetDb) }}>
              {ho.sinrDeltaDb !== null ? `${ho.sinrDeltaDb >= 0 ? '+' : ''}${ho.sinrDeltaDb.toFixed(1)} dB` : '\u2014'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Offset</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
              +{ho.handoverOffsetDb.toFixed(1)} dB
            </div>
          </div>
        </div>

        {/* Trigger progress bar */}
        <div style={{ fontSize: 11, color: '#fff', marginBottom: 4 }}>
          Trigger: {ho.triggerProgressSec.toFixed(1)} / {ho.triggerThresholdSec.toFixed(1)} s
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            width: `${triggerRatio * 100}%`,
            height: '100%',
            background: ho.sinrDeltaDb !== null && ho.sinrDeltaDb >= ho.handoverOffsetDb ? '#00ff88' : '#4f8cff',
            borderRadius: 999,
            transition: 'width 120ms linear',
          }} />
        </div>
      </div>

      {/* HO count */}
      <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>
        HO Count: <span style={{ color: '#fff', fontWeight: 700 }}>{ho.hoCount}</span>
      </div>
    </div>
  );
});
