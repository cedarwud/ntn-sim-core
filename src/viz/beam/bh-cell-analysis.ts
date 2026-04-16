/**
 * Shared BH cell analysis for earth-fixed visualization and explainability.
 *
 * VISUAL-ONLY / TRUTH-DRIVEN:
 *   - reads snapshot.satellites + snapshot.bhSlot truth
 *   - may constrain analysis to the shared presentation-frame beam picks
 *   - does not affect scheduler, SINR, or KPI results
 *
 * Governance:
 *   - SDD: frontend-beam-visual-sdd.md §6.2, §12.3
 *   - Validation: VAL-FV-004, VAL-EXP-001
 */

import type { SimulationSnapshot, SatelliteState, SatelliteBeamSnapshot } from '@/core/contracts/runtime-v1';
import {
  computeMovingBeamGroundTarget,
  resolveMovingBeamProjection,
} from './moving-beam-geometry';

export const GRID_RADIUS_WU = 280;
export const CELL_RADIUS_WU = 45;
/** Beam footprint radius for coverage analysis. Independent from hex cell sizing. */
export const BEAM_FOOTPRINT_RADIUS_WU = 45;
export const HEX_SPACING_WU = CELL_RADIUS_WU * 1.732;
export const GROUND_Y = 0.8;
const HEX_SEGS = 6;
const MIN_ELEVATION_DEG = 5;

export interface HexCell {
  cx: number;
  cz: number;
  reuseGroup: number;
}

