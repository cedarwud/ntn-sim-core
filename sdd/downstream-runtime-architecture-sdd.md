# Downstream Runtime Architecture SDD

**Status:** Active — Group 1 boundary frozen + Group 2 minimal skeleton landed (2026-03-31)
**Date:** 2026-03-31
**Clarified:** 2026-04-01 (post-Group-2 sync: fixed `view-models` path, hardened M1/U1 consume boundaries)
**Depends on:** Platform Refactor final audit passed; frozen contracts remain intact
**Group 1 completed:** 2026-03-31 — repo state verified, outlines promoted, boundary frozen
**Group 2 completed:** 2026-03-31 — minimal downstream skeleton landed at `src/core/algorithms/`, `src/core/experiments/`, and `src/viz/view-models/`

## 1. Purpose

Define the smallest shared architecture surface that should exist **before** starting downstream `MODQN` and baseline-oriented `UI` work.

This SDD is intentionally smaller than the Phase 1–5 platform program. It exists to prevent the next steps from:

1. re-introducing direct `engine` / `profiles` coupling;
2. mixing algorithm logic, experiment logic, and UI rendering logic in the same modules;
3. letting `UI` or future consumers bypass frozen contracts;
4. turning baseline reproduction into another hardwired one-off path.

## 2. Scope

### 2.1 In Scope

1. define the minimal downstream layer split:
   - `algorithms`
   - `experiments`
   - `view-models`
   - `adapters`
2. define what each layer owns and what it must not own;
3. define the promotion path from outline docs into the smallest active SDD surfaces for:
   - MODQN baseline reproduction
   - baseline-oriented UI work
4. define the minimum structural skeleton that may be landed before feature work starts.

### 2.2 Not In Scope

1. implementing MODQN training logic;
2. implementing baseline UI screens;
3. reopening Platform Refactor Phase 1–5;
4. activating standalone ESTNET consumer work inside `ntn-sim-core`;
5. introducing HOBS / EE / comparison variants.

## 3. Target Downstream Layers

### 3.1 `algorithms`

Purpose:
1. contain algorithm-facing runtime adapters and policy logic;
2. isolate baseline reproduction or future RL logic from `engine/` internals.

Allowed ownership:
1. baseline algorithm state/action/reward adapters;
2. baseline adapter config parsing that depends only on the approved frozen contract surface;
3. algorithm-specific observation shaping.

Forbidden ownership:
1. direct mutation of `engine/` internals;
2. UI rendering logic;
3. experiment artifact formatting;
4. consumer-specific transport logic.

### 3.2 `experiments`

Purpose:
1. define reproducible run specs, manifests, and artifact assembly for baseline experiments;
2. separate “how to run and record” from “how the algorithm works”.

Allowed ownership:
1. experiment spec types;
2. training/eval manifests;
3. artifact bundle assembly;
4. figure/chart input preparation for UI handoff.

Forbidden ownership:
1. direct UI rendering;
2. algorithm policy implementation;
3. internal engine orchestration beyond stable runner/contract surfaces.

### 3.3 `view-models`

Purpose:
1. convert frozen contract outputs into UI-oriented structures;
2. keep UI components away from raw runtime internals.

Allowed ownership:
1. KPI cards / chart series / timeline rows / parameter panel projections;
2. derived display-only formatting;
3. baseline result presentation models.

Forbidden ownership:
1. recomputing simulator truth;
2. direct dependency on `src/core/engine/` internals;
3. ad hoc provenance invention.

### 3.4 `adapters`

Purpose:
1. host consumer-specific bridges over frozen contracts;
2. isolate future `estnet` or other consumers from internal file layout.

Allowed ownership:
1. contract-to-consumer mapping;
2. export/import boundary helpers;
3. consumer-side DTO shaping.

Forbidden ownership:
1. owning simulation truth;
2. bypassing frozen contracts;
3. importing internal authored profile files as consumer dependencies.

## 4. Directory Guidance

The preferred minimum downstream layout is:

1. `src/core/algorithms/`
2. `src/core/experiments/`
3. `src/viz/view-models/`
4. `src/adapters/`

This SDD does **not** require all directories to be created immediately. Group 2 should create only the ones needed to support the first downstream scope:

1. baseline MODQN reproduction;
2. baseline result bundle;
3. baseline UI viewer / KPI presentation.

## 5. Ownership Rules

