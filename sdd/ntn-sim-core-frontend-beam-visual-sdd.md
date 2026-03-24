# NTN Sim Core — Frontend Beam Visual SDD

**Version:** 0.1.0  
**Date:** 2026-03-24  
**Status:** Active Companion Spec

---

## 1. Purpose

This document defines the normative frontend beam-rendering contract for `ntn-sim-core`.

It exists because the core/runtime SDD alone is not sufficient to guarantee that:

1. the frontend actually renders research-relevant beam behavior;
2. placeholder beam graphics are not mistaken for completed delivery;
3. `earth-moving` and `earth-fixed / BH-slot` beam semantics are rendered with the correct visual language.

---

## 2. Scope

This document governs frontend rendering for:

1. `earth-moving` multibeam access / handover scenarios;
2. `earth-fixed / BH-slot` beam-hopping scenarios;
3. synthetic showcase playback;
4. real-trace showcase playback once replay is wired.

It does not redefine simulation truth. It defines how simulation truth must be presented.

---

## 3. Why the Previous SDD Was Not Enough

The earlier SDD set correctly established:

1. core / viz separation;
2. trace-first governance;
3. donor strategy;
4. multi-beam and BH research direction.

But it did not make high-quality frontend beam rendering a hard closure artifact.

As a result:

1. a schematic beam placeholder could remain in the tree;
2. phase closure could be interpreted from runtime progress alone;
3. frontend beam quality could drift behind research/runtime maturity.

This companion SDD closes that gap.

---

## 4. Non-Negotiable Rules

1. A fixed 7-beam decorative layer must not satisfy closure for profiles whose truth beam count is not 7.
2. A single center cone plus decorative discs must not satisfy multibeam closure.
3. Beam rendering must be snapshot-driven or trace-driven, not hard-coded from local visual constants.
4. `earth-moving` and `earth-fixed / BH-slot` modes must use different renderers or different explicit rendering contracts.
5. Beam role and service state must be visible without reading logs:
   - serving
   - target / prepared
   - post-HO or recent source
   - active but non-serving
   - inactive / off-slot
   - interfered / blocked where applicable
6. Visual-only styling may simplify material appearance, but not beam count, beam role, or mode semantics.
7. Any renderer marked `VISUAL-ONLY schematic` is a temporary layer and cannot be used as phase-complete evidence.

---

## 5. Target Visual Outcome

### 5.1 Earth-Moving Multibeam

The final access / handover presentation should read closest to:

1. `beamHO-bench` observer-sky motion semantics for satellite pass readability;
2. `leo-beam-sim` multibeam cone rendering and beam-role emphasis.

Expected traits:

1. multiple beam cones visible from a satellite to distinct ground targets;
2. beam count follows profile truth or an explicitly documented visual subset rule;
3. serving and target beams are visually distinguishable;
4. active / inactive beam state is visible;
5. beam visuals remain aligned with the same serving / target / event state used by KPI logic.

### 5.2 Earth-Fixed / Beam-Hopping

The final BH presentation should read closest to:

1. `leo-simulator` earth-fixed cell grid semantics;
2. `beamHO-bench` truth-first service-state overlays.

Expected traits:

1. cells remain fixed on the ground while satellites move;
2. active service cells differ from inactive cells;
3. interfered cells differ from served cells;
4. energy-blocked and inactive-beam states are not visually conflated.

---

## 6. Required Renderer Families

### 6.1 Earth-Moving Beam Renderer

Required target:

1. `src/viz/beam/EarthMovingBeamLayer.tsx`

Responsibilities:

1. render per-satellite beam geometry from simulation truth;
2. render serving / prepared / secondary / post-HO roles;
3. render beam activity state;
4. support at least the `case9-access-baseline` and `hobs-multibeam-baseline` families.

### 6.2 Earth-Fixed Cell Renderer

Required target:

1. `src/viz/beam/EarthFixedCellLayer.tsx`

Responsibilities:

1. render fixed cell grid for `bh-resource-baseline`;
2. show scheduler truth, not decorative animation;
3. expose service / interference / energy-blocked distinctions.

### 6.3 Temporary Renderer Policy

The current placeholder-style layer may remain only if all of the following are true:

1. it is explicitly labeled temporary;
2. it is not used as phase-closure evidence;
3. it is not described as research-grade beam visualization;
4. it is not the only beam layer shipped for a completed phase.

---

## 7. Frontend Data Contract

Frontend beam renderers must not infer missing truth from scene-local heuristics.

The beam visualization path must receive enough typed state to render:

1. `satId`
2. `beamId`
3. beam mode:
   - `earth-moving`
   - `earth-fixed`
4. role:
   - `serving`
   - `prepared`
   - `secondary`
   - `post-ho`
   - `neutral`
5. active state / off-slot state
6. anchor geometry:
   - actual ground target / cell center, or
   - explicitly documented visual projection from truth geometry
7. optional explainers:
   - SINR
   - interference flag
   - energy-blocked flag

If this contract is missing, the phase is not visually complete even if the core formula path exists.

---

## 8. Donor Strategy

### 8.1 Primary Donors

1. `leo-beam-sim`
   - `src/viz/SatelliteBeams.tsx`
   - `src/scene/useBeamViz.ts`
   - main donor for `earth-moving` multibeam presentation
2. `leo-simulator`
   - `src/features/beam-hopping/components/EarthFixedCells.tsx`
   - main donor for `earth-fixed / BH-slot` cell rendering
3. `beamHO-bench`
   - observer-sky readability rules
   - pass continuity rules
   - final visual acceptance discipline

### 8.2 Non-Primary Donors

1. `leo-simulator` is not the primary donor for moving multibeam access rendering.
2. `ntn-stack` is not a frontend beam renderer donor; it is a pipeline and preprocessing reference.

---

## 9. Phase Closure Mapping

### Phase 3 Closure

Phase 3 is not visually complete unless:

1. the schematic placeholder is replaced or clearly demoted;
2. `earth-moving` beam rendering is driven by real beam truth;
3. the frontend can show serving, target, and inactive beam semantics in one run.

### Phase 4 Closure

Phase 4 is not visually complete unless:

1. replay uses the same beam renderer family as synthetic mode;
2. real-trace windows reproduce the same event timing in the frontend;
3. no separate simplified visual-only replay beam logic exists.

### Phase 5 Closure

Phase 5 is not visually complete unless:

1. `earth-fixed / BH-slot` cell rendering exists;
2. scheduler truth and service truth are both visible;
3. inactive-beam and energy-blocked outcomes are visually distinct.

---

## 10. Required Evidence

Closure for beam/frontend work requires:

1. code and typed contracts;
2. updated roadmap / validation / status sync;
3. browser-visible evidence for each affected mode;
4. explicit note of which donor pattern was used.

Required evidence families:

1. `case9-access-baseline` screenshot pack
2. `hobs-multibeam-baseline` screenshot pack
3. `bh-resource-baseline` screenshot pack once Phase 5 visual path lands
4. `real-trace-validation` screenshot pack once replay is wired

---

## 11. Completion Rule

No phase that claims multibeam frontend completion may close against:

1. a fixed 7-beam placeholder;
2. a single-cone-only visual;
3. a dome-relative decorative beam pattern with no truth mapping;
4. a renderer that cannot distinguish moving-beam vs earth-fixed semantics.

---

## 12. Implementation Checklist (2026-03-25)

Consolidated frontend work items. Each maps to a phase closure requirement above and a core runtime dependency that is already satisfied.

### 12.1 Phase 3 Visual: Earth-Moving Beam Renderer (MS3)

| Step | Task | Donor | Core Dependency | Status |
|---|---|---|---|---|
| 3V-1 | Create `src/viz/beam/EarthMovingBeamLayer.tsx` | `leo-beam-sim` `SatelliteBeams.tsx` | `BeamSelectionResult` from engine snapshot | ❌ not started |
| 3V-2 | Per-satellite multi-cone rendering (profile beam count, not fixed 7) | `leo-beam-sim` geometry-pattern | `SatelliteBeamLayout.beams[]` | ❌ not started |
| 3V-3 | Beam role styling: serving / prepared / secondary / post-HO / inactive | `beamHO-bench` state-semantics | `HandoverManagerState.serving`, `pendingTarget` | ❌ not started |
| 3V-4 | Active/inactive beam distinction based on BH slot (when applicable) | `leo-beam-sim` | `BhSlotDecision.activeBeamsPerSat` | ❌ not started |
| 3V-5 | Replace or demote current `BeamFootprintLayer` schematic placeholder | — | — | ❌ not started |
| 3V-6 | Browser screenshot: `case9-access-baseline` | — | golden-case-engine passing | ❌ not started |
| 3V-7 | Browser screenshot: `hobs-multibeam-baseline` | — | golden-case-engine passing | ❌ not started |

### 12.2 Phase 4 Visual: TLE Frontend + Replay (Finding #1 + #2)

