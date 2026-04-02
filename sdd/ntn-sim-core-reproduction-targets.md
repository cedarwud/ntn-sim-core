# NTN Sim Core — Reproduction Targets

**Version:** 0.3.0
**Date:** 2026-03-27
**Status:** Active — dedicated reproduction profiles landed; current results remain review/provisional
**Purpose:** Define reference paper reproduction targets, profile mappings, tolerance thresholds, and comparison workflows for validating ntn-sim-core against published results.

---

## 1. Scope

This document selects 3 reference papers for reproduction and defines the exact comparison methodology. It bridges the gap between "formulas pass unit tests" and "simulator output matches published literature."

Each reproduction target has:
1. a source paper with explicit parameters;
2. either a dedicated reproduction profile in `src/core/profiles/` or a documented baseline-plus-override mapping;
3. a metric, comparison mode, and tolerance;
4. documented assumptions where source parameters are incomplete.

**Current status note:** dedicated reproduction profiles now exist for all 3 targets: `sinr-elevation-reproduction`, `hobs-reproduction`, and `timer-cho-reproduction`. The last recorded comparison snapshot was archived to `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-reproduction-results.md`; fresh reruns should produce new experiment artifacts rather than treating that snapshot as active authority. As of 2026-04-02, the current active paper-evidence follow-on is `TP1` (`sdd/modqn-targeted-parity-outline.md`), which may extend this document with a current-anchor MODQN parity target instead of treating the existing 3-target list as the final long-term ceiling.

---

## 2. Reference Paper Selection

| # | Paper ID | Title Focus | Family | Why Selected |
|---|---|---|---|---|
| 1 | PAP-2022-SINR-ELEVATION | SINR vs elevation angle, multi-beam interference | FAM-ACCESS-SYNTH | canonical SINR reference, Table III has explicit parameters |
| 2 | PAP-2024-HOBS | HOBS beam scheduling, multi-beam EE | FAM-MB-HOBS-SYNTH | target-topic paper, explicit 37-beam Ka-band setup (Table I) |
| 3 | PAP-2025-TIMERCHO-CORE | Timer-CHO handover, geometry-assisted | FAM-ACCESS-SYNTH | CHO validation, explicit RLF/UHO metrics |

---

## 3. Reproduction Target 1: SINR vs Elevation (PAP-2022-SINR-ELEVATION)

### 3.1 Source Parameters

| Parameter | Value | Source |
|---|---|---|
| Constellation | Walker(53°, 66, 6, F=1) | Paper Table I |
| Altitude | 600 km | Paper Table I |
| Frequency | 2 GHz (S-band) | Paper Table II |
| Bandwidth | 30 MHz | Paper Table II |
| EIRP density | 34 dBW/MHz | Paper Table II |
| Beam model | 3GPP TR 38.821 (rpsat-3gpp) | Paper §III |
| Beam diameter | 50 km | Paper Table II |
| Beams per satellite | 19 (FRF=1) | Paper Table II |
| Shadow fading | 3GPP TR 38.811 suburban S-band | Paper §III |
| Noise temperature | 290 K | Paper Table II |
| Handover | A4-event, TTT=640ms, threshold=-6dB | Paper §IV |

### 3.2 Reproduction Profile

Use dedicated profile `sinr-elevation-reproduction`.
- Derived from `case9-access-baseline`
- Locks 600 km altitude, 30 MHz bandwidth, 19-beam FRF=1, and the Table II RF assumptions into one seed-fixed profile
- Latest historical result bundle is archived at `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-reproduction-results.md`

### 3.3 Comparison Metric

| Metric | Paper Reference | Comparison Mode | Tolerance |
|---|---|---|---|
| Mean SINR vs elevation (10°–90°) | Paper Fig. 4 | Curve comparison (digitized) | ±3 dB |
| SINR CDF at 30° elevation | Paper Fig. 5 | CDF shape comparison | rank-order |
| HO rate (events/min) | Paper Table III | absolute | ±20% |

### 3.4 Tolerances Rationale

- ±3 dB SINR: accounts for different interference geometry (exact satellite positions vary by epoch), shadow fading realization, and any simplifications in our beam model vs paper.
- ±20% HO rate: paper uses different UE distribution and potentially different measurement reporting model.
- These are `provisional` tolerances per reproduction-protocol.md §5.

### 3.5 Known Assumptions

1. Paper's exact satellite positions at simulation epoch are not reproduced (Walker F=1 used).
2. The dedicated profile currently uses the deterministic repo observer (`BEIJING_OBSERVER`); the paper's receiver location is unspecified.
3. Paper may use slightly different beam gain normalization.
4. Our shadow fading uses Box-Muller sampling; paper's RNG is unspecified.

---

## 4. Reproduction Target 2: HOBS Multi-Beam EE (PAP-2024-HOBS)

### 4.1 Source Parameters

