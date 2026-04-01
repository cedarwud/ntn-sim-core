# NTN Sim Core — Implementation Status

**Version:** 4.8.6
**Date:** 2026-04-01
**Status:** Prior hardening/closure program complete; latest audited reruns of `validate:visual-browser` and `validate:stage` pass, with browser-sensitive evidence still treated as transient-watch rather than permanently de-flaked. Simulator Platform Refactor is complete through Phase 5 Group 3 (2026-03-31), and downstream architecture is now complete through Group 2 (2026-03-31; authority/docs synchronized 2026-04-01). Final platform audit re-check passed on 2026-03-31 after stabilizing the DAPS live browser gate: `useSimulation.ts` now preserves missed discrete ticks and holds short-lived dual-active snapshots long enough for browser probes to observe them, while `engine/tick.ts` advances handover/KPI/energy exactly once per discrete tick. Phase 1 closure is hardened in the current tree: `validate-parameter-registry.mjs` now machine-enforces profile-specific registry/runtime parity in addition to coverage/source/namespace checks. Phase 4 (Runtime Contract Freeze) remains the frozen consumer-boundary baseline: `src/core/contracts/`, `RunnerExposureApi`, and `getProfileList()` semantics were preserved while Phase 5 reworked internal ownership. Phase 5 Group 1 froze the split/retirement plan and reviewer-grade `VAL-PLAT-011/012` contract; Group 2 landed `src/core/engine/`, split `profiles/types.ts`, moved orbit bootstrap ownership into `src/core/orbit/profile-runtime.ts`, and scoped the `parameter-registry` size split; Group 3 retired browser sync XHR real-trace bootstrap in both `useSimulation.ts` and `useReplay.ts`, resolved the beam-selection naming collision, deleted `profile-composer.ts`, retired runtime `ProfileConfig.sourceMap`, moved authored exposure/provenance/materialization responsibilities into `profile-exposure-catalog.ts`, `profile-authoring-registry.ts`, `runtime-materialization.ts`, and `profile-provenance-view.ts`, and machine-enforced `VAL-PLAT-011/012` in `validate-structure.mjs`. Downstream MODQN M3 is now complete: the shipped M2 result surface was stabilized additively, `ModqnViewModel` landed as the truth-safe UI projector, `validate-modqn-m3.ts` now runs the real reproduction path instead of a mock, and `validate:modqn:m2` / `validate:modqn:m3` / `validate:stage` all pass on 2026-04-01. MODQN baseline reproduction is therefore complete through M3 Group 1, while `estnet` remains paused.

---

## 1. Phase Status

| Phase | Name | Status | What Is Done | What Is Missing |
|---|---|---|---|---|
| 0 | Foundation & Governance | ✅ complete | profiles schema, trace contracts, runner skeletons, validation scripts | — |
| 1 | Synthetic Orbit + Visual | ✅ complete | Walker propagation, Kepler solver, trajectory cache, satellite sky layer | — |
| 2 | Channel + Handover + KPI | ✅ complete | FSPL, S/Ka-band SF/CL, beam gain, A3/A4/CHO/Timer-CHO/MC-HO/DAPS FSMs, 19 KPI metrics, per-interferer SINR, multi-UE (Phase A: shared serving) | — |
| 3 | Multi-Beam + Energy L1 | ✅ complete | hex beam layout, FRF coloring + semantics, beam selection, EE/DPC, per-interferer SINR, slant-range θ_3dB, spherical off-axis, Ka-band SF tables, atmospheric loss, Tier 5 SR fading, `EarthMovingBeamLayer`, screenshot proof packs, `BeamInfoOverlay`, `HandoverLinkOverlay`, prepared/secondary continuity roles in snapshot-driven beam/link overlays, browser validation probe, automated `VAL-FV-005`/`006`/`007` | screenshot packs remain as supplementary evidence, but core Phase 3 visual gates are now browser-automated |
| 4 | Real-Trace + Replay | ✅ complete | TLE/SGP4 loader, pass ranking, window curation modules, benchmark-runner TLE API, benchmark artifact `replayManifest`, persisted `replayArtifact`, frontend `useSimulation` TLE path, artifact-backed snapshot replay controller, deterministic curated-window `useReplay` flow, replay metadata exposed in HUD contract, real-trace screenshot proof, live/replay overlay parity on the snapshot path, automated `VAL-VIZ-001` / `VAL-RT-001` / `VAL-RT-002` / `VAL-CUR-001` / `VAL-FV-008` gates | — |
| 5 | Beam Hopping + Energy L2 | ✅ complete | BH scheduler (6 strategies: round-robin, max-demand, power-aware, deterministic-fixed, proportional-fair, sinr-greedy), battery/solar model with beta angle (M7 fixed), HUD overlay, control panel, `EarthFixedCellLayer`, deterministic `bh-resource-energy-proof`, `BhExplainabilityPanel`, automated `VAL-FV-004` and `VAL-EXP-001` browser gates | — |
| 6 | DAPS/DC-Like | ✅ complete | DAPS dual-active FSM, engine dual-link path, benchmark comparison runner, `DapsSnapshot` in engine, dual-active beam viz, `case9-daps-baseline` profile, screenshot proof, truth-driven continuity link overlay, automated `VAL-FV-009` browser gate for both live and replay | — |

