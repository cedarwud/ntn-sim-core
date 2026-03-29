# Claude Code Instructions — ntn-sim-core

**Governance-Version:** `2026-03-29-b`

This file is the Claude-facing workflow wrapper for work inside `/home/u24/papers/ntn-sim-core/`.

## 1. Read Order

1. Read [agent-governance.md](/home/u24/papers/ntn-sim-core/agent-governance.md) first.
2. Then follow the authority order and working rules defined there.
3. Treat this file as a thin wrapper, not an independent full rule set.

## 2. Claude-Specific Notes

1. Before making repo-state claims, prefer direct file reads and searches over status summaries.
2. If a task crosses back into repo root, `paper-catalog/`, or `system-model-refs/`, also respect [/home/u24/papers/AGENTS.md](/home/u24/papers/AGENTS.md).
3. When changing agent-facing governance, update:
   - [agent-governance.md](/home/u24/papers/ntn-sim-core/agent-governance.md)
   - [AGENTS.md](/home/u24/papers/ntn-sim-core/AGENTS.md)
   - [CLAUDE.md](/home/u24/papers/ntn-sim-core/CLAUDE.md)
   - `scripts/validate-agent-doc-sync.mjs`
   in the same change set.
