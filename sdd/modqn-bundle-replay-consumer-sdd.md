# MODQN Bundle Replay Consumer SDD (Phase 03A Slice B)

**Status:** Active consumer authority for the Phase 03A bundle replay path.
**Date:** 2026-04-14 (Slice A producer hardening synced; Slice C/D replay-presentation guard noted).
**Producer SDD:** `modqn-paper-reproduction/docs/phases/phase-03a-ntn-sim-core-bundle-replay-integration-sdd.md`
**Producer schema version accepted:** `phase-03a-replay-bundle-v1`
**Canonical producer sample:** `fixtures/sample-bundle-v1/` (copy of
`modqn-paper-reproduction/tests/fixtures/sample-bundle-v1/`).

## 1. Purpose

Phase 03A defines a low-coupling artifact bridge between
`modqn-paper-reproduction` (producer of training, replay, and assumption
truth) and `ntn-sim-core` (consumer of an exported replay bundle for UI
rendering). This document is the consumer-side authority for **Slice B**
only: the typed bundle loader, schema/version guard, and replay-frame
adapter that future UI / view-model / mode-switch code will consume.

Slice C (mode switch + replay overlays) and Slice D (provenance UI) are
explicitly out of scope here and will land as separate consumer SDDs once
Slice B is wired into a UI surface.

## 2. Authority Order

This consumer SDD is subordinate to:

1. `agent-governance.md`
2. `sdd/README.md` — Core Authority list
3. `sdd/downstream-runtime-architecture-sdd.md` §3.4 (`adapters`)
4. `sdd/ntn-sim-core-development-constraints.md`
5. `sdd/ntn-sim-core-validation-matrix.md`

The producer SDD (in `modqn-paper-reproduction`) is the authority for the
**bundle contract** itself; this SDD only governs how `ntn-sim-core` reads
that contract.

## 3. Module Layout

The consumer adapter lives at `src/adapters/modqn-bundle/` — the directory
reserved for "consumer-specific bridges over frozen contracts" by
`downstream-runtime-architecture-sdd.md §3.4`. Until now this directory was
intentionally not created (estnet was the only candidate consumer and
remained paused); the MODQN bundle is the first baseline-scope consumer
that legitimately activates it.

| File | Purpose |
|---|---|
| `constants.ts` | Supported `bundleSchemaVersion`, `timelineFormatVersion`, `replayTruthMode`, required file / directory / field lists |
| `types.ts` | Manifest, raw timeline row, and adapter-owned replay domain model (`ModqnReplayBundle`, `ModqnReplayFrame`, `ModqnReplayUserRecord`); `ModqnBeamState.centerPosition` and `centerLocalTangentKm` are non-nullable. `ModqnBundleManifest.checkpointRule` is the union `string | ModqnBundleCheckpointRule | null` so older producers emitting a short string name and current producers emitting a structured record both load. Optional Phase 03A Slice A hardening fields (`coordinateFrame.groundPoint`, `slotIndexSemantics`, `replaySummary.replaySeedSource`, `replaySummary.slotIndexOffset`, `replaySummary.sampleSubset`, `sampleNote`) are modelled as optional so backward-compat is preserved. |
| `schema-guard.ts` | `assertManifestShape()` + `ModqnBundleSchemaError` with stable `code` strings. Validates `checkpointRule` as `string \| object \| null`, `coordinateFrame.groundPoint` (when present) as `{latDeg, lonDeg}` with finite numbers, and `slotIndexSemantics` (when present) as `{firstIndex: number, note: string}`. Also exposes `assertBundleReplayPresentationReady(bundle)` for the stricter Slice C/D UI entry rule that rejects replay-incomplete bundles missing `coordinateFrame.groundPoint`. |
| `timeline-parser.ts` | `parseTimelineJsonl()` — line-numbered validation of every required row field plus null-geometry and mask/beam length checks |
| `replay-frame-adapter.ts` | `buildReplayFrames()` — slot grouping with deep per-slot geometry equality + `decisionTimeSec` drift checks |
| `loader.ts` | I/O-agnostic `loadModqnReplayBundle(reader)` + `createMemoryFileReader` + `ModqnBundleFileReader` interface (file + directory existence) |
| `index.ts` | Public barrel — UI / view-model / future mode-switch code MUST import from here |

The library is fully I/O-agnostic. Concrete reader implementations live next
to their consumer:

