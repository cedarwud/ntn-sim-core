/**
 * EarthMovingBeamLayer — engine-driven multi-beam renderer.
 *
 * Renders per-satellite beam cones and ground discs from engine snapshot data.
 * Beam count, positions, FRF coloring, and serving/target roles are all
 * derived from SimulationSnapshot.satellites[].beams[], NOT hardcoded.
 *
 * Donor pattern: leo-beam-sim/src/viz/SatelliteBeams.tsx (oblique cone geometry).
 *
 * VISUAL-ONLY: Does NOT affect physics, SINR, or KPI.
 *
 * @see sdd/ntn-sim-core-frontend-beam-visual-sdd.md §6.1
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SimulationSnapshot, SatelliteState, SatelliteBeamSnapshot, DapsSnapshot } from '@/core/common/types';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from '@/viz/satellite/observer-sky-projection';

// ---------------------------------------------------------------------------
// VISUAL-ONLY constants
// ---------------------------------------------------------------------------

/** Max satellites to render beams for (performance). */
const MAX_BEAM_SATS = 6;

/** Min elevation to render beams (degrees). */
const MIN_ELEVATION_DEG = 10;

/** Cone segment count. */
const SEGMENTS = 24;

/** Ground disc Y position. */
const GROUND_Y = 0.5;

/** FRF color palette (up to 7 groups). */
const FRF_COLORS = [
  '#44aaff', // blue
  '#ff8844', // orange
  '#cc44ff', // purple
  '#44ffaa', // teal
  '#ffcc44', // yellow
  '#ff4488', // pink
  '#88ff44', // lime
];

/** Role-based colors override FRF. */
const ROLE_COLORS: Record<SatelliteBeamSnapshot['role'], string | null> = {
  serving: '#00ff88',
  target: '#ffb000',
  neutral: null,   // use FRF color
  inactive: '#444444',
};

/** DAPS dual-active: target beam treated as co-serving (cyan). */
const DAPS_DUAL_ACTIVE_COLOR = '#00e5ff';

/** Role-based opacity. */
const ROLE_OPACITY: Record<SatelliteBeamSnapshot['role'], { cone: number; disc: number }> = {
  serving: { cone: 0.18, disc: 0.35 },
  target: { cone: 0.14, disc: 0.25 },
  neutral: { cone: 0.06, disc: 0.15 },
  inactive: { cone: 0.02, disc: 0.05 },
};

// ---------------------------------------------------------------------------
// VISUAL-ONLY: elevation opacity ramp
// ---------------------------------------------------------------------------

function elevationAlpha(elDeg: number): number {
  if (elDeg >= 30) return 1;
  if (elDeg <= 5) return 0;
  return (elDeg - 5) / 25;
}

// ---------------------------------------------------------------------------
// VISUAL-ONLY: oblique cone geometry (donor: leo-beam-sim)
// ---------------------------------------------------------------------------

