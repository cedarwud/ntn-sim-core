# UI / Parameter Exposure Specification

> **Role:** Normative specification for which simulator parameters are exposed to users, in which mode, and through which UI mechanism.
>
> **Authority:** This document is subordinate to `simulator-parameter-spec.md` (the canonical parameter authority) and `ntn-sim-core-sdd.md` (the design contract). It translates the spec's Mode Classification (§0) into concrete UI rules.
>
> **Last updated:** 2026-04-15 (truth-preserving showcase default + profile/HO override catalog sync)

---

## 1. Mode Classification (from simulator-parameter-spec.md §0)

| Mode | UI exposure | Who selects it |
|---|---|---|
| **Realistic** | First-screen defaults; profile selector shows these prominently | All users |
| **Advanced** | Profile selector (grouped) + HO override dropdown; clearly labeled `[Adv]` | Researchers comparing against specific papers |
| **Sensitivity** | Profile selector (grouped, last group); reproduction/sweep targets | Validation and ablation analysis |
| **Internal-only** | **Never exposed in UI**; runtime only | Engine internal |

---

## 2. Constraint Rules (globally enforced, spec §0.2)

The following quantities are **never free controls** in any mode:

| Quantity | Why | UI rule |
|---|---|---|
| `elevation angle α` | Determined by Walker propagation or the real-trace SGP4-sampled cache path | Output display only (HUD, scatter plot) |
| `slant range d` | Mathematically linked to α and h_s | Output display only |
| `off-axis angle θ` | Requires 3D beam/UE geometry | Computed internally |
| `path loss L` | Derived from d, f_c, scenario class | Output metric only |
| `noise power N₀` | = k·T_sys; T_sys = T_ant + T₀·(NF−1) | Expose NF (R6) as the control |
| `beam footprint diameter` | = 2H·tan(θ₃dB) in Realistic mode | Derived; no slider |
| `A4 absolute threshold (dBm)` | = noise_floor + Q_out; changes with NF/BW | Derived from profile; no slider |
| `eirpDensityDbwPerMHz` | = P_beam_max · G_T(θ=0); derived reporting quantity | Profile compatibility field only; no UI |
| `systemLossDb = 70 dB` | Retired fudge factor | Must not reappear |

---

## 3. UI Entry Points

### 3.1 Profile Selector (`ControlPanel` → `?profile=` URL param)

The profile selector is the primary user-facing parameter control. It exposes complete parameter bundles rather than individual sliders, preventing users from setting physically inconsistent combinations.

**Implementation:** `getProfileList()` from `src/core/contracts/exposure-v1.ts` (Phase 4 contract). `ControlPanel.tsx` calls `getProfileList()` to derive the selector entries; no hardcoded profile list remains in viz.

**Tier groups (ordered):**

#### Realistic

No active profile currently ships in the `Realistic` selector tier. Paper-safe baseline values still inform individual parameter bindings, but the active interactive catalog is presently split between `Advanced` baselines/showcases and `Sensitivity` reproductions.

#### Advanced

| Profile ID | Label | Key notes |
|---|---|---|
| `case9-access-baseline` | Advanced — Case-9 Access (S-band A4) | S-band 2 GHz, A4 HO, research-facing bounded-steering access baseline |
| `hobs-multibeam-baseline` | Advanced — HOBS Multi-Beam (Ka 28 GHz) | Ka 28 GHz, 37 beams, HOBS Eq. (3)/(4), energy L1, bounded-steering multibeam truth |
| `modqn-paper-baseline` | Advanced — MODQN 2024 Baseline | downstream MODQN bridge/runtime baseline; not the first-screen handover showcase |
| `bh-resource-baseline` | Advanced — BH Resource (Ka 20 GHz) | 780 km, earth-fixed BH, 12 cells |
| `case9-daps-baseline` | Advanced — DAPS Dual-Active | benchmark-facing DAPS/BH access baseline with bounded-steering truth; no longer the interactive default |
| `case9-daps-showcase` | Advanced — DAPS Showcase (truth-preserving) | dedicated first-screen DAPS showcase: same SINR/HO/bounded-steering truth family, but curated epoch + `1 UE` + no BH overload + shorter showcase-only ping-pong/hysteresis envelope for denser readable continuity |
| `real-trace-validation` | Advanced — Real-Trace (OMM/TLE) | Real Starlink OMM/TLE ingest, SGP4-sampled cache-backed validation-sized envelope |
| `meo-constellation-baseline` | Advanced — MEO Constellation | 8062 km MEO, Ka 20 GHz |
| `geo-relay-baseline` | Advanced — GEO Relay | 35786 km GEO, Ku 12 GHz |
| `realistic-first-screen` | Advanced — Ka 20 GHz donor/demo screen (legacy UE-anchored) | 600 km, Ka 20 GHz, FR3, 19 beams, legacy Ka showcase retained for donor/demo continuity rather than research default |

#### Sensitivity (reproduction targets and sweep profiles)

