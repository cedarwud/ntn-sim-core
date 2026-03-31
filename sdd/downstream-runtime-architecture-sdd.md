# Downstream Runtime Architecture SDD

**Status:** Active downstream-prep surface  
**Date:** 2026-03-31  
**Depends on:** Platform Refactor final audit passed; frozen contracts remain intact

## 1. Purpose

Define the smallest shared architecture surface that should exist **before** starting downstream `MODQN` and baseline-oriented `UI` work.

This SDD is intentionally smaller than the Phase 1–5 platform program. It exists to prevent the next steps from:

1. re-introducing direct `engine` / `profiles` coupling;
2. mixing algorithm logic, experiment logic, and UI rendering logic in the same modules;
3. letting `UI` or future consumers bypass frozen contracts;
4. turning baseline reproduction into another hardwired one-off path.

## 2. Scope

### 2.1 In Scope

1. define the minimal downstream layer split:
   - `algorithms`
   - `experiments`
   - `view-models`
   - `adapters`
2. define what each layer owns and what it must not own;
3. define the promotion path from outline docs into the smallest active SDD surfaces for:
   - MODQN baseline reproduction
   - baseline-oriented UI work
4. define the minimum structural skeleton that may be landed before feature work starts.

### 2.2 Not In Scope

1. implementing MODQN training logic;
2. implementing baseline UI screens;
3. reopening Platform Refactor Phase 1–5;
4. activating `project/estnet-ui-kickoff`;
5. introducing HOBS / EE / comparison variants.

## 3. Target Downstream Layers

### 3.1 `algorithms`

Purpose:
1. contain algorithm-facing runtime adapters and policy logic;
2. isolate baseline reproduction or future RL logic from `engine/` internals.

Allowed ownership:
1. baseline algorithm state/action/reward adapters;
2. algorithm-specific config parsing that depends only on frozen contracts and parameter metadata;
3. algorithm-specific observation shaping.

Forbidden ownership:
1. direct mutation of `engine/` internals;
2. UI rendering logic;
3. experiment artifact formatting;
4. consumer-specific transport logic.

### 3.2 `experiments`

Purpose:
1. define reproducible run specs, manifests, and artifact assembly for baseline experiments;
2. separate “how to run and record” from “how the algorithm works”.

Allowed ownership:
1. experiment spec types;
2. training/eval manifests;
3. artifact bundle assembly;
4. figure/chart input preparation for UI handoff.

Forbidden ownership:
1. direct UI rendering;
2. algorithm policy implementation;
3. internal engine orchestration beyond stable runner/contract surfaces.

### 3.3 `view-models`

Purpose:
1. convert frozen contract outputs into UI-oriented structures;
2. keep UI components away from raw runtime internals.

Allowed ownership:
1. KPI cards / chart series / timeline rows / parameter panel projections;
2. derived display-only formatting;
3. baseline result presentation models.

Forbidden ownership:
1. recomputing simulator truth;
2. direct dependency on `src/core/engine/` internals;
3. ad hoc provenance invention.

### 3.4 `adapters`

Purpose:
1. host consumer-specific bridges over frozen contracts;
2. isolate future `estnet` or other consumers from internal file layout.

Allowed ownership:
1. contract-to-consumer mapping;
2. export/import boundary helpers;
3. consumer-side DTO shaping.

Forbidden ownership:
1. owning simulation truth;
2. bypassing frozen contracts;
3. importing internal authored profile files as consumer dependencies.

## 4. Directory Guidance

The preferred minimum downstream layout is:

1. `src/core/algorithms/`
2. `src/core/experiments/`
3. `src/app/view-models/` or `src/viz/view-models/`
4. `src/adapters/`

This SDD does **not** require all directories to be created immediately. Group 2 should create only the ones needed to support the first downstream scope:

1. baseline MODQN reproduction;
2. baseline result bundle;
3. baseline UI viewer / KPI presentation.

## 5. Ownership Rules

1. `engine/` remains simulation orchestration only.
2. `contracts/` remain the only stable consumer-facing truth boundary.
3. `algorithms/` may depend on:
   - `contracts/`
   - `models/`
   - parameter metadata surfaces
   but should not depend on authored profile implementation details.
4. `experiments/` may depend on:
   - `contracts/`
   - runner surfaces
   - `algorithms/`
   but should not own policy logic itself.
5. `view-models/` may depend on:
   - `contracts/`
   - artifact/result types
   but should not depend on `engine/`.
6. `adapters/` must sit at the boundary and may depend on:
   - `contracts/`
   - `view-models/`
   - stable experiment result types
   but should not import internal authored-profile modules.

## 6. Promotion Targets

Before downstream implementation starts, the following docs should be promoted or rewritten:

1. `modqn-baseline-spec-outline.md`
   - promoted into a baseline-only active MODQN spec
2. `ui-integration-roadmap.md`
   - promoted into a baseline UI active spec
3. `modqn-runtime-outline.md`
   - stays outline until baseline spec is clear, then becomes implementation surface
4. `modqn-experiment-outline.md`
   - stays outline until baseline runtime shape is clear, then becomes artifact/result surface
5. `estnet-ui-contract-outline.md`
   - remains paused

## 7. Group Plan

### Group 1 — Promotion / Boundary Freeze

Group 1 should:

1. verify the post-refactor repo still matches frozen downstream assumptions;
2. decide which of `algorithms/`, `experiments/`, `view-models/`, `adapters/` must exist immediately;
3. rewrite `modqn-baseline-spec-outline.md` and `ui-integration-roadmap.md` into the smallest active downstream spec surfaces;
4. update `todo/` sequencing so downstream work starts from the promoted surfaces, not directly from the older outline wording.

### Group 2 — Minimal Skeleton Landing

Group 2 should:

1. create the minimal downstream directories / index files / boundary types required by the promoted specs;
2. avoid landing full MODQN or full UI feature work;
3. ensure the skeleton uses frozen contracts rather than direct core internals;
4. leave actual baseline implementation to `M1/U1` and later groups.

## 8. Completion Criteria

This downstream-prep stage is complete only when:

1. the repo has a clear active downstream architecture surface;
2. `modqn-baseline-spec-outline.md` is no longer acting as a mere outline for the approved baseline scope;
3. `ui-integration-roadmap.md` is no longer acting as a mere outline for the approved baseline UI scope;
4. any newly created downstream skeleton directories are wired without violating frozen contracts;
5. `todo/README.md`, `todo/modqn/README.md`, and `todo/ui-estnet/README.md` all point to the promoted downstream path.

## 9. Validation Expectations

At minimum, downstream-prep completion must preserve:

1. `npm run lint`
2. `npm run validate:contracts`
3. `npm run validate:stage`

If the structural skeleton touches UI-visible surfaces, also run the smallest relevant browser-visible validation path.
