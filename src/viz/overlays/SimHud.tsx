/**
 * SimHud — HTML overlay showing simulation statistics.
 *
 * Rendered OUTSIDE the R3F Canvas. Uses pointer-events: none
 * so it never blocks 3D interaction.
 */

import React from 'react';
import type { ContinuityNarrativeState } from '@/viz/presentation';

export interface SimHudProps {
  simTimeSec: number;
  totalDurationSec: number;
  satelliteCount: number;
  visibleCount: number;
  servingSatId: string | null;
  handoverCount: number;
  profileId: string;
  isReady: boolean;
  replaySelection?: string | null;
  replayWindowStartSec?: number | null;
  replayWindowEndSec?: number | null;
  modeLabel?: string;
  truthSourceLabel?: string | null;
  bundleSlotIndex?: number | null;
  bundleSlotCount?: number | null;
  statusLabel?: string | null;
}

export interface BundleTruthHudProps {
  currentSlotIndex: number | null;
  slotCount: number | null;
  sourceLabel: string;
  servingSatId: string | null;
  servingBeamId: string | null;
  handoverCount: number;
  handoverKind: string | null;
  continuityNarrative: ContinuityNarrativeState | null;
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  zIndex: 10,
  pointerEvents: 'none',
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  fontSize: 13,
  lineHeight: 1.6,
  color: '#e0e0e0',
  background: 'rgba(0, 0, 0, 0.65)',
  borderRadius: 6,
  padding: '12px 16px',
  backdropFilter: 'blur(4px)',
  userSelect: 'none',
  minWidth: 280,
};

const titleStyle: React.CSSProperties = {
  color: '#4fc3f7',
  fontWeight: 700,
  fontSize: 14,
  marginBottom: 4,
};

const separatorStyle: React.CSSProperties = {
  color: '#555',
  margin: '2px 0 4px',
};

const labelStyle: React.CSSProperties = {
  color: '#888',
};

function titleizeHyphenated(value: string | null | undefined): string {
  if (!value) return 'Not specified';
  return value
    .split(/[-_]/g)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatReplayTruthNarrative(handoverKind: string | null | undefined): string {
  switch (handoverKind) {
    case 'inter-satellite-handover':
      return 'Inter-satellite handover';
    case 'intra-satellite-beam-switch':
      return 'Intra-satellite beam switch';
    case 'none':
    default:
      return 'Stable serving';
  }
}

export const SimHud = React.memo(function SimHud({
  simTimeSec,
  totalDurationSec,
  satelliteCount,
  visibleCount,
  servingSatId,
  handoverCount,
  profileId,
  isReady,
  replaySelection,
  replayWindowStartSec,
  replayWindowEndSec,
  modeLabel,
  truthSourceLabel,
  bundleSlotIndex,
  bundleSlotCount,
  statusLabel,
}: SimHudProps) {
  if (!isReady) return null;

  return (
    <div style={containerStyle} data-testid="sim-hud">
      <div style={titleStyle}>
        NTN-SIM-CORE{' '}
        <span style={{ color: '#888', fontWeight: 400 }}>| {profileId}</span>
      </div>
      <div style={separatorStyle}>{'─'.repeat(36)}</div>
      {modeLabel && (
        <div>
          <span style={labelStyle}>Mode: </span>
          {modeLabel}
        </div>
      )}
      {truthSourceLabel && (
        <div>
          <span style={labelStyle}>Truth: </span>
          {truthSourceLabel}
        </div>
      )}
      {bundleSlotIndex !== undefined && bundleSlotIndex !== null && bundleSlotCount !== undefined && bundleSlotCount !== null && (
        <div>
          <span style={labelStyle}>Bundle Slot: </span>
          {bundleSlotIndex} / {bundleSlotCount}
        </div>
      )}
      <div>
        <span style={labelStyle}>Time: </span>
        {simTimeSec.toFixed(1)}s / {totalDurationSec}s
      </div>
      <div>
        <span style={labelStyle}>Satellites: </span>
        {visibleCount} visible / {satelliteCount} total
      </div>
      <div>
        <span style={labelStyle}>Serving: </span>
        {servingSatId ?? '—'}
      </div>
      <div>
        <span style={labelStyle}>Handovers: </span>
        {handoverCount}
      </div>
      {statusLabel && (
        <div>
          <span style={labelStyle}>Status: </span>
          {statusLabel}
        </div>
      )}
      {replaySelection && (
        <>
          <div>
            <span style={labelStyle}>Replay: </span>
            {replaySelection}
          </div>
          <div>
            <span style={labelStyle}>Window: </span>
            {replayWindowStartSec?.toFixed(1) ?? '—'}s → {replayWindowEndSec?.toFixed(1) ?? '—'}s
          </div>
        </>
      )}
    </div>
  );
});

export const BundleTruthHud = React.memo(function BundleTruthHud({
  currentSlotIndex,
  slotCount,
  sourceLabel,
  servingSatId,
  servingBeamId,
  handoverCount,
  handoverKind,
  continuityNarrative,
}: BundleTruthHudProps) {
  return (
    <div style={containerStyle} data-testid="bundle-truth-hud">
      <div style={titleStyle}>
        BUNDLE TRUTH HUD{' '}
        <span style={{ color: '#888', fontWeight: 400 }}>| {sourceLabel}</span>
      </div>
      <div style={separatorStyle}>{'─'.repeat(36)}</div>
      <div>
        <span style={labelStyle}>Truth: </span>
        <span data-testid="bundle-hud-truth-source">MODQN bundle replay</span>
      </div>
      <div>
        <span style={labelStyle}>Slot: </span>
        <span data-testid="bundle-hud-slot">
          {currentSlotIndex ?? '—'} / {slotCount ?? '—'}
        </span>
      </div>
      <div>
        <span style={labelStyle}>Serving Sat: </span>
        <span data-testid="bundle-hud-serving-sat">{servingSatId ?? '—'}</span>
      </div>
      <div>
        <span style={labelStyle}>Serving Beam: </span>
        <span data-testid="bundle-hud-serving-beam">{servingBeamId ?? '—'}</span>
      </div>
      <div>
        <span style={labelStyle}>Narrative: </span>
        <span
          data-testid="bundle-hud-narrative-label"
          data-scene-phase={continuityNarrative?.phase ?? ''}
        >
          {formatReplayTruthNarrative(handoverKind)}
        </span>
      </div>
      <div>
        <span style={labelStyle}>Handover Kind: </span>
        <span data-testid="bundle-hud-handover-kind">
          {titleizeHyphenated(handoverKind)}
        </span>
      </div>
      <div>
        <span style={labelStyle}>Handovers: </span>
        <span data-testid="bundle-hud-handover-count">{handoverCount}</span>
      </div>
    </div>
  );
});
