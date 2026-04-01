# MODQN Experiment Plan (Outline)

**Status:** Outline — promotion blocked by M2 runtime design
**Updated:** 2026-03-31 (downstream architecture Group 1 — promotion conditions added)

## Current Position in Sequence

This outline covers M3 experiment / artifact scope. It must not be treated as implementation-ready until M2 has delivered a working baseline training/eval path.

**Read first:**
- `modqn-baseline-spec-outline.md` (now active spec) — M1 boundary
- `modqn-runtime-outline.md` — M2 boundary

## Future M3 Scope

1. Reproducible baseline training profile (scenario + seed + episode count)
2. Baseline KPI export rules from `kpi-v1.KpiBundle`
3. Baseline figures / artifact bundle for UI presentation
4. Experiment manifest type in `src/core/experiments/`
5. Result bundle type for handoff to `src/viz/view-models/`

## Promotion Conditions

This outline may be promoted to an active SDD only when ALL of the following are met:

1. M2 has delivered a working training + evaluation loop
2. The result bundle type needed by U1 viewer is defined and stable
3. `src/core/experiments/` directory has been created with M2 index/boundary types
4. The artifact format has been reviewed against `kpi-v1` — no parallel truth invented

## What Stays Out of Scope

1. Full thesis-wide ablation / sensitivity matrix
2. Multi-variant comparison artifacts
3. Any experiment manifest that requires engine internals beyond the runner surface
