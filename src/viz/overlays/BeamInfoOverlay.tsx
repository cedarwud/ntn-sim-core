/**
 * BeamInfoOverlay — truth-driven beam/SINR explainer labels.
 *
 * Reads beam roles and SINR truth from SimulationSnapshot.
 * Does NOT recompute any channel or SINR values in the frontend.
 *
 * Shows:
 *   - SINR dB label above serving satellite dome position (color-coded)
 *   - Beam role badge (serving / prepared / secondary / neutral count)
 *   - Elevation angle label for context
 *
 * Donor: leo-beam-sim/src/viz/SinrOverlay.tsx (label style + color thresholds)
 *
 * VISUAL-ONLY / TRUTH-DRIVEN: reads snapshot fields only.
 *
 * @see sdd/ntn-sim-core-frontend-beam-visual-sdd.md §6.3, §7, §7.1
 */

import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';
import type { SimulationSnapshot, SatelliteState } from '@/core/contracts/runtime-v1';
import { usePublishValidationSection } from '@/viz/validation/store';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from '@/viz/satellite/observer-sky-projection';

// ---------------------------------------------------------------------------
// VISUAL-ONLY constants
// ---------------------------------------------------------------------------

const MIN_ELEVATION_DEG = 10;
const MAX_LABEL_SATS = 6;

// SINR color thresholds (from leo-beam-sim donor)
function sinrColor(sinrDb: number): string {
  if (sinrDb >= 20) return '#00ff88';
  if (sinrDb >= 10) return '#aaff00';
  if (sinrDb >= 5)  return '#ffaa00';
  return '#ff4444';
}

function getRoleTag(sat: SatelliteState): string {
  const beams = sat.beams ?? [];
  const servingBeam = beams.find((b) => b.role === 'serving');
  const preparedBeam = beams.find((b) => b.role === 'prepared');
  const secondaryBeam = beams.find((b) => b.role === 'secondary');
  const postHoBeam = beams.find((b) => b.role === 'post-ho');
  const activeCount = beams.filter((b) => b.isActive).length;

  if (servingBeam) return 'SERVING';
  if (secondaryBeam) return 'SECONDARY';
  if (preparedBeam) return 'PREPARED';
  if (postHoBeam) return 'POST-HO';
  return `${activeCount} active`;
}

// ---------------------------------------------------------------------------
// Per-satellite label
// ---------------------------------------------------------------------------

const SatBeamLabel = React.memo(function SatBeamLabel({
  sat,
  sinrDb,
}: {
  sat: SatelliteState;
  sinrDb: number | null;
}) {
  const pos = projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION);

  // Role summary from beams
  const roleTag = getRoleTag(sat);
  const isServing = roleTag === 'SERVING';
  const isPrepared = roleTag === 'PREPARED';
  const isSecondary = roleTag === 'SECONDARY';
  const isPostHo = roleTag === 'POST-HO';
  const sinrLine = sinrDb !== null ? `${sinrDb.toFixed(1)} dB` : '';
  const elevLine = `${sat.elevationDeg.toFixed(1)}°  ${Math.round(sat.rangeKm)} km`;

  const labelColor = isServing
    ? (sinrDb !== null ? sinrColor(sinrDb) : '#00ff88')
    : isSecondary
      ? '#00e5ff'
      : isPrepared
        ? '#ffb000'
        : isPostHo
          ? '#7a5cff'
          : '#aaaaaa';

  const labelSize = isServing ? 9 : 7;
  const offsetY   = isServing ? 32 : 22;

  // Vertical step between label lines
  const lineStep = isServing ? 13 : 11;

  return (
    <group>
      {/* Role tag */}
      <Text
        position={[pos[0], pos[1] + offsetY, pos[2]]}
        fontSize={labelSize}
        color={labelColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={1}
        outlineColor="#000000"
      >
        {roleTag}
      </Text>

      {/* SINR value (serving only) */}
      {isServing && sinrLine !== '' && (
        <Text
          position={[pos[0], pos[1] + offsetY - lineStep, pos[2]]}
          fontSize={11}
          color={labelColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={1.5}
          outlineColor="#000000"
        >
          {sinrLine}
        </Text>
      )}

      {/* Elevation + range (all satellites) */}
      <Text
        position={[pos[0], pos[1] + offsetY - (isServing ? lineStep * 2 : lineStep), pos[2]]}
        fontSize={6}
        color="#888888"
        anchorX="center"
        anchorY="middle"
        outlineWidth={1}
        outlineColor="#000000"
      >
        {elevLine}
      </Text>
    </group>
  );
});

// ---------------------------------------------------------------------------
// Main overlay
// ---------------------------------------------------------------------------

export interface BeamInfoOverlayProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
}

export const BeamInfoOverlay = React.memo(function BeamInfoOverlay({
  snapshot,
  visible = true,
}: BeamInfoOverlayProps) {
  const hasBeams = useMemo(
    () => Boolean(snapshot && visible && snapshot.satellites.some((sat) => sat.beams && sat.beams.length > 0)),
    [snapshot, visible],
  );

  const topSats = useMemo(() => {
    if (!snapshot || !visible || !hasBeams) return [];
    const relevantSatIds = new Set<string>();
    for (const ue of snapshot.ues) {
      if (ue.servingSatId) relevantSatIds.add(ue.servingSatId);
      if (ue.targetSatId) relevantSatIds.add(ue.targetSatId);
      if (ue.secondarySatId) relevantSatIds.add(ue.secondarySatId);
    }

    return snapshot.satellites
      .filter(
        (sat) =>
          sat.isVisible &&
          sat.elevationDeg > MIN_ELEVATION_DEG &&
          sat.beams?.some(
            (b) => b.role === 'serving' || b.role === 'prepared' || b.role === 'secondary' || b.role === 'post-ho',
          ),
      )
      .sort((a, b) => {
        const aPriority = relevantSatIds.has(a.id) ? 1 : 0;
        const bPriority = relevantSatIds.has(b.id) ? 1 : 0;
        return bPriority - aPriority || b.elevationDeg - a.elevationDeg;
      })
      .slice(0, MAX_LABEL_SATS);
  }, [hasBeams, snapshot, visible]);

  const primaryUe = snapshot?.ues[0] ?? null;
  const primarySinr = primaryUe?.sinrDb ?? null;

  const validationSummary = useMemo(() => ({
    present: topSats.length > 0,
    labeledSatIds: topSats.map((sat) => sat.id),
    roleTags: topSats.map((sat) => `${sat.id}:${getRoleTag(sat)}`),
    primaryServingSatId: primaryUe?.servingSatId ?? null,
    servingSinrDb: primarySinr,
  }), [primarySinr, primaryUe?.servingSatId, topSats]);

  usePublishValidationSection('beamInfoOverlay', validationSummary);

  if (!snapshot || !visible || !hasBeams || topSats.length === 0) return null;

  return (
    <group name="beam-info-overlay">
      {topSats.map((sat) => {
        // Only expose SINR for the satellite actually serving the primary UE
        const sinrForSat = sat.id === primaryUe?.servingSatId ? primarySinr : null;
        return (
          <SatBeamLabel key={sat.id} sat={sat} sinrDb={sinrForSat} />
        );
      })}
    </group>
  );
});
