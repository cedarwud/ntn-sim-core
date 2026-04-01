# MODQN Runtime SDD

**Status:** Active SDD — M2 complete, M3 preflight open
**Promoted:** 2026-04-01 (M1 completion gate satisfied)
**Authority chain:** `modqn-baseline-spec-outline.md`, `phase0-architecture-spec.md §0C.6`

## Current Position in Sequence

M1 convergence is complete. This document now records the shipped M2 runtime/trainer layer above the reviewed baseline bridge.

**Read first:** `modqn-baseline-spec-outline.md` defines the now-shipped M1 boundary and frozen paper-faithful contract surface.

## Active M2 Scope

1. Training loop scaffolding for the reproduced baseline
2. Action-space adapter training path (extends M1 `ModqnBaselineAdapter`)
3. Reward vector computation and weight-scalarization training mode
4. Evaluation hooks — run trained model against a held-out scenario
5. Baseline artifact outputs used by UI (result bundle type for M3/U1)

## Promotion Record

Promotion conditions were satisfied on 2026-04-01:

1. `ModqnBaselineAdapter` shipped in `src/core/algorithms/`
2. `policy-v1` plus `modqn-contracts.ts` were reviewed as the stable training/runtime bridge
3. The paper training protocol is now frozen in `MODQN_BASELINE_TRAINING_PROTOCOL`
4. `validate-modqn-baseline.ts` proves constants, adapter logic, action-consumption wiring, and `modqn-paper-baseline` runtime viability
5. `npm run validate:stage` remains the platform-wide green gate after adding `validate:modqn`

## M2 Completion Record

M2 completed on 2026-04-01 with the following shipped surface:

1. `src/core/experiments/` now owns deterministic epoch-window sampling, replay-buffer training, held-out evaluation, and result/artifact assembly for the baseline path.
2. `ModqnTrainer` consumes the M1 handoff surface directly:
   - `ModqnBaselineAdapter.buildPaperState()`
   - `ModqnBaselineAdapter.selectPaperAction()`
   - `ModqnBaselineAdapter.buildPolicyAction()`
   - `ModqnBaselineAdapter.buildRewardVector()`
3. `runModqnBaselineReproduction()` now provides a working runtime/training/evaluation loop over `modqn-paper-baseline`, with explicit held-out evaluation and replay artifact output.
4. `validate-modqn-m2.ts` now enforces `VAL-MODQN-002` for:
   - explicit sampling strategy
   - experiments-layer boundary compliance
   - M1 handoff reuse
   - runnable training/evaluation closure

## M2 Runtime Disclosure

The completed M2 path is deliberately explicit about its remaining ceilings:

1. Episode diversity is built from deterministic epoch sweeps over the disclosed 2x2 proxy, not from a paper-scale constellation envelope.
2. Many sampled windows still expose only one visible satellite, so held-out evaluation is real but diversity-limited.
3. The frozen runtime action bridge still controls primary user `ue-0`; the remaining users stay as load/background truth for `N(t)` and `r3`.
4. The paper specifies epsilon-greedy exploration but not a decay schedule; M2 uses a deterministic multiplicative decay for reproducible training smoke and held-out replay.

## What Stays Out of Scope

1. Variant expansion (HOBS / EE / multi-objective weight sweep)
2. Full comparison pipeline
3. Any contract changes requiring Phase 1–5 reopening
