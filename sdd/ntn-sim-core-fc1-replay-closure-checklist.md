# NTN Sim Core — FC-1 Replay Closure Checklist

**Version:** 0.2.0  
**Date:** 2026-03-25  
**Status:** Closed — replay identity/parity closure landed on 2026-03-25

---

## 1. Purpose

This document records the landed implementation checklist that closed `FC-1 Replay Closure`.

It exists because the current project no longer has broad runtime or frontend gaps:

1. `FC-2` browser visual validation is closed.
2. `FC-3` Phase 5/6 deterministic proof closure is closed.
3. The final project-level blocker had been replay identity/parity across:
   - live/headless truth,
   - saved replay artifacts,
   - frontend replay consumption.

This checklist is narrower than the main SDD. It remains as the closure record for the replay-focused implementation pass.

---

## 2. Current Landed Baseline

The following are already landed and should not be re-opened unnecessarily:

1. `useReplay.ts` performs deterministic curated-window selection and snapshot replay.
2. `benchmark-runner.ts` emits `artifactBundle.replayManifest`.
3. `validate-replay-manifest.ts` proves deterministic window selection and `recordWindow()` parity against full-run slicing.
4. frontend replay overlays and browser validation already run against the snapshot replay path.
5. legacy `createReplayController()` is explicitly de-scoped and must not be treated as the authoritative replay implementation.

What had been missing was not replay existence, but replay **identity closure**.

---

## 3. Landed Work

### RC-1 Saved Replay Artifact Contract — ✅ done

**Goal**

Persist enough replay data so a saved artifact can be audited and replayed without silently re-running a different headless path.

**Former gap**

1. `RunArtifactBundle` stored `replayManifest`, but not a saved replay snapshot bundle or replay-truth signature.
2. Frontend replay reconstructed its own selected-window snapshots instead of proving identity against a saved artifact.

**Landed implementation**

1. Extend the artifact contract with a replay payload or replay identity record.
2. Store at least one of:
   - selected-window snapshots, or
   - a deterministic replay signature set sufficient for reconstruction auditing.
3. Make the artifact format explicit about which replay path is authoritative.

**Primary files**

1. `src/core/trace/types.ts`
2. `src/core/trace/factory.ts`
3. `src/runner/headless/benchmark-runner.ts`

**Outcome**

1. A saved benchmark artifact contains replay metadata beyond `windowStartSec/windowEndSec`.
2. That metadata is stable across repeated runs with the same seed/profile.
3. The saved format is referenced by SDD and validation docs.

---

### RC-2 Frontend Replay Hydration From Saved Identity — ✅ done

**Goal**

Prove that frontend replay can consume a saved replay identity path, not only locally reconstructed snapshots.

**Former gap**

1. `useReplay.ts` performed local headless reconstruction on mount.
2. The browser replay path was deterministic, but not yet tied to a persisted replay artifact as its evidence source.

**Landed implementation**

1. Add a replay hydration path that accepts saved replay identity input.
2. Keep the current snapshot replay controller as the runtime mechanism, but make its source auditable.
3. Preserve the current de-scope on legacy artifact-bundle replay unless it is fully replaced.

**Primary files**

1. `src/app/hooks/useReplay.ts`
2. `src/runner/replay/controller.ts`
3. `src/runner/headless/benchmark-runner.ts`

**Outcome**

1. Frontend replay can be initialized from saved replay identity data.
2. The replay source shown in HUD/validation metadata is no longer ambiguous.
3. The old de-scoped path cannot be mistaken for parity.

---

### RC-3 End-to-End Replay Identity Gate — ✅ done

**Goal**

Add a gate that proves `live/headless truth -> saved replay artifact -> frontend replay` are the same replay story.

**Former gap**

1. `validate-replay-manifest.ts` proved deterministic selection and `recordWindow()` parity.
2. It did not yet prove that saved replay identity and frontend replay hydration were end-to-end identical.

**Landed implementation**

1. Add a replay identity validation script or extend `validate-replay-manifest.ts`.
2. Compare:
   - replay window metadata,
   - selected event timing,
   - key truth fields (`servingSatId`, `continuityState`, `dapsPhase`, replay window bounds),
   - any saved replay signature introduced by `RC-1`.
3. Wire the new gate into `validate:stage`.

**Primary files**

1. `scripts/validate-replay-manifest.ts`
2. `package.json`
3. `src/viz/validation/store.ts` and replay-facing overlays only if extra surfaced metadata is needed

**Outcome**

1. A single automated gate proves saved replay identity and frontend replay agree.
2. `VAL-VIZ-001`, `VAL-RT-001`, `VAL-RT-002`, and `VAL-CUR-001` can be upgraded from `partial` to closed/browser- or runtime-backed states as appropriate.

---

## 4. Non-Goals

The following are not part of FC-1 and should not be mixed into this closure pass:

1. new beam renderer features;
2. new DAPS/BH physics;
3. paper-family scheduler expansion;
4. replacing the snapshot replay controller with a different replay model unless identity closure requires a minimal interface change.

---

## 5. Recommended Execution Order

1. `RC-1 Saved Replay Artifact Contract`
2. `RC-2 Frontend Replay Hydration From Saved Identity`
3. `RC-3 End-to-End Replay Identity Gate`
4. sync:
   - `ntn-sim-core-final-closure-checklist.md`
   - `ntn-sim-core-implementation-status.md`
   - `ntn-sim-core-validation-matrix.md`

---

## 6. Completion Rule

This condition is now satisfied.

`FC-1` is closed because:

1. saved replay identity data exists in the artifact path;
2. frontend replay consumes and validates that saved replay-artifact contract;
3. an automated gate verifies end-to-end replay identity/parity;
4. the project-level closure checklist can honestly say no closure items remain.
