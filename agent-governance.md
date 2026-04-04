# NTN Sim Core Agent Governance

**Governance-Version:** `2026-04-04-a`

This file is the shared canonical rule set for agent work inside `/home/u24/papers/ntn-sim-core/`.

Both:

- [AGENTS.md](/home/u24/papers/ntn-sim-core/AGENTS.md)
- [CLAUDE.md](/home/u24/papers/ntn-sim-core/CLAUDE.md)
- [GEMINI.md](/home/u24/papers/ntn-sim-core/GEMINI.md)

must remain thin wrappers around this document rather than independent full rule sets.

## 1. Current Role

1. `ntn-sim-core` is the current primary development target in the `papers` workspace.
2. The active long-term direction is a **parameter-driven, model-pluggable simulator platform**, not a one-paper reproduction codebase.
3. Platform Refactor is complete; shipped downstream and paper-oriented follow-ons now include `MODQN M3`, `UI U1/U2`, `T1`, `PM1`, `TP1`, and `EP1`.
4. There is currently no new active paper-oriented queue; any new MODQN/UI/paper-oriented/`estnet`/external-consumer work must enter through a fresh promotion or explicit reopen against the frozen platform closure, not by reopening closed Phase 1–5 work.

## 2. Authority Order

When instructions conflict, use this order:

1. [sdd/README.md](/home/u24/papers/ntn-sim-core/sdd/README.md)
2. [sdd/ntn-sim-core-platform-refactor-roadmap.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-platform-refactor-roadmap.md)
3. the active phase SDD for the current phase:
   - [sdd/phase0-architecture-spec.md](/home/u24/papers/ntn-sim-core/sdd/phase0-architecture-spec.md)
   - [sdd/phase1-parameter-registry-sdd.md](/home/u24/papers/ntn-sim-core/sdd/phase1-parameter-registry-sdd.md)
   - [sdd/phase2-model-bundle-sdd.md](/home/u24/papers/ntn-sim-core/sdd/phase2-model-bundle-sdd.md)
   - [sdd/phase3-scenario-profile-experiment-split.md](/home/u24/papers/ntn-sim-core/sdd/phase3-scenario-profile-experiment-split.md)
   - [sdd/phase4-runtime-contract-sdd.md](/home/u24/papers/ntn-sim-core/sdd/phase4-runtime-contract-sdd.md)
   - [sdd/phase5-cleanup-and-modularization-sdd.md](/home/u24/papers/ntn-sim-core/sdd/phase5-cleanup-and-modularization-sdd.md)
4. core authority companions:
   - [sdd/ntn-sim-core-sdd.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-sdd.md)
   - [sdd/ntn-sim-core-implementation-status.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-implementation-status.md)
   - [sdd/ntn-sim-core-validation-matrix.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-validation-matrix.md)
   - [sdd/ntn-sim-core-development-constraints.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-development-constraints.md)
   - [sdd/ntn-sim-core-acceptance-gates.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-acceptance-gates.md)
   - [sdd/ntn-sim-core-assumption-policy.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-assumption-policy.md)
5. current companion docs:
   - [sdd/ntn-sim-core-profile-baselines.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-profile-baselines.md)
   - [sdd/ntn-sim-core-paper-family-matrix.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-paper-family-matrix.md)
   - [sdd/ntn-sim-core-reproduction-protocol.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-reproduction-protocol.md)
   - [sdd/ntn-sim-core-reproduction-targets.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-reproduction-targets.md)
   - [sdd/ntn-sim-core-ui-exposure-spec.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-ui-exposure-spec.md)
   - [sdd/ntn-sim-core-frontend-beam-visual-sdd.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-frontend-beam-visual-sdd.md)
6. [README.md](/home/u24/papers/ntn-sim-core/README.md) and [docs/README.md](/home/u24/papers/ntn-sim-core/docs/README.md)
7. [/home/u24/papers/skills/README.md](/home/u24/papers/skills/README.md) for workspace-level skill/reference discovery only
8. [/home/u24/papers/skills/skill-bootstrap-manifest.json](/home/u24/papers/skills/skill-bootstrap-manifest.json) for fresh-environment supplemental-skill install-on-demand decisions only
9. archived historical docs under `/home/u24/papers/archive/ntn-sim-core-sdd-history-2026-03-29/` for forensic context only

## 3. Downstream Promotion Rule

