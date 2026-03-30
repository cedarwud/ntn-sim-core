---
name: ntn-sdd-sync
description: Use after any meaningful ntn-sim-core phase/group completion or contract change to determine which SDD, status, validation, README, and todo documents must be updated in the same change set.
---

# NTN SDD Sync

Use this skill after a phase/group lands meaningful design or implementation changes, especially when status, validation gates, contracts, or prompt packs may have changed.

## Required Read Order

Read these first:
1. `agent-governance.md`
2. `sdd/ntn-sim-core-implementation-status.md`
3. the active phase SDD
4. `sdd/ntn-sim-core-validation-matrix.md`
5. `sdd/ntn-sim-core-acceptance-gates.md`
6. `README.md` if the entry-point guidance may have changed
7. `todo/README.md` and the relevant phase/group prompt file if prompt sequencing is affected

## Workflow

1. Identify what changed:
   - architecture meaning
   - phase status
   - validation gates
   - contracts
   - prompt sequencing
2. Determine which documents must be updated in the same change set.
3. Update the smallest correct authority surface; do not spray edits across every doc.
4. Re-check for contradictions after editing.

## Default Sync Targets

Depending on scope, check whether these need updates:
1. the active phase SDD
2. `sdd/ntn-sim-core-implementation-status.md`
3. `sdd/ntn-sim-core-validation-matrix.md`
4. `sdd/ntn-sim-core-platform-refactor-roadmap.md`
5. `README.md`
6. `todo/README.md`
7. the phase/group prompt files under `todo/`

## Do Not

1. Do not move historical notes back into active `sdd/`.
2. Do not let `todo/` become more authoritative than SDDs.
3. Do not update README or prompt files without checking the canonical SDD first.
4. Do not leave phase completion claims only in conversation text; write them to the repo.

## Output

Report:
1. which docs were updated
2. why each update was necessary
3. which docs were checked but intentionally left unchanged
4. whether any follow-up sync is still needed
