/**
 * Invalid-Probe Policy plugin for ntn-sim-core (D3).
 *
 * Deliberately issues invalid actions (non-existent satId, empty beam lists)
 * to verify that the engine's action validation and fallback logic works
 * correctly under adversarial policy output.
 *
 * USE ONLY IN TEST SCENARIOS — not suitable for production benchmarks.
 *
 * @source beamHO-bench/src/sim/policy/plugins/invalid-probe-policy.ts
 * @tier paper-backed
 */

import type { Policy, PolicyObservation, PolicyAction } from '../types';

/**
 * Invalid-probe policy: always issues a HO trigger to a non-existent satellite.
 * The engine must gracefully reject this and fall back to baseline behaviour.
 */
export const INVALID_PROBE_POLICY: Policy = {
  name: 'invalid-probe',

  selectAction(_obs: PolicyObservation): PolicyAction {
    return {
      // Attempt to activate beams on a satellite that does not exist
      satelliteActions: [
        {
          satId: '__invalid_sat_id__',
          activeBeamIds: [],
          beamPowerDbm: null,
        },
      ],
      // Trigger HO to a satellite that does not exist
      handoverAction: {
        mode: 'trigger',
        targetSatId: '__invalid_sat_id__',
      },
    };
  },

  reset(): void {
    // stateless
  },
};
