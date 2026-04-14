/**
 * Phase 03A Consumer Adapter — Timeline JSONL parser.
 *
 * Governance:
 *   - Consumer SDD: sdd/modqn-bundle-replay-consumer-sdd.md
 *   - Rule: the consumer MUST NOT fall back to defaults when a required
 *     field is missing. Missing geometry => reject.
 *
 * Tightening summary (Phase 03A Slice B contract fix):
 *   1. Reject rows whose beamStates contain null `centerPosition` or null
 *      `centerLocalTangentKm`. Replay-complete bundles must not emit
 *      half-defined beam geometry; the consumer refuses to invent centers.
 *   2. Reject rows whose satelliteStates are missing `positionEciKm`.
 *   3. Reject rows whose `visibilityMask`, `actionValidityMask`,
 *      `beamLoads`, or (when present) `beamThroughputs` disagree with the
 *      `beamStates` array length. The producer guarantees a satellite-major
 *      ordering aligned with the per-slot beam catalog; divergent lengths
 *      are a silent truth drift and must fail loudly.
 */

import { REQUIRED_TIMELINE_ROW_FIELDS } from './constants';
import { ModqnBundleSchemaError } from './schema-guard';
import type { ModqnTimelineRow } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function assertGeodeticPoint(
  value: unknown,
  path: string,
  lineNumber: number,
): void {
  if (!isRecord(value)) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_BEAM_GEOMETRY_NULL',
      `timeline/step-trace.jsonl line ${lineNumber}: ${path} must be a non-null object with latDeg/lonDeg. ` +
        'Consumer refuses to invent beam geometry.',
      { lineNumber, path },
    );
  }
  if (!isFiniteNumber(value.latDeg) || !isFiniteNumber(value.lonDeg)) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_BEAM_GEOMETRY_NULL',
      `timeline/step-trace.jsonl line ${lineNumber}: ${path} must contain finite latDeg/lonDeg.`,
      { lineNumber, path },
    );
  }
}

function assertLocalTangentKm(
  value: unknown,
  path: string,
  lineNumber: number,
): void {
  if (!isRecord(value)) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_BEAM_GEOMETRY_NULL',
      `timeline/step-trace.jsonl line ${lineNumber}: ${path} must be a non-null object with east/north. ` +
        'Consumer refuses to invent beam geometry.',
      { lineNumber, path },
    );
  }
  if (!isFiniteNumber(value.east) || !isFiniteNumber(value.north)) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_BEAM_GEOMETRY_NULL',
      `timeline/step-trace.jsonl line ${lineNumber}: ${path} must contain finite east/north.`,
      { lineNumber, path },
    );
  }
}

function assertSatellitePositionEci(
  value: unknown,
  path: string,
  lineNumber: number,
): void {
  if (!isRecord(value)) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_SATELLITE_GEOMETRY_NULL',
      `timeline/step-trace.jsonl line ${lineNumber}: ${path} must be a non-null object with x/y/z.`,
      { lineNumber, path },
    );
  }
  if (
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.z)
  ) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_SATELLITE_GEOMETRY_NULL',
      `timeline/step-trace.jsonl line ${lineNumber}: ${path} must contain finite x/y/z.`,
      { lineNumber, path },
    );
  }
}

