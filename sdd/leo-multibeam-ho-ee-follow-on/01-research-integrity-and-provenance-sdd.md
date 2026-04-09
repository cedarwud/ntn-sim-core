# 01. Research Integrity And Provenance SDD

**Status:** proposed  
**Priority:** P0  
**Why first:** no follow-on algorithm or visualization work matters if the repo still has unresolved provenance ambiguity in research-facing profiles

## 1. Problem Statement

The current `ntn-sim-core` governance skeleton is strong, but there is still a material gap between validator coverage and authored profile provenance coverage.

Observed issues from the current tree:

1. `validate:registry` passes for canonical registry bindings, but it does not validate all authored profile `sourceMap` IDs.
2. `validate:specmode` currently checks assumption consistency, but it does not fail when `paper-backed`, `standard-backed`, or `normative` IDs are missing from `paper-sources.json`.
3. authored profiles currently reference unregistered IDs such as `REAL-TRACE-POLICY`, `O3B-MEO`, `ITU-GEO`, and `LEO-BEAM-SIM-REF`.
4. some `paper-sources.json` `usedIn` paths still point at pre-refactor ownership like `src/core/channel/*` even where runtime authority has moved.
5. donor-derived handover settings are currently close enough to paper-facing presets that users can over-read them as thesis-safe defaults.

## 2. Goals

1. make every research-facing authored provenance ID machine-checkable;
2. separate paper, standard, donor, assumption, and local-governance references cleanly;
3. remove all silent provenance drift between authored defaults, parameter registry, SDD wording, and runtime claims;
4. ensure `paper-catalog` and `system-model-refs` remain the only acceptable authority chain for paper-backed claims.

## 3. Non-Goals

1. changing handover or orbit algorithms by itself;
2. adding new UI features;
3. widening real-trace scale or mixed-orbit scope.

## 4. Required Changes

### 4.1 Add sourceMap registry enforcement

Add a validator that fails when any authored `sourceMap` entry uses:

1. an unregistered paper ID;
2. an unregistered standard ID;
3. an unregistered normative/local-governance ID;
4. a donor ID that is mislabeled as `paper-backed`.

The validator must cover:

1. `defaults-access.ts`
2. `defaults-hobs.ts`
3. `defaults-bh.ts`
4. `defaults-misc.ts`
5. any future authored profile catalog surface

### 4.2 Introduce explicit donor reference namespace

Create an explicit donor namespace such as `DONOR-*` or `REF-*` in `paper-sources.json` or a parallel governed registry.

Rules:

1. donor references must never be tagged as `paper-backed`;
2. donor references may support `Advanced` or `Internal-only` presets;
3. donor references must carry file/path provenance and a note describing what was borrowed.

### 4.3 Repair current authored provenance drift

Resolve current ambiguous IDs by one of two paths:

1. register them properly with honest type and description; or
2. replace them with existing valid IDs plus explicit assumption notes.

Specifically:

1. `LEO-BEAM-SIM-REF` must stop being `paper-backed`;
2. `REAL-TRACE-POLICY` must become a governed local policy reference or disappear;
3. `O3B-MEO` and `ITU-GEO` must become explicitly registered external-reference entries or be restated as assumption/local-baseline notes.

### 4.4 Repair stale `usedIn` ownership

Refresh `paper-sources.json` so `usedIn` matches current post-refactor ownership and does not suggest obsolete runtime structure.

## 5. Acceptance Criteria

1. a new validator fails if any authored `sourceMap` ID is unregistered;
2. no `paper-backed` authored entry points to donor-only material;
3. all `Realistic` profiles resolve only to registered paper/standard/governed-local entries;
4. `paper-sources.json` `usedIn` references are current enough to be credible for code review.

## 6. Recommended Donor Input

Primary donor inspiration should come from `project/beamHO-bench`, not from `leo-beam-sim`, because the missing piece here is governance discipline rather than richer HO behavior.

## 7. Validation

Add and require:

1. `VAL-SRC-001`: authored profile `sourceMap` ID resolution;
2. `VAL-SRC-002`: no donor-only ID may appear as `paper-backed`;
3. `VAL-SRC-003`: `Realistic` presets may not depend on donor-only or assumption-only provenance;
4. `VAL-SRC-004`: `usedIn` ownership references are non-stale against current module layout.
