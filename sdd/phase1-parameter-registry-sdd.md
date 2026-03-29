# Phase 1 — Parameter Registry SDD

**Status:** Complete — Group 1 (SDD) and Group 2 (implementation) both done; VAL-PLAT-001/002/003 passing
**Date (v1 — full spec):** 2026-03-29
**Date (v1.1 — critical schema fixes):** 2026-03-29 — SourceTier vocabulary corrected; paper-sources.json nested-structure resolution; exposureMode fallback rule; energy.layer2_overrides.* expanded to 8 keys; coverage count 50→58; phase0 §0B.4/§0B.6/§0C.3 authority-synced
**Date (v1.2 — count fix + authority sync):** 2026-03-29 — 57→58 corrected everywhere; phase0 operative-schema note added; OP-3 sourceTier short-form removed; Data Flow / §11 count references updated
**Depends on:** Phase 0 complete (`phase0-architecture-spec.md §0C.7`)

---

## 1. Goal

Replace scattered TSDoc provenance annotations in `ProfileConfig` with a single, machine-readable parameter registry.

After Phase 1 is complete:
- Every KPI-impacting parameter has a `PARAM-*` registry ID, a `GlobalParameterSpec`, and at least one `ProfileParameterBinding`.
- A validation script can mechanically verify that every `P`-classified field from `§0B.6` is registered and that every binding's `sourceId` resolves in `paper-sources.json`.
- The existing `defaults.ts` `sourceMap[]` annotations are still the runtime authority (they are **not** deleted in Phase 1), but the registry is now the canonical reference layer that supersedes them.

---

## 2. Scope

Phase 1 scope is exactly:

| In scope | Out of scope |
|---|---|
| `GlobalParameterSpec[]` canonical schema | UI implementation (Phase 4) |
| `ProfileParameterBinding[]` per-(parameter × profile) bindings | Model-family interface extraction (Phase 2) |
| `ParameterEntry[]` convenience wrapper | `ProfileConfig` / `ScenarioConfig` split (Phase 3) |
| PARAM-* namespace assignment for all `P`-classified fields from `§0B.6` | `defaults.ts` structural changes |
| `paper-sources.json` additions for missing PAP-*/ASSUME-* IDs | `ProfileConfig` type changes |
| `scripts/validate-parameter-registry.mjs` validation script | `engine.ts` changes of any kind |
| `validate:registry` wired into `validate:stage` | External contract freeze (Phase 4) |

This scope is defined in `phase0-architecture-spec.md §0C.1 Phase 1` and is non-negotiable in Phase 1. If an item is listed as out-of-scope here and in Phase 0C, it must not be done in Phase 1, even partially.

---

## 3. Schema — Formal Specification

This section is the Phase 1 implementation authority for the two-layer registry schema.
The schema was drafted in `phase0-architecture-spec.md §0B.4`; the text below is the operative version for implementation.

### 3.1 GlobalParameterSpec

One record per KPI-impacting parameter. Profile-agnostic.

