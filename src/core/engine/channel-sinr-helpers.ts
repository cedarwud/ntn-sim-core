import type { BeamSelectionResult } from '../beam/types';
import { computeOffAxisAngle } from '../channel/beam-gain';
import {
  computeDopplerShiftHz,
  dopplerSinrDegradationDb,
  estimateRadialVelocityKmS,
} from '../channel/doppler';
import type { DeploymentEnvironment, LargeScaleModel } from '../channel/types';
import type { TrajectorySample } from '../orbit/types';
import type { SimEngineState } from './state';

function buildChannelContext(state: SimEngineState) {
  const { profile, rng, deploymentEnvironment, largeScaleModel } = state;
  return {
    rngNext:
      profile.channel.tier1_large_scale || profile.channel.tier5_fading
        ? () => rng.next()
        : null,
    isLos: (sample: TrajectorySample) =>
      sample.elevationDeg >= (profile.channel.los_elevation_deg ?? 20),
    tiers: {
      t1_large_scale: profile.channel.tier1_large_scale,
      t2_clutter: profile.channel.tier2_clutter,
      t4_atmospheric: profile.channel.tier4_atmospheric,
      t5_fading: profile.channel.tier5_fading,
      t6_doppler: profile.channel.tier6_doppler ?? false,
    },
    bandConfig: {
      largescaleModel: largeScaleModel as LargeScaleModel,
      subcarrierSpacingKhz: profile.channel.subcarrier_spacing_khz ?? 30,
    },
    environment: deploymentEnvironment as DeploymentEnvironment,
  };
}

function computeBeamGainDb(
  state: Pick<SimEngineState, 'profile' | 'bundle'>,
  sample: Pick<TrajectorySample, 'altKm' | 'rangeKm'>,
  offAxisAngleDeg: number,
): number {
  if (!state.profile.channel.tier3_beam_gain) return 0;
  return state.bundle.beamGain.computeGainDb({
    offAxisAngleDeg: isNaN(offAxisAngleDeg) ? 0 : offAxisAngleDeg,
    peakGainDbi: state.profile.antenna.peak_gain_dbi,
    beamDiameterKm: state.profile.antenna.beam_diameter_km,
    altitudeKm: sample.altKm,
    slantRangeKm: sample.rangeKm,
  });
}

export function computeReceivedPowerDbm(
  state: SimEngineState,
  sample: TrajectorySample,
  offAxisAngleDeg: number,
  elevationFloorDeg: number,
): number {
  const { bundle, profile, txEirp, implementationLossDb, ueAntennaGainDb } = state;
  const { rngNext, isLos, tiers, bandConfig, environment } = buildChannelContext(state);
  const pathLoss = bundle.pathLoss.compute({
    distanceKm: Math.max(1, sample.rangeKm),
    frequencyGhz: profile.rf.frequency_ghz,
    elevationDeg: Math.max(elevationFloorDeg, sample.elevationDeg),
    environment,
    isLos: isLos(sample),
    txEirpDbm: txEirp,
    rxAntennaGainDb: ueAntennaGainDb,
    implementationLossDb,
    rngNext,
    tiers,
    bandConfig,
  });
  const beamGainDb = computeBeamGainDb(state, sample, offAxisAngleDeg);
  const rxPowerDbm = pathLoss.rxPowerDbm + beamGainDb;
  return isFinite(rxPowerDbm) ? rxPowerDbm : -300;
}

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
  const primaryUe = state.uePositions[0];
  const referenceLatDeg = primaryUe?.latitudeDeg ?? state.profile.observer.latitudeDeg;
  const referenceLonDeg = primaryUe?.longitudeDeg ?? state.profile.observer.longitudeDeg;

  const servingRxPowerDbm = computeReceivedPowerDbm(state, servingSample, 0, 0.1);
  const interInterferingRxPowersDbm: number[] = [];

  for (const iSample of interferingSamples) {
    const iOffAxisDeg = computeOffAxisAngle(
      iSample.latDeg,
      iSample.lonDeg,
      referenceLatDeg,
      referenceLonDeg,
      iSample.altKm,
    );
    const iRxPowerDbm = computeReceivedPowerDbm(state, iSample, iOffAxisDeg, -5);
    if (isFinite(iRxPowerDbm)) interInterferingRxPowersDbm.push(iRxPowerDbm);
  }

  const dopplerLossDb = computeDopplerDegradationDb(
    servingSample.elevationDeg,
    servingSample.altKm,
    state.profile.rf.frequency_ghz,
    state.profile.channel.tier6_doppler ?? false,
  );

  const sinrDb = state.bundle.sinr.computeDb({
    associationActive: true,
    servingRxPowerDbm,
    noisePowerDbm: state.noiseDbm,
    intraInterferingRxPowersDbm: [],
    interInterferingRxPowersDbm,
    dopplerIciDegradationDb: dopplerLossDb,
  });

  return isNaN(sinrDb) ? -100 : sinrDb;
}