| Profile ID | Label | Purpose |
|---|---|---|
| `sinr-elevation-reproduction` | Sensitivity — SINR-Elevation Repro | PAP-2022-SINR-ELEVATION RT-1 |
| `hobs-reproduction` | Sensitivity — HOBS Repro | PAP-2024-HOBS RT-2 with the same bounded-steering beam semantics as the research baseline |
| `hobs-tr38811-research` | Sensitivity — HOBS TR38.811 Research | HOBS Eq. (4) outer SINR with TR 38.811 Eq. (6.6-3) slant-range path, Table 6.6.1-1 LOS closure, per-UE topocentric geometry, full interferer sum, and beam-associated DPC override where UE evidence exists |
| `timer-cho-reproduction` | Sensitivity — Timer-CHO Repro | PAP-2025-TIMERCHO-CORE RT-3 |
| `bh-pf-baseline` | Sensitivity — BH Proportional-Fair | PF scheduler baseline comparison |
| `bh-sinr-greedy-baseline` | Sensitivity — BH SINR-Greedy | Channel-aware upper-bound baseline |
| `bh-resource-energy-proof` | Sensitivity — BH Energy Proof | Layer 2 proof / browser validation |

Research-facing `earth-moving` profiles now use an authored tracking split rather than one implicit steering rule:

1. `case9-access-baseline`, `case9-daps-baseline`, `case9-daps-showcase`, `hobs-multibeam-baseline`, `hobs-reproduction`, and `hobs-tr38811-research` use `nadir-relative-bounded-steering`.
2. `realistic-first-screen` intentionally keeps legacy `ue-anchored-steering` and should be read as donor/demo-oriented.
3. The steering clamp is profile-authored as `beam.steering_bound_km`; it is not a free UI control.
4. When `Show Beams` is enabled, `EarthMovingBeamLayer`, `EarthFixedCellLayer`, and the overlay package all consume the same `BeamPresentationFrame`; BH cells now follow the frame's primary/context beam picks rather than reopening a per-satellite raw-beam side path.

**Note:** Any future validation-only profile that is intentionally omitted from the selector must still remain accessible via `?profile=<id>` for automation and reviewer reruns.

### 3.2 HO Strategy Override (`ControlPanel` → `hoTypeOverride` state)

Runtime override of the handover type. Overrides the profile's `handover.type` field.

| Option | Mode | Source |
|---|---|---|
| `(profile default)` | — | Inherits profile's `handover.type` |
| `a3-event` | Realistic | TS 38.331 §5.5.4; PAP-2022-A4EVENT-CORE |
| `a4-event` | Realistic | TS 38.331 §5.5.4; PAP-2022-A4EVENT-CORE |
| `sinr-offset` | Advanced | donor-derived / assumption-backed `ASSUME-HO-002` policy surface (legacy `realistic-first-screen` continuity demo path) |
| `cho` | Advanced | PAP-2024-MCCHO-CORE |
| `timer-cho` | Advanced | PAP-2025-TIMERCHO-CORE |
| `mc-ho` | Advanced | PAP-2024-MCCHO-CORE |
| `daps` | Advanced | PAP-2025-DAPS-CORE |
| `hard-ho` | Advanced | Simulator baseline (no-frills HO) |

Advanced options are labeled `[Adv]` in the dropdown. This override is a convenience tool for interactive exploration; paper-claim experiments must use the profile's own `handover.type`.

### 3.3 Playback Controls (`ControlPanel`)

These are **visualization-layer controls** only. They do not affect simulation physics.

| Control | Function | Mode |
|---|---|---|
| Speed (1x/5x/10x/20x) | Simulation playback speed | Visual |
| HO Slow | Auto-clamp playback to 1x while runtime truth exposes a prepared or dual-active handover | Visual |
| Play/Pause | Pause/resume simulation tick | Visual |
| Show Beams | Toggle beam cone visibility | Visual |
| Show Labels | Toggle satellite ID labels (default off for first-screen clarity) | Visual |
| SINR Chart | Toggle SINR time-series overlay | Visual |
| HO Log | Toggle handover event log | Visual |
| SINR CDF | Toggle SINR CDF plot | Visual |
| Elev Scatter | Toggle SINR vs elevation scatter | Visual |
| Replay | Toggle deterministic replay mode | Visual |
| Parameters | Toggle the secondary registry-backed profile panel | Visual |
| Export KPI | Download JSON + CSV of current run KPIs | Output |
| Baseline Viewer | Open the single-run baseline result viewer | Advanced |

### 3.4 URL Query Parameters

| Param | Default | Type | Notes |
|---|---|---|---|
| `?profile=` | `case9-daps-showcase` | string | Profile ID from `DEFAULT_PROFILES` registry |
| `?speed=` | `5` | number | Playback multiplier |
| `?hoSlow=0` | on | flag | Disable automatic slow-motion during prepared / dual-active handover truth |
| `?replay=1` | off | flag | Enable deterministic replay |
| `?replaySeekSec=` | null | number | Seek to time in replay |
| `?validate=1` | off | flag | Show ValidationProbe overlay |
| `?paused=1` | off | flag | Start paused |
| `?showBeams=0` | on | flag | Hide beams on load |
| `?showLabels=1` | off | flag | Enable satellite labels on load |

