/**
 * KPI accumulator for ntn-sim-core.
 *
 * Collects per-tick SINR, handover, and service-state samples,
 * then computes the full KpiBundle at finalize time.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.5
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3, §4.3
 *   - Source tiers:
 *       sinrOutageThresholdDb = -8 dB → paper-backed (PAP-2022-SINR-ELEVATION)
 *       accumulator logic → normative
 *   - This file must not import React, Three.js, or scene code.
 */

import type { KpiBundle } from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface KpiAccumulatorConfig {
  /** SINR outage threshold in dB. Default -8 dB (PAP-2022-SINR-ELEVATION). */
  sinrOutageThresholdDb: number;
  /** Ping-pong detection window in seconds. Default 5 sec. */
  pingPongWindowSec: number;
  /** System bandwidth in MHz, for Shannon throughput proxy. */
  bandwidthMhz: number;
}

// ---------------------------------------------------------------------------
// Accumulator interface
// ---------------------------------------------------------------------------

export interface KpiAccumulator {
  /** Record a SINR sample for a UE at this tick. */
  recordSinr(ueId: string, sinrDb: number, timeSec: number): void;

  /** Record a handover event. */
  recordHandover(event: {
    timeSec: number;
    type: 'complete' | 'fail';
    sourceId: string;
    targetId: string;
    sourceSinrDb: number;
    interruptionMs: number;
  }): void;

  /** Record service state for a UE. */
  recordServiceState(ueId: string, isServed: boolean, timeSec: number): void;

  /** Finalize and compute all KPIs. Returns immutable bundle. Idempotent. */
  finalize(wallClockMs: number): KpiBundle;

  /** Reset all accumulators. */
  reset(): void;
}

// ---------------------------------------------------------------------------
// Handover record (internal)
// ---------------------------------------------------------------------------

interface HandoverRecord {
  timeSec: number;
  type: 'complete' | 'fail';
  sourceId: string;
  targetId: string;
  sourceSinrDb: number;
  interruptionMs: number;
}

// ---------------------------------------------------------------------------
// Per-UE tracking (internal)
// ---------------------------------------------------------------------------

