# NTN Sim Core — Profile Baselines and Formula Families

**Version:** 1.2.6
**Date:** 2026-04-15
**Status:** Active — Phase 5 complete: profiles remain authored as `ProfileBundle + ExperimentBundle` pairs, but runtime `ProfileConfig` is now produced by `runtime-materialization.ts` rather than the retired `composeProfile()` shim. Authoring surfaces now flow through `profile-authoring-registry.ts`, `profile-exposure-catalog.ts`, and `profile-provenance-view.ts`; `defaults-access.ts`, `defaults-hobs.ts`, `defaults-bh.ts`, and `defaults-misc.ts` remain the per-family authoring truth, while `defaults.ts` stays the thin `DEFAULT_PROFILES` barrel. Current closure hardening also aligns registry/runtime defaults, makes the `realistic-first-screen` aggregate TX cap (`rf.max_tx_power_dbm = 43`) explicit, lands the first narrow `earth-moving` bounded-steering slice for research-facing access / HOBS families, and splits DAPS into a benchmark-facing baseline plus a dedicated truth-preserving showcase sibling.

---

## 1. Purpose

This document is the detailed companion to:

1. `sdd/ntn-sim-core-sdd.md`
2. `sdd/ntn-sim-core-platform-refactor-roadmap.md`
3. `sdd/ntn-sim-core-validation-matrix.md`

It pins the first-round parameter envelopes, beam-gain mappings, channel tiers, and continuity/energy source families for `ntn-sim-core`.

The intent is to be concrete enough for implementation and review, without pretending that all baselines share one single immutable numeric configuration.

---

## 2. Canonical Profile Catalog

| Profile ID | Primary Usage | Orbit Mode | Beam Semantics | Primary Source Anchors |
|---|---|---|---|---|
| `case9-access-baseline` | access/handover reproduction and early algorithm benchmarking | synthetic | earth-moving | `PAP-2022-A4EVENT-CORE`, `PAP-2022-SINR-ELEVATION`, `PAP-2025-TIMERCHO-CORE`, `PAP-2024-MCCHO-CORE` |
| `case9-daps-baseline` | benchmark-facing DAPS dual-active access baseline | synthetic | earth-moving | `PAP-2025-DAPS-CORE`, `PAP-2022-A4EVENT-CORE`, `ASSUME-HO-DAPS`, `ASSUME-BH-DAPS-001` |
| `case9-daps-showcase` | truth-preserving first-screen DAPS showcase | synthetic | earth-moving | `PAP-2025-DAPS-CORE`, `PAP-2022-A4EVENT-CORE`, `ASSUME-HO-DAPS`, `ASSUME-UE-001` |
| `modqn-paper-baseline` | downstream MODQN contract/runtime baseline and M2 trainer preflight | synthetic | earth-moving multi-beam | `PAP-2024-MORL-MULTIBEAM`, `ASSUME-MODQN-ORBIT`, `ASSUME-MODQN-BEAM`, `ASSUME-MODQN-RUNTIME` |
| `hobs-multibeam-baseline` | multi-beam interference, beam switching, and energy layer 1 | synthetic | earth-moving multi-beam | `PAP-2024-HOBS`, `PAP-2021-SHADOWED-RICIAN`, `PAP-2024-MADRL-CORE` |
| `hobs-tr38811-research` | HOBS research path with TR 38.811 slant-range/LOS coupling and beam-associated DPC feedback | synthetic | earth-moving multi-beam | `PAP-2024-HOBS`, `STD-3GPP-38811`, `PAP-2022-SENSORS-BH` |
| `bh-resource-baseline` | beam hopping, active-beam scheduling, and resource control | synthetic | earth-fixed / BH-slot | `PAP-2026-BHFREQREUSE`, `PAP-2025-EEBH-UPLINK`, `PAP-2025-DIST-BH-HETERO`, `PAP-2025-MAAC-BHPOWER` |
| `real-trace-validation` | external-validity checks under real constellation motion | real-trace | inherited from validated profile family | `PAP-2025-DAPS-CORE`, `PAP-2025-SMASH-MADQL`, local `tle_data/` |

Research-facing `earth-moving` no longer means one implicit steering model across every profile. The current authored split is:

1. `case9-access-baseline`, `case9-daps-baseline`, `case9-daps-showcase`, `hobs-multibeam-baseline`, `hobs-reproduction`, and `hobs-tr38811-research` use `nadir-relative-bounded-steering`.
2. The steering clamp is authored as `beam.steering_bound_km` in ground-plane kilometers.
3. `realistic-first-screen` intentionally retains legacy `ue-anchored-steering` as a donor/demo-oriented showcase surface, not as the research default.
4. `modqn-paper-baseline` and `bh-resource-*` remain outside this slice's semantic rewrite boundary.

