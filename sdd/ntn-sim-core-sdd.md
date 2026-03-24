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

| Tier | Components | Module | Requirement |
|---|---|---|---|
| Tier 0 | FSPL | `fspl.ts` | mandatory for all profiles |
| Tier 1 | large-scale shadow fading (3GPP TR 38.811, S-band + Ka-band tables) | `shadow-fading.ts` | mandatory for benchmark runs that claim 3GPP NTN-style realism |
| Tier 2 | clutter / elevation-dependent attenuation | `shadow-fading.ts` | mandatory for access-style 3GPP baselines |
| Tier 3 | beam-gain family (rpsat-3gpp, bessel-j1, itu-r) | `beam-gain.ts` | mandatory for multi-beam and BH studies |
| Tier 4 | atmospheric loss: gaseous absorption (ITU-R P.676), rain (ITU-R P.618), scintillation | `link-budget.ts` | mandatory for Ka-band profiles (≥10 GHz) |
| Tier 5 | small-scale fading: Shadowed-Rician (SR) model with Nakagami-m LOS + Rayleigh scatter | `small-scale-fading.ts` | recommended for channel model completeness claims; elevation-dependent SR parameters |
| Tier 6 | Doppler shift and ICI SINR degradation | `doppler.ts` | available for Doppler-sensitive studies; not yet wired into engine SINR path |

#### 9.2.2 Beam-Gain Mapping

| Profile | Default Gain Family | Rule |
|---|---|---|
| `case9-access-baseline` | 3GPP RPsat normalized | benchmark mode should not silently replace it with flat gain |
| `hobs-multibeam-baseline` | Bessel J1-family | exact variant must be profile-declared |
| `bh-resource-baseline` | Bessel or ITU-R-style family | exact family belongs to the active BH subprofile |
| `real-trace-validation` | same as validated synthetic family | TLE mode does not define a new gain family by itself |

### 9.3 Handover

Must support:

1. hard HO baseline (`manager.ts`, TTT=0)
2. event-based A3/A4 variants (`manager.ts`, configurable threshold/TTT/hysteresis)
3. CHO — Conditional Handover (`cho.ts`): network pre-configures HO command, UE autonomously executes on CondEventA3
4. Timer-CHO (`cho.ts`): CHO with geometry-assisted timer (α·TTT) and L3 IIR filter (k parameter)
5. MC-HO — Multi-Connectivity Handover (`mc-ho.ts`): dual-active phase with packet duplication
6. DAPS — Dual Active Protocol Stack (`daps.ts`): source+target dual-active, path switch, selection combining

All handover types support propagation delay (RTT) in TTT calculation: `effectiveTTT = baseTTT + 2·propagationDelayMs`.

#### 9.3.1 Handover Type Summary

| Type | Module | FSM States | Key Config | Paper Source |
|---|---|---|---|---|
| hard-ho | `manager.ts` | idle → attached → switching → attached | TTT=0 | baseline |
| a3-event | `manager.ts` | idle → attached → preparing → attached | threshold, TTT, hysteresis | 3GPP |
| a4-event | `manager.ts` | idle → attached → preparing → attached | threshold, TTT, hysteresis | PAP-2022-A4EVENT-CORE |
| cho | `cho.ts` | idle → attached → cho-prepared → attached | cho_offset_db | 3GPP TS 38.331 |
| timer-cho | `cho.ts` | idle → attached → cho-prepared → attached | cho_alpha, cho_filter_k | PAP-2025-TIMERCHO-CORE |
| mc-ho | `mc-ho.ts` | idle → attached → mc-preparing → mc-dual-active → attached | mc_max_dual_sec | PAP-2024-MCCHO-CORE |
| daps | `daps.ts` | idle → single-active → prepared → dual-active → path-switched → single-active | preparationTimeSec, maxDualActiveSec | PAP-2025-DAPS-CORE |

#### 9.3.2 Continuity Literature Roles

Core implementation references:

1. `PAP-2025-DAPS-CORE` — DAPS procedure
2. `PAP-2024-MCCHO-CORE` — MC-HO dual connectivity
3. `PAP-2025-TIMERCHO-CORE` — Timer-CHO geometry-assisted

Supporting literature:

1. `PAP-2025-RSMA` — later extension
2. `PAP-2020-MIMO-GRAPH`, `PAP-2020-USERCENTRIC`, `PAP-2024-QMIXBH`

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

### 9.6 Traffic Model

Module: `src/core/traffic/generator.ts`

Provides per-cell/per-beam demand input for BH scheduling. Without a traffic model, BH scheduler decisions have no demand basis.

| Model | Behavior | Use Case |
|---|---|---|
| `poisson` | Knuth/normal Poisson arrivals per cell per tick | realistic bursty traffic |
| `full-buffer` | constant demand per cell | worst-case / capacity analysis |
| `hotspot` | base demand + N× multiplier on selected cells | non-uniform load distribution |
| `uniform` | base demand with ±20% random variation | baseline even load |

Config: `TrafficConfig` with `numCells`, `meanArrivalRatePerSec`, `packetSizeBits`, `hotspotCellIndices`, `hotspotMultiplier`.

### 9.7 Policy Interface (RL/DRL)

Module: `src/core/policy/types.ts`

Defines the observation-action-reward contract for external RL/DRL policy integration.

| Interface | Content |
|---|---|
| `PolicyObservation` | per-satellite (elevation, SINR, beam count, SoC), per-UE (SINR, serving), global (power, mean SINR) |
| `PolicyAction` | per-satellite beam activation + power, handover mode (trigger/defer/auto) |
| `PolicyReward` | weighted: throughput (0.3), EE (0.2), HO cost (0.2), continuity (0.2), fairness (0.1) |
| `Policy` | `selectAction(obs) → action`, `onReward(reward)`, `reset()` |

Engine integration (future): `engine.getObservation()` → policy → `engine.applyAction()`.

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

## 13. Performance Budget (MG3)

Defines scale limits per simulation mode. Exceeding these limits risks framerate collapse (frontend) or excessive runtime (headless).

### Frontend (viz/showcase mode)

| Resource | Limit | Rationale |
|---|---|---|
| Satellites | ≤ 200 | Three.js scene overhead at >200 |
| Beams per satellite | ≤ 19 | 19-beam hex is standard; 37+ requires LOD |
| UEs | ≤ 10 | Per-UE SINR loop in tick |
| Snapshot rate | 20 fps | 50ms tick budget |
| Cache build time | ≤ 5 s | User-perceived load time |

### Headless (benchmark mode)

| Resource | Limit | Rationale |
|---|---|---|
| Satellites | ≤ 2000 | Memory for trajectory cache |
| Beams per satellite | ≤ 37 | 37-beam = 3 hex rings |
| UEs | ≤ 500 | O(N×M) SINR loop feasibility |
| Tick rate | unconstrained | No framerate requirement |
| Cache build time | ≤ 60 s | CI/CD budget |

### Profile annotations

Each profile in `src/core/profiles/defaults.ts` should declare its intended mode:

- `case9-access-baseline`: frontend + headless
- `hobs-multibeam-baseline`: frontend + headless
- `bh-resource-baseline`: headless-preferred (19+ beams × BH scheduling)
- `real-trace-validation`: headless-only (1584 satellites)
