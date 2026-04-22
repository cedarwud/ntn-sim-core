# NTN Sim Core — Implementation Status

**Version:** 4.8.46
**Date:** 2026-04-22
**Status:** Prior hardening/closure program complete; targeted reruns of
`lint`, `build`, `validate:visual-browser`,
`validate:showcase-consumer-browser`, `validate:profiles`,
`validate:contracts`, `validate:bundle`, `validate:runtime`,
`validate:modqn:bundle`, and `validate:modqn:bundle-ui` pass in the current
tree, though browser-sensitive evidence should still be treated as
transient-sensitive rather than permanently de-flaked. The 2026-04-15
truth-preserving showcase realignment remains landed, and the 2026-04-16
consumer-only MODQN follow-on chain still lands Slice 2 external bundle
loading, Slice 3 story dashboard / dynamic charts, Slice 4 replay-truth
hardening / showcase acceptance, and Slice 5 producer diagnostics /
explainability without reopening producer or native-runtime contracts. The
dual-app showcase line also still lands `Phase 2A`, `Phase 2B`, `Phase 2C`,
`Phase 2D`, the landed entrypoint handoff decision, the landed consumer scene
parity follow-on, and the landed consumer first-screen copy-alignment
follow-on. The frozen dual-app baseline remains unchanged:
`showcase-consumer.html` stays canonical while `?app=showcase-consumer`
remains the compatibility path; `ShowcaseConsumerHost` remains the sole
publisher; `ShowcaseConsumerApp` remains consumer-only; the allowlist,
deterministic IDs, and starter family remain frozen; `summary.*` remains
secondary; `Primary SINR` remains `snapshot.ues[0].sinrDb`;
`validate:contracts` remains the unchanged floor; and browser-visible dual-app
acceptance still runs through targeted `validate:showcase-consumer-browser`
without a dedicated dual-app `VAL-*` gate. The landed
`sdd/single-repo-dual-app-showcase-consumer-first-screen-copy-alignment-follow-on.md`
closes the last promoted dual-app micro-slice by correcting only the
native-replay first-screen lead copy inside `ShowcaseConsumerApp` from
`dedicated second viewer` wording to `continuity showcase viewer` wording,
with no validator or runtime changes. The landed
`sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`
now records the completed current-`main` additive reintegration that restored
the already-landed dual-viewer surfaces onto the MODQN `main` baseline while
keeping the landed dual-app baseline semantics frozen and preserving the
current MODQN / `SceneShell` `main` default surface. The dual-app line is
therefore back to having no active unlanded follow-on authority in the current
tree.

---

## 1. Phase Status

| Phase | Name | Status | What Is Done | What Is Missing |
|---|---|---|---|---|
| 0 | Foundation & Governance | ✅ complete | profiles schema, trace contracts, runner skeletons, validation scripts | — |
| 1 | Synthetic Orbit + Visual | ✅ complete | Walker propagation, Kepler solver, trajectory cache, satellite sky layer | — |
| 2 | Channel + Handover + KPI | ✅ complete | FSPL, S/Ka-band SF/CL, beam gain, A3/A4/CHO/Timer-CHO/MC-HO/DAPS FSMs, 19 KPI metrics, per-interferer SINR, multi-UE (Phase A: shared serving) | — |
| 3 | Multi-Beam + Energy L1 | ✅ complete | hex beam layout, FRF coloring + semantics, beam selection, EE/DPC, per-interferer SINR, slant-range θ_3dB, spherical off-axis, Ka-band SF tables, atmospheric loss, Tier 5 SR fading, `EarthMovingBeamLayer`, screenshot proof packs, `BeamInfoOverlay`, `HandoverLinkOverlay`, prepared/secondary continuity roles in snapshot-driven beam/link overlays, browser validation probe, automated `VAL-FV-005`/`006`/`007` | screenshot packs remain as supplementary evidence, but core Phase 3 visual gates are now browser-automated |
| 4 | Real-Trace + Replay | ✅ complete | OMM/TLE ingest loader, SGP4-sampled real-trace cache/replay path, pass ranking, window curation modules, benchmark-runner TLE API, benchmark artifact `replayManifest`, persisted `replayArtifact`, frontend `useSimulation` TLE path, artifact-backed snapshot replay controller, deterministic curated-window `useReplay` flow, replay metadata exposed in HUD contract, real-trace screenshot proof, live/replay overlay parity on the snapshot path, automated `VAL-VIZ-001` / `VAL-RT-001` / `VAL-RT-002` / `VAL-RT-003` / `VAL-RT-004` / `VAL-CUR-001` / `VAL-FV-008` gates | — |
| 5 | Beam Hopping + Energy L2 | ✅ complete | BH scheduler (6 strategies: round-robin, max-demand, power-aware, deterministic-fixed, proportional-fair, sinr-greedy), battery/solar model with beta angle (M7 fixed), HUD overlay, control panel, `EarthFixedCellLayer`, deterministic `bh-resource-energy-proof`, `BhExplainabilityPanel`, automated `VAL-FV-004` and `VAL-EXP-001` browser gates | — |
| 6 | DAPS/DC-Like | ✅ complete | DAPS dual-active FSM, engine dual-link path, benchmark comparison runner, `DapsSnapshot` in engine, shared `BeamPresentationFrame` scene grammar across sky/beam/overlay layers, benchmark-facing `case9-daps-baseline`, dedicated `case9-daps-showcase` first-screen profile, strengthened serving/prepared/post-HO/neutral role separation, screenshot proof, truth-driven continuity link overlay, automated `VAL-FV-009` and `VAL-FV-010` browser gates | — |