Closure note: this table tracks the now-complete hardening/closure program. As of 2026-03-27, the previously deferred hardening IDs had either landed or been promoted into active browser/runtime coverage, so phase closure and gate closure became aligned. As of 2026-03-31, both this closure table and `sdd/ntn-sim-core-platform-refactor-roadmap.md` are completed-program records; current downstream work starts from preflight-first promotion (`MODQN M1`, `UI U1`), not from a new platform-refactor phase.

---

## 1b. Platform Refactor Phase Status

| Phase | Name | Status | Completion Criteria Location |
|---|---|---|---|
| 0 | Architecture Audit + Target Design | ✅ complete | `sdd/phase0-architecture-spec.md §0C.7` |
| 1 | Parameter Registry | ✅ complete | `sdd/phase1-parameter-registry-sdd.md` — VAL-PLAT-001/002/003 passing with profile-specific binding/runtime parity; `parameter-registry.ts` (58 entries), `validate-parameter-registry.mjs`; hardened 2026-03-31 |
| 2 | Model Bundle Interfaces | ✅ complete (2026-03-29) — `src/core/models/` (9 files), `buildModelBundle` factory, engine dispatch via bundle interfaces, `validate:bundle` (VAL-PLAT-004/004b/005 all PASS) | `sdd/phase2-model-bundle-sdd.md` §10 |
| 3 | Scenario/Profile/Experiment Split | ✅ complete (2026-03-30) — Group 1 (SDD), Group 2 (types + compose/decompose), Group 3 (file split + thin re-export defaults.ts + observers.ts) all done | `sdd/phase3-scenario-profile-experiment-split.md §10` — VAL-PLAT-005/006/007 PASS after Group 3 file split; `validate:stage` green (exit 0) |
| 4 | Runtime Contract Freeze | ✅ complete (2026-03-30) — Group 1 (SDD spec frozen) + Group 2 (contracts landed, consumers migrated, VAL-PLAT-008/009/010 PASS) | `sdd/phase4-runtime-contract-sdd.md §10` — VAL-PLAT-008/009/010 all PASS |
| 5 | Cleanup + Modularization | ✅ complete (2026-03-31) — Group 1 plan freeze, Group 2 structural split, and Group 3 legacy retirement / gate closure all landed; `validate:structure` now enforces `VAL-PLAT-011/012` and Phase 5 exit criteria are satisfied | `sdd/phase5-cleanup-and-modularization-sdd.md §9` — Phase 5 complete |

---

## 1c. Downstream Entry Status

| Surface | Status | Note |
|---|---|---|
| Downstream architecture | ✅ complete (Group 2 landed 2026-03-31; doc sync 2026-04-01) | Active boundary lives in `sdd/downstream-runtime-architecture-sdd.md`; minimal skeleton exists at `src/core/algorithms/`, `src/core/experiments/`, `src/viz/view-models/`; `src/adapters/` intentionally not created |
| `MODQN` baseline reproduction | ✅ M3 complete / U1 richer-handoff ready | Active authority is `sdd/modqn-baseline-spec-outline.md` + `sdd/modqn-runtime-outline.md` + `sdd/modqn-experiment-outline.md`; baseline path now uses the frozen `policy-v1` bridge plus reviewed `modqn-contracts.ts`, deterministic epoch-window sampling, held-out evaluation artifacts, the stabilized `ModqnReproductionResult`, `ModqnViewModel`, `validate:modqn`, `validate:modqn:m2`, and `validate:modqn:m3` |
| `UI U1` baseline entry | ✅ ready | Active authority is `sdd/ui-integration-roadmap.md`; baseline path consumes frozen contracts plus `RunnerExposureApi` |
| `estnet` consumer path | ⏸ paused | `sdd/estnet-ui-contract-outline.md` remains paused until explicit reopen |

---

## 2. Academic Remediation Tracker

Full gap analysis and remediation plan is preserved in the historical archive:
`archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-academic-remediation.md`

### Critical (blocks any paper submission)

| ID | Issue | Status |
|---|---|---|
| C1 | SINR interference uses serving link's path loss for all interferers | ✅ fixed (2026-03-23) |
| C2 | CHO / MC-HO / Timer-CHO not implemented | ✅ fixed (2026-03-23) |
| C3 | Single-UE model (multi-user KPIs meaningless) | ✅ fixed (2026-03-23 Phase A; 2026-03-25 Phase B with independent HO) |

### Major (affects publication credibility)

