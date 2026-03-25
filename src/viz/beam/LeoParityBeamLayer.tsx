import React, { useMemo } from 'react';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';

import type {
  SimulationSnapshot,
  SatelliteState,
  SatelliteBeamSnapshot,
  UeState,
} from '@/core/common/types';
import { createLeoParityBeamPresentation } from '@/viz/presenters/leo-parity-presenter';
import type { BeamSelectionEmphasis } from '@/viz/presenters/types';
import { usePublishValidationSection } from '@/viz/validation/store';
import {
  projectToSkyDome,
  DEFAULT_SKY_PROJECTION,
} from '@/viz/satellite/observer-sky-projection';

const SEGMENTS = 32;
const GROUND_Y = 1;
const FOOTPRINT_RADIUS = 56;
const MIN_ELEVATION_DEG = 5;

const POLARIZATION_A_COLOR = '#ff8844';
const POLARIZATION_B_COLOR = '#44aaff';
const CURRENT_SERVICE_COLOR = '#0088ff';
const TARGET_HANDOVER_COLOR = '#ffb000';
const SECONDARY_EVENT_COLOR = '#ff5ab3';
const POST_HO_COLOR = '#4f8cff';
const LABEL_OUTLINE_DARK = '#071018';

interface BeamTarget {
  beam: SatelliteBeamSnapshot;
  groundX: number;
  groundZ: number;
  isServing: boolean;
  isPrimary: boolean;
  isScheduledActive: boolean;
  role?: 'serving' | 'secondary' | 'prepared' | 'post-ho';
  isTransitioningSource: boolean;
  sinrDb: number | null;
}

interface BeamStyle {
  cone: number;
  disc: number;
  line: number;
  width: number;
  dashed: boolean;
}

const EMPHASIS_LIMITS: Record<BeamSelectionEmphasis, number> = {
  continuity: 9,
  event: 7,
  context: 4,
};

function baseBeamColor(beamId: string): string {
  const match = /-b(\d+)$/.exec(beamId);
  const beamIndex = match ? Number(match[1]) : 0;
  return beamIndex % 2 === 1 ? POLARIZATION_A_COLOR : POLARIZATION_B_COLOR;
}

function beamColor(target: BeamTarget): string {
  if (target.isServing) return CURRENT_SERVICE_COLOR;

  switch (target.role) {
    case 'prepared':
      return target.isPrimary ? TARGET_HANDOVER_COLOR : baseBeamColor(target.beam.beamId);
    case 'post-ho':
      return target.isPrimary ? POST_HO_COLOR : baseBeamColor(target.beam.beamId);
    case 'secondary':
      return target.isPrimary ? SECONDARY_EVENT_COLOR : baseBeamColor(target.beam.beamId);
    default:
      return baseBeamColor(target.beam.beamId);
  }
}

function beamOpacity(target: BeamTarget): BeamStyle {
  if (target.isServing) {
    if (target.isTransitioningSource) {
      if (!target.isScheduledActive) {
        return { cone: 0.2, disc: 0.12, line: 0.92, width: 3.6, dashed: true };
      }
      return { cone: 0.28, disc: 0.18, line: 0.92, width: 3.6, dashed: false };
    }
    if (!target.isScheduledActive) {
      return { cone: 0.22, disc: 0.14, line: 0.96, width: 4, dashed: true };
    }
    return { cone: 0.35, disc: 0.22, line: 1, width: 4, dashed: false };
  }

  if (!target.isScheduledActive) {
    return { cone: 0.08, disc: 0.05, line: 0.38, width: 1.8, dashed: true };
  }

  switch (target.role) {
    case 'post-ho':
      return target.isPrimary
        ? { cone: 0.3, disc: 0.2, line: 0.95, width: 3.6, dashed: false }
        : { cone: 0.14, disc: 0.1, line: 0.55, width: 2, dashed: true };
    case 'prepared':
      return target.isPrimary
        ? { cone: 0.3, disc: 0.2, line: 0.9, width: 3.4, dashed: true }
        : { cone: 0.12, disc: 0.08, line: 0.5, width: 2, dashed: true };
    case 'secondary':
      return target.isPrimary
        ? { cone: 0.2, disc: 0.14, line: 0.74, width: 2.4, dashed: true }
        : { cone: 0.1, disc: 0.06, line: 0.42, width: 1.7, dashed: true };
    default:
      return {
        cone: target.isPrimary ? 0.2 : 0.12,
        disc: target.isPrimary ? 0.12 : 0.06,
        line: target.isPrimary ? 0.72 : 0.5,
        width: target.isPrimary ? 2.4 : 2,
        dashed: !target.isPrimary,
      };
  }
}

