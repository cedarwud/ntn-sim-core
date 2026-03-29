# Phase 2 — Model Bundle SDD

**Status:** Complete and hardened — Group 1 (SDD) complete (2026-03-29); Group 2 (implementation) complete (2026-03-29); audit rounds 3 complete (2026-03-29): VAL-PLAT-004 Part A regex fix, reset() bundle dispatch, specmode gate fix, real-trace VAL-PLAT-005 coverage, dead-code comments cleaned; validate:stage green; ready for Phase 3 Group 1
**Date (v0 — stub):** 2026-03-29
**Date (v1 — full spec):** 2026-03-29
**Depends on:** Phase 0 complete (`phase0-architecture-spec.md §0C.7`), Phase 1 complete (`phase1-parameter-registry-sdd.md` — VAL-PLAT-001/002/003 passing)

---

## 1. Goal

Replace the model-selection `if/switch` chains inside `engine.ts` with calls through
typed model-family interfaces. After Phase 2:

- All 8 model-family selections (geometry, pathLoss, beamGain, sinr, handover, power,
  ee, policy) are dispatched via interfaces defined in `src/core/models/`.
- Existing implementations remain in their per-subsystem directories (`channel/`,
  `beam/`, `handover/`, `energy/`, `orbit/`, `policy/`); only wrapper interfaces
  and one factory are new.
- `engine.ts` is still a single file (not split — that is Phase 5), but contains no
  raw tier-flag if/else chains for path loss, beam gain, or SINR.
- A `ModelBundle` object is built once per run from `ProfileConfig` and passed to
  the tick loop; the loop calls through interfaces, not through conditional branches.

**Resolves:** AC-3 (no model-family interface, `phase0-architecture-spec.md §0A.3`),
EI-3 (no plug-in surface for external tools).

---

## 2. Scope

### 2.1 In Scope

| In scope | Authority reference |
|---|---|
| `src/core/models/` directory with 8 interface files + `model-bundle.ts` | `phase0-architecture-spec.md §0B.2` |
| Interface contracts: all 8 model families (see §5) | `phase0-architecture-spec.md §0B.5` |
| `ModelBundle` composition type | `phase0-architecture-spec.md §0B.5` |
| `buildModelBundle(profile: ProfileConfig): ModelBundle` factory | `phase0-architecture-spec.md §0C.1 Phase 2` |
| Wrapping existing implementations as concrete `ModelFamilyImpl` classes/objects | `phase0-architecture-spec.md §0C.2 engine.ts` |
| `engine.ts` dispatch replaced by interface calls (file NOT split) | `phase0-architecture-spec.md §0C.1 Phase 2` |
| `scripts/validate-model-bundle.mjs` new validation script | `phase0-architecture-spec.md §0C.3 VAL-PLAT-004/004b/005` |
| Wiring `validate:bundle` into `validate:stage` | Phase 2 step P2-14 |
| Transitional compatibility: keep `ProfileConfig` as bundle-selection source | §6 of this SDD |

### 2.2 Not In Scope — Phase 2 Does NOT Do These

| Out of scope | Responsible phase |
|---|---|
| Split `engine.ts` into sub-files (`engine/` directory) | Phase 5 (P5-1/P5-2) |
| Change `ProfileConfig` field structure | Phase 3 |
| `ScenarioConfig` / `ModelBundleSelection` / `ExperimentBundle` types | Phase 3 |
| Freeze runtime contract types (`contracts/runtime-v1.ts`) | Phase 4 |
| Implement new model variants beyond wrapping existing impls | Never in this phase |
| Move implementations out of `channel/`, `beam/`, `handover/`, `energy/`, `orbit/` | Phase 5 |
| Implement MODQN training loop or new RL policy | Downstream of Phase 5 |
| UI/ControlPanel changes | Phase 4 |
| `RunnerExposureApi` | Phase 4 |
| `sourceMap[]` deletion from `defaults.ts` | Phase 5 (P5-7) |
| Delete `composeProfile()` shim | Phase 5 (P5-7) |
| Delete `tier3_5_scan_loss` dead field | Phase 3 (P3-7) |
| Beam layout utilities (`BeamLayoutModel`) as a bundle slot | Excluded (§0B.5 note) |
| `SchedulerModel` as a top-level bundle slot | Excluded (§0B.5 note); stays in `core/beam/` |
| `TrafficModel` as a top-level bundle slot | Excluded (§0B.5 note); stays in `core/traffic/` |

---

## 3. Absorbing Phase 0 and Phase 1 Outputs

### 3.1 Phase 0B Layer Boundaries (operative in Phase 2)

`src/core/models/` is L2 (Model Bundle Interfaces) in the §0B.3 layer map.

| Layer import rule (L2) | What it means for Phase 2 |
|---|---|
| L2 may import from `core/common/types.ts` (shared primitives) | Interface input/output types may reference `SimulationSnapshot`, `SourceTier`, etc. |
| L2 may reference PARAM-* IDs from L1 by string | `buildModelBundle` may look up parameter values using string IDs from the registry, but must not import the full registry object into interface files |
| L2 must NOT import from `engine.ts`, `profiles/`, `viz/`, `app/`, `runner/` | Interface files in `core/models/` are pure contracts; they must not reference engine internals |
| **Exception for `model-bundle.ts`** | `src/core/models/model-bundle.ts` is the L2 factory shim. It **may** `type`-import `ProfileConfig` from `profiles/types.ts` because it is the single translation point from profile config to model family selection. This is a deliberate, bounded violation of the general L2 rule; all other files in `src/core/models/` must NOT import from `profiles/`. |
| L2 implementations stay in subsystem dirs | `channel/`, `handover/`, etc. may import from `core/models/` (upward to interface), but the reverse is forbidden |

**Critical:** `src/core/models/` files define **interfaces and the bundle composition type**.
They do not re-implement physics. Each concrete implementation in `channel/beam-gain.ts`,
`handover/manager.ts`, etc. is wrapped by a thin adapter that satisfies the interface.

### 3.2 Phase 1 Registry → Model Bundle Relationship

Phase 1 produced `PARAMETER_REGISTRY: ParameterEntry[]` in
`src/core/config/parameter-registry.ts`. The relationship between registry and bundle is:

| What the registry provides | What the model bundle uses | What the model bundle does NOT touch |
|---|---|---|
| PARAM-* IDs for each KPI-impacting parameter | `buildModelBundle(profile)` references PARAM-* IDs only as opaque string constants when logging or associating a family choice to a parameter group | Raw `ProfileParameterBinding` values — the bundle factory reads `ProfileConfig` directly for numeric values, not the registry bindings |
| `vocabularyLayer: 'model-bundle'` classification for MB fields | Informs which `ProfileConfig` fields are bundle-selection switches vs parameter values | Registry `defaultValue` for MB fields — those are not parameters, they are family selections |
| Provenance audit trail | The `buildModelBundle` factory may record which profile was used (for trace/audit), but does not re-validate provenance | Registry `sourceId` / `sourceTier` — those are parameter registry concerns, not bundle runtime |