```typescript
/**
 * GlobalParameterSpec — profile-agnostic registry record for one KPI-impacting parameter.
 *
 * Storage location: exported as GlobalParameterSpec[] from
 *   src/core/config/parameter-registry.ts
 *
 * PARAM-* namespace rule: id MUST begin with "PARAM-". The namespace is
 * distinct from ASSUME-*/PAP-*/STD-* and must never overlap with them.
 * validate-parameter-registry.mjs enforces this (VAL-PLAT-003).
 *
 * Shared-primitives import rule: this file may import SourceTier and SpecMode
 * from src/core/common/types.ts (shared-primitives module). It must NOT import
 * from profiles/, engine.ts, runner/, viz/, app/, or any L2–L7 layer
 * (see phase0-architecture-spec.md §0B.3).
 */
interface GlobalParameterSpec {
  // ── Identity ─────────────────────────────────────────────────────────
  /**
   * Unique registry ID. MUST use PARAM-* prefix.
   * Example: "PARAM-RF-FREQ-GHZ"
   * No PARAM-* ID may equal any key in the combined source registry
   * (all keys from the "papers", "standards", and "assumptions" sections
   * of paper-sources.json — including non-STD-* prefixed entries such as
   * "3GPP-NTN-ACCESS"). Enforced by VAL-PLAT-003.
   */
  id: string;

  /**
   * Dotted path in ProfileConfig.
   * Example: "rf.frequency_ghz"
   * Used to align registry entries with sourceMap[].parameterPath in defaults.ts,
   * and to produce the Phase 5 migration map when sourceMap[] is finally removed.
   */
  parameterPath: string;

  /**
   * Human-readable name for UI display and audit reports.
   * Example: "Carrier Frequency"
   */
  semanticName: string;

  // ── Value metadata ────────────────────────────────────────────────────
  /**
   * SI unit or null for dimensionless quantities.
   * Examples: "GHz", "dBm", "km", "ms", "W", null
   */
  unit: string | null;

  /**
   * Allowed continuous range, if applicable.
   * Mutually exclusive with presetList.
   * Used by Phase 4 exposure contract for slider/input validation.
   */
  allowedRange?: { min: number; max: number };

  /**
   * Allowed discrete preset list, if applicable.
   * Mutually exclusive with allowedRange.
   * Used by Phase 4 exposure contract for dropdown rendering.
   */
  presetList?: Array<{ value: string | number; label: string }>;

  /**
   * True when this value is computed at runtime from other parameters.
   * Derived parameters must NOT be exposed as independent UI controls or sweep axes.
   * Example: rf.eirp_density_dbw_per_mhz (derived from tx_power + peak_gain - impl_loss).
   * Derived parameters ARE registered for audit completeness; isDerived=true is the flag.
   */
  isDerived: boolean;

  /**
   * Optional conditional dependency expressed as a plain-English rule.
   * Example: "only active when channel.tier4_atmospheric = true"
   * Phase 4 exposure contract uses this to conditionally show/hide the parameter.
   * Phase 1 may leave this null; it is not required for VAL-PLAT-001/002/003.
   */
  dependencyRule?: string;

  // ── Vocabulary classification ─────────────────────────────────────────
  /**
   * Which vocabulary layer this parameter belongs to (from phase0-architecture-spec.md §0B.1).
   *
   * 'scenario'      — describes the physical/environmental situation
   *                   (e.g. orbital.altitude_km, channel.deployment_environment)
   * 'model-bundle'  — controls which physics equation family is active
   *                   (e.g. antenna.peak_gain_dbi as input to beam-gain model)
   * 'experiment'    — reproducibility controls (e.g. seed, duration — excluded from
   *                   registry; see §4 non-goals)
   *
   * NOTE: 'profile-metadata' is NOT a valid value here.
   * Profile identity fields (id, family, version) are NOT ParameterEntries.
   * MB-classified fields from §0B.6 are model-bundle selections, not parameters;
   * they are NOT registered as ParameterEntries either (see §4 non-goals).
   */
  vocabularyLayer: 'scenario' | 'model-bundle' | 'experiment';
}
```

### 3.2 ProfileParameterBinding

One record per (parameter × profile) combination. Carries the provenance and default value for that specific pairing.

