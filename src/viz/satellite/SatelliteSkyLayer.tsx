/**
 * SatelliteSkyLayer — renders visible satellites on a sky dome.
 *
 * VISUAL-ONLY: This component consumes SimulationSnapshot and projects
 * satellites onto a hemisphere dome for observer-centric display.
 * It does NOT modify physics, SINR, or KPI data.
 */

import React, { useMemo } from 'react';
import { useGLTF, Text } from '@react-three/drei';
import type { SimulationSnapshot, SatelliteState } from '@/core/common/types';
import { SATELLITE_MODEL_ASSET } from '@/assets/models';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from './observer-sky-projection';

// Pre-load the GLB so it's cached before first render.
useGLTF.preload(SATELLITE_MODEL_ASSET.path);

// VISUAL-ONLY: Role type for satellite marker styling.
type SatRole = 'serving' | 'post-ho' | 'prepared' | 'secondary' | 'default';

interface SatelliteSkyLayerProps {
  snapshot: SimulationSnapshot | null;
  showLabels?: boolean;
}

/** VISUAL-ONLY: Opacity ramp based on elevation. */
function elevationOpacity(elevationDeg: number): number {
  const MIN_EL = 0;
  const FULL_EL = 15;
  if (elevationDeg >= FULL_EL) return 1;
  if (elevationDeg <= MIN_EL) return 0.15;
  return 0.15 + 0.85 * ((elevationDeg - MIN_EL) / (FULL_EL - MIN_EL));
}

/** VISUAL-ONLY: Role-based color. */
function roleColor(role: SatRole): string {
  switch (role) {
    case 'serving':   return '#18f0ff';
    case 'post-ho':   return '#4f8cff';
    case 'prepared':  return '#ff9d1c';
    case 'secondary': return '#ff5ab3';
    default:          return '#aaccff';
  }
}

/** VISUAL-ONLY: Role-based model scale. */
function roleScale(role: SatRole): number {
  switch (role) {
    case 'serving':
    case 'post-ho':  return 10;
    case 'prepared': return 8.5;
    case 'secondary': return 7.5;
    default:         return 6.5;
  }
}

const SatelliteMarker = React.memo(function SatelliteMarker({
  sat,
  role,
  showLabels,
}: {
  sat: SatelliteState;
  role: SatRole;
  showLabels: boolean;
}) {
  const { scene } = useGLTF(SATELLITE_MODEL_ASSET.path);

  const position = useMemo<[number, number, number]>(
    () => projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION),
    [sat.azimuthDeg, sat.elevationDeg],
  );

  const opacity = elevationOpacity(sat.elevationDeg); // VISUAL-ONLY
  const scale = roleScale(role); // VISUAL-ONLY
  const color = roleColor(role); // VISUAL-ONLY
  const isPrimaryEvent = role === 'serving' || role === 'post-ho';
  const isPrepared = role === 'prepared';

  return (
    <group position={position}>
      <primitive object={scene.clone()} scale={[scale, scale, scale]} />
      {/* VISUAL-ONLY: point light for primary event satellites */}
      {(isPrimaryEvent || isPrepared) && (
        <pointLight
          color={color}
          intensity={isPrimaryEvent ? 1 : 0.6}
          distance={80}
          decay={2}
        />
      )}
      {showLabels && (
        <Text
          position={[0, scale * 2.2, 0]}
          fontSize={isPrimaryEvent ? 12 : 10}
          color={color}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={1}
          outlineColor="#000000"
          fillOpacity={opacity}
        >
          {role !== 'default' ? `${sat.id} (${role})` : `${sat.id} ${sat.elevationDeg.toFixed(1)}°`}
        </Text>
      )}
    </group>
  );
});

export const SatelliteSkyLayer = React.memo(function SatelliteSkyLayer({
  snapshot,
  showLabels = true,
}: SatelliteSkyLayerProps) {
  if (!snapshot) return null;

  const ue = snapshot.ues[0];
  const servingId   = ue?.servingSatId ?? null;
  const targetId    = ue?.targetSatId ?? null;
  const secondaryId = ue?.secondarySatId ?? null;

  // VISUAL-ONLY: derive role for each visible satellite.
  function getSatRole(satId: string): SatRole {
    if (satId === servingId)   return 'serving';
    if (satId === targetId)    return 'prepared';
    if (satId === secondaryId) return 'secondary';
    return 'default';
  }

  const visibleSats = snapshot.satellites.filter((s) => s.isVisible);

  return (
    <group name="satellite-sky-layer">
      {visibleSats.map((sat) => (
        <SatelliteMarker
          key={sat.id}
          sat={sat}
          role={getSatRole(sat.id)}
          showLabels={showLabels}
        />
      ))}
    </group>
  );
});

export type { SatelliteSkyLayerProps };
