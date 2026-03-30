/**
 * runtime-v1 — Frozen runtime snapshot contract.
 *
 * @version v1
 * @frozen 2026-03-30 (Phase 4 Group 2 — phase4-runtime-contract-sdd.md §4.1)
 *
 * Consumer boundary:
 *   - src/viz/**  may import from this file (read-only, display)
 *   - src/app/hooks/**  may import from this file
 *   - src/runner/**  may import directly from internal source instead
 *
 * Breaking change policy:
 *   A new incompatible shape creates runtime-v2.ts; this file is deprecated
 *   but NOT deleted until all consumers are migrated.
 *
 * Forbidden:
 *   This file must NOT import React, Three.js, @react-three, @/viz, or @/app.
 *   (SDD §5.1 F1–F3)
 */

export type {
  /** @version v1 @frozen */
  SimulationSnapshot,
  /** @version v1 @frozen */
  SatelliteState,
  /** @version v1 @frozen */
  UeState,
  /** @version v1 @frozen */
  BhSlotSnapshot,
  /** @version v1 @frozen */
  DapsSnapshot,
  /** @version v1 @frozen */
  HoLogEntry,
  /** @version v1 @frozen */
  SatelliteBeamSnapshot,
  /** @version v1 @frozen */
  BeamRole,
  /** @version v1 @frozen */
  ContinuityState,
} from '@/core/common/types';
