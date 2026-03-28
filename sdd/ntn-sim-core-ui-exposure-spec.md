# UI / Parameter Exposure Specification

> **Role:** Normative specification for which simulator parameters are exposed to users, in which mode, and through which UI mechanism.
>
> **Authority:** This document is subordinate to `simulator-parameter-spec.md` (the canonical parameter authority) and `ntn-sim-core-sdd.md` (the design contract). It translates the spec's Mode Classification (§0) into concrete UI rules.
>
> **Last updated:** 2026-03-28 (Phase 4 UI exposure layer)

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
| `elevation angle α` | Determined by SGP4/Walker propagation | Output display only (HUD, scatter plot) |
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

**Implementation:** `src/viz/overlays/ControlPanel.tsx` `PROFILE_OPTIONS` constant.

**Tier groups (ordered):**

#### Realistic (first-screen default)

| Profile ID | Label | Key parameters |
|---|---|---|
| `realistic-first-screen` | Realistic — Ka 20 GHz, A3 HO (spec §10) | 600 km, Ka 20 GHz, A3 HO, FR3, 19 beams, NF=9 dB |

This is the **default profile** when no `?profile=` URL param is set. All user-facing parameters are paper-backed or standard-backed. No Advanced entries. One Internal-only entry (`ASSUME-CHAN-001`: `noise_temperature_k = 290 K`) is present in the profile for audit traceability but is not exposed as a UI control — it is a fixed engineering constant per spec R7. Safe for thesis baseline tables.

#### Advanced

| Profile ID | Label | Key notes |
|---|---|---|
| `case9-access-baseline` | Advanced — Case-9 Access (S-band A4) | S-band 2 GHz, A4 HO, PAP-2022-A4EVENT-CORE |
| `hobs-multibeam-baseline` | Advanced — HOBS Multi-Beam (Ka 28 GHz) | Ka 28 GHz, 19 beams FRF=3, energy L1 |
| `bh-resource-baseline` | Advanced — BH Resource (Ka 20 GHz) | 780 km, earth-fixed BH, 12 cells |
| `case9-daps-baseline` | Advanced — DAPS Dual-Active | DAPS protocol, dual-active HO |
| `real-trace-validation` | Advanced — Real-Trace (TLE/SGP4) | Real Starlink TLE, SGP4 propagation |
| `meo-constellation-baseline` | Advanced — MEO Constellation | 8062 km MEO, Ka 20 GHz |
| `geo-relay-baseline` | Advanced — GEO Relay | 35786 km GEO, Ku 12 GHz |

#### Sensitivity (reproduction targets and sweep profiles)

| Profile ID | Label | Purpose |
|---|---|---|
| `sinr-elevation-reproduction` | Sensitivity — SINR-Elevation Repro | PAP-2022-SINR-ELEVATION RT-1 |
| `hobs-reproduction` | Sensitivity — HOBS Repro | PAP-2024-HOBS RT-2 |
| `timer-cho-reproduction` | Sensitivity — Timer-CHO Repro | PAP-2025-TIMERCHO-CORE RT-3 |
| `bh-pf-baseline` | Sensitivity — BH Proportional-Fair | PF scheduler baseline comparison |
| `bh-sinr-greedy-baseline` | Sensitivity — BH SINR-Greedy | Channel-aware upper-bound baseline |
| `bh-resource-energy-proof` | Sensitivity — BH Energy Proof | Layer 2 proof / browser validation |

**Note:** Profiles NOT listed above (e.g. `bh-resource-energy-proof` sub-variants) are accessible via `?profile=<id>` URL param for validation/automation but are not shown in the profile selector dropdown.

### 3.2 HO Strategy Override (`ControlPanel` → `hoTypeOverride` state)

Runtime override of the handover type. Overrides the profile's `handover.type` field.

