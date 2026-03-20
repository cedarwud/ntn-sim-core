# NTN Sim Core — Software Design Document

**Version:** 0.1.0  
**Date:** 2026-03-20  
**Status:** Planned Baseline

---

## 1. Scope and Product Definition

### 1.1 Purpose

This SDD defines the target software architecture of `ntn-sim-core`: a reproducible NTN/LEO multi-beam simulation platform with both research-grade outputs and high-readability visualization.

### 1.2 Naming and Repository Reality

1. Product name: `ntn-sim-core`
2. Repository folder: `ntn-sim-core/`
3. Historical alias in earlier discussion: `omni-scope`
4. Policy:
   - implementation and runtime docs must use `ntn-sim-core`
   - historical discussion aliases may remain only in archival discussion files

### 1.3 Goals

1. reproduce academic baseline environments with traceable parameters and formulas;
2. compare baseline and custom algorithms under identical scenario + seed + profile;
3. support both `synthetic` and `real-trace` orbit modes;
4. support both `earth-moving beams` and `earth-fixed/BH` beam semantics;
5. keep simulation truth independent from rendering and presentation logic;
6. support readable 3D visualization without compromising physical validity.

### 1.4 Non-Goals for Initial Baseline

1. in-browser RL training
2. multi-orbit LEO+MEO+GEO unified scheduling in v1
3. carrier-grade backend deployment concerns
4. visually impressive but physically untraceable animation shortcuts

---

## 2. Research Positioning

`ntn-sim-core` is not a pure demo application and not a pure batch-only simulator. It is a dual-purpose research platform with one simulation truth path.

The platform must always preserve:

1. paper-grade reproducibility for benchmark runs
2. deterministic replay for visualization
3. explicit separation between:
   - benchmark results
   - showcase presentations

---

## 3. Architecture Overview

The reference architecture is defined in:

1. `docs/architecture/ntn-sim-core-architecture-blueprint.md`

Normative layer split:

```text
Profiles / Source Maps
        ↓
Core Simulation
        ↓
Runner / Replay / Curation
        ↓
Visualization
```

Core invariant:

1. `src/core/**` has no React or Three.js imports.
2. visualization consumes typed snapshots, traces, and events only.

---

## 4. Target Code Organization

| Layer | Target Path | Responsibility |
|---|---|---|
| app shell | `src/app/` | top-level composition, providers, mode selection |
| core orbit | `src/core/orbit/` | synthetic Walker, TLE propagation, topocentric geometry |
| core channel | `src/core/channel/` | path loss, antenna gain, interference, SINR |
| core beam | `src/core/beam/` | beam layout, active beams, BH slot semantics |
| core handover | `src/core/handover/` | hard HO, CHO, MC-HO, later DAPS/DC-like |
| core energy | `src/core/energy/` | beam/power EE and later onboard energy state |
| core KPI | `src/core/kpi/` | cumulative and per-run metrics |
| core trace | `src/core/trace/` | manifests, event logs, replay traces, source trace |
| core profiles | `src/core/profiles/` | schemas, loaders, profile resolution, source maps |
| runner headless | `src/runner/headless/` | benchmark runner and batch export |
| runner replay | `src/runner/replay/` | deterministic playback and interpolation |
| runner curation | `src/runner/curation/` | pass/window search for readable but valid scenarios |
| viz scene | `src/viz/scene/` | sky view, god view, asset rendering |
| viz overlays | `src/viz/overlays/` | HUD, legends, event labels, KPI panels |
| viz presenters | `src/viz/presenters/` | benchmark/showcase-specific presentation contracts |
| scripts | `scripts/` | validation, profile audit, precompute, replay tools |

### 4.1 Current Landed Scope

The following architecture slices are already landed after the preflight refactor:

1. `src/app`
2. `src/assets`
3. `src/config`
4. `src/viz`
5. `scripts/validate-*`

The following layers currently exist only as placeholders and are not yet simulation-truth implementations:

1. `src/core/**`
2. `src/runner/**`

Legacy shell paths removed by preflight:

1. `src/App.tsx`
2. `src/components/**`
3. mixed physical + visual config in a single `ntpu.config.ts`

This means the codebase now matches the SDD's top-level ownership model, but it does not yet contain the research runtime.

