import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';

import type {
  SatelliteBeamSnapshot,
  SimulationSnapshot,
  SatelliteState,
  UeState,
} from '@/core/common/types';
import { createLeoParityBeamPresentation } from '@/viz/presenters/leo-parity-presenter';
import { usePublishValidationSection } from '@/viz/validation/store';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from '@/viz/satellite/observer-sky-projection';

const FOOTPRINT_RADIUS = 56;

function roleTag(sat: SatelliteState): string {
  const beams = sat.beams ?? [];
  if (beams.some((beam) => beam.role === 'serving')) return 'SERVING';
  if (beams.some((beam) => beam.role === 'prepared')) return 'PREPARED';
  if (beams.some((beam) => beam.role === 'secondary')) return 'SECONDARY';
  if (beams.some((beam) => beam.role === 'post-ho')) return 'POST-HO';
  const activeCount = beams.filter((beam) => beam.isActive).length;
  return `${activeCount} active`;
}

function roleColor(tag: string): string {
  switch (tag) {
    case 'SERVING':
      return '#18f0ff';
    case 'PREPARED':
      return '#ff9d1c';
    case 'SECONDARY':
      return '#ff5ab3';
    case 'POST-HO':
      return '#4f8cff';
    default:
      return '#d5dde5';
  }
}

function sinrColor(sinrDb: number): string {
  if (sinrDb >= 20) return '#00ff00';
  if (sinrDb >= 10) return '#aaff00';
  if (sinrDb >= 5) return '#ffaa00';
  return '#ff4444';
}

function rankBeams(a: SatelliteBeamSnapshot, b: SatelliteBeamSnapshot): number {
  const priority = (beam: SatelliteBeamSnapshot) => {
    switch (beam.role) {
      case 'serving':
        return 5;
      case 'prepared':
        return 4;
      case 'secondary':
        return 3;
      case 'post-ho':
        return 2;
      case 'neutral':
        return 1;
      case 'inactive':
      default:
        return 0;
    }
  };

  const priorityDelta = priority(b) - priority(a);
  if (priorityDelta !== 0) return priorityDelta;
  if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
  const radialA = Math.hypot(a.offsetEastKm, a.offsetNorthKm);
  const radialB = Math.hypot(b.offsetEastKm, b.offsetNorthKm);
  return radialA - radialB || a.beamId.localeCompare(b.beamId);
}

function findPrimaryBeam(sat: SatelliteState, primaryUe: UeState | null): SatelliteBeamSnapshot | null {
  const beams = sat.beams ?? [];
  if (beams.length === 0) return null;

  const byId = (beamId: string | null | undefined) => beams.find((beam) => beam.beamId === beamId) ?? null;
  if (sat.id === primaryUe?.servingSatId) return byId(primaryUe.servingBeamId) ?? beams.find((beam) => beam.role === 'serving') ?? null;
  if (sat.id === primaryUe?.targetSatId) return byId(primaryUe.targetBeamId) ?? beams.find((beam) => beam.role === 'prepared') ?? null;
  if (sat.id === primaryUe?.secondarySatId) return byId(primaryUe.secondaryBeamId) ?? beams.find((beam) => beam.role === 'secondary') ?? null;

  return [...beams].sort(rankBeams)[0] ?? null;
}

function beamAnchor(
  sat: SatelliteState,
  beam: SatelliteBeamSnapshot,
): { label: [number, number, number]; satWorld: [number, number, number] } {
  const satPos = projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION);
  const beams = sat.beams ?? [];
  const radialReference =
    beams
      .map((candidate) => Math.hypot(candidate.offsetEastKm, candidate.offsetNorthKm))
      .find((value) => value > 1e-3) ?? 25;
  const kmToWorld = (2 * FOOTPRINT_RADIUS) / radialReference;
  const groundX = satPos[0] + beam.offsetEastKm * kmToWorld;
  const groundZ = satPos[2] - beam.offsetNorthKm * kmToWorld;
  const labelX = satPos[0] + (groundX - satPos[0]) * 0.38;
  const labelY = satPos[1] * 0.62;
  const labelZ = satPos[2] + (groundZ - satPos[2]) * 0.38;
  return {
    label: [labelX, labelY, labelZ],
    satWorld: [satPos[0], satPos[1], satPos[2]],
  };
}

export interface LeoParityBeamOverlayProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
}

export const LeoParityBeamOverlay = React.memo(function LeoParityBeamOverlay({
  snapshot,
  visible = true,
}: LeoParityBeamOverlayProps) {
  const presentation = useMemo(() => createLeoParityBeamPresentation(snapshot), [snapshot]);
  const primaryUe = snapshot?.ues[0] ?? null;

  const labeledSats = useMemo(() => {
    if (!snapshot || !visible || !presentation) return [];
    const beamSet = new Set(presentation.beamSatIds);
    return snapshot.satellites.filter((sat) => beamSet.has(sat.id));
  }, [presentation, snapshot, visible]);

  const validationSummary = useMemo(
    () => ({
      present: labeledSats.length > 0,
      labeledSatIds: labeledSats.map((sat) => sat.id),
      roleTags: labeledSats.map((sat) => `${sat.id}:${roleTag(sat)}`),
      primaryServingSatId: primaryUe?.servingSatId ?? null,
      servingSinrDb: primaryUe?.sinrDb ?? null,
      viewMode: 'leo-parity',
    }),
    [labeledSats, primaryUe?.servingSatId, primaryUe?.sinrDb],
  );

  usePublishValidationSection('beamInfoOverlay', validationSummary);

  if (!snapshot || !visible || labeledSats.length === 0) return null;

  return (
    <group name="leo-parity-beam-overlay">
      {labeledSats.map((sat) => {
        const primaryBeam = findPrimaryBeam(sat, primaryUe);
        if (!primaryBeam) return null;
        const anchor = beamAnchor(sat, primaryBeam);
        const tag = roleTag(sat);
        const color = roleColor(tag);
        const servingSinr = sat.id === primaryUe?.servingSatId ? primaryUe.sinrDb : null;
        return (
          <group key={sat.id}>
            <Text
              position={[anchor.label[0], anchor.label[1] + (servingSinr !== null ? 8 : 0), anchor.label[2]]}
              fontSize={tag === 'SERVING' ? 11 : 9}
              color={color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={tag === 'SERVING' ? 1.8 : 1.3}
              outlineColor="#000000"
            >
              {tag}
            </Text>
            {servingSinr !== null && (
              <Text
                position={[anchor.label[0], anchor.label[1] - 5, anchor.label[2]]}
                fontSize={12}
                color={sinrColor(servingSinr)}
                anchorX="center"
                anchorY="middle"
                outlineWidth={1.6}
                outlineColor="#000000"
              >
                {`${servingSinr.toFixed(1)} dB`}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
});
