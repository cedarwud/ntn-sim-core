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
import { Cone, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { SatelliteState, SimulationSnapshot } from '@/core/common/types';
import { usePublishValidationSection } from '@/viz/validation/store';
import type { BhCellState, HexCell } from './bh-cell-analysis';
import {
  CELL_RADIUS_WU,
  GROUND_Y,
  analyzeBhCells,
  createHexBorderGeometry,
  createHexFillGeometry,
  generateHexGrid,
} from './bh-cell-analysis';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from '@/viz/satellite/observer-sky-projection';

// ---------------------------------------------------------------------------
// VISUAL-ONLY constants
// ---------------------------------------------------------------------------

/** VISUAL-ONLY: default research palette. */
const DEFAULT_COLORS = {
  served:        { fill: '#44aaff', border: '#66ccff', fillOpacity: 0.35, borderOpacity: 0.8 },
  interfered:    { fill: '#ffdd00', border: '#ffee44', fillOpacity: 0.40, borderOpacity: 0.9 },
  energyBlocked: { fill: '#ff7700', border: '#ffaa44', fillOpacity: 0.35, borderOpacity: 0.8 },
  inactiveBeam:  { fill: '#7a5cff', border: '#b397ff', fillOpacity: 0.24, borderOpacity: 0.72 },
  noCoverage:    { fill: '#222233', border: '#334455', fillOpacity: 0.10, borderOpacity: 0.3 },
} as const;

type CellPalette = {
  fill: string;
  border: string;
  fillOpacity: number;
  borderOpacity: number;
  borderWidth: number;
  dashed: boolean;
  labelColor: string;
};

interface BhParityBeamAssignment {
  satId: string;
  beamId: string;
  satPosition: [number, number, number];
  cellIndex: number;
  cell: HexCell;
  state: BhCellState;
  color: string;
}

function baseBeamColor(beamId: string): string {
  const match = /-b(\d+)$/.exec(beamId);
  const beamIndex = match ? Number(match[1]) : 0;
  return beamIndex % 2 === 1 ? '#ff8844' : '#44aaff';
}

function parityCellPalette(
  state: BhCellState,
  assignment: BhParityBeamAssignment | null,
): CellPalette {
  const beamColor = assignment?.color ?? '#44aaff';
  switch (state) {
    case 'served':
      return {
        fill: beamColor,
        border: beamColor,
        fillOpacity: 0.5,
        borderOpacity: 1,
        borderWidth: 4,
        dashed: false,
        labelColor: '#ffffff',
      };
    case 'interfered':
      return {
        fill: '#ff3333',
        border: '#ff7777',
        fillOpacity: 0.62,
        borderOpacity: 1,
        borderWidth: 4,
        dashed: false,
        labelColor: '#ffe6e6',
      };
    case 'energyBlocked':
      return {
        fill: '#ff7700',
        border: '#ffaa44',
        fillOpacity: 0.38,
        borderOpacity: 0.92,
        borderWidth: 3.4,
        dashed: true,
        labelColor: '#ffe9d6',
      };
    case 'inactiveBeam':
      return {
        fill: '#7a5cff',
        border: '#b397ff',
        fillOpacity: 0.26,
        borderOpacity: 0.8,
        borderWidth: 2.8,
        dashed: true,
        labelColor: '#ece3ff',
      };
    case 'noCoverage':
    default:
      return {
        fill: '#aaaaaa',
        border: '#aaccff',
        fillOpacity: 0.18,
        borderOpacity: 0.7,
        borderWidth: 2.5,
        dashed: true,
        labelColor: '#aaccff',
      };
  }
}

function defaultCellPalette(state: BhCellState): CellPalette {
  const c = DEFAULT_COLORS[state];
  return {
    fill: c.fill,
    border: c.border,
    fillOpacity: c.fillOpacity,
    borderOpacity: c.borderOpacity,
    borderWidth: state === 'served' || state === 'interfered' ? 4 : 2.5,
    dashed: state !== 'served' && state !== 'interfered',
    labelColor: state === 'served' ? '#ffffff' : '#aaccff',
  };
}

function beamGroundPosition(
  sat: SatelliteState,
  offsetEastKm: number,
  offsetNorthKm: number,
): { x: number; z: number; satPosition: [number, number, number] } {
  const satDomePos = projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION);
  const kmToWorld = DEFAULT_SKY_PROJECTION.horizontalRadius / Math.max(sat.rangeKm, 100);
  return {
    x: satDomePos[0] + offsetEastKm * kmToWorld,
    z: satDomePos[2] - offsetNorthKm * kmToWorld,
    satPosition: [satDomePos[0], satDomePos[1], satDomePos[2]],
  };
}

