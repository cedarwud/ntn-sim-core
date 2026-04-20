# External Scene Integration Follow-On

**Status:** Promoted Phase 3 follow-on — active implementation authority
**Drafted:** 2026-04-19
**Promoted:** 2026-04-19
**Landed:** pending
**Depends on:**
1. `sdd/scene-consumer-contract-extraction-follow-on.md`
2. `sdd/ntn-sim-core-implementation-status.md`
3. `sdd/ntn-sim-core-frontend-beam-visual-sdd.md`
4. `sdd/truth-preserving-showcase-visual-realignment-follow-on.md`
5. `todo/external-scene-integration/README.md`
6. `/home/u24/papers/ntn-v5-clean.md`

**Scope gate:** active implementation authority for the first deterministic
external-scene integration path, with `scenario-globe-handover-demo` first and
`scenario-globe-viewer` second; no `src/core/**` rewrite, no bundle/adaptor
semantic rewrite, no `SceneShell.tsx` promotion, and no `live`-first reopen

---

## 1. Current Position in Sequence

The current tree now has enough deterministic Phase 2 closure to stop treating
additional repo-internal proof slices as the default next move:

1. `scene-consumer-facade.ts` already exposes a read-only seam-adjacent source /
   truth / presentation contract without cloning `SimulationSnapshot` or
   `BeamPresentationFrame`.
2. `scene-consumer-proof.ts`, `scene-consumer-harness.ts`,
   `scene-consumer-starter.ts`, and
   `scene-consumer-starter-consumer.ts` now provide one deterministic
   repo-internal consumer ladder over that contract.
3. `SceneConsumerStarterExport` is now the named starter/export entry, and the
   hidden starter surface plus visible starter panel already align on one shared
   repo-internal starter-consumer projection.
4. current-thread targeted evidence now covers:
   - `bundle-sample`
   - `native-replay`
   through `lint`, `build`, `validate:contracts`, `validate:visual-browser`,
   and `validate:modqn:bundle-ui`.
5. `SceneShell.tsx`, `useSceneControlSurface.ts`, and
   `useBundleReplayShellState.ts` remain reference-viewer shell surfaces rather
   than external consumer API.

That is enough to promote a separate Phase 3 authority for external scene
integration. It is **not** yet evidence for `live` proof, package extraction,
or a fresh full `validate:stage` rerun.

## 2. Purpose

This follow-on exists to answer one narrower next-phase question:

**How should `scenario-globe-viewer` and `scenario-globe-handover-demo`
consume the landed scene-consumer starter/export surface without depending on
reference-viewer shell ownership?**

It should lock the first integration path, ownership split, and source-path
order before any cross-repo implementation starts.

## Reconciliation Note (2026-04-19 — Handover-Demo Native-Replay Slice 1)

The current tree now contains the first cross-repo executable slice under this
Phase 3 authority:

1. `ntn-sim-core/fixtures/scene-consumer-starter/native-replay-hobs-continuity-window.json`
   now acts as the first deterministic starter/export import target for a
   sibling consumer repo.
2. `scenario-globe-handover-demo/src/features/demo/ntn-scene-starter.ts`
   now imports that starter fixture and projects it into a narrow local
   `starterFeed` without inventing a parallel external contract.
3. `scenario-globe-handover-demo/src/features/demo/handover-focus-demo.ts`
   now consumes that `starterFeed` only for local handover-focus truth inputs
   and panel datasets, while leaving the demo repo's:
   - synthetic global orbit layer
   - same-page camera choreography
   - local proxy stage
   - beam/link/cone composition
   - toolbar/Home behavior
   under demo-owned control.
4. The starter bridge preserves `truth.sceneServingSatId` and
   `truth.publishedServingSatId` as distinct fields rather than flattening them
   through local role casting.

Current-thread evidence should still be stated conservatively:

1. per the execution-thread report, `ntn-sim-core` targeted gates reran clean on
   `lint`, `build`, `validate:contracts`, `validate:visual-browser`, and
   `validate:orbit-parity`;
