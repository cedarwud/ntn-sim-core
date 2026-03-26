/**
 * Shared BH cell analysis for earth-fixed visualization and explainability.
 *
 * VISUAL-ONLY / TRUTH-DRIVEN:
 *   - reads snapshot.satellites + snapshot.bhSlot truth only
 *   - does not affect scheduler, SINR, or KPI results
 *
 * Governance:
 *   - SDD: frontend-beam-visual-sdd.md §6.2, §12.3
 *   - Validation: VAL-FV-004, VAL-EXP-001
 */

import type { SimulationSnapshot, SatelliteState } from '@/core/common/types';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from '@/viz/satellite/observer-sky-projection';

export const GRID_RADIUS_WU = 280;
export const CELL_RADIUS_WU = 45;
export const HEX_SPACING_WU = CELL_RADIUS_WU * 1.732;
export const GROUND_Y = 0.8;
const HEX_SEGS = 6;
const MIN_ELEVATION_DEG = 5;

export interface HexCell {
  cx: number;
  cz: number;
  reuseGroup: number;
}

export type BhCellState =
  | 'served'
  | 'interfered'
  | 'energyBlocked'
  | 'inactiveBeam'
  | 'noCoverage';

export interface BhCellStateCounts {
  served: number;
  interfered: number;
  energyBlocked: number;
  inactiveBeam: number;
  noCoverage: number;
}

export interface BhCellAnalysis {
  cells: HexCell[];
  cellStates: BhCellState[];
  stateCounts: BhCellStateCounts;
}

export function generateHexGrid(): HexCell[] {
  const cells: HexCell[] = [];
  const cols = Math.ceil(GRID_RADIUS_WU / HEX_SPACING_WU);
  const rows = Math.ceil(GRID_RADIUS_WU / (CELL_RADIUS_WU * 1.5));

  for (let row = -rows; row <= rows; row++) {
    for (let col = -cols; col <= cols; col++) {
      const cx = col * HEX_SPACING_WU + (row % 2 !== 0 ? HEX_SPACING_WU * 0.5 : 0);
      const cz = row * CELL_RADIUS_WU * 1.5;
      if (Math.sqrt(cx * cx + cz * cz) > GRID_RADIUS_WU) continue;
      const reuseGroup = ((col + row * 2) % 3 + 3) % 3;
      cells.push({ cx, cz, reuseGroup });
    }
  }

  return cells;
}

function createEmptyCounts(): BhCellStateCounts {
  return {
    served: 0,
    interfered: 0,
    energyBlocked: 0,
    inactiveBeam: 0,
    noCoverage: 0,
  };
}

function beamGroundPosition(
  sat: SatelliteState,
  offsetEastKm: number,
  offsetNorthKm: number,
): { x: number; z: number } {
  const satDomePos = projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION);
  const kmToWorld = DEFAULT_SKY_PROJECTION.horizontalRadius / Math.max(sat.rangeKm, 100);
  return {
    x: satDomePos[0] + offsetEastKm * kmToWorld,
    z: satDomePos[2] - offsetNorthKm * kmToWorld,
  };
}

interface CellCoverage {
  activeGroups: Set<number>;
  hasActiveNonBlocked: boolean;
  hasInactiveCandidate: boolean;
}

export function analyzeBhCells(
  snapshot: SimulationSnapshot | null,
  cells: HexCell[],
  relevantSatIds?: Set<string>,
): BhCellAnalysis {
  if (!snapshot?.bhSlot) {
    return {
      cells,
      cellStates: [],
      stateCounts: createEmptyCounts(),
    };
  }

  const { bhSlot } = snapshot;
  const blockedSet = new Set(bhSlot.energyBlockedSats);
  const beamRadiusWu = CELL_RADIUS_WU * 1.5;
  const coverage: CellCoverage[] = cells.map(() => ({
    activeGroups: new Set<number>(),
    hasActiveNonBlocked: false,
    hasInactiveCandidate: false,
  }));

  for (const sat of snapshot.satellites) {
    if (!sat.isVisible || sat.elevationDeg < MIN_ELEVATION_DEG || !sat.beams || sat.beams.length === 0) {
      continue;
    }
    if (relevantSatIds && !relevantSatIds.has(sat.id)) continue;

    const isBlocked = blockedSet.has(sat.id);
    const activeBeamIds = new Set(bhSlot.activeBeamsBySat[sat.id] ?? []);

    for (const beam of sat.beams) {
      const { x, z } = beamGroundPosition(sat, beam.offsetEastKm, beam.offsetNorthKm);
      const isActive = activeBeamIds.has(beam.beamId);

      for (let i = 0; i < cells.length; i++) {
        const dx = cells[i].cx - x;
        const dz = cells[i].cz - z;
        if (Math.sqrt(dx * dx + dz * dz) >= beamRadiusWu) continue;

        if (isActive) {
          coverage[i].activeGroups.add(beam.reuseGroup);
          if (!isBlocked) {
            coverage[i].hasActiveNonBlocked = true;
          }
        } else if (!isBlocked) {
          coverage[i].hasInactiveCandidate = true;
        }
      }
    }
  }

  const stateCounts = createEmptyCounts();
  const cellStates = cells.map((_, index) => {
    const cell = coverage[index];

    let state: BhCellState;
    if (cell.activeGroups.size === 0) {
      state = cell.hasInactiveCandidate ? 'inactiveBeam' : 'noCoverage';
    } else if (!cell.hasActiveNonBlocked) {
      state = 'energyBlocked';
    } else if (cell.activeGroups.size >= 2) {
      state = 'interfered';
    } else {
      state = 'served';
    }

    stateCounts[state] += 1;
    return state;
  });

  return {
    cells,
    cellStates,
    stateCounts,
  };
}

export function createHexFillGeometry(cx: number, cz: number, radius: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  positions.push(cx, GROUND_Y, cz);
  for (let i = 0; i < HEX_SEGS; i++) {
    const angle = (i / HEX_SEGS) * Math.PI * 2 + Math.PI / 6;
    positions.push(cx + Math.cos(angle) * radius, GROUND_Y, cz + Math.sin(angle) * radius);
  }
  for (let i = 0; i < HEX_SEGS; i++) {
    indices.push(0, i + 1, ((i + 1) % HEX_SEGS) + 1);
  }
  return { positions, indices };
}

export function createHexBorderGeometry(cx: number, cz: number, radius: number) {
  const positions: number[] = [];
  for (let i = 0; i <= HEX_SEGS; i++) {
    const angle = (i / HEX_SEGS) * Math.PI * 2 + Math.PI / 6;
    positions.push(cx + Math.cos(angle) * radius, GROUND_Y + 0.1, cz + Math.sin(angle) * radius);
  }
  return positions;
}