### 2.1 `modqn-paper-baseline`

1. `modqn-paper-baseline` is the dedicated downstream MODQN baseline, not the first-screen platform baseline.
2. As of `PM1` (`sdd/paper-mode-claim-mode-hardening-outline.md`), it is the current frozen anchor baseline for paper-oriented claim packaging.
3. It fixes the baseline paper envelope at `780 km`, a disclosed `2 x 2` proxy shell, `7` beams per satellite, `20 GHz`, `500 MHz`, `100` uniformly distributed UEs, and weights `[0.5, 0.3, 0.2]`.
4. The observer remains Beijing, but the `10 s` episode epoch is explicitly assumption-backed and tuned so the disclosed proxy shell intersects a visible pass within the short runtime window.
5. Its paper-safe main-result corridor centers on throughput / scalarized reward, handover outcomes, load-balance behavior, and stable KPI-bundle outputs; assumption-heavy `EE / power` remains secondary or sensitivity-only unless a later energy-centered authority raises the bar.
6. Materially different future paper families must land as sibling baselines rather than rewriting `modqn-paper-baseline` in place.

---

## 3. Observer Location Strategy

1. `benchmark` runs use the observer defined by the active profile or the source paper/standard it reproduces.
2. `showcase` runs may use the local NTPU observer from `src/config/observer-presets.ts` as the default readability-focused observer.
3. If a source paper or standard explicitly fixes observer geography, that source-defined observer wins over local defaults.
4. Multi-observer sweeps are an extension item; they are not required before the first publishable single-observer benchmark suite.
5. NTPU remains a valid early synthetic baseline observer when the target paper family does not mandate a specific site and the run manifest records that choice.

---

## 4. `case9-access-baseline`

### 4.1 Parameter Envelope

| Parameter | v1 Default | Accepted Baseline Envelope | Source Anchors | Notes |
|---|---|---|---|---|
| orbit mode | synthetic | synthetic only | `PAP-2022-A4EVENT-CORE`, `PAP-2025-TIMERCHO-CORE` | real-trace belongs to `real-trace-validation`, not this profile |
| altitude | `600 km` | fixed at `600 km` for baseline reproduction | `PAP-2022-A4EVENT-CORE`, `PAP-2022-SINR-ELEVATION`, `PAP-2025-TIMERCHO-CORE` | one of the most stable cross-paper access baselines |
| beam semantics | earth-moving (`nadir-relative-bounded-steering`) | earth-moving only | 3GPP-style access baselines | research-facing access runtime clamps steering in the ground plane; do not mix with BH-slot semantics |
| carrier frequency | `2 GHz` | `2 GHz` baseline anchor | `PAP-2022-SINR-ELEVATION` | S-band baseline |
| bandwidth | `20 MHz` | `20-30 MHz`, must be profile-declared | `beamHO-bench` baseline, `PAP-2022-SINR-ELEVATION`, `PAP-2021-SHADOWED-RICIAN` | papers in this family are not perfectly identical |
| beams per satellite | `19 serving beams` | `19 serving beams`, with interference set tracked separately | `PAP-2022-SINR-ELEVATION`, `PAP-2025-TIMERCHO-CORE` | several papers model `19 serving + 42 interference` |
| footprint diameter | `50 km` | fixed at `50 km` unless a paper-specific branch explicitly changes it | 3GPP case 9 style papers | keep baseline simple and comparable |
| minimum elevation | `10 deg` | `10 deg` baseline, higher values only as sweeps | 3GPP-style NTN access baselines | must be manifest-declared if changed |
| frequency reuse | `1` | `1` for baseline | `PAP-2022-SINR-ELEVATION`, `PAP-2021-SHADOWED-RICIAN` | non-FRF1 variants are sensitivity experiments |
| EIRP density | `34 dBW/MHz` | fixed baseline anchor | `PAP-2022-SINR-ELEVATION` | use as profile source of truth |
| beam gain model | 3GPP RPsat normalized | 3GPP RPsat family | `PAP-2022-SINR-ELEVATION` | see Section 8 |
| UE count | `100` | `100-190`, must be declared in run metadata | `beamHO-bench` baseline, `PAP-2022-SINR-ELEVATION` | `190` corresponds to `10 UE/beam` style experiments |