2. per the same report, `scenario-globe-handover-demo` reran `build`,
   `npm test`, and `npm run test:phase1` clean, and the earlier browser-side
   WebGL viewer bootstrap blocker did not reproduce in the current tree;
3. this slice is therefore best treated as **code-landed and currently
   targeted-smoke-clean per execution-thread report**, while still not implying
   any fresh full-stage or broader cross-repo closure claim.

## Reconciliation Note (2026-04-20 — Viewer Bundle-Sample Slice 2)

The current tree now also contains the second deterministic external-scene
slice under this Phase 3 authority:

1. `ntn-sim-core/fixtures/scene-consumer-starter/bundle-sample-modqn-site-window.json`
   now acts as the additive `bundle-sample` starter/export fixture for the
   second sibling consumer repo.
2. `scenario-globe-viewer/src/runtime/bootstrap-scene-starter-source.ts`
   now imports that fixture through a narrow repo-owned bridge that keeps the
   consumer scoped to:
   - `bootstrap-site-prerecorded`
   - `site`
   - `prerecorded`
   rather than widening into `live` or browser-selected external bundle paths.
3. `scenario-globe-viewer/src/runtime/bootstrap-scene-starter-controller.ts`
   plus `src/features/scene-starter/` now project the imported starter feed
   into a local controller plus HUD-facing panel surface without rewriting the
   viewer repo's broader `scenario` or `replay-clock` seams.
4. `scenario-globe-viewer/src/features/operator/bootstrap-operator-hud.ts`
   and `src/main.ts` now wire that starter state into the repo-owned bootstrap
   operator HUD and capture seam while leaving globe shell, scenario framing,
   and prerecorded-time ownership in the viewer repo.
5. The second slice preserves the intended field split:
   - `entry.deterministicPathId`
   - `source.mode`, `source.profileId`, `source.truthSourceLabel`
   - `truth.sceneServingSatId`, `truth.publishedServingSatId`,
     `truth.snapshotRelationship`, `truth.bundleProducerHandoverKind`
   - `presentation.focusMode`, `presentation.narrativePhase`,
     `presentation.displaySatIds`, `presentation.beamSatIds`
   while keeping `summary.*Line` secondary.

Current-thread evidence should still be stated conservatively:

1. per the execution-thread report, `ntn-sim-core` reran `lint`, `build`,
   `validate:contracts`, `validate:orbit-parity`, `validate:visual-browser`,
   and `validate:modqn:bundle-ui`, with one first-pass
   `validate:visual-browser` timeout reported on an unrelated existing
   `case9-daps-showcase` path and a clean second pass;
2. per the same report, `scenario-globe-viewer` reran `build`, `npm test`, and
   `npm run test:phase6.7` clean;
3. this slice is therefore best treated as **code-landed and currently
   targeted-green per execution-thread report**, while still not implying any
   fresh full-stage or broader scenario-seam adoption claim.

## Reconciliation Decision (2026-04-20 — Viewer Deeper-Adoption Gate)

After re-reading `scenario-globe-viewer`'s active repo-local authority, the
next move should stay planning-first rather than auto-promoting a deeper viewer
integration slice.

1. `scenario-globe-viewer/docs/data-contracts/scenario.md` makes `scenario` the
   repo-owned seam for:
   - scenario identity
   - source-family selection
   - lifecycle / switch intent
   without surrendering those seams to an imported external consumer contract.
2. `scenario-globe-viewer/docs/data-contracts/replay-clock.md` keeps
   `replay-clock` as the single repo-owned time seam and explicitly prohibits a
   second clock API or a competing external time model.
3. The landed `bundle-sample` slice already proves the intended narrower claim:
   `scenario-globe-viewer` can consume `SceneConsumerStarterExport` inside its
   repo-owned site/prerecorded bootstrap frame, HUD, and capture seam without
   reopening the broader scenario lifecycle or replay-clock ownership.
