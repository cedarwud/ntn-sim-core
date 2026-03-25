# NTN Sim Core — Development Roadmap

**Version:** 0.3.0  
**Date:** 2026-03-25  
**Status:** Active Companion-Updated Plan

---

## 1. Purpose

Define the execution order for building `ntn-sim-core` from an empty visualization shell into a publishable research simulator.

This roadmap follows the agreed final direction:

1. new long-term architecture in `ntn-sim-core`
2. `beamHO-bench` kept as research oracle and validation reference
3. `leo-beam-sim` used as key frontend simulation donor
4. `leo-simulator` and `orbit-engine` used to shape replay and precompute modes

---

## 2. Delivery Strategy

The project should be built in vertical slices, not by finishing one giant subsystem first.

Each phase must land:

1. one usable research baseline
2. one visualization contract
3. one validation bundle
4. one trace/export path

For Phase 3 to Phase 6, frontend beam closure is additionally governed by:

1. `sdd/ntn-sim-core-frontend-beam-visual-sdd.md`
2. `sdd/ntn-sim-core-frontend-beam-visual-acceptance.md`
3. `sdd/ntn-sim-core-frontend-donor-mapping.md`

---

## 3. Phase Plan

### Phase 0: Foundation and Governance

**Goal**

Establish the project skeleton and the rules that prevent future architecture drift.

**Already landed**

1. `src` has been restructured into `app / assets / config / core / runner / viz`
2. observer presets and visual-scene config are now split
3. asset registries for `sat.glb`, `uav.glb`, and `NTPU.glb` are in place
4. preflight validation scripts are available through `validate:structure`, `validate:trace`, and `validate:profiles`
5. the current repo passes `npm run validate:stage` after the preflight refactor
6. governance companion docs now define development constraints, acceptance gates, and assumption policy before runtime code lands

**Main work**

1. create `src/core`, `src/runner`, `src/viz`, `src/app`, and `scripts` boundaries
2. define profile schema, run manifest schema, source-trace schema, and replay manifest schema
3. add seed-fixed RNG and deterministic time-control utilities
4. add initial validation scripts for structure, trace presence, and config serialization

**Main references**

1. `beamHO-bench` for traceability and validation discipline
2. current `ntn-sim-core` shell for scene and asset bootstrap

**Remaining work**

1. define the first schema contracts under `src/core/profiles` and `src/core/trace`
2. add typed runner contracts under `src/runner/headless` and `src/runner/replay`
3. turn the current preflight validation scripts into the first true governance gates

**Exit criteria**

1. empty-but-working app still builds
2. one headless dry-run emits manifest and empty KPI bundle
3. structure and traceability gates exist in `scripts/`

**Closure reference**

1. `sdd/ntn-sim-core-preflight-refactor-closure.md`

### Phase 1: Synthetic Orbit and Visual Baseline

**Goal**

Land the first truthful synthetic orbit baseline with readable satellite motion in the scene.

**Main work**

1. implement Walker and simple analytic orbit stepping in `core/orbit`
2. implement topocentric conversion and observer visibility state
3. render satellite positions from core snapshots, not ad hoc scene code
4. support static and animated `case9-access-baseline` scenario
5. add basic trace timeline export and replay import

**Main references**

1. `leo-beam-sim` for browser-side synthetic orbit and cache logic
2. `beamHO-bench` case9 analytic patterns for baseline structure

**Exit criteria**

1. synthetic orbit runs identically in headless and frontend paths
2. satellite elevation/range values are exported per tick
3. one Case 9 static scene and one animated replay are reproducible from saved metadata

### Phase 2: Channel, KPI, and Handover Baseline

**Goal**

Turn orbit animation into a valid access/handover simulator.

**Main work**

