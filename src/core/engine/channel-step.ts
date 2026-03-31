import type { TrajectorySample } from '../orbit/types';
import type { BeamSelectionResult } from '../beam/types';
import { computeOffAxisAngle } from '../channel/beam-gain';
import { estimateRadialVelocityKmS, computeDopplerShiftHz, dopplerSinrDegradationDb } from '../channel/doppler';
import { selectBeamForUe } from '../beam/selection';
import type { SimEngineState } from './state';
import { getOrCreateBeamLayout } from './bootstrap';
import type { LargeScaleModel, DeploymentEnvironment } from '../channel/types';

/**
 * Phase 5 Core Structural Split: Channel logic.
 * Ownership: SINR computation helpers and UE-specific adjustments.
 * Fix: Balanced interference model (Real constellation vs Synthetic).
 */

export function computeDopplerDegradationDb(
  elevationDeg: number,
  altitudeKm: number,
  frequencyGhz: number,
  tier6Enabled: boolean,
  subcarrierSpacingKhz: number = 30,
): number {
  if (!tier6Enabled || isNaN(elevationDeg) || elevationDeg <= 0) return 0;
  const GM_KM3_S2 = 398600.4418;
  const R_E_KM = 6371;
  const orbitalVelocityKmS = Math.sqrt(GM_KM3_S2 / (R_E_KM + altitudeKm));
  const radialVelocityKmS = estimateRadialVelocityKmS(orbitalVelocityKmS, elevationDeg, true);
  const dopplerHz = computeDopplerShiftHz(radialVelocityKmS, frequencyGhz);
  const res = dopplerSinrDegradationDb(dopplerHz, subcarrierSpacingKhz);
  return isFinite(res) && !isNaN(res) ? res : 0;
}

export function computeBundleSinrSingleBeam(
  state: SimEngineState,
  servingSample: TrajectorySample,
  interferingSamples: TrajectorySample[],
): number {
  const { profile, bundle, txEirp, noiseDbm, deploymentEnvironment, largeScaleModel, implementationLossDb, rng } = state;
  const rngFn = profile.channel.tier1_large_scale || profile.channel.tier5_fading ? () => rng.next() : null;
  const isLos = (s: TrajectorySample) => s.elevationDeg >= (profile.channel.los_elevation_deg ?? 20);
  const tiers = {
    t1_large_scale: profile.channel.tier1_large_scale,
    t2_clutter: profile.channel.tier2_clutter,
    t4_atmospheric: profile.channel.tier4_atmospheric,
    t5_fading: profile.channel.tier5_fading,
    t6_doppler: profile.channel.tier6_doppler ?? false,
  };
  const bandConfig = {
    largescaleModel: largeScaleModel as LargeScaleModel,
    subcarrierSpacingKhz: profile.channel.subcarrier_spacing_khz ?? 30,
  };

  const servingPL = bundle.pathLoss.compute({
    distanceKm: Math.max(1, servingSample.rangeKm),
    frequencyGhz: profile.rf.frequency_ghz,
    elevationDeg: Math.max(0.1, servingSample.elevationDeg),
    environment: deploymentEnvironment as DeploymentEnvironment,
    isLos: isLos(servingSample),
    txEirpDbm: txEirp,
    implementationLossDb,
    rngNext: rngFn,
    tiers,
    bandConfig,
  });
  const servingBeamGainDb = profile.channel.tier3_beam_gain
    ? bundle.beamGain.computeGainDb({
        offAxisAngleDeg: 0,
        peakGainDbi: profile.antenna.peak_gain_dbi,
        beamDiameterKm: profile.antenna.beam_diameter_km,
        altitudeKm: servingSample.altKm,
        slantRangeKm: servingSample.rangeKm,
      })
    : 0;

  const interferingRxPowersDbm: number[] = [];

  for (const iSample of interferingSamples) {
    const iPL = bundle.pathLoss.compute({
      distanceKm: Math.max(1, iSample.rangeKm),
      frequencyGhz: profile.rf.frequency_ghz,
      elevationDeg: Math.max(-5, iSample.elevationDeg),
      environment: deploymentEnvironment as DeploymentEnvironment,
      isLos: isLos(iSample),
      txEirpDbm: txEirp,
      implementationLossDb,
      rngNext: rngFn,
      tiers,
      bandConfig,
    });
    const iBeamGainDb = profile.channel.tier3_beam_gain
      ? bundle.beamGain.computeGainDb({
          offAxisAngleDeg: computeOffAxisAngle(
            iSample.latDeg,
            iSample.lonDeg,
            profile.observer.latitudeDeg,
            profile.observer.longitudeDeg,
            iSample.altKm,
          ),
          peakGainDbi: profile.antenna.peak_gain_dbi,
          beamDiameterKm: profile.antenna.beam_diameter_km,
          altitudeKm: iSample.altKm,
          slantRangeKm: iSample.rangeKm,
        })
      : 0;
    const iRxPowerDbm = iPL.rxPowerDbm + iBeamGainDb;
    if (isFinite(iRxPowerDbm)) interferingRxPowersDbm.push(iRxPowerDbm);
  }

  const dopplerLossDb = computeDopplerDegradationDb(servingSample.elevationDeg, servingSample.altKm, profile.rf.frequency_ghz, profile.channel.tier6_doppler ?? false);

  const sinrDb = bundle.sinr.computeDb({
    servingRxPowerDbm: isFinite(servingPL.rxPowerDbm + servingBeamGainDb) ? servingPL.rxPowerDbm + servingBeamGainDb : -300,
    noisePowerDbm: noiseDbm,
    interferingRxPowersDbm,
    dopplerIciDegradationDb: dopplerLossDb,
  });

  return isNaN(sinrDb) ? -100 : sinrDb;
}

