# External Scene Integration — Planning Baseline

**Status:** Close-out handoff companion / deterministic tranche complete for
`sdd/external-scene-integration-follow-on.md`

**Drafted:** 2026-04-19

**Authority:** `sdd/external-scene-integration-follow-on.md`

This pack now serves as the active handoff companion for the promoted Phase 3
follow-on. It is still not implementation authority by itself.

---

## 1. Purpose

This pack should help the next planning/reconciliation thread answer:

1. which external scene should integrate first:
   - `scenario-globe-viewer`
   - or `scenario-globe-handover-demo`
2. which deterministic source path should go first:
   - `native-replay`
   - or `bundle-sample`
3. what the first target repo actually needs from `SceneConsumerStarterExport`;
4. which ownership stays inside `ntn-sim-core` versus moving to the sibling
   consumer repo.

Update (2026-04-19): the first integration-order decisions are now locked at
planning level:

1. first target repo: `scenario-globe-handover-demo`
2. second target repo: `scenario-globe-viewer`
3. first deterministic source path: `native-replay`
4. second deterministic source path: `bundle-sample`

Update (2026-04-19): the first `scenario-globe-handover-demo` /
`native-replay` implementation slice is now present in the current tree:

1. a deterministic starter fixture now exists under `ntn-sim-core/fixtures/`
2. the demo repo imports that fixture through a narrow local bridge
3. the local handover-focus demo now consumes starter source/truth/presentation
   for its local narrative inputs without surrendering camera or proxy-stage
   ownership
4. current-thread evidence should still be treated as blocker-aware:
   - `ntn-sim-core` targeted gates were reported green
   - `scenario-globe-handover-demo` `build`, `npm test`, and `test:phase1` were
     later reported green
   - the earlier WebGL viewer bootstrap blocker was reported as no longer
     reproducing in the current tree without additional cross-repo contract
     changes

Update (2026-04-20): the second `scenario-globe-viewer` / `bundle-sample`
implementation slice is now also present in the current tree:

1. `ntn-sim-core/fixtures/scene-consumer-starter/` now includes an additive
   bundle-sample starter fixture for the second consumer repo
2. `scenario-globe-viewer` now imports that fixture through a narrow local
   bootstrap bridge and feeds it into a repo-owned controller, HUD panel, and
   capture seam
3. this second slice stays scoped to the viewer repo's existing site +
   prerecorded bootstrap frame rather than widening into `live`,
   `external-directory`, or broader scenario-seam adoption
4. current-thread evidence should still be treated conservatively:
   - `ntn-sim-core` targeted gates were reported green, with one first-pass
     unrelated `validate:visual-browser` timeout followed by a clean rerun
   - `scenario-globe-viewer` `build`, `npm test`, and `test:phase6.7` were
     reported green

Close-out update (2026-04-20):

1. the deterministic external-scene tranche is now complete at its intended
   scope boundary:
   - `scenario-globe-handover-demo` + `native-replay`
   - `scenario-globe-viewer` + `bundle-sample`
2. deeper `scenario-globe-viewer` adoption is explicitly deferred rather than
   implicitly queued as the next execution default
3. any future reopen should start from one newly named planning question, not
   from the assumption that this tranche is still structurally incomplete

## 2. Preconditions

Before using this pack for promotion:

1. `sdd/scene-consumer-contract-extraction-follow-on.md` must remain the Phase 2
   authority for contract extraction.
2. validation wording must stay conservative unless a later thread actually
   reruns fresh gates.
3. the frozen boundaries from `/home/u24/papers/ntn-v5-clean.md` still apply:
   - no shell promotion
   - no `src/core/**` reopen
   - no bundle source-semantic rewrite
   - no `live`-first reopen

## 3. Required Reads

1. [external-scene-integration-follow-on.md](/home/u24/papers/ntn-sim-core/sdd/external-scene-integration-follow-on.md:1)
2. [scene-consumer-contract-extraction-follow-on.md](/home/u24/papers/ntn-sim-core/sdd/scene-consumer-contract-extraction-follow-on.md:1)
3. [ntn-sim-core-implementation-status.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-implementation-status.md:83)
4. [ntn-v5-clean.md](/home/u24/papers/ntn-v5-clean.md:183)
5. [scene-consumer-starter.ts](/home/u24/papers/ntn-sim-core/src/viz/scene/scene-consumer-starter.ts:8)
6. [scene-consumer-starter-consumer.ts](/home/u24/papers/ntn-sim-core/src/viz/scene/scene-consumer-starter-consumer.ts:5)
7. [SceneConsumerStarterPanel.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneConsumerStarterPanel.tsx:68)
8. [SceneConsumerStarterSurface.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneConsumerStarterSurface.tsx:9)

## 4. Locked Outputs For First Execution Slice

1. the first-target decision is now:
   - `scenario-globe-handover-demo` first
   - `scenario-globe-viewer` second
2. the first deterministic source-path decision is now:
   - `native-replay` first
   - `bundle-sample` second
3. a field-level mapping from `SceneConsumerStarterExport` into the first target
   consumer, with emphasis on:
   - deterministic identity
   - native continuity truth
   - starter projection/readability cues
4. an ownership table for:
   - camera
   - timeline/playback
   - continuity wording
   - overlay composition
5. a first implementation slice that stays inside deterministic scope and does
   not reopen `live`

The first execution thread should implement only this slice:

1. consume `SceneConsumerStarterExport` in `scenario-globe-handover-demo`
2. scope the first import path to `native-replay`
3. keep the demo repo's global orbit layer synthetic
4. let the demo repo keep same-page camera, local proxy stage, beam/link/cone
   composition, and toolbar/Home behavior
5. use starter source/truth/presentation only for the local handover-focus truth
   feed
6. leave `scenario-globe-viewer` and `bundle-sample` to the next slice

The current close-out decision is now explicit:

1. a deeper `scenario-globe-viewer` adoption slice is **not yet worth
   promoting** beyond the landed HUD/bootstrap-only starter consumption path
2. `scenario-globe-viewer`'s repo-owned `scenario` and `replay-clock`
   contracts should stay authoritative until a later planning thread names one
   narrower next question
3. `live`, package extraction, and broader scenario-seam rewrites remain out of
   scope unless separately re-promoted

## 5. Explicit Non-Goals

1. do not start external repo implementation from this pack alone
2. do not reopen `live`
3. do not add a new event feed
4. do not package-extract the scene consumer surface
5. do not normalize native runtime and bundle replay handover-kind labels yet