Closure note: this table tracks the now-complete hardening/closure program. As of 2026-03-27, the previously deferred hardening IDs had either landed or been promoted into active browser/runtime coverage, so phase closure and gate closure became aligned. As of 2026-03-31, both this closure table and `sdd/ntn-sim-core-platform-refactor-roadmap.md` are completed-program records; the downstream baseline path entered through preflight-first promotion (`MODQN M1`, `UI U1`) rather than a new platform-refactor phase, and those downstream baseline lines have since progressed to their shipped closure states.

---

## 1b. Platform Refactor Phase Status

| Phase | Name | Status | Completion Criteria Location |
|---|---|---|---|
| 0 | Architecture Audit + Target Design | ✅ complete | `sdd/phase0-architecture-spec.md §0C.7` |
| 1 | Parameter Registry | ✅ complete | `sdd/phase1-parameter-registry-sdd.md` — VAL-PLAT-001/002/003 passing with profile-specific binding/runtime parity; `parameter-registry.ts` (60 entries, including `rf.ue_antenna_gain_dbi` for explicit HOBS `G^R` provenance), `validate-parameter-registry.mjs`; hardened 2026-03-31 and receive-side-gain sync landed 2026-04-13 |
| 2 | Model Bundle Interfaces | ✅ complete (2026-03-29) — `src/core/models/` (9 files), `buildModelBundle` factory, engine dispatch via bundle interfaces, `validate:bundle` (VAL-PLAT-004/004b/005 all PASS) | `sdd/phase2-model-bundle-sdd.md` §10 |
| 3 | Scenario/Profile/Experiment Split | ✅ complete (2026-03-30) — Group 1 (SDD), Group 2 (types + compose/decompose), Group 3 (file split + thin re-export defaults.ts + observers.ts) all done | `sdd/phase3-scenario-profile-experiment-split.md §10` — VAL-PLAT-005/006/007 PASS after Group 3 file split; `validate:stage` green (exit 0) |
| 4 | Runtime Contract Freeze | ✅ complete (2026-03-30) — Group 1 (SDD spec frozen) + Group 2 (contracts landed, consumers migrated, VAL-PLAT-008/009/010 PASS) | `sdd/phase4-runtime-contract-sdd.md §10` — VAL-PLAT-008/009/010 all PASS |
| 5 | Cleanup + Modularization | ✅ complete (2026-03-31) — Group 1 plan freeze, Group 2 structural split, and Group 3 legacy retirement / gate closure all landed; `validate:structure` now enforces `VAL-PLAT-011/012` and Phase 5 exit criteria are satisfied | `sdd/phase5-cleanup-and-modularization-sdd.md §9` — Phase 5 complete |

---

## 1c. Downstream Entry Status

