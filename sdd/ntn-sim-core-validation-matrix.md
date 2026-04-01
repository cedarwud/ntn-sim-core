# NTN Sim Core — Validation Matrix

**Version:** 2.3.4
**Date:** 2026-04-01
**Status:** Active — enforced Formula/Engine gates passing; browser-visible gates pass in the latest audited reruns but remain under transient watch after one same-day re-audit timeout in `validate:visual-browser`. Engine coverage remains through E-11; no hardening IDs are deferred. Platform Refactor is complete through Phase 5 Group 3 (2026-03-31). Final platform audit re-check passed on 2026-03-31 after re-hardening `validate:visual-browser`: the DAPS live probe now sees short-lived dual-active truth via sticky transient snapshot publication in `useSimulation.ts`, while `engine/tick.ts` prevents multi-advance of handover/KPI/energy within a single discrete tick. Phase 1 closure is hardened as of 2026-03-31 rev 2: `validate-parameter-registry.mjs` now runs under `node --import tsx` and machine-enforces profile-specific binding/runtime parity in addition to coverage/source/namespace checks. Phase 4 Group 2 hardened (2026-03-30 rev 2): VAL-PLAT-008/009/010 all PASS — `validate-contracts.mjs` runs under `node --import tsx` (runtime check for VAL-PLAT-010); F1–F6 pattern scan covers both static `import` and inline `import()` type references; `SceneShell.tsx` and `useSimulation.ts` inline import() leaks fixed; `ControlPanel.tsx` `PROFILE_OPTIONS` identifier removed (renamed `profileEntries`); `exposure-v1.ts` now reads authored exposure metadata via `profile-exposure-catalog.ts`; `ParameterView`/`ParameterMetadataResponse` stubs aligned to SDD §4.4.4 shape; `ui-exposure-spec.md` §3.1 synced. Phase 5 Group 3 completed the structural closure: runtime `ProfileConfig.sourceMap` retired, `profile-composer.ts` deleted, async browser real-trace bootstrap landed in both live/replay hooks, `beam-selection.ts` renamed to `beam-visibility-selection.ts`, and `validate-structure.mjs` now machine-enforces `VAL-PLAT-011/012`. As of 2026-04-01, downstream gates `VAL-MODQN-001` and `VAL-MODQN-002` both pass via `validate-modqn-baseline.ts` and `validate-modqn-m2.ts`, and profile-count-sensitive gates `VAL-PLAT-005/007/010` now track 15 active profiles.

---

## 1. Purpose

This matrix defines the validation checks required before `ntn-sim-core` can make research claims or rely on visualization for interpretation.

Operational merge, benchmark, and showcase acceptance rules are further constrained by:

1. `sdd/ntn-sim-core-development-constraints.md`
2. `sdd/ntn-sim-core-acceptance-gates.md`
3. `sdd/ntn-sim-core-assumption-policy.md`
4. `sdd/ntn-sim-core-frontend-beam-visual-sdd.md`
5. `sdd/ntn-sim-core-ui-exposure-spec.md`

---

## 2. Validation IDs