**Rule:** The model bundle factory takes `ProfileConfig` as its input and reads:
- `MB`-classified fields (family selection switches like `antenna.model`, `handover.type`, `channel.tier*`) → used to select which concrete implementation to wrap
- `P`-classified numeric parameters → passed into implementation constructors or at compute time via `input` structs

The bundle factory does **not** import `PARAMETER_REGISTRY` at runtime. The registry is an
audit and metadata layer; it is not a runtime data provider.

### 3.3 Profile → Model-Family Selection Mapping

The following `MB`-classified fields from `phase0-architecture-spec.md §0B.6` drive
`buildModelBundle` family selection. This mapping is the Phase 2 authority:

| ProfileConfig field | Model family it selects | Values → implementation |
|---|---|---|
| `orbitMode` (`S` but affects geometry impl) | `GeometryModel` | `'synthetic'` → `WalkerAnalyticGeometry`; `'tle'` → `Sgp4TleGeometry` |
| `antenna.model` | `BeamGainModel` | `'rpsat-3gpp'` → `RpsatBeamGainModel`; others → same (only one impl today) |
| `channel.tier0_fspl` … `channel.tier6_doppler` flags | `PathLossModel` | All tier flags passed into `ThreegppBaselinePathLoss` as `tiers` struct |
| `channel.large_scale_model` | `PathLossModel` sub-variant | Passed as configuration, not a different family in Phase 2 |
| `handover.type` | `HandoverModel` | `'a3'`\|`'a4'`\|`'cho'`\|`'timer-cho'`\|`'mc-ho'`\|`'daps'`\|`'max-elevation'`\|`'d2'` → existing FSM factories |
| `energy.layer1_enabled` + `energy.layer2_enabled` | `PowerModel`, `EeModel` | `layer1_enabled=false` → `power: null`, `ee: null`; `layer1_enabled=true` → `BasicPowerModel`, `BpjEeModel` |
| `ueConfig.independentHandover` | `HandoverModel` behavior flag | Passed as `HandoverConfig.independentHandover` into `createManager` |
| `beam.bh_strategy` | SchedulerModel sub-interface (**NOT a bundle slot**) | Passed through `BeamConfig` to `core/beam/scheduler.ts`; **not** a top-level `ModelBundle` field |
| `beam.bh_traffic_model` | TrafficModel (**NOT a bundle slot**) | Stays in `core/traffic/`; not surfaced in `ModelBundle` |
| `beamSemantics` | Affects beam-gain and SINR path | Passed into `SinrModel` impl as a flag |

> **Decision point DP-1** (for Group 2 implementors): How to handle `orbitMode` in the
> `GeometryModel` selection. `orbitMode` is classified `S` (scenario) in §0B.6, not `MB`,
> but the geometry implementation must be selected based on it. **Recommended resolution:**
> `buildModelBundle` accepts the full `ProfileConfig`; it may read `S`-classified fields
> for implementation selection without re-classifying them as `MB`. This is consistent with
> Phase 2 using `ProfileConfig` as-is (Phase 3 will formalize the split). If the implementor
> finds that `orbitMode` creates a problematic dependency, escalate before P2-11.

---

## 4. Target Module Layout After Phase 2

```
src/core/
├── models/                          ← NEW in Phase 2 (L2 interface layer)
│   ├── geometry.ts                  ← GeometryModel interface + I/O types
│   │                                   + WalkerAnalyticGeometry class (wraps orbit/)
│   │                                   + Sgp4TleGeometry class (wraps orbit/)
│   ├── path-loss.ts                 ← PathLossModel interface + I/O types
│   │                                   + ThreegppBaselinePathLoss class (wraps channel/)
│   ├── beam-gain.ts                 ← BeamGainModel interface + I/O types
│   │                                   + RpsatBeamGainModel class (wraps channel/beam-gain.ts)
│   ├── sinr.ts                      ← SinrModel interface + I/O types
│   │                                   + StandardSinrModel class (wraps channel/sinr.ts)
│   │                                   (DapsMrcSinrModel NOT implemented — see DP-6 ruling §5.4)
│   ├── handover.ts                  ← HandoverModel interface
│   │                                   + DefaultHandoverModel class (wraps handover/baselines.ts)
│   ├── power-ee.ts                  ← PowerModel + EeModel interfaces + I/O types
│   │                                   + BasicPowerModel class (wraps energy/layer1.ts)
│   │                                   + BpjEeModel class (wraps energy/layer1.ts)
│   ├── policy.ts                    ← PolicyModel alias (re-export from policy/types.ts)
│   ├── model-bundle.ts              ← ModelBundle type + buildModelBundle factory
│   └── index.ts                     ← barrel export
│
│   NOTE: All concrete wrapper classes live in models/*.ts alongside their interface.
│   No new files are added to channel/, handover/, energy/, or orbit/.
│   Those directories are UNCHANGED in Phase 2.
│
├── channel/                         ← UNCHANGED (no new files)
│   ├── fspl.ts, link-budget.ts      ← called by ThreegppBaselinePathLoss in models/
│   ├── beam-gain.ts                 ← called by RpsatBeamGainModel in models/
│   └── sinr.ts                      ← called by StandardSinrModel in models/
│
├── handover/                        ← UNCHANGED (no new files)
│   └── baselines.ts                 ← called by DefaultHandoverModel in models/
│
├── energy/                          ← UNCHANGED (no new files)
│   ├── layer1.ts                    ← called by BasicPowerModel + BpjEeModel in models/
│   └── layer2.ts                    ← used inside BasicPowerModel when layer2_enabled
│
├── orbit/                           ← UNCHANGED (no new files)
│   ├── profile-runtime.ts           ← called by WalkerAnalyticGeometry in models/
│   └── sgp4-adapter.ts              ← called by Sgp4TleGeometry in models/
│
├── policy/                          ← UNCHANGED (no new files)
│   └── types.ts                     ← Policy interface; re-exported by models/policy.ts
│
└── engine.ts                        ← MODIFIED: no raw tier flags; calls via interfaces
                                        (still a single file — split is Phase 5)
```

**What engine.ts looks like after Phase 2:**
- Receives a `ModelBundle` object at construction (or first tick, see DP-2)
- Calls `bundle.geometry.compute(...)` instead of conditionally calling Walker or SGP4
- Calls `bundle.pathLoss.compute(...)` instead of the tier-flag chain in link-budget.ts
- Calls `bundle.beamGain.computeGainDb(...)` instead of the model-string switch
- Calls `bundle.sinr.computeDb(...)` instead of the Phase2/Phase3 branch
- Calls `bundle.handover.createManager(...)` instead of the baselines dispatch
- Calls `bundle.power.compute(...)` and `bundle.ee.computeBitsPerJoule(...)` when non-null
- Calls `bundle.policy.selectAction(...)` (already working; no change needed)
- Still owns: tick sequencing, KPI accumulation, snapshot assembly, BH scheduler lazy init
  (lazy init migration to factory is part of P2-12/P2-13 but engine still orchestrates it)

