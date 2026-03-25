/**
 * EarthMovingBeamLayer — engine-driven multi-beam renderer.
 *
 * Directly ported from leo-beam-sim/src/viz/SatelliteBeams.tsx.
 * Only renders beams for serving + target satellites.
 * Each beam has: oblique cone, ground disc, center line, label.
 * On-slot = solid line + bright; off-slot = dashed line + dim.
 *
 * VISUAL-ONLY: Does NOT affect physics, SINR, or KPI.
 */

import React, { useMemo } from 'react';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { SimulationSnapshot, SatelliteState, SatelliteBeamSnapshot, DapsSnapshot } from '@/core/common/types';
import { usePublishValidationSection } from '@/viz/validation/store';
import { createLeoParityBeamPresentation } from '@/viz/presenters/leo-parity-presenter';
import type { BeamPresentationSatSelection, BeamSelectionEmphasis } from '@/viz/presenters/types';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from '@/viz/satellite/observer-sky-projection';

// ---------------------------------------------------------------------------
// VISUAL-ONLY constants (ported from leo-beam-sim)
// ---------------------------------------------------------------------------

const SEGMENTS = 32;
const GROUND_Y = 1;

/** Fixed footprint radius (donor: leo-beam-sim FOOTPRINT_RADIUS_WORLD = 56). */
const FOOTPRINT_RADIUS = 56;

/** Polarization-pair colors by beam index parity (donor: leo-beam-sim). */
const POLARIZATION_A = '#ff8844'; // orange (odd index)
const POLARIZATION_B = '#44aaff'; // blue   (even index)

const SERVING_COLOR = '#0088ff';
const PREPARED_COLOR = '#ffb000';
const SECONDARY_COLOR = '#00e5ff';
const POST_HO_COLOR = '#7a5cff';

// ---------------------------------------------------------------------------
// Color + opacity (ported from leo-beam-sim beamColor / beamOpacity)
// ---------------------------------------------------------------------------

interface BeamStyle {
  cone: number;
  disc: number;
  line: number;
  width: number;
  dashed: boolean;
}

const CONTEXT_BEAM_LIMIT = 7;