function createObliqueConeSide(
  apex: [number, number, number],
  cx: number,
  cz: number,
  radius: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  positions.push(apex[0], apex[1], apex[2]);

  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    positions.push(cx + Math.cos(angle) * radius, GROUND_Y, cz + Math.sin(angle) * radius);
  }

  for (let i = 0; i < SEGMENTS; i++) {
    const next = (i + 1) % SEGMENTS;
    indices.push(0, i + 1, next + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createGroundDisc(
  cx: number,
  cz: number,
  radius: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  positions.push(cx, GROUND_Y + 0.2, cz);

  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    positions.push(cx + Math.cos(angle) * radius, GROUND_Y + 0.2, cz + Math.sin(angle) * radius);
  }

  for (let i = 0; i < SEGMENTS; i++) {
    const next = (i + 1) % SEGMENTS;
    indices.push(0, i + 1, next + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------------------
// Single beam component
// ---------------------------------------------------------------------------

const BeamCone = React.memo(function BeamCone({
  satPos,
  groundX,
  groundZ,
  beamRadius,
  beam,
  alpha,
  dapsDualActiveTarget = false,
}: {
  satPos: [number, number, number];
  groundX: number;
  groundZ: number;
  beamRadius: number;
  beam: SatelliteBeamSnapshot;
  alpha: number;
  dapsDualActiveTarget?: boolean;
}) {
  const color = dapsDualActiveTarget
    ? DAPS_DUAL_ACTIVE_COLOR
    : (ROLE_COLORS[beam.role] ?? FRF_COLORS[beam.reuseGroup % FRF_COLORS.length]);
  const opacity = dapsDualActiveTarget ? ROLE_OPACITY.serving : ROLE_OPACITY[beam.role];

  const coneGeo = useMemo(
    () => createObliqueConeSide(satPos, groundX, groundZ, beamRadius),
    [satPos[0], satPos[1], satPos[2], groundX, groundZ, beamRadius],
  );

  const discGeo = useMemo(
    () => createGroundDisc(groundX, groundZ, beamRadius),
    [groundX, groundZ, beamRadius],
  );

  const showCone = beam.role === 'serving' || beam.role === 'target' || dapsDualActiveTarget;

  return (
    <group>
      {/* Cone: only for serving/target to reduce visual clutter */}
      {showCone && (
        <mesh geometry={coneGeo}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity.cone * alpha}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Ground disc */}
      <mesh geometry={discGeo}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity.disc * alpha}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Border ring */}
      <mesh
        position={[groundX, GROUND_Y + 0.3, groundZ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[beamRadius * 0.92, beamRadius, SEGMENTS]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity.disc * alpha * 1.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
});

// ---------------------------------------------------------------------------
// Per-satellite beam group
// ---------------------------------------------------------------------------

const SatBeamGroup = React.memo(function SatBeamGroup({
  sat,
  beamScale,
  daps,
}: {
  sat: SatelliteState;
  beamScale: number;
  daps?: DapsSnapshot;
}) {
  const beams = sat.beams;
  if (!beams || beams.length === 0) return null;

  const satPos = useMemo<[number, number, number]>(
    () => projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION),
    [sat.azimuthDeg, sat.elevationDeg],
  );

  const alpha = elevationAlpha(sat.elevationDeg);
  if (alpha <= 0) return null;

  // VISUAL-ONLY: Scale km offsets to world units.
  // The dome maps rangeKm → horizontalRadius, so beam offsets scale proportionally.
  const kmToWorld = (DEFAULT_SKY_PROJECTION.horizontalRadius / Math.max(sat.rangeKm, 100)) * beamScale;

  // VISUAL-ONLY: Ground center directly below satellite dome position
  const groundCenterX = satPos[0];
  const groundCenterZ = satPos[2];

  // Beam footprint radius in world units (half beam diameter)
  // Use first beam's offset distance to estimate, or fall back to a default
  const beamSpacingKm = beams.length > 1
    ? Math.sqrt(beams[1].offsetEastKm ** 2 + beams[1].offsetNorthKm ** 2) || 30
    : 30;
  const beamRadius = beamSpacingKm * 0.5 * kmToWorld;

  // DAPS dual-active: target sat beams rendered as co-serving
  const isDapsTarget = daps?.phase === 'dual-active' && sat.id === daps.targetSatId;

  return (
    <group>
      {beams.map((beam) => {
        // Skip inactive beams with very low visibility
        if (beam.role === 'inactive' && alpha < 0.3) return null;

        const groundX = groundCenterX + beam.offsetEastKm * kmToWorld;
        const groundZ = groundCenterZ - beam.offsetNorthKm * kmToWorld; // negate: Three.js z = -North

        return (
          <BeamCone
            key={beam.beamId}
            satPos={satPos}
            groundX={groundX}
            groundZ={groundZ}
            beamRadius={beamRadius}
            beam={beam}
            alpha={alpha}
            dapsDualActiveTarget={isDapsTarget && beam.role !== 'inactive'}
          />
        );
      })}
    </group>
  );
});

// ---------------------------------------------------------------------------
// Main layer
// ---------------------------------------------------------------------------

export interface EarthMovingBeamLayerProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
  beamScale?: number;
}

export const EarthMovingBeamLayer = React.memo(function EarthMovingBeamLayer({
  snapshot,
  visible = true,
  beamScale = 1.0,
}: EarthMovingBeamLayerProps) {
  if (!snapshot || !visible) return null;

  // Select top satellites by elevation that have beam data
  const topSats = snapshot.satellites
    .filter((s) => s.isVisible && s.elevationDeg > MIN_ELEVATION_DEG && s.beams && s.beams.length > 0)
    .sort((a, b) => b.elevationDeg - a.elevationDeg)
    .slice(0, MAX_BEAM_SATS);

  return (
    <group name="earth-moving-beam-layer">
      {topSats.map((sat) => (
        <SatBeamGroup key={sat.id} sat={sat} beamScale={beamScale} daps={snapshot.daps} />
      ))}
    </group>
  );
});