> **DP-2 ruling (authoritative):** The actual public API is `createSimEngine(config: SimEngineConfig)`
> where `SimEngineConfig = { profile: ProfileConfig; trajectoryCache: TrajectoryCache; policy?: Policy }`.
> This signature MUST NOT change. The engine calls `buildModelBundle(profile, trajectoryCache)` internally:
> `this.bundle = buildModelBundle(profile, config.trajectoryCache)`. This is required because
> `benchmark-runner.ts`, `useSimulation.ts`, and all existing call sites pass a `SimEngineConfig`
> object; restructuring the signature is Phase 3+ scope.
> `bundle.policy` is overridden by `config.policy` when provided (preserving the existing
> optional policy injection path).
> If Phase 2 tests need to inject a custom bundle, a `bundleOverride?` field may be added
> to `SimEngineConfig`, but only when concretely needed. Do not add it speculatively.
> Mark with `// DP-2 resolved: internal build; SimEngineConfig signature unchanged` in engine.ts.

---

## 5. Model-Family Interface Specifications

This section is the **operative interface authority** for Phase 2 implementation.
Where §0B.5 (Phase 0 draft) and this section conflict, **this section takes precedence.**

All interfaces live in `src/core/models/`.
All input/output types are defined alongside their interface in the same file.
Types that already exist in `src/core/common/types.ts` (e.g., `ObserverLocation`, `UePosition`)
must be imported from there, not redefined.

---

### 5.1 GeometryModel (`models/geometry.ts`)

**Responsibility:** Satellite orbit propagation and UE-satellite geometry.
Computes per-satellite position (ECEF), elevation, slant range, and Doppler for one tick.

**Owns:** `SatelliteGeometry` per visible satellite per tick.

**Does NOT own:** UE position generation (stays in `core/ue/`), beam footprint geometry
(stays in `core/beam/`), trajectory cache management (stays in `core/orbit/profile-runtime.ts`).

**Inputs:**

```typescript
interface GeometryInput {
  epochUtcMs: number;              // current tick wall-clock epoch
  tickSec: number;                 // step size (for Doppler)
  orbitElements: OrbitalElements[]; // pre-built by orbit/profile-runtime.ts
  observerLocation: ObserverLocation; // from ProfileConfig.observer
  uePositions: UePosition[];       // from UE position generator
}
```

**Outputs:**

```typescript
interface SatelliteGeometry {
  satId: string;
  positionEcef: [number, number, number]; // km
  elevationDeg: number;           // above horizon (observer-centric, not per-UE)
  slantRangeKm: number;           // observer-to-satellite slant range
  azimuthDeg: number;
  dopplerHz: number;              // raw Doppler shift at carrier frequency
  ueOffAxisAngleDeg: number[];    // index = uePositions index; angle from beam center per UE
  ueSlantRangeKm: number[];       // index = uePositions index; satellite-to-UE slant range per UE
}
interface GeometryResult {
  satellites: SatelliteGeometry[];
  visibleSatIds: string[];        // satIds with elevation > min_elevation_deg
}
```

> **DP-3 ruling (authoritative — Group 2 must follow):** `SatelliteGeometry` carries
> per-UE arrays (`ueOffAxisAngleDeg: number[]`, `ueSlantRangeKm: number[]`) indexed by
> `GeometryInput.uePositions` order. `GeometryModel.compute()` is called **once per tick**
> (not once per UE), returning a single `GeometryResult` covering all UEs.
> This matches the current engine Phase B multi-UE loop structure and avoids N redundant
> orbit propagation calls.
> If an implementation constraint makes the single-call model unworkable, a
> `computeForUe(input: GeometryInput, ueIdx: number)` overload is acceptable as a fallback,
> but the primary interface must remain `compute(input): GeometryResult`.
> Mark the chosen approach with a `// DP-3 resolved:` comment in `models/geometry.ts`.

**Interface:**

```typescript
interface GeometryModel {
  readonly familyId: 'sgp4-tle' | 'walker-analytic' | 'kepler-debug' | string;
  compute(input: GeometryInput): GeometryResult;
}
```

**Concrete wrappers (Phase 2 adds, existing logic unchanged):**

| familyId | Source | Conditions |
|---|---|---|
| `'walker-analytic'` | `orbit/profile-runtime.ts` + `orbit/walker.ts` + `orbit/propagation.ts` | `orbitMode === 'synthetic'` |
| `'sgp4-tle'` | `orbit/sgp4-adapter.ts` + `orbit/tle-loader.ts` | `orbitMode === 'tle'` |

---

### 5.2 PathLossModel (`models/path-loss.ts`)

**Responsibility:** Full downlink path loss from satellite to UE, including all enabled
channel tiers (FSPL, large-scale, clutter, atmospheric, small-scale fading).

**Owns:** `PathLossResult` with component breakdown.

**Does NOT own:** beam gain (§5.3), Doppler ICI degradation (folded into `SinrModel`, §5.4),
noise power computation (stays in engine or SinrModel input prep), SINR aggregation (§5.4),
LOS/NLOS classification (determined by engine before calling this model, see note below).

**Beam gain exclusion contract (authoritative for Group 2):**
The existing `channel/link-budget.ts` `computeLinkBudget()` includes beam gain computation
when `tier3BeamGain=true` (Tier 3). The `ThreegppBaselinePathLoss` wrapper **MUST** call
`computeLinkBudget` with `tier3BeamGain: false` and `beamGainInput: undefined`, so that
beam gain is excluded from the path loss result.
After Phase 2, the engine's tick loop applies beam gain separately:
```
const beamGainDb = bundle.beamGain.computeGainDb(beamGainInput);
const effectiveRxPowerDbm = pathLossResult.rxPowerDbm + beamGainDb;
```
and `effectiveRxPowerDbm` (not `rxPowerDbm`) is passed as `servingRxPowerDbm` to
`bundle.sinr.computeDb()`. The same applies to each interfering link.
Failing to exclude beam gain from PathLossModel would double-count beam gain when the
engine also calls BeamGainModel.

**isLos ownership note:** `PathLossInput.isLos` is determined by the caller (engine) before
calling `PathLossModel.compute()`. The threshold is `profile.channel.los_elevation_deg`
(default 20°). PathLossModel does NOT re-derive LOS status from elevation angle internally.
The engine line `isLos: elevationDeg >= (profile.channel.los_elevation_deg ?? 20)` is the
single authoritative LOS decision point and must remain there after Phase 2.

**Inputs:**

```typescript
interface PathLossInput {
  distanceKm: number;             // slant range from GeometryResult
  frequencyGhz: number;           // from ProfileConfig.rf.frequency_ghz
  elevationDeg: number;           // from GeometryResult
  environment: DeploymentEnvironment; // from ProfileConfig.channel.deployment_environment
  isLos: boolean;                 // engine decides: elevationDeg >= los_elevation_deg threshold
  txEirpDbm: number;              // computed: tx_power_per_beam_dbm + peak_gain_dbi - impl_loss_db
  implementationLossDb: number;   // from ProfileConfig.rf.implementation_loss_db
  rngNext: (() => number) | null; // RNG for stochastic tier components; null = deterministic
  tiers: {
    t1_large_scale: boolean;      // from ProfileConfig.channel.tier1_large_scale
    t2_clutter: boolean;
    t4_atmospheric: boolean;
    t5_fading: boolean;
    t6_doppler: boolean;          // Doppler tier flag; ICI degradation is passed to SinrModel
  };
  bandConfig: {
    largescaleModel: string;      // ProfileConfig.channel.large_scale_model
    subcarrierSpacingKhz: number; // ProfileConfig.channel.subcarrier_spacing_khz
  };
}
```

