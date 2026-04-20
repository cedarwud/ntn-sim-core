# Scene Coordination Decoupling Follow-On

**Status:** Drafted narrow follow-on proposal — awaiting promotion
**Drafted:** 2026-04-17
**Promoted:** pending explicit approval
**Landed:** pending
**Depends on:**
1. `sdd/phase4-runtime-contract-sdd.md`
2. `sdd/phase5-cleanup-and-modularization-sdd.md`
3. `sdd/ntn-sim-core-frontend-beam-visual-sdd.md`
4. `sdd/ntn-sim-core-ui-exposure-spec.md`
5. `sdd/modqn-bundle-replay-ui-sdd.md`
6. `sdd/modqn-replay-truth-hardening-follow-on.md`
7. `sdd/modqn-producer-diagnostics-consumer-follow-on.md`
8. `sdd/truth-preserving-showcase-visual-realignment-follow-on.md`

**Scope gate:** consumer-side responsibility split for `SceneShell.tsx` and
`SceneDataLayers.tsx` only; no runtime contract change, no adapter contract
change, no validation semantics change, no truth-source behavior change

---

## Reconciliation Correction (2026-04-19)

The current tree now already contains the narrow structural seam this draft was
trying to specify:

1. `SceneDataLayers.tsx` routes through typed scene-mode controllers.
2. `TruthSourceLayer.tsx` owns truth-source publication and controller bridge
   wiring.
3. `PresentationLayers.tsx` owns `BeamPresentationFrame` publication plus the
   sky / beam / overlay render mount.
4. `SceneShell.tsx` has shrunk back toward reference-viewer shell composition.
5. `useSceneControlSurface.ts` now owns shell-side capability shaping for the
   control panel.

This file itself was **not** promoted before those current-tree changes landed.
It therefore remains a drafted reconciliation / closure-baseline companion, not
active implementation authority for new work.

Any work beyond that closure baseline should enter through a fresh follow-on SDD
rather than by treating this cleanup slice as the main Phase 2 program.

## 1. Current Position in Sequence

The platform refactor closed at Phase 5 Group 3 (2026-03-31). The
consumer-side work has since landed Slices 2–5 of the MODQN bundle replay
program plus the truth-preserving showcase visual realignment follow-on.

Against that frozen baseline, a calibrated technical re-read of `src/viz/`
and `src/app/` confirms that consumer-side complexity is now concentrated
in two coordination files:

1. `src/viz/scene/SceneShell.tsx` — 438 lines; simultaneously holds HUD
   state, scene snapshot, presentation frame, bundle view-model, bundle
   controls, panel toggles, mode switching, native panel state restoration,
   KPI export wiring, bundle metadata/compact panel composition, and Canvas
   mode selection across `LiveLayer` / `ReplayLayer` / `BundleReplayLayer`.
2. `src/viz/scene/SceneDataLayers.tsx` — 474 lines; simultaneously
   orchestrates three truth-source paths, publishes runtime / orbit /
   snapshot-beam-truth / beamPresentationFrame validation sections, mounts
   `PresentationLayers`, and re-exposes bundle controls / view-model back to
   the shell.

Both files remain inside the soft `<= 500 lines` band defined in
`agent-governance.md §5.6`, so they are not split-required by line count.
However, their responsibilities have grown beyond their declared role
(`scene shell` / `data layer`), which the same rule treats as
**mixed-responsibility split territory** independent of line count.

This follow-on exists to decouple those two files into responsibility-pure
units **without** reopening any frozen contract or shipped truth surface.

## 2. Purpose

This follow-on answers one practical question:

**How should `ntn-sim-core` reduce the coordination surface area of
`SceneShell` and `SceneDataLayers` without disturbing landed truth-source
semantics, validation gates, or frozen contracts?**

The answer should let future consumer-side follow-ons:

1. add or remove a single feature line (HUD field, dashboard panel,
   overlay toggle) without crossing both coordination files;
