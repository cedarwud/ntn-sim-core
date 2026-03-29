# Phase 0 — Architecture Spec

**Status:** Phase 0B complete (patched) — vocabulary, target module map, ProfileConfig mapping, ParameterEntry schema, model-family interface draft, and contract boundary decisions recorded; Phase 0C (migration plan + acceptance criteria) pending
**Date (0A):** 2026-03-29
**Date (0A rev 2):** 2026-03-29 — three blind spots patched: provenance surface, de-facto contract map, orbit bootstrap boundary
**Date (0A rev 3):** 2026-03-29 — section numbering normalized; stale inventory notes removed
**Date (0B):** 2026-03-29 — vocabulary, target architecture, ProfileConfig mapping, ParameterEntry schema, model-family interfaces, contract boundaries
**Date (0B rev 1):** 2026-03-29 — three critical findings fixed: C1 ParameterEntry split into GlobalParameterSpec+ProfileParameterBinding; C2 model-family list aligned to 8 families (added GeometryModel, PolicyModel, clarified BeamLayoutModel/SchedulerModel/TrafficModel exclusions); C3 L1 leaf contradiction resolved via shared-primitives exemption, L1/L6 co-location resolved via config/exposure/ subdirectory plan
**Date (0B rev 2):** 2026-03-29 — two medium findings fixed: M1 phase1-parameter-registry-sdd.md Scope updated to GlobalParameterSpec+ProfileParameterBinding two-layer model; M2 ParameterMetadataResponse redesigned as profile-scoped ParameterView projection (exposureMode resolved per-profile before response); Model Bundle vocabulary hardened: 8 top-level families final, BeamLayoutModel/SchedulerModel/TrafficModel exclusion recorded as non-reopenable
**Depends on:** none

---

## Goal

Define the target simulator architecture before further algorithm or UI work.

Phase 0 must fix the top-level architectural split between:

1. parameter registry
2. model families
3. scenario definitions
4. profile bundles
5. experiment/reproduction bundles
6. runtime contracts
7. UI/exposure contracts

## Required Output

1. A written target module map
2. A formal distinction between canonical data/config layers
3. A no-ambiguity definition of what counts as: scenario / model / policy / experiment / UI exposure

## Not In Scope

1. major runtime code edits
2. MODQN implementation
3. final UI redesign

## Exit Criteria

1. later phases can reference one agreed architectural vocabulary
2. old profile-centric assumptions no longer define the whole simulator architecture

---

## Phase 0A — Current State Inventory

### 0A.1 Module Map (as-is)

```
ntn-sim-core/
├── src/
│   ├── core/                     ← pure-TS physics core (no React/Three.js)
│   │   ├── common/               ← SimulationSnapshot, SatelliteState, UeState, RNG,
│   │   │                            SourceReference, SpecMode, KpiBundleShell (285 lines)
│   │   ├── config/               ← paper-sources.json (211 lines): canonical PAP-/STD-/ASSUME-
│   │   │                            ID registry; machine-readable; used by validation chain
│   │   ├── profiles/             ← ProfileConfig schema, 14 profile defaults, loader
│   │   │   ├── types.ts          ← full config schema (491 lines)
│   │   │   ├── defaults.ts       ← ALL 14 profile objects (1320 lines); each parameter
│   │   │   │                        annotated with sourceMap[]{tier,id,parameterPath,specMode}
│   │   │   └── loader.ts         ← load/resolve/validate + Walker builder
│   │   ├── orbit/                ← Walker, SGP4, trajectory cache, topocentric
│   │   │   └── profile-runtime.ts← buildSyntheticOrbitElements, buildInteractiveTrajectoryCache,
│   │   │                            buildTrajectoryCacheForProfile — shared orbit-bootstrap helpers
│   │   ├── channel/              ← FSPL, beam-gain, SF, SSF, Doppler, SINR, link-budget
│   │   ├── handover/             ← A3/A4/CHO/Timer-CHO/MC-HO/DAPS/D2/max-elev FSMs
│   │   │                            + ranking.ts, d2-distance.ts (not in old inventory)
│   │   ├── beam/                 ← hex layout, beam selection (physics), active-beam-mgr,
│   │   │                            BH scheduler, FRF
│   │   ├── energy/               ← EE Layer 1 (throughput/power), Layer 2 (battery/solar)
│   │   ├── kpi/                  ← accumulator, recompute, KpiBundle types
│   │   ├── ue/                   ← position generator, mobility
│   │   ├── traffic/              ← demand generator (Poisson, full-buffer, hotspot)
│   │   ├── policy/               ← Policy interface + greedy/no-op plugins
│   │   │                            NOTE: only subsystem with a real plug-in interface today
│   │   ├── trace/                ← RunManifest, SourceTrace, ReplayArtifact, RunArtifactBundle,
│   │   │                            AssumptionRecord (168 lines)
│   │   └── engine.ts             ← monolithic tick engine (1547 lines)
│   ├── runner/
│   │   ├── headless/             ← BenchmarkRunner, dry-run; imported directly by useBatchKpi.ts
│   │   ├── replay/               ← snapshot-replay controller (+ legacy artifact path)
│   │   └── curation/             ← pass ranker, window selector, replay plan
│   ├── viz/                      ← React + Three.js layers (no physics)
│   │   ├── beam/                 ← EarthMovingBeamLayer, EarthFixedCellLayer,
│   │   │                            beam-selection (viz), bh-cell-analysis
│   │   ├── satellite/            ← SatelliteSkyLayer, observer-sky-projection
│   │   ├── overlays/             ← ControlPanel, SimHud, BeamInfoOverlay,
│   │   │                            HandoverLinkOverlay, BhExplainabilityPanel,
│   │   │                            BatchKpiPanel, HoEventLogOverlay, SinrCdfOverlay,
│   │   │                            SinrElevationScatter, SinrTimeSeriesOverlay,
│   │   │                            Starfield, ValidationProbe (11 total)
│   │   ├── scene/                ← SceneShell, NTPUScene, CameraRig
│   │   └── validation/           ← browser-side validation probe store
│   ├── app/
│   │   └── hooks/                ← useSimulation, useReplay, useBatchKpi, useSceneQueryState
│   └── config/                   ← observer-presets, visual-scene.config
├── scripts/                      ← validate:stage scripts, audit-profiles, reproduction;
│   │                                includes validate-specmode-gating.mjs (checks sourceMap tier/
│   │                                specMode rules) and validate-traceability-placeholders.mjs
│   │                                (checks ASSUME-/PAP-/STD- ID presence); these scripts are
│   │                                part of the authority chain, not incidental tools
└── sdd/                          ← authority documents (see sdd/README.md)
```

### 0A.2 Responsibility Allocation (as-is)

| Layer | Primary responsibility | Secondary / leaked responsibility |
|---|---|---|
| `profiles/defaults.ts` | Define 14 profile defaults | Bundles scenario + model + experiment + showcase into one object; profile-tier metadata only in `ControlPanel.tsx` |
| `profiles/types.ts` | Config schema | Contains dead field `tier3_5_scan_loss` (`@status dead-path`); mixes scenario, channel model, HO algo, UE, energy into one struct |
| `engine.ts` | Tick loop | Phase 2 (single-beam) + Phase 3 (multi-beam) SINR paths coexist; Phase A (shared HO) + Phase B (independent HO) coexist; lazy BH scheduler init; L2 per-sat init; RL pull state; utility math functions; nonLeoSatId set building |
| `channel/link-budget.ts` | Link budget composition | Owns tier selection logic; `tier35ScanLoss` path present but receives no `scanAngleDeg` from engine |
| `handover/` | FSM implementations | `ranking.ts` and `d2-distance.ts` extend the handover boundary beyond pure FSMs and should be explicitly carried into the target module map |
| `runner/headless/benchmark-runner.ts` | Headless run + A/B comparison | Duplicates Walker + TLE orbit element build logic that also lives in `useSimulation.ts` |
| `viz/overlays/ControlPanel.tsx` | UI controls | Hardcodes `PROFILE_OPTIONS` list with tier labels (Realistic/Advanced/Sensitivity); imports `HandoverType` directly from `@/core/profiles/types` |
| `app/hooks/useSimulation.ts` | Live sim loop | Uses synchronous XHR to load TLE fixture; duplicates Walker/TLE orbit-build logic from benchmark-runner |
| `viz/beam/beam-selection.ts` | Display-side satellite selection | Naming collision with `core/beam/selection.ts` (physics-side beam selection) |
| `sdd/` | Authority documents | Active roadmap, companion docs, and historical archive are now separated, but the current authority chain is still document-heavy and must be simplified into a clearer phase-driven architecture program |

---

### 0A.3 Problem Classification

### CAT-1: Architecture-level coupling

