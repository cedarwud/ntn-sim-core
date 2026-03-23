/**
 * VISUAL-ONLY — Sky-dome projection for observer-centric satellite display.
 *
 * Maps topocentric (azimuth, elevation) to 3D world coordinates on a
 * hemisphere dome. This is purely a visual mapping and does NOT affect
 * any physics, SINR, or KPI calculations.
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
  minHeight: 80,
};

const DEG2RAD = Math.PI / 180;

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

  const cosEl = Math.cos(elRad);

  const x = config.horizontalRadius * cosEl * Math.sin(azRad); // East
  const y = config.verticalRadius * Math.sin(elRad); // Up
  const z = -config.horizontalRadius * cosEl * Math.cos(azRad); // North (negated for Three.js)

  return [x, Math.max(y, config.minHeight), z]; // VISUAL-ONLY clamp
}