| Option | Mode | Source |
|---|---|---|
| `(profile default)` | — | Inherits profile's `handover.type` |
| `a3-event` | Realistic | TS 38.331 §5.5.4; PAP-2022-A4EVENT-CORE |
| `a4-event` | Realistic | TS 38.331 §5.5.4; PAP-2022-A4EVENT-CORE |
| `cho` | Advanced | PAP-2024-MCCHO-CORE |
| `mc-ho` | Advanced | PAP-2024-MCCHO-CORE |
| `daps` | Advanced | PAP-2025-DAPS-CORE |
| `hard-ho` | Advanced | Simulator baseline (no-frills HO) |

Advanced options are labeled `[Adv]` in the dropdown. This override is a convenience tool for interactive exploration; paper-claim experiments must use the profile's own `handover.type`.

### 3.3 Playback Controls (`ControlPanel`)

These are **visualization-layer controls** only. They do not affect simulation physics.

| Control | Function | Mode |
|---|---|---|
| Speed (1x/5x/10x/20x) | Simulation playback speed | Visual |
| Play/Pause | Pause/resume simulation tick | Visual |
| Show Beams | Toggle beam cone visibility | Visual |
| Show Labels | Toggle satellite ID labels | Visual |
| SINR Chart | Toggle SINR time-series overlay | Visual |
| HO Log | Toggle handover event log | Visual |
| SINR CDF | Toggle SINR CDF plot | Visual |
| Elev Scatter | Toggle SINR vs elevation scatter | Visual |
| Replay | Toggle deterministic replay mode | Visual |
| Export KPI | Download JSON + CSV of current run KPIs | Output |
| Batch KPI | Run all profiles and compare | Advanced |

### 3.4 URL Query Parameters

| Param | Default | Type | Notes |
|---|---|---|---|
| `?profile=` | `realistic-first-screen` | string | Profile ID from `DEFAULT_PROFILES` registry |
| `?speed=` | `5` | number | Playback multiplier |
| `?replay=1` | off | flag | Enable deterministic replay |
| `?replaySeekSec=` | null | number | Seek to time in replay |
| `?validate=1` | off | flag | Show ValidationProbe overlay |
| `?paused=1` | off | flag | Start paused |
| `?showBeams=0` | on | flag | Hide beams on load |
| `?showLabels=0` | on | flag | Hide labels on load |

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
3. **Profile selector default is `realistic-first-screen`** (use `?profile=` to override)
4. **HO override dropdown includes `a3-event`** (Realistic default mode)
5. **Advanced HO options are labeled `[Adv]`** in the dropdown

Run `npm run validate:stage` after any UI-layer change to confirm build + lint pass.

---

## 6. Assumption-backed parameters in profiles

Some profile fields are `assumption-backed` rather than `paper-backed`. These appear in profile `sourceMap` entries with `tier: 'assumption-backed'` and `specMode: 'Internal-only'` or `specMode: 'Advanced'`. They must not be promoted to the Realistic first-screen or presented in thesis tables as paper-backed defaults.

Current active assumptions (see `ntn-sim-core-assumption-policy.md` for full register):

| Assumption ID | Parameter | Exposure mode |
|---|---|---|
| `ASSUME-CHAN-001` | `noise_temperature_k = 290 K` | Internal-only (all profiles) |
| `ASSUME-HO-TTT-NTN` | `ttt_ms = 640 ms` in legacy profiles | Advanced |
| `ASSUME-HO-THRESHOLD-SINR` | `trigger_threshold_db = −6 dB` in legacy profiles | Advanced |
| `ASSUME-ENERGY-001` | `activeBeamPowerW/idlePowerW = 20/5 W` | Internal-only |
| `ASSUME-ATM-001` | Atmospheric loss ITU-R simplified | Advanced |
| `ASSUME-SR-001` | Shadowed-Rician fading parameters | Advanced |
| `ASSUME-HOBS-EIRP-001` | HOBS EIRP density 46 dBW/MHz | Advanced |
| `ASSUME-BH-CONST-001` | BH constellation 324 sats | Advanced |
| `ASSUME-HOBS-FRF-001` | HOBS FRF=3 | Advanced |

---

*For parameter semantics and source locators, see `system-model-refs/simulator-parameter-spec.md`.*
*For formula derivations, see `system-model-refs/system-model-derivation.md`.*
*For profile parameter envelopes, see `sdd/ntn-sim-core-profile-baselines.md`.*