| ID | Problem | Files | Risk |
|---|---|---|---|
| AC-1 | No scenario / profile / experiment separation — all three collapse into `ProfileConfig` | `profiles/types.ts`, `profiles/defaults.ts` | Swapping baseline paper = full profile fork; no shared constellation across model families |
| AC-2 | ~~ASSUME-CHAN-001 / ASSUME-CUR-002 ID semantic conflict~~ — **RESOLVED.** `paper-sources.json` key `ASSUME-CHAN-001` retains path-loss tier sequencing; `noise_temperature_k` entries in `defaults.ts` and `ui-exposure-spec.md` now consistently use `ASSUME-CUR-002`. Validation note: `validate-specmode-gating.mjs` Rule 7 (added post-fix) now enforces a heuristic semantic consistency check — each ASSUME-* ID used on a `parameterPath` must have a registry description plausibly related to that path. This closes the coarsest category of provenance drift. | `src/core/config/paper-sources.json` (`ASSUME-CHAN-001` line ~301, `ASSUME-CUR-002` line ~311), `profiles/defaults.ts:139,243` | No longer blocking. |
| AC-3 | No model-family interface for channel/beam/HO/energy — model selection done via `if/switch` branches inside `engine.ts`. Note: `core/policy/` already has a working plug-in interface (Policy + greedy-sinr/no-op/invalid-probe); this is the template for AC-3 resolution. | `engine.ts`, `channel/link-budget.ts`, `core/policy/types.ts` | Swapping a SINR model requires editing engine internals; no plug-in surface |
| AC-4 | ControlPanel imports `HandoverType` directly from `@/core/profiles/types` — UI layer reaches into core type schema | `ControlPanel.tsx:9`, `profiles/types.ts` | UI coupled to core types; exposure layer abstraction does not yet exist |
| AC-5 | Profile-tier metadata (`Realistic / Advanced / Sensitivity`) exists only in `ControlPanel.tsx:PROFILE_OPTIONS` — not machine-readable or accessible to runtime | `ControlPanel.tsx:49–67` | Adding/renaming a profile requires editing both `defaults.ts` and `ControlPanel.tsx` |

### CAT-2: Oversized files / mixed responsibility

| ID | Problem | File | Lines |
|---|---|---|---|
| OS-1 | `engine.ts` combines: Phase 2 + Phase 3 SINR paths, Phase A + Phase B HO paths, BH scheduler lazy init, L2 per-sat init, RL pull interface, utility math, snapshot assembly | `engine.ts` | 1547 |
| OS-2 | `profiles/defaults.ts` holds all 14 profile objects (3 baseline families + reproduction + energy proof + showcase + realistic-first-screen) in one file with no logical grouping boundary | `defaults.ts` | 1320 |
| OS-3 | `profiles/types.ts` mixes scenario config (observer, time, orbit), model config (channel tiers, HO type, beam), and experiment config (seed, UE count, energy probe flags) in one `ProfileConfig` struct | `types.ts` | 491 |

### CAT-3: Stale / legacy code paths

| ID | Problem | File | Evidence |
|---|---|---|---|
| ST-1 | `tier3_5_scan_loss` declared in `ChannelConfig` with `@status dead-path` comment; no path in engine.ts routes to it; `link-budget.ts` has the formula but receives no `scanAngleDeg` input from engine | `types.ts:224`, `link-budget.ts` | Comment: "NOT YET WIRED" |
| ST-2 | Phase 2 `computeSatSinrPhase2()` (single-beam backwards-compat path) lives inside `createSimEngine`; no profile currently triggers it (all profiles use multi-beam or `num_beams=1` which still hits Phase 3); no migration/removal plan | `engine.ts:379–467` | Comment: "Phase 2 path (single beam, backwards compatible)" |
| ST-3 | `engine.ts` file header says "Phase 3 simulation engine" — describes a past construction phase, not the current abstraction | `engine.ts:2` | |
| ST-4 | Replay `controller.ts` retains legacy artifact-bundle path (`createReplayController()`) marked as compatibility/error boundary; not used in benchmark or frontend main path | `runner/replay/controller.ts` | Implementation-status §6 note 6 |

### CAT-4: Duplicated logic / duplicated source-of-truth

| ID | Problem | Files |
|---|---|---|
| DL-1 | Walker + TLE orbit element build logic appears three times: `useSimulation.ts`, `useReplay.ts`, and `benchmark-runner.ts`. A shared helper already exists — `core/orbit/profile-runtime.ts` exports `buildSyntheticOrbitElements` and `buildInteractiveTrajectoryCache` — but `useReplay.ts` (line 100–103) and `useSimulation.ts` (line 104–107) both call it directly while `benchmark-runner.ts` still has its own copy. The bootstrap sequence (profile → elements → cache → engine) is not owned by a single module. This is not a Phase 5 cleanup item; it is directly the orbit/runtime provider boundary that Phase 0B must define. | `useSimulation.ts:77–107`, `useReplay.ts:78–103`, `benchmark-runner.ts:130–175`, `core/orbit/profile-runtime.ts` |
| DL-2 | `core/beam/selection.ts` (physics: which beam for a UE) and `viz/beam/beam-selection.ts` (display: which satellites show beams) share a noun; name collision creates reader confusion and risks wrong-file edits | both files |
| DL-3 | Profile tier labeling exists in `ControlPanel.tsx:PROFILE_OPTIONS` and partially in `sourceMap[].specMode` in `defaults.ts`; no single authoritative tier registry | `ControlPanel.tsx:49–67`, `defaults.ts` |

### CAT-5: Runtime / spec drift risk

| ID | Problem | Evidence |
|---|---|---|
| RS-1 | `tier3_5_scan_loss` in spec (types.ts) but not wired in runtime — spec says it's there, runtime ignores it; any benchmark claim that enables this flag silently gets no scan loss | types.ts `@status dead-path` |
| RS-2 | ~~Implementation-status §4 inventory listed 7 files in `handover/` but codebase has 9~~ — **RESOLVED.** `ntn-sim-core-implementation-status.md §4` now lists all 9 handover files including `ranking.ts` and `d2-distance.ts`; `src/viz/`, `src/app/`, and `scripts/` inventory also completed. | — | No longer applicable. |
| RS-3 | `phase0-architecture-spec.md` was a stub (goal + scope only); no current-state analysis existed before this document | This file prior to 0A update |
| RS-4 | `ntn-sim-core-ui-exposure-spec.md` exists as an SDD but the runtime has no corresponding metadata layer; spec describes tiers that only exist as ControlPanel strings | `sdd/ntn-sim-core-ui-exposure-spec.md` |

### CAT-6: UI / runtime contract leakage

| ID | Problem | Files |
|---|---|---|
| UI-1 | `ControlPanel.tsx` imports `HandoverType` from `@/core/profiles/types` — UI imports core types directly, bypassing any future exposure contract | `ControlPanel.tsx:9` |
| UI-2 | The default profile string `'realistic-first-screen'` is not a single constant — it appears in at least four files: `SceneShell.tsx:31`, `useSceneQueryState.ts:18`, `useSceneQueryState.ts:46`, `useSimulation.ts:63`, `useReplay.ts:70`. Any profile rename requires patching all five locations. `ntn-sim-core-ui-exposure-spec.md:121` formally binds `?profile=` URL param resolution to `DEFAULT_PROFILES` dict, but the fallback string is still scattered. | `SceneShell.tsx:31`, `useSceneQueryState.ts:18,46`, `useSimulation.ts:63`, `useReplay.ts:70` |
| UI-3 | `PROFILE_OPTIONS` in ControlPanel is the only place where the human label, profile ID string, and tier tag are co-located; `ntn-sim-core-ui-exposure-spec.md:42` formally names ControlPanel as the implementation authority for this metadata — meaning the spec confirms the leakage, it does not fix it | `ControlPanel.tsx:49–67`, `sdd/ntn-sim-core-ui-exposure-spec.md:42` |
| UI-4 | `useSimulation.ts` uses synchronous XHR for TLE loading (line 87: `xhr.open('GET', ..., false)`); deprecated in browsers and incompatible with an async-first exposure contract | `useSimulation.ts:87` |
| UI-5 | `useBatchKpi.ts` imports `executeBenchmarkRun` directly from `runner/headless/benchmark-runner` (line 12, used at line 63) — an app-layer hook reaches into the headless runner, coupling interactive UI, artifact generation, and assumption/specMode manifest plumbing in one hook. Phase 0B must decide which boundary separates the runner from the exposure layer before this can be untangled. | `app/hooks/useBatchKpi.ts:12,63`, `runner/headless/benchmark-runner.ts` |

### CAT-7: External integration readiness gaps

