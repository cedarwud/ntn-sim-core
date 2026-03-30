# Phase 5 — Cleanup and Modularization

**Status:** Active — implementation-ready draft; finalize split/retirement plan against current repo state before Phase 5 code changes  
**Date (stub):** 2026-03-29  
**Depends on:** Phase 0 complete, Phase 1 complete, Phase 2 complete, Phase 3 complete, Phase 4 complete

---

## 1. Goal

Finish the platform refactor by removing structural debt that would otherwise keep reintroducing coupling.

Phase 5 is where the project is allowed to do the heavy structural cleanup intentionally deferred by earlier phases:

1. split oversized files
2. retire dead or compatibility-only paths
3. eliminate duplicate internal logic now that contracts are frozen
4. normalize ownership and directory boundaries
5. leave the repo in a state where downstream algorithm/UI work does not begin by editing monoliths

---

## 2. Scope

### 2.1 In Scope

| In scope | Authority reference |
|---|---|
| split `src/core/engine.ts` into `src/core/engine/` | `phase0-architecture-spec.md §0C.1 Phase 5 P5-1/P5-2` |
| finalize `profiles/defaults.ts` split and related cleanup | `phase0-architecture-spec.md §0C.1 Phase 5 P5-3`, `§0C.2 profiles/defaults.ts` |
| retire `tier3_5_scan_loss` dead path and stale compatibility branches | `phase0-architecture-spec.md §0C.2 high-risk area strategy` |
| migrate `benchmark-runner.ts` orbit bootstrap to `orbit/profile-runtime.ts` | `phase0-architecture-spec.md §0C.1 Phase 5 P5-4` |
| replace sync XHR in `useSimulation.ts` | `phase0-architecture-spec.md §0C.1 Phase 5 P5-5` |
| rename `viz/beam/beam-selection.ts` to resolve collision | `phase0-architecture-spec.md §0C.1 Phase 5 P5-6` |
| remove `ProfileConfig.sourceMap` and delete `composeProfile()` shim when safe | `phase0-architecture-spec.md §0C.1 Phase 5 P5-7` |
| enforce `VAL-PLAT-011/012` | `ntn-sim-core-validation-matrix.md` |

### 2.2 Not In Scope

| Out of scope | Reason |
|---|---|
| adding new model families or algorithm features | Phase 5 is structural only |
| modifying frozen external contracts | Phase 4 froze them |
| starting MODQN runtime or estnet integration | downstream gating still applies |
| product/demo UI expansion | downstream UI program |

---

## 3. Priority Hotspots

These are the primary cleanup targets:

1. `src/core/engine.ts`
2. `src/core/profiles/defaults.ts`
3. `src/core/profiles/types.ts`
4. large handover modules when they violate ownership or size expectations
5. stale replay / runner compatibility paths
6. leftover imports or compatibility shims that Phase 4 contract freeze made obsolete

### 3.1 Current Known Pressure

At planning time the repo already shows:

1. `engine.ts` far above the thin-orchestrator target
2. `defaults.ts` still historically large even after Phase 3 authoring split
3. `types.ts` still carrying compatibility surface that later phases should retire

This is why Phase 5 remains split into multiple groups rather than a single cleanup pass.

---

## 4. Ordered Implementation Plan

### 4.1 Group 1 — Cleanup Plan / Split Strategy

Group 1 must not start deleting broadly. It must first produce the executable cleanup plan:

1. which files split in Group 2
2. which legacy paths retire only in Group 3
3. which compatibility layers remain until the very end
4. exact ownership map for `engine/`, `profiles/`, runner/bootstrap cleanup

### 4.2 Group 2 — Core Structural Split

Group 2 handles the highest-risk structural work:

| Step | Files | Change |
|---|---|---|
| P5-1 | `src/core/engine/` | create orchestrator sub-modules such as `tick.ts`, `orbit-step.ts`, `channel-step.ts`, `handover-step.ts`, `kpi-step.ts`, `scheduler-step.ts` |
| P5-2 | `src/core/engine.ts` | extract step logic; reduce to thin orchestrator |
| P5-3 | `src/core/profiles/` | remove dead branches and any remaining stale Phase2/Phase3 labels/paths that should already be obsolete |
| P5-4 | `src/runner/headless/benchmark-runner.ts` | replace own orbit bootstrap with `orbit/profile-runtime.ts` calls |