export function computeBundleSinrMultiBeam(
  state: SimEngineState,
  servingSatId: string,
  servingSample: TrajectorySample,
  servingSelection: BeamSelectionResult,
  otherSats: Array<{ satId: string; sample: TrajectorySample; selection: BeamSelectionResult }>,
): number {
  const { profile, bundle, txEirp, noiseDbm, deploymentEnvironment, largeScaleModel, implementationLossDb, rng } = state;
  const rngFn = profile.channel.tier1_large_scale || profile.channel.tier5_fading ? () => rng.next() : null;
  const isLos = (s: TrajectorySample) => s.elevationDeg >= (profile.channel.los_elevation_deg ?? 20);
  const tiers = {
    t1_large_scale: profile.channel.tier1_large_scale,
    t2_clutter: profile.channel.tier2_clutter,
    t4_atmospheric: profile.channel.tier4_atmospheric,
    t5_fading: profile.channel.tier5_fading,
    t6_doppler: profile.channel.tier6_doppler ?? false,
  };
  const bandConfig = {
    largescaleModel: largeScaleModel as LargeScaleModel,
    subcarrierSpacingKhz: profile.channel.subcarrier_spacing_khz ?? 30,
  };

  const servingPL = bundle.pathLoss.compute({
    distanceKm: Math.max(1, servingSample.rangeKm),
    frequencyGhz: profile.rf.frequency_ghz,
    elevationDeg: Math.max(0.1, servingSample.elevationDeg),
    environment: deploymentEnvironment as DeploymentEnvironment,
    isLos: isLos(servingSample),
    txEirpDbm: txEirp,
    implementationLossDb,
    rngNext: rngFn,
    tiers,
    bandConfig,
  });
  const servingBeamGainDb = profile.channel.tier3_beam_gain
    ? bundle.beamGain.computeGainDb({
        offAxisAngleDeg: isNaN(servingSelection.offAxisAngleDeg) ? 0 : servingSelection.offAxisAngleDeg,
        peakGainDbi: profile.antenna.peak_gain_dbi,
        beamDiameterKm: profile.antenna.beam_diameter_km,
        altitudeKm: servingSample.altKm,
        slantRangeKm: servingSample.rangeKm,
      })
    : 0;

  const interferingRxPowersDbm: number[] = [];
  const servingBeamEntry = servingSelection.allBeams.find((b) => b.beamId === servingSelection.bestBeamId);
  const servingReuseGroup = servingBeamEntry?.reuseGroup ?? 0;

  if (profile.channel.tier3_beam_gain) {
    // Intra-satellite: same reuse-group beams share frequency resources.
    for (const beam of servingSelection.allBeams) {
      if (beam.beamId === servingSelection.bestBeamId) continue;
      if (profile.beam.frf !== 1 && beam.reuseGroup !== servingReuseGroup) continue;
      const iPL = bundle.pathLoss.compute({
        distanceKm: Math.max(1, servingSample.rangeKm),
        frequencyGhz: profile.rf.frequency_ghz,
        elevationDeg: Math.max(0.1, servingSample.elevationDeg),
        environment: deploymentEnvironment as DeploymentEnvironment,
        isLos: isLos(servingSample),
        txEirpDbm: txEirp,
        implementationLossDb,
        rngNext: rngFn,
        tiers,
        bandConfig,
      });
      const iBeamGainDb = bundle.beamGain.computeGainDb({
        offAxisAngleDeg: beam.offAxisAngleDeg,
        peakGainDbi: profile.antenna.peak_gain_dbi,
        beamDiameterKm: profile.antenna.beam_diameter_km,
        altitudeKm: servingSample.altKm,
        slantRangeKm: servingSample.rangeKm,
      });
      const iRxPowerDbm = iPL.rxPowerDbm + iBeamGainDb;
      if (isFinite(iRxPowerDbm)) interferingRxPowersDbm.push(iRxPowerDbm);
    }

    // Inter-satellite: each interferer uses its own path loss and off-axis geometry.
    for (const other of otherSats) {
      const iPL = bundle.pathLoss.compute({
        distanceKm: Math.max(1, other.sample.rangeKm),
        frequencyGhz: profile.rf.frequency_ghz,
        elevationDeg: Math.max(-5, other.sample.elevationDeg),
        environment: deploymentEnvironment as DeploymentEnvironment,
        isLos: isLos(other.sample),
        txEirpDbm: txEirp,
        implementationLossDb,
        rngNext: rngFn,
        tiers,
        bandConfig,
      });
      const crossOffAxisDeg = computeOffAxisAngle(
        other.sample.latDeg,
        other.sample.lonDeg,
        profile.observer.latitudeDeg,
        profile.observer.longitudeDeg,
        other.sample.altKm,
      );
      const iBeamGainDb = bundle.beamGain.computeGainDb({
        offAxisAngleDeg: crossOffAxisDeg,
        peakGainDbi: profile.antenna.peak_gain_dbi,
        beamDiameterKm: profile.antenna.beam_diameter_km,
        altitudeKm: other.sample.altKm,
        slantRangeKm: other.sample.rangeKm,
      });
      const iRxPowerDbm = iPL.rxPowerDbm + iBeamGainDb;
      if (isFinite(iRxPowerDbm)) interferingRxPowersDbm.push(iRxPowerDbm);
    }
  }

  const dopplerLossDb = computeDopplerDegradationDb(servingSample.elevationDeg, servingSample.altKm, profile.rf.frequency_ghz, profile.channel.tier6_doppler ?? false);

  const sinrDb = bundle.sinr.computeDb({
    servingRxPowerDbm: isFinite(servingPL.rxPowerDbm + servingBeamGainDb) ? servingPL.rxPowerDbm + servingBeamGainDb : -300,
    noisePowerDbm: noiseDbm,
    interferingRxPowersDbm,
    dopplerIciDegradationDb: dopplerLossDb,
  });

  return isNaN(sinrDb) ? -100 : sinrDb;
}

