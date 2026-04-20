# Scene Consumer Contract Extraction Follow-On

**Status:** Promoted Phase 2 follow-on — active implementation authority
**Drafted:** 2026-04-19
**Promoted:** 2026-04-19
**Landed:** pending
**Depends on:**
1. `sdd/phase4-runtime-contract-sdd.md`
2. `sdd/phase5-cleanup-and-modularization-sdd.md`
3. `sdd/ntn-sim-core-frontend-beam-visual-sdd.md`
4. `sdd/truth-preserving-showcase-visual-realignment-follow-on.md`
5. `sdd/scene-coordination-decoupling-follow-on.md`
6. `sdd/ntn-sim-core-implementation-status.md`
7. `todo/pre-integration-phase0-boundary-map/03-handover-published-semantics-glossary.md`
8. `todo/scene-consumer-contract-extraction/README.md`

**Scope gate:** integration-friendly contract extraction for future external
scene consumers such as `scenario-globe-viewer` and
`scenario-globe-handover-demo`; no `src/core/**` rewrite, no adapter-contract
rewrite, no bundle source-semantic rewrite, no validation key/shape change, and
no promotion of `SceneShell.tsx` into an external consumer API

---

## 1. Current Position in Sequence

The current tree now has enough Phase 1 closure evidence to start Phase 2
planning without reopening shell cleanup as the main workstream:

1. scene mode routing already passes through typed controller seams;
2. truth-source publication is already split from presentation/render mounting;
3. `SceneShell.tsx` has already shrunk back toward reference-viewer shell
   composition;
4. handover published semantics now expose `servingTransition` and
   `serviceState` as runtime truth for downstream consumers.

At the same time, those seams remain **internal** to the reference viewer. They
are not yet the minimal external-consumer contract described by
`/home/u24/papers/ntn-v5-clean.md` Phase 2.

This follow-on therefore exists to answer one narrow question:

**What is the smallest read-only scene-consumer contract that an external scene
may use without depending on `SceneShell.tsx` or reinterpreting simulator
truth?**

## Reconciliation Note (2026-04-19)

The first minimal contract-extraction slice is now present in the current tree:

1. `src/viz/scene/scene-consumer-facade.ts` now exists as a seam-adjacent
   read-only consumer contract surface.
2. `TruthSourceLayer` now builds and publishes that facade while preserving the
   existing validation publications.
3. `SceneShell` and `useBundleReplayShellState` now dogfood the facade for
   shell-side read paths.
4. The slice preserves `SimulationSnapshot`, preserves `BeamPresentationFrame`,
   keeps `sceneConsumedSnapshot` versus `publishedTruthSnapshot` explicit, and
   keeps native runtime transition truth separate from bundle replay producer
   handover kind.

This note records a landed first slice inside the broader still-open Phase 2
follow-on. It does **not** mean the full external-consumer proof path is
complete.

## Reconciliation Note (2026-04-19 — Milestone C First Proof Slice)

The current tree now also lands the first deterministic external-consumer proof
path without reopening shell extraction or widening the external contract:

1. `src/viz/scene/scene-consumer-proof.ts` now builds a pure read-only proof
   model from the already-landed facade source/truth/presentation surfaces.
2. `src/viz/scene/SceneConsumerProofSurface.tsx` now dogfoods that proof model
   inside the reference viewer in validation mode only; it does not promote
   `SceneShell.tsx` or shell helpers into external API.
3. The first deterministic proof target is the shipped bundle replay sample
   path, and the current tree now extends that same proof model to
   `native-replay` without adding a source-specific fork. Together they
   exercise:
   - facade source envelope metadata;
   - `sceneConsumedSnapshot` versus `publishedTruthSnapshot`;
   - native-runtime continuity fields and bundle replay producer handover kind
     as distinct namespaced reads;
   - shared `BeamPresentationFrame` / continuity narrative projection.
4. Targeted validation for this proof slice now includes rerun
   `lint`, `build`, `validate:contracts`, `validate:orbit-parity`,
   and `validate:visual-browser`, with:
   - existing bundle-sample proof still covered through the facade-only proof
     model and prior bundle proof path;
   - new `native-replay` browser proof preserving alias-like
     `sceneConsumedSnapshot` / `publishedTruthSnapshot` semantics.

