# NTN Sim Core — Paper Family Matrix

**Version:** 1.0.2
**Date:** 2026-04-01
**Status:** Active

---

## 1. Purpose

This document maps paper clusters, profile families, donor repos, and claim scope into one planning matrix.

It exists to prevent two failure modes:

1. implementing many formulas without a clear paper-family target;
2. claiming paper-grade validity from a mixed stack whose intended literature family is unclear.

---

## 2. Role in the SDD Set

This document complements, but does not replace:

1. `sdd/ntn-sim-core-sdd.md` for normative architecture;
2. `sdd/ntn-sim-core-profile-baselines.md` for parameter envelopes;
3. `sdd/ntn-sim-core-validation-matrix.md` for validation IDs;
4. `sdd/ntn-sim-core-reproduction-protocol.md` for artifact and tolerance policy;
5. the archived donor integration map under `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-donor-integration-map.md` for historical repo-to-module transfer context.

If a conflict appears:

1. SDD defines the layer contract;
2. profile baselines define the parameter family;
3. this document defines the intended paper family and claim ceiling.

---

## 3. Family Definition Rules

1. A `paper family` is a reproducible literature-aligned environment, not necessarily an exact single-paper replication.
2. Multiple papers may belong to one family if they share the same orbit truth style, beam semantics, and KPI meaning.
3. A family may remain active for engineering and benchmark use even when its `paper-claim` ceiling is still blocked.
4. Exact paper replication requires all explicit source-paper parameters to match or be disclosed as assumptions.
5. TLE-backed studies do not create a separate radio/beam family by themselves; they inherit channel, beam, and scheduler contracts from a synthetic family.

---

## 4. Canonical Research Families

| Family ID | Primary Profile / Mode | Primary Paper Cluster | Orbit Truth | Beam Semantics | Main Model Focus | KPI / Claim Scope | Primary Donors | Current Claim Blockers |
|---|---|---|---|---|---|---|---|---|
| `FAM-ACCESS-SYNTH` | `case9-access-baseline` | `PAP-2022-A4EVENT-CORE`, `PAP-2022-SINR-ELEVATION`, `PAP-2024-MCCHO-CORE`, `PAP-2025-TIMERCHO-CORE` | synthetic Walker / analytic LEO | earth-moving access beams | Tier 0-5 access channel, event-based HO (A3/A4/CHO/Timer-CHO/MC-HO/DAPS), multi-UE, deterministic KPI path | access SINR, HO events, throughput proxy, fairness | `beamHO-bench`, `leo-beam-sim` | ✅ none (C1/C2/C3 fixed 2026-03-23) |
| `FAM-MB-HOBS-SYNTH` | `hobs-multibeam-baseline` | `PAP-2024-HOBS`, `PAP-2024-MADRL-CORE`, `PAP-2021-SHADOWED-RICIAN` | synthetic Walker / analytic LEO | earth-moving multibeam | interference-aware SINR (per-interferer), active-beam truth, Bessel/3GPP gain, EE-L1, Tier 5 SR fading | multi-beam SINR, beam switching, EE-L1, overlap/serviceability | `leo-beam-sim`, `beamHO-bench` | ✅ none (C1/M2/M3/M4/M8 fixed 2026-03-23) |
| `FAM-MODQN-SYNTH` | `modqn-paper-baseline` | `PAP-2024-MORL-MULTIBEAM` | synthetic `2 x 2` Walker-style proxy at `780 km` | earth-moving multibeam | paper-faithful MODQN state/action/reward bridge, 7-beam load-aware proxy, per-user policy handover bridge | downstream trainer/runtime baseline plus stabilized result/view-model handoff; M1 delivers the contract/runtime surface, M2 trains/evaluates, M3 stabilizes artifacts for UI | none | baseline path landed, but paper-scale generalization remains limited by the disclosed 2x2 / single-visible-satellite / `ue-0` proxy ceiling |
| `FAM-BH-SYNTH` | `bh-resource-baseline` | `PAP-2026-BHFREQREUSE`, `PAP-2025-DIST-BH-HETERO`, `PAP-2025-EEBH-UPLINK`, `PAP-2024-QMIXBH` | synthetic LEO shell | earth-fixed / BH-slot | scheduler truth, reuse policy (FRF formalized), cell-slot activity, EE-L2 with beta angle, traffic model | BH scheduling, per-cell service, resource efficiency, EE-L2 | `beamHO-bench`, `leo-beam-sim` | ✅ none (M3/M4/M7/P3 fixed 2026-03-23); MS4 (cell viz) deferred — viz only |
| `FAM-RT-ACCESS-VALID` | `real-trace-validation` + access family | TLE-backed access / HO validation papers | real-trace TLE / SGP4 or offline precompute | inherited from `FAM-ACCESS-SYNTH` | orbit realism, timing realism, replay curation, cross-mode parity | validates access-family timing realism; does not define new beam/channel family | `beamHO-bench`, `ntn-stack`, `leo-simulator` | Phase 4 wiring gaps (TLE path not wired in runner) |
| `FAM-RT-MB-VALID` | `real-trace-validation` + multibeam or BH family | real-trace multibeam / BH validation studies | real-trace TLE / SGP4 or offline precompute | inherited from `FAM-MB-HOBS-SYNTH` or `FAM-BH-SYNTH` | cross-mode parity under real constellation timing | validates whether multibeam/BH conclusions survive real-trace orbit timing | `ntn-stack`, `leo-simulator`, `beamHO-bench` | Phase 4 wiring gaps |

