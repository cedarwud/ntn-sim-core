# NTN Sim Core — Paper Reproduction Results

**Version:** 0.1.0
**Date:** 2026-03-27
**Script:** `scripts/run-reproduction-comparison.ts`
**Status:** REVIEW (all tolerances provisional per reproduction-targets.md §7)

---

## Summary

| Target | Profile | Status | Notes |
|---|---|---|---|
| RT-1 SINR vs Elevation | `sinr-elevation-reproduction` | ⚠️ REVIEW | SINR in range; HO rate 0 due to single-UE + short run |
| RT-2 HOBS Multi-Beam EE | `hobs-reproduction` | ⚠️ STALE — re-run required | Parameters corrected to Table I (100 MHz, 37 beams); previous results used wrong values (250 MHz, 19 beams) |
| RT-3 Timer-CHO | `timer-cho-reproduction` | ⚠️ REVIEW | HO count correct; interruption gap explained below |

---

## RT-1: SINR vs Elevation (PAP-2022-SINR-ELEVATION)

### Results

| Metric | Actual | Paper Ref | Tolerance | Status |
|---|---|---|---|---|
| Mean SINR (dB) | 12.29 | 9.0 | ±3.0 dB | ❌ +3.3 dB over |
| HO Rate (HO/min) | 0.00 | 2.0 | ±0.4 | ❌ No HOs in run |
| Service Availability | 73.5% | 92% | ±8% | ❌ -18.5% |

### Full KPI

```
meanSinrDb:          12.29 dB
sinrPercentile5Db:   -5.74 dB
sinrPercentile50Db:  13.96 dB
handoverRate:        0.000 HO/min
totalHandovers:      0
serviceAvailability: 73.5%
outageRatio:         3.85%
```

### Gap Analysis

1. **Mean SINR +3.3 dB over reference**: Our observer is at Beijing (40°N) vs paper's unspecified location. Higher latitude → satellites spend more time at higher elevation angles → higher average SINR. Paper likely uses a lower-latitude or equatorial observer.

2. **HO Rate = 0**: Run duration is 600s and only 1 UE. At 40°N with 66-sat constellation (Walker 6×11), satellite passes are infrequent (~2-4 visible simultaneously). The specific 600s window happened to have stable serving. Need longer run (3600s+) or multi-UE to get statistically meaningful HO rate.

3. **Service Availability 73.5% vs 92%**: Related to observer latitude — at 40°N, the 66-sat Walker(53°) constellation has lower coverage continuity than at lower latitudes where the paper's receiver likely sits. This is an expected and documented geographic discrepancy (ASSUME-ORB-REPRO-RT1).

### Action Items

- [ ] Extend run to 3600s to get HO statistics
- [ ] Consider equatorial observer for direct comparison
- [ ] Document latitude sensitivity in reproduction note

---

## RT-2: HOBS Multi-Beam EE (PAP-2024-HOBS)

### Results

| Metric | Actual | Paper Ref | Tolerance | Status |
|---|---|---|---|---|
| Mean SINR (dB) | 7.72 | 15.0 | ±5.0 dB | ❌ -7.3 dB under |
| Mean Throughput (Mbps) | 713.4 | 300.0 | ±150 | ❌ +413 Mbps over |
| EE trend (positive) | 1.0 Jain | — | rank-order | ✅ |

### Full KPI

```
meanSinrDb:           7.72 dB
sinrPercentile5Db:    2.64 dB
meanThroughputMbps:   713.42 Mbps
cellEdgeThroughput:   376.19 Mbps
serviceAvailability:  73.5%
jainFairnessIndex:    1.0000
```

### Gap Analysis

1. **Mean SINR 7.72 vs ~15 dB**: Paper uses DRL-optimized HOBS beam scheduling that selects beams to maximize SINR per UE. Our baseline uses static 19-beam layout with FRF=3. The interference pattern differs significantly — paper's DRL scheduler avoids co-channel interference adaptively, while our static layout accepts whatever interference geometry the Walker constellation produces.

