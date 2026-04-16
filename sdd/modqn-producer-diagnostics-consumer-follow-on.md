# MODQN Producer Diagnostics Consumer Follow-On

**Status:** Paired consumer execution draft — activation blocked until the producer-side Phase 03B slice lands  
**Drafted:** 2026-04-16  
**Depends on:**
- [`modqn-producer-diagnostics-and-explainability-follow-on.md`](./modqn-producer-diagnostics-and-explainability-follow-on.md)
- [`modqn-external-bundle-loading-follow-on.md`](./modqn-external-bundle-loading-follow-on.md)
- [`modqn-story-dashboard-follow-on.md`](./modqn-story-dashboard-follow-on.md)
- [`modqn-replay-truth-hardening-follow-on.md`](./modqn-replay-truth-hardening-follow-on.md)
- [`/home/u24/papers/modqn-paper-reproduction/docs/phases/phase-03b-ntn-sim-core-producer-diagnostics-export-sdd.md`](/home/u24/papers/modqn-paper-reproduction/docs/phases/phase-03b-ntn-sim-core-producer-diagnostics-export-sdd.md)
- [`/home/u24/papers/modqn-paper-reproduction/artifacts/phase-01d-reopen-trigger-check-2026-04-16-producer-diagnostics.md`](/home/u24/papers/modqn-paper-reproduction/artifacts/phase-01d-reopen-trigger-check-2026-04-16-producer-diagnostics.md)

## 1. Purpose

This draft defines the consumer-side slice that would pair with the
producer-side `Phase 03B` diagnostics-export slice.

Its purpose is narrow:

1. accept additive producer-owned policy diagnostics when they exist,
2. surface them in the MODQN bundle dashboard without weakening the
   existing truth/disclosure boundary,
3. prove in the browser that the new explainability surface comes from
   exported bundle truth rather than frontend invention.

This file does **not** by itself authorize implementation yet.

## 2. Activation Boundary

This draft becomes a valid implementation surface only after all of
these are true:

1. producer-side `Phase 03B` lands an additive export surface,
2. at least one reviewed producer artifact or fixture carries the new
   diagnostics,
3. the landed producer field names and semantics still match this draft
   closely enough to avoid consumer guesswork,
4. the matching `todo/` handoff pack is treated as promoted rather than
   as planning-only context.

Until then, this is a paired execution draft only.

## 3. Scope

### 3.1 In Scope

1. additive consumer parsing of producer-owned diagnostics,
2. optional-bundle compatibility for older bundles that do not have
   diagnostics,
3. one explainability surface in bundle mode,
4. browser-visible validation for the new surface,
5. status / validation / handoff sync when the slice eventually lands.

### 3.2 Out Of Scope

1. defining producer-side field semantics unilaterally from
   `ntn-sim-core`,
2. inventing fallback scores or candidate rankings when the producer did
   not export them,
3. changing native runtime / beam-switch / handover semantics,
4. merging explainability into `ModqnBundleMetadataPanel`,
5. treating showcase-only visual aids as authoritative truth.

## 4. Expected Upstream Surface

The current producer-side `Phase 03B` draft proposes one additive
timeline field:

1. optional `policyDiagnostics` on each replay row,
2. optional manifest-level disclosure that diagnostics are present.

The current expected fields are:

1. `diagnosticsVersion`
2. `objectiveWeights`
3. `selectedScalarizedQ`
4. `runnerUpScalarizedQ`
5. `scalarizedMarginToRunnerUp`
6. `availableActionCount`
7. `topCandidates`

Each `topCandidates` entry is expected to expose stable producer-owned
identity:

1. `beamId`
2. `beamIndex`
3. `satId`
4. `satIndex`
5. `localBeamIndex`
6. `validUnderDecisionMask`
7. `objectiveQ`
8. `scalarizedQ`

If the producer-side landed shape differs materially from this draft,
this file must be revised before implementation.

## 5. Consumer Slice 5A: Adapter And Optional Contract Surface

Landing zone:

1. `src/adapters/modqn-bundle/*`

Required behavior:

1. accept bundles with no diagnostics and keep the current Slice 2/3/4
   path fully working,
2. validate `policyDiagnostics` only when present,
3. keep older bundles valid without pretending diagnostics exist,
4. reject malformed diagnostics rather than silently coercing them into
   made-up consumer semantics.

This is an additive optional surface, not a rewrite of the frozen replay
bundle meaning.

## 6. Consumer Slice 5B: View-Model And Dashboard Surface

Landing zones:

1. `src/viz/view-models/modqn-bundle-replay-view-model.ts`
2. bundle-mode overlay surfaces under `src/viz/overlays/`
3. `SceneShell` only if minimal wiring is needed

Required behavior:

1. project producer-owned diagnostics into a bundle-mode explainability
   surface,
2. keep existing first-screen truth obligations intact,
3. keep `ModqnBundleMetadataPanel` as the separate provenance/disclosure
   surface,
4. disclose explicitly when the loaded bundle is older and has no policy
   diagnostics,
5. never present a synthetic ranking or margin that the producer did not
   export.

Preferred presentation shape:

1. selected-vs-runner-up score strip,
2. margin summary,
3. compact top-candidate list,
4. explicit note that the values come from producer-exported decision
   diagnostics.

## 7. Consumer Slice 5C: Browser-Visible Proof

The eventual consumer validation surface should land as:

1. `VAL-MODQN-BUNDLE-005`

At minimum it should cover:

1. diagnostics render from exported producer fields only,
2. older bundles without diagnostics remain valid and disclose absence
   instead of fabricating values,
3. sample/external bundle paths both support the new explainability
   surface when the bundle actually carries diagnostics,
4. candidate identity and selected-serving identity remain aligned with
   the same replay-truth row rather than diverging into separate
   frontend-only state.

`VAL-MODQN-BUNDLE-002` / `003` / `004` must continue to pass.

## 8. Promotion Rule

This slice should be promoted into active implementation only if:

1. producer-side `Phase 03B` is no longer just a draft,
2. one concrete additive artifact exists for consumer use,
3. the consumer can preserve current Slice 2/3/4 guarantees while adding
   the new explainability layer,
4. the resulting browser-visible proof can be defined clearly enough for
   `VAL-MODQN-BUNDLE-005`.

If those conditions are not met, this file should remain planning-only.

## 9. Negative-Result Rule

If the producer lands diagnostics but the consumer cannot expose them
without weakening current truth/disclosure boundaries, the correct
outcome is:

1. keep `Slice 2/3/4` as the latest landed bundle-demo surface,
2. record the consumer-side limitation explicitly,
3. stop rather than blurring producer truth and frontend inference.
