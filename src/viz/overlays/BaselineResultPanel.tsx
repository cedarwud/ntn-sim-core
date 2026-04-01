import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  getProfileList,
  type HandoverType,
  type ProfileListEntry,
} from '@/core/contracts/exposure-v1';
import { useBenchmarkResult } from '@/app/hooks/useBenchmarkResult';
import { useModqnReproduction } from '@/app/hooks/useModqnReproduction';
import {
  projectKpiBundleToCards,
  projectKpiBundleToSections,
} from '@/viz/view-models/kpi-bundle-projectors';

interface BaselineResultPanelProps {
  readonly profileId: string;
  readonly handoverTypeOverride?: HandoverType | null;
  readonly onClose: () => void;
}

const PROFILE_LIST = getProfileList();
const PROFILE_LOOKUP = new Map(PROFILE_LIST.map((entry) => [entry.id, entry] as const));
const U2_COMPARISON_EXCLUDED_FAMILIES = new Set<ProfileListEntry['family']>([
  'hobs-multibeam-baseline',
  'bh-resource-baseline',
]);

function isU2ComparisonEligible(entry: ProfileListEntry): boolean {
  return entry.tier !== 'Sensitivity' && !U2_COMPARISON_EXCLUDED_FAMILIES.has(entry.family);
}

const U2_COMPARISON_PROFILE_LIST = PROFILE_LIST.filter(isU2ComparisonEligible);

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 20,
  width: 'min(1200px, 96vw)',
  maxHeight: '85vh',
  overflowY: 'auto',
  padding: '18px 20px',
  borderRadius: 10,
  border: '1px solid rgba(88, 118, 146, 0.45)',
  background:
    'linear-gradient(180deg, rgba(12, 18, 28, 0.98) 0%, rgba(10, 13, 20, 0.98) 100%)',
  boxShadow: '0 22px 60px rgba(0, 0, 0, 0.45)',
  backdropFilter: 'blur(10px)',
  color: '#dce4ef',
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  pointerEvents: 'auto',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 14,
};

const titleStyle: React.CSSProperties = {
  color: '#71d7ff',
  fontSize: 15,
  fontWeight: 700,
  marginBottom: 4,
};

const selectStyle: React.CSSProperties = {
  background: '#1a2230',
  color: '#dce4ef',
  border: '1px solid #445566',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 11,
  fontFamily: 'inherit',
};

const buttonBaseStyle: React.CSSProperties = {
  borderRadius: 5,
  padding: '5px 12px',
  fontSize: 12,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  background: '#66d7ff',
  color: '#08121c',
  border: 'none',
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  background: 'transparent',
  color: '#b7c5d6',
  border: '1px solid rgba(109, 131, 158, 0.42)',
};

const comparisonGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  color: '#71d7ff',
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 10,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const panelStyle: React.CSSProperties = {
  borderRadius: 8,
  border: '1px solid rgba(109, 131, 158, 0.18)',
  background: 'rgba(13, 19, 29, 0.88)',
  padding: '12px 14px',
  marginBottom: 10,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  fontSize: 11,
  padding: '4px 0',
  borderBottom: '1px solid rgba(109, 131, 158, 0.12)',
};

const cardGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 8,
  marginBottom: 14,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 6,
  padding: '10px',
  background: 'linear-gradient(180deg, rgba(18, 28, 42, 0.94) 0%, rgba(14, 21, 32, 0.94) 100%)',
  border: '1px solid rgba(113, 215, 255, 0.14)',
};

const cardLabelStyle: React.CSSProperties = {
  color: '#8da0b4',
  fontSize: 9,
  marginBottom: 4,
  textTransform: 'uppercase',
};

const cardValueStyle: React.CSSProperties = {
  color: '#f3f7fb',
  fontSize: 16,
  fontWeight: 700,
};

