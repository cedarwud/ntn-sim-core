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
  createRunArtifactBundle,
} from './factory';
export type { CreateRunManifestOpts } from './factory';

export {
  serializeBundle,
  deserializeBundle,
  serializeManifest,
  serializeEventLog,
} from './serialization';