| ID | Gap | Implication |
|---|---|---|
| EI-1 | No frozen external contract — but a de facto proto-contract already exists (see §0A.3 below). External consumers currently import from scattered internals; `sdd/estnet-ui-contract-outline.md` and `sdd/modqn-runtime-outline.md` define intended contracts but have no runtime backing. Phase 0B must decide which existing types become the frozen surface, rather than designing from a clean slate. | `src/core/common/types.ts`, `src/core/trace/types.ts`, `sdd/estnet-ui-contract-outline.md` |
| EI-2 | No parameter metadata API — external UIs cannot know which parameters exist, what their ranges are, or whether they are paper-backed | Phase 1 (parameter registry) must precede any real UI integration |
| EI-3 | No model-family plug-in surface — external tools cannot inject a replacement SINR or HO model without patching engine internals | Phase 2 (model bundles) must precede MODQN runtime |
| EI-4 | Profile loading is pure in-memory (DEFAULT_PROFILES dict) — no JSON schema, no disk-based profile files, no remote loading | Acceptable for current scope but means external tools must import TS source to use profiles |

---

### 0A.4 De Facto Contract Map (as-is)

The following types are already consumed by viz / app / runner layers. Phase 0B cannot treat the contract as a blank design problem — it must classify these existing types before deciding what moves, what freezes, and what splits.

**`src/core/common/types.ts` (285 lines)**

| Type | Current consumers | Classification |
|---|---|---|
| `SimulationSnapshot` | `SceneShell.tsx:138`, `EarthMovingBeamLayer`, `HandoverLinkOverlay`, `BeamInfoOverlay`, all viz overlays | **Runtime core** — the primary tick output; must stay in core |
| `SatelliteBeamSnapshot` | viz beam layers | **Runtime core** — embedded in SimulationSnapshot |
| `UeState`, `SatelliteState` | viz + kpi accumulator | **Runtime core** |
| `KpiBundleShell` | viz overlays, trace/types.ts (re-export) | **Runtime core** — re-exported from trace for external use |
| `SourceReference`, `SpecMode`, `SourceTier` | `defaults.ts`, `validate-specmode-gating.mjs` | **Provenance layer** — shared between runtime and validation chain |
| `HoLogEntry` | `HandoverLinkOverlay`, kpi accumulator | **Runtime core** |
| `BhSlotSnapshot`, `DapsSnapshot` | viz layers | **Runtime core** |
| `PresentationMode`, `OrbitMode`, `BeamSemantics` | `profiles/types.ts`, `engine.ts` | **Config/scenario** — candidates for Phase 3 split |
| `ObserverLocation`, `TimeControl` | profiles, orbit, engine | **Scenario** — candidates for Phase 3 scenario object |

**`src/core/trace/types.ts` (168 lines)**

| Type | Current consumers | Classification |
|---|---|---|
| `RunManifest` | `benchmark-runner.ts`, `useReplay.ts:31` | **Audit / artifact** — describes a completed run; not needed at tick time |
| `ReplayManifest`, `ReplayArtifact` | `useReplay.ts`, `runner/replay/controller.ts` | **Replay / audit** |
| `RunArtifactBundle` | `benchmark-runner.ts`, `useBatchKpi.ts:11` | **Audit** — downstream consumer artifact |
| `SourceTrace`, `SourceTraceEntry` | `benchmark-runner.ts` | **Audit** |
| `AssumptionRecord` | `validate-assumption-manifest.mjs` | **Audit / validation chain** |
| `EventLog`, `EventRecord` | engine, replay | **Runtime core** (generated during tick) |
| `ResolvedConfig` | `benchmark-runner.ts` | **Runner internal** |

**Classification summary for Phase 0B:**
- **Runtime core** (`SimulationSnapshot` + embedded types, `EventLog`): must remain in `core/`; external consumers import read-only
- **Audit / artifact** (`RunManifest`, `RunArtifactBundle`, `SourceTrace`, `AssumptionRecord`): belongs to `runner/` or a dedicated `artifact/` layer
- **Provenance** (`SourceReference`, `SpecMode`, `SourceTier`): shared between `core/config/` and validation scripts; must not be embedded in runtime snapshot types
- **Scenario / config** (`ObserverLocation`, `TimeControl`, `OrbitMode`, `BeamSemantics`, `PresentationMode`): candidates for Phase 3 scenario object extraction from `ProfileConfig`

**Note on validation chain health:** `validate:stage` passes all gates. `validate-specmode-gating.mjs` now enforces Rule 7 (semantic consistency heuristic): each ASSUME-* ID used on a `parameterPath` must have a registry description plausibly related to that path. This caught the ASSUME-CHAN-001/ASSUME-CUR-002 conflict class and a second mismatch (ASSUME-RF-001 on `rf.bandwidth_mhz`, now fixed with ASSUME-BW-001). Rule 7 is heuristic — it covers term-based matching, not full semantic equivalence — but it closes the coarsest category of provenance drift.

---

### 0A.5 Platform Fitness Assessment

Evaluated from the perspective of a **long-lived simulator platform**, not a single-paper reproduction:

| Dimension | Current state | Blocker? |
|---|---|---|
| Swap baseline paper | Requires forking a full profile object (≥120 lines), editing both `defaults.ts` and `ControlPanel.tsx` | Not blocking but high cost |
| Swap SINR/path-loss model | Requires editing `engine.ts` internals (Phase 2/3 branch) and `link-budget.ts` | Blocking for Phase 2 (model bundles) |
| Add new parameter | Add to `ProfileConfig`, add to default profile, add TSDoc annotation, add ControlPanel label if user-visible | Medium cost; no registry to update |
| UI reads parameter metadata | Not possible — no machine-readable provenance layer | Blocking for any provenance-aware UI |
| External consumer integration | Must import internal TS types; no frozen API contract | Blocking for `estnet-ui-kickoff` |
| New paper / model family | Safe to add new profile in `defaults.ts`; no cross-cutting contract breaks | Low cost today, but scales poorly |

**Assessment:** The codebase is functionally complete for its current paper-set but has three hard blockers before it can be treated as a platform:

1. **AC-3 (no model-family interface)** — blocks model swapping and Phase 2; `core/policy/` plug-in pattern is the template
2. **EI-1 (no frozen external contract)** — a de facto proto-contract exists (§0A.3); Phase 0B must classify it before Phase 4, not design from scratch
3. **DL-1 (orbit bootstrap ownership)** — three callers of the same bootstrap sequence; Phase 0B must assign ownership before Phase 3 scenario split

**Resolved blocker:** AC-2 (ASSUME-CHAN-001 / ASSUME-CUR-002 ID conflict) — fixed in `defaults.ts` and `ui-exposure-spec.md`; no longer blocking.

---

### 0A.6 High-Priority Refactor Targets

Listed in priority order for Phase 0B target architecture design:

### Blocking (must be resolved before Phase 1 can start)

| ID | Target | Why blocking |
|---|---|---|
| P0-B1 | Define vocabulary: scenario / profile / experiment / model / policy / exposure | Phase 1–5 all reference this vocabulary; without it, each SDD will use inconsistent terms |
| P0-B2 | Map existing `ProfileConfig` fields to proposed vocabulary | Required to write Phase 1 parameter registry without breaking existing profiles |
| P0-B3 | Define model-family interface contract (geometry, path-loss, SINR, HO, beam, power, EE) | Required by Phase 2; also determines how engine.ts will be split |

### High priority (Phase 0B prerequisite inputs — design decisions, not code)

| ID | Target | Action needed |
|---|---|---|
| P0-H1 | Parameter tier / provenance metadata schema | Design the `ParameterEntry` schema (id, tier, range, source, exposure-mode); seed from Phase 1 stub SDD (already has field list) |
| P0-H2 | Map existing `ProfileConfig` fields to proposed vocabulary | Identify which fields are scenario-level / model-config-level / experiment-level; seed from Phase 3 stub SDD definitions |
| P0-H3 | Specify external output contract types | Classify §0A.3 types into runtime-core / audit / scenario before designing Phase 4 contract; do not design Phase 4 as clean slate |
| P0-H4 | ~~ASSUME-CUR-002 semantic conflict~~ — **resolved**: `defaults.ts` and `ui-exposure-spec.md` now consistently use `ASSUME-CUR-002` for `noise_temperature_k`; `paper-sources.json` key `ASSUME-CHAN-001` retains path-loss tier sequencing | Done — no further action needed |
| P0-H5 | Assign orbit bootstrap ownership | Decide: does `profile-runtime.ts` become the single orbit provider, or does Phase 3 scenario object absorb it? Required input for Phase 3 split design |

### Can defer to Phase 5 (cleanup)

| ID | Target |
|---|---|
| P5-1 | Remove `tier3_5_scan_loss` dead field and ST-1/ST-2 legacy paths |
| P5-2 | Split `defaults.ts` into per-family files |
| P5-3 | Rename `viz/beam/beam-selection.ts` to avoid collision with `core/beam/selection.ts` |
| P5-4 | Fix sync XHR in `useSimulation.ts` |
| ~~P5-6~~ | ~~Update implementation-status §4 inventory~~ — **done**: handover inventory updated to 9 files; viz/app/scripts inventory completed. |

---

### 0A.7 Items That Block Entry into Phase 1

Phase 1 (parameter registry) cannot start until Phase 0B produces:

1. An agreed vocabulary for scenario / profile / experiment / model / policy / exposure
   (seed: Phase 3 stub SDD already defines scenario/profile/experiment; reconcile before adding to)