| ID | Category | Check | Phase |
|---|---|---|---|
| `VAL-ARCH-001` | architecture | `src/core/**` contains no React/Three imports | 0 |
| `VAL-ARCH-002` | architecture | physical parameters and visual-only parameters are separated | 0 |
| `VAL-CONF-001` | config | profile + override resolution is serializable and deterministic | 0 |
| `VAL-TRACE-001` | traceability | each run emits manifest, resolved config, and source-trace skeleton | 0 |
| `VAL-RNG-001` | reproducibility | same seed/profile yields identical orbit snapshots | 1 |
| `VAL-ORB-001` | orbit | synthetic orbit positions are stable across headless and frontend paths | 1 |
| `VAL-ORB-002` | geometry | slant range, azimuth, and elevation outputs match formula checks | 1 |
| `VAL-VIZ-001` | visualization | replayed orbit timeline matches stored trace ordering and time offsets | 1 |
| `VAL-VIZ-002` | visualization | beam renderer is snapshot-driven: `SatelliteState.beams[]` populated from engine, not hardcoded constants | 3 |
| `VAL-CHAN-001` | channel | FSPL baseline matches reference calculations | 2 |
| `VAL-CHAN-002` | channel | 3GPP NTN large-scale loss composition is traceable by profile | 2 |
| `VAL-BEAM-001` | beam geometry | earth-moving beam footprint projection matches the declared access-profile geometry contract | 2 |
| `VAL-HO-001` | handover | hard HO baseline is deterministic under fixed seed/config | 2 |
| `VAL-HO-002` | handover | A3/A4 or CHO/MC-HO trigger reasons appear in event traces | 2 |
| `VAL-KPI-001` | KPI | KPI totals are identical between headless and replay-based recomputation | 2 |
| `VAL-GOLDEN-001` | golden cases | profile-specific access golden cases exist for orbit/channel/HO reference points | 2 |
| `VAL-MB-001` | multibeam | active-beam restriction changes serviceability deterministically | 3 |
| `VAL-SINR-001` | signal | interference-aware multi-beam SINR path matches profile-selected formula family | 3 |
| `VAL-EE-001` | energy | energy layer 1 outputs appear in benchmark artifacts and are reproducible | 3 |
| `VAL-FV-001` | visualization | earth-moving multibeam renderer uses truth-driven beam layout and not the deprecated 7-beam placeholder | 3 |
| `VAL-FV-002` | visualization | serving / prepared / secondary / inactive beam roles are visibly distinguishable in earth-moving mode | 3 |
| `VAL-FV-006` | visualization | beam/SINR overlay is derived from snapshot/trace truth and does not recompute SINR locally | 3 |
| `VAL-FV-007` | visualization | handover/service link overlay expresses serving / prepared / secondary / dual-active continuity truth in live access mode | 3 |
| `VAL-FV-005` | visualization | beam display membership remains consistent with observer-sky pass semantics | 3 |
| `VAL-GOLDEN-002` | golden cases | profile-specific multibeam golden cases exist for HOBS-style signal and active-beam paths | 3 |
| `VAL-RT-001` | real-trace | TLE-derived replay uses the same channel/HO/KPI stack as synthetic mode | 4 |
| `VAL-RT-002` | replay | replay manifest reconstructs the same selected time window and event timing | 4 |
| `VAL-CUR-001` | curation | showcase window selection is deterministic and recorded in metadata | 4 |
| `VAL-FV-003` | visualization | replay mode reuses the same beam renderer family as live mode | 4 |
| `VAL-FV-008` | visualization | replay mode reuses the same overlay/link semantics and truth fields as live mode | 4 |
| `VAL-BH-001` | beam hopping | BH scheduler decisions are explicit per slot and replayable | 5 |
| `VAL-EE-002` | energy | energy layer 2 can block service independently of geometry | 5 |
| `VAL-EXP-001` | explainability | overlays can distinguish low-SINR, inactive-beam, and energy-blocked service loss | 5 |
| `VAL-FV-004` | visualization | earth-fixed / BH cell view reflects scheduler, service, interference, and energy truth | 5 |
| `VAL-DAPS-001` | continuity | DAPS/DC-like state transitions are logged and replayable | 6 |
| `VAL-DAPS-002` | continuity | DAPS-enabled run shows measurable continuity difference versus baseline under same scenario | 6 |
| `VAL-FV-009` | visualization | DAPS/DC-like dual-active continuity links or equivalent explainers are visible without inventing unsupported states | 6 |

### Platform Refactor Gates (added 2026-03-29, from Phase 0C)

