# Phase 5 — Cleanup and Modularization SDD

**Status:** Active  
**Depends on:** Phase 0, Phase 1, Phase 2, Phase 3, Phase 4

## Goal

Finish the refactor by removing structural debt that would keep reintroducing coupling.

## Scope

1. split oversized files
2. retire dead or deprecated runtime paths
3. archive stale governance/closure documents
4. remove duplicate logic between runtime/spec/UI layers
5. normalize internal naming and module ownership

## Priority Hotspots

1. `src/core/engine.ts`
2. `src/core/profiles/defaults.ts`
3. `src/core/profiles/types.ts`
4. large handover modules
5. any stale replay / legacy compatibility path that still leaks into active design

## Exit Criteria

1. extension work no longer starts by editing monolithic files
2. legacy or closure-only paths are clearly archived, de-scoped, or deleted
3. the simulator is ready for algorithm-layer programs such as MODQN