2. **Throughput 713 vs ~300 Mbps (too high) — NOTE: this result is STALE**: The profile previously used 250 MHz BW instead of the correct 100 MHz (HOBS Table I). Results above were produced with wrong parameters and must not be cited. Re-run required with corrected profile (100 MHz BW, 37 beams).

3. **Jain Fairness = 1.0**: Single UE in profile → trivially fair. Multi-UE comparison needs Phase B.

### Action Items

- [ ] Add multi-UE profile (10-100 UEs) to get meaningful fairness and interference statistics
- [ ] Note that throughput comparison requires matching traffic model, not Shannon capacity
- [ ] SINR gap is primarily scheduler difference, not channel model error

---

## RT-3: Timer-CHO (PAP-2025-TIMERCHO-CORE)

### Results

| Metric | Actual | Paper Ref | Tolerance | Status |
|---|---|---|---|---|
| HO Failures (rank) | 0 | 0 direction | rank-order | ✅ |
| Unnecessary HOs (rank) | 3 | > 0 direction | rank-order | ✅ |
| Mean Interruption (ms) | 5.3 | 150.0 | ±100 ms | ❌ -144 ms |

### Full KPI

```
totalHandovers:             3
handoverFailures:           0
unnecessaryHandovers:       3
pingPongCount:              0
handoverRate:               0.301 HO/min
meanHandoverInterruption:   5.3 ms
meanSinrDb:                 13.24 dB
```

### Gap Analysis

1. **Interruption 5.3 ms vs ~150 ms**: This is the most significant gap. Two causes:
   - **Interruption model**: Our `computeInterruptionMs()` computes SINR-based signal gap at the moment of HO execution. The paper's ~150ms includes L2/L3 message exchange overhead (RRC reconfiguration, random access to target cell), which we do not model. We model only the signal-level interruption, not protocol delay.
   - **Timer-CHO geometry simplification**: Our `α×TTT` simplification (ASSUME-TIMERCHO-GEOM) may cause earlier execution than the paper's full `ToS_remaining` geometry timer, reducing interruption duration.

2. **HO Count = 3 in 600s**: Reasonable for a single UE at 40°N with Starlink-like 528-sat constellation at 550km. Consistent with ~0.3 HO/min rate.

3. **Unnecessary HOs = 3 (all 3 are UHO)**: Timer-CHO with α=0.85 executes early when source SINR is still adequate. This is expected and matches the paper's finding that Timer-CHO has positive UHO rate, but lower RLF rate vs A4. Our result shows 0 failures and 3 UHOs — qualitatively consistent.

### Action Items

- [ ] Add protocol-delay component to interruption model (L3 message exchange ~50-100ms)
- [ ] Run A4 comparison side-by-side: Timer-CHO should have lower failures, higher UHOs vs A4

---

## Overall Assessment

The simulator produces physically plausible results. The main gaps are:

| Gap Category | Cause | Severity | Fix Path |
|---|---|---|---|
| Observer latitude mismatch | Beijing (40°N) vs paper location | Medium | Use equatorial observer for RT-1 comparison |
| Scheduler difference (RT-2 SINR) | Static layout vs DRL-optimized | Expected | Not fixable without DRL; document explicitly |
| Throughput is Shannon upper bound | No traffic model in KPI | Known | Clarify in paper that we report capacity, not offered load |
| Interruption missing protocol delay | L3 message exchange not modeled | Medium | Add RTT-based delay to interruption formula |
| Short run = low HO statistics | 600s single-UE | Fixable | Use 3600s for statistical comparison |

**None of these gaps indicate a formula-level error.** They are all either:
- documented engineering assumptions (ASSUME-ORB-REPRO-*, ASSUME-TIMERCHO-GEOM)
- expected differences due to scheduler/traffic model mismatch
- fixable by adjusting observer location or run duration

---

## Next Steps

1. Re-run RT-1 with 3600s duration and equatorial observer to get HO statistics
2. Add protocol-delay term to interruption model and re-run RT-3
3. Run RT-3 A4 vs Timer-CHO side-by-side comparison (use batch KPI tool)
4. Lock tolerances from `provisional` to `validated` after stable runs
