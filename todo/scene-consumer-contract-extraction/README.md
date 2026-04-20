# Scene Consumer Contract Extraction — Milestone A Handoff Pack

**Status:** Reconciled Milestone A baseline / active next-slice handoff for
`sdd/scene-consumer-contract-extraction-follow-on.md`

**Drafted:** 2026-04-19

**Authority:** `sdd/scene-consumer-contract-extraction-follow-on.md`

This pack now serves two purposes:

1. preserve the Milestone A contract inventory that drove promotion;
2. act as the active handoff companion for the next Phase 2 slice after the
   first facade landing.

It is not implementation authority by itself. If this pack and the SDD disagree,
the SDD wins.

---

## 1. Purpose

Milestone A was the planning-only entry slice for Phase 2. Its job was to make
the consumer contract explicit before any code extraction started.

Milestone A should answer:

1. what the minimal external-consumer truth contract is;
2. what the shared projection contract is;
3. what continuity semantics are truth versus readability aids;
4. what source-mode metadata belongs in the consumer contract;
5. which shell surfaces remain reference-viewer-only.

That planning work has now been consumed by the first landed facade slice.
This pack therefore remains useful as:

1. the written closure baseline for what Milestone A settled;
2. the handoff surface for the next execution slice.

It should no longer be read as a "do not write code yet" instruction for the
already-landed first facade slice.

Update (2026-04-19): the first deterministic Milestone C proof slice is now
also present in the current tree:

1. `scene-consumer-proof.ts` projects a minimal read-only proof model from the
   facade source/truth/presentation contract.
2. `SceneConsumerProofSurface.tsx` dogfoods that proof model in validation mode
   without promoting `SceneShell.tsx` into external API.
3. bundle replay sample mode is the first proof target, and the current tree
   now proves the same read-only proof model against `native-replay` as the
   second source path without reopening facade extraction.

Update (2026-04-19): the next minimal stub/external-consumer harness slice is
now also present in the current tree:

1. `scene-consumer-harness.ts` builds a narrow stub-consumer view model from
   the landed proof read model.
2. `SceneConsumerHarnessSurface.tsx` dogfoods that stub in validation mode
   without promoting `SceneShell.tsx` or shell helpers into external API.
3. bundle sample and `native-replay` remain the only deterministic proof paths
   exercised by this slice; `live` stays out of scope.

Update (2026-04-19): the next narrow starter/export slice is now also present
in the current tree:

1. `scene-consumer-starter.ts` names one explicit starter/export entry over the
   landed facade/proof/harness chain instead of introducing a new framework.
2. `SceneConsumerStarterSurface.tsx` dogfoods that entry in validation mode
   only, still without promoting `SceneShell.tsx` or shell helpers into
   external API.
3. bundle sample and `native-replay` now each publish a stable deterministic
   path identity through that starter/export surface; `live` remains out of
   scope.

Update (2026-04-19): the next narrow starter-consumer adoption slice is now
present in the current tree:

1. `SceneConsumerStarterPanel.tsx` consumes `SceneConsumerStarterExport`
   directly as a repo-internal visible panel rather than as another hidden
   validation-only surface.
2. `SceneShell.tsx` dogfoods that panel internally without turning
   `SceneShell.tsx` or shell helpers into contract surfaces.
3. bundle sample and `native-replay` remain the only deterministic starter
   paths exercised by this visible consumer; `live` stays out of scope.
4. current-thread validation status now includes:
   - `validate:modqn:bundle-ui`, which proves the visible consumer on the
     bundle-sample path;
   - repeated `validate:visual-browser` pass after validator-side atomic
     native-replay scene-consumer snapshot reads removed the serving-attr race.

Update (2026-04-19): the next narrow export-stabilization slice is now also
present in the current tree:

1. `scene-consumer-starter-consumer.ts` now builds one shared repo-internal
   starter-consumer projection over `SceneConsumerStarterExport` rather than
   letting starter consumers each re-shape their own attrs and summary lines.
2. `SceneConsumerStarterSurface.tsx` now consumes the same
   `SceneConsumerStarterExport` instance that `SceneShell.tsx` passes to the
   visible starter panel, instead of rebuilding starter/export state from the
   facade independently.
3. `SceneConsumerStarterPanel.tsx` and `SceneConsumerStarterSurface.tsx` now
   stay aligned through that same shared starter-consumer projection while
   bundle sample and `native-replay` remain the only deterministic starter
   paths in scope.
4. current-thread validation status now also includes clean reruns of:
   - `lint`
   - `build`
   - `validate:contracts`
   - `validate:visual-browser`
   - `validate:modqn:bundle-ui`

## 2. Preconditions

Before treating this pack as ready for promotion:

1. `sdd/scene-coordination-decoupling-follow-on.md` must already be accepted as
   a closure-baseline correction rather than an open implementation queue.
