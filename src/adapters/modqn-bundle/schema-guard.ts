/**
 * Phase 03A Consumer Adapter — Schema / version guard.
 *
 * Governance:
 *   - Consumer SDD: sdd/modqn-bundle-replay-consumer-sdd.md
 *   - Rule: producer contract bumps MUST come through a consumer change,
 *     never through silent "lenient" acceptance.
 */

import {
  REQUIRED_MANIFEST_FIELDS,
  SUPPORTED_BUNDLE_SCHEMA_VERSIONS,
  SUPPORTED_REPLAY_TRUTH_MODES,
  SUPPORTED_TIMELINE_FORMAT_VERSIONS,
} from './constants';
import type { ModqnBundleManifest, ModqnReplayBundle } from './types';

export class ModqnBundleSchemaError extends Error {
  readonly code: string;
  readonly detail: Record<string, unknown>;

  constructor(code: string, message: string, detail: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ModqnBundleSchemaError';
    this.code = code;
    this.detail = detail;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFiniteInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value);
}

function assertOptionalPolicyDiagnosticsDisclosure(
  payload: unknown,
): void {
  if (!isRecord(payload)) {
    throw new ModqnBundleSchemaError(
      'MANIFEST_OPTIONAL_POLICY_DIAGNOSTICS_TYPE',
      'manifest.optionalPolicyDiagnostics must be an object when present.',
    );
  }

  const requiredFields = [
    'present',
    'timelineField',
    'diagnosticsVersion',
    'requiredByBundleSchema',
    'producerOwned',
    'selectedActionSource',
    'topCandidateLimit',
    'rowsWithDiagnostics',
    'rowsWithoutDiagnostics',
    'note',
  ] as const;
  const missing = requiredFields.filter((field) => !(field in payload));
  if (missing.length > 0) {
    throw new ModqnBundleSchemaError(
      'MANIFEST_OPTIONAL_POLICY_DIAGNOSTICS_MISSING_FIELDS',
      `manifest.optionalPolicyDiagnostics is missing required fields: ${missing.join(', ')}`,
      { missing },
    );
  }

  if (typeof payload.present !== 'boolean') {
    throw new ModqnBundleSchemaError(
      'MANIFEST_OPTIONAL_POLICY_DIAGNOSTICS_PRESENT_TYPE',
      'manifest.optionalPolicyDiagnostics.present must be a boolean.',
    );
  }
  if (payload.timelineField !== 'policyDiagnostics') {
    throw new ModqnBundleSchemaError(
      'MANIFEST_OPTIONAL_POLICY_DIAGNOSTICS_TIMELINE_FIELD',
      'manifest.optionalPolicyDiagnostics.timelineField must be "policyDiagnostics".',
      { timelineField: payload.timelineField },
    );
  }
  if (typeof payload.diagnosticsVersion !== 'string' || payload.diagnosticsVersion.length === 0) {
    throw new ModqnBundleSchemaError(
      'MANIFEST_OPTIONAL_POLICY_DIAGNOSTICS_VERSION',
      'manifest.optionalPolicyDiagnostics.diagnosticsVersion must be a non-empty string.',
    );
  }
  if (typeof payload.requiredByBundleSchema !== 'boolean') {
    throw new ModqnBundleSchemaError(
      'MANIFEST_OPTIONAL_POLICY_DIAGNOSTICS_REQUIRED_FLAG',
      'manifest.optionalPolicyDiagnostics.requiredByBundleSchema must be a boolean.',
    );
  }
  if (typeof payload.producerOwned !== 'boolean') {
    throw new ModqnBundleSchemaError(
      'MANIFEST_OPTIONAL_POLICY_DIAGNOSTICS_PRODUCER_OWNED',
      'manifest.optionalPolicyDiagnostics.producerOwned must be a boolean.',
    );
  }
  if (
    typeof payload.selectedActionSource !== 'string'
    || payload.selectedActionSource.length === 0
  ) {
    throw new ModqnBundleSchemaError(
      'MANIFEST_OPTIONAL_POLICY_DIAGNOSTICS_ACTION_SOURCE',
      'manifest.optionalPolicyDiagnostics.selectedActionSource must be a non-empty string.',
    );
  }
  if (!isFiniteInteger(payload.topCandidateLimit) || payload.topCandidateLimit < 1) {
    throw new ModqnBundleSchemaError(
      'MANIFEST_OPTIONAL_POLICY_DIAGNOSTICS_TOP_LIMIT',
      'manifest.optionalPolicyDiagnostics.topCandidateLimit must be a positive integer.',
    );
  }
  if (!isFiniteInteger(payload.rowsWithDiagnostics) || payload.rowsWithDiagnostics < 0) {
    throw new ModqnBundleSchemaError(
      'MANIFEST_OPTIONAL_POLICY_DIAGNOSTICS_ROWS_WITH',
      'manifest.optionalPolicyDiagnostics.rowsWithDiagnostics must be a non-negative integer.',
    );
  }
  if (!isFiniteInteger(payload.rowsWithoutDiagnostics) || payload.rowsWithoutDiagnostics < 0) {
    throw new ModqnBundleSchemaError(
      'MANIFEST_OPTIONAL_POLICY_DIAGNOSTICS_ROWS_WITHOUT',
      'manifest.optionalPolicyDiagnostics.rowsWithoutDiagnostics must be a non-negative integer.',
    );
  }
  if (typeof payload.note !== 'string') {
    throw new ModqnBundleSchemaError(
      'MANIFEST_OPTIONAL_POLICY_DIAGNOSTICS_NOTE',
      'manifest.optionalPolicyDiagnostics.note must be a string.',
    );
  }
}

