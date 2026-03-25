/**
 * EarthFixedCellLayer — earth-fixed hexagonal cell grid for BH profiles.
 *
 * Renders a fixed hex grid on the ground plane. Cells remain stationary
 * while satellites move overhead. Active BH beams illuminate covered cells.
 *
 * Four cell states (5V-4):
 *   served        — active beam covers cell, no FRF collision       (blue)
 *   interfered    — covered by ≥2 beams from different FRF groups   (yellow)
 *   energy-blocked — covered only by energy-depleted satellites      (orange)
 *   unserved      — no active beam coverage                          (dark gray)
 *
 * Donor pattern: leo-simulator/src/features/beam-hopping/components/EarthFixedCells.tsx
 *
 * VISUAL-ONLY: Does NOT affect physics, SINR, or KPI.
 *
 * @see sdd/ntn-sim-core-frontend-beam-visual-sdd.md §6.2, §12.3
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SimulationSnapshot, SatelliteState } from '@/core/common/types';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from '@/viz/satellite/observer-sky-projection';

// ---------------------------------------------------------------------------
// VISUAL-ONLY constants
// ---------------------------------------------------------------------------

/** VISUAL-ONLY: Grid radius in world units (hex cells extend this far from origin). */
const GRID_RADIUS_WU = 280;

/** VISUAL-ONLY: Cell radius (circumradius) in world units. */
const CELL_RADIUS_WU = 45;

/** VISUAL-ONLY: Hex spacing = cell-diameter × cos30° for tight packing. */
const HEX_SPACING_WU = CELL_RADIUS_WU * 1.732; // √3

/** VISUAL-ONLY: Ground Y height for cells. */
const GROUND_Y = 0.8;

/** VISUAL-ONLY: Number of hex segments. */
const HEX_SEGS = 6;

/** VISUAL-ONLY: Cell state colors (5V-4 — 4 distinct states). */
const COLORS = {
  served:         { fill: '#44aaff', border: '#66ccff', fillOpacity: 0.35, borderOpacity: 0.8 },
  interfered:     { fill: '#ffdd00', border: '#ffee44', fillOpacity: 0.40, borderOpacity: 0.9 },
  energyBlocked:  { fill: '#ff7700', border: '#ffaa44', fillOpacity: 0.35, borderOpacity: 0.8 },
  unserved:       { fill: '#222233', border: '#334455', fillOpacity: 0.10, borderOpacity: 0.3 },
} as const;

// ---------------------------------------------------------------------------
// VISUAL-ONLY: Generate flat-top hex grid
// ---------------------------------------------------------------------------

interface HexCell {
  cx: number; // world X (East)
  cz: number; // world Z (-North)
  reuseGroup: number;
}

function generateHexGrid(): HexCell[] {
  const cells: HexCell[] = [];
  const cols = Math.ceil(GRID_RADIUS_WU / HEX_SPACING_WU);
  const rows = Math.ceil(GRID_RADIUS_WU / (CELL_RADIUS_WU * 1.5));

  for (let row = -rows; row <= rows; row++) {
    for (let col = -cols; col <= cols; col++) {
      // Odd-r offset layout
      const cx = col * HEX_SPACING_WU + (row % 2 !== 0 ? HEX_SPACING_WU * 0.5 : 0);
      const cz = row * CELL_RADIUS_WU * 1.5;
      if (Math.sqrt(cx * cx + cz * cz) > GRID_RADIUS_WU) continue;
      // FRF 3-color: (col + row*2) mod 3
      const reuseGroup = ((col + row * 2) % 3 + 3) % 3;
      cells.push({ cx, cz, reuseGroup });
    }
  }
  return cells;
}

// ---------------------------------------------------------------------------
// VISUAL-ONLY: Hex polygon geometry
// ---------------------------------------------------------------------------

