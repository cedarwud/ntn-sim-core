# MODQN Producer Diagnostics And Explainability Follow-On

**Status:** Standby cross-repo kickoff draft — not active implementation authority yet  
**Drafted:** 2026-04-16  
**Depends on:**
- [`modqn-external-bundle-loading-follow-on.md`](./modqn-external-bundle-loading-follow-on.md)
- [`modqn-story-dashboard-follow-on.md`](./modqn-story-dashboard-follow-on.md)
- [`modqn-replay-truth-hardening-follow-on.md`](./modqn-replay-truth-hardening-follow-on.md)
- [`/home/u24/papers/modqn-paper-reproduction/docs/phases/phase-01d-reproduction-reopen-gate-sdd.md`](/home/u24/papers/modqn-paper-reproduction/docs/phases/phase-01d-reproduction-reopen-gate-sdd.md)
- [`/home/u24/papers/modqn-paper-reproduction/artifacts/phase-01c-closeout-status-2026-04-15.md`](/home/u24/papers/modqn-paper-reproduction/artifacts/phase-01c-closeout-status-2026-04-15.md)

## 1. Why this draft exists

`Slice 2`, `Slice 3`, and `Slice 4` already landed the consumer-side path for:

1. browser-visible external bundle loading,
2. a shared story dashboard for sample and external bundles,
3. stronger replay-truth proof across dashboard / HUD / scene / probe.

The main remaining gap is no longer bundle ingest or replay-truth acceptance.
The remaining gap is producer-owned explainability depth: why MODQN preferred
one candidate over another, how large the preference gap was, and whether the
current replay story is exposing enough policy detail for a stronger demo or
paper-facing narrative.

## 2. Current default state

The correct current interpretation remains:

1. `ntn-sim-core` has no new active MODQN/UI consumer implementation queue
   after landed `Slice 4`,
2. `modqn-paper-reproduction` remains frozen by default,
3. the default producer-side action is still `stop`, not `continue`.

This draft does not change that state.

## 3. Why this is not active yet

This is the first MODQN dashboard follow-on that clearly crosses the
producer/consumer boundary.

`ntn-sim-core` can add consumer-side projections over already-exported replay
truth, but it cannot legitimately invent new policy diagnostics if those
diagnostics are not exported by the producer in the first place.

At the same time, `modqn-paper-reproduction` is explicitly gated by
`Phase 01D`, which says reopen work requires a bounded new slice tied to a
valid trigger rather than a default continuation of reproduction work.

So this file is intentionally a kickoff draft only:

1. it names the likely next gap,
2. it records the likely bounded slice shape,
3. it does **not** authorize implementation yet.

## 4. Promotion trigger for future work

This draft may be promoted only if all of these happen:

1. a bounded producer-side reopen trigger is explicitly accepted under
   `modqn-paper-reproduction` `Phase 01D`, and
2. a bounded producer-side execution slice exists, and
3. a paired consumer-side execution surface exists in `ntn-sim-core`
   after re-checking the shipped Slice 2/3/4 baseline, and
4. the producer-side additive export surface has actually landed in a
   reviewed artifact or fixture that the consumer can target.

Valid examples include:

1. a user request for stronger policy explainability that the current bundle
   contract cannot answer,
2. a source-backed clarification of paper/runtime policy fields that would
   replace a current disclosure gap,
3. a concrete artifact/export defect that prevents the current dashboard from
   honestly showing policy choice structure.

## 5. Likely bounded slice shape

If this line is promoted later, the first bounded slice should stay additive
and narrow.

Producer-side candidates:

1. exporter-only helper or additive diagnostics surface rather than a training
   main-path rewrite,
2. additive bundle diagnostics such as top candidates, selected-serving score,
   preference gap, or equivalent policy-overview fields,
3. explicit disclosure when a diagnostic is unavailable for older artifacts.

Consumer-side candidates:

1. dashboard explainability panels over the newly exported diagnostics,
2. browser-visible proof that diagnostics shown in the UI came from exported
   bundle truth rather than frontend invention,
3. additive validation for producer-backed explainability without reopening
   native runtime semantics.

## 6. Required paired authority before implementation

No implementation should begin from this file alone.

The minimum authority pack now consists of:

1. one producer-side execution SDD in `modqn-paper-reproduction` tied to a
   valid `Phase 01D` reopen trigger:
   `phase-03b-ntn-sim-core-producer-diagnostics-export-sdd.md`,
2. one paired consumer-side execution draft in `ntn-sim-core`:
   `modqn-producer-diagnostics-consumer-follow-on.md`,
3. a consumer-side `todo/` handoff draft:
   `todo/modqn-producer-diagnostics-consumer/README.md`,
4. updated validation and status surfaces in both repos,
5. then, only after producer export actually lands, promotion into active
   implementation.

## 7. Likely validation shape if later promoted

If this line later becomes active, the likely validator split is:

1. producer-side export/contract validation in `modqn-paper-reproduction`,
2. a future `VAL-MODQN-BUNDLE-005`-class browser-visible consumer gate in
   `ntn-sim-core`,
3. reruns of landed `VAL-MODQN-BUNDLE-002` / `003` / `004` to prove the new
   explainability layer does not regress the already-shipped replay path.

This section is only directional. It is not an active validation requirement.

## 8. Non-negotiable boundaries

Even if later promoted, this line must still avoid:

1. rewriting producer training semantics as part of a dashboard task,
2. silently changing the meaning of frozen adapter contracts,
3. turning showcase-only overlays into authoritative truth,
4. treating `ntn-sim-core` alone as sufficient authority for new
   producer-owned policy diagnostics,
5. turning the dashboard track into live native-runtime MODQN takeover.

## 9. Immediate next action if work continues

The paired planning surfaces now exist on both sides.

The next concrete step is no longer "write the paired docs". The next step is:

1. land the producer-side additive export slice in
   `modqn-paper-reproduction`,
2. produce one reviewed artifact or fixture with the new diagnostics,
3. then re-check whether the consumer-side execution draft can be promoted
   into active implementation.

Until that producer-side landing exists, this file should still be treated as
planning context only.
