# 05. Visual Explainability And Handover Animation SDD

**Status:** proposed  
**Priority:** P2 after SDD-04  
**Why now:** the current repo already has meaningful visuals, but the next step should improve interpretability for multi-beam HO experiments without introducing decorative, non-truthful animation

## 1. Problem Statement

`ntn-sim-core` already visualizes:

1. real-trace replay;
2. beam activity;
3. DAPS dual-active truth;
4. BH service state.

This is stronger than most donors as a governed truth surface. The remaining gap is explainability depth:

1. HO preparation / trigger / execution / recovery phases are not yet presented as clearly as they could be;
2. scheduler-induced blocked handovers are not yet first-class visual narratives;
3. beam-hopping state, HO state, and EE state should be co-readable in one experiment view.

## 2. Goals

1. make HO and BH experiments easier to audit visually;
2. ensure every animation frame comes from engine truth or replay truth;
3. borrow stage language from donor UIs without importing their weaker modeling assumptions.

## 3. Reuse Decision

### 3.1 From `leo-simulator`

Primary donor:

1. staged HO animation structure;
2. human-readable execution phases;
3. pass playback storytelling.

### 3.2 From `leo-beam-sim`

Secondary donor:

1. beam-switch readability cues;
2. same-satellite vs cross-satellite transition grammar.

## 4. Required Changes

### 4.1 Add truth-driven HO phase model to visualization

Expose visual state for:

1. candidate discovery;
2. trigger satisfied;
3. preparation or pending hold;
4. dual-active or preparation overlap when relevant;
5. commit;
6. post-HO stabilization or failure.

### 4.2 Visualize scheduler-induced HO blocking

When coupled mode is active, the UI should make clear when a HO is blocked because of:

1. inactive beam;
2. overlap violation;
3. beam capacity cap;
4. fairness guard.

### 4.3 Add joint explainability panel

Add a panel that can jointly show:

1. serving beam and candidate beam state;
2. scheduler state for both beams;
3. relevant HO metric values;
4. energy disclosure context for the current run.

## 5. Acceptance Criteria

1. visuals never invent HO phases not present in engine/replay truth;
2. coupled scheduler rejections are visually distinguishable from poor-channel rejections;
3. multi-beam experiments can be reviewed visually without guessing why a HO did or did not happen;
4. replay and live mode show the same HO/BH truth semantics.

## 6. Validation

Add and require:

1. `VAL-VIZ-HO-001`: live and replay preserve the same staged HO truth labels;
2. `VAL-VIZ-HO-002`: coupled scheduler blocked reasons are visible in the UI;
3. `VAL-VIZ-HO-003`: DAPS / MC-HO / BH activity remains truth-driven under visual staging.
