# Paper-Mode / Claim-Mode Hardening SDD

**Status:** Active follow-on SDD — paper-oriented packaging / claim-discipline hardening  
**Promoted:** 2026-04-02  
**Depends on:** `ntn-sim-core-research-positioning-note.md`, `ntn-sim-core-paper-family-matrix.md`, `ntn-sim-core-profile-baselines.md`, `ntn-sim-core-reproduction-protocol.md`, `ntn-sim-core-assumption-policy.md`, `modqn-baseline-acceptance-note.md`  
**Scope gate:** publication-oriented governance and result-packaging discipline only

---

## 1. Current Position in Sequence

The simulator-platform refactor, the shipped downstream baseline lines, and the narrow real-trace truth-path correction are now closed:

1. Platform closure is complete through Phase 5.
2. `MODQN` baseline reproduction is complete through `M3`.
3. UI baseline viewer path is complete through `U1` / `U2`.
4. `T1` truth-path correction is complete.
5. `real-trace scalability` remains blocked.

The next publication-oriented gap is therefore **not** another runtime feature line. It is the missing repo-level rule set for how the current tree should be used in a paper without:

1. over-claiming realism,
2. overloading the main experiment path with advanced-but-costly features,
3. letting assumption-heavy metrics become the headline result by accident,
4. coupling future paper targets to in-place baseline replacement.

This document defines that missing governance layer.

---

## 2. Purpose

This follow-on exists to formalize a **paper-safe operating mode** for `ntn-sim-core`.

It must answer five practical questions:

1. which current baseline is the frozen anchor for the next paper-oriented line,
2. which profiles / KPI families belong in the main paper result set,
3. which results belong only in robustness checks, sensitivity studies, or appendices,
4. how assumption-backed `EE / power` metrics must be disclosed and limited,
5. how future paper baselines should be added without replacing the current anchor in place.

This follow-on is intentionally narrow. It does **not** authorize broader realism expansion by itself.

---

## 3. Frozen Anchor Baseline

### 3.1 Current Anchor

For the current paper-oriented line, the frozen anchor baseline is:

1. paper: `PAP-2024-MORL-MULTIBEAM`
2. authored/runtime profile: `modqn-paper-baseline`
3. paper family: `FAM-MODQN-SYNTH`

This anchor is chosen because it already has:

1. a shipped paper-faithful state/action/reward bridge,
2. a shipped training/evaluation path,
3. a stabilized result bundle and viewer-safe handoff,
4. explicit disclosure of its current proxy ceilings.

### 3.2 What “Frozen Anchor” Means

“Frozen anchor” does **not** mean this paper becomes the repo’s permanent universal baseline.

It means:

1. the current paper-oriented hardening work assumes this baseline is the anchor for wording, result discipline, and claim packaging;
2. later paper lines must extend from it carefully rather than silently replacing it;
3. any future paper family with materially different state/action/reward or claim scope must land as a **sibling baseline**, not as an in-place rewrite of `modqn-paper-baseline`.

---

## 4. Paper-Mode

### 4.1 Main-Result Corridor

`paper-mode` is the configuration corridor intended for the primary figures/tables of the next paper-oriented line.

The main-result corridor should prefer:

1. the shipped anchor baseline and its stable held-out evaluation path,
2. frozen contract-backed KPI surfaces,
3. disclosed synthetic or validation-sized orbit assumptions that are already accepted by the current authority set,
4. one coherent model family per claim path.

For the current anchor line, the main paper results should center on:

1. throughput / scalarized reward behavior,
2. handover-related outcome metrics,
3. load-balance behavior,
4. stable KPI-bundle outputs that can be traced back to shipped runtime truth.

### 4.2 Robustness Corridor

The following belong in robustness checks, not as the default headline result set:

1. real-trace validation-sized runs,
2. advanced cross-family toggles whose purpose is stress/robustness rather than anchor parity,
3. optional viewer/export helpers,
4. secondary comparison paths that are useful for interpretation but not required for the main claim.

### 4.3 Sensitivity / Appendix Corridor

The following should default to sensitivity or appendix treatment unless a future SDD explicitly promotes them into the main claim path:

1. assumption-heavy `EE / power` outputs,
2. envelope-stretch experiments beyond the disclosed anchor ceiling,
3. alternative scalarization / weight sweeps,
4. broader variant comparisons outside the current paper family.

---

## 5. Claim-Mode

### 5.1 Main Claim Rule

`claim-mode` exists to prevent the paper from saying more than the current tree can safely support.