---

## 4. Parameters NOT Exposed in UI

### 4.1 Internal-only (spec §0)

These parameters exist in profiles for runtime use but must never appear in the UI as adjustable controls:

| Parameter | Spec ID | Current value | Why internal |
|---|---|---|---|
| `noise_temperature_k` | R7 | 290 K | Fixed IEEE/ITU engineering constant |
| `circuitPowerW` (P_c,s) | P3 | — | No LEO-specific corpus value (GAP-2) |
| `paEfficiency` (ρ_s) | P4 | — | No LEO-specific corpus value (GAP-1) |
| `activeBeamPowerW` | P5 | 20 W | Unverified assumption (GAP-5) |
| `idleBeamPowerW` | P6 | 5 W | Unverified assumption (GAP-5) |
| `offBeamPowerW` | P7 | 0.1 W | Unverified assumption (GAP-5) |
| `ueGTdBPerK` | R9 | −33.6 dB/K | Dormant reference; runtime uses NF+T₀ |
| Rate-dependent baseband power | — | disabled | No satellite-specific numeric source (GAP-4) |

### 4.2 Derived quantities (never free sliders, spec §0.2)

See §2 above. Key: `α`, `d`, `θ`, `L`, `N₀`, `A4_thr_dBm`, `eirpDensityDbwPerMHz`.

### 4.3 Analysis-only parameters (must be labeled as such)

| Parameter | Spec ID | Exposure rule |
|---|---|---|
| `hoEnergyJoules` (E_HO) | E1 | Sensitivity sweep only; no `Realistic` default; record `assumptionSet` |
| `lambdaHo` (λ_HO) | E2 | Realistic default = 0.2 (PAP-2025-EAQL); Sensitivity for range |
| UE speed ≥ 30 km/h | U2 | Advanced only; non-zero presets are assumption-backed |
| `maxActiveBeamsPerSatellite` | B7 | Advanced/BH only; internal when BH disabled |
| Manual `footprintDiameterKm` | B3 | Sensitivity only; Realistic = derived |
| Manual `beamwidth3dBDeg` | B2 | Sensitivity only; Realistic = derived |
| Extended atmospheric chain (R3 = `3gpp-extended`) | R3 | Advanced (tier4_atmospheric=true in profiles) |
| Small-scale fading | R10 | Advanced (tier5_fading=true in profiles) |
| Timer-CHO parameters (H6, H7) | H6/H7 | Advanced (Timer-CHO profile only) |

---

## 5. Validation Rules

Any UI change that touches parameters must verify:

1. **No derived quantity appears as a free slider** (see §4.2 list)
2. **No Internal-only parameter appears in any exposed control** (see §4.1 list)
3. **Profile selector default is `case9-daps-showcase`** (use `?profile=` to override)
4. **HO override dropdown includes `a3-event`** (Realistic default mode)
5. **Advanced HO options are labeled `[Adv]`** in the dropdown
6. **Beam/showcase browser proof uses raw snapshot beam truth from the validation probe**; presentation-frame picks must not be self-validated only through renderer-derived geometry samples

Run `npm run validate:stage` after any UI-layer change to confirm build + lint pass.

---

## 6. Assumption-backed parameters in profiles

Some profile fields are `assumption-backed` rather than `paper-backed`. These appear in profile `sourceMap` entries with `tier: 'assumption-backed'` and `specMode: 'Internal-only'` or `specMode: 'Advanced'`. They must not be promoted into a Realistic-tier profile or presented in thesis tables as paper-backed defaults.

Current active assumptions (see `ntn-sim-core-assumption-policy.md` for full register):

| Assumption ID | Parameter | Exposure mode |
|---|---|---|
| `ASSUME-CUR-002` | `noise_temperature_k = 290 K` | Internal-only (all profiles) |
| `ASSUME-HO-TTT-NTN` | `ttt_ms = 640 ms` in legacy profiles | Advanced |
| `ASSUME-HO-THRESHOLD-SINR` | `trigger_threshold_db = −6 dB` in legacy profiles | Advanced |
| `ASSUME-ENERGY-001` | `activeBeamPowerW/idlePowerW = 20/5 W` | Internal-only |
| `ASSUME-ATM-001` | Atmospheric loss ITU-R simplified | Advanced |
| `ASSUME-SR-001` | Shadowed-Rician fading parameters | Advanced |
| `ASSUME-ORB-001` | HOBS synthetic Walker shell closure (`15 x 11 = 165`, `i = 53°`, `F = 7`) | Advanced |
| `ASSUME-BH-CONST-001` | BH constellation 324 sats | Advanced |
| `ASSUME-ORB-REPRO-RT2` | RT-2 synthetic HOBS orbit closure | Advanced |

---

*For parameter semantics and source locators, see `system-model-refs/simulator-parameter-spec.md`.*
*For formula derivations, see `system-model-refs/system-model-derivation.md`.*
*For profile parameter envelopes, see `sdd/ntn-sim-core-profile-baselines.md`.*
