/**
 * PowerModel + EeModel — Phase 2 model-bundle interfaces (P2-9).
 *
 * Defines PowerModel and EeModel interfaces plus BasicPowerModel and BpjEeModel
 * concrete wrappers. Physics remain in energy/layer1.ts; this file is a thin adapter.
 *
 * Layer: L2 (src/core/models/)
 * Authority: phase2-model-bundle-sdd.md §5.6
 */

// ---------------------------------------------------------------------------
// PowerModel
// ---------------------------------------------------------------------------

export interface PowerInput {
  txPowerPerBeamDbm: number;
  numActiveBeams: number;
  circuitPowerW: number;
}

export interface PowerResult {
  totalPowerW: number;
  txPowerW: number;
  circuitPowerW: number;
}

export interface PowerModel {
  readonly familyId: 'layer1-basic' | string;
  compute(input: PowerInput): PowerResult;
}

// ---------------------------------------------------------------------------
// EeModel
// ---------------------------------------------------------------------------

export interface EeInput {
  throughputBps: number;
  totalPowerW: number;
}

export interface EeModel {
  readonly familyId: 'bpj' | 'spectral-ee' | string;
  /** Returns energy efficiency in bits per joule. */
  computeBitsPerJoule(input: EeInput): number;
}

// ---------------------------------------------------------------------------
// Concrete wrappers
// ---------------------------------------------------------------------------

/**
 * BasicPowerModel — wraps power accounting portion of energy/layer1.ts.
 * Converts txPowerPerBeamDbm → watts, adds circuit overhead.
 */
export class BasicPowerModel implements PowerModel {
  readonly familyId = 'layer1-basic' as const;

  compute(input: PowerInput): PowerResult {
    const txPowerWPerBeam = Math.pow(10, (input.txPowerPerBeamDbm - 30) / 10);
    const txPowerW = txPowerWPerBeam * input.numActiveBeams;
    const totalPowerW = txPowerW + input.circuitPowerW;
    return {
      totalPowerW,
      txPowerW,
      circuitPowerW: input.circuitPowerW,
    };
  }
}

/**
 * BpjEeModel — bits-per-joule EE computation.
 * Matches layer1.ts systemEe = totalThroughput / activeTxPowerW logic.
 */
export class BpjEeModel implements EeModel {
  readonly familyId = 'bpj' as const;

  computeBitsPerJoule(input: EeInput): number {
    if (input.totalPowerW <= 0) return 0;
    return input.throughputBps / input.totalPowerW;
  }
}
