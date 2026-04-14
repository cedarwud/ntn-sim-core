/**
 * Phase 03A Consumer Adapter — Replay frame builder.
 *
 * Converts validated `ModqnTimelineRow[]` into slot-indexed
 * `ModqnReplayFrame[]`. Per-slot geometry (satelliteStates, beamStates) is
 * lifted once per slot from the first row in that slot; subsequent rows for
 * the same slot must agree with that geometry snapshot under deep
 * structural equality or the adapter rejects the frame.
 *
 * Governance:
 *   - Consumer SDD: sdd/modqn-bundle-replay-consumer-sdd.md
 *   - Rule: no recomputation — this module ONLY reshapes truth, it does
 *     not derive handover decisions, beam centers, or serving links.
 *
 * Tightening summary (Phase 03A Slice B contract fix):
 *   1. Per-slot geometry now requires DEEP structural equality across all
 *      user rows in the slot, not just matching satId/beamId ordering.
 *      Same-ID drift (e.g. the same `sat-0` with a shifted positionEciKm
 *      between users in the same slot) now hard-fails.
 *   2. `decisionTimeSec` must agree across all user rows in the slot.
 *      This catches silent slot-alignment drift at the producer boundary.
 */

import { ModqnBundleSchemaError } from './schema-guard';
import type {
  ModqnBeamState,
  ModqnReplayFrame,
  ModqnReplayUserRecord,
  ModqnSatelliteState,
  ModqnTimelineRow,
} from './types';

/**
 * Canonical structural serialization for per-slot geometry.
 *
 * Produces a stable string that deep-compares two geometry arrays. We use
 * field-ordered JSON so that key-order noise in the producer output does
 * not trigger false mismatches, but numeric / string drift DOES.
 */
function canonicalSatelliteStates(states: ModqnSatelliteState[]): string {
  return JSON.stringify(
    states.map((state) => [
      state.satId,
      state.satIndex,
      state.trueAnomalyDeg,
      state.positionEciKm.x,
      state.positionEciKm.y,
      state.positionEciKm.z,
      state.subSatellitePoint.latDeg,
      state.subSatellitePoint.lonDeg,
    ]),
  );
}

function canonicalBeamStates(states: ModqnBeamState[]): string {
  return JSON.stringify(
    states.map((state) => [
      state.beamId,
      state.beamIndex,
      state.satId,
      state.satIndex,
      state.localBeamIndex,
      state.centerPosition.latDeg,
      state.centerPosition.lonDeg,
      state.centerLocalTangentKm.east,
      state.centerLocalTangentKm.north,
    ]),
  );
}

function toUserRecord(row: ModqnTimelineRow): ModqnReplayUserRecord {
  return {
    userId: row.userId,
    userIndex: typeof row.userIndex === 'number' ? row.userIndex : null,
    userPosition: row.userPosition,
    decisionUserPosition: row.decisionUserPosition ?? null,
    previousServing: row.previousServing,
    selectedServing: row.selectedServing,
    handoverEvent: row.handoverEvent,
    visibilityMask: row.visibilityMask,
    actionValidityMask: row.actionValidityMask,
    decisionVisibilityMask: row.decisionVisibilityMask ?? null,
    decisionActionValidityMask: row.decisionActionValidityMask ?? null,
    beamLoads: row.beamLoads,
    beamThroughputs: row.beamThroughputs ?? null,
    rewardVector: row.rewardVector,
    scalarReward: row.scalarReward,
    kpiOverlay: row.kpiOverlay,
  };
}

/**
 * Group rows by slotIndex into frames, asserting per-slot geometry and
 * decision-time stability under deep equality.
 */
