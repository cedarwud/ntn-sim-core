# Truth-Preserving Showcase Visual Realignment Follow-On SDD

**Status:** Active narrow follow-on SDD — first landing implemented  
**Date:** 2026-04-15  
**Depends on:** `ntn-sim-core-sdd.md`, `ntn-sim-core-frontend-beam-visual-sdd.md`, `ntn-sim-core-ui-exposure-spec.md`, `ntn-sim-core-profile-baselines.md`, `phase4-runtime-contract-sdd.md`, `phase5-cleanup-and-modularization-sdd.md`  
**Scope gate:** frontend presentation grammar, showcase profile/window curation, and browser-visible acceptance only; no KPI/runtime physics rewrite  
**Recommended verdict:** `go-with-tight-scope`

---

## 0. Landed Minimum Slice (2026-04-15)

The current tree now implements the minimum truth-preserving landing described
by this follow-on.

Landed scope:

1. a shared `BeamPresentationFrame` now exists under `src/viz/presentation/`
   and owns:
   - `displaySatIds`
   - `eventSatIds`
   - `beamSatIds`
   - `primaryBeamBySatId`
   - `contextBeamIdsBySatId`
   - `markerRoleBySatId`
   - `beamRoleAccentByBeamId`
   - `focusMode`
2. `SceneShell` now builds that frame once and shares it across:
   - `SatelliteSkyLayer`
   - `EarthMovingBeamLayer`
   - `EarthFixedCellLayer`
   - `BeamInfoOverlay`
   - `HandoverLinkOverlay`
3. the first landing strengthens serving / prepared / post-HO / neutral visual
   separation without mutating engine SINR, handover, or bounded-steering
   truth, and it keeps earth-moving beam ground targets on the truth path
   rather than fake-recentering them to the UE
4. the dedicated `case9-daps-showcase` profile is now the interactive default:
   - `1 UE`
   - BH-disabled earth-moving DAPS path
   - curated epoch `2026-01-01T00:45:00Z`
   - showcase-specific `hysteresis_db = 0`, `pingPongWindowSec = 15`
   - benchmark-facing `case9-daps-baseline` remains separately selectable
5. browser validation now extends `VAL-FV-005` / `VAL-FV-006` and adds
   `VAL-FV-010` for central readability, scatter suppression, role
   separability, and truth preservation
6. handover readability is now being converged toward one shared continuity
   narrative contract so that prepared / dual-active / post-switch narration,
   marker roles, and link overlays stop drifting apart

Anything beyond this landed slice still requires a fresh reopen if it changes
beam projection semantics, benchmark claims, or frozen runtime contracts.

---

## 1. Purpose

This follow-on exists to answer one narrow question that the current tree now
surfaces clearly:

**How should `ntn-sim-core` improve first-screen readability and handover
showcase quality without faking SINR, handover decisions, or beam-tracking
truth?**

The answer must not be "just compress beams differently".

The user-facing pain is broader:

1. too few satellites pass through the central high-elevation area where the UE
   sits and where handover is easiest to read;
2. beams are too similar in color and too tightly clustered to read role
   differences quickly;
3. renderer-level beam compression has already swung between "too many",
   "too few", and "sudden wide-angle scatter";
4. the previous UE-centered steering look felt visually implausible when beams
   appeared to hit the UE from unrealistically oblique geometry;
5. the current default scene often has little or no service continuity, so the
   handover story becomes too sparse to function as a good showcase.

This follow-on is intentionally narrow. It is about restoring a strong
truth-preserving **showcase grammar** for the frontend. It is not a new SINR,
orbit, or handover algorithm program.

---

## 2. Trigger Evidence

The current tree has three simultaneous realities:

1. the engine now correctly uses bounded steering rather than unconstrained
   "every visible satellite centers on the UE";
2. the frontend renderer is still largely a generic snapshot-driven projector;
3. the default interactive profile is `case9-daps-baseline`, which currently
   combines:
   - `beamSemantics = earth-moving`
   - `handover = daps`
   - `beam hopping` on top of the DAPS path
   - `ueTopology.count = 10`