| Step | Task | Donor | Core Dependency | Status |
|---|---|---|---|---|
| 4V-1 | Wire `useSimulation.ts` to build TLE constellation when `orbitMode === 'real-trace'` | `ntn-stack` pipeline pattern | `tle-loader.ts`, `sgp4-adapter.ts` (exist) | ❌ not started |
| 4V-2 | Frontend loads OMM JSON from `profile.tleDataPath` or bundled fixture | — | `fixtures/starlink-shell1-50.json` (exists) | ❌ not started |
| 4V-3 | Implement `replay/controller.ts` — store benchmark run snapshots, replay by tick | `leo-simulator` replay-discipline | engine `doTick()` returns `SimulationSnapshot` | ❌ not started |
| 4V-4 | Replay uses same beam renderer as live synthetic mode (§9 Phase 4 closure rule) | `beamHO-bench` replay-discipline | — | ❌ not started |
| 4V-5 | Browser screenshot: `real-trace-validation` with TLE satellites | — | headless TLE path wired (done 2026-03-25) | ❌ not started |

### 12.3 Phase 5 Visual: Earth-Fixed Cell Grid (MS4)

| Step | Task | Donor | Core Dependency | Status |
|---|---|---|---|---|
| 5V-1 | Create `src/viz/beam/EarthFixedCellLayer.tsx` | `leo-simulator` `EarthFixedCells.tsx` | `SatelliteBeamLayout` with FRF coloring | ❌ not started |
| 5V-2 | Cells fixed on ground while satellites move | `leo-simulator` geometry-pattern | observer lat/lon + beam layout | ❌ not started |
| 5V-3 | Service state from scheduler truth: served / inactive / interfered / energy-blocked | `beamHO-bench` state-semantics | `BhSlotDecision`, `EnergyLayer2State.isEnergyBlocked` | ❌ not started |
| 5V-4 | Visual distinction for 4 loss causes: no coverage / inactive beam / interference / energy block | acceptance §3 requirement | KPI accumulator + energy manager | ❌ not started |
| 5V-5 | Browser screenshot: `bh-resource-baseline` | — | headless BH baseline passing | ❌ not started |

### 12.4 Phase 6 Visual: DAPS Replay Verification

| Step | Task | Donor | Core Dependency | Status |
|---|---|---|---|---|
| 6V-1 | Replay snapshots preserve `DapsState.sourceServing` + `targetServing` during dual-active phase | `beamHO-bench` replay-discipline | `daps.ts` DapsState (exists) | ❌ not started |
| 6V-2 | Beam renderer shows both source and target beams active simultaneously during DAPS dual-active | `leo-beam-sim` state-semantics | `DapsState.dapsPhase === 'dual-active'` | ❌ not started |
| 6V-3 | Path-switch moment visually transitions from dual-active to single-active target | — | `DapsState.dapsPhase` transition | ❌ not started |
| 6V-4 | Browser screenshot: DAPS A/B comparison (baseline vs DAPS) showing dual-active phase | — | headless DAPS comparison passing (exists in `benchmark-runner.ts`) | ❌ not started |

Prerequisite: 4V-3 (replay controller) must be completed first.

### 12.5 Cross-Cutting

| Step | Task | Status |
|---|---|---|
| XV-1 | Register 3 frontend SDD docs in `sdd/README.md` and `implementation-status.md` | ❌ not started |
| XV-2 | Add `VAL-VIZ-002` (beam renderer is snapshot-driven, not hardcoded) to validation-matrix.md | ❌ not started |
| XV-3 | Demote `BeamFootprintLayer` to `VISUAL-ONLY-DEPRECATED` once replacement lands | ❌ not started |

### 12.6 Prerequisites from Core (all satisfied)

| Prerequisite | Status | Where |
|---|---|---|
| Per-satellite beam selection result with beamId, reuseGroup, offAxisAngle | ✅ | `engine.ts` Phase 3 path |
| Handover state: serving, pendingTarget, phase | ✅ | `HandoverManagerState` |
| BH slot decision: activeBeamsPerSat | ✅ | `BhScheduler.getSlotDecision()` |
| Energy L2 state: isEnergyBlocked | ✅ | `EnergyLayer2Manager.isBlocked()` |
| Multi-UE positions | ✅ | `ue/position-generator.ts` |
| TLE → OrbitElement pipeline | ✅ | `tle-loader.ts` + `sgp4-adapter.ts` |
| Beam layout with FRF coloring | ✅ | `beam/layout.ts` |
| DAPS dual-active state: sourceServing, targetServing, dapsPhase | ✅ | `daps.ts` DapsState |
