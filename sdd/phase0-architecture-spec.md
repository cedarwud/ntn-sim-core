# Phase 0 — Architecture Spec

**Status:** Complete — Phase 0A/0B/0C all done; Phase 1 entry criteria satisfied; see §0C.7
**Date (0A):** 2026-03-29
**Date (0A rev 2):** 2026-03-29 — three blind spots patched: provenance surface, de-facto contract map, orbit bootstrap boundary
**Date (0A rev 3):** 2026-03-29 — section numbering normalized; stale inventory notes removed
**Date (0B):** 2026-03-29 — vocabulary, target architecture, ProfileConfig mapping, ParameterEntry schema, model-family interfaces, contract boundaries
**Date (0B rev 1):** 2026-03-29 — three critical findings fixed: C1 ParameterEntry split into GlobalParameterSpec+ProfileParameterBinding; C2 model-family list aligned to 8 families (added GeometryModel, PolicyModel, clarified BeamLayoutModel/SchedulerModel/TrafficModel exclusions); C3 L1 leaf contradiction resolved via shared-primitives exemption, L1/L6 co-location resolved via config/exposure/ subdirectory plan
**Date (0B rev 2):** 2026-03-29 — two medium findings fixed: M1 phase1-parameter-registry-sdd.md Scope updated to GlobalParameterSpec+ProfileParameterBinding two-layer model; M2 ParameterMetadataResponse redesigned as profile-scoped ParameterView projection (exposureMode resolved per-profile before response); Model Bundle vocabulary hardened: 8 top-level families final, BeamLayoutModel/SchedulerModel/TrafficModel exclusion recorded as non-reopenable
**Date (0C):** 2026-03-29 — migration plan, high-risk strategies, VAL-PLAT-001–012, phase dependency graph, SDD staleness inventory, MODQN/UI/estnet gating
**Date (0C rev 1):** 2026-03-29 — two post-0C audit findings fixed: M1 §0B.2 target module map updated to show src/core/models/ as model-interface home (aligns with §0C.1 steps and §0C.3 acceptance criteria); M2 Phase 5 P5-7 and "Phase 5 complete" condition 6 updated to include composeProfile() shim deletion alongside sourceMap removal
**Date (0B/0C patch — 2026-03-29):** Phase 1 audit sync: §0B.6 energy.layer2_overrides.* expanded to 8 specific keys (verified from types.ts:419), P count corrected 50→58; §0B.4 SourceTier short-form examples corrected to hyphenated forms + operative-schema authority note added; §0C.3 VAL-PLAT-003 namespace wording updated to match nested paper-sources.json structure
**Date (0B/0C addendum — 2026-04-11):** `handover.daps_prepare_elevation_deg` promoted into the P-classified handover registry surface; Phase 1 / VAL-PLAT-001 coverage references synchronized 58→59
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
| External consumer integration | Must import internal TS types; no frozen API contract | Blocking for future standalone ESTNET consumer work |
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
│   ├── models/           ← LAYER 2: Model-Family Interfaces (Phase 2 output — new directory)
│   │   │  All 8 top-level model-family interface contracts live here.
│   │   │  Implementations remain in their per-subsystem directories below.
│   │   ├── geometry.ts   (GeometryModel interface + input/result types)
│   │   ├── path-loss.ts  (PathLossModel interface + input/result types)
│   │   ├── beam-gain.ts  (BeamGainModel interface + input types)
│   │   ├── sinr.ts       (SinrModel interface + input types)
│   │   ├── handover.ts   (HandoverModel interface)
│   │   ├── power-ee.ts   (PowerModel + EeModel interfaces)
│   │   ├── policy.ts     (PolicyModel = Policy alias; re-exports from policy/types.ts)
│   │   └── model-bundle.ts (ModelBundle composition type + buildModelBundle factory)
│   │
│   ├── channel/          ← LAYER 2: Model Bundle — path loss + SINR (implementations)
│   │   ├── fspl.ts       (implements PathLossModel tier 0)
│   │   ├── beam-gain.ts  (implements BeamGainModel)
│   │   ├── shadow-fading.ts, small-scale-fading.ts, doppler.ts
│   │   ├── sinr.ts       (SinrModel: aggregates serving + interferers)
│   │   └── link-budget.ts (PathLossModel composition — existing, keep)
│   │
│   ├── beam/             ← LAYER 2: Model Bundle — beam layout + scheduler (implementations)
│   │   ├── layout.ts, selection.ts, active-beam-manager.ts
│   │   ├── scheduler.ts  (SchedulerModel sub-interface implementation)
│   │   └── frequency-reuse.ts
│   │
│   ├── handover/         ← LAYER 2: Model Bundle — handover FSMs (implementations)
│   │   ├── manager.ts, baselines.ts, cho.ts, mc-ho.ts, daps.ts
│   │   ├── ranking.ts, d2-distance.ts
│   │   └── index.ts
│   │
│   ├── energy/           ← LAYER 2: Model Bundle — power + EE (implementations)
│   │   ├── layer1.ts, layer2.ts
│   │   └── index.ts
│   │
│   ├── policy/           ← LAYER 2: Model Bundle — policy/DRL (already correct)
│   │   ├── types.ts      (Policy interface — existing, is the template; re-exported by models/policy.ts)
│   │   ├── plugins/      (greedy-sinr, no-op, invalid-probe)
│   │   └── index.ts
│   │
│   ├── orbit/            ← LAYER 2 (geometry): orbit propagation (GeometryModel implementations)
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

**L1 / L6 directory resolution (updated 2026-03-30 per Phase 4 Group 1 decision):**

The original Phase 0B plan placed L6 (Exposure Contract) at `src/core/config/exposure/`. Phase 4 Group 1 has resolved this ambiguity: L6 lives at `src/core/contracts/` (a new top-level directory alongside `src/core/config/`). This eliminates the co-location ambiguity. L1 remains at `src/core/config/`. Authority: `phase4-runtime-contract-sdd.md §3.1` and `§4`.

