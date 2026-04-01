/**
 * src/core/algorithms — Algorithm adapter layer.
 *
 * Purpose: contain algorithm-facing runtime adapters and policy logic,
 * isolating baseline reproduction and future RL logic from engine internals.
 *
 * @layer algorithms
 * @created 2026-03-31 (downstream architecture Group 2)
 * @authority sdd/downstream-runtime-architecture-sdd.md §3.1, §8B
 *
 * Current state: skeleton only — M1 will add ModqnBaselineAdapter here.
 *
 * Dependency rules:
 *   MAY import:   @/core/contracts
 *   MUST NOT:     @/core/engine/ internals, @/viz/, @/app/, authored profiles
 */

export type { AlgorithmDescriptor } from './types';
export type { Policy, PolicyObservation, PolicyAction, PolicyReward } from './types';
