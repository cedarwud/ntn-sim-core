# NTN Sim Core — Profile Baselines and Formula Families

**Version:** 0.1.0  
**Date:** 2026-03-20  
**Status:** Draft Baseline Companion

---

## 1. Purpose

This document is the detailed companion to:

1. `sdd/ntn-sim-core-sdd.md`
2. `sdd/ntn-sim-core-roadmap.md`
3. `sdd/ntn-sim-core-validation-matrix.md`

It pins the first-round parameter envelopes, beam-gain mappings, channel tiers, and continuity/energy source families for `ntn-sim-core`.

The intent is to be concrete enough for implementation and review, without pretending that all baselines share one single immutable numeric configuration.

---

## 2. Canonical Profile Catalog

| Profile ID | Primary Usage | Orbit Mode | Beam Semantics | Primary Source Anchors |
|---|---|---|---|---|
| `case9-access-baseline` | access/handover reproduction and early algorithm benchmarking | synthetic | earth-moving | `PAP-2022-A4EVENT-CORE`, `PAP-2022-SINR-ELEVATION`, `PAP-2025-TIMERCHO-CORE`, `PAP-2024-MCCHO-CORE` |
| `hobs-multibeam-baseline` | multi-beam interference, beam switching, and energy layer 1 | synthetic | earth-moving multi-beam | `PAP-2024-HOBS`, `PAP-2021-SHADOWED-RICIAN`, `PAP-2024-MADRL-CORE` |
| `bh-resource-baseline` | beam hopping, active-beam scheduling, and resource control | synthetic | earth-fixed / BH-slot | `PAP-2026-BHFREQREUSE`, `PAP-2025-EEBH-UPLINK`, `PAP-2025-DIST-BH-HETERO`, `PAP-2025-MAAC-BHPOWER` |
| `real-trace-validation` | external-validity checks under real constellation motion | real-trace | inherited from validated profile family | `PAP-2025-DAPS-CORE`, `PAP-2025-SMASH-MADQL`, local `tle_data/` |

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
| beam semantics | earth-moving | earth-moving only | 3GPP-style access baselines | do not mix with BH-slot semantics |
| carrier frequency | `2 GHz` | `2 GHz` baseline anchor | `PAP-2022-SINR-ELEVATION` | S-band baseline |
| bandwidth | `20 MHz` | `20-30 MHz`, must be profile-declared | `beamHO-bench` baseline, `PAP-2022-SINR-ELEVATION`, `PAP-2021-SHADOWED-RICIAN` | papers in this family are not perfectly identical |
| beams per satellite | `19 serving beams` | `19 serving beams`, with interference set tracked separately | `PAP-2022-SINR-ELEVATION`, `PAP-2025-TIMERCHO-CORE` | several papers model `19 serving + 42 interference` |
| footprint diameter | `50 km` | fixed at `50 km` unless a paper-specific branch explicitly changes it | 3GPP case 9 style papers | keep baseline simple and comparable |
| minimum elevation | `10 deg` | `10 deg` baseline, higher values only as sweeps | 3GPP-style NTN access baselines | must be manifest-declared if changed |
| frequency reuse | `1` | `1` for baseline | `PAP-2022-SINR-ELEVATION`, `PAP-2021-SHADOWED-RICIAN` | non-FRF1 variants are sensitivity experiments |
| EIRP density | `34 dBW/MHz` | fixed baseline anchor | `PAP-2022-SINR-ELEVATION` | use as profile source of truth |
| beam gain model | 3GPP RPsat normalized | 3GPP RPsat family | `PAP-2022-SINR-ELEVATION` | see Section 8 |
| UE count | `100` | `100-190`, must be declared in run metadata | `beamHO-bench` baseline, `PAP-2022-SINR-ELEVATION` | `190` corresponds to `10 UE/beam` style experiments |

### 4.2 Representation Rule