1. `engine/` remains simulation orchestration only.
2. `contracts/` remain the only stable consumer-facing truth boundary.
3. the approved baseline `algorithms/` path may depend on:
   - `contracts/`
   but should not depend on `models/`, authored profile implementation details, or other internal module surfaces unless a later downstream spec names that dependency explicitly.
4. `experiments/` may depend on:
   - `contracts/`
   - runner surfaces
   - `algorithms/`
   but should not own policy logic itself.
5. `view-models/` may depend on:
   - `contracts/`
   - a stable `ExperimentResult` / baseline result-bundle export after M3 defines it
   but should not depend on `engine/` or experiment manifest internals.
6. `adapters/` must sit at the boundary and may depend on:
   - `contracts/`
   - `view-models/`
   - stable experiment result types
   but should not import internal authored-profile modules.

## 6. Promotion Targets

Before downstream implementation starts, the following docs should be promoted or rewritten:

1. `modqn-baseline-spec-outline.md`
   - promoted into a baseline-only active MODQN spec
2. `ui-integration-roadmap.md`
   - promoted into a baseline UI active spec
3. `modqn-runtime-outline.md`
   - stays outline until baseline spec is clear, then becomes implementation surface
4. `modqn-experiment-outline.md`
   - stays outline until baseline runtime shape is clear, then becomes artifact/result surface
5. `estnet-ui-contract-outline.md`
   - remains paused

## 7. Group Plan

### Group 1 — Promotion / Boundary Freeze

Group 1 should:

1. verify the post-refactor repo still matches frozen downstream assumptions;
2. decide which of `algorithms/`, `experiments/`, `view-models/`, `adapters/` must exist immediately;
3. rewrite `modqn-baseline-spec-outline.md` and `ui-integration-roadmap.md` into the smallest active downstream spec surfaces;
4. update `todo/` sequencing so downstream work starts from the promoted surfaces, not directly from the older outline wording.

### Group 2 — Minimal Skeleton Landing

Group 2 should:

1. create the minimal downstream directories / index files / boundary types required by the promoted specs;
2. avoid landing full MODQN or full UI feature work;
3. ensure the skeleton uses frozen contracts rather than direct core internals;
4. leave actual baseline implementation to `M1/U1` and later groups.

## 8A. Group 1 Completion Record

**Group 1 completed 2026-03-31.**

### Repo State Verification (as of 2026-03-31)

The following frozen surfaces were confirmed intact:

| Surface | Status |
|---------|--------|
| `src/core/contracts/runtime-v1` | Frozen ✓ |
| `src/core/contracts/kpi-v1` | Frozen ✓ |
| `src/core/contracts/policy-v1` | Frozen ✓ |
| `src/core/contracts/exposure-v1` | Frozen ✓ |
| `src/runner/runner-exposure-api.ts` | Frozen ✓ |
| `src/runner/headless/benchmark-runner.ts` | Present ✓ |
| `src/app/hooks/` (useSimulation / useReplay / useBatchKpi) | Present ✓ |

### Directory Decision Record

| Directory | Decision | Rationale |
|-----------|----------|-----------|
| `src/core/algorithms/` | **Defer to Group 2** | Not needed until M1 adapter code lands |
| `src/core/experiments/` | **Defer to Group 2** | Not needed until M2 manifest types land |
| `src/viz/view-models/` | **Defer to Group 2** | Not needed until U1 baseline viewer lands |
| `src/adapters/` | **Defer beyond Group 2** | estnet is paused; no baseline-scope consumer |

### Outlines Promoted

| File | From | To |
|------|------|----|
| `modqn-baseline-spec-outline.md` | Outline | **Active baseline spec** |
| `ui-integration-roadmap.md` | Outline | **Active baseline UI spec** |
| `modqn-runtime-outline.md` | Outline | Outline + **explicit M2 promotion conditions** |
| `modqn-experiment-outline.md` | Outline | Outline + **explicit M3 promotion conditions** |
| `estnet-ui-contract-outline.md` | Outline (stale blocker) | Paused + **explicit promotion gate** |

---

## 8B. Frozen Downstream Boundary (M1 / U1)

These rules apply from M1 and U1 onward and may not be silently crossed.

### What `algorithms/` does / does not do

For the approved baseline M1 path, `algorithms/` imports only from frozen contracts.

**Does:**
- Implement `Policy` from `policy-v1`
- Build observation vectors from `PolicyObservation` inputs
- Map algorithm output to `PolicyAction`
- Compute rewards from `PolicyReward`

