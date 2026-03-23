# NTN Sim Core — Academic Remediation Plan

**Version:** 0.2.0
**Date:** 2026-03-21
**Status:** Draft (expanded with physics model gaps and methodology gaps)
**Purpose:** Identify and track all gaps that prevent ntn-sim-core from meeting academic peer-review standards for a LEO multi-beam handover + energy efficiency paper.

---

## 1. Scope

This document supplements (does not replace) the existing SDD set. It was created after a full audit of the implemented codebase against:

1. the 54-paper catalog (especially PAP-2022-SINR-ELEVATION, PAP-2021-SHADOWED-RICIAN, PAP-2024-HOBS, PAP-2024-MCCHO-CORE, PAP-2025-TIMERCHO-CORE, PAP-2025-DAPS-CORE)
2. 3GPP TR 38.811 / TR 38.821 channel and antenna standards
3. the existing SDD claims (roadmap, validation matrix, implementation status)
4. working implementations in 4 donor projects (leo-beam-sim, beamHO-bench, leo-simulator, ntn-stack)

---

## 2. Status Corrections

The following implementation-status claims are inaccurate and must be corrected:

| Phase | Claimed Status | Actual Status | Reason |
|---|---|---|---|
| 2 | complete | **incomplete** | CHO and MC-HO baselines not implemented (SDD §9.3 requires them) |
| 3 | complete | **incomplete** | Tier 4 atmospheric loss returns 0 even when enabled; Ka-band profiles use S-band fading tables |
| 5 | complete | **incomplete** | BH scheduler has no paper-specific algorithm; Energy L2 solar model ignores beta angle |
| 6 | complete | **mostly complete** | DAPS combining method is selection (max) not MRC; comment misattributes paper |

---

## 3. Critical Findings (Must Fix Before Any Paper Submission)

### C1. Inter-satellite interference uses wrong path loss

**Location:** `src/core/channel/sinr.ts` lines 58-61, `src/core/engine.ts` Phase 3 path

**Problem:** `computeSinr()` applies the serving satellite's path loss to all interfering satellites. Each interfering satellite has a different slant range and therefore a different FSPL. Using the serving link's path loss for interference overestimates interference from distant satellites and underestimates it from nearby ones.

**Correct approach:** Each interferer should use its own `distanceKm` → `computeFspl(interferer.rangeKm, freq)` for its own path loss contribution.

**Fix plan:**
1. Change `computeSinr()` interface: `interferingBeamGainsDb` → `interferingSignals: Array<{ beamGainDb: number; pathLossDb: number; shadowFadingDb: number; clutterLossDb: number }>`
2. Each interference term: `iPowerDbm = txEirpDbm + iGainDb - iPathLossDb - iShadowDb - iClutterDb`
3. Update engine.ts Phase 2 and Phase 3 paths to pass per-interferer channel results

**Donor reference:** beamHO-bench `src/sim/channel/link-budget.ts` computes per-beam interference with individual path losses.

**Validation:** After fix, SINR should vary more with satellite geometry. Golden case: two satellites at 30° and 70° elevation should produce different interference contributions.

**Severity:** CRITICAL
**Effort:** Medium (interface change + engine update)
**Status:** ✅ Fixed (2026-03-23). `SinrComputeOptions` changed to `InterferingSignal[]` with per-interferer `pathLossDb`, `shadowFadingDb`, `clutterLossDb`. Engine Phase 2 and Phase 3 paths updated. VAL-SINR-002 added and passing.

---

### C2. Missing CHO and MC-HO handover baselines

**Location:** `src/core/handover/manager.ts`, `src/core/handover/baselines.ts`

**Problem:** SDD §9.3 requires CHO (Conditional Handover) and MC-HO (Multi-Connectivity Handover). The `HandoverType` union includes `'cho'`, `'mc-ho'`, `'timer-cho'` but `createBaselineFromConfig()` falls through to A4 for all of these. Papers PAP-2024-MCCHO-CORE and PAP-2025-TIMERCHO-CORE cannot be reproduced.

**CHO definition (3GPP):** Network sends a conditional HO command to UE in advance. UE autonomously executes when the condition is met, without waiting for a new measurement report round-trip. This reduces interruption time.

**Timer-CHO definition (PAP-2025-TIMERCHO-CORE):** CHO with a geometry-based timer. The timer starts when the satellite enters a coverage zone; when it expires, the UE checks A3 condition and executes if met.