export const BaselineResultPanel: React.FC<BaselineResultPanelProps> = React.memo(
  ({ profileId, handoverTypeOverride, onClose }) => {
    const [referenceId, setReferenceId] = useState<string>('');
    const primaryProfileEntry = PROFILE_LOOKUP.get(profileId);
    const comparisonEnabled = primaryProfileEntry
      ? isU2ComparisonEligible(primaryProfileEntry)
      : false;
    const referenceOptions = useMemo(
      () => U2_COMPARISON_PROFILE_LIST.filter((entry) => entry.id !== profileId),
      [profileId],
    );
    const referenceLookup = useMemo(
      () => new Map(referenceOptions.map((entry) => [entry.id, entry] as const)),
      [referenceOptions],
    );
    const isReferenceEligible = referenceLookup.has(referenceId);

    const main = useBenchmarkResult({ enabled: true, profileId, handoverTypeOverride });
    const ref = useBenchmarkResult({
      enabled: comparisonEnabled && !!referenceId && isReferenceEligible,
      profileId: referenceId,
    });
    const modqn = useModqnReproduction({ enabled: profileId === 'modqn-paper-baseline', profileId });

    const mainCards = useMemo(() => main.result ? projectKpiBundleToCards(main.result.kpiBundle) : [], [main.result]);
    const mainSections = useMemo(() => main.result ? projectKpiBundleToSections(main.result.kpiBundle) : [], [main.result]);
    const refCards = useMemo(() => ref.result ? projectKpiBundleToCards(ref.result.kpiBundle) : [], [ref.result]);
    const refSections = useMemo(() => ref.result ? projectKpiBundleToSections(ref.result.kpiBundle) : [], [ref.result]);
    const modqnComparisonRows = useMemo(() => modqn.viewModel ? modqn.viewModel.getKpiComparison() : [], [modqn.viewModel]);
    const modqnComparisonRowsWithReference = useMemo(
      () => (modqn.viewModel && ref.result)
        ? modqn.viewModel.getComparisonWithReference(ref.result.kpiBundle)
        : null,
      [modqn.viewModel, ref.result],
    );

    useEffect(() => {
      if (!comparisonEnabled && referenceId) {
        setReferenceId('');
        return;
      }
      if (referenceId && !isReferenceEligible) {
        setReferenceId('');
      }
    }, [comparisonEnabled, isReferenceEligible, referenceId]);

    const handleExportCsv = useCallback(() => {
      if (!main.result) return;
      let csv = 'Metric,Main Result (' + profileId + ')';
      if (ref.result) csv += ',Reference Result (' + referenceId + ')';
      csv += '\n';

      mainCards.forEach((c, i) => {
        csv += `${c.label},${c.rawValue}`;
        if (refCards[i]) csv += `,${refCards[i].rawValue}`;
        csv += '\n';
      });

      downloadFile(`comparison-${profileId}-vs-${referenceId || 'none'}.csv`, csv, 'text/csv');
    }, [main.result, ref.result, profileId, referenceId, mainCards, refCards]);

    return (
      <div style={overlayStyle} data-testid="baseline-result-panel">
        <div style={headerStyle}>
          <div>
            <div style={titleStyle}>Baseline Comparison Viewer</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: '#888' }}>Compare with:</span>
              <select
                style={selectStyle}
                value={referenceId}
                disabled={!comparisonEnabled}
                onChange={(e) => setReferenceId(e.target.value)}
              >
                <option value="">None</option>
                {(['Realistic', 'Advanced'] as const).map(tier => (
                  <optgroup key={tier} label={tier}>
                    {referenceOptions.filter(p => p.tier === tier).map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {!comparisonEnabled && (
              <div style={{ fontSize: 10, color: '#6e7a88', marginTop: 6 }}>
                U2 comparison stays in the Realistic/Advanced baseline corridor. HOBS, BH, and
                sensitivity variants remain out of scope.
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={secondaryButtonStyle} onClick={handleExportCsv} disabled={!main.result}>Export CSV</button>
            <button style={primaryButtonStyle} onClick={() => { main.reload(); ref.reload(); }}>Reload All</button>
            <button style={secondaryButtonStyle} onClick={onClose}>Close</button>
          </div>
        </div>

        <div style={comparisonGridStyle}>
          {/* Main Column */}
          <div>
            <div style={sectionTitleStyle}>Primary: {PROFILE_LOOKUP.get(profileId)?.label ?? profileId}</div>
            {main.loading && <div style={{ fontSize: 11, color: '#888' }}>Running benchmark...</div>}
            {main.result && (
              <>
                <div style={cardGridStyle}>
                  {mainCards.map(c => (
                    <div key={c.label} style={cardStyle}>
                      <div style={cardLabelStyle}>{c.label}</div>
                      <div style={cardValueStyle}>{c.formattedValue}{c.unit}</div>
                    </div>
                  ))}
                </div>
                {mainSections.map(s => (
                  <div key={s.title} style={panelStyle}>
                    <div style={{ ...sectionTitleStyle, fontSize: 10, color: '#556' }}>{s.title}</div>
                    {s.rows.map(r => (
                      <div key={r.label} style={rowStyle}>
                        <span style={{ color: '#8da0b4' }}>{r.label}</span>
                        <span>{r.formattedValue}{r.unit ? ` ${r.unit}` : ''}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Reference Column */}
          <div>
            <div style={sectionTitleStyle}>Reference: {referenceId ? (PROFILE_LOOKUP.get(referenceId)?.label ?? referenceId) : 'None selected'}</div>
            {!referenceId && comparisonEnabled && <div style={{ padding: '40px', textAlign: 'center', color: '#444', border: '1px dashed #333', borderRadius: 8 }}>Select a reference profile to compare performance.</div>}
            {!comparisonEnabled && <div style={{ padding: '40px', textAlign: 'center', color: '#444', border: '1px dashed #333', borderRadius: 8 }}>Comparison is disabled for this profile because U2 is limited to the baseline corridor.</div>}
            {ref.loading && <div style={{ fontSize: 11, color: '#888' }}>Running benchmark...</div>}
            {ref.result && (
              <>
                <div style={cardGridStyle}>
                  {refCards.map(c => (
                    <div key={c.label} style={cardStyle}>
                      <div style={cardLabelStyle}>{c.label}</div>
                      <div style={cardValueStyle}>{c.formattedValue}{c.unit}</div>
                    </div>
                  ))}
                </div>
                {refSections.map(s => (
                  <div key={s.title} style={panelStyle}>
                    <div style={{ ...sectionTitleStyle, fontSize: 10, color: '#556' }}>{s.title}</div>
                    {s.rows.map(r => (
                      <div key={r.label} style={rowStyle}>
                        <span style={{ color: '#8da0b4' }}>{r.label}</span>
                        <span>{r.formattedValue}{r.unit ? ` ${r.unit}` : ''}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* MODQN Details (only if main profile is MODQN) */}
        {profileId === 'modqn-paper-baseline' && modqn.viewModel && (
          <div style={{ marginTop: 20, borderTop: '1px solid #333', paddingTop: 20 }}>
            <div style={sectionTitleStyle}>MODQN M3 Reproduction Handoff</div>
            <div style={{ ...panelStyle, background: 'rgba(0, 212, 255, 0.05)', borderColor: 'rgba(0, 212, 255, 0.2)' }}>
              <div style={{ fontWeight: 700, color: '#ffa500', fontSize: 11, marginBottom: 8 }}>Disclosed Constraints:</div>
              <ul style={{ fontSize: 10, color: '#8da0b4', margin: 0, paddingLeft: 16 }}>
                {modqn.viewModel.getLimitations().map((l, i) => <li key={i}>{l}</li>)}
              </ul>
              
              <div style={{ marginTop: 12, fontSize: 11 }}>
                <span style={{ color: '#888' }}>Target Paper: </span>
                <span style={{ color: '#00d4ff' }}>{modqn.viewModel.getMetadata().paperId}</span>
                <span style={{ marginLeft: 20, color: '#888' }}>Episodes: </span>
                <span style={{ color: '#00d4ff' }}>{modqn.viewModel.getMetadata().episodes}</span>
              </div>

              {main.result && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ ...sectionTitleStyle, fontSize: 10, color: '#556', marginBottom: 6 }}>Comparison Matrix</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', color: '#555' }}>
                        <th style={{ padding: 4 }}>Metric</th>
                        <th style={{ padding: 4 }}>Reproduction (Avg)</th>
                        {ref.result && <th style={{ padding: 4 }}>Ref ({referenceId})</th>}
                        <th style={{ padding: 4 }}>Paper Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modqnComparisonRowsWithReference
                        ? modqnComparisonRowsWithReference.map(row => (
                          <tr key={row.metric} style={{ borderBottom: '1px solid #222' }}>
                            <td style={{ padding: 4, color: '#8da0b4' }}>{row.metric}</td>
                            <td style={{ padding: 4, color: '#00d4ff' }}>{row.reproduction}{row.unit}</td>
                            <td style={{ padding: 4, color: '#f3f7fb' }}>{row.reference}{row.unit}</td>
                            <td style={{ padding: 4, color: '#555' }}>{row.paperTarget ?? 'N/A'}{row.unit}</td>
                          </tr>
                        ))
                        : modqnComparisonRows.map(row => (
                          <tr key={row.metric} style={{ borderBottom: '1px solid #222' }}>
                            <td style={{ padding: 4, color: '#8da0b4' }}>{row.metric}</td>
                            <td style={{ padding: 4, color: '#00d4ff' }}>{row.reproduction}{row.unit}</td>
                            <td style={{ padding: 4, color: '#555' }}>{row.paperTarget ?? 'N/A'}{row.unit}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);
