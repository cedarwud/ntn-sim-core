# Phase 5 — Cleanup and Modularization

**Status:** Active — Group 1 complete (2026-03-31): split/retirement/gate strategy frozen; Group 2 structural split may begin
**Date (stub):** 2026-03-29
**Date (Group 1 plan freeze):** 2026-03-31
**Depends on:** Phase 0 complete, Phase 1 complete, Phase 2 complete, Phase 3 complete, Phase 4 complete

---

## 1. Goal

Finish the platform refactor by removing the structural debt that earlier phases intentionally deferred.

Phase 5 is the only active phase allowed to:

1. split oversized mixed-responsibility files;
2. retire compatibility-only internals once frozen contracts make the timing safe;
3. normalize ownership across `engine/`, `profiles/`, runner bootstrap, and browser runtime bootstrap;
4. close the final structural gates (`VAL-PLAT-011`, `VAL-PLAT-012`) without changing frozen consumer semantics.

This phase is structural, not feature-bearing.

---

## 2. Scope

### 2.1 In Scope

| In scope | Authority reference |
|---|---|
| split `src/core/engine.ts` into `src/core/engine/` | `phase0-architecture-spec.md §0C.1 Phase 5 P5-1/P5-2` |
| complete `src/core/profiles/` structural cleanup around `types.ts`, `defaults.ts`, and Phase 3 compatibility leftovers | `phase0-architecture-spec.md §0C.1 Phase 5 P5-3`, `§0C.2 profiles/types.ts`, `§0C.2 profiles/defaults.ts` |
| migrate `benchmark-runner.ts` orbit bootstrap ownership to `src/core/orbit/profile-runtime.ts` | `phase0-architecture-spec.md §0C.1 Phase 5 P5-4` |
| remove synchronous real-trace fixture loading from browser hooks | `phase0-architecture-spec.md §0C.1 Phase 5 P5-5` |
| resolve `viz/beam/beam-selection.ts` naming collision | `phase0-architecture-spec.md §0C.1 Phase 5 P5-6` |
| retire `ProfileConfig.sourceMap` and `composeProfile()` only after documented preconditions hold | `phase0-architecture-spec.md §0C.1 Phase 5 P5-7` |
| augment structural validation so `VAL-PLAT-011/012` are machine-enforced | `phase0-architecture-spec.md §0C.1 Phase 5 P5-8`, `ntn-sim-core-validation-matrix.md` |
| perform narrowly scoped support splits needed only because `VAL-PLAT-011` applies to all of `src/core/` | `phase0-architecture-spec.md §0C.3 VAL-PLAT-011`, `P5-8` |

### 2.2 Frozen Boundaries That Phase 5 Must Not Semantically Change

Phase 5 may reconnect internal implementations behind these surfaces, but it must not change their outward meaning:

1. `src/core/contracts/runtime-v1.ts`
2. `src/core/contracts/kpi-v1.ts`
3. `src/core/contracts/policy-v1.ts`
4. `src/core/contracts/exposure-v1.ts`
5. `RunnerExposureApi` request/response shapes and synchronous call style
6. `getProfileList()` ordering, tier semantics, and returned `ProfileListEntry` meaning
7. existing `validate:contracts` pass conditions (`VAL-PLAT-008/009/010`)

### 2.3 Not In Scope

| Out of scope | Reason |
|---|---|
| adding new model families, algorithms, or benchmark features | Phase 5 is structural only |
| changing frozen external contracts instead of rewiring internals behind them | Phase 4 already froze them |
| starting MODQN runtime, estnet integration, or new UI programs | downstream gating still applies |
| repo-root archive sweeps unrelated to Phase 5 authority or prompt sequencing | not part of the platform-refactor closure set |
| donor-repo cleanup or paper-catalog/system-model cleanup | outside `ntn-sim-core` Phase 5 scope |

---

## 3. Current Repo-State Constraints

Group 1 verified the current repo state against the actual files, not only the older Phase 0 inventory.

