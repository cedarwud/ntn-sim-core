import type { KpiBundle } from '@/core/contracts/kpi-v1';
import type { BeamRole, SimulationSnapshot } from '@/core/contracts/runtime-v1';
import type { BeamPresentationFrame } from '@/viz/presentation';

const LOW_SINR_THRESHOLD_DB = 5;

export type SceneRuntimeMode = 'live' | 'replay' | 'modqn-bundle';

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadKpiBundle(
  profileId: string,
  kpi: KpiBundle,
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonStr = JSON.stringify({ profile: profileId, kpi }, null, 2);
  downloadFile(
    `kpi-${profileId}-${timestamp}.json`,
    jsonStr,
    'application/json',
  );

  const csvHeader = Object.keys(kpi).join(',');
  const csvRow = Object.values(kpi).join(',');
  downloadFile(
    `kpi-${profileId}-${timestamp}.csv`,
    `${csvHeader}\n${csvRow}`,
    'text/csv',
  );
}

export function buildRuntimeSummary(
  snapshot: SimulationSnapshot | null,
  mode: SceneRuntimeMode,
  showBeams: boolean,
  showLabels: boolean,
  replaySelection: string | null,
  replayWindowStartSec: number | null,
  replayWindowEndSec: number | null,
  activeProfileId: string,
  extras?: {
    truthSourceKind?: 'native-live' | 'native-replay' | 'modqn-bundle';
    truthSourceLabel?: string | null;
    bundleSlotIndex?: number | null;
    bundleSlotCount?: number | null;
    handoverCount?: number | null;
    bundleHandoverKind?: string | null;
  },
) {
  const ue = snapshot?.ues[0];
  const lowSinrUeCount = snapshot?.ues.filter(
    (candidate) => candidate.sinrDb !== null && candidate.sinrDb < LOW_SINR_THRESHOLD_DB,
  ).length ?? 0;

  return {
    mode,
    profileId: activeProfileId,
    showBeams,
    showLabels,
    tick: snapshot?.tick ?? null,
    timeSec: snapshot?.timeSec ?? null,
    visibleSatelliteIds: snapshot?.satellites.filter((sat) => sat.isVisible).map((sat) => sat.id) ?? [],
    primaryUe: {
      servingSatId: ue?.servingSatId ?? null,
      servingBeamId: ue?.servingBeamId ?? null,
      targetSatId: ue?.targetSatId ?? null,
      targetBeamId: ue?.targetBeamId ?? null,
      secondarySatId: ue?.secondarySatId ?? null,
      continuityState: ue?.continuityState ?? null,
      sinrDb: ue?.sinrDb ?? null,
    },
    lowSinrUeCount,
    lowSinrThresholdDb: LOW_SINR_THRESHOLD_DB,
    dapsPhase: snapshot?.daps?.phase ?? null,
    replaySelection,
    replayWindowStartSec,
    replayWindowEndSec,
    truthSourceKind: extras?.truthSourceKind,
    truthSourceLabel: extras?.truthSourceLabel ?? null,
    bundleSlotIndex: extras?.bundleSlotIndex ?? null,
    bundleSlotCount: extras?.bundleSlotCount ?? null,
    handoverCount: extras?.handoverCount ?? null,
    bundleHandoverKind: extras?.bundleHandoverKind ?? null,
  };
}

export function buildOrbitParitySummary(
  snapshot: SimulationSnapshot | null,
  mode: SceneRuntimeMode,
  activeProfileId: string,
) {
  const satellites = (snapshot?.satellites ?? [])
    .map((sat) => ({
      id: sat.id,
      latDeg: sat.latDeg,
      lonDeg: sat.lonDeg,
      altKm: sat.altKm,
      azimuthDeg: sat.azimuthDeg,
      elevationDeg: sat.elevationDeg,
      rangeKm: sat.rangeKm,
      isVisible: sat.isVisible,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    present: snapshot !== null,
    mode,
    profileId: activeProfileId,
    timeSec: snapshot?.timeSec ?? null,
    sampleCount: satellites.length,
    satellites,
  };
}

export function buildSnapshotBeamTruthSummary(snapshot: SimulationSnapshot | null) {
  const beamIdsBySatId: Record<string, string[]> = {};
  const beamRoleByKey: Record<string, BeamRole> = {};
  const beamActiveByKey: Record<string, boolean> = {};

  for (const sat of snapshot?.satellites ?? []) {
    const beams = sat.beams ?? [];
    if (beams.length === 0) continue;
    beamIdsBySatId[sat.id] = beams.map((beam) => beam.beamId);
    for (const beam of beams) {
      const beamKey = `${sat.id}:${beam.beamId}`;
      beamRoleByKey[beamKey] = beam.role;
      beamActiveByKey[beamKey] = beam.isActive;
    }
  }

  const satIdsWithBeams = Object.keys(beamIdsBySatId).sort();

  return {
    present: snapshot !== null,
    satIdsWithBeams,
    beamIdsBySatId,
    beamRoleByKey,
    beamActiveByKey,
  };
}

export function buildPresentationFrameSummary(
  snapshot: SimulationSnapshot | null,
  presentationFrame: BeamPresentationFrame | null,
) {
  return {
    present: Boolean(snapshot && presentationFrame),
    focusMode: presentationFrame?.focusMode ?? null,
    narrativePhase: presentationFrame?.continuityNarrative.phase ?? null,
    narrativeServingSatId: presentationFrame?.continuityNarrative.servingSatId ?? null,
    narrativeSourceSatId: presentationFrame?.continuityNarrative.sourceSatId ?? null,
    narrativeTargetSatId: presentationFrame?.continuityNarrative.targetSatId ?? null,
    narrativePostHoSatId: presentationFrame?.continuityNarrative.postHoSatId ?? null,
    cooledDownSatIds: presentationFrame?.continuityNarrative.cooledDownSatIds ?? [],
    cooldownSuppressedTargetSatId:
      presentationFrame?.continuityNarrative.cooldownSuppressedTargetSatId ?? null,
    displaySatIds: presentationFrame?.displaySatIds ?? [],
    eventSatIds: presentationFrame?.eventSatIds ?? [],
    beamSatIds: presentationFrame?.beamSatIds ?? [],
    primaryBeamBySatId: presentationFrame?.primaryBeamBySatId ?? {},
    contextBeamIdsBySatId: presentationFrame?.contextBeamIdsBySatId ?? {},
    markerRoleBySatId: presentationFrame?.markerRoleBySatId ?? {},
    beamRoleAccentByBeamId: presentationFrame?.beamRoleAccentByBeamId ?? {},
  };
}
