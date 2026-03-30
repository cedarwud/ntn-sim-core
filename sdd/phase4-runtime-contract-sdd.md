# Phase 4 — Runtime Contract Freeze

**Status:** Complete — Group 1 (2026-03-30): spec frozen. Group 2 (2026-03-30): contracts landed, consumers migrated, VAL-PLAT-008/009/010 all PASS, validate:stage green.
**Date (v1 — Group 1 spec frozen):** 2026-03-30
**Date (v1 — Group 2 implementation complete):** 2026-03-30
**Depends on:** Phase 0 complete, Phase 1 complete, Phase 2 complete, Phase 3 complete

---

## 1. Goal

Freeze stable, versioned contracts between `ntn-sim-core` runtime and external consumers so that:

1. UI / viz no longer need to import unstable internals
2. headless / replay / runner integration uses stable exposure surfaces
3. future MODQN runtime/training code depends on contracts, not file layout
4. `project/estnet-ui-kickoff` can later consume stable schemas instead of internal modules

After Phase 4, the simulator must expose stable contract files under `src/core/contracts/` and a stable profile/exposure surface that downstream programs can depend on without reading `ProfileConfig` internals.

---

## 2. Scope

### 2.1 In Scope

| In scope | Authority reference |
|---|---|
| `src/core/contracts/` directory and barrel `index.ts` | `phase0-architecture-spec.md §0C.1 Phase 4 P4-1` |
| `runtime-v1.ts` frozen snapshot contracts | `phase0-architecture-spec.md §0C.1 Phase 4 P4-2` |
| `kpi-v1.ts` and `policy-v1.ts` frozen contracts | `phase0-architecture-spec.md §0C.1 Phase 4 P4-3` |
| `exposure-v1.ts` exposure and profile-list contracts | `phase0-architecture-spec.md §0C.1 Phase 4 P4-4` |
| `RunnerExposureApi` adapter (`src/runner/runner-exposure-api.ts`) | `phase0-architecture-spec.md §0C.1 Phase 4 P4-5` |
| `useBatchKpi.ts` migration away from direct runner import | `phase0-architecture-spec.md §0C.1 Phase 4 P4-6` |
| `ControlPanel.tsx` migration away from hardcoded `PROFILE_OPTIONS` and direct `HandoverType` import from profiles | `phase0-architecture-spec.md §0C.1 Phase 4 P4-7` |
| All `src/viz/**` import migration from `common/types` → `contracts/runtime-v1` | this SDD §9.2 step P4-7b |
| `scripts/validate-contracts.mjs` + `npm run validate:contracts` | `phase0-architecture-spec.md §0C.1 Phase 4 P4-8` |

### 2.2 Not In Scope

| Out of scope | Responsible phase |
|---|---|
| Structural split of `engine.ts` into sub-modules | Phase 5 |
| Structural split of `profiles/defaults.ts` beyond Phase 3 authoring surface | Phase 5 |
| Deletion of `composeProfile()` shim | Phase 5 |
| Removal of `ProfileConfig.sourceMap` | Phase 5 |
| Deletion of `src/core/common/types.ts` or `src/core/profiles/types.ts` | Phase 5+ (contracts re-export from them; source files remain) |
| Polished UI product/demo work | downstream UI program |
| MODQN runtime/training implementation | downstream MODQN program |
| Actual `estnet-ui-kickoff` integration code | downstream estnet program |

**Critical rule:** Phase 4 freezes contracts; it does **not** do large cleanup or architecture surgery.
Acceptance gates explicitly reject splitting `engine.ts` before contract freeze is complete.

---

## 3. External Consumers and Contract Layers

Phase 4 must explicitly satisfy these consumer categories:

| Consumer | Stable surface needed | Forbidden access pattern after Phase 4 |
|---|---|---|
| `src/viz/**` (internal visualization) | `src/core/contracts/runtime-v1`, `exposure-v1` | direct import from `core/common/types` or `core/profiles/types` |
| `src/app/hooks/**` (app hooks) | `src/runner/runner-exposure-api`, `src/core/contracts/*` | direct import from `runner/headless/benchmark-runner` when exposure wrapper exists |
| `src/runner/**` (headless / replay) | internal modules freely | N/A — runner internals are not restricted |
| future MODQN | `src/core/contracts/policy-v1`, `kpi-v1`, `runtime-v1` | direct dependence on `engine.ts` internals or `policy/types.ts` |
| future `estnet-ui-kickoff` | `src/core/contracts/exposure-v1`, `runtime-v1`, `kpi-v1` | direct dependency on repo-internal module file paths |

### 3.1 Contract Files (complete list)

| File | Owner scope | Consumers |
|---|---|---|
| `src/core/contracts/runtime-v1.ts` | tick-level snapshot truth types | `src/viz/**`, future estnet |
| `src/core/contracts/kpi-v1.ts` | KPI output + batch summary types | `src/app/hooks/useBatchKpi.ts`, `src/viz/overlays/BatchKpiPanel.tsx`, future MODQN |
| `src/core/contracts/policy-v1.ts` | policy interface types | future MODQN, external policy plugins |
| `src/core/contracts/exposure-v1.ts` | profile-list, HandoverType, ParameterView | `src/viz/overlays/ControlPanel.tsx`, future estnet |
| `src/runner/runner-exposure-api.ts` | runner adapter (NOT a contracts/ file) | `src/app/hooks/useBatchKpi.ts` only |