This means the first screen is trying to satisfy two different jobs at once:

1. remain a truth-driven research baseline;
2. behave like a clean, central, visually legible handover demo.

That dual role is currently unstable.

The repo therefore needs an explicit separation between:

1. **truth surfaces** used for SINR / HO / KPI / benchmark evidence;
2. **presentation surfaces** used to make those truth surfaces readable.

---

## 3. Problem Statement

The current frontend stack does not yet provide a strong intermediate
presentation grammar between `SimulationSnapshot` truth and the final 3D scene.

Today:

1. `SatelliteSkyLayer` selects visible satellites with a generic
   elevation-heavy heuristic;
2. `EarthMovingBeamLayer` selects beam satellites and beam subsets from the raw
   snapshot plus a small compression policy;
3. `BeamInfoOverlay` and `HandoverLinkOverlay` then add explainers on top of
   that scene;
4. the default profile must still do the work of both:
   - a benchmark-facing baseline
   - and a presentation-facing first screen

This creates four distinct failures:

1. **Central readability failure:** the sky and beam layers do not explicitly
   optimize for "event readability near the central high-elevation region";
2. **Role readability failure:** beam/marker style is not strong enough to make
   serving / prepared / post-HO / neutral context immediately legible;
3. **Context instability failure:** generic candidate/context logic can still
   swing between over-dense and over-collapsed;
4. **Showcase scarcity failure:** the default scene often exposes too little
   service continuity or too few central passes to tell a strong handover story.

For the current reopen there is a fifth practical failure:

5. **Narrative split failure:** serving satellites, prepared targets,
   post-switch emphasis, and handover links were still being decided in
   multiple places, allowing visible flicker or abrupt jumps even when the
   underlying truth was not being rewritten.

None of these require falsifying runtime truth. They require a clearer
frontend architecture and a better-chosen showcase surface.

---

## 4. Decision

The recommended solution is a two-part split:

1. **keep runtime truth unchanged**
2. **introduce a truth-preserving showcase presentation layer**

That means:

1. `SimulationSnapshot` remains the only authority for:
   - visibility
   - serving/target/secondary continuity state
   - active/off-slot state
   - beam offsets
   - SINR and handover decisions
2. the frontend adds an explicit intermediate presentation model that decides:
   - which satellites are displayed
   - which satellites are beam-bearing in the current frame
   - which beams are primary event beams
   - which beams are secondary context beams
   - which markers and beams deserve role accent styling
   - which continuity narrative phase the user should currently read
3. the default first-screen showcase should stop relying on the current
   `case9-daps-baseline` mixed-duty profile alone
4. a separate, truth-driven **showcase profile or curated replay/live window**
   should be introduced for readable central high-elevation continuity demos
5. the continuity narrative should be shared across satellite selection,
   beam emphasis, and link overlays instead of being re-derived separately

This follow-on therefore rejects two bad extremes:

1. **fully literal but visually unreadable generic projection**
2. **visually attractive but truth-breaking fake beam/service geometry**

The current demo-focused landing therefore permits a consumer-side continuity
grammar of:

1. `prepared`
2. `dual-active`
3. `post-switch`
4. `stable`

but only when those phases are derived from published truth and disclosed as
presentation readability rather than new simulator semantics.

---

## 5. Non-Negotiable Rules

This follow-on may improve readability, but it must not reopen the following
truth guarantees:

1. no fake SINR values;
2. no fake handover state transitions;
3. no restoration of unconstrained "every visible satellite points directly to
   the UE" steering in the engine truth path;
4. no benchmark/profile claim may depend on a showcase-only visual heuristic;
5. no browser-visible improvement may silently mutate `SimulationSnapshot`
   semantics or frozen runtime contracts.

For the first landing specifically:

1. primary event beams must still render from the engine-published beam offsets;
2. this follow-on does **not** authorize re-centering beams onto the UE for
   readability;