function rankBeamForRendering(a: SatelliteBeamSnapshot, b: SatelliteBeamSnapshot): number {
  const rolePriority = (beam: SatelliteBeamSnapshot) => {
    switch (beam.role) {
      case 'serving':
        return 5;
      case 'prepared':
        return 4;
      case 'secondary':
        return 3;
      case 'post-ho':
        return 2;
      case 'neutral':
        return 1;
      case 'inactive':
        return 0;
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
  // Polarization pair by index parity
  return beamIndex % 2 === 1 ? POLARIZATION_A : POLARIZATION_B;
}

function getBeamStyle(beam: SatelliteBeamSnapshot): BeamStyle {
  // Serving beam
  if (beam.role === 'serving') {
    return beam.isActive
      ? { cone: 0.35, disc: 0.22, line: 1.0, width: 4, dashed: false }
      : { cone: 0.22, disc: 0.14, line: 0.96, width: 4, dashed: true };
  }
  // Prepared target beam
  if (beam.role === 'prepared') {
    return beam.isActive
      ? { cone: 0.30, disc: 0.20, line: 0.90, width: 3.4, dashed: true }
      : { cone: 0.18, disc: 0.12, line: 0.60, width: 2.4, dashed: true };
  }
  // Secondary / dual-active beam
  if (beam.role === 'secondary') {
    return beam.isActive
      ? { cone: 0.33, disc: 0.21, line: 0.95, width: 3.8, dashed: false }
      : { cone: 0.20, disc: 0.13, line: 0.70, width: 2.8, dashed: true };
  }
  // Post-HO explanatory beam
  if (beam.role === 'post-ho') {
    return beam.isActive
      ? { cone: 0.24, disc: 0.16, line: 0.80, width: 3.0, dashed: false }
      : { cone: 0.14, disc: 0.09, line: 0.55, width: 2.2, dashed: true };
  }
  // Off-slot (inactive)
  if (!beam.isActive) {
    return { cone: 0.08, disc: 0.05, line: 0.38, width: 1.8, dashed: true };
  }
  // On-slot neutral
  return { cone: 0.20, disc: 0.12, line: 0.72, width: 2.4, dashed: false };
}

function selectRenderableBeams(
  beams: SatelliteBeamSnapshot[],
  emphasis: BeamSelectionEmphasis = 'continuity',
): SatelliteBeamSnapshot[] {
  const renderable = beams.filter(
    (beam) =>
      beam.isActive ||
      beam.role === 'serving' ||
      beam.role === 'prepared' ||
      beam.role === 'secondary' ||
      beam.role === 'post-ho',
  );
  renderable.sort(rankBeamForRendering);
  return emphasis === 'context'
    ? renderable.slice(0, CONTEXT_BEAM_LIMIT)
    : renderable;
}

function applyEmphasisStyle(style: BeamStyle, emphasis: BeamSelectionEmphasis): BeamStyle {
  if (emphasis === 'continuity') return style;
  if (emphasis === 'event') {
    return {
      cone: style.cone * 0.9,
      disc: style.disc * 0.92,
      line: style.line * 0.92,
      width: Math.max(2, style.width * 0.94),
      dashed: style.dashed,
    };
  }
  return {
    cone: style.cone * 0.58,
    disc: style.disc * 0.62,
    line: style.line * 0.68,
    width: Math.max(1.8, style.width * 0.78),
    dashed: style.dashed,
  };
}

// ---------------------------------------------------------------------------
// Geometry helpers (identical to leo-beam-sim)
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
    positions.push(cx + Math.cos(angle) * radius, GROUND_Y, cz + Math.sin(angle) * radius);
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
  positions.push(cx, GROUND_Y + 0.2, cz);
  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    positions.push(cx + Math.cos(angle) * radius, GROUND_Y + 0.2, cz + Math.sin(angle) * radius);
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
// Single beam (ported from leo-beam-sim BeamCone)
// ---------------------------------------------------------------------------

const BeamCone = React.memo(function BeamCone({
  satPos,
  groundX,
  groundZ,
  beam,
  beamIndex,
  color,
  style,
}: {
  satPos: [number, number, number];
  groundX: number;
  groundZ: number;
  beam: SatelliteBeamSnapshot;
  beamIndex: number;
  color: string;
  style: BeamStyle;
}) {
  const coneGeo = useMemo(
    () => createObliqueConeSide(satPos, groundX, groundZ, FOOTPRINT_RADIUS),
    [satPos[0], satPos[1], satPos[2], groundX, groundZ],
  );
  const discGeo = useMemo(
    () => createGroundDisc(groundX, groundZ, FOOTPRINT_RADIUS),
    [groundX, groundZ],
  );

  // Label position: 35% along sat→ground line (donor: leo-beam-sim)
  const labelPos = useMemo<[number, number, number]>(() => {
    const t = 0.35;
    return [
      satPos[0] + (groundX - satPos[0]) * t,
      satPos[1] + (GROUND_Y - satPos[1]) * t,
      satPos[2] + (groundZ - satPos[2]) * t,
    ];
  }, [satPos[0], satPos[1], satPos[2], groundX, groundZ]);

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

  return (
    <group>
      {/* Cone */}
      <mesh geometry={coneGeo}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={style.cone}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Ground disc */}
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

      {/* Center line: sat → ground (key visual element from leo-beam-sim) */}
      <Line
        points={[satPos, [groundX, GROUND_Y, groundZ]]}
        color={color}
        lineWidth={style.width}
        transparent
        opacity={style.line}
        dashed={style.dashed}
        dashSize={15}
        gapSize={10}
      />

      {/* Beam label (donor: leo-beam-sim) */}
      <Text
        position={labelPos}
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
    </group>
  );
});

// ---------------------------------------------------------------------------
// Per-satellite beam group
// ---------------------------------------------------------------------------

const SatBeamGroup = React.memo(function SatBeamGroup({
  sat,
  daps,
  emphasis = 'continuity',
}: {
  sat: SatelliteState;
  daps?: DapsSnapshot;
  emphasis?: BeamSelectionEmphasis;
}) {
  const beams = sat.beams;
  if (!beams || beams.length === 0) return null;

  const satPos = useMemo<[number, number, number]>(
    () => projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION),
    [sat.azimuthDeg, sat.elevationDeg],
  );

  // Scale km offsets → world units so beam spacing matches FOOTPRINT_RADIUS
  const beamSpacingKm = beams.length > 1
    ? Math.sqrt(beams[1].offsetEastKm ** 2 + beams[1].offsetNorthKm ** 2) || 25
    : 25;
  const kmToWorld = (2 * FOOTPRINT_RADIUS) / beamSpacingKm;

  const groundCenterX = satPos[0];
  const groundCenterZ = satPos[2];

  const isDapsTarget = daps?.phase === 'dual-active' && sat.id === daps.targetSatId;

  const chosenBeams = selectRenderableBeams(beams, emphasis);

  return (
    <group>
      {chosenBeams.map((beam, index) => {
        const groundX = groundCenterX + beam.offsetEastKm * kmToWorld;
        const groundZ = groundCenterZ - beam.offsetNorthKm * kmToWorld;

        const color = isDapsTarget && beam.role === 'secondary'
          ? SECONDARY_COLOR
          : getBeamColor(beam, index);
        const baseStyle = isDapsTarget && beam.role === 'secondary'
          ? { cone: 0.35, disc: 0.22, line: 1.0, width: 4, dashed: false }
          : getBeamStyle(beam);
        const style = applyEmphasisStyle(baseStyle, emphasis);

        return (
          <BeamCone
            key={beam.beamId}
            satPos={satPos}
            groundX={groundX}
            groundZ={groundZ}
            beam={beam}
            beamIndex={index}
            color={color}
            style={style}
          />
        );
      })}
    </group>
  );
});

