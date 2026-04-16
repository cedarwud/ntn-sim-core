# SDD Document Set

This folder contains the active design authority for `ntn-sim-core`.

As of 2026-04-15, the project has completed the simulator-platform refactor, the downstream-architecture Group 2 landing, the MODQN M3 result-handoff stabilization, the UI baseline viewer path through U2, the real-trace truth-path correction (`T1`), the paper-mode / claim-mode governance hardening (`PM1`), the current-anchor MODQN targeted parity package (`TP1`), the `EE / power` realism hardening line (`EP1`), and the first landing of the truth-preserving showcase visual realignment follow-on. The SDD set is therefore split into:

1. **Core authority files** that remain normative across all programs
2. **Completed platform-program files** that define the frozen closure baseline
3. **Shipped downstream files** that record the completed downstream baseline surfaces and paper-oriented follow-ons
4. **Deferred / paused downstream files** that still require additional promotion
5. **Historical / closure files** moved to `archive/`

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
9. `ntn-sim-core-research-positioning-note.md`
   - paper-oriented project positioning, gap ranking, and next-direction guidance
10. `ntn-sim-core-reproduction-protocol.md`
   - reproduction claim discipline
11. `ntn-sim-core-reproduction-targets.md`
   - active reproduction target definitions
12. `ntn-sim-core-ui-exposure-spec.md`
   - current UI exposure contract
13. `ntn-sim-core-frontend-beam-visual-sdd.md`
   - frontend visual/rendering contract that still governs truth-driven beam rendering

## 2. Completed Program: Simulator Platform Refactor

These files define the now-complete platform-refactor program that unlocked downstream work. They remain the frozen upstream baseline for all downstream programs.

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

## 3. Shipped Downstream Surface

These files remain the shipped downstream authority for the completed baseline surfaces. They are still the correct reference set for reviewer reruns and future reopen work, but they are **not** by themselves an active instruction to keep implementing the same lines.

1. `downstream-runtime-architecture-sdd.md`
   - shared downstream boundary and Group 2 landing record for `algorithms / experiments / view-models / adapters`
2. `modqn-baseline-spec-outline.md`
   - active MODQN baseline authority; M1 completion record plus the frozen paper-faithful contract surface consumed by M2
3. `modqn-runtime-outline.md`
   - active MODQN runtime/trainer authority; records the shipped M2 runtime/trainer surface consumed by later downstream work
4. `modqn-experiment-outline.md`
   - active MODQN M3 result/artifact authority; defines the stabilized baseline result bundle and viewer-facing handoff surface
5. `modqn-baseline-acceptance-note.md`
   - active reviewer note for aggregate M1-to-M3 baseline acceptance before optional `U1` richer-handoff consumption
6. `ui-integration-roadmap.md`
   - active baseline UI spec covering the shipped `U1`/`U2` path; still restricted to frozen contracts and stable runner surfaces
7. `real-trace-truth-path-correction-outline.md`
   - shipped narrow orbit/runtime correction authority; records the landed real-trace wording/runtime drift closure without reopening broader scalability work, and remains the owner of that runtime/validation scope even while later paper-oriented follow-ons are active
8. `paper-mode-claim-mode-hardening-outline.md`
   - shipped PM1 governance prerequisite; freezes the current anchor baseline, defines main-result vs robustness vs sensitivity claim tiers, and records the sibling-baseline extension rule consumed by the shipped parity surface
9. `modqn-targeted-parity-outline.md`
   - shipped TP1 paper-evidence surface; records the landed current-anchor parity bundle, `VAL-MODQN-004`, and the current target labels (`range-faithful` / `trend-faithful` / `qualitative-only`) without reopening runtime architecture
10. `ee-power-realism-hardening-outline.md`
   - shipped EP1 paper-safety surface; records the landed active-TX EE vs broader communication-power proxy split, the artifact `eePowerDisclosure` surface, and the minimum sensitivity/disclosure bar without reopening backend/protocol realism or downstream architecture
11. `modqn-bundle-replay-consumer-sdd.md`
   - active Phase 03A Slice B consumer authority for the frozen MODQN replay-bundle adapter under `src/adapters/modqn-bundle/`
12. `modqn-bundle-replay-ui-sdd.md`
   - active Phase 03A Slice C/D consumer authority for native-vs-bundle truth-source switching, slot stepping, and bundle metadata/provenance UI
13. `truth-preserving-showcase-visual-realignment-follow-on.md`
   - active narrow frontend showcase/readability authority for the landed `BeamPresentationFrame` scene grammar, dedicated `case9-daps-showcase` split, and associated browser gates

Any resumed MODQN/UI follow-on work must start from this surface plus a freshly promoted `todo/` handoff surface, not from older outline-only wording or archived prompt packs.

Any new paper-oriented work beyond these shipped surfaces should still start only after:

1. a fresh reviewer-grade rerun against the shipped current-anchor evidence / paper-safety surface if needed, and
2. a newly promoted follow-on SDD plus matching `todo/` handoff pack.

## 4. Deferred / Paused Downstream Files

These files are not valid implementation authority for the current baseline entry path without further promotion or explicit reopen.

1. `modqn-roadmap.md`
   - broader program roadmap; not a direct implementation surface
2. `estnet-ui-contract-outline.md`
   - paused future-consumer path; not active until explicit reopen
3. `real-trace-truth-path-preflight-note.md`
   - completed preflight decision record for the promoted T1 truth-path correction surface; not implementation authority itself
4. `real-trace-scalability-preflight-note.md`
   - blocked preflight decision record for future mixed-orbit / larger-catalog work; remains paused after T1 closure unless it is separately re-promoted
5. `earth-moving-beam-tracking-and-handover-candidate-follow-on.md`
   - proposed narrow beam / serving semantics correction surface; not implementation authority until explicitly promoted with matching `todo/` handoff docs

Each deferred file must explicitly state its frozen-platform assumptions, required preflight evidence, and promotion boundary before it can become active authority.

## 5. Archived Historical Documents

Closed closure notes, stale roadmaps, donor-migration notes, and one-shot acceptance documents are no longer kept in this folder as authority. They are archived under:

- `/home/u24/papers/archive/ntn-sim-core-sdd-history-2026-03-29/`

Historical documents may be cited for forensic context, but they must not override the active authority set above.

## 6. Working Rule

1. No KPI-impacting implementation should land without a corresponding place in:
   - the core authority set
   - the current active SDD surface (including any promoted downstream SDDs)
   - the validation matrix
2. Any resumed downstream work (including shipped UI baseline follow-on changes or explicitly reopened MODQN follow-ons) may start only from the active downstream surface above plus the matching `todo/` handoff docs.
3. Do not start paused MODQN follow-on work or `estnet` work from deferred / paused files alone.
4. Any deferred outline promoted into active work must first be rewritten after re-checking current repo state.
5. Architecture changes should update the blueprint under `docs/architecture/` in the same change set when that blueprint is still the governing view.