| ID | Issue | Status |
|---|---|---|
| M1 | Walker F parameter not configurable | ✅ fixed (2026-03-23) |
| M2 | Beam gain θ_3dB nadir-only approximation | ✅ fixed (2026-03-23) |
| M3 | Shadow fading table only covers suburban S-band | ✅ fixed (2026-03-23) |
| M4 | Tier 4 atmospheric loss always returns 0 | ✅ fixed (2026-03-23) |
| M5 | DAPS combining uses max not MRC, misattributed | ✅ fixed (2026-03-23) |
| M7 | Energy L2 solar/shadow ignores beta angle | ✅ fixed (2026-03-23) |
| M8 | Off-axis angle flat-Earth approximation | ✅ fixed (2026-03-23) |

### Missing modules (not in original SDD)

| ID | Module | Status |
|---|---|---|
| MS1 | Tier 5 small-scale fading (Shadowed-Rician, Loo) | ✅ implemented (2026-03-23, SR model) |
| MS2 | Multi-UE engine Phase B (independent HO per UE) | ✅ implemented (2026-03-25) — `Map<ueId, HandoverManager>` per engine, per-UE SINR+KPI, VAL-UE-003 passes; E-3 (N=10, 600s) and E-4 (N=100, 300s) golden cases pass |
| MS3 | Beam visualization (oblique cone from satellite to ground) | ✅ implemented (2026-03-25) — `EarthMovingBeamLayer.tsx` driven by engine `SatelliteBeamSnapshot`, replaces hardcoded 7-beam schematic |
| MS4 | Earth-fixed cell grid visualization | ✅ implemented (2026-03-25) — `EarthFixedCellLayer.tsx`, hex grid, 4-state: served/interfered/energyBlocked/unserved from BH slot truth + FRF collision detection |
| MS5 | Proper thermal noise model (noise figure) | ✅ implemented (2026-03-23) |
| MS6 | Truth-driven beam/SINR explainability overlay | ✅ implemented (2026-03-25) — `BeamInfoOverlay.tsx`, SINR dB color-coded label + role tags (`SERVING` / `PREPARED` / `SECONDARY` / `N active`) from snapshot truth; wired into LiveLayer + ReplayLayer |
| MS7 | Truth-driven handover/service link overlay | ✅ implemented (2026-03-25) — `HandoverLinkOverlay.tsx`, serving (solid cyan) + prepared (dashed orange) + secondary/DAPS dual-active links from `UE_ANCHOR` to satellite dome; wired into LiveLayer + ReplayLayer |

### Post-Remediation Extensions (2026-03-27)

| ID | Feature | Status |
|---|---|---|
| EXT-1 | MG1 Paper reproduction: 3 profiles + comparison script + results | ✅ (`sinr-elevation-reproduction`, `hobs-reproduction`, `timer-cho-reproduction`; `run-reproduction-comparison.ts`; `validate:reproduction`) |
| EXT-2 | MG4 E-level golden cases E-5 through E-11 | ✅ (VAL-SINR-002-E, VAL-HO-003-E, VAL-DELAY-001-E, VAL-MOBILITY-001-E, VAL-REPRO-001-E, VAL-POLICY-001-E, VAL-DOPPLER-001-E) |
| EXT-3 | MG2 RL pull-model: `getObservation()`/`applyAction()` on `SimEngine` | ✅ (cached observation every tick, external action queue, E-10 validated) |
| EXT-4 | BH scheduler extensions: `proportional-fair` + `sinr-greedy` | ✅ (`scheduler.ts`; `bh-pf-baseline`, `bh-sinr-greedy-baseline` profiles) |
| EXT-5 | Profile audit tooling: `scripts/audit-profiles.ts` 10-check suite | ✅ (15 profiles pass; added to `validate:stage`) |
| EXT-6 | Doppler Tier 6 wired into engine SINR: Phase 2 + Phase 3 paths | ✅ (`tier6_doppler` flag, E-11 validates 0.711 dB degradation for S-band 30 kHz SCS) |

---

## 3. Document Status

