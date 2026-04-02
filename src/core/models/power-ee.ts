/**
 * PowerModel + EeModel — Phase 2 model-bundle interfaces (P2-9).
 *
 * Defines PowerModel and EeModel interfaces plus BasicPowerModel and BpjEeModel
 * concrete wrappers. EP1 keeps the frozen contract-facing KPI shape unchanged,
 * but makes the internal power semantics explicit:
 *   - EE ratio input may be active-TX-only
 *   - total communication power is a broader beam-state proxy
 * Physics remain in energy/layer1.ts; this file is a thin adapter.
 *
 * Layer: L2 (src/core/models/)
 * Authority: phase2-model-bundle-sdd.md §5.6
 */

// ---------------------------------------------------------------------------
// PowerModel
// ---------------------------------------------------------------------------

export interface PowerInput {
  activeTxPowerW: number;
  activeBeamCount: number;
  idleBeamCount: number;
  offBeamCount: number;
  activeBeamOverheadW: number;
  idleBeamPowerW: number;
  offBeamPowerW: number;
}

export interface PowerResult {
  activeTxPowerW: number;
  totalCommunicationPowerW: number;
  /** Compatibility alias for the broader communication-power proxy. */
  totalPowerW: number;
  activeBeamOverheadW: number;
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
  denominatorPowerW: number;
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
 * BasicPowerModel — wraps the broader communication-power proxy accounting used
 * by the runtime artifact path.
 */
export class BasicPowerModel implements PowerModel {
  readonly familyId = 'layer1-basic' as const;

  compute(input: PowerInput): PowerResult {
    const totalCommunicationPowerW =
      input.activeTxPowerW +
      input.activeBeamCount * input.activeBeamOverheadW +
      input.idleBeamCount * input.idleBeamPowerW +
      input.offBeamCount * input.offBeamPowerW;
    return {
      activeTxPowerW: input.activeTxPowerW,
      totalCommunicationPowerW,
      totalPowerW: totalCommunicationPowerW,
      activeBeamOverheadW: input.activeBeamOverheadW,
    };
  }
}

/**
 * BpjEeModel — generic bits-per-joule ratio over an explicitly supplied
 * denominator power term.
 */
export class BpjEeModel implements EeModel {
  readonly familyId = 'bpj' as const;

  computeBitsPerJoule(input: EeInput): number {
    if (input.denominatorPowerW <= 0) return 0;
    return input.throughputBps / input.denominatorPowerW;
  }
}
