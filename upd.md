# ntn-sim-core SDD 審查建議（2026-03-20）

基於 54 篇論文最新 `researchChecklist` 統計 + 4 個既有專案架構分析，以下是建議調整但**尚未修改**的項目。

---

## 1. Canonical Profile 缺具體參數規格

**問題**：SDD 定義了 4 個 profile family 但沒有具體參數值。論文審稿會問「為什麼用這些數字」。

**建議**：在 `sdd/ntn-sim-core-sdd.md` §8 或新增附件，為每個 profile 補上「參數表 + 論文來源」：

### case9-access-baseline
| 參數 | 值 | 來源 |
|------|-----|------|
| 高度 | 600 km | 3GPP TR 38.821 Case 9, PAP-2022-A4EVENT-CORE, PAP-2025-TIMERCHO-CORE |
| 頻段 | S-band 2 GHz | PAP-2022-SINR-ELEVATION (15 篇共識) |
| 頻寬 | 30 MHz | PAP-2022-SINR-ELEVATION, PAP-2021-SHADOWED-RICIAN |
| 星座 | Walker 24×22=528, 53° inclination | 簡化 Starlink Phase I（PAP-2025-UCGM-CLUSTERING 用 24×54=1296） |
| Beam/sat | 19 (hex 2-tier) | PAP-2022-SINR-ELEVATION, PAP-2021-SHADOWED-RICIAN, PAP-2025-TIMERCHO-CORE |
| Beam 直徑 | 50 km | 3GPP TR 38.821, PAP-2022-SINR-ELEVATION |
| FRF | 1 (全復用) | PAP-2022-SINR-ELEVATION, PAP-2021-SHADOWED-RICIAN |
| UE 數 | 10/beam × 19 = 190 | PAP-2022-SINR-ELEVATION |
| EIRP density | 34 dBW/MHz | PAP-2022-SINR-ELEVATION (3GPP) |
| 天線 pattern | 3GPP TR 38.821 RPsat | PAP-2022-SINR-ELEVATION |

### hobs-multibeam-baseline
| 參數 | 值 | 來源 |
|------|-----|------|
| 高度 | 550 km | PAP-2024-HOBS (13 篇 550km 共識) |
| 頻段 | Ka-band 20 GHz | PAP-2024-HOBS, PAP-2026-BHFREQREUSE (16 篇 Ka-band) |
| Beam/sat | 37 (hex 3-tier) | PAP-2024-HOBS |
| 天線 pattern | Bessel J1 | PAP-2021-SHADOWED-RICIAN, PAP-2024-MADRL-CORE |
| 功率控制 | DPC (Dynamic Power Control) | PAP-2024-HOBS |
| 能效指標 | EE = throughput / power | PAP-2024-HOBS |

### bh-resource-baseline
| 參數 | 值 | 來源 |
|------|-----|------|
| 高度 | 780-1200 km | PAP-2026-BHFREQREUSE (780km), PAP-2026-DRL-BHOPT (1200km) |
| Beam/sat | 4-12 | PAP-2025-DIST-BH-HETERO (4), PAP-2026-BHFREQREUSE (12) |
| BH frame | TDMA slot-based | PAP-2025-DIST-BH-HETERO, PAP-2026-DRL-BHOPT |
| 頻率復用 | SFR (Soft Frequency Reuse) | PAP-2026-BHFREQREUSE |

### real-trace-validation
| 參數 | 值 | 來源 |
|------|-----|------|
| TLE 來源 | `tle_data/starlink/` 子集 300 顆 | beamHO-bench 做法 (320 Starlink) |
| 時間窗口 | 最近 TLE epoch ± 24hr | orbit-engine Stage 1 容差 |

---

## 2. 通道模型分層未定義

**問題**：SDD §11 channel 寫「FSPL, 3GPP NTN losses, antenna gain, interference-aware SINR」但沒定義哪些是必須、哪些是可選、每個 profile 用哪些。

**建議**：在 SDD 新增 §11.2 Channel Model Tiers：

| 層級 | 組件 | 適用 Profile | 論文覆蓋率 |
|------|------|-------------|-----------|
| Tier 0 (必須) | FSPL | 全部 | 41/54 (76%) |
| Tier 1 (必須) | Shadow Fading σ_SF(elevation) | 全部 | 16/54 (30%) 但 3GPP 要求 |
| Tier 2 (建議) | Clutter Loss CL(elevation) | case9, hobs | 5/54, 但 3GPP TR 38.811 標準 |
| Tier 3 (profile-dependent) | Beam Gain (Bessel J1 or 3GPP RPsat) | hobs, bh | 23/54 multi-beam |
| Tier 4 (可選) | Atmospheric absorption | bh (Ka-band) | 8/54 |
| Tier 5 (可選) | Small-scale fading (SR/Rician) | 進階驗證 | 6/54 SR, 3/54 Rician |

