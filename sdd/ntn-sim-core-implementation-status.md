# NTN Sim Core — Implementation Status

**Version:** 3.8.1
**Date:** 2026-03-25
**Status:** Current SDD Closure Complete — project-level final closure items are closed

---

## 1. Phase Status

| Phase | Name | Status | What Is Done | What Is Missing |
|---|---|---|---|---|
| 0 | Foundation & Governance | ✅ complete | profiles schema, trace contracts, runner skeletons, validation scripts | — |
| 1 | Synthetic Orbit + Visual | ✅ complete | Walker propagation, Kepler solver, trajectory cache, satellite sky layer | — |
| 2 | Channel + Handover + KPI | ✅ complete | FSPL, S/Ka-band SF/CL, beam gain, A3/A4/CHO/Timer-CHO/MC-HO/DAPS FSMs, 19 KPI metrics, per-interferer SINR, multi-UE (Phase A: shared serving) | — |
| 3 | Multi-Beam + Energy L1 | ✅ complete | hex beam layout, FRF coloring + semantics, beam selection, EE/DPC, per-interferer SINR, slant-range θ_3dB, spherical off-axis, Ka-band SF tables, atmospheric loss, Tier 5 SR fading, `EarthMovingBeamLayer`, screenshot proof packs, `BeamInfoOverlay`, `HandoverLinkOverlay`, prepared/secondary continuity roles in snapshot-driven beam/link overlays, browser validation probe, automated `VAL-FV-005`/`006`/`007` | screenshot packs remain as supplementary evidence, but core Phase 3 visual gates are now browser-automated |
| 4 | Real-Trace + Replay | ✅ complete | TLE/SGP4 loader, pass ranking, window curation modules, benchmark-runner TLE API, benchmark artifact `replayManifest`, persisted `replayArtifact`, frontend `useSimulation` TLE path, artifact-backed snapshot replay controller, deterministic curated-window `useReplay` flow, replay metadata exposed in HUD contract, real-trace screenshot proof, live/replay overlay parity on the snapshot path, automated `VAL-VIZ-001` / `VAL-RT-001` / `VAL-RT-002` / `VAL-CUR-001` / `VAL-FV-008` gates | — |
| 5 | Beam Hopping + Energy L2 | ✅ complete | BH scheduler (4 generic strategies), battery/solar model with beta angle (M7 fixed), HUD overlay, control panel, `EarthFixedCellLayer`, deterministic `bh-resource-energy-proof`, `BhExplainabilityPanel`, automated `VAL-FV-004` and `VAL-EXP-001` browser gates | paper-specific BH scheduler baselines remain a future donor-expansion track, not a closure blocker |
| 6 | DAPS/DC-Like | ✅ complete | DAPS dual-active FSM, engine dual-link path, benchmark comparison runner, `DapsSnapshot` in engine, dual-active beam viz, `case9-daps-baseline` profile, screenshot proof, truth-driven continuity link overlay, automated `VAL-FV-009` browser gate for both live and replay | — |

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
| MS2 | Multi-UE engine Phase B (independent HO per UE) | ✅ implemented (2026-03-25) — `Map<ueId, HandoverManager>` per engine, per-UE SINR+KPI, VAL-UE-003 passes; E-3 (N=10, 600s) and E-4 (N=100, 300s) golden cases pass |
| MS3 | Beam visualization (oblique cone from satellite to ground) | ✅ implemented (2026-03-25) — `EarthMovingBeamLayer.tsx` driven by engine `SatelliteBeamSnapshot`, replaces hardcoded 7-beam schematic |
| MS4 | Earth-fixed cell grid visualization | ✅ implemented (2026-03-25) — `EarthFixedCellLayer.tsx`, hex grid, 4-state: served/interfered/energyBlocked/unserved from BH slot truth + FRF collision detection |
| MS5 | Proper thermal noise model (noise figure) | ✅ implemented (2026-03-23) |
| MS6 | Truth-driven beam/SINR explainability overlay | ✅ implemented (2026-03-25) — `BeamInfoOverlay.tsx`, SINR dB color-coded label + role tags (`SERVING` / `PREPARED` / `SECONDARY` / `N active`) from snapshot truth; wired into LiveLayer + ReplayLayer |
| MS7 | Truth-driven handover/service link overlay | ✅ implemented (2026-03-25) — `HandoverLinkOverlay.tsx`, serving (solid cyan) + prepared (dashed orange) + secondary/DAPS dual-active links from `UE_ANCHOR` to satellite dome; wired into LiveLayer + ReplayLayer |

---

## 3. Document Status

