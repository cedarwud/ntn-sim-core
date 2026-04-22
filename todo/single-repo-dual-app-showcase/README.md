# Single-Repo Dual-App Showcase

**Status:** Active handoff pack for the repaired dual-app authority chain and
the promoted Phase 3 rendering reopen.
**Restored:** 2026-04-21
**Updated:** 2026-04-22
**Authority:**
1. `sdd/single-repo-dual-app-showcase-authority-chain-repair-follow-on.md`
2. `sdd/single-repo-dual-app-showcase-phase3-rendering-follow-on.md`
3. `sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`

This pack now serves the current true dual-app state:

1. the dual-app runtime baseline remains landed in the current tree;
2. the authority chain has been repaired so active docs no longer require
   missing dual-app phase files;
3. the next active line is the promoted planning-only Phase 3 rendering reopen.

If this README and the SDDs disagree, the SDDs win.

## 1. Current Facts

1. `SceneShell` still remains the current default `main` surface.
2. `?app=showcase-consumer` still routes to `ShowcaseConsumerHost`.
3. `showcase-consumer.html` still remains the canonical handoff/share surface.
4. `ShowcaseConsumerHost` still remains the sole publisher and
   `ShowcaseConsumerApp` still remains consumer-only.
5. `showcasePath=native-replay|bundle-sample` still remains frozen.
6. deterministic IDs still remain frozen:
   - `native-replay:hobs-multibeam-baseline:continuity-window`
   - `modqn-bundle:sample-bundle-v1`
7. starter family still remains frozen:
   - `scene-consumer-starter-v1`
   - `scene-consumer-starter-v2`
8. `summary.*` still remains secondary.
9. `Primary SINR` still remains `snapshot.ues[0].sinrDb`.
10. targeted dual-app validation still remains
    `validate:contracts` + `validate:showcase-consumer-browser`.
11. the newly promoted next line is `Phase 3` rendering/presentation polish,
    not runtime/source-path widening.

## 2. Required Reads

1. `sdd/single-repo-dual-app-showcase-authority-chain-repair-follow-on.md`
2. `sdd/single-repo-dual-app-showcase-phase3-rendering-follow-on.md`
3. `sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`
4. `sdd/ntn-sim-core-implementation-status.md`
5. `scripts/validate-contracts.mjs`
6. `scripts/validate-showcase-consumer-browser.ts`
7. `todo/single-repo-dual-app-showcase/execution-master-prompt.md`
8. `internal/ntn-sim-core/devlogs/2026-04-20-single-repo-dual-app-showcase-plan.md`
9. `internal/ntn-sim-core/devlogs/2026-04-21-single-repo-dual-app-showcase-phase2c-packaging-implementation.md`
10. `internal/ntn-sim-core/devlogs/2026-04-21-single-repo-dual-app-showcase-phase2d-presentation-implementation.md`
11. `internal/ntn-sim-core/devlogs/2026-04-22-single-repo-dual-app-showcase-mainline-additive-reintegration-implementation.md`
12. `internal/ntn-sim-core/devlogs/2026-04-22-single-repo-dual-app-showcase-authority-repair-and-phase3-rendering-plan.md`
13. donor reads for the reopened rendering line:
   - `project/leo-beam-sim/src/scene/MainScene.tsx`
   - `project/leo-beam-sim/src/viz/SatelliteBeams.tsx`
   - `project/leo-beam-sim/src/viz/HandoverLinks.tsx`
   - `project/leo-beam-sim/src/viz/SinrOverlay.tsx`

## 3. Hard Gates

1. stop if the current tree no longer has the exact starter contract surface
2. stop if any change mutates the frozen allowlist, deterministic IDs, or
   starter family without a new same-change authority rewrite
3. stop if the implementation tries to make `SceneShell.tsx` the reopened
   showcase contract
4. stop if any surface other than `ShowcaseConsumerHost` publishes
   `sceneConsumerStarter`
5. stop if per-beam HOBS SINR is introduced or recomputed locally in the
   viewer
6. stop if the source path widens to `live` or `external-directory`
7. stop if route retirement or redirect work appears
8. stop if donor code from `project/leo-beam-sim` is treated as runtime
   ownership instead of rendering/presentation reference
9. stop if the work widens into bundle-panel migration, truth/runtime
   semantics rewrite, or validation-regime redesign

## 4. Current Next Step

The current next step is no longer "restore the dual-app baseline." That part
is already landed.

The current next step is:

1. keep the repaired authority chain intact;
2. use the promoted `Phase 3` rendering follow-on as the only active reopen;
3. choose one explicit rendering slice before writing code.

## 5. Prompt Surface

Use `todo/single-repo-dual-app-showcase/execution-master-prompt.md` as the
active current-tree handoff prompt for both planning and slice-by-slice
execution.
