# NTN Sim Core Agent Skills Index

這個資料夾保留給 `ntn-sim-core` 的 **project-local reusable skills**。

它們是 workflow aids，不是 authority。真正的規則仍以：

1. [`agent-governance.md`](/home/u24/papers/ntn-sim-core/agent-governance.md)
2. active SDD set
3. frozen contracts / provenance / validation surfaces

為準。

## 1. Current Project-Local Skills

目前已實作的 project-local skills：

1. [`ntn-phase-preflight`](/home/u24/papers/ntn-sim-core/agent-skills/ntn-phase-preflight/SKILL.md)
   - phase / follow-on 開始前的 authority / reviewer / validation preflight
2. [`ntn-sdd-sync`](/home/u24/papers/ntn-sim-core/agent-skills/ntn-sdd-sync/SKILL.md)
   - SDD / status / validation / README / todo 同步
3. [`ntn-validation-gate-runner`](/home/u24/papers/ntn-sim-core/agent-skills/ntn-validation-gate-runner/SKILL.md)
   - validation gate 選擇與 closure evidence 檢查
4. [`ntn-todo-prompt-maintainer`](/home/u24/papers/ntn-sim-core/agent-skills/ntn-todo-prompt-maintainer/SKILL.md)
   - `todo/` handoff / archive / completed surface 維護
5. [`paper-to-parameter-provenance`](/home/u24/papers/ntn-sim-core/agent-skills/paper-to-parameter-provenance/SKILL.md)
   - 論文 / 標準到 parameter / provenance surface 的映射
6. [`ntn-openspec-follow-on-kickoff`](/home/u24/papers/ntn-sim-core/agent-skills/ntn-openspec-follow-on-kickoff/SKILL.md)
   - 判斷 future `OMNeT++ / INET / estnet` 或其他 external-consumer/backend realism track 是否適合用 OpenSpec 啟動

## 2. Assistant-Local Supplemental Skills

`ntn-sim-core` 也會引用 assistant-local 安裝的補充技能，位置通常在：

1. `.codex/skills/`
2. `.claude/skills/`
3. `.gemini/skills/`

目前常用：

1. `ui-ux-pro-max`
2. `frontend-design`
3. `webapp-testing`
4. `skill-creator`

這些是 supplemental tools，不是 repo-local skills，也不應覆蓋 active SDD / frozen contracts。

## 3. Workspace-Level External References

workspace 還有一些 external/reference repos，例如：

1. `OpenSpec/`
2. `autoresearch/`
3. `ui-ux-pro-max-skill/`

它們的 discoverability 入口在：

- [`/home/u24/papers/skills/README.md`](/home/u24/papers/skills/README.md)
- [`/home/u24/papers/skills/skill-bootstrap-manifest.json`](/home/u24/papers/skills/skill-bootstrap-manifest.json)

不要把這些 external/reference repos 直接搬進 `ntn-sim-core/agent-skills/` 當 project-local skill。

## 4. Rules

1. 新 skill 只有在它真的是 `ntn-sim-core` 的可重複 workflow 時，才應新增到這個資料夾。
2. skill 應引用 authority，不應重寫另一套規則。
3. 若 task 只是需要 external workflow discovery，先讀 workspace-level [`/home/u24/papers/skills/README.md`](/home/u24/papers/skills/README.md)，不要直接把外部 repo 當成本地 authority。
4. 若在新環境缺少 supplemental skill，先讀 [`/home/u24/papers/skills/skill-bootstrap-manifest.json`](/home/u24/papers/skills/skill-bootstrap-manifest.json)；只有標記為 `installable` 的條目可 install-on-demand。
5. 若未來要開新的 consumer/backend realism track，先用 `ntn-openspec-follow-on-kickoff` 做 go/no-go / placement 判斷，再決定是否真的啟用 OpenSpec。
