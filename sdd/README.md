# SDD Document Set

This folder contains the normative design and execution plan for `ntn-sim-core`.

## Status Authority

1. `ntn-sim-core-implementation-status.md` is the authoritative status tracker.
2. `ntn-sim-core-sdd.md` is the normative design contract.
3. `ntn-sim-core-roadmap.md` is the execution order.
4. `ntn-sim-core-validation-matrix.md` defines the gate expectations.
5. `ntn-sim-core-development-constraints.md` defines implementation-time prohibitions.
6. `ntn-sim-core-acceptance-gates.md` defines merge/result acceptance.
7. `ntn-sim-core-assumption-policy.md` defines how assumptions are allowed and recorded.
8. `ntn-sim-core-paper-family-matrix.md` defines the canonical literature families and claim ceilings.
9. `ntn-sim-core-donor-integration-map.md` defines how the other project repos are absorbed and checked.
10. `ntn-sim-core-reproduction-protocol.md` defines artifact bundles, claim levels, and tolerance status policy.

## Document Set

1. `ntn-sim-core-sdd.md`
   - product definition, architectural rules, target code organization
2. `ntn-sim-core-profile-baselines.md`
   - detailed parameter envelopes, beam-gain mappings, channel tiers, and source anchors
3. `ntn-sim-core-roadmap.md`
   - phase plan with donor sources, paper baselines, and exit criteria
4. `ntn-sim-core-validation-matrix.md`
   - validation IDs and pass conditions
5. `ntn-sim-core-implementation-status.md`
   - current phase state and document ownership
6. `ntn-sim-core-preflight-refactor-closure.md`
   - records the completed shell-to-SDD preflight refactor
7. `ntn-sim-core-development-constraints.md`
   - non-negotiable development constraints for research-grade paths
8. `ntn-sim-core-acceptance-gates.md`
   - merge gate, benchmark gate, paper-claim gate, and showcase gate
9. `ntn-sim-core-assumption-policy.md`
   - assumption categories, metadata, and claim limits
10. `ntn-sim-core-academic-remediation.md`
   - academic compliance gap analysis, donor transfer map, and remediation priority order
11. `ntn-sim-core-paper-family-matrix.md`
   - maps paper clusters to canonical baseline families, donors, and claim ceilings
12. `ntn-sim-core-donor-integration-map.md`
   - defines repo-to-module donor roles, transfer classes, and parity requirements
13. `ntn-sim-core-reproduction-protocol.md`
   - defines claim levels, artifact bundles, tolerance lifecycle, and blocker-aware reproduction rules
14. `ntn-sim-core-reproduction-targets.md`
   - defines 3 reference paper reproduction targets with profiles, tolerances, and comparison workflow
15. `ntn-sim-core-final-closure-checklist.md`
   - records the final disposition of the project-level closure items
16. `ntn-sim-core-fc1-replay-closure-checklist.md`
   - records the landed replay identity/parity closure pass
17. `ntn-sim-core-frontend-beam-visual-sdd.md`
   - normative frontend beam-rendering contract + §12 implementation checklist (MS3, MS4, TLE frontend, replay)
18. `ntn-sim-core-frontend-beam-visual-acceptance.md`
   - acceptance criteria for beam visualization (7 role semantics, browser screenshot evidence)
19. `ntn-sim-core-frontend-donor-mapping.md`
   - donor repo → frontend module mapping (leo-beam-sim, leo-simulator, beamHO-bench)
20. `ntn-sim-core-frontend-leo-parity-mode.md`
   - narrow post-closure frontend parity spec for a donor-like `leo-beam-sim` presentation mode; `Slice P1/P2` landed

## Working Rule

1. No KPI-impacting implementation should land without a corresponding place in:
   - the SDD
   - the roadmap
   - the validation matrix
   - the paper family / reproduction contract when relevant
2. Architecture changes should update the blueprint under `docs/architecture/` in the same change set.
3. Benchmark-capable changes should also satisfy the development constraints, acceptance gates, and assumption policy.
