# MODQN Targeted Parity Strengthening SDD

**Status:** Shipped follow-on SDD — current-anchor parity package and `VAL-MODQN-004` landed; future paper-family extension remains future-track  
**Promoted:** 2026-04-02  
**Depends on:** `paper-mode-claim-mode-hardening-outline.md`, `modqn-baseline-spec-outline.md`, `modqn-runtime-outline.md`, `modqn-experiment-outline.md`, `modqn-baseline-acceptance-note.md`, `ntn-sim-core-reproduction-protocol.md`, `ntn-sim-core-reproduction-targets.md`  
**Scope gate:** current-anchor parity evidence and paper-ready result packaging only

---

## 1. Current Position in Sequence

The current tree has already completed:

1. platform closure,
2. `MODQN` baseline reproduction through `M3`,
3. UI baseline viewer closure through `U2`,
4. `T1` real-trace truth-path correction,
5. `PM1` paper-mode / claim-mode governance hardening.

That means the next paper-oriented gap is no longer “can the baseline run?” or “how should it be described?”.

The next gap is:

1. how strongly the current anchor baseline actually matches its target paper,
2. which current results are only trend-faithful vs range-faithful,
3. how to package those comparisons into paper-ready evidence without overstating the current proxy ceiling.

This document defines that narrower follow-on.

---

## 2. Purpose

This follow-on exists to strengthen parity evidence for the current anchor paper:

1. paper: `PAP-2024-MORL-MULTIBEAM`
2. profile: `modqn-paper-baseline`
3. family: `FAM-MODQN-SYNTH`

It must answer five practical questions:

1. which paper figures / tables / metrics are the current parity targets,
2. which targets are already trend-faithful vs range-faithful vs qualitative-only,
3. what artifact bundle should be treated as paper-ready evidence for the current anchor line,
4. what disclosed deviations remain because of the current `2 x 2` proxy / short-window / `ue-0` bridge ceiling,
5. what minimum parity evidence is needed before stronger paper wording is used.

This follow-on is not a new algorithm phase and not a broader realism expansion.

---

## 3. Current Anchor Scope

### 3.1 Frozen Anchor

The frozen current anchor remains:

1. `PAP-2024-MORL-MULTIBEAM`
2. `modqn-paper-baseline`
3. `runModqnBaselineReproduction()`
4. `ModqnReproductionResult`
5. `ModqnViewModel`

### 3.2 What This Line May Strengthen

This line may strengthen:

1. target-paper comparison mapping,
2. explicit parity labels (`trend-faithful`, `range-faithful`, `qualitative-only`),
3. comparison artifacts and paper-ready figure/table packaging,
4. disclosure text tied to the shipped anchor ceiling,
5. stable export surfaces that repackage already-shipped truth rather than inventing new truth.

### 3.3 What This Line Must Not Reopen

This line must not reopen:

1. the M1 state/action/reward bridge,
2. the M2 training/runtime closure,
3. the M3 stabilized result schema,
4. the PM1 claim-discipline rules,
5. the T1 truth-path runtime correction.

---

## 4. Parity Targets

### 4.1 Required Target Types

At least one parity package for the current anchor line should include:

1. one primary KPI or outcome comparison that directly supports the headline claim,
2. one training/evaluation-side comparison that shows the baseline path is not only runnable but literature-aligned,
3. one disclosure-complete comparison note stating what remains outside exact paper-scale parity.

### 4.2 Required Parity Labels

Every target in the package must be explicitly labeled as one of:

1. `trend-faithful`
2. `range-faithful`
3. `qualitative-only`

The label must be tied to:

1. the comparison mode,
2. the current disclosed proxy ceiling,
3. any remaining deviations from the paper’s original study envelope.

### 4.3 Current Ceiling Reminder

No parity target may be packaged as stronger than the shipped baseline warrants.

The comparison bundle must continue disclosing:

1. the `2 x 2` proxy shell,
2. short episode / held-out windows,
3. many-window single-visible-satellite limitations,
4. `ue-0` control scope,
5. epsilon-decay assumption.

### 4.4 Current Packaged Targets

The current tree now ships one explicit current-anchor parity bundle over `runModqnBaselineReproduction()` / `ModqnReproductionResult`.

Current packaged targets are:

| Target ID | Paper Reference | Comparison Mode | Current Label | Current Note |
|---|---|---|---|---|
| `anchor-envelope` | `Table I / Table II / §IV` | paper-backed parameter envelope | `range-faithful` | shipped profile + frozen manifest align on the paper-backed anchor rows; current artifact still discloses the `2 x 2` proxy and validation-sized execution subset |
| `weighted-reward-user-count` | `Fig. 3(b)` | held-out scalar reward trend over `40 / 100 / 200` users | `trend-faithful` | shipped scalar reward decreases as user count increases |
| `weighted-reward-satellite-count` | `Fig. 4(b)` | held-out scalar reward trend over `2 / 6 / 8` synthetic proxy satellites | `trend-faithful` | shipped scalar reward increases over the selected current-family sweep; the frozen `4`-satellite anchor remains covered by the envelope target |
| `weighted-reward-user-speed` | `Fig. 5(b)` | held-out scalar reward trend over `30 / 90 / 150 km/h` | `qualitative-only` | current shipped proxy artifact does not show a stable decreasing speed trend, so this target stays below trend-faithful |
| `baseline-comparator-ranking` | `Fig. 3(b) / Fig. 4(b) / Fig. 5(b)` | qualitative comparator note | `qualitative-only` | shipped truth currently executes only `MODQN`; `RSS_max` / `DQN_throughput` / `DQN_scalar` are not re-run on this surface |

---

## 5. Paper-Ready Artifact Bundle

The intended output of this line is a paper-oriented parity bundle built on the already-shipped result surface.

Minimum bundle contents:

1. target-paper ID and anchor-family ID,
2. comparison table for the selected targets,
3. explicit parity label per target,
4. disclosure notes for each non-exact paper-scale deviation,
5. figure/table-ready exports derived from shipped result truth,
6. a short verdict on whether the bundle supports only trend-faithful or also range-faithful wording.

Build/export boundary for the landed surface:

1. `runModqnAnchorParityBundle()` may assemble current-anchor sweep evidence over the shipped MODQN runner truth path,
2. `comparisonRows`, `figures`, and markdown export are packaging projections over the already-materialized bundle targets,
3. paper-ready export helpers must not invent hidden simulator truth or hidden comparator outcomes beyond that materialized bundle.

The current landed bundle is implemented as:

1. `src/core/experiments/modqn-targeted-parity.ts`
2. `src/core/experiments/modqn-targeted-parity-types.ts`
3. `scripts/run-modqn-parity-bundle.ts`
4. `scripts/validate-modqn-parity.ts`

This bundle may be consumed by future paper writing, but it does not by itself authorize broader claims than PM1 allows.

---

## 6. Allowed Landing Zone

Primary landing zone:

1. `src/core/experiments/` comparison/export helpers that consume the shipped result surface
2. `src/viz/view-models/` comparison projection helpers that stay truth-safe
3. `scripts/` parity validators or artifact-packaging runners
4. `sdd/modqn-targeted-parity-outline.md`
5. `sdd/ntn-sim-core-reproduction-targets.md`
6. `sdd/ntn-sim-core-implementation-status.md`
7. `todo/modqn-parity/*`

Allowed companion sync:

1. `sdd/ntn-sim-core-research-positioning-note.md`
2. `sdd/ntn-sim-core-paper-family-matrix.md`
3. `sdd/ntn-sim-core-reproduction-protocol.md`
4. `todo/modqn/README.md`
5. `todo/README.md`
6. repo navigation docs that describe the shipped parity surface and any future reopen boundary

---

## 7. What Stays Out of Scope

This follow-on must **not** expand into:

1. new runtime/model realism,
2. `OMNeT++ / INET / estnet` integration,
3. real-trace scalability or mixed-orbit planning,
4. new algorithm branches,
5. replacing the current anchor baseline,
6. reopening frozen contracts,
7. replay identity or `RunnerExposureApi` changes,
8. turning PM1’s governance line back into a generic roadmap rewrite.

If stronger parity evidence appears to require those changes, that indicates a separate future line rather than scope creep here.

---

## 8. Validation Direction

Existing gates that must stay green:

1. `npm run validate:modqn`
2. `npm run validate:modqn:m2`
3. `npm run validate:modqn:m3`
4. `npm run validate:modqn:parity`
5. `npm run validate:stage`

This line should also prepare a narrower parity gate:

1. `VAL-MODQN-004`
   - verifies that the current anchor parity bundle exists, uses shipped result truth, labels targets as trend-faithful / range-faithful / qualitative-only, and preserves the disclosed proxy ceiling

Current gate implementation:

1. `scripts/validate-modqn-parity.ts`
2. wired into `npm run validate:modqn:parity`
3. included in `npm run validate:stage`

The intended validation shape is:

1. keep the shipped runtime/result gates green,
2. add one parity-evidence gate,
3. avoid any new runtime-truth gate unless a different future line is explicitly promoted.

---

## 9. Completion Boundary

This follow-on is complete only when:

1. the current anchor paper has at least one explicit parity package built from shipped truth,
2. each packaged target has an explicit parity label,
3. paper-ready figures/tables are packaging projections over materialized parity targets and can be generated without inventing new simulator truth,
4. the disclosed proxy ceiling remains attached to the package,
5. the repo can distinguish “baseline can run” from “baseline has paper-oriented parity evidence”.

This line remains deliberately narrower than any future realism or new-paper-family expansion.
