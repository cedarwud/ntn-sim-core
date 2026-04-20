# Earth-Moving Beam Tracking and Handover Candidate Follow-On SDD

**Status:** Proposed narrow follow-on SDD — not yet active implementation authority  
**Date:** 2026-04-13  
**Depends on:** `ntn-sim-core-sdd.md`, `phase3-scenario-profile-experiment-split.md`, `ntn-sim-core-profile-baselines.md`, `ntn-sim-core-paper-family-matrix.md`, `ntn-sim-core-frontend-beam-visual-sdd.md`, `ntn-sim-core-ui-exposure-spec.md`  
**Scope gate:** `earth-moving` beam-tracking semantics, per-satellite serving/candidate derivation, and truth-driven renderer alignment only  
**Recommended verdict:** `go-with-tight-scope`

---

## 1. Purpose

This follow-on exists to answer one narrow question that the current tree now
surfaces clearly:

**What should `earth-moving` actually mean for access / HOBS-style multibeam
profiles: UE-anchored steering, nadir-relative spot beams, or a bounded hybrid
that keeps service continuity without pretending every visible satellite is
always centered on the UE?**

This document is intentionally narrow. It is about beam geometry semantics and
their direct consequences for serving / candidate generation. It is not a broad
handover-family rewrite.

---

## 2. Current Trigger Evidence

The current tree mixes two different meanings under the same
`beamSemantics = 'earth-moving'` label:

1. `src/core/engine/tick.ts` currently selects the multibeam serving pattern
   with `selectBeamForUe(layout, 0, 0, ...)`, which effectively treats the UE
   as the beam-lattice origin for every visible satellite.
2. `src/viz/beam/moving-beam-geometry.ts` currently projects beam ground discs
   observer-relatively rather than from each satellite's nadir / sub-satellite
   point.
3. `src/core/engine/handover-step.ts` collapses each satellite to a single
   `bestBeamId` before handing candidates to the HO FSM, and same-satellite
   beam changes are mostly treated as silent beam updates rather than explicit
   cross-satellite HO events.
4. `sdd/ntn-sim-core-profile-baselines.md` still classifies
   `case9-access-baseline` and `hobs-multibeam-baseline` as research-facing
   `earth-moving` families, so the current semantics are not just a cosmetic
   viewer choice.

This creates a research-meaning problem:

1. the runtime behaves closer to unconstrained service-centric steering than to
   a nadir-relative spot-beam model;
2. the viewer then makes that same truth look like "every beam hits the center";
3. but a strict nadir-only rewrite would over-correct and create a large no-service
   corridor that does not match the intended access-family continuity studies.

---

## 3. Problem Statement

The repo should not keep using one ambiguous `earth-moving` meaning for all of
the following at once:

1. access-family A3/A4/DAPS studies,
2. HOBS-style multibeam interference / EE studies,
3. donor-inspired first-screen continuity demos.

The three critical failure modes are:

1. **Too much steering:** every visible satellite behaves as if its center beam
   can always be pulled onto the UE;
2. **Too little steering:** a strict nadir-only cluster would make service
   availability collapse because beam-cluster radius is far smaller than the
   full visible footprint of a LEO pass;
3. **Silent semantic drift:** HO logic, renderer geometry, and profile wording
   would no longer describe the same beam model.

This follow-on therefore rejects both extremes:

1. `nadir-only` as the universal access-family answer,
2. `always center on UE` as the universal research baseline.

---

## 4. Decision

The recommended target for research-facing `earth-moving` access / multibeam
profiles is:

**nadir-relative beam layout with bounded steering**

That means:

1. each satellite's beam layout is still defined around its nadir /
   sub-satellite point;
2. the layout center may shift toward the UE, but only within an authored
   steering bound;
3. a satellite becomes ineligible when the UE lies outside the reachable region
   defined by:
   - layout outer radius
   - plus the allowed steering margin;
4. HO managers continue to consume one candidate per satellite in the first
   landing, but that candidate must come from the bounded-steering geometry,
   not from unconstrained UE-at-origin centering.

