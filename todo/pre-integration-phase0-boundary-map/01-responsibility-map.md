# Phase 0 Responsibility Map

This document fills the boundary-map portion of
[Pre-Integration Phase 0 Boundary Map Checklist](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/README.md:1).

It is intentionally descriptive: the goal is to show which responsibilities are
currently co-located, which ones are safe to move in Phase 1, and which ones
must stay put.

## 1. SceneShell.tsx

`SceneShell.tsx` is 438 lines and currently acts as more than a layout shell.
It combines shell/layout, consumer-side orchestration, bundle-mode derived
presentation props, panel-state persistence, and mode-specific Canvas
selection.

### 1.1 Responsibility Inventory

| Responsibility group | Evidence | Current role | Phase 1 handling |
|---|---|---|---|
| URL/query bootstrap | [SceneShell.tsx:61](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneShell.tsx:61>) via [useSceneQueryState.ts:33](</home/u24/papers/ntn-sim-core/src/app/hooks/useSceneQueryState.ts:33>) | Reads/synchronizes `speed`, `paused`, `hoSlowEnabled`, `showBeams`, `showLabels`, `sceneMode`, `replaySeekSec`, `validationMode`, `profileId` | Keep in shell-facing layer; this is shell/control bootstrap, not runtime logic |
| Shell-owned consumer state | [SceneShell.tsx:80](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneShell.tsx:80>) | Holds `hudData`, `sceneSnapshot`, `presentationFrame`, `bundleViewModel`, `bundleControls`, panel toggles, `hoTypeOverride` | Split by purpose; shell keeps UI state, but truth-source outputs should come from mode controllers/projection layer |
| Bundle-mode derived composition | [SceneShell.tsx:110](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneShell.tsx:110>) | Derives summary/training/provenance/decision-story/dashboard props from `bundleViewModel` plus `hudData` and `presentationFrame` | Move toward bundle-specific projection consumer or panel composer; do not leave this much bundle-only derivation in the root shell |
| Playback focus policy | [SceneShell.tsx:218](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneShell.tsx:218>) | Computes `autoSlowActive` from snapshot continuity truth and clamps `effectiveSpeed` | Keep as shell/control policy or move into controller capability layer, but do not push into engine |
| Native panel-state persistence across bundle mode | [SceneShell.tsx:229](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneShell.tsx:229>), [SceneShell.tsx:253](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneShell.tsx:253>) | Stores native panel state, resets shell outputs on mode switch, hides native panels in bundle mode, restores previous native panel toggles on exit | Keep behavior, but relocate mode-specific state arbitration out of the top shell body |
| Data-layer callback wiring | [SceneShell.tsx:284](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneShell.tsx:284>) | Creates `dataLayerProps` and hands shell callbacks to live/replay layers | Replace with typed mode-controller or source-facade outputs |
| Overlay / panel composition | [SceneShell.tsx:307](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneShell.tsx:307>) | Mounts HUD, bundle compact panel, explainability, ValidationProbe, charts, logs, parameter panel, metadata panel, baseline results panel, ControlPanel | Shell keeps layout/slot composition, but should stop owning the data shaping for every mounted panel |
| Canvas mode arbitration | [SceneShell.tsx:411](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneShell.tsx:411>) | Chooses `BundleReplayLayer` vs `ReplayLayer` vs `LiveLayer` and forwards per-mode callbacks | Convert to mode-controller mounting seam; shell should decide *which mode*, not own every per-mode bridge |

### 1.2 Shared vs Mode-Specific State

#### Shared shell/control state

- Query/bootstrap state from `useSceneQueryState()`
- `paused`, `speed`, `hoSlowEnabled`, `showBeams`, `showLabels`
- `validationMode`
- `profileId`
- `hoTypeOverride`

These are shell/control concerns and should remain shell-visible.

#### Native-only or native-preferred state

- `showSinrChart`
- `showHoLog`
- `showSinrCdf`
- `showElevScatter`
- `showBaselineResults`
- `showParameters`

These are currently persisted through `nativePanelStateRef` so bundle mode can
temporarily hide them and restore them later.

#### Bundle-only state

- `bundleViewModel`
- `bundleControls`
- `showBundleMetadata`
- bundle compact panel props
- bundle metadata panel props
- bundle control panel props

These should not leak into external non-bundle shells as implicit global shell
state.

### 1.3 Phase 1 Extraction Target

What should remain in `SceneShell.tsx`:

- control/query bootstrap
- layout shell
- top-level overlay/panel slots
- scene mode arbitration

What should move behind a cleaner seam:

- truth-source output collection
- bundle-mode view-model shaping
- mode-specific state exposure
- per-mode callback bundles

## 2. SceneDataLayers.tsx

`SceneDataLayers.tsx` is 474 lines and currently mixes presentation mounting,
truth-source hook consumption, validation publishing, and shell callback
re-exposure in one file.

### 2.1 Responsibility Inventory

