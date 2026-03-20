# NTN Sim Core — Implementation Status

**Version:** 0.1.0  
**Date:** 2026-03-20  
**Status:** Preflight Refactor Landed

---

## 1. Authority

This file is the authoritative status tracker for the `ntn-sim-core` SDD set.

---

## 2. Document Status

| Document | Role | Status |
|---|---|---|
| `docs/architecture/ntn-sim-core-architecture-blueprint.md` | architecture blueprint | drafted |
| `sdd/ntn-sim-core-sdd.md` | normative SDD | drafted |
| `sdd/ntn-sim-core-profile-baselines.md` | detailed baseline companion | drafted |
| `sdd/ntn-sim-core-roadmap.md` | implementation plan | drafted |
| `sdd/ntn-sim-core-validation-matrix.md` | gate definition | drafted |
| `sdd/ntn-sim-core-preflight-refactor-closure.md` | preflight closure note | drafted |
| `sdd/ntn-sim-core-development-constraints.md` | implementation-time prohibitions | drafted |
| `sdd/ntn-sim-core-acceptance-gates.md` | acceptance and claim gates | drafted |
| `sdd/ntn-sim-core-assumption-policy.md` | assumption governance | drafted |
| `sdd/README.md` | document index | drafted |

---

## 3. Phase Status

| Phase | Name | Status | Notes |
|---|---|---|---|
| 0 | Foundation and Governance | in_progress | preflight refactor landed: `src` skeleton, config split, asset registry, validation scripts, and `validate:stage` passed; schemas and simulation-truth contracts still pending |
| 1 | Synthetic Orbit and Visual Baseline | planned | current repo is only a visualization shell |
| 2 | Channel, KPI, and Handover Baseline | planned | no research runtime yet |
| 3 | HOBS Multi-Beam and Energy Layer 1 | planned | no active-beam or EE path yet |
| 4 | Real-Trace Validation and Replay Curation | planned | no TLE/replay pipeline yet |
| 5 | Beam Hopping and Energy Layer 2 | planned | no BH truth or onboard energy model yet |
| 6 | DAPS / DC-Like and Policy Extension Layer | planned | intentionally deferred until baseline is stable |

---

## 4. Immediate Next Steps

1. define profile, manifest, replay-manifest, and source-trace schemas
2. start the first `src/core/profiles` and `src/core/trace` contracts
3. add typed placeholders for headless runner and replay runner inputs/outputs
4. keep `app / assets / config / viz` stable while Phase 1 orbit code lands

## 5. Landed Preflight Scope

Completed in the preflight refactor:

1. replaced the legacy `src/App.tsx` + `src/components/**` shape with `src/app`, `src/assets`, and `src/viz`
2. split the mixed `ntpu.config.ts` contract into:
   - `src/config/observer-presets.ts`
   - `src/config/visual-scene.config.ts`
3. introduced typed asset registries for scene and model paths
4. created `src/core/**` and `src/runner/**` placeholders without leaking viz logic into them
5. introduced preflight validation scripts and wired them into `npm run validate:stage`

## 6. Closure References

1. `sdd/ntn-sim-core-preflight-refactor-closure.md`