| Surface | Status | Note |
|---|---|---|
| Downstream architecture | ✅ complete (Group 2 landed 2026-03-31; doc sync 2026-04-01) | Active boundary lives in `sdd/downstream-runtime-architecture-sdd.md`; minimal skeleton exists at `src/core/algorithms/`, `src/core/experiments/`, `src/viz/view-models/`; `src/adapters/modqn-bundle/` activated 2026-04-13 by Phase 03A Slice B as the first baseline-scope consumer adapter |
| `MODQN` baseline reproduction | ✅ M3 complete / U1 richer-handoff ready | Active authority is `sdd/modqn-baseline-spec-outline.md` + `sdd/modqn-runtime-outline.md` + `sdd/modqn-experiment-outline.md`; baseline path now uses the frozen `policy-v1` bridge plus reviewed `modqn-contracts.ts`, deterministic epoch-window sampling, held-out evaluation artifacts, the stabilized `ModqnReproductionResult`, `ModqnViewModel`, `validate:modqn`, `validate:modqn:m2`, and `validate:modqn:m3` |
| `UI` baseline viewer path (`U1` + `U2`) | ✅ complete | Active authority is `sdd/ui-integration-roadmap.md`; shipped path now includes registry-backed exposure alignment, contracts-first single-run viewer, baseline-only dual-run comparison/export helpers, and optional MODQN M3 richer handoff consumption without crossing manifest/runtime internals; current-tree reruns of `validate:contracts`, `validate:visual-browser`, and `validate:stage` passed on 2026-04-01 |
| real-trace truth-path correction (`T1`) | ✅ complete (2026-04-01) | Active authority was `sdd/real-trace-truth-path-correction-outline.md`; validation-sized real-trace cache samples now preserve SatRec-backed SGP4 truth, wording drift is synchronized, and frozen replay/contract boundaries remained unchanged |
| paper-mode / claim-mode hardening (`PM1`) | ✅ complete (2026-04-02) | Shipped authority is `sdd/paper-mode-claim-mode-hardening-outline.md`; this doc/status/prompt/companion hardening line froze `PAP-2024-MORL-MULTIBEAM` / `modqn-paper-baseline` as the current anchor baseline, defined main-result vs robustness vs sensitivity paper usage, constrained assumption-heavy `EE / power` claims, and required future paper targets to land as sibling baselines rather than replacing the anchor |
| MODQN targeted parity strengthening (`TP1`) | ✅ complete (2026-04-02) | Shipped authority is `sdd/modqn-targeted-parity-outline.md`; the current tree ships `runModqnAnchorParityBundle()`, `scripts/run-modqn-parity-bundle.ts`, and `scripts/validate-modqn-parity.ts` (`VAL-MODQN-004`) with a range-faithful anchor envelope and qualitative-only sweep/comparator targets under the disclosed proxy ceiling; paper-ready export stays confined to packaging projections over the materialized bundle, without reopening runtime, contracts, replay identity, `OMNeT++ / INET / estnet`, or real-trace scalability |
| `EE / power` realism hardening (`EP1`) | ✅ complete (2026-04-02) | Authority is `sdd/ee-power-realism-hardening-outline.md`; the current tree now hardens active-TX EE vs broader communication-power proxy semantics, publishes `eePowerDisclosure` on denominator-sensitive artifact paths, synchronizes denominator source-role wording across formulas/spec/provenance/profile notes, and machine-enforces the line through `validate-ee-provenance.ts` (`VAL-EE-003`) and `validate-ee-disclosure.ts` (`VAL-EE-004`) without reopening contracts, replay identity, or downstream baselines |
| MODQN bundle replay consumer + UI (Phase 03A Slice B/C/D) | ✅ complete (2026-04-14) | Active authority is `sdd/modqn-bundle-replay-consumer-sdd.md` + `sdd/modqn-bundle-replay-ui-sdd.md`; `src/adapters/modqn-bundle/` remains the only cross-repo seam, while `src/app/hooks/useModqnBundleReplay.ts`, `src/viz/view-models/modqn-bundle-replay-view-model.ts`, `SceneShell`, and `ModqnBundleMetadataPanel` now let the app switch between native truth and producer-bundle truth without replaying MODQN logic in the consumer. Validation: `npm run validate:modqn:bundle` (`VAL-MODQN-BUNDLE-001`) covers the adapter contract, now front-loads the `fixtures/sample-bundle-v1/` producer-mirror drift check via `scripts/sync-modqn-producer-fixture.mjs`, and now also carries `001G` for older valid bundles that omit optional decision-time masks; `npm run validate:modqn:bundle-ui` (`VAL-MODQN-BUNDLE-002`) covers truth-source switching, slot stepping, shared beam/link presentation, and metadata/provenance disclosure; both validators now run under `validate:stage`. |
| MODQN external bundle loading (`Slice 2`) | ✅ complete (2026-04-16) | Authority is `sdd/modqn-external-bundle-loading-follow-on.md`; the current tree now keeps the shipped sample bundle as the default boot path, supports browser-side `external-directory` bundle selection over the existing consumer adapter seam, preserves the last valid bundle when a new external load fails, exposes `Load Bundle...` / `Reset To Sample` plus source/error disclosure in bundle mode, and renders optional external figure artifacts through browser object URLs with deterministic cleanup on replacement/reset |
| MODQN story dashboard + dynamic charts (`Slice 3`) | ✅ complete (2026-04-16) | Authority is `sdd/modqn-story-dashboard-follow-on.md`; bundle mode now renders a dedicated `bundle-story-dashboard` with a first-screen KPI strip, PNG-first training evidence, slot-synced replay charts built from existing replay/projector data, and a still-separate `ModqnBundleMetadataPanel` disclosure path. Sample and external bundles both use the same dashboard surface, and `validate-modqn-bundle-ui.ts` now lands `VAL-MODQN-BUNDLE-003` without reopening producer or native-runtime contracts |
| MODQN replay-truth hardening (`Slice 4`) | ✅ complete (2026-04-16) | Authority is `sdd/modqn-replay-truth-hardening-follow-on.md`; the landed slice now adds browser-visible dashboard/HUD/probe truth alignment markers, keeps dashboard/HUD wording tied to exported replay truth while leaving scene-only continuity hold view-only, proves shared beam/link presentation against exported serving-beam truth, and lands `VAL-MODQN-BUNDLE-004` with a non-trivial external bundle variant over the same bundle-mode path |
| MODQN producer diagnostics + explainability (`Slice 5`) | ✅ landed | Producer-side `Phase 03B` remains fixed in `/home/u24/papers/modqn-paper-reproduction` commit `13fca4707a9f7a6690d335e351bd8d1805d9f10b`; `sdd/modqn-producer-diagnostics-consumer-follow-on.md` is now the landed consumer record, kickoff/boundary context remains in `sdd/modqn-producer-diagnostics-and-explainability-follow-on.md`, row-level `policyDiagnostics` drives bundle-mode explainability, `optionalPolicyDiagnostics` stays metadata/disclosure-only, and `VAL-MODQN-BUNDLE-005` now passes alongside `002` / `003` / `004` |
| truth-preserving showcase visual realignment follow-on | ✅ complete first landing (2026-04-15) | `sdd/truth-preserving-showcase-visual-realignment-follow-on.md` is now the active narrow authority for the landed shared `BeamPresentationFrame` scene grammar, the dedicated `case9-daps-showcase` default, and the accompanying browser readability/truth gates |
| single-repo dual-app showcase baseline (`Phase 2A` + `Phase 2B` + `Phase 2C` + `Phase 2D` landed) | ✅ landed in current tree (2026-04-21) | Landed authority is now the four-record baseline `sdd/single-repo-dual-app-showcase-follow-on.md` + `sdd/single-repo-dual-app-showcase-phase2b-follow-on.md` + `sdd/single-repo-dual-app-showcase-phase2c-packaging-follow-on.md` + `sdd/single-repo-dual-app-showcase-phase2d-presentation-follow-on.md`. The current tree keeps `AppShell` query-switching `?app=showcase-consumer`, preserves the dedicated `showcase-consumer.html` plus `src/showcase-consumer-main.tsx` packaged entrypoint, preserves `ShowcaseConsumerHost` as the only publisher and `ShowcaseConsumerApp` as consumer-only, keeps frozen `scene-consumer-starter-v1` and `scene-consumer-starter-v2`, keeps `showcasePath=native-replay|bundle-sample` over `native-replay:hobs-multibeam-baseline:continuity-window` plus `modqn-bundle:sample-bundle-v1`, and keeps targeted smoke at `validate:contracts` + `validate:showcase-consumer-browser`; `SceneShell.tsx`, `SceneConsumerStarterPanel.tsx`, `scene-consumer-starter-consumer.ts`, `live`, `external-directory`, per-beam HOBS SINR, `useModqnBundleReplay.ts`, bundle-panel migration, and `Phase 3` polish remain closed |
| single-repo dual-app showcase entrypoint handoff follow-on | ✅ landed (2026-04-22) | Landed authority is `sdd/single-repo-dual-app-showcase-entrypoint-handoff-follow-on.md`; it records `showcase-consumer.html` as the canonical handoff/share surface while keeping `?app=showcase-consumer` as a compatibility path, and now serves as a baseline decision record inside the closed dual-app landed set |
| single-repo dual-app showcase consumer scene parity follow-on | ✅ landed (2026-04-22) | Landed authority is `sdd/single-repo-dual-app-showcase-consumer-scene-parity-follow-on.md`; the current tree now lands denser consumer-side telemetry, consumer-local camera/overlay controls, stronger narrative/readability surfaces, and the minimally expanded targeted browser smoke while preserving canonical handoff semantics, host-owned publisher ownership, frozen allowlist/deterministic IDs/starter family, and the targeted smoke model |
| single-repo dual-app showcase consumer first-screen copy alignment follow-on | ✅ landed (2026-04-22) | Landed authority is `sdd/single-repo-dual-app-showcase-consumer-first-screen-copy-alignment-follow-on.md`; it records the narrow copy-only closure that replaced the native-replay first-screen `dedicated second viewer` wording with `continuity showcase viewer` wording inside `ShowcaseConsumerApp`, kept `showcase-consumer.html` canonical / `?app=showcase-consumer` compatibility, kept `ShowcaseConsumerHost` as sole publisher and `ShowcaseConsumerApp` as consumer-only, kept frozen allowlist/deterministic IDs/starter family, `summary.*` secondary, `Primary SINR = snapshot.ues[0].sinrDb`, and `validate:contracts` unchanged as the floor, and returns the dual-app line to no active unlanded follow-on authority |
| single-repo dual-app showcase mainline additive reintegration follow-on | ✅ landed (2026-04-22) | Landed authority is `sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`; it records the completed additive reintegration of the already-landed showcase-consumer surfaces onto the current MODQN `main` baseline, preserving `showcase-consumer.html` canonical / `?app=showcase-consumer` compatibility, `ShowcaseConsumerHost` sole publisher / `ShowcaseConsumerApp` consumer-only, frozen allowlist/deterministic IDs/starter family, `summary.*` secondary, `Primary SINR = snapshot.ues[0].sinrDb`, the existing targeted smoke / contract floor, and `SceneShell` as the current `main` default surface, and returns the dual-app line to no active unlanded follow-on authority |
| real-trace scalability follow-on | ⏸ blocked (`no-go` preflight on 2026-04-01) | Future mixed-orbit `OMNeT++` work may still require larger-catalog planning, but this line stays paused after T1 closure unless it is separately re-promoted; keep `sdd/real-trace-scalability-preflight-note.md` as the blocked decision record |
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
| EXT-5 | Profile audit tooling: `scripts/audit-profiles.ts` 10-check suite | ✅ (17 profiles pass; added to `validate:stage`) |
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
| `sdd/ntn-sim-core-paper-family-matrix.md` | paper-family clustering and claim ceilings | active (v1.0.3) |
| `sdd/ntn-sim-core-research-positioning-note.md` | current paper-oriented project positioning, corpus-relative gap ranking, and future-direction guidance | active (v1.0.1) |
| `sdd/paper-mode-claim-mode-hardening-outline.md` | shipped PM1 paper-oriented governance surface for the current anchor baseline, main-result / robustness / sensitivity discipline, non-energy vs energy-centered `EE / power` rules, and sibling-baseline extension rules | shipped |
| `sdd/modqn-targeted-parity-outline.md` | shipped current-anchor parity hardening surface with the landed target map, paper-ready bundle surface, and `VAL-MODQN-004` gate | shipped |
| `sdd/ee-power-realism-hardening-outline.md` | shipped EP1 paper-safety surface for `EE / power` formula/runtime semantics, provenance/disclosure hardening, and minimum sensitivity requirements | shipped |
| `sdd/modqn-story-dashboard-follow-on.md` | landed Slice 3 consumer-only follow-on record for the shared bundle story dashboard, additive replay-trend charts, and the passing `VAL-MODQN-BUNDLE-003` browser gate | shipped |
| `sdd/modqn-replay-truth-hardening-follow-on.md` | landed Slice 4 consumer-only follow-on record for replay-truth hardening, showcase acceptance, and the passing `VAL-MODQN-BUNDLE-004` browser gate | shipped |
| `sdd/modqn-producer-diagnostics-and-explainability-follow-on.md` | cross-repo kickoff / boundary record for producer-owned diagnostics / explainability after the producer-side prerequisite landed; useful context, but not the direct consumer execution surface | companion kickoff record |
| `sdd/modqn-producer-diagnostics-consumer-follow-on.md` | landed `Slice 5` consumer record over the fixed producer diagnostics surface; bundle-mode explainability and `VAL-MODQN-BUNDLE-005` now pass in the current tree | shipped / landed |
| `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-donor-integration-map.md` | cross-repo donor ownership and parity map | historical |
| `sdd/ntn-sim-core-reproduction-protocol.md` | reproduction ladder, artifact policy, tolerance status | active (v1.0.1) |
| `sdd/ntn-sim-core-reproduction-targets.md` | 3 reference paper reproduction targets plus the shipped current-anchor MODQN parity bundle record | active (v0.3.1) |
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
| `experiments` | 11 | `types.ts`, `index.ts`, `modqn-reproduction-manifest.ts`, `modqn-reproduction-runner.ts`, `modqn-reproduction-types.ts`, `modqn-runtime-bridge.ts`, `modqn-sampling.ts`, `modqn-trainer.ts`, `modqn-dqn.ts`, `modqn-targeted-parity.ts`, `modqn-targeted-parity-types.ts` |
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
| `beam` | 10 | `EarthMovingBeamLayer.tsx`, `EarthFixedCellLayer.tsx`, `moving-beam-geometry.ts`, `earth-moving-beam-policy.ts`, `earth-moving-beam-plans.ts`, `earth-moving-beam-validation.ts`, `beam-visibility-selection.ts`, `beam-visual-constants.ts`, `bh-cell-analysis.ts`, `index.ts` |
| `presentation` | 3 | `beam-presentation-frame.ts`, `useBeamPresentationFrame.ts`, `index.ts` — shared display/event/beam selection grammar for sky / beam / overlay renderers |
| `satellite` | 4 | `SatelliteSkyLayer.tsx`, `satellite-display-selection.ts`, `observer-sky-projection.ts`, `index.ts` |
| `overlays` | 13 | `ControlPanel.tsx`, `SimHud.tsx`, `BeamInfoOverlay.tsx`, `HandoverLinkOverlay.tsx`, `BhExplainabilityPanel.tsx`, `BatchKpiPanel.tsx`, `HoEventLogOverlay.tsx`, `SinrCdfOverlay.tsx`, `SinrElevationScatter.tsx`, `SinrTimeSeriesOverlay.tsx`, `Starfield.tsx`, `ValidationProbe.tsx`, `ModqnBundleMetadataPanel.tsx` |
| `scene` | 10 | `SceneShell.tsx`, `SceneDataLayers.tsx`, `scene-consumer-starter.ts`, `scene-consumer-starter-publication.ts`, `NTPUScene.tsx`, `CameraRig.tsx`, `LightingRig.tsx`, `LoaderOverlay.tsx`, `UAV.tsx`, `scene-runtime-summaries.ts` — scene composition plus the fixed Phase 2A starter/publication seam |
| `validation` | 1 | `store.ts` (browser-side validation probe store) |
| `view-models` | 5 | `types.ts`, `index.ts`, `kpi-bundle-projectors.ts`, `modqn-view-model.ts`, `modqn-bundle-replay-view-model.ts` — downstream landing zone for KPI/card/chart projection types plus the shipped MODQN M3 result projector and the Phase 03A bundle replay projection surface |
| root | 1 | `tier1-satellite-selection.ts` — shared continuity-relevant satellite selection for beam and sky renderers |

