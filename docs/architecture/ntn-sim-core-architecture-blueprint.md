# NTN Sim Core — Architecture Blueprint

**Version:** 0.2.2
**Date:** 2026-03-31
**Status:** Updated — Platform Refactor is complete through Phase 5 Group 3. The planned `src/core/engine/`, `src/core/profiles/`, `src/core/config/`, and runner ownership split surfaces are landed; browser sync bootstrap debt and Phase 3 compatibility shims are retired; downstream MODQN / UI / estnet work may now start from their own preflight-reviewed programs rather than from platform-cleanup prompts. See `sdd/phase0-architecture-spec.md §0B.2–0B.3` for the normative target module map and dependency rules.

---

## 1. Purpose

`ntn-sim-core` is intended to become a research-grade NTN/LEO simulator that satisfies two hard requirements at the same time:

1. academically valid, traceable, reproducible simulation results suitable for paper figures and algorithm evaluation;
2. controllable, explainable, high-readability visualization for satellite motion, multi-beam behavior, and handover events.

This project is not a straight rename of `omni-scope`, and it is not a simplified clone of `beamHO-bench`.

---

## 2. Why a New Project Exists

The new project exists because the target platform must combine:

1. the research discipline and validation mindset of `beamHO-bench`;
2. the clean browser-side simulation structure and multi-beam orientation of `leo-beam-sim`;
3. the replay and interpolation ideas from `leo-simulator`;
4. the offline precompute mindset from `orbit-engine`;
5. a cleaner long-term architecture than any single existing repo currently provides.

The new project therefore uses existing repos as references and donors, but not as the sole product identity.

---

## 3. Source Project Contribution Map

| Source | Keep / Learn | Main Role in `ntn-sim-core` |
|---|---|---|
| `beamHO-bench` | dual-mode orbit support, paper-baseline discipline, source-trace, stage gates, reproducibility, validation artifacts | research oracle and validation reference |
| `leo-beam-sim` | Walker synthetic propagation, browser runtime cache, HOBS-style multi-beam logic, beam-hopping direction | frontend simulation donor |
| `leo-simulator` | precomputed timeseries playback and interpolation | replay-mode donor |
| `ntn-stack` | pipeline separation, preprocessing mindset, larger-system boundaries | offline pipeline reference |
| `orbit-engine` | heavy orbit precompute and pass-data generation | real-trace preprocessing donor |
| `tle_data` | raw constellation snapshots | real-trace validation dataset |

---

## 4. Core Design Goals

1. One simulation truth path.
   Headless runs and frontend playback must share the same simulation core and the same formulas.

2. Dual-source orbit architecture.
   The platform must support both `synthetic` and `real-trace` orbit sources.

3. Dual beam semantics.
   The platform must support both:
   - `earth-moving beams` for access/handover baselines
   - `earth-fixed cells / beam-hopping slots` for resource and energy studies

4. Trace-first outputs.
   Every run must be replayable from deterministic traces, manifests, and source maps.

5. Visual controllability without physics corruption.
   Showcase readability must come from scenario curation, replay selection, and presentation controls, not from hidden physics hacks.

6. Maintainable long-term modularity.
   Orbit, channel, beam, handover, energy, KPI, trace, and visualization boundaries must remain explicit.

---

## 5. Non-Negotiable Invariants

1. `src/core/**` must not import React, R3F, or Three.js.
2. Visual-only parameters must never flow back into KPI-impacting logic.
3. All KPI-impacting parameters must come from:
   - paper/standard profiles, or
   - documented `ASSUME-*` entries with rationale and traceability.
4. `benchmark suite` and `showcase suite` must use the same physics core.
5. `synthetic` and `real-trace` must be treated as complementary modes, not competing implementations.

---

## 6. System Layers

> **Note (2026-03-29):** The diagram below reflects the original blueprint intent. The Phase 0B target architecture (7 layers with explicit dependency rules) supersedes this diagram. See `sdd/phase0-architecture-spec.md §0B.2–0B.3` for the authoritative target module map.