**Does NOT:**
- Mutate `engine/` internals
- Import from authored profile files
- Format experiment artifacts
- Import from `src/viz/**` or `src/app/**`

### What `experiments/` does / does not do

**Does:**
- Define reproducible run specs and training/eval manifests
- Assemble artifact bundles from `kpi-v1` outputs
- Prepare figure/chart input data for UI handoff

**Does NOT:**
- Own policy logic
- Drive engine orchestration beyond the runner surface
- Render UI directly

### What `view-models/` does / does not do

U1 entry consumes `KpiBundle`, `SimulationSnapshot`, `ParameterView`, and `RunnerExposureApi`.
A stable `ExperimentResult` / result-bundle handoff is a later M3 extension, not a prerequisite for entering U1.

**Does:**
- Convert `KpiBundle` → KPI card / chart series structures
- Convert `SimulationSnapshot` → timeline / replay display rows
- Convert `ParameterView` → parameter panel descriptors

**Does NOT:**
- Recompute simulator truth
- Import from `src/core/engine/` internals
- Invent provenance or metadata not present in contract outputs

### What `adapters/` does / does not do (future; deferred)

**Does:**
- Bridge frozen contracts to external consumer DTOs
- Export/import boundary helpers for `estnet` or other consumers

**Does NOT:**
- Own simulation truth
- Bypass frozen contracts
- Import internal authored profile files

### M1 / U1 hard crossing rules

M1 may NOT:
1. Cross into `src/core/experiments/` — that is M2 territory
2. Cross into `src/viz/view-models/` — that is U1 territory
3. Import `src/core/engine/` internal files directly
4. Import `src/adapters/` — deferred

U1 may NOT:
1. Import `src/core/algorithms/` internals (M1/M2 territory)
2. Import `src/core/experiments/` manifest internals (M2/M3 territory)
3. Import `src/core/engine/` internal files directly
4. Import `src/adapters/` — deferred

---

## 8C. Group 2 Completion Record

**Group 2 completed 2026-03-31.**

### Skeleton Directories Created

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/core/algorithms/` | `index.ts`, `types.ts` | M1 landing zone — `AlgorithmDescriptor`, re-exports `Policy` from contracts |
| `src/core/experiments/` | `index.ts`, `types.ts` | M2/M3 landing zone — `ExperimentManifest`, `ExperimentResult` |
| `src/viz/view-models/` | `index.ts`, `types.ts` | U1 landing zone — `KpiCardViewModel`, `ChartSeriesViewModel`, `KpiBundleProjector` |

`src/viz/view-models/` is the approved baseline UI location.
`src/app/view-models/` is not part of the current downstream path.

### Deliberately Not Created

| Directory | Rationale |
|-----------|-----------|
| `src/adapters/` | estnet remains paused; no baseline-scope external consumer |

### Contract Discipline Verified

- `src/core/algorithms/types.ts` imports only from `@/core/contracts/policy-v1`
- `src/core/experiments/types.ts` imports only from `@/core/contracts/kpi-v1`
- `src/viz/view-models/types.ts` imports only from `@/core/contracts/kpi-v1`
- No file imports from `@/core/engine/`, authored profiles, `@/viz/`, or `@/app/`

### Validation Results (2026-03-31)

| Gate | Result |
|------|--------|
| `npm run lint` | PASS |
| `npm run validate:contracts` | PASS (VAL-PLAT-008/009/010) |
| `npm run validate:stage` | PASS (full suite) |

---

## 8. Completion Criteria

This downstream-prep stage is complete only when:

1. the repo has a clear active downstream architecture surface;
2. `modqn-baseline-spec-outline.md` is no longer acting as a mere outline for the approved baseline scope;
3. `ui-integration-roadmap.md` is no longer acting as a mere outline for the approved baseline UI scope;
4. any newly created downstream skeleton directories are wired without violating frozen contracts;
5. `todo/README.md`, `todo/modqn/README.md`, and the then-current ESTNET handoff surface all point to the promoted downstream path.

**All five criteria are now satisfied as of Group 2 completion.**

## 9. Validation Expectations

At minimum, downstream-prep completion must preserve:

1. `npm run lint`
2. `npm run validate:contracts`
3. `npm run validate:stage`

If the structural skeleton touches UI-visible surfaces, also run the smallest relevant browser-visible validation path.