Current authored tracking rule:

1. `case9-access-baseline` uses `beam.tracking_mode = 'nadir-relative-bounded-steering'`.
2. The first bounded-steering landing authors `beam.steering_bound_km = 200`, which is `4 x 50 km` beam diameter.
3. A satellite is service-eligible only when the bounded lattice shift plus the selected beam footprint can still reach the UE.

### 4.2 Representation Rule

1. `case9-access-baseline` may be represented as:
   - single-satellite analytic channel golden case
   - small multi-satellite synthetic window for handover visualization
   - profile-declared Walker-like shell used only as an implementation vehicle
2. The chosen representation must be written to the run manifest.
3. The representation must not be mislabeled as a different paper's exact constellation.

### 4.3 DAPS Baseline vs Showcase Split

The DAPS family now has two distinct access surfaces:

1. `case9-daps-baseline`
   - benchmark-facing DAPS baseline
   - keeps the BH-coupled, multi-UE continuity context
   - remains the correct reference when a user wants the denser mixed-duty
     access scene
2. `case9-daps-showcase`
   - truth-preserving showcase sibling
   - same DAPS / SINR / bounded-steering family
   - `1 UE`
   - no BH overlay load
   - curated epoch `2026-01-01T00:45:00Z`
   - showcase-specific `hysteresis_db = 0`, `pingPongWindowSec = 15`
   - interactive first-screen default

This split is presentation-oriented. It does not authorize a second physics
path, alternate SINR truth, or beam fake re-centering.

---

## 5. `hobs-multibeam-baseline`

### 5.1 Parameter Envelope

| Parameter | v1 Default | Accepted Baseline Envelope | Source Anchors | Notes |
|---|---|---|---|---|
| orbit mode | synthetic | synthetic only in first baseline | `PAP-2024-HOBS` | real-trace cross-checks happen through `real-trace-validation` |
| altitude | `550 km` | fixed at `550 km` | `PAP-2024-HOBS` | direct HOBS anchor |
| constellation size | `165 satellites` | profile-declared synthetic reproduction of the HOBS constellation scale | `PAP-2024-HOBS` | runtime closes this through a disclosed `15 x 11` Walker proxy because HOBS Table I gives the total count but not the plane split |
| carrier frequency | `28 GHz` | fixed HOBS baseline | `PAP-2024-HOBS` | do not silently downgrade to 20 GHz |
| bandwidth | `100 MHz` | fixed HOBS baseline | `PAP-2024-HOBS` | must remain explicit in source trace |
| EIRP density | `40 dBW/MHz` | derived reporting quantity only | `PAP-2024-HOBS` | derived from Table I values `Pmax=50 dBm`, `G0=40 dBi`, `B=100 MHz`; runtime SINR path uses `tx_power_per_beam_dbm` directly |
| max transmit power | `50 dBm` | fixed HOBS baseline unless sensitivity-tagged | `PAP-2024-HOBS` | Eq. (4) uses beam transmit power directly; the simulator maps this to `tx_power_per_beam_dbm = 50 dBm` for the HOBS-family profiles |
| UE receive antenna gain (`G^R`) | `0 dBi` | explicit runtime receive-side gain term | `STD-3GPP-38811-TABLE-4.4-1` | HOBS Eq. (4) keeps `G^R` symbolic; runtime pins the numeric term to 0 dBi omnidirectional UE gain and source-traces it separately instead of leaving it implicit |
| beams per satellite | `37` | fixed HOBS baseline | `PAP-2024-HOBS` | direct Table I anchor |
| frequency reuse factor | `3` | 3-color hexagonal | `PAP-2025-JCAP-LEO` | HOBS Table I does not disclose FRF; FR3 is imported from a separate paper-backed multi-beam reuse source and must not be mislabeled as a HOBS-provided value |
| beam gain model | Bessel J1+J3 | fixed HOBS Eq. (3)/(A1) pattern | `PAP-2024-HOBS` | simulator antenna model is `bessel-j1j3` for the HOBS family |
| power control | HOBS-style DPC family | profile-declared DPC or fixed-power variant | `PAP-2024-HOBS` | implementation must document exact rule used |
| SINR runtime truth | `S / (I^a + I^b + N)` | per-UE full recompute for shared-serving and independent-HO paths | `PAP-2024-HOBS` | runtime no longer uses the old representative-SINR plus beam-delta proxy for non-primary UE SINR |
| energy metric | system EE = throughput / power | HOBS-style EE family | `PAP-2024-HOBS` | see Section 9 |

