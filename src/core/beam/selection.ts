/**
 * Beam selection logic: find the best serving beam for a UE.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.2.2 Beam-Gain Mapping
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3, §4
 *   - Tier: paper-backed
 *   - This file must not import React, Three.js, or scene code.
 */

import type { AntennaConfig } from '@/core/profiles/types';
import type { SatelliteBeamLayout, BeamSelectionResult } from './types';

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Select the best beam for a UE given its ENU offset from the satellite sub-point.
 *
 * @param layout - The satellite's beam layout.
 * @param ueOffsetEastKm - UE east offset from sub-satellite point in km.
 * @param ueOffsetNorthKm - UE north offset from sub-satellite point in km.
 * @param antennaConfig - Antenna configuration (for peak gain).
 * @returns Beam selection result with best beam, gain, and all beam angles.
 */
export function selectBeamForUe(
  layout: SatelliteBeamLayout,
  ueOffsetEastKm: number,
  ueOffsetNorthKm: number,
  antennaConfig: AntennaConfig,
): BeamSelectionResult {
  const { beams, altitudeKm } = layout;

  if (beams.length === 0) {
    throw new Error('Cannot select beam from empty layout');
  }

  // Compute off-axis angle for each beam relative to UE position
  const beamAngles = beams.map((beam) => {
    const dEast = ueOffsetEastKm - beam.offsetEastKm;
    const dNorth = ueOffsetNorthKm - beam.offsetNorthKm;
    const distKm = Math.sqrt(dEast * dEast + dNorth * dNorth);
    const offAxisAngleDeg = Math.atan(distKm / altitudeKm) * RAD_TO_DEG;

    return {
      beamId: beam.beamId,
      offAxisAngleDeg,
      reuseGroup: beam.reuseGroup,
    };
  });

  // Find beam with smallest off-axis angle (closest to UE)
  let bestIdx = 0;
  let bestAngle = beamAngles[0].offAxisAngleDeg;
  for (let i = 1; i < beamAngles.length; i++) {
    if (beamAngles[i].offAxisAngleDeg < bestAngle) {
      bestAngle = beamAngles[i].offAxisAngleDeg;
      bestIdx = i;
    }
  }

  // Beam gain approximation: peak gain minus roll-off.
  // The actual gain model is computed in the channel module via BeamGainInput;
  // here we provide the peak gain as a first-order value.
  // The precise gain depends on the antenna model family and is applied downstream.
  const beamGainDbi = antennaConfig.peak_gain_dbi;

  return {
    bestBeamId: beamAngles[bestIdx].beamId,
    offAxisAngleDeg: bestAngle,
    beamGainDbi,
    allBeams: beamAngles,
  };
}
