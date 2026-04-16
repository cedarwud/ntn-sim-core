# MODQN Replay Truth Hardening Follow-On

**Status:** Completed narrow follow-on record — landed Slice 4  
**Promoted:** 2026-04-16  
**Landed:** 2026-04-16  
**Depends on:**
1. `sdd/modqn-bundle-replay-consumer-sdd.md`
2. `sdd/modqn-bundle-replay-ui-sdd.md`
3. `sdd/modqn-external-bundle-loading-follow-on.md`
4. `sdd/modqn-story-dashboard-follow-on.md`
5. `sdd/truth-preserving-showcase-visual-realignment-follow-on.md`
6. `sdd/downstream-runtime-architecture-sdd.md`
7. `sdd/phase4-runtime-contract-sdd.md`
8. `sdd/phase5-cleanup-and-modularization-sdd.md`
9. `sdd/ntn-sim-core-ui-exposure-spec.md`
10. `sdd/ntn-sim-core-frontend-beam-visual-sdd.md`
**Scope gate:** consumer-only replay-truth hardening and showcase acceptance over the landed bundle replay + external-directory + story-dashboard path; no producer schema change, no native runtime contract change, no new MODQN diagnostics fields

---

## 1. Current Position in Sequence

`Slice 4` is now landed. The current tree can now:

1. boot from the shipped sample bundle,
2. override that baseline with a browser-selected `external-directory`,
3. keep the last valid bundle active when a new external load fails,
4. replay serving-satellite movement and handover progression from exported
   bundle truth,
5. render a dedicated `bundle-story-dashboard` with KPI strip, training/eval
   evidence, replay charts, and a still-separate disclosure panel,
6. expose additive browser-visible dashboard/HUD/probe markers for current
   slot, serving satellite, serving beam, cumulative handovers, and handover
   kind over the same replay session,
7. keep dashboard and HUD current-truth wording tied to exported replay truth
   while leaving scene continuity hold explicitly view-only,
8. prove shared beam/link presentation against exported replay truth through
   `VAL-MODQN-BUNDLE-004`, and
9. accept a non-trivial external bundle variant that drives distinct truth
   through the same scene/dashboard path rather than a trivial sample clone.

The claim-hardening gap is therefore closed for the current tree without
reopening producer or runtime contracts.

## 2. Purpose

This follow-on exists to answer one practical question:

**How should `ntn-sim-core` prove that the landed MODQN bundle dashboard,
scene movement, and handover narration remain faithful to exported replay
truth for both sample and external bundles, without inventing new truth or
mutating current contracts?**

The answer should let the frontend prove:

1. "the visible serving satellite / slot state / handover narration all come
   from the same bundle truth",
2. "sample and external bundles both drive the same truth-safe scene and
   dashboard path",
3. "showcase-oriented presentation aids do not silently mutate authoritative
   replay state".

## 3. Landing Evidence

The landed tree now exposes the following consumer-only evidence:

1. `SceneShell`, the shared beam/link presentation path, and the landed
   `bundle-story-dashboard` already run over the bundle replay session rather
   than a native recomputation path.
2. `ModqnBundleReplayViewModel` now exposes a dedicated replay-truth projector
   for slot / serving-satellite / serving-beam / cumulative-handover reads,
   keeps decision-story truth anchored to decision-time masks when they are
   present, and only uses a disclosed runtime-mask fallback for older valid
   bundles that omit those optional masks.
3. `BundleTruthHud`, `ValidationProbe`, and bundle runtime summaries expose
   additive read-only truth markers from raw replay frames without mutating
   authoritative slot or handover state, while scene-only transient hold
   remains confined to the presentation layer.
4. Browser-selected external directories no longer synthesize required bundle
   directories that the selected file tree did not actually prove.
5. `VAL-MODQN-BUNDLE-002`, `003`, and the new `004` all pass against the same
   shared bundle-mode scene/dashboard path.

