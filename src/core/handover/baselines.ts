/**
 * Pre-configured handover baseline factories.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.3
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §3, §4
 *   - This file must not import React, Three.js, or scene code.
 */

import type { HandoverConfig } from '@/core/profiles/types';
import type { HandoverManager } from './types';
import { createHandoverManager } from './manager';
import { createDapsManager } from './daps';
import { createChoManager } from './cho';
import { createMcHoManager } from './mc-ho';
import { createD2Manager } from './d2-distance';
import { createMaxElevationManager, createMaxRemainingTimeManager } from './ranking';
import { createSinrOffsetManager } from './sinr-offset';

/**
 * Hard handover baseline: immediate switch with no TTT.
 * Overrides ttt_ms to 0 regardless of config value.
 */
function createHardHoBaseline(config: HandoverConfig): HandoverManager {
  return createHandoverManager({
    ...config,
    type: 'hard-ho',
    ttt_ms: 0,
    hysteresis_db: 0,
  });
}

/**
 * A4-event baseline: absolute threshold with TTT.
 * Uses config values as-is (ensures type is 'a4-event').
 */
function createA4Baseline(config: HandoverConfig): HandoverManager {
  return createHandoverManager({
    ...config,
    type: 'a4-event',
  });
}

/**
 * Dispatch factory: creates the appropriate baseline from config.type.
 */
export function createBaselineFromConfig(config: HandoverConfig): HandoverManager {
  switch (config.type) {
    case 'hard-ho':
      return createHardHoBaseline(config);
    case 'a4-event':
      return createA4Baseline(config);
    case 'a3-event':
      return createHandoverManager(config);
    case 'daps':
      return createDapsManager({
        triggerThresholdDb: config.trigger_threshold_db,
        hysteresisDb: config.hysteresis_db,
        preparationTimeSec: config.daps_preparation_time_sec ?? 0.5,
        maxDualActiveSec: config.daps_max_dual_active_sec ?? 2.0,
        pathSwitchThresholdDb: config.trigger_threshold_db,
        minElevationDeg: config.min_elevation_deg,
        packetDuplication: true,
      });
    case 'cho':
      return createChoManager(config);
    case 'timer-cho':
      return createChoManager(config);
    case 'mc-ho':
      return createMcHoManager(config);
    case 'd2-distance':
      return createD2Manager(config);
    case 'max-elevation':
      return createMaxElevationManager(config);
    case 'max-remaining-time':
      return createMaxRemainingTimeManager(config);
    case 'sinr-offset':
      return createSinrOffsetManager(config);
    default:
      return createHandoverManager({ ...config, type: 'a4-event' });
  }
}
