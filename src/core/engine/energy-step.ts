import type { SimEngineState } from './state';
import type { TrajectorySample } from '../orbit/types';
import { getOrCreateBeamLayout } from './bootstrap';
import { DEFAULT_ENERGY_LAYER1_CONFIG } from '../energy/layer1';

/**
 * Phase 5 Core Structural Split: Energy step.
 * Ownership: Energy consumption tracking (L1/L2) and EE KPI computation.
 */

export function runEnergyStep(
  state: SimEngineState,
  timeSec: number,
  stepSec: number,
  satSamples: Array<{ satId: string; sample: TrajectorySample }>,
  satSinrs: Array<{ satId: string; sinrDb: number; bestBeamId: string }>,
  representativeServing: { satId: string; beamId: string } | null
) {
  const {
    profile,
    bundle,
    energyManager,
    energyL2Manager,
    isMultiBeam,
    kpiAcc,
    beamLayouts,
    l2InitializedSats,
  } = state;

  if (energyManager && isMultiBeam) {
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

    if (representativeServing) {
      const servEntry = satSinrs.find((s) => s.satId === representativeServing.satId);
      if (servEntry) {
        energyManager.applyDpc(servEntry.bestBeamId, servEntry.sinrDb);
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

    if (bundle.power && bundle.ee) {
      const numActiveBeams = representativeServing
        ? (satSinrs.find((s) => s.satId === representativeServing!.satId) ? 1 : 0)
        : 0;
      const totalThroughputBps = Array.from(throughputs.values()).reduce((s, v) => s + v, 0);
      
      const totalBeamsInSystem = satSamples.reduce((sum, { satId }) => {
        const layout = beamLayouts.get(satId);
        return sum + (layout ? layout.beams.length : 0);
      }, 0);

      const powerResult = bundle.power.compute({
        txPowerPerBeamDbm: profile.rf.tx_power_per_beam_dbm ?? DEFAULT_ENERGY_LAYER1_CONFIG.txPowerPerBeamDbm,
        numActiveBeams,
        circuitPowerW: DEFAULT_ENERGY_LAYER1_CONFIG.idlePowerW * Math.max(0, totalBeamsInSystem - numActiveBeams),
      });

      const eeBpj = bundle.ee.computeBitsPerJoule({
        throughputBps: totalThroughputBps,
        totalPowerW: powerResult.totalPowerW,
      });

      const legacyMetrics = energyManager.computeMetrics(throughputs);
      state.lastEnergyMetrics = {
        systemEeBitsPerJoule: eeBpj,
        perBeamEe: legacyMetrics.perBeamEe,
        totalPowerW: powerResult.totalPowerW,
        activeBeamRatio: legacyMetrics.activeBeamRatio,
      };
    } else {
      state.lastEnergyMetrics = energyManager.computeMetrics(throughputs);
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
