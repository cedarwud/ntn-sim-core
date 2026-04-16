import React, { useEffect, useMemo, useState } from 'react';

import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import type {
  ModqnBundleExplainabilityView,
  ModqnBundleSummaryView,
  ModqnDashboardKpiView,
  ModqnDecisionStoryView,
  ModqnProvenanceFieldView,
  ModqnProvenanceLegendEntry,
  ModqnReplayTrendPointView,
  ModqnTrainingEvidenceView,
  ModqnTrainingEvalSummaryView,
} from '@/viz/view-models/modqn-bundle-replay-view-model';
import { modqnBaselineCompactPanelStyles } from './modqn-baseline-compact.styles';

export interface ModqnBaselineCompactPanelProps {
  visible: boolean;
  snapshot: SimulationSnapshot | null;
  bundleSummary: ModqnBundleSummaryView | null;
  trainingEvalSummary: ModqnTrainingEvalSummaryView | null;
  trainingEvidence: ModqnTrainingEvidenceView | null;
  decisionStory: ModqnDecisionStoryView | null;
  sourceLabel: string;
  currentSlotIndex: number | null;
  slotCount: number | null;
  handoverCount: number;
  assumptionCount: number;
  dashboardKpis: ModqnDashboardKpiView | null;
  provenanceLegend: ModqnProvenanceLegendEntry[];
  provenanceFields: ModqnProvenanceFieldView[];
  replayTrendSeries: ModqnReplayTrendPointView[];
  explainability: ModqnBundleExplainabilityView | null;
}

interface NarrativeSummary {
  headline: string;
  description: string;
}

interface HeroChipModel {
  key: string;
  label: string;
  value: string;
}

interface HeroFactModel {
  key: string;
  label: string;
  value: React.ReactNode;
  hint: React.ReactNode;
}

interface FirstScreenKpiCardModel {
  key: string;
  label: string;
  value: string;
  detail: string;
}

interface ReplayTrendCardModel {
  key: string;
  label: string;
  value: string;
  detail: string;
  footer: string;
  accent: string;
  series: number[];
}

interface ProvenanceSummary {
  reproductionAssumptionFieldCount: number;
  classifications: string[];
}

type DisclosureSectionKey = 'explainability' | 'training' | 'decision' | 'notes';
const CLOSED_DISCLOSURE_SECTIONS: Record<DisclosureSectionKey, boolean> = {
  explainability: false,
  training: false,
  decision: false,
  notes: false,
};

const {
  containerStyle,
  sectionStackStyle,
  heroPanelStyle,
  badgeRowStyle,
  brandBadgeStyle,
  secondaryBadgeStyle,
  heroGridStyle,
  heroCopyStyle,
  heroEyebrowStyle,
  heroHeadlineStyle,
  heroBodyStyle,
  heroChipGridStyle,
  heroChipStyle,
  heroChipLabelStyle,
  heroChipValueStyle,
  heroFactGridStyle,
  heroFactCardStyle,
  heroFactLabelStyle,
  heroFactValueStyle,
  heroFactHintStyle,
  kpiStripStyle,
  kpiCardStyle,
  kpiLabelStyle,
  kpiValueStyle,
  kpiDetailStyle,
  disclosureStackStyle,
  disclosureCardStyle,
  disclosureToggleStyle,
  disclosureToggleMetaStyle,
  disclosureToggleTitleStyle,
  disclosureToggleHintStyle,
  disclosureToggleStateStyle,
  disclosureBodyStyle,
  disclosurePanelStyle,
  disclosurePanelEyebrowStyle,
  disclosurePanelTitleStyle,
  disclosurePanelBodyStyle,
  disclosureGridStyle,
  evidenceCardStyle,
  evidenceCardTitleStyle,
  evidenceCardBodyStyle,
  evidenceFigureFrameStyle,
  evidenceFigureImageStyle,
  evidenceSparkFrameStyle,
  statGridStyle,
  statCardStyle,
  statLabelStyle,
  statValueStyle,
  storyGridStyle,
  storyCardStyle,
  storyStepStyle,
  storyLabelStyle,
  storyValueStyle,
  storyBodyStyle,
  replayChartGridStyle,
  replayChartCardStyle,
  replayChartLabelStyle,
  replayChartValueStyle,
  replayChartMetaStyle,
  replayChartFrameStyle,
  replayChartFooterStyle,
  noteListStyle,
  noteItemStyle,
  noteItemLabelStyle,
  noteItemValueStyle,
  noteChipWrapStyle,
  noteChipStyle,
} = modqnBaselineCompactPanelStyles;

function formatPrimarySinrValue(sinrDb: number | null | undefined): string {
  if (sinrDb === null || sinrDb === undefined || !Number.isFinite(sinrDb)) {
    return 'Not exported';
  }
  return `${sinrDb.toFixed(1)} dB`;
}