1. implement FSPL and selected 3GPP NTN large-scale losses
2. implement beam layout for earth-moving access beams
3. implement hard HO baseline and event-based A3/A4 / CHO / MC-HO baseline family
4. implement KPI accumulation: HOF, UHO, HOPP, average SINR, throughput proxy, fairness
5. add event log overlays and CSV/JSON benchmark export

**Paper baselines**

1. `PAP-2022-A4EVENT-CORE`
2. `PAP-2022-SINR-ELEVATION`
3. `PAP-2024-MCCHO-CORE`
4. `PAP-2025-TIMERCHO-CORE`

**Main references**

1. `beamHO-bench` for baseline orchestration and KPI governance
2. papers for formulas and thresholds

**Exit criteria**

1. `case9-access-baseline` produces deterministic HO events and KPI outputs
2. frontend can explain serving beam, target beam, and trigger cause
3. benchmark run artifacts are exportable and replayable

### Phase 3: HOBS Multi-Beam and Energy Layer 1

**Goal**

Add the first truly target-topic baseline: multi-beam interference plus energy-efficiency reporting.

**Main work**

1. implement `hobs-multibeam-baseline`
2. add interference-aware multi-beam SINR
3. add beam switching and active-beam truth
4. add energy layer 1 metrics:
   - throughput per power
   - active beam count
   - per-beam power accounting
5. add truth-driven beam/SINR overlays and handover/service links for active beams, overlap, and service-drop reason
6. replace the schematic placeholder beam path with a donor-backed `earth-moving` multibeam renderer
7. bind serving / target / inactive beam roles to the same tick truth used by benchmark outputs

**Paper baselines**

1. `PAP-2024-HOBS`
2. `PAP-2022-SINR-ELEVATION`
3. `PAP-2021-SHADOWED-RICIAN` as optional channel extension reference
4. `PAP-2024-MADRL-CORE` as supporting multibeam implementation reference

**Main references**

1. `leo-beam-sim` for multi-beam browser-side structure
2. papers for interference and EE formulas
3. `sdd/ntn-sim-core-frontend-beam-visual-sdd.md`
4. `sdd/ntn-sim-core-frontend-donor-mapping.md`

**Exit criteria**

1. intra-satellite beam switching and inter-satellite HO are both visible in one run
2. active-beam gating changes service outcomes deterministically
3. energy layer 1 metrics appear in benchmark artifacts and frontend overlays
4. the Phase 3 frontend path satisfies `ntn-sim-core-frontend-beam-visual-acceptance.md` with browser-visible evidence
5. beam/SINR explainers and handover/service links are truth-driven rather than frontend-recomputed

### Phase 4: Real-Trace Validation and Replay Curation

**Goal**

Make the simulator externally credible under real constellation motion and simultaneously solve showcase controllability the right way.

**Main work**

1. ingest sampled TLE fixtures and/or precomputed orbit windows
2. add `real-trace-validation` profile family
3. implement pass search and window-ranking logic in `runner/curation`
4. add replay mode with deterministic window manifests
5. support frontend-friendly subset mode and heavier validation mode
6. reuse the same frontend beam renderer family in replay mode instead of a simplified replay-only layer
7. reuse the same overlay/link family in replay mode instead of replay-only explainers

**Paper baselines**

1. `PAP-2025-DAPS-CORE`
2. `PAP-2025-SMASH-MADQL`
3. TLE-backed papers in the catalog for validation rationale

**Main references**

1. `beamHO-bench` for real-trace architecture and TLE fixture workflow
2. `leo-simulator` for replay/interpolation
3. `orbit-engine` for heavier precompute patterns

**Exit criteria**

1. real-trace runs share the same channel, HO, and KPI stack as synthetic runs
2. showcase windows are selected deterministically, not manually
3. replay manifests can reconstruct the same visual sequence and event timing
4. replay-facing beam visuals satisfy `ntn-sim-core-frontend-beam-visual-acceptance.md`
5. replay-facing overlays and handover/service links reuse the same truth fields as live mode

