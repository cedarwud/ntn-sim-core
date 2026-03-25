import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';

import type { SimulationSnapshot, SatelliteState } from '@/core/common/types';
import { createLeoParityBeamPresentation } from '@/viz/presenters/leo-parity-presenter';
import { usePublishValidationSection } from '@/viz/validation/store';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from '@/viz/satellite/observer-sky-projection';

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
        const pos = projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION);
        const tag = roleTag(sat);
        const color = roleColor(tag);
        const servingSinr = sat.id === primaryUe?.servingSatId ? primaryUe.sinrDb : null;
        return (
          <group key={sat.id}>
            <Text
              position={[pos[0], pos[1] + 38, pos[2]]}
              fontSize={10}
              color={color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={1.4}
              outlineColor="#000000"
            >
              {tag}
            </Text>
            {servingSinr !== null && (
              <Text
                position={[pos[0], pos[1] + 26, pos[2]]}
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