```typescript
/**
 * ProfileParameterBinding — per-(parameter × profile) provenance and default value.
 *
 * Storage location: bundled inside ParameterEntry.bindings[], which is
 * exported from src/core/config/parameter-registry.ts.
 *
 * Data source for Phase 1 population:
 *   defaults.ts sourceMap[].tier, .id, .parameterPath, .specMode
 *   → map to sourceTier, sourceId, (via parameterPath) parameterId, exposureMode.
 *
 * Coverage requirement (VAL-PLAT-001):
 *   Every P-classified field in §0B.6 must have at least one binding
 *   (the paper-baseline profile that cites it most directly).
 *   Not every profile needs a binding for every parameter —
 *   only profiles where the parameter has an explicit non-default value
 *   AND a sourceMap entry need a binding in Phase 1.
 *   Universal defaults (same across all profiles) may have a single
 *   binding with profileId = "__universal__" or use the primary citing profile.
 */
interface ProfileParameterBinding {
  /** References GlobalParameterSpec.id (the PARAM-* ID). */
  parameterId: string;

  /**
   * ProfileConfig.id of the profile this binding applies to.
   * Example: "family-access-synth", "family-mb-hobs-synth"
   * Use "__universal__" for parameters whose value does not vary across profiles.
   */
  profileId: string;

  /**
   * Default value for this parameter in this profile.
   * Must match the value in defaults.ts for the corresponding parameterPath.
   * Phase 1 does NOT enforce this programmatically (that is Phase 3 work).
   * The audit script validate-parameter-registry.mjs checks sourceId resolution,
   * not value parity.
   */
  defaultValue: number | string | boolean | null;

  // ── Provenance ────────────────────────────────────────────────────────
  /**
   * Source tier backing this default value in this profile.
   * From SourceTier in src/core/common/types.ts (shared-primitives).
   * Actual values (from types.ts:21):
   *   'normative' | 'paper-backed' | 'standard-backed' | 'assumption-backed'
   * NOTE: do NOT use 'paper' / 'standard' / 'assumption' (short forms) —
   * they do not exist in the live SourceTier union and will cause a TS error.
   * Map from defaults.ts sourceMap[].tier:
   *   'paper-backed'       → sourceTier: 'paper-backed'
   *   'standard-backed'    → sourceTier: 'standard-backed'
   *   'assumption-backed'  → sourceTier: 'assumption-backed'
   *   'normative'          → sourceTier: 'normative'
   */
  sourceTier: SourceTier;

  /**
   * ID from paper-sources.json that justifies this default.
   * MUST resolve in paper-sources.json (enforced by VAL-PLAT-002).
   * If a required ID does not yet exist in paper-sources.json, add it in Step P1-5
   * before the binding is committed.
   *
   * ID prefixes in use (from paper-sources.json sections):
   *   PAP-*          — entries under the "papers" section
   *   STD-*          — entries under the "standards" section (most standard IDs)
   *   ASSUME-*       — entries under the "assumptions" section
   *   Other (e.g. "3GPP-NTN-ACCESS") — also entries under "standards"; non-STD-*
   *                   prefixes are valid and must NOT be rejected by the validator.
   *
   * VAL-PLAT-002 resolves IDs by building a Set from ALL keys nested under
   * paper-sources.json "papers", "standards", and "assumptions" sections combined,
   * NOT from the top-level JSON keys (which are the section names themselves).
   */
  sourceId: string;

  /**
   * Optional locator detail within the source.
   * Examples: "Table III, row 5", "Eq. (12)", "§4.2 simulation parameters"
   * Recommended but not required for VAL-PLAT-002.
   */
  sourceNote?: string;

  // ── Exposure ──────────────────────────────────────────────────────────
  /**
   * UI exposure tier for this (parameter, profile) pair.
   * From SpecMode in src/core/common/types.ts (shared-primitives).
   * Values: 'Realistic' | 'Advanced' | 'Sensitivity' | 'Internal-only'
   *
   * The same parameter can have different exposure modes in different profiles.
   * Example: rf.frequency_ghz is 'Realistic' in the access family (paper-backed S-band)
   * but 'Advanced' in a BH profile that uses an assumed Ka-band value.
   *
   * Phase 4 exposure API uses this field to filter ParameterView objects.
   * Phase 1 must populate it faithfully from defaults.ts sourceMap[].specMode.
   *
   * FALLBACK RULE (for sourceMap entries with parameterPath but no specMode):
   * Many sourceMap entries carry a parameterPath but no specMode field.
   * In these cases use the following deterministic fallback:
   *   sourceTier = 'paper-backed'      → exposureMode: 'Realistic'
   *   sourceTier = 'standard-backed'   → exposureMode: 'Realistic'
   *   sourceTier = 'normative'         → exposureMode: 'Realistic'
   *   sourceTier = 'assumption-backed' → exposureMode: 'Advanced'
   * This rule mirrors the implicit intent of validate-specmode-gating.mjs
   * (see scripts/validate-specmode-gating.mjs) and must not be overridden
   * with a different per-implementor heuristic.
   * When specMode IS present in sourceMap, it always takes precedence.
   */
  exposureMode: SpecMode;
}
```

### 3.3 ParameterEntry (convenience wrapper)

```typescript
/**
 * ParameterEntry — convenience wrapper bundling a GlobalParameterSpec
 * with all of its ProfileParameterBindings.
 *
 * This is the top-level unit exported from parameter-registry.ts.
 * External consumers (Phase 4 exposure API, validation scripts) iterate
 * ParameterEntry[] and join spec + bindings as needed.
 *
 * NOT a flat merged record. GlobalParameterSpec and ProfileParameterBinding
 * are separate because exposureMode and sourceTier are per-profile.
 */
interface ParameterEntry {
  spec: GlobalParameterSpec;
  bindings: ProfileParameterBinding[];
}

// parameter-registry.ts top-level export:
// export const PARAMETER_REGISTRY: ParameterEntry[];
```

---

## 4. What Phase 1 Registers and What It Does Not

### 4.1 What Gets Registered (P-classified fields)

All fields from `phase0-architecture-spec.md §0B.6` classified as `P` (parameter values) must have a `ParameterEntry` in Phase 1. The complete list of **58** P-classified paths is:

**Orbital:**
`orbital.altitude_km`, `orbital.inclination_deg`, `orbital.num_planes`, `orbital.sats_per_plane`, `orbital.raan_spread_deg`, `orbital.phase_offset_deg`