2. A field-level mapping from current `ProfileConfig` to that vocabulary
3. A `ParameterEntry` schema draft (id, tier, unit, range, source, exposure-mode, derived flag)
   (seed: Phase 1 stub SDD already enumerates the required fields)

None of these require code changes — they are design documents.
The code issues listed under CAT-1 through CAT-7 are **inputs to** Phase 0B design, not blockers to starting it.

**ASSUME-CHAN-001 / ASSUME-CUR-002 conflict: resolved** — `defaults.ts` and `ui-exposure-spec.md` now use `ASSUME-CUR-002` for `noise_temperature_k`. This item no longer blocks Phase 0B or Phase 1.

**Go/no-go: Phase 0B can begin immediately.**
Phase 1–5 stub SDDs (30–39 lines each) already exist in `sdd/` and must be treated as seed inputs to Phase 0B, not blank slates.

---

### 0A.8 Summary Table

| Category | Count | Blocking Phase 1? |
|---|---|---|
| Architecture coupling (CAT-1) | 5 items | AC-2 resolved (ASSUME-CUR-002 fix applied); AC-1, AC-3 are blocking Phase 1 |
| Oversized / mixed (CAT-2) | 3 items | No (inform Phase 5 split) |
| Stale / legacy (CAT-3) | 4 items | No (Phase 5 cleanup) |
| Duplicated logic (CAT-4) | 3 items | DL-1 (orbit bootstrap) is a Phase 0B input; DL-2, DL-3 Phase 5 cleanup |
| Runtime / spec drift (CAT-5) | 4 items | RS-1 is a benchmark-claim risk |
| UI / runtime leakage (CAT-6) | 5 items | UI-5 (useBatchKpi→benchmark-runner) informs Phase 0B boundary; UI-1/2/4 inform Phase 4 |
| External integration gaps (CAT-7) | 4 items | EI-1 (classify §0A.3 proto-contract first), EI-2, EI-3 blocking platform exit |
| De facto contract map (§0A.3) | 12 types classified | Required Phase 0B input — do not design Phase 4 as clean slate |

---

## Phase 0B — Target Architecture

### 0B.1 Formal Vocabulary

Each term is defined once here. All subsequent SDD phases and code comments must use these definitions. Where a term is ambiguous today, the definition below is authoritative.

---

#### Parameter

A named, typed, source-backed value that influences KPI-impacting simulation behavior.

- **Belongs to:** Parameter Registry layer (`src/core/config/`)
- **Does NOT belong to:** ProfileConfig fields, engine internals, UI strings
- **Today:** parameters live as TSDoc annotations in `ProfileConfig` sub-structs; no single machine-readable structure per parameter
- **Rule:** every KPI-impacting parameter must have exactly one `ParameterEntry`; parameters that do not yet have entries are "unregistered" and must be registered before Phase 1 closes

---

#### ParameterEntry

The registry record for one parameter. Schema defined in §0B.4.

- **Belongs to:** Parameter Registry layer
- **Does NOT belong to:** runtime engine, ProfileConfig, UI components
- **Today:** the closest thing is `SourceReference` in `common/types.ts` + `paper-sources.json` IDs; these cover provenance but not range, unit, or exposure mode per parameter

---

#### Derived Quantity

A value computed at runtime from one or more Parameters. Not independently settable by a user or profile.

- **Belongs to:** runtime computation in engine or model family implementations
- **Does NOT belong to:** parameter registry as an independent entry; must not appear as a free UI slider
- **Today:** `txEirp` is derived from `tx_power_per_beam_dbm + peak_gain_dbi - implementation_loss_db` inside `engine.ts`. `eirp_density_dbw_per_mhz` is spec-annotated as `@spec-deviation` derived quantity but is still a ProfileConfig field for backwards compatibility. The spec deviation annotation is correct; the field is retained only as a paper-reproduction compatibility input.

---

#### Model Family

A named, typed interface that computes one physical quantity (path loss, beam gain, SINR, power, EE, handover decision) given typed inputs. A model family has an `id` and an interface contract.

- **Belongs to:** Model Bundle layer (`src/core/{channel,beam,handover,energy}/`)
- **Does NOT belong to:** engine tick logic, profile config, UI
- **Today:** model family selection is done via `if/switch` branches inside `engine.ts`; no explicit interface per family except `Policy` (already correct). `Policy` in `src/core/policy/types.ts` is the template.

---

#### Model Bundle

A named, versioned composition of one model-family selection per the **8 top-level slots** defined in `phase2-model-bundle-sdd.md`: geometry, path-loss, beam-gain, SINR, power, EE, handover, policy. A bundle is the unit of "this simulation uses these physics equations."

The following are **NOT** top-level bundle slots:
- `BeamLayoutModel` — geometry utility inside `core/beam/`, not a KPI-computing family
- `SchedulerModel` — BH-specific sub-interface inside `core/beam/`, conditional on `BeamSemantics.EARTH_FIXED_BH`
- `TrafficModel` — demand generator in `core/traffic/`, used as scheduler input, not a model family

These are finalized in `phase0-architecture-spec.md §0B.5` and must not be re-opened in Phase 2.

- **Belongs to:** Scenario / Profile / Experiment layer (as a sub-component of Profile)
- **Does NOT belong to:** engine internals; a bundle is a declarative selection, not an implementation
- **Today:** bundling is implicit in `ProfileConfig.channel`, `ProfileConfig.handover`, `ProfileConfig.beam`; no named bundle object exists

---

#### Scenario

The physical/environmental description of a simulation situation: observer location, time epoch, orbit regime, constellation geometry, UE count and distribution pattern.

A scenario does **not** include:
- model family selections
- algorithm parameters (TTT, hysteresis)
- seed or run duration
- energy probe flags

- **Belongs to:** Scenario / Profile / Experiment layer (target: `ScenarioConfig`)
- **Today:** mixed into `ProfileConfig` alongside model config and experiment config (see §0B.3 for field mapping)

---

#### Profile

A named, versioned, source-backed composition of:

1. one scenario (or scenario reference)
2. one model bundle selection
3. one policy selection
4. a set of parameter default values with provenance

A profile is the reproducible unit for a paper baseline. Profiles are not free-form config blobs — every non-default parameter value must have a `ParameterEntry` and a `sourceMap` entry.

- **Belongs to:** Scenario / Profile / Experiment layer (`src/core/profiles/`)
- **Today:** `ProfileConfig` = scenario + model config + experiment config + provenance metadata + family label + showcase flags, all in one struct (491-line `types.ts`, 1320-line `defaults.ts`)

---

#### Experiment Bundle

A named, reproducible run definition that binds:

1. one profile (by id)
2. seed
3. time window (epoch, duration, step)
4. KPI targets and tolerance bounds
5. artifact policy (what to record, what to replay)

An experiment bundle is what gets submitted for paper figures. Distinct from a Profile because the same profile can be run with different seeds, durations, or KPI targets.

- **Belongs to:** Scenario / Profile / Experiment layer (target: `ExperimentBundle`)
- **Today:** scattered — seed is in ProfileConfig, duration/step in `timeControl`, KPI targets in reproduction-targets SDD, artifact policy in benchmark-runner call sites

---

#### Policy

An algorithm that receives `PolicyObservation` and returns `PolicyAction`. Already has a correct interface in `src/core/policy/types.ts`.

- **Belongs to:** Model Bundle layer (as `PolicyModel`); a policy is a model family for the decision/control plane
- **Today:** correct; `Policy` interface exists; `greedy-sinr`, `no-op`, `invalid-probe` plugins are registered. This is the template for all model-family interfaces.

---

#### Runtime Contract

The stable, versioned set of types that external consumers (viz layer, headless runner, MODQN trainer, estnet-ui) may import and rely on across versions.

- **Belongs to:** Runtime Core layer output + Exposure Contract layer (Phase 4 will freeze these)
- **Includes:** `SimulationSnapshot`, `KpiBundle`, `RunManifest`, `HoLogEntry`, `BhSlotSnapshot`, `DapsSnapshot`
- **Does NOT include:** engine internals, ProfileConfig sub-structs, model family implementation details
- **Today:** these types exist in `core/common/types.ts` and `core/trace/types.ts` but are not versioned or declared as a frozen surface; external consumers import them directly

---

#### Exposure / UI Contract

The metadata API that lets a UI (ControlPanel, estnet-ui, external tool) enumerate available profiles, parameters, their tiers, ranges, and provenance — without importing `ProfileConfig` internals or `HandoverType` from core profiles.

- **Belongs to:** Exposure Contract layer (Phase 4); backed by parameter registry (Phase 1)
- **Includes:** `ParameterMetadataResponse`, `ParameterView` (profile-scoped flattened projection), `ProfileListEntry`
- **Does NOT include:** engine types, model implementation types, ProfileConfig fields
- **Today:** does not exist as a layer; only exists as hardcoded `PROFILE_OPTIONS` array in `ControlPanel.tsx` and `@spec-mode` TSDoc annotations in `types.ts`

