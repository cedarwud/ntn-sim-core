import React, { useMemo } from 'react';
import { useValidationStore } from '@/viz/validation/store';
import { loadProfile } from '@/core/profiles/loader';
import type { HandoverType } from '@/core/contracts/exposure-v1';
import type { HoExplanation, SatelliteState, SimulationSnapshot } from '@/core/contracts/runtime-v1';

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

function formatContinuityLabel(value: string | null | undefined): string {
  if (!value) return 'Single Active';
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatHoTypeLabel(value: HandoverType): string {
  switch (value) {
    case 'a3-event': return 'A3';
    case 'a4-event': return 'A4';
    case 'sinr-offset': return 'SINR Offset';
    case 'timer-cho': return 'Timer-CHO';
    case 'mc-ho': return 'MC-HO';
    case 'hard-ho': return 'Hard-HO';
    case 'cho': return 'CHO';
    case 'daps': return 'DAPS';
    default: return value;
  }
}

function buildSatMap(snapshot: SimulationSnapshot | null): Map<string, SatelliteState> {
  return new Map((snapshot?.satellites ?? []).map((sat) => [sat.id, sat]));
}

function buildLinkMetric({
  satId,
  beamId,
  sinrDb,
  elevationDeg,
  rangeKm,
  satMap,
}: {
  satId: string | null | undefined;
  beamId: string | null | undefined;
  sinrDb: number | null | undefined;
  elevationDeg: number | null | undefined;
  rangeKm: number | null | undefined;
  satMap: Map<string, SatelliteState>;
}) {
  const sat = satId ? satMap.get(satId) ?? null : null;
  return {
    satId: satId ?? null,
    beamId: beamId ?? null,
    sinrDb: sinrDb ?? null,
    elevationDeg: elevationDeg ?? sat?.elevationDeg ?? null,
    rangeKm: rangeKm ?? sat?.rangeKm ?? null,
  };
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

function InfoCell({ label, value, emphasize = false }: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginBottom: 2 }}>{label}</div>
      <div style={{ color: emphasize ? '#ffffff' : '#dfe8f3', fontSize: emphasize ? 13 : 12, fontWeight: emphasize ? 700 : 600 }}>
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 11,
  width: 'min(340px, calc(100vw - 32px))',
  padding: '14px 16px',
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
  profileId,
  handoverTypeOverride,
}: {
  snapshot: SimulationSnapshot | null;
  profileId: string;
  handoverTypeOverride?: HandoverType | null;
}) {
  const state = useValidationStore();
  const profile = useMemo(() => loadProfile(profileId), [profileId]);
  const activeHandoverType = handoverTypeOverride ?? profile.handover.type;
  const satMap = useMemo(() => buildSatMap(snapshot), [snapshot]);
  const primaryUe = snapshot?.ues[0] ?? null;
  const ho: HoExplanation | undefined = snapshot?.hoExplanation;
  const continuity = primaryUe?.continuityState ?? snapshot?.daps?.phase ?? null;
  const isBhProfile = profileId.startsWith('bh-');
  const runtime = state.runtime;
  const fixed = state.earthFixedCellLayer;
  const showBhSummary = isBhProfile && runtime?.profileId === profileId;

  if (!primaryUe) return null;

  const serving = buildLinkMetric({
    satId: primaryUe.servingSatId,
    beamId: primaryUe.servingBeamId,
    sinrDb: primaryUe.sinrDb,
    elevationDeg: ho?.servingElevationDeg,
    rangeKm: ho?.servingRangeKm,
    satMap,
  });
  const pendingTargetSatId = ho?.pendingTargetSatId ?? primaryUe.targetSatId ?? snapshot?.daps?.targetSatId ?? null;
  const pendingTargetBeamId = ho?.pendingTargetBeamId ?? primaryUe.targetBeamId ?? null;
  const target = pendingTargetSatId
    ? buildLinkMetric({
      satId: pendingTargetSatId,
      beamId: pendingTargetBeamId,
      sinrDb: ho?.pendingTargetSinrDb,
      elevationDeg: ho?.pendingTargetElevationDeg,
      rangeKm: ho?.pendingTargetRangeKm,
      satMap,
    })
    : null;
  const secondary = primaryUe.secondarySatId && primaryUe.secondarySatId !== pendingTargetSatId
    ? buildLinkMetric({
      satId: primaryUe.secondarySatId,
      beamId: primaryUe.secondaryBeamId,
      sinrDb: null,
      elevationDeg: undefined,
      rangeKm: undefined,
      satMap,
    })
    : null;

  const triggerRatio = ho && ho.triggerThresholdSec > 0
    ? Math.min(ho.triggerProgressSec / ho.triggerThresholdSec, 1)
    : 0;
  const showSinrTrigger = activeHandoverType === 'sinr-offset' && Boolean(ho);
  const dataModeLabel = profile.orbitMode === 'real-trace'
    ? 'Real-trace geometry + model-based SINR'
    : 'Synthetic geometry + model-based SINR';
  const bhCounts = fixed?.stateCounts ?? {
    served: 0,
    interfered: 0,
    energyBlocked: 0,
    inactiveBeam: 0,
    noCoverage: 0,
  };

  return (
    <div style={containerStyle} data-testid="ho-explainability-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: '#8dd6ff', fontWeight: 700, letterSpacing: 0.5 }}>CURRENT LINK</div>
          <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(221,232,240,0.68)' }}>
            {dataModeLabel}
          </div>
        </div>
        <div style={{
          padding: '4px 8px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
          color: '#ffffff',
          fontSize: 10,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          {formatContinuityLabel(continuity)}
        </div>
      </div>

      <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginBottom: 2 }}>Primary SINR</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: serving.sinrDb !== null ? sinrColor(serving.sinrDb) : '#ffffff' }}>
              {fmt(serving.sinrDb, 'dB')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginBottom: 2 }}>HO Mode</div>
            <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 700 }}>
              {formatHoTypeLabel(activeHandoverType)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <InfoCell label="Serving Sat" value={serving.satId ?? 'none'} emphasize />
          <InfoCell label="Serving Beam" value={serving.beamId ? `B${serving.beamId}` : '—'} />
          <InfoCell label="Elevation" value={fmt(serving.elevationDeg, '°')} />
          <InfoCell label="Range" value={fmt(serving.rangeKm, 'km', 0)} />
        </div>
      </div>

      {(target || secondary) && (
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          {target && (
            <SatCard
              title={showSinrTrigger && ho?.triggerProgressSec ? 'PENDING TARGET' : 'TARGET / BEST CANDIDATE'}
              borderColor="#ffb000"
              bgFrom="rgba(255,176,0,0.38)"
              bgTo="rgba(255,176,0,0.16)"
              satId={target.satId}
              beamId={target.beamId}
              sinrDb={target.sinrDb}
              elevationDeg={target.elevationDeg}
              rangeKm={target.rangeKm}
            />
          )}
          {secondary && (
            <SatCard
              title="SECONDARY LINK"
              borderColor="#00d7ff"
              bgFrom="rgba(0,215,255,0.32)"
              bgTo="rgba(0,215,255,0.14)"
              satId={secondary.satId}
              beamId={secondary.beamId}
              sinrDb={secondary.sinrDb}
              elevationDeg={secondary.elevationDeg}
              rangeKm={secondary.rangeKm}
            />
          )}
        </div>
      )}

      {showSinrTrigger && ho && (
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
      )}

      {showBhSummary && (
        <div
          style={{ marginTop: 10, padding: '9px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}
          data-testid="bh-summary-section"
        >
          <div style={{ color: '#8dd6ff', fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>
            BH SUMMARY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <InfoCell
              label={`Low-SINR UE (< ${runtime?.lowSinrThresholdDb ?? 5} dB)`}
              value={String(runtime?.lowSinrUeCount ?? 0)}
              emphasize
            />
            <InfoCell label="Served Cells" value={String(bhCounts.served)} />
            <InfoCell label="Inactive Cells" value={String(bhCounts.inactiveBeam)} />
            <InfoCell label="Blocked Cells" value={String(bhCounts.energyBlocked)} />
            <InfoCell label="Interfered Cells" value={String(bhCounts.interfered)} />
            <InfoCell label="No-Coverage" value={String(bhCounts.noCoverage)} />
          </div>
        </div>
      )}
    </div>
  );
});