**RF:**
`rf.frequency_ghz`, `rf.bandwidth_mhz`, `rf.eirp_density_dbw_per_mhz` (isDerived=true), `rf.tx_power_per_beam_dbm`, `rf.max_tx_power_dbm`, `rf.noise_temperature_k`, `rf.noise_figure_db`, `rf.implementation_loss_db`

**Antenna:**
`antenna.peak_gain_dbi`, `antenna.beam_diameter_km`

**Beam:**
`beam.num_beams`, `beam.frf`, `beam.interference_beams`, `beam.bh_max_active_per_slot`, `beam.bh_frame_duration_sec`, `beam.bh_slots_per_frame`, `beam.bh_power_budget_w`, `beam.bh_traffic_arrival_rate`

**Channel:**
`channel.deployment_environment`, `channel.los_elevation_deg`, `channel.subcarrier_spacing_khz`

**Handover:**
`handover.trigger_threshold_db`, `handover.a3_offset_db`, `handover.ttt_ms`, `handover.hysteresis_db`, `handover.min_elevation_deg`, `handover.pingPongWindowSec`, `handover.cho_offset_db`, `handover.cho_alpha`, `handover.cho_filter_k`, `handover.daps_preparation_time_sec`, `handover.daps_max_dual_active_sec`, `handover.mc_max_dual_sec`, `handover.mc_packet_duplication`, `handover.d2_serving_dist_km`, `handover.d2_target_dist_km`, `handover.sinr_ema_alpha`, `handover.rlf_qout_db`, `handover.rlf_qin_db`, `handover.rlf_n310`, `handover.rlf_n311`, `handover.rlf_t310_ms`

**Energy:**
`energy.energy_per_handover_j`,
`energy.layer2_overrides.batteryCapacityWh`, `energy.layer2_overrides.initialSoc`,
`energy.layer2_overrides.solarPowerW`, `energy.layer2_overrides.blockingThresholdSoc`,
`energy.layer2_overrides.orbitalPeriodSec`, `energy.layer2_overrides.shadowFraction`,
`energy.layer2_overrides.altitudeKm`, `energy.layer2_overrides.betaAngleDeg`
(8 keys — verified from `profiles/types.ts:419`; see §10 OP-2 for resolution rationale)

**UE:**
`ueConfig.speed_kmh`

Total: **58** `P`-classified paths (51 original explicit paths before this fix + 7 net additions
from `energy.layer2_overrides.*` → 8 specific keys, replacing the former single-wildcard entry;
51 - 1 + 8 = 58).
The inline constant in `scripts/validate-parameter-registry.mjs` must list all 58 paths.
The VAL-PLAT-001 pass message must reflect the actual count, not "50" or "57".

### 4.2 What Does NOT Get Registered in Phase 1

| Field class | Classification | Reason for exclusion |
|---|---|---|
| Profile metadata: `id`, `family`, `version` | PM | Not parameters; profile identity fields |
| Scenario config: `orbitMode`, `observer`, `tleDataPath`, `orbital.extra_shells`, etc. | S | Scenario layer, not parameter layer |
| MB selection flags: `beamSemantics`, `antenna.model`, `beam.layout`, `beam.bh_strategy`, `channel.tier*`, `handover.type`, `energy.layer1_enabled`, `ueConfig.independentHandover`, etc. | MB | Model-bundle selections, not value parameters |
| Experiment controls: `seed`, `timeControl.durationSec`, `timeControl.stepSec`, `tleMaxSatellites` | E | Experiment layer |
| Dead field: `channel.tier3_5_scan_loss` | DEAD | Scheduled for Phase 5 deletion; do not register |
| `sourceMap[]` itself | PM (transitional) | Annotation container, not a parameter |

**Critical:** `MB`-classified fields are model-family selections, not parameters. Do not register `antenna.model = "rpsat-3gpp"` as a `ParameterEntry` — the model-family interface is Phase 2 scope.

### 4.3 Transitional Compatibility (what stays untouched)

The following remain read-only in Phase 1. They are the data-collection source for registry population but must not be modified:

| Artifact | Phase 1 treatment | When removed |
|---|---|---|
| `defaults.ts` `sourceMap[]` annotations | Read-only; data source for `ProfileParameterBinding` values | Phase 5 P5-7 (after registry is authority and contracts are frozen) |
| `ProfileConfig` in `profiles/types.ts` | Read-only | Phase 3 (vocabulary split) |
| `profiles/defaults.ts` profile objects | Read-only | Phase 3 (per-family split) + Phase 5 |
| `profiles/loader.ts` | Read-only | Phase 3 |
| `engine.ts` | No changes | Phase 2 (interfaces) + Phase 5 (split) |

