import React, { useMemo } from 'react';

import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import type {
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
}

interface ObjectiveLaneModel {
  key: string;
  title: string;
  summary: string;
  detail: string;
  benchmark: string;
  weight: number;
  weightLabel: string;
  accent: string;
}

interface ProofBadgeModel {
  label: string;
  value: string;
}

interface FirstScreenKpiCardModel {
  key: string;
  label: string;
  value: string;
  detail: string;
}

interface NarrativeSummary {
  headline: string;
  description: string;
}

interface ReplayTrendCardModel {
  key: string;
  label: string;
  value: string;
  detail: string;
  footer: string;
  accent: string;
  series: number[];
  maskSource?: 'decision' | 'runtime-fallback';
}

interface ProvenanceSummary {
  reproductionAssumptionFieldCount: number;
  classifications: string[];
}

const {
  badgeRowStyle,
  brandBadgeStyle,
  containerStyle,
  decisionFlowStyle,
  evidenceCardBodyStyle,
  evidenceCardStyle,
  evidenceCardTitleStyle,
  evidenceFigureFrameStyle,
  evidenceFigureImageStyle,
  evidenceGridStyle,
  evidencePanelStyle,
  evidenceSparkFrameStyle,
  evidenceStatGridStyle,
  evidenceStatLabelStyle,
  evidenceStatStyle,
  evidenceStatValueStyle,
  flowBodyStyle,
  flowCardStyle,
  flowMiniGridStyle,
  flowMiniLabelStyle,
  flowMiniStyle,
  flowMiniValueStyle,
  flowStepStyle,
  flowTitleStyle,
  flowValueStyle,
  goalDetailStyle,
  goalHeaderStyle,
  goalLaneGridStyle,
  goalLaneStyle,
  goalMixStyle,
  goalPanelStyle,
  goalSummaryStyle,
  goalTitleStyle,
  goalTrackStyle,
  goalWeightBarStyle,
  goalWeightStyle,
  guideIndexStyle,
  guideLabelStyle,
  guidePillStyle,
  guideRowStyle,
  heroBodyStyle,
  heroBrandStyle,
  heroHeadlineStyle,
  heroPanelStyle,
  heroSignalsStyle,
  heroSublineStyle,
  kpiCardStyle,
  kpiDetailStyle,
  kpiLabelStyle,
  kpiStripStyle,
  kpiValueStyle,
  panelBodyStyle,
  panelEyebrowStyle,
  panelTitleStyle,
  proofBadgeStyle,
  proofBadgeWrapStyle,
  replayChartCardStyle,
  replayChartFooterStyle,
  replayChartFrameStyle,
  replayChartGridStyle,
  replayChartLabelStyle,
  replayChartMetaStyle,
  replayChartValueStyle,
  secondaryBadgeStyle,
  sectionStackStyle,
  showcaseGridStyle,
  signalCardStyle,
  signalHintStyle,
  signalLabelStyle,
  signalValueStyle,
  sourceCardStyle,
  sourceGridStyle,
  sourceHintStyle,
  sourceLabelStyle,
  sourcePanelStyle,
  sourceValueStyle,
  storyHeaderStyle,
  storyPanelStyle,
  storyPillStyle,
} = modqnBaselineCompactPanelStyles;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function formatPrimarySinrValue(sinrDb: number | null | undefined): string {
  if (sinrDb === null || sinrDb === undefined || !Number.isFinite(sinrDb)) {
    return 'Not exported';
  }
  return `${sinrDb.toFixed(1)} dB`;
}

