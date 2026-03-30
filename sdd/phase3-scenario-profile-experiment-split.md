# Phase 3 — Scenario / Profile / Experiment Split

**Status:** Complete — Group 1 (SDD) complete (2026-03-29); Group 2 (implementation) complete (2026-03-30); Group 3 (file split) complete (2026-03-30)
**Date (stub):** 2026-03-29
**Date (v1 — full spec):** 2026-03-29
**Date (v2 — Group 2 verified):** 2026-03-30
**Date (v3 — Group 3 complete):** 2026-03-30
**Depends on:** Phase 0 complete, Phase 1 complete (VAL-PLAT-001/002/003), Phase 2 complete (VAL-PLAT-004/004b/005 — `src/core/models/` directory with 9 files, `buildModelBundle` factory)

---

## 1. Goal

Decompose the monolithic `ProfileConfig` struct into three distinct vocabulary types —
`ScenarioConfig`, `ModelBundleSelection`, `ExperimentBundle` — and bind them together
via a `ProfileBundle` + `composeProfile()` composition path.

After Phase 3:
- A new paper baseline is added by writing a `ProfileBundle` (scenario + model selections + parameter defaults) and its default `ExperimentBundle`, without touching any other profile or file.
- The same `ProfileBundle` can be composed with different `ExperimentBundle` objects to produce independent runs (different seeds, durations, or KPI targets).
- `ProfileConfig` remains as the flat compatibility alias; `engine.ts`, `loader.ts`, and all runner code need zero changes in Phase 3.
- All 14 current profiles pass the `composeProfile()` round-trip gate (VAL-PLAT-007).
- `tier3_5_scan_loss` dead field is deleted (ST-1 / DEAD classification from §0B.6).

---

## 2. Scope

### 2.1 In Scope

| In scope | Authority reference |
|---|---|
| `ScenarioConfig` type definition | `phase0-architecture-spec.md §0B.6` S-classified fields |
| `ModelBundleSelection` type definition | `phase0-architecture-spec.md §0B.6` MB-classified fields |
| `ExperimentBundle` type definition | `phase0-architecture-spec.md §0B.6` E-classified fields |
| `ProfileBundle` type definition | `phase0-architecture-spec.md §0B.1` Profile vocabulary |
| `composeProfile(bundle, exp): ProfileConfig` shim | `phase0-architecture-spec.md §0C.1 Phase 3 P3-2` |
| `decomposeProfile(config): { bundle, exp }` reverse shim | §6 this SDD |
| Rewrite 14 profiles using `composeProfile()` (Group 2, step P3-3) | `phase0-architecture-spec.md §0C.1 Phase 3 P3-3` |
| Delete `tier3_5_scan_loss` dead field (Group 2, step P3-7) | `phase0-architecture-spec.md §0B.6` DEAD classification |
| VAL-PLAT-006 / VAL-PLAT-007 validation gates (Group 2) | §9 this SDD |
| Split `defaults.ts` into per-family files (Group 3, step P3-4) | `phase0-architecture-spec.md §0C.1 Phase 3 P3-4` |

### 2.2 Not In Scope — Phase 3 Does NOT Do These

| Out of scope | Responsible phase |
|---|---|
| `engine.ts` signature change (still accepts flat `ProfileConfig`) | Phase 4 |
| `loader.ts` external API change | Phase 4 |
| Runtime contract freeze (`src/core/contracts/runtime-v1.ts`) | Phase 4 |
| `ControlPanel.PROFILE_OPTIONS` replacement with exposure API call | Phase 4 P4-7 |
| `sourceMap[]` removal from `ProfileConfig` / `ProfileBundle` | Phase 5 P5-7 |
| `composeProfile()` shim deletion | Phase 5 P5-7 |
| `benchmark-runner.ts` orbit bootstrap migration | Phase 5 P5-4 |
| Model-family implementations changed or new variants added | Phase 2 (complete) |
| MODQN / estnet-ui integration | Phase 5+ per `agent-governance.md §3` |

**DECISION POINT — resolved:** `ProfileConfig` remains a flat struct (the composed result); `engine.ts` signature does NOT change in Phase 3. The composed types become the authoring surface; the flat struct remains the execution surface. Engine signature change is Phase 4 scope. This is the "DECISION POINT" from `phase0-architecture-spec.md §0C.1 Phase 3`.

---

## 3. Relationship to Phase 2 Outputs

Phase 2 produced `ModelBundle` (runtime object) and `buildModelBundle(profile: ProfileConfig): ModelBundle`.

`ModelBundleSelection` (Phase 3 output) is the **declarative config record** — not the runtime object:

| Type | Layer | Purpose |
|---|---|---|
| `ModelBundleSelection` | L3 Scenario/Profile/Experiment | Which families are requested (declarative, authored) |
| `ModelBundle` | L4 Runtime Core | Which interfaces are instantiated (runtime, computed) |

`buildModelBundle` continues to read from the flat `ProfileConfig` (which `composeProfile` produces) to build the `ModelBundle`. Phase 3 does not change this data flow.

---

## 4. Type Definitions

This section is the **operative authority** for Phase 3 Group 2 implementation.
Where any prior SDD or §0B drafts conflict with this section, **this section takes precedence.**

All new types are exported from `src/core/profiles/types.ts`.
`ProfileConfig` remains unchanged in `src/core/profiles/types.ts`.

---

### 4.1 ScenarioConfig

Physical and environmental description of one simulation situation.
Contains all `S`-classified fields from `phase0-architecture-spec.md §0B.6`.