---

## 4. Contract Definitions (Operative Authority for Group 2)

This section is the operative authority for Group 2 implementation.
Where Phase 0 stub SDD conflicts with this section, **this section takes precedence.**

### 4.1 `runtime-v1.ts`

**File:** `src/core/contracts/runtime-v1.ts`
**Operation:** re-export only — no new logic, no new type definitions
**Source:** `src/core/common/types.ts`
**Consumers:** all `src/viz/**` modules
**Forbidden imports in this file:** `engine.ts`, `profiles/`, `runner/`, `kpi/`, `policy/`

**Required file header:**
```typescript
/**
 * Runtime Contract v1 — frozen snapshot types for viz and external consumers.
 *
 * @version v1
 * @frozen — breaking changes require a new file: runtime-v2.ts
 *
 * Source: src/core/common/types.ts (re-export only)
 * Consumers: src/viz/**, future estnet-ui-kickoff
 * Forbidden imports in this file: engine.ts, profiles/, runner/, kpi/, policy/
 */
```

**Types to re-export (all 9 required, each must carry `@version v1` + `@frozen` in the re-export comment):**

| Type name | Source in `common/types.ts` | Consumer usage |
|---|---|---|
| `SimulationSnapshot` | line ~215 | all viz components consume per tick |
| `SatelliteState` | line ~245 | EarthMovingBeamLayer, SatelliteSkyLayer, BeamInfoOverlay, HandoverLinkOverlay |
| `UeState` | line ~265 | HandoverLinkOverlay, BeamInfoOverlay, beam-selection.ts |
| `BhSlotSnapshot` | line ~159 | EarthFixedCellLayer, bh-cell-analysis.ts |
| `DapsSnapshot` | line ~171 | EarthMovingBeamLayer, HandoverLinkOverlay |
| `HoLogEntry` | line ~198 | HoEventLogOverlay |
| `SatelliteBeamSnapshot` | line ~231 | EarthMovingBeamLayer, moving-beam-geometry.ts |
| `BeamRole` | line ~180 | viz/validation/store.ts |
| `ContinuityState` | line ~188 | viz/validation/store.ts, HandoverLinkOverlay |

**Types explicitly NOT exported from `runtime-v1.ts`** (not snapshot truth; remain in `common/types.ts`):
- `SourceTier`, `SpecMode`, `SourceReference` — param/provenance concerns
- `PresentationMode`, `OrbitMode`, `BeamSemantics` — config concerns
- `ObserverLocation`, `TimeControl`, `SeededRng`, `createRng` — config/utility
- `KpiBundleShell` — legacy shell; real KPI is in `kpi-v1.ts`

### 4.2 `kpi-v1.ts`

**File:** `src/core/contracts/kpi-v1.ts`
**Operation:** re-export `KpiBundle`; define `BatchKpiEntry` here (move from `useBatchKpi.ts`)
**Sources:** `src/core/kpi/types.ts` (KpiBundle), plus inline definition
**Consumers:** `src/app/hooks/useBatchKpi.ts`, `src/viz/overlays/BatchKpiPanel.tsx`, future MODQN training loop
**Forbidden imports in this file:** `engine.ts`, `runner/`, `viz/`, React

**Required file header:**
```typescript
/**
 * KPI Contract v1 — frozen KPI output and batch summary types.
 *
 * @version v1
 * @frozen — breaking changes require a new file: kpi-v2.ts
 *
 * Sources: src/core/kpi/types.ts (re-export); BatchKpiEntry defined here
 * Consumers: src/app/hooks/useBatchKpi.ts, BatchKpiPanel.tsx, future MODQN
 * Forbidden imports in this file: engine.ts, runner/, viz/, React
 */
```

**Types to export:**

| Type | Source | Purpose |
|---|---|---|
| `KpiBundle` | re-export from `core/kpi/types.ts` | full run KPI aggregate |
| `BatchKpiEntry` | **DEFINE HERE** (migrate from `useBatchKpi.ts`) | per-profile batch result summary |

**`BatchKpiEntry` definition (authoritative — migrate this from `useBatchKpi.ts`):**
```typescript
/**
 * @version v1
 * @frozen
 */
export interface BatchKpiEntry {
  profileId: string;
  kpi: KpiBundle;
  wallClockMs: number;
}
```

**DECISION-POINT-DP1:** Should `RunManifest` and `RunArtifactBundle` (currently in `trace/types.ts`) be re-exported here for consumers that need run-level metadata alongside KPI? **Recommendation: do NOT include in Phase 4.** Trace types stay in `trace/types.ts`. Group 2 may revisit if a concrete Phase 4 consumer needs them — but it must not speculatively add them.

### 4.3 `policy-v1.ts`

**File:** `src/core/contracts/policy-v1.ts`
**Operation:** re-export only — no new logic
**Source:** `src/core/policy/types.ts`
**Consumers:** future MODQN implementation, external policy plugins
**Forbidden imports in this file:** `engine.ts`, `runner/`, `viz/`, React

**Required file header:**
```typescript
/**
 * Policy Contract v1 — frozen policy interface types for MODQN and external plugins.
 *
 * @version v1
 * @frozen — breaking changes require a new file: policy-v2.ts
 *
 * Source: src/core/policy/types.ts (re-export only)
 * Consumers: future MODQN, external policy plugins
 * Forbidden imports in this file: engine.ts, runner/, viz/, React
 */
```

