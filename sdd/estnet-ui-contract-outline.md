# estnet-ui-kickoff Contract (Outline)

**Status:** Paused outline — do not promote without explicit user direction
**Updated:** 2026-04-01 (paused gate synced after downstream architecture Group 2)

## Note on Upstream Blocker

Phase 4 Runtime Contract is now complete. The upstream platform blocker is resolved.
This outline remains paused by policy, not by an unfinished upstream dependency.
The user must explicitly reopen estnet integration before this outline may be promoted.

## Promotion Gate

This outline may only be promoted when:

1. The user explicitly requests estnet integration work
2. The `src/adapters/` directory is deliberately created as part of the estnet reopen change set (it was intentionally not created in downstream architecture Group 2)
3. Frozen contracts (`runtime-v1`, `kpi-v1`, `exposure-v1`) are confirmed sufficient for external consumer use — or a contract extension path has been approved

## Future Contract Areas (if reopened)

1. Simulation input schema for external consumer
2. Parameter metadata schema
3. Snapshot / KPI schema
4. Experiment manifest schema
5. Profile / model bundle descriptors

## Current Constraint

`project/estnet-ui-kickoff` must NOT be allowed to import internal authored profile files or `src/core/engine/` internals. All consumption must go through `src/core/contracts/` and `src/adapters/` (future).
