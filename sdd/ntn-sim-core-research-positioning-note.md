# NTN Sim Core — Research Positioning Note

**Version:** 1.0.0  
**Date:** 2026-04-02  
**Status:** Active research-positioning companion for paper-oriented follow-on planning  
**Depends on:** `ntn-sim-core-implementation-status.md`, `ntn-sim-core-paper-family-matrix.md`, `ntn-sim-core-profile-baselines.md`, `system-model-refs/*`, `paper-catalog/*`

---

## 1. Purpose

This note records the current academic-paper positioning of `ntn-sim-core` after:

1. simulator-platform closure,
2. `MODQN` baseline reproduction closure through `M3`,
3. UI baseline viewer closure through `U2`,
4. narrow real-trace truth-path correction (`T1`).

It exists to answer four practical questions before future development starts:

1. what the current simulator may truthfully claim in a paper,
2. where the current tree already exceeds common simulator-only literature practice,
3. where the current tree still falls short of the strongest realism ceilings seen in the corpus,
4. which future directions are worth reopening first for publication-oriented work.

This note does **not** authorize a new implementation track by itself. Future work still requires an explicit promoted SDD / prompt surface.

---

## 2. Current Project Position

`ntn-sim-core` should currently be described as a:

**trace-informed, model-based, research-grade NTN simulator with frozen consumer contracts, replayable artifacts, and paper-disciplined assumption governance.**

That means:

1. orbit input may come from external `OMM/TLE`,
2. validation-sized real-trace cache samples are now generated from an `SGP4`-sampled path,
3. runtime and replay still consume a cache-backed / interpolation-backed simulator path,
4. channel, handover, throughput, power, and energy-efficiency behavior are still simulator models rather than field-measured system behavior.

The current tree is therefore stronger than a purely synthetic toy simulator, but it is **not** a field-deployment system, a hardware-in-the-loop platform, or a full protocol-stack emulator.

---

## 3. Position Relative to the 61-Paper Corpus

This comparison uses the current `paper-catalog` merged corpus (`61` papers) as the baseline reference set.

### 3.1 Areas Where `ntn-sim-core` Already Exceeds the Average Paper

`ntn-sim-core` is already above corpus average in the following areas:

1. **Engineering rigor and governance**
   - frozen contracts,
   - replay/artifact surfaces,
   - validation matrix + machine-enforced gates,
   - explicit assumption policy,
   - viewer-facing disclosure discipline.
2. **Integrated simulator breadth**
   - orbit, multi-beam channel, handover, energy, beam hopping, DAPS/DC-like continuity, replay, and UI surfaces live in one governed platform rather than in disconnected scripts.
3. **Orbit-truth discipline**
   - after `T1`, the shipped real-trace path is truthfully `OMM/TLE ingest + SGP4-sampled cache-backed runtime/replay`,
   - which is already stronger than the many corpus papers that stay purely synthetic.
4. **Claim-surface hygiene**
   - the repo distinguishes paper-backed, synthesized, and assumption-backed components more explicitly than the average simulator paper does.

### 3.2 Areas Where `ntn-sim-core` Roughly Matches Mainstream Paper Practice

The current tree is broadly aligned with mainstream NTN simulator papers in:

1. **SINR / throughput / handover modeling**
   - integrated formula chains,
   - geometry-driven beam/channel behavior,
   - simulator-computed interference,
   - simulator-computed KPI bundles.
2. **Simulator-style energy-efficiency reporting**
   - transmission / power / throughput closures are modeled rather than field-measured,
   - which remains common in the literature.
3. **Trace-informed simulation rather than field testing**
   - this is still a standard and accepted research pattern across the corpus.

### 3.3 Areas Where `ntn-sim-core` Still Falls Short of the Corpus Upper Bound

The current tree still sits below the strongest realism seen in the corpus in these areas:

1. **Power / EE realism**
   - key denominator terms such as circuit power, PA efficiency, beam-state power, and HO-event energy remain assumption-backed or sensitivity-only.
2. **Protocol / system-stack realism**
   - the repo does not yet provide `NS-3` / `OMNeT++` / `INET` / `Open5GS + UERANSIM` style stack-level validation.
3. **Large-catalog mixed-orbit real-trace scaling**
   - the current real-trace proof remains validation-sized; broader mixed `LEO/MEO/GEO` scalability is still blocked.
4. **Prototype or field-backed evidence**
   - the current tree is not a prototype-grade deployment or testbed.

