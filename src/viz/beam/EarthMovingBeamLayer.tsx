/**
 * EarthMovingBeamLayer — engine-driven multi-beam renderer.
 *
 * Renders beam cones for serving + handover-relevant satellites.
 * Each beam: oblique cone, ground disc, center line, label.
 * On-slot = solid line + bright; off-slot = dashed line + dim.
 *
 * VISUAL-ONLY: Does NOT affect physics, SINR, or KPI.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { SimulationSnapshot, SatelliteState, SatelliteBeamSnapshot } from '@/core/contracts/runtime-v1';
import type {
  BeamPresentationBeamAccent,
  BeamPresentationFrame,
} from '@/viz/presentation';
import { usePublishValidationSection } from '@/viz/validation/store';
import { MOVING_BEAM_GROUND_Y } from './beam-visual-constants';
import { buildRenderedBeamPlans } from './earth-moving-beam-plans';
import { buildEarthMovingBeamLayerSummary } from './earth-moving-beam-validation';

// ---------------------------------------------------------------------------
// VISUAL-ONLY constants
// ---------------------------------------------------------------------------

const SEGMENTS = 32;

const SERVING_COLOR = '#0088ff';
const PREPARED_COLOR = '#ffb000';
const SECONDARY_COLOR = '#ff5ab3';
const POST_HO_COLOR = '#7a5cff';
const NEUTRAL_PRIMARY_WARM = '#ff9647';
const NEUTRAL_PRIMARY_COOL = '#4cc8ff';
const NEUTRAL_CONTEXT_WARM = '#ffc079';
const NEUTRAL_CONTEXT_COOL = '#84d7ff';
const INACTIVE_CONTEXT_WARM = '#8a5f46';
const INACTIVE_CONTEXT_COOL = '#4d6277';

// ---------------------------------------------------------------------------
// Color + style
// ---------------------------------------------------------------------------

interface BeamStyle {
  cone: number;
  disc: number;
  line: number;
  width: number;
  dashed: boolean;
}

function beamOrdinal(beam: SatelliteBeamSnapshot): number {
  const match = beam.beamId.match(/-b(\d+)$/);
  if (match) return Number(match[1]);
  return [...beam.beamId].reduce((hash, char) => hash + char.charCodeAt(0), 0);
}

function getBeamColor(
  beam: SatelliteBeamSnapshot,
  accent: BeamPresentationBeamAccent,
): string {
  const isWarmBeam = beamOrdinal(beam) % 2 === 1;
  switch (accent) {
    case 'serving':
      return SERVING_COLOR;
    case 'prepared':
      return PREPARED_COLOR;
    case 'secondary':
      return SECONDARY_COLOR;
    case 'post-ho':
      return POST_HO_COLOR;
    case 'neutral-primary':
      return isWarmBeam ? NEUTRAL_PRIMARY_WARM : NEUTRAL_PRIMARY_COOL;
    case 'neutral-context':
      return isWarmBeam ? NEUTRAL_CONTEXT_WARM : NEUTRAL_CONTEXT_COOL;
    case 'inactive-context':
      return isWarmBeam ? INACTIVE_CONTEXT_WARM : INACTIVE_CONTEXT_COOL;
  }
}

function getBeamStyle(
  beam: SatelliteBeamSnapshot,
  accent: BeamPresentationBeamAccent,
): BeamStyle {
  if (accent === 'serving') {
    return beam.isActive
      ? { cone: 0.35, disc: 0.22, line: 1.0, width: 4, dashed: false }
      : { cone: 0.22, disc: 0.14, line: 0.96, width: 4, dashed: true };
  }
  if (accent === 'prepared') {
    return beam.isActive
      ? { cone: 0.30, disc: 0.20, line: 0.90, width: 3.4, dashed: true }
      : { cone: 0.18, disc: 0.12, line: 0.60, width: 2.4, dashed: true };
  }
  if (accent === 'secondary') {
    return beam.isActive
      ? { cone: 0.33, disc: 0.21, line: 0.95, width: 3.8, dashed: false }
      : { cone: 0.20, disc: 0.13, line: 0.70, width: 2.8, dashed: true };
  }
  if (accent === 'post-ho') {
    return beam.isActive
      ? { cone: 0.24, disc: 0.16, line: 0.80, width: 3.0, dashed: false }
      : { cone: 0.14, disc: 0.09, line: 0.55, width: 2.2, dashed: true };
  }
  if (accent === 'inactive-context' || !beam.isActive) {
    return { cone: 0.08, disc: 0.05, line: 0.38, width: 1.8, dashed: true };
  }
  if (accent === 'neutral-primary') {
    return { cone: 0.22, disc: 0.14, line: 0.78, width: 2.8, dashed: false };
  }
  return { cone: 0.13, disc: 0.08, line: 0.54, width: 2.0, dashed: false };
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function createObliqueConeSide(
  apex: [number, number, number],
  cx: number,
  cz: number,
  radius: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  positions.push(apex[0], apex[1], apex[2]);
  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    positions.push(cx + Math.cos(angle) * radius, MOVING_BEAM_GROUND_Y, cz + Math.sin(angle) * radius);
  }
  for (let i = 0; i < SEGMENTS; i++) {
    indices.push(0, i + 1, ((i + 1) % SEGMENTS) + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createGroundDisc(cx: number, cz: number, radius: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  positions.push(cx, MOVING_BEAM_GROUND_Y + 0.2, cz);
  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    positions.push(cx + Math.cos(angle) * radius, MOVING_BEAM_GROUND_Y + 0.2, cz + Math.sin(angle) * radius);
  }
  for (let i = 0; i < SEGMENTS; i++) {
    indices.push(0, i + 1, ((i + 1) % SEGMENTS) + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------------------
// Single beam
// ---------------------------------------------------------------------------

function sinrColor(sinrDb: number): string {
  if (sinrDb >= 20) return '#00ff00';
  if (sinrDb >= 10) return '#aaff00';
  if (sinrDb >= 5) return '#ffaa00';
  return '#ff4444';
}


const BeamCone = React.memo(function BeamCone({
  satPos,
  groundX,
  groundZ,
  footprintRadiusWorld,
  beam,
  beamIndex,
  color,
  style,
  sinrDb,
  isAnimated,
}: {
  satPos: [number, number, number];
  groundX: number;
  groundZ: number;
  footprintRadiusWorld: number;
  beam: SatelliteBeamSnapshot;
  beamIndex: number;
  color: string;
  style: BeamStyle;
  sinrDb?: number | null;
  isAnimated?: boolean;
}) {
  // Refs for serving-beam breathing animation (VISUAL-ONLY)
  const coneMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const lineRef = useRef<any>(null);
  const breathTimeRef = useRef(0);

  // Serving beam: subtle breathing (~1 Hz) to make it visually prominent.
  // useFrame is always called (rule of hooks); guard inside keeps non-serving beams unaffected.
  useFrame((_, delta) => {
    if (!isAnimated) return;
    breathTimeRef.current += delta;
    const breath = 0.12 * Math.sin(breathTimeRef.current * Math.PI * 2); // 1 Hz cycle
    if (coneMatRef.current) {
      coneMatRef.current.opacity = Math.max(0.18, Math.min(0.50, style.cone + breath));
    }
    if (lineRef.current?.material) {
      (lineRef.current.material as THREE.Material & { opacity: number }).opacity =
        Math.max(0.70, Math.min(1.0, style.line + breath * 0.5));
    }
  });

  const coneGeo = useMemo(
    () => createObliqueConeSide(satPos, groundX, groundZ, footprintRadiusWorld),
    [satPos[0], satPos[1], satPos[2], groundX, groundZ, footprintRadiusWorld],
  );
  const discGeo = useMemo(
    () => createGroundDisc(groundX, groundZ, footprintRadiusWorld),
    [groundX, groundZ, footprintRadiusWorld],
  );

  const labelPos = useMemo<[number, number, number]>(() => {
    const t = 0.35;
    return [
      satPos[0] + (groundX - satPos[0]) * t,
      satPos[1] + (MOVING_BEAM_GROUND_Y - satPos[1]) * t,
      satPos[2] + (groundZ - satPos[2]) * t,
    ];
  }, [satPos[0], satPos[1], satPos[2], groundX, groundZ]);

  const isSpecialRole = beam.role === 'serving' || beam.role === 'prepared' || beam.role === 'secondary' || beam.role === 'post-ho';
  const roleBadge = beam.role === 'serving'
    ? ' ★'
    : beam.role === 'prepared'
      ? ' P'
      : beam.role === 'secondary'
        ? ' S'
        : beam.role === 'post-ho'
          ? ' H'
          : '';
  const label = `B${beamIndex}${roleBadge}${!beam.isActive ? ' off' : ''}`;
  const sinrLabel = sinrDb != null && Number.isFinite(sinrDb) ? `${sinrDb.toFixed(1)} dB` : null;

  useEffect(() => () => {
    coneGeo.dispose();
  }, [coneGeo]);

  useEffect(() => () => {
    discGeo.dispose();
  }, [discGeo]);

  return (
    <group>
      <mesh geometry={coneGeo}>
        <meshBasicMaterial
          ref={coneMatRef}
          color={color}
          transparent
          opacity={style.cone}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh geometry={discGeo}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={style.disc}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <Line
        ref={lineRef}
        points={[satPos, [groundX, MOVING_BEAM_GROUND_Y, groundZ]]}
        color={color}
        lineWidth={style.width}
        transparent
        opacity={style.line}
        dashed={style.dashed}
        dashSize={15}
        gapSize={10}
      />
      {isSpecialRole && (
        <Text
          position={[labelPos[0], labelPos[1] + (sinrLabel ? 5 : 0), labelPos[2]]}
          fontSize={beam.role === 'serving' ? 12 : 9}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={beam.role === 'serving' ? 2.5 : 1.5}
          outlineColor={beam.role === 'serving' ? '#ffffff' : '#071018'}
          renderOrder={20}
          material-depthTest={false}
          material-depthWrite={false}
        >
          {label}
        </Text>
      )}
      {sinrLabel && (
        <Text
          position={[labelPos[0], labelPos[1] - 7, labelPos[2]]}
          fontSize={beam.role === 'serving' ? 10 : 8}
          color={sinrColor(sinrDb!)}
          anchorX="center"
          anchorY="middle"
          outlineWidth={1.2}
          outlineColor="#000000"
          renderOrder={30}
          material-depthTest={false}
          material-depthWrite={false}
        >
          {sinrLabel}
        </Text>
      )}
    </group>
  );
});

// ---------------------------------------------------------------------------
// Per-satellite beam group
// ---------------------------------------------------------------------------

const SatBeamGroup = React.memo(function SatBeamGroup({
  sat,
  presentationFrame,
  servingBeamId,
  servingSinrDb,
}: {
  sat: SatelliteState;
  presentationFrame: BeamPresentationFrame;
  servingBeamId?: string | null;
  servingSinrDb?: number | null;
}) {
  const beams = sat.beams;
  if (!beams || beams.length === 0) return null;

  const selectedBeamIds = useMemo(() => {
    const primary = presentationFrame.primaryBeamBySatId[sat.id];
    const context = presentationFrame.contextBeamIdsBySatId[sat.id] ?? [];
    return primary ? [primary, ...context] : [];
  }, [presentationFrame.contextBeamIdsBySatId, presentationFrame.primaryBeamBySatId, sat.id]);
  const chosenBeams = useMemo(
    () =>
      selectedBeamIds
        .map((beamId) => beams.find((beam) => beam.beamId === beamId) ?? null)
        .filter((beam): beam is SatelliteBeamSnapshot => beam !== null),
    [beams, selectedBeamIds],
  );
  const renderedBeamPlans = useMemo(
    () => buildRenderedBeamPlans(sat, chosenBeams),
    [sat, chosenBeams],
  );
  const isServingSat = Boolean(
    servingBeamId && beams.some((beam) => beam.beamId === servingBeamId),
  );

  return (
    <group>
      {renderedBeamPlans.map(({ beam, beamIndex, satPos, groundX, groundZ, footprintRadiusWorld }) => {
        const isServingBeam = isServingSat && beam.beamId === servingBeamId;
        const accent =
          presentationFrame.beamRoleAccentByBeamId[beam.beamId]
          ?? (beam.isActive ? 'neutral-context' : 'inactive-context');
        const color = getBeamColor(beam, accent);
        const style = getBeamStyle(beam, accent);

        return (
          <BeamCone
            key={beam.beamId}
            satPos={satPos}
            groundX={groundX}
            groundZ={groundZ}
            footprintRadiusWorld={footprintRadiusWorld}
            beam={beam}
            beamIndex={beamIndex}
            color={color}
            style={style}
            sinrDb={isServingBeam ? servingSinrDb : null}
            isAnimated={beam.role === 'serving'}
          />
        );
      })}
    </group>
  );
});

// ---------------------------------------------------------------------------
// Main layer
// ---------------------------------------------------------------------------

export interface EarthMovingBeamLayerProps {
  snapshot: SimulationSnapshot | null;
  presentationFrame: BeamPresentationFrame | null;
  visible?: boolean;
}

export const EarthMovingBeamLayer = React.memo(function EarthMovingBeamLayer({
  snapshot,
  presentationFrame,
  visible = true,
}: EarthMovingBeamLayerProps) {
  const primaryUe = snapshot?.ues[0];
  const servingSatId = primaryUe?.servingSatId;

  const beamSats = useMemo(
    () =>
      !snapshot || !visible || !presentationFrame
        ? []
        : presentationFrame.beamSatIds
          .map((satId) => snapshot.satellites.find((sat) => sat.id === satId) ?? null)
          .filter((sat): sat is SatelliteState => sat !== null),
    [presentationFrame, snapshot, visible],
  );

  const validationSummary = useMemo(
    () => buildEarthMovingBeamLayerSummary(
      beamSats,
      presentationFrame,
    ),
    [beamSats, presentationFrame],
  );

  usePublishValidationSection('earthMovingBeamLayer', validationSummary);

  if (!snapshot || !visible || !presentationFrame || beamSats.length === 0) return null;

  const primaryUeSinrDb = snapshot.ues[0]?.sinrDb ?? null;
  const primaryUeServingBeamId = snapshot.ues[0]?.servingBeamId ?? null;

  return (
    <group name="earth-moving-beam-layer">
      {beamSats.map((sat) => (
        <SatBeamGroup
          key={sat.id}
          sat={sat}
          presentationFrame={presentationFrame}
          servingBeamId={sat.id === servingSatId ? primaryUeServingBeamId : null}
          servingSinrDb={sat.id === servingSatId ? primaryUeSinrDb : null}
        />
      ))}
    </group>
  );
});
