# MODQN Roadmap (Outline)

**Status:** Outline only  
**Do not implement from this file yet.**

## Dependency

This roadmap may be promoted into active work only after:

1. Phase 0 through Phase 5 of the Simulator Platform Refactor are complete
2. the repo is re-audited against the resulting contracts

## Current Approved Scope

The current approved downstream scope is intentionally narrow:

1. faithfully reproduce the baseline MODQN paper
2. make the baseline runtime/train/eval path work end-to-end
3. generate stable baseline figures/artifacts for UI presentation

Do **not** expand into:

1. HOBS+38.811 physical variants
2. EE-objective variants
3. full comparison dashboards
4. thesis-wide ablation/sensitivity expansion

unless the scope is explicitly reopened later.

## Intended Near-Term Stages

1. baseline/reproduction/spec convergence
2. baseline runtime/train/eval implementation
3. baseline result bundle + UI handoff

## Reason for Deferral

Without the platform refactor, MODQN implementation would overfit current runtime/profile coupling and likely create another hardwired paper path.
