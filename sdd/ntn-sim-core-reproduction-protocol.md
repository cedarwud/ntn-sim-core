# NTN Sim Core — Reproduction Protocol

**Version:** 0.1.0  
**Date:** 2026-03-23  
**Status:** Draft v0

---

## 1. Purpose

This document defines how `ntn-sim-core` should move from formula checks to donor parity to paper-grade reproduction.

Its job is to answer four questions for every future claim:

1. what kind of claim is being made;
2. what artifacts are required;
3. whether a numeric tolerance may already be locked;
4. which unresolved remediation items still block the claim.

---

## 2. Claim Levels

`ntn-sim-core` should use the following reproduction ladder:

| Level | Name | Meaning | Typical Output |
|---|---|---|---|
| `L0` | formula checkpoint | isolated formula or geometry check against a known reference value | single numeric checkpoint or golden case |
| `L1` | donor parity | the `ntn-sim-core` path matches a donor repo or imported artifact within a declared scope | parity report, side-by-side traces, checkpoint table |
| `L2` | family-faithful reproduction | a canonical paper family is reproduced with documented assumptions and validation artifacts | benchmark bundle tied to one family |
| `L3` | paper-claim reproduction | a figure, table, or result is suitable for paper evidence under the acceptance gates | publishable artifact set with locked tolerance and disclosure |

No result may be described as `L3` unless the benchmark run gate and paper-claim gate both pass.

---

## 3. Required Artifact Bundle

Every `L1` through `L3` reproduction record should include:

1. run manifest;
2. resolved config;
3. source-trace bundle;
4. profile family identifier;
5. code revision or equivalent tree identity;
6. seed or declared seed set;
7. KPI bundle or checkpoint table;
8. raw comparison table versus donor or paper reference;
9. reproduction note stating the intended claim level;
10. replay metadata when the claim depends on replay or curation.

If a claim uses paper-extracted points rather than donor code, the record should also include:

1. the paper figure/table source;
2. the extraction method;
3. whether the comparison is exact, approximate, digitized, or qualitative.

---

## 4. Run Classes

| Run Class | Definition | Required Declaration |
|---|---|---|
| deterministic formula run | no randomness in the compared path | one fixed configuration and reference equation set |
| seeded deterministic system run | deterministic under explicit seed and profile | one fixed seed, one manifest, one replayable result |
| seeded stochastic study | stochastic channel, traffic, or policy path | declared seed set, aggregation rule, and reported spread statistic |

The run class must be recorded before tolerance can be interpreted.

---

## 5. Tolerance Lifecycle

Numeric tolerance should be tracked with status, not improvised ad hoc.

| Status | Meaning | Allowed Use | Exit Condition |
|---|---|---|---|
| `tbd` | tolerance structure exists but final numeric threshold is not yet trustworthy | planning, local development, blocker-aware benchmark drafting | known blocker cleared and one reference artifact captured |
| `provisional` | working threshold used for parity iteration, not yet paper-grade | donor parity, benchmark hardening, regression watch | repeated stable comparisons and reviewer sign-off |
| `locked` | claim-ready threshold accepted for paper-grade evidence | paper claims and final benchmark bundles | only changed through explicit protocol revision |

Rules:

1. `tbd` is the correct status when the compared model path is known to contain a blocker that can bias the metric.
2. `provisional` may be used once the compared path is internally coherent, even if broader project blockers remain elsewhere.
3. `locked` requires both artifact stability and cleared blockers for the specific claim scope.
4. No tolerance may be widened merely to hide a known model deficiency.

---

## 6. Blocker-to-Claim Mapping

The current remediation tracker affects claim eligibility as follows:

| Blocker | Claim Types It Blocks |
|---|---|
| `C1` interfering links use wrong path loss | any locked SINR, multibeam, HO, or EE claim that depends on interference-aware received power |
| `C2` CHO / MC-HO missing | any locked claim about CHO, MC-HO, timer-CHO, or later continuity baselines |
| `C3` single-UE engine | any locked fairness, multi-user throughput, load-balancing, or multi-UE HO claim |
| `M2` nadir-only `theta_3dB` approximation | locked off-nadir beam-shape or multibeam coverage claims |
| `M3` wrong Ka-band shadow-fading table | locked Ka-band multibeam or BH channel claims |
| `M4` atmospheric loss always zero | locked Ka-band attenuation, availability, or EE claims where atmospheric loss matters |
| `M7` solar / shadow simplification | locked energy layer 2 and onboard-energy claims |
| `M8` flat-Earth off-axis approximation | locked beam geometry and off-axis gain claims |

This list does not forbid development work. It defines when a tolerance may remain only `tbd` or `provisional`.

---

## 7. Reproduction Record Schema

Each reproduction target should be recorded with at least the following fields:

| Field | Meaning |
|---|---|
| `recordId` | stable identifier for the reproduction target |
| `claimLevel` | `L0`, `L1`, `L2`, or `L3` |
| `familyId` | one entry from `ntn-sim-core-paper-family-matrix.md` |
| `referenceType` | paper table, paper figure, donor code, donor artifact, standard checkpoint |
| `referenceSource` | citation, repo path, or artifact identity |
| `metric` | compared metric or event sequence |
| `comparisonMode` | absolute, relative, rank-order, event-sequence, qualitative |
| `runClass` | deterministic formula, seeded deterministic, seeded stochastic |
| `toleranceStatus` | `tbd`, `provisional`, or `locked` |
| `toleranceValue` | the declared tolerance when available |
| `aggregationRule` | mean, median, percentile, event count, exact sequence, or not applicable |
| `blockerNotes` | known remediation items still affecting this comparison |
| `artifactBundle` | manifest / KPI / raw comparison references |
| `disclosureNotes` | assumptions or deviations from the paper |

---

## 8. Statistical and Comparison Rules

1. Deterministic formula checkpoints should prefer exact or very tight numeric comparison once the formula path is stable.
2. Seeded system runs must record the seed in the artifact, even if only one seed is used.
3. Seeded stochastic studies must declare:
   - the seed set,
   - the aggregation rule,
   - the spread statistic or confidence presentation used.
4. If a paper reports only trend direction or rank ordering, the comparison mode may be qualitative or rank-order, but this must be stated explicitly.
5. If a paper omits explicit parameters and the simulator fills them using assumptions, the result may still reach `L2`, but not `exact replication` wording.
6. Cross-paper comparisons should not be normalized into a single scoreboard unless the profile family, KPI definition, and observer assumptions are aligned.

---

## 9. Result Wording Rules

Allowed wording examples:

1. `formula-verified against REF-CHAN-001`
2. `donor-parity established for synthetic orbit cache path`
3. `family-faithful reproduction of HOBS-style multibeam baseline with disclosed assumptions`
4. `paper-claim artifact generated under locked tolerance`

Prohibited wording examples:

1. `matches the paper` when the compared metric is only visually similar;
2. `realistic` without specifying which family or standard basis is meant;
3. `reproduced` when the result only passed `L0` or `L1`;
4. `exact replication` when assumption-backed parameters remain in the claim path.

---

## 10. Immediate v0 Operating Rule

Until the first corrected benchmark paths are available:

1. reproduction records may be created with `toleranceStatus = tbd`;
2. donor parity targets should still be defined now, even before every blocker is fixed;
3. no new KPI-impacting family should advance toward `L3` without an explicit reproduction record.
