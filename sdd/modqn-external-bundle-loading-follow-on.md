# MODQN External Bundle Loading Follow-On

**Status:** Completed narrow follow-on record — landed Slice 2  
**Promoted:** 2026-04-16  
**Landed:** 2026-04-16  
**Depends on:**
1. `sdd/modqn-bundle-replay-consumer-sdd.md`
2. `sdd/modqn-bundle-replay-ui-sdd.md`
3. `sdd/downstream-runtime-architecture-sdd.md`
4. `sdd/phase4-runtime-contract-sdd.md`
5. `sdd/phase5-cleanup-and-modularization-sdd.md`
6. `sdd/ntn-sim-core-ui-exposure-spec.md`
**Scope gate:** browser-side external bundle source selection/loading only; no producer schema change, no native runtime contract change, no new MODQN diagnostics fields

---

## 1. Current Position in Sequence

This slice is now landed in the current tree. The landing keeps the shipped
sample bundle as the default boot path, adds browser-side
`external-directory` source selection over the existing consumer adapter
seam, preserves the last valid bundle when a new external load fails,
supports `Reset To Sample`, surfaces bundle source/error disclosure in
bundle mode, and preserves optional figure-image rendering for external
bundles through browser object URLs with deterministic cleanup on
replacement/reset.

The upstream surfaces that were already complete before this slice landed
remain:

1. the frozen Phase 03A consumer adapter seam,
2. the `native-live` / `native-replay` / `modqn-bundle` truth-source switch,
3. slot stepping and bundle-backed serving/handover replay,
4. assumptions / provenance / training-eval disclosure,
5. the Slice 1 consumer-only dashboard cleanup.

At promotion time, the next gap was:

1. whether the consumer can parse a MODQN replay bundle,
2. whether the frontend can render bundle truth,
3. whether the first screen can make bundle truth explicit.

The next gap is narrower:

1. the frontend still boots from the shipped sample only,
2. a fresh exported bundle cannot yet be loaded directly from the browser,
3. the current UI has no reset/error/source-selection flow for external
   bundle work.

This document records the smallest safe follow-on that closed that gap
without reopening the producer contract.

## 2. Purpose

This follow-on exists to answer one practical question:

**How should `ntn-sim-core` load a user-supplied MODQN replay bundle in the
browser while preserving the current sample-bundle baseline, truth-source
honesty, and Phase 03A consumer contract boundaries?**

The answer should let the frontend prove:

1. "this dashboard can still show the shipped sample bundle",
2. "this dashboard can now ingest a fresh external bundle export",
3. "invalid bundles fail loudly instead of silently falling back to fake
   truth".

## 3. Promotion Trigger Evidence

At promotion time, the tree exposed four facts that made this slice both
necessary and safe to promote:

1. `src/app/hooks/useModqnBundleReplay.ts` still calls
   `loadBundledModqnSampleBundle()` directly, so the app is sample-only.
2. `src/adapters/modqn-bundle/loader.ts` already exposes an I/O-agnostic
   `ModqnBundleFileReader` contract, so browser-side source loading can be
   added without reopening the adapter seam.
3. `assertBundleReplayPresentationReady(bundle)` already rejects
   replay-incomplete bundles missing `manifest.coordinateFrame.groundPoint`,
   so external bundle loading does not need a new leniency path.
4. the current compact panel and metadata panel already know how to render
   paper/run/checkpoint identity, assumptions, provenance, CSV-backed
   training series, and optional figure URLs.

The gap is therefore orchestration and UI state, not bundle semantics.

## 4. Decision

The promoted Slice 2 decision is:

1. keep the shipped sample bundle as the default boot path,
2. add an opt-in browser-side external bundle override,
3. load the external bundle through the existing consumer adapter and
   replay-readiness guard,
4. keep the last valid bundle active until the new selection fully succeeds,
5. support a one-click reset back to the shipped sample bundle,
6. keep optional figure-image rendering when the external bundle provides
   browser-loadable image files.

