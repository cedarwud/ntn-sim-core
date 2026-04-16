# MODQN Story Dashboard Follow-On

**Status:** Completed narrow follow-on record — landed Slice 3  
**Promoted:** 2026-04-16  
**Landed:** 2026-04-16  
**Depends on:**
1. `sdd/modqn-bundle-replay-consumer-sdd.md`
2. `sdd/modqn-bundle-replay-ui-sdd.md`
3. `sdd/modqn-external-bundle-loading-follow-on.md`
4. `sdd/downstream-runtime-architecture-sdd.md`
5. `sdd/phase4-runtime-contract-sdd.md`
6. `sdd/phase5-cleanup-and-modularization-sdd.md`
7. `sdd/ntn-sim-core-ui-exposure-spec.md`
**Scope gate:** consumer-only story dashboard and dynamic chart follow-on over existing bundle truth; no producer schema change, no native runtime contract change, no new MODQN diagnostics fields

---

## 1. Current Position in Sequence

This slice is now landed. The current tree can:

1. boot from the shipped sample bundle,
2. override that baseline with a browser-selected `external-directory`,
3. keep the last valid bundle active when a new external load fails,
4. replay serving-satellite movement and handover progression from exported
   bundle truth,
5. render a dedicated `bundle-story-dashboard` surface with a first-screen
   KPI strip that keeps the Phase 03A obligations visible,
6. show figure PNGs when the bundle exposes them and fall back to inline
   training evidence when they are absent,
7. render slot-synced replay charts from additive consumer-side projections
   over exported replay frames, and
8. keep `ModqnBundleMetadataPanel` separate while validating that boundary
   through `VAL-MODQN-BUNDLE-003`.

The original presentation-quality gap is therefore closed without reopening
producer or runtime contracts.

## 2. Purpose

This follow-on exists to answer one practical question:

**How should `ntn-sim-core` turn the existing MODQN bundle truth path into a
clearer, more story-driven dashboard with richer browser-visible charts,
while staying inside the current consumer contract and without inventing new
truth?**

The answer should let the frontend prove:

1. "MODQN bundle truth is clearly active here",
2. "the dashboard charts and KPIs come from existing bundle data rather than
   frontend guesswork",
3. "sample and external bundles both remain first-class inputs to the same
   story surface".

## 3. Promotion Trigger Evidence

At promotion time, the tree exposed four facts that make this slice safe to
promote as consumer-only work:

1. `src/viz/view-models/modqn-bundle-replay-view-model.ts` already exposes
   `getBundleSummary()`, `getTrainingEvalSummary()`, `getDecisionStory()`,
   `getTrainingEvidence()`, `getAssumptions()`, `getProvenanceLegend()`, and
   `getProvenanceFields()`.
2. `getTrainingEvidence()` already surfaces CSV-backed series for scalar
   reward plus the throughput/handover/load-balance losses, as well as
   optional figure URLs when artifact PNGs exist.
3. `ModqnBaselineCompactPanel.tsx` already renders the Phase 03A first-screen
   bundle story and already knows how to degrade from figure URLs to inline
   chart evidence.
4. `SceneShell.tsx` already keeps native bundle-external-loading state and
   bundle-mode truth separate from native live/replay overlays, so this slice
   can stay additive on the bundle-mode presentation path.

The gap is therefore dashboard composition and richer charting, not missing
bundle truth.

## 4. Decision

The landed Slice 3 decision is:

1. keep `modqn-bundle` as an explicit truth-source mode,
2. preserve the shipped compact first-screen obligations from Phase 03A,
3. add a stronger bundle-specific story dashboard layer on top of the
   existing replay projector surface,
4. promote richer browser-visible charts only from already-exported bundle
   data or replay-truth-derived consumer projections,
5. keep `ModqnBundleMetadataPanel` as the secondary disclosure surface rather
   than merging it into the demo-facing story layer,
6. keep sample and external bundle sources on the same dashboard path.

This slice does **not** authorize producer-side explainability expansion,
native-runtime smoothing semantics, or live MODQN takeover.

