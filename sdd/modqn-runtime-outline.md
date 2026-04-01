# MODQN Runtime SDD

**Status:** Active SDD — M2 entry open
**Promoted:** 2026-04-01 (M1 completion gate satisfied)
**Authority chain:** `modqn-baseline-spec-outline.md`, `phase0-architecture-spec.md §0C.6`

## Current Position in Sequence

M1 convergence is complete. This document now defines the active M2 runtime/trainer layer above the shipped baseline bridge.

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

## What Stays Out of Scope

1. Variant expansion (HOBS / EE / multi-objective weight sweep)
2. Full comparison pipeline
3. Any contract changes requiring Phase 1–5 reopening