| Document | Role | Status |
|---|---|---|
| `docs/architecture/ntn-sim-core-architecture-blueprint.md` | architecture blueprint | active |
| `sdd/ntn-sim-core-sdd.md` | normative SDD | active, needs §9.2 Tier 5 and §9.3 CHO/MC-HO updates |
| `sdd/ntn-sim-core-profile-baselines.md` | detailed baseline companion | active, case9 altitude aligned at 600km |
| `sdd/ntn-sim-core-roadmap.md` | implementation plan | active, Phase 3 to Phase 6 frontend closure rules are binding |
| `sdd/ntn-sim-core-validation-matrix.md` | gate definition | active, F/E/Browser passing for current SDD set |
| `sdd/ntn-sim-core-preflight-refactor-closure.md` | preflight closure note | active |
| `sdd/ntn-sim-core-development-constraints.md` | implementation-time prohibitions | active |
| `sdd/ntn-sim-core-acceptance-gates.md` | acceptance and claim gates | active |
| `sdd/ntn-sim-core-assumption-policy.md` | assumption governance | active |
| `sdd/ntn-sim-core-academic-remediation.md` | academic gap analysis and remediation plan | **new** |
| `sdd/ntn-sim-core-paper-family-matrix.md` | paper-family clustering and claim ceilings | active (v1.0) |
| `sdd/ntn-sim-core-donor-integration-map.md` | cross-repo donor ownership and parity map | active (v1.0) |
| `sdd/ntn-sim-core-reproduction-protocol.md` | reproduction ladder, artifact policy, tolerance status | active (v1.0) |
| `sdd/ntn-sim-core-reproduction-targets.md` | 3 reference paper reproduction targets | active (v0.2) |
| `sdd/ntn-sim-core-final-closure-checklist.md` | final closure record for project-level completion | active (v0.3.0) |
| `sdd/ntn-sim-core-fc1-replay-closure-checklist.md` | replay closure record for the landed FC-1 pass | active (v0.2) |
| `sdd/ntn-sim-core-frontend-beam-visual-sdd.md` | frontend beam-rendering contract + implementation checklist | active (v0.3.2) |
| `sdd/ntn-sim-core-frontend-beam-visual-acceptance.md` | beam visualization acceptance criteria | active (v0.3.1) |
| `sdd/ntn-sim-core-frontend-donor-mapping.md` | frontend donor repo → module mapping | active (v0.2) |
| `sdd/ntn-sim-core-frontend-leo-parity-mode.md` | post-closure frontend parity spec for a donor-like presentation mode | in progress (v0.1.7) — Slice P1/P2 landed; dedicated parity renderer family, donor-style beam ownership, BH parity visuals, and donor-like scene-density/BH-first composition pass landed |
| `sdd/ntn-sim-core-implementation-status.md` | this file | active |
| `sdd/README.md` | document index | active |

---

## 4. File Inventory

### `src/core/` — 60 modules

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

### `src/runner/` — 11 modules

| Subdirectory | Files | Key Modules |
|---|---|---|
| `headless` | 4 | `dry-run.ts`, `benchmark-runner.ts`, `types.ts`, `index.ts` |
| `replay` | 3 | `controller.ts` (snapshot replay + legacy artifact path), `types.ts`, `index.ts` |
| `curation` | 3 | `pass-ranker.ts`, `window-selector.ts`, `index.ts` |

### `src/viz/` — 18 modules

### `src/app/` — 4 modules

### `scripts/` — 11 validation scripts

---

## 5. Validation Gate Status

### Passing (structural + formula-level, verified 2026-03-25)

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
| VAL-VIZ-002 | 3 | ✅ pass | engine snapshot carries beam truth; SceneShell uses `EarthMovingBeamLayer` / `EarthFixedCellLayer` |

**Note:** Formula-level (`-F`) tests pass. Engine-level (`-E`) golden cases also pass, and `npm run validate:stage` succeeds using `node --import tsx` for the golden-engine step. Browser-level (`-V`) closure evidence is automated for the current explainability/continuity package; screenshot packs remain supplementary evidence.

### Blocked by code bugs

| VAL ID | Phase | Status | Blocker |
|---|---|---|---|
| VAL-SINR-001 | 3 | ✅ pass | C1 fixed; multi-beam SINR uses per-interferer path loss |
| VAL-HO-002 | 2 | ✅ pass | C2 fixed; CHO/Timer-CHO/MC-HO implemented |
| VAL-GOLDEN-001 | 2 | ✅ pass | C1 fixed; golden case SINR now uses per-interferer path loss |
| VAL-GOLDEN-002 | 3 | ✅ pass | C1 + M3 + M4 all fixed |

### Passing with manual visual evidence

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

### Partial / Deferred (need integration, curation, or automation)