1. Node CLI / validators → `scripts/validate-modqn-bundle-adapter.ts`
   constructs an `fs/promises`-backed reader inline.
2. Browser UI → Slice C will add a fetch-based reader next to the relevant
   hook layer; it must not vendor `node:fs` or any node built-ins into
   `src/adapters/modqn-bundle/`.

## 4. Non-Negotiable Boundary Rules

These rules implement the cross-repo contract from the producer SDD §4.3:

1. The adapter MUST NOT recompute MODQN handover decisions, beam centers,
   serving-link assignments, or any other simulator truth. It only reshapes
   the producer's exported timeline into a typed domain model.
2. The adapter MUST NOT fall back to native `ntn-sim-core` profile defaults
   when a bundle field is missing. Missing geometry, missing satellite
   states, missing beam states, or missing required fields → reject with
   `ModqnBundleSchemaError`.
3. The adapter MUST NOT silently accept producer drift. New
   `bundleSchemaVersion`, `timelineFormatVersion`, or `replayTruthMode`
   values require an explicit consumer change to `constants.ts`.
4. The adapter MUST NOT import from `src/core/engine/`, `src/core/handover/`,
   or any simulator runtime modules. It depends only on its own files plus
   the producer's contract via JSON.
5. The adapter MUST NOT import React, Three.js, or `node:*` modules. The
   library stays browser-friendly so future UI code can reuse it.
6. The adapter MUST reject rows whose `beamStates` contain any `null`
   `centerPosition` or `centerLocalTangentKm`, and rows whose
   `satelliteStates` are missing finite `positionEciKm`. Producer SDD §7.4
   says "if the bundle does not provide [beam centers], the bundle is not
   replay-complete" — the consumer enforces that rule as
   `TIMELINE_ROW_BEAM_GEOMETRY_NULL` /
   `TIMELINE_ROW_SATELLITE_GEOMETRY_NULL`.
7. The adapter MUST reject per-slot geometry drift across user rows under
   deep structural equality, not just `satId` / `beamId` ordering. Two rows
   in the same slot must agree on every satellite / beam numeric field.
   Drift emits `FRAME_SATELLITE_GEOMETRY_DISAGREEMENT` or
   `FRAME_BEAM_GEOMETRY_DISAGREEMENT`.
8. The adapter MUST reject `decisionTimeSec` disagreement across user rows
   in the same slot (`FRAME_DECISION_TIME_DISAGREEMENT`). This catches
   silent slot-alignment drift at the producer boundary.
9. The adapter MUST reject rows whose `visibilityMask`,
   `actionValidityMask`, `beamLoads`, `beamThroughputs`,
   `decisionVisibilityMask`, or `decisionActionValidityMask` length does
   not match `beamStates` length (`TIMELINE_ROW_BEAM_ARRAY_LENGTH_MISMATCH`).
   The producer guarantees satellite-major beam ordering aligned with the
   per-slot beam catalog; length drift is a silent truth corruption.
10. The consumer's `REQUIRED_BUNDLE_FILES` and `REQUIRED_BUNDLE_DIRECTORIES`
    lists MUST match the producer's `validate_replay_bundle()` surface. In
    particular, `training/episode_metrics.csv`, `training/loss_curves.csv`,
    and the `evaluation/sweeps/` directory are part of the replay-complete
    contract; the consumer's `BUNDLE_INCOMPLETE` check enforces all of
    them.
11. Structural adapter backward-compat and replay-presentation readiness are
    distinct concerns. Older bundles may still load without
    `coordinateFrame.groundPoint`, but any bundle replay UI entry path MUST
    call `assertBundleReplayPresentationReady(bundle)` and reject that
    bundle explicitly instead of guessing the local-tangent anchor.

## 5. Public Adapter Surface

Slice B exposes exactly one consumer entry point per use case:

| Entry Point | Purpose |
|---|---|
| `loadModqnReplayBundle(reader)` | Load + validate a bundle through any `ModqnBundleFileReader` |
| `createMemoryFileReader(files)` | In-memory reader for tests / fixtures / fetch-pre-cached payloads |
| `parseTimelineJsonl(text)` | Standalone timeline parser for non-bundle use cases |
| `buildReplayFrames(rows)` | Standalone slot grouping for re-projection cases |
| `assertManifestShape(value)` | Standalone manifest validator |
| `assertBundleReplayPresentationReady(bundle)` | Reject structurally-valid bundles that are still incomplete for bundle replay presentation |

