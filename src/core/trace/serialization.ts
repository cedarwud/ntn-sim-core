/**
 * Serialization / deserialization for trace artifacts.
 *
 * All outputs are deterministic JSON with 2-space indent.
 */

import type { RunArtifactBundle, RunManifest, EventLog } from './types';

export function serializeBundle(bundle: RunArtifactBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function deserializeBundle(json: string): RunArtifactBundle {
  const parsed = JSON.parse(json) as RunArtifactBundle;

  // Shape validation: ensure required top-level keys exist
  const required: (keyof RunArtifactBundle)[] = [
    'manifest',
    'resolvedConfig',
    'sourceTrace',
    'eventLog',
    'kpiBundle',
  ];
  for (const key of required) {
    if (!(key in parsed)) {
      throw new Error(`deserializeBundle: missing required key "${key}"`);
    }
  }

  return parsed;
}

export function serializeManifest(manifest: RunManifest): string {
  return JSON.stringify(manifest, null, 2);
}

export function serializeEventLog(log: EventLog): string {
  return JSON.stringify(log, null, 2);
}