function cellStatePriority(state: BhCellState): number {
  switch (state) {
    case 'served':
      return 0;
    case 'interfered':
      return 1;
    case 'energyBlocked':
      return 2;
    case 'inactiveBeam':
      return 3;
    case 'noCoverage':
    default:
      return 4;
  }
}

function buildParityAssignments(
  snapshot: SimulationSnapshot | null,
  cells: HexCell[],
  cellStates: BhCellState[],
): BhParityBeamAssignment[] {
  if (!snapshot?.bhSlot) return [];

  const beamRadiusWu = CELL_RADIUS_WU * 1.5;
  const assignments: BhParityBeamAssignment[] = [];

  for (const sat of snapshot.satellites) {
    if (!sat.isVisible || sat.elevationDeg < 5 || !sat.beams?.length) continue;
    const activeBeamIds = new Set(snapshot.bhSlot.activeBeamsBySat[sat.id] ?? []);
    if (activeBeamIds.size === 0) continue;

    for (const beam of sat.beams) {
      if (!activeBeamIds.has(beam.beamId)) continue;
      const ground = beamGroundPosition(sat, beam.offsetEastKm, beam.offsetNorthKm);

      let bestIndex = -1;
      let bestScore = Number.POSITIVE_INFINITY;

      for (let i = 0; i < cells.length; i++) {
        const dx = cells[i].cx - ground.x;
        const dz = cells[i].cz - ground.z;
        const distSq = dx * dx + dz * dz;
        if (distSq >= beamRadiusWu * beamRadiusWu) continue;

        const priority = cellStatePriority(cellStates[i] ?? 'noCoverage');
        const score = priority * 1_000_000 + distSq;
        if (score < bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      if (bestIndex < 0) continue;

      assignments.push({
        satId: sat.id,
        beamId: beam.beamId,
        satPosition: ground.satPosition,
        cellIndex: bestIndex,
        cell: cells[bestIndex],
        state: cellStates[bestIndex] ?? 'noCoverage',
        color: baseBeamColor(beam.beamId),
      });
    }
  }

  return assignments;
}

// ---------------------------------------------------------------------------
// Single cell component
// ---------------------------------------------------------------------------

const HexCellMesh = React.memo(function HexCellMesh({
  cellIndex,
  cell,
  state,
  parityMode,
  showLabels,
  assignment,
}: {
  cellIndex: number;
  cell: HexCell;
  state: BhCellState;
  parityMode: boolean;
  showLabels: boolean;
  assignment: BhParityBeamAssignment | null;
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

  const palette = parityMode ? parityCellPalette(state, assignment) : defaultCellPalette(state);
  const labelText = assignment ? `B${assignment.beamId.replace(/^.*-b/, '')}` : `C${cellIndex + 1}`;

  return (
    <group>
      <mesh geometry={fillGeo}>
        <meshBasicMaterial
          color={palette.fill}
          transparent
          opacity={palette.fillOpacity}
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
            pts.push([
              positions.getX(i),
              positions.getY(i),
              positions.getZ(i),
            ]);
          }
          return pts;
        })()}
        color={palette.border}
        lineWidth={palette.borderWidth}
        transparent
        opacity={palette.borderOpacity}
        dashed={palette.dashed}
        dashSize={12}
        gapSize={6}
        depthWrite={false}
      />
      {parityMode && showLabels && state !== 'noCoverage' && (
        <Text
          position={[cell.cx, GROUND_Y + 8, cell.cz]}
          fontSize={9}
          color={palette.labelColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={1}
          outlineColor="#000000"
        >
          {labelText}
        </Text>
      )}
    </group>
  );
});

