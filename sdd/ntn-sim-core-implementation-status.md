# NTN Sim Core — Implementation Status

**Version:** 3.0.0
**Date:** 2026-03-23
**Status:** Remediation Complete — L2 Ready

---

## 1. Phase Status

| Phase | Name | Status | What Is Done | What Is Missing |
|---|---|---|---|---|
| 0 | Foundation & Governance | ✅ complete | profiles schema, trace contracts, runner skeletons, validation scripts | — |
| 1 | Synthetic Orbit + Visual | ✅ complete | Walker propagation, Kepler solver, trajectory cache, satellite sky layer | — |
| 2 | Channel + Handover + KPI | ✅ complete | FSPL, S/Ka-band SF/CL, beam gain, A3/A4/CHO/Timer-CHO/MC-HO/DAPS FSMs, 19 KPI metrics, per-interferer SINR, multi-UE (Phase A: shared serving) | — |
| 3 | Multi-Beam + Energy L1 | ✅ complete | hex beam layout, FRF coloring + semantics, beam selection, EE/DPC, per-interferer SINR, slant-range θ_3dB, spherical off-axis, Ka-band SF tables, atmospheric loss, Tier 5 SR fading | — |
| 4 | Real-Trace + Replay | ⚠️ partial | TLE/SGP4 loader exists, pass ranking exists, window curation exists | benchmark-runner and useSimulation only build Walker constellations (TLE path not wired); replay controller returns empty snapshots |
| 5 | Beam Hopping + Energy L2 | ⚠️ partial | BH scheduler (4 generic strategies), battery/solar model with beta angle (M7 fixed), HUD overlay, control panel | **M6:** BH scheduler strategies are generic baselines, none matches a specific paper; beam visualization is schematic (not physically accurate) |
| 6 | DAPS/DC-Like | ⚠️ partial | DAPS dual-active FSM, engine dual-link SINR path (SC, M5 fixed), benchmark comparison runner | DAPS replay path not verified |

---

## 2. Academic Remediation Tracker

Full gap analysis and remediation plan: `sdd/ntn-sim-core-academic-remediation.md`

### Critical (blocks any paper submission)

| ID | Issue | Status |
|---|---|---|
| C1 | SINR interference uses serving link's path loss for all interferers | ✅ fixed (2026-03-23) |
| C2 | CHO / MC-HO / Timer-CHO not implemented | ✅ fixed (2026-03-23) |
| C3 | Single-UE model (multi-user KPIs meaningless) | ✅ fixed (2026-03-23, Phase A) |

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
| MS2 | Multi-UE engine | ❌ not started |
| MS3 | Beam visualization (oblique cone from satellite to ground) | ⚠️ schematic only |
| MS4 | Earth-fixed cell grid visualization | ❌ not started |
| MS5 | Proper thermal noise model (noise figure) | ✅ implemented (2026-03-23) |

---

## 3. Document Status

| Document | Role | Status |
|---|---|---|
| `docs/architecture/ntn-sim-core-architecture-blueprint.md` | architecture blueprint | active |
| `sdd/ntn-sim-core-sdd.md` | normative SDD | active, needs §9.2 Tier 5 and §9.3 CHO/MC-HO updates |
| `sdd/ntn-sim-core-profile-baselines.md` | detailed baseline companion | active, case9 altitude aligned at 600km |
| `sdd/ntn-sim-core-roadmap.md` | implementation plan | active, needs remediation phase addition |
| `sdd/ntn-sim-core-validation-matrix.md` | gate definition | active, 9 remediation gates added |
| `sdd/ntn-sim-core-preflight-refactor-closure.md` | preflight closure note | active |
| `sdd/ntn-sim-core-development-constraints.md` | implementation-time prohibitions | active |
| `sdd/ntn-sim-core-acceptance-gates.md` | acceptance and claim gates | active |
| `sdd/ntn-sim-core-assumption-policy.md` | assumption governance | active |
| `sdd/ntn-sim-core-academic-remediation.md` | academic gap analysis and remediation plan | **new** |
| `sdd/ntn-sim-core-paper-family-matrix.md` | paper-family clustering and claim ceilings | active (v1.0) |
| `sdd/ntn-sim-core-donor-integration-map.md` | cross-repo donor ownership and parity map | active (v1.0) |
| `sdd/ntn-sim-core-reproduction-protocol.md` | reproduction ladder, artifact policy, tolerance status | active (v1.0) |
| `sdd/ntn-sim-core-reproduction-targets.md` | 3 reference paper reproduction targets | active (v0.1) |
| `sdd/ntn-sim-core-implementation-status.md` | this file | active |
| `sdd/README.md` | document index | active |

---

## 4. File Inventory

### `src/core/` — 58 modules

| Subdirectory | Files | Key Modules |
|---|---|---|
| `common` | 3 | `types.ts`, `constants.ts`, `index.ts` |
| `profiles` | 4 | `types.ts`, `defaults.ts`, `loader.ts`, `index.ts` |
| `trace` | 4 | `types.ts`, `factory.ts`, `serialization.ts`, `index.ts` |
| `orbit` | 9 | `propagation.ts`, `topocentric.ts`, `walker.ts`, `trajectory-cache.ts`, `tle-loader.ts`, `sgp4-adapter.ts`, `math.ts`, `types.ts`, `index.ts` |
| `channel` | 9 | `fspl.ts`, `beam-gain.ts`, `shadow-fading.ts`, `small-scale-fading.ts`, `doppler.ts`, `sinr.ts`, `link-budget.ts`, `types.ts`, `index.ts` |
| `handover` | 7 | `manager.ts`, `baselines.ts`, `daps.ts`, `cho.ts`, `mc-ho.ts`, `types.ts`, `index.ts` |
| `kpi` | 3 | `accumulator.ts`, `types.ts`, `index.ts` |
| `beam` | 7 | `layout.ts`, `selection.ts`, `active-beam-manager.ts`, `scheduler.ts`, `frequency-reuse.ts`, `types.ts`, `index.ts` |
| `energy` | 4 | `layer1.ts`, `layer2.ts`, `types.ts`, `index.ts` |
| `ue` | 3 | `position-generator.ts`, `mobility.ts`, `index.ts` |
| `traffic` | 2 | `generator.ts`, `index.ts` |
| `policy` | 2 | `types.ts`, `index.ts` |
| root | 1 | `engine.ts` |

