---
name: ntn-validation-gate-runner
description: Use when ntn-sim-core changes need validation planning or phase-completion verification, to map the current scope to the correct validation gates, scripts, blockers, and evidence requirements.
---

# NTN Validation Gate Runner

Use this skill whenever code behavior changes, a phase/group may be complete, or a reviewer needs clear evidence for go/no-go.

## Required Read Order

Read these first:
1. `agent-governance.md`
2. `sdd/ntn-sim-core-validation-matrix.md`
3. `sdd/ntn-sim-core-acceptance-gates.md`
4. `sdd/ntn-sim-core-implementation-status.md`
5. the active phase SDD
6. `package.json` scripts section

## Workflow

1. Identify the current phase/group and the files touched.
2. Map the change to the relevant `VAL-PLAT-*` gates.
3. Separate validations into:
   - iteration set: smallest useful checks while developing
   - completion set: required checks before claiming the group/phase is done
4. Run or recommend the smallest correct set.
5. Report which failures are blocking and which are informative only.

## Default Script Families

Typical scripts to consider:
1. `npm run lint`
2. `npm run validate:trace`
3. `npm run validate:profiles`
4. `npm run validate:runtime`
5. `npm run validate:registry`
6. `npm run validate:bundle`
7. `npm run validate:stage`
8. `npm run validate:visual-browser` when browser-visible behavior changes

## Phase Mapping Rule

Do not pick scripts by habit alone. Always map them to the active phase gates. For example:
1. Phase 1 should emphasize registry-oriented gates.
2. Phase 2 should emphasize bundle/interface gates.
3. Phase 3 should emphasize profile migration and round-trip gates.
4. Phase 4 should emphasize frozen runtime/exposure contract gates.
5. Phase 5 should emphasize structural size limits, cleanup, and orchestration purity.

## Output

Report:
1. which `VAL-PLAT-*` gates apply
2. which scripts should run for iteration
3. which scripts are required before claiming completion
4. whether current evidence is sufficient to close the group/phase
5. any validation gaps that should be added to SDD or the validation matrix
