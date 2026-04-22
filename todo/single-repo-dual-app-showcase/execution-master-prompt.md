# Single-Repo Dual-App Showcase Execution Master Prompt

**Status:** Active handoff prompt for the repaired dual-app authority chain and
the promoted Phase 3 rendering reopen.
**Authority:**
1. `sdd/single-repo-dual-app-showcase-authority-chain-repair-follow-on.md`
2. `sdd/single-repo-dual-app-showcase-phase3-rendering-follow-on.md`
3. `sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`

## 1. Required Reads

Read these first:

1. `sdd/single-repo-dual-app-showcase-authority-chain-repair-follow-on.md`
2. `sdd/single-repo-dual-app-showcase-phase3-rendering-follow-on.md`
3. `sdd/single-repo-dual-app-showcase-mainline-additive-reintegration-follow-on.md`
4. `sdd/ntn-sim-core-implementation-status.md`
5. `scripts/validate-contracts.mjs`
6. `scripts/validate-showcase-consumer-browser.ts`
7. `project/leo-beam-sim/src/scene/MainScene.tsx`
8. `project/leo-beam-sim/src/viz/SatelliteBeams.tsx`
9. `project/leo-beam-sim/src/viz/HandoverLinks.tsx`
10. `project/leo-beam-sim/src/viz/SinrOverlay.tsx`

## 2. Current State

The current tree already lands the dual-app baseline:

1. `SceneShell` is still the default `main` surface;
2. `?app=showcase-consumer` still routes to `ShowcaseConsumerHost`;
3. `showcase-consumer.html` is the packaged canonical entrypoint;
4. `ShowcaseConsumerHost` is still the sole publisher;
5. `ShowcaseConsumerApp` is still consumer-only;
6. `validate:contracts` and `validate:showcase-consumer-browser` still pass.

The current active work is not to re-prove that baseline. The current active
work is to reopen the missing Phase 3 rendering/presentation finish line.

## 3. Execution Modes

### Planning mode

Use this mode when the next implementation slice is not yet nailed down.

Return:

1. the donor-to-current mapping
2. the chosen next slice
3. the exact files expected to change
4. the validation plan
5. any blocker that would force a narrower preflight before coding

### Implementation mode

Use this mode only when one slice is explicitly named.

Return:

1. changed files
2. what the slice implemented
3. validation run
4. any deviations from the SDD
5. what the next slice should be

## 4. Hard Constraints

Do not:

1. change runtime ownership;
2. replace `ShowcaseConsumerHost` as publisher;
3. widen source paths to `live` or `external-directory`;
4. change deterministic IDs, starter family, `summary.*`, or `Primary SINR`
   semantics;
5. use `SceneShell` as the reopened showcase contract;
6. borrow donor runtime behavior from `project/leo-beam-sim`;
7. add a new dual-app `VAL-*` gate unless a same-change justification is
   explicit.

## 5. Default Validation

Unless the slice explicitly justifies something smaller, run:

1. `npm run lint`
2. `npm run build`
3. `npm run validate:contracts`
4. `npm run validate:showcase-consumer-browser`
