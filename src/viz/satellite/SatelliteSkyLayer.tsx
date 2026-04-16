/**
 * SatelliteSkyLayer — renders visible satellites on a sky dome.
 *
 * Uses the sat.glb 3D model for each satellite marker.
 * Marker size / halo / role badges reflect the shared presentation-frame role
 * so the beam-off first screen still reads as serving / prepared / secondary
 * truth without inventing new runtime state.
 *
 * VISUAL-ONLY: Does NOT modify physics, SINR, or KPI data.
 *
 * Curated display: only the top-N satellites by elevation are rendered,
 * with HO-relevant satellites always included. This avoids a dense
 * horizon ring and keeps the scene visually balanced (matching
 * leo-beam-sim's MAX_DISPLAY_SATS=12 approach).
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Billboard, Line, Text, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import type { SimulationSnapshot, SatelliteState } from '@/core/contracts/runtime-v1';
import { VISUAL_SCENE_CONFIG } from '@/config/visual-scene.config';
import type {
  BeamPresentationFrame,
  BeamPresentationMarkerRole,
} from '@/viz/presentation';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from './observer-sky-projection';

const SAT_MODEL_SCALE = 4;
const HALO_GEOMETRY = new THREE.SphereGeometry(4.6, 12, 12);
const BADGE_GEOMETRY = new THREE.PlaneGeometry(26, 10);

const MARKER_STYLES: Record<
  BeamPresentationMarkerRole,
  {
    color: string;
    modelScale: number;
    haloScale: number;
    haloOpacity: number;
    labelPrefix: string;
    pulseAmplitude: number;
    pulseHz: number;
    badgeFill: string | null;
    badgeText: string | null;
    trailLength: number;
    trailOpacity: number;
    trailWidth: number;
  }
> = {
  serving: {
    color: '#18f0ff',
    modelScale: SAT_MODEL_SCALE * 1.18,
    haloScale: 2.6,
    haloOpacity: 0.26,
    labelPrefix: 'SRV',
    pulseAmplitude: 0.11,
    pulseHz: 1.15,
    badgeFill: '#053947',
    badgeText: 'SERVING',
    trailLength: 10,
    trailOpacity: 0.42,
    trailWidth: 3.1,
  },
  prepared: {
    color: '#ffb000',
    modelScale: SAT_MODEL_SCALE * 1.1,
    haloScale: 2.35,
    haloOpacity: 0.24,
    labelPrefix: 'PRE',
    pulseAmplitude: 0.08,
    pulseHz: 1.55,
    badgeFill: '#4d3000',
    badgeText: 'PREP',
    trailLength: 8,
    trailOpacity: 0.34,
    trailWidth: 2.7,
  },
  secondary: {
    color: '#ff5ab3',
    modelScale: SAT_MODEL_SCALE * 1.08,
    haloScale: 2.25,
    haloOpacity: 0.22,
    labelPrefix: 'SEC',
    pulseAmplitude: 0.07,
    pulseHz: 1.35,
    badgeFill: '#4c1233',
    badgeText: 'SECOND',
    trailLength: 8,
    trailOpacity: 0.32,
    trailWidth: 2.7,
  },
  'post-ho': {
    color: '#8c6dff',
    modelScale: SAT_MODEL_SCALE * 1.05,
    haloScale: 2.15,
    haloOpacity: 0.2,
    labelPrefix: 'POST',
    pulseAmplitude: 0.05,
    pulseHz: 0.95,
    badgeFill: '#221551',
    badgeText: 'POST',
    trailLength: 6,
    trailOpacity: 0.24,
    trailWidth: 2.3,
  },
  neutral: {
    color: '#aaccff',
    modelScale: SAT_MODEL_SCALE,
    haloScale: 1.95,
    haloOpacity: 0.12,
    labelPrefix: 'CTX',
    pulseAmplitude: 0,
    pulseHz: 0,
    badgeFill: null,
    badgeText: null,
    trailLength: 0,
    trailOpacity: 0,
    trailWidth: 0,
  },
};

interface SatelliteSkyLayerProps {
  snapshot: SimulationSnapshot | null;
  presentationFrame: BeamPresentationFrame | null;
  showLabels?: boolean;
}

/**
 * VISUAL-ONLY: Opacity ramp based on elevation.
 * Fades in from 15° to 35°, full opacity above 35°.
 */
function elevationOpacity(elevationDeg: number): number {
  const FADE_IN = 15;
  const FULL_EL = 35;
  if (elevationDeg >= FULL_EL) return 1;
  if (elevationDeg <= FADE_IN) return 0.25;
  return 0.25 + 0.75 * ((elevationDeg - FADE_IN) / (FULL_EL - FADE_IN));
}

