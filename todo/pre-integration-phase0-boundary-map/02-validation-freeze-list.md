# Phase 0 Validation Freeze List

This document fills the validation-freeze portion of
[Pre-Integration Phase 0 Boundary Map Checklist](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/README.md:1).

Its purpose is to make Phase 1 structurally safer: responsibilities may move,
but browser-visible validation semantics must not drift.

## 1. Global Freeze Surface

The following validation-store surfaces are frozen for the Phase 0/1 slice:

- `VisualValidationState`
  ([store.ts:160](</home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:160>))
- `SectionKey`
  ([store.ts:172](</home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:172>))
- global key `__NTN_SIM_CORE_VISUAL__`
  ([store.ts:174](</home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:174>))
- event name `ntn-sim-core:visual-validation`
  ([store.ts:175](</home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:175>))

Do not rename, delete, or replace these in the scene-coordination slice.

## 2. Frozen Section Inventory

The active browser-visible validation set is 8 sections, not 4.

| Section key | Interface | Current publisher | Current consumer evidence | Phase 1 move policy |
|---|---|---|---|---|
| `runtime` | [ValidationRuntimeSummary](</home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:11>) | [SceneDataLayers.tsx:160](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:160>), [SceneDataLayers.tsx:252](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:252>), [SceneDataLayers.tsx:425](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:425>) | [ValidationProbe.tsx:47](</home/u24/papers/ntn-sim-core/src/viz/overlays/ValidationProbe.tsx:47>), `scripts/validate-visual-browser.ts` | May move only as part of truth-source-side extraction; key and payload shape frozen |
| `orbitParity` | [OrbitParitySummary](</home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:53>) | [SceneDataLayers.tsx:161](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:161>), [SceneDataLayers.tsx:253](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:253>), [SceneDataLayers.tsx:426](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:426>) | [ValidationProbe.tsx:79](</home/u24/papers/ntn-sim-core/src/viz/overlays/ValidationProbe.tsx:79>) | Same as `runtime` |
| `snapshotBeamTruth` | [SnapshotBeamTruthSummary](</home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:133>) | [SceneDataLayers.tsx:162](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:162>), [SceneDataLayers.tsx:254](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:254>), [SceneDataLayers.tsx:427](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:427>) | [ValidationProbe.tsx:93](</home/u24/papers/ntn-sim-core/src/viz/overlays/ValidationProbe.tsx:93>) | Same as `runtime` |
| `beamPresentationFrame` | [BeamPresentationFrameSummary](</home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:141>) | [SceneDataLayers.tsx:107](</home/u24/papers/ntn-sim-core/src/viz/scene/SceneDataLayers.tsx:107>) | [ValidationProbe.tsx:103](</home/u24/papers/ntn-sim-core/src/viz/overlays/ValidationProbe.tsx:103>) | May stay in presentation-side layer; key and payload shape frozen |
| `earthMovingBeamLayer` | [EarthMovingLayerSummary](</home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:77>) | [EarthMovingBeamLayer.tsx:429](</home/u24/papers/ntn-sim-core/src/viz/beam/EarthMovingBeamLayer.tsx:429>) | [ValidationProbe.tsx:127](</home/u24/papers/ntn-sim-core/src/viz/overlays/ValidationProbe.tsx:127>), `scripts/validate-visual-browser.ts` | Do not move publisher in Phase 1 |
| `earthFixedCellLayer` | [EarthFixedLayerSummary](</home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:86>) | [EarthFixedCellLayer.tsx:186](</home/u24/papers/ntn-sim-core/src/viz/beam/EarthFixedCellLayer.tsx:186>) | [ValidationProbe.tsx:139](</home/u24/papers/ntn-sim-core/src/viz/overlays/ValidationProbe.tsx:139>), `scripts/validate-visual-browser.ts` | Do not move publisher in Phase 1 |
| `beamInfoOverlay` | [BeamInfoOverlaySummary](</home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:108>) | [BeamInfoOverlay.tsx:197](</home/u24/papers/ntn-sim-core/src/viz/overlays/BeamInfoOverlay.tsx:197>) | [ValidationProbe.tsx:173](</home/u24/papers/ntn-sim-core/src/viz/overlays/ValidationProbe.tsx:173>), `scripts/validate-visual-browser.ts` | Do not move publisher in Phase 1 |
| `handoverLinkOverlay` | [HandoverLinkOverlaySummary](</home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:116>) | [HandoverLinkOverlay.tsx:394](</home/u24/papers/ntn-sim-core/src/viz/overlays/HandoverLinkOverlay.tsx:394>) | [ValidationProbe.tsx:184](</home/u24/papers/ntn-sim-core/src/viz/overlays/ValidationProbe.tsx:184>), `scripts/validate-visual-browser.ts` | Do not move publisher in Phase 1 |

## 3. Current Publisher Layout

There are two different publication patterns in the current tree:

### 3.1 SceneDataLayers-side publishers

- `runtime`
- `orbitParity`
- `snapshotBeamTruth`
- `beamPresentationFrame`

These currently live in `SceneDataLayers.tsx` and are the only validation
publishers that a future split may legitimately relocate.

### 3.2 Overlay/self-published publishers

- `earthMovingBeamLayer`
- `earthFixedCellLayer`
- `beamInfoOverlay`
- `handoverLinkOverlay`

These currently live in the beam/overlay components themselves and should stay
there during the first structural landing.

## 4. Frozen Payload Constraints

The following payload rules are frozen in Phase 1:

1. `ValidationRuntimeSummary.primaryUe` field names stay unchanged.
2. `truthSourceKind` stays one of:
   - `native-live`
   - `native-replay`
   - `modqn-bundle`
3. `BeamPresentationFrameSummary` keeps:
   - narrative IDs
   - `displaySatIds`
   - `eventSatIds`
   - `beamSatIds`
   - `primaryBeamBySatId`
   - `contextBeamIdsBySatId`
   - `markerRoleBySatId`
   - `beamRoleAccentByBeamId`
4. `HandoverLinkOverlaySummary` keeps:
   - `styleKeys`
   - `observedStyleKeys`
   - `continuityState`
   - `dapsPhase`
   - `narrative*` IDs
   - cooldown fields
   - `observedDapsPhases`
   - `observedDualActiveTruth`

If a Phase 1 change needs one of these shapes to change, that is no longer a
plain scene-coordination split and must be treated as a separate promoted
surface.

## 5. Validator Continuity

At minimum, Phase 1 must preserve compatibility with:

- `ValidationProbe`
  ([ValidationProbe.tsx:33](</home/u24/papers/ntn-sim-core/src/viz/overlays/ValidationProbe.tsx:33>))
- `scripts/validate-visual-browser.ts`
- `validate:visual-browser`
- `validate:runtime`
- `validate:stage`
- `validate:modqn:bundle`
- `validate:modqn:bundle-ui`

Operational rule:

- take a baseline hash of `src/viz/validation/store.ts` before Phase 1
- if the hash changes during a pure shell/data-layer split, stop and explain
  why

## 6. Summary

Phase 1 may rearrange *who owns the code* that publishes `runtime`,
`orbitParity`, `snapshotBeamTruth`, and `beamPresentationFrame`.

Phase 1 may **not**:

- change section keys,
- change payload shape,
- change the validation-store global surface,
- relocate the four overlay/self-published sections,
- or require selector changes in `ValidationProbe` / browser validators.