### Phase 5: Beam Hopping and Energy Layer 2

**Goal**

Extend from access-style multibeam studies into beam-hopping and onboard energy state research.

**Main work**

1. implement `bh-resource-baseline`
2. add earth-fixed / BH-slot beam semantics
3. add scheduler modes:
   - deterministic baseline
   - traffic-aware
   - power-aware
4. add energy layer 2:
   - onboard energy state
   - energy blocking
   - optional solar/shadow phase state
5. add a donor-backed `earth-fixed / BH-slot` renderer instead of reusing moving-beam placeholders

**Paper baselines**

1. `PAP-2025-EEBH-UPLINK`
2. `PAP-2025-MAAC-BHPOWER`
3. `PAP-2026-BHFREQREUSE`
4. `PAP-2025-SMASH-MADQL`
5. `PAP-2025-DIST-BH-HETERO` as supporting heterogeneity branch

**Exit criteria**

1. BH scheduling is part of simulation truth, not just visual animation
2. blocked-by-energy and blocked-by-inactive-beam are distinguished in artifacts and overlays
3. energy layer 2 can disable service independently of geometry
4. the BH frontend path satisfies `ntn-sim-core-frontend-beam-visual-acceptance.md`

### Phase 6: DAPS / DC-Like and Policy Extension Layer

**Goal**

Add advanced continuity mechanisms after the baseline simulator is already trustworthy.

**Main work**

1. extend HO engine to support prepared/dual-active/path-switched states
2. add DAPS or DAPS-like rate/interruption models
3. add optional offline action adapters for future policy-driven experiments
4. keep training external to the website
5. add donor-backed continuity link explainers for dual-active / path-switched states

**Core implementation references**

1. `PAP-2025-DAPS-CORE`
2. `PAP-2024-MCCHO-CORE`
3. `PAP-2025-RSMA`

**Supporting continuity literature**

1. `PAP-2020-MIMO-GRAPH`
2. `PAP-2020-USERCENTRIC`
3. `PAP-2024-QMIXBH`

**Exit criteria**

1. DAPS-enabled and DAPS-disabled runs are comparable under identical scenarios
2. continuity gains are visible both in KPI outputs and event traces
3. no browser-embedded training dependency is introduced
4. dual-active continuity is visually explainable through truth-driven links or equivalent overlays

---

## 4. Canonical Deliverables by Phase

| Phase | New baseline | New visualization contract | New validation artifact |
|---|---|---|---|
| 0 | none | none | structure + traceability skeleton |
| 1 | `case9-access-baseline` orbit-only | synthetic sky replay | orbit reproducibility bundle |
| 2 | access handover baseline | serving/target/event HUD | KPI + HO validation bundle |
| 3 | `hobs-multibeam-baseline` | donor-backed earth-moving multibeam renderer with beam-role states plus truth-driven beam/SINR and handover explainers | SINR/EE validation bundle |
| 4 | `real-trace-validation` | curated replay windows using the same beam renderer and overlay/link family | replay + real-trace validation bundle |
| 5 | `bh-resource-baseline` | earth-fixed BH cell renderer plus activity / energy reason overlays | BH + energy validation bundle |
| 6 | DAPS/DC-like extension | dual-active continuity explainer with truth-driven link/overlay semantics | continuity validation bundle |

---

## 5. Global Exit Rules

No phase should be marked done unless:

1. headless and frontend paths use the same simulation truth for that phase's features;
2. artifacts are reproducible from saved manifests;
3. the relevant validation IDs in `ntn-sim-core-validation-matrix.md` pass;
4. new assumptions are documented and traceable;
5. the new feature can be explained in both benchmark and showcase contexts.
6. Phase 3 to Phase 6 beam/frontend work satisfies the frontend beam visual companion docs with browser-visible evidence.
7. any frontend overlay or link explainer remains truth-driven and non-authoritative relative to headless/exported artifacts.
