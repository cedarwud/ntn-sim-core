/**
 * kpi-v1 — Frozen KPI contract.
 *
 * @version v1
 * @frozen 2026-03-30 (Phase 4 Group 2 — phase4-runtime-contract-sdd.md §4.2)
 *
 * Consumer boundary:
 *   - src/viz/**  may import KpiBundle (display only)
 *   - src/app/hooks/**  may import KpiBundle + BatchKpiEntry
 *   - src/runner/**  may import directly from internal source instead
 *
 * Authoritative definition of BatchKpiEntry (moved from useBatchKpi.ts).
 *
 * Forbidden:
 *   This file must NOT import React, Three.js, @react-three, @/viz, or @/app.
 *   (SDD §5.1 F1–F3)
 */

import type { KpiBundle as _KpiBundle } from '@/core/kpi/types';

export type {
  /** @version v1 @frozen */
  KpiBundle,
} from '@/core/kpi/types';

/**
 * Single entry in a batch KPI run.
 *
 * @version v1
 * @frozen 2026-03-30 (phase4-runtime-contract-sdd.md §4.2)
 *
 * Authoritative definition — useBatchKpi.ts re-exports from here.
 */
export interface BatchKpiEntry {
  /** Profile ID that was run. */
  profileId: string;
  /** Full KPI bundle from the benchmark run. */
  kpi: _KpiBundle;
  /** Wall-clock time for the run in milliseconds. */
  wallClockMs: number;
}