### `src/app/` — current inventory

| Subdirectory | Files | Key Modules |
|---|---|---|
| `showcase` | 3 | `ShowcaseConsumerHost.tsx`, `ShowcaseConsumerApp.tsx`, `showcase-consumer-window.ts` — query-switched Phase 2A route, host-owned deterministic producer, and consumer-only window seam helpers |
| `hooks` | 7 | `useSimulation.ts`, `useReplay.ts`, `useBatchKpi.ts` (now uses `RunnerExposureApi`), `useSceneQueryState.ts`, `modqn-bundle-sample.ts`, `useModqnBundleReplay.ts`, `index.ts` |
| root | 1 | `AppShell.tsx` — app-level route switch for reference shell vs `?app=showcase-consumer` |

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
| `validate-contracts.mjs` | Phase 4 contract gate plus the frozen Phase 2A starter seam, query-switched route, host-owned publication, and consumer-only showcase guard |
| `validate-modqn-baseline.ts`, `validate-modqn-m2.ts`, `validate-modqn-m3.ts`, `validate-modqn-parity.ts`, `validate-modqn-bundle-adapter.ts`, `validate-modqn-bundle-ui.ts` | Dedicated MODQN downstream gates: M1 bridge closure, M2 sampling/training/evaluation/artifact closure, M3 stable result/view-model/disclosure closure, TP1 current-anchor parity bundle / export / claim-ceiling validation, and Phase 03A bundle adapter + UI truth-source validation |
| `validate-multibeam-gating.ts` | Multi-beam gate |
| `validate-orbit-parity.ts`, `validate-replay-manifest.ts`, `validate-final.mjs`, `validate-visual-browser.ts` | Orbit / replay / final / browser gates |
| `golden-case-channel.mjs`, `golden-case-engine.ts`, `golden-case-orbit.mjs` | Golden case reference checks |
| `run-baseline.ts`, `run-reproduction-comparison.ts`, `run-modqn-m2-smoke.ts`, `run-modqn-parity-bundle.ts` | Baseline and reproduction runners; `run-baseline.ts` applies profile-aware sanity for short-episode MODQN smoke runs, `run-modqn-m2-smoke.ts` closes the M2 sampling/training/evaluation path over the reviewed experiments surface that M3 now stabilizes for UI handoff, and `run-modqn-parity-bundle.ts` emits the current-anchor parity bundle / paper-ready comparison note |
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
| VAL-EE-003 | EP1 | ✅ pass | `scripts/validate-ee-provenance.ts` keeps formulas/spec/provenance/runtime/profile wording aligned on active-TX EE vs broader communication-power proxy semantics and blocks assumption-backed Layer-1 power from drifting into `Realistic` defaults |
| VAL-EE-004 | EP1 | ✅ pass | `scripts/validate-ee-disclosure.ts` proves runtime denominator split, artifact `assumptionSet`/`eePowerDisclosure` presence, and the sensitivity-qualified claim bar for denominator-sensitive EE / HO-energy paths |
| VAL-DAPS-001 | 6 | ✅ pass | daps.ts exists |
| VAL-DAPS-002 | 6 | ✅ pass | DAPS 0ms vs baseline (formula-level) |
| VAL-DAPS-003 | 6 | ✅ pass | A3-style trigger: candidate > serving + hysteresis triggers DAPS preparation; serving threshold is NOT a gate; elevation is TTT accelerant only |
| VAL-VIZ-002 | 3 | ✅ pass | engine snapshot carries beam truth; SceneShell uses `EarthMovingBeamLayer` / `EarthFixedCellLayer` |
| VAL-PLAT-006 | P3 | ✅ pass | `scripts/validate-profiles.mjs` — `ScenarioConfig`, `ModelBundleSelection`, `ExperimentBundle`, and `ProfileBundle` still export from `profiles/types.ts`; `ProfileConfig` still exports; `runtime-materialization.ts` exports `materializeRuntimeProfile()`; `types.ts` and `runtime-materialization.ts` pass the no-circular-import checks against `engine.ts`, `viz/`, `app/`, and `runner/` |
| VAL-PLAT-007 | P3 | ✅ pass | `scripts/validate-profiles.mjs` — all 16 authored registry entries satisfy `deepEqual(materializeRuntimeProfile(entry.bundle, entry.exp), DEFAULT_PROFILES[entry.id])` under the SDD §9 deep-equality rules (`Date#getTime`, absent≡undefined) |
| VAL-MODQN-001 | M1 | ✅ pass | `scripts/validate-modqn-baseline.ts` — MODQN constants, adapter logic, action-consumption wiring, and `modqn-paper-baseline` runtime viability all pass together |
| VAL-MODQN-002 | M2 | ✅ pass | `scripts/validate-modqn-m2.ts` — deterministic sampling, experiments-layer boundary compliance, M1 handoff reuse, and runnable training/evaluation/artifact closure all pass together |
| VAL-MODQN-003 | M3 | ✅ pass | `scripts/validate-modqn-m3.ts` — real runner result surface, disclosure-complete metadata, serialization, and `ModqnViewModel` consumption all pass together without breaking `VAL-MODQN-002` |
| VAL-MODQN-004 | TP1 | ✅ pass | `scripts/validate-modqn-parity.ts` — current-anchor parity bundle exists over shipped MODQN truth, preserves the proxy ceiling, exports paper-ready comparison tables/figure data, and labels the current target set as range-faithful / qualitative-only where appropriate |
| VAL-MODQN-BUNDLE-001 | Phase 03A Slice B | ✅ pass | `scripts/validate-modqn-bundle-adapter.ts` — typed consumer adapter rejects schema/version/geometry drift, loads the producer fixture bundle, preserves replay-frame grouping without recomputing truth, and now lands `001G` so older valid bundles that omit optional decision-time masks remain readable through disclosed consumer-side fallback |
| VAL-MODQN-BUNDLE-002 | Phase 03A Slice C/D + Slice 2 follow-on | ✅ pass | `scripts/validate-modqn-bundle-ui.ts` — browser automation proves `mode=modqn-bundle` swaps the active truth source, slot stepping advances the exported bundle timeline, shared beam/link presenters consume bundle truth, bundle assumptions/provenance/training disclosure stays separate from native defaults, valid `external-directory` loads replace the active bundle only after validation succeeds, replay-incomplete/invalid external loads do not poison the current valid truth, and reset-to-sample restores the shipped baseline while revoking external figure object URLs |
| VAL-MODQN-BUNDLE-003 | Slice 3 | ✅ pass | `scripts/validate-modqn-bundle-ui.ts` — browser automation verifies the richer `bundle-story-dashboard` keeps the first-screen obligations visible, renders KPI/chart surfaces only from existing bundle-backed data, keeps `ModqnBundleMetadataPanel` distinct, and routes both sample and external bundles through the same story-dashboard path |
| VAL-PLAT-011 | P5 | ✅ pass | `scripts/validate-structure.mjs` — recursive scan confirms every `src/core/**/*.ts|tsx` file is `<= 650` lines; historical blockers now read `engine.ts` = 106 lines, `parameter-registry.ts` = 7 lines plus data shards (largest shard: `parameter-registry-handover-data.ts` = 316), and `profiles/types.ts` = 40 lines |
| VAL-PLAT-012 | P5 | ✅ pass | `scripts/validate-structure.mjs` — `engine.ts` is 106 lines, `src/core/engine/` contains the required phase modules, root `engine.ts` imports only orchestrator-facing modules, and it defines only `createSimEngine()` |

