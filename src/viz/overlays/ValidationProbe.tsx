import React from 'react';

import { useValidationStore } from '@/viz/validation/store';

export interface ValidationProbeProps {
  visible?: boolean;
}

const probeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 12,
  maxWidth: 340,
  padding: '10px 12px',
  borderRadius: 6,
  background: 'rgba(8, 12, 18, 0.86)',
  color: '#d6e2ea',
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  fontSize: 11,
  lineHeight: 1.45,
  pointerEvents: 'none',
  whiteSpace: 'pre-wrap',
  backdropFilter: 'blur(4px)',
};

const titleStyle: React.CSSProperties = {
  color: '#63d3ff',
  fontWeight: 700,
  marginBottom: 6,
};

function stringify(value: unknown) {
  return JSON.stringify(value);
}

export const ValidationProbe = React.memo(function ValidationProbe({
  visible = false,
}: ValidationProbeProps) {
  const state = useValidationStore();

  if (!visible) return null;

  const runtime = state.runtime;
  const orbitParity = state.orbitParity;
  const snapshotBeamTruth = state.snapshotBeamTruth;
  const presentationFrame = state.beamPresentationFrame;
  const moving = state.earthMovingBeamLayer;
  const fixed = state.earthFixedCellLayer;
  const beamInfo = state.beamInfoOverlay;
  const handover = state.handoverLinkOverlay;

  return (
    <div
      data-testid="validation-probe"
      style={probeStyle}
    >
      <div style={titleStyle}>NTN-SIM-CORE Validation Probe</div>

      <div
        data-testid="validation-runtime"
        data-profile-id={runtime?.profileId ?? ''}
        data-mode={runtime?.mode ?? ''}
        data-tick={runtime?.tick ?? ''}
        data-time-sec={runtime?.timeSec ?? ''}
        data-serving-sat-id={runtime?.primaryUe.servingSatId ?? ''}
        data-target-sat-id={runtime?.primaryUe.targetSatId ?? ''}
        data-secondary-sat-id={runtime?.primaryUe.secondarySatId ?? ''}
        data-continuity-state={runtime?.primaryUe.continuityState ?? ''}
        data-low-sinr-ue-count={runtime?.lowSinrUeCount ?? 0}
        data-low-sinr-threshold-db={runtime?.lowSinrThresholdDb ?? ''}
        data-daps-phase={runtime?.dapsPhase ?? ''}
        data-replay-selection={runtime?.replaySelection ?? ''}
        data-replay-window-start-sec={runtime?.replayWindowStartSec ?? ''}
        data-replay-window-end-sec={runtime?.replayWindowEndSec ?? ''}
        data-truth-source-kind={runtime?.truthSourceKind ?? ''}
        data-truth-source-label={runtime?.truthSourceLabel ?? ''}
        data-bundle-slot-index={runtime?.bundleSlotIndex ?? ''}
        data-bundle-slot-count={runtime?.bundleSlotCount ?? ''}
        data-visible-satellite-ids={stringify(runtime?.visibleSatelliteIds ?? [])}
      >
        runtime={stringify(runtime ?? null)}
      </div>

      <div
        data-testid="validation-orbit-parity"
        data-present={String(Boolean(orbitParity?.present))}
        data-profile-id={orbitParity?.profileId ?? ''}
        data-mode={orbitParity?.mode ?? ''}
        data-time-sec={orbitParity?.timeSec ?? ''}
        data-sample-count={orbitParity?.sampleCount ?? 0}
        data-satellites={stringify(orbitParity?.satellites ?? [])}
      >
        orbit={stringify(orbitParity ?? null)}
      </div>

      <div
        data-testid="validation-snapshot-beam-truth"
        data-present={String(Boolean(snapshotBeamTruth?.present))}
        data-sat-ids-with-beams={stringify(snapshotBeamTruth?.satIdsWithBeams ?? [])}
        data-beam-ids-by-sat-id={stringify(snapshotBeamTruth?.beamIdsBySatId ?? {})}
        data-beam-role-by-key={stringify(snapshotBeamTruth?.beamRoleByKey ?? {})}
        data-beam-active-by-key={stringify(snapshotBeamTruth?.beamActiveByKey ?? {})}
      >
        snapshotBeamTruth={stringify(snapshotBeamTruth ?? null)}
      </div>

      <div
        data-testid="validation-presentation-frame"
        data-present={String(Boolean(presentationFrame?.present))}
        data-focus-mode={presentationFrame?.focusMode ?? ''}
        data-narrative-phase={presentationFrame?.narrativePhase ?? ''}
        data-narrative-serving-sat-id={presentationFrame?.narrativeServingSatId ?? ''}
        data-narrative-source-sat-id={presentationFrame?.narrativeSourceSatId ?? ''}
        data-narrative-target-sat-id={presentationFrame?.narrativeTargetSatId ?? ''}
        data-narrative-post-ho-sat-id={presentationFrame?.narrativePostHoSatId ?? ''}
        data-cooled-down-sat-ids={stringify(presentationFrame?.cooledDownSatIds ?? [])}
        data-cooldown-suppressed-target-sat-id={presentationFrame?.cooldownSuppressedTargetSatId ?? ''}
        data-display-sat-ids={stringify(presentationFrame?.displaySatIds ?? [])}
        data-event-sat-ids={stringify(presentationFrame?.eventSatIds ?? [])}
        data-beam-sat-ids={stringify(presentationFrame?.beamSatIds ?? [])}
        data-primary-beam-by-sat-id={stringify(presentationFrame?.primaryBeamBySatId ?? {})}
        data-context-beam-ids-by-sat-id={stringify(presentationFrame?.contextBeamIdsBySatId ?? {})}
        data-marker-role-by-sat-id={stringify(presentationFrame?.markerRoleBySatId ?? {})}
        data-beam-role-accent-by-beam-id={stringify(presentationFrame?.beamRoleAccentByBeamId ?? {})}
      >
        presentation={stringify(presentationFrame ?? null)}
      </div>

      <div
        data-testid="validation-earth-moving"
        data-present={String(Boolean(moving?.present))}
        data-rendered-sat-ids={stringify(moving?.renderedSatIds ?? [])}
        data-rendered-beam-count={moving?.renderedBeamCount ?? 0}
        data-footprint-radius-world={moving?.footprintRadiusWorld ?? 0}
        data-role-counts={stringify(moving?.roleCounts ?? {})}
        data-geometry-sample-count={moving?.geometrySamples?.length ?? 0}
      >
        moving={stringify(moving ?? null)}
      </div>

      <div
        data-testid="validation-earth-fixed"
        data-present={String(Boolean(fixed?.present))}
        data-cell-count={fixed?.cellCount ?? 0}
        data-selection-source={fixed?.selectionSource ?? ''}
        data-analyzed-sat-ids={stringify(fixed?.analyzedSatIds ?? [])}
        data-analyzed-beam-ids-by-sat-id={stringify(fixed?.analyzedBeamIdsBySatId ?? {})}
        data-state-counts={stringify(
          fixed?.stateCounts ?? {
            served: 0,
            interfered: 0,
            energyBlocked: 0,
            inactiveBeam: 0,
            noCoverage: 0,
          },
        )}
        data-observed-state-counts={stringify(
          fixed?.observedStateCounts ?? {
            served: 0,
            interfered: 0,
            energyBlocked: 0,
            inactiveBeam: 0,
            noCoverage: 0,
          },
        )}
      >
        fixed={stringify(fixed ?? null)}
      </div>

      <div
        data-testid="validation-beam-info"
        data-present={String(Boolean(beamInfo?.present))}
        data-labeled-sat-ids={stringify(beamInfo?.labeledSatIds ?? [])}
        data-role-tags={stringify(beamInfo?.roleTags ?? [])}
        data-serving-sinr-db={beamInfo?.servingSinrDb ?? ''}
      >
        beamInfo={stringify(beamInfo ?? null)}
      </div>

      <div
        data-testid="validation-handover-links"
        data-present={String(Boolean(handover?.present))}
        data-style-keys={stringify(handover?.styleKeys ?? [])}
        data-observed-style-keys={stringify(handover?.observedStyleKeys ?? [])}
        data-continuity-state={handover?.continuityState ?? ''}
        data-daps-phase={handover?.dapsPhase ?? ''}
        data-narrative-phase={handover?.narrativePhase ?? ''}
        data-narrative-serving-sat-id={handover?.narrativeServingSatId ?? ''}
        data-narrative-source-sat-id={handover?.narrativeSourceSatId ?? ''}
        data-narrative-target-sat-id={handover?.narrativeTargetSatId ?? ''}
        data-narrative-post-ho-sat-id={handover?.narrativePostHoSatId ?? ''}
        data-cooled-down-sat-ids={stringify(handover?.cooledDownSatIds ?? [])}
        data-cooldown-suppressed-target-sat-id={handover?.cooldownSuppressedTargetSatId ?? ''}
        data-observed-daps-phases={stringify(handover?.observedDapsPhases ?? [])}
        data-observed-dual-active-truth={String(Boolean(handover?.observedDualActiveTruth))}
      >
        links={stringify(handover ?? null)}
      </div>
    </div>
  );
});
