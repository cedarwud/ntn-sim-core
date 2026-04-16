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

function isFiniteInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value);
}

function assertObjectiveTriplet(
  value: unknown,
  path: string,
  lineNumber: number,
): void {
  if (!isRecord(value)) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_OBJECTIVE_TRIPLET',
      `timeline/step-trace.jsonl line ${lineNumber}: ${path} must be an object.`,
      { lineNumber, path },
    );
  }
  for (const field of ['r1Throughput', 'r2Handover', 'r3LoadBalance'] as const) {
    if (!isFiniteNumber(value[field])) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_POLICY_DIAGNOSTICS_OBJECTIVE_TRIPLET',
        `timeline/step-trace.jsonl line ${lineNumber}: ${path}.${field} must be numeric.`,
        { lineNumber, path, field },
      );
    }
  }
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

function assertPolicyDiagnostics(
  raw: Record<string, unknown>,
  lineNumber: number,
): void {
  const payload = raw.policyDiagnostics;
  if (payload === undefined) {
    return;
  }
  if (!isRecord(payload)) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_TYPE',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics must be an object when present.`,
      { lineNumber },
    );
  }

  const requiredFields = [
    'diagnosticsVersion',
    'objectiveWeights',
    'selectedScalarizedQ',
    'runnerUpScalarizedQ',
    'scalarizedMarginToRunnerUp',
    'availableActionCount',
    'topCandidates',
  ] as const;
  const missing = requiredFields.filter((field) => !(field in payload));
  if (missing.length > 0) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_MISSING_FIELDS',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics is missing required fields: ${missing.join(', ')}`,
      { lineNumber, missing },
    );
  }

  if (typeof payload.diagnosticsVersion !== 'string' || payload.diagnosticsVersion.length === 0) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_VERSION',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.diagnosticsVersion must be a non-empty string.`,
      { lineNumber },
    );
  }
  assertObjectiveTriplet(
    payload.objectiveWeights,
    'policyDiagnostics.objectiveWeights',
    lineNumber,
  );
  if (!isFiniteNumber(payload.selectedScalarizedQ)) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_SELECTED_SCORE',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.selectedScalarizedQ must be numeric.`,
      { lineNumber },
    );
  }
  if (
    payload.runnerUpScalarizedQ !== null
    && payload.runnerUpScalarizedQ !== undefined
    && !isFiniteNumber(payload.runnerUpScalarizedQ)
  ) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_RUNNER_UP_SCORE',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.runnerUpScalarizedQ must be numeric or null.`,
      { lineNumber },
    );
  }
  if (
    payload.scalarizedMarginToRunnerUp !== null
    && payload.scalarizedMarginToRunnerUp !== undefined
    && !isFiniteNumber(payload.scalarizedMarginToRunnerUp)
  ) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_MARGIN',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.scalarizedMarginToRunnerUp must be numeric or null.`,
      { lineNumber },
    );
  }
  if (!isFiniteInteger(payload.availableActionCount) || payload.availableActionCount < 1) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_AVAILABLE_ACTION_COUNT',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.availableActionCount must be a positive integer.`,
      { lineNumber },
    );
  }
  if (!Array.isArray(payload.topCandidates) || payload.topCandidates.length === 0) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_TOP_CANDIDATES',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates must be a non-empty array.`,
      { lineNumber },
    );
  }
  if (payload.topCandidates.length > payload.availableActionCount) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_TOP_CANDIDATES_LIMIT',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates cannot exceed availableActionCount.`,
      {
        lineNumber,
        availableActionCount: payload.availableActionCount,
        candidateCount: payload.topCandidates.length,
      },
    );
  }

  const selectedServing = isRecord(raw.selectedServing) ? raw.selectedServing : {};
  const selectedBeamIndex = isFiniteInteger(selectedServing.beamIndex)
    ? selectedServing.beamIndex
    : null;
  const decisionMask = Array.isArray(raw.decisionActionValidityMask)
    ? raw.decisionActionValidityMask
    : Array.isArray(raw.actionValidityMask)
      ? raw.actionValidityMask
      : null;
  if (decisionMask) {
    const availableActionCount = decisionMask.filter(Boolean).length;
    if (availableActionCount !== payload.availableActionCount) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_POLICY_DIAGNOSTICS_MASK_COUNT_MISMATCH',
        `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.availableActionCount must match the decision mask.`,
        { lineNumber, availableActionCount, exported: payload.availableActionCount },
      );
    }
  }

  let previousScalarizedQ: number | null = null;
  let previousBeamIndex: number | null = null;
  payload.topCandidates.forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_POLICY_DIAGNOSTICS_CANDIDATE_TYPE',
        `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates[${index}] must be an object.`,
        { lineNumber, index },
      );
    }

    const requiredCandidateFields = [
      'beamId',
      'beamIndex',
      'satId',
      'satIndex',
      'localBeamIndex',
      'validUnderDecisionMask',
      'objectiveQ',
      'scalarizedQ',
    ] as const;
    const missingCandidateFields = requiredCandidateFields.filter((field) => !(field in candidate));
    if (missingCandidateFields.length > 0) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_POLICY_DIAGNOSTICS_CANDIDATE_FIELDS',
        `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates[${index}] is missing required fields: ${missingCandidateFields.join(', ')}`,
        { lineNumber, index, missing: missingCandidateFields },
      );
    }
    if (
      typeof candidate.beamId !== 'string'
      || typeof candidate.satId !== 'string'
      || !isFiniteInteger(candidate.beamIndex)
      || !isFiniteInteger(candidate.satIndex)
      || !isFiniteInteger(candidate.localBeamIndex)
    ) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_POLICY_DIAGNOSTICS_CANDIDATE_IDENTITY',
        `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates[${index}] must carry stable beam/satellite identity.`,
        { lineNumber, index },
      );
    }
    if (candidate.validUnderDecisionMask !== true) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_POLICY_DIAGNOSTICS_CANDIDATE_VALIDITY',
        `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates[${index}].validUnderDecisionMask must be true.`,
        { lineNumber, index },
      );
    }
    if (decisionMask) {
      if (
        candidate.beamIndex < 0
        || candidate.beamIndex >= decisionMask.length
        || !Boolean(decisionMask[candidate.beamIndex])
      ) {
        throw new ModqnBundleSchemaError(
          'TIMELINE_ROW_POLICY_DIAGNOSTICS_CANDIDATE_MASK_MISMATCH',
          `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates[${index}] does not respect the decision mask.`,
          { lineNumber, index, beamIndex: candidate.beamIndex },
        );
      }
    }
    assertObjectiveTriplet(
      candidate.objectiveQ,
      `policyDiagnostics.topCandidates[${index}].objectiveQ`,
      lineNumber,
    );
    if (!isFiniteNumber(candidate.scalarizedQ)) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_POLICY_DIAGNOSTICS_CANDIDATE_SCORE',
        `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates[${index}].scalarizedQ must be numeric.`,
        { lineNumber, index },
      );
    }
    if (previousScalarizedQ !== null) {
      if (candidate.scalarizedQ > previousScalarizedQ + 1e-9) {
        throw new ModqnBundleSchemaError(
          'TIMELINE_ROW_POLICY_DIAGNOSTICS_ORDERING',
          `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates must preserve descending scalarizedQ ordering.`,
          { lineNumber, index },
        );
      }
      if (
        Math.abs(candidate.scalarizedQ - previousScalarizedQ) <= 1e-9
        && previousBeamIndex !== null
        && candidate.beamIndex < previousBeamIndex
      ) {
        throw new ModqnBundleSchemaError(
          'TIMELINE_ROW_POLICY_DIAGNOSTICS_TIE_BREAK',
          `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates must keep ascending beamIndex tie-breaks.`,
          { lineNumber, index },
        );
      }
    }
    previousScalarizedQ = candidate.scalarizedQ;
    previousBeamIndex = candidate.beamIndex;
  });

  const selectedCandidate = payload.topCandidates[0];
  if (selectedBeamIndex !== null && selectedCandidate.beamIndex !== selectedBeamIndex) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_SELECTED_ALIGNMENT',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates[0] must align with selectedServing.beamIndex.`,
      { lineNumber, selectedBeamIndex, candidateBeamIndex: selectedCandidate.beamIndex },
    );
  }
  if (
    typeof selectedServing.beamId === 'string'
    && selectedCandidate.beamId !== selectedServing.beamId
  ) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_SELECTED_ALIGNMENT',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates[0] must align with selectedServing.beamId.`,
      { lineNumber },
    );
  }
  if (
    typeof selectedServing.satId === 'string'
    && selectedCandidate.satId !== selectedServing.satId
  ) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_SELECTED_ALIGNMENT',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates[0] must align with selectedServing.satId.`,
      { lineNumber },
    );
  }
  if (
    isFiniteInteger(selectedServing.localBeamIndex)
    && selectedCandidate.localBeamIndex !== selectedServing.localBeamIndex
  ) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_SELECTED_ALIGNMENT',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates[0] must align with selectedServing.localBeamIndex.`,
      { lineNumber },
    );
  }
  if (
    isFiniteInteger(selectedServing.satIndex)
    && selectedCandidate.satIndex !== selectedServing.satIndex
  ) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_SELECTED_ALIGNMENT',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.topCandidates[0] must align with selectedServing.satIndex.`,
      { lineNumber },
    );
  }
  if (Math.abs(selectedCandidate.scalarizedQ - payload.selectedScalarizedQ) > 1e-9) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_SELECTED_SCORE_MISMATCH',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.selectedScalarizedQ must match topCandidates[0].scalarizedQ.`,
      { lineNumber },
    );
  }

  const hasRunnerUp = payload.topCandidates.length > 1;
  if (hasRunnerUp) {
    if (
      !isFiniteNumber(payload.runnerUpScalarizedQ)
      || !isFiniteNumber(payload.scalarizedMarginToRunnerUp)
    ) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_POLICY_DIAGNOSTICS_RUNNER_UP_REQUIRED',
        `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics must include runner-up score and margin when more than one candidate is exported.`,
        { lineNumber },
      );
    }
    const runnerUp = payload.topCandidates[1];
    if (Math.abs(runnerUp.scalarizedQ - payload.runnerUpScalarizedQ) > 1e-9) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_POLICY_DIAGNOSTICS_RUNNER_UP_MISMATCH',
        `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.runnerUpScalarizedQ must match topCandidates[1].scalarizedQ.`,
        { lineNumber },
      );
    }
    const expectedMargin = payload.selectedScalarizedQ - payload.runnerUpScalarizedQ;
    if (Math.abs(payload.scalarizedMarginToRunnerUp - expectedMargin) > 1e-9) {
      throw new ModqnBundleSchemaError(
        'TIMELINE_ROW_POLICY_DIAGNOSTICS_MARGIN_MISMATCH',
        `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics.scalarizedMarginToRunnerUp is inconsistent with selected and runner-up scores.`,
        { lineNumber },
      );
    }
  } else if (
    payload.runnerUpScalarizedQ !== null
    || payload.scalarizedMarginToRunnerUp !== null
  ) {
    throw new ModqnBundleSchemaError(
      'TIMELINE_ROW_POLICY_DIAGNOSTICS_RUNNER_UP_NULLABILITY',
      `timeline/step-trace.jsonl line ${lineNumber}: policyDiagnostics must keep runner-up score and margin null when only one candidate is exported.`,
      { lineNumber },
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

  assertPolicyDiagnostics(raw, lineNumber);

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
