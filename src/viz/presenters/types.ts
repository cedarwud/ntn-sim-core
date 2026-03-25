import type { SatelliteState } from '@/core/common/types';

export type BeamSelectionEmphasis = 'continuity' | 'event' | 'context';

export type BeamSelectionReason =
  | 'serving'
  | 'prepared'
  | 'secondary'
  | 'daps-source'
  | 'daps-target'
  | 'role-derived'
  | 'candidate-rich'
  | 'high-elevation';

export interface BeamPresentationSatSelection {
  satId: string;
  emphasis: BeamSelectionEmphasis;
  reason: BeamSelectionReason;
  score: number;
  elevationDeg: number;
  renderableBeamCount: number;
  specialRoleCount: number;
}

export interface LeoParityBeamPresentation {
  mode: 'leo-parity';
  displaySatIds: string[];
  eventSatIds: string[];
  beamSatIds: string[];
  selections: BeamPresentationSatSelection[];
}

export interface BeamPresentationInput {
  satellites: SatelliteState[];
  servingSatId?: string | null;
  targetSatId?: string | null;
  secondarySatId?: string | null;
  dapsSourceSatId?: string | null;
  dapsTargetSatId?: string | null;
}
