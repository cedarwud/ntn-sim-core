import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HandoverType } from '@/core/contracts/exposure-v1';
import { getProfileProvenanceView } from '@/core/config/profile-provenance-view';
import { buildEePowerDisclosureFromProfileSnapshot } from '@/core/energy/layer1';
import type { EePowerDisclosure } from '@/core/energy/types';
import { loadProfile } from '@/core/profiles/loader';
import {
  defaultRunnerExposureApi,
  type RunnerBenchmarkResponse,
} from '@/runner/runner-exposure-api';

export interface UseBenchmarkResultOptions {
  readonly enabled: boolean;
  readonly profileId: string;
  readonly handoverTypeOverride?: HandoverType | null;
}

export interface UseBenchmarkResultResult {
  readonly result: RunnerBenchmarkResponse | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly eePowerDisclosure: EePowerDisclosure | null;
  readonly reload: () => void;
}

/**
 * useBenchmarkResult — optional U1 hook that materializes a single benchmark
 * result through the frozen RunnerExposureApi surface.
 *
 * This hook is intentionally hook-layer only; viz consumes the result via props
 * or hook return values and never imports runner-exposure-api directly.
 */
export function useBenchmarkResult(
  options: UseBenchmarkResultOptions,
): UseBenchmarkResultResult {
  const [result, setResult] = useState<RunnerBenchmarkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const eePowerDisclosure = useMemo(() => {
    if (!options.enabled) {
      return null;
    }

    try {
      const profile = loadProfile(options.profileId);
      const provenance = getProfileProvenanceView(profile.id);
      return buildEePowerDisclosureFromProfileSnapshot(
        profile as unknown as Record<string, unknown>,
        (provenance.assumptionSet ?? []).map((record) => record.id),
      ) ?? null;
    } catch {
      return null;
    }
  }, [options.enabled, options.profileId]);

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!options.enabled) {
      setResult(null);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setResult(null);
    setError(null);

    const timeoutId = window.setTimeout(() => {
      try {
        const loaded = defaultRunnerExposureApi.executeBenchmark({
          profileId: options.profileId,
          handoverTypeOverride: options.handoverTypeOverride ?? undefined,
        });
        if (!cancelled) {
          setResult(loaded);
          setLoading(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
          setLoading(false);
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    options.enabled,
    options.handoverTypeOverride,
    options.profileId,
    reloadToken,
  ]);

  return { result, loading, error, eePowerDisclosure, reload };
}