| File / surface | Current state | Phase 5 implication |
|---|---|---|
| `src/core/engine.ts` | 1588 lines; owns bootstrap, BH/L2 init, bundle SINR helpers, HO/KPI flow, snapshot assembly, reset | primary Group 2 structural split target |
| `src/core/profiles/types.ts` | 839 lines; still mixes flat runtime schema and Phase 3 vocabulary types | Group 2 split target inside `src/core/profiles/` |
| `src/core/profiles/defaults.ts` | 89 lines; already a thin registry index | do **not** re-open as a monolith; keep as stable barrel |
| `src/core/profiles/defaults-*.ts` | per-family authoring files already exist | remain the authoring truth; only retire transitional fields when P5-7 is safe |
| `src/runner/headless/benchmark-runner.ts` | 397 lines; still owns its own Walker/TLE bootstrap helpers | Group 2 ownership migration target (P5-4) |
| `src/app/hooks/useSimulation.ts` | 215 lines; sync XHR + inline real-trace TLE parse remain | Group 3 runtime cleanup target (P5-5) |
| `src/app/hooks/useReplay.ts` | still uses sync XHR + inline real-trace TLE parse | coupled browser-runtime cleanup item; must be handled with or explicitly against P5-5 closure |
| `src/core/profiles/profile-composer.ts` | 401 lines; still the compatibility shim between authored bundles and flat `ProfileConfig` | Group 3 retirement decision point; cannot be deleted in Group 2 |
| `src/core/config/parameter-registry.ts` | 1047 lines | not a primary P5 hotspot, but it blocks `VAL-PLAT-011`; only scoped split work is allowed |
| `scripts/validate-structure.mjs` | path-existence checker only; does not enforce size/orchestrator rules yet | Group 3 gate-closure target (P5-8) |

---

## 4. Ordered Group Plan

### 4.1 Group 1 — Plan / Boundary / Gate Convergence

Group 1 does not perform large structural splits. It freezes:

1. the `engine.ts -> engine/` structural map;
2. the `profiles/defaults.ts` and `profiles/types.ts` split / retirement map;
3. the runner orbit-bootstrap ownership migration strategy;
4. the exact Group 2 vs Group 3 boundary;
5. the `P5-7` retirement preconditions;
6. the reviewer-checkable contract for `VAL-PLAT-011/012`;
7. which doc/README/todo cleanup is truly Phase 5 work.

### 4.2 Group 2 — Core Structural Split

Group 2 owns the high-risk structural work that creates the final layout without prematurely deleting compatibility layers.

| Phase 0 step | Group 2 deliverable | Boundary rule |
|---|---|---|
| P5-1 / P5-2 | create `src/core/engine/` and move tick-phase logic out of root `engine.ts` | Group 2 moves logic, not final closure claims |
| P5-3 | split `profiles/types.ts` by responsibility and keep `defaults.ts` as thin barrel | Group 2 must not re-monolithize defaults or delete P5-7 compatibility fields |
| P5-4 | make `orbit/profile-runtime.ts` the owner of runner orbit bootstrap | runner stops importing Walker/TLE/bootstrap implementation modules directly |
| P5-8 (support item) | if an oversized `src/core/` file still blocks the size gate after the primary split, Group 2 may perform exactly one scoped support split (currently expected candidate: `config/parameter-registry.ts`) | own the size blocker only; no registry redesign, provenance-model rewrite, or new API family under the name of cleanup |

Group 2 is expected to leave these items for Group 3:

1. sync XHR removal in browser hooks;
2. naming-collision rename;
3. `sourceMap` / `composeProfile()` retirement;
4. final `validate-structure.mjs` augmentation and Phase 5 closure sync.

### 4.3 Group 3 — Legacy Retirement / Browser Cleanup / Gate Closure

Group 3 owns the final removals and closure work:

| Phase 0 step | Group 3 deliverable | Boundary rule |
|---|---|---|
| P5-5 | remove synchronous browser fixture loading; keep hook/exposure semantics stable | if `useReplay.ts` still shares the same legacy path, close both together or record the gap explicitly |
| P5-6 | rename `viz/beam/beam-selection.ts` and update imports | pure naming/ownership cleanup only |
| P5-7 | retire `ProfileConfig.sourceMap`, `ProfileBundle.sourceMap`, `composeProfile()`, and any now-obsolete exposure shim only if all preconditions in §6 hold | if preconditions are not met, do not force closure |
| P5-8 | land final `validate-structure.mjs` enforcement and closure sync | Phase 5 cannot complete without machine-enforced structural gates |

### 4.4 Group 2 vs Group 3 Boundary Table

