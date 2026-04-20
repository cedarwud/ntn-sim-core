import { useMemo } from 'react';

import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';
import { EarthFixedCellLayer, EarthMovingBeamLayer } from '@/viz/beam';
import { BeamInfoOverlay } from '@/viz/overlays/BeamInfoOverlay';
import { HandoverLinkOverlay } from '@/viz/overlays/HandoverLinkOverlay';
import {
  type BeamPresentationFrame,
} from '@/viz/presentation';
import { SatelliteSkyLayer } from '@/viz/satellite/SatelliteSkyLayer';
import { usePublishValidationSection } from '@/viz/validation/store';

import { buildPresentationFrameSummary } from './scene-runtime-summaries';

interface BeamLayersProps {
  snapshot: SimulationSnapshot | null;
  presentationFrame: BeamPresentationFrame | null;
  showBeams: boolean;
  isBhProfile: boolean;
}

function BeamLayers({
  snapshot,
  presentationFrame,
  showBeams,
  isBhProfile,
}: BeamLayersProps) {
  return (
    <>
      <HandoverLinkOverlay
        snapshot={snapshot}
        presentationFrame={presentationFrame}
        visible
      />
      {showBeams && (
        <>
          <EarthMovingBeamLayer
            snapshot={snapshot}
            presentationFrame={presentationFrame}
            visible
          />
          <BeamInfoOverlay
            snapshot={snapshot}
            presentationFrame={presentationFrame}
            visible
          />
          {isBhProfile && (
            <EarthFixedCellLayer
              snapshot={snapshot}
              presentationFrame={presentationFrame}
              visible
            />
          )}
        </>
      )}
    </>
  );
}

export interface PresentationLayersProps {
  snapshot: SimulationSnapshot | null;
  presentationFrame: BeamPresentationFrame | null;
  showBeams: boolean;
  showLabels: boolean;
  isBhProfile: boolean;
}

export function PresentationLayers({
  snapshot,
  presentationFrame,
  showBeams,
  showLabels,
  isBhProfile,
}: PresentationLayersProps) {
  const presentationSummary = useMemo(
    () => buildPresentationFrameSummary(snapshot, presentationFrame),
    [presentationFrame, snapshot],
  );

  usePublishValidationSection('beamPresentationFrame', presentationSummary);

  return (
    <>
      <SatelliteSkyLayer
        snapshot={snapshot}
        presentationFrame={presentationFrame}
        showLabels={showLabels}
      />
      <BeamLayers
        snapshot={snapshot}
        presentationFrame={presentationFrame}
        showBeams={showBeams}
        isBhProfile={isBhProfile}
      />
    </>
  );
}
