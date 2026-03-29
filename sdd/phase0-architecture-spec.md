# Phase 0 — Architecture Spec

**Status:** Active  
**Depends on:** none

## Goal

Define the target simulator architecture before further algorithm or UI work.

## Scope

Phase 0 must fix the top-level architectural split between:

1. parameter registry
2. model families
3. scenario definitions
4. profile bundles
5. experiment/reproduction bundles
6. runtime contracts
7. UI/exposure contracts

## Required Output

1. A written target module map
2. A formal distinction between canonical data/config layers
3. A no-ambiguity definition of what counts as:
   - scenario
   - model
   - policy
   - experiment
   - UI exposure

## Not In Scope

1. major runtime code edits
2. MODQN implementation
3. final UI redesign

## Exit Criteria

1. later phases can reference one agreed architectural vocabulary
2. old profile-centric assumptions no longer define the whole simulator architecture
