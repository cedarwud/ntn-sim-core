import { useMemo, useRef } from 'react';

import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import {
  buildBeamPresentationFrame,
} from './beam-presentation-frame';
import type { BeamPresentationFrame } from './beam-presentation-types';
import {
  buildContinuityNarrativeState,
  type ContinuityNarrativeState,
} from './continuity-narrative-state';

export function useBeamPresentationFrame(
  snapshot: SimulationSnapshot | null,
  options?: { beamVisualsEnabled?: boolean },
): BeamPresentationFrame | null {
  const previousDisplaySatIdsRef = useRef<Set<string>>(new Set());
  const previousNarrativeRef = useRef<ContinuityNarrativeState | null>(null);

  return useMemo(() => {
    if (!snapshot) {
      previousDisplaySatIdsRef.current = new Set();
      previousNarrativeRef.current = null;
      return null;
    }

    const continuityNarrative = buildContinuityNarrativeState(
      snapshot,
      previousNarrativeRef.current,
    );
    const frame = buildBeamPresentationFrame(snapshot, {
      previousDisplaySatIds: previousDisplaySatIdsRef.current,
      beamVisualsEnabled: options?.beamVisualsEnabled,
      continuityNarrative,
    });
    previousDisplaySatIdsRef.current = new Set(frame.displaySatIds);
    previousNarrativeRef.current = frame.continuityNarrative;
    return frame;
  }, [options?.beamVisualsEnabled, snapshot]);
}
