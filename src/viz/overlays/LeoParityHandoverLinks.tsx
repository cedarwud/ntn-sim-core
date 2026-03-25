import React, { useMemo } from 'react';
import { Line, Text } from '@react-three/drei';

import type { SimulationSnapshot, SatelliteState } from '@/core/common/types';
import { usePublishValidationSection } from '@/viz/validation/store';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from '@/viz/satellite/observer-sky-projection';

const UE_ANCHOR: [number, number, number] = [0, 6, 0];
const MIN_ELEVATION_DEG = 5;

const LINK_STYLES = {
  serving: {
    color: '#18f0ff',
    lineWidth: 3.5,
    dashed: false,
    opacity: 0.9,
    label: 'serving',
  },
  prepared: {
    color: '#ff9d1c',
    lineWidth: 2.4,
    dashed: true,
    opacity: 0.85,
    label: 'prepared',
  },
  secondary: {
    color: '#ff5ab3',
    lineWidth: 2.2,
    dashed: true,
    opacity: 0.75,
    label: 'secondary',
  },
  postHo: {
    color: '#4f8cff',
    lineWidth: 3.2,
    dashed: false,
    opacity: 0.9,
    label: 'post-ho',
  },
  dapsSource: {
    color: '#00ff88',
    lineWidth: 3.0,
    dashed: false,
    opacity: 0.85,
    label: 'DAPS src',
  },
  dapsTarget: {
    color: '#00e5ff',
    lineWidth: 3.0,
    dashed: false,
    opacity: 0.9,
    label: 'DAPS tgt',
  },
} as const;

type LinkStyleKey = keyof typeof LINK_STYLES;

function buildLinkStyles(snapshot: SimulationSnapshot | null): LinkStyleKey[] {
  if (!snapshot) return [];
  const primaryUe = snapshot.ues[0] ?? null;
  if (!primaryUe) return [];

  const hasVisibleSat = (satId: string | null | undefined) =>
    Boolean(
      satId &&
        snapshot.satellites.some(
          (sat) => sat.id === satId && sat.isVisible && sat.elevationDeg > MIN_ELEVATION_DEG,
        ),
    );

  const styles: LinkStyleKey[] = [];
  const { servingSatId, targetSatId, secondarySatId, continuityState } = primaryUe;

  if (snapshot.daps?.phase === 'dual-active' || continuityState === 'dual-active') {
    if (hasVisibleSat(snapshot.daps?.sourceSatId ?? servingSatId)) styles.push('dapsSource');
    if (hasVisibleSat(snapshot.daps?.targetSatId ?? secondarySatId)) styles.push('dapsTarget');
    return styles;
  }

  if (hasVisibleSat(servingSatId)) styles.push('serving');
  if (continuityState === 'prepared' && hasVisibleSat(targetSatId)) styles.push('prepared');
  if (continuityState === 'post-ho' && hasVisibleSat(targetSatId)) styles.push('postHo');
  if (continuityState !== 'prepared' && continuityState !== 'post-ho' && hasVisibleSat(targetSatId)) {
    styles.push('prepared');
  }
  if (hasVisibleSat(secondarySatId)) styles.push('secondary');
  return styles;
}

const ParityLink = React.memo(function ParityLink({
  sat,
  styleKey,
  showLabels,
}: {
  sat: SatelliteState;
  styleKey: LinkStyleKey;
  showLabels: boolean;
}) {
  const style = LINK_STYLES[styleKey];
  const satPos = useMemo(
    () => projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION),
    [sat.azimuthDeg, sat.elevationDeg],
  );
  const endpoint: [number, number, number] = [satPos[0], satPos[1], satPos[2]];
  const midpoint: [number, number, number] = [
    (UE_ANCHOR[0] + endpoint[0]) * 0.42,
    (UE_ANCHOR[1] + endpoint[1]) * 0.42,
    (UE_ANCHOR[2] + endpoint[2]) * 0.42,
  ];

  return (
    <group>
      <Line
        points={[UE_ANCHOR, endpoint]}
        color={style.color}
        lineWidth={style.lineWidth}
        transparent
        opacity={style.opacity}
        dashed={style.dashed}
        dashSize={14}
        gapSize={8}
        depthWrite={false}
      />
      {showLabels && (
        <Text
          position={[midpoint[0], midpoint[1] + 8, midpoint[2]]}
          fontSize={styleKey === 'serving' || styleKey === 'postHo' ? 12 : 10}
          color={style.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={1.5}
          outlineColor="#000000"
        >
          {style.label}
        </Text>
      )}
    </group>
  );
});

export interface LeoParityHandoverLinksProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
  showLabels?: boolean;
}

export const LeoParityHandoverLinks = React.memo(function LeoParityHandoverLinks({
  snapshot,
  visible = true,
  showLabels = true,
}: LeoParityHandoverLinksProps) {
  const primaryUe = snapshot?.ues[0] ?? null;
  const observedStyleKeysRef = React.useRef(new Set<string>());
  const observedDapsPhasesRef = React.useRef(new Set<string>());
  const renderedStyles = useMemo(() => (snapshot && visible ? buildLinkStyles(snapshot) : []), [snapshot, visible]);

  const validationSummary = useMemo(() => {
    renderedStyles.forEach((styleKey) => observedStyleKeysRef.current.add(styleKey));
    if (snapshot?.daps?.phase) observedDapsPhasesRef.current.add(snapshot.daps.phase);
    return {
      present: renderedStyles.length > 0,
      styleKeys: renderedStyles,
      observedStyleKeys: [...observedStyleKeysRef.current],
      continuityState: primaryUe?.continuityState ?? null,
      dapsPhase: snapshot?.daps?.phase ?? null,
      observedDapsPhases: [...observedDapsPhasesRef.current],
      viewMode: 'leo-parity',
    };
  }, [primaryUe?.continuityState, renderedStyles, snapshot?.daps?.phase]);

  usePublishValidationSection('handoverLinkOverlay', validationSummary);

  if (!snapshot || !visible || !primaryUe || renderedStyles.length === 0) return null;

  const byId = (id: string | null | undefined): SatelliteState | undefined =>
    id
      ? snapshot.satellites.find((sat) => sat.id === id && sat.isVisible && sat.elevationDeg > MIN_ELEVATION_DEG)
      : undefined;

  const satByStyle: Partial<Record<LinkStyleKey, SatelliteState | undefined>> = {
    serving: byId(primaryUe.servingSatId),
    prepared: byId(primaryUe.targetSatId),
    secondary: byId(primaryUe.secondarySatId),
    postHo: byId(primaryUe.targetSatId),
    dapsSource: byId(snapshot.daps?.sourceSatId ?? primaryUe.servingSatId),
    dapsTarget: byId(snapshot.daps?.targetSatId ?? primaryUe.secondarySatId),
  };

  return (
    <group name="leo-parity-handover-links">
      {renderedStyles.map((styleKey) => {
        const sat = satByStyle[styleKey];
        if (!sat) return null;
        return (
          <ParityLink
            key={`${styleKey}-${sat.id}`}
            sat={sat}
            styleKey={styleKey}
            showLabels={showLabels}
          />
        );
      })}
    </group>
  );
});
