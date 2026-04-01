# Real-Trace Truth-Path Correction Preflight Note

**Status:** Completed preflight decision record — not implementation authority
**Date:** 2026-04-01
**Depends on:** Platform Refactor complete, Phase 4 frozen contracts intact, current real-trace path re-audited against code
**Motivation:** the 2026-04-01 reviewer-grade rerun found current real-trace wording/runtime drift: OMM/TLE records are converted into generic `OrbitElement[]`, cache construction uses the generic non-GEO propagation path, while several shipped docs still describe the surface as `TLE/SGP4` runtime
**Preflight verdict:** `go-with-tight-scope`
**Successor active surface:** `real-trace-truth-path-correction-outline.md`

---

## 1. Purpose

This note exists to answer one question before any new orbit follow-on is promoted:

**Does `ntn-sim-core` need a dedicated real-trace truth-path correction follow-on before any mixed-orbit or larger-catalog work is even considered?**

It is intentionally a **preflight-only** surface. It does **not** authorize code changes by itself.

---

## 2. What This Preflight Is About

This preflight is about:

1. determining whether the current shipped real-trace path is described truthfully by the active authority set;
2. determining whether the required fix is wording-only, runtime-path-only, or both;
3. identifying the smallest safe landing zone for any future correction follow-on;
4. deciding whether real-trace scalability work must remain blocked until this question is closed.

This preflight is **not** about:

1. reopening mixed-orbit / larger-catalog scalability work;
2. importing donor pipeline stages into `ntn-sim-core`;
3. changing replay identity, KPI truth, or frozen contracts;
4. starting `OMNeT++` consumer integration;
5. creating a new UI or artifact surface.

---

## 3. Current Trigger Evidence

Known facts from the current tree and the 2026-04-01 rerun:

1. the real-trace branch currently loads OMM/TLE records, converts them to SatRecs, then returns generic `OrbitElement[]`;
2. trajectory-cache construction currently propagates non-GEO entries through the generic cache path;
3. `propagateSgp4()` exists, but the current shipped runtime path does not obviously route per-tick real-trace propagation through it;
4. several active docs and user-facing labels still describe the surface as `TLE/SGP4` runtime;
5. the repo therefore has a potential **truth-path drift**, not just a future scalability question.

This note does not itself decide whether the current path is acceptable. It exists to force that decision explicitly before any larger follow-on is promoted.

---

## 4. Questions The Preflight Must Answer

1. Is the current shipped surface truthfully described as `TLE/SGP4` runtime, or only as OMM/TLE-backed real-trace ingest plus the current cache-based propagation path?
2. Is the required correction:
   - documentation/labeling only,
   - runtime-path only,
   - or both?
3. If a correction follow-on is justified, what is the smallest safe ownership area?
4. Which existing validation evidence must be preserved or extended?
5. Which surfaces must remain untouched while this question is resolved?

---

## 5. Allowed Investigation Surface

Preflight investigation may inspect:

1. `src/core/orbit/profile-runtime.ts`
2. `src/core/orbit/trajectory-cache.ts`
3. `src/core/orbit/propagation.ts`
4. `src/core/orbit/sgp4-adapter.ts`
5. `src/core/orbit/tle-loader.ts`
6. `src/core/profiles/defaults-misc.ts`
7. `src/core/config/parameter-registry-foundation-data.ts`
8. `src/core/models/geometry.ts`
9. `src/core/models/model-bundle.ts`
10. `sdd/ntn-sim-core-ui-exposure-spec.md`
11. `sdd/ntn-sim-core-implementation-status.md`
12. the relevant orbit/replay validation scripts

If a later correction follow-on is promoted, the preferred implementation landing zone is expected to stay near:

1. `src/core/orbit/profile-runtime.ts`
2. `src/core/orbit/trajectory-cache.ts`
3. `src/core/orbit/sgp4-adapter.ts`
4. minimal label/provenance wording sync under `profiles/` / `config/`
5. minimal validation/doc sync

---

## 6. Forbidden Expansion During Preflight

Preflight must **not**:

1. reopen `src/core/contracts/*`;
2. change `RunnerExposureApi`;
3. alter replay identity semantics or benchmark artifact meaning;
4. start dynamic-pool / catalog-pruning work;
5. start mixed-orbit planning work;
6. couple UI to runtime internals;
7. treat donor pipeline structure as drop-in architecture.

---

## 7. Required Evidence

A reviewer-grade preflight should produce:

1. a clear verdict:
   - `no-go`
   - `go-with-tight-scope`
   - `go`
2. an explicit statement on whether current `TLE/SGP4` wording must be downgraded immediately;
3. an explicit statement on whether a narrow runtime-path correction should be promoted;
4. a minimal safe ownership proposal;
5. a do-not-touch list for frozen contracts, replay identity, and UI boundaries;
6. a proposed acceptance set for any later promoted correction group.

---

## 8. Promotion Boundary

This note is no longer the implementation entry surface. The active implementation authority now lives in `real-trace-truth-path-correction-outline.md`.

This note remains:

- a planning artifact,
- a scope guard,
- and a decision aid for whether the repo should correct current real-trace wording/runtime claims before reopening anything larger.