**Rule:** Phase 1 is additive only. No existing file is modified except `paper-sources.json` (to add missing IDs) and `package.json` (to add `validate:registry` to the stage chain).

---

## 5. Ordered Implementation Steps

These steps map directly to `phase0-architecture-spec.md §0C.1 Phase 1`. Each step must leave `npm run validate:stage` green.

| Step | File | Action | Reversibility |
|---|---|---|---|
| P1-1 | `src/core/config/parameter-registry.ts` (new) | Create file; export empty `PARAMETER_REGISTRY: ParameterEntry[] = []`. Add `GlobalParameterSpec`, `ProfileParameterBinding`, `ParameterEntry` type definitions (matching §3 exactly). Import `SourceTier`, `SpecMode` from `src/core/common/types.ts` only. | Fully additive |
| P1-2 | `src/core/config/parameter-registry.ts` | Populate orbital.* entries (6 parameters) from `defaults.ts` sourceMap. | Additive |
| P1-3 | `src/core/config/parameter-registry.ts` | Populate rf.*, antenna.*, beam.* entries (~16 parameters). | Additive |
| P1-4 | `src/core/config/parameter-registry.ts` | Populate channel.*, handover.*, energy.*, ueConfig.* entries (~28 parameters). | Additive |
| P1-5 | `src/core/config/paper-sources.json` | Add missing PAP-*/ASSUME-*/STD-* entries required by any new `ProfileParameterBinding.sourceId` that is not yet in the file. | Additive |
| P1-6 | `scripts/validate-parameter-registry.mjs` (new) | Implement three checks corresponding to VAL-PLAT-001/002/003 (see §6). | New file |
| P1-7 | `package.json` | Add `"validate:registry": "node scripts/validate-parameter-registry.mjs"` and wire into `validate:stage`. | Additive |

**Permitted deviations for Group 2 implementors:** Steps P1-2 through P1-4 may be batched into fewer commits if each commit leaves `validate:stage` green. The step order within P1-2/3/4 is advisory.

**Prohibited deviations:** Steps P1-1 and P1-6/P1-7 must not be merged; P1-1 must land first.

---

## 6. Acceptance Criteria — VAL-PLAT-001, VAL-PLAT-002, VAL-PLAT-003

### VAL-PLAT-001 — Registry Non-Empty and Coverage Complete

**Category:** parameter registry
**Phase:** 1
**Script:** `scripts/validate-parameter-registry.mjs`

**Validation object:**
`src/core/config/parameter-registry.ts` → exported `PARAMETER_REGISTRY: ParameterEntry[]`

**Check:**
1. `PARAMETER_REGISTRY.length > 0`
2. Every `P`-classified `parameterPath` from `phase0-architecture-spec.md §0B.6` is represented by at least one `ParameterEntry.spec.parameterPath` in the registry.
3. Every `ParameterEntry.bindings.length >= 1` (no spec without at least one binding).

**Known scope limitation (not a Phase 1 blocker):**
VAL-PLAT-001 verifies that every parameter has at least one binding, but does NOT
mechanically verify that every profile that has an explicit non-default value AND a
sourceMap entry for this parameter has its own binding. A registry with only `__universal__`
bindings would pass this gate even if profile-specific provenance is absent.
This is an accepted Phase 1 limitation. A stricter `(profileId, parameterPath)` completeness
check is deferred to a future gate (not yet assigned a VAL-PLAT-* ID). Reviewers performing
manual spot-checks should verify that parameters known to vary across profiles (e.g.
`rf.frequency_ghz`, `orbital.altitude_km`) carry per-profile bindings, not only
`__universal__` entries.

**Expected output (pass):**
```
VAL-PLAT-001: PASS — 58 parameter entries found; all P-classified paths covered
VAL-PLAT-001: PASS — All 58 entries have at least one binding
```

**Expected output (fail):**
```
VAL-PLAT-001: FAIL — missing parameterPath(s): orbital.raan_spread_deg, handover.rlf_t310_ms
```

**Required files for this check to run:**
- `src/core/config/parameter-registry.ts` must exist and export `PARAMETER_REGISTRY`
- `src/core/config/paper-sources.json` must exist (used indirectly)

**Implementation note for the script:** The canonical P-classified path list is the `§0B.6` table. The script must embed this list as an **inline constant array** inside `scripts/validate-parameter-registry.mjs` — do NOT import it from a separate JSON file or from the registry itself. The inline constant is the single source of truth for VAL-PLAT-001; if §0B.6 ever changes, the constant must be updated in the same commit. Diff the constant against `PARAMETER_REGISTRY.map(e => e.spec.parameterPath)`.

---

### VAL-PLAT-002 — All Binding sourceIds Resolve