**Outputs:**

```typescript
interface PathLossResult {
  rxPowerDbm: number;             // received signal power (serving or interfering)
  totalPathLossDb: number;        // sum of all loss components
  components: {
    fsplDb: number;
    shadowFadingDb: number;       // 0 if tier1 disabled
    clutterLossDb: number;        // 0 if tier2 disabled
    atmosphericLossDb: number;    // 0 if tier4 disabled
    smallScaleFadingDb: number;   // 0 if tier5 disabled
  };
  dopplerIciDegradationDb: number; // from Doppler tier; consumed by SinrModel
}
```

**Interface:**

```typescript
interface PathLossModel {
  readonly familyId: '3gpp-baseline' | '3gpp-extended' | string;
  compute(input: PathLossInput): PathLossResult;
}
```

**Concrete wrappers (Phase 2 adds):**

| familyId | Source | Notes |
|---|---|---|
| `'3gpp-baseline'` | `channel/link-budget.ts` + `channel/fspl.ts` + `channel/shadow-fading.ts` + `channel/small-scale-fading.ts` + `channel/doppler.ts` | Single wrapper for all tier combinations. The tier flags are passed through as-is. |

**Key constraint:** A PathLossModel impl is called **once per interferer** (for interference
power) as well as once for the serving link. The wrapper must be stateless per `compute()`
call so that calling it with different `distanceKm` + `elevationDeg` values for each
interferer produces independent results. This was the C1 fix in the prior remediation;
the interface enforces it structurally.

---

### 5.3 BeamGainModel (`models/beam-gain.ts`)

**Responsibility:** Satellite antenna gain roll-off at a given off-axis angle.
Returns gain in dBi for a UE at the given angular offset from beam center.

**Owns:** per-UE beam gain value (dBi).

**Does NOT own:** off-axis angle computation (computed by GeometryModel or engine
from satellite and UE positions), beam footprint visualization (stays in `viz/`),
beam layout (stays in `core/beam/layout.ts`).

**Inputs:**

```typescript
interface BeamGainInput {
  offAxisAngleDeg: number;        // angle from beam center to UE
  peakGainDbi: number;            // from ProfileConfig.antenna.peak_gain_dbi
  beamDiameterKm: number;         // from ProfileConfig.antenna.beam_diameter_km
  altitudeKm: number;             // from ProfileConfig.orbital.altitude_km (for θ_3dB)
  slantRangeKm: number;           // satellite-to-UE slant range
}
```

**Output:** `number` (dBi gain at off-axis angle)

**Interface:**

```typescript
interface BeamGainModel {
  readonly familyId: 'rpsat-3gpp' | 'bessel-j1' | 'itu-r' | 'flat-debug' | string;
  computeGainDb(input: BeamGainInput): number;  // dBi
}
```

**Concrete wrappers (Phase 2 adds):**

| familyId | Source | Conditions |
|---|---|---|
| `'rpsat-3gpp'` | `channel/beam-gain.ts` existing `computeBeamGainDb` | All current profiles use `antenna.model = 'rpsat-3gpp'` |

---

### 5.4 SinrModel (`models/sinr.ts`)

**Responsibility:** SINR aggregation: combine serving link power, noise floor, and
per-interferer received powers into a single SINR value (dB).

**Owns:** the final SINR scalar (dB).

**Does NOT own:** individual received power computations (those are PathLossModel outputs),
noise power computation (stays in engine/link-budget), Doppler shift computation (PathLossModel
provides `dopplerIciDegradationDb`; SinrModel applies it as a subtraction from SINR).

**Inputs:**

```typescript
interface SinrInput {
  servingRxPowerDbm: number;        // from PathLossModel.compute(serving link)
  noisePowerDbm: number;            // thermal noise (engine/link-budget computes this)
  interferingRxPowersDbm: number[]; // one per active interferer, each from PathLossModel
  dopplerIciDegradationDb: number;  // from PathLossResult.dopplerIciDegradationDb; 0 if tier6 off
}
```

**Output:** `number` (SINR in dB)

**Interface:**

```typescript
interface SinrModel {
  readonly familyId: 'standard' | 'daps-mrc' | string;
  computeDb(input: SinrInput): number;  // dB
}
```

**Concrete wrappers (Phase 2 adds):**

| familyId | Source | Conditions |
|---|---|---|
| `'standard'` | `channel/sinr.ts` existing computation | All profiles, including DAPS (see DP-6 ruling below) |

> **DP-6 ruling (authoritative — Group 2 must follow):** `DapsMrcSinrModel` is **NOT
> implemented in Phase 2**. `ModelBundle.sinr` is always `StandardSinrModel`.
> The DAPS MRC combining path continues to be handled inline in `engine.ts` as it is today
> (calling `daps.ts` directly during dual-active window, then feeding the combined power into
> the standard SINR aggregation). This avoids a bundle-level state machine for per-UE
> dual-active state, which is Phase 5+ scope.
> A `DapsMrcSinrModel` wrapper may be introduced in a future phase if the DAPS path is
> extracted from engine.ts, but it must NOT be implemented speculatively in Phase 2.
> Mark the chosen approach with a `// DP-6 resolved: StandardSinrModel static; DAPS inline`
> comment in `engine.ts` and `models/sinr.ts`.

**Note on the Phase 2 / Phase 3 SINR branch in engine.ts:**
The current engine has `computeSatSinrPhase2()` (single-beam backwards-compat) and a
multi-beam Phase 3 path. Both must be wrapped as `StandardSinrModel` with the same interface.
After P2-5/P2-6, the raw branch is replaced by `this.bundle.sinr.computeDb()` dispatch.
The dead `computeSatSinrPhase2()` function body can be deleted in Phase 5 P5-3.

---

### 5.5 HandoverModel (`models/handover.ts`)

**Responsibility:** Factory that creates a `HandoverManager` instance for a given
handover algorithm family (A3, A4, CHO, Timer-CHO, MC-HO, DAPS, etc.).

**Owns:** `HandoverManager` instance creation.

**Does NOT own:** the FSM state machine logic itself (stays in `handover/manager.ts`,
`handover/cho.ts`, `handover/mc-ho.ts`, `handover/daps.ts`), ranking decisions
(stays in `handover/ranking.ts`), distance-to-neighbor geometry (stays in `handover/d2-distance.ts`).

**Inputs to factory:**

```typescript
// Re-uses existing HandoverConfig from handover/types.ts
interface HandoverModel {
  readonly familyId: 'a3' | 'a4' | 'cho' | 'timer-cho' | 'mc-ho' | 'daps' | 'max-elevation' | 'd2' | string;
  createManager(config: HandoverConfig): HandoverManager;
}
```

`HandoverConfig` is the existing type from `src/core/handover/types.ts`.
No new type is needed; the interface wraps the existing `baselines.ts` dispatch.