**Types to re-export (8 types, all from `policy/types.ts`):**

| Type | Purpose |
|---|---|
| `PolicyObservation` | full tick observation — MODQN primary input |
| `PolicyAction` | full tick action — MODQN primary output |
| `PolicyReward` | reward signal for online learning |
| `Policy` | plugin interface that MODQN implements |
| `SatelliteObservation` | per-satellite component of `PolicyObservation` |
| `UeObservation` | per-UE component of `PolicyObservation` |
| `SatelliteAction` | per-satellite component of `PolicyAction` |
| `HandoverAction` | HO control action component |

**Types explicitly NOT in `policy-v1.ts`:**
- `RewardWeights`, `DEFAULT_REWARD_WEIGHTS` — MODQN training hyperparameters, not frozen in v1

### 4.4 `exposure-v1.ts`

**File:** `src/core/contracts/exposure-v1.ts`
**Operation:** define new types + `getProfileList()` function; re-export `HandoverType`
**Sources:** `src/core/profiles/defaults.ts` (DEFAULT_PROFILES), `src/core/profiles/profile-composer.ts` (decomposeProfile), `src/core/profiles/types.ts` (HandoverType only)
**Consumers:** `src/viz/overlays/ControlPanel.tsx`, future estnet-ui-kickoff, any profile-listing consumer
**Forbidden imports in this file:** `engine.ts`, `runner/`, React, hardcoded profile arrays

**Note on rule X3 compliance:** `exposure-v1.ts` is the only contract file that imports from `profiles/`. This is a deliberate bridge layer exception. The file is NOT a leaf; it is the stable exposure surface over the profile authoring layer.

**Required file header:**
```typescript
/**
 * Exposure Contract v1 — profile-list, HandoverType, and parameter exposure contracts.
 *
 * @version v1
 * @frozen — breaking changes require a new file: exposure-v2.ts
 *
 * Sources: profiles/defaults.ts + profile-composer.ts (for getProfileList); profiles/types.ts (HandoverType)
 * Consumers: src/viz/overlays/ControlPanel.tsx, future estnet-ui-kickoff
 * Forbidden imports in this file: engine.ts, runner/, React, hardcoded profile arrays
 */
```

#### 4.4.1 `ProfileListEntry`

```typescript
/**
 * One entry in the profile selector list.
 *
 * Backed by ProfileBundle.exposurePreset — NOT backed by hardcoded ControlPanel arrays.
 * Ordering: Realistic → Advanced → Sensitivity; within tier: DEFAULT_PROFILES declaration order.
 *
 * @version v1
 * @frozen
 */
export interface ProfileListEntry {
  /** Profile ID matching ProfileConfig.id and ProfileBundle.id. */
  id: string;
  /** Profile family identifier (ProfileFamily union string). */
  family: string;
  /** Spec-mode tier for grouping in the UI. */
  tier: 'Realistic' | 'Advanced' | 'Sensitivity';
  /** Display label for the profile selector. */
  label: string;
}
```

#### 4.4.2 `getProfileList()`

```typescript
/**
 * Returns the ordered list of all active profiles for UI display.
 *
 * Data source: DEFAULT_PROFILES → decomposeProfile → bundle.exposurePreset
 * NOT backed by the hardcoded PROFILE_OPTIONS constant in ControlPanel.tsx.
 *
 * Ordering contract (stable across versions):
 *   1. 'Realistic' tier entries
 *   2. 'Advanced' tier entries
 *   3. 'Sensitivity' tier entries
 *   Within each tier: order matches DEFAULT_PROFILES declaration order.
 *
 * Expected return: 14 entries (one per profile in DEFAULT_PROFILES).
 *
 * @version v1
 * @frozen — signature is stable; the 14-entry set expands only in Phase 5+
 */
export function getProfileList(): ProfileListEntry[]
```

**Implementation contract for Group 2:**
1. Import `DEFAULT_PROFILES` from `profiles/defaults.ts`
2. Import `decomposeProfile` from `profiles/profile-composer.ts`
3. For each profile in DEFAULT_PROFILES: call `decomposeProfile(profile)`, extract `bundle.id`, `bundle.family`, `bundle.exposurePreset.tier`, `bundle.exposurePreset.label`
4. Map to `ProfileListEntry[]`; sort by tier order (Realistic < Advanced < Sensitivity), then by insertion order within each tier
5. Return the sorted list

**DECISION-POINT-DP2:** If Group 2 finds that importing `profiles/defaults.ts` from within `contracts/` creates problematic circular imports, `getProfileList()` may be implemented in `runner-exposure-api.ts` instead and re-exported from `exposure-v1.ts` as a forwarding stub. The contract interface (input: none, output: `ProfileListEntry[]`) is frozen either way.

#### 4.4.3 `HandoverType` re-export

```typescript
/**
 * Frozen re-export of HandoverType for viz/exposure consumers.
 *
 * After Phase 4: ControlPanel.tsx must import HandoverType from this file,
 * NOT from '@/core/profiles/types'.
 *
 * @version v1
 * @frozen — the union member set is stable; new members require a version note
 */
export type { HandoverType } from '@/core/profiles/types';
```

**Why HandoverType belongs in `exposure-v1.ts`:** ControlPanel uses it as an exposure/UI concern (which HO algorithms are shown in the dropdown). It is not a snapshot truth type, not a KPI type, and not a policy type — it is a profile/experiment selection type surfaced for UI configuration.