**MC-HO definition (PAP-2024-MCCHO-CORE):** UE maintains dual connectivity to source and target during handover, with packet duplication. Similar to DAPS but at a different protocol layer.

**Fix plan:**
1. Implement `createChoBaseline(config)` — CHO state machine: idle → attached → cho-prepared → cho-executing → attached
2. Implement `createTimerChoBaseline(config)` — adds geometric timer to CHO trigger
3. Implement `createMchoBaseline(config)` — extends CHO with dual-connectivity phase
4. Wire all into `createBaselineFromConfig()` dispatch

**Donor reference:** beamHO-bench `src/sim/handover/` has CHO + MC-HO with full and simplified modes.

**Validation:** VAL-HO-002 (trigger reasons in event traces) must show CHO-specific events.

**Severity:** CRITICAL
**Effort:** High (3 new state machines)
**Status:** ✅ Fixed (2026-03-23). Created `cho.ts` (CHO + Timer-CHO with L3 IIR filter, geometry-assisted timer, cho-prepared/cho-execute events) and `mc-ho.ts` (MC-HO with dual-connectivity, mc-ho-dual-start/dual-end events). baselines.ts dispatches correctly. VAL-HO-003 and VAL-HO-004 passing.

---

### C3. Single-UE model cannot produce multi-user KPIs

**Location:** `src/core/engine.ts` line 48

**Problem:** Engine hardcodes `const UE_ID = 'ue-0'` and simulates exactly one UE at the observer location. Profile `ueConfig.count: 100` is declared but never used. This makes Jain's fairness index, cell-edge throughput (5th percentile), and per-UE handover rate meaningless.

**Fix plan:**
1. Generate multiple UEs: distribute N UEs within the serving beam footprint(s) based on `ueConfig.distribution`
2. Each UE gets its own position offset → different off-axis angle → different SINR
3. Run handover independently per UE (or use a simplified shared-serving model)
4. KPI accumulator already supports per-UE tracking (`recordSinr(ueId, ...)`)

**Complexity note:** Full multi-UE with independent handover per UE is expensive (N × candidates evaluations per tick). A phased approach:
- Phase A: N UEs with different off-axis angles but shared serving satellite (same HO decisions)
- Phase B: Independent HO per UE (full model)

**Donor reference:** No donor has full multi-UE in the frontend. beamHO-bench's engine conceptually supports it but also runs single-UE in practice.

**Validation:** With 10 UEs at different off-axis angles, SINR distribution should show spread (not all identical). Jain fairness < 1.0.

**Severity:** CRITICAL
**Effort:** High (engine architecture change)

---

## 4. Major Findings (Should Fix for Credible Publication)

### M1. Walker F parameter not configurable

**Location:** `src/core/orbit/walker.ts` line 41

**Problem:** Phase offset `planePhaseOffset = (TWO_PI * p) / totalSats` hardcodes Walker F=1. Different F values change ground track pattern.

**Fix:** Add `phasingFactor` to `WalkerShell` interface. Formula: `planePhaseOffset = (TWO_PI * p * F) / totalSats`.

**Effort:** Low

---

### M2. Beam gain θ_3dB nadir-only approximation

**Location:** `src/core/channel/beam-gain.ts` line 97

**Problem:** `theta3dbRad = atan(beamDiameterKm / (2 * altitudeKm))` assumes satellite directly overhead. For off-nadir beams, the angular subtension changes due to slant geometry.

**Fix:** Use `theta3dbRad = atan(beamDiameterKm / (2 * slantRangeKm))` where slant range is passed as input.

**Donor reference:** leo-beam-sim `beam-gain.ts` uses a similar approach but with beamwidth directly from profile.

**Effort:** Low
**Status:** ✅ Fixed (2026-03-23). `BeamGainInput` now has optional `slantRangeKm`; all engine call sites pass it.

---

### M3. Shadow fading table only covers suburban S-band

**Location:** `src/core/channel/shadow-fading.ts`

**Problem:** Ka-band profiles (HOBS, BH) use the same S-band suburban table. 3GPP TR 38.811 provides separate tables for different frequency bands and environments.

**Fix:**
1. Add Ka-band shadow fading parameters (3GPP TR 38.811 Table 6.6.2-1)
2. Parameterize by frequency band and environment
3. Profile selects the correct table