This is the smallest correction that:

1. removes the current "all roads lead to the center beam" pathology,
2. avoids the unrealistic outage explosion of pure nadir-only service,
3. preserves the current A3 / A4 / DAPS / CHO / MC-HO family structure for the
   first landing.

---

## 5. Required Semantic Split

This follow-on should make the beam-tracking meaning explicit rather than
burying it inside `tick.ts`.

### 5.1 Target Beam-Tracking Modes

The authored profile/runtime layer should expose an explicit distinction such
as:

1. `ue-anchored-steering`
   - legacy / donor / demo-oriented continuity mode
   - beam-lattice center follows the UE
2. `nadir-relative-bounded-steering`
   - research-facing access / HOBS target mode
   - beam-lattice center starts at nadir and may shift only within a bounded
     steering envelope
3. `earth-fixed-bh`
   - existing BH semantics; unchanged by this follow-on

This follow-on does **not** require a strict `nadir-relative-fixed` mode in the
first landing, though it may remain a later sensitivity option.

### 5.2 Bounded-Steering Rule

The first promoted runtime should apply the following rule shape:

1. compute UE offset from the satellite's nadir in local east / north km;
2. compute the requested lattice-center shift toward the UE;
3. clamp that shift to an authored steering bound;
4. evaluate beam selection in the shifted local frame;
5. if the residual offset from the clamped lattice exceeds the cluster reach,
   mark the satellite ineligible for service / HO candidacy.

The steering bound may be authored as either:

1. a ground-plane steering radius in km,
2. a maximum steering angle in degrees,
3. or a documented proxy derived from beam diameter / outer-ring geometry.

The repo should pick one canonical internal representation and document the
mapping.

---

## 6. Handover Consequences

### 6.1 What Must Change

Serving / candidate derivation must change together with beam tracking.

The first landing must therefore update:

1. per-satellite `bestBeamId`,
2. per-satellite eligibility,
3. serving satellite ranking,
4. target-candidate ranking.

The current HO managers do **not** need a full family rewrite in the same
change set.

### 6.2 What May Stay the Same at First

The first landing may keep the existing A3 / A4 / DAPS / CHO / MC-HO FSM
families and thresholds if:

1. the input candidate list is now derived from bounded-steering truth,
2. profile wording is updated to describe the new candidate semantics,
3. validation proves the new no-service corridor is bounded and intentional.

### 6.3 Same-Satellite Beam Switching

The narrow Task 4 published-semantics prerequisite is already landed in the
current tree: `UeState.servingTransition.kind` now distinguishes
`same-satellite-beam-switch` from `inter-satellite-handover`, and
`UeState.serviceState` now distinguishes `out-of-reach` from
`no-eligible-service`.

This follow-on should therefore stop treating same-satellite beam movement as a
purely invisible side-effect when doing so hides research-relevant behavior,
but it no longer needs to solve the basic truth-vs-presentation publication
split from scratch.

The first landing does **not** need to count every same-satellite beam change as
a cross-satellite HO. The current tree already satisfies (1) below; any
promoted first landing should preserve that baseline and may additionally make
(2) more visible:

1. explicit beam-switch events exist in the log / snapshot truth, or
2. the explainability / overlay layer clearly distinguishes:
   - same-satellite beam switch,
   - inter-satellite HO,
   - no-service / no-eligible-service.

---

## 7. Profile Mapping Rules

### 7.1 Profiles That Should Move to Bounded Steering

The default target mode for the following profiles should become
`nadir-relative-bounded-steering`:

1. `case9-access-baseline`
2. `case9-daps-baseline`
3. `hobs-multibeam-baseline`
4. `hobs-reproduction`
5. `real-trace-validation` when it inherits access or multibeam family
   semantics

### 7.2 Profiles That Should Not Be Silently Rewritten

The following surfaces should remain explicitly quarantined unless separately
reopened:

1. `realistic-first-screen`
   - may temporarily keep legacy donor/service-centric steering, but must be
     labeled accordingly rather than implied to be the research default
