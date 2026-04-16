# MODQN Producer Diagnostics Consumer Follow-On

**Status:** Landed consumer implementation record — Slice 5 completed against the landed producer-side Phase 03B diagnostics export surface
**Drafted:** 2026-04-16  
**Promoted:** 2026-04-16
**Landed:** 2026-04-16
**Depends on:**
- [`modqn-producer-diagnostics-and-explainability-follow-on.md`](./modqn-producer-diagnostics-and-explainability-follow-on.md)
- [`modqn-external-bundle-loading-follow-on.md`](./modqn-external-bundle-loading-follow-on.md)
- [`modqn-story-dashboard-follow-on.md`](./modqn-story-dashboard-follow-on.md)
- [`modqn-replay-truth-hardening-follow-on.md`](./modqn-replay-truth-hardening-follow-on.md)
- [`/home/u24/papers/modqn-paper-reproduction/docs/phases/phase-03b-ntn-sim-core-producer-diagnostics-export-sdd.md`](/home/u24/papers/modqn-paper-reproduction/docs/phases/phase-03b-ntn-sim-core-producer-diagnostics-export-sdd.md)
- [`/home/u24/papers/modqn-paper-reproduction/artifacts/phase-03b-producer-diagnostics-export-status-2026-04-16.md`](/home/u24/papers/modqn-paper-reproduction/artifacts/phase-03b-producer-diagnostics-export-status-2026-04-16.md)

## 1. Purpose

This SDD defines the consumer-side `Slice 5` that consumes the landed
producer-side `Phase 03B` diagnostics-export surface.

Its purpose is narrow:

1. accept additive producer-owned policy diagnostics when they exist,
2. surface them in the MODQN bundle dashboard without weakening the
   existing truth/disclosure boundary,
3. prove in the browser that the new explainability surface comes from
   exported bundle truth rather than frontend invention.

This file is now both the consumer-side authority record for that work
and the landed implementation summary for the current tree.

## 2. Promotion Basis

The producer-side prerequisite is now satisfied.

Verified promotion basis:

1. producer-side `Phase 03B` is landed in repo history at commit
   `13fca4707a9f7a6690d335e351bd8d1805d9f10b`,
2. the landed producer authority now includes the execution SDD plus the
   reviewed status note under `modqn-paper-reproduction`,
3. the producer sample fixture and replay-bundle validator now carry the
   additive diagnostics surface,
4. the landed producer field names and semantics are explicit enough
   that the consumer does not need to invent missing meaning.

Because those conditions are true, this file is promoted from a paired
draft into active consumer authority.

## 3. Scope

### 3.1 In Scope

1. additive consumer parsing of producer-owned diagnostics,
2. optional-bundle compatibility for older bundles that do not have
   diagnostics,
3. one explainability surface in bundle mode,
4. browser-visible validation for the new surface,
5. status / validation / handoff sync for the landed slice.

### 3.2 Out Of Scope

1. defining producer-side field semantics unilaterally from
   `ntn-sim-core`,
2. inventing fallback scores or candidate rankings when the producer did
   not export them,
3. changing native runtime / beam-switch / handover semantics,
4. merging explainability into `ModqnBundleMetadataPanel`,
5. treating showcase-only visual aids as authoritative truth.

## 4. Landed Upstream Surface

### 4.1 Row-level `policyDiagnostics`

The landed producer-side `Phase 03B` surface adds one optional row-level
object:

1. optional `policyDiagnostics` on each `timeline/step-trace.jsonl` row.

Older bundles may omit `policyDiagnostics` entirely and remain valid.

When present, the landed fields are:

1. `diagnosticsVersion`
2. `objectiveWeights`
3. `selectedScalarizedQ`
4. `runnerUpScalarizedQ`
5. `scalarizedMarginToRunnerUp`
6. `availableActionCount`
7. `topCandidates`

`objectiveWeights` is a producer-owned named object keyed by:

1. `r1Throughput`
2. `r2Handover`
3. `r3LoadBalance`

`runnerUpScalarizedQ` and `scalarizedMarginToRunnerUp` are numeric when
more than one masked action is available and `null` when only one valid
candidate exists.

Each `topCandidates` entry exposes stable producer-owned identity:

