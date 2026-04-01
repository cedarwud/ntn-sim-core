import type { KpiBundle } from '@/core/contracts/kpi-v1';
import type {
  KpiCardViewModel,
  KpiDetailRowViewModel,
  KpiDetailSectionViewModel,
} from './types';

function formatDecimal(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function row(
  label: string,
  rawValue: number,
  formattedValue: string,
  unit?: string,
): KpiDetailRowViewModel {
  return {
    label,
    rawValue,
    formattedValue,
    unit,
  };
}

export function projectKpiBundleToCards(bundle: KpiBundle): KpiCardViewModel[] {
  return [
    {
      label: 'Mean SINR',
      rawValue: bundle.meanSinrDb,
      formattedValue: formatDecimal(bundle.meanSinrDb, 2),
      unit: 'dB',
    },
    {
      label: 'Mean Throughput',
      rawValue: bundle.meanThroughputMbps,
      formattedValue: formatDecimal(bundle.meanThroughputMbps, 2),
      unit: 'Mbps',
    },
    {
      label: 'Total Handovers',
      rawValue: bundle.totalHandovers,
      formattedValue: String(bundle.totalHandovers),
    },
    {
      label: 'Availability',
      rawValue: bundle.serviceAvailability,
      formattedValue: formatPercent(bundle.serviceAvailability, 2),
      unit: '%',
    },
    {
      label: 'Ping-Pong',
      rawValue: bundle.pingPongCount,
      formattedValue: String(bundle.pingPongCount),
    },
    {
      label: 'Jain Fairness',
      rawValue: bundle.jainFairnessIndex,
      formattedValue: formatDecimal(bundle.jainFairnessIndex, 4),
    },
  ];
}

export function projectKpiBundleToSections(bundle: KpiBundle): KpiDetailSectionViewModel[] {
  return [
    {
      title: 'Handover',
      rows: [
        row('Total Handovers', bundle.totalHandovers, String(bundle.totalHandovers)),
        row('HO Failures', bundle.handoverFailures, String(bundle.handoverFailures)),
        row('Unnecessary HOs', bundle.unnecessaryHandovers, String(bundle.unnecessaryHandovers)),
        row('Ping-Pong Count', bundle.pingPongCount, String(bundle.pingPongCount)),
        row('HO Rate', bundle.handoverRate, formatDecimal(bundle.handoverRate, 2), '/min'),
        row(
          'Mean Interruption',
          bundle.meanHandoverInterruptionMs,
          formatDecimal(bundle.meanHandoverInterruptionMs, 1),
          'ms',
        ),
      ],
    },
    {
      title: 'Signal',
      rows: [
        row('Mean SINR', bundle.meanSinrDb, formatDecimal(bundle.meanSinrDb, 2), 'dB'),
        row('P5 SINR', bundle.sinrPercentile5Db, formatDecimal(bundle.sinrPercentile5Db, 2), 'dB'),
        row('P50 SINR', bundle.sinrPercentile50Db, formatDecimal(bundle.sinrPercentile50Db, 2), 'dB'),
        row('P95 SINR', bundle.sinrPercentile95Db, formatDecimal(bundle.sinrPercentile95Db, 2), 'dB'),
        row('Outage Ratio', bundle.outageRatio, formatPercent(bundle.outageRatio, 2), '%'),
      ],
    },
    {
      title: 'Throughput And Service',
      rows: [
        row(
          'Mean Throughput',
          bundle.meanThroughputMbps,
          formatDecimal(bundle.meanThroughputMbps, 2),
          'Mbps',
        ),
        row(
          'Cell-Edge Throughput',
          bundle.cellEdgeThroughputMbps,
          formatDecimal(bundle.cellEdgeThroughputMbps, 2),
          'Mbps',
        ),
        row(
          'Mean Service Time',
          bundle.meanServiceTimeSec,
          formatDecimal(bundle.meanServiceTimeSec, 2),
          's',
        ),
        row(
          'Availability',
          bundle.serviceAvailability,
          formatPercent(bundle.serviceAvailability, 2),
          '%',
        ),
        row(
          'Jain Fairness',
          bundle.jainFairnessIndex,
          formatDecimal(bundle.jainFairnessIndex, 4),
        ),
      ],
    },
    {
      title: 'Energy',
      rows: [
        row(
          'System EE',
          bundle.systemEeBitsPerJoule,
          formatDecimal(bundle.systemEeBitsPerJoule, 2),
          'bits/J',
        ),
        row('Total Power', bundle.totalPowerW, formatDecimal(bundle.totalPowerW, 2), 'W'),
        row(
          'Active Beam Ratio',
          bundle.activeBeamRatio,
          formatPercent(bundle.activeBeamRatio, 2),
          '%',
        ),
      ],
    },
  ];
}
