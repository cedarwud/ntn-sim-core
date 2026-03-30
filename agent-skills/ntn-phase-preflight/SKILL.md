---
name: ntn-phase-preflight
description: Use when starting any active phase/group in ntn-sim-core platform refactor, or before promoting a downstream MODQN/UI prompt into active work, to verify authority docs, phase status, prompt freshness, and go/no-go conditions.
---

# NTN Phase Preflight

Use this skill whenever work is about to begin for a new phase/group in `ntn-sim-core/`, especially when a prompt file exists but may be stale relative to the current repo state.

## Required Read Order

Read these first:
1. `agent-governance.md`
2. `sdd/README.md`
3. `sdd/ntn-sim-core-implementation-status.md`
4. the active phase SDD (and prior phase SDD if the current phase depends on it)
5. `sdd/ntn-sim-core-validation-matrix.md`
6. the relevant `todo/` prompt file for the target phase/group
7. the most recent reviewer result for the previous group, if one exists

## Workflow

1. Check `git status --short`.
2. Confirm the target phase/group is actually the next valid step according to `implementation-status.md`.
3. Check whether the prompt file still matches current SDD boundaries, validation gates, and phase status.
4. Decide:
   - `go`: prompt can be used as-is
   - `go-with-tweaks`: prompt needs small updates first
   - `stop`: the target group should not start yet
5. Record the concrete reasons for that decision, citing files rather than memory.

## What To Verify

At minimum, verify:
1. the phase is marked active or ready to begin
2. no earlier group is still pending reviewer closure
3. the active SDD is sufficiently detailed for the next implementation step
4. the prompt does not assume files, interfaces, or gates that no longer match the repo
5. downstream work (MODQN / UI / estnet) is not bypassing platform-refactor gates

## Output

Report:
1. whether the target group can start
2. which files were used to decide that
3. any prompt changes needed before execution
4. any blocking drift between:
   - `implementation-status`
   - phase SDD
   - `validation-matrix`
   - `todo/` prompt pack

## Special Rule

If `implementation-status`, the active phase SDD, and the prompt file disagree about what the next step is, do **not** begin coding first. Resolve the authority drift before implementation.