---

### 0B.2 Target Module Map

```
src/
├── core/
│   ├── config/           ← LAYER 1: Parameter Registry
│   │   ├── paper-sources.json          (existing: PAP-/STD-/ASSUME- IDs)
│   │   ├── parameter-registry.ts       (new: ParameterEntry[] — two-layer wrapper:
│   │   │                                GlobalParameterSpec + ProfileParameterBinding[])
│   │   └── exposure/     ← LAYER 6: Exposure Contract (Phase 4 — does not exist yet)
│   │       └── types.ts  (ParameterMetadataResponse, ProfileListEntry — Phase 4 output)
│   │
│   ├── common/           ← SHARED: runtime snapshot types + primitive types
│   │   └── types.ts      (SimulationSnapshot, SatelliteState, UeState,
│   │                       SourceReference, SpecMode — no physics)
│   │
│   ├── channel/          ← LAYER 2: Model Bundle — path loss + SINR
│   │   ├── types.ts      (PathLossModel, BeamGainModel, SinrModel interfaces)
│   │   ├── fspl.ts       (implements PathLossModel tier 0)
│   │   ├── beam-gain.ts  (implements BeamGainModel)
│   │   ├── shadow-fading.ts, small-scale-fading.ts, doppler.ts
│   │   ├── sinr.ts       (SinrModel: aggregates serving + interferers)
│   │   └── link-budget.ts (PathLossModel composition — existing, keep)
│   │
│   ├── beam/             ← LAYER 2: Model Bundle — beam layout + scheduler
│   │   ├── types.ts      (BeamLayoutModel, SchedulerModel interfaces)
│   │   ├── layout.ts, selection.ts, active-beam-manager.ts
│   │   ├── scheduler.ts  (SchedulerModel implementations)
│   │   └── frequency-reuse.ts
│   │
│   ├── handover/         ← LAYER 2: Model Bundle — handover FSMs
│   │   ├── types.ts      (HandoverModel interface — wraps existing HandoverManager)
│   │   ├── manager.ts, baselines.ts, cho.ts, mc-ho.ts, daps.ts
│   │   ├── ranking.ts, d2-distance.ts
│   │   └── index.ts
│   │
│   ├── energy/           ← LAYER 2: Model Bundle — power + EE
│   │   ├── types.ts      (PowerModel, EeModel interfaces)
│   │   ├── layer1.ts, layer2.ts
│   │   └── index.ts
│   │
│   ├── policy/           ← LAYER 2: Model Bundle — policy/DRL (already correct)
│   │   ├── types.ts      (Policy interface — existing, is the template)
│   │   ├── plugins/      (greedy-sinr, no-op, invalid-probe)
│   │   └── index.ts
│   │
│   ├── orbit/            ← LAYER 2 (geometry): orbit propagation
│   │   ├── profile-runtime.ts  (SINGLE OWNER of orbit bootstrap:
│   │   │                         buildSyntheticOrbitElements,
│   │   │                         buildInteractiveTrajectoryCache,
│   │   │                         buildTrajectoryCacheForProfile)
│   │   ├── walker.ts, propagation.ts, trajectory-cache.ts,
│   │   │   topocentric.ts, sgp4-adapter.ts, tle-loader.ts,
│   │   │   geo-stationary.ts, math.ts, types.ts
│   │   └── index.ts
│   │
│   ├── kpi/              ← LAYER 4: Runtime Core output
│   ├── trace/            ← LAYER 5: Audit / Artifact
│   ├── ue/               ← LAYER 2/4: UE position + mobility (scenario-driven)
│   ├── traffic/          ← LAYER 2: Model Bundle (demand model)
│   │
│   ├── profiles/         ← LAYER 3: Scenario / Profile / Experiment
│   │   ├── types.ts       (ProfileConfig — to be refactored; see §0B.3)
│   │   ├── defaults.ts    (14 profiles — to be split by family in Phase 5)
│   │   └── loader.ts      (load/resolve/validate — keep, refine)
│   │
│   └── engine.ts         ← LAYER 4: Runtime Core (orchestration only)
│                            (target: thin orchestrator calling model families
│                             via interfaces; no if/switch model selection)
│
├── runner/               ← LAYER 5: Audit / Artifact + headless execution
│   ├── headless/         (benchmark-runner.ts must use orbit/profile-runtime.ts
│   │                       instead of its own orbit-build copy — Phase 5 cleanup)
│   ├── replay/
│   └── curation/
│
├── viz/                  ← LAYER 7: Viz / UI (no physics, no ProfileConfig internals)
│   ├── overlays/         (ControlPanel: must get profile list + HandoverType
│   │                       from exposure contract, not from core/profiles/types)
│   ├── beam/, satellite/, scene/, validation/
│
└── app/
    └── hooks/            (useSimulation, useReplay — call profile-runtime.ts;
                            useBatchKpi — Phase 4 boundary decision: see §0B.6)
```

---

### 0B.3 Layer Boundaries and Dependency Rules

**Shared primitives layer (`core/common/types.ts`):**

`core/common/types.ts` exports `SourceTier`, `SpecMode`, `SourceReference` as well as runtime snapshot types (`SimulationSnapshot`, `SatelliteState`, etc.). These primitives are used by both L1 (parameter registry) and the validation chain. Declaring L1 as "no imports from anything else" would create a circular problem: `ParameterEntry.sourceTier: SourceTier` and `.exposureMode: SpecMode` require types from `common/`.

**Resolution:** `core/common/types.ts` is designated a **shared-primitives module**, not a layer. Any layer may import from it. It must not import from any named layer (L1–L7). The "leaf" constraint on L1 means L1 may not import from L2–L7 or `profiles/`, `engine.ts`, `runner/`, `viz/`, or `app/` — importing `SourceTier`/`SpecMode` from `core/common/types.ts` is permitted.

**L1 / L6 directory co-location:**

Both L1 (Parameter Registry) and L6 (Exposure Contract) are currently mapped to `src/core/config/`. This is deliberate: L6 does not yet exist as live code; it will be a Phase 4 output. When Phase 4 creates L6 types, they will live in `src/core/config/exposure/` (subdirectory) to distinguish them from L1 which stays in `src/core/config/` (registry and `paper-sources.json`). The co-location is a naming ambiguity today, not a runtime coupling.

| Layer | Directory | Allowed imports | Forbidden imports |
|---|---|---|---|
| Shared Primitives | `src/core/common/types.ts` | none | everything else (no layer imports) |
| L1 Parameter Registry | `src/core/config/` (excl. `config/exposure/`) | `core/common/types.ts` (shared primitives only) | L2–L7, profiles/, engine.ts, runner/, viz/, app/ |
| L2 Model Bundle | `src/core/{channel,beam,handover,energy,policy,orbit}/` | L1 (parameter IDs), `core/common/types.ts` | engine.ts, profiles/, viz/, app/, runner/ |
| L3 Scenario/Profile/Experiment | `src/core/profiles/` | L1 (parameter IDs), L2 (model family ids by name only) | engine.ts, viz/, app/, runner/ |
| L4 Runtime Core | `src/core/engine.ts`, `core/kpi/` | L1, L2 (via interfaces), L3 (ProfileConfig), `core/common/`, `core/trace/` (write) | React, Three.js, viz/, app/, runner/ |
| L5 Audit/Artifact | `src/core/trace/`, `src/runner/` | L4 output (read-only), L1 | viz/, React, Three.js |
| L6 Exposure Contract | `src/core/config/exposure/` (Phase 4 — does not exist yet) | L1, L3 (id/label/tier only), `core/common/types.ts` | L4 internals, L2 implementations |
| L7 Viz/UI | `src/viz/`, `src/app/` | L4 runtime contract (SimulationSnapshot etc.), L6 (exposure contract) | L2 implementations, L3 internals (ProfileConfig fields), L4 engine.ts internals |

**Critical forbidden dependencies (currently violated — Phase 4 / 5 fix targets):**

| Violation | Current file | Fix target |
|---|---|---|
| UI-1: ControlPanel imports `HandoverType` from `@/core/profiles/types` | `viz/overlays/ControlPanel.tsx:9` | Phase 4: get `HandoverType` list from exposure contract |
| UI-3/AC-5: PROFILE_OPTIONS in ControlPanel is the only tier registry | `viz/overlays/ControlPanel.tsx:49` | Phase 4: expose profile list + tier from L6 |
| UI-5: useBatchKpi imports `executeBenchmarkRun` from `runner/headless/benchmark-runner` | `app/hooks/useBatchKpi.ts:12` | Phase 4: define runner/exposure boundary |
| DL-1: benchmark-runner.ts duplicates orbit build from profile-runtime.ts | `runner/headless/benchmark-runner.ts:130` | Phase 5: migrate to `orbit/profile-runtime.ts` |

---

### 0B.4 ParameterEntry Schema

This is the **draft schema** for Phase 1 to implement. It is not yet code; it is the design contract.

