# Single-Repo Dual-App Showcase Mainline Additive Reintegration Follow-On

**Status:** Landed mainline additive reintegration record for restoring the
already-landed dual-viewer surfaces onto the current MODQN `main` baseline.
**Drafted:** 2026-04-22
**Promoted:** 2026-04-22
**Landed:** 2026-04-22
**Proposed path:**
`sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`
**Depends on:**
1. `sdd/single-repo-dual-app-showcase-follow-on.md`
2. `sdd/single-repo-dual-app-showcase-phase2b-follow-on.md`
3. `sdd/single-repo-dual-app-showcase-phase2c-packaging-follow-on.md`
4. `sdd/single-repo-dual-app-showcase-phase2d-presentation-follow-on.md`
5. `sdd/single-repo-dual-app-showcase-entrypoint-handoff-follow-on.md`
6. `sdd/single-repo-dual-app-showcase-consumer-scene-parity-follow-on.md`
7. `sdd/single-repo-dual-app-showcase-consumer-first-screen-copy-alignment-follow-on.md`
8. `sdd/README.md`
9. `sdd/ntn-sim-core-implementation-status.md`
10. `sdd/ntn-sim-core-validation-matrix.md`
11. `todo/single-repo-dual-app-showcase/README.md`

**Scope gate:** define the minimum new downstream authority for bringing the
already-landed dual-app showcase viewer surfaces back onto the current MODQN
`main` baseline as an additive reintegration, without reopening `SceneShell.tsx`
as the showcase contract, without replacing the current `main` default app
surface, without widening truth/source semantics, and without turning this work
into a branch-history merge exercise.

**Authority note:** This file now remains as a landed dual-app record in the
current tree. The landed dual-app record set remains the frozen baseline, the
mainline additive reintegration slice is complete, and the current tree again
has no active unlanded dual-app follow-on authority. Any future dual-viewer
work must therefore start from a newly promoted follow-on instead of treating
this file as ongoing implementation authority.

## 1. Purpose

The landed dual-app record set is complete, but the current committed `main`
baseline no longer carries that additive showcase-consumer surface directly.
Any future plan to have both MODQN and the dual viewer available on `main`
therefore needs a fresh follow-on that re-expresses the dual-app surface over
the current `main` baseline rather than trying to treat the landed dual-app
closure commit chain as a clean fast-forward target.

## 2. Current Divergence Reality

At drafting time, the current reality is:

1. the dual-app line is fully landed through the consumer first-screen
   copy-alignment record and is back to a no-active-unlanded-follow-on closure
   state in the current tree;
2. the current committed `main` baseline continues from the MODQN /
   `SceneShell` line, not from the additive dual-app closure line;
3. direct `merge` / `cherry-pick` of the dual-app closure commit chain onto the
   current `main` baseline is therefore not the execution model for resumed
   work;
4. resumed dual-viewer work must be phrased as a new mainline reintegration
   slice, not as implicit continuation of the already-closed dual-app authority.

## 3. Problem Statement

The product goal is now to have both:

1. the current MODQN / `SceneShell` baseline that already lives on `main`; and
2. the landed dual-viewer showcase-consumer surface

available on the same eventual `main` line.

The smallest safe problem to solve is therefore:

`Reintroduce the landed dual-app showcase-consumer surfaces onto current main as an additive entry surface, without regressing or redefining the MODQN / SceneShell baseline.`

This draft does not assume that the correct implementation is a history merge.
It assumes the correct implementation is a fresh additive reintegration over the
current `main` contracts.

## 4. Reintegration Decision

The landed reintegration model is:

1. preserve the current `main` default application surface;
2. restore the landed dual-viewer entry surfaces as additive surfaces over that
   baseline;
3. keep `showcase-consumer.html` as the canonical handoff/share surface;
4. keep `?app=showcase-consumer` as the compatibility path;
5. keep `ShowcaseConsumerHost` as the sole publisher;
6. keep `ShowcaseConsumerApp` as consumer-only;
7. reintroduce only the narrow starter seam and validator surfaces required to
   make those additive surfaces truthful and testable on current `main`;
8. avoid treating `SceneShell.tsx` as the showcase contract or the dual-viewer
   publication owner.

## 5. Frozen Dual-App Semantics That Must Survive Reintegration

If this line is resumed on top of `main`, the reintegrated dual-viewer surface
must still preserve all of the landed dual-app baseline semantics:

1. `showcase-consumer.html` remains the canonical handoff/share surface;
2. `?app=showcase-consumer` remains the compatibility path;
3. `ShowcaseConsumerHost` remains the sole publisher;
4. `ShowcaseConsumerApp` remains consumer-only;
5. `showcasePath=native-replay|bundle-sample` remains frozen;
6. deterministic IDs remain frozen:
   - `native-replay:hobs-multibeam-baseline:continuity-window`
   - `modqn-bundle:sample-bundle-v1`
7. starter family remains frozen:
   - `scene-consumer-starter-v1`
   - `scene-consumer-starter-v2`
8. `Primary SINR = snapshot.ues[0].sinrDb`
9. `summary.*` remains secondary
10. targeted smoke remains `validate:contracts` +
    `validate:showcase-consumer-browser`
