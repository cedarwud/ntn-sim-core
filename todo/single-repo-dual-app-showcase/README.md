# Single-Repo Dual-App Showcase

**Status:** Promoted reintegration companion over the landed
Phase 2A / Phase 2B / Phase 2C / Phase 2D baseline, the landed entrypoint
handoff record, the landed consumer scene parity record, the landed consumer
first-screen copy-alignment record, and the newly promoted mainline additive
reintegration follow-on.
**Restored:** 2026-04-21
**Updated:** 2026-04-22
**Authority:** promoted active dual-app reintegration authority:
`sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`

This pack now remains as the active dual-app continuity companion for the
promoted mainline additive reintegration line. The landed dual-app record set
still defines the frozen baseline; if this file and the SDD disagree, the SDD
wins.

## 1. Current Reconciliation Facts

1. The reconciliation baseline was missing the dual-app SDD, this README, the
   earlier `scene-consumer-starter.ts` code surface, and the earlier
   `scene-consumer` / `external-scene` authority documents.
2. The accepted Phase 0 and Phase 1 boundary evidence still exists in:
   - `internal/ntn-sim-core/devlogs/2026-04-20-single-repo-dual-app-showcase-phase0-boundary-freeze.md`
   - `internal/ntn-sim-core/devlogs/2026-04-20-single-repo-dual-app-showcase-phase1-contract-sufficiency.md`
   - `internal/ntn-sim-core/devlogs/2026-04-20-single-repo-dual-app-showcase-phase1-additive-export.md`
3. This pack now assumes the narrow `scene-consumer-starter.ts` seam is
   restored and frozen by `scripts/validate-contracts.mjs`.
4. The landed current tree routes `?app=showcase-consumer` through
   `ShowcaseConsumerHost`; that host owns the fixed deterministic producer,
   while `ShowcaseConsumerApp` stays consumer-only over the starter seam.
5. The current tree now also lands the Phase 2B widening:
   - `showcasePath=native-replay|bundle-sample`
   - frozen `scene-consumer-starter-v1`
   - versioned `scene-consumer-starter-v2`
   - allowlisted `modqn-bundle:sample-bundle-v1`
6. The dual-app line still does not reopen the missing historical
   scene-consumer / external-scene docs as separate workstreams.
7. The last landed dual-app slice is now the presentation-only Phase 2D
   baseline:
   - dedicated `showcase-consumer` hierarchy/layout/readability tightening is
     landed
   - both the query-switched route and the dedicated packaged entrypoint are
     preserved
   - no truth-source widening was introduced
8. The earlier packaging slice is now also landed:
   - the query-switched route remains working
   - the dedicated packaged entrypoint now exists in the same repo
   - no truth semantics were widened
9. The most recently landed dual-app follow-on is now the narrow
   entrypoint-handoff record:
   - `showcase-consumer.html` is the canonical handoff/share surface
   - `?app=showcase-consumer` remains a compatibility path
   - route retirement, redirect work, and runtime semantics widening remain
     out of scope
10. The most recently landed dual-app follow-on is now the consumer
    scene-parity record:
   - landed `Slice A -> Slice B -> Slice C -> Slice D`
   - denser consumer-side telemetry, local viewer controls, and stronger
     narrative/readability over the same frozen starter seam
   - no publisher rewrite, route change, truth/source widening, or validation
     redesign
11. The most recently landed dual-app follow-on is now the native-replay
    first-screen copy-alignment record:
   - limited to the evidence-backed native-replay first-screen lead-copy
     role-wording misstatement plus directly adjacent synchronized
     role/disclosure wording inside `ShowcaseConsumerApp`
   - no truth/profile/default/runtime semantics rewrite, publisher/starter/
     route/entrypoint change, or validation redesign
   - it remains the last landed dual-app micro-slice before the current reopen
12. The current active unlanded dual-app follow-on is now the mainline
    additive reintegration record:
   - it does not treat direct history merge/cherry-pick as the execution model
   - it preserves the landed dual-app frozen baseline semantics
   - it preserves the current MODQN / `SceneShell` `main` default surface
   - it scopes resumed work to additive showcase-consumer reintegration only

