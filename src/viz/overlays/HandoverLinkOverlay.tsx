/**
 * HandoverLinkOverlay — truth-driven UE↔satellite service/handover links.
 *
 * Reads serving / prepared / secondary / dual-active truth from SimulationSnapshot.
 * Does NOT invent intermediate states absent from snapshot truth.
 *
 * Link states rendered:
 *   serving      — solid cyan line, UE → serving satellite
 *   prepared     — dashed orange line, UE → prepared target satellite
 *   secondary    — solid green line, UE → secondary/dual-active target satellite
 *   dual-active  — serving + secondary shown simultaneously
 *
 * UE anchor: fixed world-space origin (observer center).
 * Satellite endpoint: dome position from projectToSkyDome.
 *
 * Donor: leo-beam-sim/src/viz/HandoverLinks.tsx (line style + role colors)
 *
 * VISUAL-ONLY / TRUTH-DRIVEN: reads snapshot fields only.
 *
 * @see sdd/ntn-sim-core-frontend-beam-visual-sdd.md §6.4, §7, §7.1
 */

import React, { useMemo } from 'react';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { SimulationSnapshot, SatelliteState } from '@/core/common/types';
import { usePublishValidationSection } from '@/viz/validation/store';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from '@/viz/satellite/observer-sky-projection';

// ---------------------------------------------------------------------------
// VISUAL-ONLY constants
// ---------------------------------------------------------------------------

/** Fixed UE anchor at scene center (observer position). */
const UE_ANCHOR: [number, number, number] = [0, 6, 0];

const MIN_ELEVATION_DEG = 5;

