# Task 0 Baseline Freeze

**Status:** captured preflight baseline  
**Date:** 2026-04-19  
**Scope:** freeze the starting point before any Phase 1 structural patch

This note is the execution record for `Task 0` from
[04-phase1-task-breakdown.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/04-phase1-task-breakdown.md:1).
It does not promote any follow-on. It only records the baseline that later
patches must preserve or consciously re-verify.

## 1. Inputs

1. [01-responsibility-map.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/01-responsibility-map.md:1)
2. [02-validation-freeze-list.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/02-validation-freeze-list.md:1)
3. [03-handover-published-semantics-glossary.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/03-handover-published-semantics-glossary.md:1)
4. [04-phase1-task-breakdown.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/04-phase1-task-breakdown.md:1)
5. [store.ts](/home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:160)
6. [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:107)
7. [EarthMovingBeamLayer.tsx](/home/u24/papers/ntn-sim-core/src/viz/beam/EarthMovingBeamLayer.tsx:429)
8. [EarthFixedCellLayer.tsx](/home/u24/papers/ntn-sim-core/src/viz/beam/EarthFixedCellLayer.tsx:186)
9. [BeamInfoOverlay.tsx](/home/u24/papers/ntn-sim-core/src/viz/overlays/BeamInfoOverlay.tsx:197)
10. [HandoverLinkOverlay.tsx](/home/u24/papers/ntn-sim-core/src/viz/overlays/HandoverLinkOverlay.tsx:394)

## 2. Worktree Baseline

Baseline was recorded from `git -C /home/u24/papers/ntn-sim-core status --short`
before any Phase 1 code movement.

Observed worktree state:

- `?? sdd/scene-coordination-decoupling-follow-on.md`
- `?? todo/`

Interpretation:

- the current pre-integration planning surface is still local working material
  and has not been promoted;
- no tracked code-path edits were present in `src/` when this baseline note was
  captured.

If a future Phase 1 patch starts from a different worktree state, update this
note or record a new preflight delta before landing code.

## 3. Validation-Store Freeze

Baseline hash of
[store.ts](/home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:160):

```text
37b151d2eba60448c155ad0a833d070da9d9522df9c49f79878c2fd287cb07a8
```

Frozen store-level contract surfaces confirmed at capture time:

- `VisualValidationState`
- `SectionKey`
- global key `__NTN_SIM_CORE_VISUAL__`
- event name `ntn-sim-core:visual-validation`

Phase 1 controller / shell / truth-source work must not change these surfaces.
If any structural patch requires changing them, that patch is no longer a normal
Phase 1 slice and must stop for separate review.

## 4. Eight-Section Publisher Baseline

The following publisher map is the frozen browser-visible baseline.

| Section key | Current publisher | Baseline note |
|---|---|---|
| `beamPresentationFrame` | [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:107) | Presentation-side publication stays visible during truth-source split |
| `runtime` | [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:160), [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:252), [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:425) | Live / replay / bundle branches publish the same key |
| `orbitParity` | [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:161), [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:253), [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:426) | Live / replay / bundle branches publish the same key |
| `snapshotBeamTruth` | [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:162), [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:254), [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:427) | Live / replay / bundle branches publish the same key |
| `earthMovingBeamLayer` | [EarthMovingBeamLayer.tsx](/home/u24/papers/ntn-sim-core/src/viz/beam/EarthMovingBeamLayer.tsx:429) | Overlay/layer self-publisher; do not move in Phase 1 |
| `earthFixedCellLayer` | [EarthFixedCellLayer.tsx](/home/u24/papers/ntn-sim-core/src/viz/beam/EarthFixedCellLayer.tsx:186) | Overlay/layer self-publisher; do not move in Phase 1 |
| `beamInfoOverlay` | [BeamInfoOverlay.tsx](/home/u24/papers/ntn-sim-core/src/viz/overlays/BeamInfoOverlay.tsx:197) | Overlay self-publisher; do not move in Phase 1 |
| `handoverLinkOverlay` | [HandoverLinkOverlay.tsx](/home/u24/papers/ntn-sim-core/src/viz/overlays/HandoverLinkOverlay.tsx:394) | Overlay self-publisher; do not move in Phase 1 |

Operational rule:

- only the `SceneDataLayers.tsx` publishers are candidates for internal
  relocation during a truth-source / presentation split;
- the four overlay/self-published sections stay pinned in their current files
  for this slice.

## 5. First-Five Ownership Files

These remain the first structural ownership files for Phase 1:

1. [SceneShell.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneShell.tsx:1)
2. [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:1)
3. [useSimulation.ts](/home/u24/papers/ntn-sim-core/src/app/hooks/useSimulation.ts:1)
4. [useReplay.ts](/home/u24/papers/ntn-sim-core/src/app/hooks/useReplay.ts:1)
5. [useModqnBundleReplay.ts](/home/u24/papers/ntn-sim-core/src/app/hooks/useModqnBundleReplay.ts:1)

Important caveat:

- [handover-step.ts](/home/u24/papers/ntn-sim-core/src/core/engine/handover-step.ts:1)
  is still same-priority for semantics clarification, even though it is not part
  of the first ownership batch for structural file movement.

## 6. Baseline Validation Gate Set

These are the baseline commands that should be run before the first structural
patch and again after each major Phase 1 slice.

Minimum structural baseline:

```bash
npm run lint
npm run validate:trace
npm run validate:profiles
npm run validate:runtime
npm run validate:stage
```

Also required whenever bundle-facing surfaces are touched:

```bash
npm run validate:modqn:bundle
npm run validate:modqn:bundle-ui
```

Manual baseline checks:

1. `ValidationProbe` still exposes the same 8 sections.
2. Default boot path remains unchanged.
3. Bundle source semantics still follow:
   - sample default active on startup
   - external-directory success replaces the active bundle
   - load failure keeps the previous valid bundle
   - reset-to-sample restores the baseline bundle

This note records the baseline gate set, but the commands themselves were not
run as part of this documentation-only slice.

## 7. Task 0 Completion Statement

For the current planning surface, `Task 0` is complete when read together with:

1. [01-responsibility-map.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/01-responsibility-map.md:1)
2. [02-validation-freeze-list.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/02-validation-freeze-list.md:1)
3. [03-handover-published-semantics-glossary.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/03-handover-published-semantics-glossary.md:1)
4. [04-phase1-task-breakdown.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/04-phase1-task-breakdown.md:1)

That package now fixes:

1. the shell / data-layer / hook baseline,
2. the validation-store freeze point,
3. the eight-section publisher baseline,
4. the first-five ownership files,
5. the reminder that handover published semantics must not slip behind shell
   thinning.