## 2. Required Reads

1. `sdd/single-repo-dual-app-showcase-follow-on.md`
2. `sdd/single-repo-dual-app-showcase-phase2b-follow-on.md`
3. `sdd/single-repo-dual-app-showcase-phase2c-packaging-follow-on.md`
4. `sdd/single-repo-dual-app-showcase-phase2d-presentation-follow-on.md`
5. `sdd/single-repo-dual-app-showcase-entrypoint-handoff-follow-on.md`
6. `sdd/single-repo-dual-app-showcase-consumer-scene-parity-follow-on.md`
7. `sdd/single-repo-dual-app-showcase-consumer-first-screen-copy-alignment-follow-on.md`
8. `sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`
9. `sdd/ntn-sim-core-implementation-status.md`
10. `scripts/validate-contracts.mjs`
11. `scripts/validate-showcase-consumer-browser.ts`
12. `todo/single-repo-dual-app-showcase/execution-master-prompt.md`
13. `sdd/modqn-bundle-replay-ui-sdd.md`
14. `sdd/modqn-replay-truth-hardening-follow-on.md`
15. `docs/hobs-tr38811-sinr-implementation-note.md`
16. the three dual-app devlogs listed above
17. `internal/ntn-sim-core/devlogs/2026-04-21-single-repo-dual-app-showcase-phase2a-architecture-correction.md`
18. `internal/ntn-sim-core/devlogs/2026-04-21-single-repo-dual-app-showcase-post-phase2a-planning.md`
19. `internal/ntn-sim-core/devlogs/2026-04-21-single-repo-dual-app-showcase-phase2b-reconciliation.md`
20. `internal/ntn-sim-core/devlogs/2026-04-21-single-repo-dual-app-showcase-post-phase2b-packaging-planning.md`
21. `internal/ntn-sim-core/devlogs/2026-04-21-single-repo-dual-app-showcase-phase2c-packaging-implementation.md`
22. `internal/ntn-sim-core/devlogs/2026-04-21-single-repo-dual-app-showcase-post-phase2c-presentation-planning.md`
23. `internal/ntn-sim-core/devlogs/2026-04-22-single-repo-dual-app-showcase-first-screen-copy-alignment-implementation.md`

## 3. Landed Phase 2A Closure Baseline

1. deterministic path:
   `native-replay:hobs-multibeam-baseline:continuity-window`
2. route / ownership shape:
   - `AppShell` query-switches `?app=showcase-consumer`
   - `ShowcaseConsumerHost` is the only allowed publisher
   - `ShowcaseConsumerApp` stays consumer-only
3. allowed inputs only from:
   - `SceneConsumerStarterExport.entry`
   - `SceneConsumerStarterExport.source`
   - `SceneConsumerStarterExport.truth.sceneConsumedSnapshot`
   - `SceneConsumerStarterExport.presentation.beamPresentationFrame`
4. `summary.*` is secondary only
5. `Primary SINR` must read `snapshot.ues[0].sinrDb`

## 4. Landed Phase 2C Closure Baseline

1. keep the landed route gate:
   `?app=showcase-consumer`
2. keep the landed showcase-only allowlist selector:
   `showcasePath=native-replay|bundle-sample`
3. the landed packaged viewer now adds:
   - `showcase-consumer.html`
   - `src/showcase-consumer-main.tsx`
4. the dedicated entrypoint must keep the same allowlisted deterministic paths:
   - `native-replay:hobs-multibeam-baseline:continuity-window`
   - `modqn-bundle:sample-bundle-v1`
5. `scene-consumer-starter-v1` and `scene-consumer-starter-v2` stay frozen
6. `ShowcaseConsumerHost` remains the only allowed publisher
7. `ShowcaseConsumerApp` remains consumer-only
8. `showcasePath` defaults remain `native-replay` on both the query route and
   the dedicated entrypoint