| Layer | Directory | Allowed imports | Forbidden imports |
|---|---|---|---|
| Shared Primitives | `src/core/common/types.ts` | none | everything else (no layer imports) |
| L1 Parameter Registry | `src/core/config/` | `core/common/types.ts` (shared primitives only) | L2–L7, profiles/, engine.ts, runner/, viz/, app/ |
| L2 Model Bundle | `src/core/models/` (interface contracts — Phase 2 output) + `src/core/{channel,beam,handover,energy,policy,orbit}/` (implementations) | L1 (parameter IDs), `core/common/types.ts` | engine.ts, profiles/, viz/, app/, runner/ |
| L3 Scenario/Profile/Experiment | `src/core/profiles/` | L1 (parameter IDs), L2 (model family ids by name only) | engine.ts, viz/, app/, runner/ |
| L4 Runtime Core | `src/core/engine.ts`, `core/kpi/` | L1, L2 (via interfaces), L3 (ProfileConfig), `core/common/`, `core/trace/` (write) | React, Three.js, viz/, app/, runner/ |
| L5 Audit/Artifact | `src/core/trace/`, `src/runner/` | L4 output (read-only), L1 | viz/, React, Three.js |
| L6 Exposure Contract | `src/core/contracts/` (Phase 4 output — `runtime-v1.ts`, `kpi-v1.ts`, `policy-v1.ts`, `exposure-v1.ts`) | L1, L3 (id/label/tier only, via `profiles/profile-exposure-catalog.ts`), `core/common/types.ts`, `core/kpi/types.ts`, `core/policy/types.ts` | L4 internals (engine.ts), L2 implementations |
| L7 Viz/UI | `src/viz/`, `src/app/` | L6 (contracts — `runtime-v1`, `kpi-v1`, `policy-v1`, `exposure-v1`), `runner/runner-exposure-api.ts` (hooks only) | L2 implementations, L3 internals (ProfileConfig fields), L4 engine.ts internals, `runner/headless/benchmark-runner` |

**Critical forbidden dependencies (currently violated — Phase 4 / 5 fix targets):**

| Violation | Current file | Fix target |
|---|---|---|
| UI-1: ControlPanel imports `HandoverType` from `@/core/profiles/types` | `viz/overlays/ControlPanel.tsx:9` | Phase 4: get `HandoverType` list from exposure contract |
| UI-3/AC-5: PROFILE_OPTIONS in ControlPanel is the only tier registry | `viz/overlays/ControlPanel.tsx:49` | Phase 4: expose profile list + tier from L6 |
| UI-5: useBatchKpi imports `executeBenchmarkRun` from `runner/headless/benchmark-runner` | `app/hooks/useBatchKpi.ts:12` | Phase 4: define runner/exposure boundary |
| DL-1: benchmark-runner.ts duplicates orbit build from profile-runtime.ts | `runner/headless/benchmark-runner.ts:130` | Phase 5: migrate to `orbit/profile-runtime.ts` |

---

### 0B.4 ParameterEntry Schema

This is the **draft schema** origin for Phase 1. It is not yet code; it was the initial design contract.

**AUTHORITY NOTE:** The operative schema for Phase 1 implementation is `phase1-parameter-registry-sdd.md §3`, not this section. Where §0B.4 and phase1 §3 conflict (e.g. SourceTier vocabulary, sourceId resolution rules, coverage count), `phase1-parameter-registry-sdd.md §3` takes precedence. This section is retained for design rationale only.

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
 *   { profileId: 'family-access-synth',  defaultValue: 2.0,  sourceTier: 'paper-backed',
 *     sourceId: 'PAP-2022-SINR-ELEVATION', exposureMode: 'Realistic' }
 *   { profileId: 'family-mb-hobs-synth', defaultValue: 28.0, sourceTier: 'paper-backed',
 *     sourceId: 'PAP-2024-HOBS',          exposureMode: 'Realistic' }
 *   { profileId: 'family-bh-synth',      defaultValue: 20.0, sourceTier: 'assumption-backed',
 *     sourceId: 'ASSUME-RF-001',          exposureMode: 'Advanced' }
 * NOTE: short forms 'paper' / 'assumption' do NOT exist in the live SourceTier union
 * (src/core/common/types.ts:21). Always use the hyphenated forms above.
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
type PolicyModel = Policy;  // Policy has: readonly name: string, selectAction(), reset()
                             // (NOT id or act() — see src/core/policy/types.ts for canonical definition)

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
| `handover.daps_prepare_elevation_deg` | P | DAPS TTT accelerant threshold; low elevation shortens TTT but does not gate preparation |
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
| `energy.layer2_overrides.batteryCapacityWh` | P | verified from profiles/types.ts:419 |
| `energy.layer2_overrides.initialSoc` | P | |
| `energy.layer2_overrides.solarPowerW` | P | |
| `energy.layer2_overrides.blockingThresholdSoc` | P | |
| `energy.layer2_overrides.orbitalPeriodSec` | P | |
| `energy.layer2_overrides.shadowFraction` | P | |
| `energy.layer2_overrides.altitudeKm` | P | |
| `energy.layer2_overrides.betaAngleDeg` | P | |
| `ueConfig.count` | S | moves to ScenarioConfig.ueDistribution |
| `ueConfig.distribution` | S | |
| `ueConfig.speed_kmh` | P | scenario-adjacent; classify as P |
| `ueConfig.independentHandover` | MB | handover model behavior flag |
| `sourceMap` | PM (transitional) | replaced by per-ParameterEntry provenance in Phase 1; kept for backwards compat until Phase 3 |

**Count summary:** 9 S fields, 24 MB selection flags, 58 P parameter values (updated from original 50: `energy.layer2_overrides.*` wildcard expanded to 8 specific keys per Phase 1 §10 OP-2 verification against `profiles/types.ts:419`), 4 E experiment fields, 3 PM profile metadata fields, 1 DEAD field.

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

---

## Phase 0C — Migration Plan and Acceptance Criteria

