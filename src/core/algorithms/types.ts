/**
 * src/core/algorithms/types — Downstream boundary types for algorithm adapters.
 *
 * This file defines the minimal type surface that M1 (and later groups) will
 * extend when implementing baseline MODQN and future algorithm adapters.
 *
 * @layer algorithms
 * @created 2026-03-31 (downstream architecture Group 2)
 *
 * Dependency rules (SDD §8B):
 *   - MAY import from @/core/contracts (policy-v1, runtime-v1, kpi-v1)
 *   - MUST NOT import from @/core/engine/ internals
 *   - MUST NOT expand to @/core/models or other internal helper layers unless a later downstream spec names that dependency explicitly
 *   - MUST NOT import from @/viz/ or @/app/
 *   - MUST NOT import from authored profile files
 */

import type { Policy, PolicyObservation, PolicyAction, PolicyReward } from '@/core/contracts/policy-v1';

// Re-export the contract interface that all algorithm adapters must implement.
export type { Policy, PolicyObservation, PolicyAction, PolicyReward };

// ---------------------------------------------------------------------------
// Algorithm adapter metadata (filled by M1 and later groups)
// ---------------------------------------------------------------------------

/**
 * Descriptor for a registered algorithm adapter.
 *
 * M1 will register the MODQN baseline adapter using this shape.
 * Future adapters (HOBS policy, EE policy, etc.) would add entries later.
 */
export interface AlgorithmDescriptor {
  /** Unique algorithm identifier (e.g. 'modqn-baseline'). */
  readonly id: string;
  /** Human-readable name for UI display. */
  readonly displayName: string;
  /** Paper ID from catalog (e.g. 'PAP-2024-MORL-MULTIBEAM'). */
  readonly paperId: string;
  /** Factory that creates a fresh Policy instance. */
  createPolicy(): Policy;
}
