# ntn-sim-core Agent Rules

**Governance-Version:** `2026-03-29-b`

This file is the Codex-facing workflow wrapper for work inside `/home/u24/papers/ntn-sim-core/`.

## 1. Read Order

1. Read [agent-governance.md](/home/u24/papers/ntn-sim-core/agent-governance.md) first.
2. Then follow the authority order defined there.
3. Treat this file as a thin wrapper, not an independent rulebook.

## 2. Codex-Specific Notes

1. If a task crosses back into repo root, `paper-catalog/`, or `system-model-refs/`, also respect [/home/u24/papers/AGENTS.md](/home/u24/papers/AGENTS.md).
2. Use archived historical docs only for forensic context; do not let them override the active SDD set.
3. When changing agent-facing governance, update:
   - [agent-governance.md](/home/u24/papers/ntn-sim-core/agent-governance.md)
   - [AGENTS.md](/home/u24/papers/ntn-sim-core/AGENTS.md)
   - [CLAUDE.md](/home/u24/papers/ntn-sim-core/CLAUDE.md)
   - `scripts/validate-agent-doc-sync.mjs`
   in the same change set.
