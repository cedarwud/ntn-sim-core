# Single-Repo Dual-App Showcase Authority-Chain Repair Follow-On

**Status:** Landed authority-chain repair record for the current-tree
dual-app closure baseline after the earlier per-phase dual-app SDD set fell out
of the repo.
**Drafted:** 2026-04-22
**Promoted:** 2026-04-22
**Landed:** 2026-04-22
**Proposed path:**
`sdd/single-repo-dual-app-showcase-authority-chain-repair-follow-on.md`
**Depends on:**
1. `sdd/README.md`
2. `sdd/ntn-sim-core-implementation-status.md`
3. `sdd/ntn-sim-core-validation-matrix.md`
4. `sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`
5. `todo/single-repo-dual-app-showcase/README.md`
6. `internal/ntn-sim-core/devlogs/2026-04-20-single-repo-dual-app-showcase-plan.md`
7. `internal/ntn-sim-core/devlogs/2026-04-21-single-repo-dual-app-showcase-phase2c-packaging-implementation.md`
8. `internal/ntn-sim-core/devlogs/2026-04-21-single-repo-dual-app-showcase-phase2d-presentation-implementation.md`
9. `internal/ntn-sim-core/devlogs/2026-04-22-single-repo-dual-app-showcase-mainline-additive-reintegration-implementation.md`

**Scope gate:** repair the active dual-app authority chain without changing the
current runtime, validation floor, entry surfaces, publisher ownership,
deterministic IDs, or viewer semantics, and without attempting to recreate
every missing historical dual-app phase document in the same slice.

## 1. Problem Statement

The current repo still ships a real dual-app showcase-consumer baseline, but
the active authority/index/handoff surfaces were left pointing at multiple
dual-app files that no longer exist in the tree:

1. `sdd/single-repo-dual-app-showcase-follow-on.md`
2. `sdd/single-repo-dual-app-showcase-phase2b-follow-on.md`
3. `sdd/single-repo-dual-app-showcase-phase2c-packaging-follow-on.md`
4. `sdd/single-repo-dual-app-showcase-phase2d-presentation-follow-on.md`
5. `sdd/single-repo-dual-app-showcase-entrypoint-handoff-follow-on.md`
6. `sdd/single-repo-dual-app-showcase-consumer-scene-parity-follow-on.md`
7. `sdd/single-repo-dual-app-showcase-consumer-first-screen-copy-alignment-follow-on.md`
8. `todo/single-repo-dual-app-showcase/execution-master-prompt.md`

That leaves the current dual-app line in a contradictory state:

1. the code and validators still prove a landed baseline;
2. the active docs still claim those historical phase records are present;
3. a future rendering/polish reopen would therefore start from a broken
   canonical read path.

## 2. Current Reality

At repair time, the surviving current-tree facts are:

1. `AppShell` still keeps `SceneShell` as the default `main` surface while
   routing `?app=showcase-consumer` to `ShowcaseConsumerHost`;
2. `showcase-consumer.html` plus `src/showcase-consumer-main.tsx` still exist
   as the packaged showcase-consumer entrypoint;
3. `ShowcaseConsumerHost` still remains the sole publisher and
   `ShowcaseConsumerApp` still remains consumer-only;
4. the frozen dual-app allowlist, deterministic IDs, starter family,
   `summary.*` secondary rule, and `Primary SINR = snapshot.ues[0].sinrDb`
   still hold in code and validation;
5. `validate:contracts` plus `validate:showcase-consumer-browser` still pass
   against the current tree;
6. the only surviving landed dual-app authority file in `sdd/` is currently
   `single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`.

## 3. Repair Decision

This repair lands the smallest correction that restores a usable canonical
chain:

1. treat the current code plus the passing validator floor as the source of
   truth for the surviving dual-app closure baseline;
2. treat this repair record plus the surviving landed reintegration record as
   the canonical dual-app read path in the current tree;
3. stop treating the missing per-phase dual-app SDD files as required active
   reads;
4. create a real current-tree prompt surface under
   `todo/single-repo-dual-app-showcase/`;
5. leave the runtime/entry/publisher semantics unchanged in this slice;
6. require any future dual-app reopen to depend on this repair record first.

## 4. Consolidated Closure Baseline

After repair, the current dual-app closure baseline is:

1. `SceneShell` remains the current default `main` surface;
2. `?app=showcase-consumer` remains the compatibility route;
3. `showcase-consumer.html` remains the canonical handoff/share surface;
4. `ShowcaseConsumerHost` remains the sole publisher;
5. `ShowcaseConsumerApp` remains consumer-only;
6. `showcasePath=native-replay|bundle-sample` remains frozen;
7. deterministic IDs remain frozen:
   - `native-replay:hobs-multibeam-baseline:continuity-window`
   - `modqn-bundle:sample-bundle-v1`
8. starter family remains frozen:
   - `scene-consumer-starter-v1`
   - `scene-consumer-starter-v2`
9. `summary.*` remains secondary;
10. `Primary SINR = snapshot.ues[0].sinrDb`;
11. targeted dual-app validation remains
    `validate:contracts` + `validate:showcase-consumer-browser`;
12. `live`, `external-directory`, route retirement, redirect work,
    bundle-panel migration, per-beam HOBS SINR, and full `Phase 3` polish stay
    closed until a new follow-on explicitly reopens them.

## 5. Repaired Canonical Read Path

After this slice, the current dual-app authority chain is:

1. `sdd/single-repo-dual-app-showcase-authority-chain-repair-follow-on.md`
2. `sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`
3. `sdd/ntn-sim-core-implementation-status.md`
4. `README.md`
5. `todo/single-repo-dual-app-showcase/README.md`
6. `todo/single-repo-dual-app-showcase/execution-master-prompt.md`

Historical Phase 2A / 2B / 2C / 2D, handoff, scene-parity, and copy-alignment
semantics are preserved only through the surviving current-tree summaries in:

1. this repair record;
2. the surviving reintegration record;
3. the listed devlogs.

They are not restored as separate active SDD files in this repair slice.

## 6. Explicit Non-Goals

This repair does not authorize:

1. runtime changes;
2. renderer/UI changes;
3. validation-regime redesign;
4. recreation of every missing historical dual-app SDD as if they were still
   live implementation authority;
5. reopening `Phase 3` implementation in the same slice without a separate
   promoted follow-on.

## 7. Acceptance Criteria

This repair is complete only if:

1. active `sdd/`, status, README, and dual-app todo surfaces stop requiring the
   missing dual-app files;
2. the repaired active surfaces point only to files that exist in the current
   tree;
3. the current dual-app runtime/validation semantics remain unchanged;
4. a future rendering reopen can now depend on a real current-tree authority
   chain.

## 8. Closure State

This repair slice is landed. It restores a usable current-tree authority chain
for the already-landed dual-app baseline but does not itself reopen further
implementation. Any next step beyond this landed repair must begin from a newly
promoted follow-on.