**Status:** Complete
**Date:** 2026-03-29

This section records the Phase 0C deliverables:

1. Per-phase migration sequencing with ordered code-change steps
2. Risk-controlled migration strategy for every high-risk file
3. Verifiable completion criteria (acceptance gates) per phase
4. Dependency graph
5. SDD-staleness inventory per phase
6. MODQN / UI / estnet gating rules

---

### 0C.1 Migration Sequencing: Phase 1–5

Each phase entry is structured as: goal → main outputs → ordered code-change steps → what must NOT happen in this phase → entry dependency.

---

#### Phase 1 — Parameter Registry

**Goal:** Replace scattered TSDoc provenance with a machine-readable parameter registry. After Phase 1, every KPI-impacting parameter has a PARAM-* ID, a GlobalParameterSpec, and at least one ProfileParameterBinding.

**Main outputs:**
- `src/core/config/parameter-registry.ts` — `ParameterEntry[]` using the §0B.4 schema
- All `P`-classified fields from §0B.6 mapped to PARAM-* IDs
- `paper-sources.json` augmented where new bindings require new source-registry entries (PAP-* under `papers`, STD-* or non-STD-prefixed standard IDs under `standards`, ASSUME-* under `assumptions`)
- `scripts/validate-parameter-registry.mjs` — new validation script

**Ordered code-change steps:**

| Step | File | Change | validate:stage stays green? |
|---|---|---|---|
| P1-1 | `src/core/config/parameter-registry.ts` (new) | Create empty registry file; export `ParameterEntry[]` as empty array | ✅ no existing code changes |
| P1-2 | `src/core/config/parameter-registry.ts` | Populate P-classified orbit parameters (§0B.6: orbital.*) from `defaults.ts` sourceMap entries | ✅ registry is additive |
| P1-3 | `src/core/config/parameter-registry.ts` | Populate rf.*, antenna.*, beam.* P-classified parameters | ✅ |
| P1-4 | `src/core/config/parameter-registry.ts` | Populate channel.*, handover.*, energy.*, ueConfig.* P-classified parameters | ✅ |
| P1-5 | `paper-sources.json` | Add missing source-registry entries required by new ProfileParameterBindings; add to the correct nested section (`papers`/`standards`/`assumptions`) | ✅ additive |
| P1-6 | `scripts/validate-parameter-registry.mjs` (new) | Script: assert registry non-empty; all bindings have sourceId in paper-sources.json; no PARAM-* ID collision | ✅ new script |
| P1-7 | `package.json` | Add `validate:registry` to `validate:stage` chain | ✅ |

**What must NOT happen in Phase 1:**
- Do not modify `ProfileConfig` (types.ts) — that is Phase 3
- Do not modify `defaults.ts` (adding/removing profile fields) — read-only in Phase 1
- Do not wire the registry into `engine.ts` — that is Phase 2/3
- Do not add UI for parameter display — that is Phase 4

**Entry dependency:** Phase 0B complete (§0B.4 schema, §0B.6 field mapping).

---

#### Phase 2 — Model Bundle Interfaces

**Goal:** Replace the model-selection if/switch chains in `engine.ts` with calls through typed model-family interfaces (§0B.5). After Phase 2, all 8 model-family selections (geometry, pathLoss, beamGain, sinr, handover, power, ee, policy) are dispatched via interfaces in `src/core/models/`; existing implementations remain in their per-subsystem directories (`channel/`, `beam/`, `handover/`, `energy/`, `orbit/`, `policy/`).

**Main outputs:**
- `src/core/models/` (new directory) — 8 interface files (one per family) + `model-bundle.ts`; implementations stay in subsystem dirs
- `engine.ts` — dispatch replaced by interface calls (file NOT yet split)
- `ModelBundle` type and `buildModelBundle` factory in `src/core/models/model-bundle.ts`

**Ordered code-change steps (one family at a time, validate:stage green after each):**

| Step | Files | Change |
|---|---|---|
| P2-1 | `src/core/models/path-loss.ts` (new) | Extract `PathLossModel` interface + wrap existing tier-flag logic as `ThreegppBaselinePathLoss: PathLossModel` |
| P2-2 | `engine.ts` | Replace path-loss tier-flag chain with `pathLossModel.compute(...)` call |
| P2-3 | `src/core/models/beam-gain.ts` (new) | Extract `BeamGainModel` interface + wrap existing model-string switch as concrete impl |
| P2-4 | `engine.ts` | Replace beam-gain model-string switch with `beamGainModel.computeGainDb(...)` |
| P2-5 | `src/core/models/sinr.ts` (new) | Extract `SinrModel` interface + wrap Phase2/Phase3 path as concrete impls |
| P2-6 | `engine.ts` | Replace Phase2/Phase3 branch with `sinrModel.computeDb(...)` |
| P2-7 | `src/core/models/handover.ts` (new) | Extract `HandoverModel` interface; existing `HandoverManager` factory becomes default impl |
| P2-8 | `engine.ts` | Replace handover FSM construction with `handoverModel.createManager(...)` |
| P2-9 | `src/core/models/power-ee.ts` (new) | Extract `PowerModel` + `EeModel` interfaces + wrap existing L1/L2 logic |
| P2-10 | `engine.ts` | Replace energy computation with interface calls |
| P2-11 | `src/core/models/geometry.ts` (new) | Extract `GeometryModel` interface; wrap Walker/SGP4 orbit calls |
| P2-12 | `engine.ts` | Replace orbit propagation calls with `geometryModel.compute(...)` |
| P2-13 | `src/core/models/model-bundle.ts` (new) | Define `ModelBundle` type; add factory `buildModelBundle(profile: ProfileConfig): ModelBundle`; add `src/core/models/policy.ts` re-export of `Policy` as `PolicyModel` alias |
| P2-14 | `scripts/validate-model-bundle.mjs` (new) | Assert: engine only references model families via interfaces; no raw tier-flag branches remain |

