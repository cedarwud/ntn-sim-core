# NTN Sim Core — Frontend Beam Visual SDD

**Version:** 0.3.4  
**Date:** 2026-04-16  
**Status:** Active Companion Spec — current frontend beam/overlay package landed for the present SDD set, including the shared presentation-frame/showcase readability slice and centralized continuity narrative state

---

## 1. Purpose

This document defines the normative frontend beam-rendering contract for `ntn-sim-core`.

It exists because the core/runtime SDD alone is not sufficient to guarantee that:

1. the frontend actually renders research-relevant beam behavior;
2. placeholder beam graphics are not mistaken for completed delivery;
3. `earth-moving` and `earth-fixed / BH-slot` beam semantics are rendered with the correct visual language.
4. explainability overlays remain truth-driven and never become a second unofficial simulator in the browser.

---

## 2. Scope

This document governs frontend rendering for:

1. `earth-moving` multibeam access / handover scenarios;
2. `earth-fixed / BH-slot` beam-hopping scenarios;
3. synthetic showcase playback;
4. real-trace showcase playback once replay is wired.
5. truth-driven visual explainers such as beam/SINR overlays and handover/service links.

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
8. Any SINR, beam label, or service-loss overlay must read from `SimulationSnapshot` / replay truth, not from frontend-side recomputation.
9. Any handover/service link overlay must read from snapshot/trace truth and must not invent intermediate states that do not exist in the engine or event log.
10. Benchmark and paper claims remain anchored to headless/exported artifacts; overlays are evidence and explainers, not authoritative result generators.
11. The first landing does not permit frontend-only beam fake re-centering onto
    the UE; earth-moving beam ground targets must stay on the truth geometry
    path unless a future explicitly disclosed visual-projection contract
    supersedes this rule.
12. Presentation cleanup may introduce a shared continuity narrative state,
    but that state must remain a consumer-side reading aid over published
    truth rather than a second handover algorithm.

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
6. beam-facing explainers such as SINR labels or bands are truth-driven and visually readable where enabled;
7. handover/service links can show serving, prepared/target, post-HO, or dual-active continuity states when those runtime states exist.

### 5.2 Earth-Fixed / Beam-Hopping

The final BH presentation should read closest to:

1. `leo-simulator` earth-fixed cell grid semantics;
2. `beamHO-bench` truth-first service-state overlays.

Expected traits:

1. cells remain fixed on the ground while satellites move;
2. active service cells differ from inactive cells;
3. interfered cells differ from served cells;
4. energy-blocked and inactive-beam states are not visually conflated.
5. any service-loss explainer remains tied to scheduler/energy/interference truth, not scene-local heuristics.

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
3. expose service / interference / energy-blocked distinctions;
4. when a shared `BeamPresentationFrame` is active, consume the same frame-level
   primary/context beam picks as `EarthMovingBeamLayer` rather than silently
   reopening raw per-satellite beam analysis.

### 6.3 Beam Information Overlay

Required target:

1. `src/viz/overlays/BeamInfoOverlay.tsx`

Responsibilities:

1. render truth-driven beam/SINR explainers for access and multibeam profiles;
2. display beam-facing labels, SINR values, SINR bands, or equivalent explainers without recomputing channel state in the frontend;
3. reuse the same snapshot fields in live and replay paths.

### 6.4 Handover Link Overlay

Required target:

1. `src/viz/overlays/HandoverLinkOverlay.tsx`

Responsibilities:

1. render truth-driven UE↔satellite or service-path links for serving / prepared / post-HO / secondary / dual-active states;
2. visually distinguish continuity mechanisms without inventing unsupported phases;
3. support at least access handover baselines and the DAPS/DC-like family.

### 6.5 Temporary Renderer Policy

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
3. `ueId` when the view is UE-anchored
4. beam mode:
   - `earth-moving`
   - `earth-fixed`
5. role:
   - `serving`
   - `prepared`
   - `secondary`
   - `post-ho`
   - `neutral`
6. active state / off-slot state
7. anchor geometry:
   - actual ground target / cell center, or
   - explicitly documented visual projection from truth geometry
8. optional explainers:
   - SINR
   - interference flag
   - energy-blocked flag
9. optional continuity state:
   - serving / prepared / post-ho / secondary / dual-active
10. optional link endpoints:
   - UE anchor
   - serving satellite
   - target/secondary satellite

If this contract is missing, the phase is not visually complete even if the core formula path exists.

### 7.1 Overlay Authority Policy