Allowed headline claim shapes should stay within:

1. method comparison under a controlled NTN simulator environment,
2. paper-baseline parity or reproduction under disclosed assumptions,
3. orbit-informed evaluation using the shipped `OMM/TLE ingest + SGP4-sampled cache-backed` path where applicable,
4. trend/range-faithful comparisons inside one stable paper family.

### 5.2 Disallowed Headline Claims

The following remain out of bounds for the current paper-oriented line:

1. deployment-grade real-world performance claims,
2. protocol-stack realism claims equivalent to `OMNeT++ / INET / estnet / Open5GS + UERANSIM`,
3. stronger MODQN generalization claims that exceed the disclosed `2 x 2` proxy / short-window / `ue-0` control ceiling,
4. physically validated absolute energy claims when denominator terms remain assumption-backed.

---

## 6. EE / Power Rule

### 6.1 If the Next Paper Is Not Energy-Centered

If `EE / power` is not the central contribution, then:

1. `EE` may appear only as a secondary reported metric,
2. assumption sets must remain disclosed,
3. headline claims must not depend on assumption-only denominator terms,
4. sensitivity presentation is preferred over strong absolute-value claims.

### 6.2 If the Next Paper Is Energy-Centered

If the next paper’s main contribution is energy-centered, then the minimum acceptable bar becomes:

1. explicit separation of paper-backed vs assumption-backed power terms,
2. a declared assumption set in the main paper path,
3. at least one sensitivity path showing the conclusion is not supported by a single hidden constant,
4. explicit wording that the result remains simulator-based rather than field-validated.

This follow-on does **not** itself authorize an `EE` realism expansion program.

---

## 7. Reference-Parity Rule

The paper-oriented line should not rely only on “the simulator can run.”

Before a future paper submission, the intended target line should also carry:

1. at least one concrete parity target against the current anchor paper or its closest baseline family,
2. explicit declaration of whether the comparison is trend-faithful, range-faithful, or only qualitative,
3. a record of any remaining disclosed deviations.

This is a paper-packaging discipline, not a new runtime architecture line.

---

## 8. Future Paper Extension Rule

Future paper targets must follow this rule:

1. keep `modqn-paper-baseline` as the current frozen anchor record;
2. if a new paper family is materially different, add a new sibling baseline with its own profile/manifest/result surface;
3. only abstract shared helpers after the second real paper line exists in code;
4. do not pre-emptively over-generalize the current baseline just because future replacement is possible.

The default extension pattern is therefore:

1. add, do not replace;
2. disclose, do not silently broaden;
3. reuse shared infrastructure only where the claim surface stays clear.

---

## 9. Allowed Landing Zone

This follow-on is primarily a governance / documentation / packaging line.

Primary landing zone:

1. `sdd/paper-mode-claim-mode-hardening-outline.md`
2. `sdd/ntn-sim-core-research-positioning-note.md`
3. `sdd/ntn-sim-core-implementation-status.md`
4. `todo/paper-mode-claim-mode/*`
5. `todo/README.md`
6. repo navigation docs that describe the active next follow-on

Optional companion sync only if needed for wording consistency:

1. `sdd/ntn-sim-core-profile-baselines.md`
2. `sdd/ntn-sim-core-paper-family-matrix.md`
3. `sdd/ntn-sim-core-reproduction-protocol.md`
4. `sdd/ntn-sim-core-assumption-policy.md`

This line should not require changes to runtime, contracts, or replay architecture.

---

## 10. What Stays Out of Scope

This follow-on must **not** expand into:

1. `OMNeT++ / INET / estnet` integration,
2. real-trace scalability or mixed-orbit promotion,
3. new algorithm branches,
4. full realism hardening across channel / mobility / protocol layers,
5. reopening frozen contracts,
6. engine/runtime rewrites to make the paper path “more real” by default.

If a proposed step needs any of the above, it belongs to a separate future track.

---

## 11. Completion Boundary

This follow-on is complete when:

1. the repo has one explicit paper-oriented authority for `paper-mode / claim-mode`,
2. the current anchor baseline is frozen and described as such,
3. main-result vs robustness vs sensitivity boundaries are explicit,
4. `EE / power` disclosure rules are explicit,
5. the future sibling-baseline extension rule is explicit,
6. status / README / `todo/` surfaces no longer say there is “no active follow-on” if this line is promoted.

This follow-on is intentionally complete at the governance layer before any additional paper-oriented implementation is considered.