```typescript
/**
 * ScenarioConfig — physical/environmental description.
 *
 * Defines: orbit mode, observer, scenario epoch, constellation topology
 * extensions, and UE spatial distribution.
 *
 * Does NOT contain:
 *   - P-classified numeric parameters (altitude_km, frequency_ghz, ttt_ms …)
 *   - MB-classified model selections (tier flags, handover.type, antenna.model …)
 *   - E-classified experiment controls (seed, durationSec, tleMaxSatellites …)
 *
 * Storage location: ProfileBundle.scenario
 * Authority: phase0-architecture-spec.md §0B.6 S-classified fields
 * Import rule: may import from core/common/types.ts and core/orbit/types.ts (shared primitives).
 */
interface ScenarioConfig {
  /** Orbit computation mode. 'synthetic' = Walker analytic; 'real-trace' = TLE/SGP4. */
  orbitMode: OrbitMode;
  /**
   * Path to OMM JSON file. Required when orbitMode === 'real-trace'.
   * Must not be set when orbitMode === 'synthetic'.
   */
  tleDataPath?: string;
  /** Observer location (lat/lon/alt) for geometry and sky-projection. */
  observer: ObserverLocation;
  /**
   * Scenario start epoch in UTC milliseconds.
   * Defines WHEN the simulation begins (orbital position, channel state).
   * Run duration and step are in ExperimentBundle.timeControl — NOT here.
   * Rationale: the same epoch is a reproducible physical setup; different
   * experiments may run for different durations at the same epoch.
   */
  epochUtcMs: number;
  /**
   * Constellation topology extensions (S-classified).
   *
   * NOTE: The primary Walker shell parameters
   *   (altitude_km, inclination_deg, num_planes, sats_per_plane,
   *    raan_spread_deg, phase_offset_deg)
   * are P-classified and live in ProfileBundle.orbital, not here.
   * Only topology extensions beyond the primary shell are S-classified:
   *   - orbitType (regime tag: leo/meo/geo)
   *   - extra_shells (multi-shell Walker)
   *   - geoSatellites (GEO relay satellites merged with Walker)
   * When absent, defaults apply: orbitType='leo', no extra shells, no GEO.
   */
  orbitalTopology?: {
    /** Orbit regime of the primary shell. Default: 'leo'. */
    orbitType?: OrbitType;
    /** Additional Walker shells beyond the primary. */
    extra_shells?: Array<{
      id: string;
      altitude_km: number;
      inclination_deg: number;
      num_planes: number;
      sats_per_plane: number;
      phasing_factor?: number;
      orbitType?: OrbitType;
    }>;
    /** GEO fixed-position satellites merged alongside the Walker constellation. */
    geoSatellites?: GeoStationaryConfig[];
  };
  /**
   * UE spatial distribution.
   * count and distribution define the scenario topology (S).
   * speed_kmh is P-classified (scenario-adjacent but sweep-worthy) and lives in ProfileBundle.ueConfig.
   */
  ueTopology: {
    count: number;
    distribution: UeDistribution;
  };
}
```

---

### 4.2 ModelBundleSelection

Declares which model family is selected for each of the 8 bundle slots defined in Phase 2,
plus beam-layout, scheduler, traffic-model sub-selections, and the policy preset.
Contains all `MB`-classified fields from `phase0-architecture-spec.md §0B.6`.

```typescript
/**
 * ModelBundleSelection — declarative model family choices.
 *
 * Contains all MB-classified fields from phase0-architecture-spec.md §0B.6.
 *
 * Distinct from ModelBundle (Phase 2 runtime type):
 *   ModelBundleSelection = "which families are requested" (static config record)
 *   ModelBundle           = "which interfaces are instantiated" (runtime object)
 *
 * buildModelBundle() reads these fields (via composed ProfileConfig)
 * to select concrete implementations. Phase 3 does not change that mapping.
 *
 * Storage location: ProfileBundle.models
 * Authority: phase0-architecture-spec.md §0B.6 MB-classified fields
 */
interface ModelBundleSelection {
  /** Beam semantics: earth-moving (scanning) or earth-fixed-bh (beam hopping). */
  beamSemantics: BeamSemantics;

  /** Beam gain model family. */
  antenna: {
    /** Which pattern function computes G(θ). */
    model: 'rpsat-3gpp' | 'bessel-j1' | 'itu-r' | 'flat-debug';
  };

  /** Beam layout and scheduling family selections. */
  beam: {
    /** Spatial arrangement of beam footprints. */
    layout: 'hexagonal' | 'circular' | 'custom';
    /**
     * BH scheduler strategy.
     * Only meaningful when beamSemantics === 'earth-fixed-bh'.
     * Default: 'round-robin' when absent.
     */
    bh_strategy?: 'round-robin' | 'max-demand' | 'power-aware' |
      'deterministic-fixed' | 'proportional-fair' | 'sinr-greedy';
    /**
     * Traffic demand model for demand-aware BH schedulers.
     * Default: 'full-buffer' when absent.
     */
    bh_traffic_model?: 'poisson' | 'full-buffer' | 'hotspot' | 'uniform';
  };

  /** Channel model tier enable flags and path-loss family variant. */
  channel: {
    /**
     * Tier 0: FSPL — always enabled; not a configurable toggle.
     * Value must always be literal `true`. Included here for round-trip
     * completeness; composeProfile writes `tier0_fspl: true` unconditionally.
     */
    tier0_fspl: true;
    tier1_large_scale: boolean;
    tier2_clutter: boolean;
    tier3_beam_gain: boolean;
    tier4_atmospheric: boolean;
    tier5_fading: boolean;
    tier6_doppler?: boolean;
    /** Path loss family variant used when tier1_large_scale = true. */
    large_scale_model?: LargeScaleModel;
  };

  /** Handover algorithm family. */
  handover: {
    /**
     * Which FSM family createHandoverManager() will instantiate.
     * All other handover fields (ttt_ms, hysteresis_db …) are P-classified
     * and live in ProfileBundle.handover.
     */
    type: HandoverType;
  };

  /** Energy model layer enable flags. */
  energy: {
    /** Layer 1: throughput/power EE accounting. */
    layer1_enabled: boolean;
    /** Layer 2: onboard battery/solar energy state machine. */
    layer2_enabled: boolean;
  };

  /** UE model behavior flags. */
  ueConfig: {
    /**
     * Phase B: each UE owns an independent HandoverManager.
     * When false (default / absent), all UEs share one serving satellite.
     */
    independentHandover?: boolean;
  };

  /**
   * Policy preset — declares the default control algorithm for this profile.
   *
   * When absent: defaults to 'no-op' (matches DP-5 ruling from Phase 2).
   * This is a declarative default only; SimEngineConfig.policy still overrides
   * it at engine construction time (DP-5 ruling in phase2-model-bundle-sdd.md §5.7).
   *
   * Group 2 implementors: buildModelBundle() currently ignores any policyId field
   * in ProfileConfig. Add a policyId field to ProfileConfig during P3-1 and update
   * buildModelBundle() to resolve the preset to the correct plugin const when
   * SimEngineConfig.policy is absent.
   */
  policy?: {
    policyId: 'no-op' | 'greedy-sinr' | 'invalid-probe' | string;
  };
}
```

---

### 4.3 ExperimentBundle

Reproducible run definition. Binds a `ProfileBundle` to a specific seed, time window,
and optional KPI targets / artifact controls.
Contains all `E`-classified fields from `phase0-architecture-spec.md §0B.6`.