function formatPrimarySinrHint(sinrDb: number | null | undefined): string {
  if (sinrDb === null || sinrDb === undefined || !Number.isFinite(sinrDb)) {
    return 'Bundle replay keeps the SINR slot empty when the producer did not export it.';
  }
  if (sinrDb >= 10) return 'Strong signal in this slot.';
  if (sinrDb >= 0) return 'Usable signal in this slot.';
  return 'Weak signal in this slot.';
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
        description: 'The exported replay slot switches the serving path to a different satellite.',
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

function describeDecisionHeadline(decisionStory: ModqnDecisionStoryView | null): string {
  if (!decisionStory) return 'Trained MODQN policy replayed inside the simulator';
  if (decisionStory.handoverKind === 'inter-satellite-handover') {
    return `MODQN switched the live path to ${decisionStory.selectedSatId}`;
  }
  if (decisionStory.handoverKind === 'intra-satellite-beam-switch') {
    return `MODQN stayed on ${decisionStory.selectedSatId} and changed beam`;
  }
  return `MODQN kept ${decisionStory.selectedSatId} as the serving satellite`;
}

function describeActionSummary(decisionStory: ModqnDecisionStoryView | null): string {
  if (!decisionStory) return 'Waiting for bundle action';
  if (
    decisionStory.previousServingSatId === decisionStory.selectedSatId
    && decisionStory.previousServingBeamId === decisionStory.selectedBeamId
  ) {
    return `${decisionStory.selectedSatId} / ${decisionStory.selectedBeamId}`;
  }
  return `${decisionStory.previousServingSatId ?? '—'} -> ${decisionStory.selectedSatId}`;
}

function buildObjectiveLanes(
  bundleSummary: ModqnBundleSummaryView | null,
  trainingEvalSummary: ModqnTrainingEvalSummaryView | null,
  decisionStory: ModqnDecisionStoryView | null,
  narrativeSummary: { headline: string; description: string },
): ObjectiveLaneModel[] {
  const weights = bundleSummary?.rewardWeights ?? [];
  return [
    {
      key: 'throughput',
      title: 'Keep throughput high',
      summary: `Throughput reward ${formatSigned(decisionStory?.rewardVector.throughput, 2)}`,
      detail: decisionStory
        ? `Current scalar-reward contribution from throughput. Selected beam throughput signal ${formatNumber(decisionStory.selectedBeamThroughputBps, 2)}.`
        : 'Waiting for exported throughput reward.',
      benchmark: `Best eval mean R1 ${formatSigned(trainingEvalSummary?.bestEvalMeanR1, 2)}`,
      weight: weights[0] ?? 0,
      weightLabel: `${Math.round(((weights[0] ?? 0) * 100))}% weight`,
      accent: '#ffb44c',
    },
    {
      key: 'handover',
      title: 'Avoid unnecessary handovers',
      summary: decisionStory?.handoverOccurred
        ? titleizeHyphenated(decisionStory.handoverKind)
        : 'No switch cost right now',
      detail: decisionStory
        ? `Handover reward ${formatSigned(decisionStory.rewardVector.handover, 2)}. Narrative is ${narrativeSummary.headline.toLowerCase()}.`
        : 'Waiting for exported handover reward.',
      benchmark: `Best eval mean HO ${formatNumber(trainingEvalSummary?.bestEvalMeanHandovers, 2)}`,
      weight: weights[1] ?? 0,
      weightLabel: `${Math.round(((weights[1] ?? 0) * 100))}% weight`,
      accent: '#2ea7ff',
    },
    {
      key: 'load-balance',
      title: 'Spread traffic across beams',
      summary: decisionStory
        ? `Beam load ${formatNumber(decisionStory.selectedBeamLoad, 2)}`
        : 'Waiting for bundle load signal',
      detail: decisionStory
        ? `Load-balance reward ${formatSigned(decisionStory.rewardVector.loadBalance, 2)} on the selected beam.`
        : 'Waiting for exported load-balance reward.',
      benchmark: `Best eval mean R3 ${formatSigned(trainingEvalSummary?.bestEvalMeanR3, 2)}`,
      weight: weights[2] ?? 0,
      weightLabel: `${Math.round(((weights[2] ?? 0) * 100))}% weight`,
      accent: '#19c37d',
    },
  ];
}

function buildProofBadges(
  bundleSummary: ModqnBundleSummaryView | null,
  trainingEvalSummary: ModqnTrainingEvalSummaryView | null,
): ProofBadgeModel[] {
  return [
    {
      label: 'Checkpoint',
      value: titleizeHyphenated(bundleSummary?.checkpointKind),
    },
    {
      label: 'Best Eval Seeds',
      value: formatCount(trainingEvalSummary?.bestEvalEvalSeedCount),
    },
    {
      label: 'Mean Reward',
      value: formatNumber(trainingEvalSummary?.bestEvalMeanScalarReward, 3),
    },
    {
      label: 'Episodes Completed',
      value: formatCount(trainingEvalSummary?.episodesCompleted),
    },
    {
      label: 'Eval Every',
      value: trainingEvalSummary?.evaluationEveryEpisodes
        ? `${trainingEvalSummary.evaluationEveryEpisodes} eps`
        : '—',
    },
  ];
}

function buildFirstScreenKpiCards(
  bundleSummary: ModqnBundleSummaryView | null,
  sourceLabel: string,
  handoverCount: number,
  assumptionCount: number,
  provenanceSummary: ProvenanceSummary,
  dashboardKpis: ModqnDashboardKpiView | null,
): FirstScreenKpiCardModel[] {
  return [
    {
      key: 'paper-run-checkpoint',
      label: 'Paper / Run / Checkpoint',
      value: bundleSummary
        ? `${bundleSummary.paperId} / ${bundleSummary.runId} / ${titleizeHyphenated(bundleSummary.checkpointKind)}`
        : 'Loading…',
      detail: 'Bundle identity shown on the first screen before any deeper disclosure is opened.',
    },
    {
      key: 'source-label',
      label: 'Source Label',
      value: bundleSummary?.sourceLabel ?? sourceLabel,
      detail: 'Sample and external bundles both pass through this same story-dashboard path.',
    },
    {
      key: 'replay-truth-mode',
      label: 'Replay Truth Mode',
      value: titleizeHyphenated(bundleSummary?.replayTruthMode),
      detail: 'Serving, beam, and handover truth remain bundle-owned rather than native recomputation.',
    },
    {
      key: 'cumulative-handovers',
      label: 'Cumulative Handovers',
      value: formatCount(handoverCount),
      detail: 'Counted up to the current replay slot from the exported frame sequence.',
    },
    {
      key: 'disclosure-summary',
      label: 'Disclosure Summary',
      value: `${assumptionCount} assumptions / ${provenanceSummary.reproductionAssumptionFieldCount} reproduction-assumption fields`,
      detail: provenanceSummary.classifications.join(', ') || 'Waiting for provenance classifications.',
    },
    {
      key: 'current-throughput',
      label: 'Current Throughput',
      value: formatThroughputMbps(dashboardKpis?.currentThroughputMbps),
      detail: dashboardKpis
        ? `Mean to date ${formatThroughputMbps(dashboardKpis.meanThroughputMbpsToDate)}. Replay progress ${formatPercentage(dashboardKpis.replayProgressFraction)} over ${formatCount(dashboardKpis.slotCount)} slots.`
        : 'Waiting for bundle-backed throughput KPIs.',
    },
  ];
}

function renderSourceCard(
  label: string,
  value: React.ReactNode,
  hint?: React.ReactNode,
): React.ReactNode {
  return (
    <div key={label} style={sourceCardStyle}>
      <div style={sourceLabelStyle}>{label}</div>
      <div style={sourceValueStyle}>{value}</div>
      {hint ? <div style={sourceHintStyle}>{hint}</div> : null}
    </div>
  );
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

function renderSparkline(
  series: number[],
  color: string,
  label: string,
): React.ReactNode {
  const { path, points } = createSparklinePath(series);
  return (
    <div style={evidenceSparkFrameStyle}>
      <div style={{ ...evidenceStatLabelStyle, color }}>{label}</div>
      <svg viewBox="0 0 240 72" width="100%" height="72" aria-hidden="true" style={{ marginTop: 8 }}>
        <line x1="0" y1="70" x2="240" y2="70" stroke="rgba(19, 34, 49, 0.12)" strokeWidth="1" />
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
            r={series.length === 1 ? 5 : index === points.length - 1 ? 4 : 0}
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
      label: 'Scalar Reward Across Replay',
      value: formatSigned(current.scalarReward, 2),
      detail: `Mean to this slot ${formatSigned(dashboardKpis?.meanScalarRewardToDate, 2)} across ${formatCount(current.slotIndex)} replayed slots.`,
      footer: `Current point: slot ${current.slotIndex} at ${formatNumber(current.timeSec, 1)} s.`,
      accent: '#ffb44c',
      series: replayTrendSeries.map((point) => point.scalarReward),
    },
    {
      key: 'throughput',
      label: 'UE Throughput Across Replay',
      value: formatThroughputMbps(current.throughputMbps),
      detail: `Mean to this slot ${formatThroughputMbps(dashboardKpis?.meanThroughputMbpsToDate)} over ${formatNumber(dashboardKpis?.timelineSpanSec, 1)} s.`,
      footer: 'Uses the exported bundle KPI overlay only; no native time-series is mixed in.',
      accent: '#2ea7ff',
      series: replayTrendSeries.map((point) => point.throughputMbps),
    },
    {
      key: 'action-coverage',
      label: 'Valid Action Coverage',
      value: formatPercentage(current.validActionRatio),
      detail: `${formatCount(current.validActionCount)} valid actions out of ${formatCount(current.totalActionCount)} total beam choices in the current slot.`,
      footer: current.maskSource === 'runtime-fallback'
        ? `Visible satellites ${formatCount(current.visibleSatelliteCount)}. Handovers to date ${formatCount(current.cumulativeHandovers)}. Decision-time masks were not exported for this bundle slot, so the UI falls back to exported runtime masks.`
        : `Visible satellites ${formatCount(current.visibleSatelliteCount)}. Handovers to date ${formatCount(current.cumulativeHandovers)}.`,
      accent: '#19c37d',
      series: replayTrendSeries.map((point) => point.validActionRatio * 100),
      maskSource: current.maskSource,
    },
  ];
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
          <line
            x1="0"
            y1={height - 1}
            x2={width}
            y2={height - 1}
            stroke="rgba(19, 34, 49, 0.12)"
            strokeWidth="1"
          />
          {areaPath ? (
            <path d={areaPath} fill={accent} opacity={0.16} />
          ) : null}
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
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="5"
                fill="#ffffff"
                stroke={accent}
                strokeWidth="2.5"
              />
            </>
          ) : null}
        </svg>
      </div>
      <div style={replayChartFooterStyle}>{footer}</div>
    </div>
  );
}

