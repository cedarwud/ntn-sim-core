# Documentation Index

This folder holds the architecture and SDD documents for `ntn-sim-core`.
The simulator-platform refactor is already complete; downstream MODQN / UI work now enters through preflight-first outline promotion rather than a new platform phase.

## Primary Entry Points

1. `architecture/ntn-sim-core-architecture-blueprint.md`
   - formal architecture blueprint
   - system layering, source-project contribution map, and target directory layout
2. `../sdd/ntn-sim-core-sdd.md`
   - normative software design document
   - product scope, code organization, profile model, and core invariants
3. `../sdd/ntn-sim-core-profile-baselines.md`
   - detailed baseline envelopes, channel tiers, beam-gain mappings, and source families
4. `../sdd/ntn-sim-core-platform-refactor-roadmap.md`
   - completed platform-program roadmap / closure record
   - simulator-platform refactor order, phase boundaries, and exit criteria
5. `../sdd/ntn-sim-core-validation-matrix.md`
   - validation and gate definitions
   - checks needed before research claims or visual demos are trusted
6. `../sdd/ntn-sim-core-implementation-status.md`
   - authoritative status tracker for phases and document ownership
7. `../sdd/ntn-sim-core-development-constraints.md`
   - non-negotiable development constraints for benchmark-capable code
8. `../sdd/ntn-sim-core-acceptance-gates.md`
   - merge, benchmark, paper-claim, and showcase acceptance rules
9. `../sdd/ntn-sim-core-assumption-policy.md`
   - rules for when assumptions are allowed and how they must be recorded
10. `../sdd/ntn-sim-core-frontend-beam-visual-sdd.md`
   - normative frontend beam-rendering contract for multibeam access and BH modes
11. `../sdd/ntn-sim-core-ui-exposure-spec.md`
   - current parameter exposure contract
12. `../archive/ntn-sim-core-sdd-history-2026-03-29/`
   - historical closure, donor, and one-shot acceptance documents
13. `../todo/README.md`
   - downstream prompt/program entry after platform closure
   - use with `agent-governance.md` when promoting MODQN / UI outlines into active work

## Working Rule

1. `architecture blueprint` defines the intended shape of the system.
2. `SDD` defines the normative engineering contract.
3. `platform-refactor roadmap` records the completed execution order that produced the frozen platform closure.
4. downstream work starts only after re-checking current repo state and promoting outline docs into the smallest active SDD surface; use `agent-governance.md` plus `../todo/README.md` for that sequencing.
5. `validation matrix` defines what must be true before a phase or promoted downstream surface can be considered done.
6. companion governance docs constrain what may be merged, claimed, or assumed during implementation.
7. historical closure documents may explain how earlier work landed, but they do not override the active SDD set.