| Document | Role | Status |
|---|---|---|
| `docs/architecture/ntn-sim-core-architecture-blueprint.md` | architecture blueprint | active |
| `sdd/ntn-sim-core-sdd.md` | normative SDD | active (v1.1.0) — §9.2 Tier 6 Doppler wired; §9.7 RL pull-model engine integration updated |
| `sdd/ntn-sim-core-profile-baselines.md` | detailed baseline companion | active, case9 altitude aligned at 600km |
| `sdd/ntn-sim-core-platform-refactor-roadmap.md` | simulator platform refactor program record | completed program record; exit condition satisfied 2026-03-31 |
| `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-roadmap.md` | prior closure-program implementation plan | historical |
| `sdd/ntn-sim-core-validation-matrix.md` | gate definition | active, F/E/Browser passing for current SDD set |
| `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-preflight-refactor-closure.md` | preflight closure note | historical |
| `sdd/ntn-sim-core-development-constraints.md` | implementation-time prohibitions | active |
| `sdd/ntn-sim-core-acceptance-gates.md` | acceptance and claim gates | active |
| `sdd/ntn-sim-core-assumption-policy.md` | assumption governance | active |
| `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-academic-remediation.md` | academic gap analysis and remediation plan | historical closure record |
| `sdd/ntn-sim-core-paper-family-matrix.md` | paper-family clustering and claim ceilings | active (v1.0.2) |
| `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-donor-integration-map.md` | cross-repo donor ownership and parity map | historical |
| `sdd/ntn-sim-core-reproduction-protocol.md` | reproduction ladder, artifact policy, tolerance status | active (v1.0) |
| `sdd/ntn-sim-core-reproduction-targets.md` | 3 reference paper reproduction targets | active (v0.3.0) — dedicated reproduction profiles landed |
| `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-reproduction-results.md` | prior reproduction result snapshot | historical |
| `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-final-closure-checklist.md` | final closure record for project-level completion | historical |
| `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-fc1-replay-closure-checklist.md` | replay closure record for the landed FC-1 pass | historical |
| `sdd/ntn-sim-core-frontend-beam-visual-sdd.md` | frontend beam-rendering contract + implementation checklist | active (v0.3.2) |
| `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-frontend-beam-visual-acceptance.md` | beam visualization acceptance criteria | historical acceptance evidence |
| `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-frontend-donor-mapping.md` | frontend donor repo → module mapping | historical |
| `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-frontend-leo-parity-mode.md` | post-closure frontend parity spec | historical / closed |
| `sdd/ntn-sim-core-implementation-status.md` | this file | active |
| `sdd/README.md` | document index | active |

---

## 4. File Inventory

### top-level `src/` auxiliary directories

| Directory | Files | Key Modules |
|---|---|---|
| `src/config/` | 2 | `observer-presets.ts`, `visual-scene.config.ts` |
| `src/assets/` | 2 | `models.ts`, `scenes.ts` |
| `src/styles/` | 1 | `main.scss` |

### `src/core/` — current inventory

| Subdirectory | Files | Key Modules |
|---|---|---|
| `beam` | 7 | `layout.ts`, `selection.ts`, `active-beam-manager.ts`, `scheduler.ts`, `frequency-reuse.ts`, `types.ts`, `index.ts` |
| `channel` | 9 | `fspl.ts`, `beam-gain.ts`, `shadow-fading.ts`, `small-scale-fading.ts`, `doppler.ts`, `sinr.ts`, `link-budget.ts`, `types.ts`, `index.ts` |
| `common` | 3 | `types.ts`, `constants.ts`, `index.ts` |
| `config` | 9 | `parameter-registry.ts`, `parameter-registry-schema.ts`, `parameter-registry-data.ts`, `parameter-registry-foundation-data.ts`, `parameter-registry-beam-channel-data.ts`, `parameter-registry-handover-data.ts`, `parameter-registry-energy-ue-data.ts`, `profile-provenance-view.ts`, `paper-sources.json` |
| `contracts` | 6 | `runtime-v1.ts`, `kpi-v1.ts`, `policy-v1.ts`, `modqn-contracts.ts`, `exposure-v1.ts`, `index.ts` |
| `energy` | 4 | `layer1.ts`, `layer2.ts`, `types.ts`, `index.ts` |
| `engine` | 12 | `bootstrap.ts`, `tick.ts`, `orbit-step.ts`, `channel-step.ts`, `handover-step.ts`, `kpi-step.ts`, `scheduler-step.ts`, `energy-step.ts`, `snapshot-step.ts`, `policy-step.ts`, `state.ts`, `public-types.ts` |
| `experiments` | 2 | `types.ts`, `index.ts` — downstream landing zone for `ExperimentManifest`, `ExperimentResult` |
| `handover` | 9 | `manager.ts`, `baselines.ts`, `daps.ts`, `cho.ts`, `mc-ho.ts`, `ranking.ts`, `d2-distance.ts`, `types.ts`, `index.ts` |
| `kpi` | 4 | `accumulator.ts`, `recompute.ts`, `types.ts`, `index.ts` |
| `models` | 9 | `geometry.ts`, `path-loss.ts`, `beam-gain.ts`, `sinr.ts`, `handover.ts`, `power-ee.ts`, `policy.ts`, `model-bundle.ts`, `index.ts` |
| `orbit` | 11 | `propagation.ts`, `topocentric.ts`, `walker.ts`, `trajectory-cache.ts`, `tle-loader.ts`, `sgp4-adapter.ts`, `math.ts`, `types.ts`, `profile-runtime.ts`, `geo-stationary.ts`, `index.ts` |
| `policy` | 2 | `types.ts`, `index.ts` |
| `profiles` | 15 | `types.ts`, `runtime-schema.ts`, `bundle-vocabulary.ts`, `defaults.ts`, `defaults-access.ts`, `defaults-bh.ts`, `defaults-hobs.ts`, `defaults-misc.ts`, `defaults-modqn.ts`, `profile-authoring-registry.ts`, `profile-exposure-catalog.ts`, `runtime-materialization.ts`, `loader.ts`, `observers.ts`, `index.ts` |
| `trace` | 4 | `types.ts`, `factory.ts`, `serialization.ts`, `index.ts` |
| `traffic` | 2 | `generator.ts`, `index.ts` |
| `ue` | 3 | `position-generator.ts`, `mobility.ts`, `index.ts` |
| `algorithms` | 4 | `types.ts`, `index.ts`, `modqn-baseline-adapter.ts`, `modqn-baseline-types.ts` — downstream landing zone now includes the shipped MODQN baseline bridge |
| root | 2 | `engine.ts`, `README.md` |