1. `BeamInfoOverlay` and `HandoverLinkOverlay` are `visual-only` but must be `truth-driven`.

### 7.2 Truth vs Presentation Split

Frontend handover readability now follows an explicit split:

1. truth comes only from:
   - native runtime `SimulationSnapshot`, or
   - bundle-projected `SimulationSnapshot` from the MODQN consumer path
2. presentation comes from shared consumer-side contracts such as:
   - `BeamPresentationFrame`
   - `ContinuityNarrativeState`

The presentation layer may:

1. hold very short truthful prepared / dual-active / post-switch states long
   enough to remain readable,
2. keep serving / target / post-HO markers, links, and beam accents aligned
   to one shared narrative frame, and
3. suppress immediate post-switch visual ping-pong back toward the recent
   source satellite during the presentation cooldown window.

The presentation layer must not:

1. recompute SINR,
2. invent serving or target satellites that were never published, or
3. rewrite the engine's handover decision semantics.
2. They may map engine values into labels, colors, bands, and line styles.
3. They must not:
   - recompute SINR or HO decisions as an alternate authoritative path;
   - override engine state for readability;
   - create paper-facing numbers that are unavailable in headless artifacts.

### 7.2 Shared Presentation Frame

The current frontend package now requires a shared intermediate presentation
model between `SimulationSnapshot` truth and the final render layers.

Required target:

1. `src/viz/presentation/beam-presentation-frame.ts`
2. `src/viz/presentation/useBeamPresentationFrame.ts`

Responsibilities:

1. compute one truth-driven `BeamPresentationFrame` per scene update
2. own:
   - `displaySatIds`
   - `eventSatIds`
   - `beamSatIds`
   - `primaryBeamBySatId`
   - `contextBeamIdsBySatId`
   - `markerRoleBySatId`
   - `beamRoleAccentByBeamId`
   - `focusMode`
3. ensure `SatelliteSkyLayer`, `EarthMovingBeamLayer`, `EarthFixedCellLayer`,
   `BeamInfoOverlay`, and `HandoverLinkOverlay` consume the same scene grammar
   rather than each re-deriving its own satellite/beam heuristics
4. ensure BH cell analysis follows the same frame-level beam picks as the
   moving-beam renderer unless an explicit documented exception says otherwise
5. keep the scene readable without changing authoritative SINR, HO, or
   bounded-steering outcomes

---

## 8. Donor Strategy

### 8.1 Primary Donors

1. `leo-beam-sim`
   - `src/viz/SatelliteBeams.tsx`
   - `src/scene/useBeamViz.ts`
   - `src/viz/SinrOverlay.tsx`
   - `src/viz/HandoverLinks.tsx`
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
4. a truth-driven beam/SINR explainer exists for access or multibeam runs without frontend-side SINR recomputation;
5. a truth-driven handover/service link overlay exists for access handover states.

### Phase 4 Closure

Phase 4 is not visually complete unless:

1. replay uses the same beam renderer family as synthetic mode;
2. real-trace windows reproduce the same event timing in the frontend;
3. no separate simplified visual-only replay beam logic exists.
4. replay-facing overlays and handover links reuse the same truth fields as live mode.

### Phase 5 Closure

Phase 5 is not visually complete unless:

1. `earth-fixed / BH-slot` cell rendering exists;
2. scheduler truth and service truth are both visible;
3. inactive-beam and energy-blocked outcomes are visually distinct.

### Phase 6 Closure

Phase 6 is not visually complete unless:

1. DAPS/DC-like dual-active continuity is readable in the frontend;
2. continuity links or equivalent path explainers distinguish source, target, and dual-active semantics;
3. no DAPS-specific overlay invents state that is absent from the replay/snapshot truth;
4. first-screen readability work uses an explicit showcase/profile split or a
   comparably explicit curated window instead of silently rewriting the
   benchmark-facing baseline.

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
5. overlay/link proof for one access handover run and one DAPS/DC-like run

---

## 11. Completion Rule

No phase that claims multibeam frontend completion may close against:

1. a fixed 7-beam placeholder;
2. a single-cone-only visual;
3. a dome-relative decorative beam pattern with no truth mapping;
4. a renderer that cannot distinguish moving-beam vs earth-fixed semantics.
5. a SINR or beam info overlay that recomputes values outside the engine/trace path.
6. a handover link overlay that invents states not present in snapshot/event truth.

---

## 12. Implementation Checklist (2026-03-25)

Consolidated frontend work items. Each maps to a phase closure requirement above and a core runtime dependency that is already satisfied.

