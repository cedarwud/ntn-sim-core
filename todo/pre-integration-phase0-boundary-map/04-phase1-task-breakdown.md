# Phase 1 Task Breakdown

This document converts the Phase 0 inventories into a concrete execution order
for the first structural landing. It is intentionally narrower than a full SDD:
the active authority still lives in `sdd/`, but this file is what an execution
thread should use to decide task order and scope boundaries.

**Status note (2026-04-19):** Task 4 published-semantics work is now landed in
the runtime truth surfaces. This file now treats Task 4 as a completed guardrail
for future structural work, not as an open code-implementation slice.

## 1. Phase 1 Goal

Phase 1 should reduce consumer-side coordination overlap without:

- rewriting `src/core/**`,
- changing frozen validation semantics,
- expanding bundle adapter scope,
- or accidentally turning presentation grammar into engine truth.

The target outcome is:

1. `SceneShell.tsx` becomes a thinner shell,
2. `SceneDataLayers.tsx` is split into clearer truth-source vs presentation
   ownership,
3. the three runtime-source hooks are wrapped by thin controllers,
4. the landed handover published semantics stay explicit runtime truth instead
   of drifting back into presentation-side inference.

## 2. Task Sequence

Do these tasks in order unless a blocker explicitly forces a split.

### Task 0 — Preflight Freeze Check

**Purpose**

Lock the starting point before any code movement.

**Inputs**

- [01-responsibility-map.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/01-responsibility-map.md:1)
- [02-validation-freeze-list.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/02-validation-freeze-list.md:1)
- [03-handover-published-semantics-glossary.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/03-handover-published-semantics-glossary.md:1)

**Outputs**

- baseline `store.ts` hash
- confirmed 8-section publisher map
- confirmed first-5 ownership files

**Do not do**

- no code edits
- no SDD promotion
- no shell thinning yet

### Task 1 — Controller Seam

**Purpose**

Introduce thin mode controllers so the shell/data-layer surfaces stop reaching
straight into hook-specific return shapes.

**Primary files**

- new `src/viz/scene/modes/types.ts`
- new `src/viz/scene/modes/NativeLiveController.tsx`
- new `src/viz/scene/modes/NativeReplayController.tsx`
- new `src/viz/scene/modes/BundleReplayController.tsx`
- `src/viz/scene/SceneShell.tsx`
- `src/viz/scene/SceneDataLayers.tsx`

**Rules**

- wrap existing hook outputs
- do not rewrite hook bodies
- do not consume controller capabilities in `ControlPanel` yet
- do not change validation selectors or payloads

**Done when**

- all three modes route through controller wrappers
- public behavior is unchanged
- validation-store hash is unchanged

### Task 2 — Truth-Source Layer Extraction

**Purpose**

Split `SceneDataLayers.tsx` into truth-source-side and presentation-side
ownership while keeping the same 8 validation sections.

**Primary files**

- new `src/viz/scene/TruthSourceLayer.tsx`
- `src/viz/scene/SceneDataLayers.tsx`
- `src/viz/scene/SceneShell.tsx`

**Rules**

- move only `runtime`, `orbitParity`, `snapshotBeamTruth` with the truth-source
  side
- keep `beamPresentationFrame` on the presentation side
- do not move overlay/self-published validation sections
- do not introduce a 9th validation section

**Done when**

- truth-source-side publication is centralized
- presentation-side publication still owns `beamPresentationFrame`
- `ValidationProbe` and browser validators need no selector changes

### Task 3 — Shell Shrinkage

**Purpose**

Reduce `SceneShell.tsx` to shell/layout, mode arbitration, and control/panel
slot composition.

**Primary files**

- `src/viz/scene/SceneShell.tsx`
- `src/viz/overlays/ControlPanel.tsx`
- controller files from Task 1

**Rules**

- shell keeps query/bootstrap, layout, and top-level slots
- bundle-only derived composition should move closer to bundle-specific
  projection/control surfaces
- do not change default mode or profile boot behavior

**Done when**

- `SceneShell.tsx` no longer owns most per-mode bridging logic
- mode-specific control visibility is capability-driven or clearly isolated
- first-screen behavior remains unchanged

### Task 4 — Handover Semantics Clarification

**Status**