function formatPrimarySinrHint(sinrDb: number | null | undefined): string {
  if (sinrDb === null || sinrDb === undefined || !Number.isFinite(sinrDb)) {
    return 'Not exported for slot';
  }
  if (sinrDb >= 10) return 'Strong link';
  if (sinrDb >= 0) return 'Usable link';
  return 'Weak link';
}

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return String(Math.round(value));
}

function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

function formatSigned(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function formatPercentage(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

function formatThroughputMbps(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(2)} Mbps`;
}

function formatScalarizedQ(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Not exported';
  return formatSigned(value, 3);
}

function formatMargin(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Single valid candidate';
  }
  return formatSigned(value, 3);
}

function formatObjectiveTriplet(
  value: {
    r1Throughput: number;
    r2Handover: number;
    r3LoadBalance: number;
  } | null | undefined,
): string {
  if (!value) return 'Not exported';
  return [
    `r1Throughput ${formatSigned(value.r1Throughput, 2)}`,
    `r2Handover ${formatSigned(value.r2Handover, 2)}`,
    `r3LoadBalance ${formatSigned(value.r3LoadBalance, 2)}`,
  ].join(' · ');
}

function titleizeHyphenated(value: string | null | undefined): string {
  if (!value) return 'Not specified';
  return value
    .split(/[-_]/g)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function describeReplayTruthNarrative(
  decisionStory: ModqnDecisionStoryView | null,
): NarrativeSummary {
  switch (decisionStory?.handoverKind) {
    case 'inter-satellite-handover':
      return {
        headline: 'Inter-satellite handover',
        description: 'The exported replay slot moves the active service path to a different satellite.',
      };
    case 'intra-satellite-beam-switch':
      return {
        headline: 'Intra-satellite beam switch',
        description: 'The exported replay slot keeps the satellite and changes only the serving beam.',
      };
    case 'none':
    default:
      return {
        headline: 'Stable serving',
        description: 'No handover is recorded in the current exported replay slot.',
      };
  }
}

function formatPaperRunCheckpoint(bundleSummary: ModqnBundleSummaryView | null): string {
  if (!bundleSummary) return 'Loading…';
  return `${bundleSummary.paperId} / ${bundleSummary.runId} / ${titleizeHyphenated(bundleSummary.checkpointKind)}`;
}

function formatRewardMix(weights: number[]): string {
  if (weights.length === 0) return 'Not exported';
  return weights
    .map((weight, index) => `R${index + 1} ${Math.round(weight * 100)}%`)
    .join(' / ');
}

function formatClassificationSummary(classifications: string[]): string {
  const readable = classifications.map((classification) => titleizeHyphenated(classification));
  if (readable.length === 0) return 'No class labels';
  if (readable.length <= 2) return readable.join(' · ');
  return `${readable.slice(0, 2).join(' · ')} · +${readable.length - 2} more`;
}

function buildHeroChips(
  bundleSummary: ModqnBundleSummaryView | null,
  sourceLabel: string,
): HeroChipModel[] {
  return [
    {
      key: 'paper-run-checkpoint',
      label: 'Paper / Run / Checkpoint',
      value: formatPaperRunCheckpoint(bundleSummary),
    },
    {
      key: 'source-label',
      label: 'Source Label',
      value: bundleSummary?.sourceLabel ?? sourceLabel,
    },
    {
      key: 'replay-truth-mode',
      label: 'Replay Truth Mode',
      value: titleizeHyphenated(bundleSummary?.replayTruthMode),
    },
  ];
}

function buildHeroFacts(
  decisionStory: ModqnDecisionStoryView | null,
  handoverCount: number,
  currentSlotIndex: number | null,
  slotCount: number | null,
  primarySinr: number | null | undefined,
): HeroFactModel[] {
  return [
    {
      key: 'slot',
      label: 'Current Slot / Total Slots',
      value: <span data-testid="bundle-dashboard-slot">{currentSlotIndex ?? '—'} / {slotCount ?? '—'}</span>,
      hint: 'Replay timeline',
    },
    {
      key: 'primary-sinr',
      label: 'Primary SINR',
      value: formatPrimarySinrValue(primarySinr),
      hint: formatPrimarySinrHint(primarySinr),
    },
    {
      key: 'cumulative-handovers',
      label: 'Cumulative Handovers',
      value: <span data-testid="bundle-dashboard-handover-count">{formatCount(handoverCount)}</span>,
      hint: decisionStory?.handoverKind === 'none' ? 'No event this slot' : 'Count to current slot',
    },
  ];
}

function buildFirstScreenKpiCards(
  dashboardKpis: ModqnDashboardKpiView | null,
  decisionStory: ModqnDecisionStoryView | null,
): FirstScreenKpiCardModel[] {
  return [
    {
      key: 'current-throughput',
      label: 'Throughput',
      value: formatThroughputMbps(dashboardKpis?.currentThroughputMbps),
      detail: dashboardKpis
        ? `Mean ${formatThroughputMbps(dashboardKpis.meanThroughputMbpsToDate)}`
        : 'Waiting for KPI',
    },
    {
      key: 'scalar-reward',
      label: 'Scalar Reward',
      value: formatSigned(decisionStory?.scalarReward, 2),
      detail: decisionStory
        ? `R1 ${formatSigned(decisionStory.rewardVector.throughput, 2)} · R2 ${formatSigned(decisionStory.rewardVector.handover, 2)} · R3 ${formatSigned(decisionStory.rewardVector.loadBalance, 2)}`
        : 'Waiting for reward',
    },
    {
      key: 'action-coverage',
      label: 'Valid Actions',
      value: formatPercentage(dashboardKpis?.currentActionCoverage),
      detail: decisionStory
        ? `${formatCount(decisionStory.validActionCount)} valid · ${formatCount(decisionStory.visibleSatelliteCount)} sats`
        : 'Waiting for masks',
    },
  ];
}

function createSparklinePath(
  series: number[],
  width = 240,
  height = 72,
): { path: string; points: { x: number; y: number }[] } {
  if (series.length === 0) {
    return { path: '', points: [] };
  }
  if (series.length === 1) {
    return {
      path: '',
      points: [{ x: width / 2, y: height / 2 }],
    };
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const points = series.map((value, index) => ({
    x: (index / (series.length - 1)) * width,
    y: height - ((value - min) / range) * height,
  }));
  const [first, ...rest] = points;
  return {
    path: `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ${rest.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')}`,
    points,
  };
}

function buildAreaPath(
  points: { x: number; y: number }[],
  height: number,
): string {
  if (points.length < 2) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return [
    `M ${first.x.toFixed(2)} ${height.toFixed(2)}`,
    `L ${first.x.toFixed(2)} ${first.y.toFixed(2)}`,
    ...points.slice(1).map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
    `L ${last.x.toFixed(2)} ${height.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function renderSparkline(series: number[], color: string, label: string): React.ReactNode {
  const { path, points } = createSparklinePath(series);
  return (
    <div style={evidenceSparkFrameStyle}>
      <div style={{ ...statLabelStyle, color }}>{label}</div>
      <svg viewBox="0 0 240 72" width="100%" height="72" aria-hidden="true" style={{ marginTop: 8 }}>
        <line x1="0" y1="70" x2="240" y2="70" stroke="rgba(20, 36, 49, 0.12)" strokeWidth="1" />
        {path ? (
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {points.map((point, index) => (
          <circle
            key={`${label}-${index}`}
            cx={point.x}
            cy={point.y}
            r={series.length === 1 || index === points.length - 1 ? 4 : 0}
            fill={color}
          />
        ))}
      </svg>
    </div>
  );
}

function buildReplayTrendCards(
  replayTrendSeries: ModqnReplayTrendPointView[],
  currentFrameIndex: number,
  dashboardKpis: ModqnDashboardKpiView | null,
): ReplayTrendCardModel[] {
  if (replayTrendSeries.length === 0) return [];
  const safeIndex = Math.max(0, Math.min(currentFrameIndex, replayTrendSeries.length - 1));
  const current = replayTrendSeries[safeIndex];
  return [
    {
      key: 'scalar-reward',
      label: 'Replay Scalar Reward',
      value: formatSigned(current.scalarReward, 2),
      detail: `Mean ${formatSigned(dashboardKpis?.meanScalarRewardToDate, 2)} · slot ${formatCount(current.slotIndex)}`,
      footer: `${formatNumber(current.timeSec, 1)} s`,
      accent: '#c57b18',
      series: replayTrendSeries.map((point) => point.scalarReward),
    },
    {
      key: 'throughput',
      label: 'Replay Throughput',
      value: formatThroughputMbps(current.throughputMbps),
      detail: `Mean ${formatThroughputMbps(dashboardKpis?.meanThroughputMbpsToDate)} · span ${formatNumber(dashboardKpis?.timelineSpanSec, 1)} s`,
      footer: 'Bundle KPI overlay',
      accent: '#0f7db8',
      series: replayTrendSeries.map((point) => point.throughputMbps),
    },
    {
      key: 'action-coverage',
      label: 'Valid Actions',
      value: formatPercentage(current.validActionRatio),
      detail: `${formatCount(current.validActionCount)} / ${formatCount(current.totalActionCount)} valid choices`,
      footer: current.maskSource === 'runtime-fallback'
        ? 'Runtime mask fallback'
        : `${formatCount(current.visibleSatelliteCount)} sats · ${formatCount(current.cumulativeHandovers)} handovers`,
      accent: '#16825a',
      series: replayTrendSeries.map((point) => point.validActionRatio * 100),
    },
  ];
}

function HeroSection({
  chips,
  facts,
  narrativeSummary,
  decisionStory,
  provenanceSummary,
}: {
  chips: HeroChipModel[];
  facts: HeroFactModel[];
  narrativeSummary: NarrativeSummary;
  decisionStory: ModqnDecisionStoryView | null;
  provenanceSummary: string;
}) {
  return (
    <section style={heroPanelStyle}>
      <div style={badgeRowStyle}>
        <span style={brandBadgeStyle}>MODQN Replay</span>
        <span style={secondaryBadgeStyle}>
          Truth Source: <span data-testid="bundle-dashboard-truth-source">MODQN Bundle</span>
        </span>
      </div>
      <div style={heroGridStyle}>
        <div style={heroCopyStyle}>
          <div style={heroEyebrowStyle}>Serving Satellite / Beam</div>
          <div style={heroHeadlineStyle}>
            <span data-testid="bundle-dashboard-serving-sat">{decisionStory?.selectedSatId ?? '—'}</span>
            <span style={{ color: '#7fb3d2' }}> / </span>
            <span data-testid="bundle-dashboard-serving-beam">{decisionStory?.selectedBeamId ?? '—'}</span>
          </div>
          <div style={heroBodyStyle}>
            <span data-testid="bundle-dashboard-narrative-label">{narrativeSummary.headline}</span>
            {' · '}
            Kind{' '}
            <span data-testid="bundle-dashboard-handover-kind">
              {titleizeHyphenated(decisionStory?.handoverKind)}
            </span>
          </div>
          <div style={heroChipGridStyle}>
            {chips.map((chip) => (
              <div key={chip.key} style={heroChipStyle}>
                <div style={heroChipLabelStyle}>{chip.label}</div>
                <div style={heroChipValueStyle}>{chip.value}</div>
              </div>
            ))}
          </div>
          <div style={heroFactGridStyle}>
            {facts.map((fact) => (
              <div key={fact.key} style={heroFactCardStyle}>
                <div style={heroFactLabelStyle}>{fact.label}</div>
                <div style={heroFactValueStyle}>{fact.value}</div>
                <div style={heroFactHintStyle}>{fact.hint}</div>
              </div>
            ))}
          </div>
          <div style={modqnBaselineCompactPanelStyles.heroSummaryStyle}>
            <span style={modqnBaselineCompactPanelStyles.heroSummaryLabelStyle}>Provenance / Assumptions</span>
            <span>{provenanceSummary}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiStrip({ cards }: { cards: FirstScreenKpiCardModel[] }) {
  return (
    <section data-testid="bundle-kpi-strip" style={kpiStripStyle}>
      {cards.map((card) => (
        <div key={card.key} style={kpiCardStyle}>
          <div style={kpiLabelStyle}>{card.label}</div>
          <div style={kpiValueStyle}>{card.value}</div>
          <div style={kpiDetailStyle}>{card.detail}</div>
        </div>
      ))}
    </section>
  );
}

function CollapsibleSection({
  open,
  onToggle,
  title,
  hint,
  toggleTestId,
  testId,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  hint?: string;
  toggleTestId: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section style={disclosureCardStyle} data-testid={testId}>
      <button
        type="button"
        data-testid={toggleTestId}
        aria-expanded={open}
        style={disclosureToggleStyle}
        onClick={onToggle}
      >
        <span style={disclosureToggleMetaStyle}>
          <span style={disclosureToggleTitleStyle}>{title}</span>
          {hint ? <span style={disclosureToggleHintStyle}>{hint}</span> : null}
        </span>
        <span style={disclosureToggleStateStyle}>{open ? 'Hide' : 'Show'}</span>
      </button>
      {open ? <div style={disclosureBodyStyle}>{children}</div> : null}
    </section>
  );
}

function TrainingEvidenceSection({
  trainingEvidence,
  trainingEvalSummary,
  bundleSummary,
}: {
  trainingEvidence: ModqnTrainingEvidenceView | null;
  trainingEvalSummary: ModqnTrainingEvalSummaryView | null;
  bundleSummary: ModqnBundleSummaryView | null;
}) {
  return (
    <section style={disclosurePanelStyle} data-testid="bundle-training-chart-panel">
      <div style={disclosurePanelEyebrowStyle}>Training Evidence</div>
      <div style={disclosurePanelTitleStyle}>Producer-exported training figures</div>
      <div style={disclosurePanelBodyStyle}>
        Checkpoint figures and evaluation summary for this replay.
      </div>

      <div style={disclosureGridStyle}>
        <div style={evidenceCardStyle}>
          <div style={evidenceCardTitleStyle}>Scalar reward track</div>
          <div style={evidenceCardBodyStyle}>Scalar reward trace for the replayed checkpoint.</div>
          {trainingEvidence?.trainingScalarRewardFigureUrl ? (
            <div style={evidenceFigureFrameStyle}>
              <img
                src={trainingEvidence.trainingScalarRewardFigureUrl}
                alt="Producer-exported MODQN scalar reward training figure"
                style={evidenceFigureImageStyle}
              />
            </div>
          ) : renderSparkline(
            trainingEvidence?.scalarRewardSeries ?? [],
            '#c57b18',
            'Scalar reward',
          )}
          <div style={statGridStyle}>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Latest Episode</div>
              <div style={statValueStyle}>{formatCount(trainingEvidence?.latestEpisode)}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Latest Reward</div>
              <div style={statValueStyle}>{formatSigned(trainingEvidence?.latestScalarReward, 2)}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Best Eval Mean</div>
              <div style={statValueStyle}>{formatSigned(trainingEvalSummary?.bestEvalMeanScalarReward, 2)}</div>
            </div>
          </div>
        </div>

        <div style={evidenceCardStyle}>
          <div style={evidenceCardTitleStyle}>Objective traces</div>
          <div style={evidenceCardBodyStyle}>Throughput, handover, and load-balance traces.</div>
          {trainingEvidence?.trainingObjectivesFigureUrl ? (
            <div style={evidenceFigureFrameStyle}>
              <img
                src={trainingEvidence.trainingObjectivesFigureUrl}
                alt="Producer-exported MODQN objective training figure"
                style={evidenceFigureImageStyle}
              />
            </div>
          ) : (
            <>
              {renderSparkline(trainingEvidence?.throughputLossSeries ?? [], '#c57b18', 'Throughput loss')}
              {renderSparkline(trainingEvidence?.handoverLossSeries ?? [], '#0f7db8', 'Handover loss')}
              {renderSparkline(trainingEvidence?.loadBalanceLossSeries ?? [], '#16825a', 'Load-balance loss')}
            </>
          )}
          <div style={statGridStyle}>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Reward Mix</div>
              <div style={statValueStyle}>{formatRewardMix(bundleSummary?.rewardWeights ?? [])}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Best Eval Seeds</div>
              <div style={statValueStyle}>{formatCount(trainingEvalSummary?.bestEvalEvalSeedCount)}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Episodes Completed</div>
              <div style={statValueStyle}>{formatCount(trainingEvalSummary?.episodesCompleted)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InlineReplayTrendCard({
  accent,
  currentFrameIndex,
  detail,
  footer,
  label,
  series,
  value,
}: ReplayTrendCardModel & { currentFrameIndex: number }) {
  const width = 248;
  const height = 86;
  const { path, points } = createSparklinePath(series, width, height);
  const areaPath = buildAreaPath(points, height);
  const safeIndex = Math.max(0, Math.min(currentFrameIndex, Math.max(points.length - 1, 0)));
  const currentPoint = points[safeIndex] ?? null;

  return (
    <div style={replayChartCardStyle}>
      <div style={replayChartLabelStyle}>{label}</div>
      <div style={replayChartValueStyle}>{value}</div>
      <div style={replayChartMetaStyle}>{detail}</div>
      <div style={replayChartFrameStyle}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} aria-hidden="true">
          <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="rgba(20, 36, 49, 0.12)" strokeWidth="1" />
          {areaPath ? <path d={areaPath} fill={accent} opacity={0.14} /> : null}
          {path ? (
            <path
              d={path}
              fill="none"
              stroke={accent}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {currentPoint ? (
            <>
              <line
                x1={currentPoint.x}
                y1="4"
                x2={currentPoint.x}
                y2={height - 1}
                stroke={accent}
                strokeDasharray="4 5"
                strokeWidth="1.5"
                opacity={0.45}
              />
              <circle cx={currentPoint.x} cy={currentPoint.y} r="5" fill="#ffffff" stroke={accent} strokeWidth="2.5" />
            </>
          ) : null}
        </svg>
      </div>
      <div style={replayChartFooterStyle}>{footer}</div>
    </div>
  );
}

function DecisionStorySection({
  currentSlotIndex,
  slotCount,
  bundleSummary,
  dashboardKpis,
  decisionStory,
  narrativeSummary,
  handoverCount,
  replayTrendSeries,
}: {
  currentSlotIndex: number | null;
  slotCount: number | null;
  bundleSummary: ModqnBundleSummaryView | null;
  dashboardKpis: ModqnDashboardKpiView | null;
  decisionStory: ModqnDecisionStoryView | null;
  narrativeSummary: NarrativeSummary;
  handoverCount: number;
  replayTrendSeries: ModqnReplayTrendPointView[];
}) {
  const currentFrameIndex = Math.max(
    0,
    Math.min(
      (dashboardKpis?.currentSlotIndex ?? currentSlotIndex ?? 1) - 1,
      Math.max(replayTrendSeries.length - 1, 0),
    ),
  );
  const replayTrendCards = buildReplayTrendCards(replayTrendSeries, currentFrameIndex, dashboardKpis);

  return (
    <section style={disclosurePanelStyle} data-testid="bundle-decision-story-panel">
      <div style={disclosurePanelEyebrowStyle}>Decision Story</div>
      <div style={disclosurePanelTitleStyle}>Current slot evidence</div>
      <div style={disclosurePanelBodyStyle}>
        State, chosen link, and replay result for this slot.
      </div>

      <div style={storyGridStyle}>
        <div style={storyCardStyle}>
          <div style={storyStepStyle}>1</div>
          <div style={storyLabelStyle}>State</div>
          <div style={storyValueStyle}>
            {decisionStory
              ? `${decisionStory.visibleSatelliteCount} satellites / ${decisionStory.validActionCount} valid actions`
              : 'Waiting for bundle state'}
          </div>
          <div style={storyBodyStyle}>
            {decisionStory
              ? `Previous ${decisionStory.previousServingSatId ?? '—'} / ${decisionStory.previousServingBeamId ?? '—'}`
              : 'Waiting for replay state'}
          </div>
        </div>

        <div style={storyCardStyle}>
          <div style={storyStepStyle}>2</div>
          <div style={storyLabelStyle}>Action</div>
          <div style={storyValueStyle}>
            {decisionStory ? `${decisionStory.selectedSatId} / ${decisionStory.selectedBeamId}` : 'Waiting for action'}
          </div>
          <div style={storyBodyStyle}>
            {decisionStory
              ? `${titleizeHyphenated(bundleSummary?.replayTruthMode)} · ${titleizeHyphenated(decisionStory.handoverKind)}`
              : 'Chosen link comes from bundle export'}
          </div>
        </div>

        <div style={storyCardStyle}>
          <div style={storyStepStyle}>3</div>
          <div style={storyLabelStyle}>Outcome</div>
          <div style={storyValueStyle}>Scalar reward {formatSigned(decisionStory?.scalarReward, 3)}</div>
          <div style={storyBodyStyle}>
            {narrativeSummary.headline} · handovers {handoverCount} · slot {currentSlotIndex ?? '—'} / {slotCount ?? bundleSummary?.slotCount ?? '—'}
          </div>
        </div>
      </div>

      {replayTrendCards.length > 0 ? (
        <div style={replayChartGridStyle}>
          {replayTrendCards.map(({ key, ...card }) => (
            <InlineReplayTrendCard
              key={key}
              {...card}
              currentFrameIndex={currentFrameIndex}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ExplainabilitySection({
  decisionStory,
  explainability,
}: {
  decisionStory: ModqnDecisionStoryView | null;
  explainability: ModqnBundleExplainabilityView | null;
}) {
  if (!explainability) return null;

  const topCandidate = explainability.topCandidates[0] ?? null;
  const disclosure = explainability.metadata;
  return (
    <section
      style={disclosurePanelStyle}
      data-testid="bundle-policy-diagnostics-panel"
      data-has-diagnostics={String(explainability.hasDiagnostics)}
      data-diagnostics-version={explainability.diagnosticsVersion ?? ''}
      data-selected-sat-id={decisionStory?.selectedSatId ?? ''}
      data-selected-beam-id={decisionStory?.selectedBeamId ?? ''}
      data-top-candidate-sat-id={topCandidate?.satId ?? ''}
      data-top-candidate-beam-id={topCandidate?.beamId ?? ''}
      data-rows-with-diagnostics={String(disclosure?.rowsWithDiagnostics ?? 0)}
      data-rows-without-diagnostics={String(disclosure?.rowsWithoutDiagnostics ?? 0)}
      data-producer-owned={String(disclosure?.producerOwned ?? false)}
    >
      <div style={disclosurePanelEyebrowStyle}>Policy Diagnostics</div>
      <div style={disclosurePanelTitleStyle}>Producer-owned explainability</div>
      <div style={disclosurePanelBodyStyle}>
        {explainability.hasDiagnostics
          ? 'Selected vs runner-up, margin, and top candidates come directly from exported policyDiagnostics.'
          : explainability.absenceDisclosure}
      </div>

      <div style={noteListStyle}>
        <div style={noteItemStyle}>
          <div style={noteItemLabelStyle}>Disclosure</div>
          <div style={noteItemValueStyle} data-testid="bundle-policy-diagnostics-status">
            {explainability.producerDisclosure}
          </div>
        </div>
        <div style={noteItemStyle}>
          <div style={noteItemLabelStyle}>Coverage</div>
          <div style={noteItemValueStyle}>{explainability.coverageDisclosure}</div>
        </div>
      </div>

      {explainability.hasDiagnostics ? (
        <>
          <div style={noteListStyle}>
            <div style={noteItemStyle}>
              <div style={noteItemLabelStyle}>Selected Scalarized Q</div>
              <div style={noteItemValueStyle} data-testid="bundle-policy-diagnostics-selected">
                {formatScalarizedQ(explainability.selectedScalarizedQ)}
              </div>
            </div>
            <div style={noteItemStyle}>
              <div style={noteItemLabelStyle}>Runner-up Scalarized Q</div>
              <div style={noteItemValueStyle} data-testid="bundle-policy-diagnostics-runner-up">
                {explainability.runnerUpScalarizedQ === null
                  ? 'Single valid candidate'
                  : formatScalarizedQ(explainability.runnerUpScalarizedQ)}
              </div>
            </div>
            <div style={noteItemStyle}>
              <div style={noteItemLabelStyle}>Margin To Runner-up</div>
              <div style={noteItemValueStyle} data-testid="bundle-policy-diagnostics-margin">
                {formatMargin(explainability.scalarizedMarginToRunnerUp)}
              </div>
            </div>
            <div style={noteItemStyle}>
              <div style={noteItemLabelStyle}>Available Actions</div>
              <div style={noteItemValueStyle}>{formatCount(explainability.availableActionCount)}</div>
            </div>
          </div>

          <div style={noteListStyle}>
            <div style={noteItemStyle}>
              <div style={noteItemLabelStyle}>Objective Weights</div>
              <div style={noteItemValueStyle}>{formatObjectiveTriplet(explainability.objectiveWeights)}</div>
            </div>
          </div>

          <div style={storyGridStyle}>
            {explainability.topCandidates.map((candidate, index) => (
              <div
                key={`${candidate.beamId}-${candidate.rank}`}
                style={storyCardStyle}
                data-testid={`bundle-policy-diagnostics-candidate-${index}`}
              >
                <div style={storyStepStyle}>{candidate.rank}</div>
                <div style={storyLabelStyle}>Producer top candidate</div>
                <div style={storyValueStyle}>
                  {candidate.satId} / {candidate.beamId}
                </div>
                <div style={storyBodyStyle}>
                  scalarizedQ {formatScalarizedQ(candidate.scalarizedQ)} · beamIndex {candidate.beamIndex} · localBeamIndex {candidate.localBeamIndex}
                </div>
                <div style={{ ...storyBodyStyle, marginTop: 6 }}>
                  {formatObjectiveTriplet(candidate.objectiveQ)}
                </div>
                <div style={{ ...heroFactHintStyle, marginTop: 8 }}>
                  {candidate.validUnderDecisionMask
                    ? 'Valid under decision mask'
                    : 'Not valid under decision mask'}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={noteListStyle}>
          <div style={noteItemStyle} data-testid="bundle-policy-diagnostics-absence">
            <div style={noteItemLabelStyle}>Absence Disclosure</div>
            <div style={noteItemValueStyle}>{explainability.absenceDisclosure}</div>
          </div>
        </div>
      )}
    </section>
  );
}

function SourceNotesSection({
  bundleSummary,
  sourceLabel,
  handoverCount,
  assumptionCount,
  provenanceSummary,
}: {
  bundleSummary: ModqnBundleSummaryView | null;
  sourceLabel: string;
  handoverCount: number;
  assumptionCount: number;
  provenanceSummary: ProvenanceSummary;
}) {
  return (
    <section style={disclosurePanelStyle}>
      <div style={disclosurePanelEyebrowStyle}>Replay Source Notes</div>
      <div style={disclosurePanelTitleStyle}>Short source and disclosure notes</div>
      <div style={disclosurePanelBodyStyle}>
        Full provenance and assumptions stay on the separate `Disclosure` panel.
      </div>

      <div style={noteListStyle}>
        <div style={noteItemStyle}>
          <div style={noteItemLabelStyle}>Paper / Run / Checkpoint</div>
          <div style={noteItemValueStyle}>{formatPaperRunCheckpoint(bundleSummary)}</div>
        </div>
        <div style={noteItemStyle}>
          <div style={noteItemLabelStyle}>Source Label</div>
          <div style={noteItemValueStyle}>{bundleSummary?.sourceLabel ?? sourceLabel}</div>
        </div>
        <div style={noteItemStyle}>
          <div style={noteItemLabelStyle}>Replay Truth Mode</div>
          <div style={noteItemValueStyle}>{titleizeHyphenated(bundleSummary?.replayTruthMode)}</div>
        </div>
        <div style={noteItemStyle}>
          <div style={noteItemLabelStyle}>Cumulative Handovers</div>
          <div style={noteItemValueStyle}>{formatCount(handoverCount)}</div>
        </div>
        <div style={noteItemStyle}>
          <div style={noteItemLabelStyle}>Disclosure Summary</div>
          <div style={noteItemValueStyle}>
            {assumptionCount} assumptions / {provenanceSummary.reproductionAssumptionFieldCount} reproduction-assumption fields
          </div>
        </div>
        <div style={noteItemStyle}>
          <div style={noteItemLabelStyle}>Reward Mix</div>
          <div style={noteItemValueStyle}>{formatRewardMix(bundleSummary?.rewardWeights ?? [])}</div>
        </div>
      </div>

      <div style={noteChipWrapStyle}>
        {provenanceSummary.classifications.map((classification) => (
          <span key={classification} style={noteChipStyle}>{classification}</span>
        ))}
      </div>
    </section>
  );
}

export const ModqnBaselineCompactPanel = React.memo(function ModqnBaselineCompactPanel({
  visible,
  snapshot,
  bundleSummary,
  trainingEvalSummary,
  trainingEvidence,
  decisionStory,
  sourceLabel,
  currentSlotIndex,
  slotCount,
  handoverCount,
  assumptionCount,
  dashboardKpis,
  provenanceLegend,
  provenanceFields,
  replayTrendSeries,
  explainability,
}: ModqnBaselineCompactPanelProps) {
  const [openSections, setOpenSections] = useState<Record<DisclosureSectionKey, boolean>>(CLOSED_DISCLOSURE_SECTIONS);
  const primaryUe = snapshot?.ues[0] ?? null;
  const narrativeSummary = useMemo(
    () => describeReplayTruthNarrative(decisionStory),
    [decisionStory],
  );
  const provenanceSummary = useMemo(() => {
    const reproductionAssumptionFieldCount = provenanceFields.filter(
      (field) => field.primaryClassification === 'reproduction-assumption',
    ).length;
    return {
      reproductionAssumptionFieldCount,
      classifications: provenanceLegend.map((entry) => entry.classification),
    };
  }, [provenanceFields, provenanceLegend]);
  const heroChips = useMemo(
    () => buildHeroChips(bundleSummary, sourceLabel),
    [bundleSummary, sourceLabel],
  );
  const heroFacts = useMemo(
    () => buildHeroFacts(
      decisionStory,
      handoverCount,
      currentSlotIndex,
      slotCount ?? bundleSummary?.slotCount ?? null,
      primaryUe?.sinrDb,
    ),
    [
      bundleSummary?.slotCount,
      currentSlotIndex,
      decisionStory,
      handoverCount,
      primaryUe?.sinrDb,
      slotCount,
    ],
  );
  const firstScreenKpis = useMemo(
    () => buildFirstScreenKpiCards(
      dashboardKpis,
      decisionStory,
    ),
    [dashboardKpis, decisionStory],
  );
  const activeBundleIdentity = `${bundleSummary?.sourceLabel ?? sourceLabel}|${bundleSummary?.runId ?? 'loading'}|${bundleSummary?.checkpointKind ?? 'loading'}`;

  useEffect(() => {
    setOpenSections({ ...CLOSED_DISCLOSURE_SECTIONS });
  }, [activeBundleIdentity]);

  if (!visible) return null;

  const toggleSection = (section: DisclosureSectionKey) => {
    setOpenSections((previous) => ({
      ...previous,
      [section]: !previous[section],
    }));
  };

  return (
    <div data-testid="bundle-story-dashboard" style={containerStyle}>
      <div data-testid="modqn-compact-panel">
        <div style={sectionStackStyle}>
          <HeroSection
            chips={heroChips}
            facts={heroFacts}
            narrativeSummary={narrativeSummary}
            decisionStory={decisionStory}
            provenanceSummary={`${assumptionCount} / ${provenanceSummary.reproductionAssumptionFieldCount} · ${formatClassificationSummary(provenanceSummary.classifications)}`}
          />
          <KpiStrip cards={firstScreenKpis} />

          <div style={disclosureStackStyle}>
            <CollapsibleSection
              open={openSections.explainability}
              onToggle={() => toggleSection('explainability')}
              testId="bundle-explainability-disclosure"
              toggleTestId="toggle-bundle-policy-diagnostics"
              title="Policy diagnostics"
              hint={explainability?.hasDiagnostics
                ? 'Producer-exported diagnostics available for the current slot'
                : explainability?.absenceDisclosure ?? 'No diagnostics for the current slot'}
            >
              <ExplainabilitySection
                decisionStory={decisionStory}
                explainability={explainability}
              />
            </CollapsibleSection>

            <CollapsibleSection
              open={openSections.training}
              onToggle={() => toggleSection('training')}
              testId="bundle-training-disclosure"
              toggleTestId="toggle-bundle-training-evidence"
              title="Training evidence"
            >
              <TrainingEvidenceSection
                trainingEvidence={trainingEvidence}
                trainingEvalSummary={trainingEvalSummary}
                bundleSummary={bundleSummary}
              />
            </CollapsibleSection>

            <CollapsibleSection
              open={openSections.decision}
              onToggle={() => toggleSection('decision')}
              testId="bundle-decision-disclosure"
              toggleTestId="toggle-bundle-decision-story"
              title="Current slot details"
            >
              <DecisionStorySection
                currentSlotIndex={currentSlotIndex}
                slotCount={slotCount}
                bundleSummary={bundleSummary}
                dashboardKpis={dashboardKpis}
                decisionStory={decisionStory}
                narrativeSummary={narrativeSummary}
                handoverCount={handoverCount}
                replayTrendSeries={replayTrendSeries}
              />
            </CollapsibleSection>

            <CollapsibleSection
              open={openSections.notes}
              onToggle={() => toggleSection('notes')}
              testId="bundle-source-disclosure"
              toggleTestId="toggle-bundle-source-notes"
              title="Source notes"
            >
              <SourceNotesSection
                bundleSummary={bundleSummary}
                sourceLabel={sourceLabel}
                handoverCount={handoverCount}
                assumptionCount={assumptionCount}
                provenanceSummary={provenanceSummary}
              />
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
});