**具體公式來源**：
- FSPL: `32.45 + 20·log₁₀(f_MHz) + 20·log₁₀(d_km)` — 通用
- SF/CL 查表: PAP-2022-SINR-ELEVATION `channelParameterTable`（9 個仰角 × 3 欄，3GPP TR 38.811）
- Bessel J1: PAP-2021-SHADOWED-RICIAN `g(ζ) = (2·J₁(ka·sinζ)/(ka·sinζ))²`, ka=62.83
- SR fading: PAP-2021-SHADOWED-RICIAN `(b, m, Ω)` 三組參數 light/average/heavy

---

## 3. 能效模型缺具體公式

**問題**：SDD §11 energy 只寫「Layer 1: beam/power EE, Layer 2: onboard energy」，但沒引用任何具體公式。

**建議**：在 SDD 或 roadmap Phase 3/5 補上公式來源：

### Energy Layer 1（Phase 3）
- **EE 定義**: `EE = Σ R_k / P_total` (bits/Joule) — PAP-2024-HOBS
- **Per-beam power**: `P_total = Σ P_b · η_b` where η_b ∈ {0,1} is beam active flag — PAP-2025-EEBH-UPLINK
- **DPC**: `P_b = P_max · (SINR_target / SINR_current)` — PAP-2024-HOBS

### Energy Layer 2（Phase 5）
- **TX/RX/idle states**: PAP-2025-SMASH-MADQL（NS-3 energy model，有明確 TX/RX/idle power 數值）
- **Beam on/off cost**: PAP-2025-EAQL reward `r = λ·throughput - (1-λ)·energy`, λ=0.2
- **Solar/shadow**: 無論文直接給出公式（SDD 正確標註為 optional）

---

## 4. 新增 4 篇論文的定位

**問題**：SDD 的 paper baselines 沒有包含最近新增的 4 篇。

**建議**：補入以下引用：

| 論文 | Phase | 用途 |
|------|-------|------|
| PAP-2022-SINR-ELEVATION | Phase 2 | 3GPP channel parameter table (σ_SF, CL vs elevation) 直接作為 lookup table |
| PAP-2021-SHADOWED-RICIAN | Phase 3 | Bessel J1 antenna pattern 參考實作 + SR channel optional extension |
| PAP-2025-DIST-BH-HETERO | Phase 5 | 異構衛星 BH resource baseline（LEO+MEO, 4 beams, TDMA） |
| PAP-2025-JCAP-LEO | 不納入 | JCAS/navigation 方向，與你的研究不直接相關 |

---

## 5. DAPS 相關論文清單不完整

**問題**：Phase 6 只引用 DAPS-CORE, MCCHO-CORE, RSMA。但 54 篇統計有 6 篇涉及 DAPS/dual-connect。

**建議**：Phase 6 paper baselines 補完：

| 論文 | DAPS 類型 | 價值 |
|------|----------|------|
| PAP-2025-DAPS-CORE | 顯式 DAPS (ADMM+SA) | 核心參考 |
| PAP-2024-MCCHO-CORE | Dual-connectivity + packet duplication | 3GPP 直接相關 |
| PAP-2025-RSMA | GEO+LEO soft HO | 多軌道 soft HO |
| PAP-2020-MIMO-GRAPH | Multi-satellite diversity | 早期多連接概念 |
| PAP-2020-USERCENTRIC | CAS multi-sat buffering | 用戶中心多星緩衝 |
| PAP-2024-QMIXBH | BH + multi-sat coordination | BH 場景下多星協調 |

---

## 6. Validation Matrix 缺數值校驗目標

**問題**：VAL-CHAN-001 只寫「FSPL baseline matches reference calculations」，但沒有具體數字。

**建議**：補上可驗證的數值 checkpoint：

