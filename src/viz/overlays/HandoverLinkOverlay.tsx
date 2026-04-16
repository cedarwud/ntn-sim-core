/**
 * HandoverLinkOverlay — truth-driven UE↔satellite service/handover links.
 *
 * Reads serving / prepared / secondary / dual-active truth from SimulationSnapshot.
 * Does NOT invent intermediate states absent from snapshot truth.
 *
 * Link states rendered:
 *   serving      — solid cyan line, UE → serving satellite
 *   prepared     — dashed amber line, UE → prepared target satellite
 *   secondary    — solid magenta line, UE → secondary/dual-active target satellite
 *   dual-active  — serving + secondary shown simultaneously
 *
 * UE anchor: fixed world-space origin (observer center).
 * Satellite endpoint: dome position from projectToSkyDome.
 *
 * Donor: leo-beam-sim/src/viz/HandoverLinks.tsx (line style + role colors)
 *
 * VISUAL-ONLY / TRUTH-DRIVEN: reads snapshot fields only.
 * The dashed target link is only shown for explicit prepared truth, not merely
 * because a targetSatId happens to be present in snapshot state.
 *
 * @see sdd/ntn-sim-core-frontend-beam-visual-sdd.md §6.4, §7, §7.1
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { SimulationSnapshot, SatelliteState } from '@/core/contracts/runtime-v1';
import type { BeamPresentationFrame } from '@/viz/presentation';
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
    lineWidth: 3.8,
    dashed: false,
    opacity: 0.94,
    label: 'serving',
  },
  target: {
    color: '#ffb000',
    lineWidth: 2.8,
    dashed: true,
    opacity: 0.9,
    label: 'prepared',
  },
  secondary: {
    color: '#ff5ab3',
    lineWidth: 3.2,
    dashed: false,
    opacity: 0.92,
    label: 'secondary',
  },
  postHo: {
    color: '#8c6dff',
    lineWidth: 2.8,
    dashed: false,
    opacity: 0.8,
    label: 'post-ho',
  },
  dapsSource: {
    color: '#18f0ff',
    lineWidth: 3.4,
    dashed: false,
    opacity: 0.9,
    label: 'DAPS src',
  },
  dapsTarget: {
    color: '#ff5ab3',
    lineWidth: 3.4,
    dashed: false,
    opacity: 0.9,
    label: 'DAPS tgt',
  },
} as const;

function computeRenderedLinkStyles(
  snapshot: SimulationSnapshot | null,
  presentationFrame: BeamPresentationFrame | null,
): Array<keyof typeof LINK_STYLES> {
  const narrative = presentationFrame?.continuityNarrative ?? null;
  if (!snapshot || !narrative) return [];

  const hasVisibleSat = (satId: string | null | undefined) =>
    Boolean(
      satId
        && snapshot.satellites.some(
          (sat) =>
            sat.id === satId
            && sat.isVisible
            && sat.elevationDeg > MIN_ELEVATION_DEG,
        ),
    );

  if (narrative.phase === 'dual-active') {
    const styles: Array<keyof typeof LINK_STYLES> = [];
    if (hasVisibleSat(narrative.sourceSatId ?? narrative.servingSatId)) styles.push('dapsSource');
    if (hasVisibleSat(narrative.targetSatId)) styles.push('dapsTarget');
    return styles;
  }

  const styles: Array<keyof typeof LINK_STYLES> = [];
  if (hasVisibleSat(narrative.servingSatId)) styles.push('serving');
  if (narrative.phase === 'prepared' && hasVisibleSat(narrative.targetSatId)) {
    styles.push('target');
  }
  if (narrative.phase === 'post-switch' && hasVisibleSat(narrative.postHoSatId)) {
    styles.push('postHo');
  }
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
  crossfadeProgressRef,
}: {
  sat: SatelliteState;
  styleKey: keyof typeof LINK_STYLES;
  /** Shared ref; non-zero only for the serving link during prepared crossfade. */
  crossfadeProgressRef?: React.MutableRefObject<number>;
}) {
  const style = LINK_STYLES[styleKey];
  const lineRef = useRef<any>(null);

  // Per-frame: mutate material opacity to reflect crossfade without triggering React re-render.
  useFrame(() => {
    const mat = lineRef.current?.material as (THREE.Material & { opacity: number }) | null;
    if (!mat || !crossfadeProgressRef) return;
    const p = crossfadeProgressRef.current;
    mat.opacity = style.opacity * (1 - p * 0.65);
  });

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
        ref={lineRef}
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

/**
 * AnimatedTargetLink — prepared/target link with marching-ants dash + opacity pulse.
 *
 * Marching ants: dashOffset advances every frame, creating a "moving dashes" effect
 * that signals the system is actively assessing this candidate for handover.
 * Opacity pulse (~1.5 Hz) adds a secondary cue of "pending decision".
 *
 * VISUAL-ONLY: no physics, no state writes.
 */
const AnimatedTargetLink = React.memo(function AnimatedTargetLink({
  sat,
  styleKey,
}: {
  sat: SatelliteState;
  styleKey: keyof typeof LINK_STYLES;
}) {
  const style = LINK_STYLES[styleKey];
  const lineRef = useRef<any>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const mat = lineRef.current?.material as (THREE.Material & { opacity: number; dashOffset: number }) | null;
    if (!mat) return;
    // Marching ants: advance dash pattern forward at 20 world-units/sec
    mat.dashOffset -= delta * 20;
    // Opacity pulse: ±0.15 at 1.5 Hz
    mat.opacity = Math.max(0.45, Math.min(1.0, style.opacity + 0.15 * Math.sin(timeRef.current * 1.5 * Math.PI * 2)));
  });

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
        ref={lineRef}
        points={[UE_ANCHOR, endpoint]}
        color={style.color}
        lineWidth={style.lineWidth}
        transparent
        opacity={style.opacity}
        dashed
        dashSize={12}
        gapSize={7}
        depthWrite={false}
      />
      {/* UE endpoint sphere */}
      <mesh geometry={UE_SPHERE} position={UE_ANCHOR}>
        <meshBasicMaterial color="#dff8ff" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      {/* Satellite endpoint sphere — pulsing to match the line */}
      <mesh geometry={ENDPOINT_SPHERE} position={endpoint}>
        <meshBasicMaterial color={style.color} transparent opacity={0.7} depthWrite={false} />
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
  presentationFrame: BeamPresentationFrame | null;
  visible?: boolean;
}