The minimal external source for this slice is a **browser-selected local
directory** represented as a flat `FileList` with relative paths reconstructed
from browser-provided file metadata. This slice does **not** include zip
upload, remote fetch, or backend-assisted ingest.

## 5. Non-Negotiable Boundary Rules

1. This slice remains consumer-only.
2. `src/adapters/modqn-bundle/` remains the only bundle-contract seam.
3. External bundles MUST still load through:
   - `loadModqnReplayBundle(reader)`
   - `assertBundleReplayPresentationReady(bundle)`
4. The consumer MUST NOT patch or infer missing replay truth for an external
   bundle.
5. Invalid or replay-incomplete external bundles MUST fail loudly and must
   not masquerade as either sample-bundle truth or native truth.
6. A failed external selection MUST NOT discard the previously active valid
   bundle.
7. The shipped sample bundle remains:
   - the default boot path,
   - the validator baseline,
   - the reset target.
8. This slice does not authorize:
   - producer schema changes,
   - new diagnostics surfaces,
   - native beam-switch contract changes,
   - live engine MODQN takeover,
   - zip/remote loading support.

## 6. Allowed Landing Zone

Primary landing zone:

1. `src/app/hooks/useModqnBundleReplay.ts`
2. `src/app/hooks/modqn-bundle-sample.ts`
3. one new browser-side reader/helper file under `src/app/hooks/` for
   converting browser-selected files into a `ModqnBundleFileReader`
4. `src/viz/scene/SceneShell.tsx`
5. `src/viz/overlays/ControlPanel.tsx`
6. `src/viz/overlays/ModqnBaselineCompactPanel.tsx` only if source disclosure
   needs additive wording
7. `scripts/validate-modqn-bundle-ui.ts`
8. `sdd/modqn-external-bundle-loading-follow-on.md`
9. `sdd/README.md`
10. `sdd/ntn-sim-core-implementation-status.md`
11. `todo/modqn-external-bundle/*`
12. `todo/modqn/README.md`
13. `todo/README.md`

Allowed companion sync:

1. `internal/ntn-sim-core/devlogs/*` for implementation continuity
2. `internal/ntn-sim-core/README.md` if new continuity entry points are added

This slice should avoid touching:

1. `src/adapters/modqn-bundle/*` unless a pure consumer-side additive helper
   is absolutely required and does not change the frozen contract surface,
2. `src/core/contracts/*`,
3. native runtime / handover engine files.

## 7. Concrete Implementation Shape

### 7.1 Bundle source model

The runtime state should distinguish at least two bundle-source kinds:

1. `sample`
   - the existing bundled `fixtures/sample-bundle-v1/` path
2. `external-directory`
   - a browser-selected local bundle directory represented as relative-path
     keyed files

This source distinction must be explicit state, not inferred only from
`sourceLabel`.

### 7.2 Browser-side reader

The browser-side reader should:

1. accept the browser-selected file collection,
2. normalize bundle-relative paths from browser-provided file metadata such
   as `webkitRelativePath`, or any equivalent browser mechanism that yields
   relative-path-keyed files,
3. expose the existing `ModqnBundleFileReader` methods,
4. optionally expose object URLs for additive image artifacts under
   `figures/`.

The reader must not introduce any schema leniency.

### 7.3 Hook state machine

`useModqnBundleReplay()` should become bundle-source aware.

Required behavior:

1. boot from the shipped sample bundle,
2. support a pending external load request,
3. surface `loading` and `error` state,
4. replace the active bundle only after successful load and
   replay-readiness validation,
5. keep the previous valid bundle active if the new selection fails,
6. clear external state and revert to sample on reset,
7. revoke external figure object URLs when the external bundle is replaced or
   cleared.

### 7.4 UI surface

The new control surface should be narrow and testable.

Minimum user-visible controls:

1. `Load Bundle...`
2. `Reset To Sample`
3. current bundle source disclosure
4. current load-error disclosure

Recommended stable selectors:

1. `data-testid="load-external-bundle"`
2. `data-testid="reset-bundle-source"`
3. `data-testid="bundle-source-note"`
4. `data-testid="bundle-load-error"`

Current Phase 03A selectors must remain intact unless the validator is
updated in the same change set.

### 7.5 Figure artifact behavior

If the external bundle includes:

1. `figures/training-objectives.png`
2. `figures/training-scalar-reward.png`

the compact panel may render them through object URLs.

If those files are absent:

1. this is not a contract failure,
2. the current CSV-backed fallback behavior remains acceptable.

## 8. Recommended Work Sequence

This slice should be implemented as one narrow follow-on with three internal
milestones:

### Milestone A — Browser reader + source-aware hook

Deliver:

1. browser-selected directory normalization,
2. source-aware `useModqnBundleReplay()` state,
3. successful sample boot path unchanged,
4. successful external bundle load path in code.

Validation during milestone:

1. `npm run build`

### Milestone B — Control-panel source flow + reset/error handling

Deliver:

1. load/reset controls,
2. source disclosure,
3. explicit error disclosure,
4. reset-to-sample behavior.

Validation during milestone:

1. `npm run build`
2. targeted `npm run validate:modqn:bundle-ui` rerun if browser-visible flow
   changed enough to justify it

### Milestone C — Validator extension + final hardening

Deliver:

1. extend the existing `VAL-MODQN-BUNDLE-002` browser/UI gate rather than
   inventing a new top-level gate ID,
2. add new sub-sections under that gate for:
   - valid external load,
   - replay-incomplete external bundle rejection,
   - invalid external selection not poisoning current valid truth,
   - reset-to-sample coverage,
3. keep `VAL-MODQN-BUNDLE-001` as the structural adapter gate and avoid
   splitting **this Slice 2 work** into a separate `VAL-MODQN-BUNDLE-003`;
   later follow-ons may still introduce `003` once they expand beyond the
   current bundle-UI truth-source scope.

Final validation:

1. `npm run build`
2. `npm run validate:modqn:bundle`
3. `npm run validate:modqn:bundle-ui`
4. `npm run validate:stage` only if the final change broadens beyond
   bundle-source selection and its direct UI wiring

## 9. Acceptance Criteria

This slice is complete only when all of the following are true:

1. the app still boots into the shipped sample bundle by default,
2. a user can select a local external bundle directory from the browser,
3. the selected external bundle becomes the active `modqn-bundle` truth
   source only after successful load + replay-readiness validation,
4. paper/run/checkpoint/source disclosure updates to the selected external
   bundle,
5. replay-incomplete bundles missing
   `manifest.coordinateFrame.groundPoint` are rejected explicitly,
6. invalid external selections surface a visible error and leave the
   previously active valid bundle intact,
7. `Reset To Sample` restores the shipped sample bundle and clears external
   load state,
8. optional figure images render when present and degrade gracefully when
   absent,
9. any external figure object URLs created by the consumer are revoked when
   the external bundle is replaced or reset to sample, or an equivalent
   deterministic cleanup path is implemented,
10. existing Phase 03A truth-source, slot-stepping, and disclosure behavior
    remains intact.

## 10. What Stays Out of Scope

This follow-on does **not** authorize:

1. zip upload support,
2. remote bundle URL fetching,
3. drag-and-drop ingestion as a separate parallel path,
4. dynamic chart redesign beyond the current first-screen surfaces,
5. new producer diagnostics,
6. live engine handover decisions driven directly by MODQN.

Those belong to later slices or a different program.

## 11. Completion Boundary

This follow-on is complete only when:

1. browser-side external bundle loading is user-visible and stable,
2. the shipped sample bundle remains the default baseline,
3. external load failure cannot silently corrupt active truth,
4. replay-presentation completeness is enforced for external bundles,
5. current Phase 03A consumer truth semantics remain unchanged,
6. the matching `todo/` handoff surface and current-state status docs are
   synchronized.