function createHexFill(cx: number, cz: number, r: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  positions.push(cx, GROUND_Y, cz); // center
  for (let i = 0; i < HEX_SEGS; i++) {
    const angle = (i / HEX_SEGS) * Math.PI * 2 + Math.PI / 6;
    positions.push(cx + Math.cos(angle) * r, GROUND_Y, cz + Math.sin(angle) * r);
  }
  for (let i = 0; i < HEX_SEGS; i++) {
    indices.push(0, i + 1, ((i + 1) % HEX_SEGS) + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

function createHexBorder(cx: number, cz: number, r: number): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let i = 0; i <= HEX_SEGS; i++) {
    const angle = (i / HEX_SEGS) * Math.PI * 2 + Math.PI / 6;
    positions.push(cx + Math.cos(angle) * r, GROUND_Y + 0.1, cz + Math.sin(angle) * r);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

// ---------------------------------------------------------------------------
// Coverage computation — 4-state (5V-4)
// ---------------------------------------------------------------------------

type CellState = 'served' | 'interfered' | 'energyBlocked' | 'unserved';

/**
 * Compute per-cell state from BH slot truth.
 *
 * Algorithm:
 *   For each cell, collect all (satId, reuseGroup) pairs from covering active beams.
 *   - If covered only by energy-blocked satellites → energyBlocked
 *   - If covered by beams from ≥2 distinct reuseGroups → interfered (FRF collision)
 *   - If covered by exactly one reuseGroup (no collision) → served
 *   - Otherwise → unserved
 */
function computeCellStates(
  satellites: SatelliteState[],
  activeBeamsBySat: Record<string, string[]>,
  energyBlockedSats: string[],
  cells: HexCell[],
): CellState[] {
  const blockedSet = new Set(energyBlockedSats);
  const beamRadiusWu = CELL_RADIUS_WU * 1.5;

  // Per-cell: { reuseGroups: Set<number>, hasNonBlocked: boolean }
  const cellCoverage: Array<{ groups: Set<number>; hasNonBlocked: boolean }> = cells.map(() => ({
    groups: new Set<number>(),
    hasNonBlocked: false,
  }));

  for (const sat of satellites) {
    if (!sat.isVisible || sat.elevationDeg < 5) continue;
    const activeBeamIds = activeBeamsBySat[sat.id];
    if (!activeBeamIds || activeBeamIds.length === 0) continue;
    if (!sat.beams) continue;

    const isBlocked = blockedSet.has(sat.id);
    const satDomePos = projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION);
    const kmToWorld = DEFAULT_SKY_PROJECTION.horizontalRadius / Math.max(sat.rangeKm, 100);

    for (const beam of sat.beams) {
      if (!activeBeamIds.includes(beam.beamId)) continue;
      const beamGroundX = satDomePos[0] + beam.offsetEastKm * kmToWorld;
      const beamGroundZ = satDomePos[2] - beam.offsetNorthKm * kmToWorld;

      for (let i = 0; i < cells.length; i++) {
        const dx = cells[i].cx - beamGroundX;
        const dz = cells[i].cz - beamGroundZ;
        if (Math.sqrt(dx * dx + dz * dz) < beamRadiusWu) {
          cellCoverage[i].groups.add(beam.reuseGroup);
          if (!isBlocked) cellCoverage[i].hasNonBlocked = true;
        }
      }
    }
  }

  return cells.map((_, i) => {
    const { groups, hasNonBlocked } = cellCoverage[i];
    if (groups.size === 0) return 'unserved';
    if (!hasNonBlocked) return 'energyBlocked';
    if (groups.size >= 2) return 'interfered';
    return 'served';
  });
}

// ---------------------------------------------------------------------------
// Single cell component
// ---------------------------------------------------------------------------

const HexCellMesh = React.memo(function HexCellMesh({
  cell,
  state,
}: {
  cell: HexCell;
  state: CellState;
}) {
  const fillGeo = useMemo(
    () => createHexFill(cell.cx, cell.cz, CELL_RADIUS_WU * 0.95),
    [cell.cx, cell.cz],
  );
  const borderGeo = useMemo(
    () => createHexBorder(cell.cx, cell.cz, CELL_RADIUS_WU),
    [cell.cx, cell.cz],
  );

  const c = COLORS[state];

  return (
    <group>
      <mesh geometry={fillGeo}>
        <meshBasicMaterial
          color={c.fill}
          transparent
          opacity={c.fillOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineLoop geometry={borderGeo}>
        <lineBasicMaterial
          color={c.border}
          transparent
          opacity={c.borderOpacity}
        />
      </lineLoop>
    </group>
  );
});

// ---------------------------------------------------------------------------
// Main layer
// ---------------------------------------------------------------------------

export interface EarthFixedCellLayerProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
}

export const EarthFixedCellLayer = React.memo(function EarthFixedCellLayer({
  snapshot,
  visible = true,
}: EarthFixedCellLayerProps) {
  if (!snapshot || !visible) return null;

  // Only render for BH snapshots (bhSlot present)
  const bhSlot = snapshot.bhSlot;
  if (!bhSlot) return null;

  // Generate fixed cell grid (stable reference — same every render)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const cells = useMemo(() => generateHexGrid(), []);

  // Compute 4-state coverage from BH slot truth + energy-block info
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const cellStates = useMemo(
    () => computeCellStates(
      snapshot.satellites,
      bhSlot.activeBeamsBySat,
      bhSlot.energyBlockedSats,
      cells,
    ),
    [snapshot.satellites, bhSlot.activeBeamsBySat, bhSlot.energyBlockedSats, cells],
  );

  return (
    <group name="earth-fixed-cell-layer">
      {cells.map((cell, i) => (
        <HexCellMesh
          key={`${cell.cx.toFixed(0)},${cell.cz.toFixed(0)}`}
          cell={cell}
          state={cellStates[i]}
        />
      ))}
    </group>
  );
});
