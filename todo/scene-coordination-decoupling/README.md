# Scene Coordination Decoupling — Handoff Pack

**Status:** Drafted — pending promotion of
`sdd/scene-coordination-decoupling-follow-on.md`

**Drafted:** 2026-04-17

**Authority:** `sdd/scene-coordination-decoupling-follow-on.md`

This handoff pack is the working surface for the consumer-only
responsibility split of `SceneShell.tsx` and `SceneDataLayers.tsx`. It is
not implementation authority by itself — every claim in this pack must
agree with the SDD above. If they conflict, the SDD wins.

---

## 1. Preflight Checklist

Before opening Milestone A, verify:

1. The SDD has been promoted: `sdd/README.md §4` lists
   `scene-coordination-decoupling-follow-on.md` under **Promoted Downstream
   Files**.
2. `sdd/ntn-sim-core-implementation-status.md §1c` has an in-progress row
   for this slice.
3. Working tree is clean against `main`:
   `git status --short` returns no unrelated `M`/`??` lines under
   `src/viz/`, `src/app/`, or `src/viz/overlays/ControlPanel.tsx`.
4. All current validators pass on `main`:
   - `npm run lint`
   - `npm run validate:trace`
   - `npm run validate:profiles`
   - `npm run validate:runtime`
   - `npm run validate:stage`
   - `npm run validate:modqn:bundle`
   - `npm run validate:modqn:bundle-ui`
   These form the gate-continuity baseline. Any failure here is a
   pre-existing condition; do not start the slice on a red baseline.
5. Re-read the SDD's §5 (Non-Negotiable Boundary Rules) and §6 (Allowed
   Landing Zone). Any file outside §6 is off-limits for this slice.
