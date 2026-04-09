# LEO Multi-Beam HO + EE Follow-On Pack

**Status:** proposed follow-on SDD pack  
**Scope:** evaluate whether `ntn-sim-core` is the correct mainline for LEO multi-beam handover and energy-efficiency research, identify donor reuse from `project/*`, and define the next ordered hardening sequence  
**Authority inputs:** `paper-catalog/`, `system-model-refs/`, `sdd/ntn-sim-core-implementation-status.md`, `sdd/ntn-sim-core-profile-baselines.md`, `sdd/ntn-sim-core-paper-family-matrix.md`, inspected donor repos under `project/`

## 1. Executive Verdict

`ntn-sim-core` is the best current mainline for the target research line.

It is already stronger than `project/leo-beam-sim`, `project/leo-simulator`, `project/beamHO-bench`, and `project/ntn-stack` as a single integrated research platform because it already combines:

1. governed profile/runtime separation;
2. parameter registry plus machine validation;
3. synthetic Walker and `real-trace` OMM/TLE + SGP4-sampled cache paths;
4. multiple handover families including `a3`, `a4`, `cho`, `timer-cho`, `mc-ho`, `daps`, `d2`, `max-elevation`, `max-remaining-time`, and `sinr-offset`;
5. multi-beam / beam-hopping / L1+L2 energy / replay / visualization in one tree.

However, the current tree is not yet fully paper-pure across every surface. The main academic-rigor gaps are:

1. some authored profile `sourceMap` IDs are not registered in `paper-sources.json`;
2. `realistic-first-screen` currently exposes donor-derived `sinr-offset` settings as `paper-backed`;
3. several beam, energy, scheduler, and orbit-envelope values are still disclosed assumptions rather than paper-reproduced constants;
4. `paper-sources.json` still contains stale `usedIn` paths from pre-refactor file ownership.

So the correct decision is:

1. keep `ntn-sim-core` as the authority implementation target;
2. do not switch the mainline to any donor repo;
3. selectively extract donor strengths, but only after provenance hardening.

## 2. Donor Verdict

| Repo | Verdict | Best reusable parts | Why it should not replace `ntn-sim-core` |
| --- | --- | --- | --- |
| `project/leo-beam-sim` | strong algorithm donor | analytic orbit propagation, SINR-offset HO behavior, beam/HO interaction grammar | good implementation donor, weak paper-governance surface; several defaults are not traceable enough to become direct thesis baselines |
| `project/leo-simulator` | strong visualization donor | staged HO animation, operator-facing explainability panels, precomputed pass playback ideas | more demo-oriented than research-core; propagation, energy, and beam-hopping rigor are weaker |
| `project/beamHO-bench` | strongest governance donor | provenance discipline, profile/source separation, coupled scheduler conflict resolver, state-machine audit style | narrower system scope; useful for governance and scheduler logic, not a richer end-to-end platform than `ntn-sim-core` |
| `project/ntn-stack` | strong real-trace discipline donor | TLE epoch discipline, visibility/time-series pipeline mindset, academic anti-fake-data posture | not a focused multi-beam HO + EE simulator; better as data-pipeline/process donor than main simulation authority |

## 3. Reuse Decision

The donor extraction policy for this follow-on is:

1. `leo-beam-sim`: reuse as an explicitly labeled donor for advanced HO behavior, never as silent paper authority.
2. `beamHO-bench`: reuse aggressively for provenance, validation, scheduler/HO coupling, and audit discipline.
3. `leo-simulator`: reuse UI phase language and animation sequencing only when driven by engine truth.
4. `ntn-stack`: reuse time-baseline and real-trace governance ideas, not its handover thresholds as direct research defaults.

## 4. Ordered SDD Sequence

1. `01-research-integrity-and-provenance-sdd.md`
2. `02-handover-baseline-and-policy-hardening-sdd.md`
3. `03-orbit-truth-and-trajectory-hardening-sdd.md`
4. `04-beam-hopping-energy-and-coupled-scheduler-sdd.md`
5. `05-visual-explainability-and-handover-animation-sdd.md`
6. `06-experiment-ladder-and-donor-extraction-sdd.md`

This order is intentional:

1. provenance must be fixed before any new baseline is thesis-safe;
2. handover baseline governance must be fixed before donor policy import expands;
3. orbit truth must be hardened before stronger real-trace claims are made;
4. scheduler / beam-hopping / energy coupling should then be tightened on top of a safe provenance base;
5. visualization should trail truth surfaces, not lead them;
6. experiment packaging and donor extraction can then be frozen into a reproducible ladder.

## 5. Program Exit Condition

This pack is complete only when:

1. every research-facing profile claim can be traced to `paper-catalog` / `system-model-refs` or an explicit assumption registry entry;
2. no `Realistic` preset depends on unregistered or donor-only paper IDs;
3. donor-derived baselines are clearly separated from paper-reproduced baselines;
4. the repo can honestly claim a thesis-safe LEO multi-beam HO + EE baseline without hidden assumption drift.
