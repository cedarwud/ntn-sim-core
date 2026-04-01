# Documentation Index

This folder holds the architecture and SDD documents for `ntn-sim-core`.
The simulator-platform refactor is complete, and downstream architecture Group 2 has landed. Baseline `MODQN M1` / `UI U1` work now enters through the active downstream surface rather than outline-only placeholders or a new platform phase.

## Primary Entry Points

1. `architecture/ntn-sim-core-architecture-blueprint.md`
   - formal architecture blueprint
   - system layering, source-project contribution map, and target directory layout
2. `../sdd/README.md`
   - top-level SDD authority index
   - current split between core authority, completed platform program, active downstream entry, and deferred/paused files
3. `../sdd/ntn-sim-core-sdd.md`
   - normative software design document
   - product scope, code organization, profile model, and core invariants
4. `../sdd/ntn-sim-core-profile-baselines.md`
   - detailed baseline envelopes, channel tiers, beam-gain mappings, and source families
5. `../sdd/ntn-sim-core-platform-refactor-roadmap.md`
   - completed platform-program roadmap / closure record
   - simulator-platform refactor order, phase boundaries, and exit criteria
6. `../sdd/ntn-sim-core-validation-matrix.md`
   - validation and gate definitions
   - checks needed before research claims or visual demos are trusted
7. `../sdd/ntn-sim-core-implementation-status.md`
   - authoritative status tracker for phases and document ownership
8. `../sdd/ntn-sim-core-development-constraints.md`
   - non-negotiable development constraints for benchmark-capable code
9. `../sdd/ntn-sim-core-acceptance-gates.md`
   - merge, benchmark, paper-claim, and showcase acceptance rules
10. `../sdd/ntn-sim-core-assumption-policy.md`
   - rules for when assumptions are allowed and how they must be recorded
11. `../sdd/ntn-sim-core-frontend-beam-visual-sdd.md`
   - normative frontend beam-rendering contract for multibeam access and BH modes
12. `../sdd/ntn-sim-core-ui-exposure-spec.md`
   - current parameter exposure contract
13. `../archive/ntn-sim-core-sdd-history-2026-03-29/`
   - historical closure, donor, and one-shot acceptance documents
14. `../todo/README.md`
   - post-Group-2 downstream entry / handoff index
   - use with `agent-governance.md` and `../sdd/README.md` when starting `M1` / `U1` or promoting later downstream work

## Working Rule

1. `architecture blueprint` defines the intended shape of the system.
2. `SDD` defines the normative engineering contract.
3. `platform-refactor roadmap` records the completed execution order that produced the frozen platform closure.
4. baseline downstream work (`M1` / `U1`) starts from the active downstream surface defined in `../sdd/README.md`, `downstream-runtime-architecture-sdd.md`, and the matching baseline specs; later `M2` / `M3` / `estnet` work still requires further promotion or explicit reopen.
5. `validation matrix` defines what must be true before a phase or active downstream surface can be considered done.
6. companion governance docs constrain what may be merged, claimed, or assumed during implementation.
7. historical closure documents may explain how earlier work landed, but they do not override the active SDD set.