This note records a landed first proof slice. It still does **not** claim a
fresh full `validate:stage` rerun as part of this authority update.

## Reconciliation Note (2026-04-19 — Narrow Stub / External-Consumer Harness)

The current tree now lands the next minimal slice after the proof surface
without reopening facade extraction, live-first evidence, or external-repo
integration:

1. `src/viz/scene/scene-consumer-harness.ts` now builds a minimal consumer
   harness model from the already-landed proof read model instead of reaching
   into `SceneShell.tsx` or shell helpers.
2. `src/viz/scene/SceneConsumerHarnessSurface.tsx` now mounts that harness in
   validation mode only, giving the repo one narrow stub consumer that is not
   the reference shell but still reads the existing facade/proof/presentation
   contract.
3. The harness remains deterministic-first:
   - bundle sample proof is preserved through the contracts/runtime proof path
     plus bundle UI browser validation;
   - `native-replay` proof is preserved through the browser validation path;
   - no `live` proof expansion is added in this slice.
4. The harness does not:
   - import `SceneShell.tsx`;
   - import `useSceneControlSurface.ts`;
   - import `useBundleReplayShellState.ts`;
   - introduce generic `handoverKind` normalization;
   - change frozen validation section keys or payload shapes.

This note records a landed narrow stub/external-consumer harness slice. It
still does **not** claim broader external scene integration or a fresh full
`validate:stage` rerun.

## Reconciliation Note (2026-04-19 — Narrow Starter / Export Entry)

The current tree now lands the next minimal slice after the stub harness by
giving the deterministic consumer path one explicit starter/export entry name:

1. `src/viz/scene/scene-consumer-starter.ts` now builds
   `SceneConsumerStarterExport` directly on top of the landed
   facade/proof/harness chain rather than inventing a parallel scene contract.
2. The starter/export surface stays narrow and additive:
   - `source` reuses harness metadata for mode/profile/source identity;
   - `truth` reuses harness deterministic summary plus scene/published snapshot
     relationship;
   - `presentation` reuses harness focus/narrative/display summary;
   - `entry` adds only the minimal starter/export naming and deterministic-path
     identity fields.
3. `src/viz/scene/SceneConsumerStarterSurface.tsx` now dogfoods that named
   starter/export entry in validation mode only, without promoting
   `SceneShell.tsx` or shell helpers into external API.
4. The starter/export slice remains deterministic-first:
   - bundle sample publishes a stable `bundle-sample:<truthSourceLabel>`
     identity;
   - `native-replay` publishes a stable
     `native-replay:<profileId>:<replaySelection>` identity;
   - `live` remains outside the claimed proof path.
5. Targeted validation for this slice extends the already-landed proof/harness
   gates through `validate:contracts`, `validate:visual-browser`, and
   `validate:modqn:bundle-ui` without changing frozen validation section keys
   or payload shapes.

This note records a landed narrow starter/export entry slice. It still does
**not** claim external-repo integration, package extraction, or a fresh full
`validate:stage` rerun.

## Reconciliation Note (2026-04-19 — Narrow Starter-Consumer Adoption)

The current tree now lands the next minimal slice after the starter/export
entry by giving `ntn-sim-core` one non-validation-only narrow consumer that
reads `SceneConsumerStarterExport` directly:

1. `src/viz/scene/SceneConsumerStarterPanel.tsx` now consumes
   `SceneConsumerStarterExport` as a repo-internal visible panel instead of as
   another hidden validation surface.
2. `src/viz/scene/SceneShell.tsx` now dogfoods that panel by building the
   starter/export entry from the landed facade/proof/harness chain and passing
   the resulting export into the panel, without promoting `SceneShell.tsx`
   itself into external API.
3. The starter-consumer adoption slice remains deterministic-first:
   - bundle sample shows the stable
     `bundle-sample:<truthSourceLabel>` starter path;
   - `native-replay` shows the stable
     `native-replay:<profileId>:<replaySelection>` starter path;
   - `live` remains outside the claimed proof path.