| ID | Category | Check | Phase | Script |
|---|---|---|---|---|
| `VAL-PLAT-001` | parameter registry | `ParameterEntry[]` (two-layer: `GlobalParameterSpec` + `ProfileParameterBinding[]`) non-empty; all `P`-classified fields from phase0-architecture-spec.md §0B.6 have at least one binding; every profile-specific binding.defaultValue matches the runtime value at `spec.parameterPath` | P1 | `validate-parameter-registry.mjs` — loads `PARAMETER_REGISTRY` and `DEFAULT_PROFILES`, diffs parameterPath set against canonical §0B.6 P-field list, checks every entry has bindings, and fails on any profile-specific binding/runtime mismatch |
| `VAL-PLAT-002` | parameter registry | every `ProfileParameterBinding.sourceId` resolves in `paper-sources.json` | P1 | `validate-parameter-registry.mjs` — builds Set from all keys in `papers`+`standards`+`assumptions` sections (NOT top-level JSON keys); checks each binding.sourceId; exits non-zero on any miss. Non-STD-prefixed IDs (e.g. `3GPP-NTN-ACCESS`) are valid. |
| `VAL-PLAT-003` | parameter registry | no PARAM-* ID duplicates; no overlap with source-registry namespaces | P1 | `validate-parameter-registry.mjs` — checks id prefix = "PARAM-", id uniqueness, no id matching any key in the combined `papers`+`standards`+`assumptions` set from paper-sources.json |
| `VAL-PLAT-004` | model bundle | (Part A) `engine.ts` contains no raw tier-flag if/else chains for path loss, beam gain, or SINR; (Part B) all 8 `bundle.*` dispatch call-patterns present in the active engine implementation | P2 | `validate-model-bundle.ts` — Part A: regex scan for raw tier-flag branches; Part B: positive check for `bundle.geometry.compute(`, `bundle.pathLoss.compute(`, etc. across the split engine files; see `phase2-model-bundle-sdd.md §9` for exact patterns |
| `VAL-PLAT-004b` | model bundle | `src/core/models/` contains all 8 interface files (`geometry.ts`, `path-loss.ts`, `beam-gain.ts`, `sinr.ts`, `handover.ts`, `power-ee.ts`, `policy.ts`, `model-bundle.ts`); `ModelBundle` in `src/core/models/model-bundle.ts` (not `config/`) | P2 | `validate-model-bundle.ts` — `fs.existsSync` for each file; regex check for `export.*ModelBundle` in model-bundle.ts |
| `VAL-PLAT-005` | model bundle | `ModelBundle` factory (`buildModelBundle`) produces non-null bundle for all 15 active profiles; all 8 required slots populated; `power`/`ee` null iff `layer1_enabled===false` | P2 | `validate-model-bundle.ts` — runs `buildModelBundle` for each entry in `DEFAULT_PROFILES` under `node --import tsx`; asserts non-null fields and bundle.id prefix |
| `VAL-PLAT-006` | scenario split | `ScenarioConfig`, `ModelBundleSelection`, `ExperimentBundle`, and `ProfileBundle` exported from `profiles/types.ts`; `ProfileConfig` still present and exported; `runtime-materialization.ts` exports `materializeRuntimeProfile()`; `types.ts` and `runtime-materialization.ts` import neither `engine.ts` nor `src/viz/`, `src/app/`, or `src/runner/` | P3 | `validate-profiles.mjs` (augmented) — regex export-scan on `types.ts` + `runtime-materialization.ts`; import-chain assertions on the replacement materialization surface; see `phase5-cleanup-and-modularization-sdd.md §6` for the Phase 5 rewrite of this gate |
| `VAL-PLAT-007` | scenario split | all 15 active profiles in `DEFAULT_PROFILES` pass authoring parity: `deepEqual(materializeRuntimeProfile(entry.bundle, entry.exp), DEFAULT_PROFILES[entry.id])` for every authored registry entry; no extra runtime fields inserted by materialization | P3 | `validate-profiles.mjs` (augmented) — runs under `node --import tsx`; imports `DEFAULT_PROFILES`, `PROFILE_AUTHORING_ENTRIES`, and `materializeRuntimeProfile()`; recursive `deepEqual` with diff output on first failing field |
| `VAL-PLAT-008` | runtime contract | (1) `src/core/contracts/runtime-v1.ts`, `kpi-v1.ts`, `policy-v1.ts`, `exposure-v1.ts` all exist; (2) `runtime-v1.ts` exports 9 required snapshot types (`SimulationSnapshot`, `SatelliteState`, `UeState`, `BhSlotSnapshot`, `DapsSnapshot`, `HoLogEntry`, `SatelliteBeamSnapshot`, `BeamRole`, `ContinuityState`); (3) `runtime-v1.ts` includes `@version v1` and `@frozen` text; (4) `kpi-v1.ts` exports `KpiBundle` and `BatchKpiEntry`; (5) `policy-v1.ts` exports `PolicyObservation`, `PolicyAction`, `Policy`; (6) `exposure-v1.ts` exports `ProfileListEntry`, `HandoverType`, `getProfileList` | P4 | `scripts/validate-contracts.mjs` (new) — `npm run validate:contracts`. Exact check patterns in `phase4-runtime-contract-sdd.md §8.1` |
| `VAL-PLAT-009` | runtime contract | Zero files in `src/viz/**` match: (F1) import from `@/core/common/types`; (F2) import from `@/core/profiles/types`; (F4) reference `PROFILE_OPTIONS`; (F5) import from `@/core/policy/types`. Zero files in `src/app/hooks/**` match: (F3) import from `@/runner/headless/benchmark-runner`; (F5) import from `@/core/policy/types`. Exception: `src/core/contracts/**` may import from `common/types`, `profiles/types`, `kpi/types`, `policy/types` (bridge layer). `src/viz/**` must NOT import `@/runner/runner-exposure-api` directly. | P4 | `scripts/validate-contracts.mjs` — glob + regex scan; fails with violating file list. Exact grep patterns in `phase4-runtime-contract-sdd.md §8.2` |
| `VAL-PLAT-010` | exposure contract | `getProfileList()` importable from `@/core/contracts/exposure-v1`; returns Array of length 15; all 15 active profile IDs present (see `phase4-runtime-contract-sdd.md §8.3` for exact ID list); every entry has `tier ∈ ['Realistic','Advanced','Sensitivity']`; every entry has non-empty `id`, `label`, `family`; data NOT sourced from hardcoded `PROFILE_OPTIONS` | P4 | `scripts/validate-contracts.mjs` (runtime execution under `node --import tsx`). Exact check in `phase4-runtime-contract-sdd.md §8.3` |
| `VAL-PLAT-011` | cleanup | `validate-structure.mjs` recursively scans all `*.ts` / `*.tsx` files under `src/core/` and fails with offending file paths + line counts when any file exceeds 650 lines. No allowlist. Historical blockers were `engine.ts`, `config/parameter-registry.ts`, and `profiles/types.ts`; closure state is now `engine.ts` = 106 lines, `parameter-registry.ts` = 7 lines plus data shards (largest shard: `parameter-registry-handover-data.ts` = 316), and `profiles/types.ts` = 40 lines. | P5 | `validate-structure.mjs` — recursive line-count scan with explicit offender output and PASS line when the blocker list is empty |
| `VAL-PLAT-012` | cleanup | `engine.ts` is a thin orchestrator (`<= 200` lines); `src/core/engine/` exists with at least `tick.ts`, `orbit-step.ts`, `channel-step.ts`, `handover-step.ts`, `scheduler-step.ts`, and the current repo also requires `energy-step.ts`, `snapshot-step.ts`, and `state.ts`; root `engine.ts` no longer defines helper/tick bodies and no longer imports subsystem implementation modules from `channel/`, `beam/`, `handover/`, `energy/`, `ue/`, or `traffic/`. Closure state is now machine-enforced. | P5 | `validate-structure.mjs` — line-cap + file-existence + root-import/pattern checks; PASS requires that root `engine.ts` define only `createSimEngine()` |