4. Promoting a deeper viewer slice now would immediately widen scope into:
   - scenario session / switch planning
   - replay-clock source coordination
   - overlay/runtime behavior driven by starter cues
   which is a materially larger authority question than the current Phase 3
   proof target.

The current planning recommendation is therefore:

1. treat the existing HUD/bootstrap-only `scenario-globe-viewer` slice as the
   correct stopping point for the second deterministic proof path;
2. keep deeper `scenario-globe-viewer` adoption **deferred, not yet promoted**;
3. only reopen that path when a later planning thread can point to one explicit
   next contract question, such as:
   - starter export driving repo-owned scenario selection/switching;
   - starter export driving repo-owned prerecorded clip/replay-clock behavior;
   - starter cues driving viewer-owned runtime/overlay behavior beyond HUD or
     capture proof.

## Close-Out Note (2026-04-20 — Deterministic Tranche Boundary)

The original Phase 3 deterministic external-scene tranche should now be treated
as complete at its intended scope boundary:

1. `scenario-globe-handover-demo` plus `native-replay` is code-landed and
   targeted-smoke-clean per execution-thread report;
2. `scenario-globe-viewer` plus `bundle-sample` is code-landed and
   targeted-green per execution-thread report;
3. `ntn-sim-core` continues to own starter/export truth, continuity semantics,
   projection grammar, and deterministic identity without promoting
   `SceneShell.tsx` or shell helpers into external contract;
4. both sibling repos now prove repo-owned consumer adoption on their chosen
   deterministic paths without reopening `src/core/**`, bundle source
   semantics, `live`, or package extraction.

This means the current follow-on no longer needs an automatic next execution
slice. Any future work should be treated as a new theme that must be explicitly
reopened through planning, not as unfinished residue from the original
deterministic integration tranche.

## 3. Phase 3 Planning Decisions

### 3.1 First target repo

1. The recommended first external integration target is
   `scenario-globe-handover-demo`.
2. Rationale:
   - its active README and canonical SDD define one narrow product question:
     same-page global orbit context plus readable local handover focus;
   - it is explicitly demo-first and still synthetic in orbit/handover/RF terms,
     so it can consume `ntn-sim-core` truth selectively without forcing a broad
     delivery-contract rewrite on day one;
   - it is not already committed to a larger repo-owned scenario lifecycle the
     way `scenario-globe-viewer` is.
3. `scenario-globe-viewer` should be treated as the second target:
   - it already owns broader `scenario` and `replay-clock` seams;
   - integrating it first would immediately widen Phase 3 into scenario
     lifecycle, playback ownership, and overlay/session coordination questions
     that the narrower demo path can defer.

### 3.2 First consumer entry

1. The recommended first integration entry is the landed
   `SceneConsumerStarterExport`, not `SceneShell.tsx`, not
   `useSceneControlSurface.ts`, and not `useBundleReplayShellState.ts`.
2. Any future external-consumer wrapper should stay thin and additive over that
   starter/export surface rather than reintroducing a thicker shell-shaped API.
3. The starter/export surface remains downstream of the landed:
   - facade
   - proof read model
   - harness view model
   - shared starter-consumer projection

### 3.3 Initial source-path order

1. The recommended first external handoff path is `native-replay` for
   `scenario-globe-handover-demo`.
2. Rationale:
   - it is deterministic;
   - it already proves alias-like `sceneConsumedSnapshot` /
     `publishedTruthSnapshot` semantics;
   - it keeps continuity truth on native-runtime published fields rather than
     requiring immediate producer-handover normalization;
   - it fits the demo repo's same-page handover narrative better than the
     bundle path, because the first consumer needs serving-transition and
     continuity truth more than bundle source ownership.
3. The recommended second deterministic path is `bundle-sample`, primarily to
   prove cross-source starter/export consumption and explicit
   scene-consumed-vs-published/raw snapshot distinction for
   `scenario-globe-viewer`.
4. `live` should stay deferred until an explicit contract question requires it.