Completed / landed in the current tree. Treat this task as a contract guardrail
and doc-sync boundary for future work.

**Purpose**

Record the landed minimum published semantics so future
`scenario-globe-handover-demo` or shell-thinning work does not consume or
rewrite the wrong contract.

**Landed truth**

1. same-satellite beam switch is published through
   `UeState.servingTransition.kind='same-satellite-beam-switch'`
2. inter-satellite HO is published through
   `UeState.servingTransition.kind='inter-satellite-handover'`
3. `no-service` / `out-of-reach` / `no-eligible-service` are published through
   `UeState.serviceState`
4. `ContinuityNarrativeState` and `HandoverLinkOverlay` read those truth
   surfaces and remain presentation grammar / rendering aids, not primary
   inference sources

**Primary files (reference + authority sync)**

- landed runtime truth surfaces:
  - `src/core/common/types.ts`
  - `src/core/engine/handover-step.ts`
  - `src/core/engine/snapshot-step.ts`
- landed consumer reading surfaces:
  - `src/viz/presentation/continuity-narrative-state.ts`
  - `src/viz/overlays/HandoverLinkOverlay.tsx`
- authority sync surfaces:
  - `03-handover-published-semantics-glossary.md`
  - `sdd/ntn-sim-core-implementation-status.md`

**Rules**

- do not fold this task into shell thinning as an incidental side edit
- do not let presentation grammar silently become engine truth
- do not reinterpret same-satellite beam switch as inter-satellite HO
- do not make frontend/browser follow-up or validator investigation look like
  the same task as this semantics landing

**Completion note**

- the written authority surfaces reflect the landed runtime truth
- future Task 1-3 structural work can preserve the truth-vs-presentation split
  without reopening runtime semantics

**Follow-up gate note**

- browser / validator readiness remains a separate line of work
- broader earth-moving beam-tracking and candidate-eligibility follow-on work
  remains separate from this narrow semantics landing

### Task 5 — Gate Recheck And Sync

**Purpose**

Close the Phase 1 structural slice without letting documentation and validators
lag reality.

**Primary files**

- `sdd/ntn-sim-core-implementation-status.md`
- `sdd/ntn-sim-core-validation-matrix.md`
- closure devlog / working notes as needed

**Rules**

- do not mark complete unless validation continuity is explicitly rechecked
- do not promote follow-ons implicitly

## 3. Recommended Commit Boundaries

Keep these as separate commits or PR slices when possible:

1. Task 1: controller seam
2. Task 2: truth-source layer extraction
3. Task 3: shell shrinkage / capability cleanup
4. Task 4: only if a semantics regression is found; isolate it as a narrow
   contract/doc fix rather than mixing it into shell cleanup
5. Task 5: sync / closure

Task 4 is already landed. If it must be revisited, limit it to narrow
glossary/contract correction first; avoid mixing shell structural edits with HO
semantic edits in one commit.

## 4. Validation Gates Per Task

### Minimum per structural task

- `npm run lint`
- `npm run validate:trace`
- `npm run validate:profiles`
- `npm run validate:runtime`
- `npm run validate:stage`

### Also required when bundle path is touched

- `npm run validate:modqn:bundle`
- `npm run validate:modqn:bundle-ui`

### Manual/qualitative checks

- ValidationProbe still exposes the same 8 sections
- default boot path still behaves the same
- bundle mode still respects sample / external-directory / reset-to-sample
  semantics

## 5. Parallelism And Non-Parallelism

### Can proceed in parallel

- Task 1 controller seam prep can proceed while treating Task 4 as a fixed
  guardrail
- validator-baseline capture can happen before any code task

### Should not proceed in parallel

- Task 2 and Task 3 should not land in the same unreviewed patch
- any Task 4 regression fix should not be buried inside Task 3 shell cleanup
- any change that touches validation-store semantics must stop the sequence and
  be reviewed separately

## 6. Recommended Next Execution Step

If execution starts now, begin with:

1. Task 0 baseline freeze check
2. Task 1 controller seam

Do **not** start with shell shrinkage first. Without the controller seam and the
8-section freeze already fixed, shell thinning is too likely to entangle
mode-specific state with validation publication. Preserve the landed Task 4
handover published semantics as a non-negotiable boundary while doing so.
