# 04. Beam Hopping, Energy, And Coupled Scheduler SDD

**Status:** proposed  
**Priority:** P1 after SDD-03  
**Why now:** this is the most important direct optimization surface for the target research topic once provenance and HO baseline safety are corrected

## 1. Problem Statement

The target topic is not just LEO handover. It is LEO multi-beam handover under energy-efficiency constraints.

`ntn-sim-core` already has the correct broad structure:

1. multi-beam semantics;
2. beam-hopping scheduler families;
3. explicit L1 and L2 energy surfaces;
4. replay and visual explainability.

But the current research ceiling is limited by:

1. assumption-backed beam-state power constants;
2. limited scheduler/HO coupling rigor compared with `beamHO-bench`;
3. incomplete separation between paper-specific BH baselines and generic platform scheduler baselines;
4. need for stronger interaction between scheduler truth, HO truth, and EE reporting.

## 2. Goals

1. make BH + HO + EE coupling an explicit first-class research surface;
2. keep current EP1 denominator honesty intact;
3. upgrade scheduler conflict resolution and fairness accounting;
4. distinguish paper-specific BH baselines from generic platform heuristics.

## 3. Reuse Decision

### 3.1 From `beamHO-bench`

High-value imports:

1. coupled handover conflict resolver;
2. overlap/capacity/fairness rejection accounting;
3. window-engine discipline for deterministic active-beam selection;
4. policy/scheduler integration metrics.

### 3.2 From `leo-beam-sim`

Possible selective imports:

1. beam geometry or gain implementation details where they improve clarity or parity;
2. interaction semantics for same-satellite beam transitions.

### 3.3 From `leo-simulator`

Visualization concepts only:

1. BH slot animation and scheduler-state presentation;
2. not its radio or energy constants as baseline truth.

## 4. Required Changes

### 4.1 Formalize scheduler/HO coupling modes

The repo should explicitly support and compare:

1. uncoupled HO on full visible candidate set;
2. scheduler-constrained HO on active-beam candidate set;
3. fairness-guarded coupled HO;
4. energy-aware coupled HO where appropriate.

### 4.2 Tighten beam-state energy provenance

For beam-state power terms such as `active`, `idle`, and `off`:

1. keep them disclosed as assumptions until a paper or hardware-backed chain exists;
2. add sensitivity sweep packaging so papers can report robustness instead of a single fragile constant;
3. avoid presenting assumption-only beam-state power as `Realistic` absolute energy truth.

### 4.3 Add BH/HO/EE joint experiment surfaces

Mandatory comparison surfaces should include:

1. HO count vs throughput;
2. HOF / RLF vs scheduler utilization;
3. bits/J vs total communication power proxy;
4. active-beam utilization vs fairness;
5. coverage loss or blocked-HO rate caused by scheduler constraints.

## 5. Acceptance Criteria

1. at least one coupled scheduler baseline is available for paper-facing multi-beam HO studies;
2. EE reporting keeps EP1 denominator semantics explicit;
3. assumption-only beam-state energy values cannot be mistaken for literature-backed constants;
4. BH/HO coupling produces explicit blocked-reason and fairness metrics.

## 6. Validation

Add and require:

1. `VAL-BHHO-001`: coupled scheduler outputs blocked-reason stats and fairness stats;
2. `VAL-BHHO-002`: HO runs under coupled mode preserve reproducible rejection semantics;
3. `VAL-BHHO-003`: EE reports keep active-TX denominator vs broader power proxy distinct under BH runs;
4. `VAL-BHHO-004`: no paper-facing BH preset hides assumption-only beam-state power as realistic truth.