## 4. Decision

The landed Slice 4 decision is:

1. keep the current bundle replay/dashboard path as the only authority for
   bundle-mode scene truth,
2. strengthen browser-visible proof that dashboard, HUD, and scene all agree
   on serving/slot/handover truth,
3. strengthen external-bundle proof so the accepted path shows more than a
   trivial copy of sample-bundle truth,
4. keep any showcase/readability aids explicitly non-authoritative unless
   they are direct views of exported truth,
5. reserve a new `VAL-MODQN-BUNDLE-004` gate for this truth-hardening and
   showcase-acceptance package.

The current tree fulfills that decision by:

1. adding a shared replay-truth projection rather than a new contract,
2. keeping dashboard/HUD wording bound to exported replay truth instead of
   scene-only hold state,
3. leaving scene continuity hold as a view-only aid,
4. tightening external-directory acceptance at the browser file-tree boundary,
   and
5. landing `VAL-MODQN-BUNDLE-004` over sample plus a non-trivial external
   bundle variant.

This slice did **not** authorize producer diagnostics, beam-switch contract
changes, or live runtime takeover.

## 5. Non-Negotiable Boundary Rules

1. This slice remains consumer-only.
2. `src/adapters/modqn-bundle/` remains the only bundle-contract seam.
3. Existing `VAL-MODQN-BUNDLE-002` and `VAL-MODQN-BUNDLE-003` semantics must
   remain intact.
4. Any user-visible or validator-visible field that asserts serving
   satellite, serving beam, slot index, handover occurrence, or cumulative
   handover count must continue to come from the exported bundle session or
   additive consumer-side projections over that session.
5. Scene-level readability aids, spotlighting, or optional interpolation may
   be introduced only if:
   - they never mutate the authoritative current slot,
   - they never change HUD/dashboard/probe truth fields,
   - and they are explicitly treated as view-only presentation aids.
6. This slice does not authorize:
   - producer schema changes,
   - new diagnostics fields,
   - native beam-switch / handover contract changes,
   - live MODQN takeover,
   - remote/zip/backend ingest,
   - paper-oriented claim expansion.

## 6. Allowed Landing Zone

Primary landing zone:

1. `src/viz/scene/SceneShell.tsx`
2. `src/viz/scene/SceneDataLayers.tsx`
3. `src/viz/overlays/ModqnBaselineCompactPanel.tsx`
4. `src/viz/overlays/SimHud.tsx`
5. `src/viz/overlays/ValidationProbe.tsx`
6. `src/viz/view-models/modqn-bundle-replay-view-model.ts`
7. `scripts/validate-modqn-bundle-ui.ts`
8. `sdd/modqn-replay-truth-hardening-follow-on.md`
9. `sdd/README.md`
10. `sdd/ntn-sim-core-implementation-status.md`
11. `sdd/ntn-sim-core-validation-matrix.md`
12. `todo/modqn-replay-truth-hardening/*`
13. `todo/modqn/README.md`
14. `todo/README.md`

Allowed companion sync:

1. `internal/ntn-sim-core/devlogs/*`
2. `internal/ntn-sim-core/README.md`

This slice should avoid touching:

1. `src/adapters/modqn-bundle/*` unless a pure consumer-side helper is
   absolutely required and does not change contract meaning,
2. `src/core/contracts/*`,
3. native runtime / handover engine files,
4. producer/export repos.

## 7. Concrete Implementation Shape

### 7.1 Truth-alignment proof surface

This slice should add or strengthen machine-verifiable proof that the bundle
scene and dashboard agree on the same replay truth.

Minimum proof targets:

1. current slot index,
2. current serving satellite identity,
3. current serving beam identity when exposed,
4. current handover occurrence / handover kind narration,
5. cumulative handover count.

If additional validation-probe fields are needed, they must remain additive
consumer-side reflections of the exported bundle session.

### 7.2 Scene / HUD / dashboard consistency rule