---

## 5. External Source Strategy

`ntn-sim-core` is intentionally multi-source in design.

| Source | Normative Usage |
|---|---|
| `beamHO-bench` | validation governance, traceability, dual orbit mode, handover baseline structure |
| `leo-beam-sim` | synthetic orbit baseline, HOBS-style multi-beam design, frontend simulation loop |
| `leo-simulator` | replay mode and interpolation architecture |
| `orbit-engine` | heavy precompute and pass-data generation reference |
| papers / standards | formulas, parameter profiles, KPI definitions, energy models |

No single external repo is the sole architecture owner.

### 5.1 Paper Catalog Integration

The merged paper catalog under `/home/u24/papers/catalog/*.json` is an explicit upstream engineering input.

It should be used to:

1. justify profile values before they become defaults;
2. populate source-trace references for implemented model families;
3. identify direct formula-transfer candidates;
4. audit whether a profile parameter is paper-backed or assumption-backed.

The most useful structured inputs come from `researchChecklist`, especially:

1. `sinrAndSignal.*`
2. `power.*`
3. `beam.*`
4. `geometry.*`
5. `satelliteSimulation.*`
6. `energyEfficiency.*`
7. `jsWebsiteKnowledge.*`

---

## 6. Profile and Configuration Model

### 6.1 Resolution Order

```text
finalConfig =
  deepMerge(
    profileJson,
    runtimeOverrides
  )
```

### 6.2 Canonical Profile Families

1. `case9-access-baseline`
   - 3GPP-style access/handover baseline
   - synthetic
   - earth-moving beams

2. `hobs-multibeam-baseline`
   - multi-beam interference-aware baseline
   - synthetic
   - energy layer 1 candidate

3. `bh-resource-baseline`
   - beam hopping and active-beam scheduling baseline
   - synthetic
   - earth-fixed/BH semantics

4. `real-trace-validation`
   - TLE-driven validation profile family
   - Starlink / OneWeb subset based

### 6.3 Baseline Envelope Companion

The detailed parameter envelopes, beam-gain mappings, channel tiers, and source families are pinned in:

1. `sdd/ntn-sim-core-profile-baselines.md`

### 6.4 Configuration Rules

1. no hidden KPI-impacting constants
2. no profile duplication between app config and core config
3. all overrides must be serializable into run manifests
4. all physical parameters must be distinguishable from visual-only parameters

### 6.5 Observer Location Strategy

1. `benchmark` runs use the observer declared by the active profile or source baseline.
2. `showcase` runs may use the local NTPU observer as the default readability-oriented observer.
3. If a source paper explicitly mandates observer geography, that source-defined observer overrides local defaults.
4. Multi-observer comparisons are an extension track, not a prerequisite for the first publishable single-observer suite.

---

## 7. Simulation Modes

### 7.1 Orbit Modes

1. `synthetic`
   - Walker or analytically defined circular-orbit families
   - used for controlled baseline comparison

2. `real-trace`
   - TLE-derived or real ephemeris-derived paths
   - used for external-validity validation

### 7.2 Presentation Modes

1. `benchmark`
   - for paper figures and metric tables
2. `showcase`
   - for readable event demonstration
3. `debug`
   - for formula and state inspection

Presentation mode must not change physical outcomes. It may change:

1. camera behavior
2. label density
3. playback speed
4. replay start point
5. event emphasis

---

## 8. Beam Semantics Contract

The simulator must support two beam truth models.

### 8.1 Earth-Moving Beam Mode

Used for:

1. access handover baselines
2. 3GPP NTN-style event studies
3. MC-HO / CHO / Timer-CHO style work

### 8.2 Earth-Fixed / BH Mode

Used for:

1. beam hopping
2. power allocation
3. active-beam scheduling
4. frequency reuse studies

Both modes must share common:

1. orbit state
2. UE state
3. KPI interfaces
4. trace/export interfaces

---

## 9. Module Responsibilities

### 9.1 Orbit

Must provide:

1. ECEF / geodetic / topocentric state
2. slant range
3. azimuth / elevation
4. visibility state
5. deterministic stepping or replay sampling

### 9.2 Channel

Must provide:

1. FSPL baseline
2. 3GPP NTN large-scale losses where required
3. antenna gain families including Bessel/3GPP-style patterns
4. interference-aware SINR for multi-beam profiles

#### 9.2.1 Channel Model Tiers

| Tier | Components | Requirement |
|---|---|---|
| Tier 0 | FSPL | mandatory for all profiles |
| Tier 1 | profile-selected large-scale NTN loss family | mandatory for benchmark runs that claim 3GPP NTN-style realism |
| Tier 2 | clutter / elevation-dependent attenuation | mandatory for access-style 3GPP baselines, recommended for real-trace access validation |
| Tier 3 | beam-gain family | mandatory for multi-beam and BH studies |
| Tier 4 | atmospheric Ka-band extras | recommended for Ka-band paper-default runs |
| Tier 5 | small-scale fading | optional extension, not v1 default |

#### 9.2.2 Beam-Gain Mapping

| Profile | Default Gain Family | Rule |
|---|---|---|
| `case9-access-baseline` | 3GPP RPsat normalized | benchmark mode should not silently replace it with flat gain |
| `hobs-multibeam-baseline` | Bessel J1-family | exact variant must be profile-declared |
| `bh-resource-baseline` | Bessel or ITU-R-style family | exact family belongs to the active BH subprofile |
| `real-trace-validation` | same as validated synthetic family | TLE mode does not define a new gain family by itself |

### 9.3 Handover

Must support:

1. hard HO baseline
2. event-based A3/A4 variants where profile requires
3. CHO / MC-HO baseline
4. later DAPS/DC-like extension without breaking base contracts

#### 9.3.1 Continuity Literature Roles

Core implementation references:

1. `PAP-2025-DAPS-CORE`
2. `PAP-2024-MCCHO-CORE`

Later extension reference:

1. `PAP-2025-RSMA`

Supporting literature:

1. `PAP-2020-MIMO-GRAPH`
2. `PAP-2020-USERCENTRIC`
3. `PAP-2024-QMIXBH`

### 9.4 Energy

Must be layered:

1. Layer 1: beam/power energy efficiency
2. Layer 2: onboard energy state and blocking

#### 9.4.1 Initial Formula Families

1. Energy Layer 1 should start with HOBS-style system EE and active-beam power accounting families.
2. Energy Layer 2 should start with SMASH-style TX/RX/idle state and energy blocking.
3. RL reward definitions may inform policy design, but reward terms are not physical energy formulas by themselves.

### 9.5 Trace

Every run must emit enough information to reconstruct:

1. scenario identity
2. profile identity
3. resolved config
4. source trace
5. event log
6. KPI summary
7. optional replay timeline

---

## 10. Benchmark vs Showcase Curation

The simulator must treat scenario curation as part of the platform, not as an ad hoc manual step.

### 10.1 Benchmark Curation

1. fixed seeds
2. parameter sweeps
3. no event-cherry-picking after result generation

### 10.2 Showcase Curation

1. deterministic window selection
2. explicitly stored replay metadata
3. no physics modifications

Allowed showcase selection criteria:

1. higher elevation passes
2. richer handover candidate windows
3. clearer beam overlap windows

---

## 11. Validation and Traceability Rules

1. every KPI-impacting formula path must have source metadata
2. every profile must be serializable and reloadable
3. every benchmark run must be reproducible from its manifest
4. every showcase run must be reproducible from its replay metadata
5. every new model family must add corresponding validation cases

Authoritative gate definitions are tracked in:

1. `sdd/ntn-sim-core-validation-matrix.md`

Companion governance rules are tracked in:

1. `sdd/ntn-sim-core-development-constraints.md`
2. `sdd/ntn-sim-core-acceptance-gates.md`
3. `sdd/ntn-sim-core-assumption-policy.md`

---

## 12. Initial Architecture Constraints

1. deliver `synthetic` before `real-trace`, but design both from day one
2. deliver `benchmark` and `showcase` contracts from day one, even if showcase rendering remains simple at first
3. keep `trace-first` architecture mandatory from phase 0
4. use `beamHO-bench` as validation oracle during migration, not as the long-term architecture owner
5. use `leo-beam-sim` as the primary donor for early browser-side multi-beam simulation patterns
