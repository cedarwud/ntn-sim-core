# NTN Sim Core — Development Constraints

**Version:** 1.0.0
**Date:** 2026-03-25
**Status:** Active

---

## 1. Purpose

This document defines the non-negotiable development constraints for `ntn-sim-core`.

It exists to prevent:

1. benchmark logic from drifting into demo-only shortcuts;
2. untraceable simplifications from entering research results;
3. SDD drift during parallel or multi-agent development.

---

## 2. Governance Role

This file complements, but does not replace:

1. `docs/architecture/ntn-sim-core-architecture-blueprint.md`
2. `sdd/ntn-sim-core-sdd.md`
3. `sdd/ntn-sim-core-profile-baselines.md`
4. `sdd/ntn-sim-core-validation-matrix.md`
5. `sdd/ntn-sim-core-acceptance-gates.md`
6. `sdd/ntn-sim-core-assumption-policy.md`

If two interpretations conflict, prefer:

1. architecture blueprint for layer ownership;
2. SDD for normative design;
3. this file for implementation-time prohibitions;
4. acceptance and assumption policies for merge/result governance.

---

## 3. Model and Data Tiers

Every KPI-impacting implementation path must be classified into one of these tiers.

| Tier | Meaning | Allowed Use |
|---|---|---|
| `normative` | repo-defined contract that must always hold, such as determinism, serialization, or layer separation | all modes |
| `paper-backed` | directly grounded in one or more cataloged papers | benchmark, showcase, paper claims |
| `standard-backed` | grounded in 3GPP / ITU-R / similarly authoritative standards | benchmark, showcase, paper claims |
| `assumption-backed` | explicit engineering assumption with traceability and disclosure | benchmark only with disclosure, ablation, showcase |
| `debug-only` | convenience model for local inspection or smoke testing | debug only |

`debug-only` implementations must never be silently promoted into benchmark mode.

---

## 4. Non-Negotiable Constraints

### 4.1 One Physics Core

1. `benchmark`, `showcase`, and `debug` must share the same simulation-truth path for any KPI-impacting behavior.
2. Visualization may consume snapshots, traces, and event records only.
3. `src/core/**` must not import React, Three.js, or scene-specific code.

### 4.2 Determinism and Serialization

1. Every benchmark-capable run must be reconstructable from:
   - profile
   - runtime overrides
   - seed
   - manifest
   - source-trace
2. Any randomness must be seed-controlled.
3. Any profile, manifest, replay manifest, or KPI bundle must be serializable.

### 4.3 Source Traceability

1. Every KPI-impacting model family must have source metadata.
2. Every nontrivial simplification must be labeled either:
   - `paper-backed`
   - `standard-backed`
   - `assumption-backed`
   - `debug-only`
3. Hidden constants that materially affect SINR, HO, beam activity, throughput, or energy are prohibited.

### 4.4 Benchmark and Showcase Separation

1. `benchmark` mode is for paper-grade outputs and must avoid presentation-driven physics changes.
2. `showcase` mode may change:
   - camera
   - label density
   - replay window
   - playback speed
   - visual emphasis
3. `showcase` mode must not change:
   - orbit truth
   - channel truth
   - beam activity truth
   - handover truth
   - KPI accumulation

### 4.5 Real-Trace Integrity

1. TLE or real ephemeris data may define orbit motion and visibility timing.
2. TLE data does not define:
   - beam count
   - beam gain family
   - EIRP or Tx power
   - scheduler policy
   - UE distribution
3. Those missing pieces must come from profile definitions, papers, standards, or explicit assumptions.
4. Real-trace readability must come from deterministic curation, not orbit manipulation.

### 4.6 Simplification Discipline

1. Simplified channel, beam, or energy models are allowed only if their usage scope is explicit.
2. If a source paper or standard already provides a suitable formula family, benchmark mode must not silently replace it with a weaker toy model.
3. `flat gain`, `SNR-only`, or other stripped models may exist for debug, but must be marked `debug-only` unless explicitly justified in a benchmark profile.

---

## 5. Mode-Specific Constraints

### 5.1 Benchmark Mode

Benchmark mode must satisfy all of the following:

1. active profile family is explicitly declared;
2. KPI-impacting model tiers are source-traced;
3. seed and runtime overrides are recorded;
4. no manual event cherry-picking after result generation;
5. no manual orbit nudging or hand-edited replay timing;
6. no `debug-only` model families in the KPI path.

### 5.2 Showcase Mode

Showcase mode must satisfy all of the following:

1. it uses the same physics core as benchmark mode;
2. replay window selection is deterministic and recorded;
3. any readability-oriented observer or time-window choice is explicitly labeled;
4. the output is labeled `showcase`, not benchmark.

### 5.3 Debug Mode

Debug mode may relax model fidelity, but:

1. it must not overwrite benchmark defaults;
2. it must not export results as benchmark artifacts;
3. it must remain distinguishable in manifests and UI labels.

---

## 6. Multi-Agent Development Constraints

1. Each sub-agent must have a disjoint write scope.
2. Shared contracts must be defined before parallel edits start.
3. No sub-agent may introduce KPI-impacting assumptions without trace metadata.
4. No sub-agent may change core-vs-viz ownership boundaries without updating the SDD set.
5. Integration is incomplete until the main agent reruns validation and checks contract compatibility.

---

## 7. Prohibited Patterns

The following are explicitly prohibited in research-grade paths:

1. manually adjusting orbit motion to make a prettier pass;
2. using showcase-only observer or replay rules in benchmark outputs without disclosure;
3. inventing beam or power parameters from TLE alone;
4. embedding KPI-impacting thresholds directly in UI components;
5. using unseeded randomness in orbit, handover, scheduler, or energy logic;
6. claiming paper-grade realism from `debug-only` models;
7. merging KPI-impacting code without a matching place in:
   - the SDD or companion SDD docs;
   - the validation matrix;
   - the source-trace path.

---

## 8. Minimum Enforcement Rule

Before a new KPI-impacting feature is considered valid for further development, it must have:

1. a declared tier from Section 3;
2. a serializable contract;
3. an identified validation target in `ntn-sim-core-validation-matrix.md`;
4. an acceptance path in `ntn-sim-core-acceptance-gates.md`.
