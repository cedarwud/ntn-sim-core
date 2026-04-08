/**
 * VISUAL-ONLY — Sky-dome projection for observer-centric satellite display.
 *
 * Maps topocentric (azimuth, elevation) to 3D world coordinates on a
 * hemisphere dome. Uses stereographic-like compression so that mid/high
 * elevation satellites cluster toward the center (like a polar sky plot),
 * while low-elevation satellites are compressed into a thin outer band.
 *
 * This is purely a visual mapping and does NOT affect any physics, SINR,
 * or KPI calculations.
 */

// VISUAL-ONLY: All constants and functions in this file are for rendering only.

export interface SkyProjectionConfig {
  /** Horizontal dome radius in world units. */
  horizontalRadius: number;
  /** Vertical dome radius in world units. */
  verticalRadius: number;
  /** Minimum height above ground plane. VISUAL-ONLY. */
  minHeight: number;
}

export const DEFAULT_SKY_PROJECTION: SkyProjectionConfig = {
  horizontalRadius: 700,
  verticalRadius: 400,
  minHeight: 0,
};

const DEG2RAD = Math.PI / 180;

/**
 * VISUAL-ONLY: Elevation-linear radial mapping (standard sky-plot projection).
 *
 * r = 1 - el/90° — each degree of elevation gets equal radial space.
 * Spreads low-elevation satellites more evenly instead of compressing them
 * into a thin outer ring (which cos^P projections do because d/d(el) cos ≈ 0
 * near the horizon).
 *
 * Previous cos^1.6:  10°→0.98  30°→0.80  45°→0.58  60°→0.33
 * Elevation-linear:  10°→0.89  30°→0.67  45°→0.50  60°→0.33
 */
function compressedRadius(elevationRad: number): number {
  const elevationDeg = elevationRad / DEG2RAD;
  return Math.max(0, 1 - elevationDeg / 90);
}

/**
 * Project topocentric azimuth/elevation onto a 3D sky-dome hemisphere.
 *
 * Coordinate convention (Three.js right-hand, Y-up):
 *   x = East,  y = Up,  z = -North
 *
 * VISUAL-ONLY — no physics dependency.
 */
export function projectToSkyDome(
  azimuthDeg: number,
  elevationDeg: number,
  config: SkyProjectionConfig = DEFAULT_SKY_PROJECTION,
): [number, number, number] {
  const azRad = azimuthDeg * DEG2RAD; // VISUAL-ONLY
  const elRad = elevationDeg * DEG2RAD; // VISUAL-ONLY

  const r = compressedRadius(elRad); // VISUAL-ONLY: compressed radial distance

  const x = config.horizontalRadius * r * Math.sin(azRad); // East
  const y = config.verticalRadius * Math.sin(elRad); // Up
  const z = -config.horizontalRadius * r * Math.cos(azRad); // North (negated for Three.js)

  return [x, Math.max(y, config.minHeight), z]; // VISUAL-ONLY clamp
}
