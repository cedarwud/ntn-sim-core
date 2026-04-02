# NTN Sim Core Agent Skills Roadmap

這個資料夾保留給 `ntn-sim-core` 專用 skills。

目前已正式實作第一批 skills：

1. `ntn-phase-preflight`
2. `ntn-sdd-sync`
3. `ntn-validation-gate-runner`
4. `ntn-todo-prompt-maintainer`
5. `paper-to-parameter-provenance`
6. `ntn-openspec-follow-on-kickoff`

其餘項目仍先保留為規劃清單，避免後續由不同 agent 接手時又回到零散 prompt 驅動。

另外，`ntn-sim-core` 也已安裝幾個 assistant-local 外部 skills，位置在：

- `.codex/skills/`
- `.claude/skills/`
- `.gemini/skills/`

目前已安裝：

1. `ui-ux-pro-max`
2. `frontend-design`
3. `webapp-testing`
4. `skill-creator`

這些外部 skills 是補充工具，不是 authority。使用時仍要先讀：

1. `agent-governance.md`
2. active SDD
3. frozen contracts / provenance surfaces

## 1. 目標

`ntn-sim-core` 正在從單篇 paper 導向的模擬器，重構成：

- parameter-driven
- model-pluggable
- provenance-aware
- contract-stable

因此 skill 的目的不是取代 SDD，而是讓 agent 在反覆執行以下工作時更穩定：

- phase preflight
- SDD / code / validation 同步
- parameter provenance 整理
- contract drift 檢查
- downstream MODQN / UI / estnet 開發

## 2. 建議位置

每個 skill 建議使用：

- `ntn-sim-core/agent-skills/<skill-name>/SKILL.md`

必要時可在 skill 目錄下增加：

- `references/`
- `templates/`
- `scripts/`

但除非 skill 已進入「立即做」或已確定要在下一個 phase 使用，否則先不要建立空殼目錄。

## 3. 優先順序

### A. 立即做

這些 skill 會直接降低 Platform Refactor Phase 3–5 的偏差與重工成本。

1. `ntn-phase-preflight`
   - 用途：每個 phase/group 開始前檢查 authority、前一組 reviewer 結論、implementation-status、validation gates、prompt 是否需要微調。
2. `ntn-sdd-sync`
   - 用途：每次 phase/group 完成後，檢查哪些 SDD、status、validation matrix、todo docs 需要同步。
3. `ntn-validation-gate-runner`
   - 用途：依 phase 自動判斷應跑哪些 gate 與驗證腳本，並輸出 block/non-block 結論。
4. `ntn-todo-prompt-maintainer`
   - 用途：維護 `todo/README.md`、各 phase/group prompt 檔、completed/archive 分流與組數估計。

### B. Platform Refactor 後做

這些 skill 依賴 Phase 3–5 完成後的穩定 contract、registry 與 exposure 邊界。

1. `paper-to-parameter-provenance`
   - 用途：把新論文/標準中的參數值、範圍、locator 映射到 parameter registry 與 provenance surfaces。
2. `ntn-contract-drift-review`
   - 用途：檢查 runtime、registry、contracts、UI metadata、external consumer 之間是否 drift。
3. `ntn-ui-exposure-workflow`
   - 用途：檢查 `Realistic / Advanced / Sensitivity / Internal-only` 暴露策略，避免 derived quantities 被錯誤暴露。
4. `estnet-contract-integration`
   - 用途：處理 `ntn-sim-core` 與 `project/estnet-ui-kickoff` 的 contract 對接，而不是讓 consumer 直接吃內部 runtime 細節。
5. `ntn-openspec-follow-on-kickoff`
   - 用途：判斷未來 `OMNeT++ / INET / estnet` 或其他 external-consumer/backend realism track 是否適合用 OpenSpec 啟動，並明確限制它不能取代目前的 `sdd/` authority。

`project/estnet-ui-kickoff` 在這個階段仍視為 future consumer notes，不建議現在就建立 project-local skills。只有在以下條件成立後，才建議升級成獨立治理與 skill 目標：