### `src/runner/` — current inventory

| Subdirectory | Files | Key Modules |
|---|---|---|
| `headless` | 4 | `dry-run.ts`, `benchmark-runner.ts`, `types.ts`, `index.ts` |
| `replay` | 3 | `controller.ts` (snapshot replay + legacy artifact path), `types.ts`, `index.ts` |
| `curation` | 4 | `pass-ranker.ts`, `window-selector.ts`, `selection-plan.ts`, `index.ts` |
| root | 2 | `runner-exposure-api.ts`, `README.md` |

### `src/viz/` — current inventory

| Subdirectory | Files | Key Modules |
|---|---|---|
| `beam` | 4 | `moving-beam-geometry.ts`, `beam-visibility-selection.ts` (display-side), `bh-cell-analysis.ts`, `index.ts` |
| `satellite` | 2 | `observer-sky-projection.ts`, `index.ts` |
| `overlays` | 12 | `ControlPanel.tsx`, `SimHud.tsx`, `BeamInfoOverlay.tsx`, `HandoverLinkOverlay.tsx`, `BhExplainabilityPanel.tsx`, `BatchKpiPanel.tsx`, `HoEventLogOverlay.tsx`, `SinrCdfOverlay.tsx`, `SinrElevationScatter.tsx`, `SinrTimeSeriesOverlay.tsx`, `Starfield.tsx`, `ValidationProbe.tsx` |
| `scene` | 3 | `SceneShell.tsx`, `NTPUScene.tsx`, `CameraRig.tsx` |
| `validation` | 1 | `store.ts` (browser-side validation probe store) |
| `view-models` | 3 | `types.ts`, `index.ts`, `modqn-view-model.ts` — downstream landing zone for KPI/card/chart projection types plus the shipped MODQN M3 result projector |

### `src/app/` — current inventory

| Subdirectory | Files | Key Modules |
|---|---|---|
| `hooks` | 5 | `useSimulation.ts`, `useReplay.ts`, `useBatchKpi.ts` (now uses `RunnerExposureApi`), `useSceneQueryState.ts`, `index.ts` |

### `scripts/` — current validation + utility scripts

| Script | Role |
|---|---|
| `validate-specmode-gating.mjs` | Checks authored bundle `sourceMap` tier/specMode rules (Rules 1–6) + heuristic semantic consistency between ASSUME-* IDs and their `parameterPath` (Rule 7); part of authority chain |
| `validate-traceability-placeholders.mjs` | Checks ASSUME-/PAP-/STD- ID presence |
| `validate-assumption-manifest.mjs` | Checks AssumptionRecord completeness using `profile-provenance-view.ts` for per-profile assumption sets |
| `validate-core-purity.mjs` | Checks no React/Three.js imports in `src/core/` |
| `validate-structure.mjs` | Checks directory/file structure, forbidden legacy paths, recursive `src/core/` line caps (`VAL-PLAT-011`), and thin-orchestrator rules for `engine.ts` (`VAL-PLAT-012`) |
| `validate-runtime.mjs` | Runtime smoke checks |
| `validate-profile-layout.mjs` | Legacy profile layout checks (retained for `validate-structure.mjs` existence check; functionality absorbed into `validate-profiles.mjs`) |
| `validate-profiles.mjs` | Canonical profile gate: Phase 1 layout checks + VAL-PLAT-006 (types/runtime-materialization export and circular-import checks) + VAL-PLAT-007 (authoring bundle+experiment -> runtime parity, SDD §9 deep-equality) |
| `validate-modqn-baseline.ts`, `validate-modqn-m2.ts`, `validate-modqn-m3.ts` | Dedicated MODQN downstream gates: M1 bridge closure, M2 sampling/training/evaluation/artifact closure, and M3 stable result/view-model/disclosure closure |
| `validate-multibeam-gating.ts` | Multi-beam gate |
| `validate-orbit-parity.ts`, `validate-replay-manifest.ts`, `validate-final.mjs`, `validate-visual-browser.ts` | Orbit / replay / final / browser gates |
| `golden-case-channel.mjs`, `golden-case-engine.ts`, `golden-case-orbit.mjs` | Golden case reference checks |
| `run-baseline.ts`, `run-reproduction-comparison.ts`, `run-modqn-m2-smoke.ts` | Baseline and reproduction runners; `run-baseline.ts` applies profile-aware sanity for short-episode MODQN smoke runs, and `run-modqn-m2-smoke.ts` closes the M2 sampling/training/evaluation path over the reviewed experiments surface that M3 now stabilizes for UI handoff |
| `audit-profiles.ts`, `check-*.ts` | Debug / inspection utilities |