function sinrColor(sinrDb: number): string {
  if (sinrDb >= 20) return '#00ff00';
  if (sinrDb >= 10) return '#aaff00';
  if (sinrDb >= 5) return '#ffaa00';
  return '#ff4444';
}

function formatBeamIndex(beamId: string): string {
  const match = /-b(\d+)$/.exec(beamId);
  return `B${match ? match[1] : beamId}`;
}

function formatBeamSinr(sinrDb: number | null): string | null {
  if (sinrDb === null || !Number.isFinite(sinrDb)) return null;
  return `${sinrDb.toFixed(1)} dB`;
}

function rolePriority(beam: SatelliteBeamSnapshot): number {
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
}

function rankBeams(a: SatelliteBeamSnapshot, b: SatelliteBeamSnapshot): number {
  const priorityDelta = rolePriority(b) - rolePriority(a);
  if (priorityDelta !== 0) return priorityDelta;
  if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
  const radialA = Math.hypot(a.offsetEastKm, a.offsetNorthKm);
  const radialB = Math.hypot(b.offsetEastKm, b.offsetNorthKm);
  return radialA - radialB || a.beamId.localeCompare(b.beamId);
}

function createObliqueConeSide(
  apex: THREE.Vector3,
  centerX: number,
  centerZ: number,
  radius: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  positions.push(apex.x, apex.y, apex.z);

  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    positions.push(centerX + Math.cos(angle) * radius, GROUND_Y, centerZ + Math.sin(angle) * radius);
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

function createGroundDisc(centerX: number, centerZ: number, radius: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  positions.push(centerX, GROUND_Y, centerZ);
  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    positions.push(centerX + Math.cos(angle) * radius, GROUND_Y, centerZ + Math.sin(angle) * radius);
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

function findPrimaryBeamId(sat: SatelliteState, primaryUe: UeState | null): string | null {
  if (!sat.beams || sat.beams.length === 0) return null;
  if (sat.id === primaryUe?.servingSatId && primaryUe.servingBeamId) return primaryUe.servingBeamId;
  if (sat.id === primaryUe?.targetSatId && primaryUe.targetBeamId) return primaryUe.targetBeamId;
  if (sat.id === primaryUe?.secondarySatId && primaryUe.secondaryBeamId) return primaryUe.secondaryBeamId;
  const special = sat.beams.find((beam) => beam.role !== 'neutral' && beam.role !== 'inactive');
  if (special) return special.beamId;
  const firstActive = sat.beams.find((beam) => beam.isActive);
  return firstActive?.beamId ?? sat.beams[0]?.beamId ?? null;
}

function buildBeamTargets(
  sat: SatelliteState,
  primaryUe: UeState | null,
  emphasis: BeamSelectionEmphasis,
): BeamTarget[] {
  const beams = [...(sat.beams ?? [])].sort(rankBeams);
  if (beams.length === 0) return [];

  const primaryBeamId = findPrimaryBeamId(sat, primaryUe);
  const limit = EMPHASIS_LIMITS[emphasis];
  const chosen = new Map<string, SatelliteBeamSnapshot>();

  for (const beam of beams) {
    if (
      beam.beamId === primaryBeamId ||
      beam.role === 'serving' ||
      beam.role === 'prepared' ||
      beam.role === 'secondary' ||
      beam.role === 'post-ho'
    ) {
      chosen.set(beam.beamId, beam);
    }
  }

  for (const beam of beams) {
    if (chosen.size >= limit) break;
    if (!beam.isActive && beam.role === 'inactive') continue;
    chosen.set(beam.beamId, beam);
  }

  const selectedBeams = [...chosen.values()].sort(rankBeams);
  const satPos = projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION);
  const beamSpacingKm = beams.length > 1
    ? Math.sqrt(beams[1].offsetEastKm ** 2 + beams[1].offsetNorthKm ** 2) || 25
    : 25;
  const kmToWorld = (2 * FOOTPRINT_RADIUS) / beamSpacingKm;
  const isTransitioningSource =
    sat.id === primaryUe?.servingSatId &&
    (primaryUe?.continuityState === 'prepared' || primaryUe?.continuityState === 'dual-active');

  return selectedBeams.map((beam) => ({
    beam,
    groundX: satPos[0] + beam.offsetEastKm * kmToWorld,
    groundZ: satPos[2] - beam.offsetNorthKm * kmToWorld,
    isServing: beam.role === 'serving',
    isPrimary: beam.beamId === primaryBeamId,
    isScheduledActive: beam.isActive,
    role: beam.role === 'neutral' || beam.role === 'inactive' ? undefined : beam.role,
    isTransitioningSource,
    sinrDb:
      sat.id === primaryUe?.servingSatId && beam.beamId === primaryUe?.servingBeamId
        ? primaryUe.sinrDb
        : null,
  }));
}

const ParityBeam = React.memo(function ParityBeam({
  satellitePosition,
  target,
  showLabels,
}: {
  satellitePosition: THREE.Vector3;
  target: BeamTarget;
  showLabels: boolean;
}) {
  const color = beamColor(target);
  const style = beamOpacity(target);
  const sx = satellitePosition.x;
  const sy = satellitePosition.y;
  const sz = satellitePosition.z;
  const gx = target.groundX;
  const gz = target.groundZ;

  const coneGeo = useMemo(
    () => createObliqueConeSide(new THREE.Vector3(sx, sy, sz), gx, gz, FOOTPRINT_RADIUS),
    [sx, sy, sz, gx, gz],
  );
  const discGeo = useMemo(
    () => createGroundDisc(gx, gz, FOOTPRINT_RADIUS),
    [gx, gz],
  );
  const labelPos = useMemo(
    () => new THREE.Vector3(sx, sy, sz).lerp(new THREE.Vector3(gx, GROUND_Y, gz), 0.35),
    [sx, sy, sz, gx, gz],
  );

  const badge = target.isServing ? ' ★' : target.isPrimary ? ' ◎' : '';
  const roleText = target.role ? ` ${target.role}` : '';
  const inactiveText = !target.isScheduledActive ? ' off-slot' : '';
  const beamLabel = `${formatBeamIndex(target.beam.beamId)}${badge}${inactiveText}${roleText}`;
  const sinrLabel = formatBeamSinr(target.sinrDb);
  const beamLabelFontSize = target.isServing || target.isPrimary || target.role === 'post-ho' ? 14 : 10;
  const sinrFontSize = target.isServing || target.isPrimary || target.role === 'post-ho' ? 11 : 8;

  return (
    <group>
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
        points={[[sx, sy, sz], [gx, GROUND_Y, gz]]}
        color={color}
        lineWidth={style.width}
        transparent
        opacity={style.line}
        dashed={style.dashed}
        dashSize={15}
        gapSize={10}
      />
      {showLabels && (
        <>
          <Text
            position={[labelPos.x, labelPos.y + (sinrLabel ? 5 : 0), labelPos.z]}
            fontSize={beamLabelFontSize}
            color={color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={target.isServing || target.isPrimary || target.role === 'post-ho' ? 2.5 : 1.5}
            outlineColor={target.isServing || target.isPrimary ? '#ffffff' : LABEL_OUTLINE_DARK}
            renderOrder={20}
            material-depthTest={false}
            material-depthWrite={false}
          >
            {beamLabel}
          </Text>
          {sinrLabel && (
            <Text
              position={[labelPos.x, labelPos.y - 8, labelPos.z]}
              fontSize={sinrFontSize}
              color={sinrColor(target.sinrDb!)}
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
        </>
      )}
    </group>
  );
});

export interface LeoParityBeamLayerProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
  showLabels?: boolean;
}

export const LeoParityBeamLayer = React.memo(function LeoParityBeamLayer({
  snapshot,
  visible = true,
  showLabels = true,
}: LeoParityBeamLayerProps) {
  const primaryUe = snapshot?.ues[0] ?? null;
  const presentation = useMemo(() => createLeoParityBeamPresentation(snapshot), [snapshot]);
  const selectionBySatId = useMemo(
    () => new Map((presentation?.selections ?? []).map((selection) => [selection.satId, selection])),
    [presentation],
  );

  const rendered = useMemo(() => {
    if (!snapshot || !visible || !presentation) return [];
    const beamSet = new Set(presentation.beamSatIds);
    return snapshot.satellites
      .filter(
        (sat) =>
          sat.isVisible &&
          sat.elevationDeg > MIN_ELEVATION_DEG &&
          sat.beams &&
          sat.beams.length > 0 &&
          beamSet.has(sat.id),
      )
      .map((sat) => {
        const selection = selectionBySatId.get(sat.id);
        const emphasis = selection?.emphasis ?? 'continuity';
        const targets = buildBeamTargets(sat, primaryUe, emphasis);
        return {
          sat,
          emphasis,
          reason: selection?.reason ?? null,
          targets,
        };
      })
      .filter((entry) => entry.targets.length > 0);
  }, [presentation, primaryUe, selectionBySatId, snapshot, visible]);

  const validationSummary = useMemo(() => {
    const roleCounts: Record<string, number> = {};
    const emphasisCounts: Record<string, number> = {};
    const selectionReasons: Record<string, string> = {};
    let renderedBeamCount = 0;

    for (const entry of rendered) {
      renderedBeamCount += entry.targets.length;
      emphasisCounts[entry.emphasis] = (emphasisCounts[entry.emphasis] ?? 0) + 1;
      if (entry.reason) selectionReasons[entry.sat.id] = entry.reason;
      for (const target of entry.targets) {
        const role = target.beam.role;
        roleCounts[role] = (roleCounts[role] ?? 0) + 1;
      }
    }

    return {
      present: rendered.length > 0,
      viewMode: 'leo-parity',
      renderedSatIds: rendered.map((entry) => entry.sat.id),
      beamSatIds: presentation?.beamSatIds ?? [],
      eventSatIds: presentation?.eventSatIds ?? [],
      renderedBeamCount,
      emphasisCounts,
      selectionReasons,
      roleCounts,
    };
  }, [presentation?.beamSatIds, presentation?.eventSatIds, rendered]);

  usePublishValidationSection('earthMovingBeamLayer', validationSummary);

  if (!snapshot || !visible || rendered.length === 0) return null;

  return (
    <group name="leo-parity-beam-layer">
      {rendered.map(({ sat, targets }) => {
        const satPos = projectToSkyDome(sat.azimuthDeg, sat.elevationDeg, DEFAULT_SKY_PROJECTION);
        const satellitePosition = new THREE.Vector3(satPos[0], satPos[1], satPos[2]);
        return (
          <group key={sat.id}>
            {targets.map((target) => (
              <ParityBeam
                key={`${sat.id}-${target.beam.beamId}`}
                satellitePosition={satellitePosition}
                target={target}
                showLabels={showLabels}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
});
