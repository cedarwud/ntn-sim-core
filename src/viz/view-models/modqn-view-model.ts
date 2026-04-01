import type { KpiBundle } from '@/core/contracts/kpi-v1';
import type { ModqnReproductionResult } from '@/core/experiments/modqn-reproduction-types';

type SupportedPaperTargets = Pick<
  KpiBundle,
  'meanSinrDb' | 'meanThroughputMbps' | 'totalHandovers' | 'pingPongCount' | 'outageRatio'
>;

export interface ModqnComparisonRow {
  readonly metric: string;
  readonly reproduction: string;
  readonly paperTarget: string | null;
  readonly unit?: string;
}

/**
 * MODQN View Model for UI / dashboard consumption.
 *
 * This projector consumes only the stable M3 result bundle. Any optional paper
 * targets must be provided explicitly by the caller; this layer does not invent
 * them from heuristics or hidden constants.
 *
 * @layer viz/view-models
 * @frozen 2026-04-01 (M3)
 * @authority sdd/modqn-experiment-outline.md §2.2
 */
export class ModqnViewModel {
  private readonly result: ModqnReproductionResult;
  private readonly paperTargets: Partial<SupportedPaperTargets>;

  constructor(
    result: ModqnReproductionResult,
    paperTargets: Partial<SupportedPaperTargets> = {},
  ) {
    this.result = result;
    this.paperTargets = paperTargets;
  }

  public getTrainingConvergenceData() {
    const { curves } = this.result.trainingSummary;
    return {
      labels: [...curves.episodes],
      datasets: [
        {
          label: 'Throughput Loss',
          data: [...curves.throughputLoss],
          borderColor: 'rgb(75, 192, 192)',
        },
        {
          label: 'Handover Loss',
          data: [...curves.handoverLoss],
          borderColor: 'rgb(255, 99, 132)',
        },
        {
          label: 'Load Balance Loss',
          data: [...curves.loadBalanceLoss],
          borderColor: 'rgb(54, 162, 235)',
        },
      ],
    };
  }

  public getRewardTrajectoryData() {
    const { curves } = this.result.trainingSummary;
    return {
      labels: [...curves.episodes],
      datasets: [
        {
          label: 'Scalarized Reward',
          data: [...curves.scalarReward],
          borderColor: 'rgb(153, 102, 255)',
          fill: true,
        },
      ],
    };
  }

  public getKpiComparison(): ModqnComparisonRow[] {
    const kpi = this.result.heldOutEvaluation.averageKpi;
    return [
      {
        metric: 'Mean SINR',
        reproduction: kpi.meanSinrDb.toFixed(2),
        paperTarget: this.toOptionalString(this.paperTargets.meanSinrDb, 2),
        unit: 'dB',
      },
      {
        metric: 'Mean Throughput',
        reproduction: kpi.meanThroughputMbps.toFixed(2),
        paperTarget: this.toOptionalString(this.paperTargets.meanThroughputMbps, 2),
        unit: 'Mbps',
      },
      {
        metric: 'Total Handovers',
        reproduction: String(kpi.totalHandovers),
        paperTarget: this.toOptionalString(this.paperTargets.totalHandovers),
      },
      {
        metric: 'Ping-Pong Count',
        reproduction: String(kpi.pingPongCount),
        paperTarget: this.toOptionalString(this.paperTargets.pingPongCount),
      },
      {
        metric: 'Outage Ratio',
        reproduction: kpi.outageRatio.toFixed(4),
        paperTarget: this.toOptionalString(this.paperTargets.outageRatio, 4),
      },
    ];
  }

  public getLimitations(): string[] {
    return [...this.result.metadata.constraints];
  }

  public getMetadata() {
    return {
      paperId: this.result.metadata.paperId,
      timestamp: this.result.metadata.reproductionTimestamp,
      episodes: this.result.trainingSummary.totalEpisodes,
      heldOutWindows: this.result.heldOutEvaluation.windows.length,
      wallClockSec: Number((this.result.trainingSummary.wallClockMs / 1000).toFixed(1)),
    };
  }

  private toOptionalString(value: number | undefined, decimals = 0): string | null {
    if (value === undefined) {
      return null;
    }
    return decimals > 0 ? value.toFixed(decimals) : String(value);
  }
}
