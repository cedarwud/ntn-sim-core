# MODQN Runtime (Outline)

**Status:** Outline — promotion blocked by M1 convergence
**Updated:** 2026-03-31 (downstream architecture Group 1 — promotion conditions added)

## Current Position in Sequence

This outline covers M2 runtime implementation scope. It must not be treated as implementation-ready until M1 has delivered a confirmed `ModqnBaselineAdapter` interface.

**Read first:** `modqn-baseline-spec-outline.md` (now active spec) defines M1 boundaries.

## Future M2 Scope

1. Training loop scaffolding for the reproduced baseline
2. Action-space adapter training path (extends M1 `ModqnBaselineAdapter`)
3. Reward vector computation and weight-scalarization training mode
4. Evaluation hooks — run trained model against a held-out scenario
5. Baseline artifact outputs used by UI (result bundle type for M3/U1)

## Promotion Conditions

This outline may be promoted to an active SDD only when ALL of the following are met:

1. M1 has shipped `ModqnBaselineAdapter` in `src/core/algorithms/`
2. The `Policy` interface from `policy-v1` has been confirmed sufficient for MODQN training path (or a contract extension has been reviewed)
3. The baseline paper's training protocol (9000 episodes, ε-greedy, batch 128) is confirmed expressible through the platform runner surface without internal engine mutation
4. `npm run validate:stage` is green after M1

## What Stays Out of Scope

1. Variant expansion (HOBS / EE / multi-objective weight sweep)
2. Full comparison pipeline
3. Any contract changes requiring Phase 1–5 reopening
