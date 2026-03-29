/**
 * SinrModel — Phase 2 model-bundle interface (P2-5).
 *
 * Defines the SinrModel interface and StandardSinrModel concrete wrapper.
 * All physics remain in channel/sinr.ts; this file is a thin adapter.
 *
 * Layer: L2 (src/core/models/)
 * Authority: phase2-model-bundle-sdd.md §5.4
 *
 * DP-6 resolved: StandardSinrModel static; DAPS inline in engine.
 * DapsMrcSinrModel is NOT implemented in Phase 2.
 * The DAPS MRC combining path continues to be handled inline in engine.ts.
 */

import { computeSinr } from '../channel/sinr.js';

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface SinrInput {
  servingRxPowerDbm: number;
  noisePowerDbm: number;
  interferingRxPowersDbm: number[];
  /** Doppler ICI degradation; engine computes this separately, passes here. 0 if tier6 off. */
  dopplerIciDegradationDb: number;
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface SinrModel {
  readonly familyId: 'standard' | 'daps-mrc' | string;
  /** Returns SINR in dB. */
  computeDb(input: SinrInput): number;
}

// ---------------------------------------------------------------------------
// Concrete wrapper: StandardSinrModel
// ---------------------------------------------------------------------------

/** Wraps channel/sinr.ts computeSinr(). Handles both Phase2 and Phase3 paths. */
export class StandardSinrModel implements SinrModel {
  // DP-6 resolved: StandardSinrModel static; DAPS inline in engine.
  readonly familyId = 'standard' as const;

  computeDb(input: SinrInput): number {
    const result = computeSinr({
      servingRxPowerDbm: input.servingRxPowerDbm,
      noisePowerDbm: input.noisePowerDbm,
      interferingSignals: input.interferingRxPowersDbm.map((p) => ({ rxPowerDbm: p })),
    });
    // Apply Doppler ICI degradation (subtract from SINR)
    return result.sinrDb - input.dopplerIciDegradationDb;
  }
}