2. `sdd/scene-consumer-contract-extraction-follow-on.md` must remain the single
   Phase 2 authority surface; do not create a parallel spec tree.
3. `validate:stage` wording must stay conservative unless a later thread reruns
   a fresh full `npm run validate:stage`.
4. The frozen boundaries from `/home/u24/papers/ntn-v5-clean.md` and the
   Phase 0 glossary still apply:
   - no frontend SINR / HO recompute
   - no `SceneShell.tsx` external API promotion
   - no bundle source-semantic rewrite
   - no validation key / payload-shape drift

## 3. Required Reads

Read these before filling or executing Milestone A:

1. [ntn-v5-clean.md](/home/u24/papers/ntn-v5-clean.md:162)
2. [scene-consumer-contract-extraction-follow-on.md](/home/u24/papers/ntn-sim-core/sdd/scene-consumer-contract-extraction-follow-on.md:1)
3. [scene-coordination-decoupling-follow-on.md](/home/u24/papers/ntn-sim-core/sdd/scene-coordination-decoupling-follow-on.md:23)
4. [ntn-sim-core-implementation-status.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-implementation-status.md:83)
5. [beam-presentation-types.ts](/home/u24/papers/ntn-sim-core/src/viz/presentation/beam-presentation-types.ts:24)
6. [beam-presentation-frame.ts](/home/u24/papers/ntn-sim-core/src/viz/presentation/beam-presentation-frame.ts:122)
7. [SceneShell.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneShell.tsx:38)
8. [useSceneControlSurface.ts](/home/u24/papers/ntn-sim-core/src/viz/scene/shell/useSceneControlSurface.ts:78)
9. [useBundleReplayShellState.ts](/home/u24/papers/ntn-sim-core/src/viz/scene/bundle/useBundleReplayShellState.ts:54)
10. [TruthSourceLayer.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/TruthSourceLayer.tsx:48)
11. [PresentationLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/PresentationLayers.tsx:69)
12. [modes/types.ts](/home/u24/papers/ntn-sim-core/src/viz/scene/modes/types.ts:11)
13. [common/types.ts](/home/u24/papers/ntn-sim-core/src/core/common/types.ts:201)
14. [03-handover-published-semantics-glossary.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/03-handover-published-semantics-glossary.md:11)

## 4. Milestone A Outputs

Milestone A is complete only when the following written outputs exist inside the
promotion-ready handoff discussion or follow-on update. The current-tree
inventory below is the starting answer set, not a blank worksheet.

### 4.1 Truth-source contract inventory

Current-tree facts:

- `SimulationSnapshot` is still the only simulator truth payload.
- `SceneModeControllerBridge` already carries:
  - `snapshot`
  - `validationSnapshot`
  - `stats`
  - `exportKpi`
  - `profileId`
  - `isBhProfile`
- `TruthSourceLayer` publishes validator-facing `runtime`, `orbitParity`, and
  `snapshotBeamTruth` from `bridge.validationSnapshot`, but mounts
  `PresentationLayers` and updates shell-facing scene state from
  `bridge.snapshot`.
- In `native-live` and `native-replay`, `snapshot` and `validationSnapshot` are
  currently identical.
- In `modqn-bundle`, they are distinct surfaces:
  - `snapshot` comes from `useModqnBundleReplay` and may still reflect
    transient presentation pacing
  - `validationSnapshot` comes from `viewModel.projectFrame(currentFrameIndex)`
    and stays tied to raw projected bundle truth

Milestone A contract decision:

- The external consumer facade should keep these as two explicit concepts when
  needed:
  - scene-consumed snapshot
  - published/raw truth snapshot
- Recommended first-landing answer: expose both, with
  `published/raw truth snapshot` aliased to `scene-consumed snapshot` in modes
  where they are already identical.
- The source-mode envelope should be additive over those snapshots rather than a
  replacement schema.
- `SimHudProps` is a reference-viewer HUD projection, not the external contract.

### 4.2 Shared projection contract inventory

Current-tree facts:

- `BeamPresentationFrame` shape lives in `beam-presentation-types.ts`.
- Projection/build logic lives in `beam-presentation-frame.ts`.
- Stateful continuity carry and previous-display stabilization are applied by
  `useBeamPresentationFrame`.
- Current direct consumers include:
  - `SatelliteSkyLayer`
  - `HandoverLinkOverlay`
  - `EarthMovingBeamLayer`
  - `BeamInfoOverlay`
  - `EarthFixedCellLayer`
  - `ValidationProbe` via `beamPresentationFrame` publication
  - bundle HUD/panel shell composition through `presentationFrame.continuityNarrative`

Milestone A contract decision:

- Treat `BeamPresentationFrame` as one shared contract spanning type + builder,
  not a types-only DTO.