| Surface | Evidence | Current role | Phase 1 handling |
|---|---|---|---|
| `DataLayerProps` | [SceneDataLayers.tsx:30](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:30>) | Defines shell callbacks and shared mode inputs in one prop bag | Keep as compatibility seam initially, but split into controller-facing vs shell-facing contracts |
| `BeamLayers` | [SceneDataLayers.tsx:43](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:43>) | Mounts `HandoverLinkOverlay`, `EarthMovingBeamLayer`, `BeamInfoOverlay`, `EarthFixedCellLayer` from `snapshot` + `presentationFrame` | Keep on presentation side |
| `PresentationLayers` | [SceneDataLayers.tsx:86](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:86>) | Builds `BeamPresentationFrame`, publishes `beamPresentationFrame`, forwards frame to shell, mounts sky and beam overlays | Keep as presentation-side layer; likely future `PresentationLayer` core |
| `LiveLayer` | [SceneDataLayers.tsx:131](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:131>) | Calls `useSimulation`, builds runtime/orbit/snapshot summaries, publishes 3 validation sections, forwards snapshot, exportKpi, HUD stats, then mounts `PresentationLayers` | Split into mode controller + shared truth-source publisher |
| `ReplayLayer` | [SceneDataLayers.tsx:209](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:209>) | Calls `useReplay`, publishes 3 validation sections, forwards snapshot and HUD stats, then mounts `PresentationLayers` | Same split pattern as live |
| `BundleReplayLayer` | [SceneDataLayers.tsx:293](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:293>) | Calls `useModqnBundleReplay`, forwards snapshot, export noop, bundle view-model, bundle controls, builds runtime/orbit/snapshot summaries from projected truth, then mounts `PresentationLayers` | Same split pattern, but keep bundle-specific source semantics and controls contract intact |

### 2.2 Callback Crossings Back To SceneShell

The following flows currently re-expose truth-source state back up to the shell:

| Callback | Evidence | Meaning |
|---|---|---|
| `onSnapshotUpdate` | [SceneDataLayers.tsx:164](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:164>), [SceneDataLayers.tsx:223](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:223>), [SceneDataLayers.tsx:346](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:346>) | Sends current snapshot back to shell for HUD/overlay/panel consumers |
| `onExportKpiReady` | [SceneDataLayers.tsx:168](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:168>), [SceneDataLayers.tsx:350](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:350>) | Gives shell either a KPI exporter or `null` |
| `onStatsUpdate` | [SceneDataLayers.tsx:172](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:172>), [SceneDataLayers.tsx:256](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:256>), [SceneDataLayers.tsx:429](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:429>) | Publishes shell-facing HUD summaries |
| `onPresentationFrameUpdate` | [SceneDataLayers.tsx:109](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:109>) | Sends `BeamPresentationFrame` back to shell |
| `onViewModelUpdate` | [SceneDataLayers.tsx:354](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:354>) | Bundle-only callback for root shell bundle panels |
| `onControlsUpdate` | [SceneDataLayers.tsx:358](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:358>) | Bundle-only callback for load/reset/step actions |

These callback crossings are the current reason `SceneShell.tsx` and
`SceneDataLayers.tsx` behave like a two-file coordinator instead of a shell +
layer pair.

### 2.3 Validation Publication Split

Current publication layout:

- `beamPresentationFrame` is published once from `PresentationLayers`
  ([SceneDataLayers.tsx:107](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:107>))
- `runtime`, `orbitParity`, `snapshotBeamTruth` are published separately inside
  each of the three mode blocks
  ([SceneDataLayers.tsx:160](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:160>),
  [SceneDataLayers.tsx:252](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:252>),
  [SceneDataLayers.tsx:425](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:425>))

That means the current file already contains a partial truth-source side /
presentation side split, but it is embedded in one file instead of being
structurally separated.

### 2.4 Phase 1 Extraction Target

What should become truth-source side:

- hook consumption
- runtime/orbit/snapshot validation publication
- snapshot/HUD/export/view-model/control outputs

What should remain presentation side:

- `useBeamPresentationFrame`
- `beamPresentationFrame` publication
- sky layer / beam layer / overlay mounting

## 3. Mode Controller Constraint

The Phase 1 controller seam should wrap the existing hooks rather than rewrite
them.

Evidence:

- `useSimulation.ts` exposes live runtime state and `exportKpi`
  ([useSimulation.ts:29](</home/u24/papers/ntn-sim-core/src/app/hooks/useSimulation.ts:29>))
- `useReplay.ts` exposes replay state, manifest, and selection reason
  ([useReplay.ts:36](</home/u24/papers/ntn-sim-core/src/app/hooks/useReplay.ts:36>))
- `useModqnBundleReplay.ts` exposes source/load/reset/step controls, plus
  `viewModel` and projected snapshot state
  ([useModqnBundleReplay.ts:31](</home/u24/papers/ntn-sim-core/src/app/hooks/useModqnBundleReplay.ts:31>))

Phase 1 target:

- add thin controller adapters over these outputs
- do not rewrite hook bodies as part of the shell/data-layer split
- do not move existing `usePublishValidationSection(...)` call sites until the
  new layer ownership is explicitly chosen

## 4. Summary

The current mixed-responsibility problem is not that either file is too long on
its own. It is that both files currently share ownership of:

1. truth-source selection,
2. shell-facing state exposure,
3. validation publication,
4. presentation grammar,
5. mode-specific control behavior.

Phase 1 should reduce that overlap, not merely move lines around.
