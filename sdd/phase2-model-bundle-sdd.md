# Phase 2 — Model Bundle SDD

**Status:** Active  
**Depends on:** Phase 0, Phase 1

## Goal

Reduce core formula coupling by turning major model families into explicit bundles/interfaces.

## Target Model Families

1. `GeometryModel`
2. `PathLossModel`
3. `BeamGainModel`
4. `SinrModel`
5. `PowerModel`
6. `EeModel`
7. `HandoverModel`
8. `PolicyModel`

## Required Output

1. Interface contracts for each model family
2. A bundle/composition mechanism so runtime can select families without hardcoding one paper path
3. Clear ownership of which bundle computes which derived quantities

## Not In Scope

1. training a new RL policy
2. replacing all existing implementations in one patch

## Exit Criteria

1. changing SINR/power/EE family no longer requires editing unrelated orchestration logic
2. baseline papers can be represented as bundle selections rather than one-off runtime forks