4. Targeted validation for this slice now includes:
   - `validate:modqn:bundle-ui`, which proves the visible consumer stays
     aligned with bundle-sample starter source/truth/presentation summaries
     without changing frozen validation section keys or payload shapes;
   - `validate:visual-browser`, which now returns clean after validator-side
     atomic native-replay snapshot reads keep proof/harness/starter/panel
     checks inside one replay-ready window.

This note records a current-tree starter-consumer adoption landing whose
targeted browser blocker is now cleared. It still does **not** claim
external-repo integration, package extraction, `live` contract proof, or a
fresh full `validate:stage` rerun.

## Reconciliation Note (2026-04-19 — Narrow Export Stabilization / Shared Starter-Consumer Projection)

The current tree now lands the next minimal slice after the first visible
starter-consumer adoption by making `SceneConsumerStarterExport` the shared
repo-internal consumer entry rather than letting each starter consumer rebuild
its own shaping:

1. `src/viz/scene/scene-consumer-starter-consumer.ts` now projects one narrow
   read-only starter-consumer view over `SceneConsumerStarterExport`, including
   deterministic-path wording, shared summary lines, and aligned DOM data attrs
   for repo-internal consumers.
2. `src/viz/scene/SceneConsumerStarterSurface.tsx` now consumes the same
   `SceneConsumerStarterExport` instance passed through `SceneShell.tsx`
   instead of rebuilding starter/export state from the facade independently.
3. `src/viz/scene/SceneConsumerStarterPanel.tsx` now reads that same shared
   starter-consumer projection, so the visible panel and hidden starter
   surface stay aligned on one repo-internal starter entry without promoting
   `SceneShell.tsx` or shell helpers into external API.
4. The stabilization slice remains deterministic-first:
   - bundle sample preserves
     `bundle-sample:<truthSourceLabel>`;
   - `native-replay` preserves
     `native-replay:<profileId>:<replaySelection>`;
   - `live` remains outside the claimed proof path.
5. Targeted validation for this slice now includes `lint`, `build`,
   `validate:contracts`, `validate:visual-browser`, and
   `validate:modqn:bundle-ui`, all without changing frozen validation section
   keys or payload shapes.

This note records a narrow export-stabilization landing inside
`ntn-sim-core`. It still does **not** claim external-repo integration,
package extraction, `live` contract proof, or a fresh full
`validate:stage` rerun.

## Reconciliation Note (2026-04-19 — Phase 3 Integration-Planning Entry)

The current tree now has enough deterministic repo-internal proof, starter
export naming, visible consumer adoption, and shared starter-consumer shaping to
stop treating further repo-internal proof slices as the default next move.

The recommended next authority step is now a separate drafted Phase 3 external
scene integration planning surface for `scenario-globe-viewer` and
`scenario-globe-handover-demo`, rather than folding cross-repo ownership and
integration questions back into this Phase 2 contract-extraction file.

This note does **not** claim `live` proof, external-repo implementation, or a
fresh full `validate:stage` rerun.

## 2. Purpose

This follow-on is planning authority for contract extraction only. It does not
reopen the earlier consumer-side cleanup slice.

The intended outcome is:

1. a future external scene can consume truth, projection, and continuity
   meaning through one small contract surface;
2. the reference viewer can dogfood that same surface without being promoted as
   the external API itself;
3. validator-visible truth and bundle/browser semantics stay frozen while the
   consumer boundary is clarified.

## 3. Decision

Phase 2 should extract one narrow consumer contract program around five
surfaces.

### 3.1 Truth-source contract

1. `SimulationSnapshot` remains the canonical truth payload. Phase 2 should not
   clone or re-version the snapshot shape.
2. The current seam already carries two adjacent snapshot surfaces:
   - `bridge.snapshot` for the scene-consumed path
   - `bridge.validationSnapshot` for validator/raw-truth publication
   They are identical in `live` / `native-replay`, but can diverge in
   `modqn-bundle`, where validator publication stays tied to raw projected
   bundle truth while the scene path may still carry transient presentation
   pacing.
