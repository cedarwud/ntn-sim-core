# NTN Sim Core — Frontend Leo-Parity Mode SDD

**Version:** 0.1.7  
**Date:** 2026-03-25  
**Status:** In Progress Companion — post-closure frontend parity enhancement (`Slice P1/P2` landed; dedicated parity renderer family + donor-style beam ownership + BH parity visuals + beam-centric overlay/link refinements landed; donor-like scene-density/BH-first parity pass landed)

---

## 1. Purpose

This document defines a narrow post-closure enhancement track for `ntn-sim-core`:

1. make the frontend presentation read much closer to `project/leo-beam-sim`;
2. keep the current `ntn-sim-core` physics, replay, validation, and artifact pipeline unchanged;
3. avoid reopening the already-closed academic SDD set just to improve presentation density and readability.

This is not a new simulator architecture. It is a new frontend presentation mode.

---

## 2. Relationship to the Current SDD Set

The current SDD set is already closed for:

1. research-grade core truth;
2. replay identity/parity;
3. browser-visible validation for the current explainability package.

This companion exists because frontend closure for the current SDD set does **not** imply:

1. visual parity with `project/leo-beam-sim`;
2. the same beam density and event emphasis as the donor;
3. the same per-beam label density and handover readability style as the donor.

This document therefore defines a new enhancement target without rewriting the academic baseline.

**Important**

1. this companion does not invalidate current closure;
2. this companion defines a new optional mode, not a retroactive blocker;
3. benchmark and paper claims remain owned by the existing core/runtime SDD and validation chain.

---

## 3. Delivery Form

The first implementation target is a new frontend presentation mode, not a router migration.

Preferred form:

1. `?view=leo-parity`, or
2. `?presenter=leo`, or
3. equivalent local mode flag in `SceneShell`.

Do **not** require:

1. a full React router migration before parity work starts;
2. a second simulation core;
3. a second replay pipeline.

The same `useSimulation` / `useReplay` truth path must feed both:

1. current research/default mode;
2. the new leo-parity mode.

### 3.1 User Entry

The first shipped entry must be on the existing page, not on a separate route.

Required:

1. a query-param entry such as:
   - `?view=default`
   - `?view=leo-parity`
2. a runtime toggle in the existing control surface, preferably in `ControlPanel`, so the user can switch between:
   - `Research / Default`
   - `Leo-Parity`

Recommended behavior:

1. query param determines initial mode on load;
2. the in-page toggle can switch mode without leaving the page;
3. the URL should remain shareable for screenshot/debug/browser-validation use.

Not required in the first parity pass:

1. React Router
2. a separate `/leo-parity` route
3. a separate HTML entrypoint

---

## 4. Non-Negotiable Rules

1. `leo-parity` mode must remain `truth-driven`.
2. It may change display density, label density, and event emphasis.
3. It must not change:
   - orbit truth,
   - channel truth,
   - handover truth,
   - KPI truth,
   - replay truth,
   - saved artifact identity.
4. No frontend-side recomputation may become authoritative.
5. Any donor-derived readability bias must remain:
   - deterministic,
   - documented,
   - clearly presentation-only.
6. `research/default` mode must remain available.
7. `leo-parity` mode must not silently become the benchmark/paper mode unless separately approved.

---

## 5. Donor Scope

Primary donor:

1. `project/leo-beam-sim`

Specifically:

1. `src/viz/SatelliteBeams.tsx`
2. `src/viz/SinrOverlay.tsx`
3. `src/viz/HandoverLinks.tsx`
4. `src/scene/useBeamViz.ts`

Secondary constraints:

1. `beamHO-bench` remains the reference for observer-sky readability discipline and non-fake presentation.
2. `leo-simulator` remains the donor for `earth-fixed / BH-slot` visual language where relevant.

Do not import donor assumptions for:

1. simplified path loss,
2. simplified fading,
3. simplified HO state semantics,
4. simplified replay/governance.

Only import donor ideas for presentation grammar and view composition.

---