export function computeBundleSinrMultiBeam(
  state: SimEngineState,
  _servingSatId: string,
  servingSample: TrajectorySample,
  servingSelection: BeamSelectionResult,
  otherSats: Array<{ satId: string; sample: TrajectorySample; selection: BeamSelectionResult }>,
): number {
  const primaryUe = state.uePositions[0];
  const referenceLatDeg = primaryUe?.latitudeDeg ?? state.profile.observer.latitudeDeg;
  const referenceLonDeg = primaryUe?.longitudeDeg ?? state.profile.observer.longitudeDeg;

  const servingRxPowerDbm = computeReceivedPowerDbm(
    state,
    servingSample,
    servingSelection.offAxisAngleDeg,
    0.1,
  );

  const intraInterferingRxPowersDbm: number[] = [];
  const interInterferingRxPowersDbm: number[] = [];
  const servingBeamEntry = servingSelection.allBeams.find(
    (beam) => beam.beamId === servingSelection.bestBeamId,
  );
  const servingReuseGroup = servingBeamEntry?.reuseGroup ?? 0;

  if (state.profile.channel.tier3_beam_gain) {
    for (const beam of servingSelection.allBeams) {
      if (beam.beamId === servingSelection.bestBeamId) continue;
      if (state.profile.beam.frf !== 1 && beam.reuseGroup !== servingReuseGroup) continue;
      const iRxPowerDbm = computeReceivedPowerDbm(
        state,
        servingSample,
        beam.offAxisAngleDeg,
        0.1,
      );
      if (isFinite(iRxPowerDbm)) intraInterferingRxPowersDbm.push(iRxPowerDbm);
    }

    for (const other of otherSats) {
      const crossOffAxisDeg = computeOffAxisAngle(
        other.sample.latDeg,
        other.sample.lonDeg,
        referenceLatDeg,
        referenceLonDeg,
        other.sample.altKm,
      );
      const iRxPowerDbm = computeReceivedPowerDbm(
        state,
        other.sample,
        crossOffAxisDeg,
        -5,
      );
      if (isFinite(iRxPowerDbm)) interInterferingRxPowersDbm.push(iRxPowerDbm);
    }
  }

  const dopplerLossDb = computeDopplerDegradationDb(
    servingSample.elevationDeg,
    servingSample.altKm,
    state.profile.rf.frequency_ghz,
    state.profile.channel.tier6_doppler ?? false,
  );

  const sinrDb = state.bundle.sinr.computeDb({
    associationActive: true,
    servingRxPowerDbm,
    noisePowerDbm: state.noiseDbm,
    intraInterferingRxPowersDbm,
    interInterferingRxPowersDbm,
    dopplerIciDegradationDb: dopplerLossDb,
  });
  return isNaN(sinrDb) ? -100 : sinrDb;
}
