# Phase 0 — Architecture Spec

**Status:** Phase 0A complete (rev 3) — inventory, classification, contract map, and entry criteria recorded; Phase 0B (target architecture) pending
**Date (0A):** 2026-03-29
**Date (0A rev 2):** 2026-03-29 — three blind spots patched: provenance surface, de-facto contract map, orbit bootstrap boundary
**Date (0A rev 3):** 2026-03-29 — section numbering normalized; stale inventory notes removed
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
