# MODQN Bundle Replay UI SDD (Phase 03A Slices C + D)

**Status:** Active consumer authority for the Phase 03A bundle replay UI path.  
**Date:** 2026-04-14  
**Depends on:**
1. `sdd/modqn-bundle-replay-consumer-sdd.md`
2. `modqn-paper-reproduction/docs/phases/phase-03a-ntn-sim-core-bundle-replay-integration-sdd.md`
3. `sdd/downstream-runtime-architecture-sdd.md`
4. `sdd/ntn-sim-core-ui-exposure-spec.md`
5. `sdd/ntn-sim-core-frontend-beam-visual-sdd.md`

## 1. Purpose

This document promotes the already-confirmed Phase 03A bundle replay scope
into an active `ntn-sim-core` consumer authority for:

1. Slice C: native-vs-bundle truth-source switching plus replay controls
2. Slice D: bundle metadata / assumptions / provenance presentation

It does **not** reopen trainer/runtime architecture and it does **not**
replace the producer-side Phase 03A SDD. The producer remains the authority
for bundle contents; this SDD governs how the current UI consumes that
bundle truth.

## 2. Non-Negotiable Boundary Rules

1. `modqn-paper-reproduction` remains the producer / truth source.
2. `ntn-sim-core` bundle mode MUST consume `loadModqnReplayBundle(...)`
   output; it must not import Python code, trainer internals, or native
   handover logic.
3. The UI mode switch MUST change the active truth source, not only the
   labels:
   - `native-live`
   - `native-replay`
   - `modqn-bundle`
4. In `modqn-bundle` mode, the UI MUST NOT:
   - apply native HO overrides,
   - use native profile defaults as the primary metadata surface,
   - recompute serving / handover truth from native runtime paths.
5. Bundle replay may derive **display projections** from exported geometry
   (for example azimuth/elevation/range or beam-offset projection) when that
   projection is a deterministic view-only transform over bundle-provided
   coordinates. It MUST NOT invent missing serving, beam-center, candidate,
   or handover truth.
6. If the bundle lacks required replay truth, load MUST fail loudly through
   the Slice B adapter; UI code must not patch the bundle on the fly.

## 3. Layer Placement

### 3.1 Adapter

`src/adapters/modqn-bundle/` remains the only cross-repo contract seam and
continues to own:

1. bundle loading
2. schema/version guards
3. raw frame grouping

### 3.2 View-Model

`src/viz/view-models/` owns the bundle-to-UI projection surface:

1. convert `ModqnReplayFrame` into display-facing structures
2. project bundle frames into `SimulationSnapshot`-compatible truth for the
   existing beam/link renderer family
3. project assumptions / provenance / training-eval summaries into bundle UI
   sections

This view-model layer may perform deterministic display-only projection from
bundle geometry, but it must not recompute policy or handover truth.

### 3.3 Hook / Scene Orchestration

`src/app/hooks/` and `SceneShell.tsx` own:

1. loading the fixed sample bundle entry
2. bundle replay playback state
3. mode switching and slot stepping controls
4. selecting the right overlay/panel set for each truth source

## 4. UI Truth Modes

## 4.1 `native-live`

Uses the existing `useSimulation()` runtime path.

## 4.2 `native-replay`

Uses the existing `useReplay()` deterministic replay path over native
`ntn-sim-core` artifacts.

## 4.3 `modqn-bundle`

Uses the producer bundle loaded through Slice B:

1. sample source: `fixtures/sample-bundle-v1/`
2. load path: bundled browser asset import into an in-memory file reader
3. replay state: slot-by-slot stepping over bundle frames
4. rendering truth: bundle-selected serving beams, bundle geometry, bundle
   handover events, bundle metadata panels
5. replay completeness guard: bundle replay presentation MUST reject a bundle
   that lacks `manifest.coordinateFrame.groundPoint`; the consumer may not
   guess the local-tangent anchor from free-text axis descriptions

No native HO override, no native parameter panel, and no native replay
selection metadata may be presented as the primary truth surface in this
mode.

### 4.3.1 Baseline Compact Mode

The demo-facing default surface for `modqn-bundle` is a persistent compact
consumer panel rather than the native HUD or the full disclosure panel.

That compact panel must stay visibly distinct from native runtime mode and
must expose at least:

1. `Truth Source: MODQN Bundle`
2. `Paper / Run / Checkpoint`
3. `Source Label`
4. `Current Slot / Total Slots`
5. `Replay Truth Mode`
6. `Serving Satellite`
7. `Primary SINR`
8. `Cumulative Handovers`
9. a concise provenance / assumptions summary

The compact panel exists to answer three demo questions immediately:

1. is the frontend currently reading `modqn-bundle` truth or native truth,
2. which serving satellite is active right now, and
3. whether the displayed service / handover state comes from bundle replay
   rather than frontend-side recomputation.

If the producer bundle does not export serving SINR for the active slot, the
consumer must disclose that explicitly instead of synthesizing a value.

## 5. Slice C Requirements

Slice C lands only when all of the following are true:

1. the control surface exposes an explicit native-vs-bundle mode switch
2. bundle mode drives a distinct data path from the Slice B adapter
3. bundle replay supports slot stepping controls (`prev`, `next`, current
   slot index)
4. satellites / beams / serving links are rendered from bundle truth
5. a handover slot displays the bundle handover transition rather than a
   native recomputation
6. leaving bundle mode restores the user's prior native overlay selections;
   the mode switch must change truth source without permanently mutating
   native-only panel choices

### 5.1 Existing Renderer Reuse Rule

The current beam/link renderer family may be reused in bundle mode only if:

1. the view-model projection is explicit and documented,
2. every displayed serving / post-handover state comes from the bundle, and
3. the projection does not fabricate prepared / dual-active truth that the
   bundle did not export.

## 6. Slice D Requirements

Slice D lands only when bundle mode exposes all of the following clearly:

1. assumptions panel
2. provenance panel
3. training/eval summary panel
4. explicit `reproduction-assumption` labeling
5. clear separation from native simulator defaults

### 6.1 Metadata Surface Rule

In `modqn-bundle` mode the default metadata surface is the bundle panel, not
the native parameter panel. If the native profile parameter panel remains
available elsewhere, it must not appear as the primary explanatory surface
for bundle truth.

For the demo-facing compact mode specifically:

1. the native parameter panel stays hidden by default,
2. the native baseline result panel stays hidden by default,
3. HO override controls stay hidden by default,
4. large analysis panels such as SINR time series / CDF / elevation scatter
   stay hidden by default, and
5. detailed assumptions / provenance / training-eval disclosure remains
   available behind an explicit secondary toggle rather than occupying the
   primary first-screen surface.

### 6.2 Provenance Rule

The provenance panel must surface at least:

1. the producer classification legend
2. fields tagged `reproduction-assumption`
3. fields tagged `platform-visualization-only`
4. training/eval summaries as `artifact-derived`

The UI must not relabel any of those categories as `Realistic` native
defaults.

## 7. Validation

This UI landing introduces `VAL-MODQN-BUNDLE-002` with the following
sections:

1. `VAL-MODQN-BUNDLE-002A`
   - bundle sample load for the browser-consumable entry path
   - explicit rejection of replay-incomplete bundles missing
     `manifest.coordinateFrame.groundPoint`
2. `VAL-MODQN-BUNDLE-002B`
   - frame-to-snapshot projection preserves bundle serving / handover truth
3. `VAL-MODQN-BUNDLE-002C`
   - bundle replay controller / stepping semantics
   - validation probe / shared renderer truth matches exported slot truth
4. `VAL-MODQN-BUNDLE-002D`
   - metadata projection keeps `reproduction-assumption` visible and
     distinct from native defaults

Script: `npm run validate:modqn:bundle-ui`

Once this gate lands, `validate:stage` should include it because the bundle
adapter is no longer a consumer-only library; it is now wired into an active
UI path.

Browser-visible smoke validation should also verify that:

1. switching to `modqn-bundle` changes the truth source,
2. slot stepping changes the rendered serving/beam path, and
3. the compact panel is the default first-screen bundle surface,
4. the full disclosure panel shows `reproduction-assumption` wording when
   explicitly opened, and
5. switching back to native mode restores native-only panel state.

## 8. Completion Boundary

Phase 03A Slices C + D are complete in `ntn-sim-core` only when:

1. `modqn-bundle` mode is user-visible
2. the first slot-accurate serving/handover replay is rendered from the
   bundle sample
3. native and bundle truth sources are visibly distinct
4. assumptions / provenance / training-eval metadata are attached to the
   bundle replay
5. the new UI validation gate passes