function assertRow(raw: unknown, lineNumber: number): ModqnTimelineRow {
  if (!isRecord(raw)) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_NOT_OBJECT',
      `timeline/step-trace.jsonl line ${lineNumber}: row must be a JSON object.`,
      { lineNumber },
    );
  }

  const missing = REQUIRED_TIMELINE_ROW_FIELDS.filter((field) => !(field in raw));
  if (missing.length > 0) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_MISSING_FIELDS',
      `timeline/step-trace.jsonl line ${lineNumber}: missing required fields: ${missing.join(', ')}`,
      { lineNumber, missing },
    );
  }

  if (typeof raw.slotIndex !== 'number') {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_SLOT_INDEX_TYPE',
      `timeline/step-trace.jsonl line ${lineNumber}: slotIndex must be a number.`,
      { lineNumber },
    );
  }
  if (typeof raw.timeSec !== 'number') {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_TIME_SEC_TYPE',
      `timeline/step-trace.jsonl line ${lineNumber}: timeSec must be a number.`,
      { lineNumber },
    );
  }
  if (raw.decisionTimeSec !== undefined && typeof raw.decisionTimeSec !== 'number') {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_DECISION_TIME_SEC_TYPE',
      `timeline/step-trace.jsonl line ${lineNumber}: decisionTimeSec must be a number when present.`,
      { lineNumber },
    );
  }
  if (typeof raw.userId !== 'string') {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_USER_ID_TYPE',
      `timeline/step-trace.jsonl line ${lineNumber}: userId must be a string.`,
      { lineNumber },
    );
  }

  const userPosition = raw.userPosition;
  if (!isRecord(userPosition) || !isRecord(userPosition.localTangentKm)) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_USER_POSITION_SHAPE',
      `timeline/step-trace.jsonl line ${lineNumber}: userPosition must include localTangentKm.`,
      { lineNumber },
    );
  }

  for (const serving of ['previousServing', 'selectedServing'] as const) {
    const record = raw[serving];
    if (!isRecord(record) || typeof record.beamId !== 'string' || typeof record.satId !== 'string') {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_SERVING_SHAPE',
        `timeline/step-trace.jsonl line ${lineNumber}: ${serving} must include beamId and satId.`,
        { lineNumber },
      );
    }
  }

  const handoverEvent = raw.handoverEvent;
  if (!isRecord(handoverEvent) || typeof handoverEvent.kind !== 'string') {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_HANDOVER_EVENT_SHAPE',
      `timeline/step-trace.jsonl line ${lineNumber}: handoverEvent.kind must be a string.`,
      { lineNumber },
    );
  }

  for (const maskField of ['visibilityMask', 'actionValidityMask'] as const) {
    if (!Array.isArray(raw[maskField])) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_MASK_SHAPE',
        `timeline/step-trace.jsonl line ${lineNumber}: ${maskField} must be an array.`,
        { lineNumber },
      );
    }
  }

  if (!Array.isArray(raw.satelliteStates) || raw.satelliteStates.length === 0) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_SATELLITE_STATES_EMPTY',
      `timeline/step-trace.jsonl line ${lineNumber}: satelliteStates must be a non-empty array. ` +
        'Consumer must not invent satellite geometry.',
      { lineNumber },
    );
  }
  if (!Array.isArray(raw.beamStates) || raw.beamStates.length === 0) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_BEAM_STATES_EMPTY',
      `timeline/step-trace.jsonl line ${lineNumber}: beamStates must be a non-empty array. ` +
        'Consumer must not invent beam geometry.',
      { lineNumber },
    );
  }

  // Deep-check satellite geometry: require `positionEciKm.{x,y,z}` finite.
  const satelliteStates = raw.satelliteStates as unknown[];
  for (let s = 0; s < satelliteStates.length; s += 1) {
    const sat = satelliteStates[s];
    if (!isRecord(sat)) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_SATELLITE_GEOMETRY_NULL',
        `timeline/step-trace.jsonl line ${lineNumber}: satelliteStates[${s}] must be an object.`,
        { lineNumber, index: s },
      );
    }
    if (typeof sat.satId !== 'string') {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_SATELLITE_GEOMETRY_NULL',
        `timeline/step-trace.jsonl line ${lineNumber}: satelliteStates[${s}].satId must be a string.`,
        { lineNumber, index: s },
      );
    }
    assertSatellitePositionEci(
      sat.positionEciKm,
      `satelliteStates[${s}].positionEciKm`,
      lineNumber,
    );
  }

  // Deep-check beam geometry: reject any null `centerPosition` /
  // `centerLocalTangentKm`. Producer contract §7.4 says "if the bundle
  // does not provide [beam centers], the bundle is not replay-complete".
  const beamStates = raw.beamStates as unknown[];
  for (let b = 0; b < beamStates.length; b += 1) {
    const beam = beamStates[b];
    if (!isRecord(beam)) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_BEAM_GEOMETRY_NULL',
        `timeline/step-trace.jsonl line ${lineNumber}: beamStates[${b}] must be an object.`,
        { lineNumber, index: b },
      );
    }
    if (typeof beam.beamId !== 'string' || typeof beam.satId !== 'string') {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_BEAM_GEOMETRY_NULL',
        `timeline/step-trace.jsonl line ${lineNumber}: beamStates[${b}] must include beamId and satId.`,
        { lineNumber, index: b },
      );
    }
    if (beam.centerPosition === null || beam.centerLocalTangentKm === null) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_BEAM_GEOMETRY_NULL',
        `timeline/step-trace.jsonl line ${lineNumber}: beamStates[${b}] (${beam.beamId}) has null geometry. ` +
          'Replay-complete bundles must not emit null beam centers.',
        { lineNumber, index: b, beamId: beam.beamId },
      );
    }
    assertGeodeticPoint(
      beam.centerPosition,
      `beamStates[${b}].centerPosition`,
      lineNumber,
    );
    assertLocalTangentKm(
      beam.centerLocalTangentKm,
      `beamStates[${b}].centerLocalTangentKm`,
      lineNumber,
    );
  }

  // Length consistency — masks / loads / throughputs must match beam catalog.
  const beamCount = beamStates.length;
  const lengthCheckedFields: Array<[string, unknown, boolean]> = [
    ['visibilityMask', raw.visibilityMask, true],
    ['actionValidityMask', raw.actionValidityMask, true],
    ['beamLoads', raw.beamLoads, true],
    ['beamThroughputs', raw.beamThroughputs, false],
    ['decisionVisibilityMask', raw.decisionVisibilityMask, false],
    ['decisionActionValidityMask', raw.decisionActionValidityMask, false],
  ];
  for (const [field, value, required] of lengthCheckedFields) {
    if (value === undefined || value === null) {
      if (required) {
        throw new ModqnBundleSchemaError(
          'TIMELINE_ROW_MASK_SHAPE',
          `timeline/step-trace.jsonl line ${lineNumber}: ${field} is required.`,
          { lineNumber, field },
        );
      }
      continue;
    }
    if (!Array.isArray(value)) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_MASK_SHAPE',
        `timeline/step-trace.jsonl line ${lineNumber}: ${field} must be an array.`,
        { lineNumber, field },
      );
    }
    if (value.length !== beamCount) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_BEAM_ARRAY_LENGTH_MISMATCH',
        `timeline/step-trace.jsonl line ${lineNumber}: ${field} length (${value.length}) must equal beamStates length (${beamCount}).`,
        { lineNumber, field, beamCount, actual: value.length },
      );
    }
  }

  const rewardVector = raw.rewardVector;
  if (
    !isRecord(rewardVector) ||
    typeof rewardVector.r1Throughput !== 'number' ||
    typeof rewardVector.r2Handover !== 'number' ||
    typeof rewardVector.r3LoadBalance !== 'number'
  ) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_REWARD_VECTOR_SHAPE',
      `timeline/step-trace.jsonl line ${lineNumber}: rewardVector must contain r1Throughput, r2Handover, r3LoadBalance.`,
      { lineNumber },
    );
  }

  if (typeof raw.scalarReward !== 'number') {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_SCALAR_REWARD_TYPE',
      `timeline/step-trace.jsonl line ${lineNumber}: scalarReward must be a number.`,
      { lineNumber },
    );
  }

  if (!isRecord(raw.kpiOverlay)) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_KPI_OVERLAY_SHAPE',
      `timeline/step-trace.jsonl line ${lineNumber}: kpiOverlay must be an object.`,
      { lineNumber },
    );
  }

  return raw as unknown as ModqnTimelineRow;
}

/**
 * Parse the raw `timeline/step-trace.jsonl` content into validated rows.
 * Empty lines are skipped; any other parse/validation error throws.
 */
export function parseTimelineJsonl(text: string): ModqnTimelineRow[] {
  const rows: ModqnTimelineRow[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw || raw.trim().length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_JSON_PARSE',
        `timeline/step-trace.jsonl line ${i + 1}: JSON parse failed: ${(err as Error).message}`,
        { lineNumber: i + 1 },
      );
    }
    rows.push(assertRow(parsed, i + 1));
  }

  if (rows.length === 0) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_EMPTY',
      'timeline/step-trace.jsonl is empty — bundle is not replay-complete.',
    );
  }

  return rows;
}
