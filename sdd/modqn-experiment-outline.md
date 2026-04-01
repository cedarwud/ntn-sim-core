# MODQN Experiment Plan

**Status:** Active spec — M3 complete (baseline result stabilization & artifact assembly)
**Promoted:** 2026-04-01 (M3 Preflight — baseline path confirmed)
**Completed:** 2026-04-01 (`validate:modqn:m3` + `validate:stage`)
**Depends on:** ModqnTrainer (M2), ModqnReproductionRunner (M2), kpi-v1
**Scope gate:** Baseline reproduction artifact assembly only

---

## 1. Scope

### 1.1 In Scope

1. Stabilization of `ModqnReproductionResult` for UI consumption without breaking the shipped M2 surface.
2. Stable export of held-out replay artifacts, training curves, and disclosure metadata.
3. Export path for training curves (loss/reward) without exposing trainer internals.
4. Validation of the result surface against `kpi-v1`, `runtime-v1`, and the M2 runner surface.
5. Documentation of limitations (2x2 proxy, 10 s windows, single-visible-satellite ceiling, `ue-0` control scope, epsilon-decay assumption).

### 1.2 Explicitly Out of Scope

1. HOBS + 38.811 or EE-MODQN variants.
2. Direct UI access to `engine/` or `trainer` internals.
3. Multi-variant comparison dashboards (deferred to future group).
4. Permanent database storage of artifacts (local file-based handoff only).

---

## 2. Result Stabilization (Handoff Surface)

### 2.1 ModqnReproductionResult

The result bundle returned by `runModqnBaselineReproduction()` is M3-stabilized as an additive extension of the shipped M2 result surface:

```typescript
export interface ModqnReproductionResult extends ExperimentResult {
  readonly manifest: ModqnTrainingManifest;
  readonly samplingPlan: ModqnSamplingPlan;
  readonly metrics: ModqnTrainingMetrics;
  readonly trainingEpisodes: readonly ModqnEpisodeSummary[];
  readonly artifactBundles: readonly RunArtifactBundle[];
  readonly trainingSummary: {
    readonly totalEpisodes: number;
    readonly totalSteps: number;
    readonly wallClockMs: number;
    readonly curves: {
      readonly episodes: number[];
      readonly throughputLoss: number[];
      readonly handoverLoss: number[];
      readonly loadBalanceLoss: number[];
      readonly scalarReward: number[];
    };
  };
  readonly heldOutEvaluation: {
    readonly aggregateReward: ModqnRewardVector;
    readonly scalarReward: number;
    readonly aggregateKpiBundle: KpiBundle;
    readonly averageKpi: KpiBundle;
    readonly windows: ModqnHeldOutWindowResult[];
    readonly limitationNotes: readonly string[];
  };
  readonly metadata: {
    readonly paperId: 'PAP-2024-MORL-MULTIBEAM';
    readonly constraints: readonly string[];
    readonly reproductionTimestamp: string;
  };
}
```

The key M3 rule is additive stabilization:
1. keep the raw M2 training/eval/artifact fields available for existing gates;
2. add a stable `trainingSummary` + `metadata` layer for UI/U1;
3. do not fork a second incompatible result schema.

### 2.2 Figures & Artifacts

M3 defines the following figure/view-model outputs (logic in `src/viz/view-models/modqn-view-model.ts`):

1. **Training Convergence:** Throughput / HO / LB loss curves.
2. **Reward Trajectory:** Scalarized reward vs. episode.
3. **Held-out KPI Summary:** Mean SINR / throughput / handover / ping-pong / outage rows from the stabilized result bundle.
4. **Optional Paper Target Overlay:** if a caller supplies source-backed paper targets explicitly, the view-model may display them; it must not invent them heuristically.

---

## 3. Implementation Rules

1. **Dependency:** M3 code in `src/core/experiments/` MAY import from `src/core/algorithms/` and `src/core/contracts/`.
2. **No Engine Internals:** M3 MUST NOT import from `src/core/engine/`.
3. **Artifact Integrity:** KPI data in the result bundle MUST be derived directly from `kpi-v1` output or `recomputeKpiFromSnapshots`.
4. **Additive Stability:** M3 MUST NOT break the shipped M2 result fields required by `validate:modqn:m2`.
5. **Disclosure:** Every result bundle MUST include a `metadata.constraints` field to prevent overgeneralization.
6. **No Invented Targets:** `src/viz/view-models/` may format optional paper targets supplied by a caller, but it MUST NOT invent paper baselines or throughput proxies from heuristics.

---

## 4. Validation Gates (M3)

1. `npm run validate:modqn:m3` (`VAL-MODQN-003`) — runs the real reproduction runner, checks stable schema alignment, disclosure completeness, serialization, and `ModqnViewModel` consumption.
2. `npm run validate:modqn:m2` — must remain green after M3 stabilization.
3. `npm run validate:stage` — remains green.
