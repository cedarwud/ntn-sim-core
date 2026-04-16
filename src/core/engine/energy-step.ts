import type { SimEngineState } from './state';
import type { TrajectorySample } from '../orbit/types';
import { getOrCreateBeamLayout } from './bootstrap';
import type { SatSinrSeed } from './channel-step';
import { buildBeamPowerSeeds } from './channel-step';
import {
  computeDpcAdjustedTxPowerDbm,
  DEFAULT_ENERGY_LAYER1_CONFIG,
} from '../energy/layer1';

/**
 * Phase 5 Core Structural Split: Energy step.
 * Ownership: Energy consumption tracking (L1/L2) and EE KPI computation.
 */

export function runEnergyStep(
  state: SimEngineState,
  timeSec: number,
  stepSec: number,
  satSamples: Array<{ satId: string; sample: TrajectorySample }>,
  satSinrs: SatSinrSeed[],
  representativeServing: { satId: string; beamId: string } | null
) {
  const {
    profile,
    bundle,
    energyManager,
    energyL2Manager,
    isMultiBeam,
    kpiAcc,
    l2InitializedSats,
  } = state;

  if (energyManager && isMultiBeam) {
    const layer1Config = {
      ...DEFAULT_ENERGY_LAYER1_CONFIG,
      ...(profile.energy.layer1_overrides ?? {}),
    };

    for (const { satId, sample } of satSamples) {
      const layout = getOrCreateBeamLayout(state, satId, sample.altKm);
      const allBeamIds = layout.beams.map((b) => b.beamId);

      const activeBeamIds: string[] = [];
      if (representativeServing && representativeServing.satId === satId) {
        const servEntry = satSinrs.find((s) => s.satId === satId);
        if (servEntry) {
          activeBeamIds.push(servEntry.bestBeamId);
        }
      }

      energyManager.updateBeamStates(satId, activeBeamIds, allBeamIds);
    }

    state.beamTxPowerOverridesDbm.clear();
    if (state.profile.channel.power_coupling_mode === 'beam-power-override') {
      const beamPowerSeeds = buildBeamPowerSeeds(state, satSinrs, representativeServing);
      for (const seed of beamPowerSeeds) {
        const txPowerDbm = computeDpcAdjustedTxPowerDbm(
          layer1Config.txPowerPerBeamDbm,
          seed.sinrDb,
          layer1Config,
        );
        state.beamTxPowerOverridesDbm.set(seed.beamId, txPowerDbm);
      }
    }

    if (representativeServing) {
      const servEntry = satSinrs.find((s) => s.satId === representativeServing.satId);
      if (servEntry) {
        const txPowerDbm = energyManager.applyDpc(servEntry.bestBeamId, servEntry.sinrDb);
        if (state.profile.channel.power_coupling_mode === 'beam-power-override') {
          state.beamTxPowerOverridesDbm.set(servEntry.bestBeamId, txPowerDbm);
        }
      }
    }

    const throughputs = new Map<string, number>();
    for (const entry of satSinrs) {
      if (representativeServing && representativeServing.satId === entry.satId) {
        const sinrLinear = Math.pow(10, entry.sinrDb / 10);
        const throughputBps = profile.rf.bandwidth_mhz * 1e6 * Math.log2(1 + sinrLinear);
        throughputs.set(entry.bestBeamId, throughputBps);
      }
    }

    const legacyMetrics = energyManager.computeMetrics(throughputs);

    if (bundle.power && bundle.ee) {
      const totalThroughputBps = Array.from(throughputs.values()).reduce((s, v) => s + v, 0);
      const txPowerPerBeamDbm =
        profile.rf.tx_power_per_beam_dbm ?? layer1Config.txPowerPerBeamDbm;
      const defaultActiveTxPowerW = Math.pow(10, (txPowerPerBeamDbm - 30) / 10);
      const activeBeamOverheadW = Math.max(
        0,
        layer1Config.activeBeamPowerW - defaultActiveTxPowerW,
      );

      const powerResult = bundle.power.compute({
        activeTxPowerW: legacyMetrics.activeTxPowerW,
        activeBeamCount: legacyMetrics.activeBeamCount,
        idleBeamCount: legacyMetrics.idleBeamCount,
        offBeamCount: legacyMetrics.offBeamCount,
        activeBeamOverheadW,
        idleBeamPowerW: layer1Config.idlePowerW,
        offBeamPowerW: layer1Config.offBeamPowerW,
      });

      const eeBpj = bundle.ee.computeBitsPerJoule({
        throughputBps: totalThroughputBps,
        denominatorPowerW: legacyMetrics.activeTxPowerW,
      });

      state.lastEnergyMetrics = {
        systemEeBitsPerJoule: eeBpj,
        perBeamEe: legacyMetrics.perBeamEe,
        activeTxPowerW: legacyMetrics.activeTxPowerW,
        totalCommunicationPowerW: powerResult.totalCommunicationPowerW,
        totalPowerW: powerResult.totalPowerW,
        activeBeamCount: legacyMetrics.activeBeamCount,
        idleBeamCount: legacyMetrics.idleBeamCount,
        offBeamCount: legacyMetrics.offBeamCount,
        activeBeamRatio: legacyMetrics.activeBeamRatio,
      };
    } else {
      state.lastEnergyMetrics = legacyMetrics;
    }

    if (state.lastEnergyMetrics) {
      kpiAcc.recordEnergyMetrics({
        systemEeBitsPerJoule: state.lastEnergyMetrics.systemEeBitsPerJoule,
        totalPowerW: state.lastEnergyMetrics.totalPowerW,
        activeBeamRatio: state.lastEnergyMetrics.activeBeamRatio,
      });
    }
  }

  // Energy Layer 2 tick
  if (energyL2Manager) {
    for (const { satId } of satSamples) {
      if (!l2InitializedSats.has(satId)) {
        energyL2Manager.initSatellite(satId);
        l2InitializedSats.add(satId);
      }
    }

    for (const { satId, sample } of satSamples) {
      let powerW = 5; // Idle
      if (energyManager && isMultiBeam) {
        const layout = getOrCreateBeamLayout(state, satId, sample.altKm);
        const activeCount = representativeServing && representativeServing.satId === satId ? 1 : 0;
        const totalBeams = layout.beams.length;
        powerW = activeCount * 20 + (totalBeams - activeCount) * 0.1;
        if (activeCount === 0) powerW = 5;
      }
      energyL2Manager.tick(satId, powerW, timeSec, stepSec);
    }
  }
}