2. introduce a new scene mode or retire an existing one through a single
   typed seam rather than scattered if/else;
3. keep the live / native-replay / bundle-replay paths from leaking each
   other's mode-specific state;
4. let validators continue to read the same observation surface even after
   internal wiring is rearranged.

## 3. Why Now

This follow-on is justified now because:

1. there is currently no other promoted downstream file (`sdd/README.md §4`),
   so a narrow consumer-side cleanup can land without contending for the
   same authority surface;
2. the landed Slice 5 producer diagnostics consumer surface is the most
   recent addition and pushed `SceneShell` / `SceneDataLayers`
   responsibility further toward bundle-mode wiring, making the
   coordination surface measurably wider than at Slice 4 close;
3. the authoritative truth boundaries set by Slice 4
   (`modqn-replay-truth-hardening-follow-on.md §7.4`) — view-only
   continuity hold vs exported-truth-bound HUD/dashboard/probe — are
   currently maintained by *convention spread across multiple files*; a
   responsibility split makes that convention enforceable through
   structure rather than reviewer vigilance;
4. doing this work *before* any future follow-on touches the same files
   reduces the risk of merging this slice on top of unrelated
   consumer-side churn.

This follow-on is **not** justified as a prerequisite for any specific
downstream feature. It is a maintenance-driven decoupling, not an
unblocking step.

## 4. Decision

The narrow decision is:

1. extract three thin **scene mode controllers** (`native-live`,
   `native-replay`, `bundle-replay`) that each implement a uniform
   `SceneModeState` / `SceneModeCapabilities` shape;
2. split `SceneDataLayers.tsx` into a **truth-source layer** (mounts
   selected mode controller, exposes its state) and a **presentation
   layer** (mounts `PresentationLayers`, publishes presentation-side
   validation sections) without changing what either currently emits;
3. let `SceneShell.tsx` shrink to layout, control-surface slot, panel slot,
   and mode-switch arbitration only;
4. drive `ControlPanel.tsx` toggles from `SceneModeCapabilities` so
   mode-specific controls are not implicitly hidden via `if (sceneMode ===
   'modqn-bundle')` checks scattered across the shell;
5. preserve every currently published validation section under its current
   key and shape;
6. preserve `transient-truth-hold.ts` and `continuity-narrative-state.ts`
   internal semantics — only their call sites move.

## 5. Non-Negotiable Boundary Rules

1. This follow-on remains consumer-only. `src/core/`, `src/runner/`, and
   `src/core/contracts/` are not touched.
2. `src/adapters/modqn-bundle/` is not touched.
3. The `SimulationSnapshot` shape, including `hoExplanation`, is not
   changed.
4. The `BeamPresentationFrame` shape is not changed.
5. `transient-truth-hold.ts` and `continuity-narrative-state.ts` semantics
   (hold durations, grace windows, cooldowns) are not changed; only the
   files that call them may move.
6. Every existing `usePublishValidationSection(...)` call site must
   continue to publish the same key with the same payload shape. New
   sections are not introduced in this slice.
7. The eight active validation sections (`runtime`, `orbitParity`,
   `snapshotBeamTruth`, `beamPresentationFrame`, `earthMovingBeamLayer`,
   `earthFixedCellLayer`, `beamInfoOverlay`, `handoverLinkOverlay`) must
   remain readable by `ValidationProbe` and the existing browser
   validators without selector changes.
8. `DEFAULT_SCENE_MODE` and `DEFAULT_INTERACTIVE_PROFILE_ID` defaults are
   not changed in this slice.
9. Bundle-mode replay-truth boundaries from Slice 4 (view-only continuity
   hold vs exported-truth-bound HUD/dashboard/probe) remain authoritative
   and must survive the split.
10. No producer schema, no new diagnostics fields, no live MODQN takeover,
    no remote/zip ingest, no paper-oriented claim expansion.

## 6. Allowed Landing Zone

Primary landing zone:

1. `src/viz/scene/SceneShell.tsx`
2. `src/viz/scene/SceneDataLayers.tsx`
3. new files under `src/viz/scene/modes/` for the three mode controllers
4. new files under `src/viz/scene/` for the truth-source layer / presentation
   layer split (final filenames decided during Milestone A)
5. `src/viz/overlays/ControlPanel.tsx` — capability-driven rendering only
6. `src/app/hooks/useSceneQueryState.ts` — only if controller extraction
   requires a typed `SceneModeCapabilities` re-export; defaults unchanged
7. `sdd/scene-coordination-decoupling-follow-on.md` (this file)
8. `sdd/README.md` — promotion entry only
9. `sdd/ntn-sim-core-implementation-status.md`
10. `sdd/ntn-sim-core-validation-matrix.md` — only to record gate-continuity
    note; no new gate IDs introduced

Allowed companion sync:

1. `internal/ntn-sim-core/devlogs/*`
2. `internal/ntn-sim-core/README.md`

This slice must avoid touching:

1. `src/core/**`
2. `src/runner/**`
3. `src/core/contracts/**`
4. `src/adapters/modqn-bundle/**`
5. `src/app/hooks/transient-truth-hold.ts` (internal semantics)
6. `src/viz/presentation/continuity-narrative-state.ts` (internal semantics)
7. `src/viz/presentation/useBeamPresentationFrame.ts` builder shape
8. `src/viz/view-models/modqn-bundle-replay-view-model.ts` (its split is a
   separate future follow-on; only its consumption points may move)
9. `src/core/profiles/default-profile.ts`
10. `scripts/validate-*.ts` (selector-stable; no schema change)

## 7. Concrete Implementation Shape

### 7.1 Mode controller seam

Define a uniform shape:

```
interface SceneModeState {
  rawSnapshot: SimulationSnapshot | null;
  presentationFrame: BeamPresentationFrame | null;
  isReady: boolean;
  // mode-specific read extensions are exposed as optional sub-fields,
  // not as untyped pass-throughs
  live?: {
    isRunning: boolean;
    profileId: string;
    handoverCount: number;
  };
  replay?: {
    replayState: ReplayState | null;
    replayManifest: ReplayManifest | null;
    selectionReason: string | null;
    profileId: string;
  };
  bundle?: {
    viewModel: ModqnBundleReplayViewModel | null;
    sourceKind: ModqnBundleSourceKind;
    sourceLabel: string;
    loadState: ModqnBundleReplayLoadState;
    isLoading: boolean;
    error: string | null;
    currentFrameIndex: number;
    currentSlotIndex: number | null;
    slotCount: number;
    handoverCount: number;
  };
}

interface SceneModeActions {
  // mode-specific control affordances; only the controller for that mode
  // populates its corresponding sub-block
  live?: {
    exportKpi: () => KpiBundle | null;
  };
  replay?: Record<string, never>; // currently no replay-specific actions
  bundle?: {
    loadExternalDirectory: (selectedFiles: FileList | File[]) => Promise<void>;
    resetToSample: () => Promise<void>;
    stepBackward: () => void;
    stepForward: () => void;
  };
}

interface SceneModeCapabilities {
  // baseline (driven from current ControlPanel.tsx behavior; see §7.4)
  supportsProfileSelect: boolean;
  supportsHoOverride: boolean;
  supportsHoSlow: boolean;
  supportsLabelsToggle: boolean;
  supportsSinrChart: boolean;
  supportsHoLog: boolean;
  supportsSinrCdf: boolean;
  supportsElevScatter: boolean;
  supportsParametersPanel: boolean;
  supportsKpiExport: boolean;
  supportsBaselineViewer: boolean;
  // bundle-specific
  supportsBundleSourceLoad: boolean;
  supportsSlotStep: boolean;
  supportsBundleMetadataPanel: boolean;
  supportsBundleSourceDisclosure: boolean;
}

interface SceneModeController {
  mode: SceneMode;
  state: SceneModeState;
  actions: SceneModeActions;
  capabilities: SceneModeCapabilities;
}
```