| Area | Group 2 | Group 3 |
|---|---|---|
| `engine.ts` | split and move logic into `engine/` | finish last thin-orchestrator cleanup and close the enforced ≤200 line gate if any residual wrapper debt remains |
| `profiles/defaults.ts` | keep the thin barrel stable | only retire transitional provenance/composer surfaces if §6 preconditions are satisfied |
| `profiles/types.ts` | split by responsibility and preserve barrel compatibility | remove transitional fields only at P5-7 retirement time |
| `benchmark-runner.ts` | stop owning bootstrap logic | no further runner contract churn unless required by P5-7 provenance migration |
| browser real-trace bootstrap | no async lifecycle changes | remove sync XHR and unify live/replay bootstrap behavior |
| `validate-structure.mjs` | may prepare helper utilities if needed | owns final enforcement for `VAL-PLAT-011/012` |
| docs/status/prompt sequencing | record the Group 1 plan | record closure status after Groups 2 and 3 land |

---

## 5. High-Risk File Maps

### 5.1 `engine.ts -> engine/` Structural Split Map

Phase 0 named the phase-centric cores (`tick.ts`, `orbit-step.ts`, `channel-step.ts`, `handover-step.ts`, `kpi-step.ts`, `scheduler-step.ts`). Current repo state requires a slightly more explicit map, including a KPI-owned landing zone because current `engine.ts` still interleaves handover flow and accumulator writes.

| Target file | Ownership after split | Group |
|---|---|---|
| `src/core/engine.ts` | public factory + `SimEngineConfig` / `SimEngine` interfaces only; delegates bootstrap/tick/reset to `engine/` submodules | Group 2, final ≤200 closure in Group 3 if needed |
| `src/core/engine/state.ts` | runtime state container: bundle, RNG, managers, beam-layout cache, L2 bookkeeping, non-LEO filter set, last-observation cache | Group 2 |
| `src/core/engine/tick.ts` | ordered tick pipeline only; no embedded formula/helper bodies | Group 2 |
| `src/core/engine/orbit-step.ts` | geometry dispatch, active-satellite sampling, sat-sample normalization, L2 satellite init | Group 2 |
| `src/core/engine/channel-step.ts` | single-beam / multi-beam SINR helpers, per-UE SINR adjustment, RF helper math now living in engine scope | Group 2 |
| `src/core/engine/handover-step.ts` | Phase A / Phase B HO tick, policy observation/action flow, serving-state transitions, normalized HO-event batches for downstream consumers | Group 2 |
| `src/core/engine/kpi-step.ts` | per-tick KPI side effects: `recordServiceState`, `recordSinr`, `recordHandover`, `recordEnergyMetrics`, interruption accounting, and Phase A / Phase B KPI fan-out | Group 2 |
| `src/core/engine/scheduler-step.ts` | beam-layout cache access, BH scheduler init, demand map and slot decision preparation | Group 2 |
| `src/core/engine/energy-step.ts` | Layer 1 / Layer 2 runtime updates and EE KPI injection | Group 2 |
| `src/core/engine/snapshot-step.ts` | `SimulationSnapshot` assembly, beam-role assignment, BH/DAPS snapshot wiring | Group 2 |

Rules:

1. Group 2 must move the actual tick body (`doTick`) out of root `engine.ts`.
2. Group 2 must also move the current helper cluster (`noisePowerDbm`, `eirpDbm`, `computeDopplerDegradationDb`, `computeUeSinrFromSatEntry`, `computeBundleSinr*`) out of root `engine.ts`.
3. Root `engine.ts` may keep only the public API shell plus calls into `engine/` submodules.
4. `kpi-step.ts` is the accumulator-facing landing zone. Group 2 must not leave per-tick accumulator writes half in root `engine.ts` and half in submodules.
5. Group 3 may finish any leftover wrapper extraction if the root file is still above the final `VAL-PLAT-012` threshold.

### 5.2 `defaults.ts` / `types.ts` Split and Retirement Map

| File | Current state | Group 2 action | Group 3 action |
|---|---|---|---|
| `src/core/profiles/defaults.ts` | already a thin registry index | keep as the stable import barrel; no new profile logic here | keep as the public facade even if P5-7 retires `composeProfile()` behind it |
| `src/core/profiles/defaults-*.ts` | authoring truth for per-family profiles | stay authoritative; only minimal import/path adjustments allowed | if P5-7 lands, migrate them from `composeProfile()` usage to the new authored runtime-materialization surface |
| `src/core/profiles/types.ts` | 839-line mixed type surface | split into sub-files by responsibility while preserving `types.ts` as barrel | remove only the documented transitional provenance fields after §6 preconditions hold |
| `src/core/profiles/profile-composer.ts` | compatibility shim + decompose helper + static exposure preset fallback | no deletion in Group 2 | retire only if provenance, loader, validation, and exposure consumers no longer require it |

