# NTN Sim Core — Frontend Beam Visual Acceptance

**Version:** 0.3.0  
**Date:** 2026-03-25  
**Status:** Active Acceptance Companion — overlay extension added, evidence partially manual

---

## 1. Purpose

This document defines what the frontend beam presentation must actually look like before it can be called complete.

It exists to prevent:

1. runtime completion from being mistaken for frontend completion;
2. placeholder beam graphics from being treated as research-grade visuals;
3. vague statements such as "multi-beam is visible" from replacing concrete acceptance.

---

## 2. Earth-Moving Beam Acceptance

The access / handover view passes only if all of the following are true:

1. more than one beam is visibly rendered for a multibeam satellite when the profile truth is multibeam;
2. beam count is profile-driven or uses an explicit documented subset rule;
3. beam cones or beam surfaces visibly connect the satellite to distinct ground targets;
4. serving beam is visually distinct from non-serving beams;
5. prepared / target or post-HO beams are visually distinct when such states exist;
6. inactive or off-slot beams are visually distinguishable from active beams;
7. the rendered beam role matches the simulation truth for the same tick / replay frame.
8. a truth-driven beam/SINR explainer is available when beam-facing interpretation is needed;
9. a truth-driven handover/service link explainer is available when serving/target/post-HO or dual-active semantics exist.

The view fails if any of the following are true:

1. every satellite always shows the same fixed 7-beam pattern regardless of profile;
2. only the center beam has a cone and all others are decorative ground cells;
3. beam placement is only dome-relative and not tied to beam truth;
4. multibeam mode visually reads as single-beam service with nearby decorations.
5. overlay values are recomputed locally instead of read from snapshot/trace truth.
6. handover state is only discoverable from logs while the frontend omits equivalent truth-driven visual cues.

---

## 3. Earth-Fixed / Beam-Hopping Acceptance

The BH view passes only if all of the following are true:

1. cells are fixed on the ground while satellites move independently;
2. scheduler-selected cells or beams are visibly different from inactive ones;
3. served cells are visibly different from interfered cells;
4. energy-blocked state is visibly different from inactive-beam state;
5. the cell / beam state comes from scheduler truth, not from scene-local animation rules.

The view fails if any of the following are true:

1. BH mode reuses moving-beam graphics without a fixed ground-cell representation;
2. cells move with the satellite;
3. the viewer cannot tell whether service loss is caused by:
   - no coverage
   - inactive beam
   - interference
   - energy block

---

## 4. Observer-Sky and Motion Consistency

Beam visuals must remain consistent with observer-sky motion semantics.

Required:

1. satellites still read as `rise -> pass -> set`;
2. beams move with the satellite in `earth-moving` mode;
3. display membership churn does not make beams pop in mid-sky without physical reason;
4. showcase readability comes from deterministic curation, not beam re-placement hacks.

Not acceptable:

1. a cluster of beams lingering near scene center with weak relation to pass motion;
2. beams appearing or disappearing as if created by screen-space ranking only;
3. a visual set that collapses directly to the HO candidate set when the above-horizon pool is broader.

---

## 5. Required Role Semantics

When the relevant runtime states exist, the frontend must make the following readable:

1. `serving`
2. `prepared` or `target`
3. `secondary`
4. `post-ho`
5. `inactive` or `off-slot`
6. `interfered`
7. `energy-blocked`

Text labels are optional. Role readability is mandatory.

Truth-driven explainers are mandatory when the corresponding runtime state exists:

1. beam/SINR explainers may use labels, bands, or equivalent overlays;
2. handover/service explainers may use lines, badges, or equivalent overlays;
3. neither may invent or override physics/KPI state.

---

## 6. Evidence Required for Closure

Frontend beam work is not complete from scripts alone.

Closure evidence must include:

1. one browser-visible proof set for `case9-access-baseline`;
2. one browser-visible proof set for `hobs-multibeam-baseline`;
3. one browser-visible proof set for `bh-resource-baseline` once Phase 5 visual work lands;
4. replay proof for real-trace once Phase 4 replay is wired.

Each proof set must show:

1. satellite motion context;
2. beam role context;
3. service or handover context;
4. that the renderer is no longer using the placeholder path.
5. when applicable, that overlay values and link states come from truth rather than frontend-side estimation.

---

## 7. What Does Not Count as Finished

The frontend beam package is not complete if any of the following remain true:

1. the default beam layer is still explicitly labeled `schematic` or `VISUAL-ONLY` placeholder;
2. `numBeams` can be passed into the component but the component still renders a fixed beam count;
3. the renderer cannot show the difference between `earth-moving` and `earth-fixed` beam semantics;
4. there is no explicit donor-backed renderer plan for:
   - `leo-beam-sim` style moving-beam cones
   - `leo-simulator` style BH cells
5. phase closure is claimed without browser-visible evidence.
6. beam/SINR explainers are absent or only available through log inspection for access/multibeam runs.
7. handover/service links are absent for runs whose primary interpretation depends on continuity state.

---

## 8. Acceptance Mapping

This document is binding for:

1. Phase 3 multibeam frontend closure
2. Phase 4 replay/frontend closure
3. Phase 5 BH frontend closure
4. Phase 6 DAPS/DC-like continuity frontend closure

It must be read together with:

1. `sdd/ntn-sim-core-frontend-beam-visual-sdd.md` — normative spec + §12 implementation checklist
2. `sdd/ntn-sim-core-frontend-donor-mapping.md` — donor source mapping
3. `sdd/ntn-sim-core-validation-matrix.md` — validation gates

### Implementation Tracking

The consolidated implementation checklist lives in `frontend-beam-visual-sdd.md` §12. It covers:
- Phase 3 visual (MS3): steps 3V-1 through 3V-7
- Phase 4 visual (TLE frontend + replay): steps 4V-1 through 4V-5
- Phase 5 visual (MS4): steps 5V-1 through 5V-5
- Cross-cutting: steps XV-1 through XV-7

All core prerequisites (beam selection, HO state, BH slot, energy state, TLE pipeline) are satisfied as of 2026-03-25.

Current closure caveats:
- browser proof assets exist, but visual acceptance is not yet automated
- replay uses a working snapshot path, but deterministic curated-window integration is still pending
- the BH renderer supports `energy-blocked`, but the default benchmark profile does not yet expose that state by default
- truth-driven beam/SINR overlay and handover/service link overlays are now part of closure scope, but are not landed yet
