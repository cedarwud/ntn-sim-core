# NTN Sim Core — Donor Integration Map

**Version:** 0.1.0  
**Date:** 2026-03-23  
**Status:** Draft v0

---

## 1. Purpose

This document defines how `ntn-sim-core` should absorb ideas and implementations from the other project repos without losing architecture ownership or research traceability.

The goal is not to "merge five repos". The goal is to:

1. import the right contracts and formula families;
2. keep one coherent physics core in `ntn-sim-core`;
3. require explicit parity checks before donor logic is treated as integrated.

---

## 2. Integration Rules

1. A donor repo contributes modules, contracts, artifacts, or workflow patterns; it does not become the architecture owner of `ntn-sim-core`.
2. No KPI-impacting donor logic is considered integrated until it has:
   - a source tier,
   - a target module owner in `ntn-sim-core`,
   - a validation target,
   - a parity artifact or planned parity check.
3. Scene-only controls, deployment scaffolding, or convenience UX from donor repos must not enter the benchmark core by default.
4. If donor logic is adapted rather than copied exactly, the adaptation must be declared in source-trace or assumption metadata.
5. Donor parity should be tracked per model family, not as a vague repo-level statement.

---

## 3. Donor Roles

| Source Repo / Source Type | Primary Keep / Learn | Intended Role in `ntn-sim-core` | Non-Transfer / Caution | Required Parity Evidence |
|---|---|---|---|---|
| `beamHO-bench` | benchmark governance, source-trace discipline, dual orbit architecture, TLE fixture workflow, validation artifact mindset | research oracle and validation reference | do not blindly inherit generic BH scheduler behavior as a paper-default family; do not import repo-local shortcuts without re-tagging them | trace schema parity, deterministic run parity, TLE window-selection parity, KPI artifact coverage |
| `leo-beam-sim` | synthetic orbit stepping, trajectory cache, topocentric geometry, multibeam layout, Bessel-family beam logic, active-beam behavior | frontend synthetic / multibeam donor | do not let scene projection or render interpolation leak into core formulas; do not treat scene-only layout helpers as research truth by default | orbit sample parity, off-axis / beam-gain golden cases, active-beam serviceability parity |
| `leo-simulator` | replay manifests, timeseries playback, interpolation separation, frontend-friendly subset playback | replay and curation donor | precomputed azimuth / elevation streams must not replace the benchmark truth path; replay UX is not a source of channel realism | replay ordering parity, time-offset parity, interpolation invariants versus stored trace |
| `ntn-stack` | preprocessing mindset, SGP4 offline windows, coordinate-service separation, pipeline boundaries | offline precompute and heavy-mode reference | do not import larger backend/deployment structure into the research core without need; do not duplicate coordinate logic across core and pipeline | precompute orbit-window parity, coordinate checkpoint parity, manifest/provenance parity |
| papers / standards | formulas, explicit parameter values, KPI semantics, claim scope limits | ultimate source authority for paper-backed and standard-backed paths | do not downgrade an explicit paper or standard formula to a toy model in benchmark mode | formula checkpoints, source-trace references, reproduction records |

---

## 4. Transfer Classes

Each donor contribution should be tagged into one of these transfer classes:

| Transfer Class | Meaning | Typical Examples |
|---|---|---|
| `contract-transfer` | schema, manifest, or interface pattern | source-trace schema, replay manifest, profile structure |
| `formula-transfer` | mathematical model or algorithmic rule | Bessel gain, SGP4 preprocessing contract, large-scale loss composition |
| `artifact-transfer` | reusable fixture or generated dataset format | TLE fixture manifest, replay window manifest |
| `workflow-transfer` | validation or development workflow pattern | stage gates, parity workflow, benchmark artifact bundle |
| `non-transfer` | useful reference but should not be imported directly | scene-only controls, repo-specific app shell, deployment wiring |

---

## 5. Phase-Aligned Transfer Plan

| Phase | First Donor Transfers | Integration Intention | Minimum Parity Target |
|---|---|---|---|
| Phase 0-1 | `beamHO-bench` workflow-transfer, `leo-beam-sim` formula-transfer for synthetic orbit, `ntn-stack` coordinate separation mindset | establish one core, deterministic orbit truth, and trace contracts | headless/frontend orbit parity and manifest parity |
| Phase 2 | `beamHO-bench` contract-transfer for access benchmark artifacts, paper/standard formula-transfer for access channel + HO | land first access-grade benchmark family | HO event trace parity and access golden cases |
| Phase 3 | `leo-beam-sim` formula-transfer for multibeam logic, paper donors for HOBS / fading / EE | land first target-topic multibeam family | beam-gain golden cases, interference-path parity, active-beam parity |
| Phase 4 | `ntn-stack` artifact-transfer for offline windows, `leo-simulator` replay transfer, `beamHO-bench` TLE workflow | unify real-trace validation with replay curation | selected-window parity and replay reconstruction parity |
| Phase 5+ | paper donors plus prior repos for BH, energy, DAPS / policy extension | add BH, EE-L2, and continuity families without splitting the core | scheduler event parity, energy-blocking parity, later dual-link parity |

---

## 6. Donor Ownership Boundaries

The target ownership split inside `ntn-sim-core` is:

1. `beamHO-bench` donates process discipline before code volume;
2. `leo-beam-sim` donates synthetic and multibeam runtime structure;
3. `leo-simulator` donates replay and interpolation contracts;
4. `ntn-stack` donates preprocessing and coordinate-service boundaries;
5. papers and standards retain final authority over formulas and claim scope.

No donor should own more than one of the following simultaneously:

1. architecture authority;
2. formula authority;
3. validation authority;
4. replay authority.

This prevents `ntn-sim-core` from becoming a disguised copy of a single upstream repo.

---

## 7. Parity Status Labels

| Status | Meaning | Allowed Statement |
|---|---|---|
| `planned` | donor relation documented, parity case not yet executed | "integration target exists" |
| `partial` | some checkpoints pass, but family-level parity is incomplete | "partially aligned to donor" |
| `locked` | required checkpoints pass and are artifact-backed | "parity established for this transfer scope" |

Repo-level statements such as "already integrated from X" are prohibited unless the scope is narrowed to a specific transfer and parity status.

---

## 8. Immediate Application to the Current Repo Set

The first document-backed integration priorities should be:

1. from `beamHO-bench`: validation artifact discipline, real-trace workflow, and profile-source trace coverage;
2. from `leo-beam-sim`: multibeam / HOBS geometry and beam-gain donor checks;
3. from `leo-simulator`: replay manifest and interpolation contract;
4. from `ntn-stack`: heavy precompute and coordinate provenance boundaries.

The first explicit non-priorities should be:

1. porting UI shells across repos;
2. copying repo-specific deployment layers;
3. declaring repo-level convergence before model-level parity exists.