`types.ts` split map:

1. `profiles/types.ts` remains the stable barrel and re-export surface.
2. move flat runtime schema types (`OrbitalConfig`, `RfConfig`, `AntennaConfig`, `BeamConfig`, `ChannelConfig`, `HandoverConfig`, `EnergyConfig`, `UeConfig`, `ValidationResult`) into a dedicated runtime-schema file under `src/core/profiles/`.
3. move Phase 3 vocabulary types (`ScenarioConfig`, `ModelBundleSelection`, `ExperimentBundle`, `ProfileBundle`, `ProfileFamily`) into a dedicated bundle-vocabulary file under `src/core/profiles/`.
4. do **not** delete `ProfileConfig` in Group 2; that is coupled to P5-7 retirement.

### 5.3 `benchmark-runner.ts` Orbit Bootstrap Ownership Migration

Current state:

1. `benchmark-runner.ts` still defines `buildElements()` and `buildConstellation()`.
2. `orbit/profile-runtime.ts` owns only the synthetic element build and generic cache helpers.
3. browser hooks still inline the real-trace TLE fixture load/parse path.

Migration contract:

| Target owner | Required Group 2 result |
|---|---|
| `src/core/orbit/profile-runtime.ts` | becomes the single owner of `ProfileConfig -> OrbitElement[] -> TrajectoryCache` construction helpers |
| `src/runner/headless/benchmark-runner.ts` | stops importing Walker/GEO/TLE/bootstrap implementation modules directly; it may pass optional `tleOmmData`, but it no longer owns bootstrap sequencing |

Minimum acceptable API shape after Group 2:

1. one helper that resolves profile orbit elements for both synthetic and real-trace profiles, with optional `tleOmmData`;
2. one helper that builds trajectory cache from a profile + resolved elements at benchmark density;
3. existing `buildInteractiveTrajectoryCache()` remains the browser-specific lower-density wrapper.

Group 3 follow-on:

1. browser hooks may reuse the same real-trace element resolver once async fixture loading lands;
2. until then, the runner ownership move must not force async behavior into the frozen `RunnerExposureApi`.

### 5.4 `useSimulation.ts` Sync XHR Removal Timing

`useSimulation.ts` currently does synchronous fixture loading inside `useMemo()`. This is a runtime-lifecycle change, not a pure file split.

Decision:

1. `P5-5` belongs to Group 3, not Group 2.
2. Group 3 must replace sync XHR with async fixture loading while preserving the outward hook contract (`snapshot`, `isReady`, `profileId`, KPI export semantics).
3. Because `useReplay.ts` still carries the same browser real-trace bootstrap pattern, Group 3 must either:
   - migrate both hooks to the same async loader path, or
   - document why one remains intentionally different.

This timing keeps Group 2 focused on structural core cleanup and keeps browser-lifecycle churn out of the core split review.

### 5.5 `parameter-registry.ts` Scoped Support Split Rule

Current state:

1. `src/core/config/parameter-registry.ts` is 1047 lines and currently mixes schema declarations with the entire literal `PARAMETER_REGISTRY` dataset.
2. It is already a known `VAL-PLAT-011` blocker, but it is not a primary architectural hotspot on the same level as `engine.ts` or `profiles/types.ts`.

If Group 2 still needs a support split after the primary hotspots land, the provisional owner/cut line is frozen as follows:

| Target file | Ownership after scoped split | Group |
|---|---|---|
| `src/core/config/parameter-registry.ts` | schema types (`GlobalParameterSpec`, `ProfileParameterBinding`, `ParameterEntry`), stable export surface, and any read-only lookup/projection helpers that do **not** redesign the registry model | Group 2 only if needed |
| `src/core/config/parameter-registry.entries.ts` | the literal `PARAMETER_REGISTRY` data array, grouped exactly by existing parameter domains | Group 2 only if needed |

Rules:

1. This support split is optional until the primary Group 2 work (`engine.ts`, `profiles/types.ts`, runner bootstrap ownership) lands; do not use it to re-open Phase 1 design.
2. If the split is needed, Group 2 owns it. Group 3 verifies closure; it must not discover the size blocker from scratch.
3. The acceptable cut line is schema/helpers vs literal registry data only.
4. Do **not** use this split to change `GlobalParameterSpec` / `ProfileParameterBinding` semantics, rename PARAM-* IDs, or introduce a new registry API family.

