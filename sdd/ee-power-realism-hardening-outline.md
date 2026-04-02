# EE / Power Realism Hardening SDD

**Status:** Completed follow-on SDD — shipped narrow publication-oriented `EE / power` realism hardening  
**Promoted:** 2026-04-02  
**Completed:** 2026-04-02  
**Depends on:** `paper-mode-claim-mode-hardening-outline.md`, `modqn-targeted-parity-outline.md`, `ntn-sim-core-research-positioning-note.md`, `ntn-sim-core-reproduction-protocol.md`, `ntn-sim-core-assumption-policy.md`, `/home/u24/papers/system-model-refs/system-model-formulas.md`, `/home/u24/papers/system-model-refs/system-model-derivation.md`, `/home/u24/papers/system-model-refs/simulator-parameter-spec.md`, `/home/u24/papers/system-model-refs/simulator-parameter-provenance-inventory.md`  
**Scope gate:** publication-oriented `EE / power` formula semantics, provenance, disclosure, and minimum sensitivity hardening only

---

## 1. Current Position in Sequence

The current tree has already completed:

1. simulator-platform closure,
2. `MODQN` baseline reproduction through `M3`,
3. UI baseline viewer closure through `U2`,
4. `T1` real-trace truth-path correction,
5. `PM1` paper-mode / claim-mode hardening,
6. `TP1` current-anchor parity strengthening.

That means the next paper-oriented gap is no longer:

1. whether the current anchor baseline can run,
2. whether the current anchor parity bundle exists,
3. whether the orbit truth path is describable,
4. or how main-result / robustness / sensitivity wording should be governed.

The remaining gap, if the next paper wants to use `EE / power` as more than a secondary metric, is narrower:

1. whether the current `power / EE` formulas, runtime metrics, and reporting names still line up,
2. whether paper-backed, synthesized, and assumption-backed denominator terms are clearly separated,
3. whether assumption-backed `EE / power` runs are always disclosed and sensitivity-qualified before they are used in stronger paper claims.

This document defines that narrower follow-on.

---

## 2. Purpose

This follow-on exists to harden the `EE / power` story without turning `ntn-sim-core` into a broader realism or backend-integration project.

It must answer six practical questions:

1. which `power / EE` formulas are the current formal mainline for the simulator,
2. which runtime metrics correspond to those formulas, and which do not,
3. which denominator terms are paper-backed, synthesized, or assumption-backed,
4. what must appear in `assumptionSet` / manifests / result metadata whenever denominator-sensitive `EE` is reported,
5. what minimum sensitivity path is required before an energy-centered paper can use `EE / power` as a headline claim,
6. which changes would exceed this line and therefore belong in a separate future track.

This line is not a generic realism overhaul and not a hidden prerequisite for `OMNeT++ / INET / estnet`.

---

## 3. Current Known Gaps

### 3.1 Assumption-Backed Denominator Terms

The current canonical parameter spec still classifies the following as unresolved or assumption-backed:

1. `P_{c,s}` / `circuitPowerW`,
2. `\rho_s` / `paEfficiency`,
3. `E_{u,HO}` / `hoEnergyJoules`,
4. `activeBeamPowerW`,
5. `idleBeamPowerW`,
6. `offBeamPowerW`,
7. any rate-dependent baseband power term for LEO.

These terms may currently exist in runtime or reports, but they are not yet safe to present as paper-backed baseline truth.

### 3.2 Runtime-Semantic Split

The current tree already distinguishes multiple energy-related semantics, but the distinction is easy to blur:

1. `Energy Layer 1` reports a system-level `EE` whose denominator follows the active-beam TX-power interpretation from `PAP-2025-EEBH-UPLINK`,
2. the formal formula set also keeps a broader satellite communication-power structure `P_{tot,s}^t = P_{c,s} + (1/\rho_s)\sum_b p_{s,b}^t`,
3. the formula set also keeps a handover-aware `\eta_{EE,HO}` and a utility-form fallback.

This line must keep those meanings from being conflated in runtime names, manifests, and paper wording.

### 3.3 Publication-Safe Usage Gap

`PM1` already states that non-energy-centered papers must not turn assumption-heavy `EE / power` into the headline claim.

What is still missing is a narrower implementation-grade hardening layer that makes this rule harder to violate accidentally by:

1. runtime naming drift,
2. provenance drift,
3. profile/default drift,
4. bundle/export drift,
5. or missing `assumptionSet` / sensitivity evidence.

---

## 4. EP1 Target Outcomes

### 4.1 Formula / Runtime Semantic Alignment

This line should align:

1. the current formal `power / EE` formula set,
2. the runtime metric names and meanings,
3. the bundle / artifact names used in reports,
4. the paper-safe wording used in docs and prompt surfaces.

The intended result is:

1. `active-TX-only EE`,
2. `total communication power`,
3. `handover-aware EE`,
4. and `utility-form objective`

are distinguishable, and no one surface silently labels one as another.

### 4.2 Provenance / Assumption Hardening

This line should ensure:

1. every denominator-sensitive `EE / power` term has one of three explicit roles:
   - paper-backed,
   - synthesized,
   - assumption-backed;