export function computeUeSinrFromSatEntry(
  state: SimEngineState,
  ue: { id: string; latitudeDeg: number; longitudeDeg: number; offsetEastKm: number; offsetNorthKm: number },
  satEntry: {
    satId: string;
    sample: TrajectorySample;
    sinrDb: number;
    bestBeamId: string;
    referenceOffAxisAngleDeg: number;
  },
): { sinrDb: number; beamId: string } | null {
  const { profile, bundle, lastBhSlotDecision, isMultiBeam } = state;
  const PRIMARY_UE_ID = 'ue-0';

  if (ue.id === PRIMARY_UE_ID) {
    return { sinrDb: satEntry.sinrDb, beamId: satEntry.bestBeamId };
  }

  const activeBeamIds = lastBhSlotDecision?.activeBeamsPerSat.get(satEntry.satId);
  if (lastBhSlotDecision && (!activeBeamIds || activeBeamIds.length === 0)) return null;

  if (isMultiBeam) {
    const layout = getOrCreateBeamLayout(state, satEntry.satId, satEntry.sample.altKm);
    const ueSelection = selectBeamForUe(layout, ue.offsetEastKm, ue.offsetNorthKm, profile.antenna, activeBeamIds);
    const gainDb = bundle.beamGain.computeGainDb({
      offAxisAngleDeg: ueSelection.offAxisAngleDeg,
      peakGainDbi: profile.antenna.peak_gain_dbi,
      beamDiameterKm: profile.antenna.beam_diameter_km,
      altitudeKm: satEntry.sample.altKm,
      slantRangeKm: satEntry.sample.rangeKm,
    });
    const centerGainDb = bundle.beamGain.computeGainDb({
      offAxisAngleDeg: satEntry.referenceOffAxisAngleDeg,
      peakGainDbi: profile.antenna.peak_gain_dbi,
      beamDiameterKm: profile.antenna.beam_diameter_km,
      altitudeKm: satEntry.sample.altKm,
      slantRangeKm: satEntry.sample.rangeKm,
    });
    return { sinrDb: satEntry.sinrDb + (gainDb - centerGainDb), beamId: ueSelection.bestBeamId };
  }

  const ueOffAxisDeg = computeOffAxisAngle(
    profile.observer.latitudeDeg,
    profile.observer.longitudeDeg,
    ue.latitudeDeg || profile.observer.latitudeDeg,
    ue.longitudeDeg || profile.observer.longitudeDeg,
    satEntry.sample.altKm,
  );
  const gainDb = bundle.beamGain.computeGainDb({
    offAxisAngleDeg: isNaN(ueOffAxisDeg) ? 0 : ueOffAxisDeg,
    peakGainDbi: profile.antenna.peak_gain_dbi,
    beamDiameterKm: profile.antenna.beam_diameter_km,
    altitudeKm: satEntry.sample.altKm,
    slantRangeKm: satEntry.sample.rangeKm,
  });
  const centerGainDb = bundle.beamGain.computeGainDb({
    offAxisAngleDeg: satEntry.referenceOffAxisAngleDeg,
    peakGainDbi: profile.antenna.peak_gain_dbi,
    beamDiameterKm: profile.antenna.beam_diameter_km,
    altitudeKm: satEntry.sample.altKm,
    slantRangeKm: satEntry.sample.rangeKm,
  });

  return { sinrDb: satEntry.sinrDb + (gainDb - centerGainDb), beamId: satEntry.bestBeamId };
}