```typescript
/**
 * ExperimentBundle — reproducible run definition.
 *
 * The same ProfileBundle + different ExperimentBundle = independent experiment.
 * Example: same paper baseline, 10 different seeds → 10 ExperimentBundles,
 * all composed against the same ProfileBundle.
 *
 * Storage location: NOT inside ProfileBundle. Stored alongside it in per-family
 * defaults files as the paper-reported run conditions.
 * Authority: phase0-architecture-spec.md §0B.6 E-classified fields.
 */
interface ExperimentBundle {
  /** RNG seed for reproducible stochastic components. */
  seed: number;
  /**
   * Per-run timing controls.
   * NOTE: epochUtcMs (scenario epoch) is in ScenarioConfig, not here.
   * This struct contains only the duration and step — the "how long to run"
   * controls that vary across experiments on the same scenario.
   */
  timeControl: {
    durationSec: number;
    stepSec: number;
  };
  /**
   * Maximum TLE satellites to load from the OMM JSON file.
   * Only meaningful when ScenarioConfig.orbitMode === 'real-trace'.
   * Default: 200 when absent.
   * Classified E because it is a performance cap, not a physical parameter.
   */
  tleMaxSatellites?: number;
  /**
   * Optional KPI targets for automated reproduction verification.
   * Used by scripts/run-reproduction-comparison.ts and validate:reproduction.
   * Absent for profiles that do not have reproduction targets.
   */
  kpiTargets?: Array<{
    metric: string;
    target: number;
    tolerance: number;
    toleranceMode: 'absolute' | 'relative';
  }>;
  /**
   * Artifact recording policy.
   * Absent = use runner defaults (emit replayManifest and sourceTrace).
   */
  artifactPolicy?: {
    recordReplayManifest: boolean;
    recordSourceTrace: boolean;
    maxSnapshotHistory?: number;
  };
}
```

---

### 4.4 ProfileBundle

Named, versioned paper baseline. Contains profile metadata (PM), one `ScenarioConfig` (S),
one `ModelBundleSelection` (MB), and all 58 P-classified parameter defaults.
Does NOT contain E-classified experiment controls.

```typescript
/**
 * ProfileBundle — named, versioned paper baseline.
 *
 * This is the authoring unit for a new paper baseline:
 *   - write one ProfileBundle (scenario + model selections + P-params)
 *   - write one default ExperimentBundle (paper-reported run conditions)
 *   - call composeProfile(bundle, exp) to get the ProfileConfig used at runtime
 *
 * Does NOT contain:
 *   - seed, durationSec, stepSec, tleMaxSatellites (→ ExperimentBundle)
 *   - kpiTargets, artifactPolicy (→ ExperimentBundle)
 *
 * Storage location: per-family files (see §8.3 for split plan).
 * Assembled into ProfileConfig via composeProfile(bundle, exp).
 * Reverse operation: decomposeProfile(config): { bundle, exp }.
 * Authority: phase0-architecture-spec.md §0B.1 Profile vocabulary + §0B.6.
 */
interface ProfileBundle {
  // ── Profile metadata (PM) ────────────────────────────────────────────
  id: string;
  family: ProfileFamily;
  version: string;
  /**
   * Exposure preset: where this profile appears in the UI tier hierarchy.
   * Replaces the hardcoded label/tier data in ControlPanel.PROFILE_OPTIONS
   * (Phase 4 P4-7 will consume this field to drive the profile list).
   * Group 2: populate from ControlPanel.PROFILE_OPTIONS current values.
   */
  exposurePreset: {
    /** Overall UI tier for this profile. Used by Phase 4 getProfileList(). */
    tier: SpecMode;   // 'Realistic' | 'Advanced' | 'Sensitivity' | 'Internal-only'
    /** Human-readable display name for ControlPanel. */
    label: string;
  };

  // ── Physical/environment (S) ─────────────────────────────────────────
  scenario: ScenarioConfig;

  // ── Model family selections (MB) ─────────────────────────────────────
  models: ModelBundleSelection;

  // ── Parameter defaults (P — 58 PARAM-* values) ───────────────────────
  //
  // Sub-struct split rationale:
  //   Fields that are P-classified live here under their original sub-struct name.
  //   Fields that are MB-classified within the same sub-struct have moved to models.*
  //   Fields that are S-classified have moved to scenario.*
  //   Fields that are E-classified have moved to exp.* (ExperimentBundle).
  //   See §5 field mapping table for the complete per-field disposition.

  /** Primary Walker constellation P-params (6 fields). */
  orbital: {
    altitude_km: number;
    inclination_deg: number;
    num_planes: number;
    sats_per_plane: number;
    raan_spread_deg: number;
    phase_offset_deg: number;
    // NOTE: orbitType → scenario.orbitalTopology.orbitType
    // NOTE: extra_shells → scenario.orbitalTopology.extra_shells
    // NOTE: geoSatellites → scenario.orbitalTopology.geoSatellites
  };

  /** RF / link budget P-params (8 fields; all RfConfig fields are P-classified). */
  rf: {
    frequency_ghz: number;
    bandwidth_mhz: number;
    eirp_density_dbw_per_mhz: number;  // isDerived=true per PARAM-RF-EIRP-DENSITY
    tx_power_per_beam_dbm?: number;
    max_tx_power_dbm: number | null;
    noise_temperature_k: number;
    noise_figure_db?: number;
    implementation_loss_db?: number;
  };

  /**
   * Antenna P-params (2 fields).
   * NOTE: antenna.model → models.antenna.model
   */
  antenna: {
    peak_gain_dbi: number;
    beam_diameter_km: number;
  };

  /**
   * Beam P-params (8 fields).
   * NOTE: beam.layout → models.beam.layout
   * NOTE: beam.bh_strategy → models.beam.bh_strategy
   * NOTE: beam.bh_traffic_model → models.beam.bh_traffic_model
   */
  beam: {
    num_beams: number;
    frf: number;
    interference_beams: number;
    bh_max_active_per_slot?: number;
    bh_frame_duration_sec?: number;
    bh_slots_per_frame?: number;
    bh_power_budget_w?: number;
    bh_traffic_arrival_rate?: number;
  };

  /**
   * Channel P-params (3 fields).
   * NOTE: all tier flags + large_scale_model → models.channel.*
   * NOTE: tier3_5_scan_loss → DELETED in step P3-7 (DEAD classification)
   */
  channel: {
    deployment_environment?: DeploymentEnvironment;
    los_elevation_deg?: number;
    subcarrier_spacing_khz?: number;
  };

  /**
   * Handover P-params (21 fields).
   * NOTE: handover.type → models.handover.type
   */
  handover: {
    trigger_threshold_db: number;
    a3_offset_db?: number;
    ttt_ms: number;
    hysteresis_db: number;
    min_elevation_deg: number;
    pingPongWindowSec?: number;
    cho_offset_db?: number;
    cho_alpha?: number;
    cho_filter_k?: number;
    daps_preparation_time_sec?: number;
    daps_max_dual_active_sec?: number;
    mc_max_dual_sec?: number;
    mc_packet_duplication?: boolean;
    d2_serving_dist_km?: number;
    d2_target_dist_km?: number;
    sinr_ema_alpha?: number;
    rlf_qout_db?: number;
    rlf_qin_db?: number;
    rlf_n310?: number;
    rlf_n311?: number;
    rlf_t310_ms?: number;
  };

  /**
   * Energy P-params (9 fields: energy_per_handover_j + 8 layer2_overrides keys).
   * NOTE: energy.layer1_enabled → models.energy.layer1_enabled
   * NOTE: energy.layer2_enabled → models.energy.layer2_enabled
   */
  energy: {
    energy_per_handover_j?: number;
    layer2_overrides?: {
      batteryCapacityWh?: number;
      initialSoc?: number;
      solarPowerW?: number;
      blockingThresholdSoc?: number;
      orbitalPeriodSec?: number;
      shadowFraction?: number;
      altitudeKm?: number;
      betaAngleDeg?: number;
    };
  };

  /**
   * UE P-params (1 field: speed_kmh).
   * NOTE: ueConfig.count → scenario.ueTopology.count
   * NOTE: ueConfig.distribution → scenario.ueTopology.distribution
   * NOTE: ueConfig.independentHandover → models.ueConfig.independentHandover
   */
  ueConfig: {
    speed_kmh: number;
  };

  // ── Provenance (PM — transitional) ──────────────────────────────────
  /**
   * Source references for KPI-impacting defaults.
   * Transitional: Phase 1 registry is now the canonical reference; this
   * field is kept in ProfileBundle for backwards compat until Phase 5 P5-7.
   * Do NOT remove it in Phase 3.
   */
  sourceMap: SourceReference[];
}
```

