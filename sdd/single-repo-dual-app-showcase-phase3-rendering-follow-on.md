# Single-Repo Dual-App Showcase Phase 3 Rendering Follow-On

**Status:** Promoted planning-only dual-app reopen for the scene-first
rendering/presentation finish line after authority-chain repair.
**Drafted:** 2026-04-22
**Promoted:** 2026-04-22
**Proposed path:**
`sdd/single-repo-dual-app-showcase-phase3-rendering-follow-on.md`
**Depends on:**
1. `sdd/single-repo-dual-app-showcase-authority-chain-repair-follow-on.md`
2. `sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`
3. `sdd/README.md`
4. `sdd/ntn-sim-core-implementation-status.md`
5. `sdd/ntn-sim-core-validation-matrix.md`
6. `todo/single-repo-dual-app-showcase/README.md`
7. `todo/single-repo-dual-app-showcase/execution-master-prompt.md`
8. `project/leo-beam-sim/README.md`
9. `project/leo-beam-sim/src/scene/MainScene.tsx`
10. `project/leo-beam-sim/src/viz/SatelliteBeams.tsx`
11. `project/leo-beam-sim/src/viz/HandoverLinks.tsx`
12. `project/leo-beam-sim/src/viz/SinrOverlay.tsx`

**Scope gate:** reopen only the dual-app scene-first rendering/presentation
finish line so the showcase-consumer viewer can move toward the intended
demo-grade donor target, while keeping current truth ownership, source-path
semantics, publisher boundaries, deterministic IDs, and validation floor
frozen.

## 1. Purpose

The current dual-app viewer is already a landed baseline, but it is not yet the
intended final scene-first finish line. The original dual-app plan explicitly
left:

1. Phase 2 as the first working MVP;
2. Phase 3 as the polished demo/showcase finish line.

This follow-on reopens only that missing Phase 3 rendering/presentation layer.

## 2. Current Baseline

The current tree already has:

1. a real showcase-consumer shell;
2. a real scene canvas with `SatelliteSkyLayer`, `HandoverLinkOverlay`,
   `EarthMovingBeamLayer`, and `BeamInfoOverlay`;
3. a dedicated packaged entrypoint plus the compatibility query route;
4. local viewer controls, telemetry strip, and narrative/readability panels;
5. passing `validate:contracts` plus `validate:showcase-consumer-browser`.

The current gap is not "does the second viewer exist?" The gap is "does the
second viewer read like the intended scene-first finish line?"

## 3. Problem Statement

The product goal is to bring `ntn-sim-core` dual-viewer rendering closer to the
scene-first finish line represented by `project/leo-beam-sim` without importing
that donor repo's runtime ownership model.

The smallest safe problem to solve is therefore:

`Reopen only the dual-app Phase 3 rendering/presentation finish line so the current showcase-consumer viewer can reach a donor-grade scene-first presentation while preserving all frozen dual-app truth and ownership semantics.`

## 4. Donor Strategy

`project/leo-beam-sim` is a rendering/presentation donor only.

Borrowable donor ideas include:

1. scene-first first-screen hierarchy;
2. stronger beam cone / beam label visual grammar;
3. stronger serving/prepared/post-HO link readability;
4. more deliberate camera composition and first-screen framing;
5. better SINR/readability layering over the scene;
6. tighter responsive polish for demo capture.

The donor must not supply:

1. runtime ownership;
2. simulator truth derivation;
3. local RF/geometry recomputation of authoritative values;
4. a replacement for `ShowcaseConsumerHost` publication ownership.

## 5. Frozen Semantics That Must Not Change

This reopen keeps the current dual-app semantics frozen:

1. `SceneShell` remains the default `main` surface;
2. `showcase-consumer.html` remains canonical;
3. `?app=showcase-consumer` remains the compatibility path;
4. `ShowcaseConsumerHost` remains the sole publisher;
5. `ShowcaseConsumerApp` remains consumer-only;
6. `showcasePath=native-replay|bundle-sample` remains frozen;
7. deterministic IDs remain frozen:
   - `native-replay:hobs-multibeam-baseline:continuity-window`
   - `modqn-bundle:sample-bundle-v1`
8. starter family remains frozen:
   - `scene-consumer-starter-v1`
   - `scene-consumer-starter-v2`
9. `Primary SINR = snapshot.ues[0].sinrDb`;
10. `summary.*` remains secondary;
11. targeted validation remains `validate:contracts` +
    `validate:showcase-consumer-browser` unless a later same-change justification
    explicitly proves a tighter split is needed.

## 6. Allowed Scope

This follow-on may change only rendering/presentation-facing surfaces such as:

1. showcase-only camera presets and first-screen composition;
2. scene-first shell hierarchy inside `ShowcaseConsumerApp`;
3. beam cone, beam label, link label, and readability styling when still driven
   by published truth;
4. showcase-only telemetry arrangement and narrative panel composition;
5. responsive layout, screenshot framing, and capture-readiness polish;
6. targeted browser-smoke assertions/evidence for the refined first screen.

## 7. Explicitly Forbidden

This follow-on does not authorize:

1. borrowing donor runtime logic or ownership;
2. replacing `ShowcaseConsumerHost` as the publisher;
3. widening source paths to `live` or `external-directory`;
4. route retirement or redirect work;
5. per-beam HOBS SINR export/recompute work in the viewer;
6. bundle metadata/provenance/explainability panel migration;
7. validation-regime redesign or new dual-app `VAL-*` IDs by default;
8. changing deterministic IDs, starter family, `summary.*`, or `Primary SINR`
   semantics;
9. using `SceneShell` as the Phase 3 showcase contract.

## 8. Planned Slice Breakdown

The intended execution ladder is:

1. **Slice A — Rendering grammar + donor map**
   - map `leo-beam-sim` scene-first composition ideas onto current
     `ShowcaseConsumerApp` and the existing published truth surfaces;
   - define the first-screen camera, shell, and readability targets without
     changing runtime semantics.
2. **Slice B — Beam/link/label parity**
   - tighten beam cone, label, and handover-link readability through the
     existing truth-driven renderers and presentation frame.
3. **Slice C — Shell / telemetry / narrative polish**
   - improve the surrounding viewer shell, telemetry grouping, and scene-first
     narrative hierarchy without widening ownership.
4. **Slice D — Responsive + validation finish**
   - finalize desktop/mobile evidence capture, responsive layout, and targeted
     browser assertions for the refined first screen.

## 9. Validation Boundary

The default Phase 3 validation model is:

1. keep `validate:contracts` unchanged as the freeze-floor guard;
2. keep `validate:showcase-consumer-browser` as the targeted browser-visible
   proof path;
3. widen that browser smoke only enough to verify the refined first-screen
   rendering/readability contract;
4. treat browser evidence as transient-sensitive even when the assertions pass.

## 10. Acceptance Criteria

This follow-on is complete only if all of the following become true without
breaking the frozen semantics above:

1. the showcase-consumer viewer reads as a deliberate scene-first finish line
   rather than only a validated second-viewer baseline;
2. first-screen beam/link/continuity readability materially improves over the
   current baseline;
3. donor-inspired rendering ideas are re-expressed through current
   `ntn-sim-core` contracts instead of imported as donor ownership;
4. the packaged viewer remains the canonical handoff/share surface;
5. `validate:contracts` plus `validate:showcase-consumer-browser` still pass.

## 11. Start Conditions

Implementation on this follow-on may begin only after:

1. the authority-chain repair record is landed;
2. the active docs/todo surfaces point only to existing current-tree records;
3. the slice boundary for the next concrete implementation step is named
   explicitly.
