import type { ModqnProfileOverrides, ModqnReproductionResult } from './modqn-reproduction-types';

export type ModqnParityLabel = 'trend-faithful' | 'range-faithful' | 'qualitative-only';

export type ModqnParityComparisonMode =
  | 'paper-parameter-envelope'
  | 'held-out-scalar-reward-trend'
  | 'paper-qualitative-comparator';

export interface ModqnParityParameterRow {
  readonly parameter: string;
  readonly paperValue: string;
  readonly reproductionValue: string;
  readonly note?: string;
}

export interface ModqnParitySweepPoint {
  readonly pointId: string;
  readonly label: string;
  readonly axisValue: number;
  readonly profileOverrides: ModqnProfileOverrides;
  readonly result: ModqnReproductionResult;
}

export interface ModqnParityTargetBase {
  readonly id: string;
  readonly title: string;
  readonly paperReference: string;
  readonly comparisonMode: ModqnParityComparisonMode;
  readonly parityLabel: ModqnParityLabel;
  readonly paperClaim: string;
  readonly reproductionClaim: string;
  readonly deviationNotes: readonly string[];
}

export interface ModqnParityEnvelopeTarget extends ModqnParityTargetBase {
  readonly kind: 'parameter-envelope';
  readonly parameterRows: readonly ModqnParityParameterRow[];
}

export interface ModqnParitySweepTarget extends ModqnParityTargetBase {
  readonly kind: 'scalar-reward-trend';
  readonly expectedTrend: 'increasing' | 'decreasing';
  readonly observedTrend: 'increasing' | 'decreasing' | 'mixed';
  readonly points: readonly ModqnParitySweepPoint[];
}

export interface ModqnParityQualitativeTarget extends ModqnParityTargetBase {
  readonly kind: 'qualitative-ranking';
  readonly evidenceNote: string;
}

export type ModqnParityTarget =
  | ModqnParityEnvelopeTarget
  | ModqnParitySweepTarget
  | ModqnParityQualitativeTarget;

export interface ModqnParityComparisonRow {
  readonly targetId: string;
  readonly targetTitle: string;
  readonly paperReference: string;
  readonly comparisonMode: ModqnParityComparisonMode;
  readonly parityLabel: ModqnParityLabel;
  readonly paperTarget: string;
  readonly reproductionEvidence: string;
  readonly deviationSummary: string;
}

export interface ModqnPaperReadySeriesPoint {
  readonly x: number;
  readonly y: number;
}

export interface ModqnPaperReadyFigure {
  readonly id: string;
  readonly title: string;
  readonly paperReference: string;
  readonly parityLabel: ModqnParityLabel;
  readonly xLabel: string;
  readonly yLabel: string;
  readonly series: readonly {
    readonly label: string;
    readonly points: readonly ModqnPaperReadySeriesPoint[];
  }[];
  readonly note: string;
}

export interface ModqnAnchorParityBundle {
  readonly anchor: {
    readonly paperId: 'PAP-2024-MORL-MULTIBEAM';
    readonly profileId: 'modqn-paper-baseline';
    readonly familyId: 'FAM-MODQN-SYNTH';
  };
  readonly baseResult: ModqnReproductionResult;
  readonly targets: readonly ModqnParityTarget[];
  readonly comparisonRows: readonly ModqnParityComparisonRow[];
  readonly figures: readonly ModqnPaperReadyFigure[];
  readonly disclosureNotes: readonly string[];
  readonly verdict: string;
  readonly claimCeiling: string;
  readonly generatedAt: string;
}