**Concrete wrappers (Phase 2 adds):**

| familyId | Source |
|---|---|
| All existing types | `handover/baselines.ts` `createHandoverManager()` factory; `HandoverModel` is a thin wrapper that routes to it |

> **Decision point DP-4:** The existing `handover/baselines.ts` already has a factory
> function `createHandoverManager(config)`. The `HandoverModel` interface is structurally
> identical: `createManager(config) = createHandoverManager(config)`. Phase 2 may simply
> define one concrete `DefaultHandoverModel` that delegates to the existing factory.
> No behavioral change is needed. Group 2 should use this approach.

---

### 5.6 PowerModel and EeModel (`models/power-ee.ts`)

**Responsibility of PowerModel:** Satellite transmit and circuit power accounting.
Takes active beam count and per-beam TX power; returns total power budget.

**Responsibility of EeModel:** Energy efficiency in bits per joule, given throughput
and total power.

**Both own:** their single scalar output. Neither owns battery/solar state (stays in
`energy/layer2.ts` — accessible via `ModelBundle.power` impl when `layer2_enabled`).

**PowerModel inputs and output:**

```typescript
interface PowerInput {
  txPowerPerBeamDbm: number;     // from ProfileConfig.rf.tx_power_per_beam_dbm
  numActiveBeams: number;        // from BH scheduler or beam selection
  circuitPowerW: number;         // fixed circuit overhead (from layer1 constants)
}
interface PowerResult {
  totalPowerW: number;
  txPowerW: number;
  circuitPowerW: number;
}
interface PowerModel {
  readonly familyId: 'layer1-basic' | string;
  compute(input: PowerInput): PowerResult;
}
```

**EeModel inputs and output:**

```typescript
interface EeInput {
  throughputBps: number;
  totalPowerW: number;
}
interface EeModel {
  readonly familyId: 'bpj' | 'spectral-ee' | string;
  computeBitsPerJoule(input: EeInput): number;
}
```

**Bundle nullability:**

```typescript
// In ModelBundle:
power: PowerModel | null;   // null when energy.layer1_enabled === false
ee: EeModel | null;         // null when energy.layer1_enabled === false
```

Engine must null-check before calling. KPI accumulator already handles absent EE metrics.

**Concrete wrappers:**

| Model | familyId | Source |
|---|---|---|
| `PowerModel` | `'layer1-basic'` | `energy/layer1.ts` existing `computeEnergyMetrics` (power accounting portion) |
| `EeModel` | `'bpj'` | `energy/layer1.ts` existing bits-per-joule computation |

---

### 5.7 PolicyModel (`models/policy.ts`)

**Responsibility:** Decision/control algorithm receiving `PolicyObservation` and
returning `PolicyAction`.

**The `Policy` interface in `src/core/policy/types.ts` is already correct and is
the template for all model-family interfaces in Phase 2.**
`PolicyModel` is a type alias; no new interface is needed.

```typescript
// models/policy.ts — re-export only
export type { Policy as PolicyModel } from '../policy/types.js';
export type { PolicyObservation, PolicyAction, PolicyReward } from '../policy/types.js';
```

**No behavioral change in Phase 2.** Existing plugins (`greedy-sinr`, `no-op`,
`invalid-probe`) already implement the interface. See DP-5 ruling below for how
`buildModelBundle` handles policy default and override.

> **DP-5 ruling (authoritative):** `ProfileConfig` does not have a `policyId` field.
> `buildModelBundle` defaults to `NO_OP_POLICY` (the singleton const from
> `policy/plugins/no-op.ts`; do NOT use `new NoOpPolicy()` — there is no such class).
> When `SimEngineConfig.policy` is provided, the engine overrides `bundle.policy` after
> calling `buildModelBundle`. Concretely:
> ```typescript
> this.bundle = buildModelBundle(profile, config.trajectoryCache);
> if (config.policy) this.bundle = { ...this.bundle, policy: config.policy };
> ```
> This preserves all existing call sites. Mark with `// DP-5 resolved` in model-bundle.ts.

---

## 6. ModelBundle Composition Type and Factory

### 6.1 ModelBundle Type (`models/model-bundle.ts`)

```typescript
/**
 * ModelBundle — declarative composition of all 8 model-family selections
 * for one simulation run. Built once at engine construction from ProfileConfig.
 *
 * @see buildModelBundle
 * @see phase2-model-bundle-sdd.md §6
 *
 * NOT a Phase 3 type. Phase 3 will add ModelBundleSelection as a sub-object
 * of the decomposed ProfileConfig. ModelBundle is the RUNTIME object;
 * ModelBundleSelection (Phase 3) is the declarative config record.
 *
 * Storage: src/core/models/model-bundle.ts (NOT src/core/config/)
 * Authority: phase0-architecture-spec.md §0B.5 + phase0-architecture-spec.md §0C.3 VAL-PLAT-004b
 */
interface ModelBundle {
  readonly id: string;            // e.g. "family-access-synth@1.0" — profileId + version
  readonly geometry: GeometryModel;
  readonly pathLoss: PathLossModel;
  readonly beamGain: BeamGainModel;
  readonly sinr: SinrModel;
  readonly handover: HandoverModel;
  readonly power: PowerModel | null;
  readonly ee: EeModel | null;
  readonly policy: PolicyModel;
}
```

### 6.2 ModelBundle Factory (`models/model-bundle.ts`)

```typescript
/**
 * buildModelBundle — construct a ModelBundle from a ProfileConfig.
 *
 * This is the ONLY place where ProfileConfig MB-classified fields are
 * translated into concrete model-family implementations. After Phase 2,
 * engine.ts calls this once at construction and stores the result.
 *
 * Entry dependency: Phase 1 complete (PARAM-* IDs available if needed
 * for logging; not required for runtime correctness).
 *
 * Compatibility: ProfileConfig is unchanged in Phase 2. The factory reads
 * MB-classified fields (channel.tier*, antenna.model, handover.type, etc.)
 * and P-classified numeric parameters as needed for constructor arguments.
 *
 * @throws Error if a required field is missing or an unknown family ID
 *         is encountered. Validated by VAL-PLAT-005 (all 14 profiles must
 *         produce non-null bundles).
 */
function buildModelBundle(
  profile: ProfileConfig,
  trajectoryCache: TrajectoryCache,  // required: GeometryModel construction (WalkerAnalyticGeometry / Sgp4TleGeometry both need it at init time)
): ModelBundle;
// Policy override is handled by the engine AFTER calling buildModelBundle,
// not as a factory parameter. See DP-5 ruling in §5.7.
```

**Selection logic (authoritative, Phase 2 group 2 must follow exactly):**

