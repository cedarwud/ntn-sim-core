# NTN Sim Core — Acceptance Gates

**Version:** 0.3.0  
**Date:** 2026-03-25  
**Status:** Active Companion-Updated Gates

---

## 1. Purpose

This document defines the acceptance gates that must be satisfied before code, profiles, benchmark results, or showcase outputs are treated as valid.

It turns the SDD and validation matrix into day-to-day merge and claim rules.

---

## 2. Gate Hierarchy

Acceptance is evaluated in increasing order:

1. `merge gate`
2. `profile activation gate`
3. `benchmark run gate`
4. `paper-claim gate`
5. `showcase gate`

Failing an earlier gate blocks all later gates.

---

## 3. Merge Gate

Any code change may be merged only if all of the following are true:

1. changed files respect the current layer ownership in the SDD;
2. any new KPI-impacting contract is serializable;
3. any new KPI-impacting model path has a declared source tier;
4. required docs are updated if architecture, profile, or trace contracts changed;
5. `npm run validate:stage` passes.

If the change affects Phase 3 to Phase 6 frontend beam delivery, it must also update:

1. `sdd/ntn-sim-core-frontend-beam-visual-sdd.md` when the rendering contract changes;
2. `sdd/ntn-sim-core-validation-matrix.md` when visual evidence or gate definitions change;
3. `sdd/ntn-sim-core-ui-exposure-spec.md` when the exposure contract or explainability-facing controls change.

If the change adds or changes a frontend overlay or link explainer, it must also prove:

1. the explainer reads only from snapshot/trace truth;
2. it does not recompute KPI-authoritative values as a second simulator path;
3. its role in the result context is evidence/explanation, not benchmark authority.

If the change introduces a new core contract, it must also add or update:

1. the relevant type/schema file;
2. the relevant manifest or trace contract;
3. the relevant validation target or placeholder.

---

## 4. Profile Activation Gate

A profile family or profile variant may be considered active only if:

1. its parameters are serializable;
2. its observer policy is explicit;
3. its orbit mode, beam semantics, and channel tier are explicit;
4. KPI-impacting defaults are tagged as:
   - `paper-backed`
   - `standard-backed`
   - `assumption-backed`
5. any nontrivial assumptions follow `ntn-sim-core-assumption-policy.md`.

---

## 5. Benchmark Run Gate

A run may be treated as a benchmark artifact only if:

1. it passes the phase-appropriate validation IDs from `ntn-sim-core-validation-matrix.md`;
2. it records:
   - run manifest
   - resolved config
   - source-trace
   - replay metadata when applicable
3. seed and time-control settings are explicit;
4. no `debug-only` model family is in the KPI path;
5. any `assumption-backed` element is disclosed.

Minimum benchmark artifact bundle:

1. machine-readable manifest
2. machine-readable KPI bundle
3. source-trace coverage for KPI-impacting model families
4. enough metadata to replay or recompute the run

---

## 6. Paper-Claim Gate

A figure, table, or stated result may be used as research evidence only if:

1. the benchmark run gate already passed;
2. the corresponding profile family is documented in the SDD set;
3. every KPI-impacting model family used in that result has source-trace references;
4. every `assumption-backed` parameter relevant to the claim is disclosed in the result context;
5. any new formula family or algorithm path has at least one golden case or equivalent reference check;
6. the result is not generated from a showcase-only path.

Results that fail these rules may still be useful for:

1. local exploration
2. debugging
3. engineering smoke checks

But they must not be framed as publishable benchmark evidence.

---

## 7. Showcase Gate

A replay, demo, or presentation sequence may be treated as a valid showcase only if:

1. it uses the same physics core as the benchmark path;
2. the selected window or observer is recorded in metadata;
3. the selection process is deterministic;
4. the output is explicitly labeled `showcase`;
5. it can be regenerated from stored replay metadata without manual scene editing.
6. any beam-related showcase satisfies `sdd/ntn-sim-core-frontend-beam-visual-sdd.md`;
7. closure evidence includes browser-visible proof, not only script output.
8. any overlay or link explainer in the showcase is derived from stored snapshot/trace truth and does not override the exported benchmark artifact.

Showcase outputs may prioritize readability, but not by changing physics.

---

## 8. Rejection Conditions

The following are immediate rejection conditions for benchmark or paper-claim usage:

1. missing source-trace for KPI-impacting logic;
2. unseeded randomness affecting outcomes;
3. manual orbit or event manipulation after simulation;
4. hidden constants affecting SINR, HO, beam activity, or energy;
5. `debug-only` models appearing in benchmark outputs;
6. assumptions present but undocumented.

---

## 9. Multi-Agent Merge Rule

For parallel development:

1. each sub-agent must own a disjoint write scope;
2. shared contracts must be stabilized first;
3. the main agent must run the final acceptance checks after integration;
4. no sub-agent result is considered landed until the merged tree passes the merge gate.