2. no assumption-backed denominator term is silently promoted into a `Realistic` paper-backed baseline;
3. any run that uses those terms records them in an explicit `assumptionSet` / runtime artifact path.

### 4.3 Energy-Centered Minimum Bar

If a future paper is energy-centered, the minimum acceptable bar becomes:

1. explicit separation of paper-backed vs assumption-backed `power / EE` terms,
2. at least one sensitivity path over the material denominator assumptions,
3. result packaging that makes the sensitivity status visible rather than implicit,
4. reviewer-visible proof that the main conclusion does not rely on a hidden denominator constant.

### 4.4 Non-Energy Papers Stay Narrow

This line must also preserve the easier path for non-energy-centered papers:

1. `EE / power` may remain secondary or appendix-level,
2. the simulator does not need a full backend realism expansion just to remain paper-usable,
3. if a paper does not foreground `EE`, the line may stop after semantic/provenance/disclosure hardening rather than chasing new physical sources immediately.

---

## 5. Allowed Landing Zone

Primary landing zone:

1. `/home/u24/papers/system-model-refs/system-model-formulas.md`
2. `/home/u24/papers/system-model-refs/system-model-derivation.md`
3. `/home/u24/papers/system-model-refs/simulator-parameter-spec.md`
4. `/home/u24/papers/system-model-refs/simulator-parameter-provenance-inventory.md`
5. `src/core/energy/layer1.ts`
6. `src/core/energy/types.ts`
7. `src/core/models/power-ee.ts`
8. `src/core/trace/factory.ts`
9. `src/core/trace/types.ts`
10. selected authored profile/default surfaces only when needed to quarantine or relabel `EE / power` assumptions:
    - `src/core/profiles/defaults-bh.ts`
    - `src/core/profiles/defaults-hobs.ts`
    - `src/core/profiles/defaults-misc.ts`
11. dedicated validation / audit scripts for this line
12. `sdd/ee-power-realism-hardening-outline.md`
13. `sdd/ntn-sim-core-implementation-status.md`
14. `sdd/ntn-sim-core-research-positioning-note.md`
15. `todo/ee-power-realism/*`

Allowed companion sync:

1. `sdd/ntn-sim-core-profile-baselines.md`
2. `sdd/ntn-sim-core-paper-family-matrix.md`
3. `sdd/ntn-sim-core-reproduction-protocol.md`
4. repo navigation docs that describe the current active follow-on

---

## 6. What Stays Out of Scope

This follow-on must **not** expand into:

1. `OMNeT++ / INET / estnet` integration,
2. protocol-stack or backend realism work,
3. real-trace scalability or mixed-orbit planning,
4. full per-tick orbit/runtime realism work,
5. frozen contract changes,
6. `RunnerExposureApi` changes,
7. replay identity or replay artifact-shape changes,
8. new algorithm families,
9. replacing the current `MODQN` anchor baseline,
10. broad channel/traffic/mobility realism overhaul unrelated to `EE / power`,
11. donor-pipeline import.

If stronger `EE / power` evidence appears to require those changes, that indicates a separate future line rather than scope creep here.

---

## 7. Validation Direction

Existing gates that must stay green:

1. `npm run lint`
2. `npm run validate:profiles`
3. `npm run validate:runtime`
4. `npm run validate:contracts`
5. `npm run validate:stage`

If the current anchor result or report bundle is touched, these must also stay green:

6. `npm run validate:modqn:m3`
7. `npm run validate:modqn:parity`

This line should also land two narrower `EE / power` hardening gates:

1. `VAL-EE-003`
   - verifies that formulas, parameter spec, provenance inventory, runtime names, and authored defaults agree on which `EE / power` terms are paper-backed, synthesized, or assumption-backed, and that internal-only calibration values are not surfaced as `Realistic` paper-backed defaults
2. `VAL-EE-004`
   - verifies that denominator-sensitive `EE` reporting carries explicit `assumptionSet` / disclosure, and that energy-centered result surfaces include at least one declared sensitivity path before stronger paper wording is allowed

The validation shape should remain narrow:

1. one provenance/semantic-alignment gate,
2. one assumption/disclosure/sensitivity gate,
3. no new backend/protocol/scalability gate.

---

## 8. Completion Boundary

This follow-on is complete only when:

1. the current formal `power / EE` formulas and runtime/reporting names are aligned,
2. paper-backed, synthesized, and assumption-backed denominator terms are explicitly separated across canonical docs and runtime-facing surfaces,
3. denominator-sensitive `EE` runs record their assumption set instead of silently inheriting hidden constants,
4. energy-centered paper use now has an explicit minimum sensitivity/disclosure path,
5. non-energy-centered paper use can still stay narrow and simulator-friendly without pretending the denominator is fully physical,
6. existing contracts, replay identity, and current anchor baseline remain intact,
7. no scope creep into `OMNeT++ / INET / estnet`, scalability, or new algorithm lines has occurred.

This line is deliberately about **hardening the denominator story and reporting semantics**, not about forcing `ntn-sim-core` to become a full protocol or deployment realism platform.