## 5. Hard Gates

1. stop if the current tree still lacks the exact starter contract surface
2. stop if Phase 2B mutates `scene-consumer-starter-v1` instead of creating a
   versioned v2 seam
3. stop if the implementation uses `SceneShell.tsx`
4. stop if the implementation uses `SceneConsumerStarterPanel.tsx`
5. stop if the implementation uses `scene-consumer-starter-consumer.ts`
6. stop if per-beam HOBS SINR is introduced
7. stop if the showcase publisher reuses `useModqnBundleReplay.ts`
8. stop if the source path widens to `live` or `external-directory`
9. stop if the packaging slice reuses `useModqnBundleReplay.ts` as the
   showcase publisher
10. stop if the current query-switched route is removed in the same slice
11. stop if a new validation-matrix ID is added without an explicit same-change
   justification
12. stop if any surface other than `ShowcaseConsumerHost` publishes
    `sceneConsumerStarter`
13. stop if the work widens into bundle-panel migration or full `Phase 3`
    polish
14. stop if any resumed reintegration line treats direct history merge or
    cherry-pick as the success criterion instead of additive current-`main`
    re-expression
15. stop if any future reopen widens beyond the landed native-replay
    first-screen lead-copy role-wording alignment plus directly adjacent synchronized
    role/disclosure wording into truth/profile/default/runtime semantics,
    publisher ownership, starter publication-shape changes, route/entrypoint
    authority, deterministic ID / allowlist / starter-family changes,
    `case9-daps-showcase` default rewrite, `realistic-first-screen`
    repositioning, or validation redesign

## 6. Current Authority State

The current tree now has one active unlanded dual-app follow-on authority:
`sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`.

Use the landed record set plus the promoted reintegration record this way:

1. Treat the query-switched route plus the dedicated packaged entrypoint as the
   landed Phase 2A / 2B / 2C / 2D baseline, not as a planning sketch.
2. Treat `showcase-consumer.html` as the canonical handoff/share surface for
   the landed handoff decision and the landed parity record.
3. Treat `?app=showcase-consumer` as a compatibility path for the landed
   handoff decision and the landed parity record.
4. Treat `sdd/single-repo-dual-app-showcase-consumer-scene-parity-follow-on.md`
   as the landed record for denser telemetry, local viewer controls, stronger
   narrative/readability surfaces, and the minimally expanded targeted browser
   smoke.
5. Treat
   `sdd/single-repo-dual-app-showcase-consumer-first-screen-copy-alignment-follow-on.md`
   as the landed record for the evidence-backed native-replay first-screen
   lead-copy role-wording correction inside `ShowcaseConsumerApp`.
6. Treat
   `sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`
   as the active current-`main` additive reintegration authority rather than
   as a landed record or a direct branch-merge instruction.
7. Preserve the frozen baseline around `showcase-consumer.html` canonical /
   `?app=showcase-consumer` compatibility, `ShowcaseConsumerHost` sole
   publisher / `ShowcaseConsumerApp` consumer-only, frozen
   allowlist/deterministic IDs/starter family, `summary.*` secondary,
   `Primary SINR = snapshot.ues[0].sinrDb`, `validate:contracts` unchanged as
   the floor, and no dedicated dual-app `VAL-*` gate.
8. Preserve the closures around `SceneShell.tsx`,
   `SceneConsumerStarterPanel.tsx`, `scene-consumer-starter-consumer.ts`,
   `useModqnBundleReplay.ts`, `live`, `external-directory`,
   bundle-panel migration, and full `Phase 3` polish unless a future SDD
   explicitly reopens them.
9. Treat `todo/single-repo-dual-app-showcase/execution-master-prompt.md` as a
   historical landed handoff artifact for the completed scene-parity run, not
   as current active authority.
10. Treat direct history merge / cherry-pick of the detached dual-app closure
    chain onto current `main` as out of scope for this line; resumed work must
    be additive current-`main` reintegration unless a future SDD explicitly
    authorizes broader contract rewrite.