### 3.4 First-target field mapping

For the first `scenario-globe-handover-demo` planning slice, the starter/export
surface should map as follows:

1. `entry.deterministicPathId`
   - demo-visible provenance/debug identity only; not the local-scene primary
     narrative.
2. `source.mode`, `source.profileId`, `source.replaySelection`
   - select which deterministic replay clip and scenario label the demo is
     consuming.
3. `truth.sceneServingSatId`, `truth.publishedServingSatId`,
   `truth.snapshotRelationship`
   - align the demo's serving/pending/context proxy casting against starter
     truth instead of synthetic-only role rotation.
4. `truth.nativeServingTransitionKind`
   - first continuity truth field for local handover explanation.
5. `presentation.focusMode`, `presentation.narrativePhase`,
   `presentation.displaySatIds`, and `presentation.beamSatIds`
   - first projection/readability cues for which satellites should be emphasized
     in the demo scene.
6. `summary.sourceLine`, `summary.truthLine`, and
   `summary.presentationLine`
   - optional demo HUD / explainer strings only; not primary truth.
7. `truth.bundleProducerHandoverKind`
   - not required in the first `native-replay` path; keep it out of the first
     demo contract instead of forcing early normalization.

### 3.5 Ownership split

`ntn-sim-core` should continue to own:

1. source-mode metadata and deterministic path identity
2. truth snapshot publication and snapshot relationship wording
3. continuity truth semantics
4. shared `BeamPresentationFrame` emission
5. starter/export summary wording that already sits on the contract ladder

External scenes should own:

1. camera choreography
2. scene graph / model placement
3. playback UI and shell controls
4. overlay placement and product-specific layout
5. any repo-specific wrapper around the starter/export entry

For the first `scenario-globe-handover-demo` path, this means:

1. `ntn-sim-core`
   - owns replay truth and continuity truth
   - owns starter/export naming and deterministic identity
   - owns projection grammar and starter summary wording
2. `scenario-globe-handover-demo`
   - owns same-page camera glide and local focus activation
   - owns the compressed local proxy stage and beam/link/cone composition
   - owns toolbar/home interactions and optional demo HUD behavior
   - may restyle or recompose the emitted truth/projection, but does not replace
     their semantics

### 3.6 Continuity consumption rule

1. External consumers may treat `servingTransition`, `serviceState`,
   `continuityState`, `recentHoEvents`, `daps`, and serving/target/secondary IDs
   as truth.
2. `ContinuityNarrativeState` and
   `BeamPresentationFrame.continuityNarrative` remain readability aids.
3. The first external path should stay snapshot-first; it should not introduce a
   new event feed unless a later slice proves the snapshot surfaces are
   insufficient.
4. Native runtime transition truth and bundle replay producer handover-kind
   strings should remain distinct namespaced reads until a later explicit
   normalization rule is promoted.

### 3.7 Projection consumption rule

1. External scenes may keep their own rendering and overlay grammar.
2. They should not fork `beam-presentation-frame.ts` projection logic or invent
   a competing truth grammar from raw simulator state.
3. The intended first integration posture is:
   - consume the emitted `BeamPresentationFrame`;
   - optionally restyle or recompose it in the external scene;
   - do not silently replace its builder grammar.

## 4. Non-Negotiable Boundaries

1. Do not reopen `src/core/**`, `src/runner/**`, or
   `src/adapters/modqn-bundle/**`.
2. Do not reopen bundle `sample` / `external-directory` /
   `reset-to-sample` semantics.
3. Do not promote `SceneShell.tsx`, `useSceneControlSurface.ts`, or
   `useBundleReplayShellState.ts` into external consumer API.
4. Do not make `live` the first integration proof path.
5. Do not silently flatten native runtime transition truth and bundle replay
   producer handover-kind labels into one generic field.
6. Do not turn this follow-on into package extraction or framework design.

## 5. Phase Order

### 5.1 Milestone A — integration inventory and ownership lock

