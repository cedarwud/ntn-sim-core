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

- synthetic Walker 與 real-trace TLE/SGP4 軌道路徑
- multi-beam SINR / link budget / Doppler / fading channel family
- A3 / A4 / D2 / CHO / Timer-CHO / MC-HO / DAPS handover runtime
- Layer 1 / Layer 2 energy modeling
- beam hopping scheduler families
- deterministic replay / benchmark / validation artifacts
- 對應的 3D 視覺化與 explainability overlays

它目前仍保留國立臺北大學（NTPU）校園場景、UAV 與 satellite 資產，並按照 SDD 轉成 `app / viz / core / runner` 分層架構。

技術架構採用 **React + TypeScript + Vite**，透過 **React Three Fiber** 將 Three.js 整合進 React 生態系，實現宣告式的 3D 場景管理。

## 文件權威關係

對 `ntn-sim-core` 的工作，請優先以下列文件為 authority：

1. [SDD 文件總覽](./sdd/README.md)
2. [Implementation Status](./sdd/ntn-sim-core-implementation-status.md)
3. [Profile Baselines](./sdd/ntn-sim-core-profile-baselines.md)
4. [Development Constraints](./sdd/ntn-sim-core-development-constraints.md)
5. [Assumption Policy](./sdd/ntn-sim-core-assumption-policy.md)

本 README 的角色是專案入口與導覽頁，不取代上述 SDD/狀態文件。

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

1. [正式架構藍圖](./docs/architecture/ntn-sim-core-architecture-blueprint.md)
2. [軟體設計文件 SDD](./sdd/ntn-sim-core-sdd.md)
3. [baseline 參數與公式來源](./sdd/ntn-sim-core-profile-baselines.md)
4. [開發 roadmap](./sdd/ntn-sim-core-roadmap.md)
5. [驗證矩陣](./sdd/ntn-sim-core-validation-matrix.md)
6. [開發限制規範](./sdd/ntn-sim-core-development-constraints.md)
7. [驗收與研究聲明 gate](./sdd/ntn-sim-core-acceptance-gates.md)
8. [assumption policy](./sdd/ntn-sim-core-assumption-policy.md)
9. [實作狀態](./sdd/ntn-sim-core-implementation-status.md)
10. [前端波束視覺 SDD](./sdd/ntn-sim-core-frontend-beam-visual-sdd.md)
11. [前端波束視覺驗收](./sdd/ntn-sim-core-frontend-beam-visual-acceptance.md)
12. [前端 donor 對應表](./sdd/ntn-sim-core-frontend-donor-mapping.md)
13. [leo-parity 前端模式 SDD](./sdd/ntn-sim-core-frontend-leo-parity-mode.md)
14. [最終 closure checklist](./sdd/ntn-sim-core-final-closure-checklist.md)
15. [UI / 參數暴露層規範](./sdd/ntn-sim-core-ui-exposure-spec.md)

目前 `leo-parity` mode 已有同頁切換入口與第一版 presenter-driven beam density，可用 `?view=leo-parity` 直接進入。

## 目前狀態摘要

依 [Implementation Status](./sdd/ntn-sim-core-implementation-status.md)：

- 目前 phase 0 到 phase 6 為 closure-complete
- `validate:stage` 為 passing 狀態
- 已含 channel / handover / replay / beam hopping / energy L1/L2 / DAPS 主線

因此閱讀本專案時，應把它視為 **研究型模擬器主體**，不是單純的 Three.js frontend shell。

### 可用指令

| 指令 | 說明 |
|---|---|
| `npm run dev` | 啟動 Vite 開發伺服器（HMR 熱更新） |
| `npm run build` | TypeScript 型別檢查 + Vite 生產建置 |
| `npm run preview` | 本地預覽 `dist/` 建置產物 |
| `npm run lint` | 執行 TypeScript 型別檢查（不輸出檔案） |
| `npm run validate:structure` | 驗證 preflight 目錄骨架與舊結構是否已清除 |
| `npm run validate:trace` | 驗證 SDD / traceability placeholder 文件與目錄是否存在 |
| `npm run validate:profiles` | 驗證 asset registry 與 observer / visual config 是否已分離 |
| `npm run validate:stage` | 執行 lint + build + preflight validation scripts |

## 專案結構