#### 4.4.4 `ParameterView` and `ParameterMetadataResponse` (Phase 4 stub)

These types are needed for future MODQN/estnet consumers. For Phase 4, define stubs marked `@decision-pending`:

```typescript
/**
 * Per-profile view of one parameter registry entry.
 * Backed by Phase 1 PARAMETER_REGISTRY + ProfileParameterBinding.
 *
 * @version v1-draft
 * @decision-pending — DECISION-POINT-DP3: full field set deferred until first active consumer (MODQN/estnet).
 *   Group 2 must create this stub; Group 2 must NOT expand it beyond this definition unless an active
 *   Phase 4 consumer (ControlPanel, useBatchKpi, runner-exposure-api) explicitly requires it.
 */
export interface ParameterView {
  parameterId: string;
  profileId: string;
  value: number | string | boolean;
  unit?: string;
  tier: 'normative' | 'paper-backed' | 'standard-backed' | 'assumption-backed';
  specMode?: 'Realistic' | 'Advanced' | 'Sensitivity' | 'Internal-only';
  sourceId?: string;
}

/**
 * Response to a parameter metadata query for one profile.
 *
 * @version v1-draft
 * @decision-pending — DECISION-POINT-DP3: deferred until MODQN/estnet needs it.
 */
export interface ParameterMetadataResponse {
  profileId: string;
  parameters: ParameterView[];
}
```

### 4.5 `RunnerExposureApi` (`src/runner/runner-exposure-api.ts`)

**File:** `src/runner/runner-exposure-api.ts`
**Location rationale:** This adapter wraps `runner/headless/benchmark-runner.ts` internals. It MUST live in `src/runner/`, NOT in `src/core/contracts/`. App hooks import this file; viz files must NOT import this file (they get data via hooks).
**Consumers:** `src/app/hooks/useBatchKpi.ts` only
**Forbidden from importing this:** `src/viz/**`, `src/core/**`

**Interface definition (authoritative for Group 2):**

```typescript
/**
 * RunnerExposureApi — adapter between app hooks and runner internals.
 *
 * @version v1
 * @frozen — interface is stable; changes require version bump
 *
 * Location: src/runner/runner-exposure-api.ts
 * Consumers: src/app/hooks/useBatchKpi.ts only
 * Forbidden from importing this: src/viz/**, src/core/**
 */

import type { KpiBundle, BatchKpiEntry } from '@/core/contracts/kpi-v1';
import type { HandoverType } from '@/core/contracts/exposure-v1';
export type { BatchKpiEntry };

export interface RunnerBenchmarkRequest {
  profileId: string;
  /** Override handover type for A/B comparison runs. */
  handoverTypeOverride?: HandoverType;
  /** Override seed for reproducibility. */
  seedOverride?: number;
}

export interface RunnerBenchmarkResponse {
  profileId: string;
  kpiBundle: KpiBundle;
  wallClockMs: number;
}

/**
 * Run one profile headlessly. Wraps executeBenchmarkRun from benchmark-runner.ts.
 * @version v1
 * @frozen
 */
export function executeBenchmark(req: RunnerBenchmarkRequest): RunnerBenchmarkResponse

/**
 * Returns profile list for consumers that want one import location.
 * Forwarding re-export from exposure-v1.
 * DECISION-POINT-DP4: Group 2 may remove this if useBatchKpi imports exposure-v1 directly.
 */
export { getProfileList } from '@/core/contracts/exposure-v1';
```

