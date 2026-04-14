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
import type { SimulationSnapshot, SatelliteState, SatelliteBeamSnapshot, DapsSnapshot } from '@/core/contracts/runtime-v1';
import { usePublishValidationSection } from '@/viz/validation/store';
import { selectBeamSatellites } from './beam-visibility-selection';
import {
  computeMovingBeamGroundTarget,
  isUeAnchoredMovingBeam,
  resolveMovingBeamProjection,
} from './moving-beam-geometry';
import {
  MOVING_BEAM_FOOTPRINT_RADIUS_WORLD,
  MOVING_BEAM_GROUND_Y,
} from './beam-visual-constants';

// ---------------------------------------------------------------------------
// VISUAL-ONLY constants
// ---------------------------------------------------------------------------

const SEGMENTS = 32;

const POLARIZATION_A = '#ff8844'; // orange (odd index)
const POLARIZATION_B = '#44aaff'; // blue   (even index)

const SERVING_COLOR = '#0088ff';
const PREPARED_COLOR = '#ffb000';
const SECONDARY_COLOR = '#00e5ff';
const POST_HO_COLOR = '#7a5cff';

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

function rankBeamForRendering(a: SatelliteBeamSnapshot, b: SatelliteBeamSnapshot): number {
  const rolePriority = (beam: SatelliteBeamSnapshot) => {
    switch (beam.role) {
      case 'serving': return 5;
      case 'prepared': return 4;
      case 'secondary': return 3;
      case 'post-ho': return 2;
      case 'neutral': return 1;
      case 'inactive': return 0;
    }
  };

  const priorityDelta = rolePriority(b) - rolePriority(a);
  if (priorityDelta !== 0) return priorityDelta;

  if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;

  const radialA = Math.hypot(a.offsetEastKm, a.offsetNorthKm);
  const radialB = Math.hypot(b.offsetEastKm, b.offsetNorthKm);
  return radialA - radialB || a.beamId.localeCompare(b.beamId);
}

function getBeamColor(beam: SatelliteBeamSnapshot, beamIndex: number): string {
  if (beam.role === 'serving') return SERVING_COLOR;
  if (beam.role === 'prepared') return PREPARED_COLOR;
  if (beam.role === 'secondary') return SECONDARY_COLOR;
  if (beam.role === 'post-ho') return POST_HO_COLOR;
  return beamIndex % 2 === 1 ? POLARIZATION_A : POLARIZATION_B;
}

function getBeamStyle(beam: SatelliteBeamSnapshot): BeamStyle {
  if (beam.role === 'serving') {
    return beam.isActive
      ? { cone: 0.35, disc: 0.22, line: 1.0, width: 4, dashed: false }
      : { cone: 0.22, disc: 0.14, line: 0.96, width: 4, dashed: true };
  }
  if (beam.role === 'prepared') {
    return beam.isActive
      ? { cone: 0.30, disc: 0.20, line: 0.90, width: 3.4, dashed: true }
      : { cone: 0.18, disc: 0.12, line: 0.60, width: 2.4, dashed: true };
  }
  if (beam.role === 'secondary') {
    return beam.isActive
      ? { cone: 0.33, disc: 0.21, line: 0.95, width: 3.8, dashed: false }
      : { cone: 0.20, disc: 0.13, line: 0.70, width: 2.8, dashed: true };
  }
  if (beam.role === 'post-ho') {
    return beam.isActive
      ? { cone: 0.24, disc: 0.16, line: 0.80, width: 3.0, dashed: false }
      : { cone: 0.14, disc: 0.09, line: 0.55, width: 2.2, dashed: true };
  }
  if (!beam.isActive) {
    return { cone: 0.08, disc: 0.05, line: 0.38, width: 1.8, dashed: true };
  }
  return { cone: 0.20, disc: 0.12, line: 0.72, width: 2.4, dashed: false };
}

