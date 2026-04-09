/**
 * SatelliteSkyLayer — renders visible satellites on a sky dome.
 *
 * Uses the sat.glb 3D model for each satellite marker.
 * Serving / handover state is shown by separate overlay layers
 * (HandoverLinkOverlay, BeamInfoOverlay), NOT by the marker itself.
 *
 * VISUAL-ONLY: Does NOT modify physics, SINR, or KPI data.
 *
 * Curated display: only the top-N satellites by elevation are rendered,
 * with HO-relevant satellites always included. This avoids a dense
 * horizon ring and keeps the scene visually balanced (matching
 * leo-beam-sim's MAX_DISPLAY_SATS=12 approach).
 */

import React, { useMemo, useRef } from 'react';
import { Text, useGLTF } from '@react-three/drei';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import type { SimulationSnapshot, SatelliteState } from '@/core/contracts/runtime-v1';
import { VISUAL_SCENE_CONFIG } from '@/config/visual-scene.config';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from './observer-sky-projection';

const SAT_COLOR = '#aaccff';
const SAT_MODEL_SCALE = 4;

// ---------------------------------------------------------------------------
// VISUAL-ONLY: Curated satellite selection constants
// ---------------------------------------------------------------------------

/** Max satellite markers to render. HO-relevant sats are always included. */
const MAX_DISPLAY_SATS = 10;

/** Satellites below this elevation are never rendered (but still in engine). */
const MIN_DISPLAY_ELEVATION_DEG = 10;

/** Elevation below which a large score penalty is applied. */
const LOW_ELEVATION_PENALTY_THRESHOLD_DEG = 25;

/** Score penalty for satellites below LOW_ELEVATION_PENALTY_THRESHOLD_DEG. */
const LOW_ELEVATION_PENALTY = -500;

/** Score bonus for HO-relevant satellites (serving/target/secondary). */
const HO_RELEVANT_BONUS = 10000;

/** Score bonus for satellites that were displayed in the previous frame. */
const CONTINUITY_BONUS = 20;

/** Minimum azimuth separation (degrees) before proximity penalty applies. */
const MIN_AZIMUTH_SEPARATION_DEG = 30;

/** Penalty applied when a satellite's azimuth is too close to an already-selected one. */
const AZIMUTH_PROXIMITY_PENALTY = -200;