---

## 5. ProfileConfig → New Vocabulary Field Mapping

Complete field-level disposition for every field in the current `ProfileConfig`.
Use this table in Group 2 to implement `composeProfile()` and `decomposeProfile()`.

**Legend:**
- `bundle.X` — field of `ProfileBundle.X`
- `bundle.scenario.X` — field of `ProfileBundle.scenario` (`ScenarioConfig`)
- `bundle.models.X` — field of `ProfileBundle.models` (`ModelBundleSelection`)
- `exp.X` — field of `ExperimentBundle`
- `DELETED` — removed in step P3-7 (DEAD field)

| Old `ProfileConfig` field | New location | Notes |
|---|---|---|
| `id` | `bundle.id` | PM |
| `family` | `bundle.family` | PM |
| `version` | `bundle.version` | PM |
| `orbitMode` | `bundle.scenario.orbitMode` | S |
| `tleDataPath` | `bundle.scenario.tleDataPath` | S — real-trace only |
| `tleMaxSatellites` | `exp.tleMaxSatellites` | E — performance limit |
| `beamSemantics` | `bundle.models.beamSemantics` | MB |
| `observer` | `bundle.scenario.observer` | S |
| `timeControl.epochUtcMs` | `bundle.scenario.epochUtcMs` | S — scenario epoch |
| `timeControl.durationSec` | `exp.timeControl.durationSec` | E |
| `timeControl.stepSec` | `exp.timeControl.stepSec` | E |
| `seed` | `exp.seed` | E |
| `orbital.altitude_km` | `bundle.orbital.altitude_km` | P |
| `orbital.inclination_deg` | `bundle.orbital.inclination_deg` | P |
| `orbital.num_planes` | `bundle.orbital.num_planes` | P |
| `orbital.sats_per_plane` | `bundle.orbital.sats_per_plane` | P |
| `orbital.raan_spread_deg` | `bundle.orbital.raan_spread_deg` | P |
| `orbital.phase_offset_deg` | `bundle.orbital.phase_offset_deg` | P |
| `orbital.orbitType` | `bundle.scenario.orbitalTopology.orbitType` | S |
| `orbital.extra_shells` | `bundle.scenario.orbitalTopology.extra_shells` | S |
| `orbital.geoSatellites` | `bundle.scenario.orbitalTopology.geoSatellites` | S |
| `rf.frequency_ghz` | `bundle.rf.frequency_ghz` | P |
| `rf.bandwidth_mhz` | `bundle.rf.bandwidth_mhz` | P |
| `rf.eirp_density_dbw_per_mhz` | `bundle.rf.eirp_density_dbw_per_mhz` | P (isDerived=true) |
| `rf.tx_power_per_beam_dbm` | `bundle.rf.tx_power_per_beam_dbm` | P |
| `rf.max_tx_power_dbm` | `bundle.rf.max_tx_power_dbm` | P |
| `rf.noise_temperature_k` | `bundle.rf.noise_temperature_k` | P |
| `rf.noise_figure_db` | `bundle.rf.noise_figure_db` | P |
| `rf.implementation_loss_db` | `bundle.rf.implementation_loss_db` | P |
| `antenna.model` | `bundle.models.antenna.model` | MB |
| `antenna.peak_gain_dbi` | `bundle.antenna.peak_gain_dbi` | P |
| `antenna.beam_diameter_km` | `bundle.antenna.beam_diameter_km` | P |
| `beam.num_beams` | `bundle.beam.num_beams` | P |
| `beam.layout` | `bundle.models.beam.layout` | MB |
| `beam.frf` | `bundle.beam.frf` | P |
| `beam.interference_beams` | `bundle.beam.interference_beams` | P |
| `beam.bh_max_active_per_slot` | `bundle.beam.bh_max_active_per_slot` | P |
| `beam.bh_frame_duration_sec` | `bundle.beam.bh_frame_duration_sec` | P |
| `beam.bh_slots_per_frame` | `bundle.beam.bh_slots_per_frame` | P |
| `beam.bh_strategy` | `bundle.models.beam.bh_strategy` | MB |
| `beam.bh_power_budget_w` | `bundle.beam.bh_power_budget_w` | P |
| `beam.bh_traffic_model` | `bundle.models.beam.bh_traffic_model` | MB |
| `beam.bh_traffic_arrival_rate` | `bundle.beam.bh_traffic_arrival_rate` | P |
| `channel.tier0_fspl` | `bundle.models.channel.tier0_fspl` | MB (always `true`) |
| `channel.tier1_large_scale` | `bundle.models.channel.tier1_large_scale` | MB |
| `channel.tier2_clutter` | `bundle.models.channel.tier2_clutter` | MB |
| `channel.tier3_beam_gain` | `bundle.models.channel.tier3_beam_gain` | MB |
| `channel.tier3_5_scan_loss` | `DELETED` | DEAD — removed in P3-7 |
| `channel.tier4_atmospheric` | `bundle.models.channel.tier4_atmospheric` | MB |
| `channel.tier5_fading` | `bundle.models.channel.tier5_fading` | MB |
| `channel.tier6_doppler` | `bundle.models.channel.tier6_doppler` | MB |
| `channel.large_scale_model` | `bundle.models.channel.large_scale_model` | MB |
| `channel.deployment_environment` | `bundle.channel.deployment_environment` | P (scenario-adjacent) |
| `channel.los_elevation_deg` | `bundle.channel.los_elevation_deg` | P |
| `channel.subcarrier_spacing_khz` | `bundle.channel.subcarrier_spacing_khz` | P |
| `handover.type` | `bundle.models.handover.type` | MB |
| `handover.trigger_threshold_db` | `bundle.handover.trigger_threshold_db` | P |
| `handover.a3_offset_db` | `bundle.handover.a3_offset_db` | P |
| `handover.ttt_ms` | `bundle.handover.ttt_ms` | P |
| `handover.hysteresis_db` | `bundle.handover.hysteresis_db` | P |
| `handover.min_elevation_deg` | `bundle.handover.min_elevation_deg` | P |
| `handover.pingPongWindowSec` | `bundle.handover.pingPongWindowSec` | P |
| `handover.cho_offset_db` | `bundle.handover.cho_offset_db` | P |
| `handover.cho_alpha` | `bundle.handover.cho_alpha` | P |
| `handover.cho_filter_k` | `bundle.handover.cho_filter_k` | P |
| `handover.daps_preparation_time_sec` | `bundle.handover.daps_preparation_time_sec` | P |
| `handover.daps_max_dual_active_sec` | `bundle.handover.daps_max_dual_active_sec` | P |
| `handover.mc_max_dual_sec` | `bundle.handover.mc_max_dual_sec` | P |
| `handover.mc_packet_duplication` | `bundle.handover.mc_packet_duplication` | P |
| `handover.d2_serving_dist_km` | `bundle.handover.d2_serving_dist_km` | P |
| `handover.d2_target_dist_km` | `bundle.handover.d2_target_dist_km` | P |
| `handover.sinr_ema_alpha` | `bundle.handover.sinr_ema_alpha` | P |
| `handover.rlf_qout_db` | `bundle.handover.rlf_qout_db` | P |
| `handover.rlf_qin_db` | `bundle.handover.rlf_qin_db` | P |
| `handover.rlf_n310` | `bundle.handover.rlf_n310` | P |
| `handover.rlf_n311` | `bundle.handover.rlf_n311` | P |
| `handover.rlf_t310_ms` | `bundle.handover.rlf_t310_ms` | P |
| `energy.layer1_enabled` | `bundle.models.energy.layer1_enabled` | MB |
| `energy.layer2_enabled` | `bundle.models.energy.layer2_enabled` | MB |
| `energy.energy_per_handover_j` | `bundle.energy.energy_per_handover_j` | P |
| `energy.layer2_overrides.batteryCapacityWh` | `bundle.energy.layer2_overrides.batteryCapacityWh` | P |
| `energy.layer2_overrides.initialSoc` | `bundle.energy.layer2_overrides.initialSoc` | P |
| `energy.layer2_overrides.solarPowerW` | `bundle.energy.layer2_overrides.solarPowerW` | P |
| `energy.layer2_overrides.blockingThresholdSoc` | `bundle.energy.layer2_overrides.blockingThresholdSoc` | P |
| `energy.layer2_overrides.orbitalPeriodSec` | `bundle.energy.layer2_overrides.orbitalPeriodSec` | P |
| `energy.layer2_overrides.shadowFraction` | `bundle.energy.layer2_overrides.shadowFraction` | P |
| `energy.layer2_overrides.altitudeKm` | `bundle.energy.layer2_overrides.altitudeKm` | P |
| `energy.layer2_overrides.betaAngleDeg` | `bundle.energy.layer2_overrides.betaAngleDeg` | P |
| `ueConfig.count` | `bundle.scenario.ueTopology.count` | S |
| `ueConfig.distribution` | `bundle.scenario.ueTopology.distribution` | S |
| `ueConfig.speed_kmh` | `bundle.ueConfig.speed_kmh` | P |
| `ueConfig.independentHandover` | `bundle.models.ueConfig.independentHandover` | MB |
| `sourceMap` | `bundle.sourceMap` | PM — transitional; removed in Phase 5 P5-7 |