**Note:** `validate:specmode` verifies ID presence, specMode rule compliance, and (Rule 7) a heuristic semantic consistency check between `paper-sources.json` definitions and the authored `defaults-*.ts` bundle `sourceMap` `parameterPath` usage. Rule 7 is term-matching only — it is not full semantic equivalence — but it catches the coarsest category of provenance drift. `validate:trace` verifies ASSUME-/PAP-/STD- ID presence only.

---

## 5. Validation Gate Status

### Passing (active structural + runtime gates, verified 2026-03-31)

| VAL ID | Phase | Status | Note |
|---|---|---|---|
| VAL-ARCH-001 | 0 | ✅ pass | core layer purity |
| VAL-ARCH-002 | 0 | ✅ pass | config separation |
| VAL-CONF-001 | 0 | ✅ pass | profile serialization |
| VAL-TRACE-001 | 0 | ✅ pass | trace contracts exist |
| VAL-RNG-001 | 1 | ✅ pass | seed reproducibility (formula-level) |
| VAL-ORB-001 | 1 | ✅ pass | `validate-orbit-parity.ts` proves synthetic live orbit parity between browser `useSimulation` and headless interactive reference on access + multibeam profiles |
| VAL-ORB-002 | 1 | ✅ pass | slant range / orbital mechanics |
| VAL-CHAN-001 | 2 | ✅ pass | FSPL formula |
| VAL-CHAN-002 | 2 | ✅ pass | 3GPP SF/CL S-band table |
| VAL-BEAM-001 | 2 | ✅ pass | `validate-visual-browser.ts` proves earth-moving beam targets obey the donor-aligned footprint geometry contract and keeps `earthMovingBeamLayer` validation output aligned with the rendered candidate/live beam set |
| VAL-HO-001 | 2 | ✅ pass | A4 deterministic trigger (formula-level) |
| VAL-KPI-001 | 2 | ✅ pass | `validate-replay-manifest.ts` proves full-run headless KPI parity against snapshot recomputation and replay-window KPI parity against the authoritative sliced window |
| VAL-MB-001 | 3 | ✅ pass | `validate-multibeam-gating.ts` proves deterministic active-beam rotation and deterministic service loss for beam-center UEs when their beam is inactive |
| VAL-EE-001 | 3 | ✅ pass | energy L1 formula |
| VAL-BH-001 | 5 | ✅ pass | BH slot indexing |
| VAL-EE-002 | 5 | ✅ pass | battery depletion formula |
| VAL-DAPS-001 | 6 | ✅ pass | daps.ts exists |
| VAL-DAPS-002 | 6 | ✅ pass | DAPS 0ms vs baseline (formula-level) |
| VAL-VIZ-002 | 3 | ✅ pass | engine snapshot carries beam truth; SceneShell uses `EarthMovingBeamLayer` / `EarthFixedCellLayer` |
| VAL-PLAT-006 | P3 | ✅ pass | `scripts/validate-profiles.mjs` — `ScenarioConfig`, `ModelBundleSelection`, `ExperimentBundle`, and `ProfileBundle` still export from `profiles/types.ts`; `ProfileConfig` still exports; `runtime-materialization.ts` exports `materializeRuntimeProfile()`; `types.ts` and `runtime-materialization.ts` pass the no-circular-import checks against `engine.ts`, `viz/`, `app/`, and `runner/` |
| VAL-PLAT-007 | P3 | ✅ pass | `scripts/validate-profiles.mjs` — all 15 authored registry entries satisfy `deepEqual(materializeRuntimeProfile(entry.bundle, entry.exp), DEFAULT_PROFILES[entry.id])` under the SDD §9 deep-equality rules (`Date#getTime`, absent≡undefined) |
| VAL-MODQN-001 | M1 | ✅ pass | `scripts/validate-modqn-baseline.ts` — MODQN constants, adapter logic, action-consumption wiring, and `modqn-paper-baseline` runtime viability all pass together |
| VAL-MODQN-002 | M2 | ✅ pass | `scripts/validate-modqn-m2.ts` — deterministic sampling, experiments-layer boundary compliance, M1 handoff reuse, and runnable training/evaluation/artifact closure all pass together |
| VAL-MODQN-003 | M3 | ✅ pass | `scripts/validate-modqn-m3.ts` — real runner result surface, disclosure-complete metadata, serialization, and `ModqnViewModel` consumption all pass together without breaking `VAL-MODQN-002` |
| VAL-PLAT-011 | P5 | ✅ pass | `scripts/validate-structure.mjs` — recursive scan confirms every `src/core/**/*.ts|tsx` file is `<= 650` lines; historical blockers now read `engine.ts` = 106 lines, `parameter-registry.ts` = 7 lines plus data shards (largest shard: `parameter-registry-handover-data.ts` = 316), and `profiles/types.ts` = 40 lines |
| VAL-PLAT-012 | P5 | ✅ pass | `scripts/validate-structure.mjs` — `engine.ts` is 106 lines, `src/core/engine/` contains the required phase modules, root `engine.ts` imports only orchestrator-facing modules, and it defines only `createSimEngine()` |