**What must NOT happen in Phase 2:**
- Do not split `engine.ts` into sub-files — that is Phase 5
- Do not change `ProfileConfig` fields — they remain the bundle selection source until Phase 3
- Do not move existing implementations out of their current directories (keep `channel/`, `handover/`, etc.) — only add wrapper/interface layer
- Do not implement new model variants — only wrap existing implementations

**Entry dependency:** Phase 1 complete (PARAM-* IDs exist; model families reference parameters by ID in their factory functions).

---

#### Phase 3 — Scenario / Profile / Experiment Split

**Goal:** Decompose `ProfileConfig` into the three distinct vocabulary types (ScenarioConfig, ModelBundleSelection, ExperimentBundle) per §0B.1 + §0B.6 classification. After Phase 3, a new paper baseline can be added by composing typed objects, not inflating one monolithic profile.

**Main outputs:**
- `src/core/profiles/types.ts` — `ProfileConfig` decomposed into `ScenarioConfig + ModelBundleSelection + ExperimentBundle + ProfileMetadata`
- `src/core/profiles/defaults.ts` — each profile rewritten using composed types; split into per-family files
- `src/core/profiles/scenario-defaults.ts`, `experiment-defaults.ts` (new)
- `src/core/profiles/profile-composer.ts` (new) — `composeProfile(scene, bundle, exp): ProfileConfig` for backwards compat

**Ordered code-change steps:**

| Step | Files | Change |
|---|---|---|
| P3-1 | `src/core/profiles/types.ts` | Add new types: `ScenarioConfig`, `ModelBundleSelection`, `ExperimentBundle`, `ProfileMetadata`. Keep `ProfileConfig` as an alias/union for backwards compat |
| P3-2 | `src/core/profiles/profile-composer.ts` (new) | `composeProfile(scene, bundle, exp, meta): ProfileConfig` — compatibility shim so engine + runner need zero changes in this step |
| P3-3 | `src/core/profiles/defaults.ts` | Rewrite each of 14 profiles using `composeProfile(...)` calls internally; no runtime change |
| P3-4 | `src/core/profiles/defaults.ts` → split | Move per-family profile defaults to `scenario-defaults.ts`, `experiment-defaults.ts`; `defaults.ts` becomes re-export index |
| P3-5 | `src/core/profiles/types.ts` | After all callers updated: remove `ProfileConfig` monolith; callers now use composed types |
| P3-6 | `engine.ts` | Update to accept `ProfileConfig` composed type (transparent — `composeProfile` ensures backwards compat) |
| P3-7 | `src/core/profiles/types.ts` | Remove `tier3_5_scan_loss` dead field (DEAD classification, ST-1) |
| P3-8 | `scripts/validate-profiles.mjs` | Add check: no profile object has fields from more than one vocabulary layer without going through `composeProfile` |

**What must NOT happen in Phase 3:**
- Do not change model-family implementations — Phase 2 is responsible
- Do not freeze runtime contract types yet — that is Phase 4
- Do not migrate `benchmark-runner.ts` orbit bootstrap — that is Phase 5

**DECISION POINT (must resolve before P3-5):** Should `ProfileConfig` remain a flat merged type as a compatibility alias, or should the engine be refactored in Phase 3 to accept `(ScenarioConfig, ModelBundleSelection, ExperimentBundle)` as separate arguments? This choice affects the Phase 4 contract surface. **Recommendation:** keep flat `ProfileConfig` as composed alias through Phase 3; engine signature change is Phase 4.

**Entry dependency:** Phase 2 complete (ModelBundle type exists; engine calls via interfaces).

---

#### Phase 4 — Runtime Contract

**Goal:** Declare stable, versioned input/output contracts for all external consumers (viz, headless runner, MODQN trainer, estnet-ui). After Phase 4, external consumers do not need to know internal file layout or `ProfileConfig` internals.

**Main outputs:**
- `src/core/contracts/` (new directory) — version-stamped runtime contract re-exports
- `src/core/contracts/runtime-v1.ts` — `SimulationSnapshot`, `SatelliteState`, `UeState`, `BhSlotSnapshot`, `DapsSnapshot`, `HoLogEntry` frozen as v1
- `src/core/contracts/kpi-v1.ts` — `KpiBundle` frozen
- `src/core/contracts/policy-v1.ts` — `PolicyObservation`, `PolicyAction` frozen (MODQN dependency)
- `src/core/contracts/exposure-v1.ts` — `ParameterView`, `ParameterMetadataResponse`, `ProfileListEntry` (new, §0B.7)
- `src/runner/runner-exposure-api.ts` (new) — `RunnerExposureApi` interface; `useBatchKpi` migrated to call this instead of direct runner import

**Ordered code-change steps:**

| Step | Files | Change |
|---|---|---|
| P4-1 | `src/core/contracts/` (new) | Create directory with `index.ts` |
| P4-2 | `src/core/contracts/runtime-v1.ts` | Re-export frozen types from `common/types.ts`; add `@version v1` and `@frozen` annotations |
| P4-3 | `src/core/contracts/kpi-v1.ts`, `policy-v1.ts` | Same for KpiBundle, PolicyObservation/Action |
| P4-4 | `src/core/contracts/exposure-v1.ts` | Implement `ParameterView`, `ParameterMetadataResponse`, `ProfileListEntry` backed by Phase 1 registry |
| P4-5 | `src/runner/runner-exposure-api.ts` (new) | Define `RunnerExposureApi`; implement default adapter wrapping `executeBenchmarkRun` |
| P4-6 | `src/app/hooks/useBatchKpi.ts` | Replace direct `benchmark-runner` import with `RunnerExposureApi` call |
| P4-7 | `src/viz/overlays/ControlPanel.tsx` | Replace `PROFILE_OPTIONS` hardcoded array with call to `getProfileList()` from exposure API; remove `HandoverType` direct import (UI-1, UI-3 fixes) |
| P4-8 | `scripts/validate-contracts.mjs` (new) | Assert: no file outside `src/core/contracts/` directly imports internal `common/types.ts` runtime types from viz or runner layers |

