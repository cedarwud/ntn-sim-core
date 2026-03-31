import type { SourceReference } from '@/core/common/types';
import type { AssumptionRecord, RunManifest, SourceTraceEntry } from '@/core/trace/types';

import { PARAMETER_REGISTRY } from '@/core/config/parameter-registry';
import { getProfileAuthoringEntry } from '@/core/profiles/profile-authoring-registry';

export interface ProfileProvenanceView {
  profileId: string;
  family: string;
  sourceMap: SourceReference[];
  specModeIndex?: NonNullable<RunManifest['specModeIndex']>;
  sourceTraceEntries: SourceTraceEntry[];
  assumptionSet?: AssumptionRecord[];
}

function buildRegistryBackedSourceMap(profileId: string): SourceReference[] {
  const sourceMap: SourceReference[] = [];

  for (const entry of PARAMETER_REGISTRY) {
    for (const binding of entry.bindings ?? []) {
      if (binding.profileId !== profileId) continue;
      sourceMap.push({
        tier: binding.sourceTier,
        id: binding.sourceId,
        note: binding.sourceNote,
        parameterPath: entry.spec.parameterPath,
        specMode: binding.exposureMode,
      });
    }
  }

  return sourceMap;
}

function buildMergedSourceMap(profileId: string): SourceReference[] {
  const entry = getProfileAuthoringEntry(profileId);
  const registrySourceMap = buildRegistryBackedSourceMap(profileId);
  const registryPaths = new Set(
    registrySourceMap
      .map((source) => source.parameterPath)
      .filter((value): value is string => value !== undefined),
  );
  const authoredFallback = entry.sourceMap
    .filter((source) => source.parameterPath === undefined || !registryPaths.has(source.parameterPath))
    .map((source) => ({ ...source }));

  return [...registrySourceMap, ...authoredFallback];
}

function buildSpecModeIndex(
  sourceMap: SourceReference[],
): NonNullable<RunManifest['specModeIndex']> | undefined {
  const specModeIndex: NonNullable<RunManifest['specModeIndex']> = {
    internalOnly: [],
    advanced: [],
    sensitivity: [],
  };

  for (const source of sourceMap) {
    const key = source.parameterPath ?? source.id;
    if (source.specMode === 'Internal-only') specModeIndex.internalOnly.push(key);
    else if (source.specMode === 'Advanced') specModeIndex.advanced.push(key);
    else if (source.specMode === 'Sensitivity') specModeIndex.sensitivity.push(key);
  }

  return specModeIndex.internalOnly.length > 0 ||
    specModeIndex.advanced.length > 0 ||
    specModeIndex.sensitivity.length > 0
    ? specModeIndex
    : undefined;
}

function buildAssumptionSet(
  profileId: string,
  family: string,
  sourceMap: SourceReference[],
): AssumptionRecord[] | undefined {
  const assumptionSet = sourceMap
    .filter((source) => source.tier === 'assumption-backed' || source.specMode === 'Internal-only')
    .map((source) => ({
      id: source.id,
      category: 'parameter' as const,
      affectedModule: source.parameterPath ?? family,
      chosenValue: source.note ?? '',
      rationale: source.note ?? '',
      impactScope: source.specMode === 'Internal-only'
        ? 'internal-only: must not appear in thesis tables'
        : 'assumption-backed: requires sensitivity sweep',
      claimScope: source.note ?? '',
      replacementTarget: profileId,
    }));

  return assumptionSet.length > 0 ? assumptionSet : undefined;
}

export function getProfileProvenanceView(profileId: string): ProfileProvenanceView {
  const entry = getProfileAuthoringEntry(profileId);
  const sourceMap = buildMergedSourceMap(profileId);

  return {
    profileId,
    family: entry.bundle.family,
    sourceMap,
    specModeIndex: buildSpecModeIndex(sourceMap),
    sourceTraceEntries: sourceMap.map((source) => ({
      modelFamily: entry.bundle.family,
      source,
      claimScope: source.note ?? '',
    })),
    assumptionSet: buildAssumptionSet(profileId, entry.bundle.family, sourceMap),
  };
}
