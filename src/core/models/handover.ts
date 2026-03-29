/**
 * HandoverModel — Phase 2 model-bundle interface (P2-7).
 *
 * Defines the HandoverModel interface and DefaultHandoverModel concrete wrapper.
 * All FSM logic remains in handover/baselines.ts; this file is a thin adapter.
 *
 * Layer: L2 (src/core/models/)
 * Authority: phase2-model-bundle-sdd.md §5.5
 *
 * DP-4: DefaultHandoverModel delegates directly to handover/baselines.ts
 * createBaselineFromConfig(). No behavioral change.
 */

import { createBaselineFromConfig } from '../handover/baselines.js';
import type { HandoverManager } from '../handover/types.js';
import type { HandoverConfig } from '../profiles/types.js';

// Re-export for convenience
export type { HandoverManager, HandoverConfig };

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface HandoverModel {
  readonly familyId: 'a3' | 'a4' | 'cho' | 'timer-cho' | 'mc-ho' | 'daps' | 'max-elevation' | 'd2' | string;
  createManager(config: HandoverConfig): HandoverManager;
}

// ---------------------------------------------------------------------------
// Concrete wrapper: DefaultHandoverModel
// ---------------------------------------------------------------------------

/**
 * Wraps handover/baselines.ts createBaselineFromConfig().
 * One DefaultHandoverModel covers all handover algorithm families;
 * familyId is the handover type string forwarded from ProfileConfig.
 */
export class DefaultHandoverModel implements HandoverModel {
  readonly familyId: string;

  constructor(familyId: string) {
    this.familyId = familyId;
  }

  createManager(config: HandoverConfig): HandoverManager {
    return createBaselineFromConfig(config);
  }
}