**Note:** Formula-level (`-F`) tests pass. Engine-level (`-E`) golden cases also pass, and `npm run validate:stage` now reruns cleanly after the landed Slice 5 + real-trace wording sync using `node --import tsx` for the golden-engine step. Browser-level (`-V`) closure evidence is automated for the current explainability/continuity package; screenshot packs remain supplementary evidence. EP1 follow-on gates `VAL-EE-003` / `VAL-EE-004` plus the bundle-consumer gates `VAL-MODQN-BUNDLE-001` through `VAL-MODQN-BUNDLE-005` now all ride through the standard stage chain, with `001` enforced via `validate-modqn-bundle-adapter.ts` and `002` / `003` / `004` / `005` enforced via `validate-modqn-bundle-ui.ts`.

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
| VAL-FV-005 | 3 | ✅ browser pass | `validate-visual-browser.ts` verifies shared presentation-frame beam membership, visible-set discipline, and continuity-focused scatter suppression |
| VAL-FV-006 | 3 | ✅ browser pass | `validate-visual-browser.ts` verifies `BeamInfoOverlay` SINR/serving-sat truth plus `BeamPresentationFrame` primary/context beam picks against raw snapshot beam truth published in the validation probe |
| VAL-FV-007 | 3 | ✅ browser pass | `validate-visual-browser.ts` verifies live DAPS continuity links reflect runtime truth |
| VAL-FV-003 | 4 | ⚠️ manual pass | `ReplayLayer` uses the same beam layers as `LiveLayer`; real-trace screenshot exists |
| VAL-FV-004 | 5 | ✅ browser pass | `validate-visual-browser.ts` verifies deterministic BH proof exposes `energyBlocked` cells in the earth-fixed layer |
| VAL-FV-008 | 4 | ✅ browser pass | `validate-visual-browser.ts` verifies replay-mode overlay/link parity and replay metadata visibility |
| VAL-FV-009 | 6 | ✅ browser pass | `validate-visual-browser.ts` verifies `dapsSource` / `dapsTarget` dual-active links in live mode and preserves them in replay via observed truth |
| VAL-FV-010 | 6 | ✅ browser pass | `validate-visual-browser.ts` verifies `case9-daps-showcase` reaches continuity-focus with central high-elevation serving truth, a readable local serving-beam neighborhood, and a serving-centered fallback when no nearby supporting context satellite exists in truth |

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
5. **Real-trace integration baseline is closed for the current SDD set:** frontend `useSimulation` and `useReplay` can both build deterministic real-trace showcase paths whose cache samples come from SatRec-backed SGP4 during cache construction, replay manifests and replay artifacts are emitted in the benchmark artifact path, and `validate-replay-manifest.ts` now validates both replay identity and snapshot-based KPI parity.
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