### Remediation Gates (added 2026-03-21, from the historical academic remediation program)

| ID | Category | Check | Remediation Item |
|---|---|---|---|
| `VAL-SINR-002` | signal | each interfering satellite uses its own slant range for path loss computation | C1 |
| `VAL-HO-003` | handover | CHO state transitions (cho-prepared, cho-executing) appear in event traces | C2 |
| `VAL-HO-004` | handover | MC-HO dual-connectivity events appear in event traces | C2 |
| `VAL-UE-001` | multi-UE | N>1 UEs produce distinct SINR values per tick | C3 |
| `VAL-UE-002` | multi-UE | Jain fairness index < 1.0 for N>1 UEs with different positions | C3 |
| `VAL-UE-003` | multi-UE | Phase B: N>1 UEs have different serving satellite IDs when `independentHandover: true` | MS2 (covered by golden-case-engine.ts E-3/E-4) |
| `VAL-CHAN-003` | channel | Ka-band profile uses Ka-band shadow fading parameters, not S-band | M3 |
| `VAL-CHAN-004` | channel | Tier 4 atmospheric loss > 0 when enabled for Ka-band | M4 |
| `VAL-FADING-001` | channel | Tier 5 Shadowed-Rician fading produces non-zero variance under non-deterministic channel | MS1 |
| `VAL-PROFILE-001` | profiles | all profile altitude_km values match cited source papers | profile fix |