11. no dedicated dual-app `VAL-*` gate is introduced.

## 6. Mainline Semantics That Must Also Survive Reintegration

This reintegration draft is not allowed to regress or redefine the current
MODQN / `main` baseline while bringing the dual-viewer surface back.

That means:

1. `SceneShell` remains the current `main` default app surface unless a future
   separate authority explicitly changes that;
2. the reintegration must not reinterpret current MODQN baseline ownership,
   runtime truth, bundle semantics, or diagnostics/disclosure rules;
3. the reintegration must not piggyback on currently unrelated MODQN /
   experiments worktree changes as if they were part of the dual-app reopen;
4. the reintegration must not silently replace current `main` entry behavior
   with the packaged showcase entry surface.

## 7. Allowed Reintegration Scope

The intended landing zone is limited to the additive
surfaces needed to re-express the already-landed dual-viewer baseline on top of
current `main`, such as:

1. `showcase-consumer.html`
2. `src/showcase-consumer-main.tsx`
3. `src/app/AppShell.tsx` only for the narrow compatibility query switch
4. `src/app/showcase/ShowcaseConsumerHost.tsx`
5. `src/app/showcase/ShowcaseConsumerApp.tsx`
6. `src/app/showcase/showcase-consumer-window.ts`
7. `src/viz/scene/scene-consumer-starter.ts`
8. `src/viz/scene/scene-consumer-starter-publication.ts`
9. `scripts/validate-contracts.mjs`
10. `scripts/validate-showcase-consumer-browser.ts`
11. necessary devlogs under `internal/ntn-sim-core/devlogs/*`
12. the minimum same-change authority/doc sync surfaces that were required to
    promote and later land this reintegration slice

The purpose of this allowed scope is additive restoration only. It is not a
license to replay every historical dual-app diff verbatim onto `main`.

## 8. Explicitly Forbidden

This draft does not authorize:

1. direct history merge as the success criterion
2. reopening `SceneShell.tsx` as the showcase contract
3. reopening `useModqnBundleReplay.ts` as the showcase publisher
4. widening source paths to `live` or `external-directory`
5. route retirement or redirect work
6. bundle metadata/provenance/explainability panel migration
7. per-beam HOBS SINR
8. full `Phase 3` polish
9. validation-regime redesign
10. any truth/profile/default/runtime-semantics rewrite
11. any deterministic path / allowlist / starter-family rewrite
12. any attempt to make the dual-viewer reintegration depend on unrelated
    MODQN / experiments concurrent worktree deltas

## 9. Validation Boundary

This reintegration line preserves the existing narrow dual-app validation
model:

1. `validate:contracts` remains the floor for additive route / packaged entry /
   host-owned publisher / consumer-only app / allowlist / deterministic ID /
   starter-family truth freeze;
2. `validate:showcase-consumer-browser` remains the targeted browser-visible
   smoke for the additive dual-viewer surface on `main`;
3. no dedicated dual-app `VAL-*` gate is added;
4. browser-visible evidence remains transient-sensitive.

## 10. Acceptance Criteria

This landed slice fulfilled the reintegration goal by achieving all of the
following at once:

1. current `main` keeps its MODQN / `SceneShell` default baseline intact;
2. `showcase-consumer.html` exists again on `main` as the canonical
   handoff/share surface;
3. `?app=showcase-consumer` exists again on `main` as the compatibility path;
4. `ShowcaseConsumerHost` remains the sole publisher and
   `ShowcaseConsumerApp` remains consumer-only;
5. the frozen allowlist, deterministic IDs, starter family,
   `summary.*` secondary rule, and `Primary SINR` rule all survive unchanged;
6. `validate:contracts` plus `validate:showcase-consumer-browser` remain the
   only targeted dual-app validation model;
7. the reintegration does not reopen `SceneShell.tsx`, route retirement,
   source-path widening, or full `Phase 3` polish;
8. the final result is expressed as current-`main` additive authority, not as a
   hidden reliance on the detached historical dual-app branch.

## 11. Closure State

This reintegration slice is now landed and is no longer active implementation
authority by itself. It records that current `main` now carries the additive
dual-viewer surfaces while preserving the frozen dual-app semantics and the
current MODQN / `SceneShell` default baseline. Any future dual-viewer reopen
beyond this landed state requires a newly promoted follow-on SDD.

## 12. Stop Conditions

Stop and return to planning/reconciliation if any of the following becomes
necessary:

1. reworking `SceneShell` into the showcase contract
2. changing current `main` default app ownership rather than adding a parallel
   dual-viewer surface
3. changing truth/profile/default/runtime semantics
4. changing deterministic IDs, starter family, allowlist, or `Primary SINR`
   semantics
5. widening to `live` or `external-directory`
6. introducing route retirement / redirect work
7. widening into bundle-panel migration or full `Phase 3` polish
8. adding a new dual-app validation regime
9. depending on unrelated MODQN / experiments concurrent changes to make the
   reintegration compile or pass
10. discovering that the current `main` baseline can no longer host the landed
    dual-viewer semantics additively without a broader contract rewrite