interface UeTracker {
  sinrSamples: number[];
  /** Last two serving satellite IDs and their HO timestamps. */
  lastServingIds: { id: string; timeSec: number }[];
  /** Total served time samples. */
  servedCount: number;
  totalCount: number;
  /** Service continuity: timestamps of service start. */
  serviceStartSec: number | null;
  serviceDurations: number[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the p-th percentile from a sorted array using linear interpolation.
 * p is in [0, 100].
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/** Shannon throughput proxy: BW_MHz * log2(1 + 10^(sinrDb/10)) in Mbps. */
function shannonThroughput(sinrDb: number, bwMhz: number): number {
  const sinrLinear = Math.pow(10, sinrDb / 10);
  return bwMhz * Math.log2(1 + sinrLinear);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createKpiAccumulator(config: KpiAccumulatorConfig): KpiAccumulator {
  let ueTrackers = new Map<string, UeTracker>();
  let handovers: HandoverRecord[] = [];
  let totalTicks = 0;
  let maxTimeSec = 0;
  let cachedBundle: KpiBundle | null = null;

  function getTracker(ueId: string): UeTracker {
    let t = ueTrackers.get(ueId);
    if (!t) {
      t = {
        sinrSamples: [],
        lastServingIds: [],
        servedCount: 0,
        totalCount: 0,
        serviceStartSec: null,
        serviceDurations: [],
      };
      ueTrackers.set(ueId, t);
    }
    return t;
  }

  function resetState(): void {
    ueTrackers = new Map();
    handovers = [];
    totalTicks = 0;
    maxTimeSec = 0;
    cachedBundle = null;
  }

  return {
    recordSinr(ueId: string, sinrDb: number, timeSec: number): void {
      cachedBundle = null;
      const t = getTracker(ueId);
      t.sinrSamples.push(sinrDb);
      totalTicks = Math.max(totalTicks, t.sinrSamples.length);
      if (timeSec > maxTimeSec) maxTimeSec = timeSec;
    },

    recordHandover(event): void {
      cachedBundle = null;
      handovers.push(event);
      if (event.timeSec > maxTimeSec) maxTimeSec = event.timeSec;

      // Track serving history for ping-pong detection per UE
      // We use targetId as proxy for UE's new serving; sourceId as previous.
      // Ping-pong is tracked globally since we don't have ueId in HO events.
    },

    recordServiceState(ueId: string, isServed: boolean, timeSec: number): void {
      cachedBundle = null;
      const t = getTracker(ueId);
      t.totalCount++;
      if (isServed) {
        t.servedCount++;
        if (t.serviceStartSec === null) {
          t.serviceStartSec = timeSec;
        }
      } else {
        if (t.serviceStartSec !== null) {
          t.serviceDurations.push(timeSec - t.serviceStartSec);
          t.serviceStartSec = null;
        }
      }
      if (timeSec > maxTimeSec) maxTimeSec = timeSec;
    },

    finalize(wallClockMs: number): KpiBundle {
      if (cachedBundle !== null && cachedBundle.wallClockMs === wallClockMs) {
        return cachedBundle;
      }

      const durationSec = maxTimeSec > 0 ? maxTimeSec : 0;

      // ---- Handover KPIs ----
      const completedHos = handovers.filter((h) => h.type === 'complete');
      const failedHos = handovers.filter((h) => h.type === 'fail');

      const totalHandovers = completedHos.length;
      const handoverFailures = failedHos.length;

      // UHO: source SINR > threshold + 3 dB at HO time
      const uhoThreshold = config.sinrOutageThresholdDb + 3;
      const unnecessaryHandovers = completedHos.filter(
        (h) => h.sourceSinrDb > uhoThreshold,
      ).length;

      // Ping-pong: A→B then B→A within window.
      // Build a timeline and check consecutive pairs.
      let pingPongCount = 0;
      const sortedHos = [...completedHos].sort((a, b) => a.timeSec - b.timeSec);
      for (let i = 1; i < sortedHos.length; i++) {
        const prev = sortedHos[i - 1];
        const curr = sortedHos[i];
        if (
          curr.targetId === prev.sourceId &&
          curr.sourceId === prev.targetId &&
          curr.timeSec - prev.timeSec <= config.pingPongWindowSec
        ) {
          pingPongCount++;
        }
      }

      const handoverRate =
        durationSec > 0 ? (totalHandovers / durationSec) * 60 : 0;

      const meanHandoverInterruptionMs =
        completedHos.length > 0
          ? completedHos.reduce((s, h) => s + h.interruptionMs, 0) /
            completedHos.length
          : 0;

      // ---- SINR KPIs ----
      const allSinr: number[] = [];
      for (const t of ueTrackers.values()) {
        for (const s of t.sinrSamples) {
          allSinr.push(s);
        }
      }
      const sortedSinr = [...allSinr].sort((a, b) => a - b);

      const meanSinrDb =
        allSinr.length > 0
          ? allSinr.reduce((s, v) => s + v, 0) / allSinr.length
          : NaN;
      const sinrPercentile5Db = percentile(sortedSinr, 5);
      const sinrPercentile50Db = percentile(sortedSinr, 50);
      const sinrPercentile95Db = percentile(sortedSinr, 95);

      const outageRatio =
        allSinr.length > 0
          ? allSinr.filter((s) => s < config.sinrOutageThresholdDb).length /
            allSinr.length
          : NaN;

      // ---- Throughput KPIs ----
      const perUeThroughput: number[] = [];
      const allThroughput: number[] = [];

      for (const t of ueTrackers.values()) {
        const ueTp = t.sinrSamples.map((s) =>
          shannonThroughput(s, config.bandwidthMhz),
        );
        for (const tp of ueTp) allThroughput.push(tp);
        if (ueTp.length > 0) {
          perUeThroughput.push(
            ueTp.reduce((s, v) => s + v, 0) / ueTp.length,
          );
        }
      }

      const sortedThroughput = [...allThroughput].sort((a, b) => a - b);
      const meanThroughputMbps =
        allThroughput.length > 0
          ? allThroughput.reduce((s, v) => s + v, 0) / allThroughput.length
          : NaN;
      const cellEdgeThroughputMbps = percentile(sortedThroughput, 5);

      // ---- Service continuity ----
      let totalServiceDurations: number[] = [];
      let totalServed = 0;
      let totalSamples = 0;

      for (const t of ueTrackers.values()) {
        // Close any open service interval
        const durations = [...t.serviceDurations];
        if (t.serviceStartSec !== null) {
          durations.push(maxTimeSec - t.serviceStartSec);
        }
        totalServiceDurations = totalServiceDurations.concat(durations);
        totalServed += t.servedCount;
        totalSamples += t.totalCount;
      }

      const meanServiceTimeSec =
        totalServiceDurations.length > 0
          ? totalServiceDurations.reduce((s, v) => s + v, 0) /
            totalServiceDurations.length
          : NaN;

      const serviceAvailability =
        totalSamples > 0 ? totalServed / totalSamples : NaN;

      // ---- Fairness ----
      const n = perUeThroughput.length;
      let jainFairnessIndex = NaN;
      if (n > 0) {
        const sumX = perUeThroughput.reduce((s, v) => s + v, 0);
        const sumX2 = perUeThroughput.reduce((s, v) => s + v * v, 0);
        jainFairnessIndex = sumX2 > 0 ? (sumX * sumX) / (n * sumX2) : NaN;
      }

      const bundle: KpiBundle = {
        totalTicks,
        wallClockMs,
        durationSec,
        totalHandovers,
        handoverFailures,
        unnecessaryHandovers,
        pingPongCount,
        handoverRate,
        meanHandoverInterruptionMs,
        meanSinrDb,
        sinrPercentile5Db,
        sinrPercentile50Db,
        sinrPercentile95Db,
        outageRatio,
        meanThroughputMbps,
        cellEdgeThroughputMbps,
        meanServiceTimeSec,
        serviceAvailability,
        jainFairnessIndex,
      };

      cachedBundle = bundle;
      return bundle;
    },

    reset(): void {
      resetState();
    },
  };
}
