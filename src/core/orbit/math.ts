/**
 * Math utilities for orbit computations.
 *
 * Source: adapted from leo-beam-sim/src/engine/orbit/math.ts
 * Tier: normative (pure math, no physics assumptions)
 */

const TWO_PI = Math.PI * 2;

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function normalizeAngleRad(rad: number): number {
  const normalized = rad % TWO_PI;
  return normalized < 0 ? normalized + TWO_PI : normalized;
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