1. `beamId`
2. `beamIndex`
3. `satId`
4. `satIndex`
5. `localBeamIndex`
6. `validUnderDecisionMask`
7. `objectiveQ`
8. `scalarizedQ`

`objectiveQ` is also a named object keyed by:

1. `r1Throughput`
2. `r2Handover`
3. `r3LoadBalance`

`topCandidates` must be treated as the producer-ranked candidate list.
The consumer must preserve producer ordering rather than recomputing its
own ranking.

### 4.2 Manifest-level `optionalPolicyDiagnostics`

The landed producer-side manifest may also expose optional bundle-level
disclosure at `manifest.optionalPolicyDiagnostics`.

Older bundles may omit this block entirely and remain valid.

When present, the landed fields are:

1. `present`
2. `timelineField`
3. `diagnosticsVersion`
4. `requiredByBundleSchema`
5. `producerOwned`
6. `selectedActionSource`
7. `topCandidateLimit`
8. `rowsWithDiagnostics`
9. `rowsWithoutDiagnostics`
10. `note`

This manifest block is a metadata/disclosure surface, not the primary
bundle-mode explainability panel.

## 5. Consumer Slice 5A: Adapter And Optional Contract Surface

Landing zone:

1. `src/adapters/modqn-bundle/*`

Required behavior:

1. accept bundles with no diagnostics and keep the current Slice 2/3/4
   path fully working,
2. accept bundles with no `optionalPolicyDiagnostics` manifest block and
   keep older bundles valid without pretending diagnostics exist,
3. validate the landed `policyDiagnostics` shape only when present,
4. validate the landed `optionalPolicyDiagnostics` disclosure block only
   when present,
5. reject malformed diagnostics rather than silently coercing them into
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
4. keep `manifest.optionalPolicyDiagnostics` as the separate
   metadata/disclosure surface rather than turning it into a first-screen
   explainability claim,
5. disclose explicitly when the loaded bundle is older and has no policy
   diagnostics, and when a bundle carries only partial diagnostics
   coverage,
6. never present a synthetic ranking, runner-up score, margin, or
   objective breakdown that the producer did not export.

Preferred presentation shape:

1. selected-vs-runner-up score strip,
2. margin summary,
3. compact top-candidate list,
4. explicit note that the values come from producer-exported decision
   diagnostics,
5. preservation of producer ordering and producer naming for
   `objectiveWeights` / `objectiveQ`.

## 7. Consumer Slice 5C: Landed Browser-Visible Proof Target

The promoted consumer validation target should land as:

1. `VAL-MODQN-BUNDLE-005`

`VAL-MODQN-BUNDLE-005` is now landed in the current `ntn-sim-core` tree
through `scripts/validate-modqn-bundle-ui.ts`.

At minimum it should cover:

1. diagnostics render from exported producer fields only,
2. older bundles without diagnostics remain valid and disclose absence
   instead of fabricating values,
3. `optionalPolicyDiagnostics` remains a disclosure/coverage surface and
   does not replace row-level explainability truth,
4. sample/external bundle paths both support the new explainability
   surface when the bundle actually carries diagnostics,
5. candidate identity and selected-serving identity remain aligned with
   the same replay-truth row rather than diverging into separate
   frontend-only state,
6. multi-user slots stay anchored to the first exported replay row
   rather than a frontend-sorted user order.

`VAL-MODQN-BUNDLE-002` / `003` / `004` must continue to pass.

## 8. Execution Rule

Producer-side promotion was already satisfied before this consumer
landing.

The landed implementation in the current tree follows this SDD plus
`todo/modqn-producer-diagnostics-consumer/README.md`.

Future reopen work must still stop if any of these becomes true:

1. current Slice 2/3/4 guarantees cannot be preserved,
2. the consumer can only render the new surface by inventing producer
   semantics,
3. the required browser-visible proof cannot be defined without
   blurring explainability and metadata/disclosure boundaries.

## 9. Negative-Result Rule

If a future reopen changes the producer diagnostics surface and the
consumer cannot expose it without weakening current truth/disclosure
boundaries, the correct outcome is:

1. keep `Slice 2/3/4` as the latest landed bundle-demo surface,
2. record the consumer-side limitation explicitly,
3. stop rather than blurring producer truth and frontend inference.
