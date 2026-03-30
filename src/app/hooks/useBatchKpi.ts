/**
 * useBatchKpi — runs multiple profiles headlessly and aggregates KPI results.
 *
 * Runs each profile sequentially in the browser using RunnerExposureApi.
 * Returns progress status, results array, and download helpers.
 *
 * This file must not import Three.js or R3F code.
 *
 * Contract imports (Phase 4 Group 2 — phase4-runtime-contract-sdd.md §4.2, §4.5):
 *   BatchKpiEntry is the authoritative type from kpi-v1 contract.
 *   executeBenchmark is accessed via RunnerExposureApi (not benchmark-runner directly).
 */

import { useState, useCallback, useRef } from 'react';
import type { BatchKpiEntry } from '@/core/contracts/kpi-v1';
import { defaultRunnerExposureApi } from '@/runner/runner-exposure-api';

// Re-export BatchKpiEntry so existing callers that imported it from here continue to work.
export type { BatchKpiEntry } from '@/core/contracts/kpi-v1';

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
          const result = defaultRunnerExposureApi.executeBenchmark({ profileId: id });
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