export const HandoverLinkOverlay = React.memo(function HandoverLinkOverlay({
  snapshot,
  presentationFrame,
  visible = true,
}: HandoverLinkOverlayProps) {
  const primaryUe = snapshot?.ues[0] ?? null;
  const narrative = presentationFrame?.continuityNarrative ?? null;
  const observedStyleKeysRef = React.useRef(new Set<string>());
  const observedDapsPhasesRef = React.useRef(new Set<string>());
  const observedDualActiveTruthRef = React.useRef(false);

  // Crossfade: animate serving link fade-out when a prepared target appears.
  // progress 0→1 over CROSSFADE_DURATION seconds; resets when target disappears.
  const CROSSFADE_DURATION = 0.6;
  const crossfadeProgressRef = useRef(0);
  const prevHasTargetRef = useRef(false);

  const hasPreparedTarget = narrative?.phase === 'prepared';

  useFrame((_, delta) => {
    if (hasPreparedTarget) {
      crossfadeProgressRef.current = Math.min(1, crossfadeProgressRef.current + delta / CROSSFADE_DURATION);
    } else {
      // Reset instantly when target disappears (post-HO or idle)
      crossfadeProgressRef.current = 0;
    }
    prevHasTargetRef.current = hasPreparedTarget;
  });
  const renderedStyles = useMemo(
    () => (snapshot && visible ? computeRenderedLinkStyles(snapshot, presentationFrame) : []),
    [presentationFrame, snapshot, visible],
  );

  const validationSummary = useMemo(() => {
    renderedStyles.forEach((styleKey) => observedStyleKeysRef.current.add(styleKey));
    if (snapshot?.daps?.phase) {
      observedDapsPhasesRef.current.add(snapshot.daps.phase);
    }
    if (
      narrative?.phase === 'dual-active'
      && renderedStyles.includes('dapsSource')
      && renderedStyles.includes('dapsTarget')
    ) {
      observedDualActiveTruthRef.current = true;
    }

    return {
      present: renderedStyles.length > 0,
      styleKeys: renderedStyles,
      observedStyleKeys: [...observedStyleKeysRef.current],
      continuityState: primaryUe?.continuityState ?? null,
      dapsPhase: snapshot?.daps?.phase ?? null,
      narrativePhase: narrative?.phase ?? null,
      narrativeServingSatId: narrative?.servingSatId ?? null,
      narrativeSourceSatId: narrative?.sourceSatId ?? null,
      narrativeTargetSatId: narrative?.targetSatId ?? null,
      narrativePostHoSatId: narrative?.postHoSatId ?? null,
      cooledDownSatIds: narrative?.cooledDownSatIds ?? [],
      cooldownSuppressedTargetSatId: narrative?.cooldownSuppressedTargetSatId ?? null,
      observedDapsPhases: [...observedDapsPhasesRef.current],
      observedDualActiveTruth: observedDualActiveTruthRef.current,
    };
  }, [narrative, primaryUe?.continuityState, renderedStyles, snapshot?.daps?.phase]);

  usePublishValidationSection('handoverLinkOverlay', validationSummary);

  if (!snapshot || !presentationFrame || !visible || !primaryUe || !narrative || renderedStyles.length === 0) {
    return null;
  }

  // Find satellite objects by ID
  const byId = (id: string | null): SatelliteState | undefined =>
    id
      ? snapshot.satellites.find(
        (s) =>
          s.id === id
          && s.isVisible
          && s.elevationDeg > MIN_ELEVATION_DEG,
      )
      : undefined;

  if (narrative.phase === 'dual-active') {
    const srcSat = byId(narrative.sourceSatId ?? narrative.servingSatId);
    const tgtSat = byId(narrative.targetSatId);
    return (
      <group name="handover-link-overlay">
        {srcSat && <ServiceLink sat={srcSat} styleKey="dapsSource" />}
        {tgtSat && <ServiceLink sat={tgtSat} styleKey="dapsTarget" />}
      </group>
    );
  }

  const servingSat = byId(narrative.servingSatId);
  const preparedSat = byId(narrative.targetSatId);
  const postHoSat = byId(narrative.postHoSatId);

  return (
    <group name="handover-link-overlay">
      {servingSat && (
        <ServiceLink
          sat={servingSat}
          styleKey="serving"
          crossfadeProgressRef={hasPreparedTarget ? crossfadeProgressRef : undefined}
        />
      )}
      {narrative.phase === 'prepared' && preparedSat && (
        <AnimatedTargetLink sat={preparedSat} styleKey="target" />
      )}
      {narrative.phase === 'post-switch' && postHoSat && (
        <ServiceLink sat={postHoSat} styleKey="postHo" />
      )}
    </group>
  );
});
