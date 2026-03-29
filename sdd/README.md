# SDD Document Set

This folder contains the active design authority for `ntn-sim-core`.

As of 2026-03-29, the project is being re-positioned from "paper-specific simulator hardening" to a longer-lived **parameter-driven, model-pluggable simulator platform**. The SDD set is therefore split into:

1. **Core authority files** that remain normative across all programs
2. **Active program files** that define the next development track
3. **Outline files** for downstream work that depends on the active program
4. **Historical / closure files** moved to `archive/`

## 1. Core Authority

These files remain the long-lived authority set:

1. `ntn-sim-core-sdd.md`
   - top-level simulator design contract
2. `ntn-sim-core-implementation-status.md`
   - authoritative current-state tracker
3. `ntn-sim-core-validation-matrix.md`
   - validation IDs and pass conditions
4. `ntn-sim-core-development-constraints.md`
   - non-negotiable implementation constraints
5. `ntn-sim-core-acceptance-gates.md`
   - merge / benchmark / claim / showcase gates
6. `ntn-sim-core-assumption-policy.md`
   - assumption taxonomy and disclosure rules
7. `ntn-sim-core-profile-baselines.md`
   - current baseline/profile family reference
8. `ntn-sim-core-paper-family-matrix.md`
   - literature family map and claim ceiling guide
9. `ntn-sim-core-reproduction-protocol.md`
   - reproduction claim discipline
10. `ntn-sim-core-reproduction-targets.md`
   - active reproduction target definitions
11. `ntn-sim-core-ui-exposure-spec.md`
   - current UI exposure contract
12. `ntn-sim-core-frontend-beam-visual-sdd.md`
   - frontend visual/rendering contract that still governs truth-driven beam rendering

## 2. Active Program: Simulator Platform Refactor

These files define the current active development program. This program must complete before MODQN runtime work or new UI integration work is treated as active implementation.

1. `ntn-sim-core-platform-refactor-roadmap.md`
   - master roadmap for the platform refactor program
2. `phase0-architecture-spec.md`
   - target architecture layering and boundary rules
3. `phase1-parameter-registry-sdd.md`
   - canonical parameter registry and provenance core
4. `phase2-model-bundle-sdd.md`
   - pluggable 8-family model interfaces: geometry/path-loss/beam-gain/SINR/handover/power/EE/policy
5. `phase3-scenario-profile-experiment-split.md`
   - scenario/profile/experiment separation
6. `phase4-runtime-contract-sdd.md`
   - runtime APIs and external integration contracts
7. `phase5-cleanup-and-modularization-sdd.md`
   - dead code cleanup, file-splitting, and deprecation retirement

## 3. Deferred Program Outlines

These are intentionally outline-level documents only. They must not be treated as implementation-ready SDDs until their dependency phases are complete and the repository is re-reviewed.

1. `modqn-roadmap.md`
2. `modqn-baseline-spec-outline.md`
3. `modqn-runtime-outline.md`
4. `modqn-experiment-outline.md`
5. `ui-integration-roadmap.md`
6. `estnet-ui-contract-outline.md`

Each outline must explicitly state which preceding phase(s) must finish before the outline can be promoted into an active SDD.

## 4. Archived Historical Documents

Closed closure notes, stale roadmaps, donor-migration notes, and one-shot acceptance documents are no longer kept in this folder as authority. They are archived under:

- `/home/u24/papers/archive/ntn-sim-core-sdd-history-2026-03-29/`

Historical documents may be cited for forensic context, but they must not override the active authority set above.

## 5. Working Rule

1. No KPI-impacting implementation should land without a corresponding place in:
   - the core authority set
   - the active program SDDs
   - the validation matrix
2. Do not start MODQN implementation or new UI integration from outline files alone.
3. Any outline promoted into active work must first be rewritten after re-checking current repo state.
4. Architecture changes should update the blueprint under `docs/architecture/` in the same change set when that blueprint is still the governing view.