`SceneMode` reuses the existing type from `useSceneQueryState.ts`. Type
imports the controllers will need:

1. `SimulationSnapshot`, `KpiBundle` from `@/core/contracts/runtime-v1` /
   `@/core/contracts/kpi-v1`
2. `BeamPresentationFrame` from `@/viz/presentation`
3. `ReplayState`, `ReplayManifest` from `@/runner/replay/types` /
   `@/core/trace/types`
4. `ModqnBundleReplayViewModel` from
   `@/viz/view-models/modqn-bundle-replay-view-model`
5. `ModqnBundleSourceKind`, `ModqnBundleReplayLoadState` from
   `@/app/hooks/useModqnBundleReplay`

Three controllers implement this seam:

1. `scene/modes/NativeLiveController` — wraps `useSimulation()`; populates
   `state.live` and `actions.live.exportKpi`
2. `scene/modes/NativeReplayController` — wraps `useReplay()`; populates
   `state.replay`; `actions.replay` empty
3. `scene/modes/BundleReplayController` — wraps `useModqnBundleReplay()`;
   populates `state.bundle` and `actions.bundle`; exposes the bundle
   view-model through `state.bundle.viewModel` rather than letting the
   shell reach into the hook directly

The hook bodies themselves are not rewritten. Each controller is a thin
adapter that normalizes the existing hook output into `SceneModeState` /
`SceneModeActions` and declares its `SceneModeCapabilities`.

### 7.2 Data layer split

`SceneDataLayers.tsx` is replaced by two files:

1. `scene/TruthSourceLayer.tsx` — selects and mounts the active mode
   controller, exposes its `state` to children, and continues to publish
   the same `runtime`, `orbitParity`, and `snapshotBeamTruth` validation
   sections it publishes today;
2. `scene/PresentationLayers.tsx` (existing component shape preserved) — now
   receives `state` from `TruthSourceLayer` rather than reaching back into
   hook returns directly; continues to publish the same
   `beamPresentationFrame`, `earthMovingBeamLayer`, `earthFixedCellLayer`,
   `beamInfoOverlay`, and `handoverLinkOverlay` sections.

The existing `SceneDataLayers.tsx` filename may be retained as a re-export
shim during Milestone B to keep diff scope contained.

### 7.3 Shell shrinkage

After the split, `SceneShell.tsx` keeps only:

1. mode-switch arbitration (`useSceneQueryState` consumption);
2. layout / chrome / Canvas mounting;
3. control-surface slot (delegated to `ControlPanel` driven by
   `SceneModeCapabilities`);
4. panel slot (HUD / overlays / dashboard mount points), with mode-specific
   panel state moved into the corresponding controller.

The shell stops being the custodian of:

1. bundle external-directory source lifecycle (moves into bundle controller);
2. native panel state restoration (moves into native controllers);
3. bundle metadata / compact panel props composition (moves into bundle
   controller's exposed `state`);
4. KPI export callback wiring (delegated to controller capability).

### 7.4 Capability-driven control surface

`ControlPanel.tsx` reads `SceneModeCapabilities` and renders only the
controls the active mode supports. The current behavior (which controls
appear in which mode) is preserved exactly; only the mechanism changes from
mode-string `if/else` to capability flags.

This slice does **not** add or remove any user-visible control. Surface
reduction is a separate future candidate.

#### 7.4.1 Current branch → capability mapping

The following table maps every existing `sceneMode`-driven branch in
`src/viz/overlays/ControlPanel.tsx` (current `main`) to the capability
flag that must replace it. Each implementer-readable row corresponds to a
specific source-line construct that must be migrated 1:1, with the same
visibility outcome.

| Source line | Current condition | Replacement capability flag | native-live | native-replay | modqn-bundle |
|---|---|---|---|---|---|
| L365 | `!isBundleMode && onProfileChange` | `supportsProfileSelect` | ✓ | ✓ | ✗ |
| L391 | `!isBundleMode && onHoTypeOverrideChange` | `supportsHoOverride` | ✓ | ✓ | ✗ |
| L443 | `!isBundleMode && onHoSlowToggle` | `supportsHoSlow` | ✓ | ✓ | ✗ |
| L467 | `!isBundleMode` (Show Labels) | `supportsLabelsToggle` | ✓ | ✓ | ✗ |
| L478 | `!isBundleMode && onShowSinrChartToggle` | `supportsSinrChart` | ✓ | ✓ | ✗ |
| L489 | `!isBundleMode && onShowHoLogToggle` | `supportsHoLog` | ✓ | ✓ | ✗ |
| L500 | `!isBundleMode && onShowSinrCdfToggle` | `supportsSinrCdf` | ✓ | ✓ | ✗ |
| L511 | `!isBundleMode && onShowElevScatterToggle` | `supportsElevScatter` | ✓ | ✓ | ✗ |
| L524 | `isBundleMode && (label or step buttons present)` | `supportsSlotStep` | ✗ | ✗ | ✓ |
| L556 | `isBundleMode` (Load / Reset block) | `supportsBundleSourceLoad` | ✗ | ✗ | ✓ |
| L583 | `isBundleMode` (source state disclosure) | `supportsBundleSourceDisclosure` | ✗ | ✗ | ✓ |
| L592 | `isBundleMode && bundleLoadError` | folded into `supportsBundleSourceDisclosure` (error rendered conditionally on `state.bundle.error`) | ✗ | ✗ | ✓ |
| L607 | `isBundleMode && onShowBundleMetadataToggle` (Disclosure btn) | `supportsBundleMetadataPanel` | ✗ | ✗ | ✓ |
| L618 | `!isBundleMode && onShowParametersToggle` (Parameters btn) | `supportsParametersPanel` | ✓ | ✓ | ✗ |
| L628 | `!isBundleMode && onExportKpi` | `supportsKpiExport` | ✓ | ✓ | ✗ |
| L638 | `!isBundleMode && onOpenBaselineResults` | `supportsBaselineViewer` | ✓ | ✓ | ✗ |

Three branches **must remain mode-string-driven**, not capability-driven,
because they are about scene-mode arbitration itself rather than
mode-specific controls:

1. L219 `resolvedSceneMode = sceneMode ?? (replayMode ? 'native-replay' : 'native-live')`
   — fallback resolution; lives outside the capability surface.
2. L322–L361 Mode-switch button row — switches between modes, so it must
   know the mode set; not a capability of any single mode.
3. L651–L660 Truth-source description text — narration of which truth
   source is currently active; not a capability gate.

The truth-source text in (3) may move into the controller as
`state.{live|replay|bundle}.truthSourceLabel` if the implementer prefers,
but is not required to. Keep behavior parity above structural purity.

#### 7.4.2 Capability defaults per controller

| Capability | NativeLiveController | NativeReplayController | BundleReplayController |
|---|---|---|---|
| `supportsProfileSelect` | true | true | false |
| `supportsHoOverride` | true | true | false |
| `supportsHoSlow` | true | true | false |
| `supportsLabelsToggle` | true | true | false |
| `supportsSinrChart` | true | true | false |
| `supportsHoLog` | true | true | false |
| `supportsSinrCdf` | true | true | false |
| `supportsElevScatter` | true | true | false |
| `supportsParametersPanel` | true | true | false |
| `supportsKpiExport` | true | true | false |
| `supportsBaselineViewer` | true | true | false |
| `supportsBundleSourceLoad` | false | false | true |
| `supportsSlotStep` | false | false | true |
| `supportsBundleMetadataPanel` | false | false | true |
| `supportsBundleSourceDisclosure` | false | false | true |

This table is the **only** authoritative pre-/post-slice parity
specification for the control surface. Any deviation discovered during
implementation must either adjust this table (with explicit noted reason)
or be treated as a scope violation.

### 7.5 Validation payload shape reference (frozen)

§5.6 requires `usePublishValidationSection(...)` payload shapes to remain
unchanged. The authoritative shapes live in
`src/viz/validation/store.ts`. For the duration of this slice, the
following type definitions are treated as **frozen reference points**;
any field addition, removal, rename, or type change is a §10 rollback
trigger.

| Section key | TypeScript interface | `store.ts` lines (current `main`) |
|---|---|---|
| `runtime` | `ValidationRuntimeSummary` | 11–40 |
| `orbitParity` | `OrbitParitySummary` | 53–60 (depends on `OrbitParitySatelliteSample` 42–51) |
| `snapshotBeamTruth` | `SnapshotBeamTruthSummary` | 133–139 |
| `beamPresentationFrame` | `BeamPresentationFrameSummary` | 141–158 |
| `earthMovingBeamLayer` | `EarthMovingLayerSummary` | 77–84 (depends on `EarthMovingBeamGeometrySample` 62–75) |
| `earthFixedCellLayer` | `EarthFixedLayerSummary` | 86–106 |
| `beamInfoOverlay` | `BeamInfoOverlaySummary` | 108–114 |
| `handoverLinkOverlay` | `HandoverLinkOverlaySummary` | 116–131 |

The aggregate container `VisualValidationState` (lines 160–170) and the
`SectionKey` derivation (line 172) are also frozen — this slice must not
touch the global key `__NTN_SIM_CORE_VISUAL__`, the
`ntn-sim-core:visual-validation` event name, or any of the publish/subscribe
helpers.

Operational rule for the implementer:

1. Before Milestone B, run a baseline capture:
   `cat src/viz/validation/store.ts | sha256sum > baseline-store-hash.txt`
2. After each milestone, re-run the same hash check. A non-match means a
   rollback trigger fired. Investigate before proceeding.

This is intentionally pessimistic — even seemingly-cosmetic edits (comment
formatting, whitespace) on `store.ts` should be treated as out-of-scope
for this slice unless they are required by lint and pre-existing on
`main`.

## 8. Work Sequence

### 8.1 Milestone A — controller seam

1. land `SceneModeState` / `SceneModeCapabilities` / `SceneModeController`
   types under `src/viz/scene/modes/`;
2. land the three controller adapters as thin wrappers over the existing
   hooks;
3. keep `SceneShell` and `SceneDataLayers` shape unchanged but route
   through controllers internally;
4. confirm all existing validators pass (`npm run lint`,
   `npm run validate:trace`, `npm run validate:profiles`,
   `npm run validate:runtime`, `npm run validate:stage`,
   `npm run validate:modqn:bundle`, `npm run validate:modqn:bundle-ui`).

### 8.2 Milestone B — data layer split

1. introduce `TruthSourceLayer.tsx`;
2. move presentation mounting and presentation-side validation publication
   into `PresentationLayers.tsx` (or its renamed equivalent);
3. retain `SceneDataLayers.tsx` as a re-export shim if needed for diff
   containment;
4. confirm validation section keys, payload shapes, and selector hits remain
   identical;
5. rerun the full validator set above.

### 8.3 Milestone C — shell shrinkage and capability-driven controls

1. move bundle source lifecycle, native panel restoration, and KPI wiring
   into the relevant controllers;
2. switch `ControlPanel` to capability-driven rendering;
3. delete the `SceneDataLayers.tsx` shim if Milestone B introduced one and
   no other surface still imports it;
4. final validator rerun;
5. status / SDD index sync.

Each milestone is independently revertible. A failure at Milestone B does
not require Milestone A to be rolled back; a failure at Milestone C does
not require Milestones A or B to be rolled back.

## 9. Validation Closure

This slice introduces **no new validation gate**. Closure is defined by
gate continuity:

1. `npm run lint`
2. `npm run validate:trace`
3. `npm run validate:profiles`
4. `npm run validate:runtime`
5. `npm run validate:stage`
6. `npm run validate:modqn:bundle`
7. `npm run validate:modqn:bundle-ui`

All currently passing `VAL-FV-*`, `VAL-VIZ-*`, and `VAL-MODQN-BUNDLE-002`
through `VAL-MODQN-BUNDLE-005` gates must remain passing under their
current selectors and DOM `data-*` attributes.

If any selector requires adjustment to keep a gate passing, that
adjustment is treated as evidence that the split has changed observable
behavior and must be rolled back to the previous milestone before
investigation.

A short note is added to `ntn-sim-core-validation-matrix.md` recording
gate-continuity confirmation. No new `VAL-*` ID is reserved.

## 10. Rollback / Safety Conditions

This slice must roll back to the previous milestone if any of the
following occur:

1. any validator in §9 changes pass/fail status;
2. any `usePublishValidationSection(...)` call site changes its key or
   payload shape;
3. any DOM `data-*` selector consumed by `scripts/validate-*.ts` requires
   modification;
4. browser-visible behavior in any mode (live, native replay, bundle
   replay) shows visible change in serving-satellite identity, slot index,
   handover narration, beam coloring, or link overlay state under the
   landed showcase profile;
5. `SimulationSnapshot` or `BeamPresentationFrame` requires any field
   addition, removal, or rename to keep the split working.

If a rollback is required, the corresponding milestone branch is reverted
and the discovered constraint is recorded in this SDD as a `§13
Discovered Constraints` entry before re-attempt.

## 11. What Stays Out of Scope

Even after this slice lands, these remain separate future candidates and
are not authorized by this SDD:

1. `ModqnBundleReplayViewModel` projector split (Section 5.4 of the
   calibrated report);
2. validation-publication observation-layer extraction (Section 5.3 of the
   calibrated report);
3. `HoExplanation` runtime-contract reshape (Section 5.5 of the calibrated
   report);
4. control-surface trimming, default-mode unification, or first-screen
   product-narrative consolidation;
5. any rewrite of `transient-truth-hold.ts` or `continuity-narrative-state.ts`
   internal semantics;
6. introduction of new scene modes, new bundle ingest paths, or new
   runtime takeover surfaces.

Any of the above must enter through a separately drafted, separately
promoted follow-on after this slice has landed and its rollback window
has closed.

## 12. Promotion Checklist

Before this SDD becomes implementation authority, the following must
happen explicitly:

1. user approval of this SDD as drafted;
2. update `sdd/README.md §4` to list this file under **Promoted Downstream
   Files** with the promotion date;
3. add an `in-progress` row to `sdd/ntn-sim-core-implementation-status.md`
   describing the planned work and milestone gating;
4. create a matching `todo/scene-coordination-decoupling/` handoff pack if
   the implementer is not the same agent as the promoter;
5. only then does Milestone A become eligible to start.

Until step 1 completes, this file is a **proposal**, not authority.

## 13. Discovered Constraints

This section is empty at draft time. Each entry below is appended only
when a milestone hits a §10 rollback trigger and the cause has been
diagnosed. Do not edit speculative entries here; if the constraint has
not actually surfaced through a rollback, it does not belong in this
section.

Entry format:

```
### YYYY-MM-DD — short title
**Triggered by:** Milestone X rollback (which §10 condition fired)
**Symptom:** what failed concretely (gate ID + selector / payload diff /
behavior mismatch)
**Root cause:** the underlying constraint discovered
**Mitigation in re-attempt:** how the next attempt avoids the constraint
**Cross-reference:** scope/boundary/landing-zone clauses that need
revision (if any) — applied via a separate edit, not buried here
```

If a discovered constraint requires changing a §5 boundary rule or §6
allowed-landing-zone item, that change is a **scope amendment** — it
must be applied as an explicit edit to the affected section in the same
commit that adds the §13 entry, not silently absorbed by the
implementer.