export interface UeServingCandidate {
  satId: string;
  beamId: string;
  sinrDb: number;
  sample: TrajectorySample;
}

export function buildSortedUeCandidates(
  state: SimEngineState,
  ue: {
    id: string;
    latitudeDeg: number;
    longitudeDeg: number;
    offsetEastKm: number;
    offsetNorthKm: number;
  },
  satSinrs: Array<{
    satId: string;
    sample: TrajectorySample;
    sinrDb: number;
    bestBeamId: string;
    referenceOffAxisAngleDeg: number;
  }>,
): UeServingCandidate[] {
  return satSinrs
    .map((satEntry): UeServingCandidate | null => {
      const adj = computeUeSinrFromSatEntry(state, ue, satEntry);
      if (!adj) return null;
      return {
        satId: satEntry.satId,
        beamId: adj.beamId,
        sinrDb: adj.sinrDb,
        sample: satEntry.sample,
      };
    })
    .filter((candidate): candidate is UeServingCandidate => candidate !== null)
    .sort((a, b) => b.sinrDb - a.sinrDb);
}

export function resolveSharedServingPrimarySinr(
  state: Pick<SimEngineState, 'hoManager'>,
  satSinrs: Array<{
    satId: string;
    sample: TrajectorySample;
    sinrDb: number;
    bestBeamId: string;
    referenceOffAxisAngleDeg: number;
  }>,
  representativeServing: { satId: string; beamId: string } | null,
): {
  primarySinrDb: number;
  servingEntry: {
    satId: string;
    sample: TrajectorySample;
    sinrDb: number;
    bestBeamId: string;
    referenceOffAxisAngleDeg: number;
  };
} | null {
  if (!representativeServing) return null;

  const servingEntry = satSinrs.find(
    (entry) =>
      entry.satId === representativeServing.satId &&
      entry.bestBeamId === representativeServing.beamId,
  );
  if (!servingEntry) return null;

  const hoState = state.hoManager.getState() as ReturnType<SimEngineState['hoManager']['getState']> & {
    dapsPhase?: string;
    mcPhase?: string;
    sourceServing?: { satId: string; beamId: string } | null;
    targetServing?: { satId: string; beamId: string } | null;
  };

  let primarySinrDb: number | null = null;
  const dualActive =
    hoState.dapsPhase === 'dual-active' || hoState.mcPhase === 'mc-dual-active';
  if (dualActive && hoState.sourceServing && hoState.targetServing) {
    const sourceEntry = satSinrs.find((entry) => entry.satId === hoState.sourceServing!.satId);
    const targetEntry = satSinrs.find((entry) => entry.satId === hoState.targetServing!.satId);
    if (sourceEntry && targetEntry) {
      primarySinrDb = Math.max(sourceEntry.sinrDb, targetEntry.sinrDb);
    }
  }

  return {
    primarySinrDb: primarySinrDb ?? servingEntry.sinrDb,
    servingEntry,
  };
}

export function computeSharedServingUeSinr(
  state: Pick<SimEngineState, 'profile' | 'bundle'>,
  ue: { id: string; distanceFromCenterKm: number },
  primarySinrDb: number,
  servingEntry: {
    sample: TrajectorySample;
    bestBeamId: string;
  },
): { sinrDb: number; beamId: string } {
  const { profile, bundle } = state;

  if (ue.id === 'ue-0') {
    return { sinrDb: primarySinrDb, beamId: servingEntry.bestBeamId };
  }

  const slantRangeKm = Math.max(1, servingEntry.sample.rangeKm);
  const ueOffAxisDeg = Math.atan(ue.distanceFromCenterKm / slantRangeKm) * (180 / Math.PI);
  const gainReductionDb = profile.channel.tier3_beam_gain
    ? bundle.beamGain.computeGainDb({
        offAxisAngleDeg: ueOffAxisDeg,
        peakGainDbi: profile.antenna.peak_gain_dbi,
        beamDiameterKm: profile.antenna.beam_diameter_km,
        altitudeKm: servingEntry.sample.altKm,
        slantRangeKm,
      })
    : 0;

  return {
    sinrDb: primarySinrDb + gainReductionDb,
    beamId: servingEntry.bestBeamId,
  };
}