Group 2 should establish the structural basis for `VAL-PLAT-011/012` but does not need to finish every retirement.

### 4.3 Group 3 — Final Cleanup / Legacy Retirement / Gate Closure

Group 3 performs the final removals once Group 2 is stable:

| Step | Files | Change |
|---|---|---|
| P5-5 | `src/app/hooks/useSimulation.ts` | remove sync XHR path |
| P5-6 | `src/viz/beam/beam-selection.ts` | rename to `beam-ui-selection.ts` and update imports |
| P5-7 | `src/core/profiles/` | remove `ProfileConfig.sourceMap`; delete `composeProfile()` shim once contracts are frozen and callers no longer require it |
| P5-8 | `scripts/validate-structure.mjs` | enforce size and orchestrator checks for VAL-PLAT-011/012 |

Group 3 is also responsible for final doc/status sync and gate-closure evidence.

---

## 5. High-Risk Migration Rules

### 5.1 `engine.ts`

Rules:

1. do not change frozen contract semantics while splitting
2. move physics steps out, but keep orchestration readable and deterministic
3. root `engine.ts` must end as a thin coordinator, not another mixed-responsibility file

### 5.2 `profiles/defaults.ts`

Rules:

1. after Phase 3, `defaults.ts` should already be an assembly/re-export surface
2. Phase 5 must not re-monolithize profile definitions
3. any remaining stale data duplication or compatibility truth should be removed here, not re-hidden

### 5.3 `profiles/types.ts`

Rules:

1. delete only what prior phases made redundant
2. do not remove compatibility fields before the corresponding contracts/callers are ready
3. `sourceMap` removal must happen only after registry is authoritative and Phase 4 contracts are frozen

### 5.4 Runner / Replay

Rules:

1. `benchmark-runner.ts` bootstrap duplication should be removed in this phase
2. replay/runner artifacts may evolve internally, but frozen external contracts must remain stable

---

## 6. Validation Gates

### 6.1 `VAL-PLAT-011` — No Oversized Core Files

Pass conditions:

1. no file in `src/core/` exceeds 650 lines
2. checks are enforced by validation tooling, not manual claims only

### 6.2 `VAL-PLAT-012` — Thin Orchestrator

Pass conditions:

1. `src/core/engine.ts` is ≤200 lines
2. core engine sub-modules live under `src/core/engine/`
3. root orchestrator does not contain direct physics formula logic
4. orchestration remains contract-compatible and existing runtime validations still pass

### 6.3 Required Validation Set Before Claiming Completion

At minimum:

1. `npm run lint`
2. `npm run validate:trace`
3. `npm run validate:profiles`
4. `npm run validate:runtime`
5. `npm run validate:stage`
6. augmented structural validation that enforces `VAL-PLAT-011/012`

---

## 7. Completion Criteria

Phase 5 is complete only when ALL of the following hold:

1. `src/core/engine.ts` is a thin orchestrator (≤200 lines)
2. physics/tick steps live in `src/core/engine/` sub-modules
3. no file in `src/core/` exceeds 650 lines
4. `benchmark-runner.ts` no longer owns duplicated orbit bootstrap logic
5. sync XHR in `useSimulation.ts` is eliminated
6. `viz/beam/beam-selection.ts` naming collision is resolved
7. `ProfileConfig.sourceMap` is removed
8. `composeProfile()` shim is removed
9. `VAL-PLAT-011` and `VAL-PLAT-012` pass
10. all pre-existing validation gates still pass
11. this SDD status is updated to complete
12. `ntn-sim-core-implementation-status.md`, `ntn-sim-core-validation-matrix.md`, and relevant README/blueprint docs are synced

---

## 8. Documentation Sync Requirements

When Phase 5 meaningfully advances or completes, update:

1. this file
2. `sdd/ntn-sim-core-implementation-status.md`
3. `sdd/ntn-sim-core-validation-matrix.md`
4. `docs/architecture/ntn-sim-core-architecture-blueprint.md`
5. `README.md` if entry-point guidance changes due to directory/layout changes
6. `todo/README.md` and Phase 5 prompt files if group sequencing changes

---

## 9. Downstream Gating

Only after Phase 5 completes should the repo be treated as ready for:

1. active MODQN runtime work
2. downstream UI/product expansion that depends on stable internal ownership
3. estnet consumer integration against finalized contracts

Until then, downstream programs must not force premature cleanup shortcuts.
