# Real-Trace Scalability Preflight Note

**Status:** Deferred preflight candidate only — not implementation authority
**Date:** 2026-04-01
**Depends on:** Platform Refactor complete, downstream architecture complete, frozen contracts intact
**Motivation:** future `OMNeT++` consumer work may require mixed `LEO / MEO / GEO` satellite sets and larger real-trace catalogs than the current validation-sized envelope
**Current disposition (2026-04-01 rerun):** `no-go`; do not promote until `real-trace-truth-path-correction-outline.md` is either completed or explicitly declined

---

## 1. Purpose

This note exists to answer one question before any new implementation starts:

**Does `ntn-sim-core` need a dedicated real-trace scalability follow-on for larger mixed-orbit catalogs, and if so, what is the smallest safe landing zone?**

It is intentionally a **preflight-only** surface. It does **not** authorize code changes by itself.

---

## 2. What This Preflight Is About

This preflight is about:

1. assessing whether future mixed-orbit `OMNeT++` integration will outgrow the current real-trace pipeline;
2. determining whether a donor-informed dynamic pool / catalog-pruning step is justified;
3. identifying the smallest safe ownership area for any future follow-on.

This preflight is **not** about:

1. redoing `LEO / MEO / GEO` support from scratch;
2. changing orbit truth or replay truth;
3. reopening frozen contracts;
4. starting `estnet`;
5. directly importing donor pipeline structure into `ntn-sim-core`.

---

## 3. Current Baseline

Known facts in the current tree:

1. `real-trace-validation` already exists and proves the current shipped real-trace ingest/replay path runs inside a validation-sized envelope.
2. The current validation-sized envelope remains intentionally small:
   - `real-trace-validation` uses `tleMaxSatellites: 50`.
3. Synthetic cross-orbit baselines already exist:
   - `meo-constellation-baseline`
   - `geo-relay-baseline`
4. `runner/curation/` already provides deterministic replay-window selection for readability and replay parity.
5. The current tree therefore proves:
   - runnable real-trace ingest within a small validation envelope,
   - deterministic curation/replay behavior,
   - availability of synthetic `MEO/GEO` baselines,
   but **does not yet prove** either SGP4-faithful runtime truth-path closure or large-catalog mixed-orbit scalability.

The most relevant donor idea is `ntn-stack` Stage-6-style dynamic pool reduction. It is inspiration only, not authority.

---

## 4. Questions The Preflight Must Answer

1. For likely future `OMNeT++` mixed-orbit needs, is the current validation-sized real-trace path enough?
2. If not, where is the first meaningful bottleneck?
   - TLE ingestion
   - trajectory cache construction
   - pass ranking / replay selection
   - benchmark runner throughput
   - browser-visible replay loading
3. Does the problem require a true dynamic candidate-satellite pool, or only better curation / cache / runner planning?
4. What is the smallest safe implementation surface if this follow-on is promoted?
5. What must remain untouched to preserve current correctness claims?

---

## 5. Allowed Investigation Surface

Preflight investigation may inspect:

1. `src/runner/curation/`
2. `src/runner/headless/`
3. `src/core/orbit/trajectory-cache.ts`
4. `src/core/orbit/tle-loader.ts`
5. `src/core/orbit/sgp4-adapter.ts`
6. existing real-trace profiles and replay manifests
7. donor reference material from `project/ntn-stack*`

If a later follow-on is promoted, the preferred implementation landing zone is still expected to stay near:

1. `src/runner/curation/`
2. `src/runner/headless/`
3. minimal orbit planning helpers under `src/core/orbit/`

---

## 6. Forbidden Expansion During Preflight

Preflight must **not**:

1. modify `src/core/contracts/*`;
2. change `RunnerExposureApi`;
3. alter simulator truth for orbit propagation, handover, KPI, or replay identity;
4. introduce new consumer adapters;
5. couple UI to donor-specific internals;
6. treat donor pipeline stages as a drop-in architecture for `ntn-sim-core`.

---

## 7. Required Evidence

A reviewer-grade preflight should produce:

1. a clear verdict:
   - `no-go`
   - `go-with-tight-scope`
   - `go`
2. current-state evidence for where the likely bottleneck sits;
3. an explicit statement on whether future mixed-orbit `OMNeT++` needs make this follow-on likely or optional;
4. a minimal safe ownership proposal;
5. a do-not-touch list for frozen contracts and replay truth;
6. a proposed acceptance set for any future promoted implementation group.

---

## 8. Promotion Boundary

This note becomes implementation-relevant only if all of the following happen:

1. the user explicitly reopens real-trace scalability work;
2. the narrower `real-trace-truth-path-correction-outline.md` surface is already closed or explicitly declined;
3. preflight evidence concludes `go-with-tight-scope` or `go`;
4. the follow-on is rewritten into an implementation-ready active SDD surface;
5. corresponding `todo/` prompts are updated for that promoted surface.

Until then, this note remains:

- a planning artifact,
- a scope guard,
- and a decision aid for future mixed-orbit work.
