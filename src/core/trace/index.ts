/**
 * Trace module — barrel export.
 */

export type {
  RunManifest,
  ResolvedConfig,
  SourceTraceEntry,
  SourceTrace,
  EventRecord,
  EventLog,
  ReplayManifest,
  ReplayIdentitySample,
  ReplayIdentityRecord,
  ReplayArtifact,
  KpiBundleShell,
  RunArtifactBundle,
  AssumptionRecord,
} from './types';

export {
  createRunManifest,
  createResolvedConfig,
  createSourceTrace,
  createEmptyEventLog,
  createEmptyKpiBundle,
  createReplayIdentityRecord,
  createReplayArtifact,
  createRunArtifactBundle,
} from './factory';
export type { CreateRunManifestOpts } from './factory';

export {
  serializeBundle,
  deserializeBundle,
  serializeManifest,
  serializeEventLog,
} from './serialization';
