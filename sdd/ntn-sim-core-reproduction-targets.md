# NTN Sim Core — Reproduction Targets

**Version:** 0.2.0
**Date:** 2026-03-25
**Status:** Active
**Purpose:** Define reference paper reproduction targets, profile mappings, tolerance thresholds, and comparison workflows for validating ntn-sim-core against published results.

---

## 1. Scope

This document selects 3 reference papers for reproduction and defines the exact comparison methodology. It bridges the gap between "formulas pass unit tests" and "simulator output matches published literature."

Each reproduction target has:
1. a source paper with explicit parameters;
2. either a dedicated reproduction profile in `src/core/profiles/` or a documented baseline-plus-override mapping;
3. a metric, comparison mode, and tolerance;
4. documented assumptions where source parameters are incomplete.

**Current status note:** dedicated reproduction-specific profiles are not all created yet. The current workflow uses existing canonical baselines plus explicit overrides until those dedicated profiles are added.

---

## 2. Reference Paper Selection

| # | Paper ID | Title Focus | Family | Why Selected |
|---|---|---|---|---|
| 1 | PAP-2022-SINR-ELEVATION | SINR vs elevation angle, multi-beam interference | FAM-ACCESS-SYNTH | canonical SINR reference, Table III has explicit parameters |
| 2 | PAP-2024-HOBS | HOBS beam scheduling, multi-beam EE | FAM-MB-HOBS-SYNTH | target-topic paper, explicit 19-beam Ka-band setup |
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

Use `case9-access-baseline` with overrides:
- Verify altitude_km = 600
- Verify all RF parameters match Table II
- Enable tier1-3, disable tier4 (S-band)

**Profile status:** no dedicated `sinr-elevation-reproduction` profile exists yet; current reproduction uses the canonical baseline plus overrides.

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
2. Paper may use slightly different beam gain normalization.
3. Our shadow fading uses Box-Muller sampling; paper's RNG is unspecified.

---

## 4. Reproduction Target 2: HOBS Multi-Beam EE (PAP-2024-HOBS)

### 4.1 Source Parameters

| Parameter | Value | Source |
|---|---|---|
| Constellation | Walker(55°, 72, 6, F=1) | Paper §IV |
| Altitude | 550 km | Paper §IV |
| Frequency | 28 GHz (Ka-band) | Paper §IV |
| Bandwidth | 250 MHz | Paper §IV |
| Beams per satellite | 19 | Paper §IV |
| FRF | 3 | Paper §IV |
| Beam gain | Bessel-J1 | Paper §III |
| Active power per beam | 20 W | Paper Table II |
| Idle power | 5 W | Paper Table II |
| Shadow fading | Ka-band suburban | 3GPP TR 38.811 |
| Atmospheric loss | enabled | Ka-band requirement |

### 4.2 Reproduction Profile

Use `hobs-multibeam-baseline` with overrides:
- Verify frequency_ghz = 28
- Enable tier1-5 (full channel model)
- EE L1 enabled

**Profile status:** no dedicated `hobs-reproduction` profile exists yet; current reproduction uses the canonical baseline plus overrides.

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

Use `case9-access-baseline` with overrides:
- `handover.type = 'timer-cho'`
- `handover.cho_alpha = 0.85`
- `handover.cho_filter_k = 4`
- `handover.cho_offset_db = 0`

**Profile status:** no dedicated `timer-cho-reproduction` profile exists yet; current reproduction uses the canonical baseline plus overrides.

### 5.3 Comparison Metric

| Metric | Paper Reference | Comparison Mode | Tolerance |
|---|---|---|---|
| RLF rate (failures/UE/min) | Paper Fig. 9 | trend: Timer-CHO < A4 | rank-order |
| UHO rate (unnecessary HO %) | Paper Fig. 10 | trend: Timer-CHO < A4 | rank-order |
| Avg interruption time (ms) | Paper Table III | relative | ±30% |

### 5.4 Known Assumptions

1. Paper's geometry timer uses full beam geometry (ToS_remain); our Timer-CHO simplifies to α×TTT. This may affect absolute RLF reduction ratio.
2. Paper runs 1000 UE Monte Carlo; our multi-UE Phase A uses shared serving.

---

## 6. Execution Workflow

### Step 1: Profile Alignment

For each target, create a dedicated reproduction profile, or until then verify the documented baseline-plus-override mapping:
```
node scripts/validate-profile-layout.mjs  # verify profile structure
```

### Step 2: Benchmark Run

```
node scripts/benchmark-runner.mjs --profile <profile> --seed 42 --duration 600
```

Output: KPI bundle (SINR timeseries, HO events, EE metrics).

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
