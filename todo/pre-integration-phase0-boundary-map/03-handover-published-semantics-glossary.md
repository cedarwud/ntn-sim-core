# Phase 0 Handover Published-Semantics Glossary

This document fills the handover-semantics portion of
[Pre-Integration Phase 0 Boundary Map Checklist](/home/u24/papers/ntn-sim-core/todo/pre-integration-phase0-boundary-map/README.md:1).

The goal is not to redesign HO families. The goal is to say clearly which
handover-related meanings are already published runtime truth, which ones are
consumer-side reading aids, and which remaining follow-ons still sit outside
this glossary.

## 1. Current Published Surfaces

### 1.1 Runtime snapshot truth

The current frozen runtime contract already exposes these handover-adjacent
fields:

- `UeState.servingSatId` / `servingBeamId`
  ([common/types.ts:288](</home/u24/papers/ntn-sim-core/src/core/common/types.ts:288>))
- `UeState.targetSatId` / `targetBeamId`
  ([common/types.ts:292](</home/u24/papers/ntn-sim-core/src/core/common/types.ts:292>))
- `UeState.secondarySatId` / `secondaryBeamId`
  ([common/types.ts:296](</home/u24/papers/ntn-sim-core/src/core/common/types.ts:296>))
- `UeState.continuityState`
  ([common/types.ts:300](</home/u24/papers/ntn-sim-core/src/core/common/types.ts:300>))
- `UeState.servingTransition`
  ([common/types.ts:337](</home/u24/papers/ntn-sim-core/src/core/common/types.ts:337>))
- `UeState.serviceState`
  ([common/types.ts:339](</home/u24/papers/ntn-sim-core/src/core/common/types.ts:339>))
- `SimulationSnapshot.daps`
  ([common/types.ts:241](</home/u24/papers/ntn-sim-core/src/core/common/types.ts:241>))
- `SimulationSnapshot.recentHoEvents`
  ([common/types.ts:243](</home/u24/papers/ntn-sim-core/src/core/common/types.ts:243>))
- `SimulationSnapshot.hoExplanation`
  ([common/types.ts:245](</home/u24/papers/ntn-sim-core/src/core/common/types.ts:245>))

These are engine/exported truth surfaces. Viewer code may read them, but should
not reinterpret them into a new handover contract.

### 1.2 Presentation grammar

The current presentation-side handover grammar is carried by:

- `ContinuityNarrativeState`
  ([continuity-narrative-state.ts:8](</home/u24/papers/ntn-sim-core/src/viz/presentation/continuity-narrative-state.ts:8>))
- `BeamPresentationFrame.continuityNarrative`
  ([beam-presentation-frame.ts:104](</home/u24/papers/ntn-sim-core/src/viz/presentation/beam-presentation-frame.ts:104>))
- `HandoverLinkOverlay`
  ([HandoverLinkOverlay.tsx:1](</home/u24/papers/ntn-sim-core/src/viz/overlays/HandoverLinkOverlay.tsx:1>))
- `HandoverLinkOverlaySummary`
  ([store.ts:116](</home/u24/papers/ntn-sim-core/src/viz/validation/store.ts:116>))

This layer is allowed to hold grace windows and cooldowns for readability, but
it is not allowed to invent new runtime truth. `ContinuityNarrativeState` and
`HandoverLinkOverlay` now read published runtime truth; they are not the
primary source for same-satellite beam switch, inter-satellite HO, or
`no-service` reason semantics.

### 1.3 Engine behavior that matters for semantics

The current engine/runtime publication now makes the minimum Task 4 meanings
explicit:

1. `runHandoverStep()` publishes per-UE `PublishedServingTransition`
   (`inter-satellite-handover` vs `same-satellite-beam-switch` vs `none`)
   instead of leaving consumers to infer the distinction from raw serving-beam
   drift alone.
2. `runSnapshotStep()` copies that value into `UeState.servingTransition` for
   snapshot consumers.
3. `runSnapshotStep()` also publishes `UeState.serviceState`, where:
   - `state='no-service', reason='out-of-reach'` means no service-eligible
     candidate exists
   - `state='no-service', reason='no-eligible-service'` means service-eligible
     candidates exist, but the UE is still currently unserved

## 2. Glossary

