/**
 * Link-budget computation combining all channel tiers.
 *
 * Tier: normative (composition logic)
 * Sources: per-tier sources documented in individual modules
 *
 * Tier mapping (SDD §9.2.1):
 *   - Tier 0: FSPL (always on)
 *   - Tier 1: large-scale shadow fading
 *   - Tier 2: clutter / elevation-dependent attenuation
 *   - Tier 3: beam gain
 *   - Tier 4: atmospheric (Ka-band extras) — placeholder
 *
 * This file must not import React, Three.js, or scene code.
 */

import type { ChannelResult, LinkBudgetOptions } from './types';
import { computeFspl } from './fspl';
import { getShadowFadingParams, sampleShadowFading } from './shadow-fading';
import { computeBeamGain } from './beam-gain';

/**
 * Compute the full link budget by composing enabled channel tiers.
 *
 * @tier normative
 *
 * @param opts — link-budget computation options with tier enable flags
 * @returns ChannelResult with per-tier breakdown and total
 */
export function computeLinkBudget(opts: LinkBudgetOptions): ChannelResult {
  const {
    distanceKm,
    frequencyGhz,
    txEirpDbm,
    elevationDeg,
    environment,
    beamGainInput,
    tier1LargeScale,
    tier2Clutter,
    tier3BeamGain,
    tier4Atmospheric,
    rngNext,
    isLos,
  } = opts;

  // Tier 0: FSPL (always mandatory)
  const fsplDb = computeFspl(distanceKm, frequencyGhz);

  // Tier 1: shadow fading
  let shadowFadingDb = 0;
  if (tier1LargeScale && rngNext) {
    const params = getShadowFadingParams(elevationDeg, environment);
    const sigma = isLos ? params.losSigmaDb : params.nlosSigmaDb;
    shadowFadingDb = Math.abs(sampleShadowFading(sigma, rngNext));
  }

  // Tier 2: clutter loss (NLOS only)
  let clutterLossDb = 0;
  if (tier2Clutter && !isLos) {
    const params = getShadowFadingParams(elevationDeg, environment);
    clutterLossDb = params.clutterLossDb;
  }

  // Tier 3: beam gain
  let beamGainDb = 0;
  if (tier3BeamGain && beamGainInput) {
    beamGainDb = computeBeamGain(beamGainInput);
  }

  // Tier 4: atmospheric (placeholder — returns 0 for now)
  const atmosphericDb = tier4Atmospheric ? 0 : 0;

  // Total path loss (positive value = loss)
  const totalPathLossDb = fsplDb + shadowFadingDb + clutterLossDb + atmosphericDb - beamGainDb;

  // Received power
  const rxPowerDbm = txEirpDbm - totalPathLossDb;

  return {
    fsplDb,
    shadowFadingDb,
    clutterLossDb,
    beamGainDb,
    atmosphericDb,
    totalPathLossDb,
    rxPowerDbm,
  };
}