### Physics Model Gates (added 2026-03-21, from the historical academic remediation program §9)

| ID | Category | Check | Remediation Item |
|---|---|---|---|
| `VAL-DOPPLER-001` | channel | Doppler shift computation produces ±24 kHz at S-band / ±336 kHz at Ka-band for LEO 550km; Tier 6 engine integration produces measurable SINR degradation | P1; EXT-6 |
| `VAL-DELAY-001` | handover | handover TTT includes propagation delay (RTT) from slant range | P2 |
| `VAL-TRAFFIC-001` | traffic | BH scheduler receives non-zero per-cell demand from traffic generator | P3 |
| `VAL-MOBILITY-001` | UE | UE position changes over time when speed_kmh > 0 | P4 |

### Methodology Gates (added 2026-03-21, from the historical academic remediation program §10)

| ID | Category | Check | Remediation Item |
|---|---|---|---|
| `VAL-REPRO-001` | reproduction | at least one reference paper result reproduced within stated tolerance | MG1 |
| `VAL-POLICY-001` | RL interface | engine exposes getObservation() and applyAction() for external policy | MG2 |
| `VAL-MODQN-001` | downstream MODQN | paper-faithful MODQN bridge remains wired: constants, authored baseline envelope, contracts-only algorithm imports, adapter state/action/reward logic, policy/external action consumption, and `modqn-paper-baseline` runtime viability all pass together | M1 |
| `VAL-MODQN-002` | downstream MODQN | deterministic MODQN epoch-window sampling, M1-surface-backed training/evaluation closure, held-out evaluation path, and baseline artifact/result bundle all pass together | M2 |

---

## 3. Validation Level Split (MG4)

Each validation check operates at one of three levels:

| Level | Suffix | Meaning | Test Infrastructure |
|---|---|---|---|
| **Formula** | `-F` | Isolated formula check, standalone script re-implements math | `validate-runtime.mjs`, `golden-case-*.mjs` |
| **Engine** | `-E` | End-to-end engine path check, runs actual `engine.ts` tick loop | `golden-case-engine.ts`, `benchmark-runner` (headless) |
| **Visual** | `-V` | Browser-visible proof that the frontend expresses truth semantics correctly | `validate-visual-browser.ts` plus supplementary screenshot packs |

### Current Coverage