`ModqnReplayBundle` is the single consumer-facing domain type that the
upcoming Slice C view-model / overlay code should consume. It contains:

1. validated `manifest` (typed `ModqnBundleManifest`)
2. raw `configResolved`, `assumptions`, `provenanceMap`, `evaluationSummary`
   payloads (preserved as `Record<string, unknown>` so future view-model
   code can project them without losing producer fields)
3. ordered `frames: ModqnReplayFrame[]` plus a `frameBySlotIndex` lookup
4. `slotCount`, `userCount`, `rowCount` summaries

## 6. Validation

Slice B introduces one new validator gate with seven sub-sections:

| Section | Script Section | Coverage |
|---|---|---|
| `VAL-MODQN-BUNDLE-001A` | `validateSchemaGuard` | Schema/version guard: baseline manifest acceptance, Phase 03A Slice A shape acceptance (structured `checkpointRule`, `coordinateFrame.groundPoint`, `slotIndexSemantics`), negative cases for unsupported versions/modes, missing required fields, non-object root, wrong `checkpointRule` type, malformed `groundPoint`, malformed `slotIndexSemantics`. |
| `VAL-MODQN-BUNDLE-001B` | `validateTimelineParser` | Timeline parser: two-row happy path; negative cases for empty timeline, missing required fields, empty beamStates, malformed JSON, null beam centers, null `centerLocalTangentKm`, non-finite `positionEciKm`, visibility / action / load / throughput length mismatches. |
| `VAL-MODQN-BUNDLE-001C` | `validateReplayFrameAdapter` | Replay-frame adapter: 2-slot × 2-user happy path; negative cases for cross-user satId / satellite drift, same-ID satellite numeric drift, same-ID beam numeric drift, `decisionTimeSec` drift, duplicate user in a slot. |
| `VAL-MODQN-BUNDLE-001D` | `validateMemoryReaderRoundTrip` | In-memory reader round trip with per-required-file and per-required-directory missing cases; aligns with `REQUIRED_BUNDLE_FILES` / `REQUIRED_BUNDLE_DIRECTORIES`. |
| `VAL-MODQN-BUNDLE-001E` | `validateFixtureLoad` | On-disk hand-crafted fixture load against `fixtures/modqn-bundle-sample/` (2 sats × 2 beams × 1 user × 2 slots) with an explicit assertion that the checked-in minimal fixture still uses the legacy string-form `checkpointRule`, plus directory presence checks. |
| `VAL-MODQN-BUNDLE-001F` | `validateProducerSampleBundle` | On-disk **producer** sample load against `fixtures/sample-bundle-v1/` (4 sats × 7 beams × 1 user × 10 slots, Phase 03A Slice A shape) — proves the adapter accepts the current producer output and surfaces all new optional fields (`checkpointRule` as object, `groundPoint`, `slotIndexSemantics`, `replaySeedSource`, `slotIndexOffset`, `sampleSubset`, `sampleNote`) plus the five-category `provenance-map.json` legend. |
| `VAL-MODQN-BUNDLE-001G` | `validateLegacyDecisionMaskFallback` | Legacy-compatibility guard for structurally valid older bundles that omit optional decision-time masks: proves the consumer does not silently collapse visible/action counts to `0 / 0`, allows the bundle to remain readable through disclosed runtime-mask fallback, and keeps that fallback consumer-side rather than rewriting producer contract meaning. |

Run via `npm run validate:modqn:bundle`. That command now prefixes the
adapter validator with `npm run validate:modqn:fixture-sync`, which
machine-checks that the consumer copy of `fixtures/sample-bundle-v1/`
still mirrors the producer fixture tree. The sync gate reports:

1. missing consumer mirror files
2. missing consumer mirror directories
3. changed consumer mirror files
4. unexpected consumer extra files
5. unexpected consumer extra directories
6. missing consumer support files (currently `evaluation/sweeps/.gitkeep`)

The validator is now wired into `validate:stage` through
`npm run validate:modqn:bundle`. That stage path still front-loads the
cross-repo fixture-sync check against the sibling
`modqn-paper-reproduction` workspace repo before running the adapter gate
itself, so reruns should continue to treat this validator as both a
consumer-side contract gate and a producer-mirror drift check.

## 7. Sample Fixtures

Slice B ships **two** fixtures that cover complementary test surfaces:

### 7.1 Hand-Crafted Minimal Fixture

`fixtures/modqn-bundle-sample/` holds the smallest possible replay-complete
bundle (2 satellites × 2 beams × 1 user × 2 slots, including one
inter-satellite handover). It is an explicit fixture, NOT a reviewed
training run; its `assumptions.json` says so. Its checked-in
`manifest.json` intentionally keeps the legacy string-form `checkpointRule`
so the on-disk fixture load still proves the adapter accepts older
producer outputs under backward compatibility.

The fixture has every surface required by the producer contract:

1. `manifest.json`, `config-resolved.json`, `provenance-map.json`,
   `assumptions.json`
2. `training/episode_metrics.csv`, `training/loss_curves.csv`
3. `evaluation/summary.json` and the `evaluation/sweeps/` directory (with a
   placeholder README so git tracks the directory)
4. `timeline/step-trace.jsonl` with ALL beam centers populated — no `null`
   centers, no `NaN` satellite positions, and mask/beam array lengths equal
   to the per-slot beam catalog length

### 7.2 Producer Sample Copy

`fixtures/sample-bundle-v1/` is a byte-identical copy of the producer
fixture at
`modqn-paper-reproduction/tests/fixtures/sample-bundle-v1/` (~256 KB, 4
satellites × 7 beams × 1 user × 10 slots). It is generated reproducibly by
the producer's `scripts/generate_sample_bundle.py` and trimmed /
path-normalized so the shipped copy is byte-stable across regenerations.

This second fixture exists so the consumer validator can prove the
adapter **accepts the current producer output end-to-end**, including the
Phase 03A Slice A hardening fields (structured `checkpointRule`,
`coordinateFrame.groundPoint`, `slotIndexSemantics`, `replaySeedSource`,
`slotIndexOffset`, `sampleSubset`, `sampleNote`) and the five-category
`provenance-map.json` legend.

The only consumer-added file inside `sample-bundle-v1/` is
`evaluation/sweeps/.gitkeep`, which exists because git does not track
empty directories. All other files MUST stay byte-equal to the producer
copy — DO NOT edit them locally.

To refresh or verify the mirror:

1. `npm run sync:modqn:fixture`
2. `npm run validate:modqn:fixture-sync`

### 7.3 Refresh Rules

| Scenario | Action |
|---|---|
| Producer contract changes shape | Regenerate `sample-bundle-v1/` from the producer's `scripts/generate_sample_bundle.py`; update `types.ts` / `schema-guard.ts` / `constants.ts` in the same change set; add or update the matching `VAL-MODQN-BUNDLE-001*` sub-section. |
| Consumer mirror drifts from the producer sample | Run `npm run sync:modqn:fixture`; do not hand-edit mirrored files under `fixtures/sample-bundle-v1/`. |
| Consumer adds a new strictness rule | Update or add a case in `fixtures/modqn-bundle-sample/` or inside the inline memory fixtures in `scripts/validate-modqn-bundle-adapter.ts`. |
| Contract bump requires a new `bundleSchemaVersion` | Add the new version to `SUPPORTED_BUNDLE_SCHEMA_VERSIONS`, ship a parallel fixture (`fixtures/sample-bundle-v2/`), and wire it through `validateProducerSampleBundle`. |

Large multi-megabyte producer artifacts (full 10-slot × 100-user runs)
must NOT enter the `ntn-sim-core` source tree. The producer's trim
pipeline is the correct way to land a fresh fixture.

## 8. Open Items For Slice C / D

These are intentionally NOT covered by Slice B and must come through their
own SDD promotion:

1. UI mode switch between native runtime and bundle replay
2. Replay-controller projection from `ModqnReplayBundle` into the
   simulator's existing `ReplayController` shape
3. Provenance / assumptions / training-eval summary panels
4. Any deeper coupling between bundle truth and the engine snapshot path

## 9. Working Rule

When extending this surface:

1. Read this SDD plus the producer SDD before changing any
   `src/adapters/modqn-bundle/` file.
2. If the producer ships a new `bundleSchemaVersion`, bump
   `SUPPORTED_BUNDLE_SCHEMA_VERSIONS` in the same change set as any code
   that depends on the new field shape, and add a new `VAL-MODQN-BUNDLE-*`
   validation row.
3. Never silently fall back to native simulator defaults to "fix" a
   missing bundle field — surface the `ModqnBundleSchemaError` to the user.