Current authored tracking rule:

1. `hobs-multibeam-baseline`, `hobs-reproduction`, and `hobs-tr38811-research` use `beam.tracking_mode = 'nadir-relative-bounded-steering'`.
2. The first bounded-steering landing authors `beam.steering_bound_km ≈ 255.5`, which is `4 x` the HOBS beam diameter derived from Table I.
3. The first landing changes serving/candidate derivation only; it does not rewrite the broader HO-family FSM structure.

### 5.2 Scope Rule

1. This profile is the primary baseline for your target topic:
   - multi-beam
   - beam switching
   - interference-aware SINR
   - energy layer 1
2. It should become the first non-toy profile whose outputs are strong enough for paper-quality beam/HO/EE comparisons.

### 5.3 `hobs-tr38811-research`

1. `hobs-tr38811-research` is the research-focused sibling of `hobs-reproduction`, not a replacement.
2. It keeps the HOBS Eq. (4) outer SINR decomposition, but rewrites the large-scale distance path as `d(alpha)` using 3GPP TR 38.811 Eq. (6.6-3).
3. It also upgrades the geometry/runtime path in three ways:
   - per-UE topocentric elevation/slant range instead of observer-shared reuse
   - uncapped inter-LEO interferer summation (`channel.max_interfering_sats = null`)
   - beam-associated DPC power coupled back into the channel path when a beam has a UE candidate / forced-serving SINR proxy; unmatched beams fall back to fixed power
4. LOS/NLOS selection no longer uses the legacy 20° shortcut in this profile; it follows TR 38.811 Table 6.6.1-1 with nearest-angle lookup and deterministic per-link sampling, so clutter activation is driven by the same standard-backed closure.
5. This profile is the preferred surface when the paper claim needs an equation-traceable HOBS+TR 38.811 hybrid rather than the lighter `hobs-reproduction` baseline.
6. It is still a disclosed simulator interpretation, not an exact HOBS replication, because the constellation closure, FRF, bounded-steering beam semantics, and unmatched-beam fixed-power fallback remain simulator-authored assumptions.

---

## 6. `bh-resource-baseline`

`bh-resource-baseline` intentionally covers multiple subfamilies. The first implementation should pick one explicit subprofile and label it clearly.

### 6.1 Preferred v1 Subprofile: `bh-sfr-780`

| Parameter | v1 Default | Source Anchors | Notes |
|---|---|---|---|
| altitude | `780 km` | `PAP-2026-BHFREQREUSE` | direct BH + SFR anchor |
| constellation | `324 satellites (18 x 18)` | scaled from `PAP-2026-BHFREQREUSE` | original 66 sats (6×11) gave only 13% availability at 40°N observer; scaled to 324 for ≥80% coverage (2026-03-23 correction) |
| EIRP density | `46 dBW/MHz` | Ka-band adjusted | scaled from 34; Ka-band FSPL compensation (2026-03-23 correction) |
| beams per satellite | `12` | `PAP-2026-BHFREQREUSE` | closer to scheduling/resource studies than 4-beam toy variants |
| beam semantics | earth-fixed / BH-slot | BH literature | scheduler truth, not just visualization |
| reuse model | `soft frequency reuse` | `PAP-2026-BHFREQREUSE` | key differentiator of this subprofile |

### 6.2 Alternative Supporting Subprofile: `bh-hetero-4beam`

| Parameter | Envelope | Source Anchors | Notes |
|---|---|---|---|
| heterogeneous constellation classes | profile-declared | `PAP-2025-DIST-BH-HETERO` | useful later for heterogeneity studies |
| beams per satellite | `4` | `PAP-2025-DIST-BH-HETERO` | not the best first mainline profile for your topic |
| slot structure | TDMA-style BH frame | `PAP-2025-DIST-BH-HETERO` | good supporting reference, not default v1 mainline |

### 6.3 Optional Uplink EE Branch

| Parameter | Envelope | Source Anchors | Notes |
|---|---|---|---|
| altitude | `1200 km` | `PAP-2025-EEBH-UPLINK` | uplink-specific branch |
| cells / active beams | `144 cells`, `9 active beams/slot` | `PAP-2025-EEBH-UPLINK` | useful when extending beyond downlink-first studies |
| usage | extension branch | `PAP-2025-EEBH-UPLINK` | do not replace the main downlink-focused branch with this by accident |

---

## 6.4 `bh-pf-baseline` — Proportional-Fair BH Scheduler

