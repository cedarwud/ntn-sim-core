# NTN Sim Core

Research-Grade NTN/LEO Simulator — 研究型 NTN/LEO 模擬器主專案，含 runtime、channel、handover、energy、beam hopping、replay 與 3D 視覺化。

---

## 目錄 / Table of Contents

- [繁體中文](#繁體中文)
- [English](#english)

---

# 繁體中文

## 簡介

NTN Sim Core 是本 repo 目前的 **主 simulator**。它不再只是前端殼層，而是已經包含：

- synthetic Walker 與 OMM/TLE-backed real-trace 軌道路徑
- multi-beam SINR / link budget / Doppler / fading channel family
- A3 / A4 / D2 / CHO / Timer-CHO / MC-HO / DAPS handover runtime
- Layer 1 / Layer 2 energy modeling
- beam hopping scheduler families
- deterministic replay / benchmark / validation artifacts
- 對應的 3D 視覺化與 explainability overlays

它目前仍保留國立臺北大學（NTPU）校園場景、UAV 與 satellite 資產，並按照 SDD 轉成 `app / viz / core / runner` 分層架構。

技術架構採用 **React + TypeScript + Vite**，透過 **React Three Fiber** 將 Three.js 整合進 React 生態系，實現宣告式的 3D 場景管理。

## 文件權威關係

對 `ntn-sim-core` 的工作，**完整 authority order 定義在 [agent-governance.md](./agent-governance.md)**。本 README 是專案入口導覽頁，不取代 agent-governance.md。

快速導覽：

| 用途 | 文件 |
|---|---|
| Agent 工作規則與 authority order | [agent-governance.md](./agent-governance.md) |
| SDD 文件總覽 | [sdd/README.md](./sdd/README.md) |
| 最近完成的主程序 | [sdd/ntn-sim-core-platform-refactor-roadmap.md](./sdd/ntn-sim-core-platform-refactor-roadmap.md) |
| 目前實作狀態 | [sdd/ntn-sim-core-implementation-status.md](./sdd/ntn-sim-core-implementation-status.md) |
| 論文定位 / 未來方向 | [sdd/ntn-sim-core-research-positioning-note.md](./sdd/ntn-sim-core-research-positioning-note.md) |
| 目前 active paper-oriented follow-on | [sdd/modqn-targeted-parity-outline.md](./sdd/modqn-targeted-parity-outline.md) / [../todo/modqn-parity/README.md](../todo/modqn-parity/README.md) |
| 已完成的 paper-governance prerequisite | [sdd/paper-mode-claim-mode-hardening-outline.md](./sdd/paper-mode-claim-mode-hardening-outline.md) / [../todo/paper-mode-claim-mode/README.md](../todo/paper-mode-claim-mode/README.md) |
| 目前 prompt / handoff 索引 | [../todo/README.md](../todo/README.md) / [../todo/modqn-parity/README.md](../todo/modqn-parity/README.md) / [../todo/paper-mode-claim-mode/README.md](../todo/paper-mode-claim-mode/README.md) / [../todo/modqn/README.md](../todo/modqn/README.md) / [../todo/ui-estnet/README.md](../todo/ui-estnet/README.md) / [../todo/real-trace-truth-path/README.md](../todo/real-trace-truth-path/README.md) |
| Phase 0 架構盤點 | [sdd/phase0-architecture-spec.md](./sdd/phase0-architecture-spec.md) |
| Phase 1–5 SDDs | [sdd/phase1-parameter-registry-sdd.md](./sdd/phase1-parameter-registry-sdd.md) … [sdd/phase5-cleanup-and-modularization-sdd.md](./sdd/phase5-cleanup-and-modularization-sdd.md) |

## 快速開始

### 環境需求

- **Git LFS** — 本專案使用 Git LFS 管理 3D 模型檔案（`.glb`），必須先安裝才能正確 clone
- **Node.js** >= 18
- **npm** >= 9

### 安裝 Git LFS

3D 模型檔案（共約 17.7 MB）透過 Git LFS 儲存，未安裝 LFS 直接 clone 只會拿到 pointer 檔案，場景將無法載入。

```bash
# macOS
brew install git-lfs

# Ubuntu / Debian
sudo apt install git-lfs

# Windows（已內建於 Git for Windows，若未啟用則執行）
git lfs install
```

安裝後執行一次 `git lfs install` 啟用，之後 clone 即會自動下載 LFS 檔案：

```bash
git clone <repo-url>
```

若已經 clone 但缺少 LFS 檔案，可補拉：

```bash
git lfs pull
```

### 安裝與執行

```bash
# 1. 安裝依賴
npm install

# 2. 啟動開發伺服器（預設 http://localhost:3000）
npm run dev

# 3. 建置生產版本
npm run build

# 4. 預覽生產版本
npm run preview
```

開發伺服器啟動後會自動開啟瀏覽器，伺服器綁定 `0.0.0.0:3000`，同網路的裝置也可透過區域 IP 存取。

## 文件入口

以下清單僅供導覽，不構成另一份獨立 authority order。實際順位一律以 [agent-governance.md](./agent-governance.md) §2 為準。

### 核心導覽（navigation only）

1. [SDD 文件總覽](./sdd/README.md)
2. [正式架構藍圖](./docs/architecture/ntn-sim-core-architecture-blueprint.md)
3. [軟體設計文件 SDD](./sdd/ntn-sim-core-sdd.md)
4. [Platform Refactor Roadmap](./sdd/ntn-sim-core-platform-refactor-roadmap.md)
5. [Implementation Status](./sdd/ntn-sim-core-implementation-status.md)
6. [驗證矩陣](./sdd/ntn-sim-core-validation-matrix.md)
7. [開發限制規範](./sdd/ntn-sim-core-development-constraints.md)
8. [驗收與研究聲明 gate](./sdd/ntn-sim-core-acceptance-gates.md)
9. [assumption policy](./sdd/ntn-sim-core-assumption-policy.md)
10. [研究定位與未來方向](./sdd/ntn-sim-core-research-positioning-note.md)

### 現行模型/暴露層 companion（navigation only）

1. [baseline 參數與公式來源](./sdd/ntn-sim-core-profile-baselines.md)
2. [paper family matrix](./sdd/ntn-sim-core-paper-family-matrix.md)
3. [reproduction protocol](./sdd/ntn-sim-core-reproduction-protocol.md)
4. [reproduction targets](./sdd/ntn-sim-core-reproduction-targets.md)
5. [前端波束視覺 SDD](./sdd/ntn-sim-core-frontend-beam-visual-sdd.md)
6. [UI / 參數暴露層規範](./sdd/ntn-sim-core-ui-exposure-spec.md)

### 歷史 closure / donor / one-shot 文件

已移到：

- `../archive/ntn-sim-core-sdd-history-2026-03-29/`

這些檔案可供回溯，但不再屬於 active authority。

## 目前狀態摘要

依 [Implementation Status](./sdd/ntn-sim-core-implementation-status.md)：

- 舊的 hardening / closure 程式已完成並驗證通過
- Simulator Platform Refactor 已完成 through Phase 5 Group 3，final audit 已通過
- 最新 audited reruns 的 `validate:visual-browser` / `validate:stage` 皆通過；目前可視為已完成 platform closure 的穩定基線
- 已建立 parameter registry / model bundle / authored-profile materialization / frozen contracts / cleanup gates 的完整鏈
- downstream architecture 已完成 Group 2，`src/core/algorithms/`、`src/core/experiments/`、`src/viz/view-models/` 的最小骨架已落地
- `MODQN` baseline reproduction 已完成 through `M3`
- `UI` baseline viewer path 已完成 through `U1/U2`
- real-trace truth-path correction (`T1`) 已完成；`real-trace scalability` 仍 blocked
- `PM1` paper-mode / claim-mode hardening 已完成；目前 active 的下一條 paper-oriented 線是 `modqn targeted parity strengthening`
- main-result / robustness / sensitivity / appendix 與 `EE / power` headline-claim 限制，仍應以 PM1 authority 為準，不要自行混寫
- `project/estnet-ui-kickoff` 仍維持 paused future consumer 狀態，需 explicit reopen 才能啟動
- 目前若要為論文導向的後續開發定 scope，應先參考 [`sdd/ntn-sim-core-research-positioning-note.md`](./sdd/ntn-sim-core-research-positioning-note.md)；`OMNeT++ / estnet / INET` 若要重開，應視為新的外部 consumer/backend realism track，而不是延續 `U1/U2/T1`，也不是現在 paper-usable 的隱含前置條件

因此閱讀本專案時，應把它視為 **已完成 platform closure，且已收口目前批准的 downstream baseline 與 narrow truth-path correction 的研究型模擬器主體**。目前若要繼續往論文導向工作前進，應先走 `modqn targeted parity strengthening`，而不是回到已完成的 `M1/U1/T1/PM1` 入口，也不是直接跳到更重的 `OMNeT++ / estnet / INET` 或 scalability line。

### 可用指令

| 指令 | 說明 |
|---|---|
| `npm run dev` | 啟動 Vite 開發伺服器（HMR 熱更新） |
| `npm run build` | TypeScript 型別檢查 + Vite 生產建置 |
| `npm run preview` | 本地預覽 `dist/` 建置產物 |
| `npm run lint` | 執行 TypeScript 型別檢查（不輸出檔案） |
| `npm run validate:structure` | 驗證 preflight 目錄骨架與舊結構是否已清除 |
| `npm run validate:trace` | 驗證 SDD / traceability placeholder 文件與目錄是否存在 |
| `npm run validate:profiles` | 驗證 profile layout（asset/observer/visual 分離）+ Phase 3 VAL-PLAT-006/007（型別 export / no-circular-import / authored-materialization parity） |
| `npm run validate:stage` | 執行 lint + build + preflight validation scripts |

## 專案結構

目前 authoritative inventory 以 [Implementation Status §4](./sdd/ntn-sim-core-implementation-status.md) 為準；早期 preflight skeleton 已不再代表現況。

高層分層可先這樣理解：

- `src/app/`
  React app shell、URL/query state、live/replay/batch KPI hooks
- `src/config/`
  scene / observer config，提供 `visual-scene.config.ts` 與 `observer-presets.ts`
- `src/core/`
  simulator truth layer；含 `config/`, `contracts/`, `models/`, `profiles/`, `engine/`, `orbit/`, `channel/`, `handover/`, `energy/`, `beam/`, `trace/`, `policy/`, `kpi/`, `algorithms/`, `experiments/`
- `src/runner/`
  `headless/`, `replay/`, `curation/`，以及 `runner-exposure-api.ts`
- `src/viz/`
  `beam/`, `satellite/`, `scene/`, `overlays/`, `validation/`, `view-models/`
- `src/assets/`
  scene / model asset path registry
- `src/styles/`
  global Sass entry (`main.scss`)
- `scripts/`
  validation gates、golden cases、artifact/reproduction runners、audit utilities
- `public/`
  scene / model assets

## 技術架構

### 渲染管線

```
index.html
  → src/main.tsx          React 掛載點
    → app/AppShell.tsx    app shell
      → viz/scene/SceneShell.tsx
        ├── viz/overlays/Starfield.tsx
        ├── viz/scene/CameraRig.tsx
        ├── viz/scene/LightingRig.tsx
        ├── viz/scene/NTPUScene.tsx
        └── viz/scene/UAV.tsx
```

### 核心技術棧

| 技術 | 版本 | 用途 |
|---|---|---|
| **React** | 19.2 | UI 框架 |
| **TypeScript** | 5.9 | 型別安全 |
| **Vite** | 7.1 | 開發伺服器與建置工具 |
| **Three.js** | 0.180 | WebGL 3D 渲染引擎 |
| **React Three Fiber** | 9.4 | Three.js 的 React 宣告式封裝 |
| **Drei** | 10.7 | R3F 常用工具集（OrbitControls、PerspectiveCamera、useGLTF 等） |
| **Sass** | 1.93 | CSS 預處理器 |

### Three.js 如何運作

本專案透過 **React Three Fiber (R3F)** 將 Three.js 整合進 React：

1. **Canvas** (`SceneShell.tsx`) — R3F 的 `<Canvas>` 元件建立 WebGL 渲染器，設定 ACES Filmic 色調映射、抗鋸齒、陰影等。

2. **相機** — 使用 Drei 的 `<PerspectiveCamera>`，初始位置從上方俯瞰（Y=400, Z=500），FOV 60 度，可視範圍 0.1 ~ 10000。

3. **軌道控制** — `<OrbitControls>` 提供滑鼠拖曳旋轉、滾輪縮放、阻尼效果，限制仰角不超過水平面。

4. **燈光系統**：
   - `hemisphereLight` — 天空/地面環境光
   - `ambientLight` — 全域環境補光
   - `directionalLight` — 主方向光（正上方），啟用 4096x4096 陰影貼圖

5. **模型載入** — 使用 Drei 的 `useGLTF` hook 載入 `.glb` 模型，搭配 `<Suspense>` 處理非同步載入狀態。

### 3D 模型

#### 校園場景 — `public/scenes/NTPU.glb`（7.8 MB）

- 國立臺北大學三峽校區的 3D 場景模型
- 載入後自動將 `MeshBasicMaterial` 轉換為 `MeshStandardMaterial`，使其能接受光照與陰影
- 透過 `useGLTF.preload()` 預載入，減少初次渲染延遲
- 視覺參數由 `visual-scene.config.ts` 管理（路徑、位置、縮放、旋轉）

#### UAV 無人機 — `public/models/uav.glb`（9.9 MB）

- 無人機 3D 模型，使用 `SkeletonUtils.clone()` 處理骨骼動畫的正確複製
- 自帶 `pointLight` 模擬機身燈光
- 同樣透過 `useGLTF.preload()` 預載入

#### 衛星模型 — `public/models/sat.glb`

- 衛星 3D 模型，可供後續 NTN/LEO 視覺化元件直接重用
- 目前作為靜態資產預先納入，方便後續接入衛星軌跡與波束顯示

### 設定檔

物理與視覺設定已經拆分：

```typescript
// src/config/observer-presets.ts
{ id, name, latitudeDeg, longitudeDeg, altitudeM }

// src/config/visual-scene.config.ts
{ scene, uav, satellite, camera, background, debug }
```

這樣可以避免觀測站等物理參數和純視覺設定混在同一檔。

### 星空背景 — `Starfield.tsx`

- 生成 180 顆隨機分布的星星
- 使用純 **CSS `@keyframes` animation** 處理閃爍效果
- 不使用任何 JS 計時器或 React state 更新，零效能開銷
- 置於 Canvas 後方，透過 `pointer-events: none` 不影響 3D 互動

## 互動操作

| 操作 | 說明 |
|---|---|
| 滑鼠左鍵拖曳 | 旋轉場景 |
| 滑鼠右鍵拖曳 | 平移場景 |
| 滾輪 | 縮放（距離限制 10 ~ 2000） |

## 參數暴露層（UI Exposure Layer）

Simulator 的參數依照 `system-model-refs/simulator-parameter-spec.md` §0 分為四個 mode：

| Mode | UI 入口 | 說明 |
|---|---|---|
| **Realistic** | Profile selector 第一選項（預設） | 論文/標準文件直接背書的參數；安全用於論文比較表 |
| **Advanced** | Profile selector Advanced 群組 + HO override | 有明確文獻來源的次級設定；非 first-screen 預設 |
| **Sensitivity** | Profile selector Sensitivity 群組 | 再現目標與分析型 sweep |
| **Internal-only** | **不暴露** | 僅 runtime 使用；不可作為 UI 滑桿 |

### Profile Selector

左下角控制面板 `Profile:` 下拉選單選擇情境設定檔。預設為 `realistic-first-screen`（Ka 20 GHz、A3 HO、FR3）。
亦可直接用 URL 參數切換：`?profile=hobs-multibeam-baseline`

### HO Strategy Override

`HO:` 下拉選單可臨時覆蓋 HO 策略（不改 profile）。A3/A4 為 Realistic；CHO/MC-HO/DAPS 標示 `[Adv]`。

### 衍生量禁止作為自由控制項

以下不可作為 UI 滑桿或直接輸入值：
- `α`（仰角）、`d`（斜距）、`θ`（偏軸角）、`PL`（路徑損耗）
- 原始雜訊功率（使用 NF 作為控制項）
- `eirpDensityDbwPerMHz`（從 P1 + 天線增益推算）
- `systemLossDb = 70 dB`（已廢棄）

詳細規範見 [UI 暴露層 SDD](./sdd/ntn-sim-core-ui-exposure-spec.md)。

## 開發注意事項

- `tsconfig.json` 設定 `"noEmit": true`，TypeScript 僅做型別檢查，實際轉譯由 Vite 處理
- `vite.config.ts` 設定 `@` 別名指向 `src/`，import 時可用 `@/config/...` 等路徑
- `.glb` 模型放在 `public/` 目錄下，Vite 會在建置時直接複製，不經過打包處理

---

# English

## Introduction

NTN Sim Core is a research-oriented NTN/LEO simulator platform. It keeps the NTPU campus scene plus UAV and satellite assets, and the simulator-platform refactor into the `app / viz / core / runner` layered architecture is already complete. Downstream architecture Group 2, MODQN M3, the UI baseline viewer path through U2, and the narrow real-trace truth-path correction (`T1`) have all landed, so future work should start only from a newly promoted or explicitly reopened follow-on surface.

The tech stack uses **React + TypeScript + Vite**, with **React Three Fiber** integrating Three.js into the React ecosystem for declarative 3D scene management.

## Quick Start

### Prerequisites

- **Git LFS** — This project uses Git LFS to manage 3D model files (`.glb`). It must be installed before cloning.
- **Node.js** >= 18
- **npm** >= 9

### Installing Git LFS

The 3D model files (~17.7 MB total) are stored via Git LFS. Without LFS installed, cloning will only download pointer files and the 3D scene will fail to load.

```bash
# macOS
brew install git-lfs

# Ubuntu / Debian
sudo apt install git-lfs

# Windows (bundled with Git for Windows; if not enabled, run:)
git lfs install
```

After installation, run `git lfs install` once to activate, then clone as usual:

```bash
git clone <repo-url>
```

If you already cloned without LFS, pull the missing files:

```bash
git lfs pull
```

### Installation & Running

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (default: http://localhost:3000)
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build
npm run preview
```

The dev server auto-opens the browser and binds to `0.0.0.0:3000`, making it accessible from other devices on the same network.

## Documentation Entry Points

### Core authority

1. [Formal architecture blueprint](./docs/architecture/ntn-sim-core-architecture-blueprint.md)
2. [Software Design Document](./sdd/ntn-sim-core-sdd.md)
3. [Platform refactor roadmap](./sdd/ntn-sim-core-platform-refactor-roadmap.md)
4. [Validation matrix](./sdd/ntn-sim-core-validation-matrix.md)
5. [Development constraints](./sdd/ntn-sim-core-development-constraints.md)
6. [Acceptance gates](./sdd/ntn-sim-core-acceptance-gates.md)
7. [Assumption policy](./sdd/ntn-sim-core-assumption-policy.md)
8. [Implementation status](./sdd/ntn-sim-core-implementation-status.md)

### Active companion documents

1. [Baseline parameters and formula sources](./sdd/ntn-sim-core-profile-baselines.md)
2. [Paper family matrix](./sdd/ntn-sim-core-paper-family-matrix.md)
3. [Reproduction protocol](./sdd/ntn-sim-core-reproduction-protocol.md)
4. [Reproduction targets](./sdd/ntn-sim-core-reproduction-targets.md)
5. [Frontend beam visual SDD](./sdd/ntn-sim-core-frontend-beam-visual-sdd.md)
6. [UI exposure spec](./sdd/ntn-sim-core-ui-exposure-spec.md)

### Historical closure / donor documents

Moved to:

- `../archive/ntn-sim-core-sdd-history-2026-03-29/`

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server (HMR enabled) |
| `npm run build` | TypeScript type check + Vite production build |
| `npm run preview` | Preview the `dist/` build output locally |
| `npm run lint` | Run TypeScript type checking (no file output) |
| `npm run validate:structure` | Validate the preflight directory skeleton and ensure legacy paths are gone |
| `npm run validate:trace` | Validate SDD / traceability placeholder docs and directories |
| `npm run validate:profiles` | Validate profile layout (asset/observer/visual separation) + Phase 3 VAL-PLAT-006/007 (type exports / no-circular-import / authored-materialization parity) |
| `npm run validate:stage` | Run lint + build + the preflight validation scripts |

## Project Structure

The authoritative inventory lives in [Implementation Status §4](./sdd/ntn-sim-core-implementation-status.md). The older preflight skeleton is no longer representative of the current tree, and the downstream Group 2 skeleton (`algorithms`, `experiments`, `view-models`) is now part of that authoritative inventory.

The current top-level layout is:

- `src/app/`
  React app shell, query-state logic, live/replay/batch KPI hooks
- `src/config/`
  scene / observer config, including `visual-scene.config.ts` and `observer-presets.ts`
- `src/core/`
  simulator truth layer; includes `config/`, `contracts/`, `models/`, `profiles/`, `engine/`, `orbit/`, `channel/`, `handover/`, `energy/`, `beam/`, `trace/`, `policy/`, `kpi/`, `algorithms/`, and `experiments/`
- `src/runner/`
  `headless/`, `replay/`, `curation/`, plus `runner-exposure-api.ts`
- `src/viz/`
  `beam/`, `satellite/`, `scene/`, `overlays/`, `validation/`, and `view-models/`
- `src/assets/`
  scene / model asset path registry
- `src/styles/`
  global Sass entry (`main.scss`)
- `scripts/`
  validation gates, golden cases, artifact/reproduction runners, and audit utilities
- `public/`
  scene and model assets

## Technical Architecture

### Rendering Pipeline

```
index.html
  → src/main.tsx          React mount point
    → app/AppShell.tsx    App shell
      → viz/scene/SceneShell.tsx
        ├── viz/overlays/Starfield.tsx
        ├── viz/scene/CameraRig.tsx
        ├── viz/scene/LightingRig.tsx
        ├── viz/scene/NTPUScene.tsx
        └── viz/scene/UAV.tsx
```

### Core Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.2 | UI framework |
| **TypeScript** | 5.9 | Type safety |
| **Vite** | 7.1 | Dev server & build tool |
| **Three.js** | 0.180 | WebGL 3D rendering engine |
| **React Three Fiber** | 9.4 | Declarative React wrapper for Three.js |
| **Drei** | 10.7 | R3F utility collection (OrbitControls, PerspectiveCamera, useGLTF, etc.) |
| **Sass** | 1.93 | CSS preprocessor |

### How Three.js Works in This Project

This project integrates Three.js into React via **React Three Fiber (R3F)**:

1. **Canvas** (`SceneShell.tsx`) — R3F's `<Canvas>` component creates a WebGL renderer with ACES Filmic tone mapping, anti-aliasing, and shadow support.

2. **Camera** — Drei's `<PerspectiveCamera>` starts with an overhead view (Y=400, Z=500), 60-degree FOV, with a visible range of 0.1 to 10,000 units.

3. **Orbit Controls** — `<OrbitControls>` provides mouse-drag rotation, scroll zoom, and damping effects, with the polar angle clamped to prevent looking below the horizon.

4. **Lighting System**:
   - `hemisphereLight` — Sky/ground ambient lighting
   - `ambientLight` — Global ambient fill light
   - `directionalLight` — Main directional light (directly above), with 4096x4096 shadow maps

5. **Model Loading** — Drei's `useGLTF` hook loads `.glb` models, paired with `<Suspense>` for async loading states.

### 3D Models

#### Campus Scene — `public/scenes/NTPU.glb` (7.8 MB)

- 3D scene model of the National Taipei University Sanxia campus
- Automatically converts `MeshBasicMaterial` to `MeshStandardMaterial` on load, enabling proper lighting and shadows
- Pre-loaded via `useGLTF.preload()` to reduce initial render delay
- Visual parameters managed in `visual-scene.config.ts` (path, position, scale, rotation)

#### UAV Drone — `public/models/uav.glb` (9.9 MB)

- Drone 3D model, cloned using `SkeletonUtils.clone()` for correct skeleton/bone animation handling
- Includes a `pointLight` to simulate onboard lighting
- Also pre-loaded via `useGLTF.preload()`

#### Satellite Model — `public/models/sat.glb`

- Satellite 3D model available for upcoming NTN/LEO visualization components
- Included up front as a static asset so future orbit, beam, and handover rendering can reuse it directly

### Configuration

Physical and visual configuration are now separated:

```typescript
// src/config/observer-presets.ts
{ id, name, latitudeDeg, longitudeDeg, altitudeM }

// src/config/visual-scene.config.ts
{ scene, uav, satellite, camera, background, debug }
```

This avoids mixing observer/physical inputs with visualization-only scene settings.

### Starfield Background — `Starfield.tsx`

- Generates 180 randomly distributed stars
- Uses pure **CSS `@keyframes` animation** for twinkling effects
- No JS timers or React state updates — zero performance overhead
- Positioned behind the Canvas with `pointer-events: none` to avoid interfering with 3D interactions

## Controls

| Input | Action |
|---|---|
| Left-click drag | Rotate the scene |
| Right-click drag | Pan the scene |
| Scroll wheel | Zoom in/out (distance clamped to 10–2000) |

## Development Notes

- `tsconfig.json` sets `"noEmit": true` — TypeScript only type-checks; actual transpilation is handled by Vite
- `vite.config.ts` configures the `@` alias to point to `src/`, allowing imports like `@/config/...`
- `.glb` models are placed in `public/` — Vite copies them directly to the build output without bundling
