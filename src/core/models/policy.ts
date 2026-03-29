/**
 * PolicyModel — Phase 2 model-bundle interface (P2-13, policy section).
 *
 * Re-export: Policy interface from policy/types.ts is already complete.
 * No new interface is defined here; PolicyModel is a type alias.
 *
 * Layer: L2 (src/core/models/)
 * Authority: phase2-model-bundle-sdd.md §5.7
 */

export type { Policy as PolicyModel } from '../policy/types.js';
export type { PolicyObservation, PolicyAction, PolicyReward } from '../policy/types.js';