1. record the chosen first target, `scenario-globe-handover-demo`, and why it
   precedes `scenario-globe-viewer`;
2. record the chosen first deterministic source path, `native-replay`;
3. map `SceneConsumerStarterExport` fields to the first consumer’s actual needs;
4. lock the ownership split for camera, timeline/playback, continuity wording,
   and overlay composition.

### 5.2 Milestone B — first external proof-path plan

1. define the thinnest wrapper or import boundary the target repo will use;
2. preserve starter/export naming and deterministic path identity;
3. keep reference-viewer shell surfaces out of the target contract.

The first executable slice is now fixed:

1. target repo: `scenario-globe-handover-demo`
2. source path: `native-replay`
3. imported contract entry: `SceneConsumerStarterExport`
4. first integration posture:
   - keep the demo repo's global orbit layer synthetic for now;
   - keep same-page camera choreography, local focus activation, proxy-stage
     layout, beam/link/cone styling, and toolbar/Home interactions demo-owned;
   - replace or override only the local handover-focus truth inputs with starter
     export source/truth/presentation consumption;
   - use `truth.nativeServingTransitionKind`, serving IDs, and starter
     presentation cues as the first non-synthetic local continuity feed;
   - keep optional explainer/HUD wording secondary to the consumed truth.
5. explicit non-goals of the first executable slice:
   - no `live` support;
   - no `bundle-sample` support in the first step;
   - no package extraction;
   - no requirement that the demo repo adopt `scenario-globe-viewer`'s broader
     `scenario` or `replay-clock` seams first.

### 5.3 Milestone C — implementation promotion boundary

Status note: Milestone A/B planning is now complete enough for a first execution
thread.

1. the next implementation thread should implement only the first executable
   slice described in §5.2;
2. it should remain deterministic-first and should not reopen `live`, package
   extraction, or cross-source handover-kind normalization;
3. any widening toward `scenario-globe-viewer` or `bundle-sample` should be
   treated as the next slice, not folded into the first handover-demo landing.

Status update: the first two deterministic execution slices are now present in
the current tree:

1. `scenario-globe-handover-demo` plus `native-replay`
2. `scenario-globe-viewer` plus `bundle-sample`

The next recommended move is therefore no longer "open the next deterministic
slice", but:

1. return to planning/reconciliation before any deeper viewer-owned scenario
   adoption;
2. decide whether the next promoted slice should:
   - stay HUD/bootstrap-only;
   - widen into repo-owned scenario/replay-clock adoption in
     `scenario-globe-viewer`;
   - or remain deferred while `live` and package extraction stay closed.

Current decision update: after re-reading `scenario-globe-viewer`'s own
`scenario` and `replay-clock` authority, the deeper viewer-owned adoption path
should remain deferred for now rather than being promoted as the default next
execution slice.

Close-out update: with both deterministic sibling-consumer slices now landed
and deeper viewer-owned adoption explicitly deferred, this follow-on should be
read as a completed deterministic tranche boundary rather than an invitation to
keep extending Phase 3 by default.

## 6. Promotion / Acceptance Boundary

This follow-on is now promoted because all of the following are true:

1. the first target repo and first source path are explicitly chosen;
2. `SceneConsumerStarterExport` is confirmed as the planned first handoff entry
   or an explicit thinner additive wrapper is named;
3. camera/timeline/playback ownership is written down;
4. continuity truth versus readability-aid consumption is explicit;
5. the plan keeps reference-viewer shell surfaces outside the external contract;
6. the plan stays deterministic-first and leaves `live` deferred.

## 7. Validation Boundary

Promoting this file does **not** claim any new validation evidence by itself.

If a later implementation thread starts from this follow-on, it should preserve
the existing targeted gate floor:

1. `lint`
2. `build`
3. `validate:contracts`
4. `validate:visual-browser`
5. `validate:orbit-parity`
6. `validate:modqn:bundle-ui` when the bundle path is in scope

Any future single-line global-green statement still requires a fresh full
`npm run validate:stage` in that thread.
