/**
 * @deprecated Use EarthMovingBeamLayer instead. This is a hardcoded 7-beam
 * schematic that does not consume engine beam data. Kept for reference only.
 *
 * BeamFootprintLayer — VISUAL-ONLY multi-beam illustration.
 *
 * Shows a simplified beam pattern per visible satellite:
 * - 7 beams (1 center + 6 hex ring) — the most common compact layout in papers
 * - Semi-transparent cone from satellite to ground
 * - Ground-level colored circle for each beam cell
 * - Green = serving beam center, cyan/orange/magenta = neighboring beams
 *
 * This is a schematic illustration, not a to-scale geographic projection.
 * Beam positions are relative to each satellite's dome position.
 *
 * Paper references:
 *   - 7-beam: PAP-2024-MORL-MULTIBEAM, PAP-2025-MADQN-MULTIBEAM
 *   - 19-beam: PAP-2022-SINR-ELEVATION, PAP-2021-SHADOWED-RICIAN
 *
 * VISUAL-ONLY: Does NOT affect physics, SINR, or KPI.
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SimulationSnapshot, SatelliteState } from '@/core/common/types';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from '@/viz/satellite/observer-sky-projection';

// ---------------------------------------------------------------------------
// VISUAL-ONLY constants
// ---------------------------------------------------------------------------

/** VISUAL-ONLY: Number of beams to display per satellite. */
const DISPLAY_BEAMS = 7; // 1 center + 6 ring — clear and readable

/** VISUAL-ONLY: Ground cell radius in world units. */
const CELL_RADIUS = 22;

/** VISUAL-ONLY: Hex spacing = cell diameter × cos(30°) for tight packing. */
const HEX_SPACING = CELL_RADIUS * 2 * 0.866;

/** VISUAL-ONLY: Cone opacity. */
const CONE_OPACITY_BASE = 0.06;

/** VISUAL-ONLY: Ground disc opacity. */
const DISC_OPACITY_BASE = 0.35;

/** VISUAL-ONLY: Ground Y position. */
const GROUND_Y = 0.5;

/** VISUAL-ONLY: FRF colors (3-color scheme). */
const BEAM_COLORS = {
  serving: new THREE.Color(0x00ff88),     // bright green
  ring: [
    new THREE.Color(0x00ccff),            // cyan
    new THREE.Color(0xff8844),            // orange
    new THREE.Color(0xcc44ff),            // purple
  ],
} as const;

// ---------------------------------------------------------------------------
// VISUAL-ONLY: 7-beam hex positions (center + 6 neighbors)
// ---------------------------------------------------------------------------

const HEX_OFFSETS: [number, number][] = [
  [0, 0], // center
  [1, 0], [0.5, 0.866], [-0.5, 0.866],  // top half
  [-1, 0], [-0.5, -0.866], [0.5, -0.866], // bottom half
];

// ---------------------------------------------------------------------------
// VISUAL-ONLY: Elevation-based opacity
// ---------------------------------------------------------------------------

function elevationAlpha(elDeg: number): number {
  if (elDeg >= 30) return 1;
  if (elDeg <= 5) return 0;
  return (elDeg - 5) / 25;
}

// ---------------------------------------------------------------------------
// Single satellite beam group
// ---------------------------------------------------------------------------

const SatBeamGroup = React.memo(function SatBeamGroup({
  sat,
  beamScale,
}: {
  sat: SatelliteState;
  beamScale: number;
}) {
  // VISUAL-ONLY: project satellite to dome
  const satPos = useMemo<[number, number, number]>(
    () => projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION),
    [sat.azimuthDeg, sat.elevationDeg],
  );

  const alpha = elevationAlpha(sat.elevationDeg);
  if (alpha <= 0) return null;

  const r = CELL_RADIUS * beamScale;
  const spacing = HEX_SPACING * beamScale;
  const coneHeight = satPos[1] - GROUND_Y;
  if (coneHeight <= 10) return null;

  // VISUAL-ONLY: ground center below satellite
  const gx = satPos[0];
  const gz = satPos[2];

  return (
    <group>
      {HEX_OFFSETS.map((off, i) => {
        const bx = gx + off[0] * spacing;
        const bz = gz + off[1] * spacing;
        const isCenter = i === 0;
        const color = isCenter
          ? BEAM_COLORS.serving
          : BEAM_COLORS.ring[(i - 1) % 3];
        const discAlpha = isCenter
          ? alpha * DISC_OPACITY_BASE * 1.5
          : alpha * DISC_OPACITY_BASE;
        const coneAlpha = isCenter
          ? alpha * CONE_OPACITY_BASE * 2.5
          : alpha * CONE_OPACITY_BASE;

        return (
          <group key={i}>
            {/* VISUAL-ONLY: cone from satellite to ground cell */}
            {isCenter && (
              <mesh position={[bx, satPos[1] - coneHeight / 2, bz]}>
                <coneGeometry args={[r * 1.2, coneHeight, 6, 1, true]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={coneAlpha}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )}

            {/* VISUAL-ONLY: ground disc */}
            <mesh
              position={[bx, GROUND_Y + (isCenter ? 0.3 : 0), bz]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <circleGeometry args={[r, isCenter ? 32 : 6]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={discAlpha}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>

            {/* VISUAL-ONLY: cell border ring */}
            <mesh
              position={[bx, GROUND_Y + 0.1, bz]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[r * 0.92, r, isCenter ? 32 : 6]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={discAlpha * 1.8}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
});

// ---------------------------------------------------------------------------
// Main layer
// ---------------------------------------------------------------------------

export interface BeamFootprintLayerProps {
  snapshot: SimulationSnapshot | null;
  numBeams?: number; // kept for API compat but display always uses 7
  visible?: boolean;
  beamScale?: number;
}

export const BeamFootprintLayer = React.memo(function BeamFootprintLayer({
  snapshot,
  visible = true,
  beamScale = 1.0,
}: BeamFootprintLayerProps) {
  if (!snapshot || !visible) return null;

  // VISUAL-ONLY: show beams for top 6 highest-elevation satellites
  const topSats = snapshot.satellites
    .filter((s) => s.isVisible && s.elevationDeg > 15)
    .sort((a, b) => b.elevationDeg - a.elevationDeg)
    .slice(0, 6);

  return (
    <group name="beam-footprint-layer">
      {topSats.map((sat) => (
        <SatBeamGroup key={sat.id} sat={sat} beamScale={beamScale} />
      ))}
    </group>
  );
});