| Term | Current source of truth | Currently published as | Stability for external integration |
|---|---|---|---|
| Serving satellite / beam | `UeState.servingSatId` / `servingBeamId` | runtime snapshot, runtime validation, HUD, overlays | Stable |
| Prepared target | `UeState.targetSatId` / `targetBeamId`, `continuityState='prepared'`, sometimes `daps.phase='prepared'` | runtime snapshot truth; narrative/overlay read it for readability and rendering | Stable |
| Secondary / dual-active target | `UeState.secondarySatId`, `daps.sourceSatId`, `daps.targetSatId`, `continuityState='dual-active'` | runtime snapshot truth; narrative/overlay read it for DAPS/dual-active grammar | Stable |
| Inter-satellite handover | `UeState.servingTransition.kind='inter-satellite-handover'` | explicit published serving-transition truth, optionally accompanied by `recentHoEvents` / `hoExplanation` | Stable |
| Same-satellite beam switch | `UeState.servingTransition.kind='same-satellite-beam-switch'` | explicit published serving-transition truth distinct from inter-satellite HO | Stable |
| Post-switch hold | `continuityState='post-ho'` plus presentation hold/cooldown logic | runtime truth starts it; `ContinuityNarrativeState` extends it for readability | Split meaning: raw truth + presentation-only hold |
| No-service / out-of-reach / no-eligible-service | `UeState.serviceState` | explicit published service-state truth with stable `reason` semantics | Stable |

## 3. What Is Truth vs Reading Aid

### 3.1 Truth that external consumers may rely on

- current serving / target / secondary IDs
- `continuityState`
- `daps.phase`, `sourceSatId`, `targetSatId`
- `servingTransition.kind` and its source/target sat/beam IDs
- `serviceState.state` and `serviceState.reason`
- `recentHoEvents` when emitted
- `hoExplanation`
- serving SINR from runtime snapshot

### 3.2 Reading aids that must not be mistaken for engine truth

- `ContinuityNarrativeState.phase`
- prepared-target grace carry
- dual-active grace carry
- post-switch hold extension
- source cooldown and suppressed target annotations
- same-satellite beam-switch suppression from post-switch narrative carry
- `HandoverLinkOverlay` style keys such as `target`, `postHo`, `dapsSource`,
  `dapsTarget`

These are valid consumer-side grammar, but they are not replacements for
runtime contract semantics.

## 4. Phase 0 Interpretation Rules

Use these rules for current external-consumer interpretation:

1. Same-satellite beam switch is published truth only through
   `UeState.servingTransition.kind='same-satellite-beam-switch'`. It is not
   inter-satellite HO.
2. Inter-satellite HO is published truth through
   `UeState.servingTransition.kind='inter-satellite-handover'`.
3. `no-service` semantics are published through `UeState.serviceState`:
   - `out-of-reach`: no service-eligible candidate exists
   - `no-eligible-service`: service-eligible candidates exist, but the UE is
     still currently unserved
4. A prepared target link in `HandoverLinkOverlay` still requires explicit
   prepared truth, not just the presence of `targetSatId`
   ([HandoverLinkOverlay.tsx:20](</home/u24/papers/ntn-sim-core/src/viz/overlays/HandoverLinkOverlay.tsx:20>)).
5. `ContinuityNarrativeState` and `HandoverLinkOverlay` remain consumer-side
   readers of snapshot truth plus readability pacing. They are not the primary
   truth source for HO family semantics.
6. `post-switch` cooldown and narrative carry remain presentation-side reading
   aids, not proof of a continuing engine-side HO contract.

## 5. What This Glossary Now Settles

The current tree now settles these Task 4 answers:

1. same-satellite beam switch is a first-class published transition kind, but
   it is not inter-satellite HO
2. inter-satellite HO has its own published transition kind
3. `no-service` is explicit and its `reason` is now stable for external
   consumers
4. presentation grammar remains allowed to pace prepared / dual-active /
   post-switch readability as long as it does not replace runtime truth

## 6. What Remains Outside Task 4

This glossary does **not** by itself complete:

1. broader earth-moving beam-tracking / candidate-eligibility follow-on work
2. validator or browser-readiness investigations such as
   `validate:visual-browser` stability or `validate-orbit-parity` drift
3. new external-consumer contract or gate promotion work beyond the published
   snapshot truth described above

## 7. Immediate Guardrails

Do not do these during the shell/data-layer refactor:

- do not alter `handover-step.ts` semantics casually while only trying to thin
  `SceneShell.tsx`
- do not let `HandoverLinkOverlay` become the accidental source of HO truth
- do not make `ContinuityNarrativeState` the place where missing engine
  semantics are "filled in"
- do not let external consumers reinterpret same-satellite beam switch as
  inter-satellite HO, or infer `no-service` reason from ad hoc frontend logic
  when `servingTransition` / `serviceState` already publish it

## 8. Summary

For current Task 4 authority sync, the correct interpretation is:

- cross-satellite continuity/HO meaning is explicitly published
- same-satellite beam switch is explicitly published and distinct from
  inter-satellite HO
- post-switch readability holds are consumer-side grammar
- `no-service` / `out-of-reach` / `no-eligible-service` are explicitly
  published through `UeState.serviceState`
- `ContinuityNarrativeState` and `HandoverLinkOverlay` are consumer-side
  readers, not primary inference surfaces