| VAL ID | Level | Script |
|---|---|---|
| VAL-RNG-001 | F | validate-runtime.mjs |
| VAL-ORB-001 | E/V | validate-orbit-parity.ts (browser `useSimulation` vs headless interactive orbit parity on synthetic profiles) |
| VAL-ORB-002 | F | validate-runtime.mjs, golden-case-orbit.mjs |
| VAL-CHAN-001 | F | validate-runtime.mjs, golden-case-channel.mjs |
| VAL-CHAN-002 | F | golden-case-channel.mjs |
| VAL-BEAM-001 | V | `validate-visual-browser.ts` — HOBS live browser probe verifies fixed footprint radius, UE-anchored origin pinning, off-center beam displacement, and donor-aligned earth-moving geometry projection |
| VAL-HO-001 | F | validate-runtime.mjs |
| VAL-SINR-001 | F | validate-runtime.mjs |
| VAL-SINR-002 | F | validate-runtime.mjs |
| VAL-EE-001 | F | validate-runtime.mjs |
| VAL-EE-002 | F | validate-runtime.mjs |
| VAL-BH-001 | F | validate-runtime.mjs |
| VAL-DAPS-002 | F | validate-runtime.mjs |
| VAL-HO-003 | F | validate-runtime.mjs |
| VAL-HO-004 | F | validate-runtime.mjs |
| VAL-UE-001 | F | validate-runtime.mjs |
| VAL-UE-002 | F | validate-runtime.mjs |
| VAL-CHAN-003 | F | validate-runtime.mjs |
| VAL-CHAN-004 | F | validate-runtime.mjs |
| VAL-FADING-001 | F | validate-runtime.mjs |
| VAL-GOLDEN-001 | E | golden-case-engine.ts E-1 |
| VAL-GOLDEN-002 | E | golden-case-engine.ts E-2 |
| VAL-HO-002 | E | golden-case-engine.ts E-6 plus remediation trace coverage from `VAL-HO-003` / `VAL-HO-004` |
| VAL-MB-001 | E | validate-multibeam-gating.ts (actual beam-layout + active-beam-manager + selection runtime path) |
| VAL-UE-003 | E | golden-case-engine.ts E-3 / E-4 |
| VAL-SINR-002 | E | golden-case-engine.ts E-5 (N=5 UEs, distinct per-UE SINR) |
| VAL-HO-003 | E | golden-case-engine.ts E-6 (CHO event types in recentHoEvents) |
| VAL-DELAY-001 | E | golden-case-engine.ts E-7 (one-way delay 1.8–5ms at LEO 550km) |
| VAL-MOBILITY-001 | E | golden-case-engine.ts E-8 (UE position δ > 0.001° over 300s at 60 km/h) |
| VAL-REPRO-001 | E | golden-case-engine.ts E-9 + run-reproduction-comparison.ts |
| VAL-POLICY-001 | E | golden-case-engine.ts E-10 (getObservation/applyAction pull-model) |
| VAL-MODQN-001 | E + structural | validate-modqn-baseline.ts (constants, adapter logic, policy/external action wiring, runtime viability) |
| VAL-MODQN-002 | E + structural | validate-modqn-m2.ts (sampling, experiments boundary, M1 handoff reuse, training/eval/artifact closure) |
| VAL-DOPPLER-001 | E | golden-case-engine.ts E-11 (Tier 6 Doppler produces 0.01–5 dB SINR degradation at S-band 30 kHz SCS) |
| VAL-VIZ-002 | E | engine snapshot + SceneShell integration, manual code-path verification |
| VAL-VIZ-001 | E/V | validate-replay-manifest.ts + validate-visual-browser.ts |
| VAL-KPI-001 | E | validate-replay-manifest.ts (full-run headless KPI vs snapshot recomputation, plus replay-window KPI parity) |
| VAL-RT-001 | E | validate-replay-manifest.ts (`real-trace-validation` replay artifact/controller identity) |
| VAL-RT-002 | E | validate-replay-manifest.ts |
| VAL-CUR-001 | E | validate-replay-manifest.ts |
| VAL-FV-001 | V | screenshot packs (`case9-access`, `hobs-multibeam`) |
| VAL-FV-002 | V | screenshot packs + SceneShell role rendering (`serving` / `prepared` / `secondary` / inactive) |
| VAL-FV-003 | V | `useReplay` + screenshot proof (`real-trace-validation`) |
| VAL-FV-004 | V | `validate-visual-browser.ts` — deterministic BH proof exposes `energyBlocked` cells in browser automation |
| VAL-FV-005 | V | `validate-visual-browser.ts` — HOBS live browser probe checks time advance + visible-set membership + multibeam count |
| VAL-FV-006 | V | `validate-visual-browser.ts` — browser probe verifies `BeamInfoOverlay` SINR and serving sat IDs match snapshot truth |
| VAL-FV-007 | V | `validate-visual-browser.ts` — live DAPS browser probe verifies continuity links reflect truth |
| VAL-FV-008 | V | `validate-visual-browser.ts` — replay browser probe verifies deterministic replay metadata + overlay/link parity |
| VAL-FV-009 | V | `validate-visual-browser.ts` — live + replay DAPS probes verify dual-active continuity truth without invented states |
| VAL-ARCH-001 | structural | validate-core-purity.mjs |
| VAL-ARCH-002 | structural | validate-structure.mjs |
| VAL-PLAT-001 | structural | validate-parameter-registry.mjs |
| VAL-PLAT-002 | structural | validate-parameter-registry.mjs |
| VAL-PLAT-003 | structural | validate-parameter-registry.mjs |
| VAL-PLAT-004 | structural | validate-model-bundle.ts |
| VAL-PLAT-004b | structural | validate-model-bundle.ts |
| VAL-PLAT-005 | structural | validate-model-bundle.ts |
| VAL-PLAT-006 | structural | validate-profiles.mjs |
| VAL-PLAT-007 | structural | validate-profiles.mjs |
| VAL-PLAT-008 | structural | validate-contracts.mjs — contract files exist with @frozen annotation + required exports **PASS** (2026-03-30) |
| VAL-PLAT-009 | structural | validate-contracts.mjs — zero F1–F6 forbidden import patterns in viz/hooks **PASS** (2026-03-30) |
| VAL-PLAT-010 | structural | validate-contracts.mjs — getProfileList() returns 15 profiles, no hardcoded data **PASS** (2026-04-01) |
| VAL-MODQN-001 | structural + engine | validate-modqn-baseline.ts — MODQN constants, bridge logic, action consumption, and baseline runtime viability **PASS** (2026-04-01) |
| VAL-MODQN-002 | structural + engine | validate-modqn-m2.ts — deterministic sampling, experiments-layer boundary, M1 handoff reuse, and runnable training/eval/artifact closure **PASS** (2026-04-01) |
| VAL-PLAT-011 | structural | validate-structure.mjs — machine-enforced recursive `src/core/` size gate; PASS requires zero files over 650 lines |
| VAL-PLAT-012 | structural | validate-structure.mjs — machine-enforced thin-orchestrator gate; PASS requires `engine.ts <= 200`, required `engine/` modules present, no forbidden subsystem imports, and no helper functions beyond `createSimEngine()` |

