import React from 'react';

import type {
  ModqnAssumptionView,
  ModqnBundleSummaryView,
  ModqnPolicyDiagnosticsDisclosureView,
  ModqnProvenanceFieldView,
  ModqnProvenanceLegendEntry,
  ModqnTrainingEvalSummaryView,
} from '@/viz/view-models/modqn-bundle-replay-view-model';

export interface ModqnBundleMetadataPanelProps {
  visible: boolean;
  bundleSummary: ModqnBundleSummaryView | null;
  trainingEvalSummary: ModqnTrainingEvalSummaryView | null;
  assumptions: ModqnAssumptionView[];
  provenanceLegend: ModqnProvenanceLegendEntry[];
  provenanceFields: ModqnProvenanceFieldView[];
  policyDiagnosticsDisclosure: ModqnPolicyDiagnosticsDisclosureView | null;
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  bottom: 198,
  width: 'min(420px, calc(100vw - 32px))',
  maxHeight: 'min(48vh, 460px)',
  backgroundColor: 'rgba(12, 18, 28, 0.9)',
  border: '1px solid rgba(77, 123, 168, 0.5)',
  borderRadius: 10,
  padding: '12px 16px',
  color: '#e0e6ee',
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  fontSize: 12,
  overflowY: 'auto',
  zIndex: 10,
  backdropFilter: 'blur(6px)',
  pointerEvents: 'auto',
};

const titleStyle: React.CSSProperties = {
  color: '#8fdcff',
  fontWeight: 700,
  marginBottom: 8,
  fontSize: 13,
  textTransform: 'uppercase',
};

const sectionTitleStyle: React.CSSProperties = {
  color: '#90a9c2',
  fontSize: 10,
  marginTop: 12,
  marginBottom: 6,
  borderBottom: '1px solid rgba(77, 123, 168, 0.3)',
  paddingBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: '6px 12px',
  alignItems: 'start',
};

const keyStyle: React.CSSProperties = {
  color: '#90a9c2',
};

const valueStyle: React.CSSProperties = {
  color: '#f3f7fb',
  textAlign: 'right',
  wordBreak: 'break-word',
};

const helperTextStyle: React.CSSProperties = {
  color: '#7a8ca0',
  fontSize: 10,
  lineHeight: 1.5,
};

const listStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
};

const CARD_BASE_BORDER_COLOR = 'rgba(96, 130, 165, 0.25)';
const CARD_BASE_BACKGROUND = 'rgba(255, 255, 255, 0.03)';

const cardBaseStyle: React.CSSProperties = {
  borderRadius: 8,
  border: `1px solid ${CARD_BASE_BORDER_COLOR}`,
  background: CARD_BASE_BACKGROUND,
  padding: '8px 10px',
};