**Implementation contract for Group 2:** `executeBenchmark()` must map `RunnerBenchmarkRequest` to `BenchmarkRunConfig` (benchmark-runner's input type), call `executeBenchmarkRun()`, and map the result to `RunnerBenchmarkResponse`. The mapping is thin: `profileId` passes through, `handoverTypeOverride` maps to `BenchmarkRunConfig.handoverTypeOverride`, and the result extracts `.kpiBundle` and `.wallClockMs`.

---

## 5. Import Boundary Rules

### 5.1 Forbidden Consumer Imports After Phase 4

The following import patterns must be **absent** after Phase 4. These are the enforcement targets for `validate-contracts.mjs`.

| # | Forbidden pattern | Location checked | Correct replacement |
|---|---|---|---|
| F1 | `from '@/core/common/types'` | `src/viz/**/*.{ts,tsx}` | `from '@/core/contracts/runtime-v1'` |
| F2 | `from '@/core/profiles/types'` | `src/viz/**/*.{ts,tsx}` | `from '@/core/contracts/exposure-v1'` (for `HandoverType`) |
| F3 | `from '@/runner/headless/benchmark-runner'` | `src/app/hooks/**/*.ts` | `from '@/runner/runner-exposure-api'` |
| F4 | `PROFILE_OPTIONS` identifier | `src/viz/**/*.{ts,tsx}` | replaced by `getProfileList()` call |
| F5 | `from '@/core/policy/types'` | `src/viz/**/*.{ts,tsx}`, `src/app/hooks/**/*.ts` | `from '@/core/contracts/policy-v1'` |
| F6 | `from '@/runner/runner-exposure-api'` | `src/viz/**/*.{ts,tsx}` | N/A — viz must NOT import runner adapter; data flows via hooks → props |

**Grep patterns for `validate-contracts.mjs` (JavaScript regex):**

```javascript
// F1: viz importing common/types
{ pattern: /import\s+.*from\s+['"]@\/core\/common\/types['"]/, scope: 'src/viz', expectedCount: 0 }

// F2: viz importing profiles/types
{ pattern: /import\s+.*from\s+['"]@\/core\/profiles\/types['"]/, scope: 'src/viz', expectedCount: 0 }

// F3: hooks importing benchmark-runner directly
{ pattern: /import\s+.*from\s+['"]@\/runner\/headless\/benchmark-runner['"]/, scope: 'src/app/hooks', expectedCount: 0 }

// F4: hardcoded PROFILE_OPTIONS in viz
{ pattern: /PROFILE_OPTIONS/, scope: 'src/viz', expectedCount: 0 }

// F5: viz/hooks importing policy/types directly (enforced — policy types must come from policy-v1)
{ pattern: /import\s+.*from\s+['"]@\/core\/policy\/types['"]/, scope: ['src/viz', 'src/app/hooks'], expectedCount: 0 }
```

**F5 enforcement decision:** F5 is **enforced** (not optional) and is part of VAL-PLAT-009. Any viz or hooks file importing `policy/types` directly violates the contract boundary. Viz and hooks must use `contracts/policy-v1` if they ever need policy types.

### 5.2 Allowed Import Boundaries (unchanged after Phase 4)

| Importer layer | Allowed import targets |
|---|---|
| `src/viz/**` | `src/core/contracts/*`, React, Three.js — **NOT `@/runner/runner-exposure-api` directly** |
| `src/app/hooks/**` | `src/core/contracts/*`, `@/runner/runner-exposure-api`, React |
| `src/runner/**` | `src/core/**` internals freely (runner is not restricted) |
| `src/core/contracts/runtime-v1.ts` | `src/core/common/types.ts` only |
| `src/core/contracts/kpi-v1.ts` | `src/core/kpi/types.ts` only |
| `src/core/contracts/policy-v1.ts` | `src/core/policy/types.ts` only |
| `src/core/contracts/exposure-v1.ts` | `src/core/profiles/defaults.ts`, `src/core/profiles/profile-composer.ts`, `src/core/profiles/types.ts` (HandoverType only) |
| `src/core/engine.ts` | `src/core/**` internals freely (engine is not restricted) |

**Rule X3 compliance note:** `src/core/contracts/` is not a leaf layer. It is a thin re-export/bridge layer and is explicitly allowed to import from `src/core/*/types.ts`. The restriction applies only to consumers of the contracts layer (viz, hooks).

---

## 6. Versioning and Freeze Rules

### 6.1 `@version v1` + `@frozen` Annotation Requirements

Every type exported from a `contracts/` file must carry these annotations:

```typescript
/**
 * [brief description]
 *
 * @version v1
 * @frozen — no breaking changes without creating a v2 file
 */
export interface MyType { ... }
```

Types marked `@version v1-draft` (currently `ParameterView`, `ParameterMetadataResponse`) are visible stubs. They must NOT be depended on as stable by Group 2 consumers. Full freeze requires a future Group 2 or Phase 5 decision.

### 6.2 What Counts as Breaking (requires version bump)

| Change type | Breaking? | Required action |
|---|---|---|
| Removing an existing field | YES | Create `*-v2.ts`, keep `*-v1.ts` |
| Renaming an existing field | YES | Create `*-v2.ts`, keep `*-v1.ts` |
| Changing an existing field's type | YES | Create `*-v2.ts`, keep `*-v1.ts` |
| Adding a new required field | YES | Create `*-v2.ts`, keep `*-v1.ts` |
| Adding a new optional field | NO | Edit existing `*-v1.ts` |
| Adding a new exported type | NO | Edit existing `*-v1.ts` |
| Adding documentation / deprecation notes | NO | Edit existing `*-v1.ts` |

### 6.3 Version Bump Procedure

1. Create new file: e.g. `runtime-v2.ts` with corrected types
2. Keep `runtime-v1.ts` with `@deprecated — use runtime-v2.ts` in the file header
3. Migrate consumers to v2 before removing v1
4. v1 deletion only after Phase 5+ migration confirmed and all consumers updated
5. Document the bump reason in the SDD section that defined the type

---

## 7. Contract Boundary Clarifications

### 7.1 Simulation Input Contract

Phase 4 does **not** change how the engine receives input. `ProfileConfig` remains the flat runtime input type passed to `createSimEngine()`. The engine signature is unchanged.

After Phase 4: external consumers should build inputs via `ProfileBundle` + `ExperimentBundle` → `composeProfile()` → `ProfileConfig`. They must NOT construct `ProfileConfig` directly.

### 7.2 Simulation Snapshot Contract

`SimulationSnapshot` (frozen in `runtime-v1.ts`) is the stable tick-level output. All viz consumers must import from `runtime-v1.ts` after Phase 4.

### 7.3 KPI Output Contract

`KpiBundle` (frozen in `kpi-v1.ts`) is the stable run-level KPI aggregate. Batch tooling must use `BatchKpiEntry` from `kpi-v1.ts`.

### 7.4 Experiment Manifest Contract

`RunManifest` and `RunArtifactBundle` remain in `src/core/trace/types.ts`. Phase 4 does **not** freeze these separately. If MODQN or estnet needs run manifests, Phase 5 will stabilize them as part of the cleanup/modularization program.

### 7.5 Model-Bundle Selection Contract

`ModelBundleSelection` (Phase 3 output) remains in `src/core/profiles/types.ts`. Phase 4 does **not** freeze it as a separate contract — it remains a profile authoring type. External consumers that specify model families go through `ProfileBundle.models`.

---

## 8. Validation Gates (Operative Specification for `validate-contracts.mjs`)

### 8.1 `VAL-PLAT-008` — Frozen Runtime Contracts Exist

**Script:** `scripts/validate-contracts.mjs` (new, Phase 4)
**npm target:** `npm run validate:contracts`

**Pass conditions — ALL must hold:**

1. `src/core/contracts/runtime-v1.ts` exists (check: `fs.existsSync`)
2. `src/core/contracts/kpi-v1.ts` exists
3. `src/core/contracts/policy-v1.ts` exists
4. `src/core/contracts/exposure-v1.ts` exists
5. `runtime-v1.ts` exports all 9 required types — check via regex `export.*\bTypeName\b` for each:
   `SimulationSnapshot`, `SatelliteState`, `UeState`, `BhSlotSnapshot`, `DapsSnapshot`,
   `HoLogEntry`, `SatelliteBeamSnapshot`, `BeamRole`, `ContinuityState`
6. `runtime-v1.ts` file text includes `@version v1` AND `@frozen` (at least once each)
7. `kpi-v1.ts` exports `KpiBundle` AND `BatchKpiEntry`
8. `policy-v1.ts` exports `PolicyObservation`, `PolicyAction`, `Policy`
9. `exposure-v1.ts` exports `ProfileListEntry`, `HandoverType`, `getProfileList`

**Suggested script implementation pattern:**
```javascript
// For each file existence check:
if (!fs.existsSync(filePath)) fail(`VAL-PLAT-008: ${filePath} not found`);

// For each export check (file already read as string):
const required = ['SimulationSnapshot', 'SatelliteState', ...];
for (const name of required) {
  if (!/(export\s+(type\s+)?\{[^}]*\b|export\s+(type\s+)?(interface|type)\s+)NAME/.test(fileContent.replace('NAME', name))) {
    fail(`VAL-PLAT-008: runtime-v1.ts does not export ${name}`);
  }
}

// For @frozen check:
if (!fileContent.includes('@frozen')) fail('VAL-PLAT-008: runtime-v1.ts missing @frozen annotation');
```

### 8.2 `VAL-PLAT-009` — Viz/App No Longer Import Internal Runtime Types Directly

**Script:** `scripts/validate-contracts.mjs`

**Pass conditions — ALL must hold (0 matches for each forbidden pattern):**

| Check | Scope | Forbidden regex |
|---|---|---|
| F1: no viz → common/types import | `src/viz/**/*.{ts,tsx}` | `/import\s+.*from\s+['"]@\/core\/common\/types['"]/` |
| F2: no viz → profiles/types import | `src/viz/**/*.{ts,tsx}` | `/import\s+.*from\s+['"]@\/core\/profiles\/types['"]/` |
| F3: no hooks → benchmark-runner import | `src/app/hooks/**/*.ts` | `/import\s+.*from\s+['"]@\/runner\/headless\/benchmark-runner['"]/` |
| F4: no PROFILE_OPTIONS in viz | `src/viz/**/*.{ts,tsx}` | `/\bPROFILE_OPTIONS\b/` |
| F5: no viz/hooks → policy/types direct import | `src/viz/**/*.{ts,tsx}`, `src/app/hooks/**/*.ts` | `/import\s+.*from\s+['"]@\/core\/policy\/types['"]/` |
| F6: no viz → runner-exposure-api direct import | `src/viz/**/*.{ts,tsx}` | `/import\s+.*from\s+['"]@\/runner\/runner-exposure-api['"]/` |

**Explicit exceptions (NOT checked by forbidden patterns):**
- `src/core/contracts/**` may import from `common/types`, `profiles/types`, `kpi/types`, `policy/types` (bridge layer)
- `src/app/hooks/**` may import from `runner-exposure-api` (allowed)

**Suggested script implementation pattern:**
```javascript
const vizFiles = glob.sync('src/viz/**/*.{ts,tsx}');
const hooksFiles = glob.sync('src/app/hooks/**/*.ts');

const checks = [
  { files: vizFiles, pattern: /import\s+.*from\s+['"]@\/core\/common\/types['"]/, id: 'F1' },
  { files: vizFiles, pattern: /import\s+.*from\s+['"]@\/core\/profiles\/types['"]/, id: 'F2' },
  { files: hooksFiles, pattern: /import\s+.*from\s+['"]@\/runner\/headless\/benchmark-runner['"]/, id: 'F3' },
  { files: vizFiles, pattern: /\bPROFILE_OPTIONS\b/, id: 'F4' },
];

for (const { files, pattern, id } of checks) {
  const violations = files.filter(f => pattern.test(fs.readFileSync(f, 'utf8')));
  if (violations.length > 0) fail(`VAL-PLAT-009 ${id}: ${violations.join(', ')}`);
}
```

### 8.3 `VAL-PLAT-010` — Exposure Contract Exists and Lists All Profiles

**Script:** `scripts/validate-contracts.mjs` (runtime execution under `node --import tsx`)

**Pass conditions — ALL must hold:**

1. `getProfileList()` is importable from `@/core/contracts/exposure-v1`
2. Calling `getProfileList()` returns an `Array`
3. Array length === 14
4. The following 14 profile IDs are all present (exact set):
   `'realistic-first-screen'`, `'case9-access-baseline'`, `'hobs-multibeam-baseline'`,
   `'bh-resource-baseline'`, `'case9-daps-baseline'`, `'real-trace-validation'`,
   `'meo-constellation-baseline'`, `'geo-relay-baseline'`, `'sinr-elevation-reproduction'`,
   `'hobs-reproduction'`, `'timer-cho-reproduction'`, `'bh-pf-baseline'`,
   `'bh-sinr-greedy-baseline'`, `'bh-resource-energy-proof'`
5. Every entry has `tier ∈ ['Realistic', 'Advanced', 'Sensitivity']`
6. Every entry has non-empty `id` (string), `label` (string), `family` (string)
7. F4 check passes (no `PROFILE_OPTIONS` in viz — combined enforcement with VAL-PLAT-009)

**Suggested script implementation pattern:**
```javascript
// Run under node --import tsx
const { getProfileList } = await import('../src/core/contracts/exposure-v1.ts');
const list = getProfileList();

if (!Array.isArray(list)) fail('VAL-PLAT-010: getProfileList() did not return an Array');
if (list.length !== 14) fail(`VAL-PLAT-010: expected 14 entries, got ${list.length}`);

const EXPECTED_IDS = new Set([
  'realistic-first-screen', 'case9-access-baseline', 'hobs-multibeam-baseline',
  'bh-resource-baseline', 'case9-daps-baseline', 'real-trace-validation',
  'meo-constellation-baseline', 'geo-relay-baseline', 'sinr-elevation-reproduction',
  'hobs-reproduction', 'timer-cho-reproduction', 'bh-pf-baseline',
  'bh-sinr-greedy-baseline', 'bh-resource-energy-proof',
]);
const VALID_TIERS = new Set(['Realistic', 'Advanced', 'Sensitivity']);

for (const entry of list) {
  if (!EXPECTED_IDS.has(entry.id)) fail(`VAL-PLAT-010: unexpected profile id ${entry.id}`);
  if (!VALID_TIERS.has(entry.tier)) fail(`VAL-PLAT-010: invalid tier ${entry.tier} for ${entry.id}`);
  if (!entry.label) fail(`VAL-PLAT-010: missing label for ${entry.id}`);
  if (!entry.family) fail(`VAL-PLAT-010: missing family for ${entry.id}`);
}

const returnedIds = new Set(list.map(e => e.id));
for (const id of EXPECTED_IDS) {
  if (!returnedIds.has(id)) fail(`VAL-PLAT-010: missing profile id ${id}`);
}
```

### 8.4 Required Validation Set Before Claiming Phase 4 Complete

At minimum, run in this order:

1. `npm run lint`
2. `npm run validate:trace`
3. `npm run validate:profiles` (includes VAL-PLAT-006/007)
4. `npm run validate:runtime`
5. `npm run validate:stage` (includes all prior gates)
6. `npm run validate:contracts` (new — runs `scripts/validate-contracts.mjs`, covers VAL-PLAT-008/009/010)

---

## 9. Ordered Implementation Plan (Group 2)

### 9.1 Why Group 2 Is a Separate Group

Group 1 (this document) freezes the spec. Group 2 implements the spec against the actual current code state. The separation ensures that:
- Implementation starts from a frozen, reviewed spec
- Any gap between the SDD and current code is surfaced as a concrete Group 2 task, not a vague spec assumption
- The reviewer gate between Group 1 and Group 2 catches spec issues before code is written

### 9.2 Group 2 Implementation Steps (ordered)

| Step | ID | Files | Change | Dependency |
|---|---|---|---|---|
| 1 | P4-1 | `src/core/contracts/index.ts` | Create directory and barrel re-export of all 4 contract files | none |
| 2 | P4-2 | `src/core/contracts/runtime-v1.ts` | Re-export 9 snapshot types from `common/types.ts` with required file header, `@version v1`, `@frozen` on each type | P4-1 |
| 3 | P4-3a | `src/core/contracts/kpi-v1.ts` | Re-export `KpiBundle`; define `BatchKpiEntry` (migrate from `useBatchKpi.ts`) | P4-1 |
| 4 | P4-3b | `src/core/contracts/policy-v1.ts` | Re-export 8 policy types from `policy/types.ts` | P4-1 |
| 5 | P4-4 | `src/core/contracts/exposure-v1.ts` | Define `ProfileListEntry`; implement `getProfileList()` backed by DEFAULT_PROFILES; re-export `HandoverType`; add `ParameterView`/`ParameterMetadataResponse` stubs | P4-1, Phase 3 complete |
| 6 | P4-5 | `src/runner/runner-exposure-api.ts` | Define `RunnerBenchmarkRequest/Response`; implement `executeBenchmark()` wrapping `executeBenchmarkRun`; re-export `getProfileList` | P4-4, P4-3a |
| 7 | P4-6 | `src/app/hooks/useBatchKpi.ts` | Replace direct `benchmark-runner` import with `runner-exposure-api`; replace local `BatchKpiEntry` with import from `kpi-v1` | P4-3a, P4-5 |
| 8 | P4-7 | `src/viz/overlays/ControlPanel.tsx` | Replace `PROFILE_OPTIONS` hardcode with `getProfileList()` call; replace `HandoverType` import source (`profiles/types` → `contracts/exposure-v1`) | P4-4 |
| 9 | P4-7b | All `src/viz/**` files | Replace `from '@/core/common/types'` with `from '@/core/contracts/runtime-v1'`; replace `from '@/core/profiles/types'` with `from '@/core/contracts/exposure-v1'` where needed (only `HandoverType` is needed from viz) | P4-2, P4-4 |
| 10 | P4-8 | `scripts/validate-contracts.mjs` | Implement VAL-PLAT-008/009/010 checks per §8 | P4-2 through P4-7b |
| 11 | P4-8b | `package.json` | Add `"validate:contracts": "node scripts/validate-contracts.mjs"` (or tsx if runtime check needed) | P4-8 |

**Important note for P4-7b:** There are currently 15 viz files that import from `core/common/types.ts` (identified in Phase 4 Group 1 review). Not all of them need `HandoverType` — most only need snapshot types. The replacement must be: `from '@/core/contracts/runtime-v1'` for snapshot types, `from '@/core/contracts/exposure-v1'` for `HandoverType` (only `ControlPanel.tsx` needs this).

### 9.3 Group 2 Decision Points

These are open decisions that Group 2 must resolve before or during implementation. Each is marked in §4 with its `DECISION-POINT-DPn` label.

| ID | Decision | Recommendation | Impact |
|---|---|---|---|
| DP1 (§4.2) | Include `RunManifest`/`RunArtifactBundle` in `kpi-v1`? | Do NOT — defer to Phase 5 | None if deferred |
| DP2 (§4.4.2) | `getProfileList()` in `exposure-v1.ts` vs `runner-exposure-api.ts`? | In `exposure-v1.ts` — it is a first-class contract | If moved to runner-api, add re-export stub in `exposure-v1.ts` |
| DP3 (§4.4.4) | Fully define `ParameterView`/`ParameterMetadataResponse` in Phase 4? | Stub only — no Phase 4 consumer actively calls them | Must create stub to establish contract namespace |
| DP4 (§4.5) | `runner-exposure-api.ts` re-exports `getProfileList`? | Yes — single import for useBatchKpi | Minor convenience; remove if not needed |

### 9.4 Not in Scope for Group 2

- Deleting or modifying `src/core/common/types.ts` or `src/core/profiles/types.ts` — these remain; contracts re-export from them
- Changing `engine.ts` signature or splitting it — Phase 5
- Deleting `composeProfile()` shim — Phase 5
- **`loadProfileBundle(id): ProfileBundle` function** — explicitly deferred. The original Phase 4 stub mentioned this as a loader extension; Phase 4 Group 2 does NOT add it. `loader.ts` public API (`loadProfile(id): ProfileConfig`) is unchanged. `loadProfileBundle()` is deferred to Phase 5 or a downstream program. Cross-reference: `phase3-scenario-profile-experiment-split.md §7` has been updated to reflect this deferral.
- MODQN or estnet integration code
- Profile tier metadata in UI beyond replacing `PROFILE_OPTIONS`
- Adding new profiles or modifying existing profile content

---

## 10. Completion Criteria

Phase 4 is complete only when **ALL** of the following hold:

1. `src/core/contracts/` directory exists with 4 frozen files:
   - `runtime-v1.ts` (9 types re-exported, `@frozen`)
   - `kpi-v1.ts` (`KpiBundle` + `BatchKpiEntry`, `@frozen`)
   - `policy-v1.ts` (8 types, `@frozen`)
   - `exposure-v1.ts` (`ProfileListEntry`, `HandoverType`, `getProfileList`, `@frozen`; `ParameterView` stub present)
2. `src/runner/runner-exposure-api.ts` exists; `useBatchKpi.ts` no longer imports `benchmark-runner` directly
3. `ControlPanel.tsx` no longer imports `HandoverType` from `core/profiles/types`
4. `ControlPanel.tsx` no longer contains hardcoded `PROFILE_OPTIONS`
5. All `src/viz/**` files import snapshot types from `contracts/runtime-v1` (0 direct `common/types` imports in viz)
6. `VAL-PLAT-008`, `VAL-PLAT-009`, `VAL-PLAT-010` pass (`npm run validate:contracts`)
7. Pre-existing validation gates still pass (`npm run validate:stage`)
8. This SDD status is updated: `Group 2 complete`
9. `ntn-sim-core-implementation-status.md` and `ntn-sim-core-validation-matrix.md` are synced in the same change set

---

## 11. Documentation Sync Requirements

When Phase 4 Group 2 completes, update:

1. This file (status → `Complete`)
2. `sdd/ntn-sim-core-implementation-status.md` (Phase 4 row → complete)
3. `sdd/ntn-sim-core-validation-matrix.md` (VAL-PLAT-008/009/010 → pass)
4. `sdd/ntn-sim-core-ui-exposure-spec.md` §3.1 (replace `PROFILE_OPTIONS` reference with exposure-v1 contract reference)
5. `todo/README.md` (Phase 4 complete)
6. `todo/platform-refactor/README.md` (Phase 4 complete, Phase 5 next)

---

## 12. Downstream Gating

Before Phase 4 is complete:

1. MODQN runtime must not depend on unstable internal snapshot/policy types
2. UI product/demo work must not bypass exposure contracts
3. `estnet-ui-kickoff` must not be integrated against internal module paths

Only after Phase 4 completes may downstream programs treat the contract surfaces as stable. The contract files (`runtime-v1.ts`, `kpi-v1.ts`, `policy-v1.ts`, `exposure-v1.ts`) are the stable surface downstream programs should depend on.