**Schema design rationale:** A single flat `ParameterEntry` cannot represent per-profile diversity. For example, `rf.frequency_ghz` has three distinct (defaultValue, sourceTier, sourceId, exposureMode) bindings across the three synthetic families (S-band / Ka-band HOBS / Ka-band BH). The schema is therefore split into two structures:

1. **`GlobalParameterSpec`** — one record per parameter; describes what the parameter *is* (identity, units, range, derived flag, vocabulary layer). Profile-agnostic.
2. **`ProfileParameterBinding`** — one record per (parameter × profile) combination; describes what value the parameter *takes* in that profile and why.

**PARAM-* namespace rule:** `GlobalParameterSpec.id` uses the `PARAM-*` prefix (e.g. `PARAM-RF-FREQ-GHZ`). This namespace is distinct from `ASSUME-*`, `PAP-*`, and `STD-*` and must never overlap with them.

```typescript
/**
 * GlobalParameterSpec — profile-agnostic registry record for one KPI-impacting parameter.
 * Stored in src/core/config/parameter-registry.ts as GlobalParameterSpec[].
 * Phase 1 will implement this schema and populate it from existing ProfileConfig fields.
 */
interface GlobalParameterSpec {
  // --- Identity ---
  /**
   * Unique registry ID. Must use PARAM-* prefix, e.g. "PARAM-RF-FREQ-GHZ".
   * Distinct from ASSUME-*/PAP-*/STD-* namespaces — no overlap allowed.
   */
  id: string;

  /** Dotted path in ProfileConfig, e.g. "rf.frequency_ghz". Used for sourceMap alignment. */
  parameterPath: string;

  /** Human-readable name for UI display and audit. */
  semanticName: string;

  // --- Value metadata ---
  /** SI unit or null for dimensionless. E.g. "GHz", "dBm", "km", "ms", null. */
  unit: string | null;

  /** Allowed continuous range, if applicable. */
  allowedRange?: { min: number; max: number };

  /** Allowed discrete preset list, if applicable (mutually exclusive with allowedRange). */
  presetList?: Array<{ value: string | number; label: string }>;

  /**
   * True if this value is computed from other parameters and must not
   * be independently set or swept. E.g. txEirp (derived from P1 + G_peak - L_impl).
   * Derived parameters are in the registry for audit completeness but must not
   * be exposed as UI controls or sweep variables.
   */
  isDerived: boolean;

  /**
   * Optional conditional dependency, e.g.
   * "only active when channel.tier4_atmospheric = true".
   * Phase 4 exposure contract uses this to conditionally show/hide the parameter.
   */
  dependencyRule?: string;

  // --- Vocabulary classification ---
  /**
   * Which vocabulary layer this parameter belongs to.
   * Used by Phase 3 split to place the parameter in the right sub-config object.
   * Note: 'profile-metadata' is NOT a valid value — parameters are by definition
   * KPI-impacting values, not profile identity fields (id, family, version).
   * Profile metadata fields (id, family, version) are not ParameterEntries.
   */
  vocabularyLayer: 'scenario' | 'model-bundle' | 'experiment';
}

/**
 * ProfileParameterBinding — per-(parameter × profile) provenance and default value record.
 * Stored alongside GlobalParameterSpec in parameter-registry.ts.
 * There is one binding per profile that sets a non-universal default for this parameter.
 *
 * Example for PARAM-RF-FREQ-GHZ:
 *   { profileId: 'family-access-synth',  defaultValue: 2.0,  sourceTier: 'paper',
 *     sourceId: 'PAP-2022-SINR-ELEVATION', exposureMode: 'Realistic' }
 *   { profileId: 'family-mb-hobs-synth', defaultValue: 28.0, sourceTier: 'paper',
 *     sourceId: 'PAP-2024-HOBS',          exposureMode: 'Realistic' }
 *   { profileId: 'family-bh-synth',      defaultValue: 20.0, sourceTier: 'assumption',
 *     sourceId: 'ASSUME-RF-001',          exposureMode: 'Advanced' }
 */
interface ProfileParameterBinding {
  /** References GlobalParameterSpec.id */
  parameterId: string;

  /** Which profile this binding applies to (ProfileConfig.id). */
  profileId: string;

  /** Default value for this parameter in this profile. */
  defaultValue: number | string | boolean | null;

  // --- Provenance ---
  /** Tier of the source backing this parameter's default value in this profile. */
  sourceTier: SourceTier;  // from core/common/types.ts (shared primitives — see §0B.3)

  /** PAP-*/STD-*/ASSUME-* ID from paper-sources.json that justifies this default. */
  sourceId: string;

  /** Optional detail, e.g. "Table III, row 5" or "Eq. (12)". */
  sourceNote?: string;

  // --- Exposure ---
  /**
   * Which UI/exposure mode this parameter-profile combination belongs to.
   * A parameter can be Realistic in one profile but Advanced in another
   * (e.g. if one profile paper-backs the value and another uses an assumption).
   */
  exposureMode: SpecMode;  // from core/common/types.ts (shared primitives — see §0B.3)
}

/**
 * ParameterEntry — convenience alias bundling a GlobalParameterSpec
 * with its profile-specific bindings. Not a flat merged record.
 */
interface ParameterEntry {
  spec: GlobalParameterSpec;
  bindings: ProfileParameterBinding[];
}
```

**Relationship to existing `SourceReference` (in `common/types.ts`):**

`SourceReference` is a per-parameter annotation inside `ProfileConfig.sourceMap[]`. It covers `tier`, `id`, `parameterPath`, and `specMode` — these map to `ProfileParameterBinding.sourceTier`, `.sourceId`, and `.exposureMode` plus `GlobalParameterSpec.parameterPath`. Phase 1 will build `ParameterEntry` as a superset; the existing `sourceMap` annotations in `defaults.ts` become the Phase 1 data-collection input, one binding record per sourceMap entry.

---

### 0B.5 Model-Family Interface Contract Draft

Template: `src/core/policy/types.ts` `Policy` interface. Each model family follows the same pattern: typed inputs → typed outputs → factory function → plugins directory.

**Resolves:** AC-3 (no model-family interface), EI-3 (no plug-in surface for external tools)

**Authoritative family list (aligned with `phase2-model-bundle-sdd.md` §Target Model Families):**

| # | Family | Responsibility | Phase 0B status |
|---|---|---|---|
| 1 | `GeometryModel` | Orbit propagation: satellite position, elevation, slant range, off-axis angle | ✅ contract below |
| 2 | `PathLossModel` | Path loss composition: FSPL + large-scale + clutter + atmospheric | ✅ contract below |
| 3 | `BeamGainModel` | Beam gain roll-off given off-axis angle | ✅ contract below |
| 4 | `SinrModel` | SINR aggregation: serving power, noise, interferers | ✅ contract below |
| 5 | `PowerModel` | Satellite transmit + circuit power accounting | ✅ contract below |
| 6 | `EeModel` | Energy efficiency (bits/joule) | ✅ contract below |
| 7 | `HandoverModel` | Handover FSM factory | ✅ contract below |
| 8 | `PolicyModel` | Decision/control algorithm (DRL, greedy, no-op) — alias for existing `Policy` interface | ✅ contract below |

**Excluded from the 8-family list (not model families):**
- `BeamLayoutModel` — beam hex layout is a geometry helper, not a model family with pluggable physics. It belongs in `core/beam/` as a utility, not an interface slot in `ModelBundle`. Phase 2 will confirm placement.
- `SchedulerModel` — BH scheduler is a policy-like plug-in within the `BeamSemantics.EARTH_FIXED_BH` path. It is a specialized sub-interface within `core/beam/`, not a top-level model family. Phase 2 will define it as a sub-interface of beam config.
- `TrafficModel` — demand generator (Poisson, full-buffer, hotspot). Used as input to scheduler but is not a KPI-computing model family. Stays in `core/traffic/` as a configurable generator.

