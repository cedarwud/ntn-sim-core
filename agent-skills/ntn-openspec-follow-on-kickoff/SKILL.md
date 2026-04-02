---
name: ntn-openspec-follow-on-kickoff
description: Use when deciding whether a future ntn-sim-core follow-on, especially OMNeT++ / INET / estnet or other external-consumer/backend realism work, should be bootstrapped with OpenSpec instead of the repo's normal SDD/todo flow. Also use when a user explicitly mentions OpenSpec, opsx workflows, or wants a separate change/spec workflow for a new track without replacing existing ntn-sim-core authority.
---

# NTN OpenSpec Follow-On Kickoff

Use this skill when the question is not "how does current `ntn-sim-core` authority work?" but rather:

1. should a **new** follow-on track use OpenSpec,
2. where should OpenSpec live,
3. how should OpenSpec coexist with the repo's existing SDD/todo/governance surfaces,
4. how should a future external-consumer/backend realism track be bootstrapped without polluting the current simulator authority chain.

This skill is a **workflow aid**, not a replacement for the active SDD set.

## Required Read Order

Read these first:
1. `agent-governance.md`
2. `sdd/README.md`
3. `sdd/ntn-sim-core-implementation-status.md`
4. `sdd/ntn-sim-core-research-positioning-note.md`
5. any active or paused downstream surface directly related to the proposed follow-on:
   - `sdd/estnet-ui-contract-outline.md`
   - `sdd/real-trace-scalability-preflight-note.md`
   - `sdd/downstream-runtime-architecture-sdd.md`
6. OpenSpec reference docs as **tool background only**, not authority:
   - `/home/u24/papers/OpenSpec/README.md`
   - `/home/u24/papers/OpenSpec/docs/getting-started.md`
   - `/home/u24/papers/OpenSpec/docs/opsx.md`
   - `/home/u24/papers/OpenSpec/docs/concepts.md`

## Core Rule

Do **not** recommend OpenSpec as a retrofit replacement for the current `ntn-sim-core/sdd/` authority stack.

OpenSpec is a good fit only when the user is opening a **new track** that benefits from:

1. separate change folders,
2. delta-spec workflow,
3. explicit proposal/design/tasks artifacts,
4. future external-consumer or cross-repo integration planning.

It is usually a poor fit when the task is:

1. maintaining the current shipped simulator baseline,
2. updating active `sdd/` authority in place,
3. minor follow-up edits inside an already-promoted `ntn-sim-core` surface,
4. using OpenSpec merely because "more process sounds better."

## Decision Workflow

1. Identify the target work:
   - current simulator maintenance,
   - new follow-on inside `ntn-sim-core`,
   - new external-consumer/backend realism track,
   - separate repo/subproject kickoff.
2. Decide whether OpenSpec should be:
   - `no` — stay on current SDD/todo flow,
   - `later` — not yet, but maybe for a future dedicated track,
   - `yes-separate-track` — use OpenSpec for the new track only.
3. If `yes-separate-track`, recommend the smallest safe placement:
   - a separate repo,
   - or a clearly bounded future subproject,
   - but not a silent takeover of the `ntn-sim-core` root governance.
4. State coexistence rules explicitly:
   - `ntn-sim-core/sdd/` remains simulator authority,
   - OpenSpec governs only the new track's change workflow,
   - frozen contracts and existing active SDDs still win for current simulator behavior.

## Recommended Output

When this skill is used, report:

1. whether OpenSpec should be used at all,
2. the exact scope that should use it,
3. where it should live,
4. what should remain under current SDD authority,
5. the minimum bootstrap plan.

## Minimum Bootstrap Plan for a Future OpenSpec Track

If the verdict is to use OpenSpec, recommend a minimal bootstrap like this:

1. create or choose a dedicated track boundary first,
2. keep current `ntn-sim-core` authority unchanged,
3. initialize OpenSpec only inside the dedicated track boundary,
4. treat `openspec/specs/` as that track's source of truth,
5. use `changes/` for proposal/design/tasks deltas,
6. keep interface points back to `ntn-sim-core` anchored to frozen contracts or explicitly promoted new adapter contracts.

## Do Not

1. Do not tell agents to run `openspec init` in `ntn-sim-core` root by default.
2. Do not let OpenSpec replace `sdd/README.md`, `implementation-status`, or the validation matrix for current simulator work.
3. Do not fork or edit OpenSpec upstream specs just to teach this repo how to use it.
4. Do not present OpenSpec as required for ordinary paper-mode / claim-mode hardening.
5. Do not use OpenSpec to bypass the repo's promotion / reopen discipline.

## Best-Fit Use Cases

OpenSpec is most likely worth using here when:

1. `OMNeT++ / INET / estnet` integration becomes an active external-consumer/backend realism track,
2. a new adapter-heavy subproject needs separate proposal/design/tasks artifacts,
3. the user wants a bounded change-management workflow for a future line that should not contaminate current simulator authority.

## Poor-Fit Use Cases

Stay on the existing SDD/todo workflow when:

1. the work is within current `MODQN`, `UI`, or `T1` completed surfaces,
2. the user is only updating notes, validation, or shipped baselines,
3. the change belongs inside active simulator authority rather than a separate track,
4. the user only wants clearer SDDs, not a new change-management system.
