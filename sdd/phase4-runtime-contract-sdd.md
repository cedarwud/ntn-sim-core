# Phase 4 — Runtime Contract Freeze

**Status:** Active — stub only; must be promoted to full spec before implementation  
**Date (stub):** 2026-03-29  
**Depends on:** Phase 0 complete, Phase 1 complete, Phase 2 complete, Phase 3 complete

---

## 1. Goal

Freeze stable, versioned contracts between `ntn-sim-core` runtime and external consumers so that:

1. UI / viz no longer need to import unstable internals
2. headless / replay / runner integration uses stable exposure surfaces
3. future MODQN runtime/training code depends on contracts, not file layout
4. `project/estnet-ui-kickoff` can later consume stable schemas instead of internal modules

After Phase 4, the simulator should expose stable contract files under `src/core/contracts/` and a stable profile/exposure surface that downstream programs can depend on without reading `ProfileConfig` internals.

---

## 2. Scope

### 2.1 In Scope

| In scope | Authority reference |
|---|---|
| `src/core/contracts/` directory | `phase0-architecture-spec.md §0C.1 Phase 4 P4-1` |
| `runtime-v1.ts` frozen snapshot contracts | `phase0-architecture-spec.md §0C.1 Phase 4 P4-2` |
| `kpi-v1.ts` and `policy-v1.ts` frozen contracts | `phase0-architecture-spec.md §0C.1 Phase 4 P4-3` |
| `exposure-v1.ts` exposure and profile-list contracts | `phase0-architecture-spec.md §0C.1 Phase 4 P4-4` |
| `RunnerExposureApi` adapter | `phase0-architecture-spec.md §0C.1 Phase 4 P4-5` |
| `useBatchKpi.ts` migration away from direct runner import | `phase0-architecture-spec.md §0C.1 Phase 4 P4-6` |
| `ControlPanel.tsx` migration away from hardcoded `PROFILE_OPTIONS` and direct `HandoverType` import | `phase0-architecture-spec.md §0C.1 Phase 4 P4-7` |
| `validate-contracts.mjs` + `VAL-PLAT-008/009/010` | `phase0-architecture-spec.md §0C.1 Phase 4 P4-8` |

### 2.2 Not In Scope

| Out of scope | Responsible phase |
|---|---|
| structural split of `engine.ts` | Phase 5 |
| structural split of `profiles/defaults.ts` beyond Phase 3 authoring surface | Phase 5 |
| deletion of `composeProfile()` shim | Phase 5 |
| removal of `ProfileConfig.sourceMap` | Phase 5 |
| polished UI product/demo work | downstream UI program |
| MODQN runtime/training implementation | downstream MODQN program |
| actual estnet UI integration code | downstream estnet program |

**Critical rule:** Phase 4 freezes contracts; it does **not** do large cleanup or architecture surgery.  
Acceptance-gates explicitly reject splitting `engine.ts` before contract freeze is complete.

---

## 3. External Consumers and Contract Layers

Phase 4 must explicitly satisfy these consumer categories:

| Consumer | What it needs | What it must NOT need after Phase 4 |
|---|---|---|
| internal visualization (`src/viz/**`) | stable snapshot and exposure contracts | direct import from `core/common/types.ts` or `core/profiles/types.ts` |
| app hooks (`src/app/hooks/**`) | stable runner/exposure API | direct import from `runner/headless/benchmark-runner` when exposure wrapper exists |
| headless / replay tooling | stable runtime/KPI/manifests surface | knowledge of profile file layout |
| future MODQN | stable observation/action/KPI contract | direct dependence on `engine.ts` internals |
| future `estnet-ui-kickoff` | stable snapshot/profile/exposure schemas | direct dependency on repo-internal module boundaries |

### 3.1 Contract Families

Phase 4 must stabilize these files:

1. `src/core/contracts/runtime-v1.ts`
2. `src/core/contracts/kpi-v1.ts`
3. `src/core/contracts/policy-v1.ts`
4. `src/core/contracts/exposure-v1.ts`

These files are **versioned public contracts** for downstream code inside this repo and for future external consumers.

---

## 4. Target Contract Surfaces

### 4.1 `runtime-v1.ts`

Frozen re-export surface for runtime snapshots and related truth objects.

At minimum it must expose:

1. `SimulationSnapshot`
2. `SatelliteState`
3. `UeState`
4. `BhSlotSnapshot`
5. `DapsSnapshot`
6. `HoLogEntry`

Rules:
- each exported type must carry a clear `@version v1` and `@frozen` annotation
- types may be re-exported from current internal homes, but consumers must import the contract file instead
- any later breaking change requires a version bump, not a silent edit

### 4.2 `kpi-v1.ts`

Frozen KPI-facing contract.

At minimum it must expose:

1. `KpiBundle` or equivalent canonical KPI aggregate
2. any snapshot-to-KPI summary types needed by UI or batch tooling

Rules:
- no UI-specific formatting logic
- raw KPI truth only

### 4.3 `policy-v1.ts`

Frozen policy-facing contract.

At minimum it must expose:

1. `PolicyObservation`
2. `PolicyAction`

This is the contract future MODQN code should depend on, rather than importing policy internals or `engine.ts` implementation details.

### 4.4 `exposure-v1.ts`

Frozen exposure and profile-list contract.

At minimum it must define:

1. `ParameterView`
2. `ParameterMetadataResponse`
3. `ProfileListEntry`
4. `getProfileList()` contract and output expectations