- External consumers may read the emitted frame, but must not fork the builder
  grammar ad hoc.

### 4.3 Continuity consumer contract

Truth surfaces that external consumers may rely on:

- `servingTransition`
- `serviceState`
- `continuityState`
- `recentHoEvents`
- `daps`
- serving / target / secondary IDs on `UeState`

Reading-aid surfaces that remain presentation-side:

- `ContinuityNarrativeState`
- `BeamPresentationFrame.continuityNarrative`
- post-switch hold and cooldown pacing
- narrative carry for prepared / dual-active readability

Important current-tree caveat:

- Native runtime truth uses `same-satellite-beam-switch`.
- MODQN bundle replay truth currently surfaces producer-owned
  `intra-satellite-beam-switch`.
- Milestone A must not treat these as implicitly identical just because both are
  shown as handover-kind labels. Promotion requires either:
  - explicit field separation, or
  - explicit mapping rules.
- Recommended first-landing answer: keep native runtime transition truth and
  producer replay handover truth as distinct namespaced fields, and defer any
  normalization layer until a later slice proves it is needed.

### 4.4 Source-mode envelope

Current-tree normalized metadata candidates:

- common:
  - mode
  - readiness
  - active profile/profile-like identity
  - time / duration
  - satellite count / visible count
  - serving sat
  - handover count
- native replay only:
  - replay selection reason
  - replay window start/end
- MODQN bundle only:
  - truth source label
  - current slot index / slot count
  - checkpoint/status label
  - bundle replay truth mode

Shell-only actions that must stay outside the extracted external contract:

- `exportKpi`
- `loadExternalDirectory`
- `resetToSample`
- `stepBackward`
- `stepForward`

Milestone A contract decision:

- Normalize metadata, not shell actions.
- Keep `sample` / `external-directory` / `reset-to-sample` semantics owned by
  the reference shell.

### 4.5 Reference-shell ownership list

Reference-viewer-only ownership should remain with:

- `SceneShell.tsx`
  - query/bootstrap
  - Canvas composition
  - panel/HUD slot placement
  - mode arbitration
- `useSceneControlSurface.ts`
  - `ControlPanelSurfaceModel`
  - capability/section toggling
  - truth-note and bundle-source disclosure wording
- `useBundleReplayShellState.ts`
  - bundle HUD/panel projection from `viewModel`
  - compact-panel and metadata-panel props
  - shell-side bundle control props
- `ControlPanel.tsx`
  - interactive reference-viewer controls
- `SimHud.tsx` / `BundleTruthHud`
  - reference-viewer HUD presentation

Milestone A contract decision:

- Dogfooding the extracted facade through the reference viewer is allowed.
- Promoting these shell files into the facade is not.

## 5. Suggested First Implementation Slice After Promotion

Consumed by the current-tree first landing:

1. define the read-only consumer facade adjacent to the existing
   controller/truth-source seam;
2. preserve `SimulationSnapshot` and `BeamPresentationFrame` as the underlying
   truth/projection contracts;
3. let the reference viewer consume the facade without exporting shell-only
   helpers;
4. stop before any external repo integration work.

Next-slice interpretation:

1. keep building from the landed facade rather than reopening seam extraction;
2. build from the landed proof path, landed stub/external-consumer harness, and
   landed starter/export entry toward narrow export stabilization or
   starter-consumer adoption before reopening `live` as the next source path;
3. keep shell-only helpers and source-mode semantics out of scope.

Do **not** start with:

1. `src/core/**` rewrites
2. bundle source-semantic changes
3. new validator hardening work
4. large public-package or framework extraction

## 6. Validation Preservation Rules

Milestone A must keep these rules explicit:

1. the eight frozen validation sections remain frozen;
2. the current browser-visible section names and payload shapes remain unchanged;
3. the current source-mode semantics remain unchanged;
4. no Phase 2 planning claim implies a fresh full-stage rerun unless it was
   actually executed in the run making that claim.

## 7. Milestone A Exit Criteria

Milestone A is ready for promotion only when all of the following are true:

1. the minimal contract surfaces are named in written form;
2. the allowed landing zone is explicit;
3. the shell-only ownership list is explicit;
4. the truth-vs-reading-aid continuity split is explicit;
5. the first implementation slice is narrow enough to avoid reopening Phase 1;
6. the first implementation slice is now landed and recorded in authority sync.

## 8. Promotion Decisions

Milestone A now recommends these answers for promotion:

1. The external consumer facade should expose both:
   - scene-consumed snapshot
   - published/raw truth snapshot
   with aliasing in modes where they are already identical.
2. Native runtime transition truth and producer replay handover-kind truth
   should remain distinct namespaced fields in the first landing; do not
   normalize them into one generic `handoverKind` yet.
