# NTN Sim Core — Simulator Platform Refactor Roadmap

**Status:** Program complete
**Date:** 2026-03-31

## 1. Purpose

This roadmap defines the next major program for `ntn-sim-core`.

The goal is not to optimize one paper baseline, but to refactor the simulator into a long-lived platform that can:

1. absorb new papers and standards without repeatedly patching core runtime logic;
2. expose source-backed parameters and ranges to users;
3. support multiple model families for geometry, path loss, SINR, power, EE, and policy;
4. provide stable input/output contracts for future UI and external consumers.

Closure record (2026-03-31):

1. all six ordered phases are complete;
2. runtime contracts remain frozen and externally stable;
3. Phase 5 closure removed the remaining sync-loader / compatibility debt and enforced the structural gates in code.

## 2. Program Order

The active program has six ordered phases:

1. `phase0-architecture-spec.md`
2. `phase1-parameter-registry-sdd.md`
3. `phase2-model-bundle-sdd.md`
4. `phase3-scenario-profile-experiment-split.md`
5. `phase4-runtime-contract-sdd.md`
6. `phase5-cleanup-and-modularization-sdd.md`

Only after these six phases are complete should the project promote:

- `modqn-*` outlines into active development
- `ui-*` / `estnet-*` outlines into active development

This condition is now satisfied.

## 3. Non-Goals of This Program

This program does **not** directly implement:

1. MODQN runtime/training
2. new paper baselines beyond what is needed to define contracts
3. final external UI integration
4. thesis-specific experiment scripts as the primary deliverable

## 4. Exit Condition

This program ends only when:

1. parameters are registry-driven rather than scattered through profiles/runtime/UI;
2. model families are swappable via explicit interfaces/bundles;
3. scenario, profile, experiment, and exposure semantics are separated;
4. external consumers can rely on a stable contract instead of internal file layouts;
5. the repo no longer depends on oversized, mixed-responsibility core files for routine extension work.

All five exit conditions are satisfied as of 2026-03-31.