export function buildReplayFrames(rows: ModqnTimelineRow[]): ModqnReplayFrame[] {
  if (rows.length === 0) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_EMPTY',
      'Cannot build replay frames from an empty timeline.',
    );
  }

  const frameMap = new Map<number, ModqnReplayFrame>();
  const seenUserInSlot = new Map<number, Set<string>>();
  const satelliteCanonicalBySlot = new Map<number, string>();
  const beamCanonicalBySlot = new Map<number, string>();

  for (const row of rows) {
    const slotIndex = row.slotIndex;
    const rowDecisionTimeSec =
      typeof row.decisionTimeSec === 'number' ? row.decisionTimeSec : null;

    let frame = frameMap.get(slotIndex);
    if (!frame) {
      frame = {
        slotIndex,
        timeSec: row.timeSec,
        decisionTimeSec: rowDecisionTimeSec,
        satelliteStates: row.satelliteStates,
        beamStates: row.beamStates,
        users: [],
      };
      frameMap.set(slotIndex, frame);
      seenUserInSlot.set(slotIndex, new Set<string>());
      satelliteCanonicalBySlot.set(
        slotIndex,
        canonicalSatelliteStates(row.satelliteStates),
      );
      beamCanonicalBySlot.set(slotIndex, canonicalBeamStates(row.beamStates));
    } else {
      // Per-slot geometry must agree across user rows under deep equality.
      const expectedSat = satelliteCanonicalBySlot.get(slotIndex)!;
      const actualSat = canonicalSatelliteStates(row.satelliteStates);
      if (expectedSat !== actualSat) {
        throw new ModqnBundleSchemaError(
          'FRAME_SATELLITE_GEOMETRY_DISAGREEMENT',
          `slot ${slotIndex}: satelliteStates disagree across user rows under deep equality. ` +
            'Consumer rejects any same-slot geometry drift (ordering OR numeric).',
          { slotIndex, expected: expectedSat, actual: actualSat },
        );
      }
      const expectedBeam = beamCanonicalBySlot.get(slotIndex)!;
      const actualBeam = canonicalBeamStates(row.beamStates);
      if (expectedBeam !== actualBeam) {
        throw new ModqnBundleSchemaError(
          'FRAME_BEAM_GEOMETRY_DISAGREEMENT',
          `slot ${slotIndex}: beamStates disagree across user rows under deep equality. ` +
            'Consumer rejects any same-slot geometry drift (ordering OR numeric).',
          { slotIndex, expected: expectedBeam, actual: actualBeam },
        );
      }
      if (frame.timeSec !== row.timeSec) {
        throw new ModqnBundleSchemaError(
          'FRAME_TIME_DISAGREEMENT',
          `slot ${slotIndex}: timeSec disagrees across user rows (${frame.timeSec} vs ${row.timeSec}).`,
          { slotIndex },
        );
      }
      if (frame.decisionTimeSec !== rowDecisionTimeSec) {
        throw new ModqnBundleSchemaError(
          'FRAME_DECISION_TIME_DISAGREEMENT',
          `slot ${slotIndex}: decisionTimeSec disagrees across user rows ` +
            `(${frame.decisionTimeSec} vs ${rowDecisionTimeSec}).`,
          { slotIndex },
        );
      }
    }

    const seen = seenUserInSlot.get(slotIndex)!;
    if (seen.has(row.userId)) {
      throw new ModqnBundleSchemaError(
        'FRAME_DUPLICATE_USER',
        `slot ${slotIndex}: userId=${row.userId} appears more than once.`,
        { slotIndex, userId: row.userId },
      );
    }
    seen.add(row.userId);

    frame.users.push(toUserRecord(row));
  }

  const frames = Array.from(frameMap.values()).sort(
    (a, b) => a.slotIndex - b.slotIndex,
  );
  return frames;
}

/** Build a slotIndex → frame lookup map from an ordered frame array. */
export function indexFramesBySlot(
  frames: ModqnReplayFrame[],
): ReadonlyMap<number, ModqnReplayFrame> {
  const map = new Map<number, ModqnReplayFrame>();
  for (const frame of frames) {
    map.set(frame.slotIndex, frame);
  }
  return map;
}