---

## 6. `P5-7` Retirement Preconditions

`ProfileConfig.sourceMap` and `composeProfile()` are **not** safe to remove merely because Phase 4 contracts are frozen. Group 1 verified that multiple current surfaces still depend on them.

Group 3 may retire `P5-7` only after ALL of the following are true:

1. `benchmark-runner.ts` no longer reads `profile.sourceMap` for `specModeIndex`, `sourceTrace`, or `assumptionSet`; provenance must come from a Phase 1 registry-backed surface instead, specifically the selectors defined in `src/core/config/profile-provenance-view.ts`.
2. `loader.ts` no longer treats `sourceMap` as a required top-level field and no longer validates benchmark safety by scanning `config.sourceMap`; the replacement provenance/benchmark-safety lookup must also come from `src/core/config/profile-provenance-view.ts`.
3. the validation/tooling chain no longer depends on profile-embedded `sourceMap`:
   - `validate-specmode-gating.mjs`
   - `validate-traceability-placeholders.mjs`
   - `validate-assumption-manifest.mjs`
   - `audit-profiles.ts`
4. `getProfileList()` no longer depends on `decomposeProfile(config)` as the bridge from flat `ProfileConfig` back to authored bundle metadata; it must read from `src/core/profiles/profile-exposure-catalog.ts`.
5. a new internal authoring/runtime materialization surface exists so `defaults-*.ts` do not need `composeProfile()` to emit the runtime profile registry; that one-way materializer is `src/core/profiles/runtime-materialization.ts`.
6. the Phase 3 validation contract has been replaced or rewritten so the project is not still requiring `VAL-PLAT-007`'s `decomposeProfile -> composeProfile` round-trip at the moment the shim is deleted.

### 6.1 Named Replacement Surfaces Required for `P5-7`

Group 1 freezes the names and responsibilities of the post-shim replacement surfaces so Group 3 does not have to invent them ad hoc during retirement:

1. `src/core/config/profile-provenance-view.ts`
   - registry-backed selectors that project per-profile provenance into the shapes currently assembled from `sourceMap`
   - owns the replacement for runner/tooling needs such as `specModeIndex`, `sourceTrace`, `assumptionSet`, and benchmark-safety lookups
2. `src/core/profiles/profile-exposure-catalog.ts`
   - authored metadata catalog for `id`, `family`, `version`, and `exposurePreset`
   - `src/core/contracts/exposure-v1.ts` migrates `getProfileList()` to this surface instead of calling `decomposeProfile(config)`
3. `src/core/profiles/runtime-materialization.ts`
   - internal one-way authoring-to-runtime materializer for `ProfileBundle + ExperimentBundle -> ProfileConfig`
   - `defaults-*.ts` and `DEFAULT_PROFILES` migrate to this surface when `composeProfile()` retires

These are replacement surfaces, not new frozen consumer contracts. Phase 5 may add them as internal ownership boundaries without reopening Phase 4 contract versioning.

Additional rule:

1. `ProfileConfig.sourceMap` and `ProfileBundle.sourceMap` retire together unless Group 3 writes an explicit split-authority rationale into this SDD.
2. `PROFILE_EXPOSURE_PRESETS` in `profile-composer.ts` is a compatibility layer; it retires only when exposure metadata has a direct authored source.
3. `profile-exposure-catalog.ts` and `runtime-materialization.ts` must be the authoritative authored surfaces before `PROFILE_EXPOSURE_PRESETS` or `decomposeProfile()` lose their compatibility role.
4. If any precondition remains unmet, Phase 5 keeps `P5-7` open. Do not force a false closure.

---

## 7. `VAL-PLAT-011/012` Reviewer Contract

### 7.1 `VAL-PLAT-011` — No Oversized Core Files

Reviewer-facing definition:

1. `validate-structure.mjs` must recursively inspect all `*.ts` / `*.tsx` files under `src/core/`.
2. The script must fail if any file exceeds 650 lines and print every offending path with its measured line count.
3. There is no permanent allowlist. Data-heavy files such as `parameter-registry.ts` are **not** exempt.
4. Group 1 blocker inventory is currently:
   - `src/core/engine.ts`
   - `src/core/config/parameter-registry.ts`
   - `src/core/profiles/types.ts`

Group boundary:

1. Group 2 must own the primary structural blockers (`engine.ts`, `profiles/types.ts`).
2. Any additional oversize blocker not in the original hotspot list may be split only as a scoped `VAL-PLAT-011` closure item.
3. Group 3 owns the final gate enforcement and must verify the blocker list is empty.

### 7.2 `VAL-PLAT-012` — Thin Orchestrator

Reviewer-facing definition:

1. `src/core/engine.ts` is `<= 200` lines at Phase 5 closure.
2. `src/core/engine/` exists and contains, at minimum, `tick.ts`, `orbit-step.ts`, `channel-step.ts`, `handover-step.ts`, and `scheduler-step.ts`.
3. For current repo state, `energy-step.ts`, `snapshot-step.ts`, and `state.ts` are also expected unless an equivalent split is documented.
4. Root `engine.ts` must no longer define the current helper/formula/tick bodies (`noisePowerDbm`, `eirpDbm`, `computeDopplerDegradationDb`, `computeBundleSinr*`, `computeUeSinrFromSatEntry`, `doTick`).
5. Root `engine.ts` must not directly import subsystem implementation modules from `channel/`, `beam/`, `handover/`, `energy/`, `ue/`, or `traffic/`; those imports move behind `engine/` submodules.
6. Existing runtime and contract validations still pass after the split.

### 7.3 Required Validation Set Before Any Phase 5 Completion Claim

At minimum:

1. `npm run lint`
2. `npm run validate:trace`
3. `npm run validate:profiles`
4. `npm run validate:runtime`
5. `npm run validate:stage`
6. `npm run validate:contracts`
7. augmented `npm run validate:structure` enforcing `VAL-PLAT-011/012`

---

## 8. Doc / Cleanup Scope Rules

These document and cleanup items truly belong to Phase 5:

1. this SDD, `ntn-sim-core-implementation-status.md`, `ntn-sim-core-validation-matrix.md`, and `ntn-sim-core-acceptance-gates.md` when Group boundaries or structural gates change;
2. `docs/architecture/ntn-sim-core-architecture-blueprint.md` when the `engine/` / `profiles/` / runner layout actually changes;
3. `README.md` only if entry-point guidance changes because the runtime layout changed;
4. `todo/README.md` and `todo/platform-refactor/README.md` when the next valid Group changes.

These do **not** belong to Phase 5 unless directly required by one of the items above:

1. generic archive cleanup under `/archive`;
2. donor-project prompt/doc maintenance;
3. paper-catalog or system-model document cleanup;
4. opportunistic renaming unrelated to a P5-* output.

---

## 9. Completion Criteria

Phase 5 is complete only when ALL of the following hold:

1. `src/core/engine.ts` is a thin orchestrator (`<= 200` lines) and `src/core/engine/` owns the tick phases.
2. no file in `src/core/` exceeds 650 lines.
3. `benchmark-runner.ts` no longer owns duplicated orbit bootstrap logic.
4. synchronous fixture loading is eliminated from the browser real-trace path.
5. `viz/beam/beam-selection.ts` naming collision is resolved.
6. `ProfileConfig.sourceMap` and the Phase 3 compatibility shim are retired **only if** §6 preconditions are satisfied.
7. `VAL-PLAT-011` and `VAL-PLAT-012` pass.
8. all pre-existing validation gates still pass.
9. this SDD status is updated to complete.
10. `ntn-sim-core-implementation-status.md`, `ntn-sim-core-validation-matrix.md`, and relevant blueprint / README / todo sequencing docs are synchronized.

If §6 preconditions are not satisfied, Phase 5 remains in progress. Do not claim completion by silently keeping `P5-7` open.

---

## 10. Documentation Sync Requirements

When Phase 5 meaningfully advances or completes, update:

1. this file;
2. `sdd/ntn-sim-core-implementation-status.md`;
3. `sdd/ntn-sim-core-validation-matrix.md`;
4. `sdd/ntn-sim-core-acceptance-gates.md` when Group boundary or structural gate rules change;
5. `docs/architecture/ntn-sim-core-architecture-blueprint.md` once the new layout lands;
6. `README.md` if entry-point guidance changes due to directory/layout changes;
7. `todo/README.md` and platform-refactor README surfaces when the next Group changes.

---

## 11. Downstream Gating

Only after Phase 5 completes should the repo be treated as ready for:

1. active MODQN runtime work;
2. downstream UI/product expansion that depends on stable internal ownership;
3. estnet consumer integration against finalized contracts.

Until then, downstream programs must not force premature cleanup shortcuts or claim that the platform refactor is finished.
