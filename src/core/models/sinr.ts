/**
 * SinrModel — Phase 2 model-bundle interface (P2-5).
 */

import { computeSinr } from '../channel/sinr';

export interface SinrInput {
  servingRxPowerDbm: number;
  noisePowerDbm: number;
  associationActive?: boolean;
  intraInterferingRxPowersDbm?: number[];
  interInterferingRxPowersDbm?: number[];
  dopplerIciDegradationDb: number;
}

export interface SinrModel {
  readonly familyId: 'standard' | 'daps-mrc' | string;
  computeDb(input: SinrInput): number;
}

/** Wraps channel/sinr.ts computeSinr(). */
export class StandardSinrModel implements SinrModel {
  readonly familyId = 'standard' as const;

  computeDb(input: SinrInput): number {
    const result = computeSinr({
      associationActive: input.associationActive,
      servingRxPowerDbm: input.servingRxPowerDbm,
      noisePowerDbm: input.noisePowerDbm,
      intraInterferingRxPowersDbm: input.intraInterferingRxPowersDbm || [],
      interInterferingRxPowersDbm: input.interInterferingRxPowersDbm || [],
    });
    // Apply Doppler ICI degradation
    return result.sinrDb - (input.dopplerIciDegradationDb || 0);
  }
}
