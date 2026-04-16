import React, { useMemo } from 'react';

import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import {
  formatContinuityNarrativeLabel,
  type ContinuityNarrativeState,
} from '@/viz/presentation';
import type {
  ModqnBundleSummaryView,
  ModqnDecisionStoryView,
  ModqnProvenanceFieldView,
  ModqnProvenanceLegendEntry,
  ModqnTrainingEvidenceView,
  ModqnTrainingEvalSummaryView,
} from '@/viz/view-models/modqn-bundle-replay-view-model';

export interface ModqnBaselineCompactPanelProps {
  visible: boolean;
  snapshot: SimulationSnapshot | null;
  continuityNarrative: ContinuityNarrativeState | null;
  bundleSummary: ModqnBundleSummaryView | null;
  trainingEvalSummary: ModqnTrainingEvalSummaryView | null;
  trainingEvidence: ModqnTrainingEvidenceView | null;
  decisionStory: ModqnDecisionStoryView | null;
  sourceLabel: string;
  currentSlotIndex: number | null;
  slotCount: number | null;
  handoverCount: number;
  assumptionCount: number;
  provenanceLegend: ModqnProvenanceLegendEntry[];
  provenanceFields: ModqnProvenanceFieldView[];
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

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 11,
  width: 'min(960px, calc(100vw - 32px))',
  maxHeight: 'calc(100vh - 32px)',
  padding: '22px 24px 18px',
  borderRadius: 30,
  border: '1px solid rgba(255, 255, 255, 0.2)',
  background:
    'linear-gradient(135deg, rgba(245, 245, 235, 0.95) 0%, rgba(239, 246, 255, 0.93) 55%, rgba(233, 244, 255, 0.95) 100%)',
  boxShadow: '0 32px 80px rgba(7, 18, 28, 0.34)',
  color: '#132231',
  fontFamily: '"IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif',
  overflowY: 'auto',
  pointerEvents: 'auto',
  overscrollBehavior: 'contain',
  backdropFilter: 'blur(18px)',
};

const sectionStackStyle: React.CSSProperties = {
  display: 'grid',
  gap: 14,
};

const showcaseGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 14,
};

const heroPanelStyle: React.CSSProperties = {
  padding: '22px 22px 18px',
  borderRadius: 24,
  background:
    'radial-gradient(circle at top right, rgba(255, 200, 107, 0.35) 0%, rgba(255, 200, 107, 0.04) 32%, rgba(255, 255, 255, 0.04) 100%), linear-gradient(160deg, rgba(11, 22, 37, 0.96) 0%, rgba(18, 35, 55, 0.94) 100%)',
  color: '#f8fbff',
  border: '1px solid rgba(255, 255, 255, 0.08)',
};

const goalPanelStyle: React.CSSProperties = {
  padding: '20px 20px 18px',
  borderRadius: 24,
  background: 'rgba(255, 255, 255, 0.74)',
  border: '1px solid rgba(19, 34, 49, 0.08)',
};

const badgeRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
};

const brandBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '6px 12px',
  background: 'rgba(255, 201, 111, 0.16)',
  color: '#ffe6b5',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
};

const secondaryBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '6px 12px',
  background: 'rgba(109, 221, 255, 0.12)',
  color: '#d7f6ff',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const heroBrandStyle: React.CSSProperties = {
  marginTop: 16,
  fontSize: 48,
  lineHeight: 0.95,
  fontWeight: 900,
  letterSpacing: -1.5,
};

const heroHeadlineStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 28,
  lineHeight: 1.08,
  fontWeight: 800,
  letterSpacing: -0.55,
  maxWidth: 560,
};

const heroSublineStyle: React.CSSProperties = {
  marginTop: 10,
  color: '#dbe8f6',
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.35,
};

const heroBodyStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#b8cadb',
  fontSize: 15,
  lineHeight: 1.45,
  maxWidth: 620,
};

const guideRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 14,
};

const guidePillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
};

const guideIndexStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  borderRadius: 999,
  background: 'rgba(255, 201, 111, 0.22)',
  color: '#ffe6b5',
  fontSize: 11,
  fontWeight: 900,
};

const guideLabelStyle: React.CSSProperties = {
  color: '#e9f4ff',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.25,
};

const heroSignalsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 10,
  marginTop: 18,
};

const signalCardStyle: React.CSSProperties = {
  padding: '12px 12px 11px',
  borderRadius: 18,
  background: 'rgba(255, 255, 255, 0.07)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

const signalLabelStyle: React.CSSProperties = {
  color: '#9bb6cc',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.45,
};

const signalValueStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#ffffff',
  fontSize: 24,
  lineHeight: 1.05,
  fontWeight: 800,
  letterSpacing: -0.4,
};

const signalHintStyle: React.CSSProperties = {
  marginTop: 5,
  color: '#bed0df',
  fontSize: 12,
  lineHeight: 1.4,
};

const panelEyebrowStyle: React.CSSProperties = {
  color: '#5f7e95',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
};

const panelTitleStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#132231',
  fontSize: 28,
  lineHeight: 1.08,
  fontWeight: 850,
  letterSpacing: -0.5,
};

const panelBodyStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#4d6375',
  fontSize: 14,
  lineHeight: 1.45,
};

const goalMixStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  marginTop: 16,
};

const goalWeightBarStyle: React.CSSProperties = {
  display: 'flex',
  height: 14,
  borderRadius: 999,
  overflow: 'hidden',
  background: 'rgba(19, 34, 49, 0.08)',
};

const goalLaneGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  marginTop: 10,
};

const goalLaneStyle: React.CSSProperties = {
  padding: '12px 12px 10px',
  borderRadius: 18,
  background: 'rgba(255, 255, 255, 0.75)',
  border: '1px solid rgba(19, 34, 49, 0.08)',
};

const goalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  alignItems: 'baseline',
};

const goalTitleStyle: React.CSSProperties = {
  color: '#172739',
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.2,
};

const goalWeightStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
};

const goalSummaryStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#0e1d2d',
  fontSize: 20,
  fontWeight: 800,
  lineHeight: 1.12,
  letterSpacing: -0.35,
};

const goalDetailStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#4b6274',
  fontSize: 13,
  lineHeight: 1.4,
};

const goalTrackStyle: React.CSSProperties = {
  marginTop: 10,
  height: 8,
  borderRadius: 999,
  background: 'rgba(19, 34, 49, 0.08)',
  overflow: 'hidden',
};

const proofBadgeWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 16,
};

const proofBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  borderRadius: 999,
  padding: '8px 13px',
  background: 'rgba(19, 34, 49, 0.05)',
  color: '#183044',
  fontSize: 13,
  fontWeight: 700,
};

const evidencePanelStyle: React.CSSProperties = {
  padding: '18px 18px 16px',
  borderRadius: 24,
  background: 'rgba(255, 255, 255, 0.8)',
  border: '1px solid rgba(19, 34, 49, 0.08)',
};

const evidenceGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 12,
  marginTop: 14,
};

const evidenceCardStyle: React.CSSProperties = {
  padding: '14px 14px 12px',
  borderRadius: 22,
  background: 'rgba(247, 250, 252, 0.98)',
  border: '1px solid rgba(19, 34, 49, 0.07)',
};

const evidenceCardTitleStyle: React.CSSProperties = {
  color: '#132231',
  fontSize: 17,
  fontWeight: 800,
  lineHeight: 1.2,
};

const evidenceCardBodyStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#4b6274',
  fontSize: 14,
  lineHeight: 1.45,
};

const evidenceFigureFrameStyle: React.CSSProperties = {
  marginTop: 12,
  borderRadius: 16,
  overflow: 'hidden',
  border: '1px solid rgba(19, 34, 49, 0.08)',
  background: '#edf3f8',
};

const evidenceFigureImageStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: 220,
  objectFit: 'cover',
};

const evidenceSparkFrameStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '12px 12px 10px',
  borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(244, 248, 252, 0.95) 0%, rgba(234, 242, 248, 0.98) 100%)',
  border: '1px solid rgba(19, 34, 49, 0.08)',
};

const evidenceStatGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 10,
  marginTop: 12,
};

const evidenceStatStyle: React.CSSProperties = {
  padding: '9px 10px 8px',
  borderRadius: 14,
  background: 'rgba(19, 34, 49, 0.05)',
};

const evidenceStatLabelStyle: React.CSSProperties = {
  color: '#5f7e95',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
};

const evidenceStatValueStyle: React.CSSProperties = {
  marginTop: 4,
  color: '#122131',
  fontSize: 18,
  fontWeight: 800,
  lineHeight: 1.2,
};

const storyPanelStyle: React.CSSProperties = {
  padding: '18px 18px 16px',
  borderRadius: 24,
  background: 'rgba(255, 255, 255, 0.7)',
  border: '1px solid rgba(19, 34, 49, 0.08)',
};

const storyHeaderStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  gap: 10,
  alignItems: 'baseline',
};

const storyPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '7px 11px',
  background: 'rgba(19, 34, 49, 0.06)',
  color: '#224055',
  fontSize: 13,
  fontWeight: 800,
};

const decisionFlowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 12,
  marginTop: 14,
};

const flowCardStyle: React.CSSProperties = {
  padding: '16px 16px 14px',
  borderRadius: 20,
  background: 'rgba(249, 251, 253, 0.92)',
  border: '1px solid rgba(19, 34, 49, 0.08)',
};

const flowStepStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  borderRadius: 999,
  background: '#102033',
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 800,
};

const flowTitleStyle: React.CSSProperties = {
  marginTop: 10,
  color: '#132231',
  fontSize: 16,
  fontWeight: 800,
};

const flowValueStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#091623',
  fontSize: 24,
  lineHeight: 1.12,
  fontWeight: 800,
  letterSpacing: -0.35,
};

const flowBodyStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#4b6274',
  fontSize: 13,
  lineHeight: 1.45,
};

const flowMiniGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
  marginTop: 12,
};

const flowMiniStyle: React.CSSProperties = {
  padding: '9px 10px 8px',
  borderRadius: 14,
  background: 'rgba(19, 34, 49, 0.05)',
};

const flowMiniLabelStyle: React.CSSProperties = {
  color: '#5e7b92',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.4,
};

const flowMiniValueStyle: React.CSSProperties = {
  marginTop: 5,
  color: '#132231',
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.2,
};

const sourcePanelStyle: React.CSSProperties = {
  marginTop: 14,
  padding: '12px 14px 12px',
  borderRadius: 22,
  background: 'rgba(16, 32, 51, 0.92)',
  color: '#eff6fc',
};

const sourceGridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 10,
};

const sourceCardStyle: React.CSSProperties = {
  padding: '10px 12px 9px',
  borderRadius: 18,
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  minWidth: 160,
  flex: '1 1 180px',
};

const sourceLabelStyle: React.CSSProperties = {
  color: '#9fb9cf',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.45,
};

const sourceValueStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#ffffff',
  fontSize: 14,
  lineHeight: 1.25,
  fontWeight: 800,
  overflowWrap: 'anywhere',
};

const sourceHintStyle: React.CSSProperties = {
  marginTop: 5,
  color: '#bfd0df',
  fontSize: 12,
  lineHeight: 1.35,
};

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

