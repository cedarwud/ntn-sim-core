# Pre-Integration Phase 0 Boundary Map Checklist

**Status:** Drafted working checklist  
**Date:** 2026-04-19  
**Scope:** pre-integration clarification before any `scenario-globe-viewer` /
`scenario-globe-handover-demo` coupling work starts

**Working inputs:**
1. [ntn-v5-clean.md](/home/u24/papers/ntn-v5-clean.md)
2. [scene-coordination-decoupling-follow-on.md](/home/u24/papers/ntn-sim-core/sdd/scene-coordination-decoupling-follow-on.md)
3. [earth-moving-beam-tracking-and-handover-candidate-follow-on.md](/home/u24/papers/ntn-sim-core/sdd/earth-moving-beam-tracking-and-handover-candidate-follow-on.md)

**Important:** this file is a working surface, not promoted implementation
authority. It does not activate either follow-on by itself. If authority files
disagree, the active `sdd/` chain still wins.

---

## 1. Purpose

This checklist exists to lock three things before any structural refactor starts:

1. the consumer-side boundary map around `SceneShell.tsx`,
   `SceneDataLayers.tsx`, and the three runtime-source hooks;
2. the frozen validation surface that browser-visible gates already read;
3. the minimum published semantics glossary for beam-switch / continuity /
   no-service so Phase 1 does not quietly encode the wrong external contract.

If this checklist is incomplete, do **not** start Phase 1 shell thinning or
cross-repo integration work.

Suggested Phase 0 output files:

1. [01-responsibility-map.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/01-responsibility-map.md:1)
2. [02-validation-freeze-list.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/02-validation-freeze-list.md:1)
3. [03-handover-published-semantics-glossary.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/03-handover-published-semantics-glossary.md:1)
4. [04-phase1-task-breakdown.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/04-phase1-task-breakdown.md:1)
5. [05-task0-baseline-freeze.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/05-task0-baseline-freeze.md:1)
6. [06-task1-controller-seam-design.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/06-task1-controller-seam-design.md:1)

## 2. Non-Negotiable Rules

These rules apply for the entire Phase 0 clarification slice:

1. Do not change `src/core/**`, `src/runner/**`, or `src/core/contracts/**`.
2. Do not touch `src/adapters/modqn-bundle/**`.
3. Do not change the `SimulationSnapshot` shape.
4. Do not change the `BeamPresentationFrame` shape.
5. Do not rewrite `transient-truth-hold.ts` or
   `continuity-narrative-state.ts` semantics.
6. Do not change any existing `usePublishValidationSection(...)` key or payload
   shape.
7. Do not add a 9th validation section as a temporary bridge.
8. Do not let frontend code recompute SINR or HO decisions.
9. Do not treat `SceneShell.tsx` as a future external consumer API.
10. Do not let bundle sample / external-directory / reset-to-sample semantics
    drift during this planning slice.

## 3. Required Reads Before Filling The Checklist

Read these in order:

1. [ntn-v5-clean.md](/home/u24/papers/ntn-v5-clean.md:1)
2. [scene-coordination-decoupling-follow-on.md](/home/u24/papers/ntn-sim-core/sdd/scene-coordination-decoupling-follow-on.md:1)
3. [earth-moving-beam-tracking-and-handover-candidate-follow-on.md](/home/u24/papers/ntn-sim-core/sdd/earth-moving-beam-tracking-and-handover-candidate-follow-on.md:1)
4. [SceneShell.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneShell.tsx:1)
5. [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:1)
6. [useSimulation.ts](/home/u24/papers/ntn-sim-core/src/app/hooks/useSimulation.ts:1)
7. [useReplay.ts](/home/u24/papers/ntn-sim-core/src/app/hooks/useReplay.ts:1)
8. [useModqnBundleReplay.ts](/home/u24/papers/ntn-sim-core/src/app/hooks/useModqnBundleReplay.ts:1)
9. [beam-presentation-frame.ts](/home/u24/papers/ntn-sim-core/src/viz/presentation/beam-presentation-frame.ts:1)
10. [continuity-narrative-state.ts](/home/u24/papers/ntn-sim-core/src/viz/presentation/continuity-narrative-state.ts:1)
11. [handover-step.ts](/home/u24/papers/ntn-sim-core/src/core/engine/handover-step.ts:1)
12. [tick.ts](/home/u24/papers/ntn-sim-core/src/core/engine/tick.ts:1)
13. [channel-step.ts](/home/u24/papers/ntn-sim-core/src/core/engine/channel-step.ts:1)
14. [channel-sinr-helpers.ts](/home/u24/papers/ntn-sim-core/src/core/engine/channel-sinr-helpers.ts:1)
15. [timeline-parser.ts](/home/u24/papers/ntn-sim-core/src/adapters/modqn-bundle/timeline-parser.ts:1)

## 4. Boundary Map Checklist

Mark each item complete only after the evidence is written down in the Phase 0
working note or task issue.

### 4.1 Scene Shell Responsibility Map

- [ ] Record which `SceneShell.tsx` responsibilities are pure shell/layout concerns.
- [ ] Record which `SceneShell.tsx` responsibilities are truth-source
      orchestration concerns.
- [ ] Record which `SceneShell.tsx` responsibilities are panel/HUD composition
      concerns.
- [ ] Record which `SceneShell.tsx` state elements are mode-specific versus
      shared across all modes.
- [ ] Record which current shell outputs must remain selector-stable during the
      refactor.

### 4.2 Data Layer Responsibility Map