---

## 5. Catalog Intake Mapping

The paper catalog should be triaged into the following intake buckets before implementation work is scoped:

| Catalog Tendency | Default Family | Intake Rule |
|---|---|---|
| synthetic access / handover / 3GPP-style SINR papers | `FAM-ACCESS-SYNTH` | map into `case9-access-baseline` unless the paper requires a different explicit orbit or observer contract |
| synthetic multibeam / HOBS / EE-L1 papers | `FAM-MB-HOBS-SYNTH` | map into `hobs-multibeam-baseline` with declared beam-gain family and power-control rule |
| synthetic MORL / per-user multibeam handover papers | `FAM-MODQN-SYNTH` | map into `modqn-paper-baseline` when the paper's primary claim is user-level beam selection via a paper-defined state/action/reward surface rather than generic HOBS EE or BH scheduling |
| synthetic beam-hopping / resource / EE-L2 papers | `FAM-BH-SYNTH` | map into `bh-resource-baseline` and declare scheduler family plus cell semantics |
| TLE-backed access validation papers | `FAM-RT-ACCESS-VALID` | inherit radio and HO contracts from access family; do not invent radio parameters from TLE |
| TLE-backed multibeam or BH validation papers | `FAM-RT-MB-VALID` | inherit channel and scheduler contracts from the synthetic family being validated |
| channel-only, fading-only, or formula donor papers | donor-only | use as formula or parameter donors; do not treat them as standalone benchmark families |

---

## 6. Family Activation Order

The recommended activation order remains phase-aligned:

1. `FAM-ACCESS-SYNTH`
2. `FAM-MB-HOBS-SYNTH`
3. `FAM-MODQN-SYNTH`
4. `FAM-RT-ACCESS-VALID`
5. `FAM-BH-SYNTH`
6. `FAM-RT-MB-VALID`

Rationale:

1. access family establishes the first trustworthy HO + KPI path;
2. HOBS multibeam is the first direct target-topic family;
3. MODQN can become active only after the frozen contract/runtime surface exists and therefore follows the access + multibeam baseline foundations;
4. real-trace access validation proves orbit realism without changing radio semantics;
5. BH should land after the benchmark core and replay contracts are credible;
6. real-trace multibeam / BH validation depends on both earlier family correctness and Phase 4 replay integrity.

---

## 7. Claim Ceilings by Family

| Family | Engineering / Debug | Benchmark Artifact | Family-Faithful Reproduction | Paper Claim |
|---|---|---|---|---|
| `FAM-ACCESS-SYNTH` | allowed | allowed | ✅ allowed — all blockers cleared (C1/C2/C3), reproduction target RT-1/RT-3 defined | allowed with `provisional` tolerance; advance to `locked` after stable benchmark |
| `FAM-MB-HOBS-SYNTH` | allowed | allowed | ✅ allowed — all blockers cleared (C1/M2/M3/M4/M8), reproduction target RT-2 defined | allowed with `provisional` tolerance |
| `FAM-MODQN-SYNTH` | allowed | allowed | ✅ allowed with disclosed proxy ceiling — trained-policy reproduction, held-out artifacts, and stable viewer handoff landed through M3 | blocked for stronger paper claims until the constellation/evaluation envelope exceeds the disclosed 2x2 proxy ceiling |
| `FAM-BH-SYNTH` | allowed | allowed | ✅ allowed — scheduler/traffic/energy gaps cleared, FRF formalized | allowed with `provisional` tolerance; scheduler is generic baseline (disclosed) |
| `FAM-RT-ACCESS-VALID` | allowed | allowed for parity studies | allowed after Phase 4 TLE wiring | blocked until Phase 4 TLE path wired in runner |
| `FAM-RT-MB-VALID` | allowed | allowed for exploratory checks | allowed after Phase 4 parity | blocked until Phase 4 replay parity |

---

## 8. Per-Family Required Records

Before a family is treated as active for benchmark use, it should have:

1. one explicit profile owner in `src/core/profiles`;
2. one source-paper cluster list;
3. one donor integration entry per imported model family;
4. one validation bundle in `ntn-sim-core-validation-matrix.md`;
5. one reproduction record template entry under `ntn-sim-core-reproduction-protocol.md`.

---

## 9. Non-Goals for This Matrix

This document does not:

1. lock final numeric tolerances;
2. declare a remediation item fixed;
3. replace per-paper audit work in `/home/u24/papers/catalog/`;
4. authorize paper-claim usage by itself.