1. Do not start MODQN implementation from outline docs alone.
2. Do not start new UI integration or `estnet-ui-kickoff` integration from outline docs alone.
3. Platform Refactor is already complete. The current work order is:
   - re-check platform closure / current repo state against frozen contracts and validation
   - rewrite or promote the relevant downstream outline into the smallest active SDD surface
   - validation and status sync
   - only then downstream implementation
4. If a downstream outline needs to become active, rewrite it first after re-checking current repo state.
5. `project/estnet-ui-kickoff` remains paused unless the user explicitly reopens estnet integration.

### 3.1 Local Skill Rule

When a matching local skill exists under `/home/u24/papers/ntn-sim-core/agent-skills/`, use it as a workflow aid after reading the authority set above. These skills complement the SDDs; they do not replace them.

Current implemented skills:
1. `ntn-phase-preflight`
   - use before starting a new phase/group
2. `ntn-sdd-sync`
   - use after meaningful phase/group completion or contract/status changes
3. `ntn-validation-gate-runner`
   - use when choosing or reviewing validation evidence for a change or completion claim
4. `ntn-todo-prompt-maintainer`
   - use when `todo/` prompt sequencing, completion state, or archive/completed placement needs updating
5. `paper-to-parameter-provenance`
   - use when mapping literature/standard evidence into parameter registry or provenance surfaces
6. `ntn-openspec-follow-on-kickoff`
   - use when deciding whether a future `OMNeT++ / INET / estnet` or other external-consumer/backend realism track should use OpenSpec as a separate workflow without replacing the current `ntn-sim-core` SDD authority set

### 3.1b Workspace External Reference Rule

When a task may benefit from workspace-level external/reference assets such as:

1. `OpenSpec/`
2. `autoresearch/`
3. `ui-ux-pro-max-skill/`

first use [/home/u24/papers/skills/README.md](/home/u24/papers/skills/README.md) to determine their role.

These assets are discoverability/reference aids only:

1. they do not replace the active `sdd/` authority set,
2. they do not replace project-local skills under `agent-skills/`,
3. and they must not be vendored back into `ntn-sim-core/agent-skills/` unless a new repo-local skill is intentionally authored.

If the current environment is missing a workspace-level supplemental skill that a task genuinely needs:

1. read [/home/u24/papers/skills/skill-bootstrap-manifest.json](/home/u24/papers/skills/skill-bootstrap-manifest.json);
2. only install entries marked `installable`;
3. install them on demand rather than eagerly at startup;
4. do not install entries marked `reference-only` as if they were skills;
5. keep all installed supplemental skills subordinate to the active SDD set, frozen contracts, and validation rules.

### 3.2 UI / UX Skill Rule

When a task materially involves UI, UX, visual design, interaction design, parameter-panel design, KPI presentation, or external UI consumer behavior:

1. keep the active SDD set and frozen contracts as the primary authority;
2. then use the installed assistant-local UI skills as supplementary aids:
   - `ui-ux-pro-max`
   - `frontend-design`
3. when browser-visible interaction or UI regression testing matters, also use the installed assistant-local `webapp-testing` skill as a supplementary test workflow;
4. do not let external UI/testing skills override simulator semantics, parameter provenance, exposure-mode rules, or frozen contracts;
5. if multiple UI skills apply, prefer project-local rules first and use external skills only to strengthen implementation quality or review depth;
6. prefer project-local rules first when they conflict:
   - `sdd/ntn-sim-core-ui-exposure-spec.md`
   - active phase SDDs
   - frozen runtime / exposure contracts

### 3.3 Skill Authoring Rule

When the task is to create, revise, install, or normalize local skills under `agent-skills/` or assistant-local `.codex/.claude/.gemini/skills/`:

1. keep this governance file and the active SDD set as the primary authority;
2. use the installed assistant-local `skill-creator` skill as a supplementary authoring aid;
3. do not let external skill-authoring guidance replace repo-local wrapper rules, validation rules, or thin-wrapper requirements.

## 4. Verification Rules

Before writing any factual statement about repo state:

1. Read the file. Memory and prior conversation are not evidence.
2. Default values come from actual config/default files, not from paper summaries alone.
3. "Does not exist" claims require a search.
4. Implementation status should be checked against code, not inferred only from status docs.
5. Validation scripts are part of the authority chain, not incidental tools; read them before characterizing what they enforce.

### 4.1 Cross-Document Consistency Rules

These rules apply when writing or reviewing architecture documents (phase SDDs, schemas, interface contracts):

