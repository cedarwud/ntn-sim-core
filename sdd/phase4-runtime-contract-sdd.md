# Phase 4 — Runtime Contract SDD

**Status:** Active  
**Depends on:** Phase 0, Phase 1, Phase 2, Phase 3

## Goal

Define stable contracts between `ntn-sim-core` runtime and external consumers.

## Target Contracts

1. simulation input schema
2. parameter-registry exposure schema
3. simulation snapshot schema
4. KPI output schema
5. experiment manifest schema
6. model-bundle selection schema

## External Consumers

This phase must explicitly consider:

1. internal visualization
2. headless benchmark tooling
3. future MODQN runtime/training code
4. `project/estnet-ui-kickoff`

## Not In Scope

1. polished UI implementation
2. downstream service deployment concerns

## Exit Criteria

1. external integrations no longer need to depend on internal file layout or profile object details
2. runtime snapshots and parameter metadata are sufficient for future UI work
