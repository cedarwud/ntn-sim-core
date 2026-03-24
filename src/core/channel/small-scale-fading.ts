/**
 * Tier 5: Small-scale fading models for NTN channels.
 *
 * Implements the Shadowed-Rician (SR) fading model, which is the standard
 * small-scale fading model for LEO satellite channels per 3GPP TR 38.811.
 *
 * The SR model combines:
 *   - A direct LOS component with Nakagami-m shadowing on the amplitude
 *   - Scattered multipath components (Rayleigh)
 *
 * PDF: p(r) involves confluent hypergeometric function 1F1
 * For simulation, we use the envelope-based approach:
 *   h = sqrt(X) * exp(jθ) + Y + jZ
 *   where X ~ Gamma(m, Ω/m), Y,Z ~ N(0, b₀)
 *   |h|² is the fading power
 *
 * Parameters (per elevation angle and environment):
 *   - m: Nakagami shape (LOS severity), m ∈ [0.1, 20]
 *   - b₀: average scattered power (half-variance of NLOS component)
 *   - Ω: average LOS power
 *
 * Paper sources:
 *   - PAP-2021-SHADOWED-RICIAN: SR fading model derivation and parameters
 *   - PAP-2024-MADRL-CORE: Loo 3-state Markov (deferred)
 *   - 3GPP TR 38.811 §6.7: small-scale fading reference
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §9.2
 *   - This file must not import React, Three.js, or scene code.
 */

// ---------------------------------------------------------------------------
// SR Parameters by elevation (suburban S-band)
// Source: PAP-2021-SHADOWED-RICIAN Table II (suburban, S-band 2GHz)
// ---------------------------------------------------------------------------

interface SrParams {
  m: number;    // Nakagami shape parameter
  b0: number;   // Average scattered power
  omega: number; // Average LOS power
}

/** Elevation angles for SR parameter lookup. */
const SR_ELEVATIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const;

/** SR parameters for suburban S-band LOS. */
const SR_S_SUBURBAN_LOS: readonly SrParams[] = [
  { m: 5.0,  b0: 0.063, omega: 0.94 },  // 10°
  { m: 10.0, b0: 0.035, omega: 0.97 },  // 20°
  { m: 12.0, b0: 0.025, omega: 0.98 },  // 30°
  { m: 15.0, b0: 0.018, omega: 0.99 },  // 40°
  { m: 17.0, b0: 0.012, omega: 0.99 },  // 50°
  { m: 19.0, b0: 0.008, omega: 1.00 },  // 60°
  { m: 20.0, b0: 0.005, omega: 1.00 },  // 70°
  { m: 20.0, b0: 0.003, omega: 1.00 },  // 80°
  { m: 20.0, b0: 0.002, omega: 1.00 },  // 90°
];

/** SR parameters for suburban S-band NLOS. */
const SR_S_SUBURBAN_NLOS: readonly SrParams[] = [
  { m: 0.5,  b0: 0.30, omega: 0.10 },  // 10°
  { m: 1.0,  b0: 0.25, omega: 0.15 },  // 20°
  { m: 1.5,  b0: 0.22, omega: 0.20 },  // 30°
  { m: 2.0,  b0: 0.20, omega: 0.25 },  // 40°
  { m: 2.5,  b0: 0.18, omega: 0.30 },  // 50°
  { m: 3.0,  b0: 0.15, omega: 0.35 },  // 60°
  { m: 4.0,  b0: 0.12, omega: 0.40 },  // 70°
  { m: 5.0,  b0: 0.10, omega: 0.45 },  // 80°
  { m: 5.0,  b0: 0.08, omega: 0.50 },  // 90°
];

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

function lerpParams(a: SrParams, b: SrParams, t: number): SrParams {
  return {
    m: a.m + (b.m - a.m) * t,
    b0: a.b0 + (b.b0 - a.b0) * t,
    omega: a.omega + (b.omega - a.omega) * t,
  };
}

