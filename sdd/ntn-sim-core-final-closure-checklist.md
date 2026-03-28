# NTN Sim Core — Final Closure Checklist

**Version:** 0.3.2  
**Date:** 2026-03-27  
**Status:** Closed Companion — all project-level closure items and hardening IDs are closed for the current enforced SDD set

---

## 1. Purpose

This document preserves the project-level closure record for `ntn-sim-core` after the final replay-identity pass closed the last open item.

It exists to prevent two failure modes:

1. treating landed runtime/frontend baselines as if all phase-closure work were already complete;
2. letting contradictory document fragments obscure the actual remaining closure scope.

This checklist does not replace:

1. `ntn-sim-core-implementation-status.md` as the status authority;
2. `ntn-sim-core-validation-matrix.md` as the gate definition;
3. `ntn-sim-core-roadmap.md` as the execution order.
4. `ntn-sim-core-fc1-replay-closure-checklist.md` as the concrete implementation checklist for the final replay pass.

It is a closure companion that records the 3 closure buckets and their final disposition.

---

## 2. Final Closure Items

### FC-1 Replay Closure — ✅ closed (2026-03-25)

**Closure evidence**

1. `RunArtifactBundle` now carries both `replayManifest` and `replayArtifact`.
2. `replayArtifact` persists deterministic selected-window snapshots plus a replay-identity signature and samples.
3. frontend replay now hydrates from the replay-artifact contract rather than an unauditable local-only path.
4. `validate-replay-manifest.ts` now proves:
   - artifact bundle carries `replayArtifact`,
   - replay identity signature matches reconstructed window snapshots,
   - replay identity samples match reconstructed window snapshots,
   - replay controller initial state matches the saved replay artifact and manifest window.
5. `npm run validate:stage` passes with the replay-manifest gate in the standard validation chain.

**What remains out of scope**

1. legacy artifact-bundle replay remains explicitly de-scoped as a compatibility/error boundary and is not treated as a separate authoritative replay family.
2. FC-1 closure does not create a second replay model; the snapshot replay controller remains the authoritative frontend replay path.

**Primary gates**

1. `VAL-VIZ-001`
2. `VAL-RT-001`
3. `VAL-RT-002`
4. `VAL-CUR-001`

**Execution companion**

`ntn-sim-core-fc1-replay-closure-checklist.md`

### FC-2 Visual Validation and Tooling Closure — ✅ closed (2026-03-25)

**Closure evidence**

1. `validate-visual-browser.ts` now runs in a real browser via `playwright-core` + local Chrome and is part of `validate:stage`.
2. `VAL-BEAM-001` and `VAL-FV-005` through `VAL-FV-009` are now covered by automated browser-visible checks using the frontend validation probe.
3. overlay/link validation remains truth-driven and non-authoritative; the browser probe reads snapshot-driven renderer reports and does not recompute KPI values.

**What remains out of scope**

1. `FC-2` does not close `FC-1` replay identity/parity work.
2. `FC-2` did not, by itself, close `FC-3` Phase 5/6 deterministic proof work.

**Primary gates**

1. `VAL-FV-005`
2. `VAL-BEAM-001`
3. `VAL-FV-006`
4. `VAL-FV-007`
5. `VAL-FV-008`
6. `VAL-FV-009`

### FC-3 Phase 5/6 Proof Closure — ✅ closed (2026-03-25)

**Closure evidence**

1. `bh-resource-energy-proof` now provides a deterministic proof profile that exposes low-SINR, inactive-beam, and `energyBlocked` evidence on the browser path without changing the underlying physics code path.
2. `BhExplainabilityPanel` now exposes truth-driven low-SINR / inactive-beam / `energyBlocked` counts from the frontend validation store.
3. `validate-visual-browser.ts` now automates:
   - `VAL-EXP-001` low-SINR + inactive-beam explainability,
   - `VAL-FV-004` energy-blocked BH proof visibility,
   - `VAL-FV-009` replay preservation of DAPS dual-active continuity truth.
4. `npm run validate:stage` now passes end-to-end with the FC-3 browser proof path included.

**What remains out of scope**

1. `FC-3` does not close `FC-1` replay identity / saved-artifact parity work.
2. `bh-resource-energy-proof` is a deterministic proof profile; it does not replace future paper-specific BH scheduler families.

**Primary gates**

1. `VAL-EXP-001`
2. `VAL-FV-004`
3. `VAL-FV-009`

---

## 3. Completion Rule

This condition is now satisfied.

`ntn-sim-core` may now be described as "fully complete against the current enforced SDD set" because:

1. `FC-1`, `FC-2`, and `FC-3` are all closed;
2. replay identity/parity is validated through the saved replay-artifact path;
3. `ntn-sim-core-implementation-status.md`, `ntn-sim-core-validation-matrix.md`, and the frontend companion docs are expected to reflect the closed project-level state;
4. no deferred hardening IDs remain in the current enforced closure set.