```typescript
// ── GeometryModel ──────────────────────────────────────────────────
// Orbit propagation and satellite-UE geometry computation.
// Replaces the SGP4 / Walker / topocentric calls scattered in engine.ts.
interface GeometryInput {
  epochUtcMs: number;
  tickSec: number;
  orbitElements: OrbitalElements[];     // from orbit/walker.ts or SGP4 adapter
  observerLocation: ObserverLocation;   // lat/lon/alt
  uePositions: UePosition[];            // WGS84
}
interface SatelliteGeometry {
  satId: string;
  positionEcef: [number, number, number];
  elevationDeg: number;
  slantRangeKm: number;
  dopplerHz: number;
}
interface GeometryResult {
  satellites: SatelliteGeometry[];
}
interface GeometryModel {
  readonly familyId: string; // "sgp4-tle" | "walker-analytic" | "kepler-debug"
  compute(input: GeometryInput): GeometryResult;
}

// ── PathLossModel ──────────────────────────────────────────────────
// Replaces the tier-flag if/else chain in link-budget.ts / engine.ts
interface PathLossInput {
  distanceKm: number;
  frequencyGhz: number;
  elevationDeg: number;
  environment: DeploymentEnvironment;
  isLos: boolean;
  txEirpDbm: number;
  implementationLossDb: number;
  rngNext: (() => number) | null;
  tiers: { t1_large_scale: boolean; t2_clutter: boolean;
           t4_atmospheric: boolean; t5_fading: boolean };
}
interface PathLossResult {
  rxPowerDbm: number;        // received power = txEirp - totalPathLossDb
  totalPathLossDb: number;
  components: {
    fsplDb: number;
    shadowFadingDb: number;
    clutterLossDb: number;
    atmosphericLossDb: number;
    smallScaleFadingDb: number;
  };
}
interface PathLossModel {
  readonly familyId: string; // e.g. "3gpp-baseline" | "3gpp-extended"
  compute(input: PathLossInput): PathLossResult;
}

// ── BeamGainModel ──────────────────────────────────────────────────
// Replaces the model string switch in channel/beam-gain.ts
interface BeamGainInput {
  offAxisAngleDeg: number;
  peakGainDbi: number;
  beamDiameterKm: number;
  altitudeKm: number;
  slantRangeKm: number;
}
interface BeamGainModel {
  readonly familyId: string; // "rpsat-3gpp" | "bessel-j1" | "itu-r" | "flat-debug"
  computeGainDb(input: BeamGainInput): number; // dBi
}

// ── SinrModel ──────────────────────────────────────────────────────
// Replaces the Phase2/Phase3 branch in engine.ts
interface SinrInput {
  servingRxPowerDbm: number;
  noisePowerDbm: number;
  interferingRxPowersDbm: number[];
  dopplerDegradationDb: number;
}
interface SinrModel {
  readonly familyId: string; // "standard" | "daps-mrc" | ...
  computeDb(input: SinrInput): number; // dB
}

// ── HandoverModel ──────────────────────────────────────────────────
// Wraps existing HandoverManager factory pattern
interface HandoverModel {
  readonly familyId: string; // "a3" | "a4" | "cho" | "timer-cho" | "mc-ho" | "daps" | ...
  createManager(config: HandoverConfig): HandoverManager;
}

// ── SchedulerModel ─────────────────────────────────────────────────
// Wraps BhScheduler factory pattern
interface SchedulerModel {
  readonly familyId: string; // "round-robin" | "max-demand" | "power-aware" | ...
  createScheduler(config: BeamConfig, layouts: Map<string, SatelliteBeamLayout>): BhScheduler;
}

// ── PowerModel / EeModel ───────────────────────────────────────────
interface PowerInput {
  txPowerPerBeamDbm: number;
  numActiveBeams: number;
  circuitPowerW: number;
}
interface PowerResult {
  totalPowerW: number;
  txPowerW: number;
  circuitPowerW: number;
}
interface PowerModel {
  readonly familyId: string; // "layer1-basic" | ...
  compute(input: PowerInput): PowerResult;
}
interface EeInput {
  throughputBps: number;
  totalPowerW: number;
}
interface EeModel {
  readonly familyId: string; // "bpj" | "spectral-ee" | ...
  computeBitsPerJoule(input: EeInput): number;
}

// ── PolicyModel ────────────────────────────────────────────────────
// Alias for the existing Policy interface in src/core/policy/types.ts.
// Listed here for completeness; the canonical definition stays in policy/types.ts.
// familyId values: "greedy-sinr" | "no-op" | "invalid-probe" | "modqn" | ...
type PolicyModel = Policy;  // Policy already has: readonly id, act(), reset()

// ── ModelBundle ────────────────────────────────────────────────────
// Declarative composition of all 8 model families.
// Phase 3 will formalize this type as a named, versioned profile component.
interface ModelBundle {
  id: string;
  geometry: GeometryModel;
  pathLoss: PathLossModel;
  beamGain: BeamGainModel;
  sinr: SinrModel;
  handover: HandoverModel;
  power: PowerModel | null;    // null when energy model disabled
  ee: EeModel | null;          // null when EE tracking disabled
  policy: PolicyModel;
}
// Note: BeamLayoutModel and SchedulerModel are sub-interfaces within core/beam/
// (not top-level ModelBundle slots). TrafficModel is a generator in core/traffic/.
// See §0B.5 header table for rationale.
```

**Migration note:** Phase 2 will not rewrite engine.ts from scratch. It will:
1. Extract each if/switch dispatch into a concrete model implementation
2. Replace the dispatch with a call through the interface
3. The interface is the stable surface; existing implementations become the default plugin

---

### 0B.6 ProfileConfig → Vocabulary Field Mapping

This is the field-level mapping required by §0A.7 before Phase 1 can start.

**Legend:**
- `S` = Scenario
- `MB` = Model Bundle selection
- `P` = Parameter (value within a model family selection)
- `E` = Experiment
- `PM` = Profile metadata (stays in Profile layer)
- `DEAD` = dead path, remove in Phase 5

| ProfileConfig field | Target layer | Notes |
|---|---|---|
| `id` | PM | stays |
| `family` | PM | stays |
| `version` | PM | stays |
| `orbitMode` | S | moves to ScenarioConfig |
| `tleDataPath` | S | moves to ScenarioConfig (real-trace scenario variant) |
| `tleMaxSatellites` | E | performance limit; experiment-level override |
| `beamSemantics` | MB | model bundle selection (earth-moving vs earth-fixed-bh) |
| `observer` | S | moves to ScenarioConfig |
| `timeControl.epochUtcMs` | S | epoch belongs to scenario |
| `timeControl.durationSec` | E | default in profile, overrideable in experiment bundle |
| `timeControl.stepSec` | E | same as durationSec |
| `seed` | E | experiment-level; profile holds the paper-baseline default |
| `orbital.altitude_km` | P | parameter within constellation geometry |
| `orbital.inclination_deg` | P | |
| `orbital.num_planes` | P | |
| `orbital.sats_per_plane` | P | |
| `orbital.raan_spread_deg` | P | |
| `orbital.phase_offset_deg` | P | |
| `orbital.extra_shells` | S | multi-shell definition; scenario-level |
| `orbital.geoSatellites` | S | GEO topology; scenario-level |
| `orbital.orbitType` | S | regime (leo/meo/geo) |
| `rf.frequency_ghz` | P | |
| `rf.bandwidth_mhz` | P | |
| `rf.eirp_density_dbw_per_mhz` | P (derived) | backwards-compat; isDerived=true |
| `rf.tx_power_per_beam_dbm` | P | spec P1; primary input |
| `rf.max_tx_power_dbm` | P | spec P2; aggregate budget |
| `rf.noise_temperature_k` | P | Internal-only; fixed 290 K |
| `rf.noise_figure_db` | P | |
| `rf.implementation_loss_db` | P | |
| `antenna.model` | MB | beam gain family selection |
| `antenna.peak_gain_dbi` | P | |
| `antenna.beam_diameter_km` | P | |
| `beam.num_beams` | P | |
| `beam.layout` | MB | beam layout model selection |
| `beam.frf` | P | |
| `beam.interference_beams` | P | |
| `beam.bh_max_active_per_slot` | P | BH-specific |
| `beam.bh_frame_duration_sec` | P | |
| `beam.bh_slots_per_frame` | P | |
| `beam.bh_strategy` | MB | scheduler family selection |
| `beam.bh_power_budget_w` | P | |
| `beam.bh_traffic_model` | MB | traffic model selection |
| `beam.bh_traffic_arrival_rate` | P | |
| `channel.tier0_fspl` | MB | always true; not a free parameter |
| `channel.tier1_large_scale` | MB | path loss family tier flag |
| `channel.tier2_clutter` | MB | |
| `channel.tier3_beam_gain` | MB | |
| `channel.tier3_5_scan_loss` | DEAD | remove in Phase 5; not wired |
| `channel.tier4_atmospheric` | MB | |
| `channel.tier5_fading` | MB | |
| `channel.tier6_doppler` | MB | |
| `channel.large_scale_model` | MB | path loss family variant selection |
| `channel.deployment_environment` | P | scenario-adjacent; classify as P with S dependency |
| `channel.los_elevation_deg` | P | |
| `channel.subcarrier_spacing_khz` | P | |
| `handover.type` | MB | handover family selection |
| `handover.trigger_threshold_db` | P | |
| `handover.a3_offset_db` | P | |
| `handover.ttt_ms` | P | |
| `handover.hysteresis_db` | P | |
| `handover.min_elevation_deg` | P | |
| `handover.pingPongWindowSec` | P | |
| `handover.cho_offset_db` | P | |
| `handover.cho_alpha` | P | |
| `handover.cho_filter_k` | P | |
| `handover.daps_preparation_time_sec` | P | |
| `handover.daps_max_dual_active_sec` | P | |
| `handover.mc_max_dual_sec` | P | |
| `handover.mc_packet_duplication` | P | boolean flag |
| `handover.d2_serving_dist_km` | P | |
| `handover.d2_target_dist_km` | P | |
| `handover.sinr_ema_alpha` | P | |
| `handover.rlf_qout_db` | P | |
| `handover.rlf_qin_db` | P | |
| `handover.rlf_n310` | P | |
| `handover.rlf_n311` | P | |
| `handover.rlf_t310_ms` | P | |
| `energy.layer1_enabled` | MB | energy model family selection |
| `energy.layer2_enabled` | MB | |
| `energy.energy_per_handover_j` | P | assumption-backed |
| `energy.layer2_overrides.*` | P | L2 scenario/experiment overrides |
| `ueConfig.count` | S | moves to ScenarioConfig.ueDistribution |
| `ueConfig.distribution` | S | |
| `ueConfig.speed_kmh` | P | scenario-adjacent; classify as P |
| `ueConfig.independentHandover` | MB | handover model behavior flag |
| `sourceMap` | PM (transitional) | replaced by per-ParameterEntry provenance in Phase 1; kept for backwards compat until Phase 3 |