function selectRenderableBeams(beams: SatelliteBeamSnapshot[], isCandidate?: boolean): SatelliteBeamSnapshot[] {
  const renderable = beams.filter(
    (beam) =>
      beam.isActive ||
      beam.role === 'serving' ||
      beam.role === 'prepared' ||
      beam.role === 'secondary' ||
      beam.role === 'post-ho',
  );
  renderable.sort(rankBeamForRendering);

  if (isCandidate) {
    // Background candidates stay faint, but they still render the tracked beam
    // lattice instead of collapsing back to a single center-beam placeholder.
    return renderable;
  }

  return renderable;
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

interface RenderedBeamPlan {
  beam: SatelliteBeamSnapshot;
  beamIndex: number;
  satPos: [number, number, number];
  groundX: number;
  groundZ: number;
  footprintRadiusWorld: number;
  isUeAnchored: boolean;
}

function buildRenderedBeamPlans(
  sat: SatelliteState,
  beams: readonly SatelliteBeamSnapshot[],
): RenderedBeamPlan[] {
  const projection = resolveMovingBeamProjection(sat, beams);

  return beams.map((beam, beamIndex) => {
    const target = computeMovingBeamGroundTarget(
      projection,
      beam,
      isUeAnchoredMovingBeam(beam),
    );

    return {
      beam,
      beamIndex,
      satPos: projection.satPos,
      groundX: target.groundX,
      groundZ: target.groundZ,
      footprintRadiusWorld: target.footprintRadiusWorld,
      isUeAnchored: target.isUeAnchored,
    };
  });
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
  daps,
  servingBeamId,
  servingSinrDb,
  isCandidate,
}: {
  sat: SatelliteState;
  daps?: DapsSnapshot;
  servingBeamId?: string | null;
  servingSinrDb?: number | null;
  isCandidate?: boolean;
}) {
  const beams = sat.beams;
  if (!beams || beams.length === 0) return null;

  const isDapsTarget = daps?.phase === 'dual-active' && sat.id === daps.targetSatId;
  const isServingSat = Boolean(servingBeamId && beams.some((b) => b.beamId === servingBeamId));
  const chosenBeams = useMemo(
    () => selectRenderableBeams(beams, isCandidate),
    [beams, isCandidate],
  );
  const renderedBeamPlans = useMemo(
    () => buildRenderedBeamPlans(sat, chosenBeams),
    [sat, chosenBeams],
  );

  return (
    <group>
      {renderedBeamPlans.map(({ beam, beamIndex, satPos, groundX, groundZ, footprintRadiusWorld }) => {
        const isServingBeam = isServingSat && beam.beamId === servingBeamId;

        const color = isCandidate
          ? '#aaaaaa'
          : isDapsTarget && beam.role === 'secondary'
            ? SECONDARY_COLOR
            : getBeamColor(beam, beamIndex);
        const style: BeamStyle = isCandidate
          ? { cone: 0.06, disc: 0.04, line: 0.30, width: 1.5, dashed: true }
          : isDapsTarget && beam.role === 'secondary'
            ? { cone: 0.35, disc: 0.22, line: 1.0, width: 4, dashed: false }
            : getBeamStyle(beam);

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
  visible?: boolean;
}

export const EarthMovingBeamLayer = React.memo(function EarthMovingBeamLayer({
  snapshot,
  visible = true,
}: EarthMovingBeamLayerProps) {
  const primaryUe = snapshot?.ues[0];
  const servingSatId = primaryUe?.servingSatId;

  const beamSats = useMemo(
    () => (snapshot && visible ? selectBeamSatellites(snapshot) : []),
    [snapshot, visible],
  );

  // Tier 1 satellite IDs: HO-relevant (serving / target / secondary / special roles)
  const tier1SatIds = useMemo(() => {
    if (!snapshot) return new Set<string>();
    const ids = new Set<string>();
    const ue = snapshot.ues[0];
    if (ue?.servingSatId) ids.add(ue.servingSatId);
    if (ue?.targetSatId) ids.add(ue.targetSatId);
    if (ue?.secondarySatId) ids.add(ue.secondarySatId);
    if (snapshot.daps?.targetSatId) ids.add(snapshot.daps.targetSatId);
    for (const sat of snapshot.satellites) {
      if (sat.beams?.some((b) => b.role === 'prepared' || b.role === 'secondary' || b.role === 'post-ho')) {
        ids.add(sat.id);
      }
    }
    return ids;
  }, [snapshot]);

  const validationSummary = useMemo(() => {
    const roleCounts: Record<string, number> = {};
    let renderedBeamCount = 0;
    const renderedSatIds: string[] = [];
    const geometrySamples = [];

    for (const sat of beamSats) {
      const isCandidate = !tier1SatIds.has(sat.id);
      const chosenBeams = selectRenderableBeams(sat.beams ?? [], isCandidate);
      const renderedBeamPlans = buildRenderedBeamPlans(sat, chosenBeams);
      if (renderedBeamPlans.length > 0) {
        renderedSatIds.push(sat.id);
      }
      renderedBeamCount += renderedBeamPlans.length;
      for (const { beam, satPos, groundX, groundZ, isUeAnchored } of renderedBeamPlans) {
        roleCounts[beam.role] = (roleCounts[beam.role] ?? 0) + 1;
        geometrySamples.push({
          satId: sat.id,
          beamId: beam.beamId,
          role: beam.role,
          isActive: beam.isActive,
          isCandidate,
          isUeAnchored,
          satX: satPos[0],
          satZ: satPos[2],
          groundX,
          groundZ,
          offsetEastKm: beam.offsetEastKm,
          offsetNorthKm: beam.offsetNorthKm,
        });
      }
    }

    return {
      present: beamSats.length > 0,
      renderedSatIds,
      renderedBeamCount,
      footprintRadiusWorld: MOVING_BEAM_FOOTPRINT_RADIUS_WORLD,
      roleCounts,
      geometrySamples,
    };
  }, [beamSats, tier1SatIds]);

  usePublishValidationSection('earthMovingBeamLayer', validationSummary);

  if (!snapshot || !visible || beamSats.length === 0) return null;

  const primaryUeSinrDb = snapshot.ues[0]?.sinrDb ?? null;
  const primaryUeServingBeamId = snapshot.ues[0]?.servingBeamId ?? null;

  return (
    <group name="earth-moving-beam-layer">
      {beamSats.map((sat) => (
        <SatBeamGroup
          key={sat.id}
          sat={sat}
          daps={snapshot.daps}
          servingBeamId={sat.id === servingSatId ? primaryUeServingBeamId : null}
          servingSinrDb={sat.id === servingSatId ? primaryUeSinrDb : null}
          isCandidate={!tier1SatIds.has(sat.id)}
        />
      ))}
    </group>
  );
});
