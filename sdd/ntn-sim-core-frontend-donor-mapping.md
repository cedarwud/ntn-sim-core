# NTN Sim Core — Frontend Donor Mapping

**Version:** 0.2.0  
**Date:** 2026-03-25  
**Status:** Active Companion Map

---

## 1. Purpose

This document defines which existing project is the correct donor for each frontend visualization problem in `ntn-sim-core`.

It exists to prevent two failure modes:

1. using the wrong repo as the primary visual donor;
2. mixing incompatible visual languages across `earth-moving` and `earth-fixed / BH-slot` modes.

---

## 2. Primary Donor Roles

| Capability | Primary Donor | Why |
|---|---|---|
| observer-sky pass readability | `beamHO-bench` | strongest `rise -> pass -> set` semantics and visual acceptance discipline |
| earth-moving multibeam cones | `leo-beam-sim` | closest existing donor for satellite-to-ground multibeam rendering, role styling, and active/inactive beam emphasis |
| beam/SINR explainability overlays | `leo-beam-sim` | existing `SinrOverlay.tsx` and beam labels are the closest visual donor for truth-driven access/multibeam explainers |
| handover/service links | `leo-beam-sim` + `beamHO-bench` | `leo-beam-sim` provides direct visual language; `beamHO-bench` constrains truth-first timing/readability discipline |
| earth-fixed / BH-slot cell grid | `leo-simulator` | clearest donor for fixed ground-cell visualization and BH-oriented state presentation |
| replay-facing visual timing semantics | `beamHO-bench` + `leo-simulator` | `beamHO-bench` for truth-first replay discipline, `leo-simulator` for replay-oriented visual framing |
| preprocessing / pipeline inspiration | `ntn-stack` | useful for offline data flow, not a primary beam-rendering donor |

---

## 3. Target Module Ownership

### 3.1 `EarthMovingBeamLayer`

Primary donor:

1. `project/leo-beam-sim/src/viz/SatelliteBeams.tsx`
2. `project/leo-beam-sim/src/scene/useBeamViz.ts`

Required transferred ideas:

1. per-satellite multibeam rendering, not a fixed decorative footprint;
2. beam role styling for serving / prepared / secondary / post-HO;
3. satellite-to-ground beam anchoring with distinct ground targets;
4. active / inactive readability.

### 3.2 `EarthFixedCellLayer`

Primary donor:

1. `project/leo-simulator/src/features/beam-hopping/components/EarthFixedCells.tsx`

Required transferred ideas:

1. cells remain fixed on the ground while satellites move independently;
2. service state belongs to scheduler truth, not to decorative animation;
3. BH activity, interference, and blocked states are visually distinct.

### 3.3 Observer-Sky Motion Semantics

Primary donor:

1. `project/beamHO-bench`

Required transferred ideas:

1. pass readability anchored to observer-sky semantics;
2. visible set behaves like a physical pass, not a screen-space decoration list;
3. visual acceptance must use browser-visible evidence, not only scripts.

### 3.4 Replay / Showcase Binding

Primary donor family:

1. `project/beamHO-bench`
2. `project/leo-simulator`

Required transferred ideas:

1. replay uses stored truth, not separate visual-only beam logic;
2. showcase windows are curated deterministically;
3. replay preserves event timing semantics.

### 3.5 `BeamInfoOverlay`

Primary donor:

1. `project/leo-beam-sim/src/viz/SinrOverlay.tsx`
2. `project/leo-beam-sim/src/viz/SatelliteBeams.tsx`

Required transferred ideas:

1. beam-facing SINR or label explainers are readable without taking authority away from the engine;
2. overlay placement remains tied to beam geometry/truth rather than arbitrary HUD positions;
3. low-SINR and high-SINR states are visually distinguishable.

### 3.6 `HandoverLinkOverlay`

Primary donor:

1. `project/leo-beam-sim/src/viz/HandoverLinks.tsx`
2. `project/beamHO-bench`

Required transferred ideas:

1. link overlays express serving / prepared / post-HO / secondary / dual-active continuity states;
2. link timing follows truth/event sequencing rather than front-end interpolation tricks;
3. overlay readability comes from donor-backed styles, not from untraceable heuristics.

---

## 4. Non-Donor or Secondary Roles

1. `leo-simulator` is not the primary donor for moving multibeam access rendering.
2. `leo-beam-sim` is not the primary donor for earth-fixed BH cell grids.
3. `ntn-stack` is not a canonical frontend beam-rendering donor.
4. `beamHO-bench` is a visual-discipline donor and motion-semantics donor, not the main multibeam cone donor.
5. `leo-beam-sim` is the primary donor for access-style beam/SINR explainers and handover-link language, but not for real-trace replay governance.

---

## 5. Anti-Patterns

The following do not count as valid donor transfer:

1. keeping a fixed 7-beam placeholder and calling it `leo-beam-sim inspired`;
2. using earth-fixed hex cells to fake earth-moving multibeam access beams;
3. using moving-beam cones to fake BH cell scheduling;
4. collapsing the visible-above-horizon pool to only HO candidates for readability without explicit metadata and rationale;
5. citing `ntn-stack` as if it already provided the target frontend beam renderer.
6. implementing a frontend SINR overlay that recomputes channel outputs independently of `ntn-sim-core` snapshots.
7. implementing handover links that show states absent from the engine/event trace.

---

## 6. Transfer Classes

Each donor-backed frontend change should declare its transfer class:

1. `geometry-pattern`
2. `state-semantics`
3. `replay-discipline`
4. `acceptance-workflow`

At least one transfer class must be cited when landing:

1. `EarthMovingBeamLayer`
2. `EarthFixedCellLayer`
3. replay-facing visual work
4. frontend beam closure evidence
5. beam/SINR explainers
6. handover/service link overlays

---

## 7. Binding Relationship

This donor map is binding for:

1. `sdd/ntn-sim-core-frontend-beam-visual-sdd.md`
2. `sdd/ntn-sim-core-frontend-beam-visual-acceptance.md`
3. Phase 3, Phase 4, Phase 5, and Phase 6 closure in `sdd/ntn-sim-core-roadmap.md`

If a future change intentionally departs from these donors, that change must explain:

1. why the donor pattern is insufficient;
2. what new renderer contract replaces it;
3. how visual parity and acceptance will still be proven.

---

## 8. Implementation Reference

The step-by-step implementation checklist that references these donor assignments lives in `frontend-beam-visual-sdd.md` §12. Each step (3V-*, 4V-*, 5V-*, XV-*) declares its primary donor from this document.