3. readability should come first from:
   - better satellite selection
   - better beam subset selection
   - stronger style separation
   - and better showcase profile/window curation

Any future visual interpolation away from the literal beam ground target would
require a separate disclosed follow-on and an explicit "visual projection"
contract update in `ntn-sim-core-frontend-beam-visual-sdd.md`.

---

## 6. Required Semantic Split

### 6.1 Truth Layer

The truth layer remains:

1. `SimulationSnapshot`
2. `SatelliteState`
3. `SatelliteBeamSnapshot`
4. `BhSlotSnapshot`
5. `DapsSnapshot`

This layer keeps full ownership of:

1. visibility
2. beam role
3. active state
4. steering outcome
5. service eligibility
6. continuity truth
7. SINR / KPI / HO decisions

### 6.2 Presentation Layer

The frontend should add an explicit intermediate model, referred to here as a
`BeamPresentationFrame`.

The first landing should at minimum expose:

1. `displaySatIds`
   - satellites whose markers appear in the scene
2. `eventSatIds`
   - satellites that are continuity-relevant for the current narrative frame
3. `beamSatIds`
   - satellites allowed to emit beam cones in the scene
4. `primaryBeamBySatId`
   - the single most important beam per event satellite
5. `contextBeamIdsBySatId`
   - active neutral or secondary-support beams kept for context
6. `markerRoleBySatId`
   - serving / prepared / post-ho / secondary / neutral
7. `beamRoleAccentByBeamId`
   - role-aware style mapping for beam cones and labels
8. `focusMode`
   - one of:
     - `idle-pass`
     - `continuity-focus`
     - `bh-focus`

This layer is still truth-driven. It is a renderer input model, not a second
simulator.

### 6.3 Showcase/Profile Layer

The frontend should also stop expecting one profile to satisfy both benchmark
and showcase goals at once.

The first landing should explicitly distinguish:

1. **baseline profiles**
   - research-facing
   - may be visually sparse
   - remain benchmark-relevant
2. **showcase profiles or curated windows**
   - still use the same truth engine
   - but are selected for readable central high-elevation continuity
   - are labeled `showcase`
   - are not silently substituted into benchmark claims

---

## 7. Showcase Design Targets

### 7.1 Central High-Elevation Readability

The first-screen or curated showcase should deliberately favor frames where:

1. at least one serving or prepared satellite is near the central
   high-elevation region;
2. at least one additional candidate or continuity-relevant satellite is also
   visible in a readable region;
3. handover preparation, dual-active, or recent-HO continuity states are
   observable without requiring horizon-level clutter to carry the story.

This should be achieved by:

1. better epoch/window selection;
2. better display-satellite weighting;
3. a strong continuity-aware center bias in the presentation layer.

It should **not** be achieved by lying about topocentric truth.

### 7.2 Beam Role Readability

The first landing should make beam roles more legible than the current
generic-palette path.

Required style outcomes:

1. serving beams must be immediately identifiable;
2. prepared / target beams must be visually distinct from serving beams;
3. post-HO / recent-source / secondary context must not collapse into the same
   visual family as neutral active beams;
4. neutral context beams should stay visible enough to explain multi-beam
   structure, but weak enough to avoid drowning event beams;
5. idle-pass / non-event satellites must still retain a compact multibeam
   subset rather than collapsing to a single cone;
6. inactive / off-slot beams must still be visibly inactive.

### 7.3 Candidate Scatter Control

In continuity-focused scenes:

1. background candidate satellites must not explode the scene into a second or
   third wide-angle lattice;
2. candidate suppression should be a scene-grammar decision, not a random
   side-effect of whichever renderer happens to filter first;
3. earth-moving beam cones and BH cell analysis must remain aligned on the same
   selected satellite and beam-pick set when the scene is in `bh-focus`.

### 7.4 No-Service Visibility

The first landing should not try to hide true no-service periods, but it should
reduce accidental showcase scarcity by choosing more suitable showcase inputs.

This means:

1. use better-curated epochs/windows or a dedicated showcase profile;
2. do not alter engine truth to "force service";
3. when no-service still occurs, the scene should make that state readable
   rather than simply empty or visually confusing.

---

## 8. Profile and Window Strategy

### 8.1 Baseline vs Showcase Split

The current tree now uses an explicit split instead of forcing
`case9-daps-baseline` to carry all presentation burden.

The landed first-screen path is:

1. `case9-daps-showcase`
   - single-UE continuity-first topology
   - stronger probability of central high-elevation serving / target
     visibility
   - cleaner handover opportunity density than the mixed-duty baseline
   - explicit showcase labeling in the profile selector
2. `case9-daps-baseline`
   - retained as the benchmark-facing DAPS/BH reference profile
   - no longer the interactive first-screen default

### 8.2 Beam Hopping Split

The current DAPS + BH combined default is too overloaded for the first landing
showcase.

The first landing should therefore prefer:

1. a **continuity-first showcase path** for DAPS readability, and
2. keep BH-heavy coupled DAPS scenes as advanced/reference surfaces rather than
   the main hero path

This does not delete the combined path. It stops forcing it to carry first-hit
readability.

---

## 9. Validation Consequences

This follow-on is now promoted and browser-visible acceptance has landed.

The current tree now machine-enforces:

1. **central readability gate**
   - `VAL-FV-010` checks that the showcase reaches `continuity-focus`
   - the serving satellite stays in the central high-elevation region
   - the serving satellite keeps a readable local multibeam neighborhood
   - if no nearby supporting satellite exists in truth, the scene falls back to
     a serving-centered beam narrative instead of spraying a distant beam sat
2. **scatter suppression gate**
   - `VAL-FV-005` checks that the continuity-focused showcase keeps any non-event
     context beam satellites tightly limited instead of exploding into a
     wide-angle lattice
3. **role separability gate**
   - `VAL-FV-006` checks that the shared presentation frame yields distinct
     serving / prepared / secondary role separation in the rendered scene
4. **truth-preservation gate**
   - `VAL-FV-006` checks that presentation-frame beam picks remain backed by
     raw snapshot beam truth published through the validation probe rather than
     frontend invention or renderer-derived geometry samples

These gates intentionally extend the existing `VAL-FV-005/006` family and add
`VAL-FV-010` for the showcase-specific readability requirement.

---

## 10. Ordered Implementation Plan

The landed first slice followed this order:

1. **Preflight measurement**
   - quantify central-pass scarcity, no-service ratio, and current continuity
     visibility over the intended showcase path
2. **Presentation frame extraction**
   - introduce a dedicated intermediate presentation model between
     `SimulationSnapshot` and the renderer layers
3. **Marker and beam role restyling**
   - strengthen role contrast without changing truth geometry
4. **Showcase profile/window split**
   - stop forcing `case9-daps-baseline` to serve as both benchmark baseline and
     first-screen hero
5. **Browser validation**
   - machine-enforce the new readability targets

The first landing should **not** reopen:

1. beam-tracking runtime semantics
2. handover algorithm families
3. SINR/path-loss formulas
4. frozen runtime contracts

---

## 11. Out of Scope

This follow-on does not authorize:

1. a new physics model family;
2. a new handover family;
3. orbit/Walker redesign;
4. real-trace scalability reopening;
5. paper-claim expansion beyond the current shipped claim surfaces;
6. silent conversion of showcase heuristics into benchmark defaults.

---

## 12. Promotion Boundary

This document is now active narrow implementation authority for the landed
first slice.

What is authorized and implemented:

1. shared presentation-frame scene grammar for sky / beam / overlay layers
2. dedicated showcase-profile/default split
3. stronger marker/beam role separation
4. browser-visible readability/scatter/truth validation

What still requires a fresh reopen:

1. any frontend-only beam projection that intentionally departs from the truth
   ground target
2. any engine-side SINR / HO / bounded-steering rewrite
3. any benchmark-claim change that depends on showcase-only curation
4. any frozen-contract version change
