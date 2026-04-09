/**
 * Shared world-unit constants for beam and cell visualization.
 *
 * VISUAL-ONLY:
 *   - changes here affect browser presentation / explainability only
 *   - they do not alter scheduler, SINR, handover, or KPI math
 */

export const GRID_RADIUS_WU = 280;
export const CELL_RADIUS_WU = 45;

/**
 * Circular beam footprint uses the inscribed-circle radius of the hex cell.
 * This keeps footprint scale visually comparable to the sampling grid without
 * forcing a one-to-one "beam exactly equals hex" mapping.
 */
export const BEAM_FOOTPRINT_RADIUS_WU = CELL_RADIUS_WU * Math.cos(Math.PI / 6);

export const HEX_SPACING_WU = CELL_RADIUS_WU * Math.sqrt(3);
export const GROUND_Y = 0.8;

export const MOVING_BEAM_FOOTPRINT_RADIUS_WORLD = BEAM_FOOTPRINT_RADIUS_WU;
export const MOVING_BEAM_GROUND_Y = 1;