**Count summary:** 9 S fields, 24 MB selection flags, 50 P parameter values, 4 E experiment fields, 3 PM profile metadata fields, 1 DEAD field.

---

### 0B.7 Contract Boundary Decisions

**Resolves:** EI-1 (frozen external contract), UI-5 (useBatchKpi boundary)

#### Runtime Contract (stable external surface — Phase 4 freeze target)

These types already exist and are already consumed by external layers. Phase 4 will version-stamp and declare them frozen:

| Type | Source file | Phase 4 action |
|---|---|---|
| `SimulationSnapshot` | `core/common/types.ts` | freeze as v1 runtime contract |
| `SatelliteState`, `UeState` | `core/common/types.ts` | freeze |
| `SatelliteBeamSnapshot`, `BhSlotSnapshot`, `DapsSnapshot` | `core/common/types.ts` | freeze |
| `HoLogEntry` | `core/common/types.ts` | freeze |
| `KpiBundle` | `core/kpi/types.ts` | freeze; re-export from contract surface |
| `RunManifest` | `core/trace/types.ts` | freeze; re-export from contract surface |
| `PolicyObservation`, `PolicyAction` | `core/policy/types.ts` | freeze (MODQN trainer dependency) |

#### Audit / Artifact (internal to runner, not frozen external)

| Type | Source file | Phase 4 action |
|---|---|---|
| `RunArtifactBundle` | `core/trace/types.ts` | remains internal to runner layer |
| `SourceTrace`, `SourceTraceEntry` | `core/trace/types.ts` | remains internal |
| `AssumptionRecord` | `core/trace/types.ts` | remains internal (validation chain only) |
| `ReplayArtifact`, `ReplayManifest` | `core/trace/types.ts` | remains internal to replay layer |
| `ResolvedConfig` | `core/trace/types.ts` | remains runner-internal |

#### Exposure Contract (new, Phase 4 design)

New types to be defined in Phase 4; backed by Phase 1 parameter registry:

```typescript
/**
 * ParameterView — a flattened, profile-scoped projection of one ParameterEntry
 * for a specific profile.  This is what the UI receives, not the raw ParameterEntry.
 *
 * Design decision: the exposure API does NOT return raw ParameterEntry (which contains
 * bindings for all profiles).  It returns one ParameterView per (parameter × profile)
 * combination, pre-resolved for the requested profileId.
 *
 * Rationale:
 *   - exposureMode is on ProfileParameterBinding, not GlobalParameterSpec; a UI asking
 *     "show me all Realistic parameters for profile X" needs the binding resolved first.
 *   - Returning all bindings would expose other profiles' provenance to the UI — unnecessary.
 *   - A flat projection is simpler to filter and render.
 */
interface ParameterView {
  // from GlobalParameterSpec
  id: string;             // PARAM-* ID
  parameterPath: string;
  semanticName: string;
  unit: string | null;
  allowedRange?: { min: number; max: number };
  presetList?: Array<{ value: string | number; label: string }>;
  isDerived: boolean;
  dependencyRule?: string;
  vocabularyLayer: 'scenario' | 'model-bundle' | 'experiment';
  // from ProfileParameterBinding (resolved for the requested profileId)
  defaultValue: number | string | boolean | null;
  sourceTier: SourceTier;
  sourceId: string;
  sourceNote?: string;
  exposureMode: SpecMode;
}

// Returned by a future getParameterMetadata(profileId, exposureMode?) API
interface ParameterMetadataResponse {
  profileId: string;
  parameters: ParameterView[];   // pre-resolved for profileId; filterable by exposureMode
  version: string;
}

// Returned by a future getProfileList() API
// Replaces ControlPanel.PROFILE_OPTIONS hardcoded array
interface ProfileListEntry {
  id: string;                     // e.g. 'realistic-first-screen'
  label: string;                  // e.g. 'Realistic — Ka 20 GHz, A3 HO'
  family: ProfileFamily;
  tier: SpecMode;                 // Realistic | Advanced | Sensitivity
}
```

#### Orbit Bootstrap Ownership Decision (resolves DL-1)

**Decision:** `src/core/orbit/profile-runtime.ts` is the **single owner** of the orbit bootstrap sequence.

The three callers have these migration states:
- `useSimulation.ts` (lines 77–107): already calls `buildSyntheticOrbitElements` + `buildInteractiveTrajectoryCache` from profile-runtime.ts — **no change needed**
- `useReplay.ts` (lines 78–103): already calls the same helpers — **no change needed**
- `benchmark-runner.ts` (lines 130–175): has its own copy of the Walker + TLE build sequence — **Phase 5 migration target**: replace with calls to `orbit/profile-runtime.ts`

This decision is recorded here so Phase 3 scenario split and Phase 5 cleanup do not re-open it.

#### useBatchKpi Boundary Decision (resolves UI-5)

`app/hooks/useBatchKpi.ts` currently imports `executeBenchmarkRun` directly from `runner/headless/benchmark-runner`. This couples the UI hook to runner internals.

**Decision:** This boundary will be clarified in Phase 4 when the runner exposure API is defined. For now:
- Do not move the import in Phase 1–3 (no behaviour change required yet)
- Phase 4 will define a `RunnerExposureApi` that the hook calls instead of the direct runner import
- This is not a Phase 5 cleanup item; it is a Phase 4 contract design item

---

### 0B.8 What Phase 0B Does NOT Decide

The following are explicitly deferred to later phases:

| Decision | Deferred to | Reason |
|---|---|---|
| JSON schema for ProfileConfig on disk | Phase 3 | Requires scenario/profile/experiment split first |
| Exact `parameter-registry.ts` file format and indexing | Phase 1 | Phase 0B defines the schema; Phase 1 populates it |
| How engine.ts is split into sub-files | Phase 5 | Phase 2 defines the model interfaces; Phase 5 does the structural split |
| MODQN observation/reward schema beyond PolicyObservation | Deferred outlines | Must not start from outline docs alone |
| estnet-ui integration protocol | Phase 4 + deferred | Depends on frozen runtime contract |
| Remote/JSON-file profile loading | Phase 3/4 | Current in-memory DEFAULT_PROFILES is acceptable until Phase 3 split |

---

### 0B.9 Phase 0B Summary and Phase 0C Entry Criteria

**What Phase 0B produced:**
1. ✅ 11 formally defined vocabulary terms (§0B.1)
2. ✅ Target module map with 7 layers and dependency rules (§0B.2, §0B.3)
3. ✅ `ParameterEntry` schema redesigned as `GlobalParameterSpec` + `ProfileParameterBinding` to represent per-profile diversity; PARAM-* namespace rule defined (§0B.4)
4. ✅ 8 model-family interface contracts as TypeScript drafts, aligned with `phase2-model-bundle-sdd.md` authoritative list — GeometryModel, PathLossModel, BeamGainModel, SinrModel, PowerModel, EeModel, HandoverModel, PolicyModel — ready for Phase 2 (§0B.5)
5. ✅ `ProfileConfig` field-level mapping — 91 fields classified into S/MB/P/E/PM/DEAD (§0B.6)
6. ✅ Runtime contract types identified and freeze targets declared (§0B.7)
7. ✅ Orbit bootstrap ownership assigned to `orbit/profile-runtime.ts` (§0B.7)
8. ✅ useBatchKpi boundary deferred to Phase 4 with explicit rationale (§0B.7)

**Phase 0C entry criteria — can start immediately:**

Phase 0C (migration plan + acceptance criteria) must produce:
1. A per-phase migration plan: what code changes in which order, constrained by `validate:stage` staying green throughout
2. Acceptance criteria for each phase (not just exit criteria — specific validation IDs or new VAL-* entries)
3. A dependency graph: which Phase 1 outputs are required before Phase 2 can start; which Phase 3 outputs are required before Phase 4 can start
4. An inventory of existing SDD documents that will become stale after each phase and must be updated in the same change set

**Go/no-go: Phase 0C can begin immediately.**