Rules:
- backed by Phase 1 registry and Phase 3 profile/exposure metadata
- not backed by hardcoded UI arrays
- must be sufficient for `ControlPanel` and future consumers to list profiles without reading `defaults.ts`

### 4.5 Input / Output Schema Scope

Phase 4 should also clarify the relationship between:

1. simulation input schema
2. simulation snapshot schema
3. KPI output schema
4. experiment manifest schema
5. model-bundle selection schema

This does **not** require fully new runtime execution paths; it requires stable contract naming and ownership boundaries.

---

## 5. Import Boundary Rules

### 5.1 Forbidden Consumer Imports After Phase 4

After Phase 4:

1. `src/viz/**` must not import runtime truth directly from:
   - `src/core/common/types.ts`
   - `src/core/profiles/types.ts`
2. UI/profile listing must not depend on hardcoded `PROFILE_OPTIONS`
3. `useBatchKpi.ts` must not depend directly on `runner/headless/benchmark-runner`

### 5.2 Allowed Boundaries

Allowed access patterns:

1. viz/app code -> `src/core/contracts/*`
2. app hooks -> `RunnerExposureApi`
3. runner internals -> internal modules
4. downstream consumers -> contracts and exposure API only

---

## 6. Ordered Implementation Plan

### 6.1 Group 1 — Spec Promotion

Group 1 promotes this SDD from stub to implementation-ready spec and must:

1. finalize contract family definitions
2. finalize boundary rules
3. finalize `VAL-PLAT-008/009/010`
4. finalize versioning/freeze rules

### 6.2 Group 2 — Implementation

Group 2 implements the spec:

| Step | Files | Change |
|---|---|---|
| P4-1 | `src/core/contracts/` | create directory + `index.ts` |
| P4-2 | `src/core/contracts/runtime-v1.ts` | export runtime snapshot contracts with `@version v1` + `@frozen` |
| P4-3 | `src/core/contracts/kpi-v1.ts`, `policy-v1.ts` | freeze KPI/policy-facing contracts |
| P4-4 | `src/core/contracts/exposure-v1.ts` | define exposure/profile-list contract backed by registry + profile metadata |
| P4-5 | `src/runner/runner-exposure-api.ts` | define exposure adapter surface over benchmark/runner behavior |
| P4-6 | `src/app/hooks/useBatchKpi.ts` | move to `RunnerExposureApi` |
| P4-7 | `src/viz/overlays/ControlPanel.tsx` | replace hardcoded profile list and direct `HandoverType` dependency |
| P4-8 | `scripts/validate-contracts.mjs` | implement contract import-boundary and contract-presence checks |

---

## 7. Validation Gates

### 7.1 `VAL-PLAT-008` — Frozen Runtime Contracts Exist

Pass conditions:

1. `src/core/contracts/runtime-v1.ts` exists
2. it exports the required snapshot/runtime truth types
3. each exported type is annotated as frozen/versioned

### 7.2 `VAL-PLAT-009` — Viz/App No Longer Import Internal Runtime Types Directly

Pass conditions:

1. no viz-layer file imports directly from `core/common/types.ts`
2. no viz-layer file imports directly from `core/profiles/types.ts`
3. contract-layer imports are used instead

### 7.3 `VAL-PLAT-010` — Exposure Contract Exists and Lists All Profiles

Pass conditions:

1. `getProfileList()` exists on the exposure side
2. all 14 profiles are returned
3. every entry has valid `family` and `tier`
4. the data is not sourced from hardcoded UI-only truth

### 7.4 Required Validation Set Before Claiming Completion

At minimum:

1. `npm run lint`
2. `npm run validate:trace`
3. `npm run validate:profiles`
4. `npm run validate:runtime`
5. `npm run validate:stage`
6. `validate-contracts.mjs` or the final `npm` wrapper that runs it

---

## 8. Completion Criteria

Phase 4 is complete only when ALL of the following hold:

1. `src/core/contracts/` exists with:
   - `runtime-v1.ts`
   - `kpi-v1.ts`
   - `policy-v1.ts`
   - `exposure-v1.ts`
2. `RunnerExposureApi` exists and `useBatchKpi.ts` no longer imports benchmark-runner directly
3. `ControlPanel.tsx` no longer imports `HandoverType` from `core/profiles/types`
4. `ControlPanel.tsx` no longer depends on hardcoded `PROFILE_OPTIONS`
5. `VAL-PLAT-008`, `VAL-PLAT-009`, `VAL-PLAT-010` pass
6. pre-existing validation gates still pass
7. this SDD status is updated to complete
8. `ntn-sim-core-implementation-status.md` and `ntn-sim-core-validation-matrix.md` are synced in the same change set

---

## 9. Documentation Sync Requirements

When Phase 4 meaningfully advances or completes, update:

1. this file
2. `sdd/ntn-sim-core-implementation-status.md`
3. `sdd/ntn-sim-core-validation-matrix.md`
4. `sdd/ntn-sim-core-ui-exposure-spec.md` if exposure contract types are finalized here
5. `todo/README.md` and Phase 4/5 prompt packs if sequencing changes

---

## 10. Downstream Gating

Before this phase is complete:

1. MODQN runtime must not depend on unstable internal snapshot/policy types
2. UI product/demo work must not bypass exposure contracts
3. `estnet-ui-kickoff` must not be integrated against internal module paths

Only after Phase 4 completes may downstream programs treat the contract surfaces as stable.