function titleizeHyphenated(value: string | null | undefined): string {
  if (!value) return 'Not specified';
  return value
    .split(/[-_]/g)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function describeNarrative(narrative: ContinuityNarrativeState | null | undefined): {
  headline: string;
  description: string;
} {
  switch (narrative?.phase) {
    case 'prepared':
      return {
        headline: 'Preparing next path',
        description: 'A target satellite is already visible before the serving switch happens.',
      };
    case 'dual-active':
      return {
        headline: 'Switch in progress',
        description: 'Old and new paths are both visible during the handover window.',
      };
    case 'post-switch':
      return {
        headline: 'Just switched',
        description: 'The new serving satellite is active and the old one is still shown briefly.',
      };
    case 'stable':
    default:
      return {
        headline: 'Stable connection',
        description: 'One serving satellite is carrying the active link right now.',
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

export const ModqnBaselineCompactPanel = React.memo(function ModqnBaselineCompactPanel({
  visible,
  snapshot,
  continuityNarrative,
  bundleSummary,
  trainingEvalSummary,
  trainingEvidence,
  decisionStory,
  sourceLabel,
  currentSlotIndex,
  slotCount,
  handoverCount,
  assumptionCount,
  provenanceLegend,
  provenanceFields,
}: ModqnBaselineCompactPanelProps) {
  const primaryUe = snapshot?.ues[0] ?? null;
  const narrativeSummary = useMemo(
    () => describeNarrative(continuityNarrative),
    [continuityNarrative],
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

  if (!visible) return null;

  return (
    <div style={containerStyle} data-testid="modqn-compact-panel">
      <div style={sectionStackStyle}>
        <section style={heroPanelStyle}>
          <div style={badgeRowStyle}>
            <span style={brandBadgeStyle}>MODQN Replay</span>
            <span style={secondaryBadgeStyle}>Trained policy inside NTN-SIM-CORE</span>
          </div>
          <div style={heroBrandStyle}>MODQN</div>
          <div style={heroHeadlineStyle}>{describeDecisionHeadline(decisionStory)}</div>
          <div style={heroSublineStyle}>Truth Source: MODQN Bundle</div>
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
              <div style={signalValueStyle}>{primaryUe?.servingSatId ?? '—'}</div>
              <div style={signalHintStyle}>The satellite currently carrying the active service path.</div>
            </div>
            <div style={signalCardStyle}>
              <div style={signalLabelStyle}>Handover Status</div>
              <div style={signalValueStyle}>{narrativeSummary.headline}</div>
              <div style={signalHintStyle}>{narrativeSummary.description}</div>
            </div>
            <div style={signalCardStyle}>
              <div style={signalLabelStyle}>Current Slot / Total Slots</div>
              <div style={signalValueStyle}>
                {currentSlotIndex ?? '—'} / {slotCount ?? bundleSummary?.slotCount ?? '—'}
              </div>
              <div style={signalHintStyle}>The current moment inside the replayed bundle timeline.</div>
            </div>
            <div style={signalCardStyle}>
              <div style={signalLabelStyle}>Primary SINR</div>
              <div style={signalValueStyle}>{formatPrimarySinrValue(primaryUe?.sinrDb)}</div>
              <div style={signalHintStyle}>{formatPrimarySinrHint(primaryUe?.sinrDb)}</div>
            </div>
          </div>
        </section>

        <div style={showcaseGridStyle}>
          <section style={evidencePanelStyle}>
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
        </div>

        <section style={storyPanelStyle}>
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
                  ? 'Previous serving link: ' + (decisionStory.previousServingSatId ?? '—') + ' / ' + (decisionStory.previousServingBeamId ?? '—') + '.'
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
                Handover Narrative: {formatContinuityNarrativeLabel(continuityNarrative)}. Cumulative Handovers {handoverCount}.
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
        </section>
      </div>

      <section style={sourcePanelStyle}>
        <div style={panelEyebrowStyle}>Source & Disclosure</div>
        <div style={{ ...panelBodyStyle, marginTop: 6, color: '#c4d4e3' }}>
          Full assumptions and provenance stay behind Disclosure. The first screen keeps only the proof
          that tells the audience where this truth came from.
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
    </div>
  );
});