**Rule X1 — Schema-vs-data check:** When defining or reviewing a schema (e.g. `ParameterEntry`), verify the schema can represent the *actual* diversity in existing data files (e.g. `profiles/defaults.ts`). If a field is single-valued in the schema but appears as multiple different values across profiles in the data, the schema must be redesigned as a two-layer (global + per-profile) structure before declaring it complete.

**Rule X2 — Cross-SDD family count:** When a document declares "N model-family interface contracts", verify N against *every other document* that mentions a family list. In this repo the authoritative count is in `phase2-model-bundle-sdd.md §Target Model Families`. Any Phase 0 or Phase 1 doc that states a different count must be corrected to match the Phase 2 authority.

**Rule X3 — Layer-boundary self-consistency:** When a layer table declares a layer as "leaf" or "no imports", immediately check whether any type defined *inside* that same section uses a type from another module. If yes, either:
  (a) introduce a "shared primitives" exemption and document it explicitly, or
  (b) move the type into the layer so the leaf constraint holds.
  Do not declare a leaf constraint and silently violate it in the same section.

**Rule X4 — Directory-co-location ambiguity:** When two named layers are assigned the same directory, document either (a) a subdirectory split that will be applied in a future phase, or (b) an explicit note that the co-location is a current naming ambiguity with a plan to resolve it. Never leave two layers sharing a directory without a written disambiguation.

**Rule X5 — "Ready for Phase N" gate:** Before writing "Phase N can begin immediately", verify that the document satisfies every input requirement listed in the Phase N stub SDD (specifically its "Depends on" and "Required Output" sections). If any requirement is not met, list the gap rather than declaring readiness.

## 5. Working Rules

1. Check `git status --short` before editing.
2. Do not overwrite or revert unrelated local changes.
3. Prefer editing one architectural layer at a time; do not mix phase goals casually.
4. Keep runtime truth, parameter metadata, model bundle boundaries, and UI exposure semantics separate.
5. Do not let a profile/default shortcut become the hidden authority for simulator behavior when the active SDD says the authority should be registry-driven or contract-driven.
6. If a file is oversized or mixed-responsibility, split by responsibility rather than arbitrary line chopping:
   - `<= 500` lines is normal
   - `501-650` lines is warning territory
   - `> 650` lines should be treated as required split territory unless there is a strong reason not to
7. Historical closure docs may explain why the current code exists, but they do not authorize new implementation direction.

## 6. Architecture Expectations

Agents should bias toward the target platform shape defined by the active phases:

1. parameters as first-class registry entries
2. geometry/path-loss/SINR/power/EE/policy as pluggable model bundles
3. scenario/profile/experiment/exposure semantics as distinct layers
4. stable runtime contracts for external consumers
5. source-backed provenance and assumption disclosure throughout

## 7. Validation Rules

When code behavior changes, run the smallest relevant set during iteration, then the required validating set before claiming completion.

Required validation depends on scope, but typically includes:

1. `npm run lint`
2. `npm run validate:trace`
3. `npm run validate:profiles`
4. `npm run validate:runtime`
5. `npm run validate:stage` when the change is broad enough to affect integrated behavior

If browser-visible behavior changes, include the relevant visual validation path and state clearly if any browser validation could not be run.

## 8. Documentation Sync Rules

1. If a phase boundary, authority set, or contract changes, update the corresponding SDD in the same change set.
2. When a phase meaningfully completes, update:
   - [sdd/ntn-sim-core-implementation-status.md](/home/u24/papers/ntn-sim-core/sdd/ntn-sim-core-implementation-status.md)
   - the affected phase SDD
   - [README.md](/home/u24/papers/ntn-sim-core/README.md) if the entry-point guidance changed
3. Do not move historical notes back into the active `sdd/` directory.

## 9. Provenance Rules

1. No hidden KPI-impacting constants.
2. Any new `ASSUME-*`, `PAP-*`, or `STD-*` reference must be registered on the correct source surface in the same change set.
3. Do not let source registry metadata and runtime usage drift.
4. If a parameter changes semantics, update the parameter spec / provenance docs in the same change set.

## 10. Donor / External Project Rule

1. `project/beamHO-bench/` is donor/reference-only for current `ntn-sim-core` work.
2. `project/estnet-ui-kickoff/` or other external consumers should be treated as future contract consumers, not internal module owners.
3. If borrowing ideas from donor repos, re-express them through `ntn-sim-core` contracts and active SDD vocabulary.
