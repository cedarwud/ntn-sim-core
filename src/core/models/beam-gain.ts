/**
 * BeamGainModel — Phase 2 model-bundle interface (P2-3).
 *
 * Defines the BeamGainModel interface and RpsatBeamGainModel concrete wrapper.
 * All physics remain in channel/beam-gain.ts; this file is a thin adapter.
 *
 * Layer: L2 (src/core/models/)
 * Authority: phase2-model-bundle-sdd.md §5.3
 */

import { computeBeamGain } from '../channel/beam-gain.js';
import type { BeamGainInput as ChannelBeamGainInput } from '../channel/types.js';

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface BeamGainInput {
  offAxisAngleDeg: number;
  peakGainDbi: number;
  beamDiameterKm: number;
  altitudeKm: number;
  slantRangeKm: number;
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface BeamGainModel {
  readonly familyId: 'rpsat-3gpp' | 'bessel-j1' | 'itu-r' | 'flat-debug' | string;
  /** Returns beam gain in dBi at the given off-axis angle. */
  computeGainDb(input: BeamGainInput): number;
}

// ---------------------------------------------------------------------------
// Concrete wrapper: RpsatBeamGainModel
// ---------------------------------------------------------------------------

/** Wraps channel/beam-gain.ts computeBeamGain(). */
export class RpsatBeamGainModel implements BeamGainModel {
  readonly familyId: string;

  constructor(modelId: ChannelBeamGainInput['model'] = 'rpsat-3gpp') {
    this.familyId = modelId;
  }

  computeGainDb(input: BeamGainInput): number {
    return computeBeamGain({
      offAxisAngleDeg: input.offAxisAngleDeg,
      model: this.familyId as ChannelBeamGainInput['model'],
      peakGainDbi: input.peakGainDbi,
      beamDiameterKm: input.beamDiameterKm,
      altitudeKm: input.altitudeKm,
      slantRangeKm: input.slantRangeKm,
    });
  }
}
