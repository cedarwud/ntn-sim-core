import { buildModelBundle } from '../models/model-bundle';
import { createRng } from '../common/types';
import { generateUePositions } from '../ue/position-generator';
import { createMobilityUpdater } from '../ue/mobility';
import { generateHexagonalBeamLayout } from '../beam/layout';
import { createKpiAccumulator } from '../kpi/accumulator';
import { createEnergyLayer1, DEFAULT_ENERGY_LAYER1_CONFIG } from '../energy/layer1';
import { createEnergyLayer2 } from '../energy/layer2';
import { createBhScheduler } from '../beam/scheduler';
import type { SimEngineConfig } from '../engine';
import type { SimEngineState, UeRuntimePosition } from './state';
import type { EnergyLayer1Config } from '../energy/types';
import type { SatelliteBeamLayout } from '../beam/types';
import type { HandoverManager } from '../handover/types';
import type { EnergyLayer1Manager } from '../energy/layer1';
import type { EnergyLayer2Manager } from '../energy/layer2';

/**
 * Phase 5 Core Structural Split: Bootstrap logic.
 */

export function bootstrapEngine(config: SimEngineConfig): SimEngineState {
  const { profile, trajectoryCache, policy = null } = config;

  let bundle = buildModelBundle(profile, trajectoryCache);
  if (policy) bundle = { ...bundle, policy };

  // Derived RF parameters
  const bandwidthMhz = profile.rf.bandwidth_mhz || 20;
  let txEirp: number;
  if (profile.rf.tx_power_per_beam_dbm !== undefined) {
    const implLoss = profile.rf.implementation_loss_db ?? 0;
    txEirp = profile.rf.tx_power_per_beam_dbm + profile.antenna.peak_gain_dbi - implLoss;
  } else {
    txEirp = (profile.rf.eirp_density_dbw_per_mhz || 0) + 10 * Math.log10(bandwidthMhz) + 30;
  }

  const K_BOLTZMANN_DBW_PER_K_HZ = -228.6;
  const T0 = 290;
  const nfDb = profile.rf.noise_figure_db ?? 0;
  const nfLinear = Math.pow(10, nfDb / 10);
  const tSysK = (profile.rf.noise_temperature_k || 0) + T0 * (nfLinear - 1);
  const bwHz = bandwidthMhz * 1e6;
  
  // Parity Fix: Ensure noiseDbm is finite
  const noiseDbm = K_BOLTZMANN_DBW_PER_K_HZ + 10 * Math.log10(Math.max(1, tSysK)) + 10 * Math.log10(Math.max(1, bwHz)) + 30;

  const deploymentEnvironment = profile.channel.deployment_environment ?? 'suburban';
  const largeScaleModel = profile.channel.large_scale_model ?? (profile.channel.tier4_atmospheric ? '3gpp-extended' : '3gpp-baseline');
  const implementationLossDb = profile.rf.implementation_loss_db ?? 0;

  let rng = createRng(profile.seed);
  let hoManager = bundle.handover.createManager(profile.handover);
  const independentHandover = profile.ueConfig.independentHandover === true;
  const hoManagers = new Map<string, HandoverManager>();

  const kpiAcc = createKpiAccumulator({
    sinrOutageThresholdDb: profile.handover.rlf_qout_db ?? -8,
    pingPongWindowSec: 5,
    bandwidthMhz: bandwidthMhz,
  });

  const ueCount = Math.max(1, profile.ueConfig.count);
  const beamRadiusKm = profile.antenna.beam_diameter_km / 2;
  const initialUePositions = generateUePositions(
    ueCount, beamRadiusKm, profile.ueConfig.distribution, () => rng.next(),
  );

  const KM_PER_DEG = 111.32;
  const lat = profile.observer.latitudeDeg || 0;
  const lon = profile.observer.longitudeDeg || 0;
  const latRad = lat * Math.PI / 180;
  const lonScale = KM_PER_DEG * Math.max(0.01, Math.cos(latRad));

  const uePositions: UeRuntimePosition[] = initialUePositions.map(p => ({
    ...p,
    latitudeDeg: lat + (p.offsetNorthKm / KM_PER_DEG),
    longitudeDeg: lon + (p.offsetEastKm / lonScale),
  }));

  if (independentHandover) {
    for (const ue of uePositions) {
      hoManagers.set(ue.id, bundle.handover.createManager(profile.handover));
    }
  }

  const mobilityUpdater = createMobilityUpdater(
    {
      model: profile.ueConfig.speed_kmh > 0 ? 'random-walk' : 'static',
      speedKmh: profile.ueConfig.speed_kmh,
      boundaryRadiusKm: beamRadiusKm,
    },
    () => rng.next(),
  );

  const isMultiBeam = profile.beam.num_beams > 1;
  const beamLayouts = new Map<string, SatelliteBeamLayout>();

  let energyManager: EnergyLayer1Manager | null = null;
  if (profile.energy.layer1_enabled) {
    const energyConfig: EnergyLayer1Config = {
      ...DEFAULT_ENERGY_LAYER1_CONFIG,
      ...(profile.rf.tx_power_per_beam_dbm !== undefined
        ? { txPowerPerBeamDbm: profile.rf.tx_power_per_beam_dbm }
        : {}),
    };
    energyManager = createEnergyLayer1(energyConfig);
  }

  let energyL2Manager: EnergyLayer2Manager | null = null;
  if (profile.energy.layer2_enabled) {
    energyL2Manager = createEnergyLayer2(profile.energy.layer2_overrides ?? {});
  }

  const isBhActive = isMultiBeam && profile.beam.bh_max_active_per_slot != null;
  const bhScheduler = isBhActive ? createBhScheduler({
    strategy: profile.beam.bh_strategy ?? 'round-robin',
    maxActiveBeamsPerSlot: profile.beam.bh_max_active_per_slot ?? 1,
    frameDurationSec: profile.beam.bh_frame_duration_sec ?? 0.64,
  }, beamLayouts) : null;

  return {
    profile,
    trajectoryCache,
    bundle,
    lastObservation: null,
    pendingExternalAction: null,
    pendingPolicyAction: null,
    rng,
    uePositions,
    mobilityUpdater,
    hoManager,
    hoManagers,
    independentHandover,
    kpiAcc,
    lastDiscreteTickNumber: null,
    lastTickHoLog: [],
    lastRepresentativeServing: null,
    isMultiBeam,
    beamLayouts,
    bhScheduler,
    lastBhSlotDecision: null,
    energyManager,
    energyL2Manager,
    l2InitializedSats: new Set<string>(),
    lastEnergyMetrics: null,
    txEirp,
    noiseDbm,
    deploymentEnvironment,
    largeScaleModel,
    implementationLossDb,
  };
}

export function getOrCreateBeamLayout(state: SimEngineState, satId: string, altKm: number): SatelliteBeamLayout {
  let layout = state.beamLayouts.get(satId);
  if (!layout) {
    layout = generateHexagonalBeamLayout({
      satId,
      numBeams: state.profile.beam.num_beams,
      beamDiameterKm: state.profile.antenna.beam_diameter_km,
      altitudeKm: altKm,
      frf: state.profile.beam.frf,
    });
    state.beamLayouts.set(satId, layout);
  }
  return layout;
}