```text
┌─────────────────────────────────────────────────────────────┐
│ L1: Parameter Registry                                      │
│ src/core/config/ — ParameterEntry[] (two-layer wrapper:    │
│   GlobalParameterSpec + ProfileParameterBinding[]),        │
│   paper-sources.json                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ (IDs only)
┌──────────────────────────▼──────────────────────────────────┐
│ L2: Model Bundle Layer                                      │
│ channel · beam · handover · energy · policy · orbit        │
│ Each subsystem: typed interface + concrete implementations  │
└───────────────┬──────────────────┬──────────────────────────┘
                │                  │ (family selections)
┌───────────────▼──────────┐  ┌────▼──────────────────────────┐
│ L3: Scenario / Profile / │  │ L4: Runtime Core              │
│ Experiment               │  │ engine.ts + engine/           │
│ ScenarioConfig           │  │ (thin orchestrator + steps)   │
│ ProfileConfig (refactored)│  │ kpi/ trace/ common/           │
│ ExperimentBundle          │  │ — calls L2 via interfaces     │
│                          │  │ — produces SimulationSnapshot │
└───────────────────────────┘  └───────────────┬───────────────┘
                                               │
┌──────────────────────────────────────────────▼───────────────┐
│ L5: Audit / Artifact                                         │
│ src/runner/ — headless, replay, curation                    │
│ RunManifest, RunArtifactBundle, SourceTrace, AssumptionRecord│
└──────────────────────────┬───────────────────────────────────┘
                           │ (runtime contract types read-only)
┌──────────────────────────▼───────────────────────────────────┐
│ L6: Exposure Contract                                        │
│ ParameterMetadataResponse, ProfileListEntry                  │
│ — backed by L1 registry; no L4 engine internals             │
└──────────────────────────┬───────────────────────────────────┘
                           │ (runtime contract + exposure contract)
┌──────────────────────────▼───────────────────────────────────┐
│ L7: Viz / UI                                                 │
│ src/viz/ + src/app/ — React, R3F, overlays, hooks           │
│ — reads SimulationSnapshot; reads L6 for parameter metadata │
│ — must NOT import L2 implementations or L3 internals        │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Target Directory Layout

```text
ntn-sim-core/
├── docs/
│   └── architecture/
├── sdd/
├── public/
│   ├── models/
│   └── scenes/
├── src/
│   ├── app/                 # app shell and route/provider composition
│   ├── core/                # pure simulation core
│   │   ├── orbit/
│   │   ├── models/
│   │   ├── channel/
│   │   ├── beam/
│   │   ├── handover/
│   │   ├── energy/
│   │   ├── kpi/
│   │   ├── engine/
│   │   ├── contracts/
│   │   ├── config/
│   │   ├── trace/
│   │   ├── profiles/
│   │   └── common/
│   ├── runner/              # headless runner, replay runner, validation runner
│   │   ├── headless/
│   │   ├── replay/
│   │   └── curation/
│   ├── viz/                 # R3F/Three scene and overlays
│   │   ├── scene/
│   │   ├── overlays/
│   │   └── presenters/
│   ├── assets/              # typed references to GLB/static assets
│   └── config/              # app-level config only; no physics duplication
└── scripts/                 # validation, replay, precompute, profile audit
```

---

## 8. Canonical Research Modes

### 8.1 Benchmark Suite

Use for paper results.

1. fixed profile
2. fixed seed
3. fixed runtime overrides
4. headless or headless-equivalent execution
5. exported CSV/JSON artifacts

### 8.2 Showcase Suite

Use for readable demos and event inspection.

1. same core formulas and same profile families as benchmark mode
2. deterministic pass/time-window selection
3. richer overlays, slower playback, clearer beam and HO highlighting
4. must be explicitly labeled as `showcase`, not benchmark

### 8.3 Observer Location Strategy

1. `benchmark` runs use the observer defined by the active profile or source baseline.
2. `showcase` runs may use the local NTPU observer as the default readability-oriented observer.
3. If a source paper fixes observer geography, that source-defined observer overrides local defaults.
4. Multi-observer comparisons are valid later extensions, but they are not required before the first single-observer benchmark suite lands.

---

## 9. High-Elevation / Visual Controllability Strategy

The historical problem is not solved by faking orbit motion. It is solved by making scenario curation a first-class subsystem.

### 9.1 Synthetic Mode

Visual controllability comes from valid control variables:

1. observer location
2. orbit shell parameters
3. plane phasing
4. epoch and start offset
5. visible-satellite subset selection

This also avoids the historical class of hemisphere/cartesian interpolation problems seen in earlier projects: synthetic mode should derive motion from explicit analytic or cached-forward orbit state, not visually bent sky-path interpolation.

### 9.2 Real-Trace Mode

Visual controllability comes from deterministic search, not manual nudging:

1. precompute or runtime-scan passes from TLE
2. rank windows by:
   - peak elevation
   - simultaneous candidate count
   - handover likelihood
   - beam overlap richness
3. store the selected window in replay metadata

Real-trace readability must therefore come from deterministic curation and replay-window selection, not from modifying orbit motion.

### 9.3 Visual-Only Controls

Allowed:

1. camera presets
2. slow motion / pause / step
3. beam color schemes
4. label density
5. event emphasis
6. trajectory tail rendering

Not allowed:

1. hidden beam repositioning
2. hidden satellite speed change
3. visual-only smoothing that changes physical event timing

---

## 10. Module Blueprint

| Module | Main Responsibilities | Source Priority |
|---|---|---|
| `core/orbit` | Walker synthetic propagation, TLE propagation, topocentric conversions, slant range | `leo-beam-sim` + `beamHO-bench` |
| `core/channel` | FSPL, 3GPP NTN losses, antenna gain, interference-aware SINR | papers + `beamHO-bench` + `leo-beam-sim` |
| `core/beam` | beam layout, footprint projection, active-beam semantics, BH slot truth | papers + `leo-beam-sim` |
| `core/handover` | hard HO, CHO, MC-HO, later DAPS/DC-like | papers + `beamHO-bench` |
| `core/energy` | beam/power EE first, onboard energy second | papers only |
| `core/kpi` | HOF, UHO, HOPP, SINR, throughput, fairness, energy metrics | papers + `beamHO-bench` |
| `core/trace` | run manifest, event log, source trace, replay trace | `beamHO-bench` |
| `runner/curation` | pass search, candidate-rich window selection, showcase case generation | new, informed by all repos |
| `runner/replay` | timeseries playback and interpolation | `leo-simulator` |
| `viz` | state rendering, overlays, event explainers | current repo shell + lessons from all repos |

---

## 11. Canonical Profile Families

1. `case9-access-baseline`
   - synthetic
   - S-band
   - earth-moving beams
   - best for A4/CHO/MC-HO reproduction

2. `hobs-multibeam-baseline`
   - synthetic
   - Ka-band
   - interference-aware multi-beam downlink
   - best for beam switching + energy-efficiency studies

3. `bh-resource-baseline`
   - synthetic
   - earth-fixed cells or BH-slot semantics
   - best for beam hopping, power allocation, and active-beam scheduling

4. `real-trace-validation`
   - TLE-driven
   - sampled Starlink / OneWeb subsets for frontend
   - full or precomputed subsets for heavier validation

---

## 12. First Architecture Milestones

1. establish `core/`, `runner/`, `viz/`, and `profiles/` boundaries before adding major physics features;
2. land `case9-access-baseline` in both headless and viz modes;
3. land `hobs-multibeam-baseline` and energy layer 1;
4. land `real-trace-validation` plus replay and pass curation;
5. add DAPS/DC-like and advanced scheduler extensions only after traceability and validation gates are stable.
