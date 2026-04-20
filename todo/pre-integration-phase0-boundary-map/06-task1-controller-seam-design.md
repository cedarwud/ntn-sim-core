# Task 1 Controller Seam Design

**Status:** implementation-ready working note  
**Date:** 2026-04-19  
**Scope:** the first code slice after `Task 0` baseline freeze

This file narrows `Task 1` from
[04-phase1-task-breakdown.md](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/04-phase1-task-breakdown.md:1)
into a concrete structural landing. It is still a `todo/` working surface, not
promoted `sdd/` authority.

## 1. Goal

Introduce a thin controller seam between:

1. runtime-source hooks
2. shell/data-layer coordination
3. future truth-source / presentation split work

without:

- rewriting hook bodies,
- moving validation publishers,
- changing engine truth order,
- or turning `SceneShell.tsx` into an external consumer API.

The immediate target is not a full architecture cleanup. The target is a safer
internal boundary so later `Task 2` and `Task 3` patches stop reaching directly
into three unrelated hook result shapes.

## 2. Current Problem

Right now:

1. [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:1)
   calls `useSimulation`, `useReplay`, and `useModqnBundleReplay` directly.
2. Each mode path computes its own callback payloads for:
   - `onStatsUpdate`
   - `onSnapshotUpdate`
   - `onExportKpiReady`
   - bundle-only `onViewModelUpdate`
   - bundle-only `onControlsUpdate`
3. `SceneShell.tsx` still owns mode branching for:
   - bundle vs native panel composition
   - mode-dependent control props
   - bundle-only metadata / explainability surfaces

That means shell thinning cannot start safely until the mode-specific hook
surface is wrapped behind a stable controller boundary.

## 3. Task 1 Design Rules

These are non-negotiable for the first landing:

1. Do not rewrite the bodies of:
   - [useSimulation.ts](/home/u24/papers/ntn-sim-core/src/app/hooks/useSimulation.ts:1)
   - [useReplay.ts](/home/u24/papers/ntn-sim-core/src/app/hooks/useReplay.ts:1)
   - [useModqnBundleReplay.ts](/home/u24/papers/ntn-sim-core/src/app/hooks/useModqnBundleReplay.ts:1)
2. Do not move any existing `usePublishValidationSection(...)` call site in
   this task.
3. Do not change:
   - `VisualValidationState`
   - `SectionKey`
   - `__NTN_SIM_CORE_VISUAL__`
   - `ntn-sim-core:visual-validation`
4. Do not change `SimulationSnapshot` shape.
5. Do not change `BeamPresentationFrame` shape.
6. Do not move bundle sample / external-directory / reset-to-sample semantics.
7. Do not genericize `timeline-parser.ts`.
8. Do not modify `tick.ts`, `channel-step.ts`, or `channel-sinr-helpers.ts`.
9. Do not move `ControlPanel.tsx` onto the new seam yet; it may consume the
   same props through the existing shell until `Task 3`.

## 4. Proposed File Landing Zone

Create a new scene-local controller folder:

```text
src/viz/scene/modes/
```

Recommended initial files:

1. `src/viz/scene/modes/types.ts`
2. `src/viz/scene/modes/NativeLiveController.tsx`
3. `src/viz/scene/modes/NativeReplayController.tsx`
4. `src/viz/scene/modes/BundleReplayController.tsx`

Optional only if needed for readability:

5. `src/viz/scene/modes/build-controller-stats.ts`

Do not add a second abstraction layer beyond this folder in `Task 1`.

## 5. Controller Shape

`Task 1` only needs one normalized bridge shape for `SceneDataLayers.tsx` and
`SceneShell.tsx` to consume.

Recommended shape in `types.ts`:

```ts
export type SceneModeControllerKind =
  | 'native-live'
  | 'native-replay'
  | 'modqn-bundle';

export interface SceneModeControllerBridge {
  kind: SceneModeControllerKind;
  snapshot: SimulationSnapshot | null;
  stats: SimHudProps;
  exportKpi: (() => KpiBundle | null) | null;
  profileId: string;
  isBhProfile: boolean;
}

export interface BundleControllerExtras {
  viewModel: ModqnBundleReplayViewModel | null;
  controls: {
    error: string | null;
    isLoading: boolean;
    loadExternalDirectory: (selectedFiles: FileList | File[]) => Promise<void>;
    loadState:
      | 'boot-loading-sample'
      | 'boot-load-failed'
      | 'ready-sample'
      | 'loading-external-directory'
      | 'ready-external-directory'
      | 'resetting-to-sample';
    resetToSample: () => Promise<void>;
    sourceKind: 'sample' | 'external-directory';
    sourceLabel: string;
    stepBackward: () => void;
    stepForward: () => void;
  } | null;
}
```

Important:

1. `Bridge` is for common shell/data-layer coordination.
2. Bundle-only surfaces stay bundle-only; do not force them into a fake generic
   type just to make all three modes identical.