2. `modqn-paper-baseline`
   - downstream contract-sensitive surface; do not silently rewrite its action
     semantics under this follow-on
3. `bh-resource-*`
   - BH profiles remain under `earth-fixed-bh`

---

## 8. Frontend Alignment Requirements

The renderer must follow the corrected runtime semantics rather than preserving
today's observer-relative center-lock illusion.

The first promoted implementation should ensure:

1. `EarthMovingBeamLayer` renders beam footprints from the same bounded-steering
   truth used by serving / candidate selection;
2. candidate-preview cones are no longer hard-wired to "show only the center
   beam" when that would misrepresent the corrected candidate geometry;
3. the viewer can distinguish:
   - serving,
   - prepared / target,
   - same-satellite beam switch,
   - and no-service / out-of-reach states;
4. the frontend still remains truth-driven and does not recompute HO decisions
   independently.

This follow-on does **not** authorize a brand-new visualization stack. It only
requires that the current beam layer stop drifting away from the corrected beam
truth.

---

## 9. Allowed Landing Zone

Primary ownership should stay near:

1. `src/core/profiles/bundle-vocabulary.ts`
2. `src/core/profiles/runtime-schema.ts`
3. `src/core/profiles/runtime-materialization.ts`
4. `src/core/profiles/defaults-access.ts`
5. `src/core/profiles/defaults-hobs.ts`
6. `src/core/profiles/defaults-misc.ts` for first-screen labeling/quarantine
7. `src/core/engine/tick.ts`
8. `src/core/engine/ue-nadir-offset.ts`
9. a new focused beam-tracking helper under `src/core/beam/` or
   `src/core/engine/`
10. `src/core/engine/handover-step.ts`
11. `src/core/engine/snapshot-step.ts`
12. `src/viz/beam/moving-beam-geometry.ts`
13. `src/viz/beam/EarthMovingBeamLayer.tsx`
14. the smallest necessary explainability / validation overlay surfaces
15. narrow validation scripts for beam-geometry and candidate truth

Allowed companion sync:

1. `sdd/ntn-sim-core-profile-baselines.md`
2. `sdd/ntn-sim-core-paper-family-matrix.md`
3. `sdd/ntn-sim-core-ui-exposure-spec.md`
4. `sdd/ntn-sim-core-frontend-beam-visual-sdd.md`
5. `sdd/ntn-sim-core-implementation-status.md`

---

## 10. What Stays Out of Scope

This follow-on must **not** expand into:

1. a full HO-family algorithm rewrite,
2. new frozen runtime / exposure contracts,
3. MODQN action-space redesign,
4. BH scheduler redesign,
5. mixed-orbit / larger-catalog real-trace work,
6. donor-pipeline import,
7. globe / estnet cross-repo UI work,
8. generic realism brainstorming outside beam-tracking semantics.

If the corrected beam model appears to require broader consumer-contract or
algorithm-family changes, that should trigger a separate future surface rather
than scope creep here.

---

## 11. Expected Validation Shape

Any promoted implementation should keep the existing narrow gates green:

1. `npm run validate:profiles`
2. `npm run validate:runtime`
3. `npm run validate:visual-browser`
4. `npm run validate:stage`

The promoted line should also add narrow evidence for:

1. candidate-service geometry no longer defaulting every visible satellite to a
   center-beam attach path;
2. a bounded no-service corridor rather than a catastrophic service collapse;
3. renderer geometry matching corrected serving / target truth;
4. no unintended regression in access-family HO observability.

The validation target is **semantic correction with bounded impact**, not a new
paper-claim program by itself.

---

## 12. Promotion Boundary

This document records the intended narrow correction surface and the current
recommended direction.

It is **not yet** the active implementation authority.

Implementation should start only after:

1. explicit user reopen / promotion of this line,
2. a matching `todo/` handoff surface is written,
3. the affected status/navigation docs are synchronized to say this line is
   active rather than merely proposed.

Until then, this file remains:

1. a scope guard,
2. a design record for why `nadir-relative + bounded steering` is preferred,
3. and a reminder that changing beam placement also changes serving / candidate
   semantics by design.