**Compatibility-only transitional fields** (kept through Phase 3, removed in Phase 5):

| Field | Phase 3 treatment | Removal |
|---|---|---|
| `ProfileConfig.sourceMap[]` | Preserved in `ProfileBundle.sourceMap`; `composeProfile` passes it through | Phase 5 P5-7 after registry is authority |
| `ProfileConfig` flat struct | Kept as-is; still the runtime type consumed by engine, loader, runner | Never removed (becomes a composed alias when Phase 4/5 callers migrate) |

---

## 6. compose / decompose API

### 6.1 `composeProfile(bundle, exp): ProfileConfig`

```typescript
/**
 * composeProfile — assemble a flat ProfileConfig from a ProfileBundle + ExperimentBundle.
 *
 * This is the ONLY correct way to produce a ProfileConfig from the new typed objects.
 * It is the compatibility shim that lets engine.ts, loader.ts, and all runners
 * continue to accept ProfileConfig without change.
 *
 * Rules:
 *   1. Every field of the returned ProfileConfig must trace to exactly one source
 *      (bundle or exp) per the §5 mapping table. No value may be hardcoded.
 *   2. The returned ProfileConfig must be structurally identical to what
 *      defaults.ts previously defined for the same profile. VAL-PLAT-007
 *      verifies this with a deep-equality round-trip check.
 *   3. `tier0_fspl` is always `true` in the returned channel config (not
 *      taken from bundle.models.channel.tier0_fspl, which must already be true).
 *   4. `timeControl` is assembled from BOTH sources:
 *        epochUtcMs   ← bundle.scenario.epochUtcMs
 *        durationSec  ← exp.timeControl.durationSec
 *        stepSec      ← exp.timeControl.stepSec
 *   5. `orbital` is assembled from BOTH sources:
 *        P-params   ← bundle.orbital.*
 *        orbitType  ← bundle.scenario.orbitalTopology?.orbitType (omit if absent)
 *        extra_shells ← bundle.scenario.orbitalTopology?.extra_shells (omit if absent)
 *        geoSatellites ← bundle.scenario.orbitalTopology?.geoSatellites (omit if absent)
 *   6. `antenna`, `beam`, `channel`, `handover`, `energy`, `ueConfig` sub-structs are
 *      assembled by merging P-params (from bundle.*) + MB selections (from bundle.models.*).
 *      See assembly details in §6.3.
 *   7. Undefined optional fields must be omitted from the result (not set to `undefined`)
 *      to preserve strict equality in VAL-PLAT-007.
 *
 * Storage location: src/core/profiles/profile-composer.ts
 * Authority: phase0-architecture-spec.md §0C.1 Phase 3 step P3-2
 */
function composeProfile(bundle: ProfileBundle, exp: ExperimentBundle): ProfileConfig;
```

### 6.2 `decomposeProfile(config): { bundle, exp }`

```typescript
/**
 * decomposeProfile — extract ProfileBundle + ExperimentBundle from a flat ProfileConfig.
 *
 * This is the inverse of composeProfile. It is used:
 *   1. By VAL-PLAT-007 to verify round-trip identity.
 *   2. By any future loader or editor that needs to inspect the typed decomposition.
 *
 * Rules:
 *   1. For every field in ProfileConfig, the §5 mapping table is the authority
 *      for which output object the field goes into.
 *   2. `composeProfile(decomposeProfile(config).bundle, decomposeProfile(config).exp)`
 *      must deep-equal the original `config` for all 14 profiles (VAL-PLAT-007).
 *   3. Absent optional fields in ProfileConfig become absent in the bundle/exp as well
 *      (not set to `undefined`).
 *   4. `bundle.exposurePreset` is NOT in ProfileConfig. For Phase 3, decomposeProfile
 *      derives it from a static lookup table in profile-composer.ts that maps profileId
 *      to { tier, label } (populated from current ControlPanel.PROFILE_OPTIONS values).
 *      Phase 4 will move this metadata into ProfileBundle's persisted form.
 *
 * Storage location: src/core/profiles/profile-composer.ts
 */
function decomposeProfile(config: ProfileConfig): { bundle: ProfileBundle; exp: ExperimentBundle };
```