If the same fact appears in more than one user-visible surface, Slice 4
should explicitly harden that agreement.

Priority consistency pairs:

1. dashboard serving-satellite wording vs HUD truth,
2. dashboard slot state vs slot-step controls,
3. dashboard handover narration vs scene/link/presentation truth,
4. validation probe vs displayed bundle-story-dashboard values.

### 7.3 External-bundle heterogeneity rule

This slice should strengthen external-bundle acceptance beyond a purely
cosmetic sample clone.

Preferred validation shape:

1. keep the existing valid external-directory load path,
2. add at least one non-trivial external bundle variant that remains schema-
   valid but changes visible serving/handover-related truth,
3. prove that the same dashboard + scene path reflects that distinct truth
   rather than silently falling back to sample/native assumptions.

### 7.4 Showcase-aid rule

If implementation chooses to add any presentation-only smoothing, spotlight,
or readability aid for replay acceptance:

1. the aid must remain view-only,
2. authoritative slot/serving/handover fields must stay discrete and
   exported-truth-backed,
3. the validator must prove the aid does not rewrite truth wording.

This is optional. Truth hardening does not require interpolation if the same
claim can be proven without it.

## 8. Landed Work Sequence

### 8.1 Milestone A — consistency surfaces

1. added the smallest HUD/dashboard/probe fields needed for truth-alignment
   proof,
2. kept those surfaces additive and consumer-only,
3. preserved existing `VAL-MODQN-BUNDLE-002/003` selectors and behavior.

### 8.2 Milestone B — external truth hardening

1. strengthened external-bundle acceptance with a more distinct schema-valid
   bundle variant,
2. verified the scene/dashboard path shows different accepted truth where it
   should,
3. avoided new producer/export dependencies.

### 8.3 Milestone C — validation and showcase acceptance

1. landed `VAL-MODQN-BUNDLE-004`,
2. kept earlier bundle gates passing,
3. synchronized status / validation / todo docs after the implementation
   landed.

## 9. Validation Closure

This slice preserved the passing bundle gates and added a new truth-hardening
browser gate.

Closure reruns executed for the landed tree:

1. `npm run build`
2. `npm run validate:modqn:bundle`
3. `npm run validate:modqn:bundle-ui`

`VAL-MODQN-BUNDLE-002` remains the regression gate for truth-source,
slot-stepping, source/error/reset semantics, and external-directory load.
`VAL-MODQN-BUNDLE-003` remains the dashboard rendering/disclosure gate.
`VAL-MODQN-BUNDLE-004` is now the landed replay-truth hardening and showcase
acceptance gate.

`VAL-MODQN-BUNDLE-004` now verifies at least:

1. serving-satellite and slot indicators remain aligned across bundle
   dashboard, HUD, and validator-visible truth surfaces,
2. handover narration and cumulative counts remain tied to exported replay
   truth through slot progression,
3. shared beam/link presentation remains bundle-truth-driven under the
   accepted story-dashboard path,
4. a non-trivial external bundle variant drives distinct accepted truth
   through the same scene/dashboard path without falling back to sample/native
   truth.

## 10. Completion Record

This slice is complete in the current tree because:

1. the repo has stronger machine-verifiable proof that bundle scene/HUD/story
   surfaces agree on exported truth,
2. external-bundle acceptance demonstrates a distinct truth case rather than
   only a cosmetic sample clone,
3. existing `VAL-MODQN-BUNDLE-002` and `VAL-MODQN-BUNDLE-003` still pass,
4. `VAL-MODQN-BUNDLE-004` lands with browser-visible evidence,
5. status / validation / todo / internal continuity docs are synchronized.

## 11. What Stays Out of Scope

Even after Slice 4 lands, these remain separate follow-ons:

1. producer diagnostics / explainability contract expansion (`Slice 5`),
2. live runtime takeover by MODQN,
3. producer schema changes,
4. backend/remote bundle ingest.