```  
ntn-sim-core/
├── index.html                  # HTML 入口，載入 /src/main.tsx
├── package.json                # 專案設定與依賴管理
├── tsconfig.json               # TypeScript 設定（noEmit，僅型別檢查）
├── vite.config.ts              # Vite 建置設定（alias、dev server、sourcemap）
│
├── public/                     # 靜態資源（Vite 直接複製到 dist/）
│   ├── models/
│   │   ├── sat.glb             # 衛星 3D 模型
│   │   └── uav.glb             # UAV 無人機 3D 模型（9.9 MB）
│   └── scenes/
│       └── NTPU.glb            # 國立臺北大學校園 3D 場景模型（7.8 MB）
│
├── src/
│   ├── main.tsx                # 應用程式入口：掛載 React 到 DOM
│   ├── app/
│   │   └── AppShell.tsx        # app shell，接到 viz 層入口
│   ├── assets/
│   │   ├── models.ts           # sat/uav 資產 registry
│   │   └── scenes.ts           # scene 資產 registry
│   ├── config/
│   │   ├── observer-presets.ts # observer preset（物理/觀測站）
│   │   └── visual-scene.config.ts # 純視覺 shell 設定
│   ├── core/
│   │   └── README.md           # simulation-truth layer placeholder
│   ├── runner/
│   │   └── README.md           # headless / replay / curation placeholder
│   ├── styles/
│   │   └── main.scss           # 全域樣式（CSS reset、全螢幕佈局）
│   └── viz/
│       ├── README.md           # visualization-only layer contract
│       ├── overlays/
│       │   └── Starfield.tsx   # CSS 星空背景動畫
│       └── scene/
│           ├── SceneShell.tsx  # Canvas + scene composition
│           ├── CameraRig.tsx   # camera + controls
│           ├── LightingRig.tsx # lighting setup
│           ├── LoaderOverlay.tsx
│           ├── NTPUScene.tsx   # campus asset renderer
│           └── UAV.tsx         # UAV asset renderer
│
├── scripts/                    # preflight validation scripts
└── dist/                       # 建置輸出（.gitignore 忽略）
```

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

NTN Sim Core is a research-oriented NTN/LEO simulator shell built with Three.js tooling. It currently keeps the NTPU campus scene plus UAV and satellite assets, while the codebase is being reshaped into the planned `app / viz / core / runner` architecture.

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

1. [Formal architecture blueprint](./docs/architecture/ntn-sim-core-architecture-blueprint.md)
2. [Software Design Document](./sdd/ntn-sim-core-sdd.md)
3. [Baseline parameters and formula sources](./sdd/ntn-sim-core-profile-baselines.md)
4. [Development roadmap](./sdd/ntn-sim-core-roadmap.md)
5. [Validation matrix](./sdd/ntn-sim-core-validation-matrix.md)
6. [Development constraints](./sdd/ntn-sim-core-development-constraints.md)
7. [Acceptance gates](./sdd/ntn-sim-core-acceptance-gates.md)
8. [Assumption policy](./sdd/ntn-sim-core-assumption-policy.md)
9. [Implementation status](./sdd/ntn-sim-core-implementation-status.md)
10. [Frontend beam visual SDD](./sdd/ntn-sim-core-frontend-beam-visual-sdd.md)
11. [Frontend beam visual acceptance](./sdd/ntn-sim-core-frontend-beam-visual-acceptance.md)
12. [Frontend donor mapping](./sdd/ntn-sim-core-frontend-donor-mapping.md)

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server (HMR enabled) |
| `npm run build` | TypeScript type check + Vite production build |
| `npm run preview` | Preview the `dist/` build output locally |
| `npm run lint` | Run TypeScript type checking (no file output) |
| `npm run validate:structure` | Validate the preflight directory skeleton and ensure legacy paths are gone |
| `npm run validate:trace` | Validate SDD / traceability placeholder docs and directories |
| `npm run validate:profiles` | Validate the separation between asset registry, observer presets, and visual scene config |
| `npm run validate:stage` | Run lint + build + the preflight validation scripts |

## Project Structure

```
ntn-sim-core/
├── index.html                  # HTML entry, loads /src/main.tsx
├── package.json                # Project config & dependency management
├── tsconfig.json               # TypeScript config (noEmit, type-check only)
├── vite.config.ts              # Vite build config (alias, dev server, sourcemap)
│
├── public/                     # Static assets (copied directly to dist/ by Vite)
│   ├── models/
│   │   ├── sat.glb             # Satellite 3D model
│   │   └── uav.glb             # UAV drone 3D model (9.9 MB)
│   └── scenes/
│       └── NTPU.glb            # NTPU campus 3D scene model (7.8 MB)
│
├── src/
│   ├── main.tsx                # App entry: mounts React to DOM
│   ├── app/
│   │   └── AppShell.tsx        # App shell wired to the viz entry
│   ├── assets/
│   │   ├── models.ts           # sat/uav asset registry
│   │   └── scenes.ts           # scene asset registry
│   ├── config/
│   │   ├── observer-presets.ts # Observer presets (physical/location side)
│   │   └── visual-scene.config.ts # Visual shell config only
│   ├── core/
│   │   └── README.md           # simulation-truth layer placeholder
│   ├── runner/
│   │   └── README.md           # headless / replay / curation placeholder
│   ├── styles/
│   │   └── main.scss           # Global styles (CSS reset, fullscreen layout)
│   └── viz/
│       ├── README.md           # visualization-only layer contract
│       ├── overlays/
│       │   └── Starfield.tsx   # CSS starfield background animation
│       └── scene/
│           ├── SceneShell.tsx  # Canvas + scene composition
│           ├── CameraRig.tsx   # camera + controls
│           ├── LightingRig.tsx # lighting setup
│           ├── LoaderOverlay.tsx
│           ├── NTPUScene.tsx   # campus asset renderer
│           └── UAV.tsx         # UAV asset renderer
│
├── scripts/                    # preflight validation scripts
└── dist/                       # Build output (gitignored)
```

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
