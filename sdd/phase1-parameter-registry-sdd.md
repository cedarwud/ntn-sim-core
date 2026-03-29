# Phase 1 — Parameter Registry SDD

**Status:** Active  
**Depends on:** Phase 0

## Goal

Make parameters the primary simulator contract rather than incidental fields inside profiles.

## Scope

Each important simulator parameter is represented as a two-layer registry record (schema defined in `phase0-architecture-spec.md §0B.4`):

**`GlobalParameterSpec`** — one record per parameter, profile-agnostic:

1. identifier (PARAM-* namespace)
2. semantic meaning
3. unit
4. allowed range or preset list
5. derived flag (isDerived)
6. dependency rule
7. vocabulary layer (scenario / model-bundle / experiment)

**`ProfileParameterBinding`** — one record per (parameter × profile), profile-specific:

1. profileId
2. default value for that profile
3. source tier (paper / standard / assumption)
4. source locator (PAP-* / STD-* / ASSUME-* ID)
5. source note (optional detail, e.g. table/equation reference)
6. exposure mode for that profile (Realistic / Advanced / Sensitivity / Internal-only)

## Required Output

1. Registry schema
2. Runtime-consumable metadata representation
3. Mapping from existing profile fields to canonical parameter IDs

## Not In Scope

1. full UI implementation
2. algorithm-specific reward design

## Exit Criteria

1. no new user-facing parameter needs to be invented ad hoc in UI or profile files
2. provenance-aware parameter exposure becomes mechanically possible
