/**
 * PathLossModel — Phase 2 model-bundle interface (P2-1).
 *
 * Defines the PathLossModel interface and ThreegppBaselinePathLoss concrete wrapper.
 * All physics remain in channel/link-budget.ts; this file is a thin adapter.
 *
 * Layer: L2 (src/core/models/) — may import from core/common/ and subsystem dirs.
 * Must NOT import from engine.ts, profiles/, viz/, app/, runner/.
 *
 * Authority: phase2-model-bundle-sdd.md §5.2
 */

import { computeLinkBudget } from '../channel/link-budget.js';
import type { DeploymentEnvironment, LargeScaleModel } from '../channel/types.js';

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface PathLossInput {
  distanceKm: number;
  frequencyGhz: number;
  elevationDeg: number;
  environment: DeploymentEnvironment;
  isLos: boolean;                  // engine decides LOS via profile-selected closure
  txEirpDbm: number;
  rxAntennaGainDb?: number;
  implementationLossDb: number;
  rngNext: (() => number) | null;
  tiers: {
    t1_large_scale: boolean;
    t2_clutter: boolean;
    t4_atmospheric: boolean;
    t5_fading: boolean;
    t6_doppler: boolean;           // flag only; ICI degradation is computed by engine/SinrModel
  };
  bandConfig: {
    largescaleModel: LargeScaleModel;
    subcarrierSpacingKhz: number;
  };
}

export interface PathLossResult {
  rxPowerDbm: number;
  totalPathLossDb: number;
  components: {
    fsplDb: number;
    shadowFadingDb: number;
    clutterLossDb: number;
    atmosphericLossDb: number;
    smallScaleFadingDb: number;
  };
  /** Doppler ICI degradation in dB. ThreegppBaselinePathLoss returns 0;
   *  the engine computes Doppler separately and passes it via SinrInput. */
  dopplerIciDegradationDb: number;
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface PathLossModel {
  readonly familyId: '3gpp-baseline' | '3gpp-extended' | string;
  /**
   * Compute path loss for a single link (serving OR interfering).
   * Stateless per call: independent results for different inputs.
   * Beam gain is EXCLUDED — engine applies bundle.beamGain separately.
   * See phase2-model-bundle-sdd.md §5.2 "Beam gain exclusion contract".
   */
  compute(input: PathLossInput): PathLossResult;
}

// ---------------------------------------------------------------------------
// Concrete wrapper: ThreegppBaselinePathLoss
// ---------------------------------------------------------------------------

/**
 * Wraps channel/link-budget.ts computeLinkBudget().
 * Tier 3 (beam gain) is always forced to false — engine applies beam gain
 * via bundle.beamGain.computeGainDb() and adds it to rxPowerDbm before SINR.
 */
export class ThreegppBaselinePathLoss implements PathLossModel {
  readonly familyId = '3gpp-baseline' as const;

  compute(input: PathLossInput): PathLossResult {
    const result = computeLinkBudget({
      distanceKm: input.distanceKm,
      frequencyGhz: input.frequencyGhz,
      txEirpDbm: input.txEirpDbm,
      rxAntennaGainDb: input.rxAntennaGainDb,
      elevationDeg: input.elevationDeg,
      environment: input.environment,
      largeScaleModel: input.bandConfig.largescaleModel,
      implementationLossDb: input.implementationLossDb,
      noisePowerDbm: 0,            // not used in return; noise handled by SinrModel
      isLos: input.isLos,
      rngNext: input.rngNext,
      beamGainInput: null,         // beam gain excluded (see SDD §5.2)
      tier1LargeScale: input.tiers.t1_large_scale,
      tier2Clutter: input.tiers.t2_clutter,
      tier3BeamGain: false,        // always false — engine adds beamGain separately
      tier4Atmospheric: input.tiers.t4_atmospheric,
      tier5Fading: input.tiers.t5_fading,
    });

    return {
      rxPowerDbm: result.rxPowerDbm,
      totalPathLossDb: result.totalPathLossDb,
      components: {
        fsplDb: result.fsplDb,
        shadowFadingDb: result.shadowFadingDb,
        clutterLossDb: result.clutterLossDb,
        atmosphericLossDb: result.atmosphericDb,
        smallScaleFadingDb: result.smallScaleFadingDb,
      },
      // Doppler ICI is 0 here; engine computes it separately and passes to SinrInput
      dopplerIciDegradationDb: 0,
    };
  }
}
