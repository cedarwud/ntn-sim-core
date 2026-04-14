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