**Effort:** Medium

---

### M4. Tier 4 atmospheric loss always returns 0

**Location:** `src/core/channel/link-budget.ts` line 71

**Problem:** `const atmosphericDb = tier4Atmospheric ? 0 : 0` — placeholder never implemented. Ka-band rain attenuation can be 3-20 dB.

**Fix:** Implement ITU-R P.618 / P.676 simplified model or transfer from leo-beam-sim `path-loss.ts` (atmospheric absorption + scintillation).

**Donor reference:** leo-beam-sim has atmospheric and scintillation loss functions. orbit-engine uses official ITU-Rpy.

**Effort:** Medium

---

### M5. DAPS combining method incorrect

**Location:** `src/core/engine.ts` lines 487-488

**Problem:** Uses `Math.max(source, target)` (selection combining) but comment says "max-ratio combining". PAP-2025-DAPS-CORE does not specify MRC.

**Fix:**
1. Change comment to "selection combining (SC)" and cite correctly
2. Optionally add MRC: `10*log10(10^(s1/10) + 10^(s2/10))`
3. Make combining method configurable in DapsConfig

**Effort:** Low
**Status:** ✅ Fixed (2026-03-23). Comment corrected to "selection combining (SC)" with proper attribution.

---

### M6. BH scheduler — acknowledged baseline limitation

**Status:** Documented. The 4 generic strategies (round-robin, max-demand, power-aware, deterministic-fixed) serve as baselines for comparing against paper-specific algorithms. This is acceptable if the paper positions them as baselines, not as reproductions of specific work.

**No fix needed** if correctly framed in the paper.

---

### M7. Energy L2 solar/shadow ignores beta angle

**Location:** `src/core/energy/layer2.ts`

**Problem:** Fixed shadow fraction ignores orbital plane orientation relative to sun.

**Fix:** Add beta angle calculation from RAAN and sun position. Shadow fraction = f(beta, altitude).

**Effort:** Medium

---

### M8. Off-axis angle flat-Earth approximation

**Location:** `src/core/channel/beam-gain.ts` line 175

**Problem:** `offAxisRad = atan(groundDistKm / altitudeKm)` — should use full spherical geometry for the satellite-beam-UE triangle.

**Fix:** Use the law of cosines on the satellite-Earth_center-UE triangle:
```
offAxisRad = arctan(R_E * sin(centralAngle) / (R_E + h - R_E * cos(centralAngle)))
```

**Effort:** Low
**Status:** ✅ Fixed (2026-03-23). `computeOffAxisAngle()` now uses `atan2(R_E·sin(ψ), R_E+h−R_E·cos(ψ))` spherical geometry.

---

## 5. Missing Modules (Not in Current SDD)

### MS1. Tier 5: Small-scale fading

**Current state:** `ChannelConfig.tier5_fading` exists as a boolean flag but no implementation.

**Required for:** Any paper claiming realistic channel model, especially for Shadowed-Rician fading analysis.

**Donor:** beamHO-bench `src/sim/channel/small-scale.ts` — 354 lines, Shadowed-Rician + Loo models with temporal correlation and Doppler. Production quality.

**Transfer approach:** Adapt to ntn-sim-core's seeded RNG and integrate into `link-budget.ts` when `tier5_fading: true`.

**Paper sources:** PAP-2021-SHADOWED-RICIAN (Shadowed-Rician parameters), PAP-2024-MADRL-CORE (Loo 3-state Markov)

**Effort:** Medium (adaptation of existing 354-line module)

---

### MS2. Multi-UE engine

**Current state:** Single UE at observer location. `ueConfig` in profiles declares count but engine ignores it.

**Required for:** Fairness metrics, cell-edge throughput, realistic handover load.

**Approach:**
1. UE position generator (uniform/clustered/hotspot within beam footprint)
2. Per-UE off-axis angle → per-UE SINR
3. Shared or independent handover per UE
4. KPI accumulator already supports per-UE tracking

**No donor has this** — needs new development.

**Effort:** High

---

### MS3. Beam visualization (oblique cone from satellite to ground)

**Current state:** BeamFootprintLayer draws hex cells near ground + a single center cone. Does not correctly represent beams projecting from satellite to specific ground cells.