const ParityBhBeamLink = React.memo(function ParityBhBeamLink({
  assignment,
  showLabels,
}: {
  assignment: BhParityBeamAssignment;
  showLabels: boolean;
}) {
  const beamParams = useMemo(() => {
    const satPos = new THREE.Vector3(...assignment.satPosition);
    const cellPos = new THREE.Vector3(assignment.cell.cx, GROUND_Y, assignment.cell.cz);
    const distance = satPos.distanceTo(cellPos);
    const direction = satPos.clone().sub(cellPos).normalize();
    const midPoint = satPos.clone().add(cellPos).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    return {
      distance,
      midPoint,
      rotation: new THREE.Euler().setFromQuaternion(quaternion),
    };
  }, [assignment.cell.cx, assignment.cell.cz, assignment.satPosition]);

  const color =
    assignment.state === 'interfered'
      ? '#ff3333'
      : assignment.state === 'energyBlocked'
        ? '#ff8800'
        : assignment.color;
  const isPrimary = assignment.state === 'served';
  const opacity =
    assignment.state === 'served'
      ? 0.34
      : assignment.state === 'interfered'
        ? 0.2
        : 0.14;
  const lineOpacity =
    assignment.state === 'served'
      ? 0.95
      : assignment.state === 'interfered'
        ? 0.82
        : 0.6;
  const label = `B${assignment.beamId.replace(/^.*-b/, '')}${assignment.state === 'energyBlocked' ? ' blocked' : ''}`;

  return (
    <group>
      <Cone
        args={[CELL_RADIUS_WU * 0.65, beamParams.distance, 8, 1, true]}
        position={[beamParams.midPoint.x, beamParams.midPoint.y, beamParams.midPoint.z]}
        rotation={[beamParams.rotation.x, beamParams.rotation.y, beamParams.rotation.z]}
      >
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Cone>
      <Line
        points={[
          assignment.satPosition,
          [assignment.cell.cx, GROUND_Y + 2, assignment.cell.cz],
        ]}
        color={color}
        lineWidth={isPrimary ? 4 : 2.5}
        transparent
        opacity={lineOpacity}
        dashed={!isPrimary}
        dashSize={15}
        gapSize={10}
      />
      {showLabels && (
        <Text
          position={[beamParams.midPoint.x, beamParams.midPoint.y + 14, beamParams.midPoint.z]}
          fontSize={isPrimary ? 12 : 9}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={isPrimary ? 2 : 1.2}
          outlineColor={isPrimary ? '#ffffff' : '#000000'}
        >
          {label}
        </Text>
      )}
    </group>
  );
});

// ---------------------------------------------------------------------------
// Main layer
// ---------------------------------------------------------------------------

export interface EarthFixedCellLayerProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
  parityMode?: boolean;
  showLabels?: boolean;
}

export const EarthFixedCellLayer = React.memo(function EarthFixedCellLayer({
  snapshot,
  visible = true,
  parityMode = false,
  showLabels = true,
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
  const parityAssignments = useMemo(
    () => (parityMode ? buildParityAssignments(snapshot, cells, cellStates) : []),
    [cells, cellStates, parityMode, snapshot],
  );
  const assignmentByCellIndex = useMemo(() => {
    const next = new Map<number, BhParityBeamAssignment>();
    for (const assignment of parityAssignments) {
      const current = next.get(assignment.cellIndex);
      if (!current || cellStatePriority(assignment.state) < cellStatePriority(current.state)) {
        next.set(assignment.cellIndex, assignment);
      }
    }
    return next;
  }, [parityAssignments]);

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
      parityMode,
      parityBeamLinkCount: parityAssignments.length,
    };
  }, [analysis, bhSlot, cells.length, parityAssignments.length, parityMode, snapshot, visible]);

  usePublishValidationSection('earthFixedCellLayer', validationSummary);

  if (!snapshot || !visible || !bhSlot) return null;

  return (
    <group name="earth-fixed-cell-layer">
      {parityMode &&
        parityAssignments.map((assignment) => (
          <ParityBhBeamLink
            key={`${assignment.satId}-${assignment.beamId}-${assignment.cellIndex}`}
            assignment={assignment}
            showLabels={showLabels}
          />
        ))}
      {cells.map((cell, i) => (
        <HexCellMesh
          key={`${cell.cx.toFixed(0)},${cell.cz.toFixed(0)}`}
          cellIndex={i}
          cell={cell}
          state={cellStates[i]}
          parityMode={parityMode}
          showLabels={showLabels}
          assignment={assignmentByCellIndex.get(i) ?? null}
        />
      ))}
    </group>
  );
});