| 校驗 ID | 具體目標 | 來源 |
|---------|---------|------|
| VAL-CHAN-001 | FSPL(600km, 2GHz) ≈ 160.5 dB | 公式計算 |
| VAL-SINR-001 | 19-beam FRF=1, el=90°, 2GHz → SINR ≈ -1.2 dB | PAP-2022-SINR-ELEVATION |
| VAL-SINR-002 | 19-beam FRF=1, el=10°, 2GHz → SINR ≈ -17.5 dB | PAP-2022-SINR-ELEVATION |
| VAL-SINR-003 | Bessel J1 peak gain = 30 dBi, ka=62.83 | PAP-2021-SHADOWED-RICIAN |
| VAL-ORB-001 | Walker 550km → orbital period ≈ 95.6 min | Kepler 公式 |
| VAL-ORB-002 | Walker 550km → satellite speed ≈ 7.59 km/s | Kepler 公式 |

---

## 7. 觀測站策略未說明

**問題**：`ntpu.config.ts` 設定 NTPU 24.94°N，但 SDD 沒說明為什麼選這個位置、是否需要多觀測站。

**建議**：在 SDD §8 或 architecture blueprint 補一段：

> **Observer Location Strategy**
> - Primary: NTPU 24.94°N, 121.37°E（專案歷史位置 + 本校）
> - 合成 Walker 傾角 53° 可確保 NTPU 有充足高仰角通過
> - 論文中常見觀測站：北京 40°N（beamHO-bench 遺留）、首爾 37.5°N、倫敦 51.5°N
> - Phase 4 real-trace 驗證時可加入多觀測站比較，但 Phase 1-3 主實驗固定 NTPU

---

## 8. Beam Gain 模型對應未明確

**問題**：SDD 提到 Bessel 和 3GPP 天線模型，但沒指定哪個 profile 用哪個。

**建議**：在 §10 Beam Semantics 或 §11 Module 補上：

| Profile | Beam Gain Model | 來源 |
|---------|----------------|------|
| case9-access-baseline | 3GPP TR 38.821 RPsat (normalised) | PAP-2022-SINR-ELEVATION |
| hobs-multibeam-baseline | Bessel J1: `g(ζ) = (2·J₁(ka·sinζ)/(ka·sinζ))²` | PAP-2021-SHADOWED-RICIAN, PAP-2024-HOBS |
| bh-resource-baseline | Bessel J1+J3 或 ITU-R S.672-4 | PAP-2024-QMIXBH, PAP-2026-BHFREQREUSE |
| real-trace-validation | 與被驗證的 profile 相同 | — |

---

## 9. researchChecklist 整合建議

**問題**：54 篇 catalog 現在都有結構化 `researchChecklist`（16 個子欄位），但 SDD 沒提到如何利用這些資料。

**建議**：在 SDD §7 External Source Strategy 或 roadmap 補一條：

> **Paper Catalog Integration**
> - `/home/u24/papers/catalog/*.json` 的 `researchChecklist` 欄位可用於：
>   - 自動比對 profile 參數是否有論文依據
>   - 生成 source-trace 的論文引用清單
>   - 識別哪些論文的公式/參數可直接移植
> - 具體欄位：`sinrAndSignal.formula`, `beam.notes`, `power.hasExplicitPowerFormula`, `geometry.*`, `satelliteSimulation.*`

---

## 10. 小問題

1. **SDD §1**: 寫 "Historical Alias: omni-scope" — 已不相關，建議移除或改為腳註避免混淆
2. **roadmap Phase 2**: paper baselines 缺 PAP-2022-SINR-ELEVATION（最直接的 3GPP channel parameter 來源）
3. **roadmap Phase 3**: paper baselines 缺 PAP-2024-MADRL-CORE（Bessel + MADRL 最完整的 multi-beam handover 實作）
4. **validation-matrix**: 23 個 check，但 Phase 2-3 之間跳太大 — 建議 Phase 2 加一個 `VAL-BEAM-001: earth-moving beam footprint projection matches elevation-dependent geometry`
5. **architecture-blueprint §9**: High-Elevation Strategy 很好但沒提到 beamHO-bench 曾經遇到的笛卡爾半球插值問題 — 建議加一句 "Synthetic Walker 消除此問題；real-trace 下透過 curation 選高仰角窗口解決"

---

## 總結

SDD 整體品質很高，已正確整合了 codex 方案的核心設計（dual orbit、dual beam semantics、trace-first、validation gates）。主要缺的是：
1. **具體數字**（參數表、校驗目標）— 需要用 54 篇論文統計數據來填充
2. **公式來源追溯**（channel tiers、energy formulas）— 需要連結到具體論文
3. **新增 4 篇論文的整合**
4. **DAPS 論文清單補完**
