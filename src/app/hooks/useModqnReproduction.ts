import { useEffect, useMemo, useState } from 'react';
import {
  MODQN_REPRODUCTION_MANIFEST,
  runModqnBaselineReproduction,
  type ModqnReproductionResult,
} from '@/core/experiments';
import { ModqnViewModel } from '@/viz/view-models/modqn-view-model';

export interface UseModqnReproductionOptions {
  readonly enabled: boolean;
  readonly profileId?: string;
}

export interface UseModqnReproductionResult {
  readonly result: ModqnReproductionResult | null;
  readonly viewModel: ModqnViewModel | null;
  readonly loading: boolean;
  readonly error: string | null;
}

/**
 * useModqnReproduction — optional U1 hook for consuming the shipped MODQN M3
 * richer-handoff surface without fabricating result data in the UI layer.
 *
 * The baseline program currently ships only one richer-handoff profile:
 * `modqn-paper-baseline`. Until a dedicated artifact transport lands, this
 * hook materializes the stable result bundle locally from the exported
 * experiments surface using the documented smoke-sized reviewer envelope.
 */
export function useModqnReproduction(
  options: UseModqnReproductionOptions,
): UseModqnReproductionResult {
  const [result, setResult] = useState<ModqnReproductionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!options.enabled) {
      setLoading(false);
      setError(null);
      setResult(null);
      return () => {
        cancelled = true;
      };
    }

    const requestedProfileId = options.profileId ?? 'modqn-paper-baseline';
    if (requestedProfileId !== 'modqn-paper-baseline') {
      setLoading(false);
      setResult(null);
      setError(`Unsupported MODQN reproduction profile: ${requestedProfileId}`);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const timeoutId = window.setTimeout(() => {
      try {
        const loaded = runModqnBaselineReproduction({
          trainingEpisodeLimit: MODQN_REPRODUCTION_MANIFEST.sampling.trainEpisodesForSmoke,
          heldOutEpisodeLimit: 1,
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
  }, [options.enabled, options.profileId]);

  const viewModel = useMemo(
    () => (result ? new ModqnViewModel(result) : null),
    [result],
  );

  return { result, viewModel, loading, error };
}