// Link styles — derived from leo-beam-sim donor
const LINK_STYLES = {
  serving: {
    color: '#18f0ff',
    lineWidth: 3.5,
    dashed: false,
    opacity: 0.9,
    label: 'serving',
  },
  target: {
    color: '#ff9d1c',
    lineWidth: 2.4,
    dashed: true,
    opacity: 0.85,
    label: 'prepared',
  },
  secondary: {
    color: '#00ff88',
    lineWidth: 3.0,
    dashed: false,
    opacity: 0.9,
    label: 'secondary',
  },
  postHo: {
    color: '#7a5cff',
    lineWidth: 2.8,
    dashed: false,
    opacity: 0.8,
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

function computeRenderedLinkStyles(snapshot: SimulationSnapshot | null): Array<keyof typeof LINK_STYLES> {
  if (!snapshot) return [];

  const primaryUe = snapshot.ues[0] ?? null;
  if (!primaryUe) return [];

  const hasVisibleSat = (satId: string | null | undefined) =>
    Boolean(satId && snapshot.satellites.some((sat) => sat.id === satId && sat.isVisible && sat.elevationDeg > MIN_ELEVATION_DEG));

  const { servingSatId, targetSatId, secondarySatId, continuityState } = primaryUe;
  const daps = snapshot.daps;

  if (daps?.phase === 'dual-active' || continuityState === 'dual-active') {
    const styles: Array<keyof typeof LINK_STYLES> = [];
    if (hasVisibleSat(daps?.sourceSatId ?? servingSatId)) styles.push('dapsSource');
    if (hasVisibleSat(daps?.targetSatId ?? secondarySatId)) styles.push('dapsTarget');
    return styles;
  }

  const styles: Array<keyof typeof LINK_STYLES> = [];
  if (hasVisibleSat(servingSatId)) styles.push('serving');
  if (continuityState === 'prepared' && hasVisibleSat(targetSatId)) styles.push('target');
  if (continuityState === 'post-ho' && hasVisibleSat(targetSatId)) styles.push('postHo');
  if (!continuityState && hasVisibleSat(targetSatId)) styles.push('target');
  if (hasVisibleSat(secondarySatId)) styles.push('secondary');
  return styles;
}

// ---------------------------------------------------------------------------
// Single link component
// ---------------------------------------------------------------------------

const ENDPOINT_SPHERE = new THREE.SphereGeometry(1.4, 8, 8);
const UE_SPHERE = new THREE.SphereGeometry(1.6, 8, 8);

const ServiceLink = React.memo(function ServiceLink({
  sat,
  styleKey,
}: {
  sat: SatelliteState;
  styleKey: keyof typeof LINK_STYLES;
}) {
  const style = LINK_STYLES[styleKey];
  const satPos = useMemo(
    () => projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION),
    [sat.azimuthDeg, sat.elevationDeg],
  );

  const endpoint: [number, number, number] = [satPos[0], satPos[1], satPos[2]];
  const midpoint: [number, number, number] = [
    (UE_ANCHOR[0] + endpoint[0]) * 0.45,
    (UE_ANCHOR[1] + endpoint[1]) * 0.45,
    (UE_ANCHOR[2] + endpoint[2]) * 0.45,
  ];

  const satBadge = sat.id.replace(/^(starlink|oneweb|walker)-?/i, '').slice(0, 12);

  return (
    <group>
      <Line
        points={[UE_ANCHOR, endpoint]}
        color={style.color}
        lineWidth={style.lineWidth}
        transparent
        opacity={style.opacity}
        dashed={style.dashed}
        dashSize={12}
        gapSize={7}
        depthWrite={false}
      />
      {/* UE endpoint sphere */}
      <mesh geometry={UE_SPHERE} position={UE_ANCHOR}>
        <meshBasicMaterial color="#dff8ff" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      {/* Satellite endpoint sphere */}
      <mesh geometry={ENDPOINT_SPHERE} position={endpoint}>
        <meshBasicMaterial color={style.color} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      {/* Satellite ID label */}
      <Text
        position={[endpoint[0], endpoint[1] + 14, endpoint[2]]}
        fontSize={9}
        color={style.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={1.5}
        outlineColor="#000000"
        renderOrder={21}
        material-depthTest={false}
        material-depthWrite={false}
      >
        {satBadge}
      </Text>
      {/* Mid-link role label */}
      <Text
        position={[midpoint[0], midpoint[1] + 8, midpoint[2]]}
        fontSize={9}
        color={style.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={1.5}
        outlineColor="#000000"
      >
        {style.label}
      </Text>
    </group>
  );
});

// ---------------------------------------------------------------------------
// Main overlay
// ---------------------------------------------------------------------------

export interface HandoverLinkOverlayProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
}

export const HandoverLinkOverlay = React.memo(function HandoverLinkOverlay({
  snapshot,
  visible = true,
}: HandoverLinkOverlayProps) {
  const primaryUe = snapshot?.ues[0] ?? null;
  const observedStyleKeysRef = React.useRef(new Set<string>());
  const observedDapsPhasesRef = React.useRef(new Set<string>());
  const renderedStyles = useMemo(
    () => (snapshot && visible ? computeRenderedLinkStyles(snapshot) : []),
    [snapshot, visible],
  );

  const validationSummary = useMemo(() => {
    renderedStyles.forEach((styleKey) => observedStyleKeysRef.current.add(styleKey));
    if (snapshot?.daps?.phase) {
      observedDapsPhasesRef.current.add(snapshot.daps.phase);
    }

    return {
      present: renderedStyles.length > 0,
      styleKeys: renderedStyles,
      observedStyleKeys: [...observedStyleKeysRef.current],
      continuityState: primaryUe?.continuityState ?? null,
      dapsPhase: snapshot?.daps?.phase ?? null,
      observedDapsPhases: [...observedDapsPhasesRef.current],
    };
  }, [primaryUe?.continuityState, renderedStyles, snapshot?.daps?.phase]);

  usePublishValidationSection('handoverLinkOverlay', validationSummary);

  if (!snapshot || !visible || !primaryUe || renderedStyles.length === 0) return null;

  const {
    servingSatId,
    targetSatId,
    secondarySatId,
    continuityState,
  } = primaryUe;
  const daps = snapshot.daps;

  // Find satellite objects by ID
  const byId = (id: string | null): SatelliteState | undefined =>
    id ? snapshot.satellites.find((s) => s.id === id && s.isVisible && s.elevationDeg > MIN_ELEVATION_DEG) : undefined;

  if (daps?.phase === 'dual-active' || continuityState === 'dual-active') {
    const srcSat = byId(daps?.sourceSatId ?? servingSatId);
    const tgtSat = byId(daps?.targetSatId ?? secondarySatId ?? null);
    return (
      <group name="handover-link-overlay">
        {srcSat && <ServiceLink sat={srcSat} styleKey="dapsSource" />}
        {tgtSat && <ServiceLink sat={tgtSat} styleKey="dapsTarget" />}
      </group>
    );
  }

  // Normal: serving link + optional prepared or secondary target
  const servingSat = byId(servingSatId);
  const preparedSat = byId(targetSatId ?? null);
  const secondarySat = byId(secondarySatId ?? null);

  return (
    <group name="handover-link-overlay">
      {servingSat && <ServiceLink sat={servingSat} styleKey="serving" />}
      {continuityState === 'prepared' && preparedSat && <ServiceLink sat={preparedSat} styleKey="target" />}
      {continuityState === 'post-ho' && preparedSat && <ServiceLink sat={preparedSat} styleKey="postHo" />}
      {!continuityState && preparedSat && <ServiceLink sat={preparedSat} styleKey="target" />}
      {secondarySat && <ServiceLink sat={secondarySat} styleKey="secondary" />}
    </group>
  );
});
