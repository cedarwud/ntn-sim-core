# MODQN Producer Diagnostics And Explainability Follow-On

**Status:** Cross-repo kickoff record — producer prerequisite and paired consumer landing both completed
**Drafted:** 2026-04-16  
**Updated:** 2026-04-16
**Depends on:**
- [`modqn-external-bundle-loading-follow-on.md`](./modqn-external-bundle-loading-follow-on.md)
- [`modqn-story-dashboard-follow-on.md`](./modqn-story-dashboard-follow-on.md)
- [`modqn-replay-truth-hardening-follow-on.md`](./modqn-replay-truth-hardening-follow-on.md)
- [`/home/u24/papers/modqn-paper-reproduction/docs/phases/phase-03b-ntn-sim-core-producer-diagnostics-export-sdd.md`](/home/u24/papers/modqn-paper-reproduction/docs/phases/phase-03b-ntn-sim-core-producer-diagnostics-export-sdd.md)
- [`/home/u24/papers/modqn-paper-reproduction/artifacts/phase-03b-producer-diagnostics-export-status-2026-04-16.md`](/home/u24/papers/modqn-paper-reproduction/artifacts/phase-03b-producer-diagnostics-export-status-2026-04-16.md)

## 1. Why this record exists

`Slice 2`, `Slice 3`, and `Slice 4` already landed the consumer-side
path for:

1. browser-visible external bundle loading,
2. a shared story dashboard for sample and external bundles,
3. stronger replay-truth proof across dashboard / HUD / scene / probe.

The main remaining gap is no longer bundle ingest or replay-truth
acceptance.
The remaining gap is producer-owned explainability depth: why MODQN
preferred one candidate over another, how large the preference gap was,
and whether the current replay story is exposing enough policy detail
for a stronger demo or paper-facing narrative.

## 2. Current state after producer and consumer landing

The correct current interpretation is now:

1. `Slice 2` / `Slice 3` / `Slice 4` remain the latest landed
   consumer-side bundle path in `ntn-sim-core`,
2. producer-side `Phase 03B` has now landed in
   `modqn-paper-reproduction` commit
   `13fca4707a9f7a6690d335e351bd8d1805d9f10b`,
3. that producer landing establishes the additive exported
   `policyDiagnostics` / `optionalPolicyDiagnostics` contract surface,
4. the paired consumer-side SDD
   `modqn-producer-diagnostics-consumer-follow-on.md` is now a landed
   implementation record for `ntn-sim-core`,
5. `VAL-MODQN-BUNDLE-005` is landed in the current tree alongside the
   required `VAL-MODQN-BUNDLE-002` / `003` / `004` reruns.

This file therefore remains a cross-repo kickoff and boundary record.
It does not replace the active consumer-side execution surface.

## 3. What this file still does and does not authorize

This file still matters because it records the shared rationale and
cross-repo boundary:

1. why the missing gap was producer-owned diagnostics rather than more
   consumer-only replay work,
2. why the landed producer surface must remain additive and
   producer-owned,
3. why consumer implementation must stay within bundle-mode consumption
   and browser proof.

This file does **not** authorize:

1. new producer implementation in `modqn-paper-reproduction`,
2. new consumer code by itself,
3. any claim that this kickoff file itself is the active implementation
   authority.

## 4. Stable shared contract assumptions

Even after producer landing, this line must still preserve:

1. producer-owned diagnostics rather than consumer-invented semantics,
2. additive bundle fields rather than hidden rewrites of frozen Phase 03A
   meaning,
3. compatibility for older bundles that have no diagnostics,
4. separation between row-level explainability truth and
   manifest-level metadata/disclosure,
5. the rule that row-level `policyDiagnostics` remains the primary
   explainability truth even after the consumer landing.

## 5. Required paired authority for consumer work

Consumer work should not begin from this file alone.

The active paired authority pack now consists of:

1. one landed producer-side execution SDD in
   `modqn-paper-reproduction`:
   `phase-03b-ntn-sim-core-producer-diagnostics-export-sdd.md`,
2. one landed producer-side status note:
   `phase-03b-producer-diagnostics-export-status-2026-04-16.md`,
3. one landed consumer-side execution record in `ntn-sim-core`:
   `modqn-producer-diagnostics-consumer-follow-on.md`,
4. one active consumer-side `todo/` handoff pack:
   `todo/modqn-producer-diagnostics-consumer/README.md`,
5. updated validation and status surfaces in `ntn-sim-core`.

## 6. Validation shape after landing

The validator split remains:

1. producer-side export/contract validation in
   `modqn-paper-reproduction`,
2. the landed `VAL-MODQN-BUNDLE-005` browser-visible consumer gate in
   `ntn-sim-core`,
3. reruns of landed `VAL-MODQN-BUNDLE-002` / `003` / `004` to prove the
   new explainability layer does not regress the already-shipped replay
   path.

This section now records the landed validator split rather than a
directional future state.

## 7. Non-negotiable boundaries

Even after promotion, this line must still avoid:

1. rewriting producer training semantics as part of a dashboard task,
2. silently changing the meaning of frozen adapter contracts,
3. turning showcase-only overlays into authoritative truth,
4. treating `ntn-sim-core` alone as sufficient authority for new
   producer-owned policy diagnostics,
5. turning the dashboard track into live native-runtime MODQN takeover.

## 8. Immediate next action if work continues

The producer-side prerequisite and the paired consumer landing are now
both satisfied.

Any future work should treat this line as shipped baseline and only
reopen it with a new bounded follow-on, rather than continuing from this
kickoff record directly.
