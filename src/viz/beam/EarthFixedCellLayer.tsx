/**
 * EarthFixedCellLayer — earth-fixed hexagonal cell grid for BH profiles.
 *
 * Renders a fixed hex grid on the ground plane. Cells remain stationary
 * while satellites move overhead. Active BH beams illuminate covered cells.
 *
 * Five cell states (5V-4 + explainability split):
 *   served         — active beam covers cell, no FRF collision       (blue)
 *   interfered     — covered by ≥2 beams from different FRF groups   (yellow)
 *   energyBlocked  — covered only by energy-depleted satellites      (orange)
 *   inactiveBeam   — only inactive/non-scheduled beams cover cell    (violet)
 *   noCoverage     — no beam geometry covers the cell                (dark gray)
 *
 * Donor pattern: leo-simulator/src/features/beam-hopping/components/EarthFixedCells.tsx
 *
 * VISUAL-ONLY: Does NOT affect physics, SINR, or KPI.
 *
 * @see sdd/ntn-sim-core-frontend-beam-visual-sdd.md §6.2, §12.3
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SimulationSnapshot } from '@/core/common/types';
import { usePublishValidationSection } from '@/viz/validation/store';
import type { BhCellState, HexCell } from './bh-cell-analysis';
import {
  CELL_RADIUS_WU,
  analyzeBhCells,
  createHexBorderGeometry,
  createHexFillGeometry,
  generateHexGrid,
} from './bh-cell-analysis';

// ---------------------------------------------------------------------------
// VISUAL-ONLY constants
// ---------------------------------------------------------------------------

/** VISUAL-ONLY: Cell state colors (5V-4 — 4 distinct states). */
const COLORS = {
  served:        { fill: '#44aaff', border: '#66ccff', fillOpacity: 0.35, borderOpacity: 0.8 },
  interfered:    { fill: '#ffdd00', border: '#ffee44', fillOpacity: 0.40, borderOpacity: 0.9 },
  energyBlocked: { fill: '#ff7700', border: '#ffaa44', fillOpacity: 0.35, borderOpacity: 0.8 },
  inactiveBeam:  { fill: '#7a5cff', border: '#b397ff', fillOpacity: 0.24, borderOpacity: 0.72 },
  noCoverage:    { fill: '#222233', border: '#334455', fillOpacity: 0.10, borderOpacity: 0.3 },
} as const;

// ---------------------------------------------------------------------------
// Single cell component
// ---------------------------------------------------------------------------

const HexCellMesh = React.memo(function HexCellMesh({
  cell,
  state,
}: {
  cell: HexCell;
  state: BhCellState;
}) {
  const fillGeo = useMemo(
    () => {
      const { positions, indices } = createHexFillGeometry(cell.cx, cell.cz, CELL_RADIUS_WU * 0.95);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      return geo;
    },
    [cell.cx, cell.cz],
  );
  const borderGeo = useMemo(
    () => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(createHexBorderGeometry(cell.cx, cell.cz, CELL_RADIUS_WU), 3),
      );
      return geo;
    },
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
  const bhSlot = snapshot?.bhSlot;
  const observedStateCountsRef = React.useRef({
    served: 0,
    interfered: 0,
    energyBlocked: 0,
    inactiveBeam: 0,
    noCoverage: 0,
  });

  // Generate fixed cell grid (stable reference — same every render)
  const cells = useMemo(() => generateHexGrid(), []);

  const analysis = useMemo(
    () => (snapshot && visible && bhSlot ? analyzeBhCells(snapshot, cells) : null),
    [bhSlot, cells, snapshot, visible],
  );
  const cellStates = analysis?.cellStates ?? [];

  const validationSummary = useMemo(() => {
    const currentCounts = analysis?.stateCounts ?? {
      served: 0,
      interfered: 0,
      energyBlocked: 0,
      inactiveBeam: 0,
      noCoverage: 0,
    };
    const observedCounts = observedStateCountsRef.current;
    observedCounts.served = Math.max(observedCounts.served, currentCounts.served);
    observedCounts.interfered = Math.max(observedCounts.interfered, currentCounts.interfered);
    observedCounts.energyBlocked = Math.max(observedCounts.energyBlocked, currentCounts.energyBlocked);
    observedCounts.inactiveBeam = Math.max(observedCounts.inactiveBeam, currentCounts.inactiveBeam);
    observedCounts.noCoverage = Math.max(observedCounts.noCoverage, currentCounts.noCoverage);

    return {
      present: Boolean(snapshot && visible && bhSlot),
      cellCount: cells.length,
      stateCounts: currentCounts,
      observedStateCounts: { ...observedCounts },
    };
  }, [analysis, bhSlot, cells.length, snapshot, visible]);

  usePublishValidationSection('earthFixedCellLayer', validationSummary);

  if (!snapshot || !visible || !bhSlot) return null;

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