**Donor:** leo-beam-sim `src/viz/SatelliteBeams.tsx` — oblique cone geometry, role-based coloring, SINR labels, active/inactive styling.

**Transfer approach:** Adapt SatelliteBeams component to ntn-sim-core's SimulationSnapshot interface.

**Effort:** Medium

---

### MS4. Earth-fixed cell grid visualization

**Current state:** No earth-fixed cell visualization.

**Donor:** leo-simulator `src/features/beam-hopping/components/EarthFixedCells.tsx` — 369 lines, hex grid with FRF coloring and polarization.

**Required for:** Beam hopping visualization (earth-fixed BH semantics).

**Effort:** Medium

---

### MS5. Proper thermal noise model

**Current state:** `noisePowerDbm()` in engine.ts uses `k_B * T * BW` which is correct in formula but uses a fixed noise temperature from profile. Does not account for UE noise figure or system noise temperature properly.

**Donor:** beamHO-bench `large-scale.ts` has `computeNoiseDbm()` with noise temperature + noise figure.

**Effort:** Low

---

## 6. Profile Parameter Corrections

| Profile | Issue | Fix |
|---|---|---|
| `case9-access-baseline` | `altitude_km: 550` but sourceMap cites PAP-2022-A4EVENT-CORE which uses 600km | Change to 600km or update sourceMap to cite a 550km paper |
| `hobs-multibeam-baseline` | Uses S-band shadow fading tables for Ka-band 28 GHz | Requires M3 fix (Ka-band tables) |
| `bh-resource-baseline` | `frf: 3` with 12 beams — 12 beams form 2 complete hex rings (1+6=7) + 5 partial ring 3. Not a standard hex configuration | Change to 7 beams (complete) or 19 beams |
| `real-trace-validation` | TLE loading not wired in benchmark runner | Wire `tle-loader.ts` into benchmark runner's orbit init path |

---

## 7. Validation Matrix Additions

The following gates should be added to `ntn-sim-core-validation-matrix.md`:

| ID | Category | Check | Phase |
|---|---|---|---|
| `VAL-SINR-002` | signal | each interfering satellite uses its own slant range for path loss | C1 fix |
| `VAL-HO-003` | handover | CHO state transitions appear in event traces | C2 fix |
| `VAL-HO-004` | handover | MC-HO dual-connectivity events appear in event traces | C2 fix |
| `VAL-UE-001` | multi-UE | N>1 UEs produce distinct SINR values per tick | C3 fix |
| `VAL-UE-002` | multi-UE | Jain fairness index < 1.0 for N>1 UEs with different positions | C3 fix |
| `VAL-CHAN-003` | channel | Ka-band profile uses Ka-band shadow fading parameters, not S-band | M3 fix |
| `VAL-CHAN-004` | channel | Tier 4 atmospheric loss > 0 when enabled for Ka-band | M4 fix |
| `VAL-FADING-001` | channel | Tier 5 Shadowed-Rician fading produces non-zero variance | MS1 |
| `VAL-PROFILE-001` | profiles | all profile altitude_km values match cited source papers | §6 fix |

---

## 8. SDD Document Updates Required

