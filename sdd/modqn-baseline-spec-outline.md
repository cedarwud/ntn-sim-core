# MODQN Baseline Spec

**Status:** Active spec — baseline-only
**Promoted:** 2026-03-31 (downstream architecture Group 1)
**Clarified:** 2026-04-01 (M1 dependency boundary synced after downstream architecture Group 2)
**Depends on:** Frozen platform contracts (runtime-v1 / kpi-v1 / policy-v1 / exposure-v1)
**Scope gate:** Baseline paper faithful reproduction only

---

## 1. Scope

### 1.1 In Scope

1. Faithful reproduction of the baseline MODQN paper:
   - Paper: PAP-2024-MORL-MULTIBEAM
   - "Handover for Multi-Beam LEO Satellite Networks: A Multi-Objective Reinforcement Learning Method"
2. State / action / reward boundary matching the original paper's design
3. Three-objective DQN training and evaluation path (throughput / HO-penalty / load-balance)
4. Stable baseline KPI artifact bundle for UI handoff
5. Layer placement inside `src/core/algorithms/` with `src/core/contracts/policy-v1` as the boundary

### 1.2 Explicitly Out of Scope

1. HOBS + 38.811 physical-layer variants
2. EE-objective MODQN rewrites
3. Multi-variant comparison dashboards
4. Thesis-wide ablation / sensitivity expansion
5. Any change that requires reopening frozen Phase 1–5 contracts
6. `estnet-ui-kickoff` consumer integration

---

## 2. Baseline Paper Summary (from catalog PAP-2024-MORL-MULTIBEAM)

### 2.1 State Space

```
s_i_t = (u_i(t), G_i(t), Γ(t), N(t))
```

- `u_i(t)`: access vector — which beam user i currently connects to
- `G_i(t)`: channel gains to all beams
- `Γ(t)`: beam locations (geometry)
- `N(t)`: number of users per beam (load)

### 2.2 Action Space

```
a_i_t = (u_{i,1,1}, ..., u_{i,L,V}) — binary, sum = 1
```

One-hot beam selection per user.

### 2.3 Reward Vector

Three-objective vector reward `R_i_t = (r1, r2, r3)`:

| Component | Definition |
|-----------|-----------|
| `r1` | Throughput of user i |
| `r2` | `−φ1` (intra-sat HO) or `−φ2` (inter-sat HO) or 0 |
| `r3` | `−(max_beam_throughput − min_beam_throughput) / I` |

Linear scalarization at action selection: `Q_scalar = ω1·Q1 + ω2·Q2 + ω3·Q3`
Best weights: `[ω1, ω2, ω3] = [0.5, 0.3, 0.2]`

### 2.4 Network Architecture

- Three parallel DQN networks (one per objective)
- Each: 3 hidden layers (100, 50, 50 neurons), tanh activation

### 2.5 Training Parameters

| Parameter | Value |
|-----------|-------|
| Learning rate | 0.01 |
| Discount factor | 0.9 |
| Exploration | ε-greedy |
| Optimizer | Adam |
| Batch size | 128 |
| Time slot | 1 s |
| Episode duration | 10 s |
| Episodes | 9000 |

---

## 3. Layer Placement

### 3.1 M1 Scope

M1 implements inside `src/core/algorithms/`:

1. `ModqnBaselineAdapter` — implements `Policy` from `policy-v1`
2. State builder: maps `PolicyObservation` → MODQN state vector
3. Action adapter: maps MODQN beam-selection output → `PolicyAction`
4. Reward calculator: computes three-component vector from `PolicyReward`
5. Weight-scalarized Q-value selector (inference path)

**M1 must NOT:**
- Mutate `engine/` internals directly
- Import from authored profile files
- Implement experiment manifests or artifact formatting (that is M2/M3 scope)
- Import from `src/viz/**` or `src/app/**`

### 3.2 Dependency Chain for M1

```
src/core/contracts/policy-v1  ← M1 imports
src/core/contracts/runtime-v1 ← M1 reads for observation inputs
src/core/algorithms/           ← M1 lands here
```

For the approved baseline path, M1 imports only from frozen contracts.
If a later downstream spec needs metadata-driven config or other helper surfaces, that dependency must be named explicitly in that later spec and still must not cross into `engine/` internals.

M1 must not depend on `src/core/engine/` internal files.

---

## 4. Artifact Surface (M2/M3, not M1)

The following are explicitly deferred beyond M1:

1. Training loop scaffolding — M2
2. Reproducible experiment manifests — M2/M3
3. KPI artifact bundle assembly — M3
4. UI-facing result handoff — M3 → U1

---

## 5. Boundary Rules

**M1 does NOT cross into:**
- `src/core/experiments/` (M2 territory)
- `src/viz/view-models/` (U1 territory)
- `src/adapters/` (estnet territory — deferred)
- Any internal engine orchestration beyond the runner surface

**After M1, M2 may extend:**
- `src/core/experiments/` — training and eval manifests
- Experiment artifact types referencing `kpi-v1` output

**U1 entry may use immediately:**
- `kpi-v1`, `runtime-v1`, and `exposure-v1` contract outputs
- replay / runner surfaces that stay behind frozen contracts

**After M2/M3, the UI handoff may extend to:**
- Stable `ExperimentResult` / baseline result bundle for richer UI handoff
- `src/viz/view-models/` viewer paths that consume that stable export without importing experiment internals

---

## 6. Promotion Conditions for modqn-runtime-outline.md

`modqn-runtime-outline.md` may be promoted to active SDD only after:

1. M1 has defined the concrete `ModqnBaselineAdapter` interface
2. The state/action/reward shapes are confirmed against frozen contracts
3. Training loop design is reviewed against the baseline paper

---

## 7. Validation Expectations

At M1 entry:
1. `npm run lint` must pass
2. `npm run validate:contracts` must pass — M1 code must import only from `@/core/contracts`
3. `npm run validate:stage` must remain green

At M1 completion, add:
4. Unit-level test: `ModqnBaselineAdapter` returns well-formed `PolicyAction` for a synthetic observation