The leo-parity experiment (formerly tracked in `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-frontend-leo-parity-mode.md`) has been closed. Useful satellite selection logic now lives in `src/viz/presentation/beam-presentation-frame.ts`, `src/viz/satellite/satellite-display-selection.ts`, `src/viz/tier1-satellite-selection.ts`, and `src/viz/beam/beam-visibility-selection.ts`, and the dual view-mode system was removed. The current frontend beam architecture is:

1. **`beam-presentation-frame.ts` + `useBeamPresentationFrame.ts`** — shared truth-driven scene grammar for `display sats`, `event sats`, `beam sats`, primary/context beams, marker roles, beam accents, and `focusMode`
2. **`EarthMovingBeamLayer`** — renders 3D beam cones from the shared presentation frame
3. **`EarthFixedCellLayer`** — renders hex grid colored by BH slot state over the same frame-level beam-pick set used by the moving-beam renderer
4. **`BeamInfoOverlay`** — renders satellite role tags + SINR display from the shared presentation frame
5. **`HandoverLinkOverlay`** — renders UE-to-satellite link lines only for satellites admitted by the shared presentation frame
6. **`bh-cell-analysis.ts`** — computes hex cell state from truth geometry without fake UE re-centering

Deleted components (no longer in the codebase):
- `BeamFootprintLayer.tsx` (was @deprecated)
- `LeoParityBeamLayer.tsx`
- `LeoParityBeamOverlay.tsx`
- `LeoParityHandoverLinks.tsx`
- `src/viz/presenters/` directory (`leo-parity-presenter.ts`, `types.ts`)

Interactive first-screen default: `case9-daps-showcase`. Benchmark-facing baselines, including `case9-daps-baseline`, remain separately selectable. No `ViewMode` toggle or query-param view switching.