## 6. Target Visual Delta

The gap to close is not "show beams at all". That is already done.

The gap is:

1. higher beam density per event satellite;
2. per-beam labels instead of satellite-level summary only;
3. stronger per-beam SINR readability;
4. stronger handover-event readability;
5. a clearer `display set / event set` presentation grammar.

The leo-parity mode should therefore move `ntn-sim-core` from:

1. truth-driven explainability

to:

2. truth-driven explainability **plus donor-like visual readability**.

---

## 7. Required Parity Targets

### 7.1 Beam Scene Density

The mode should render a donor-like event scene rather than only the minimum continuity-relevant set.

Required:

1. an explicit `display set`;
2. an explicit `event-emphasis set`;
3. more than one emphasized event satellite when truth geometry allows it;
4. multiple visible beams per emphasized satellite;
5. beam density that visually reads as multibeam service rather than sparse continuity markers.

### 7.2 Per-Beam Label Language

Required:

1. per-beam label placement along the beam path;
2. donor-like label density for serving and event-relevant beams;
3. role-specific label emphasis:
   - serving
   - prepared
   - secondary
   - post-ho
4. off-slot / inactive readability where applicable.

### 7.3 Per-Beam SINR Readability

Required:

1. beam-facing SINR labels for event-relevant beams;
2. donor-like color thresholds for readability;
3. values sourced from `SimulationSnapshot` truth only.

Not acceptable:

1. falling back to satellite-level summary only when per-beam truth already exists.

### 7.4 Handover Link Readability

Required:

1. serving link readability at donor-like visual prominence;
2. prepared / target readability when such states exist;
3. post-ho readability when such states exist;
4. dual-active readability in DAPS mode;
5. no invented state transitions.

### 7.5 Presentation Grammar

Required:

1. explicit separation of:
   - visible sky context
   - event-emphasis set
   - beam-emphasis set
2. deterministic presentation rules
3. no fake satellites, fake beams, or fake density.

---

## 8. Recommended Architecture

The new mode should be implemented by adding a presenter layer, not by hardcoding more conditions into the current renderer.

Recommended additions:

1. `src/viz/presenters/leo-parity-presenter.ts`
   - derives display set, event set, beam label set, link set
2. `src/viz/presenters/types.ts`
   - typed presenter contract for display/emphasis payloads
3. either:
   - evolve `EarthMovingBeamLayer.tsx` to accept parity-mode payloads, or
   - add a dedicated `LeoParityBeamLayer.tsx`
4. either:
   - evolve `BeamInfoOverlay.tsx`, or
   - add a dedicated `LeoParityBeamOverlay.tsx`
5. either:
   - evolve `HandoverLinkOverlay.tsx`, or
   - add a dedicated `LeoParityHandoverLinks.tsx`

The presenter owns:

1. which satellites are highlighted;
2. which beams get labels;
3. which beams get SINR text;
4. which links are drawn.

The renderer owns only drawing.

---

## 9. Minimum Implementation Slices

### Slice P1: Mode Toggle

1. add `leo-parity` mode switch in `SceneShell`;
2. expose the mode through query param and `ControlPanel`;
3. keep current default mode unchanged;
4. prove both modes read from the same snapshot truth.

### Slice P2: Donor-Like Beam Density

1. add presenter-derived display/event beam sets;
2. increase event-satellite beam density;
3. preserve deterministic selection.

### Slice P3: Per-Beam Labels and SINR

1. add donor-style per-beam labels;
2. add donor-style per-beam SINR labels;
3. keep values truth-driven.

### Slice P4: Handover Visual Parity

1. increase serving/prepared/post-ho/secondary readability;
2. keep DAPS dual-active compatible;
3. preserve replay parity.

### Slice P5: Browser Evidence

1. add dedicated browser proof for leo-parity mode;
2. keep current browser proof for research/default mode;
3. do not let leo-parity replace default-mode validation.

---

## 10. Acceptance for This Companion

This companion should be considered landed only when all of the following are true:

1. a dedicated `leo-parity` mode exists;
2. it uses the same `SimulationSnapshot` / replay truth as default mode;
3. the frontend visually reads closer to `project/leo-beam-sim` in:
   - beam density,
   - per-beam labels,
   - per-beam SINR readability,
   - handover link readability;
4. browser-visible evidence exists for:
   - live HOBS-like multibeam scene,
   - replay scene,
   - DAPS continuity scene;
5. current academic/default mode remains intact.

---

## 11. Non-Goals

This companion does not authorize:

1. weakening the current research-grade channel model;
2. replacing `ntn-sim-core` truth with donor-side heuristics;
3. collapsing `research/default` mode into `leo-parity` mode;
4. introducing route-level architecture churn before parity work proves useful;
5. rewriting `core/` just to satisfy presentation parity.

---

## 12. Status Rule

Until this mode lands, the correct description is:

1. current SDD set is closed;
2. leo-parity frontend enhancement remains planned.

### 12.1 Current Landed Slice

As of 2026-03-25:

1. `Slice P1` is landed:
   - `SceneShell` reads `?view=default|leo-parity`
   - `ControlPanel` exposes `Research` / `Leo-Parity` toggle
   - mode changes are synchronized back to the URL
2. `Slice P2` is landed:
   - `src/viz/presenters/leo-parity-presenter.ts` derives deterministic `display set` / `event set` / `beam set` emphasis from the same snapshot truth used by default mode
   - continuity/event/context satellites are separated without changing orbit/channel/handover/KPI truth
   - `leo-parity` no longer treats all display satellites as beam satellites; beam cones are restricted to serving / prepared / secondary / DAPS / role-derived event satellites, with a single-satellite fallback when no continuity state is available
3. initial dedicated parity renderer family is landed:
   - `LeoParityBeamLayer.tsx`
   - `LeoParityBeamOverlay.tsx`
   - `LeoParityHandoverLinks.tsx`
   - `SceneShell` now switches the whole earth-moving beam / explainability / handover-link family by mode instead of only changing satellite selection
4. current render output is now mode-dependent:
   - `research/default` keeps the conservative continuity-focused grammar
   - `leo-parity` keeps broad sky context through `SatelliteSkyLayer` but restricts beam ownership to the parity `beam set`, making the scene read closer to `project/leo-beam-sim`
5. parity-mode earth-fixed / BH visuals now diverge from research/default:
   - `EarthFixedCellLayer.tsx` accepts `parityMode`
   - parity mode adds donor-style satellite-to-cell beam links for active BH beams
   - parity mode uses a brighter served/interfered/energy-blocked cell palette and per-cell beam labels without changing BH truth
6. parity-mode overlay/link grammar has moved closer to the donor:
   - `LeoParityBeamOverlay.tsx` anchors labels to the primary beam path instead of satellite-top summary placement
   - `LeoParityHandoverLinks.tsx` adds stronger event anchors and endpoint tags while remaining truth-driven
7. donor-like scene-density and BH-first composition are now partially landed:
   - parity presenter now keeps broader sky context (`MAX_DISPLAY_SATS=12`, `MAX_EVENT_SATS=8`) without expanding beam ownership
   - `leo-parity` keeps beam cones restricted to the parity `beam set`, while background satellites remain sky-only context
   - BH profiles in `leo-parity` now suppress moving access cones so the earth-fixed grid and BH beam links become the primary composition, closer to donor grammar
   - parity beam overlay text is simplified to role-first tags so the scene reads less like a satellite summary HUD
8. validation-only replay targeting is now available:
   - `replaySeekSec` may be provided in the URL for deterministic browser validation
   - this does not alter replay truth, manifests, or saved artifacts
   - it only changes the initial replay cursor used by frontend/browser proof flows

When it lands, update:

1. `sdd/README.md`
2. `sdd/ntn-sim-core-roadmap.md`
3. `sdd/ntn-sim-core-implementation-status.md`
4. `README.md`
5. `docs/README.md`

in the same change set.