function formatNumber(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

function formatInteger(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return String(Math.round(value));
}

function renderSummaryRow(label: string, value: React.ReactNode) {
  return (
    <React.Fragment key={label}>
      <div style={keyStyle}>{label}</div>
      <div style={valueStyle}>{value}</div>
    </React.Fragment>
  );
}

export const ModqnBundleMetadataPanel: React.FC<ModqnBundleMetadataPanelProps> = ({
  visible,
  bundleSummary,
  trainingEvalSummary,
  assumptions,
  provenanceLegend,
  provenanceFields,
  policyDiagnosticsDisclosure,
}) => {
  if (!visible || !bundleSummary) return null;

  return (
    <div style={containerStyle} data-testid="bundle-metadata-panel">
      <div style={titleStyle}>MODQN Bundle Disclosure</div>
      <div style={helperTextStyle}>
        Truth source is the producer-exported replay bundle. Values below are disclosure metadata and
        reproduction assumptions, not native simulator defaults.
      </div>

      <div style={sectionTitleStyle}>Bundle Summary</div>
      <div style={summaryGridStyle} data-testid="bundle-training-summary-panel">
        {renderSummaryRow('Paper', bundleSummary.paperId)}
        {renderSummaryRow('Run', bundleSummary.runId)}
        {renderSummaryRow('Schema', bundleSummary.schemaVersion)}
        {renderSummaryRow('Producer', bundleSummary.producerVersion)}
        {renderSummaryRow('Replay Truth', bundleSummary.replayTruthMode)}
        {renderSummaryRow('Source Label', bundleSummary.sourceLabel)}
        {renderSummaryRow('Slots', bundleSummary.slotCount)}
        {renderSummaryRow('Users', bundleSummary.userCount)}
        {renderSummaryRow('Rows', bundleSummary.rowCount)}
        {renderSummaryRow('Handovers', bundleSummary.handoverEventCount ?? '—')}
        {renderSummaryRow('Checkpoint', bundleSummary.checkpointKind ?? '—')}
        {renderSummaryRow('Policy Episode', bundleSummary.policyEpisode ?? '—')}
        {renderSummaryRow('Timeline Seed', bundleSummary.timelineSeed ?? '—')}
        {renderSummaryRow('Reward Weights', bundleSummary.rewardWeights.join(', ') || '—')}
      </div>
      {bundleSummary.sampleNote && (
        <div style={{ ...helperTextStyle, marginTop: 8 }}>
          Sample note: {bundleSummary.sampleNote}
        </div>
      )}

      <div style={sectionTitleStyle}>Training / Eval Summary</div>
      <div style={summaryGridStyle}>
        {renderSummaryRow('Episodes Requested', formatInteger(trainingEvalSummary?.episodesRequested ?? null))}
        {renderSummaryRow('Episodes Completed', formatInteger(trainingEvalSummary?.episodesCompleted ?? null))}
        {renderSummaryRow('Elapsed Sec', formatNumber(trainingEvalSummary?.elapsedSec ?? null, 2))}
        {renderSummaryRow('Final Episode', formatInteger(trainingEvalSummary?.finalEpisodeIndex ?? null))}
        {renderSummaryRow('Final Scalar Reward', formatNumber(trainingEvalSummary?.finalScalarReward ?? null, 3))}
        {renderSummaryRow('Eval Every Episodes', formatInteger(trainingEvalSummary?.evaluationEveryEpisodes ?? null))}
        {renderSummaryRow('Best Eval Episode', formatInteger(trainingEvalSummary?.bestEvalEpisode ?? null))}
        {renderSummaryRow('Best Eval Mean Reward', formatNumber(trainingEvalSummary?.bestEvalMeanScalarReward ?? null, 3))}
        {renderSummaryRow('Best Eval Reward Std', formatNumber(trainingEvalSummary?.bestEvalStdScalarReward ?? null, 3))}
        {renderSummaryRow('Eval Seed Count', formatInteger(trainingEvalSummary?.bestEvalEvalSeedCount ?? null))}
        {renderSummaryRow('Best Eval Mean HO', formatNumber(trainingEvalSummary?.bestEvalMeanHandovers ?? null, 2))}
        {renderSummaryRow('Best Eval Mean R1', formatNumber(trainingEvalSummary?.bestEvalMeanR1 ?? null, 3))}
        {renderSummaryRow('Best Eval Mean R2', formatNumber(trainingEvalSummary?.bestEvalMeanR2 ?? null, 3))}
        {renderSummaryRow('Best Eval Mean R3', formatNumber(trainingEvalSummary?.bestEvalMeanR3 ?? null, 3))}
      </div>

      <div style={sectionTitleStyle}>Policy Diagnostics Disclosure</div>
      <div
        style={helperTextStyle}
        data-testid="bundle-policy-diagnostics-disclosure"
      >
        `optionalPolicyDiagnostics` stays metadata/disclosure only. Row-level `policyDiagnostics`
        remains the primary explainability truth when present.
      </div>
      {policyDiagnosticsDisclosure ? (
        <>
          <div style={{ ...summaryGridStyle, marginTop: 8 }}>
            {renderSummaryRow('Present', policyDiagnosticsDisclosure.present ? 'true' : 'false')}
            {renderSummaryRow('Timeline Field', policyDiagnosticsDisclosure.timelineField)}
            {renderSummaryRow('Version', policyDiagnosticsDisclosure.diagnosticsVersion)}
            {renderSummaryRow('Producer Owned', policyDiagnosticsDisclosure.producerOwned ? 'true' : 'false')}
            {renderSummaryRow('Required By Schema', policyDiagnosticsDisclosure.requiredByBundleSchema ? 'true' : 'false')}
            {renderSummaryRow('Selected Action Source', policyDiagnosticsDisclosure.selectedActionSource)}
            {renderSummaryRow('Top Candidate Limit', policyDiagnosticsDisclosure.topCandidateLimit)}
            {renderSummaryRow('Rows With Diagnostics', policyDiagnosticsDisclosure.rowsWithDiagnostics)}
            {renderSummaryRow('Rows Without Diagnostics', policyDiagnosticsDisclosure.rowsWithoutDiagnostics)}
          </div>
          <div style={{ ...helperTextStyle, marginTop: 8, color: '#c7d1db' }}>
            {policyDiagnosticsDisclosure.note}
          </div>
        </>
      ) : (
        <div style={{ ...helperTextStyle, marginTop: 8 }}>
          No `optionalPolicyDiagnostics` manifest block. Older bundles remain valid and do not imply missing scores.
        </div>
      )}

      <div style={sectionTitleStyle}>Assumptions</div>
      <div style={helperTextStyle} data-testid="bundle-assumptions-panel">
        `reproduction-assumption` entries are explicit execution assumptions carried by the producer bundle.
      </div>
      <div style={{ ...listStyle, marginTop: 8 }}>
        {assumptions.map((assumption) => (
          <div
            key={assumption.key}
            style={{
              ...cardBaseStyle,
              borderColor: assumption.assumptionId ? 'rgba(255, 180, 92, 0.55)' : CARD_BASE_BORDER_COLOR,
              background: assumption.assumptionId ? 'rgba(255, 180, 92, 0.09)' : CARD_BASE_BACKGROUND,
            }}
            title={assumption.valueSummary}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ color: '#f3f7fb', fontWeight: 600 }}>{assumption.key}</div>
              <div style={{ color: '#ffcf85', fontSize: 10 }}>
                {assumption.assumptionId ?? 'disclosure-only'}
              </div>
            </div>
            <div style={{ ...helperTextStyle, marginTop: 4, color: '#c7d1db' }}>
              {assumption.valueSummary}
            </div>
          </div>
        ))}
      </div>

      <div style={sectionTitleStyle}>Provenance</div>
      <div style={helperTextStyle} data-testid="bundle-provenance-panel">
        Field classifications below come from the producer provenance map. Consumer UI must not relabel them as native defaults.
      </div>
      <div style={{ ...listStyle, marginTop: 8 }}>
        {provenanceLegend.map((entry) => (
          <div
            key={entry.classification}
            style={{
              ...cardBaseStyle,
              borderColor: entry.classification === 'reproduction-assumption'
                ? 'rgba(255, 180, 92, 0.55)'
                : CARD_BASE_BORDER_COLOR,
              background: entry.classification === 'reproduction-assumption'
                ? 'rgba(255, 180, 92, 0.09)'
                : CARD_BASE_BACKGROUND,
            }}
          >
            <div style={{ color: '#f3f7fb', fontWeight: 600 }}>{entry.classification}</div>
            <div style={{ ...helperTextStyle, marginTop: 4, color: '#c7d1db' }}>
              {entry.description}
            </div>
          </div>
        ))}
      </div>
      <div style={{ ...listStyle, marginTop: 8 }}>
        {provenanceFields.map((field) => (
          <div
            key={field.fieldPath}
            style={{
              ...cardBaseStyle,
              borderColor: field.primaryClassification === 'reproduction-assumption'
                ? 'rgba(255, 180, 92, 0.55)'
                : CARD_BASE_BORDER_COLOR,
              background: field.primaryClassification === 'reproduction-assumption'
                ? 'rgba(255, 180, 92, 0.09)'
                : CARD_BASE_BACKGROUND,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ color: '#f3f7fb', fontWeight: 600, wordBreak: 'break-word' }}>{field.fieldPath}</div>
              <div style={{ color: '#8fdcff', fontSize: 10, whiteSpace: 'nowrap' }}>
                {field.primaryClassification}
              </div>
            </div>
            <div style={{ ...helperTextStyle, marginTop: 4, color: '#c7d1db' }}>
              source: {field.source ?? '—'}
            </div>
            {field.note && (
              <div style={{ ...helperTextStyle, marginTop: 2, color: '#c7d1db' }}>
                {field.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