**What must NOT happen in Phase 4:**
- Do not split `engine.ts` or `defaults.ts` structurally — Phase 5
- Do not implement MODQN training loop — downstream gating
- Do not delete legacy `sourceMap` field from `ProfileConfig` — that can only be removed after Phase 3 is complete and registry is the authority

**Entry dependency:** Phase 3 complete (ProfileConfig decomposed; ScenarioConfig/ExperimentBundle types stable).

---

#### Phase 5 — Cleanup and Modularization

**Goal:** Remove all structural debt that Phases 1–4 intentionally left in place. After Phase 5, no oversized mixed-responsibility files remain and downstream programs (MODQN, estnet-ui) can start without editing monolithic files.

**Main outputs:**
- `engine.ts` split into focused sub-modules under `src/core/engine/`
- `defaults.ts` fully replaced by per-family files (completing Phase 3 split)
- `benchmark-runner.ts` orbit bootstrap migrated to `orbit/profile-runtime.ts` (DL-1)
- Dead code removed: `tier3_5_scan_loss`, any stale `Phase2`/`Phase3` SINR path labels
- Naming collision resolved: `viz/beam/beam-selection.ts` → `viz/beam/beam-visibility-selection.ts`
- Sync XHR in `useSimulation.ts` replaced with async (UI-4)

**Ordered code-change steps:**

| Step | Files | Change |
|---|---|---|
| P5-1 | `src/core/engine/` (new directory) | Create sub-modules: `tick.ts`, `orbit-step.ts`, `channel-step.ts`, `handover-step.ts`, `kpi-step.ts`, `scheduler-step.ts` |
| P5-2 | `src/core/engine.ts` | Extract each tick-phase into its sub-module; `engine.ts` becomes a thin orchestrator |
| P5-3 | `src/core/profiles/` | Delete `tier3_5_scan_loss` field (ST-1); remove Phase2/Phase3 label dead branches if any remain |
| P5-4 | `src/runner/headless/benchmark-runner.ts` | Replace lines 130–175 (own Walker/TLE orbit build) with calls to `orbit/profile-runtime.ts` |
| P5-5 | `src/app/hooks/useSimulation.ts` | Replace sync XHR (line 87) with async fetch |
| P5-6 | `src/viz/beam/beam-selection.ts` | Rename to `beam-visibility-selection.ts` to resolve naming collision with `core/beam/selection.ts` while keeping the file's display-only responsibility explicit |
| P5-7 | `src/core/profiles/` | Remove `sourceMap` field from `ProfileConfig` (now redundant with Phase 1 registry); delete `composeProfile()` shim from `profile-composer.ts` (shim was introduced in Phase 3 P3-2, kept through Phase 4 as compatibility layer — now safe to remove since contracts are frozen and engine accepts composed types) |
| P5-8 | `scripts/validate-structure.mjs` | Add check: no file in `src/core/` exceeds 650 lines |

**What must NOT happen in Phase 5:**
- Do not add new model variants or algorithm features — Phase 5 is structural cleanup only
- Do not change external contract types (frozen in Phase 4)
- Do not start MODQN or estnet-ui integration — gating is defined in §0C.5

**Entry dependency:** Phase 4 complete (contracts frozen; no caller depends on engine.ts internal layout).

---

### 0C.2 High-Risk Area Migration Strategy

For each high-risk area identified in Phase 0A, the staged migration strategy and legacy-path deletion timing are recorded here.

---

#### engine.ts (1547 lines — OS-1, AC-3, AC-4, DL-2, DL-3)

| Concern | Strategy | Legacy-path deletion |
|---|---|---|
| Phase2/Phase3 SINR coexistence | Phase 2 Step P2-5/P2-6: both wrapped as `SinrModel` impls; the `sinrVersion` branch is replaced by `sinrModel.computeDb()` dispatch | After P2-6 is complete and `validate:stage` passes, the raw branch is dead; delete in Phase 5 P5-3 |
| Phase A / Phase B HO coexistence | Phase 2 Step P2-7/P2-8: both wrapped as `HandoverModel` impls | Same as above — delete branch in Phase 5 P5-3 |
| BH scheduler lazy init embedded in tick | Phase 2 P2-12/P2-13: `ModelBundle` factory builds scheduler; engine receives it at construction, not at tick | Delete lazy init in Phase 5 P5-2 |
| Structural size (1547 lines) | Phase 5 P5-1/P5-2: split into sub-modules | **NOT touched before Phase 5** — Phases 1–4 only call through new interfaces, never split the file |
| Utility functions at top of engine.ts | Phase 2: move to `models/` or `common/` as part of interface extraction | Delete originals after P2-* steps confirm no other importers |

**Critical rule:** Do not attempt to split `engine.ts` in Phase 2 or 3. The interface extraction (Phase 2) and the structural split (Phase 5) must be separate operations. Doing both simultaneously is the single highest-risk failure mode.

---

#### profiles/types.ts (491 lines — AC-1)

| Concern | Strategy | Legacy-path deletion |
|---|---|---|
| Monolithic `ProfileConfig` | Phase 3 P3-1: add new types alongside; P3-2: add `composeProfile` shim. `ProfileConfig` stays as composed alias. | Remove monolith in Phase 3 P3-5 after all callers verified |
| `tier3_5_scan_loss` dead field | Classified DEAD in §0B.6 | Delete in Phase 3 P3-7 (part of the vocabulary split) |
| Types imported by viz layer (UI-1) | Phase 4 P4-2: viz layer migrates to contract types; direct imports die | After P4-7: viz no longer imports from `profiles/types.ts` |

**Compatibility shim lifetime:** `composeProfile()` shim exists from Phase 3 P3-2 through end of Phase 4. It is deleted in Phase 5 P5-7 after `sourceMap` removal and contract freeze.

---

#### profiles/defaults.ts (1320 lines — OS-2)