3. If the implementation prefers a render-prop controller component rather than
   a reusable hook, that is acceptable as long as the exposed bridge shape stays
   stable and hook bodies remain unchanged.

## 6. Controller Responsibilities

Each controller should do only three things:

1. call exactly one existing runtime-source hook;
2. normalize its result into the shared bridge shape;
3. emit any mode-specific extras needed by the current shell.

Each controller should **not**:

1. publish validation sections;
2. mount presentation layers;
3. decide shell layout;
4. reinterpret handover truth;
5. add cross-mode orchestration policy.

### 6.1 NativeLiveController

Wrap [useSimulation.ts](/home/u24/papers/ntn-sim-core/src/app/hooks/useSimulation.ts:1).

Should normalize:

- `snapshot`
- `stats`
- `exportKpi`
- `profileId`
- `isBhProfile`

Should preserve current stat semantics from the live branch in
[SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:131).

### 6.2 NativeReplayController

Wrap [useReplay.ts](/home/u24/papers/ntn-sim-core/src/app/hooks/useReplay.ts:1).

Should normalize:

- `snapshot`
- `stats`
- `exportKpi` as `null`
- `profileId`
- `isBhProfile`

Should preserve current replay-specific stat fields:

- `replaySelection`
- `replayWindowStartSec`
- `replayWindowEndSec`

### 6.3 BundleReplayController

Wrap
[useModqnBundleReplay.ts](/home/u24/papers/ntn-sim-core/src/app/hooks/useModqnBundleReplay.ts:1).

Should normalize:

- common bridge fields
- `BundleControllerExtras`

Should preserve current bundle-only shell inputs:

- `viewModel`
- source label and source kind
- loading / error state
- step backward / forward
- external-directory loader
- reset-to-sample

This task must preserve the current bundle source rules:

1. sample bundle boots by default
2. external-directory success replaces the active source
3. external load failure keeps the previous valid source
4. reset-to-sample restores the sample baseline

## 7. Recommended Refactor Shape

Use the smallest structural move that creates the seam:

### Step A

Add `modes/types.ts` with the bridge types.

### Step B

Add three controllers under `src/viz/scene/modes/`.

Each one may be either:

1. a component that calls the existing hook and passes the bridge through a
   render prop; or
2. a scene-local hook adapter used only inside `SceneDataLayers.tsx`.

Preferred rule:

- choose the form that preserves current Canvas/R3F usage constraints without
  forcing hook extraction gymnastics.

### Step C

Update [SceneDataLayers.tsx](/home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:1)
so each mode branch consumes the new controller seam rather than reaching
straight into the raw hook result.

### Step D

Keep all validation publication and presentation mounting where they are today.

`Task 1` is complete when the seam exists, not when the truth-source /
presentation split is finished.

## 8. Explicit Non-Goals

Do not do any of these in `Task 1`:

1. move `runtime` / `orbitParity` / `snapshotBeamTruth` publishing into a new
   truth-source component
2. move `beamPresentationFrame` publishing
3. move overlay/self-published validation sections
4. shrink `SceneShell.tsx` aggressively
5. redesign `ControlPanel.tsx`
6. change handover event semantics
7. change bundle UI behavior

Those belong to later tasks.

## 9. Acceptance Criteria

`Task 1` is done only if all of these are true:

1. `SceneDataLayers.tsx` no longer depends directly on three unrelated raw hook
   result shapes at each branch point.
2. The three runtime-source families now pass through a common controller seam.
3. Current browser-visible validation behavior is unchanged.
4. Bundle controls still behave exactly as before.
5. `SceneShell.tsx` can keep existing props/state behavior without learning new
   hook-specific internals.
6. No changes were made to engine truth order or runtime contract shapes.

## 10. Required Validation After Landing

Minimum command set:

```bash
npm run lint
npm run validate:trace
npm run validate:profiles
npm run validate:runtime
npm run validate:stage
```

Also required if bundle-facing controller wiring changes any reachable path:

```bash
npm run validate:modqn:bundle
npm run validate:modqn:bundle-ui
```

Manual checks:

1. `ValidationProbe` still exposes the same 8 sections.
2. Default live boot remains unchanged.
3. Native replay still loads and reports replay window fields.
4. Bundle mode still:
   - boots from sample
   - loads an external directory
   - keeps prior valid source on load failure
   - resets to sample cleanly

## 11. Stop Conditions

Stop and re-evaluate instead of pushing through if:

1. the implementation needs to change a hook body substantially;
2. `SceneDataLayers.tsx` cannot consume a normalized bridge without also moving
   validation publishers;
3. `ControlPanel.tsx` starts demanding direct controller ownership in this same
   patch;
4. bundle semantics need to change to fit the seam;
5. any validator requires selector or payload-shape changes.

If any of these happen, `Task 1` has turned into `Task 2` or `Task 3` and the
patch scope is wrong.
