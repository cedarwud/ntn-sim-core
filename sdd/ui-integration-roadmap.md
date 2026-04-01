# UI Integration Spec — Baseline

**Status:** Active spec — baseline scope only
**Promoted:** 2026-03-31 (downstream architecture Group 1)
**Clarified:** 2026-04-01 (U1 entry surface and post-M3 handoff wording synced after downstream architecture Group 2)
**Depends on:** Frozen platform contracts (runtime-v1 / kpi-v1 / exposure-v1)
**Scope gate:** Baseline reproduction viewer + existing UI/UX improvements only

---

## 1. Scope

### 1.1 In Scope

1. Baseline reproduction viewer — display baseline MODQN run results
2. Baseline KPI / result chart presentation
3. Parameter exposure alignment (Realistic / Advanced / Sensitivity / Internal-only mapping)
4. Parameter-aware controls and presets using `exposure-v1 / ParameterView`
5. Derived-quantity display rules
6. Baseline result / replay / figure navigation
7. Existing UI/UX improvements not blocked on MODQN completion

### 1.2 Explicitly Out of Scope

1. MODQN comparison dashboards (multi-variant)
2. HOBS / EE variant comparison views
3. `project/estnet-ui-kickoff` consumer integration
4. Any consumer-driven expansion of frozen contracts
5. New provenance invention (display only, no re-computation of simulator truth)

---

## 2. Frozen Contract Surface for UI

UI components must consume exclusively from:

| Contract | Purpose |
|----------|---------|
| `src/core/contracts/runtime-v1` | `SimulationSnapshot`, beam/UE/HO state for live rendering |
| `src/core/contracts/kpi-v1` | `KpiBundle`, `BatchKpiEntry` for chart display |
| `src/core/contracts/exposure-v1` | `ParameterView`, `ProfileListEntry`, `HandoverType` |
| `src/runner/runner-exposure-api` | `RunnerExposureApi` (hooks only, not viz directly) |

**UI must NOT:**
- Import from `src/core/engine/` internal files
- Recompute simulator truth
- Invent provenance or override parameter metadata

---

## 3. Layer Placement

### 3.1 U1 Scope

U1 implements:

1. Baseline result viewer component — renders `KpiBundle` from a single MODQN baseline run
2. KPI chart series models in `src/viz/view-models/` — convert `KpiBundle` → display-ready structures
3. Parameter panel alignment — maps `ParameterView` exposure tiers to controls
4. Replay integration for baseline run playback via `useReplay`

U1 entry consumes:
- `kpi-v1` (`KpiBundle`)
- `runtime-v1` (`SimulationSnapshot`)
- `exposure-v1` (`ParameterView`)
- `RunnerExposureApi` for hook-facing access

**U1 must NOT:**
- Depend on `src/core/algorithms/` internals (consume only artifact results via `kpi-v1`)
- Depend on `src/core/experiments/` manifest internals
- Import engine internals

### 3.2 U2 Scope (deferred, requires U1 convergence)

1. Extended KPI comparison (two runs side-by-side, baseline only)
2. Parameter preset navigation
3. Figure/chart export helpers

---

## 4. View-Model Layer (`src/viz/view-models/`)

Purpose: convert frozen contract outputs into UI-oriented structures.

**Owned by this layer:**
- KPI card projections
- Chart series builders from `KpiBundle`
- Timeline row models from replay snapshots
- Parameter panel display descriptors from `ParameterView`

**Forbidden:**
- Re-running simulation
- Depending on `src/core/engine/` directly
- Ad hoc provenance field invention

---

## 5. Boundary Rules

**U1 does NOT cross into:**
- `src/core/algorithms/` (MODQN adapter internals — M1/M2 territory)
- `src/core/experiments/` manifest internals (M2/M3 territory)
- `src/adapters/` (estnet territory — deferred)

**U1 entry path:**
- U1 does not wait for M3; it may start from `kpi-v1`, `runtime-v1`, `exposure-v1`, and `RunnerExposureApi`

**After U1:**
- U2 may extend the baseline viewer with comparison features
- After M3 exports a stable `ExperimentResult` / baseline result bundle, U1/U2 may consume that single export without importing experiment manifest internals

---

## 6. Promotion Conditions for estnet-ui-contract-outline.md

`estnet-ui-contract-outline.md` remains paused and may only be promoted when:

1. The user explicitly reopens estnet integration
2. Frozen contracts are confirmed sufficient for external consumer use
3. `src/adapters/` directory is deliberately created for that scope

---

## 7. Validation Expectations

At U1 entry:
1. `npm run lint` must pass
2. `npm run validate:contracts` must pass — new viz code imports only from `@/core/contracts`
3. `npm run validate:stage` must remain green

If U1 adds browser-visible surfaces:
4. Run `npm run validate:visual-browser` and record result
