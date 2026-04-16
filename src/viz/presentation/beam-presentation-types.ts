import type { ContinuityNarrativeState } from './continuity-narrative-state';

export type BeamPresentationFocusMode =
  | 'idle-pass'
  | 'continuity-focus'
  | 'bh-focus';

export type BeamPresentationMarkerRole =
  | 'serving'
  | 'prepared'
  | 'secondary'
  | 'post-ho'
  | 'neutral';

export type BeamPresentationBeamAccent =
  | 'serving'
  | 'prepared'
  | 'secondary'
  | 'post-ho'
  | 'neutral-primary'
  | 'neutral-context'
  | 'inactive-context';

export interface BeamPresentationFrame {
  focusMode: BeamPresentationFocusMode;
  continuityNarrative: ContinuityNarrativeState;
  displaySatIds: string[];
  eventSatIds: string[];
  beamSatIds: string[];
  primaryBeamBySatId: Record<string, string>;
  contextBeamIdsBySatId: Record<string, string[]>;
  markerRoleBySatId: Record<string, BeamPresentationMarkerRole>;
  beamRoleAccentByBeamId: Record<string, BeamPresentationBeamAccent>;
}

export interface BuildBeamPresentationFrameOptions {
  previousDisplaySatIds?: ReadonlySet<string>;
  beamVisualsEnabled?: boolean;
  continuityNarrative?: ContinuityNarrativeState;
}