function ModqnFirstScreenKpiStrip({
  cards,
}: {
  cards: FirstScreenKpiCardModel[];
}) {
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

interface ModqnHeroSectionProps {
  decisionStory: ModqnDecisionStoryView | null;
  narrativeSummary: NarrativeSummary;
  servingSatId: string | null | undefined;
  sinrDb: number | null | undefined;
  currentSlotIndex: number | null;
  slotCount: number | null;
  handoverCount: number;
}

function ModqnHeroSection({
  decisionStory,
  narrativeSummary,
  servingSatId,
  sinrDb,
  currentSlotIndex,
  slotCount,
  handoverCount,
}: ModqnHeroSectionProps) {
  return (
    <section style={heroPanelStyle}>
      <div style={badgeRowStyle}>
        <span style={brandBadgeStyle}>MODQN Replay</span>
        <span style={secondaryBadgeStyle}>Trained policy inside NTN-SIM-CORE</span>
      </div>
      <div style={heroBrandStyle}>MODQN</div>
      <div style={heroHeadlineStyle}>{describeDecisionHeadline(decisionStory)}</div>
      <div style={heroSublineStyle}>
        Truth Source:{' '}
        <span data-testid="bundle-dashboard-truth-source">MODQN Bundle</span>
      </div>
      <div style={heroBodyStyle}>
        Saved MODQN bundle truth is being replayed inside the simulator. The frontend reads the
        exported policy decisions and runtime snapshot truth instead of recomputing a native
        policy path.
      </div>

      <div style={guideRowStyle}>
        <div style={guidePillStyle}>
          <span style={guideIndexStyle}>1</span>
          <span style={guideLabelStyle}>Training Evidence</span>
        </div>
        <div style={guidePillStyle}>
          <span style={guideIndexStyle}>2</span>
          <span style={guideLabelStyle}>Three Objectives</span>
        </div>
        <div style={guidePillStyle}>
          <span style={guideIndexStyle}>3</span>
          <span style={guideLabelStyle}>Decision Now</span>
        </div>
      </div>

      <div style={heroSignalsStyle}>
        <div style={signalCardStyle}>
          <div style={signalLabelStyle}>Serving Satellite</div>
          <div style={signalValueStyle} data-testid="bundle-dashboard-serving-sat">
            {servingSatId ?? '—'}
          </div>
          <div style={signalHintStyle}>The satellite currently carrying the active service path.</div>
        </div>
        <div style={signalCardStyle}>
          <div style={signalLabelStyle}>Serving Beam</div>
          <div style={signalValueStyle} data-testid="bundle-dashboard-serving-beam">
            {decisionStory?.selectedBeamId ?? '—'}
          </div>
          <div style={signalHintStyle}>Read directly from the exported serving-beam decision.</div>
        </div>
          <div style={signalCardStyle}>
            <div style={signalLabelStyle}>Handover Status</div>
            <div
              style={signalValueStyle}
              data-testid="bundle-dashboard-narrative-label"
            >
              {narrativeSummary.headline}
            </div>
          <div style={signalHintStyle}>
            {narrativeSummary.description}{' '}
            Handover kind:{' '}
            <span data-testid="bundle-dashboard-handover-kind">
              {titleizeHyphenated(decisionStory?.handoverKind)}
            </span>
            .
          </div>
        </div>
        <div style={signalCardStyle}>
          <div style={signalLabelStyle}>Current Slot / Total Slots</div>
          <div style={signalValueStyle} data-testid="bundle-dashboard-slot">
            {currentSlotIndex ?? '—'} / {slotCount ?? '—'}
          </div>
          <div style={signalHintStyle}>The current moment inside the replayed bundle timeline.</div>
        </div>
        <div style={signalCardStyle}>
          <div style={signalLabelStyle}>Cumulative Handovers</div>
          <div style={signalValueStyle} data-testid="bundle-dashboard-handover-count">
            {formatCount(handoverCount)}
          </div>
          <div style={signalHintStyle}>Counted from exported replay slots up to the current frame.</div>
        </div>
        <div style={signalCardStyle}>
          <div style={signalLabelStyle}>Primary SINR</div>
          <div style={signalValueStyle}>{formatPrimarySinrValue(sinrDb)}</div>
          <div style={signalHintStyle}>{formatPrimarySinrHint(sinrDb)}</div>
        </div>
      </div>
    </section>
  );
}

interface ModqnTrainingEvidenceSectionProps {
  trainingEvidence: ModqnTrainingEvidenceView | null;
  trainingEvalSummary: ModqnTrainingEvalSummaryView | null;
  proofBadges: ProofBadgeModel[];
}

function ModqnTrainingEvidenceSection({
  trainingEvidence,
  trainingEvalSummary,
  proofBadges,
}: ModqnTrainingEvidenceSectionProps) {
  return (
    <section style={evidencePanelStyle} data-testid="bundle-training-chart-panel">
      <div style={panelEyebrowStyle}>Training Evidence</div>
      <div style={{ ...panelTitleStyle, marginTop: 6, fontSize: 28 }}>
        Proof that this checkpoint was trained before replay
      </div>
      <div style={panelBodyStyle}>
        These figures and training rows came with the MODQN bundle. On trimmed samples you see a
        checkpoint snapshot; richer bundles automatically expand into longer convergence stories.
      </div>

      <div style={evidenceGridStyle}>
        <div style={evidenceCardStyle}>
          <div style={evidenceCardTitleStyle}>Scalar reward track</div>
          <div style={evidenceCardBodyStyle}>
            The replayed checkpoint carries scalar-reward evidence from training and best-eval
            summary statistics from the producer export.
          </div>
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
            '#ffb44c',
            'Scalar reward',
          )}
          <div style={evidenceStatGridStyle}>
            <div style={evidenceStatStyle}>
              <div style={evidenceStatLabelStyle}>Latest Episode</div>
              <div style={evidenceStatValueStyle}>{formatCount(trainingEvidence?.latestEpisode)}</div>
            </div>
            <div style={evidenceStatStyle}>
              <div style={evidenceStatLabelStyle}>Latest Reward</div>
              <div style={evidenceStatValueStyle}>{formatSigned(trainingEvidence?.latestScalarReward, 2)}</div>
            </div>
            <div style={evidenceStatStyle}>
              <div style={evidenceStatLabelStyle}>Best Eval Mean</div>
              <div style={evidenceStatValueStyle}>{formatSigned(trainingEvalSummary?.bestEvalMeanScalarReward, 2)}</div>
            </div>
          </div>
        </div>

        <div style={evidenceCardStyle}>
          <div style={evidenceCardTitleStyle}>Three-objective training track</div>
          <div style={evidenceCardBodyStyle}>
            Throughput, handover discipline, and load-balance training traces are exported with the
            bundle, so the audience can see the policy was optimized against all three goals.
          </div>
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
              {renderSparkline(
                trainingEvidence?.throughputLossSeries ?? [],
                '#ffb44c',
                'Throughput loss',
              )}
              {renderSparkline(
                trainingEvidence?.handoverLossSeries ?? [],
                '#2ea7ff',
                'Handover loss',
              )}
              {renderSparkline(
                trainingEvidence?.loadBalanceLossSeries ?? [],
                '#19c37d',
                'Load-balance loss',
              )}
            </>
          )}
          <div style={evidenceStatGridStyle}>
            <div style={evidenceStatStyle}>
              <div style={evidenceStatLabelStyle}>Exported Rows</div>
              <div style={evidenceStatValueStyle}>{formatCount(trainingEvidence?.episodeCount)}</div>
            </div>
            <div style={evidenceStatStyle}>
              <div style={evidenceStatLabelStyle}>Latest Epsilon</div>
              <div style={evidenceStatValueStyle}>{formatNumber(trainingEvidence?.latestEpsilon, 2)}</div>
            </div>
            <div style={evidenceStatStyle}>
              <div style={evidenceStatLabelStyle}>Best Eval Seeds</div>
              <div style={evidenceStatValueStyle}>{formatCount(trainingEvalSummary?.bestEvalEvalSeedCount)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={proofBadgeWrapStyle}>
        {proofBadges.map((badge) => (
          <div key={badge.label} style={proofBadgeStyle}>
            <span style={{ color: '#5a7388', fontWeight: 800 }}>{badge.label}</span>
            <span>{badge.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModqnGoalSection({
  objectiveLanes,
}: {
  objectiveLanes: ObjectiveLaneModel[];
}) {
  return (
    <section style={goalPanelStyle}>
      <div style={panelEyebrowStyle}>Three-Objective Policy</div>
      <div style={panelTitleStyle}>One policy score, three optimization targets</div>
      <div style={panelBodyStyle}>
        The scalar reward blends throughput, handover discipline, and load balance. The color bar
        below is the exported reward mix from the replay bundle.
      </div>

      <div style={goalMixStyle}>
        <div style={goalWeightBarStyle}>
          {objectiveLanes.map((lane) => (
            <div
              key={lane.key}
              style={{
                width: String(Math.max(clamp01(lane.weight) * 100, lane.weight > 0 ? 10 : 0)) + '%',
                background: lane.accent,
              }}
            />
          ))}
        </div>

        <div style={goalLaneGridStyle}>
          {objectiveLanes.map((lane) => (
            <div key={lane.key} style={goalLaneStyle}>
              <div style={goalHeaderStyle}>
                <div style={goalTitleStyle}>{lane.title}</div>
                <div style={{ ...goalWeightStyle, color: lane.accent }}>{lane.weightLabel}</div>
              </div>
              <div style={goalSummaryStyle}>{lane.summary}</div>
              <div style={goalDetailStyle}>{lane.detail}</div>
              <div style={goalTrackStyle}>
                <div
                  style={{
                    width: String(clamp01(lane.weight) * 100) + '%',
                    height: '100%',
                    borderRadius: 999,
                    background: lane.accent,
                  }}
                />
              </div>
              <div style={{ ...goalDetailStyle, marginTop: 8 }}>{lane.benchmark}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface ModqnDecisionStorySectionProps {
  currentSlotIndex: number | null;
  slotCount: number | null;
  bundleSummary: ModqnBundleSummaryView | null;
  dashboardKpis: ModqnDashboardKpiView | null;
  decisionStory: ModqnDecisionStoryView | null;
  narrativeSummary: NarrativeSummary;
  handoverCount: number;
  replayTrendSeries: ModqnReplayTrendPointView[];
}

function ModqnDecisionStorySection({
  currentSlotIndex,
  slotCount,
  bundleSummary,
  dashboardKpis,
  decisionStory,
  narrativeSummary,
  handoverCount,
  replayTrendSeries,
}: ModqnDecisionStorySectionProps) {
  const currentFrameIndex = Math.max(
    0,
    Math.min(
      (dashboardKpis?.currentSlotIndex ?? currentSlotIndex ?? 1) - 1,
      Math.max(replayTrendSeries.length - 1, 0),
    ),
  );
  const replayTrendCards = buildReplayTrendCards(
    replayTrendSeries,
    currentFrameIndex,
    dashboardKpis,
  );
  return (
    <section style={storyPanelStyle} data-testid="bundle-decision-story-panel">
      <div style={storyHeaderStyle}>
        <div>
          <div style={panelEyebrowStyle}>Decision Now</div>
          <div style={{ ...panelTitleStyle, marginTop: 6, fontSize: 28 }}>
            What the policy saw, chose, and achieved in this slot
          </div>
        </div>
        <div style={storyPillStyle}>
          Current Slot / Total Slots {currentSlotIndex ?? '—'} / {slotCount ?? bundleSummary?.slotCount ?? '—'}
        </div>
      </div>

      <div style={decisionFlowStyle}>
        <div style={flowCardStyle}>
          <div style={flowStepStyle}>1</div>
          <div style={flowTitleStyle}>State</div>
          <div style={flowValueStyle}>
            {decisionStory
              ? String(decisionStory.visibleSatelliteCount) + ' satellites / ' + String(decisionStory.validActionCount) + ' valid actions'
              : 'Waiting for bundle state'}
          </div>
          <div style={flowBodyStyle}>
            {decisionStory
              ? 'Previous serving link: '
                + (decisionStory.previousServingSatId ?? '—')
                + ' / '
                + (decisionStory.previousServingBeamId ?? '—')
                + '.'
                + (
                  decisionStory.maskSource === 'runtime-fallback'
                    ? ' Decision-time masks were not exported in this bundle slot, so visible/action counts fall back to exported runtime masks.'
                    : ''
                )
              : 'The readable state slice will appear once the bundle frame is ready.'}
          </div>
          <div style={flowMiniGridStyle}>
            <div style={flowMiniStyle}>
              <div style={flowMiniLabelStyle}>Visible Beam Options</div>
              <div style={flowMiniValueStyle}>{formatCount(decisionStory?.visibleBeamCount)}</div>
            </div>
            <div style={flowMiniStyle}>
              <div style={flowMiniLabelStyle}>Replay Truth Mode</div>
              <div style={flowMiniValueStyle}>
                {titleizeHyphenated(bundleSummary?.replayTruthMode)}
              </div>
            </div>
          </div>
        </div>

        <div style={flowCardStyle}>
          <div style={flowStepStyle}>2</div>
          <div style={flowTitleStyle}>Action</div>
          <div style={flowValueStyle}>{describeActionSummary(decisionStory)}</div>
          <div style={flowBodyStyle}>
            {decisionStory
              ? 'Selected beam ' + decisionStory.selectedBeamId + '. Handover type: ' + titleizeHyphenated(decisionStory.handoverKind) + '.'
              : 'The chosen serving satellite and beam come directly from the bundle export.'}
          </div>
          <div style={flowMiniGridStyle}>
            <div style={flowMiniStyle}>
              <div style={flowMiniLabelStyle}>Selected Beam</div>
              <div style={flowMiniValueStyle}>{decisionStory?.selectedBeamId ?? '—'}</div>
            </div>
            <div style={flowMiniStyle}>
              <div style={flowMiniLabelStyle}>Local Beam Index</div>
              <div style={flowMiniValueStyle}>{formatCount(decisionStory?.selectedLocalBeamIndex)}</div>
            </div>
          </div>
        </div>

        <div style={flowCardStyle}>
          <div style={flowStepStyle}>3</div>
          <div style={flowTitleStyle}>Outcome</div>
          <div style={flowValueStyle}>
            Scalar reward {formatSigned(decisionStory?.scalarReward, 3)}
          </div>
          <div style={flowBodyStyle}>
            Handover Narrative: {narrativeSummary.headline}. Cumulative Handovers {handoverCount}.
          </div>
          <div style={flowMiniGridStyle}>
            <div style={flowMiniStyle}>
              <div style={flowMiniLabelStyle}>Throughput Reward</div>
              <div style={flowMiniValueStyle}>{formatSigned(decisionStory?.rewardVector.throughput, 2)}</div>
            </div>
            <div style={flowMiniStyle}>
              <div style={flowMiniLabelStyle}>HO Reward</div>
              <div style={flowMiniValueStyle}>{formatSigned(decisionStory?.rewardVector.handover, 2)}</div>
            </div>
            <div style={flowMiniStyle}>
              <div style={flowMiniLabelStyle}>Load Reward</div>
              <div style={flowMiniValueStyle}>{formatSigned(decisionStory?.rewardVector.loadBalance, 2)}</div>
            </div>
            <div style={flowMiniStyle}>
              <div style={flowMiniLabelStyle}>Selected Beam Load</div>
              <div style={flowMiniValueStyle}>{formatNumber(decisionStory?.selectedBeamLoad, 2)}</div>
            </div>
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

interface ModqnSourceDisclosureSectionProps {
  bundleSummary: ModqnBundleSummaryView | null;
  sourceLabel: string;
  handoverCount: number;
  assumptionCount: number;
  provenanceSummary: ProvenanceSummary;
}

function ModqnSourceDisclosureSection({
  bundleSummary,
  sourceLabel,
  handoverCount,
  assumptionCount,
  provenanceSummary,
}: ModqnSourceDisclosureSectionProps) {
  return (
    <section style={sourcePanelStyle}>
      <div style={panelEyebrowStyle}>Source & Disclosure</div>
      <div style={{ ...panelBodyStyle, marginTop: 6, color: '#c4d4e3' }}>
        Full assumptions and provenance stay behind Disclosure. Use the dedicated
        `Disclosure` toggle in the control panel when you need the longer metadata
        surface; the first screen keeps only the proof that tells the audience where
        this truth came from.
      </div>
      <div style={sourceGridStyle}>
        {renderSourceCard(
          'Paper / Run / Checkpoint',
          bundleSummary
            ? bundleSummary.paperId + ' / ' + bundleSummary.runId + ' / ' + titleizeHyphenated(bundleSummary.checkpointKind)
            : 'Loading…',
        )}
        {renderSourceCard('Source Label', bundleSummary?.sourceLabel ?? sourceLabel)}
        {renderSourceCard(
          'Replay Truth Mode',
          titleizeHyphenated(bundleSummary?.replayTruthMode),
          bundleSummary?.replayTruthMode ?? 'loading…',
        )}
        {renderSourceCard(
          'Cumulative Handovers',
          handoverCount,
          'Counted up to the current replay slot.',
        )}
        {renderSourceCard(
          'Disclosure Summary',
          String(assumptionCount) + ' assumptions / ' + String(provenanceSummary.reproductionAssumptionFieldCount) + ' reproduction-assumption fields',
          provenanceSummary.classifications.join(', ') || 'loading…',
        )}
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
}: ModqnBaselineCompactPanelProps) {
  const primaryUe = snapshot?.ues[0] ?? null;
  const narrativeSummary = useMemo(
    () => describeReplayTruthNarrative(decisionStory),
    [decisionStory],
  );
  const objectiveLanes = useMemo(
    () => buildObjectiveLanes(bundleSummary, trainingEvalSummary, decisionStory, narrativeSummary),
    [bundleSummary, decisionStory, narrativeSummary, trainingEvalSummary],
  );
  const proofBadges = useMemo(
    () => buildProofBadges(bundleSummary, trainingEvalSummary),
    [bundleSummary, trainingEvalSummary],
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
  const firstScreenKpiCards = useMemo(
    () => buildFirstScreenKpiCards(
      bundleSummary,
      sourceLabel,
      handoverCount,
      assumptionCount,
      provenanceSummary,
      dashboardKpis,
    ),
    [assumptionCount, bundleSummary, dashboardKpis, handoverCount, provenanceSummary, sourceLabel],
  );

  if (!visible) return null;

  return (
    <div data-testid="bundle-story-dashboard" style={containerStyle}>
      <div data-testid="modqn-compact-panel">
        <div style={sectionStackStyle}>
          <ModqnHeroSection
            decisionStory={decisionStory}
            narrativeSummary={narrativeSummary}
            servingSatId={decisionStory?.selectedSatId}
            sinrDb={primaryUe?.sinrDb}
            currentSlotIndex={currentSlotIndex}
            slotCount={slotCount ?? bundleSummary?.slotCount ?? null}
            handoverCount={handoverCount}
          />
          <ModqnFirstScreenKpiStrip cards={firstScreenKpiCards} />

          <div style={showcaseGridStyle}>
            <ModqnTrainingEvidenceSection
              trainingEvidence={trainingEvidence}
              trainingEvalSummary={trainingEvalSummary}
              proofBadges={proofBadges}
            />
            <ModqnGoalSection objectiveLanes={objectiveLanes} />
          </div>

          <ModqnDecisionStorySection
            currentSlotIndex={currentSlotIndex}
            slotCount={slotCount}
            bundleSummary={bundleSummary}
            dashboardKpis={dashboardKpis}
            decisionStory={decisionStory}
            narrativeSummary={narrativeSummary}
            handoverCount={handoverCount}
            replayTrendSeries={replayTrendSeries}
          />
        </div>

        <ModqnSourceDisclosureSection
          bundleSummary={bundleSummary}
          sourceLabel={sourceLabel}
          handoverCount={handoverCount}
          assumptionCount={assumptionCount}
          provenanceSummary={provenanceSummary}
        />
      </div>
    </div>
  );
});