1. `case9-access-baseline` may be represented as:
   - single-satellite analytic channel golden case
   - small multi-satellite synthetic window for handover visualization
   - profile-declared Walker-like shell used only as an implementation vehicle
2. The chosen representation must be written to the run manifest.
3. The representation must not be mislabeled as a different paper's exact constellation.

---

## 5. `hobs-multibeam-baseline`

### 5.1 Parameter Envelope

| Parameter | v1 Default | Accepted Baseline Envelope | Source Anchors | Notes |
|---|---|---|---|---|
| orbit mode | synthetic | synthetic only in first baseline | `PAP-2024-HOBS` | real-trace cross-checks happen through `real-trace-validation` |
| altitude | `550 km` | fixed at `550 km` | `PAP-2024-HOBS` | direct HOBS anchor |
| constellation size | `165 satellites` equivalent | profile-declared synthetic reproduction of the HOBS constellation scale | `PAP-2024-HOBS` | exact orbit generator may differ but must be declared |
| carrier frequency | `28 GHz` | fixed HOBS baseline | `PAP-2024-HOBS` | do not silently downgrade to 20 GHz |
| bandwidth | `100 MHz` | fixed HOBS baseline | `PAP-2024-HOBS` | must remain explicit in source trace |
| EIRP density | `46 dBW/MHz` | Ka-band adjusted | `PAP-2024-HOBS` | Ka-band requires +12 dB vs S-band to partially compensate ~22 dB additional FSPL (2026-03-23 correction from 34→46) |
| max transmit power | `50 dBm` | fixed HOBS baseline unless sensitivity-tagged | `PAP-2024-HOBS` | used for energy layer 1 and SINR |
| beams per satellite | `19` | FRF=3, 2-ring hexagonal | `PAP-2024-HOBS` | changed from 37 (FRF=1) to 19 (FRF=3) after engine validation: 37-beam FRF=1 produces catastrophic co-channel interference (-20 dB mean SINR); 19-beam FRF=3 is standard multi-beam configuration (2026-03-23 correction) |
| frequency reuse factor | `3` | 3-color hexagonal | `PAP-2024-HOBS` | changed from FRF=1 to FRF=3 for physically meaningful SINR (2026-03-23 correction) |
| beam gain model | Bessel J1 family | Bessel-based family, exact variant profile-declared | `PAP-2024-HOBS`, `PAP-2021-SHADOWED-RICIAN` | see Section 8 |
| power control | HOBS-style DPC family | profile-declared DPC or fixed-power variant | `PAP-2024-HOBS` | implementation must document exact rule used |
| energy metric | system EE = throughput / power | HOBS-style EE family | `PAP-2024-HOBS` | see Section 9 |

### 5.2 Scope Rule

1. This profile is the primary baseline for your target topic:
   - multi-beam
   - beam switching
   - interference-aware SINR
   - energy layer 1
2. It should become the first non-toy profile whose outputs are strong enough for paper-quality beam/HO/EE comparisons.

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

## 7. `real-trace-validation`

### 7.1 Core Policy

| Parameter | Policy | Source Anchors | Notes |
|---|---|---|---|
| raw orbit data | local `tle_data/` snapshots | local dataset + `beamHO-bench` workflow | raw truth layer |
| frontend subset size | sampled subset sized for browser-friendly rendering | `beamHO-bench` sampled-fixture approach | exact count is manifest-defined, not hardcoded in this spec |
| heavy validation mode | larger subset or precomputed orbit windows allowed | `orbit-engine`, `leo-simulator` | supports more realistic scale without overloading frontend |
| propagator | SGP4 preferred | `beamHO-bench`, TLE-backed papers | fallback paths must be explicitly labeled as fallback |
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
| Tier 6 | Doppler shift and ICI SINR degradation | available for Doppler-sensitive studies | any profile | `PAP-2024-BEAM-MGMT-SPECTRUM`; implemented in `doppler.ts`, not yet wired into engine SINR |

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
