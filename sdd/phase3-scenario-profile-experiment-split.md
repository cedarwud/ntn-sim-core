# Phase 3 — Scenario / Profile / Experiment Split

**Status:** Active  
**Depends on:** Phase 0, Phase 1, Phase 2

## Goal

Separate currently mixed concepts that are still bundled together inside profiles/defaults.

## Definitions

1. **Scenario**: physical/environmental situation
2. **Profile**: chosen bundle of scenario + model + policy defaults
3. **Experiment**: reproducible run definition with seed, time window, KPI targets, and artifact policy

## Required Output

1. A normalized split between scenario objects and profile bundles
2. A clean experiment manifest structure
3. De-duplication of baseline presets that currently encode multiple concerns at once

## Not In Scope

1. final front-end grouping logic
2. MODQN reward definition

## Exit Criteria

1. reproduction targets are no longer implemented as oversized profile objects alone
2. new paper baselines can be added without inflating one defaults file indefinitely