## 5. Non-Negotiable Boundary Rules

1. This slice remains consumer-only.
2. `src/adapters/modqn-bundle/` remains the only bundle-contract seam.
3. Existing Phase 03A first-screen obligations remain mandatory:
   - Truth Source
   - Paper / Run / Checkpoint
   - Source Label
   - Current Slot / Total Slots
   - Replay Truth Mode
   - Serving Satellite
   - Primary SINR disclosure
   - Cumulative Handovers
   - concise provenance / assumptions summary
4. Existing `VAL-MODQN-BUNDLE-002` truth-source, slot-stepping, source/error,
   and reset semantics must remain intact.
5. The story dashboard must not invent new metrics by recomputing authoritative
   serving, beam, or handover truth outside the exported bundle path.
6. New charts may derive only from:
   - existing CSV-backed series already exposed by the bundle projector,
   - existing bundle-summary / training-eval fields,
   - additive consumer-side projections over exported replay frames.
7. This slice does not authorize:
   - producer schema changes,
   - new diagnostics fields,
   - native beam-switch / handover contract changes,
   - dynamic smoothing that mutates truth,
   - zip/remote/backend ingest,
   - paper-oriented claim expansion.

## 6. Allowed Landing Zone

Primary landing zone:

1. `src/viz/overlays/ModqnBaselineCompactPanel.tsx`
2. new bundle-dashboard or chart child components under `src/viz/overlays/`
3. `src/viz/view-models/modqn-bundle-replay-view-model.ts`
4. `src/viz/scene/SceneShell.tsx`
5. `scripts/validate-modqn-bundle-ui.ts`
6. `sdd/modqn-story-dashboard-follow-on.md`
7. `sdd/README.md`
8. `sdd/ntn-sim-core-implementation-status.md`
9. `sdd/ntn-sim-core-validation-matrix.md`
10. `todo/modqn-story-dashboard/*`
11. `todo/modqn/README.md`
12. `todo/README.md`

Allowed companion sync:

1. `internal/ntn-sim-core/devlogs/*` for implementation continuity
2. `internal/ntn-sim-core/README.md`

This slice should avoid touching:

1. `src/adapters/modqn-bundle/*` unless a pure consumer-side projector helper
   is absolutely required and does not change the frozen contract meaning,
2. `src/core/contracts/*`,
3. native runtime / handover engine files,
4. `useModqnBundleReplay.ts` except for additive read-only wiring needed by
   the dashboard surface.

## 7. Concrete Implementation Shape

### 7.1 Dashboard composition

The bundle-mode story layer should become explicitly dashboard-shaped rather
than remaining only a compact panel.

Minimum expected surfaces:

1. a retained first-screen hero block that still states bundle truth
   explicitly,
2. a training/evaluation evidence block,
3. a decision-story block tied to the current slot,
4. a compact KPI strip or equivalent summary surface,
5. a clear path to the existing metadata/disclosure panel.

### 7.2 Data / projector rule

If new dashboard groupings or mini-projectors are required, they should be
owned by the consumer-side replay view-model layer.

Preferred data sources:

1. `getBundleSummary()`
2. `getTrainingEvalSummary()`
3. `getTrainingEvidence()`
4. `getDecisionStory(index)`
5. `getAssumptions()`
6. `getProvenanceLegend()`
7. `getProvenanceFields()`
8. additive consumer-side projectors over exported replay frames already held
   in the bundle session

Avoid introducing chart logic that depends on native live-only KPI surfaces.

### 7.3 Dynamic chart rule

This slice may add richer browser-visible charts, but only over existing
bundle-backed data.

Allowed examples:

1. upgraded scalar-reward / loss charts from the existing training series,
2. slot-synced bundle KPIs derived from exported replay-frame truth,
3. figure-image panels that prefer exported PNGs and fall back to inline
   charts when PNGs are absent.

Disallowed examples:

1. charts requiring unexported producer fields,
2. frontend-generated policy rankings that were never exported,
3. native-engine SINR timelines presented as if they were bundle truth.