**Category:** parameter registry
**Phase:** 1
**Script:** `scripts/validate-parameter-registry.mjs`

**Validation object:**
Every `ProfileParameterBinding.sourceId` across all entries in `PARAMETER_REGISTRY`

**Check:**
Every `sourceId` value must appear as a key in one of the three nested sections of
`src/core/config/paper-sources.json`: `"papers"`, `"standards"`, or `"assumptions"`.

**Expected output (pass):**
```
VAL-PLAT-002: PASS — all <N> sourceId references resolve in paper-sources.json
```

**Expected output (fail):**
```
VAL-PLAT-002: FAIL — unresolved sourceId(s):
  PARAM-HO-CHO-ALPHA (binding for family-mb-hobs-synth): "PAP-2024-HOBS-UNKNOWN" not in paper-sources.json
```

**Required files:**
- `src/core/config/parameter-registry.ts`
- `src/core/config/paper-sources.json`

**Implementation note:** `paper-sources.json` is a **nested** structure with three sections
(`papers`, `standards`, `assumptions`), not a flat key-value file. The top-level JSON keys
are the section names themselves, not the IDs. The script must build the valid-ID set by
collecting keys from all three sections:

```javascript
const src = JSON.parse(fs.readFileSync('src/core/config/paper-sources.json', 'utf8'));
// Only read the three canonical sections. Do NOT use Object.values(src) —
// future _comment/_format/_meta keys could introduce spurious IDs.
const validIds = new Set([
  ...Object.keys(src.papers ?? {}),
  ...Object.keys(src.standards ?? {}),
  ...Object.keys(src.assumptions ?? {}),
]);
```

Note: IDs do not have to follow PAP-*/STD-*/ASSUME-* prefixes — e.g. `"3GPP-NTN-ACCESS"` is
a valid standards entry without the STD-* prefix. The validator must NOT reject an ID solely
because its prefix does not match the section name pattern. If P1-5 was done correctly, this
check should pass on first run.

---

### VAL-PLAT-003 — Namespace Integrity

**Category:** parameter registry
**Phase:** 1
**Script:** `scripts/validate-parameter-registry.mjs`

**Validation object:**
All `GlobalParameterSpec.id` values across `PARAMETER_REGISTRY`

**Checks:**
1. Every `id` begins with `"PARAM-"`.
2. No two `ParameterEntry` objects share the same `spec.id`.
3. No `id` value equals any key in the combined set of all three `paper-sources.json`
   sections (`papers` + `standards` + `assumptions`).
   Use the same `validIds` Set construction as VAL-PLAT-002 (see above).
   This prevents PARAM-* IDs from accidentally colliding with any existing source ID,
   regardless of that ID's prefix convention.

**Expected output (pass):**
```
VAL-PLAT-003: PASS — 58 unique PARAM-* IDs; no namespace collisions
```

**Expected output (fail example 1 — bad prefix):**
```
VAL-PLAT-003: FAIL — non-PARAM-* IDs found: "RF-FREQ-GHZ" (must start with "PARAM-")
```

**Expected output (fail example 2 — collision):**
```
VAL-PLAT-003: FAIL — PARAM-* ID collision with paper-sources.json key: "PARAM-2022-HOBS"
```

**Required files:**
- `src/core/config/parameter-registry.ts`
- `src/core/config/paper-sources.json`

---

### Composite gate: "VAL-PLAT-001/002/003 pass" means

The script `scripts/validate-parameter-registry.mjs` exits with code 0 and all three checks print `PASS`. The script is wired into `npm run validate:stage` via Step P1-7. A reviewer can verify the gate by running `npm run validate:registry` or `npm run validate:stage`.

---

## 7. "Phase 1 Complete" — Reviewable Completion Criteria

A reviewer can declare Phase 1 complete by checking all five conditions below. Each condition is directly verifiable from the repo state without running the simulator.

| # | Condition | How to verify |
|---|---|---|
| 1 | `src/core/config/parameter-registry.ts` exists and exports `PARAMETER_REGISTRY: ParameterEntry[]` | `ls src/core/config/parameter-registry.ts` + `grep "export const PARAMETER_REGISTRY"` |
| 2 | VAL-PLAT-001, VAL-PLAT-002, VAL-PLAT-003 all pass | `npm run validate:registry` exits 0; all three print PASS |
| 3 | `npm run validate:stage` passes (all pre-existing gates still green) | `npm run validate:stage` exits 0 |
| 4 | `ntn-sim-core-implementation-status.md §1b` Platform Refactor Phase 1 row = ✅ complete | Read the table |
| 5 | This file's status header = "Complete" | Read line 3 of this file |

