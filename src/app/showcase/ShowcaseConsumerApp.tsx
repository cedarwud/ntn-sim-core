import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';

import { VISUAL_SCENE_CONFIG } from '@/config/visual-scene.config';
import type { SatelliteState } from '@/core/contracts/runtime-v1';
import { EarthMovingBeamLayer } from '@/viz/beam';
import { BeamInfoOverlay } from '@/viz/overlays/BeamInfoOverlay';
import { HandoverLinkOverlay } from '@/viz/overlays/HandoverLinkOverlay';
import { Starfield } from '@/viz/overlays/Starfield';
import type { ContinuityNarrativeState } from '@/viz/presentation';
import { SatelliteSkyLayer } from '@/viz/satellite/SatelliteSkyLayer';
import type { SceneConsumerStarterExportV2 } from '@/viz/scene/scene-consumer-starter';
import { CameraRig, type CameraRigPreset } from '@/viz/scene/CameraRig';
import { LightingRig } from '@/viz/scene/LightingRig';
import { LoaderOverlay } from '@/viz/scene/LoaderOverlay';
import { NTPUScene } from '@/viz/scene/NTPUScene';
import { UAV } from '@/viz/scene/UAV';

import {
  isShowcaseSceneConsumerStarterV2,
  usePublishedSceneConsumerStarter,
} from './showcase-consumer-window';

export interface ShowcaseConsumerAppProps {
  appQueryValue: string;
}

type SceneOverlayMode =
  | 'full'
  | 'links'
  | 'beams';

interface ShowcaseStripItemDescriptor {
  label: string;
  value: string;
  tone?: 'accent' | 'warm';
}

const CAMERA_PRESET_OPTIONS: Array<{ id: CameraRigPreset; label: string }> = [
  { id: 'theater', label: 'Theater' },
  { id: 'continuity', label: 'Continuity' },
  { id: 'zenith', label: 'Zenith' },
];

const OVERLAY_MODE_OPTIONS: Array<{ id: SceneOverlayMode; label: string }> = [
  { id: 'full', label: 'Full' },
  { id: 'links', label: 'Links' },
  { id: 'beams', label: 'Beams' },
];

function formatPrimarySinr(sinrDb: number | null | undefined): string {
  if (sinrDb === null || sinrDb === undefined || Number.isNaN(sinrDb)) return 'Waiting';
  return `${sinrDb.toFixed(1)} dB`;
}

function formatSignedDb(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Waiting';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)} dB`;
}

function formatPhaseLabel(phase: string | null | undefined): string {
  if (!phase) return 'Stable';
  return phase
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatWholeNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return String(Math.round(value));
}

