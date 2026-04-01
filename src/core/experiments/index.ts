/**
 * src/core/experiments — Experiment manifest and result layer.
 *
 * Purpose: define reproducible run specs, manifests, and artifact assembly
 * for baseline experiments. Separates "how to run and record" from
 * "how the algorithm works".
 *
 * @layer experiments
 * @created 2026-03-31 (downstream architecture Group 2)
 * @authority sdd/downstream-runtime-architecture-sdd.md §3.2, §8B
 *
 * Current state: skeleton only — M2 will add baseline training manifests here.
 *
 * Dependency rules:
 *   MAY import:   @/core/contracts, @/core/algorithms, runner surfaces
 *   MUST NOT:     @/core/engine/ internals, @/viz/, @/app/, policy logic
 */

export type { ExperimentManifest, ExperimentResult } from './types';