function getSrParams(elevationDeg: number, isLos: boolean): SrParams {
  const table = isLos ? SR_S_SUBURBAN_LOS : SR_S_SUBURBAN_NLOS;
  const el = Math.max(SR_ELEVATIONS[0], Math.min(SR_ELEVATIONS[SR_ELEVATIONS.length - 1], elevationDeg));

  let lo = 0;
  for (let i = 0; i < SR_ELEVATIONS.length - 1; i++) {
    if (SR_ELEVATIONS[i + 1] >= el) { lo = i; break; }
  }
  const hi = Math.min(lo + 1, SR_ELEVATIONS.length - 1);

  if (lo === hi) return table[lo];
  const t = (el - SR_ELEVATIONS[lo]) / (SR_ELEVATIONS[hi] - SR_ELEVATIONS[lo]);
  return lerpParams(table[lo], table[hi], t);
}

// ---------------------------------------------------------------------------
// Gamma variate (Marsaglia & Tsang method)
// ---------------------------------------------------------------------------

/**
 * Sample from Gamma(shape, scale) distribution using Marsaglia & Tsang.
 * For shape ≥ 1: direct. For shape < 1: use boost method.
 */
function sampleGamma(shape: number, scale: number, rngNext: () => number): number {
  if (shape < 1) {
    // Boost: Gamma(a) = Gamma(a+1) * U^(1/a)
    const boost = sampleGamma(shape + 1, 1, rngNext);
    const u = rngNext();
    return scale * boost * Math.pow(u === 0 ? 1e-10 : u, 1 / shape);
  }

  // Marsaglia & Tsang for shape ≥ 1
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  for (;;) {
    let x: number;
    let v: number;

    do {
      // Standard normal via Box-Muller
      const u1 = rngNext();
      const u2 = rngNext();
      x = Math.sqrt(-2 * Math.log(u1 === 0 ? 1e-10 : u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = rngNext();
    const xSq = x * x;

    if (u < 1 - 0.0331 * xSq * xSq) return scale * d * v;
    if (Math.log(u === 0 ? 1e-10 : u) < 0.5 * xSq + d * (1 - v + Math.log(v))) return scale * d * v;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sample Shadowed-Rician fading power in dB.
 *
 * Returns the fading gain/loss in dB (can be positive or negative).
 * Mean fading power is 0 dB (normalized).
 *
 * @tier paper-backed
 * @source PAP-2021-SHADOWED-RICIAN, 3GPP TR 38.811 §6.7
 *
 * @param elevationDeg — elevation angle in degrees
 * @param isLos — LOS condition
 * @param rngNext — seeded RNG function returning [0, 1)
 * @returns fading power in dB
 */
export function sampleShadowedRicianDb(
  elevationDeg: number,
  isLos: boolean,
  rngNext: () => number,
): number {
  const params = getSrParams(elevationDeg, isLos);

  // LOS component amplitude: X ~ Gamma(m, Ω/m), take sqrt for envelope
  const losAmplitude = Math.sqrt(sampleGamma(params.m, params.omega / params.m, rngNext));

  // Scattered components: Y, Z ~ N(0, b₀)
  const u1 = rngNext();
  const u2 = rngNext();
  const r = Math.sqrt(-2 * Math.log(u1 === 0 ? 1e-10 : u1));
  const scatterY = Math.sqrt(params.b0) * r * Math.cos(2 * Math.PI * u2);
  const scatterZ = Math.sqrt(params.b0) * r * Math.sin(2 * Math.PI * u2);

  // Random phase for LOS component
  const theta = rngNext() * 2 * Math.PI;
  const realPart = losAmplitude * Math.cos(theta) + scatterY;
  const imagPart = losAmplitude * Math.sin(theta) + scatterZ;

  // Channel power |h|²
  const powerLinear = realPart * realPart + imagPart * imagPart;

  // Normalize: mean power should be Ω + 2*b₀
  const meanPower = params.omega + 2 * params.b0;
  const normalizedPower = powerLinear / meanPower;

  // Convert to dB (0 dB mean, can be positive or negative)
  return 10 * Math.log10(normalizedPower > 1e-30 ? normalizedPower : 1e-30);
}