No other conditions apply. In particular, Phase 1 completion does NOT require:
- the registry to be consumed by engine.ts (Phase 2/3)
- the registry to drive any UI (Phase 4)
- `defaults.ts sourceMap[]` to be deleted (Phase 5)

---

## 8. Implementation Boundary Summary

### Phase 1 produces exactly:

1. `src/core/config/parameter-registry.ts` — `ParameterEntry[]` with two-layer schema
2. All `P`-classified fields from `§0B.6` mapped to `PARAM-*` IDs
3. New source-registry entries in `paper-sources.json` as required (added to the appropriate nested section: `papers` for PAP-*, `standards` for STD-* or non-STD-prefixed standard IDs, `assumptions` for ASSUME-*)
4. `scripts/validate-parameter-registry.mjs` — three-check validation script
5. `validate:registry` wired into `validate:stage`

### Phase 1 explicitly does NOT:

1. Modify `profiles/types.ts` or `profiles/defaults.ts` in any way
2. Modify `engine.ts` in any way
3. Create `src/core/models/` (Phase 2)
4. Add UI for parameter display or browsing (Phase 4)
5. Create `src/core/contracts/` (Phase 4)
6. Delete `sourceMap[]` from `defaults.ts` (Phase 5)
7. Create `ScenarioConfig`, `ExperimentBundle`, or `ModelBundleSelection` types (Phase 3)
8. Register `S`-classified, `MB`-classified, `E`-classified, `PM`-classified, or `DEAD`-classified fields
9. Register `ParameterView` or `ParameterMetadataResponse` (Phase 4 exposure types)

### Transitional compatibility during Phase 1:

| Existing artifact | Phase 1 treatment | Will be removed in |
|---|---|---|
| `defaults.ts sourceMap[]` | Read-only reference for binding data collection | Phase 5 P5-7 |
| `ProfileConfig` | No changes | Phase 3 |
| `profiles/loader.ts` | No changes | Phase 3 |
| `engine.ts` | No changes | Phase 2 (interfaces), Phase 5 (split) |
| `ControlPanel.PROFILE_OPTIONS` | No changes | Phase 4 P4-7 |

---

## 9. Data Flow and Relationships

```
Phase 0 outputs (stable, read-only):
  phase0-architecture-spec.md §0B.4  ──→  Schema DRAFT origin for GlobalParameterSpec,
                                           ProfileParameterBinding, ParameterEntry.
                                           IMPORTANT: §0B.4 is the historical draft.
                                           The OPERATIVE schema for implementation is
                                           phase1-parameter-registry-sdd.md §3 (this file).
                                           Where §0B.4 and §3 conflict, §3 takes precedence.
  phase0-architecture-spec.md §0B.6  ──→  P-classified field list (58 paths to register;
                                           §0B.6 wildcard energy.layer2_overrides.* expanded
                                           to 8 specific keys per §10 OP-2 resolution)

Phase 1 data collection source (read-only in Phase 1):
  src/core/profiles/defaults.ts      ──→  sourceMap[]{tier, id, parameterPath, specMode}
  src/core/config/paper-sources.json ──→  PAP-*/STD-*/ASSUME-* ID definitions + descriptions

Phase 1 output (new):
  src/core/config/parameter-registry.ts
    └─ PARAMETER_REGISTRY: ParameterEntry[]
         ├─ spec: GlobalParameterSpec        (one per parameter; id, path, semanticName,
         │                                    unit, range, isDerived, vocabularyLayer)
         └─ bindings: ProfileParameterBinding[] (one per citing profile; defaultValue,
                                                  sourceTier, sourceId, exposureMode)

Phase 1 validation output (new):
  scripts/validate-parameter-registry.mjs
    checks: VAL-PLAT-001 (coverage) + VAL-PLAT-002 (sourceId resolution) +
            VAL-PLAT-003 (namespace integrity)

Downstream consumers (Phase 2 and later):
  Phase 2 model factories      → reference PARAM-* IDs (by string, no import coupling)
  Phase 4 exposure API         → reads PARAMETER_REGISTRY to build ParameterView[]
  Phase 5 migration             → uses parameterPath to remove sourceMap[] from defaults.ts
```

---

## 10. Open Points for Phase 1 Group 2 Implementors

The following points were not fully resolved in Phase 0B and must be decided by the implementor during Phase 1. Each has a recommended resolution and an explicit boundary for when to escalate.