1. 該資料夾開始出現實際程式碼結構（例如 `src/`、`package.json`、build/test scripts）
2. `v0-bridge-schema.md` 或後繼文件升格成穩定 consumer contract
3. 該專案開始主動消費 `ntn-sim-core` 的 runtime/output/contracts，而不再只是 kickoff notes

屆時再考慮新增：

- `project/estnet-ui-kickoff/AGENTS.md`
- project-local skills，例如：
  - `estnet-bridge-contract-sync`
  - `estnet-ui-consumer-validation`
  - `estnet-scenario-demo-builder`

### C. MODQN 後做

這些 skill 依賴 platform refactor 完成，且 MODQN 已被正式升格成 active program。

1. `modqn-spec-workflow`
   - 用途：整理 baseline papers、state/action/reward/KPI 邊界，並同步 MODQN SDD。
2. `modqn-experiment-audit`
   - 用途：檢查 baseline comparison、artifact export、thesis-ready outputs、ablation 與 sensitivity 結果。

### D. MODQN 後 UI / Product Layer

這些 skill 依賴：

- platform refactor 完成
- MODQN runtime 與 experiments 已穩定
- parameter registry、runtime contracts、exposure modes 已可作為 UI 的單一來源

1. `ntn-ui-exposure-workflow`
   - 用途：檢查 `Realistic / Advanced / Sensitivity / Internal-only` 暴露策略，避免 derived quantities 被錯誤暴露成自由控制項。
2. `ntn-ui-parameter-panel-builder`
   - 用途：把 parameter registry 轉成前端控制項結構，例如 slider、dropdown、preset、read-only derived field。
3. `ntn-ui-kpi-visualization-workflow`
   - 用途：把 simulator output 轉成穩定的 KPI 視圖，例如 SINR、handover count、throughput、EE、interruption、beam/satellite timeline。
4. `ntn-ui-scenario-preset-builder`
   - 用途：維護 scenario presets、paper presets、baseline presets，避免前端直接硬寫 preset semantics。
5. `modqn-ui-comparison-workflow`
   - 用途：建立 baseline / MODQN / EE-MODQN 的比較面板與 artifact 視覺化流程。
6. `estnet-contract-integration`
   - 用途：定義 `ntn-sim-core` 與 `project/estnet-ui-kickoff` 的 contract 對接方式，而不是讓 consumer 直接依賴內部 runtime 結構。

## 4. 最小可行集合

如果現在只先做最少量的 skills，建議順序是：

1. `ntn-phase-preflight`
2. `ntn-sdd-sync`
3. `ntn-validation-gate-runner`

這 3 個 skill 幾乎立刻就能服務接下來的 Platform Refactor phases。

## 5. 啟用規則

1. 任何新建 skill 都不應覆蓋：
   - `AGENTS.md`
   - `agent-governance.md`
   - active SDD authority
2. skill 應該引用這些 authority，而不是自行重述一整套規則。
3. 如果某個 skill 需要 phase-specific 行為，應明確寫出：
   - 適用 phase
   - 前置文件
   - 不適用情境
4. skill 只應固化「可重複工作流」，不要把暫時性的 prompt 細節寫死進 skill。

## 6. 當前建議

目前已落地的是：

1. `ntn-phase-preflight`
2. `ntn-sdd-sync`
3. `ntn-validation-gate-runner`
4. `ntn-openspec-follow-on-kickoff`

其餘 skills 先保留在這份 roadmap 中即可。

如果進入 MODQN 後的 UI/product 階段，最值得先落地的是：

1. `ntn-ui-exposure-workflow`
2. `ntn-ui-parameter-panel-builder`
3. `ntn-ui-kpi-visualization-workflow`

目前已安裝、可直接被 assistant-local wrapper 引用的外部 skills 是：

1. `ui-ux-pro-max`
2. `frontend-design`
3. `webapp-testing`
4. `skill-creator`

補充：

- `ntn-openspec-follow-on-kickoff` 是 repo-local workflow skill，不是 OpenSpec upstream integration。
- 它的目的是幫 future-track kickoff 做 go/no-go 與 placement 判斷，不是把 `ntn-sim-core` 現行治理改成 OpenSpec。