const SatelliteMarker = React.memo(function SatelliteMarker({
  sat,
  markerRole,
  showLabels,
  sourceScene,
}: {
  sat: SatelliteState;
  markerRole: BeamPresentationMarkerRole;
  showLabels: boolean;
  sourceScene: THREE.Group;
}) {
  const markerStyle = MARKER_STYLES[markerRole];
  const position = useMemo<[number, number, number]>(
    () => projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION),
    [sat.azimuthDeg, sat.elevationDeg],
  );

  const opacity = elevationOpacity(sat.elevationDeg);
  const shortId = sat.id.replace(/.*-shell-/, '');
  const materialsRef = useRef<Array<THREE.Material & { opacity: number; transparent: boolean; color?: THREE.Color }>>([]);
  const haloRef = useRef<THREE.Mesh>(null);
  const badgeRef = useRef<THREE.Group>(null);
  const [trailPoints, setTrailPoints] = React.useState<Array<[number, number, number]>>([]);

  const clonedScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(sourceScene);
    const materials: Array<THREE.Material & { opacity: number; transparent: boolean; color?: THREE.Color }> = [];
    cloned.traverse((obj: THREE.Object3D) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((material) => {
            const next = material.clone() as THREE.Material & { opacity: number; transparent: boolean; color?: THREE.Color };
            materials.push(next);
            return next;
          });
        } else if (mesh.material) {
          const next = mesh.material.clone() as THREE.Material & { opacity: number; transparent: boolean; color?: THREE.Color };
          materials.push(next);
          mesh.material = next;
        }
      }
    });
    materialsRef.current = materials;
    return cloned;
  }, [sourceScene]);

  useEffect(() => {
    for (const material of materialsRef.current) {
      if (material.color) material.color.set(markerStyle.color);
      material.transparent = true;
      material.opacity = opacity;
      material.needsUpdate = true;
    }
  }, [markerStyle.color, opacity]);

  useEffect(() => () => {
    for (const material of materialsRef.current) {
      material.dispose();
    }
    materialsRef.current = [];
  }, []);

  useEffect(() => {
    if (markerStyle.trailLength <= 0) {
      setTrailPoints([]);
      return;
    }
    setTrailPoints((previous) => {
      const nextPoint: [number, number, number] = [position[0], position[1], position[2]];
      const lastPoint = previous[previous.length - 1];
      if (
        lastPoint
        && Math.abs(lastPoint[0] - nextPoint[0]) < 0.001
        && Math.abs(lastPoint[1] - nextPoint[1]) < 0.001
        && Math.abs(lastPoint[2] - nextPoint[2]) < 0.001
      ) {
        return previous;
      }
      const next = [...previous, nextPoint];
      return next.slice(-markerStyle.trailLength);
    });
  }, [markerStyle.trailLength, position]);

  useFrame(({ clock }) => {
    if (!haloRef.current) return;
    const pulse =
      markerStyle.pulseAmplitude > 0
        ? 1 + markerStyle.pulseAmplitude * Math.sin(clock.getElapsedTime() * markerStyle.pulseHz * Math.PI * 2)
        : 1;
    haloRef.current.scale.setScalar(markerStyle.haloScale * pulse);
    const haloMaterial = haloRef.current.material as THREE.MeshBasicMaterial;
    haloMaterial.opacity =
      markerStyle.haloOpacity * opacity * (markerStyle.pulseAmplitude > 0 ? 0.92 + 0.18 * pulse : 1);

    if (badgeRef.current) {
      badgeRef.current.position.y = markerStyle.modelScale * 4.7 + (pulse - 1) * 6;
    }
  });

  return (
    <group position={position}>
      {trailPoints.length >= 2 && (
        <Line
          points={trailPoints}
          color={markerStyle.color}
          lineWidth={markerStyle.trailWidth}
          transparent
          opacity={markerStyle.trailOpacity * opacity}
          dashed={markerRole === 'prepared'}
          dashSize={6}
          gapSize={5}
          depthWrite={false}
        />
      )}
      <mesh ref={haloRef} geometry={HALO_GEOMETRY} scale={markerStyle.haloScale}>
        <meshBasicMaterial
          color={markerStyle.color}
          transparent
          opacity={markerStyle.haloOpacity * opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <primitive object={clonedScene} scale={markerStyle.modelScale} />
      {markerStyle.badgeText && (
        <Billboard follow>
          <group ref={badgeRef} position={[0, markerStyle.modelScale * 4.7, 0]}>
            <mesh geometry={BADGE_GEOMETRY}>
              <meshBasicMaterial
                color={markerStyle.badgeFill!}
                transparent
                opacity={0.82 * opacity}
                depthWrite={false}
              />
            </mesh>
            <Text
              position={[0, 0, 0.1]}
              fontSize={4.3}
              color={markerStyle.color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.7}
              outlineColor="#041018"
            >
              {markerStyle.badgeText}
            </Text>
          </group>
        </Billboard>
      )}
      {showLabels && (
        <Text
          position={[0, markerStyle.modelScale * 6.4, 0]}
          fontSize={8}
          color={markerStyle.color}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={1}
          outlineColor="#000000"
          fillOpacity={opacity}
        >
          {markerStyle.labelPrefix} {shortId} {Math.round(sat.elevationDeg)}°
        </Text>
      )}
    </group>
  );
});

export const SatelliteSkyLayer = React.memo(function SatelliteSkyLayer({
  snapshot,
  presentationFrame,
  showLabels = true,
}: SatelliteSkyLayerProps) {
  const { scene } = useGLTF(VISUAL_SCENE_CONFIG.satellite.modelPath);
  const displaySatIds = presentationFrame?.displaySatIds ?? [];
  const displaySats = useMemo(
    () =>
      displaySatIds
        .map((satId) => snapshot?.satellites.find((sat) => sat.id === satId) ?? null)
        .filter((sat): sat is SatelliteState => sat !== null),
    [displaySatIds, snapshot],
  );

  if (!snapshot) return null;

  return (
    <group name="satellite-sky-layer">
      {displaySats.map((sat) => (
        <SatelliteMarker
          key={sat.id}
          sat={sat}
          markerRole={presentationFrame?.markerRoleBySatId[sat.id] ?? 'neutral'}
          showLabels={showLabels}
          sourceScene={scene}
        />
      ))}
    </group>
  );
});

useGLTF.preload(VISUAL_SCENE_CONFIG.satellite.modelPath);

export type { SatelliteSkyLayerProps };