| ModelBundle field | Selection rule |
|---|---|
| `geometry` | `profile.orbitMode === 'tle'` → `Sgp4TleGeometry`; else → `WalkerAnalyticGeometry` |
| `pathLoss` | Always `ThreegppBaselinePathLoss`; tier flags passed from `profile.channel.*` |
| `beamGain` | `profile.antenna.model === 'rpsat-3gpp'` → `RpsatBeamGainModel`; default → same |
| `sinr` | Always `StandardSinrModel`. DAPS path handled inline by engine (DP-6 ruling in §5.4) |
| `handover` | `DefaultHandoverModel` wrapping `baselines.ts` factory; `profile.handover.type` is forwarded into `HandoverConfig` |
| `power` | `profile.energy.layer1_enabled` → `BasicPowerModel`; else `null` |
| `ee` | `profile.energy.layer1_enabled` → `BpjEeModel`; else `null` |
| `policy` | `policyOverride ?? NO_OP_POLICY` (singleton const from `policy/plugins/no-op.ts`; see DP-5 ruling in §5.7) |
| `id` | `${profile.id}@${profile.version ?? '0'}` |

---

## 7. Transitional Compatibility

Phase 2 is an **interface-extraction phase only**. Nothing existing is deleted.

### 7.1 What Is Preserved (read-only in Phase 2)

| Artifact | Phase 2 treatment | Removed in |
|---|---|---|
| `profiles/types.ts` `ProfileConfig` | Read-only; `buildModelBundle` consumes it as input | Phase 3 |
| `profiles/defaults.ts` all 14 profiles | Read-only | Phase 3 |
| `channel/link-budget.ts` tier-flag logic | Wrapped by `ThreegppBaselinePathLoss`; internal logic not changed | Phase 5 P5-3 |
| `engine.ts` structure (1547 lines) | `if/switch` dispatch replaced by interface calls; file not split | Phase 5 P5-1/P5-2 |
| `handover/baselines.ts` `createHandoverManager` | Called by `DefaultHandoverModel.createManager` | Phase 5 P5-3 |
| `channel/sinr.ts` raw computation functions | Called by `StandardSinrModel` wrapper | Phase 5 P5-3 |
| `energy/layer1.ts` metric functions | Called by `BasicPowerModel` + `BpjEeModel` | Phase 5 P5-3 |
| `defaults.ts` `sourceMap[]` annotations | Not touched | Phase 5 P5-7 |

### 7.2 Compute Functions That Are Retained vs Wrapped

| Function | Action | Timing |
|---|---|---|
| `computeSatSinrPhase2()` in `engine.ts` (ST-2) | **Replaced** by `StandardSinrModel.computeDb()` in P2-5/P2-6; function body now dead | Delete in Phase 5 P5-3 |
| `computeBeamGainDb()` in `channel/beam-gain.ts` | **Called** by `RpsatBeamGainModel` adapter | Stays until Phase 5 |
| `computeLinkBudget()` in `channel/link-budget.ts` | **Called** by `ThreegppBaselinePathLoss.compute()` | Stays until Phase 5 |
| All handover FSM constructors in `baselines.ts` | **Called** by `DefaultHandoverModel.createManager()` | Stays until Phase 5 |

### 7.3 Legacy Path Policy

**Phase 2 must not delete any existing function or type.** Wrappers call through to
existing implementations. Golden cases pass because the math is identical.
Deletion of legacy dispatch branches happens only after the corresponding validation
gate confirms no regression (`validate:stage` green after each P2-* step).

---

## 8. Implementation Steps

Each step must leave `npm run validate:stage` green. Steps are ordered by
dependency; steps within a "family group" may be parallelized in separate branches
but must be reviewed independently.

| Step | Files | Change |
|---|---|---|
| P2-1 | `src/core/models/path-loss.ts` (new) | Define `PathLossInput`, `PathLossResult`, `PathLossModel` interface (§5.2). Add `ThreegppBaselinePathLoss` concrete class wrapping `channel/link-budget.ts`. |
| P2-2 | `engine.ts` | Replace the tier-flag if/else chain for path loss with `this.bundle.pathLoss.compute(...)`. `validate:stage` must pass including VAL-GOLDEN-001 and VAL-GOLDEN-002. |
| P2-3 | `src/core/models/beam-gain.ts` (new) | Define `BeamGainInput`, `BeamGainModel` interface (§5.3). Add `RpsatBeamGainModel` wrapping `channel/beam-gain.ts computeBeamGainDb`. |
| P2-4 | `engine.ts` | Replace model-string switch for beam gain with `this.bundle.beamGain.computeGainDb(...)`. |
| P2-5 | `src/core/models/sinr.ts` (new) | Define `SinrInput`, `SinrModel` interface (§5.4). Add `StandardSinrModel` wrapping both the Phase2 and Phase3 paths (resolve DP-6 before this step). |
| P2-6 | `engine.ts` | Replace Phase2/Phase3 SINR branch with `this.bundle.sinr.computeDb(...)`. `validate:stage` must pass including all E-level golden cases. |
| P2-7 | `src/core/models/handover.ts` (new) | Define `HandoverModel` interface (§5.5). Add `DefaultHandoverModel` wrapping `handover/baselines.ts createHandoverManager`. |
| P2-8 | `engine.ts` | Replace handover FSM construction with `this.bundle.handover.createManager(...)`. |
| P2-9 | `src/core/models/power-ee.ts` (new) | Define `PowerInput`, `PowerResult`, `PowerModel`, `EeInput`, `EeModel` interfaces (§5.6). Add `BasicPowerModel` and `BpjEeModel` wrapping `energy/layer1.ts`. |
| P2-10 | `engine.ts` | Replace energy computation calls with `this.bundle.power?.compute(...)` and `this.bundle.ee?.computeBitsPerJoule(...)`. |
| P2-11 | `src/core/models/geometry.ts` (new) | Define `GeometryInput`, `SatelliteGeometry`, `GeometryResult`, `GeometryModel` interface (§5.1). Add `WalkerAnalyticGeometry` and `Sgp4TleGeometry` wrappers. Resolve DP-3. |
| P2-12 | `engine.ts` | Replace orbit propagation calls with `this.bundle.geometry.compute(...)`. |
| P2-13 | `src/core/models/policy.ts` (new) + `src/core/models/model-bundle.ts` (new) | `policy.ts`: re-export `PolicyModel` alias (§5.7). `model-bundle.ts`: define `ModelBundle` type (§6.1) and `buildModelBundle` factory (§6.2); resolve DP-2, DP-5. Add `src/core/models/index.ts` barrel export. |
| P2-14 | `scripts/validate-model-bundle.mjs` (new) + `package.json` | Implement VAL-PLAT-004/004b/005 checks (§9). Wire `validate:bundle` into `validate:stage`. |

**Permitted deviations for Group 2:** Steps P2-1 through P2-12 may be batched by
model family (e.g., P2-1+P2-2 in one commit) as long as each commit leaves
`validate:stage` green. P2-13 must come after all other model files exist.
P2-14 must be the final step.

**Prohibited deviations:**
- P2-2/P2-4/P2-6/P2-8/P2-10/P2-12 must each be preceded by their corresponding interface
  file (P2-1, P2-3, P2-5, P2-7, P2-9, P2-11). Never modify engine.ts without a complete
  interface file in place.
- Do not attempt to split `engine.ts` into sub-files at any point in Phase 2.

---

## 9. Acceptance Criteria — VAL-PLAT-004, VAL-PLAT-004b, VAL-PLAT-005