- [ ] Record which `SceneDataLayers.tsx` logic is truth-source selection.
- [ ] Record which logic is validation publication.
- [ ] Record which logic is presentation-frame production.
- [ ] Record which logic is presentation dispatch / layer mounting.
- [ ] Record which values are re-exposed back to the shell and why.

### 4.3 Runtime-Source Controller Map

- [ ] Confirm the three source families are still:
      `native-live`, `native-replay`, `modqn-bundle`.
- [ ] Record the current returned shape of `useSimulation.ts`.
- [ ] Record the current returned shape of `useReplay.ts`.
- [ ] Record the current returned shape of `useModqnBundleReplay.ts`.
- [ ] Confirm the Phase 1 approach is **thin adapter over existing hook output**,
      not hook-body rewrite.
- [ ] Confirm which control intents belong in controller capabilities versus
      reference viewer UX.

### 4.4 Shared Scene Grammar Map

- [ ] Record the current producer inputs for `BeamPresentationFrame`.
- [ ] Record the current consumer surfaces that depend on
      `BeamPresentationFrame`.
- [ ] Record the current producer inputs for `ContinuityNarrativeState`.
- [ ] Confirm which parts are truth-driven projection versus readability aids.
- [ ] Confirm which fields an external consumer would need first, and which are
      reference-viewer-only.

### 4.5 Handover Published Semantics Glossary

- [ ] Define how the project currently distinguishes:
      same-satellite beam switch / inter-satellite HO / no-service.
- [ ] Record whether same-satellite beam switch must be a first-class event or
      can remain an annotated continuity state in the first landing.
- [ ] Define which semantics must appear in published snapshot truth versus
      which may stay presentation-only.
- [ ] Record the intended external meaning of `no-service` / `out-of-reach`.
- [ ] Record the minimum semantics that must be stabilized before any handover
      demo integration starts.

## 5. Frozen Validation Surface

The following 8 browser-visible validation sections are frozen for Phase 0/1.
They must remain readable by `ValidationProbe` and existing browser validators
without selector changes.

| Section key | Current publisher | Freeze rule |
|---|---|---|
| `runtime` | [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:160) | Key and payload shape frozen |
| `orbitParity` | [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:161) | Key and payload shape frozen |
| `snapshotBeamTruth` | [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:162) | Key and payload shape frozen |
| `beamPresentationFrame` | [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:107) | Key and payload shape frozen |
| `earthMovingBeamLayer` | [EarthMovingBeamLayer.tsx](/home/u24/papers/ntn-sim-core/src/viz/beam/EarthMovingBeamLayer.tsx:429) | Do not move publisher in this slice |
| `earthFixedCellLayer` | [EarthFixedCellLayer.tsx](/home/u24/papers/ntn-sim-core/src/viz/beam/EarthFixedCellLayer.tsx:186) | Do not move publisher in this slice |
| `beamInfoOverlay` | [BeamInfoOverlay.tsx](/home/u24/papers/ntn-sim-core/src/viz/overlays/BeamInfoOverlay.tsx:197) | Do not move publisher in this slice |
| `handoverLinkOverlay` | [HandoverLinkOverlay.tsx](/home/u24/papers/ntn-sim-core/src/viz/overlays/HandoverLinkOverlay.tsx:394) | Do not move publisher in this slice |

Additional freeze rules:

- [ ] Record the current `src/viz/validation/store.ts` hash before Phase 1.
- [ ] Confirm `SectionKey`, `VisualValidationState`, event name, and global key
      remain untouched in Phase 1.
- [ ] Confirm no validator selector changes are needed for:
      `validate:visual-browser`, `validate:runtime`, `validate:stage`,
      `validate:modqn:bundle`, `validate:modqn:bundle-ui`.

## 6. Out-Of-Scope Surfaces

These are explicitly off-limits during Phase 0 clarification and should stay
off-limits during the first structural landing unless a separate promotion says
otherwise:

1. `src/core/engine/tick.ts` phase order
2. `src/core/engine/channel-step.ts` truth path
3. `src/core/engine/channel-sinr-helpers.ts` SINR math
4. `src/adapters/modqn-bundle/timeline-parser.ts` loud-failure behavior
5. `src/viz/presentation/continuity-narrative-state.ts` internal semantics
6. bundle source semantics: sample default, external-directory success switch,
   load-failure retention, reset-to-sample baseline restore

## 7. Exit Criteria

Phase 0 is only complete when all of the following are true:

1. The shell/data-layer/controller boundary map exists in written form.
2. The 8 frozen validation sections and their current publishers are recorded.
3. The handover published-semantics glossary exists in written form.
4. The allowed landing zone for Phase 1 is explicitly listed.
5. The off-limits surfaces are explicitly listed.
6. The team can name the first 5 ownership files without ambiguity:
   - `src/viz/scene/SceneShell.tsx`
   - `src/viz/scene/SceneDataLayers.tsx`
   - `src/app/hooks/useSimulation.ts`
   - `src/app/hooks/useReplay.ts`
   - `src/app/hooks/useModqnBundleReplay.ts`
7. The team has written down that `handover-step.ts` semantics clarification is
   same-priority with shell thinning, even if ownership edits land later.

## 8. Phase 1 Entry Gate

Do not start Phase 1 until someone can answer these without hand-waving:

1. What moves out of `SceneShell.tsx`, and what must stay?
2. What moves out of `SceneDataLayers.tsx`, and what must stay?
3. Which validation publishers may move, and which must not move?
4. How are the three runtime-source hooks wrapped without rewriting them?
5. Which handover semantics are published truth, and which are only
   presentation grammar?

If any answer is still "we will figure it out during refactor", Phase 0 is not
done.