### 6.3 Sub-struct Assembly Rules for `composeProfile`

The following rules apply when assembling the mixed-vocabulary sub-structs in the
composed `ProfileConfig`. "Omit if absent" means: do NOT set the key to `undefined`;
use the spread operator only when the source value is defined.

| Sub-struct in `ProfileConfig` | Assembly rule |
|---|---|
| `orbital` | Spread `bundle.orbital.*` (all P), then conditionally spread: `orbitType` from `orbitalTopology?.orbitType`; `extra_shells` from `orbitalTopology?.extra_shells`; `geoSatellites` from `orbitalTopology?.geoSatellites`. |
| `rf` | Spread `bundle.rf` directly (all RfConfig fields are P). |
| `antenna` | Set `model` from `bundle.models.antenna.model`; set `peak_gain_dbi`, `beam_diameter_km` from `bundle.antenna`. |
| `beam` | Spread `bundle.beam.*` (P-params); set `layout` from `bundle.models.beam.layout`; conditionally set `bh_strategy` from `bundle.models.beam.bh_strategy`; conditionally set `bh_traffic_model` from `bundle.models.beam.bh_traffic_model`. |
| `channel` | Spread `bundle.models.channel.*` (tier flags); spread `bundle.channel.*` (P-params: deployment_environment, los_elevation_deg, subcarrier_spacing_khz). `tier3_5_scan_loss` is absent from both sources (field deleted in P3-7). |
| `handover` | Set `type` from `bundle.models.handover.type`; spread `bundle.handover.*` (all 21 P-params). |
| `energy` | Set `layer1_enabled` from `bundle.models.energy.layer1_enabled`; set `layer2_enabled` from `bundle.models.energy.layer2_enabled`; spread `bundle.energy.*` (energy_per_handover_j, layer2_overrides). |
| `ueConfig` | Set `count` from `bundle.scenario.ueTopology.count`; set `distribution` from `bundle.scenario.ueTopology.distribution`; set `speed_kmh` from `bundle.ueConfig.speed_kmh`; conditionally set `independentHandover` from `bundle.models.ueConfig.independentHandover`. |
| `timeControl` | Set `epochUtcMs` from `bundle.scenario.epochUtcMs`; `durationSec` and `stepSec` from `exp.timeControl`. |

---

## 7. loader.ts Boundary Decision

**Rule for Phase 3:** `loader.ts` is **unchanged**. Its external API still accepts and returns `ProfileConfig`. Internally it reads from `DEFAULT_PROFILES` dict which, after P3-3, produces the same `ProfileConfig` values via `composeProfile()`.

**Rule for Phase 4:** The Phase 4 exposure API will add a `loadProfileBundle(id): ProfileBundle` function alongside the existing `loadProfile(id): ProfileConfig`. The existing path is not touched. This is explicitly NOT Phase 3 scope.

---

## 8. Implementation Steps

### 8.1 Group 2 — Types, Composer, Profile Rewrites, VAL Gates

Each step must leave `npm run validate:stage` green.
Steps must be done in order; do not skip ahead.

| Step | Files | Action |
|---|---|---|
| P3-1 | `src/core/profiles/types.ts` | Add `ScenarioConfig`, `ModelBundleSelection`, `ExperimentBundle`, `ProfileBundle` type definitions (§4 of this SDD). `ProfileConfig` stays exactly as-is. Add `policyId` field to `ProfileConfig` as optional string (for DP-5 resolution — see §4.2 policy note). Do NOT remove any existing type. |
| P3-2 | `src/core/profiles/profile-composer.ts` (new) | Implement `composeProfile(bundle, exp): ProfileConfig` and `decomposeProfile(config): { bundle, exp }` (§6). Export both functions. Add static `PROFILE_EXPOSURE_PRESETS` lookup table mapping profile ID → `{ tier, label }` (populated from current `ControlPanel.PROFILE_OPTIONS` values). |
| P3-3 | `src/core/profiles/defaults.ts` | Rewrite all 14 profiles to be constructed via `composeProfile()` internally. The exported `ProfileConfig` value must be identical to the current value (VAL-PLAT-007 verifies this). Do NOT split the file yet (that is P3-4 in Group 3). Keep `DEFAULT_PROFILES` export and all 14 `export const` names. |
| P3-7 | `src/core/profiles/types.ts` | Remove `tier3_5_scan_loss?: boolean` from `ChannelConfig`. Also remove it from any profile object in `defaults.ts` that currently sets it. Verify `npm run validate:stage` green after this step. |
| P3-6a | `src/core/profiles/types.ts` | After P3-7: update the `@deprecated` comment on `ProfileConfig.sourceMap` to reference Phase 5 P5-7 as the removal target. No runtime change. |
| P3-8a | `scripts/validate-profiles.mjs` (augmented) | Add VAL-PLAT-006 check: verify `ScenarioConfig`, `ModelBundleSelection`, `ExperimentBundle`, `ProfileBundle` are all exported from `profiles/types.ts`, and `composeProfile`/`decomposeProfile` are exported from `profile-composer.ts`. Add VAL-PLAT-007 check: for each entry in `DEFAULT_PROFILES`, run `decomposeProfile` → `composeProfile` and assert deep equality. Wire `validate:profiles` into `validate:stage` if not already wired. |

**Permitted deviations for Group 2:** Steps P3-3 may be batched per profile family (access first, then hobs, bh, misc) as long as each batch leaves `validate:stage` green. P3-7 must come after P3-3. P3-8a must be the final step.

**Prohibited deviations for Group 2:**
- Do not split `defaults.ts` into per-family files (that is Group 3 step P3-4).
- Do not change `engine.ts`, `loader.ts`, `runner/`, or any `viz/` file.
- Do not delete `ProfileConfig` or change its field layout.
- Do not add `tier3_5_scan_loss` back under any name.

### 8.2 Group 3 — File Split and loader.ts Preparation

Group 3 begins only after Group 2 is complete and VAL-PLAT-006/007 pass.

