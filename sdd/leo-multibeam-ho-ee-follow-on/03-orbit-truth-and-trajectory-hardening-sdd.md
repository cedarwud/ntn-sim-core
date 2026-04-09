# 03. Orbit Truth And Trajectory Hardening SDD

**Status:** proposed  
**Priority:** P1 after SDD-02  
**Why now:** orbit truth is already stronger in `ntn-sim-core` than in donors, but the next research step needs a cleaner boundary between synthetic truth, real-trace truth, and future mixed-orbit ambitions

## 1. Problem Statement

`ntn-sim-core` already has:

1. a clean synthetic Walker path;
2. an OMM/TLE ingest plus SGP4-sampled cache-backed real-trace path;
3. deterministic replay and validation.

This is already ahead of `leo-beam-sim` and `leo-simulator` as a research base. But the next hardening step is still needed because:

1. some orbit-shell defaults are still baseline choices rather than paper-specific reproductions;
2. Doppler and some geometry-adjacent helpers remain simplified;
3. large-catalog or mixed `LEO/MEO/GEO` truth is still intentionally blocked;
4. the repo should learn from `ntn-stack` time-baseline discipline without importing its looser threshold conventions as research defaults.

## 2. Goals

1. preserve the current synthetic + real-trace dual-path architecture;
2. make synthetic orbit claims more explicitly paper-bounded;
3. strengthen truth-path discipline for real-trace inputs;
4. define a safe future path for broader orbit realism without reopening unrelated scope.

## 3. Reuse Decision

### 3.1 `leo-beam-sim`

Reuse:

1. only the clean Kepler propagation structure where it still improves clarity or testability.

Do not reuse:

1. deterministic perturbation/clustering hacks in Walker generation as research defaults.

### 3.2 `ntn-stack`

Reuse:

1. TLE epoch / time-baseline discipline;
2. explicit anti-fake-data governance;
3. visibility and time-series processing mindset for larger real-trace catalogs.

Do not reuse:

1. handover thresholds or visibility heuristics as silent baseline truth.

### 3.3 `leo-simulator`

Reuse:

1. precomputed pass playback only as an optional visualization/performance layer over governed truth, not as the sole source of motion.

## 4. Required Changes

### 4.1 Tighten synthetic-orbit paper mapping

For each paper-facing profile, record whether the shell is:

1. reproduced from a cited shell;
2. representative baseline;
3. sensitivity envelope.

### 4.2 Strengthen geometry-adjacent physical fidelity

Candidate follow-ons:

1. derive Doppler from state derivatives rather than only simplified radial geometry where feasible;
2. tighten atmospheric-loss upgrade path when papers or official models require it;
3. ensure visibility / elevation gating language remains consistent with `system-model-refs`.

### 4.3 Define safe real-trace scale-up boundary

Future larger-catalog or mixed-orbit work must remain separate from thesis-baseline closure unless:

1. cache provenance is preserved;
2. orbit source metadata is reproducible;
3. validation-sized and larger-scale paths are clearly distinguished in claims.

## 5. Acceptance Criteria

1. every orbit-facing profile clearly states whether it is paper-reproduced or representative-only;
2. real-trace wording stays aligned with actual OMM/TLE + SGP4-sampled runtime truth;
3. no donor-specific orbit shortcut becomes a silent research default;
4. future mixed-orbit scale-up has a bounded contract instead of creeping into baseline claims.

## 6. Validation

Add and require:

1. `VAL-ORB-ACA-001`: profile orbit shells classified as reproduced vs representative vs sensitivity;
2. `VAL-ORB-ACA-002`: real-trace provenance bundle includes source identity, epoch window, and cache-generation truth path;
3. `VAL-ORB-ACA-003`: no unclassified donor orbit shortcut is active in research-facing presets.