6. Capture the validation-store baseline hash (per SDD §7.5):

   ```bash
   sha256sum src/viz/validation/store.ts > .scene-coord-baseline-store-hash.txt
   git diff --quiet src/viz/validation/store.ts \
     || { echo "store.ts has uncommitted changes; abort"; exit 1; }
   ```

   Commit the hash file is **not** required (it is a local checkpoint, not
   part of the slice's landing zone). Add `.scene-coord-baseline-store-hash.txt`
   to `.gitignore`-equivalent local exclusion if `git status` becomes noisy.

If any preflight item fails, stop and report — do not proceed.

---

## 2. Mental Model

The split aims at **three responsibility-pure units** out of the current
two coordination files:

```
Today                              After this slice
-----                              ----------------
SceneShell.tsx (438 lines)         SceneShell.tsx (shrunk)
  - mode switch                       - layout / Canvas chrome
  - HUD wiring                        - mode-switch arbitration
  - bundle controls                   - control-surface slot
  - panel toggles                     - panel slot
  - native panel restore
  - bundle source lifecycle
  - bundle metadata composition
  - KPI export wiring
  - Canvas mode selection          scene/modes/*Controller.tsx (3 new)
                                      - NativeLiveController
                                      - NativeReplayController
                                      - BundleReplayController
                                      (each a thin adapter over its hook)

SceneDataLayers.tsx (474 lines)    scene/TruthSourceLayer.tsx
  - truth-source orchestration        - mode-controller mounting
  - validation publication            - state exposure
  - presentation mounting             - upstream validation sections

                                   scene/PresentationLayers.tsx (existing
                                   shape preserved)
                                      - presentation mounting
                                      - presentation-side validation
                                        sections
```

The hooks themselves (`useSimulation`, `useReplay`, `useModqnBundleReplay`)
are not rewritten. The transient-truth-hold and continuity-narrative-state
modules are not rewritten. Only the **wiring and ownership** changes.

---

## 3. Milestone A — Controller Seam

### A.1 Goal

Introduce the `SceneModeController` seam and three thin adapters, with
zero observable behavior change.

### A.0 First-hour walkthrough

This is a concrete starting recipe. Skip if you are already comfortable
with the SceneShell/SceneDataLayers code paths; the steps below assume a
fresh reader.

**Step 1 — Read the three hook return shapes (≈10 min).**

Read in this order, focusing only on the public `Use*Result` interface
near the top of each file:

1. `src/app/hooks/useSimulation.ts` lines 38–51 (`UseSimulationResult`)
2. `src/app/hooks/useReplay.ts` lines 46–56 (`UseReplayResult`)
3. `src/app/hooks/useModqnBundleReplay.ts` lines 34–56
   (`UseModqnBundleReplayResult`)

Cross-reference each field against SDD §7.1 `SceneModeState.{live,replay,
bundle}` and `SceneModeActions.{live,bundle}`. Confirm the mapping is
1:1 (it is, as of `main`).

**Step 2 — Read how SceneShell currently consumes the hooks (≈10 min).**

Read `src/viz/scene/SceneShell.tsx` lines 80–100 and the Canvas mount
block (around lines 280–310 per current `main`). Note three things:

1. Which hook's return value becomes `sceneSnapshot`.
2. Which hook supplies `bundleViewModel`.
3. How mode switching swaps which `*Layer` mounts inside Canvas.

You do not need to memorize every prop. The point is to see the *shape*
of "shell reaches into hook → passes to layer".

**Step 3 — Read SceneDataLayers' three near-identical mode blocks
(≈10 min).**

Read `src/viz/scene/SceneDataLayers.tsx` around lines 130–402. The three
blocks (LiveLayer, ReplayLayer, BundleReplayLayer) each:

1. Build a `summary` from their hook output
2. Call `usePublishValidationSection('runtime', summary)` and friends
3. Forward to `PresentationLayers`

This three-way duplication is the deduplication target in Milestone B.
Milestone A leaves it alone — controllers are introduced *between* the
hook and these blocks, not by removing the blocks.

**Step 4 — Create `src/viz/scene/modes/types.ts` (≈5 min).**

Copy the interface block from SDD §7.1 verbatim. Add the imports listed
right after that interface block. The file should compile with
`npm run lint` immediately even though no controller exists yet (it is
just type definitions).

**Step 5 — Implement `NativeReplayController` first (≈15 min, the
simplest of the three).**

Sketch:

```tsx
// src/viz/scene/modes/NativeReplayController.tsx
import { useReplay, type UseReplayOptions } from '@/app/hooks/useReplay';
import type { SceneModeController } from './types';

const NATIVE_REPLAY_CAPABILITIES = {
  supportsProfileSelect: true,
  supportsHoOverride: true,
  supportsHoSlow: true,
  supportsLabelsToggle: true,
  supportsSinrChart: true,
  supportsHoLog: true,
  supportsSinrCdf: true,
  supportsElevScatter: true,
  supportsParametersPanel: true,
  supportsKpiExport: true,
  supportsBaselineViewer: true,
  supportsBundleSourceLoad: false,
  supportsSlotStep: false,
  supportsBundleMetadataPanel: false,
  supportsBundleSourceDisclosure: false,
} as const;

export function useNativeReplayController(
  options?: UseReplayOptions,
): SceneModeController {
  const replay = useReplay(options);
  return {
    mode: 'native-replay',
    state: {
      rawSnapshot: replay.snapshot,
      // presentationFrame stays null in Milestone A; PresentationLayers
      // continues to compute it from rawSnapshot via the existing path.
      // Milestone B may relocate this if the split benefits.
      presentationFrame: null,
      isReady: replay.isReady,
      replay: {
        replayState: replay.replayState,
        replayManifest: replay.replayManifest,
        selectionReason: replay.selectionReason,
        profileId: replay.profileId,
      },
    },
    actions: {},
    capabilities: NATIVE_REPLAY_CAPABILITIES,
  };
}
```

The other two controllers follow the same shape:

- `useNativeLiveController` populates `state.live` and `actions.live.exportKpi`
- `useBundleReplayController` populates `state.bundle` and the four
  `actions.bundle.*` methods

Capability constants for `NativeLive` and `BundleReplay` are identical
to the third column of SDD §7.4.2 `Capability defaults per controller`.

**Step 6 — Run `npm run lint` after each controller (≈3 min each).**

Lint is the fastest signal that the type wiring is correct. Do not
proceed to wire SceneShell/SceneDataLayers until all three controllers
lint clean in isolation.

**Step 7 — Wire one mode through the controller end-to-end (≈15 min).**

Pick `native-replay` (lowest blast radius — no actions, no bundle
lifecycle). Inside `SceneShell.tsx`:

1. Call `useNativeReplayController` instead of `useReplay` directly.
2. Pass `controller.state.rawSnapshot` to the existing `ReplayLayer`
   block in `SceneDataLayers.tsx` (replace the spot that takes
   `replay.snapshot`).
3. **Do not yet** consume `controller.capabilities` or
   `controller.actions`. Capability-driven `ControlPanel` rendering is
   Milestone C.
4. Run the full §A.4 gate set. If clean, repeat for `native-live`, then
   `modqn-bundle`.

**Step 8 — Stop here and commit Milestone A.**

Do not start data-layer split (Milestone B). Do not start
capability-driven `ControlPanel` (Milestone C). The "controller seam"
work is complete when:

1. All three hooks are accessed via their controller wrapper inside the
   shell/data-layer surface,
2. all §A.4 gates remain green under unchanged selectors,
3. the SDD §7.5 `store.ts` hash check still matches.

If any gate fails or behavior changes, this is the cleanest point to
roll back — no down-stream work depends on Milestone A yet.

### A.2 Files

New:

1. `src/viz/scene/modes/types.ts` — `SceneModeState`,
   `SceneModeCapabilities`, `SceneModeController` interfaces
2. `src/viz/scene/modes/NativeLiveController.tsx`
3. `src/viz/scene/modes/NativeReplayController.tsx`
4. `src/viz/scene/modes/BundleReplayController.tsx`

Modified:

1. `src/viz/scene/SceneShell.tsx` — route through controllers internally;
   external surface unchanged
2. `src/viz/scene/SceneDataLayers.tsx` — consume controller instead of
   reaching into hook returns directly

### A.3 Interface shape

```ts
export interface SceneModeState {
  rawSnapshot: SimulationSnapshot | null;
  presentationFrame: BeamPresentationFrame | null;
  bundle?: {
    viewModel: ModqnBundleReplayViewModel | null;
    frameIndex: number;
    sourceState: BundleSourceState;
  };
  replay?: {
    isPlaying: boolean;
    currentFrameIndex: number;
    totalFrameCount: number;
  };
  live?: {
    isRunning: boolean;
    profileId: string;
  };
}

export interface SceneModeCapabilities {
  supportsProfileSelect: boolean;
  supportsHoOverride: boolean;
  supportsKpiExport: boolean;
  supportsBundleSourceLoad: boolean;
  supportsSlotStep: boolean;
  supportsRichDiagnosticsPanel: boolean;
}

export interface SceneModeController {
  mode: SceneMode;
  state: SceneModeState;
  capabilities: SceneModeCapabilities;
}
```

The `bundle`, `replay`, and `live` extension blocks are mode-specific and
optional — only the controller for that mode populates them. This keeps
the seam typed without forcing every consumer to handle every mode's
extension surface.

### A.4 Validator gate

After A lands, all of the following must pass with **no selector or DOM
attribute changes**:

1. `npm run lint`
2. `npm run validate:trace`
3. `npm run validate:profiles`
4. `npm run validate:runtime`
5. `npm run validate:stage`
6. `npm run validate:modqn:bundle`
7. `npm run validate:modqn:bundle-ui`

If any selector adjustment is needed, **stop** — that means observable
behavior changed. Roll back A and investigate.

### A.5 Done when

1. Three controller files exist and compile.
2. `SceneShell` and `SceneDataLayers` route through controllers internally.
3. Public props of `SceneShell` and `SceneDataLayers` unchanged.
4. All §A.4 gates pass.
5. Diff under `src/viz/` and `src/app/` is bounded to the files listed in
   §A.2.
6. Validation-store hash unchanged:

   ```bash
   sha256sum --check .scene-coord-baseline-store-hash.txt
   ```

   A non-match means `store.ts` was modified — that violates §5.6 / §7.5
   and is a §10.2 rollback trigger.

---

## 4. Milestone B — Data Layer Split

### B.1 Goal

Split `SceneDataLayers.tsx` into `TruthSourceLayer.tsx` and continue using
`PresentationLayers.tsx`, with the same validation publications under the
same keys and shapes.

### B.2 Files

New:

1. `src/viz/scene/TruthSourceLayer.tsx`

Modified:

1. `src/viz/scene/SceneDataLayers.tsx` — becomes a thin re-export shim
   pointing to `TruthSourceLayer.tsx`, OR is deleted if no other surface
   imports it; decide based on actual import-graph state at the time
2. `src/viz/scene/SceneShell.tsx` — import from new path if shim is removed

### B.3 Validation publication continuity

Every existing `usePublishValidationSection(...)` call must move with its
data, not be split or duplicated.

#### B.3.1 Current call-site inventory (current `main`)

The eight section keys are currently published from these exact lines.
Verify with `grep -n "usePublishValidationSection" src/viz/` before
starting B; if any line number has drifted, update this table before
moving any call.

| Section key | File | Line(s) | Notes |
|---|---|---|---|
| `runtime` | `src/viz/scene/SceneDataLayers.tsx` | 160, 252, 425 | Three near-identical blocks (LiveLayer / ReplayLayer / BundleReplayLayer); each builds its own `summary` from that mode's snapshot before publishing |
| `orbitParity` | `src/viz/scene/SceneDataLayers.tsx` | 161, 253, 426 | Same per-mode triple as `runtime` |
| `snapshotBeamTruth` | `src/viz/scene/SceneDataLayers.tsx` | 162, 254, 427 | Same per-mode triple as `runtime` |
| `beamPresentationFrame` | `src/viz/scene/SceneDataLayers.tsx` | 107 | Single mode-agnostic publish (lives outside the per-mode branches) |
| `earthMovingBeamLayer` | `src/viz/beam/EarthMovingBeamLayer.tsx` | 429 | Overlay self-publishes; **outside the slice's landing zone** — must not move |
| `earthFixedCellLayer` | `src/viz/beam/EarthFixedCellLayer.tsx` | 186 | Same — outside landing zone |
| `beamInfoOverlay` | `src/viz/overlays/BeamInfoOverlay.tsx` | 197 | Same — outside landing zone |
| `handoverLinkOverlay` | `src/viz/overlays/HandoverLinkOverlay.tsx` | 394 | Same — outside landing zone |

#### B.3.2 Post-split target

After Milestone B:

| Section key | New publisher | Mechanism |
|---|---|---|
| `runtime` | `TruthSourceLayer.tsx` | One block parameterized by the active `SceneModeController` (replaces the three near-identical blocks) |
| `orbitParity` | `TruthSourceLayer.tsx` | Same |
| `snapshotBeamTruth` | `TruthSourceLayer.tsx` | Same |
| `beamPresentationFrame` | `PresentationLayers.tsx` | Single publish stays mode-agnostic |
| `earthMovingBeamLayer` | unchanged | overlay self-publishes |
| `earthFixedCellLayer` | unchanged | overlay self-publishes |
| `beamInfoOverlay` | unchanged | overlay self-publishes |
| `handoverLinkOverlay` | unchanged | overlay self-publishes |

#### B.3.3 Anti-pattern guards

1. **Do not** convert the three runtime/orbitParity/snapshotBeamTruth
   blocks into a `switch (mode)` ladder inside `TruthSourceLayer`. The
   point of the controller seam is that each controller already exposes
   the same `state` shape; the publisher reads that uniform state and
   publishes once.
2. **Do not** move any of the four overlay-side publishes. They are
   outside the SDD's allowed landing zone (§6) and moving them would
   require rewriting the overlay components, which this slice does not
   authorize.
3. **Do not** introduce a 9th section, even temporarily, to "carry over
   information during the split". If you find yourself needing one, that
   is evidence the split shape is wrong; stop and re-plan.

The eight section keys must remain:

1. `runtime`
2. `orbitParity`
3. `snapshotBeamTruth`
4. `beamPresentationFrame`
5. `earthMovingBeamLayer`
6. `earthFixedCellLayer`
7. `beamInfoOverlay`
8. `handoverLinkOverlay`

Mapping after the split:

- `TruthSourceLayer` continues to publish `runtime`, `orbitParity`,
  `snapshotBeamTruth` (truth-source-side observations).
- `PresentationLayers` continues to publish `beamPresentationFrame`,
  `earthMovingBeamLayer`, `earthFixedCellLayer`, `beamInfoOverlay`,
  `handoverLinkOverlay` (presentation-side observations).

If a section legitimately straddles both sides (e.g., a hybrid
presentation-frame summary), keep it on the side that already owns it
today. **Do not invent new sections, do not rename, do not change payload
shape.**

### B.4 Validator gate

Same gates as A.4. Add a focused manual check:

1. Open the page in `native-live`, `native-replay`, and `modqn-bundle`
   modes.
2. Confirm `window.__NTN_SIM_CORE_VISUAL__` contains all eight section
   keys with the same shapes as before B.

### B.5 Done when

1. `TruthSourceLayer.tsx` exists and `SceneDataLayers.tsx` is either a
   shim or removed.
2. All eight validation sections continue to publish with identical keys
   and payloads.
3. All §A.4 gates pass.
4. Diff bounded to the files listed in §B.2.
5. Validation-store hash unchanged:

   ```bash
   sha256sum --check .scene-coord-baseline-store-hash.txt
   ```

   This milestone moves call sites of `usePublishValidationSection(...)`,
   not the store itself; a hash mismatch means the move accidentally
   touched `store.ts` and is a §10.2 rollback trigger.

---

## 5. Milestone C — Shell Shrinkage and Capability-Driven Controls

### C.1 Goal

Move mode-specific state custodianship into the corresponding controller,
shrink `SceneShell.tsx`, and switch `ControlPanel.tsx` to capability-flag
rendering.

### C.2 Files

Modified:

1. `src/viz/scene/SceneShell.tsx` — shrink to layout / Canvas / mode-switch
   / control-surface slot / panel slot
2. `src/viz/scene/modes/NativeLiveController.tsx` — absorb native panel
   state restoration
3. `src/viz/scene/modes/NativeReplayController.tsx` — same as above for
   replay
4. `src/viz/scene/modes/BundleReplayController.tsx` — absorb bundle
   external-directory source lifecycle and bundle metadata/compact panel
   composition
5. `src/viz/overlays/ControlPanel.tsx` — render based on
   `SceneModeCapabilities` flags rather than `sceneMode === 'X'` checks
6. (If shim from B.2 still exists and no remaining imports) delete
   `src/viz/scene/SceneDataLayers.tsx`

### C.3 Behavior parity check

The user-visible control surface must be **identical** before and after C:

1. Same controls visible in each mode.
2. Same enabled/disabled states.
3. Same labels.
4. Same keyboard shortcuts.
5. Same default values on first load.
6. Same effect when toggled.

Anything that changes here is a scope violation — split it into a
follow-up SDD.

### C.4 Validator gate

Same gates as A.4 plus:

1. `DEFAULT_SCENE_MODE` and `DEFAULT_INTERACTIVE_PROFILE_ID` confirmed
   unchanged.
2. First-screen visual smoke test:
   - Load the page with no query params (default boot path:
     `sceneMode=modqn-bundle`, `profileId=case9-daps-showcase`).
   - Switch to `native-live` mode via the mode-switch button row.
   - Compare the rendered scene against the pre-slice baseline screenshot
     `screenshots/validation/browser-case9-daps-showcase-live.png`.
   - The comparison is qualitative (eyeball-level): satellite layout,
     beam coloring, link overlay style, and HUD field visibility must all
     match. If any visible regression appears, treat as observable
     behavior change and roll back.
   - Optionally also compare against
     `screenshots/validation/browser-case9-daps-dual-active.png` and
     `screenshots/validation/browser-case9-daps-replay-dual-active.png`
     for DAPS continuity scenes.
3. Bundle-mode visual smoke test: in `modqn-bundle` mode, exercise
   `Slot ◀` / `Slot ▶` buttons; confirm slot indicator advances and
   serving-satellite annotation reflects the new slot. No baseline PNG
   exists for bundle mode (gates `VAL-MODQN-BUNDLE-002..005` cover this
   programmatically); rely on the validator output instead of a
   screenshot.

### C.5 Done when

1. `SceneShell.tsx` line count is meaningfully reduced (target: ≤ 250
   lines, but no hard requirement; the rule is responsibility purity, not
   line count).
2. `ControlPanel.tsx` contains no mode-string `if/else`.
3. All gates in §A.4 plus §C.4 pass.
4. Behavior parity checks in §C.3 pass.
5. Diff bounded to the files listed in §C.2.
6. Validation-store hash unchanged:

   ```bash
   sha256sum --check .scene-coord-baseline-store-hash.txt
   ```

   Final hash check before §8 completion sync. Any drift here means an
   earlier milestone violated §5.6 / §7.5 silently — investigate before
   proceeding to landing.

---

## 6. Rollback Procedure

This pack assumes implementation lands as **three separate commits**, one
per milestone, on a dedicated branch.

If a gate fails after Milestone N:

1. Reset to the commit immediately before Milestone N.
2. Add a `§11 Discovered Constraint` entry to the SDD describing what
   blocked Milestone N.
3. Re-plan Milestone N (or split it further) before re-attempting.
4. **Do not** revert the prior milestone unless it is independently
   broken.

If a Milestone-A gate fails, that means the controller seam itself is
incompatible with the existing hook contract — investigate before
broadening scope.

---

## 7. Out-of-Scope Reminders

These are not in this slice and must not be added under cover of this
work:

1. Any change to `src/core/`, `src/runner/`, `src/core/contracts/`.
2. Any change to `src/adapters/modqn-bundle/`.
3. Any rewrite of `transient-truth-hold.ts` or
   `continuity-narrative-state.ts` semantics.
4. Splitting `ModqnBundleReplayViewModel` (separate future follow-on).
5. Lifting validation publication into a new observation layer
   (separate future follow-on).
6. Removing or renaming any user-visible control or default.
7. Introducing a new validation gate ID.
8. Touching browser screenshot baselines under `screenshots/` unless a
   gate failure has surfaced a genuine baseline-regression that needs
   investigation (in which case stop and report).

---

## 8. Completion Sync

When all three milestones land:

1. Update `sdd/ntn-sim-core-implementation-status.md` row for this slice
   to `✅ complete` with the landing date.
2. Update `sdd/scene-coordination-decoupling-follow-on.md` `Status` and
   `Landed` fields.
3. Update `sdd/README.md` — move this entry from §4 (Promoted Downstream
   Files) to §3 (Shipped Downstream Surface).
4. Add a short note to `sdd/ntn-sim-core-validation-matrix.md` recording
   gate-continuity confirmation (no new ID).
5. Write a closure devlog under `internal/ntn-sim-core/devlogs/`.
6. Optionally delete or archive this `todo/scene-coordination-decoupling/`
   pack per the project's existing cleanup convention.