3. Contract extraction should keep that distinction explicit if both are needed,
   rather than hiding them behind one ambiguous `snapshot` label.
4. Contract extraction may add a small source-mode envelope/facade around that
   payload, but the envelope should stay additive and read-only.
5. The facade must be able to represent `live`, `native-replay`, and
   `modqn-bundle` without forcing external consumers to read reference-shell
   state.
6. The recommended first landing is to expose both:
   - scene-consumed snapshot
   - published/raw truth snapshot
   with the latter aliased to the former in modes where they are already
   identical.

### 3.2 Shared projection / presentation contract

1. `BeamPresentationFrame` is a shared contract surface, but it is split across
   two files:
   - `src/viz/presentation/beam-presentation-types.ts` owns the published shape
   - `src/viz/presentation/beam-presentation-frame.ts` owns the builder /
     projection grammar
2. Phase 2 should preserve that split and treat both files together as the
   shared projection surface.
3. External consumers may read the resulting frame, but they should not fork or
   silently replace the projection grammar.

### 3.3 Continuity consumer contract

1. External consumers may rely on `servingTransition`, `serviceState`,
   `continuityState`, `recentHoEvents`, `daps`, and serving/target/secondary IDs
   as runtime truth.
2. `ContinuityNarrativeState` and
   `BeamPresentationFrame.continuityNarrative` remain consumer-side readability
   aids, not the primary handover-family truth surface.
3. Phase 2 should make that truth-vs-reading-aid split explicit in the consumer
   contract instead of letting external scenes rediscover it ad hoc.

### 3.4 Live / replay / bundle source-mode contract

1. Phase 2 should define one viewer-neutral source-mode envelope for:
   - readiness
   - profile / profile-like identity
   - truth-source labeling
   - replay-window metadata where present
   - bundle slot / source metadata where present
2. The current scene seam already exposes enough mode metadata to normalize:
   - native live: time, duration, counts, serving sat, handover count,
     `profileId`
   - native replay: replay selection and replay window metadata
   - MODQN bundle: source label, slot metadata, checkpoint/status wording,
     bundle truth mode
3. This slice must not reopen `sample` / `external-directory` /
   `reset-to-sample` semantics or move their ownership out of the reference
   shell.
4. Live mode may remain supported by the same envelope, but it must not dictate
   the first external-consumer proof path.

### 3.5 Reference shell vs external consumer shell boundary

1. `SceneShell.tsx`, `useSceneControlSurface.ts`, `useBundleReplayShellState.ts`,
   `ControlPanel.tsx`, `ModqnBundleMetadataPanel`, and similar panel/HUD wiring
   remain reference-viewer shell surfaces.
2. Phase 2 should explicitly keep those files outside the external consumer
   contract.
3. The reference viewer should later dogfood the extracted contract, but it must
   not become the contract.

### 3.6 Contract caveat requiring explicit treatment

1. Native runtime truth currently publishes
   `same-satellite-beam-switch` / `inter-satellite-handover` through
   `PublishedServingTransitionKind`.
2. MODQN bundle replay truth currently surfaces producer-owned handover-kind
   strings, including `intra-satellite-beam-switch` /
   `inter-satellite-handover`.
3. Phase 2 must not silently flatten those into one unnamed generic
   `handoverKind`. It should either:
   - keep native runtime transition truth and producer replay handover truth as
     distinct namespaced fields, or
   - define an explicit normalization/mapping rule in the contract.
4. The recommended first landing is to keep them as distinct namespaced fields
   and defer any cross-source normalization until a later slice proves it is
   necessary.

## 4. Non-Negotiable Boundary Rules

1. Do not reopen `src/core/**` or `src/runner/**`.
2. Do not reopen `src/adapters/modqn-bundle/**`.
3. Do not recalculate SINR, ranking, or handover decisions in the frontend.
4. Do not change the eight frozen browser-visible validation section keys or
   payload shapes.
5. Do not change `sample` / `external-directory` / `reset-to-sample` source
   semantics.
