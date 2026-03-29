# Phase 1 — Parameter Registry SDD

**Status:** Active  
**Depends on:** Phase 0

## Goal

Make parameters the primary simulator contract rather than incidental fields inside profiles.

## Scope

Each important simulator parameter must have a unified registry entry with:

1. identifier
2. semantic meaning
3. unit
4. default
5. allowed range or preset list
6. source type
7. source locator
8. dependency rule
9. exposure mode
10. whether the parameter is derived or user-adjustable

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
