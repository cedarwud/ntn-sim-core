/**
 * useBatchKpi — runs multiple profiles headlessly and aggregates KPI results.
 *
 * Runs each profile sequentially in the browser using executeBenchmarkRun.
 * Returns progress status, results array, and download helpers.
 *
 * This file must not import Three.js or R3F code.
 */

import { useState, useCallback, useRef } from 'react';
import type { KpiBundle } from '@/core/kpi/types';
import { executeBenchmarkRun } from '@/runner/headless/benchmark-runner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatchKpiEntry {
  profileId: string;
  kpi: KpiBundle;
  wallClockMs: number;
}

export type BatchStatus = 'idle' | 'running' | 'done' | 'error';

export interface UseBatchKpiResult {
  status: BatchStatus;
  progress: string;       // e.g. "2 / 3"
  results: BatchKpiEntry[];
  error: string | null;
  run: (profileIds: string[]) => void;
  cancel: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBatchKpi(): UseBatchKpiResult {
  const [status, setStatus] = useState<BatchStatus>('idle');
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<BatchKpiEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const run = useCallback((profileIds: string[]) => {
    cancelledRef.current = false;
    setStatus('running');
    setResults([]);
    setError(null);
    setProgress(`0 / ${profileIds.length}`);

    // Run asynchronously to allow UI to update between profiles
    (async () => {
      const collected: BatchKpiEntry[] = [];
      for (let i = 0; i < profileIds.length; i++) {
        if (cancelledRef.current) break;
        const id = profileIds[i];
        setProgress(`${i + 1} / ${profileIds.length} — ${id}`);
        // Yield to allow React to render the progress update
        await new Promise((r) => setTimeout(r, 0));
        try {
          const result = executeBenchmarkRun({ profileId: id });
          collected.push({ profileId: id, kpi: result.kpiBundle, wallClockMs: result.wallClockMs });
          setResults([...collected]);
        } catch (e) {
          setError(`${id}: ${e instanceof Error ? e.message : String(e)}`);
          setStatus('error');
          return;
        }
      }
      if (!cancelledRef.current) {
        setStatus('done');
        setProgress(`${collected.length} / ${profileIds.length}`);
      }
    })();
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setStatus('idle');
    setProgress('');
  }, []);

  return { status, progress, results, error, run, cancel };
}