| Parameter | Value | Source |
|---|---|---|
| Constellation | Walker(55°, 72, 6, F=1) | Paper §IV |
| Altitude | 550 km | Paper §IV |
| Frequency | 28 GHz (Ka-band) | Paper §IV |
| Bandwidth | 100 MHz | Paper Table I |
| Beams per satellite | 37 | Paper Table I |
| FRF | 3 | Paper §IV |
| Beam gain | Bessel-J1 | Paper §III |
| Active power per beam | 20 W | Assumption-backed (`ASSUME-ENERGY-001`), not directly confirmed from HOBS |
| Idle power | 5 W | Assumption-backed (`ASSUME-ENERGY-001`), not directly confirmed from HOBS |
| Shadow fading | Ka-band suburban | 3GPP TR 38.811 |
| Atmospheric loss | enabled | Ka-band requirement |

### 4.2 Reproduction Profile

Use dedicated profile `hobs-reproduction`.
- Derived from `hobs-multibeam-baseline`
- Locks 550 km orbit, 28 GHz, 100 MHz (Table I), 37 beams (Table I) with FRF=3, and EE Layer 1 for the comparison bundle
- Latest historical result bundle is archived at `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-reproduction-results.md`

### 4.3 Comparison Metric

| Metric | Paper Reference | Comparison Mode | Tolerance |
|---|---|---|---|
| Avg throughput per beam (Mbps) | Paper Fig. 6 | absolute | ±25% |
| Energy efficiency (bps/W) | Paper Fig. 7 | trend direction | rank-order |
| Active beam ratio | Paper Fig. 8 | absolute | ±15% |

### 4.4 Known Assumptions

1. Paper uses DRL-optimized beam scheduling; we use generic round-robin/max-demand baselines. Absolute throughput will differ — comparison is about channel model parity, not scheduling optimality.
2. Paper's exact traffic model is LSTM-predicted; we use Poisson/full-buffer.

---

## 5. Reproduction Target 3: Timer-CHO (PAP-2025-TIMERCHO-CORE)

### 5.1 Source Parameters

| Parameter | Value | Source |
|---|---|---|
| Constellation | Starlink-like (550km, 72 planes) | Paper §IV |
| Frequency | 2 GHz (S-band) | Paper §IV |
| Handover type | Timer-CHO | Paper §III |
| CHO α (geometry weight) | 0.85 | Paper Table I |
| L3 filter k | 4 | Paper Table I |
| TTT | 640 ms | Paper Table I |
| CHO offset | 0 dB | Paper Table I |

### 5.2 Reproduction Profile

Use dedicated profile `timer-cho-reproduction`.
- Derived from the access-baseline family with a reproduction-specific 550 km Starlink-like proxy (`24 x 22` Walker shell)
- Locks Timer-CHO parameters `α = 0.85`, `L3 filter k = 4`, `TTT = 640 ms`, `offset = 0 dB`
- Latest historical result bundle is archived at `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-reproduction-results.md`

### 5.3 Comparison Metric

| Metric | Paper Reference | Comparison Mode | Tolerance |
|---|---|---|---|
| RLF rate (failures/UE/min) | Paper Fig. 9 | trend: Timer-CHO < A4 | rank-order |
| UHO rate (unnecessary HO %) | Paper Fig. 10 | trend: Timer-CHO < A4 | rank-order |
| Avg interruption time (ms) | Paper Table III | relative | ±30% |

### 5.4 Known Assumptions

1. Paper's geometry timer uses full beam geometry (ToS_remain); our Timer-CHO simplifies to α×TTT. This may affect absolute RLF reduction ratio.
2. The dedicated profile uses a `24 x 22` synthetic Walker proxy for the paper's Starlink-like constellation; the paper does not mandate exact shell phasing in an implementation-ready form.
3. The current reproduction run is a deterministic single-UE profile, not the paper's 1000-UE Monte Carlo study.

---

## 6. Execution Workflow

### Step 1: Profile Alignment

Verify the dedicated reproduction profiles and their metadata:
```
node --import tsx scripts/validate-profiles.mjs
node --import tsx scripts/audit-profiles.ts
```

### Step 2: Benchmark Run

Run the batch comparison workflow:
```
npx tsx scripts/run-reproduction-comparison.ts
```

Output: per-target KPI comparison tables plus a fresh result artifact bundle; the old snapshot is archived at `archive/ntn-sim-core-sdd-history-2026-03-29/ntn-sim-core-reproduction-results.md`.

### Step 3: Comparison

1. Extract paper reference data (digitized from figures or from tables).
2. Compute comparison metrics from benchmark KPI bundle.
3. Check against tolerance thresholds.
4. Record result with claim level and disclosure notes.

### Step 4: Artifact Bundle

Per reproduction-protocol.md §3, each comparison produces:
- run manifest
- resolved config
- source-trace bundle
- KPI comparison table
- reproduction note

---

## 7. Tolerance Status Summary

| Target | Metric | Tolerance Status | Blocker |
|---|---|---|---|
| RT-1 SINR vs elevation | ±3 dB | `provisional` | none (C1, M2, M8 fixed) |
| RT-1 HO rate | ±20% | `provisional` | none (C2 fixed) |
| RT-2 throughput | ±25% | `provisional` | scheduler is generic baseline, not paper-optimal |
| RT-2 EE trend | rank-order | `provisional` | none |
| RT-3 RLF trend | rank-order | `provisional` | Timer-CHO simplified geometry |
| RT-3 UHO trend | rank-order | `provisional` | Timer-CHO simplified geometry |

All tolerances are `provisional` per reproduction-protocol.md §5. They can advance to `locked` after stable repeated comparisons.