All three gates are implemented in `scripts/validate-model-bundle.mjs` and wired into
`npm run validate:stage` via `validate:bundle` in `package.json`.

---

### VAL-PLAT-004 — engine.ts contains no raw tier-flag chains

**Category:** model bundle
**Phase:** 2
**Script:** `scripts/validate-model-bundle.mjs`

**Validation object:**
`src/core/engine.ts` source text

**Check:**
Scan `engine.ts` for raw tier-flag if/else patterns that were present before Phase 2:
- Patterns like `if (profile.channel.tier1_large_scale)`, `if (config.channel.tier2_clutter)`,
  `if (antenna.model === 'rpsat-3gpp')` as direct branches dispatching to physics functions
- The old `computeSatSinrPhase2()` dispatch branch (not the function definition, which may
  be deleted in Phase 5; the dispatch call site)

**What counts as a violation:**
Any `if` or `switch` statement in `engine.ts` whose condition directly tests a channel tier
flag or model-string field **and** whose branch directly calls a physics function
(`computeBeamGainDb`, `computeLinkBudget`, `computeFspl`, etc.) without going through a
`bundle.*` interface call.

**What does NOT count as a violation:**
- `bundle.power != null` null-checks before calling power/EE methods
- Tier flags passed as struct fields into `bundle.pathLoss.compute({tiers: {...}})`
- Profile introspection for bundle construction inside `buildModelBundle` (that function
  is legitimately conditional)

**Expected output (pass):**
```
VAL-PLAT-004: PASS — engine.ts contains no raw tier-flag dispatch chains
```

**Expected output (fail):**
```
VAL-PLAT-004: FAIL — engine.ts line 412: raw tier-flag branch detected:
  if (config.channel.tier3_beam_gain) { computeBeamGainDb(...) }
  Replace with bundle.beamGain.computeGainDb(...)
```

**Required files:**
- `src/core/engine.ts` must exist
- `src/core/models/model-bundle.ts` must exist (used to confirm `bundle.*` pattern is present)

**Implementation note for the script — Part A (negative check, raw dispatch):**
Use regex patterns on engine.ts text. The patterns to detect (violations):
```
/if\s*\(\s*(profile|config|this\.(profile|config))\.channel\.(tier\d|large_scale_model)\b/
/switch\s*\(\s*(profile|config|this\.(profile|config))\.channel\.(tier|large_scale)/
/if\s*\(\s*(profile|config|this\.(profile|config))\.antenna\.model\b/
```
Note: `antenna.model` is at `profile.antenna.model` (NOT `profile.channel.antenna.model`),
so it requires a separate pattern. These cover raw dispatch for path-loss tiers,
large-scale model variants, and beam-gain model selection.
These are heuristics; if a match is found, print the line number and the matched text.
A clean Part A pass means zero matches across all three patterns.

**Implementation note for the script — Part B (positive check, all 8 families dispatched):**
After Phase 2, engine.ts must contain call-through patterns for all 8 bundle families.
Scan engine.ts for the presence of ALL of the following strings (positive assertions):
```
bundle.geometry.compute(
bundle.pathLoss.compute(
bundle.beamGain.computeGainDb(
bundle.sinr.computeDb(
bundle.handover.createManager(
bundle.policy.selectAction(
```
Additionally assert that `bundle.power` and `bundle.ee` are referenced (even if null-guarded).
If any required pattern is absent, print:
```
VAL-PLAT-004: FAIL — engine.ts missing bundle dispatch for: bundle.geometry.compute(
  Add this call in the geometry tick step (P2-12)
```
A clean Part B pass means all 8 required patterns are present in engine.ts.
VAL-PLAT-004 passes only when BOTH Part A and Part B pass.

---

### VAL-PLAT-004b — `src/core/models/` contains all 8 required interface files

**Category:** model bundle
**Phase:** 2
**Script:** `scripts/validate-model-bundle.mjs`

**Validation object:**
`src/core/models/` directory contents

**Check:**
1. The directory `src/core/models/` exists.
2. All 8 required files exist:
   - `geometry.ts`
   - `path-loss.ts`
   - `beam-gain.ts`
   - `sinr.ts`
   - `handover.ts`
   - `power-ee.ts`
   - `policy.ts`
   - `model-bundle.ts`
3. `src/core/models/model-bundle.ts` (not `src/core/config/model-bundle.ts`) exports a
   type or interface named `ModelBundle`.

**Expected output (pass):**
```
VAL-PLAT-004b: PASS — src/core/models/ contains all 8 required interface files; ModelBundle in model-bundle.ts
```

**Expected output (fail):**
```
VAL-PLAT-004b: FAIL — missing files in src/core/models/: power-ee.ts
VAL-PLAT-004b: FAIL — ModelBundle not found in src/core/models/model-bundle.ts (check for export keyword)
```

**Implementation note:** Use `fs.existsSync()` for file checks. For the `ModelBundle`
export check, use a regex `/export\s+(interface|type)\s+ModelBundle\b/` on the file text.

---

### VAL-PLAT-005 — `ModelBundle` factory produces non-null bundle for all 14 profiles

**Category:** model bundle
**Phase:** 2
**Script:** `scripts/validate-model-bundle.mjs`

**Validation object:**
`buildModelBundle(profile)` called for each of the 14 profiles in `DEFAULT_PROFILES`

**Check:**
1. Import `buildModelBundle` from `src/core/models/model-bundle.ts` (or compiled JS).
2. Import `DEFAULT_PROFILES` from `src/core/profiles/defaults.ts`.
3. For each profile in `Object.values(DEFAULT_PROFILES)`: call `buildModelBundle(profile)`.
4. Assert: return value is not null/undefined.
5. Assert: the 6 always-required fields (`geometry`, `pathLoss`, `beamGain`, `sinr`,
   `handover`, `policy`) are non-null in the returned bundle.
6. Assert: `power` and `ee` are non-null iff `profile.energy.layer1_enabled === true`.
7. Assert: `bundle.id` starts with `profile.id`.

**The profile set** is determined dynamically: the script must enumerate
`Object.values(DEFAULT_PROFILES)` at runtime. Do **not** hardcode a profile list in the
script — if profiles are added or renamed between now and Group 2 implementation, a static
list would silently miss them or fail on renamed IDs. The script passes iff every profile
returned by `DEFAULT_PROFILES` produces a valid bundle; the count is not hardcoded.

> **Note for Group 2:** When writing the script, the count 14 is informational only.
> Use `Object.values(DEFAULT_PROFILES).length` for the summary line, e.g.:
> `VAL-PLAT-005: PASS — buildModelBundle produced valid non-null bundles for all N profiles`

**Expected output (pass):**
```
VAL-PLAT-005: PASS — buildModelBundle produced valid non-null bundles for all 14 profiles
```

**Expected output (fail):**
```
VAL-PLAT-005: FAIL — buildModelBundle threw for profile "case9-daps-baseline":
  TypeError: Unknown handover type 'daps' — add to DefaultHandoverModel switch
VAL-PLAT-005: FAIL — bundle.power is null for profile "family-mb-hobs-synth"
  but energy.layer1_enabled === true
```