---

## 4. Paper-Safe Claim Ceiling

### 4.1 Claims the Current Tree Can Safely Support

The current simulator can safely support claims of this form:

1. **method comparison under a controlled NTN simulator environment,**
2. **paper-baseline reproduction or parity checks under disclosed assumptions,**
3. **trace-informed orbit evaluation using OMM/TLE ingest with an SGP4-sampled cache-backed path,**
4. **handover / beam / policy / KPI trend comparison under one stable model family,**
5. **artifact-backed reproduction with explicit assumption disclosure and validation gates.**

### 4.2 Claims the Current Tree Should Not Make

The current tree should **not** claim:

1. real-world deployment performance,
2. full per-tick live `SGP4` runtime semantics,
3. protocol-stack realism equivalent to `NS-3` / `OMNeT++` / production core stacks,
4. physically validated absolute energy-efficiency values when denominator terms remain assumption-backed,
5. large mixed-orbit real-trace realism that has not yet been promoted and validated.

---

## 5. What Must Still Be Strengthened for Publication-Oriented Work

The highest-value remaining gaps are not “more features everywhere.” They are the specific gaps most likely to limit safe paper claims.

### 5.1 Must-Fix / Must-Disclose First

1. **EE / power assumption discipline**
   - keep paper-backed and assumption-backed power terms explicitly separated,
   - keep assumption sets exposed whenever `EE` is reported,
   - avoid presenting assumption-only denominators as universal truth.
2. **Paper-mode / claim-mode experiment discipline**
   - define a cleaner publication-oriented configuration surface:
     - what belongs in the main result set,
     - what belongs only in sensitivity / appendix,
     - what is too assumption-heavy to serve as the main claim.
3. **Reference-paper parity / cross-check evidence**
   - strengthen parity against the actual target literature,
   - especially where results are currently trend-faithful but not yet strongly range-faithful.

### 5.2 High-Value but Topic-Dependent Additions

1. **Stronger power-source realism**
   - especially if the next paper is energy-centered.
2. **Traffic / mobility realism**
   - only if the publication target truly depends on non-static user behavior.
3. **Protocol / system cross-validation**
   - useful when the paper’s main question moves beyond orbit/beam/handover logic into stack interaction.

---

## 6. Recommended Future Directions

### 6.1 Recommended as the Next Publication-Oriented Improvement Themes

1. **paper-mode / claim-mode packaging**
   - a small follow-on that defines a cleaner “publication configuration” for main-result vs robustness-result usage,
   - without reopening contracts or the platform core.
2. **EE / power realism hardening**
   - only if the next paper’s central claim depends on `EE` as more than a secondary metric.
3. **targeted parity strengthening**
   - for the specific paper family that the next submission wants to compare against.

As of 2026-04-02, item `1` above has been promoted into `sdd/paper-mode-claim-mode-hardening-outline.md` as the current next paper-oriented governance follow-on.

### 6.2 Separate Future Track: `OMNeT++` / `INET` / `estnet`

`OMNeT++`, `INET`, and `estnet` integration should be treated as a **separate future consumer/backend realism track**, not as a hidden prerequisite for the current simulator to remain paper-usable.

That future track may be worth reopening when the research question requires:

1. protocol-stack interaction,
2. latency / queueing / signaling realism,
3. stronger external-simulator cross-validation,
4. external-consumer adapter work through future `src/adapters/` ownership.

It should **not** be folded into the current baseline simulator just because “more realism sounds better.”

---

## 7. Directions to Avoid for Now

The following are poor near-term priorities if the goal is an academically publishable next step:

1. reopening blocked real-trace scalability work before a fresh promotion,
2. adding broader mixed-orbit / donor-pipeline work without a new active SDD,
3. expanding UI beyond current baseline evidence needs,
4. multiplying algorithm branches before the paper claim surface is tightened,
5. using assumption-heavy `EE` numbers as the main headline result without first hardening the denominator story.

---

## 8. Maintenance Rule

When a future follow-on lands, update this note in the same change set if any of the following change:

1. what the project may truthfully claim in a paper,
2. where the project sits relative to the 61-paper corpus,
3. the ranking of must-fix vs nice-to-have realism gaps,
4. whether `OMNeT++` / `INET` / `estnet` has become an active promoted track instead of a separate future line.

If those items do not change, this note remains the active research-positioning baseline.
