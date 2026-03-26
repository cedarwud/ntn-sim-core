/**
 * No-Op Policy plugin for ntn-sim-core (D3).
 *
 * Passes all decisions back to the baseline handover manager.
 * Useful as a control policy: zero RL influence, pure baseline behaviour.
 *
 * @source beamHO-bench/src/sim/policy/plugins/no-op-policy.ts
 * @tier paper-backed
 */

import type { Policy, PolicyObservation, PolicyAction } from '../types';

/**
 * No-op policy: takes no action and defers everything to the baseline.
 * All satellite actions are empty; handover mode is 'auto'.
 */
export const NO_OP_POLICY: Policy = {
  name: 'no-op',
  selectAction(_obs: PolicyObservation): PolicyAction {
    return {
      satelliteActions: [],
      handoverAction: { mode: 'auto' },
    };
  },
  reset(): void {
    // stateless — nothing to reset
  },
};