6. Do not promote `SceneShell.tsx` into an external API.
7. Do not turn this slice into a broad public-package or framework rewrite.
8. Do not introduce a new event feed if existing snapshot truth already carries
   the required meaning.
9. Do not silently collapse scene-consumed snapshot pacing and validator/raw
   truth into one undocumented bundle-mode surface.

## 5. Allowed Landing Zone

Primary contract-extraction work should stay near the current seam rather than
reaching back into the engine:

1. `src/viz/scene/modes/types.ts` and adjacent scene-mode seam files
2. `src/viz/scene/TruthSourceLayer.tsx`
3. `src/viz/scene/PresentationLayers.tsx`
4. new narrow consumer-contract files under `src/viz/scene/` if needed
   (final filenames decided during Milestone A)
5. `src/viz/presentation/beam-presentation-types.ts`
6. `src/viz/presentation/beam-presentation-frame.ts`
7. `src/viz/presentation/continuity-narrative-state.ts` for contract wording
   only, not semantic reinvention
8. this file plus minimal `sdd/README.md` /
   `sdd/ntn-sim-core-implementation-status.md` sync

This slice must avoid treating these files as exported consumer API:

1. `src/viz/scene/SceneShell.tsx`
2. `src/viz/scene/shell/useSceneControlSurface.ts`
3. `src/viz/scene/bundle/useBundleReplayShellState.ts`
4. `src/viz/overlays/ControlPanel.tsx`
5. `src/viz/overlays/ModqnBundleMetadataPanel.tsx`

## 6. Phase Order

### 6.1 Milestone A — contract inventory and naming

1. name the minimal consumer-facing surfaces for truth, projection,
   continuity, and source mode;
2. decide the smallest additive facade shape over existing controller /
   truth-source / presentation seams;
3. record which shell surfaces are explicitly reference-only.

### 6.2 Milestone B — facade extraction and reference-viewer dogfood

Status note: first minimal landing now present in the current tree.

1. extract the small read-only facade over the existing seam;
2. make the reference viewer consume that facade rather than reaching directly
   into the thicker internal wiring;
3. keep validator-visible publication and bundle/browser semantics unchanged.
4. remaining work for this milestone is any required cleanup or widening beyond
   the first landed read path, not a restart from scratch.

### 6.3 Milestone C — minimal external-consumer proof path

Status note: first deterministic proof slice now present in the current tree.

1. prove one deterministic external-consumer path without importing
   `SceneShell.tsx` or shell-only helpers;
2. prefer a deterministic source path before any live-first proof;
3. keep richer shell ownership questions out of scope until that proof path is
   stable.
4. after the bundle-sample / `native-replay` proof slices, the landed narrow
   stub/external-consumer harness, and the landed narrow starter/export entry,
   prefer narrow export stabilization or starter-consumer adoption over a
   live-first expansion unless a specific contract question requires live-mode
   evidence.

## 7. Acceptance Criteria

This follow-on is ready to promote for implementation only when the intended
acceptance bar is clear:

1. an external consumer can read truth and projection without importing
   `SceneShell.tsx` or shell-only panel/HUD helpers;
2. `SimulationSnapshot` remains the canonical truth payload rather than being
   cloned into a new scene schema;
3. `BeamPresentationFrame` remains one shared projection contract across its
   type + builder files;
4. continuity consumption is explicit about truth vs readability pacing;
5. the eight frozen validation sections and existing bundle source semantics
   remain preserved.

## 8. Validation and Promotion Boundary

Planning this file does **not** claim a fresh full validation pass by itself.

Implementation work under this follow-on should preserve at least:

1. `lint`
2. `build`
3. `validate:visual-browser`
4. `validate:orbit-parity`
5. `validate:contracts`
6. `validate:bundle`
7. `validate:modqn:bundle`
8. `validate:modqn:bundle-ui`
9. `golden-case-engine`

If a future thread needs a new single-line global-green statement, it should run
a fresh full `npm run validate:stage` in that thread rather than relying only on
targeted gate history.

This file remains planning authority only until explicit promotion.