function formatFocusMode(focusMode: string | null | undefined): string {
  if (!focusMode) return 'Waiting';
  return focusMode
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatElevation(elevationDeg: number | null | undefined): string {
  if (elevationDeg === null || elevationDeg === undefined || Number.isNaN(elevationDeg)) return '—';
  return `${elevationDeg.toFixed(1)} deg`;
}

function formatRangeKm(rangeKm: number | null | undefined): string {
  if (rangeKm === null || rangeKm === undefined || Number.isNaN(rangeKm)) return '—';
  return `${Math.round(rangeKm)} km`;
}

function formatSignalDescriptor(value: number | null | undefined, fallback = 'Narrative only'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return `${value.toFixed(1)} dB`;
}

function formatIdentity(value: string | null | undefined): string {
  if (!value) return '—';
  return value;
}

function formatTriggerWindow(progressSec: number | null | undefined, thresholdSec: number | null | undefined): string {
  if (
    progressSec === null
    || progressSec === undefined
    || thresholdSec === null
    || thresholdSec === undefined
    || Number.isNaN(progressSec)
    || Number.isNaN(thresholdSec)
  ) {
    return 'Waiting';
  }

  return `${progressSec.toFixed(1)} / ${thresholdSec.toFixed(1)} s`;
}

function formatShowcaseSourceLabel(starter: SceneConsumerStarterExportV2 | null): string {
  if (!starter) return 'Waiting for starter publication';
  if (starter.source.mode === 'native-replay') {
    return `native-replay / ${starter.source.profileId} / ${starter.source.replaySelection}`;
  }
  return `modqn-bundle / ${starter.source.sourceLabel ?? 'unknown'}`;
}

function describeShowcasePath(starter: SceneConsumerStarterExportV2 | null): string {
  if (!starter) return 'Waiting for published starter truth.';
  if (starter.source.mode === 'native-replay') {
    return 'Native replay continuity window, presented through the continuity showcase viewer.';
  }
  return 'Bundled MODQN replay sample, presented through the same published starter seam.';
}

function describeContinuityPhase(
  continuity: ContinuityNarrativeState | null,
): string {
  if (!continuity) {
    return 'Continuity phase: waiting for published starter truth before the shell can narrate the handover state.';
  }

  const servingSatId = continuity.servingSatId ?? 'current serving satellite';
  const targetSatId = continuity.targetSatId ?? 'candidate satellite';
  const sourceSatId = continuity.sourceSatId ?? servingSatId;
  const postHoSatId = continuity.postHoSatId ?? continuity.servingSatId ?? 'new serving satellite';

  switch (continuity.phase) {
    case 'prepared':
      return `Continuity phase: Prepared. Tracking ${targetSatId} while keeping ${servingSatId} anchored in the same frame.`;
    case 'dual-active':
      return `Continuity phase: Dual Active. Holding ${sourceSatId} and ${targetSatId} together during the active handover window.`;
    case 'post-switch':
      return `Continuity phase: Post Switch. Stabilizing on ${postHoSatId} immediately after the serving change commits.`;
    default:
      return `Continuity phase: Stable. ${servingSatId} remains centered so the first screen reads as a steady continuity baseline.`;
  }
}

function showcasePrimarySinrColor(sinrDb: number | null | undefined): string {
  if (sinrDb === null || sinrDb === undefined || Number.isNaN(sinrDb)) return '#f5f7fb';
  if (sinrDb >= 20) return '#53ffb5';
  if (sinrDb >= 10) return '#d9ff66';
  if (sinrDb >= 5) return '#ffcc66';
  return '#ff7a7a';
}

function findSatellite(
  satellites: SatelliteState[] | null | undefined,
  satId: string | null | undefined,
): SatelliteState | null {
  if (!satellites || !satId) return null;
  return satellites.find((sat) => sat.id === satId) ?? null;
}

function describeTargetLaneTitle(continuity: ContinuityNarrativeState | null): string {
  switch (continuity?.phase) {
    case 'prepared':
      return 'Prepared Target';
    case 'dual-active':
      return 'Dual-Active Target';
    case 'post-switch':
      return 'Post-Switch Anchor';
    default:
      return 'Pending Target';
  }
}

function describeTargetLaneNote(args: {
  continuity: ContinuityNarrativeState | null;
  targetSatId: string | null;
  hasExplainabilityTarget: boolean;
}): string {
  const { continuity, targetSatId, hasExplainabilityTarget } = args;
  if (!targetSatId) return 'No target satellite is published in this frame.';
  if (hasExplainabilityTarget) {
    return 'Rendered from published handover explainability truth only.';
  }
  if (continuity?.phase === 'dual-active') {
    return 'Narrative fallback only while the dual-active window remains in force.';
  }
  return 'Narrative fallback only; no pending-target explainability metrics are published here.';
}

function buildTelemetryStripItems(args: {
  starter: SceneConsumerStarterExportV2 | null;
  focusMode: string;
  snapshotTime: string;
  dapsPhase: string;
}): ShowcaseStripItemDescriptor[] {
  const { starter, focusMode, snapshotTime, dapsPhase } = args;

  if (!starter) {
    return [
      { label: 'Source', value: 'Waiting' },
      { label: 'Focus', value: focusMode },
      { label: 'Time', value: snapshotTime },
      { label: 'DAPS', value: dapsPhase },
    ];
  }

  if (starter.source.mode === 'native-replay') {
    return [
      { label: 'Source', value: 'native-replay', tone: 'accent' },
      { label: 'Profile', value: starter.source.profileId ?? '—' },
      { label: 'Replay', value: starter.source.replaySelection ?? '—' },
      { label: 'Focus', value: focusMode },
      { label: 'Time', value: snapshotTime },
      { label: 'DAPS', value: dapsPhase },
    ];
  }

  return [
    { label: 'Source', value: 'modqn-bundle', tone: 'warm' },
    { label: 'Bundle', value: starter.source.sourceLabel ?? 'sample-bundle-v1' },
    { label: 'Path', value: starter.entry.deterministicPathId ?? 'Waiting' },
    { label: 'Focus', value: focusMode },
    { label: 'Time', value: snapshotTime },
    { label: 'DAPS', value: dapsPhase },
  ];
}

function formatRecentHoSummary(args: {
  recentSourceSatId: string | null;
  recentTargetSatId: string | null;
}): string {
  const { recentSourceSatId, recentTargetSatId } = args;
  if (!recentSourceSatId && !recentTargetSatId) return '—';
  return `${recentSourceSatId ?? '—'} -> ${recentTargetSatId ?? '—'}`;
}

function ShowcaseControlButton(args: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const { label, active, onClick } = args;
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`showcase-consumer-control-button${active ? ' showcase-consumer-control-button--active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ShowcaseConsumerSceneLayer(args: {
  starter: SceneConsumerStarterExportV2 | null;
  showBeamCones: boolean;
  showLinks: boolean;
  showBeamInfo: boolean;
  showSkyLabels: boolean;
}) {
  const {
    starter,
    showBeamCones,
    showLinks,
    showBeamInfo,
    showSkyLabels,
  } = args;
  const snapshot = starter?.truth.sceneConsumedSnapshot ?? null;
  const presentationFrame = starter?.presentation.beamPresentationFrame ?? null;

  if (!snapshot || !presentationFrame) return null;

  return (
    <>
      <SatelliteSkyLayer
        snapshot={snapshot}
        presentationFrame={presentationFrame}
        showLabels={showSkyLabels}
      />
      {showLinks ? (
        <HandoverLinkOverlay
          snapshot={snapshot}
          presentationFrame={presentationFrame}
          visible
        />
      ) : null}
      {showBeamCones ? (
        <EarthMovingBeamLayer
          snapshot={snapshot}
          presentationFrame={presentationFrame}
          visible
        />
      ) : null}
      {showBeamInfo ? (
        <BeamInfoOverlay
          snapshot={snapshot}
          presentationFrame={presentationFrame}
          visible
        />
      ) : null}
    </>
  );
}

export function ShowcaseConsumerApp({
  appQueryValue,
}: ShowcaseConsumerAppProps) {
  const [viewPreset, setViewPreset] = useState<CameraRigPreset>('theater');
  const [overlayMode, setOverlayMode] = useState<SceneOverlayMode>('full');
  const [showSkyLabels, setShowSkyLabels] = useState(false);

  const publishedStarter = usePublishedSceneConsumerStarter();
  const starter = isShowcaseSceneConsumerStarterV2(publishedStarter)
    ? publishedStarter
    : null;
  const snapshot = starter?.truth.sceneConsumedSnapshot ?? null;
  const presentationFrame = starter?.presentation.beamPresentationFrame ?? null;
  const primaryUe = snapshot?.ues[0] ?? null;
  const continuity = presentationFrame?.continuityNarrative ?? null;
  const hoExplanation = snapshot?.hoExplanation ?? null;
  const latestHoEvent = snapshot?.recentHoEvents?.[snapshot.recentHoEvents.length - 1] ?? null;
  const sourceLabel = formatShowcaseSourceLabel(starter);
  const pathDescription = describeShowcasePath(starter);
  const continuityDescription = describeContinuityPhase(continuity);
  const pathDisclosure = starter?.entry.deterministicPathId
    ?? 'Waiting for published starter truth.';
  const currentReplayTime = snapshot ? `${formatWholeNumber(snapshot.timeSec)} s` : '—';
  const focusMode = formatFocusMode(presentationFrame?.focusMode);
  const dapsPhase = formatPhaseLabel(snapshot?.daps?.phase ?? continuity?.rawDapsPhase ?? null);
  const stripItems = buildTelemetryStripItems({
    starter,
    focusMode,
    snapshotTime: currentReplayTime,
    dapsPhase,
  });

  const servingSatId = primaryUe?.servingSatId ?? continuity?.servingSatId ?? null;
  const targetSatId = hoExplanation?.pendingTargetSatId
    ?? continuity?.targetSatId
    ?? latestHoEvent?.targetSatId
    ?? null;
  const recentSourceSatId = latestHoEvent?.sourceSatId ?? continuity?.recentSourceSatId ?? continuity?.sourceSatId ?? null;
  const postHoSatId = continuity?.postHoSatId ?? latestHoEvent?.targetSatId ?? null;

  const servingSat = findSatellite(snapshot?.satellites, servingSatId);
  const targetSat = findSatellite(snapshot?.satellites, targetSatId);

  const triggerRatio = hoExplanation && hoExplanation.triggerThresholdSec > 0
    ? Math.min(hoExplanation.triggerProgressSec / hoExplanation.triggerThresholdSec, 1)
    : 0;

  const showLinks = overlayMode !== 'beams';
  const showBeamCones = overlayMode !== 'links';
  const showBeamInfo = true;

  return (
    <div
      data-testid="showcase-consumer-surface"
      data-app={appQueryValue}
      data-ready={String(Boolean(starter))}
      className="showcase-consumer-shell"
    >
      <div className="showcase-consumer-atmosphere" aria-hidden="true" />
      <Starfield starCount={160} style={{ zIndex: 1 }} />

      <div className="showcase-consumer-overlay">
        <section className="showcase-consumer-hero">
          <div className="showcase-consumer-story">
            <div className="showcase-consumer-kicker">NTN Sim Core · Dedicated continuity viewer</div>
            <h1
              className="showcase-consumer-title"
              data-testid="showcase-consumer-title"
            >
              Continuity Showcase Viewer
            </h1>
            <p className="showcase-consumer-lead">{pathDescription}</p>
            <p
              className="showcase-consumer-continuity-copy"
              data-testid="showcase-consumer-continuity-copy"
            >
              {continuityDescription}
            </p>
          </div>

          <div className="showcase-consumer-stat-stack">
            <article className="showcase-consumer-stat-card showcase-consumer-stat-card--primary">
              <div className="showcase-consumer-stat-label">Primary SINR</div>
              <div
                data-testid="showcase-consumer-primary-sinr"
                className="showcase-consumer-primary-sinr"
                style={{ color: showcasePrimarySinrColor(primaryUe?.sinrDb) }}
              >
                {formatPrimarySinr(primaryUe?.sinrDb)}
              </div>
              <div className="showcase-consumer-stat-note">
                Published from starter truth only.
              </div>
            </article>

            <article className="showcase-consumer-stat-card">
              <div className="showcase-consumer-stat-label">Continuity Phase</div>
              <div
                data-testid="showcase-consumer-phase"
                className="showcase-consumer-phase"
              >
                {formatPhaseLabel(continuity?.phase)}
              </div>
              <div className="showcase-consumer-stat-note">
                Scene focus: {focusMode}
              </div>

              <div className="showcase-consumer-readiness-row">
                <div>
                  <div className="showcase-consumer-readiness-label">SINR Delta</div>
                  <div className="showcase-consumer-readiness-value">
                    {formatSignedDb(hoExplanation?.sinrDeltaDb)}
                  </div>
                </div>
                <div>
                  <div className="showcase-consumer-readiness-label">Need Offset</div>
                  <div className="showcase-consumer-readiness-value">
                    {formatSignalDescriptor(hoExplanation?.handoverOffsetDb, 'Waiting')}
                  </div>
                </div>
              </div>

              <div className="showcase-consumer-meter-copy">
                Trigger window: {formatTriggerWindow(
                  hoExplanation?.triggerProgressSec,
                  hoExplanation?.triggerThresholdSec,
                )}
              </div>
              <div className="showcase-consumer-meter-track" aria-hidden="true">
                <div
                  className="showcase-consumer-meter-fill"
                  style={{ width: `${triggerRatio * 100}%` }}
                />
              </div>
            </article>

            <article
              className="showcase-consumer-stat-card showcase-consumer-stat-card--controls"
              data-testid="showcase-consumer-view-controls"
            >
              <div className="showcase-consumer-stat-label">Viewer Controls</div>

              <div className="showcase-consumer-control-section">
                <div className="showcase-consumer-control-label">Camera</div>
                <div className="showcase-consumer-control-grid">
                  {CAMERA_PRESET_OPTIONS.map((option) => (
                    <ShowcaseControlButton
                      key={option.id}
                      label={option.label}
                      active={viewPreset === option.id}
                      onClick={() => setViewPreset(option.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="showcase-consumer-control-section">
                <div className="showcase-consumer-control-label">Overlay</div>
                <div className="showcase-consumer-control-grid">
                  {OVERLAY_MODE_OPTIONS.map((option) => (
                    <ShowcaseControlButton
                      key={option.id}
                      label={option.label}
                      active={overlayMode === option.id}
                      onClick={() => setOverlayMode(option.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="showcase-consumer-control-section">
                <div className="showcase-consumer-control-label">Labels</div>
                <div className="showcase-consumer-control-grid showcase-consumer-control-grid--single">
                  <ShowcaseControlButton
                    label={showSkyLabels ? 'Satellite Labels On' : 'Satellite Labels Off'}
                    active={showSkyLabels}
                    onClick={() => setShowSkyLabels((current) => !current)}
                  />
                </div>
              </div>
            </article>
          </div>
        </section>

        <section
          className="showcase-consumer-strip"
          data-testid="showcase-consumer-telemetry-strip"
        >
          {stripItems.map((item) => (
            <article key={`${item.label}-${item.value}`} className="showcase-consumer-strip-item">
              <div className="showcase-consumer-strip-label">{item.label}</div>
              <div className={`showcase-consumer-strip-value${item.tone ? ` showcase-consumer-strip-value--${item.tone}` : ''}`}>
                {item.value}
              </div>
            </article>
          ))}
        </section>

        <section
          className="showcase-consumer-panel-grid"
          data-testid="showcase-consumer-telemetry-panels"
        >
          <article className="showcase-consumer-panel">
            <div className="showcase-consumer-panel-header">
              <div className="showcase-consumer-panel-kicker">Serving vs comparison</div>
              <div className="showcase-consumer-panel-note">
                Rendered from starter truth and continuity narrative only.
              </div>
            </div>

            <div className="showcase-consumer-lane-grid">
              <section className="showcase-consumer-lane showcase-consumer-lane--serving">
                <div className="showcase-consumer-lane-label">Serving Beam</div>
                <div className="showcase-consumer-lane-value">{formatIdentity(servingSatId)}</div>
                <div className="showcase-consumer-lane-subvalue">
                  Beam {formatIdentity(primaryUe?.servingBeamId)}
                </div>
                <div className="showcase-consumer-lane-metrics">
                  <div className="showcase-consumer-lane-metric">
                    <span>Signal</span>
                    <strong>{formatPrimarySinr(primaryUe?.sinrDb)}</strong>
                  </div>
                  <div className="showcase-consumer-lane-metric">
                    <span>Elevation</span>
                    <strong>{formatElevation(hoExplanation?.servingElevationDeg ?? servingSat?.elevationDeg)}</strong>
                  </div>
                  <div className="showcase-consumer-lane-metric">
                    <span>Range</span>
                    <strong>{formatRangeKm(hoExplanation?.servingRangeKm ?? servingSat?.rangeKm)}</strong>
                  </div>
                </div>
              </section>

              <section className="showcase-consumer-lane showcase-consumer-lane--target">
                <div className="showcase-consumer-lane-label">{describeTargetLaneTitle(continuity)}</div>
                <div className="showcase-consumer-lane-value">{formatIdentity(targetSatId)}</div>
                <div className="showcase-consumer-lane-subvalue">
                  Beam {formatIdentity(
                    hoExplanation?.pendingTargetBeamId
                      ?? primaryUe?.targetBeamId
                      ?? primaryUe?.secondaryBeamId,
                  )}
                </div>
                <div className="showcase-consumer-lane-metrics">
                  <div className="showcase-consumer-lane-metric">
                    <span>Signal</span>
                    <strong>{formatSignalDescriptor(hoExplanation?.pendingTargetSinrDb)}</strong>
                  </div>
                  <div className="showcase-consumer-lane-metric">
                    <span>Elevation</span>
                    <strong>{formatElevation(hoExplanation?.pendingTargetElevationDeg ?? targetSat?.elevationDeg)}</strong>
                  </div>
                  <div className="showcase-consumer-lane-metric">
                    <span>Range</span>
                    <strong>{formatRangeKm(hoExplanation?.pendingTargetRangeKm ?? targetSat?.rangeKm)}</strong>
                  </div>
                </div>
                <div className="showcase-consumer-lane-note">
                  {describeTargetLaneNote({
                    continuity,
                    targetSatId,
                    hasExplainabilityTarget: Boolean(hoExplanation?.pendingTargetSatId),
                  })}
                </div>
              </section>
            </div>
          </article>

          <article className="showcase-consumer-panel">
            <div className="showcase-consumer-panel-header">
              <div className="showcase-consumer-panel-kicker">Narrative context</div>
              <div className="showcase-consumer-panel-note">
                Keeping the serving, source, target, and post-switch frame readable without widening truth.
              </div>
            </div>

            <div className="showcase-consumer-chip-row">
              <div className="showcase-consumer-chip showcase-consumer-chip--cool">
                Source {formatIdentity(recentSourceSatId)}
              </div>
              <div className="showcase-consumer-chip showcase-consumer-chip--warm">
                Target {formatIdentity(targetSatId)}
              </div>
              <div className="showcase-consumer-chip">
                Post-HO {formatIdentity(postHoSatId)}
              </div>
              <div className="showcase-consumer-chip">
                HO Count {formatWholeNumber(hoExplanation?.hoCount)}
              </div>
            </div>

            <div className="showcase-consumer-count-grid">
              <div className="showcase-consumer-count-card">
                <span>Display Sats</span>
                <strong>{formatWholeNumber(presentationFrame?.displaySatIds.length)}</strong>
              </div>
              <div className="showcase-consumer-count-card">
                <span>Event Sats</span>
                <strong>{formatWholeNumber(presentationFrame?.eventSatIds.length)}</strong>
              </div>
              <div className="showcase-consumer-count-card">
                <span>Beam Sats</span>
                <strong>{formatWholeNumber(presentationFrame?.beamSatIds.length)}</strong>
              </div>
              <div className="showcase-consumer-count-card">
                <span>Narrative Sats</span>
                <strong>{formatWholeNumber(continuity?.narrativeSatIds.length)}</strong>
              </div>
            </div>

            <div className="showcase-consumer-event-summary">
              Recent HO: {formatRecentHoSummary({
                recentSourceSatId,
                recentTargetSatId: latestHoEvent?.targetSatId ?? postHoSatId,
              })}
            </div>
          </article>
        </section>

        <section className="showcase-consumer-rail">
          <article className="showcase-consumer-rail-card showcase-consumer-rail-card--source">
            <div className="showcase-consumer-rail-label">Source</div>
            <div
              data-testid="showcase-consumer-source"
              className="showcase-consumer-rail-value showcase-consumer-rail-value--accent"
            >
              {sourceLabel}
            </div>
          </article>

          <article className="showcase-consumer-rail-card showcase-consumer-rail-card--path">
            <div className="showcase-consumer-rail-label">Deterministic Path</div>
            <div
              data-testid="showcase-consumer-deterministic-path"
              className="showcase-consumer-rail-value showcase-consumer-rail-value--mono"
            >
              {pathDisclosure}
            </div>
          </article>

          <article className="showcase-consumer-rail-card">
            <div className="showcase-consumer-rail-label">Serving Sat</div>
            <div className="showcase-consumer-rail-value">
              {formatIdentity(servingSatId)}
            </div>
          </article>

          <article className="showcase-consumer-rail-card">
            <div className="showcase-consumer-rail-label">Display / Beam Sats</div>
            <div className="showcase-consumer-rail-value">
              {formatWholeNumber(presentationFrame?.displaySatIds.length)}
              {' / '}
              {formatWholeNumber(presentationFrame?.beamSatIds.length)}
            </div>
          </article>

          <article className="showcase-consumer-rail-card">
            <div className="showcase-consumer-rail-label">Replay Time</div>
            <div className="showcase-consumer-rail-value">{currentReplayTime}</div>
          </article>
        </section>
      </div>

      <div
        className="showcase-consumer-scene"
        style={{ background: VISUAL_SCENE_CONFIG.background.gradient }}
      >
        <Canvas
          frameloop="demand"
          dpr={1}
          gl={{
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
            alpha: true,
            powerPreference: 'high-performance',
            antialias: false,
          }}
        >
          <CameraRig preset={viewPreset} />
          <LightingRig />
          <Suspense fallback={<LoaderOverlay />}>
            <NTPUScene />
          </Suspense>
          <Suspense fallback={null}>
            <UAV />
          </Suspense>
          <Suspense fallback={null}>
            <ShowcaseConsumerSceneLayer
              starter={starter}
              showBeamCones={showBeamCones}
              showLinks={showLinks}
              showBeamInfo={showBeamInfo}
              showSkyLabels={showSkyLabels}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