// ---------------------------------------------------------------------------
// Main layer — only serving + continuity-relevant satellites get beams
// ---------------------------------------------------------------------------

export interface EarthMovingBeamLayerProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
  beamScale?: number;
  viewMode?: 'default' | 'leo-parity';
}

export const EarthMovingBeamLayer = React.memo(function EarthMovingBeamLayer({
  snapshot,
  visible = true,
  viewMode = 'default',
}: EarthMovingBeamLayerProps) {
  const primaryUe = snapshot?.ues[0];
  const servingSatId = primaryUe?.servingSatId;
  const targetSatId = primaryUe?.targetSatId;
  const secondarySatId = primaryUe?.secondarySatId;
  const parityPresentation = useMemo(
    () => (viewMode === 'leo-parity' ? createLeoParityBeamPresentation(snapshot) : null),
    [snapshot, viewMode],
  );
  const paritySelectionBySatId = useMemo(
    () =>
      new Map(
        (parityPresentation?.selections ?? []).map((selection) => [selection.satId, selection]),
      ),
    [parityPresentation],
  );

  const beamSats = useMemo(() => {
    if (!snapshot || !visible) return [];
    if (viewMode === 'leo-parity' && parityPresentation) {
      const displaySatIds = new Set(parityPresentation.displaySatIds);
      return snapshot.satellites.filter(
        (sat) =>
          sat.isVisible &&
          sat.elevationDeg > 5 &&
          sat.beams &&
          sat.beams.length > 0 &&
          displaySatIds.has(sat.id),
      );
    }
    const ids = new Set<string>();
    if (servingSatId) ids.add(servingSatId);
    if (targetSatId) ids.add(targetSatId);
    if (secondarySatId) ids.add(secondarySatId);
    if (snapshot.daps?.targetSatId) ids.add(snapshot.daps.targetSatId);
    for (const sat of snapshot.satellites) {
      if (sat.beams?.some((b) => b.role === 'prepared' || b.role === 'secondary' || b.role === 'post-ho')) {
        ids.add(sat.id);
      }
    }
    return snapshot.satellites.filter(
      (s) => s.isVisible && s.elevationDeg > 5 && s.beams && s.beams.length > 0 && ids.has(s.id),
    );
  }, [parityPresentation, snapshot, visible, viewMode, servingSatId, targetSatId, secondarySatId, snapshot?.daps]);

  const validationSummary = useMemo(() => {
    const roleCounts: Record<string, number> = {};
    let renderedBeamCount = 0;
    const emphasisCounts: Record<string, number> = {};
    const selectionReasons: Record<string, string> = {};

    for (const sat of beamSats) {
      const selection = paritySelectionBySatId.get(sat.id);
      const emphasis = selection?.emphasis ?? 'continuity';
      const chosenBeams = selectRenderableBeams(sat.beams ?? [], emphasis);
      renderedBeamCount += chosenBeams.length;
      emphasisCounts[emphasis] = (emphasisCounts[emphasis] ?? 0) + 1;
      if (selection) selectionReasons[sat.id] = selection.reason;
      for (const beam of chosenBeams) {
        roleCounts[beam.role] = (roleCounts[beam.role] ?? 0) + 1;
      }
    }

    return {
      present: beamSats.length > 0,
      viewMode,
      renderedSatIds: beamSats.map((sat) => sat.id),
      eventSatIds: parityPresentation?.eventSatIds ?? [],
      renderedBeamCount,
      emphasisCounts,
      selectionReasons,
      roleCounts,
    };
  }, [beamSats, parityPresentation?.eventSatIds, paritySelectionBySatId, viewMode]);

  usePublishValidationSection('earthMovingBeamLayer', validationSummary);

  if (!snapshot || !visible || beamSats.length === 0) return null;

  return (
    <group name="earth-moving-beam-layer">
      {beamSats.map((sat) => (
        <SatBeamGroup
          key={sat.id}
          sat={sat}
          daps={snapshot.daps}
          emphasis={paritySelectionBySatId.get(sat.id)?.emphasis ?? 'continuity'}
        />
      ))}
    </group>
  );
});
