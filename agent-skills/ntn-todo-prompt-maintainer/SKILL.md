---
name: ntn-todo-prompt-maintainer
description: Use when ntn-sim-core phase/group prompt packs, todo status, or group sequencing need updating so the repo keeps an accurate handoff surface for future agents.
---

# NTN Todo Prompt Maintainer

Use this skill when a phase/group completes, a future group needs resequencing, or prompt packs under `todo/` need to be split, archived, or updated to match the current authority set.

## Required Read Order

Read these first:
1. `agent-governance.md`
2. `sdd/ntn-sim-core-implementation-status.md`
3. the active phase SDD and any just-completed prior phase SDD
4. `todo/README.md`
5. the relevant prompt files under:
   - `todo/platform-refactor/`
   - `todo/modqn/`
   - `todo/ui-estnet/` (historical redirect only)

If the change touches literature or parameter provenance assumptions, also read:
6. `/home/u24/papers/AGENTS.md`

## Workflow

1. Determine the current true project state from SDD/status docs, not from memory.
2. Compare that state against:
   - `todo/README.md`
   - the phase/group prompt files
   - completed/archive placement
3. Update the smallest correct prompt surface.
4. Preserve historical prompt files that still have handoff value; prefer moving to completed/archive over deletion.

## What To Maintain

Keep these aligned:
1. which phase/group is next
2. which groups are completed
3. estimated future group counts
4. whether a downstream program is still blocked by platform-refactor gates
5. whether a prompt needs a preflight step before execution

## Do Not

1. Do not let `todo/` override SDD or implementation status.
2. Do not delete completed prompts casually; archive or mark complete instead.
3. Do not leave prompt packs referring to phases/groups that are no longer valid.
4. Do not expand future prompts based only on speculation; tie them to current SDD boundaries.

## Output

Report:
1. which `todo/` files changed
2. which prompts were promoted, archived, or left unchanged
3. what the next active group is
4. whether any future prompt pack now needs re-optimization before use