| Concern | Strategy | Legacy-path deletion |
|---|---|---|
| 14 profiles in one file | Phase 3 P3-4: split to per-family files; `defaults.ts` becomes re-export index | Re-export index stays through Phase 5; the split sub-files are the truth after Phase 3 |
| `sourceMap[]` annotations | Phase 1: read as data-collection input for `ProfileParameterBinding` population | Remove from `defaults.ts` in Phase 5 P5-7 after registry is the authority |
| Reproduction profiles (sinr-elevation, hobs, timer-cho) | These are valid baseline profiles; keep them in Phase 3 split; do not delete | No deletion |

---

#### Orbit Bootstrap Chain (DL-1)

| Caller | Current state | Migration |
|---|---|---|
| `useSimulation.ts` | Already uses `orbit/profile-runtime.ts` | No change in any phase |
| `useReplay.ts` | Already uses `orbit/profile-runtime.ts` | No change in any phase |
| `benchmark-runner.ts` lines 130–175 | Owns its own Walker+TLE build sequence | Phase 5 P5-4: replace with `orbit/profile-runtime.ts` calls |

**Rule:** Do not touch `benchmark-runner.ts` orbit build in Phases 1–4. The duplicate code is safe as long as it produces identical results. Phase 5 removes the duplication.

---

#### UI Exposure Metadata (UI-3, AC-5)

| Concern | Strategy |
|---|---|
| `ControlPanel.PROFILE_OPTIONS` hardcoded (374 lines) | Phase 4 P4-7: replaced by `getProfileList()` from exposure API |
| `HandoverType` imported from `core/profiles/types` in `ControlPanel.tsx` | Phase 4 P4-7: replaced by contract-layer type or enum |
| `useBatchKpi` direct runner import (UI-5) | Phase 4 P4-5/P4-6: `RunnerExposureApi` shim introduced |

**Rule:** Do not attempt to fix UI exposure imports in Phases 1–3. Those phases touch core types; any concurrent UI refactor increases conflict surface.

---

#### Runner / Replay / Artifact Types (EI-1)

| Type group | Phase 4 action | After freeze |
|---|---|---|
| `SimulationSnapshot`, `SatelliteState`, `UeState`, etc. | Frozen in `contracts/runtime-v1.ts` | No changes without version bump |
| `RunArtifactBundle`, `SourceTrace`, `AssumptionRecord` | Remain internal to runner layer; not frozen | May evolve in Phase 5 cleanup |
| `ReplayArtifact`, `ReplayManifest` | Internal to replay layer; not frozen | Same as above |
| `ResolvedConfig` | Runner-internal | Same |

---

### 0C.3 Acceptance Criteria and Completion Definitions

#### New VAL-PLAT-* Validation IDs

These IDs are defined here and must be added to `ntn-sim-core-validation-matrix.md` §2 in the same change set that implements each phase.

| ID | Category | Check | Phase | Script |
|---|---|---|---|---|
| `VAL-PLAT-001` | parameter registry | `ParameterEntry[]` is non-empty, all `P`-classified fields from §0B.6 have at least one binding, and every profile-specific binding matches the runtime value at its `parameterPath` | 1 | `validate-parameter-registry.mjs` |
| `VAL-PLAT-002` | parameter registry | every `ProfileParameterBinding.sourceId` resolves in `paper-sources.json` | 1 | `validate-parameter-registry.mjs` |
| `VAL-PLAT-003` | parameter registry | no PARAM-* ID duplicates; no overlap with source-registry namespaces (checked against combined keys from `papers`+`standards`+`assumptions` sections of paper-sources.json, not top-level JSON keys) | 1 | `validate-parameter-registry.mjs` |
| `VAL-PLAT-004` | model bundle | engine.ts contains no raw tier-flag if/else chains for path loss, beam gain, or SINR after model-family extraction | 2 | `validate-model-bundle.mjs` |
| `VAL-PLAT-004b` | model bundle | `src/core/models/` contains all 8 required interface files: `geometry.ts`, `path-loss.ts`, `beam-gain.ts`, `sinr.ts`, `handover.ts`, `power-ee.ts`, `policy.ts`, `model-bundle.ts`; `ModelBundle` type is in `src/core/models/model-bundle.ts` (not `src/core/config/`) | 2 | `validate-model-bundle.mjs` |
| `VAL-PLAT-005` | model bundle | `ModelBundle` factory produces a non-null bundle for all 14 current profiles | 2 | `validate-model-bundle.mjs` |
| `VAL-PLAT-006` | scenario split | `ScenarioConfig`, `ModelBundleSelection`, and `ExperimentBundle` types exist and are distinct; no circular type imports between them | 3 | `validate-profiles.mjs` (augmented) |
| `VAL-PLAT-007` | scenario split | all 14 profiles pass authoring parity: `materializeRuntimeProfile(entry.bundle, entry.exp)` equals the flat runtime `ProfileConfig` | 3 | `validate-profiles.mjs` (augmented) |
| `VAL-PLAT-008` | runtime contract | `src/core/contracts/runtime-v1.ts` exports `SimulationSnapshot`, `SatelliteState`, `UeState`, `BhSlotSnapshot`, `DapsSnapshot`, `HoLogEntry`; annotated `@frozen` | 4 | `validate-contracts.mjs` |
| `VAL-PLAT-009` | runtime contract | no viz-layer file imports directly from `core/common/types.ts` or `core/profiles/types.ts` (must go through `core/contracts/`) | 4 | `validate-contracts.mjs` |
| `VAL-PLAT-010` | exposure contract | `getProfileList()` returns entries for all 14 profiles with valid `family` and `tier` fields | 4 | `validate-contracts.mjs` |
| `VAL-PLAT-011` | cleanup | no file in `src/core/` exceeds 650 lines | 5 | `validate-structure.mjs` (augmented) |
| `VAL-PLAT-012` | cleanup | `engine.ts` is replaced by a thin orchestrator importing from `engine/` sub-modules; no direct physics formula calls remain in root orchestrator | 5 | `validate-structure.mjs` (augmented) |

