# Real-Trace Truth-Path Correction SDD

**Status:** Active SDD — T1 narrow truth-path correction
**Promoted:** 2026-04-01 (`go-with-tight-scope` preflight verdict)
**Authority chain:** `phase4-runtime-contract-sdd.md`, `real-trace-truth-path-preflight-note.md`
**Blocked companion:** `real-trace-scalability-preflight-note.md` remains paused until T1 closes or is explicitly declined

---

## 1. Current Position in Sequence

The 2026-04-01 reviewer-grade preflight concluded:

1. current-tree real-trace is **not** truthfully describable as a per-tick `TLE/SGP4` runtime;
2. the shipped path is currently `OMM/TLE ingest -> cache-based propagation/interpolation`;
3. the mismatch exists in both runtime behavior and surviving wording/family naming;
4. larger mixed-orbit / scalability work must remain blocked until this narrower question is closed.

This document is therefore the next valid orbit follow-on surface.

**Read first:** `real-trace-truth-path-preflight-note.md` records the evidence and the promotion verdict.

---

## 2. Active T1 Goal

T1 exists to make the shipped real-trace path truthfully describable again without reopening broader orbit/runtime scope.

T1 must:

1. remove the current truth-path drift between shipped behavior and active wording;
2. keep the current cache-backed runtime and replay identity intact unless a smaller correction is impossible;
3. align surviving labels, provenance notes, validator assumptions, and model-family wording with the actual runtime truth after T1.

---

## 3. Target Runtime Semantics

T1 does **not** require full per-tick SGP4 inside the engine tick loop.

The intended narrow target is:

1. real-trace ingest still starts from external OMM/TLE records;
2. validation-sized real-trace cache samples should be generated from `propagateSgp4()` (or an equivalent SatRec-backed sampling path) at cache sample ticks;
3. geometry/runtime may continue to consume cached passes/interpolation after cache construction;
4. after T1, the repo may describe the shipped path as an **OMM/TLE ingest + SGP4-sampled cache-backed real-trace path**;
5. the repo must not claim stronger semantics such as full per-tick engine SGP4 unless that stronger statement becomes literally true in code.

This keeps the correction narrow while making the `sgp4-tle` naming family no longer misleading.

---

## 4. Active T1 Scope

### 4.1 Runtime Landing Zone

Allowed primary ownership:

1. `src/core/orbit/profile-runtime.ts`
2. `src/core/orbit/trajectory-cache.ts`
3. `src/core/orbit/sgp4-adapter.ts`

Allowed only if plumbing is unavoidable:

4. `src/core/orbit/tle-loader.ts`

### 4.2 Minimal Sync Surface

Minimal wording/provenance/validator sync may touch:

1. `src/core/profiles/defaults-misc.ts`
2. `src/core/config/parameter-registry-foundation-data.ts`
3. `src/core/models/geometry.ts`
4. `src/core/models/model-bundle.ts`
5. `sdd/ntn-sim-core-ui-exposure-spec.md`
6. `sdd/ntn-sim-core-implementation-status.md`
7. `sdd/ntn-sim-core-profile-baselines.md`
8. `sdd/ntn-sim-core-paper-family-matrix.md`
9. `scripts/validate-model-bundle.ts`
10. any new dedicated truth-path validation script added for T1

---

## 5. What Stays Out of Scope

T1 must **not** expand into:

1. full per-tick engine SGP4 integration;
2. mixed-orbit planning;
3. dynamic-pool / catalog-pruning work;
4. runner/headless scalability work;
5. frozen contract changes;
6. `RunnerExposureApi` changes;
7. replay artifact shape or replay identity changes;
8. UI selector/exposure contract expansion;
9. donor pipeline import.

---

## 6. Do-Not-Touch List

1. frozen exposure/runtime contracts and `getProfileList()` semantics from `phase4-runtime-contract-sdd.md`
2. `RunnerExposureApi`
3. replay identity semantics and replay artifact invariants
4. UI selector ordering/labels beyond the minimal wording needed to keep runtime truth accurate
5. any mixed-orbit or larger-catalog planning surface

If a proposed implementation step forces changes outside this list, stop and re-scope first.

---

## 7. Validation Requirements

Existing gates that must stay green:

1. `npm run validate:profiles`
2. `npm run validate:runtime`
3. `npm run validate:contracts`
4. `npm run validate:orbit-parity`
5. `npm run validate:replay-manifest`
6. `npm run validate:stage`

T1 must also land two additional gates:

1. `VAL-RT-003`
   - proves validation-sized real-trace cache samples match `propagateSgp4()` / satellite.js at sampled ticks
2. `VAL-RT-004`
   - proves defaults, registry notes, UI exposure wording, implementation status, and validator assumptions all describe the same real-trace runtime truth without overstating per-tick SGP4

The validation shape is intentionally narrow:

- one truth-path parity gate
- one wording/provenance consistency gate
- no new scalability gate

---

## 8. Completion Boundary

T1 is complete only when all of the following are true:

1. the shipped real-trace runtime is truthfully describable again;
2. active wording no longer overstates per-tick `TLE/SGP4` behavior;
3. `VAL-RT-003` and `VAL-RT-004` are implemented and passing;
4. existing replay/contract/UI boundaries remain intact;
5. the repo still treats `real-trace scalability` as blocked unless separately re-promoted later.

Until then, this document is the active implementation authority for the narrow truth-path correction only.