### 12.1 Phase 3 Visual: Earth-Moving Beam Renderer (MS3)

| Step | Task | Donor | Core Dependency | Status |
|---|---|---|---|---|
| 3V-1 | Create `src/viz/beam/EarthMovingBeamLayer.tsx` | `leo-beam-sim` `SatelliteBeams.tsx` | `SatelliteBeamSnapshot` from engine snapshot | ✅ done (2026-03-25) |
| 3V-2 | Per-satellite multi-cone rendering (profile beam count, not fixed 7) | `leo-beam-sim` geometry-pattern | `SatelliteBeamLayout.beams[]` | ✅ done (2026-03-25) |
| 3V-3 | Beam role styling: serving / prepared / secondary / post-HO / inactive | `beamHO-bench` state-semantics | `HandoverManagerState.serving`, `pendingTarget` | ✅ done (2026-03-25) — serving / prepared / secondary / inactive are snapshot-driven; `post-ho` remains conditional on runtime truth exposure |
| 3V-4 | Active/inactive beam distinction based on BH slot (when applicable) | `leo-beam-sim` | `BhSlotDecision.activeBeamsPerSat` | ✅ done (2026-03-25) — `isActive` from engine |
| 3V-5 | Replace or demote current `BeamFootprintLayer` schematic placeholder | — | — | ✅ done (2026-03-25) — deleted from codebase (was deprecated, now removed) |
| 3V-6 | Browser screenshot: `case9-access-baseline` | — | golden-case-engine passing | ✅ done (2026-03-25) — `screenshots/case9-access-baseline.png` |
| 3V-7 | Browser screenshot: `hobs-multibeam-baseline` | — | golden-case-engine passing | ✅ done (2026-03-25) — `screenshots/hobs-multibeam-baseline.png`, green serving cone visible |

### 12.2 Phase 4 Visual: TLE Frontend + Replay (Finding #1 + #2)

| Step | Task | Donor | Core Dependency | Status |
|---|---|---|---|---|
| 4V-1 | Wire `useSimulation.ts` to build TLE constellation when `orbitMode === 'real-trace'` | `ntn-stack` pipeline pattern | `tle-loader.ts`, `sgp4-adapter.ts` (exist) | ✅ done (2026-03-25) |
| 4V-2 | Frontend loads OMM JSON from `profile.tleDataPath` or bundled fixture | — | `fixtures/starlink-shell1-50.json` → `public/fixtures/` | ✅ done (2026-03-25) |
| 4V-3 | Implement `replay/controller.ts` — store benchmark run snapshots, replay by tick | `leo-simulator` replay-discipline | `recordWindow()` + `createSnapshotReplayController()` + deterministic `useReplay` hook | ✅ done (2026-03-25) — replay artifacts persist curated-window snapshots + replay identity; frontend replay hydrates from the artifact-backed contract |
| 4V-4 | Replay uses same beam renderer as live synthetic mode (§9 Phase 4 closure rule) | `beamHO-bench` replay-discipline | `ReplayLayer` uses same `EarthMovingBeamLayer` | ✅ done (2026-03-25) |
| 4V-5 | Browser screenshot: `real-trace-validation` with TLE satellites | — | headless TLE path wired (done 2026-03-25) | ✅ done (2026-03-25) — replay-manifest + replay-artifact integration is validated end-to-end |

### 12.3 Phase 5 Visual: Earth-Fixed Cell Grid (MS4)

| Step | Task | Donor | Core Dependency | Status |
|---|---|---|---|---|
| 5V-1 | Create `src/viz/beam/EarthFixedCellLayer.tsx` | `leo-simulator` `EarthFixedCells.tsx` | `BhSlotSnapshot` in SimulationSnapshot | ✅ done (2026-03-25) |
| 5V-2 | Cells fixed on ground while satellites move | `leo-simulator` geometry-pattern | fixed hex grid, coverage from beam offsets | ✅ done (2026-03-25) |
| 5V-3 | Service state from scheduler truth: served / inactive | `beamHO-bench` state-semantics | `BhSlotSnapshot.activeBeamsBySat` | ✅ done (2026-03-25) — served(blue)/unserved(gray) |
| 5V-4 | Visual distinction for 4 loss causes | acceptance §3 requirement | 4 states implemented: served(blue)/interfered(yellow)/energyBlocked(orange)/unserved(gray); `BhSlotSnapshot.energyBlockedSats[]` from engine `energyL2Manager`; FRF collision detection in cell coverage loop; deterministic `bh-resource-energy-proof` and `BhExplainabilityPanel` provide browser-proof closure | ✅ done (2026-03-25) |
| 5V-5 | Browser screenshot: `bh-resource-baseline` | — | headless BH baseline passing | ✅ done (2026-03-25) — deterministic `bh-resource-energy-proof` plus automated browser proof closes the energy-blocked evidence path |