Derived from `bh-resource-baseline`. All physical parameters (orbit, RF, antenna, channel tiers) are inherited unchanged. Only the BH scheduling strategy differs.

| Parameter | Value | Source Anchors | Notes |
|---|---|---|---|
| profile family | `bh-resource-baseline` | inherited | physical layer identical to §6.1 |
| bh_strategy | `proportional-fair` | `PAP-2024-HOBS` Fig. 6, `PAP-2025-SMASH-MADQL` Table II | PF is the primary non-DRL baseline in both papers |
| traffic model | `hotspot` | `PAP-2025-SMASH-MADQL` | uneven demand distribution stresses the PF fairness property |
| UE count | 10 | project baseline | manageable multi-UE count for scheduler comparison |
| energy layer | Layer 1 enabled, Layer 2 disabled | same as `bh-resource-baseline` | EE denominator uses active-beam TX power (PAP-2025-EEBH-UPLINK Eq.(5)) |
| energy values | assumption-backed (ASSUME-ENERGY-001) | see `ntn-sim-core-assumption-policy.md §9` | **do not label as paper-backed in thesis tables** |

**Claim scope:** this profile may be used as the non-DRL proportional-fair baseline in beam-hopping scheduler comparisons. EE metrics must disclose the current Layer-1 assumption set: per-beam TX cap = 40 dBm (10 W) in runtime, while 20 W / 5 W beam-state consumption remains assumption-backed.

---

## 6.5 `bh-sinr-greedy-baseline` — SINR-Greedy BH Scheduler

Derived from `bh-resource-baseline`. All physical parameters inherited unchanged. Only the BH scheduling strategy differs.

| Parameter | Value | Source Anchors | Notes |
|---|---|---|---|
| profile family | `bh-resource-baseline` | inherited | physical layer identical to §6.1 |
| bh_strategy | `sinr-greedy` | `PAP-2026-DRL-BHOPT` | SINR-greedy is the channel-aware upper-bound baseline for DRL BH optimization |
| traffic model | `uniform` | project default | uniform demand removes traffic bias from the SINR-maximizing selection |
| UE count | 5 | project baseline | minimal multi-UE footprint; greedy behavior is independent of traffic |
| energy layer | Layer 1 enabled, Layer 2 disabled | same as `bh-resource-baseline` | same EE accounting as PF baseline |
| energy values | assumption-backed (ASSUME-ENERGY-001) | see assumption policy | **do not label as paper-backed in thesis tables** |

**Claim scope:** this profile serves as the channel-aware greedy upper bound in DRL beam-scheduling comparisons. It is not a paper reproduction target; it is an engineering reference baseline. SINR figures from this profile may be compared against DRL policy outputs to quantify the gap.

---

## 7. `real-trace-validation`

### 7.1 Core Policy

| Parameter | Policy | Source Anchors | Notes |
|---|---|---|---|
| raw orbit data | local `tle_data/` snapshots | local dataset + `beamHO-bench` workflow | raw truth layer |
| frontend subset size | sampled subset sized for browser-friendly rendering | `beamHO-bench` sampled-fixture approach | exact count is manifest-defined, not hardcoded in this spec |
| heavy validation mode | larger subset or precomputed orbit windows allowed | `orbit-engine`, `leo-simulator` | supports more realistic scale without overloading frontend |
| propagator | SGP4-sampled cache-backed path | `beamHO-bench`, TLE-backed papers | validation-sized real-trace cache samples use SatRec-backed SGP4; runtime consumes cached passes/interpolation after build time |
| beam/channel family | inherited from the synthetic profile family being validated | cross-mode policy | TLE does not define beam/power/resource parameters |
| window selection | deterministic ranked selection | `runner/curation` policy | must be recorded in replay metadata |

### 7.2 Important Boundary

`real-trace-validation` validates orbit realism and timing realism. It does not by itself define:

1. beam counts
2. antenna patterns
3. power control
4. traffic model
5. energy objective

Those remain tied to the synthetic profile family or paper baseline being validated.

---

## 8. Channel Model Tiers and Beam-Gain Mapping

### 8.1 Channel Tiers

