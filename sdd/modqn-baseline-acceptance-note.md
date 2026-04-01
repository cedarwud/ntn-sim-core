# MODQN Baseline Acceptance Note

**Status:** Active reviewer note — aggregate M1-to-M3 closure re-audit surface
**Date:** 2026-04-01
**Depends on:** `modqn-baseline-spec-outline.md`, `modqn-runtime-outline.md`, `modqn-experiment-outline.md`, `ntn-sim-core-validation-matrix.md`, `ntn-sim-core-acceptance-gates.md`
**Scope gate:** reviewer-only aggregate acceptance before optional `U1` richer-handoff consumption

---

## 1. Purpose

This note defines the smallest official reviewer surface for treating the shipped MODQN baseline path as one coherent baseline program rather than three separate group artifacts.

It exists to answer one practical question before downstream UI work consumes the richer MODQN handoff:

1. is the M1 bridge + M2 runtime/eval path + M3 result/UI handoff still coherent and disclosure-complete in the current tree?

This note does **not** create a new MODQN implementation phase.

---

## 2. When To Use It

Run this aggregate acceptance check when:

1. `U1` plans to consume `ModqnReproductionResult` and/or `ModqnViewModel` instead of staying purely on `kpi-v1` / `runtime-v1` / `RunnerExposureApi`;
2. a later MODQN maintenance change may have drifted the shipped baseline closure;
3. a reviewer needs one final verdict on whether the baseline reproduction line can be treated as complete through M3.

This check is **recommended**, not a hard prerequisite, for `U1` contracts-only entry.

---

## 3. Acceptance Surface

The aggregate baseline acceptance surface is:

1. M1 paper-faithful bridge:
   - `src/core/contracts/modqn-contracts.ts`
   - `src/core/algorithms/modqn-baseline-adapter.ts`
   - `buildPaperState()`
   - `buildRewardVector()`
   - `modqn-paper-baseline`
2. M2 runtime/training/eval path:
   - `ModqnTrainer`
   - `buildModqnSamplingPlan`
   - `MODQN_REPRODUCTION_MANIFEST`
   - `runModqnBaselineReproduction()`
3. M3 stable viewer-facing handoff:
   - `ModqnReproductionResult`
   - `ModqnViewModel`
4. Validation evidence:
   - `npm run validate:modqn`
   - `npm run validate:modqn:m2`
   - `npm run validate:modqn:m3`
   - `npm run validate:stage`

---

## 4. Reviewer Checklist

### 4.1 Authority And Boundary

1. The effective authority chain remains:
   - `modqn-baseline-spec-outline.md`
   - `modqn-runtime-outline.md`
   - `modqn-experiment-outline.md`
2. No deferred `M3 Group 2`, `M4`, HOBS+38.811, EE-objective, or comparison-dashboard scope has been mixed into the shipped baseline path.
3. `U1` entry remains contracts-first; the MODQN M3 result bundle is an optional richer handoff, not a prerequisite for entering `U1`.

### 4.2 M1 / M2 / M3 Coherence

1. M2 still consumes the reviewed M1 handoff surface instead of reimplementing state/action/reward truth.
2. M3 still stabilizes the shipped M2 result surface additively rather than replacing it with a second incompatible schema.
3. No UI-facing projector recomputes simulator truth or invents paper targets from heuristics.

### 4.3 Disclosure And Claim Ceiling

The shipped baseline path must continue to disclose:

1. the `2x2` proxy ceiling;
2. the `10 s` episode window;
3. many-window single-visible-satellite limitations;
4. the `ue-0` control scope of the current bridge;
5. the explicit epsilon-decay assumption.

Passing this acceptance note means:

1. the baseline reproduction line is complete through M3 for engineering/UI handoff;
2. the richer MODQN handoff may be consumed by `U1`;
3. stronger paper-scale claims remain bounded by the disclosed proxy ceiling.

It does **not** authorize:

1. `M3 Group 2`;
2. `M4`;
3. HOBS/EE variants;
4. comparison dashboards;
5. any reopening of frozen platform contracts.

---

## 5. Required Evidence

The reviewer should treat the aggregate check as failed if any of the following is not green in the current tree:

1. `npm run validate:modqn`
2. `npm run validate:modqn:m2`
3. `npm run validate:modqn:m3`
4. `npm run validate:stage`

---

## 6. Expected Verdicts

A reviewer using this note should end with explicit verdicts for:

1. `ready for U1 contracts-only entry`
2. `ready for U1 richer-handoff consumption`
3. `baseline reproduction complete through M3`
4. `not approval for M4 / comparison / variant expansion`