### 12.4 Phase 6 Visual: DAPS Replay Verification

| Step | Task | Donor | Core Dependency | Status |
|---|---|---|---|---|
| 6V-1 | Replay snapshots preserve `DapsState.sourceServing` + `targetServing` during dual-active phase | `beamHO-bench` replay-discipline | `DapsSnapshot` in `SimulationSnapshot`, populated from `dapsPhase` | ✅ done (2026-03-25) |
| 6V-2 | Beam renderer shows both source and target beams active simultaneously during DAPS dual-active | `leo-beam-sim` state-semantics | `snapshot.daps.phase === 'dual-active'` → target beams rendered cyan at serving opacity | ✅ done (2026-03-25) |
| 6V-3 | Path-switch moment visually transitions from dual-active to single-active target | — | `DapsSnapshot.phase` drives `isDapsTarget` flag in `SatBeamGroup` — transitions naturally | ✅ done (2026-03-25) |
| 6V-4 | Browser screenshot: DAPS A/B comparison (baseline vs DAPS) showing dual-active phase | — | `case9-daps-baseline` profile added; dual-active visible in browser and now browser-validated in both live and replay | ✅ done (2026-03-25) |
| 6V-5 | Promote a truth-preserving first-screen showcase split without changing engine SINR / HO / bounded steering | — | shared `BeamPresentationFrame`, `case9-daps-showcase`, browser-visible readability gates | ✅ done (2026-04-15) |

Prerequisite: 4V-3 (replay controller) must be completed first.

### 12.5 Cross-Cutting

| Step | Task | Status |
|---|---|---|
| XV-1 | Register 3 frontend SDD docs in `sdd/README.md` and `implementation-status.md` | ✅ done (2026-03-25) — all 3 docs registered in README items 15–17 |
| XV-2 | Add `VAL-VIZ-002` plus frontend visual gates to validation-matrix.md | ✅ done (2026-03-25) |
| XV-3 | Demote `BeamFootprintLayer` to `VISUAL-ONLY-DEPRECATED` once replacement lands | ✅ done (2026-03-25) — file deleted from codebase |
| XV-4 | Land donor-backed `BeamInfoOverlay` with truth-driven SINR/beam explainers only | ✅ done (2026-03-25) — `BeamInfoOverlay.tsx`, SINR dB color-coded + role tag, wired LiveLayer + ReplayLayer |
| XV-5 | Land donor-backed `HandoverLinkOverlay` for serving / target / post-HO / dual-active continuity | ✅ done (2026-03-25) — `HandoverLinkOverlay.tsx`, truth-driven serving / prepared / secondary / dual-active link styles; `post-ho` remains contingent on runtime truth |
| XV-6 | Enforce replay parity so live/replay use the same overlay/link truth fields | ✅ done (2026-03-25) — both overlays wired into ReplayLayer with same snapshot path |
| XV-7 | Add browser-visible proof for overlay/link package and wire corresponding `VAL-FV-*` closure evidence | ✅ done (2026-04-15) — `validate-visual-browser.ts` now covers `VAL-FV-005`~`VAL-FV-010`; screenshots remain as supplementary proof |
| XV-8 | Extract a shared `BeamPresentationFrame` so sky/beam/BH/overlay layers stop diverging on scene grammar | ✅ done (2026-04-15) — `SceneShell` now builds one presentation frame and reuses it across markers, beams, BH cells, labels, and handover links |

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

### 12.7 Final Frontend Closure Items

The prior frontend closure program was compressed into the same 3 final project-level items recorded in the historical closure note:

`archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-final-closure-checklist.md`

| Closure Item | Frontend-specific meaning |
|---|---|
| `FC-1 Replay Closure` | ✅ closed (2026-03-25) — curated-window replay metadata persists in `replayArtifact`, frontend replay hydrates from the saved replay contract, and replay identity is verified end-to-end |
| `FC-2 Visual Validation and Tooling Closure` | ✅ closed (2026-03-25) — `validate-visual-browser.ts` automates the core `VAL-FV-*` browser evidence for the landed beam/overlay/link package |
| `FC-3 Phase 5/6 Proof Closure` | ✅ closed (2026-03-25) — deterministic BH proof + DAPS live/replay browser proof are now automated |