---

#### "Phase N Complete" Definitions

**"Phase 1 complete"** means ALL of the following:
1. `src/core/config/parameter-registry.ts` exists and exports non-empty `ParameterEntry[]` (two-layer wrapper: `GlobalParameterSpec` + `ProfileParameterBinding[]`)
2. VAL-PLAT-001, VAL-PLAT-002, VAL-PLAT-003 pass
3. All existing VAL-* checks from prior phases still pass (`npm run validate:stage`)
4. `ntn-sim-core-implementation-status.md` §1 Platform Refactor Phase 1 row = ✅ complete
5. `sdd/phase1-parameter-registry-sdd.md` status header updated to "Complete"

**"Phase 2 complete"** means ALL of the following:
1. `src/core/models/` directory exists with all 8 interface files: `path-loss.ts`, `beam-gain.ts`, `sinr.ts`, `handover.ts`, `power-ee.ts`, `geometry.ts`, `policy.ts`, and `model-bundle.ts`
2. `src/core/models/model-bundle.ts` (NOT `src/core/config/`) contains `ModelBundle` type and `buildModelBundle(profile)` factory
3. VAL-PLAT-004, VAL-PLAT-004b, VAL-PLAT-005 pass
4. All pre-existing VAL-* checks still pass (`npm run validate:stage`) — in particular VAL-GOLDEN-001, VAL-GOLDEN-002, all E-level golden cases
5. `engine.ts` still exists as a single file (split is NOT part of Phase 2 completion)
6. `sdd/phase2-model-bundle-sdd.md` status header updated to "Complete"

**"Phase 3 complete"** means ALL of the following:
1. `ProfileConfig` is composed from `ScenarioConfig + ModelBundleSelection + ExperimentBundle + ProfileMetadata` (flat alias is acceptable)
2. `src/core/profiles/defaults.ts` is a re-export index; individual profiles live in per-family files
3. `tier3_5_scan_loss` field is deleted from `ProfileConfig`
4. VAL-PLAT-006, VAL-PLAT-007 pass
5. All pre-existing VAL-* checks still pass
6. `sdd/phase3-scenario-profile-experiment-split.md` status header updated to "Complete"

**"Phase 4 complete"** means ALL of the following:
1. `src/core/contracts/` directory exists with `runtime-v1.ts`, `kpi-v1.ts`, `policy-v1.ts`, `exposure-v1.ts`
2. `RunnerExposureApi` exists; `useBatchKpi.ts` no longer imports directly from `runner/headless/benchmark-runner`
3. `ControlPanel.tsx` no longer imports `HandoverType` from `core/profiles/types` and no longer uses hardcoded `PROFILE_OPTIONS`
4. VAL-PLAT-008, VAL-PLAT-009, VAL-PLAT-010 pass
5. All pre-existing VAL-* checks still pass
6. `sdd/phase4-runtime-contract-sdd.md` status header updated to "Complete"

**"Phase 5 complete"** means ALL of the following:
1. `src/core/engine.ts` is a thin orchestrator (≤200 lines); physics steps in `src/core/engine/` sub-modules
2. No file in `src/core/` exceeds 650 lines
3. `benchmark-runner.ts` orbit bootstrap calls `orbit/profile-runtime.ts` (lines 130–175 eliminated)
4. Sync XHR in `useSimulation.ts` eliminated
5. `viz/beam/beam-selection.ts` renamed to `viz/beam/beam-visibility-selection.ts`
6. `ProfileConfig.sourceMap[]` field removed; `composeProfile()` shim deleted from `profile-composer.ts`
7. VAL-PLAT-011, VAL-PLAT-012 pass
8. All pre-existing VAL-* checks still pass
9. `sdd/phase5-cleanup-and-modularization-sdd.md` status header updated to "Complete"

**"Platform Refactor Complete"** means:
1. All five "Phase N complete" conditions above are satisfied
2. `npm run validate:stage` passes cleanly with all new VAL-PLAT-* IDs in the enforced set
3. `sdd/ntn-sim-core-platform-refactor-roadmap.md` §4 Exit Condition verified against repo state
4. `sdd/ntn-sim-core-implementation-status.md` Platform Refactor section = ✅ all phases complete
5. `docs/architecture/ntn-sim-core-architecture-blueprint.md` §12 milestones reflect final state

---

### 0C.4 Phase Dependency Graph

```
Phase 0 (Architecture Audit + Target Design)
    └─ Phase 1 (Parameter Registry)
           └─ Phase 2 (Model Bundle Interfaces)
                  └─ Phase 3 (Scenario/Profile/Experiment Split)
                         └─ Phase 4 (Runtime Contract Freeze)
                                └─ Phase 5 (Cleanup + Modularization)
```

**Specific Phase 1 → Phase 2 required outputs:**
- PARAM-* IDs must exist before `ModelBundle` factory can reference them for parameter lookup
- `validate:registry` must pass before Phase 2 opens, to confirm no ID gaps

**Specific Phase 2 → Phase 3 required outputs:**
- `ModelBundleSelection` fields in §0B.6 must be resolvable as `ModelBundle` fields; this requires Phase 2 `ModelBundle` type to exist
- Phase 3 `composeProfile()` calls `buildModelBundle()`; factory must exist first

**Specific Phase 3 → Phase 4 required outputs:**
- `ProfileConfig` must be stable and composed before the exposure contract types (`ParameterView`, `ProfileListEntry`) can be implemented — they reference the composed type structure
- The DECISION POINT from Phase 3 (§0C.1, P3 section) must be resolved before Phase 4 begins

**Specific Phase 4 → Phase 5 required outputs:**
- Contract types must be frozen before `engine.ts` can be split (splitting changes import paths; frozen contracts prevent breakage)
- `RunnerExposureApi` must exist before `benchmark-runner.ts` is touched in Phase 5

**Phases that can run concurrently:**
- None. The dependency chain is fully linear. However, **within a phase**, individual steps are ordered but isolated enough that separate branches can be opened and reviewed independently.