**Note:** Formula-level (`-F`) checks are automated and pass. Engine-level (`-E`) checks pass and are part of `npm run validate:stage` via `node --import tsx`. Engine coverage now extends through E-11, including `VAL-POLICY-001` and `VAL-DOPPLER-001` in addition to the earlier E-5 through E-9 expansion. `npm run validate:integration` runs all engine + reproduction checks. Browser-level visual checks (`VAL-BEAM-001`, `VAL-FV-004` through `VAL-FV-009`, and `VAL-EXP-001`) are automated via `validate-visual-browser.ts`, and `VAL-ORB-001` is now browser/headless-hybrid validated by `validate-orbit-parity.ts`. Platform Refactor contract gates VAL-PLAT-008/009/010 are enforced via `validate-contracts.mjs`, and Phase 5 structural gates VAL-PLAT-011/012 are now enforced via `validate-structure.mjs`; the latest audited `validate:stage` rerun passed, but the browser-visible subset should still be treated as transient-sensitive.

**Deferred hardening IDs:** none remain in the current enforced closure set.

---

## 4. Reference Numeric Checkpoints

These checks are formula-level checkpoints with explicit assumptions. They are intentionally narrower than full paper-result replication.

| Ref ID | Assumptions | Expected Result |
|---|---|---|
| `REF-ORB-001` | circular orbit, `R_E = 6378.137 km`, `h = 550 km`, `mu = 398600.4418 km^3/s^2` | orbital period `≈ 95.65 min`, speed `≈ 7.585 km/s` |
| `REF-CHAN-001` | FSPL with `f = 2000 MHz`, `d = 600 km` slant range | path loss `≈ 154.03 dB` |

Global SINR checkpoints are not defined here, because SINR depends on the full parameter stack:

1. antenna gain family
2. interference set
3. beam activity
4. bandwidth and noise assumptions
5. large-scale and optional small-scale model choices

Paper-family SINR targets should therefore be implemented as `golden cases`, not as context-free global constants.

