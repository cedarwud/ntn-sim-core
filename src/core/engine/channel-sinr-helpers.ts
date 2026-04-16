import type { BeamSelectionResult } from '../beam/types';
import { computeOffAxisAngle } from '../channel/beam-gain';
import type { LinkGeometry } from '../channel/slant-range';
import {
  computeTr38811SlantRangeKm,
  computeUeLinkGeometry,
} from '../channel/slant-range';
import { sampleLosStateTr38811 } from '../channel/los-probability';
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

interface ReceivedPowerOptions {
  beamId?: string;
  linkGeometry?: LinkGeometry;
}

function resolvePrimaryUeLinkGeometry(
  state: Pick<SimEngineState, 'profile' | 'uePositions'>,
  sample: TrajectorySample,
): LinkGeometry | undefined {
  if (state.profile.channel.ue_geometry_mode !== 'per-ue-topocentric') {
    return undefined;
  }
  const primaryUe = state.uePositions[0];
  if (!primaryUe) return undefined;
  return computeUeLinkGeometry(sample, primaryUe);
}

function resolveEffectiveLinkGeometry(
  state: Pick<SimEngineState, 'profile'>,
  sample: TrajectorySample,
  elevationFloorDeg: number,
  linkGeometry?: LinkGeometry,
): LinkGeometry {
  const elevationDeg = Math.max(elevationFloorDeg, linkGeometry?.elevationDeg ?? sample.elevationDeg);
  const geometryRangeKm = Math.max(1, linkGeometry?.slantRangeKm ?? sample.rangeKm);
  if (state.profile.channel.slant_range_mode === 'tr38811-elevation') {
    return {
      elevationDeg,
      slantRangeKm: Math.max(1, computeTr38811SlantRangeKm(elevationDeg, sample.altKm)),
    };
  }
  return {
    elevationDeg,
    slantRangeKm: geometryRangeKm,
  };
}

function resolveTxEirpDbm(
  state: Pick<SimEngineState, 'profile' | 'txEirp' | 'beamTxPowerOverridesDbm'>,
  beamId?: string,
): number {
  if (state.profile.channel.power_coupling_mode !== 'beam-power-override' || !beamId) {
    return state.txEirp;
  }
  const txPowerDbm = state.beamTxPowerOverridesDbm.get(beamId) ?? state.profile.rf.tx_power_per_beam_dbm;
  if (txPowerDbm === undefined) {
    return state.txEirp;
  }
  return txPowerDbm + state.profile.antenna.peak_gain_dbi;
}

function resolveLosCondition(
  state: Pick<SimEngineState, 'profile'>,
  sample: TrajectorySample,
  effectiveGeometry: LinkGeometry,
  environment: DeploymentEnvironment,
  beamId?: string,
): boolean {
  if (state.profile.channel.los_mode === 'tr38811-probability') {
    const losSeedKey = [
      state.profile.seed,
      sample.timeSec.toFixed(0),
      beamId ?? 'beam-na',
      sample.latDeg.toFixed(4),
      sample.lonDeg.toFixed(4),
      effectiveGeometry.elevationDeg.toFixed(3),
      effectiveGeometry.slantRangeKm.toFixed(3),
    ].join('|');
    return sampleLosStateTr38811(effectiveGeometry.elevationDeg, environment, losSeedKey);
  }
  return effectiveGeometry.elevationDeg >= (state.profile.channel.los_elevation_deg ?? 20);
}

function computeBeamGainDb(
  state: Pick<SimEngineState, 'profile' | 'bundle'>,
  sample: Pick<TrajectorySample, 'altKm'>,
  offAxisAngleDeg: number,
  slantRangeKm: number,
): number {
  if (!state.profile.channel.tier3_beam_gain) return 0;
  return state.bundle.beamGain.computeGainDb({
    offAxisAngleDeg: isNaN(offAxisAngleDeg) ? 0 : offAxisAngleDeg,
    peakGainDbi: state.profile.antenna.peak_gain_dbi,
    beamDiameterKm: state.profile.antenna.beam_diameter_km,
    altitudeKm: sample.altKm,
    slantRangeKm,
  });
}

export function computeReceivedPowerDbm(
  state: SimEngineState,
  sample: TrajectorySample,
  offAxisAngleDeg: number,
  elevationFloorDeg: number,
  options?: ReceivedPowerOptions,
): number {
  const { bundle, profile, implementationLossDb, ueAntennaGainDb } = state;
  const { rngNext, tiers, bandConfig, environment } = buildChannelContext(state);
  const effectiveGeometry = resolveEffectiveLinkGeometry(
    state,
    sample,
    elevationFloorDeg,
    options?.linkGeometry,
  );
  const txEirpDbm = resolveTxEirpDbm(state, options?.beamId);
  const isLos = resolveLosCondition(state, sample, effectiveGeometry, environment, options?.beamId);
  const pathLoss = bundle.pathLoss.compute({
    distanceKm: effectiveGeometry.slantRangeKm,
    frequencyGhz: profile.rf.frequency_ghz,
    elevationDeg: effectiveGeometry.elevationDeg,
    environment,
    isLos,
    txEirpDbm,
    rxAntennaGainDb: ueAntennaGainDb,
    implementationLossDb,
    rngNext,
    tiers,
    bandConfig,
  });
  const beamGainDb = computeBeamGainDb(
    state,
    sample,
    offAxisAngleDeg,
    effectiveGeometry.slantRangeKm,
  );
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
  const servingLinkGeometry = resolvePrimaryUeLinkGeometry(state, servingSample);

  const servingRxPowerDbm = computeReceivedPowerDbm(state, servingSample, 0, 0.1, {
    linkGeometry: servingLinkGeometry,
  });
  const interInterferingRxPowersDbm: number[] = [];

  for (const iSample of interferingSamples) {
    const iOffAxisDeg = computeOffAxisAngle(
      iSample.latDeg,
      iSample.lonDeg,
      referenceLatDeg,
      referenceLonDeg,
      iSample.altKm,
    );
    const iRxPowerDbm = computeReceivedPowerDbm(
      state,
      iSample,
      iOffAxisDeg,
      -5,
      { linkGeometry: resolvePrimaryUeLinkGeometry(state, iSample) },
    );
    if (isFinite(iRxPowerDbm)) interInterferingRxPowersDbm.push(iRxPowerDbm);
  }

  const dopplerLossDb = computeDopplerDegradationDb(
    servingLinkGeometry?.elevationDeg ?? servingSample.elevationDeg,
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
  const servingLinkGeometry = resolvePrimaryUeLinkGeometry(state, servingSample);

  const servingRxPowerDbm = computeReceivedPowerDbm(
    state,
    servingSample,
    servingSelection.offAxisAngleDeg,
    0.1,
    {
      beamId: servingSelection.bestBeamId,
      linkGeometry: servingLinkGeometry,
    },
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
        {
          beamId: beam.beamId,
          linkGeometry: servingLinkGeometry,
        },
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
        {
          beamId: other.selection.bestBeamId,
          linkGeometry: resolvePrimaryUeLinkGeometry(state, other.sample),
        },
      );
      if (isFinite(iRxPowerDbm)) interInterferingRxPowersDbm.push(iRxPowerDbm);
    }
  }

  const dopplerLossDb = computeDopplerDegradationDb(
    servingLinkGeometry?.elevationDeg ?? servingSample.elevationDeg,
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