**Note:** Formula-level (`-F`) tests pass. Engine-level (`-E`) golden cases also pass, and `npm run validate:stage` succeeds using `node --import tsx` for the golden-engine step. Browser-level (`-V`) closure evidence is automated for the current explainability/continuity package; screenshot packs remain supplementary evidence.

**Phase 5 note (2026-03-31):** Phase 5 is complete. Group 3 closure retired the browser sync-loader path, resolved the beam visibility naming collision, deleted `profile-composer.ts`, retired runtime `ProfileConfig.sourceMap`, moved parameter-level provenance onto Phase 1 registry bindings via `profile-provenance-view.ts`, retained authored `ProfileBundle.sourceMap` only as non-registry fallback metadata, and made `VAL-PLAT-011/012` machine-enforced.

### Remediation-dependent gates now passing

| VAL ID | Phase | Status | Blocker |
|---|---|---|---|
| VAL-SINR-001 | 3 | ✅ pass | C1 fixed; multi-beam SINR uses per-interferer path loss |
| VAL-HO-002 | 2 | ✅ pass | C2 fixed; CHO/Timer-CHO/MC-HO implemented |
| VAL-GOLDEN-001 | 2 | ✅ pass | C1 fixed; golden case SINR now uses per-interferer path loss |
| VAL-GOLDEN-002 | 3 | ✅ pass | C1 + M3 + M4 all fixed |

### Legacy manual visual evidence (supplementary to browser automation)

| VAL ID | Phase | Status | Note |
|---|---|---|---|
| VAL-FV-001 | 3 | ⚠️ manual pass | `EarthMovingBeamLayer` replaced the deprecated 7-beam placeholder in `SceneShell`; screenshot packs exist |
| VAL-FV-002 | 3 | ⚠️ manual pass | serving / prepared / secondary / inactive roles are visible in live and replay paths |
| VAL-FV-006 | 3 | ✅ browser pass | `validate-visual-browser.ts` verifies `BeamInfoOverlay` SINR/serving-sat truth against the runtime snapshot |
| VAL-FV-007 | 3 | ✅ browser pass | `validate-visual-browser.ts` verifies live DAPS continuity links reflect runtime truth |
| VAL-FV-003 | 4 | ⚠️ manual pass | `ReplayLayer` uses the same beam layers as `LiveLayer`; real-trace screenshot exists |
| VAL-FV-004 | 5 | ✅ browser pass | `validate-visual-browser.ts` verifies deterministic BH proof exposes `energyBlocked` cells in the earth-fixed layer |
| VAL-FV-008 | 4 | ✅ browser pass | `validate-visual-browser.ts` verifies replay-mode overlay/link parity and replay metadata visibility |
| VAL-FV-009 | 6 | ✅ browser pass | `validate-visual-browser.ts` verifies `dapsSource` / `dapsTarget` dual-active links in live mode and preserves them in replay via observed truth |

### Deferred hardening IDs

None remain. `VAL-ORB-001`, `VAL-KPI-001`, `VAL-MB-001`, and `VAL-BEAM-001` are all now covered by the standard validation chain.

### Remediation gates added historically, now passing

| VAL ID | Category | Check | Blocker |
|---|---|---|---|
| VAL-SINR-002 | signal | each interfering satellite uses its own slant range for path loss | ✅ fixed (2026-03-23) |
| VAL-HO-003 | handover | CHO state transitions appear in event traces | ✅ fixed (2026-03-23) |
| VAL-HO-004 | handover | MC-HO dual-connectivity events appear in event traces | ✅ fixed (2026-03-23) |
| VAL-UE-001 | multi-UE | N>1 UEs produce distinct SINR values per tick | ✅ fixed (2026-03-23) |
| VAL-UE-002 | multi-UE | Jain fairness index < 1.0 for N>1 UEs | ✅ fixed (2026-03-23) |
| VAL-CHAN-003 | channel | Ka-band profile uses Ka-band shadow fading parameters | ✅ fixed (2026-03-23) |
| VAL-CHAN-004 | channel | Tier 4 atmospheric loss > 0 when enabled for Ka-band | ✅ fixed (2026-03-23) |
| VAL-FADING-001 | channel | Tier 5 Shadowed-Rician fading produces non-zero variance | ✅ fixed (2026-03-23) |
| VAL-PROFILE-001 | profiles | all profile altitude_km values match cited source papers | ✅ fixed (case9 600km) |

