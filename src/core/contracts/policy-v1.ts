/**
 * policy-v1 — Frozen RL/DRL policy contract.
 *
 * @version v1
 * @frozen 2026-03-30 (Phase 4 Group 2 — phase4-runtime-contract-sdd.md §4.3)
 *
 * Consumer boundary:
 *   - src/app/hooks/**  may import these types
 *   - External RL adapters (future MODQN, estnet) must import from here,
 *     NOT from @/core/policy/types directly (SDD §5.1 F5)
 *
 * Excluded intentionally:
 *   RewardWeights, DEFAULT_REWARD_WEIGHTS — internal calibration, not consumer-facing.
 *
 * Forbidden:
 *   This file must NOT import React, Three.js, @react-three, @/viz, or @/app.
 *   (SDD §5.1 F1–F3)
 */

export type {
  /** @version v1 @frozen */
  PolicyObservation,
  /** @version v1 @frozen */
  PolicyAction,
  /** @version v1 @frozen */
  PolicyReward,
  /** @version v1 @frozen */
  Policy,
  /** @version v1 @frozen */
  SatelliteObservation,
  /** @version v1 @frozen */
  UeObservation,
  /** @version v1 @frozen */
  SatelliteAction,
  /** @version v1 @frozen */
  HandoverAction,
} from '@/core/policy/types';