/**
 * Validate a parsed manifest payload and return it as the typed
 * `ModqnBundleManifest` shape. Throws `ModqnBundleSchemaError` on any
 * required-field or version-mismatch problem.
 */
export function assertManifestShape(payload: unknown): ModqnBundleManifest {
  if (!isRecord(payload)) {
    throw new ModqnBundleSchemaError(
      'MANIFEST_NOT_OBJECT',
      'manifest.json root must be a JSON object.',
    );
  }

  const missing = REQUIRED_MANIFEST_FIELDS.filter((field) => !(field in payload));
  if (missing.length > 0) {
    throw new ModqnBundleSchemaError(
      'MANIFEST_MISSING_FIELDS',
      `manifest.json is missing required fields: ${missing.join(', ')}`,
      { missing },
    );
  }

  const schemaVersion = payload.bundleSchemaVersion;
  if (typeof schemaVersion !== 'string') {
    throw new ModqnBundleSchemaError(
      'MANIFEST_SCHEMA_VERSION_TYPE',
      'manifest.bundleSchemaVersion must be a string.',
    );
  }
  if (!SUPPORTED_BUNDLE_SCHEMA_VERSIONS.includes(schemaVersion)) {
    throw new ModqnBundleSchemaError(
      'UNSUPPORTED_BUNDLE_SCHEMA_VERSION',
      `Unsupported bundleSchemaVersion=${schemaVersion}. ` +
        `Consumer accepts: ${SUPPORTED_BUNDLE_SCHEMA_VERSIONS.join(', ')}.`,
      { schemaVersion, supported: SUPPORTED_BUNDLE_SCHEMA_VERSIONS },
    );
  }

  const timelineFormatVersion = payload.timelineFormatVersion;
  if (typeof timelineFormatVersion !== 'string') {
    throw new ModqnBundleSchemaError(
      'MANIFEST_TIMELINE_FORMAT_TYPE',
      'manifest.timelineFormatVersion must be a string.',
    );
  }
  if (!SUPPORTED_TIMELINE_FORMAT_VERSIONS.includes(timelineFormatVersion)) {
    throw new ModqnBundleSchemaError(
      'UNSUPPORTED_TIMELINE_FORMAT_VERSION',
      `Unsupported timelineFormatVersion=${timelineFormatVersion}. ` +
        `Consumer accepts: ${SUPPORTED_TIMELINE_FORMAT_VERSIONS.join(', ')}.`,
      { timelineFormatVersion, supported: SUPPORTED_TIMELINE_FORMAT_VERSIONS },
    );
  }

  const replayTruthMode = payload.replayTruthMode;
  if (typeof replayTruthMode !== 'string') {
    throw new ModqnBundleSchemaError(
      'MANIFEST_REPLAY_TRUTH_MODE_TYPE',
      'manifest.replayTruthMode must be a string.',
    );
  }
  if (!SUPPORTED_REPLAY_TRUTH_MODES.includes(replayTruthMode)) {
    throw new ModqnBundleSchemaError(
      'UNSUPPORTED_REPLAY_TRUTH_MODE',
      `Unsupported replayTruthMode=${replayTruthMode}. ` +
        `Consumer accepts: ${SUPPORTED_REPLAY_TRUTH_MODES.join(', ')}.`,
      { replayTruthMode, supported: SUPPORTED_REPLAY_TRUTH_MODES },
    );
  }

  const coordinateFrame = payload.coordinateFrame;
  if (!isRecord(coordinateFrame)) {
    throw new ModqnBundleSchemaError(
      'MANIFEST_COORDINATE_FRAME_TYPE',
      'manifest.coordinateFrame must be an object.',
    );
  }
  for (const axis of ['userPosition', 'satellitePosition', 'beamCenter']) {
    if (typeof coordinateFrame[axis] !== 'string') {
      throw new ModqnBundleSchemaError(
        'MANIFEST_COORDINATE_FRAME_AXIS',
        `manifest.coordinateFrame.${axis} must be a string.`,
      );
    }
  }
  // `groundPoint` is optional (older producer bundles may omit it) but if
  // present MUST be a geodetic point with finite latDeg/lonDeg so the
  // consumer can drive local-tangent conversions without parsing free text.
  if ('groundPoint' in coordinateFrame) {
    const groundPoint = coordinateFrame.groundPoint;
    if (
      !isRecord(groundPoint) ||
      typeof groundPoint.latDeg !== 'number' ||
      typeof groundPoint.lonDeg !== 'number' ||
      !Number.isFinite(groundPoint.latDeg) ||
      !Number.isFinite(groundPoint.lonDeg)
    ) {
      throw new ModqnBundleSchemaError(
        'MANIFEST_COORDINATE_FRAME_GROUND_POINT',
        'manifest.coordinateFrame.groundPoint must be {latDeg, lonDeg} with finite numbers.',
      );
    }
  }

  // The checkpointRule surface may be a string (legacy short form), a
  // structured record (Phase 03A Slice A and later), or null. Anything
  // else is a contract violation.
  const checkpointRule = payload.checkpointRule;
  if (
    checkpointRule !== null &&
    typeof checkpointRule !== 'string' &&
    !isRecord(checkpointRule)
  ) {
    throw new ModqnBundleSchemaError(
      'MANIFEST_CHECKPOINT_RULE_TYPE',
      'manifest.checkpointRule must be string | object | null.',
    );
  }

  // `slotIndexSemantics` is optional but if present must carry a numeric
  // firstIndex and a string note. Slice C seek controls rely on this.
  if ('slotIndexSemantics' in payload) {
    const semantics = payload.slotIndexSemantics;
    if (
      !isRecord(semantics) ||
      typeof semantics.firstIndex !== 'number' ||
      !Number.isFinite(semantics.firstIndex) ||
      typeof semantics.note !== 'string'
    ) {
      throw new ModqnBundleSchemaError(
        'MANIFEST_SLOT_INDEX_SEMANTICS_SHAPE',
        'manifest.slotIndexSemantics must be {firstIndex: number, note: string}.',
      );
    }
  }

  if ('optionalPolicyDiagnostics' in payload) {
    assertOptionalPolicyDiagnosticsDisclosure(payload.optionalPolicyDiagnostics);
  }

  return payload as unknown as ModqnBundleManifest;
}

/**
 * Bundle replay presentation has one stricter requirement than the base
 * adapter: it needs the producer's explicit local-tangent anchor so the
 * consumer can project exported geometry without parsing free-text axis notes
 * or guessing observer coordinates.
 *
 * Older bundles may still pass the structural loader, but bundle replay mode
 * MUST reject them explicitly instead of falling back to inferred geometry.
 */
export function assertBundleReplayPresentationReady(
  bundle: ModqnReplayBundle,
): ModqnReplayBundle {
  if (!bundle.manifest.coordinateFrame.groundPoint) {
    throw new ModqnBundleSchemaError(
      'BUNDLE_REPLAY_PRESENTATION_INCOMPLETE',
      'Bundle replay presentation requires manifest.coordinateFrame.groundPoint. ' +
        'Consumer must reject replay-incomplete bundles rather than guessing the local-tangent anchor.',
      { path: 'manifest.coordinateFrame.groundPoint' },
    );
  }
  return bundle;
}