---

### 0C.5 SDD Staleness Inventory

For each phase, the SDD documents that will become stale and must be updated **in the same change set** as the phase completion.

| Phase completion | Documents that must be updated |
|---|---|
| Phase 1 complete | `sdd/phase1-parameter-registry-sdd.md` (status → Complete); `sdd/ntn-sim-core-implementation-status.md` (Platform Refactor table); `sdd/ntn-sim-core-validation-matrix.md` (add VAL-PLAT-001/002/003) |
| Phase 2 complete | `sdd/phase2-model-bundle-sdd.md` (status → Complete); `sdd/ntn-sim-core-implementation-status.md`; `sdd/ntn-sim-core-validation-matrix.md` (add VAL-PLAT-004/004b/005) |
| Phase 3 complete | `sdd/phase3-scenario-profile-experiment-split.md` (status → Complete); `sdd/ntn-sim-core-implementation-status.md`; `sdd/ntn-sim-core-validation-matrix.md` (add VAL-PLAT-006/007); `sdd/ntn-sim-core-profile-baselines.md` (if profile composition changes any baseline fields); `sdd/ntn-sim-core-development-constraints.md` (if ProfileConfig constraints are restated) |
| Phase 4 complete | `sdd/phase4-runtime-contract-sdd.md` (status → Complete); `sdd/ntn-sim-core-implementation-status.md`; `sdd/ntn-sim-core-validation-matrix.md` (add VAL-PLAT-008/009/010); `sdd/ntn-sim-core-ui-exposure-spec.md` (exposure contract types finalized); `agent-governance.md` (if contract surface changes authority order) |
| Phase 5 complete | `sdd/phase5-cleanup-and-modularization-sdd.md` (status → Complete); `sdd/ntn-sim-core-implementation-status.md`; `sdd/ntn-sim-core-validation-matrix.md` (add VAL-PLAT-011/012); `docs/architecture/ntn-sim-core-architecture-blueprint.md` (§7 directory layout finalized); `README.md` (entry-point guidance updated if directory layout changes) |
| Platform Refactor complete | `sdd/ntn-sim-core-platform-refactor-roadmap.md` (exit condition verified); `docs/architecture/ntn-sim-core-architecture-blueprint.md` (§12 milestone table updated) |

---

### 0C.6 MODQN / UI / estnet Gating

These downstream programs are explicitly blocked until specified phases complete.

#### MODQN

| Gate condition | Required phase | What unlocks |
|---|---|---|
| MODQN policy interface is stable | Phase 2 complete | `PolicyModel` (= existing `Policy`) is wrapped; `PolicyObservation`/`PolicyAction` exist at model layer |
| MODQN can be a first-class plugin | Phase 2 complete | It can be registered as a `PolicyModel` impl in `ModelBundle` |
| MODQN observation/reward schema can be extended | Phase 4 complete | `policy-v1.ts` is frozen; MODQN-specific extensions go in a `policy-v2.ts` or `modqn-contracts.ts` without reopening v1 |
| MODQN training loop can start implementation | Phase 4 complete | Runtime contract frozen; MODQN trainer can import from `core/contracts/` without depending on internal file layout |
| MODQN becomes active development (outline → active SDD) | **Phase 5 complete** | Only after structural debt removed; no monolithic files that MODQN would have to navigate; full gating per `agent-governance.md §3` |

**Rationale:** Starting MODQN implementation during Phases 1–4 would create coupling between the training loop and unstable internal file layouts, forcing re-work when Phase 5 splits `engine.ts`. The cost of waiting is low; the cost of premature coupling is high.

#### UI / Frontend Extensions

| Gate condition | Required phase | What unlocks |
|---|---|---|
| Parameter display UI can be prototyped | Phase 1 complete | Parameter registry exists; `ParameterView` shape is known |
| Profile list can be driven by API | Phase 4 complete | `getProfileList()` exists |
| Full parameter metadata UI (sliders, ranges, provenance) | Phase 4 complete | `ParameterMetadataResponse` exposure contract frozen |
| `ControlPanel.tsx` hardcoded arrays can be removed | Phase 4 complete (P4-7) | Already gated in Phase 4 plan |
| New major UI features or additional overlay types | Phase 5 complete | `engine.ts` is no longer monolithic; safe to extend |

#### estnet-ui / External Consumers

| Gate condition | Required phase | What unlocks |
|---|---|---|
| standalone ESTNET consumer can depend on snapshot types | Phase 4 complete | `runtime-v1.ts` frozen; import path is stable |
| standalone ESTNET consumer can consume parameter metadata | Phase 4 complete | Exposure contract types stable |
| standalone ESTNET consumer full integration protocol can be defined | Phase 5 complete | No internal churn remaining; integration scope is clean |
| external ESTNET consumer outline → active SDD | **Phase 5 complete** | Per `agent-governance.md §3.3` |

---

### 0C.7 Phase 0 Completion Declaration

**Phase 0 (all three sub-phases) is complete when:**
1. §0A, §0B, and §0C are all written in this document ✅
2. `sdd/ntn-sim-core-implementation-status.md` reflects Platform Refactor Phase 0 = complete ✅ (version 4.0.6)
3. `docs/architecture/ntn-sim-core-architecture-blueprint.md` updated to version 0.2.0 with 7-layer diagram ✅
4. Phase 1 entry criteria from §0A.7 are satisfied ✅

**Go/no-go: Phase 1 can begin immediately.**

Phase 1 entry criteria (from §0A.7, confirmed satisfied):
- ✅ §0B.6 field mapping complete — 91 fields classified
- ✅ `paper-sources.json` confirmed to exist with PAP-*/STD-*/ASSUME-* registry
- ✅ `ParameterEntry` schema defined (§0B.4)
- ✅ PARAM-* namespace rule defined (distinct from PAP-*/STD-*/ASSUME-* namespaces)
- ✅ All existing `validate:stage` checks passing (no regressions introduced by Phase 0)