| Document | Change Needed |
|---|---|
| `ntn-sim-core-implementation-status.md` | Revert Phase 2/3/5 from "complete" to "incomplete" with specific missing items |
| `ntn-sim-core-validation-matrix.md` | Add 9 new VAL-* gates from §7 above |
| `ntn-sim-core-sdd.md` §9.2 | Add Tier 5 small-scale fading to channel model tiers (currently listed as "optional" — should specify when it's required) |
| `ntn-sim-core-sdd.md` §9.3 | Add CHO and MC-HO to handover requirements (currently mentioned but not specified) |
| `ntn-sim-core-roadmap.md` | Add remediation phase between current Phase 6 and "done" |
| `ntn-sim-core-profile-baselines.md` | Correct altitude discrepancy, add Ka-band channel parameter tables |

**Recommendation:** Update the existing documents in-place rather than creating additional SDD files. This document (`academic-remediation.md`) serves as the tracking list and can be retired once all items are resolved.

---

## 9. Physics Model Gaps (Not in Original SDD)

These are physical models that the original SDD does not mention but that are required for academic credibility in LEO multi-beam handover research.

### P1. Doppler Model

**Problem:** 54 papers中 20+ 篇提到 Doppler shift。LEO 550km 最大可達 ±24 kHz（S-band）/ ±336 kHz（Ka-band）。影響 SINR（載波偏移降低有效信號品質）和 handover timing（Doppler 變化率是某些論文的觸發指標）。目前 SDD §9.2 channel model tiers 完全沒有 Doppler。

**Paper references:**
- PAP-2024-BEAM-MGMT-SPECTRUM, PAP-2025-MADQN-HO, PAP-2025-RSMA, PAP-2025-JCAP-LEO 明確包含 Doppler
- beamHO-bench 有 Doppler 公式實作

**Fix plan:**
1. 新增 `src/core/channel/doppler.ts` — Doppler shift 計算：`f_d = (v_rel / c) * f_c`
2. SDD §9.2 新增 Tier 6: Doppler shift
3. Engine tick 時計算 satellite-UE 相對速度 → Doppler shift → SINR correction

**Effort:** Medium

---

### P2. Propagation Delay Model

**Problem:** LEO 單向傳播延遲 2-8 ms（取決於仰角和斜距），直接影響 handover 執行時間（A3 TTT、CHO 準備時間、DAPS path switch）。目前 SDD §9.3 handover FSM 的 TTT 是純 simulation time，沒有加入 propagation delay。

**Paper references:**
- PAP-2025-TIMERCHO-CORE 有明確延遲參數
- PAP-2025-DAPS-CORE 的 preparation time 包含 RTT
- 3GPP NTN 標準要求考慮 RTT for handover timing

**Fix plan:**
1. `HandoverConfig` 新增 `propagationDelayMs: number` 參數
2. Handover FSM 的 TTT 改為 `effectiveTTT = ttt_ms + 2 * propagationDelayMs`（考慮 RTT）
3. Propagation delay 從 slant range 計算：`delay_ms = rangeKm / 299.792`

**Effort:** Low

---

### P3. Traffic Model

**Problem:** 目前沒有 `src/core/traffic/` 模組。BH scheduler 的 `max-demand` 策略需要 per-cell demand 輸入，但目前沒有 demand 來源。論文常用模型：Poisson arrival, full-buffer, hotspot distribution。沒有流量模型，beam hopping scheduling 就是空殼。

**Paper references:**
- PAP-2026-DRL-BHOPT 用 LSTM traffic prediction + demand-aware BH
- PAP-2025-DIST-BH-HETERO 用 RW-LB (roulette-wheel load balancing)
- PAP-2025-EEBH-UPLINK 用 demand-driven BH

**Fix plan:**
1. 新增 `src/core/traffic/` 模組
2. 實作 traffic generator: `Poisson`, `full-buffer`, `hotspot`
3. Engine tick 時生成 per-cell demand → feed to BH scheduler
4. SDD §9 新增 §9.6 Traffic Model

**Effort:** Medium

---

### P4. UE Mobility Model

**Problem:** 目前 UE 固定在觀測站位置。論文中 pedestrian (3 km/h)、vehicular (120 km/h) UE 對 handover rate 影響巨大。`ueConfig.speed_kmh` 在 profile 中已定義但 engine 忽略它。與 C3（multi-UE）相關但不同 — 即使單 UE 也需要移動。

**Paper references:**
- PAP-2024-HDMMA-MOBILITY 專門研究 mobility management
- PAP-2025-DYNLHT-VELOCITY 用 velocity-aware policies

**Fix plan:**
1. 新增 `src/core/ue/mobility.ts` — 至少 static / linear / random-walk 三種模型
2. Engine tick 時更新 UE 位置 → 影響 off-axis angle → 影響 SINR
3. Profile `ueConfig.speed_kmh` 實際接入 mobility model

**Effort:** Medium

---

### P5. Frequency Reuse Geometry Definition

**Problem:** Profile baselines 提到 FRF=1/3，`beam/layout.ts` 有 FRF coloring 實作，但 SDD §8 Beam Semantics 沒有定義 FRF pattern 如何映射到 beam index 以及它如何影響 interference 計算。

**Paper references:**
- PAP-2026-BHFREQREUSE 有 SFR (Soft Frequency Reuse) 幾何
- PAP-2022-SINR-ELEVATION 有 FRF option 1 定義

**Fix plan:**
1. SDD §8 加入 FRF 語義定義（FRF=1 全復用、FRF=3 三色、FRF=7 七色）
2. `src/core/beam/frequency-reuse.ts` — 定義 co-channel interference set per FRF
3. Engine SINR 計算只對同 reuse group 的 beam 計算干擾（Phase 3 path 已部分實作但缺文件）

**Effort:** Low（code 已部分存在，主要是文件補齊）

---

## 10. Methodology Gaps

### MG1. Paper Reproduction Verification Methodology

**Problem:** SDD 有 golden case 概念但沒定義如何驗證模擬器輸出與已發表論文結果的一致性。論文 reviewer 會問「你的模擬器跟 XXX 的結果吻合嗎？」

**Fix plan:**
1. 新增 `sdd/ntn-sim-core-paper-reproduction-methodology.md`
2. 內容：
   - 選 2-3 篇 reference paper（PAP-2022-SINR-ELEVATION、PAP-2024-HOBS、PAP-2025-TIMERCHO-CORE）
   - 用 paper 的完整參數集建立 reproduction profile
   - 跑 benchmark → 比對 paper 的 Table/Figure 結果
   - 定義可接受偏差（SINR ±2 dB、handover rate ±10%、throughput ±15%）
   - 記錄偏差原因（simplification, implementation choice 等）

**Effort:** High（需要仔細的 paper-by-paper 參數對齊）

---

### MG2. RL/DRL Policy Interface Specification

**Problem:** 研究目標是「DRL for Energy-Efficient Beam Configuration and DAPS-Assisted Seamless Handover」，但 SDD 的 Phase 6 只說「offline action adapters」而沒有定義 state-action-reward 介面。54 篇中 30+ 篇是 DRL，catalog 中的 `algorithmDetail` 已有每篇的 state/action/reward 定義。

**Fix plan:**
1. SDD §9 新增 §9.7 Policy Interface
2. 定義：
   ```typescript
   interface PolicyObservation {
     // per-satellite: elevation, SINR, beam load, energy state
     // per-UE: serving sat, serving beam, SINR history
     // global: time, active beam count, total power
   }
   interface PolicyAction {
     // beam config: which beams active per satellite
     // handover: trigger/defer/target selection
     // power: per-beam power allocation
   }
   interface PolicyReward {
     // throughput, energy efficiency, handover cost, service continuity
   }
   ```
3. Engine 新增 `getObservation()` 和 `applyAction()` 介面
4. Phase 6 的 policy runtime 對接這個介面

**Effort:** Medium（介面設計 + engine 擴展）

---

### MG3. Performance Budget

**Problem:** 瀏覽器端跑 1584 顆衛星 × 37 beams × 100 UE 在 60fps 下不可能。需要明確定義 headless vs frontend 的規模上限。

**Fix plan:**
1. SDD 新增 §13 Performance Budget
2. 定義：
   - Frontend (viz): ≤ 200 satellites, ≤ 19 beams/sat, ≤ 10 UE, 20fps snapshot rate
   - Headless (benchmark): ≤ 2000 satellites, ≤ 37 beams/sat, ≤ 500 UE, no fps constraint
   - Cache build time budget: ≤ 5s for frontend, ≤ 60s for headless
3. Profile defaults 標註哪些適合 frontend vs headless-only

**Effort:** Low（主要是文件定義 + profile annotation）

---

### MG4. Validation Methodology: Formula vs Engine Split

**Problem:** 目前 14 個通過的 VAL-* 只測公式正確性（獨立腳本重新實作數學），不測 engine 是否正確使用這些公式。C1 bug（interference 用 serving path loss）就是例子 — formula-level test pass 但 engine 有 bug。

**Fix plan:**
1. 每個 VAL 拆成兩級：
   - `VAL-xxx-F` (formula): 獨立公式驗證（現有腳本）
   - `VAL-xxx-E` (engine): engine end-to-end 驗證（新腳本，需要 Node-compatible build 或 headless runner）
2. `validate:stage` 目前跑 `-F` 級別
3. 未來 `validate:integration` 跑 `-E` 級別
4. Implementation status 中明確區分這兩級

**Effort:** Medium（需要 engine-level test harness）

---

## 11. Execution Priority Order (Revised)

Supersedes §9 for execution planning. Incorporates physics + methodology gaps.

### Phase R0 — Fix Foundations (blocks everything)

1. **C1** — Per-interferer path loss in SINR
2. **M3 + M4** — Ka-band channel (shadow fading tables + atmospheric loss)
3. **M5** — DAPS combining correction
4. **M8** — Off-axis angle spherical geometry

### Phase R1 — Prove Credibility

5. **MG1** — Paper reproduction methodology (select 2-3 reference papers, define reproduction profiles)
6. **C2** — CHO + MC-HO + Timer-CHO baselines
7. **P2** — Propagation delay in handover FSM
8. **MS1** — Tier 5 small-scale fading (from beamHO-bench)
9. **M2** — Beam gain θ_3dB for off-nadir

### Phase R2 — Physical Completeness

10. **P1** — Doppler model
11. **P3** — Traffic model (for BH scheduling)
12. **MG2** — RL policy interface specification
13. **M1** — Walker F parameter
14. **Profile corrections** (§6)

### Phase R3 — Multi-UE and Fairness

15. **C3** — Multi-UE engine
16. **P4** — UE mobility model
17. **MG3** — Performance budget definition

### Phase R4 — Strengthening

18. **P5** — FRF geometry documentation
19. **M7** — Beta angle for solar/shadow
20. **MG4** — Validation split (formula vs engine)
21. **MS3 + MS4** — Beam visualization improvements
22. **MS5** — Thermal noise model

---

## 12. Donor Transfer Summary (Expanded)

### Tier 1 — Must fix before any benchmark claim (CRITICAL)

1. **C1** — Fix per-interferer path loss in SINR (blocks all SINR credibility)
2. **M3 + M4** — Fix Ka-band channel model (blocks HOBS and BH profile credibility)
3. **M5** — Fix DAPS combining comment (blocks DAPS claims)
4. **M8** — Fix off-axis angle geometry (blocks interference accuracy)

### Tier 2 — Must fix before paper submission

5. **C2** — Add CHO + MC-HO baselines (blocks reproducing reference papers)
6. **MS1** — Add Tier 5 small-scale fading (blocks channel model completeness claim)
7. **M2** — Fix beam gain θ_3dB for off-nadir (blocks multi-beam accuracy)
8. **Profile corrections** (§6)
9. **M1** — Walker F parameter (simple fix, improves constellation fidelity)

### Tier 3 — Should fix for strong paper

10. **C3** — Multi-UE model (high effort, essential for fairness claims)
11. **M7** — Beta angle for solar/shadow (improves energy model)
12. **MS3 + MS4** — Beam visualization improvements (demo quality)

### Tier 4 — Nice to have

13. **MS5** — Thermal noise model improvement
14. **MS2** — Full multi-UE with independent handover

---

### Original items (from §10)

| Gap | Best Donor | Module | Effort |
|---|---|---|---|
| Per-interferer path loss | beamHO-bench | `link-budget.ts` | Design reference only (interface differs) |
| CHO + MC-HO | beamHO-bench | `handover/baseline-*.ts` | Type adaptation needed |
| Tier 5 fading | beamHO-bench | `small-scale.ts` | Direct port with RNG adaptation |
| Tier 4 atmospheric | leo-beam-sim | `path-loss.ts` | Extract atmospheric functions |
| J1/J3 beam gain | leo-beam-sim | `beam-gain.ts` | Add as new model option |
| Beam cone viz | leo-beam-sim | `SatelliteBeams.tsx` | Adapt to SimulationSnapshot |
| Earth-fixed cells | leo-simulator | `EarthFixedCells.tsx` | Adapt coordinate system |
| Thermal noise | beamHO-bench | `large-scale.ts` | Extract noise function |

### New items (from §9–§10)

| Gap | Best Donor | Module | Effort |
|---|---|---|---|
| Doppler model (P1) | beamHO-bench | channel Doppler formula | Low (formula extraction) |
| Propagation delay (P2) | — | New development (simple: range/c) | Low |
| Traffic model (P3) | — | New development | Medium |
| UE mobility (P4) | — | New development | Medium |
| FRF geometry (P5) | leo-beam-sim | `beam-layout.ts` FRF coloring | Low (doc + minor code) |
| Paper reproduction method (MG1) | — | New methodology document | High |
| RL policy interface (MG2) | 54-paper catalog `algorithmDetail` | State/action/reward from papers | Medium |
| Performance budget (MG3) | — | New document section | Low |
| Validation split (MG4) | — | New test infrastructure | Medium |