interface SatelliteSkyLayerProps {
  snapshot: SimulationSnapshot | null;
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

/** Shortest angular distance between two azimuths (0-180°). */
function azimuthDistance(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

/**
 * VISUAL-ONLY: Select which satellites to display on the sky dome.
 *
 * Scoring favors:
 *  1. HO-relevant satellites (serving, target, secondary) — always shown
 *  2. High-elevation satellites — more visually central
 *  3. Previously displayed satellites — avoids flickering
 *  4. Azimuth diversity — penalizes satellites too close to already-selected ones
 *
 * Uses greedy selection: pick the highest-scoring candidate, then re-score
 * remaining candidates with azimuth proximity penalty before picking next.
 */
function selectDisplaySatellites(
  satellites: SatelliteState[],
  snapshot: SimulationSnapshot,
  previousIds: Set<string>,
): SatelliteState[] {
  // Identify HO-relevant satellite IDs
  const hoRelevantIds = new Set<string>();
  const primaryUe = snapshot.ues[0];
  if (primaryUe?.servingSatId) hoRelevantIds.add(primaryUe.servingSatId);
  if (primaryUe?.targetSatId) hoRelevantIds.add(primaryUe.targetSatId);
  if (primaryUe?.secondarySatId) hoRelevantIds.add(primaryUe.secondarySatId);
  if (snapshot.daps?.targetSatId) hoRelevantIds.add(snapshot.daps.targetSatId);

  // Filter candidates
  const candidates = satellites.filter(
    (s) => s.isVisible && s.elevationDeg >= MIN_DISPLAY_ELEVATION_DEG,
  );

  // Base score each satellite
  const pool = candidates.map((sat) => {
    let score = sat.elevationDeg; // base: elevation in degrees
    if (hoRelevantIds.has(sat.id)) score += HO_RELEVANT_BONUS;
    if (previousIds.has(sat.id)) score += CONTINUITY_BONUS;
    if (sat.elevationDeg < LOW_ELEVATION_PENALTY_THRESHOLD_DEG) score += LOW_ELEVATION_PENALTY;
    return { sat, baseScore: score };
  });

  // Greedy selection with azimuth diversity
  const selected: SatelliteState[] = [];
  const selectedAzimuths: number[] = [];
  const used = new Set<string>();

  for (let round = 0; round < MAX_DISPLAY_SATS && pool.length > 0; round++) {
    let bestIdx = -1;
    let bestEffective = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      if (used.has(pool[i].sat.id)) continue;
      let effective = pool[i].baseScore;

      // Azimuth proximity penalty (skip for HO-relevant — always show them)
      if (!hoRelevantIds.has(pool[i].sat.id)) {
        for (const az of selectedAzimuths) {
          if (azimuthDistance(pool[i].sat.azimuthDeg, az) < MIN_AZIMUTH_SEPARATION_DEG) {
            effective += AZIMUTH_PROXIMITY_PENALTY;
            break; // one penalty is enough
          }
        }
      }

      if (effective > bestEffective) {
        bestEffective = effective;
        bestIdx = i;
      }
    }

    if (bestIdx < 0) break;
    const pick = pool[bestIdx];
    selected.push(pick.sat);
    selectedAzimuths.push(pick.sat.azimuthDeg);
    used.add(pick.sat.id);
  }

  return selected;
}

const SatelliteMarker = React.memo(function SatelliteMarker({
  sat,
  showLabels,
  sourceScene,
}: {
  sat: SatelliteState;
  showLabels: boolean;
  sourceScene: THREE.Group;
}) {
  const position = useMemo<[number, number, number]>(
    () => projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION),
    [sat.azimuthDeg, sat.elevationDeg],
  );

  const opacity = elevationOpacity(sat.elevationDeg);
  const shortId = sat.id.replace(/.*-shell-/, '');

  const clonedScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(sourceScene);
    cloned.traverse((obj: THREE.Object3D) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const oldMat = mesh.material as THREE.Material;
        const newMat = oldMat.clone();
        (newMat as THREE.MeshStandardMaterial).color = new THREE.Color(SAT_COLOR);
        (newMat as THREE.MeshStandardMaterial).transparent = true;
        (newMat as THREE.MeshStandardMaterial).opacity = opacity;
        mesh.material = newMat;
      }
    });
    return cloned;
  }, [sourceScene, opacity]);

  return (
    <group position={position}>
      <primitive object={clonedScene} scale={SAT_MODEL_SCALE} />
      {showLabels && (
        <Text
          position={[0, SAT_MODEL_SCALE * 3, 0]}
          fontSize={8}
          color={SAT_COLOR}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={1}
          outlineColor="#000000"
          fillOpacity={opacity}
        >
          {shortId} {Math.round(sat.elevationDeg)}°
        </Text>
      )}
    </group>
  );
});

export const SatelliteSkyLayer = React.memo(function SatelliteSkyLayer({
  snapshot,
  showLabels = true,
}: SatelliteSkyLayerProps) {
  const { scene } = useGLTF(VISUAL_SCENE_CONFIG.satellite.modelPath);
  const previousIdsRef = useRef<Set<string>>(new Set());

  const displaySats = useMemo(() => {
    if (!snapshot) return [];
    const selected = selectDisplaySatellites(
      snapshot.satellites,
      snapshot,
      previousIdsRef.current,
    );
    // Update continuity set for next frame
    previousIdsRef.current = new Set(selected.map((s) => s.id));
    return selected;
  }, [snapshot]);

  if (!snapshot) return null;

  return (
    <group name="satellite-sky-layer">
      {displaySats.map((sat) => (
        <SatelliteMarker
          key={sat.id}
          sat={sat}
          showLabels={showLabels}
          sourceScene={scene}
        />
      ))}
    </group>
  );
});

useGLTF.preload(VISUAL_SCENE_CONFIG.satellite.modelPath);

export type { SatelliteSkyLayerProps };