| # | Open point | Recommended resolution | Escalate if... |
|---|---|---|---|
| OP-1 | Universal defaults: some parameters have identical values across all profiles and no profile-specific sourceMap entry. How to represent these? | Use a single binding with `profileId: "__universal__"`. This satisfies VAL-PLAT-001's "at least one binding" requirement and makes the universal-default intent explicit. | If more than 5 parameters need different treatment (e.g. a parameter that has no sourceMap entry at all in defaults.ts), escalate before proceeding. |
| OP-2 | `energy.layer2_overrides.*` is listed in §0B.6 as a P group. These are dynamic sub-fields. How many entries to create? | **Verified 2026-03-29:** `profiles/types.ts:419` defines a static typed struct with exactly 8 optional keys: `batteryCapacityWh`, `initialSoc`, `solarPowerW`, `blockingThresholdSoc`, `orbitalPeriodSec`, `shadowFraction`, `altitudeKm`, `betaAngleDeg`. The structure is NOT dynamic (no index signature). Register these 8 as separate PARAM-* entries with parameterPaths `energy.layer2_overrides.batteryCapacityWh` etc. The count exceeds the original 6-key escalation threshold, but because the shape is fully static and typed, **no escalation is needed.** The original OP-2 suggested paths (`battery_capacity_kwh`, `solar_efficiency`, `panel_area_m2`, `orbital_period_min`) were speculative; use the verified names above. | No escalation needed; shape and keys confirmed. |
| OP-3 | Some handover parameters (e.g. `handover.cho_alpha`, `handover.rlf_*`) may have `sourceTier: 'assumption-backed'` but lack an existing ASSUME-* ID in paper-sources.json. | Create new ASSUME-HO-* IDs in P1-5 following the naming convention from existing entries. Use `sourceTier: 'assumption-backed'` (NOT `'assumption'` — the short form does not exist in the live SourceTier union). | If more than 10 new ASSUME-* IDs need to be created, check with a reviewer that the IDs follow the correct pattern before committing. |
| OP-4 | `rf.noise_temperature_k` was fixed in Phase 0A to use `ASSUME-CUR-002`. Is this confirmed in all profile bindings? | Yes — Phase 0A rev resolved this. Use `ASSUME-CUR-002` for all `noise_temperature_k` bindings. | No escalation needed; this is settled. |

---

## 11. Relationship to Phase 0 Outputs

Every design decision in this SDD traces directly to Phase 0:

| Phase 1 decision | Phase 0 source |
|---|---|
| `GlobalParameterSpec` + `ProfileParameterBinding` two-layer split | `phase0-architecture-spec.md §0B.4` (C1 finding: single flat entry cannot represent per-profile diversity) |
| `PARAM-*` namespace, distinct from PAP-*/STD-*/ASSUME-* | `phase0-architecture-spec.md §0B.4 PARAM-* namespace rule` |
| Import from `core/common/types.ts` only (SourceTier, SpecMode) | `phase0-architecture-spec.md §0B.3 L1 layer boundary` |
| 58 P-classified paths | `phase0-architecture-spec.md §0B.6` (wildcard `energy.layer2_overrides.*` expanded to 8 specific keys per §10 OP-2; §0B.6 count summary updated in same patch) |
| `vocabularyLayer: 'scenario' | 'model-bundle' | 'experiment'` | `phase0-architecture-spec.md §0B.1` vocabulary definitions |
| `sourceMap[]` read-only in Phase 1; removed in Phase 5 | `phase0-architecture-spec.md §0C.1 Phase 1` "What must NOT happen" + `§0C.2 profiles/defaults.ts strategy` |
| Ordered steps P1-1 through P1-7 | `phase0-architecture-spec.md §0C.1 Phase 1` ordered code-change steps |
| VAL-PLAT-001/002/003 gate definitions | `phase0-architecture-spec.md §0C.3` + `ntn-sim-core-validation-matrix.md §2` |
| "Phase 1 complete" five conditions | `phase0-architecture-spec.md §0C.3 "Phase 1 complete"` |

---

## 12. SDD Update Obligations on Phase 1 Completion

When Phase 1 is declared complete (all five conditions in §7 satisfied), the following documents must be updated **in the same change set**:

1. This file: status header → `"Complete"` (line 3)
2. `sdd/ntn-sim-core-implementation-status.md` §1b: Phase 1 row → `✅ complete`
3. `sdd/ntn-sim-core-validation-matrix.md` §2: VAL-PLAT-001, VAL-PLAT-002, VAL-PLAT-003 rows → confirmed; add script name and coverage note
4. `sdd/ntn-sim-core-implementation-status.md` §5: add passing rows for VAL-PLAT-001/002/003

No other documents need to be updated for Phase 1 completion. Phase 2 will update the roadmap and implementation status table further when it completes.