### 7.4 Disclosure separation

`ModqnBundleMetadataPanel` remains the disclosure owner for the longer
assumptions/provenance surface.

This slice may improve how users reach or understand that disclosure, but it
must not collapse the disclosure panel into the first-screen story dashboard
in a way that weakens the distinction between:

1. demo-facing story surfaces,
2. provenance / assumption disclosure,
3. runtime-truth validation surfaces.

### 7.5 Selector retention and additive selectors

All existing `VAL-MODQN-BUNDLE-002` hard dependencies in
`scripts/validate-modqn-bundle-ui.ts` remain mandatory. If any existing
selector changes, the validator must be updated in the same change set.

Recommended additive stable selectors for this slice:

1. `data-testid="bundle-story-dashboard"`
2. `data-testid="bundle-kpi-strip"`
3. `data-testid="bundle-training-chart-panel"`
4. `data-testid="bundle-decision-story-panel"`

### 7.6 Sample and external source parity

The story dashboard must work for both:

1. the shipped sample bundle,
2. a valid externally loaded `external-directory` bundle.

The same story surface must continue to honor:

1. source disclosure,
2. source reset,
3. failed-external-load truth preservation,
4. external figure-image cleanup semantics from Slice 2.

## 8. Work Sequence

### 8.1 Milestone A — dashboard composition

1. reshape the bundle-mode first screen into a stronger dashboard layout,
2. preserve the Phase 03A hero obligations,
3. keep `ModqnBundleMetadataPanel` as a separate disclosure surface,
4. keep `VAL-MODQN-BUNDLE-002` selectors and behavior green.

### 8.2 Milestone B — richer charts and KPI strip

1. upgrade the current training-evidence surface into clearer charts,
2. add bundle-backed KPI/story groupings where existing data already supports
   them,
3. keep PNG-first / inline-fallback behavior when figure artifacts exist.

### 8.3 Milestone C — hardening and validation

1. extend browser validation for the new story-dashboard surface,
2. keep both sample and external bundle paths under that validation,
3. synchronize status / validation / todo docs after the implementation
   lands.

## 9. Validation Plan

This slice must preserve the current passing bundle gates and add a new
dashboard-specific browser gate.

Required validation shape:

1. keep `VAL-MODQN-BUNDLE-002` as the regression gate for:
   - truth-source switching,
   - slot stepping,
   - source/error/reset semantics,
   - external-directory load behavior
2. land a new `VAL-MODQN-BUNDLE-003` for the story-dashboard surface
3. keep the smallest normal validating set during iteration:
   - `npm run build`
4. before closure, run at least:
   - `npm run build`
   - `npm run validate:modqn:bundle`
   - `npm run validate:modqn:bundle-ui`
5. rerun `npm run validate:stage` only if the final implementation broadens
   beyond bundle-mode presentation and its direct wiring.

`VAL-MODQN-BUNDLE-003` should verify at least:

1. the first-screen bundle-truth obligations still appear,
2. bundle-backed charts render from existing data without weakening truth
   disclosure,
3. `ModqnBundleMetadataPanel` remains distinct from the story layer,
4. both sample and external bundles reach the story dashboard successfully.

## 10. Completion Boundary

This slice is complete only when:

1. bundle mode shows a stronger story dashboard than the current compact-only
   first screen,
2. richer charts are visible from existing bundle data,
3. sample and external bundle sources both render through that dashboard,
4. existing Phase 03A / Slice 2 bundle semantics still pass unchanged,
5. `VAL-MODQN-BUNDLE-003` lands with browser-visible evidence,
6. status / validation / todo / internal continuity docs are synchronized.

## 11. What Stays Out of Scope

Even after Slice 3 lands, these remain separate follow-ons:

1. replay-truth hardening and showcase acceptance expansion beyond the
   dashboard surface (`Slice 4`),
2. producer diagnostics / explainability contract expansion (`Slice 5`),
3. native runtime takeover by MODQN,
4. bundle ingest beyond browser-side local directory selection.