/** HexCell extended with a stable beam identity for satellite-relative grids. */
export interface SatRelativeHexCell extends HexCell {
  beamId: string;
  beamIndex: number;
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

/**
 * Compute km-to-world-unit scaling for beam ground positions.
 * Uses BEAM_FOOTPRINT_RADIUS_WU so beam positions scale with footprint, not cell grid.
 *   kmToWorld = BEAM_FOOTPRINT_RADIUS_WU / footprintRadiusKm
 */
function beamKmToWorld(beams: readonly { offsetEastKm: number; offsetNorthKm: number }[]): number {
  const beamSpacingKm = beams
    .map((b) => Math.hypot(b.offsetEastKm, b.offsetNorthKm))
    .filter((d) => d > 1e-6)
    .sort((a, b) => a - b)[0];
  const footprintRadiusKm = beamSpacingKm ? beamSpacingKm / Math.sqrt(3) : 25;
  return BEAM_FOOTPRINT_RADIUS_WU / footprintRadiusKm;
}

/**
 * Observer-relative beam footprint position on the fixed earth cell grid.
 *
 * The hex cells are fixed at the observer. For steerable-beam satellites, every
 * beam can point at any of the fixed earth cells regardless of where the satellite
 * is in the sky. Using only the beam's ENU offset (not satDomePos) keeps beam
 * positions consistent with the fixed cell grid and with sky cone ground targets.
 */
function beamGroundPosition(
  offsetEastKm: number,
  offsetNorthKm: number,
  kmToWorld: number,
): { x: number; z: number } {
  return {
    x: offsetEastKm * kmToWorld,
    z: -offsetNorthKm * kmToWorld,
  };
}

interface CellCoverage {
  activeGroups: Set<number>;
  hasActiveNonBlocked: boolean;
  hasInactiveCandidate: boolean;
}

export interface BhCellAnalysisOptions {
  relevantSatIds?: ReadonlySet<string>;
  analyzedBeamIdsBySatId?: Record<string, readonly string[]>;
}

export function analyzeBhCells(
  snapshot: SimulationSnapshot | null,
  cells: HexCell[],
  options?: BhCellAnalysisOptions,
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
  // Beam footprint radius for coverage analysis (independent from hex cell visual sizing).
  const beamRadiusWu = BEAM_FOOTPRINT_RADIUS_WU;
  const coverage: CellCoverage[] = cells.map(() => ({
    activeGroups: new Set<number>(),
    hasActiveNonBlocked: false,
    hasInactiveCandidate: false,
  }));

  for (const sat of snapshot.satellites) {
    if (!sat.isVisible || sat.elevationDeg < MIN_ELEVATION_DEG || !sat.beams || sat.beams.length === 0) {
      continue;
    }
    if (options?.relevantSatIds && !options.relevantSatIds.has(sat.id)) continue;

    const selectedBeamIds = options?.analyzedBeamIdsBySatId?.[sat.id];
    const beams = selectedBeamIds
      ? sat.beams.filter((beam) => selectedBeamIds.includes(beam.beamId))
      : sat.beams;
    if (beams.length === 0) continue;

    const isBlocked = blockedSet.has(sat.id);
    const activeBeamIds = new Set(bhSlot.activeBeamsBySat[sat.id] ?? []);
    const kmToWorld = beamKmToWorld(beams);

    for (const beam of beams) {
      const { x, z } = beamGroundPosition(beam.offsetEastKm, beam.offsetNorthKm, kmToWorld);
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

// ---------------------------------------------------------------------------
// Satellite-relative hex grid
// ---------------------------------------------------------------------------

/**
 * Generate hex cells positioned at each beam's ground-projection point.
 *
 * Hex cell placement is derived from beam offsets but the cell radius (CELL_RADIUS_WU)
 * is independent from the beam coverage radius (BEAM_FOOTPRINT_RADIUS_WU).
 * Uses the same truth-driven ground target projection as EarthMovingBeamLayer,
 * so BH analysis never re-centers serving or prepared beams back to the UE.
 */
export function generateSatRelativeHexCells(
  sat: SatelliteState,
  beams: readonly SatelliteBeamSnapshot[],
): SatRelativeHexCell[] {
  const projection = resolveMovingBeamProjection(sat, beams);

  return beams.map((beam, i) => {
    const target = computeMovingBeamGroundTarget(projection, beam, false);
    return {
      cx: target.groundX,
      cz: target.groundZ,
      reuseGroup: beam.reuseGroup,
      beamId: beam.beamId,
      beamIndex: i,
    };
  });
}

/**
 * Determine each cell's state based on the BH scheduler's active beam set.
 *
 * Because cells are satellite-relative (one cell per beam), coverage is trivial:
 * a cell is served iff its beam is in the active set. No radius check needed.
 */
export function analyzeSatRelativeCells(
  snapshot: SimulationSnapshot,
  cells: SatRelativeHexCell[],
  sat: SatelliteState,
): BhCellAnalysis {
  const { bhSlot } = snapshot;
  if (!bhSlot || cells.length === 0) {
    return { cells, cellStates: [], stateCounts: createEmptyCounts() };
  }

  const activeBeamIds = new Set(bhSlot.activeBeamsBySat[sat.id] ?? []);
  const isBlocked = (bhSlot.energyBlockedSats ?? []).includes(sat.id);
  const isVisible = sat.isVisible && sat.elevationDeg >= MIN_ELEVATION_DEG;

  // Detect intra-slot FRF collision: two active beams sharing a reuse group
  const activeGroupCounts = new Map<number, number>();
  for (const cell of cells) {
    if (activeBeamIds.has(cell.beamId)) {
      activeGroupCounts.set(cell.reuseGroup, (activeGroupCounts.get(cell.reuseGroup) ?? 0) + 1);
    }
  }

  const stateCounts = createEmptyCounts();
  const cellStates: BhCellState[] = cells.map((cell) => {
    const isActive = activeBeamIds.has(cell.beamId);
    let state: BhCellState;

    if (!isVisible) {
      state = 'noCoverage';
    } else if (isActive) {
      if (isBlocked) {
        state = 'energyBlocked';
      } else if ((activeGroupCounts.get(cell.reuseGroup) ?? 0) > 1) {
        state = 'interfered';
      } else {
        state = 'served';
      }
    } else {
      state = 'inactiveBeam';
    }

    stateCounts[state]++;
    return state;
  });

  return { cells, cellStates, stateCounts };
}
