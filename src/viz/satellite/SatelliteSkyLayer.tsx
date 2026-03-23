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

interface SatelliteSkyLayerProps {
  snapshot: SimulationSnapshot | null;
  showLabels?: boolean;
}

/** VISUAL-ONLY: Opacity ramp based on elevation. */
function elevationOpacity(elevationDeg: number): number {
  // Fade in from 0° to 15°; full opacity above 15°.
  const MIN_EL = 0;
  const FULL_EL = 15;
  if (elevationDeg >= FULL_EL) return 1;
  if (elevationDeg <= MIN_EL) return 0.15;
  return 0.15 + 0.85 * ((elevationDeg - MIN_EL) / (FULL_EL - MIN_EL));
}

/** VISUAL-ONLY scale for the satellite model. */
const SAT_SCALE = 8;

const SatelliteMarker = React.memo(function SatelliteMarker({
  sat,
  showLabels,
}: {
  sat: SatelliteState;
  showLabels: boolean;
}) {
  const { scene } = useGLTF(SATELLITE_MODEL_ASSET.path);

  const position = useMemo<[number, number, number]>(
    () => projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION),
    [sat.azimuthDeg, sat.elevationDeg],
  );

  const opacity = elevationOpacity(sat.elevationDeg); // VISUAL-ONLY

  return (
    <group position={position}>
      <primitive
        object={scene.clone()}
        scale={[SAT_SCALE, SAT_SCALE, SAT_SCALE]}
      />
      {/* VISUAL-ONLY: opacity sphere overlay for elevation fade */}
      <mesh>
        <sphereGeometry args={[SAT_SCALE * 0.6, 8, 8]} />
        <meshBasicMaterial
          color="#4fc3f7"
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>
      {showLabels && (
        <Text
          position={[0, SAT_SCALE * 1.5, 0]}
          fontSize={SAT_SCALE * 0.8}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          fillOpacity={opacity}
        >
          {`${sat.id} ${sat.elevationDeg.toFixed(1)}°`}
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

  const visibleSats = snapshot.satellites.filter((s) => s.isVisible);

  return (
    <group name="satellite-sky-layer">
      {visibleSats.map((sat) => (
        <SatelliteMarker key={sat.id} sat={sat} showLabels={showLabels} />
      ))}
    </group>
  );
});

export type { SatelliteSkyLayerProps };
