/**
 * Greedy-SINR Policy plugin for ntn-sim-core (D3).
 *
 * At each tick, triggers an immediate handover to the satellite with the
 * highest SINR among visible candidates (excluding the current serving sat).
 * If the best visible satellite is already serving, takes no action.
 *
 * This is a strong greedy baseline that maximises instantaneous SINR
 * at the cost of frequent handovers (no hysteresis, no TTT).
 *
 * @source beamHO-bench/src/sim/policy/plugins/greedy-sinr-policy.ts
 * @tier paper-backed
 */

import type { Policy, PolicyObservation, PolicyAction } from '../types';

/**
 * Greedy-SINR policy: always trigger HO toward best SINR satellite.
 */
export const GREEDY_SINR_POLICY: Policy = {
  name: 'greedy-sinr',

  selectAction(obs: PolicyObservation): PolicyAction {
    const serving = obs.satellites.find((s) => s.isServing);

    // Find highest-SINR non-serving satellite
    let bestSinr = -Infinity;
    let bestSatId: string | undefined;
    for (const sat of obs.satellites) {
      if (!sat.isServing && sat.sinrDb > bestSinr) {
        bestSinr = sat.sinrDb;
        bestSatId = sat.satId;
      }
    }

    // Trigger HO only if candidate is strictly better than serving
    if (bestSatId && (!serving || bestSinr > serving.sinrDb)) {
      return {
        satelliteActions: [],
        handoverAction: { mode: 'trigger', targetSatId: bestSatId },
      };
    }

    return {
      satelliteActions: [],
      handoverAction: { mode: 'auto' },
    };
  },

  reset(): void {
    // stateless
  },
};