| VAL ID | Phase | Status | Needs |
|---|---|---|---|
| VAL-ORB-001 | 1 | deferred | headless vs frontend orbit diff |
| VAL-VIZ-001 | 1 | ✅ pass | `validate-replay-manifest.ts` plus browser replay proof verify replay ordering, time offsets, and artifact-backed hydration |
| VAL-BEAM-001 | 2 | deferred | beam footprint geometry |
| VAL-KPI-001 | 2 | deferred | headless vs replay KPI comparison |
| VAL-MB-001 | 3 | deferred | active-beam gating determinism |
| VAL-FV-005 | 3 | ✅ browser pass | `validate-visual-browser.ts` verifies live HOBS beam membership stays inside the visible set and advances with observer-sky time |
| VAL-RT-001 | 4 | ✅ pass | `validate-replay-manifest.ts` verifies `real-trace-validation` artifact-backed replay/controller identity |
| VAL-RT-002 | 4 | ✅ pass | `validate-replay-manifest.ts` verifies replay-manifest reconstruction and artifact-backed initial snapshot parity |
| VAL-CUR-001 | 4 | ✅ pass | deterministic curation is recorded in replay manifest + replay artifact and verified by `validate-replay-manifest.ts` |
| VAL-EXP-001 | 5 | ✅ browser pass | `validate-visual-browser.ts` verifies low-SINR truth plus inactive-beam explainability via `BhExplainabilityPanel` on `bh-resource-energy-proof` |

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
3. ~~**Single-UE only (C3):**~~ Fixed 2026-03-23/25. Phase A shared-serving and Phase B independent per-UE handover are both present.
4. ~~**Ka-band channel wrong (M3+M4):**~~ Fixed 2026-03-23. Ka-band shadow fading tables added; atmospheric loss model implemented for frequencies ≥10 GHz.
5. **Real-trace integration baseline is closed for the current SDD set:** frontend `useSimulation` and `useReplay` can both build deterministic SGP4/showcase paths, replay manifests and replay artifacts are emitted in the benchmark artifact path, and end-to-end replay identity is now validated by `validate-replay-manifest.ts`.
6. **Replay de-scope remains explicit:** snapshot replay used by `useReplay` is the authoritative frontend path; the legacy artifact-bundle `createReplayController()` path is retained only as an explicit compatibility/error boundary, not as a second replay family.
7. **Beam visualization baseline is landed:** `EarthMovingBeamLayer` and `EarthFixedCellLayer` are connected in `SceneShell`; the old `BeamFootprintLayer` is deprecated.
8. **BH research donor mapping remains broader than the proof path:** the deterministic `bh-resource-energy-proof` closes current SDD proof requirements, but future paper-specific BH scheduler families are still a donor-integration extension rather than a closure blocker.
9. **Validation has three practical tiers:** `-F` formula scripts pass, `-E` golden-case-engine passes in the standard stage chain, and `-V` browser automation covers the current frontend explainability/continuity package.
10. ~~**Tooling portability issue:**~~ Fixed 2026-03-25. `validate:stage` now launches `validate:golden-engine` via `node --import tsx` and passes in this sandbox.
11. **Profile parameter aligned:** case9-access-baseline defaults.ts altitude corrected to 600km (matches profile-baselines.md and source papers).
12. **Frontend explainability package is landed and browser-validated:** `BeamInfoOverlay`, `HandoverLinkOverlay`, and `BhExplainabilityPanel` now exist, are wired into live/replay, and are covered by `validate-visual-browser.ts`.

---

## 7. Final Closure Items

Authoritative closure companion:
`sdd/ntn-sim-core-final-closure-checklist.md`

No project-level closure items remain open for the current SDD set.

---

## 8. Planned Enhancement Track

The next planned frontend enhancement is:

1. `leo-parity` mode
   - tracked by `sdd/ntn-sim-core-frontend-leo-parity-mode.md`
   - intended to improve donor-style beam density, per-beam SINR readability, and handover-link readability
   - does not reopen the closed academic SDD set unless explicitly promoted into the main closure contract
   - current landed scope: query-param entry, in-page `ControlPanel` toggle, presenter-driven `display set / event set / beam set`, and a dedicated `LeoParityBeamLayer` / `LeoParityBeamOverlay` / `LeoParityHandoverLinks` family wired in `SceneShell`
   - current parity fix: broad visible satellites remain in `SatelliteSkyLayer`, while beam cones are restricted to serving / prepared / secondary / DAPS / role-derived satellites instead of all display satellites
   - current donor-density fix: parity presenter now exposes a broader donor-like sky context (`MAX_DISPLAY_SATS=12`, `MAX_EVENT_SATS=8`) while beam ownership stays restricted to the parity beam set
   - current BH parity fix: `EarthFixedCellLayer` now accepts `parityMode`, renders donor-style active beam links plus brighter cell styling for `leo-parity`, and BH profiles suppress moving access cones so the earth-fixed grid becomes the main composition
   - current overlay/link uplift: parity labels are beam-centric rather than satellite-top summary tags, simplified to role-first text, and handover links now render stronger event anchors without changing continuity truth
   - current validation-stability fix: replay browser proofs may use `replaySeekSec` to place the replay cursor on a deterministic event instant without changing replay artifacts or benchmark truth