---

## 6. Known Limitations

1. ~~**SINR interference model incorrect (C1):**~~ Fixed 2026-03-23. Each interferer now uses its own slant range, path loss, shadow fading, and clutter loss.
2. ~~**CHO/MC-HO missing (C2):**~~ Fixed 2026-03-23. CHO, Timer-CHO, and MC-HO implemented in cho.ts and mc-ho.ts with proper FSMs and event traces.
3. ~~**Single-UE only (C3):**~~ Fixed 2026-03-23/25. Phase A shared-serving and Phase B independent per-UE handover are both present.
4. ~~**Ka-band channel wrong (M3+M4):**~~ Fixed 2026-03-23. Ka-band shadow fading tables added; atmospheric loss model implemented for frequencies ≥10 GHz.
5. **Real-trace integration baseline is closed for the current SDD set:** frontend `useSimulation` and `useReplay` can both build deterministic SGP4/showcase paths, replay manifests and replay artifacts are emitted in the benchmark artifact path, and `validate-replay-manifest.ts` now validates both replay identity and snapshot-based KPI parity.
6. **Replay de-scope remains explicit:** snapshot replay used by `useReplay` is the authoritative frontend path; the legacy artifact-bundle `createReplayController()` path is retained only as an explicit compatibility/error boundary, not as a second replay family.
7. **Beam visualization baseline is landed:** `EarthMovingBeamLayer` and `EarthFixedCellLayer` are connected in `SceneShell`; `BeamFootprintLayer` has been deleted.
8. **BH research donor mapping remains broader than the proof path:** the deterministic `bh-resource-energy-proof` closes current SDD proof requirements, but future paper-specific BH scheduler families are still a donor-integration extension rather than a closure blocker.
9. **Validation has three practical tiers:** `-F` formula scripts pass, `-E` golden-case-engine passes in the standard stage chain, and `-V` browser automation covers the current frontend explainability/continuity package.
10. ~~**Tooling portability issue:**~~ Fixed 2026-03-25. `validate:stage` now launches `validate:golden-engine` via `node --import tsx` and passes in this sandbox.
11. **Profile parameter aligned:** case9-access-baseline defaults.ts altitude corrected to 600km (matches profile-baselines.md and source papers).
12. **Frontend explainability package is landed and browser-validated:** `BeamInfoOverlay`, `HandoverLinkOverlay`, and `BhExplainabilityPanel` now exist, are wired into live/replay, and are covered by `validate-visual-browser.ts`.
13. **Profile provenance is now split cleanly by responsibility:** runtime `ProfileConfig.sourceMap` is retired; `profile-provenance-view.ts` projects parameter-level provenance from Phase 1 registry bindings and falls back to authored `ProfileBundle.sourceMap` only for non-registry profile metadata. This is a documented Phase 5 split-authority design, not leftover runtime compatibility debt.

---

## 7. Final Closure Items

Historical closure companion:
`archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-final-closure-checklist.md`

No project-level closure items remain open for the current SDD set.

---

## 8. Frontend Beam Architecture (Post-Simplification)

The leo-parity experiment (formerly tracked in `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-frontend-leo-parity-mode.md`) has been closed. Useful satellite selection logic now lives in `src/viz/beam/beam-visibility-selection.ts`, and the dual view-mode system was removed. The current frontend beam architecture is:

1. **`beam-visibility-selection.ts`** — decides which satellites show beams (`selectBeamSatellites()`) and which are cell candidates (`selectCellCandidateSatIds()`)
2. **`EarthMovingBeamLayer`** — renders 3D beam cones for selected satellites
3. **`EarthFixedCellLayer`** — renders hex grid colored by BH slot state for candidate satellites at elevation >= 10 deg
4. **`BeamInfoOverlay`** — satellite role tags + SINR display
5. **`HandoverLinkOverlay`** — UE-to-satellite link lines
6. **`bh-cell-analysis.ts`** — hex cell state computation

Deleted components (no longer in the codebase):
- `BeamFootprintLayer.tsx` (was @deprecated)
- `LeoParityBeamLayer.tsx`
- `LeoParityBeamOverlay.tsx`
- `LeoParityHandoverLinks.tsx`
- `src/viz/presenters/` directory (`leo-parity-presenter.ts`, `types.ts`)

Single hardcoded profile: `hobs-multibeam-baseline`. No `ViewMode` toggle or query-param view switching.