---

## 5. Gate Usage

### Phase Gate

Each phase must pass:

1. all earlier-phase validation IDs that are active for the current SDD closure set;
2. all validation IDs assigned to the current phase that are active for the current SDD closure set;
3. any deferred hardening IDs for that phase only when the corresponding hardening work is explicitly in scope.

### Research Claim Gate

Any figure or table intended for a paper must be supported by:

1. the corresponding phase gate
2. saved manifests and artifacts
3. source-trace references for every KPI-impacting model family used in that result

### Showcase Gate

Any showcase/demo sequence must additionally prove:

1. the replay window was selected deterministically
2. visual controls did not alter physical outcomes
3. the event sequence can be regenerated from replay metadata
4. any beam-facing showcase satisfies `ntn-sim-core-frontend-beam-visual-sdd.md`

---

## 6. Platform Refactor — Passing Gate Record

| ID | Phase | Result | Date | Notes |
|---|---|---|---|---|
| `VAL-PLAT-001` | P1 | ✅ PASS | 2026-03-31 | All 58 canonical parameterPaths present in PARAMETER_REGISTRY; all profile-specific binding defaults match runtime profiles |
| `VAL-PLAT-002` | P1 | ✅ PASS | 2026-03-29 | All 35 distinct sourceIds resolve in paper-sources.json (nested-section lookup) |
| `VAL-PLAT-003` | P1 | ✅ PASS | 2026-03-29 | 58 PARAM-* IDs: unique, prefixed, no collision with source namespace |
| `VAL-PLAT-004` | P2 | ✅ PASS | 2026-03-30 | engine.ts contains no raw tier-flag dispatch chains; all 8 bundle families dispatched. Re-verified after Phase 3 Group 3 file split |
| `VAL-PLAT-004b` | P2 | ✅ PASS | 2026-03-30 | `src/core/models/` contains all 8 required interface files; `ModelBundle` in `model-bundle.ts`. Re-verified after Phase 3 Group 3 file split |
| `VAL-PLAT-005` | P2 | ✅ PASS | 2026-04-01 | `buildModelBundle` produced valid non-null bundles for all 15 active profiles (per SDD §8.2 validation requirement). Re-verified after MODQN profile registration |
| `VAL-PLAT-006` | P3 | ✅ PASS | 2026-03-31 | `scripts/validate-profiles.mjs` — `profiles/types.ts` still exports the scenario/profile vocabulary surface, `runtime-materialization.ts` exports `materializeRuntimeProfile()`, and both files satisfy the circular-import restrictions against `engine.ts`, `viz/`, `app/`, and `runner/` |
| `VAL-PLAT-007` | P3 | ✅ PASS | 2026-04-01 | `scripts/validate-profiles.mjs` — authored registry parity confirmed for all 15 active profiles via `materializeRuntimeProfile(entry.bundle, entry.exp)` deep-equality against `DEFAULT_PROFILES[entry.id]` |
| `VAL-MODQN-001` | M1 | ✅ PASS | 2026-04-01 | `validate-modqn-baseline.ts` verifies MODQN constants, adapter bridge logic, `pendingPolicyAction` / `pendingExternalAction` consumption, and `modqn-paper-baseline` runtime viability |
| `VAL-MODQN-002` | M2 | ✅ PASS | 2026-04-01 | `validate-modqn-m2.ts` verifies deterministic epoch-window sampling, experiments-layer boundary compliance, M1 handoff reuse, and runnable training/evaluation/artifact closure |
| `VAL-PLAT-011` | P5 | ✅ PASS | 2026-03-31 | `scripts/validate-structure.mjs` — recursive `src/core/` scan reports zero files over 650 lines; historical blockers resolved (`engine.ts` 106, `parameter-registry-handover-data.ts` 316 as the largest registry shard, `profiles/types.ts` 40) |
| `VAL-PLAT-012` | P5 | ✅ PASS | 2026-03-31 | `scripts/validate-structure.mjs` — `engine.ts` is 106 lines, required `engine/` modules exist, root imports only orchestrator-facing modules, and the only function defined in root is `createSimEngine()` |
