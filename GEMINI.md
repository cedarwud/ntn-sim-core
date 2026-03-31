# Gemini CLI Instructions — ntn-sim-core

**Governance-Version:** `2026-03-31-d`

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
7. When changing agent-facing governance, update:
   - [agent-governance.md](/home/u24/papers/ntn-sim-core/agent-governance.md)
   - [AGENTS.md](/home/u24/papers/ntn-sim-core/AGENTS.md)
   - [CLAUDE.md](/home/u24/papers/ntn-sim-core/CLAUDE.md)
   - [GEMINI.md](/home/u24/papers/ntn-sim-core/GEMINI.md)
   - `scripts/validate-agent-doc-sync.mjs`
   in the same change set.