| Step | Files | Action |
|---|---|---|
| P3-4a | `src/core/profiles/defaults-access.ts` (new) | Move: `CASE9_ACCESS_BASELINE`, `CASE9_DAPS_BASELINE`, `SINR_ELEVATION_REPRODUCTION`, `TIMER_CHO_REPRODUCTION`. Each exports the full `ProfileConfig` constant (still using `composeProfile` internally). |
| P3-4b | `src/core/profiles/defaults-hobs.ts` (new) | Move: `HOBS_MULTIBEAM_BASELINE`, `HOBS_REPRODUCTION`. |
| P3-4c | `src/core/profiles/defaults-bh.ts` (new) | Move: `BH_RESOURCE_BASELINE`, `BH_RESOURCE_ENERGY_PROOF`, `BH_PF_BASELINE`, `BH_SINR_GREEDY_BASELINE`. |
| P3-4d | `src/core/profiles/defaults-misc.ts` (new) | Move: `REAL_TRACE_VALIDATION`, `MEO_CONSTELLATION_BASELINE`, `GEO_RELAY_BASELINE`, `REALISTIC_FIRST_SCREEN`. |
| P3-4e | `src/core/profiles/defaults.ts` | Replace content with re-exports from all 4 per-family files; keep `DEFAULT_PROFILES` assembled from re-exported constants. Shared observer constants (`BEIJING_OBSERVER` etc.) stay in `defaults.ts` or move to a new `observers.ts` (implementor's choice; must not break imports). |
| P3-4f | `src/core/profiles/index.ts` | Update barrel export if needed to ensure `DEFAULT_PROFILES` is still accessible at `@/core/profiles`. |

**Validation:** After P3-4e, run `npm run validate:stage`. VAL-PLAT-005 (buildModelBundle for all 14 profiles) and VAL-PLAT-007 (round-trip) must both pass. This confirms the file split did not alter any profile values.

**Note on loader.ts:** No changes to `loader.ts` are required in Group 3. The `DEFAULT_PROFILES` dict is still the runtime profile store; the file split is transparent.

### 8.3 Profile Family → File Mapping

| File | Profiles | Family tag |
|---|---|---|
| `defaults-access.ts` | case9-access-baseline, case9-daps-baseline, sinr-elevation-reproduction, timer-cho-reproduction | case9 / DAPS / reproduction |
| `defaults-hobs.ts` | hobs-multibeam-baseline, hobs-reproduction | HOBS multibeam |
| `defaults-bh.ts` | bh-resource-baseline, bh-resource-energy-proof, bh-pf-baseline, bh-sinr-greedy-baseline | Beam hopping |
| `defaults-misc.ts` | real-trace-validation, meo-constellation-baseline, geo-relay-baseline, realistic-first-screen | Misc / showcase |

---

## 9. Acceptance Criteria — VAL-PLAT-006 and VAL-PLAT-007

Both gates are implemented in `scripts/validate-profiles.mjs` (augmented in step P3-8a)
and wired into `npm run validate:stage` via `validate:profiles` in `package.json`.

---

### VAL-PLAT-006 — New Types Exist, Are Distinct, No Circular Imports

**Category:** scenario split
**Phase:** 3
**Script:** `scripts/validate-profiles.mjs` (augmented)

**Checks:**
1. `src/core/profiles/types.ts` exports all four required types:
   - `ScenarioConfig` (interface or type)
   - `ModelBundleSelection` (interface or type)
   - `ExperimentBundle` (interface or type)
   - `ProfileBundle` (interface or type)
2. `src/core/profiles/profile-composer.ts` exports both:
   - `composeProfile` (function)
   - `decomposeProfile` (function)
3. No circular import between the new types and `engine.ts`, `viz/`, or `app/`:
   - Parse import statements in `profile-composer.ts`; assert no import from `engine.ts`, `src/viz/`, `src/app/`, `src/runner/`.
   - Parse import statements in `profiles/types.ts`; assert no new imports from L4–L7 layers introduced by Phase 3 changes.
4. `ProfileConfig` still exists and is exported from `profiles/types.ts`.

**Expected output (pass):**
```
VAL-PLAT-006: PASS — ScenarioConfig, ModelBundleSelection, ExperimentBundle, ProfileBundle exported from profiles/types.ts
VAL-PLAT-006: PASS — composeProfile, decomposeProfile exported from profile-composer.ts
VAL-PLAT-006: PASS — no circular imports in Phase 3 new files
VAL-PLAT-006: PASS — ProfileConfig still exported from profiles/types.ts
```

**Expected output (fail example):**
```
VAL-PLAT-006: FAIL — missing type export: ExperimentBundle not found in profiles/types.ts
VAL-PLAT-006: FAIL — circular import detected: profile-composer.ts imports from src/app/hooks
```

**Implementation note:** Use regex `/export\s+(interface|type|function|const)\s+ScenarioConfig\b/` on `profiles/types.ts` text for type checks. Use `fs.readFileSync` + regex for import checks. Do not run the TypeScript compiler from within this script.

---

### VAL-PLAT-007 — All 14 Profiles Pass `composeProfile()` Round-Trip

**Category:** scenario split
**Phase:** 3
**Script:** `scripts/validate-profiles.mjs` (augmented)

**Validation object:** `DEFAULT_PROFILES` dict from `src/core/profiles/defaults.ts`

**Checks:**
For each profile `P` in `Object.values(DEFAULT_PROFILES)`:
1. Call `decomposeProfile(P)` → `{ bundle, exp }`.
2. Call `composeProfile(bundle, exp)` → `P_recomposed`.
3. Assert: `deepEqual(P_recomposed, P)` — every field of the original `ProfileConfig` is present with the same value in the recomposed result.
4. Assert: `P_recomposed` has no extra fields not present in `P` (no field insertion by compose).

**What "deepEqual" means for this gate:**
- Recursive structural equality for all plain value types.
- `Date` objects compared by `getTime()`.
- Arrays compared element-by-element in order.
- `undefined` and absent key are treated as equivalent (both = absent).
- `sourceMap[]` entries compared by `{ tier, id, parameterPath, specMode }` tuple equality.

**What "composeProfile compatibility acceptable" means:**
The gate passes when all 14 profiles satisfy the round-trip check above. A profile "passes" if and only if its full `ProfileConfig` content is faithfully reconstructable from its decomposed parts. Profiles that currently set `tier3_5_scan_loss` will have that field absent in the round-trip result after P3-7 — this is expected and acceptable (the field is deleted, not round-tripped).

**What "Scenario/Profile/Experiment split complete" means:**
The split is complete when:
1. VAL-PLAT-006 passes (types exist, no circular imports).
2. VAL-PLAT-007 passes (all 14 profiles round-trip).
3. `npm run validate:stage` passes all pre-existing gates (VAL-PLAT-001 through VAL-PLAT-005, VAL-GOLDEN-001/002, all E-level golden cases).
4. No profile in `DEFAULT_PROFILES` uses the direct-struct literal form for fields that the §5 mapping table assigns to `ScenarioConfig`, `ModelBundleSelection`, or `ExperimentBundle` — they must go through `composeProfile()`.

**Expected output (pass):**
```
VAL-PLAT-007: PASS — composeProfile round-trip verified for all 14 profiles
```

**Expected output (fail example):**
```
VAL-PLAT-007: FAIL — round-trip mismatch for profile "hobs-multibeam-baseline":
  expected: channel.tier3_beam_gain = true
  got:      channel.tier3_beam_gain = undefined
  Fix: check ModelBundleSelection.channel.tier3_beam_gain in composeProfile assembly
```

**Implementation note:** Run under `node --import tsx` (same pattern as `validate:golden-engine`).
Import `DEFAULT_PROFILES`, `composeProfile`, and `decomposeProfile` dynamically.
Use a recursive `deepEqual` helper that handles nested objects and arrays.
Print a diff for the first failing field to aid debugging (full diff if ≤5 fields).

---

## 10. "Phase 3 Complete" — Reviewable Completion Criteria

A reviewer can declare Phase 3 complete by verifying all six conditions:

| # | Condition | How to verify |
|---|---|---|
| 1 | `ScenarioConfig`, `ModelBundleSelection`, `ExperimentBundle`, `ProfileBundle` exported from `profiles/types.ts` | `grep "export interface" src/core/profiles/types.ts` — all four must appear |
| 2 | `composeProfile`, `decomposeProfile` exported from `src/core/profiles/profile-composer.ts` | `ls src/core/profiles/profile-composer.ts` + `grep "export function" profile-composer.ts` |
| 3 | VAL-PLAT-006 and VAL-PLAT-007 pass | `npm run validate:profiles` exits 0; both print PASS |
| 4 | All pre-existing VAL-* checks still pass | `npm run validate:stage` exits 0; in particular VAL-PLAT-001 through 005, VAL-GOLDEN-001/002, all E-level golden cases |
| 5 | `tier3_5_scan_loss` field does not appear in `profiles/types.ts` or `defaults*.ts` | `grep -r "tier3_5_scan_loss" src/core/profiles/` returns nothing |
| 6 | This file's status header updated to `"Complete"` and `ntn-sim-core-implementation-status.md §1b` Phase 3 row = ✅ complete | Read both files |

No other conditions apply. In particular, Phase 3 completion does NOT require:
- `engine.ts` to accept `(ScenarioConfig, ModelBundleSelection)` separately (Phase 4)
- `loader.ts` to expose `loadProfileBundle()` (Phase 4)
- `sourceMap[]` to be removed (Phase 5)
- `composeProfile()` shim to be deleted (Phase 5)
- ControlPanel updated to use `getProfileList()` (Phase 4)

---

## 11. Migration Boundaries Between Groups

### Group 2 delivers:
- `profiles/types.ts` — four new type exports; `ProfileConfig` unchanged; `tier3_5_scan_loss` deleted.
- `profiles/profile-composer.ts` (new) — `composeProfile` + `decomposeProfile` + exposure preset lookup table.
- `profiles/defaults.ts` — same file, all 14 profiles rewritten using `composeProfile` internally; same exported values and names.
- `scripts/validate-profiles.mjs` — VAL-PLAT-006/007 checks added and wired.
- `package.json` — `validate:profiles` wired into `validate:stage` if not already present.

### Group 3 delivers:
- `profiles/defaults-access.ts`, `defaults-hobs.ts`, `defaults-bh.ts`, `defaults-misc.ts` (four new files) — profile constants moved by family.
- `profiles/defaults.ts` — becomes re-export index; shared observer constants stay here or move to `observers.ts`.
- `profiles/index.ts` — updated barrel if needed.
- `validate:stage` must remain green throughout.

### When does `defaults.ts` begin splitting?
Only in Group 3, after Group 2 is complete and VAL-PLAT-007 passes.
Do not split before `composeProfile()` is in place and verified. Splitting first would make it harder to verify the round-trip.

### When does `loader.ts` accept composed types?
Not in Phase 3. `loader.ts` continues accepting flat `ProfileConfig`. A new `loadProfileBundle(id): ProfileBundle` path is Phase 4 scope.

### What is not Phase 3's job at all?
- Freezing runtime contract types → Phase 4
- Wiring `getProfileList()` → Phase 4
- Removing `sourceMap[]` from `ProfileConfig` → Phase 5 P5-7
- Splitting `engine.ts` → Phase 5 P5-1/P5-2
- Implementing MODQN / estnet-ui → Phase 5+ gating

---

## 12. SDD Update Obligations on Phase 3 Completion

When Phase 3 is declared complete (all six conditions in §10 satisfied), the following
documents must be updated **in the same change set**:

1. This file: status header → `"Complete — Group 2 and Group 3 done"`
2. `sdd/ntn-sim-core-implementation-status.md §1b`: Phase 3 row → `✅ complete`
3. `sdd/ntn-sim-core-validation-matrix.md §2`: VAL-PLAT-006/007 rows → confirmed; add script name and coverage note
4. `sdd/ntn-sim-core-implementation-status.md §5`: add passing rows for VAL-PLAT-006/007
5. `sdd/ntn-sim-core-profile-baselines.md`: add note that profiles are now authored as `ProfileBundle + ExperimentBundle` pairs; no value changes required unless composition exposed an inconsistency

---

## 13. Relationship to Phase 0B/0C and Phase 1/2 Outputs

| Phase 3 decision | Authority source |
|---|---|
| `ScenarioConfig` S-classified fields | `phase0-architecture-spec.md §0B.6` S column |
| `ModelBundleSelection` MB-classified fields | `phase0-architecture-spec.md §0B.6` MB column |
| `ExperimentBundle` E-classified fields | `phase0-architecture-spec.md §0B.6` E column |
| `ProfileBundle` = PM + S + MB + P (no E) | `phase0-architecture-spec.md §0B.1` Profile definition |
| `exposurePreset` field in `ProfileBundle` | `phase0-architecture-spec.md §0A.3` AC-5, UI-3, DL-3 — tier metadata must become machine-readable |
| `policy` field in `ModelBundleSelection` | `phase0-architecture-spec.md §0B.1` "one policy selection" in Profile; Phase 2 DP-5 ruling |
| `ProfileConfig` stays as flat alias | `phase0-architecture-spec.md §0C.1 Phase 3` DECISION POINT resolution |
| `composeProfile()` shim lifetime: Phase 3 P3-2 → Phase 5 P5-7 | `phase0-architecture-spec.md §0C.2 profiles/types.ts` compatibility shim lifetime |
| `tier3_5_scan_loss` deleted in Phase 3 | `phase0-architecture-spec.md §0B.6` DEAD classification + `§0C.1 Phase 3 P3-7` |
| `defaults.ts` split in Phase 3 Group 3 | `phase0-architecture-spec.md §0C.1 Phase 3 P3-4` |
| loader.ts unchanged; API change deferred to Phase 4 | `phase0-architecture-spec.md §0C.2 profiles/defaults.ts` |
| `sourceMap[]` kept through Phase 3 | `phase0-architecture-spec.md §0C.2` "legacy-path deletion: Phase 5 P5-7" |