| Tier | Components | Requirement | Main Applicable Profiles | Source Anchors |
|---|---|---|---|---|
| Tier 0 | FSPL | mandatory | all | general link budget baseline |
| Tier 1 | profile-selected large-scale loss family, including elevation-dependent shadowing where required | mandatory for benchmark runs that claim 3GPP NTN-style access realism | `case9-access-baseline`, `real-trace-validation` | `PAP-2022-SINR-ELEVATION`, 3GPP NTN tables |
| Tier 2 | clutter / elevation-dependent large-scale attenuation | mandatory for 3GPP-aligned access baselines, recommended for real-trace access validation | `case9-access-baseline`, `real-trace-validation` | `PAP-2022-SINR-ELEVATION` |
| Tier 3 | beam gain family | mandatory for multi-beam or BH studies | `hobs-multibeam-baseline`, `bh-resource-baseline` | `PAP-2021-SHADOWED-RICIAN`, `PAP-2024-HOBS` |
| Tier 4 | atmospheric absorption and other Ka-band extras | recommended when using Ka-band paper-default runs | `hobs-multibeam-baseline`, `bh-resource-baseline` | Ka-band papers |
| Tier 5 | small-scale fading: Shadowed-Rician (SR) model — Nakagami-m LOS + Rayleigh scatter, elevation-dependent parameters | recommended for channel completeness claims | any profile with `tier5_fading: true` | `PAP-2021-SHADOWED-RICIAN`; implemented in `small-scale-fading.ts` |
| Tier 6 | Doppler shift and ICI SINR degradation | available for Doppler-sensitive studies | any profile with `tier6_doppler: true` | `PAP-2024-BEAM-MGMT-SPECTRUM`; implemented in `doppler.ts` and wired into engine SINR (Phase 2+3 paths); validated by VAL-DOPPLER-001-E (E-11) — measured 0.7 dB degradation for S-band 30 kHz SCS |

### 8.2 Beam-Gain Mapping by Profile

| Profile | Default Beam-Gain Family | Alternate / Extension Rule | Source Anchors |
|---|---|---|---|
| `case9-access-baseline` | 3GPP RPsat normalized | simplified flat gain may exist only in debug/non-benchmark mode | `PAP-2022-SINR-ELEVATION` |
| `hobs-multibeam-baseline` | Bessel J1 family | any J1/J1-J3 variant must be profile-declared | `PAP-2024-HOBS`, `PAP-2021-SHADOWED-RICIAN` |
| `bh-resource-baseline` | Bessel or ITU-R style family, chosen per subprofile | the exact gain family is part of the subprofile identity | `PAP-2026-BHFREQREUSE`, `PAP-2024-QMIXBH` |
| `real-trace-validation` | same as the synthetic family being validated | no separate gain family should be invented for TLE mode alone | cross-mode validation rule |

---

## 9. Energy and Continuity Source Families

### 9.1 Energy Formula Families

| Layer | Initial Family | Use | Caution |
|---|---|---|---|
| Energy Layer 1 | HOBS-style system EE (`throughput / power`) | main downlink multibeam EE baseline | exact implementation rule must be source-traced |
| Energy Layer 1 | EEBH-style active-beam power accounting | beam activation and per-beam power bookkeeping | good for BH/resource coupling |
| Energy Layer 2 | SMASH-style TX/RX/idle energy state and blocking | onboard energy availability and service blocking | best current explicit state-based energy anchor |
| policy reward | EAQL-style reward definitions | RL/policy experiments only | reward terms are not physical energy formulas by themselves |

### 9.2 Continuity / DAPS Literature Roles

| Role | Papers | Usage |
|---|---|---|
| core implementation references | `PAP-2025-DAPS-CORE`, `PAP-2024-MCCHO-CORE` | explicit staged DAPS and overlap-based multi-connectivity |
| later extension references | `PAP-2025-RSMA` | soft-HO / multi-orbit extension, not initial mandatory baseline |
| supporting literature | `PAP-2020-MIMO-GRAPH`, `PAP-2020-USERCENTRIC`, `PAP-2024-QMIXBH` | design background and edge-case inspiration, not first normative implementation anchor |

---

## 10. Paper Catalog and `researchChecklist` Integration

The merged paper catalog under `/home/u24/papers/catalog/*.json` is an explicit upstream design input.

Primary uses:

1. justify profile parameters against structured evidence
2. generate source-trace paper reference sets
3. identify formula families worth turning into golden cases
4. detect which papers expose enough detail for direct implementation

Most useful `researchChecklist` fields:

1. `sinrAndSignal.formula`
2. `power.*`
3. `beam.*`
4. `geometry.*`
5. `satelliteSimulation.*`
6. `energyEfficiency.*`
7. `jsWebsiteKnowledge.*`

This catalog should drive profile audit tooling in later phases rather than remain a passive reading artifact.