**Implementation note:** Run under `node --import tsx` (same as `validate:golden-engine`).
The script is an ESM module that dynamically imports the compiled/tsx-executed TypeScript.
If module resolution fails, print a clear error directing the implementor to check the
import path and `tsx` setup. This is the same pattern used by `golden-case-engine.ts`.

---

## 10. "Phase 2 Complete" — Reviewable Completion Criteria

A reviewer can declare Phase 2 complete by verifying all six conditions below:

| # | Condition | How to verify |
|---|---|---|
| 1 | `src/core/models/` directory exists with all 8 interface files | `ls src/core/models/` — must show `geometry.ts path-loss.ts beam-gain.ts sinr.ts handover.ts power-ee.ts policy.ts model-bundle.ts index.ts` |
| 2 | `ModelBundle` type and `buildModelBundle` factory are in `src/core/models/model-bundle.ts` (not in `config/`) | `grep -l "ModelBundle" src/core/models/` must return `model-bundle.ts`; `grep -r "ModelBundle" src/core/config/` must return nothing |
| 3 | VAL-PLAT-004 (Part A + Part B), VAL-PLAT-004b, VAL-PLAT-005 all pass | `npm run validate:bundle` exits 0; all three print PASS; Part B confirms all 8 `bundle.*` dispatch patterns present in engine.ts |
| 4 | All pre-existing VAL-* checks still pass | `npm run validate:stage` exits 0; in particular VAL-GOLDEN-001, VAL-GOLDEN-002, and all E-level golden cases pass |
| 5 | `engine.ts` is still a single file (not split) | `ls src/core/engine.ts` must exist; `ls src/core/engine/` must not exist |
| 6 | This file's status header = "Complete" and `ntn-sim-core-implementation-status.md §1b` Phase 2 row = ✅ complete | Read both files |

No other conditions apply. In particular, Phase 2 completion does NOT require:
- `ProfileConfig` to be decomposed (Phase 3)
- contract types frozen (Phase 4)
- `engine.ts` to be split (Phase 5)
- any new model variant beyond wrapping existing implementations

**Accepted approximation (Phase 2 ruling):** `computeUeSinrFromSatEntry()` in engine.ts adjusts a pre-computed beam-center SINR by a beam-gain delta rather than performing a full per-UE `bundle.pathLoss` recomputation. This is a controlled approximation: path loss variation at sub-beam scale (≤50 km) is dominated by beam-gain roll-off; other tier effects are spatially smooth. If a future PathLossModel becomes position-sensitive at sub-beam scale, this path must be promoted to full per-UE recomputation (Phase 3 scope). Beam-gain delta is routed through `bundle.beamGain.computeGainDb()`.

**VAL-PLAT-005 real-trace coverage (2026-03-29):** The validator now builds a TLE-fixture-backed cache for profiles with `orbitMode='real-trace'`, verifying that `Sgp4TleGeometry` is constructed and `buildModelBundle` returns a valid bundle from real OMM data.

---

## 11. Decision Points Summary

The following decision points require Group 2 to make an explicit choice before or
during implementation. Each must be documented with a `// DP-N resolved: <choice>` comment
in the relevant source file.

| ID | Location | Question | Resolution |
|---|---|---|---|
| DP-1 | `buildModelBundle` | How to handle `orbitMode` (S-classified) in geometry selection | Read from `ProfileConfig`; acceptable for factory to read S fields (Phase 3 formalises split) |
| DP-2 | `createSimEngine(config: SimEngineConfig)` | Inject bundle externally or build internally | **Ruled**: build internally; `SimEngineConfig` shape MUST NOT change (see §4) |
| DP-3 | `GeometryModel.compute()` / output types | Single-call multi-UE vs per-UE call | **Ruled**: single call; `ueOffAxisAngleDeg: number[]`, `ueSlantRangeKm: number[]` per UE (see §5.1) |
| DP-4 | `HandoverModel` implementation | Thin wrapper or direct delegation to `baselines.ts` | `DefaultHandoverModel` delegates directly; no behavioral change |
| DP-5 | Policy selection in `buildModelBundle` | No `policyId` in `ProfileConfig` | **Ruled**: default to `NO_OP_POLICY` const; engine overrides from `SimEngineConfig.policy` (see §5.7) |
| DP-6 | `SinrModel` and DAPS dual-active | Static vs dynamic SinrModel selection | **Ruled**: static `StandardSinrModel`; `DapsMrcSinrModel` NOT implemented in Phase 2 (see §5.4) |

DP-2, DP-3, DP-6 are **ruled** (not open choices). DP-1, DP-4, DP-5 are recommendations.
If any ruled DP cannot be followed without breaking existing tests, escalate to the
Phase 2 Group 1 reviewer before proceeding.

---

## 12. SDD Update Obligations on Phase 2 Completion

When Phase 2 is declared complete (all six conditions in §10 satisfied), the following
documents must be updated **in the same change set**:

1. This file: status header → `"Complete"` (line 3)
2. `sdd/ntn-sim-core-implementation-status.md` §1b: Phase 2 row → `✅ complete`
3. `sdd/ntn-sim-core-validation-matrix.md` §2 Platform Refactor Gates: VAL-PLAT-004/004b/005
   rows → confirmed; add script name and test coverage note
4. `sdd/ntn-sim-core-implementation-status.md` §5: add passing rows for VAL-PLAT-004/004b/005

No other documents need to be updated for Phase 2 completion.
Phase 3 will update the roadmap and implementation status table further.

---

## 13. Relationship to Phase 0B/0C and Phase 1 Outputs

Every design decision in this SDD traces directly to Phase 0 and Phase 1:

| Phase 2 decision | Authority source |
|---|---|
| 8 top-level model families (no BeamLayout/Scheduler/Traffic slots) | `phase0-architecture-spec.md §0B.5` non-reopenable exclusion list |
| Interface files in `src/core/models/` (not `config/`) | `phase0-architecture-spec.md §0B.2` target module map |
| L2 layer: no imports from engine, profiles, viz, app | `phase0-architecture-spec.md §0B.3` layer dependency rules |
| `buildModelBundle(profile)` reads MB fields from `ProfileConfig` (not decomposed) | `phase0-architecture-spec.md §0C.1 Phase 2` "What must NOT happen" — ProfileConfig changes = Phase 3 |
| Implementations stay in `channel/`, `handover/`, etc. (not moved) | `phase0-architecture-spec.md §0C.1 Phase 2` "What must NOT happen" |
| `engine.ts` not split (structural split = Phase 5) | `phase0-architecture-spec.md §0C.2` Critical rule |
| PARAM-* IDs may be referenced as string constants in factory logging | `phase0-architecture-spec.md §0C.4` Phase 1 → Phase 2 required outputs |
| Factory must produce non-null bundles for all 14 profiles | VAL-PLAT-005 + `phase0-architecture-spec.md §0C.3` |
| `PolicyModel` = re-export of existing `Policy` interface | `phase0-architecture-spec.md §0B.5` — Policy is already correct template |
| `SchedulerModel` / `BeamLayoutModel` / `TrafficModel` excluded from bundle | `phase0-architecture-spec.md §0B.1 Model Bundle` definition; finalized and non-reopenable |
