# Documentation Index

This folder holds the architecture and SDD documents for `ntn-sim-core`.

## Primary Entry Points

1. `architecture/ntn-sim-core-architecture-blueprint.md`
   - formal architecture blueprint
   - system layering, source-project contribution map, and target directory layout
2. `../sdd/ntn-sim-core-sdd.md`
   - normative software design document
   - product scope, code organization, profile model, and core invariants
3. `../sdd/ntn-sim-core-profile-baselines.md`
   - detailed baseline envelopes, channel tiers, beam-gain mappings, and source families
4. `../sdd/ntn-sim-core-roadmap.md`
   - phase-by-phase development plan
   - implementation order, paper baselines, donor modules, and exit criteria
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

## Working Rule

1. `architecture blueprint` defines the intended shape of the system.
2. `SDD` defines the normative engineering contract.
3. `roadmap` defines execution order.
4. `validation matrix` defines what must be true before a phase can be considered done.
5. companion governance docs constrain what may be merged, claimed, or assumed during implementation.