### `src/runner/` — 10 modules

| Subdirectory | Files | Key Modules |
|---|---|---|
| `headless` | 4 | `dry-run.ts`, `benchmark-runner.ts`, `types.ts`, `index.ts` |
| `replay` | 3 | `controller.ts` (skeleton only), `types.ts`, `index.ts` |
| `curation` | 3 | `pass-ranker.ts`, `window-selector.ts`, `index.ts` |

### `src/viz/` — 14 modules

### `src/app/` — 4 modules

### `scripts/` — 9 validation scripts

---

## 5. Validation Gate Status

### Passing (structural + formula-level, automated)

| VAL ID | Phase | Status | Note |
|---|---|---|---|
| VAL-ARCH-001 | 0 | ✅ pass | core layer purity |
| VAL-ARCH-002 | 0 | ✅ pass | config separation |
| VAL-CONF-001 | 0 | ✅ pass | profile serialization |
| VAL-TRACE-001 | 0 | ✅ pass | trace contracts exist |
| VAL-RNG-001 | 1 | ✅ pass | seed reproducibility (formula-level) |
| VAL-ORB-002 | 1 | ✅ pass | slant range / orbital mechanics |
| VAL-CHAN-001 | 2 | ✅ pass | FSPL formula |
| VAL-CHAN-002 | 2 | ✅ pass | 3GPP SF/CL S-band table |
| VAL-HO-001 | 2 | ✅ pass | A4 deterministic trigger (formula-level) |
| VAL-EE-001 | 3 | ✅ pass | energy L1 formula |
| VAL-BH-001 | 5 | ✅ pass | BH slot indexing |
| VAL-EE-002 | 5 | ✅ pass | battery depletion formula |
| VAL-DAPS-001 | 6 | ✅ pass | daps.ts exists |
| VAL-DAPS-002 | 6 | ✅ pass | DAPS 0ms vs baseline (formula-level) |

**Note:** Formula-level (`-F`) tests use standalone scripts re-implementing math. Engine-level (`-E`) tests use `golden-case-engine.ts` which runs actual `engine.ts` tick loop with fixed seed and locked KPI expectations. Both levels now pass.

### Blocked by code bugs

| VAL ID | Phase | Status | Blocker |
|---|---|---|---|
| VAL-SINR-001 | 3 | ✅ pass | C1 fixed; multi-beam SINR uses per-interferer path loss |
| VAL-HO-002 | 2 | ✅ pass | C2 fixed; CHO/Timer-CHO/MC-HO implemented |
| VAL-GOLDEN-001 | 2 | ✅ pass | C1 fixed; golden case SINR now uses per-interferer path loss |
| VAL-GOLDEN-002 | 3 | ✅ pass | C1 + M3 + M4 all fixed |

### Deferred (need integration / browser testing)

| VAL ID | Phase | Status | Needs |
|---|---|---|---|
| VAL-ORB-001 | 1 | deferred | headless vs frontend orbit diff |
| VAL-VIZ-001 | 1 | deferred | replay timeline ordering |
| VAL-BEAM-001 | 2 | deferred | beam footprint geometry |
| VAL-KPI-001 | 2 | deferred | headless vs replay KPI comparison |
| VAL-MB-001 | 3 | deferred | active-beam gating determinism |
| VAL-RT-001 | 4 | deferred | TLE path not wired in runner |
| VAL-RT-002 | 4 | deferred | replay returns empty snapshots |
| VAL-CUR-001 | 4 | deferred | window selection not end-to-end tested |
| VAL-EXP-001 | 5 | deferred | overlay distinction |

### Defined but not yet passing (remediation gates, added to validation-matrix.md)

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
3. ~~**Single-UE only (C3):**~~ Fixed 2026-03-23 (Phase A). Engine generates N UEs within beam footprint (uniform/clustered/hotspot). Each UE gets per-UE SINR from beam gain roll-off. Shared serving satellite (Phase A). Phase B (independent HO per UE) deferred.
4. ~~**Ka-band channel wrong (M3+M4):**~~ Fixed 2026-03-23. Ka-band shadow fading tables added; atmospheric loss model implemented for frequencies ≥10 GHz.
5. **Real-trace not wired (Phase 4):** TLE loader and SGP4 adapter exist as modules but benchmark-runner and useSimulation only build Walker constellations.
6. **Replay skeleton only (Phase 4):** replay controller returns empty snapshots.
7. **Beam visualization schematic:** BeamFootprintLayer shows a 7-beam schematic at satellite dome position, not physically accurate beam projection.
8. **Validation scripts test formulas in isolation:** they do not test the actual engine code paths, so passing them does not prove the engine is correct.
9. **Profile parameter aligned:** case9-access-baseline defaults.ts altitude corrected to 600km (matches profile-baselines.md and source papers).
