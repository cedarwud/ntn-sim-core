# 02. Handover Baseline And Policy Hardening SDD

**Status:** proposed  
**Priority:** P0 after SDD-01  
**Why now:** the current tree already has the richest handover surface, but its research-safe baseline hierarchy is not clean enough for thesis-facing use

## 1. Problem Statement

`ntn-sim-core` already implements a wider HO family than any donor repo, but the research-facing packaging of those families is not yet strict enough.

Current issues:

1. `realistic-first-screen` presently uses `sinr-offset`, which is donor-derived rather than paper-clean.
2. `sinr-offset` behavior is useful, but its current provenance chain is implementation-first rather than paper-first.
3. the repo needs a clearer split between:
   1. paper-reproduced baselines,
   2. research-safe synthesized baselines,
   3. donor-inspired advanced policies.
4. HOF / RLF / ping-pong / interruption accounting should be treated as first-class baseline acceptance metrics, not only side metrics.

## 2. Goals

1. define a thesis-safe HO baseline ladder;
2. quarantine donor-inspired policies until their provenance is explicitly rebuilt;
3. keep advanced HO experimentation available without overstating claim level;
4. strengthen HO evaluation metrics and failure semantics.

## 3. Baseline Hierarchy To Land

### 3.1 Paper-safe baselines

These may power thesis tables once provenance is clean:

1. `a4-event`
2. `a3-event`
3. `timer-cho`
4. `mc-ho`
5. `daps`
6. `d2-distance` only when source-backed for the target experiment family

### 3.2 Research-safe synthesized baselines

These are allowed for exploratory comparisons with explicit wording:

1. `max-elevation`
2. `max-remaining-time`
3. any locally synthesized threshold policy that is clearly labeled as such

### 3.3 Donor-inspired advanced baselines

These must remain advanced until separately rebuilt:

1. `sinr-offset`
2. any future `leo-beam-sim`-ported policy family

## 4. Required Changes

### 4.1 Replace the current first-screen research default

`realistic-first-screen` must stop depending on donor-only `sinr-offset`.

Safer options:

1. replace with `a4-event` if the goal is conservative paper-safe access behavior;
2. replace with `timer-cho` if geometry-aware continuity is the target narrative;
3. create a new `advanced-donor-policy-screen` profile for `sinr-offset`.

### 4.2 Reclassify `sinr-offset`

Keep the implementation because it is valuable, but classify it honestly:

1. donor-inspired;
2. advanced or internal-only until proper literature mapping is complete;
3. accompanied by explicit comparison against paper-safe baselines.

### 4.3 Strengthen HO acceptance metrics

Adopt a consistent mandatory metric set for every HO paper-facing comparison:

1. HOF
2. RLF
3. ping-pong rate
4. interruption time
5. dual-active duration where relevant
6. throughput delta
7. energy cost per HO where relevant

Use `beamHO-bench` state-machine and audit style as the donor reference for the measurement contract.

## 5. Donor Extraction Policy

### 5.1 From `leo-beam-sim`

Allowed:

1. smoothing and candidate-hold behavior;
2. intra-satellite beam switch handling;
3. ping-pong and RLF guard heuristics.

Not allowed:

1. silent promotion to paper-backed defaults;
2. direct thesis claim that these parameters are literature-derived unless rebuilt through `paper-catalog`.

### 5.2 From `beamHO-bench`

Allowed and encouraged:

1. tighter state-machine audit semantics;
2. coupled scheduler rejection accounting;
3. runtime parameter audit discipline.

## 6. Acceptance Criteria

1. at least one thesis-safe access HO profile exists without donor-only policy dependence;
2. `sinr-offset` remains available but cannot be mistaken for paper-backed default behavior;
3. HOF / RLF / ping-pong / interruption metrics are mandatory in HO baseline validation outputs;
4. DAPS / MC-HO / CHO surfaces remain engine-truth driven and reproducible.

## 7. Validation

Add and require:

1. `VAL-HO-ACA-001`: no `Realistic` preset may use donor-only HO policy provenance;
2. `VAL-HO-ACA-002`: all HO benchmark outputs include failure and continuity metrics;
3. `VAL-HO-ACA-003`: advanced donor-inspired HO policies are clearly labeled in exposure/provenance surfaces.
