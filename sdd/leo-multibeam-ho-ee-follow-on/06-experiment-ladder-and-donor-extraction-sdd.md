# 06. Experiment Ladder And Donor Extraction SDD

**Status:** proposed  
**Priority:** P2 after SDD-05  
**Why last:** this step should freeze the new research workflow only after provenance, HO, orbit, scheduler, and visualization semantics are trustworthy

## 1. Problem Statement

The repo currently has many strong components, but the target research line needs a cleaner experiment ladder that tells users:

1. which profile family is thesis-safe;
2. which family is exploratory;
3. which donor-derived surface is useful but not paper-backed;
4. what order to run experiments in when studying LEO multi-beam HO + EE.

## 2. Goals

1. produce a reproducible experiment ladder for the target topic;
2. formalize donor extraction boundaries;
3. prevent future drift where a convenient donor baseline silently becomes a thesis baseline.

## 3. Ordered Experiment Ladder

### Stage A: provenance-safe access baseline

Use:

1. paper-safe HO baseline;
2. synthetic LEO shell with explicit paper or representative classification;
3. no donor-only policy in the first-screen research preset.

Purpose:

1. establish trustable access continuity metrics.

### Stage B: multi-beam HO baseline

Use:

1. multi-beam access profile;
2. paper-safe HO family;
3. no BH coupling yet.

Purpose:

1. isolate the effect of beam multiplicity on HO behavior.

### Stage C: coupled BH + HO baseline

Use:

1. coupled scheduler mode;
2. fairness and blocked-reason metrics;
3. energy disclosure still explicit.

Purpose:

1. evaluate whether scheduler constraints improve EE enough to justify HO complexity.

### Stage D: donor-inspired advanced policy comparison

Use:

1. `sinr-offset` or future donor-inspired policies;
2. comparison only against paper-safe baselines;
3. explicit donor labeling.

Purpose:

1. test whether donor behavior suggests a future publishable follow-on, without corrupting baseline claim safety.

### Stage E: real-trace cross-check

Use:

1. validation-sized real-trace orbit path;
2. inherited radio/HO family from the synthetic family under test.

Purpose:

1. check whether conclusions survive realistic timing and visibility ordering.

## 4. Donor Extraction Freeze Rules

1. no whole-repo transplant from `project/*` into `ntn-sim-core`;
2. every borrowed module or algorithm must carry donor provenance;
3. every donor-derived baseline must have a paper-safe comparator;
4. every donor-derived visualization idea must remain driven by engine truth;
5. donor code is allowed to improve implementation quality, not to overwrite the authority chain.

## 5. Final Recommendation

For the user's target topic, the correct strategic direction is:

1. continue on `ntn-sim-core`;
2. immediately harden provenance and HO baseline safety;
3. then import selected `beamHO-bench` scheduler/governance logic;
4. then selectively import `leo-beam-sim` HO behavior as advanced donor policy;
5. then import `leo-simulator` explainability patterns;
6. keep `ntn-stack` as the future real-trace discipline donor for scale-up, not as the mainline simulator.

## 6. Acceptance Criteria

1. the repo exposes a clearly ordered experiment ladder for LEO multi-beam HO + EE work;
2. donor extraction boundaries are explicit and reviewable;
3. thesis-safe vs exploratory vs donor-inspired profiles are visibly separated;
4. the mainline remains `ntn-sim-core`, not a donor fork.
