# NTN Sim Core — Preflight Refactor Closure

**Version:** 0.1.0  
**Date:** 2026-03-20  
**Status:** Completed Preflight

---

## 1. Purpose

This closure note records the preflight refactor that was completed before Phase 0 runtime development began.

The purpose of the refactor was to prevent the new project from inheriting the legacy shape of a visualization-only shell while the SDD already required:

1. clear app/viz/core/runner separation;
2. separation of physical and visual configuration;
3. asset registry ownership;
4. basic governance scripts before simulation logic lands.

---

## 2. Why It Was Necessary

Before the refactor, the repository still looked like a generic 3D scene starter:

1. `src/App.tsx` directly owned the scene entry
2. `src/components/scene/**` owned all visible rendering behavior
3. `src/config/ntpu.config.ts` mixed:
   - observer/physical information
   - scene asset paths
   - camera and visual shell settings

That structure was acceptable for a demo shell, but it directly conflicted with the new SDD and would have made upcoming orbit/channel/handover work drift into the visualization layer.

---

## 3. Completed Changes

### 3.1 Directory and Ownership Refactor

Completed:

1. added `src/app/AppShell.tsx`
2. added `src/assets/models.ts` and `src/assets/scenes.ts`
3. added `src/viz/scene/**` and `src/viz/overlays/**`
4. added `src/core/**` and `src/runner/**` placeholder directories
5. removed legacy:
   - `src/App.tsx`
   - `src/components/**`

### 3.2 Configuration Split

Completed:

1. observer presets moved to `src/config/observer-presets.ts`
2. visual shell settings moved to `src/config/visual-scene.config.ts`

This establishes the first explicit boundary between physical/location inputs and visual scene inputs.

### 3.3 Asset Registry

Completed:

1. registered `sat.glb`
2. registered `uav.glb`
3. registered `NTPU.glb`

This prevents model paths from being hidden inside unrelated config files or render components.

### 3.4 Validation Entry Points

Completed:

1. `scripts/validate-structure.mjs`
2. `scripts/validate-profile-layout.mjs`
3. `scripts/validate-traceability-placeholders.mjs`
4. `package.json` scripts:
   - `validate:structure`
   - `validate:profiles`
   - `validate:trace`
   - `validate:stage`

---

## 4. Validation Result

The preflight refactor was verified with:

1. `npm install`
2. `npm run validate:stage`

Observed result:

1. TypeScript lint passed
2. production build passed
3. preflight structure validation passed
4. preflight traceability placeholder validation passed
5. preflight profile/config separation validation passed

Known non-blocking note:

1. Vite reported a large output chunk warning during build; this is not a blocker for the preflight refactor

---

## 5. What This Refactor Did Not Do

It did **not** implement:

1. orbit propagation
2. profile schemas
3. run manifests
4. trace payload contracts
5. headless benchmark runner
6. replay runner
7. any research KPI logic

Those remain part of Phase 0 and later phases.

---

## 6. Outcome

The repository is now aligned with the SDD at the top-level ownership boundary.

In practical terms:

1. visualization has a clean home in `src/viz`
2. physical observer input no longer shares a file with visual shell settings
3. `src/core` and `src/runner` exist as explicit future homes for simulation truth
4. future Phase 0 work can start from schema and runtime contracts instead of doing another structural migration first
