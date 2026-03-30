/**
 * EarthFixedCellLayer — earth-fixed hexagonal cell grid for BH profiles.
 *
 * Renders a fixed hex grid on the ground plane. Cells remain stationary
 * while satellites move overhead. Active BH beams illuminate covered cells.
 *
 * Five cell states:
 *   served         — active beam covers cell, no FRF collision       (blue)
 *   interfered     — covered by ≥2 beams from different FRF groups   (yellow)
 *   energyBlocked  — covered only by energy-depleted satellites      (orange)
 *   inactiveBeam   — only inactive/non-scheduled beams cover cell    (violet)
 *   noCoverage     — no beam geometry covers the cell                (dark gray)
 *
 * VISUAL-ONLY: Does NOT affect physics, SINR, or KPI.
 */

import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import { usePublishValidationSection } from '@/viz/validation/store';
import type { BhCellState, HexCell } from './bh-cell-analysis';
import {
  CELL_RADIUS_WU,
  analyzeBhCells,
  createHexBorderGeometry,
  createHexFillGeometry,
  generateHexGrid,
} from './bh-cell-analysis';
import { selectCellCandidateSatIds } from './beam-selection';

const CELL_COLORS = {
  served:        { fill: '#44aaff', border: '#66ccff', fillOpacity: 0.35, borderOpacity: 0.8 },
  interfered:    { fill: '#ffdd00', border: '#ffee44', fillOpacity: 0.40, borderOpacity: 0.9 },
  energyBlocked: { fill: '#ff7700', border: '#ffaa44', fillOpacity: 0.35, borderOpacity: 0.8 },
  inactiveBeam:  { fill: '#7a5cff', border: '#b397ff', fillOpacity: 0.24, borderOpacity: 0.72 },
  noCoverage:    { fill: '#222233', border: '#334455', fillOpacity: 0.10, borderOpacity: 0.3 },
} as const;

function cellPalette(state: BhCellState) {
  const c = CELL_COLORS[state];
  return {
    fill: c.fill,
    border: c.border,
    fillOpacity: c.fillOpacity,
    borderOpacity: c.borderOpacity,
    borderWidth: state === 'served' || state === 'interfered' ? 4 : 2.5,
    dashed: state !== 'served' && state !== 'interfered',
  };
}

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
  const fillGeo = useMemo(() => {
    const { positions, indices } = createHexFillGeometry(cell.cx, cell.cz, CELL_RADIUS_WU * 0.95);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    return geo;
  }, [cell.cx, cell.cz]);

  const borderGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(createHexBorderGeometry(cell.cx, cell.cz, CELL_RADIUS_WU), 3),
    );
    return geo;
  }, [cell.cx, cell.cz]);

  const p = cellPalette(state);

  return (
    <group>
      <mesh geometry={fillGeo}>
        <meshBasicMaterial
          color={p.fill}
          transparent
          opacity={p.fillOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <Line
        points={(() => {
          const positions = borderGeo.getAttribute('position');
          const pts: [number, number, number][] = [];
          for (let i = 0; i < positions.count; i++) {
            pts.push([positions.getX(i), positions.getY(i), positions.getZ(i)]);
          }
          return pts;
        })()}
        color={p.border}
        lineWidth={p.borderWidth}
        transparent
        opacity={p.borderOpacity}
        dashed={p.dashed}
        dashSize={12}
        gapSize={6}
        depthWrite={false}
      />
    </group>
  );
});

// ---------------------------------------------------------------------------
// Main layer
// ---------------------------------------------------------------------------

export interface EarthFixedCellLayerProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
  showLabels?: boolean;
}

export const EarthFixedCellLayer = React.memo(function EarthFixedCellLayer({
  snapshot,
  visible = true,
}: EarthFixedCellLayerProps) {
  const bhSlot = snapshot?.bhSlot;
  const observedStateCountsRef = React.useRef({
    served: 0, interfered: 0, energyBlocked: 0, inactiveBeam: 0, noCoverage: 0,
  });

  const cells = useMemo(() => generateHexGrid(), []);

  const analysis = useMemo(() => {
    if (!snapshot || !visible || !bhSlot) return null;
    return analyzeBhCells(snapshot, cells, selectCellCandidateSatIds(snapshot));
  }, [bhSlot, cells, snapshot, visible]);

  const cellStates = analysis?.cellStates ?? [];

  const validationSummary = useMemo(() => {
    const currentCounts = analysis?.stateCounts ?? {
      served: 0, interfered: 0, energyBlocked: 0, inactiveBeam: 0, noCoverage: 0,
    };
    const observed = observedStateCountsRef.current;
    observed.served = Math.max(observed.served, currentCounts.served);
    observed.interfered = Math.max(observed.interfered, currentCounts.interfered);
    observed.energyBlocked = Math.max(observed.energyBlocked, currentCounts.energyBlocked);
    observed.inactiveBeam = Math.max(observed.inactiveBeam, currentCounts.inactiveBeam);
    observed.noCoverage = Math.max(observed.noCoverage, currentCounts.noCoverage);

    return {
      present: Boolean(snapshot && visible && bhSlot),
      cellCount: cells.length,
      stateCounts: currentCounts,
      observedStateCounts: { ...observed },
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
