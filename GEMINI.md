# Gemini CLI Instructions — ntn-sim-core

**Governance-Version:** `2026-04-04-a`

This file is the Gemini-facing workflow wrapper for work inside `/home/u24/papers/ntn-sim-core/`.

## 1. Read Order

1. Read [agent-governance.md](/home/u24/papers/ntn-sim-core/agent-governance.md) first.
2. Then follow the authority order and working rules defined there.
3. Treat this file as a thin wrapper, not an independent full rule set.

## 2. Gemini-Specific Notes

1. Before making repo-state claims, prefer direct file reads and searches over summaries or prior conversation.
2. If a task crosses back into repo root, `paper-catalog/`, or `system-model-refs/`, also respect [/home/u24/papers/AGENTS.md](/home/u24/papers/AGENTS.md).
3. When a matching local workflow skill exists under `agent-skills/`, read it after `agent-governance.md` and use it as a workflow aid.
4. For UI/UX-heavy tasks, also read:
   - [/home/u24/papers/ntn-sim-core/.gemini/skills/ui-ux-pro-max/SKILL.md](/home/u24/papers/ntn-sim-core/.gemini/skills/ui-ux-pro-max/SKILL.md)
   - [/home/u24/papers/ntn-sim-core/.gemini/skills/frontend-design/SKILL.md](/home/u24/papers/ntn-sim-core/.gemini/skills/frontend-design/SKILL.md)
   after `agent-governance.md`.
   Treat it as a supplemental design skill, not as an override of SDD authority, parameter provenance, or frozen contracts.
5. For browser-visible UI testing or interaction regression checks, also read:
   - [/home/u24/papers/ntn-sim-core/.gemini/skills/webapp-testing/SKILL.md](/home/u24/papers/ntn-sim-core/.gemini/skills/webapp-testing/SKILL.md)
   after `agent-governance.md`.
   Treat it as a supplemental testing skill, not as an override of frozen contracts or validation gates.
6. When creating or revising local skills, also read:
   - [/home/u24/papers/ntn-sim-core/.gemini/skills/skill-creator/SKILL.md](/home/u24/papers/ntn-sim-core/.gemini/skills/skill-creator/SKILL.md)
   after `agent-governance.md`.
7. When deciding whether a future follow-on, especially `OMNeT++ / INET / estnet` or other external-consumer/backend realism work, should use OpenSpec, also read:
   - [/home/u24/papers/ntn-sim-core/agent-skills/ntn-openspec-follow-on-kickoff/SKILL.md](/home/u24/papers/ntn-sim-core/agent-skills/ntn-openspec-follow-on-kickoff/SKILL.md)
   after `agent-governance.md`.
   Treat it as a supplemental workflow aid for future-track bootstrapping, not as a replacement for current SDD authority or frozen contracts.
8. When a task needs workspace-level external/reference workflow discovery, also read:
   - [/home/u24/papers/skills/README.md](/home/u24/papers/skills/README.md)
   after `agent-governance.md`.
   Treat it as a discoverability index only; do not let it override current SDD authority, project-local skills, or frozen contracts.
9. In a fresh environment, if a needed workspace-level supplemental skill is missing locally, also read:
   - [/home/u24/papers/skills/skill-bootstrap-manifest.json](/home/u24/papers/skills/skill-bootstrap-manifest.json)
   after `agent-governance.md`.
   Only install entries marked `installable`, and only when the current task actually needs them. Do not install `reference-only` repos as skills.
10. When changing agent-facing governance, update:
   - [agent-governance.md](/home/u24/papers/ntn-sim-core/agent-governance.md)
   - [AGENTS.md](/home/u24/papers/ntn-sim-core/AGENTS.md)
   - [CLAUDE.md](/home/u24/papers/ntn-sim-core/CLAUDE.md)
   - [GEMINI.md](/home/u24/papers/ntn-sim-core/GEMINI.md)
   - `scripts/validate-agent-doc-sync.mjs`
   in the same change set.
