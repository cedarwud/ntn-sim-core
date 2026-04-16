import type {
  SatelliteBeamSnapshot,
  SimulationSnapshot,
} from '@/core/contracts/runtime-v1';

export interface BeamCompressionPolicy {
  compressCandidateLattice: boolean;
  compressTier1BhLattice: boolean;
}

const MAX_CONTEXT_NEUTRAL_ACTIVE_BEAMS = 3;

export function computeBeamCompressionPolicy(
  snapshot: SimulationSnapshot | null,
  tier1SatIds: ReadonlySet<string>,
): BeamCompressionPolicy {
  const hasTier1Context = tier1SatIds.size > 0;
  return {
    compressCandidateLattice: hasTier1Context,
    compressTier1BhLattice: Boolean(snapshot?.bhSlot) && hasTier1Context,
  };
}

function rankBeamForRendering(
  a: SatelliteBeamSnapshot,
  b: SatelliteBeamSnapshot,
): number {
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

export function selectRenderableBeams(
  beams: SatelliteBeamSnapshot[],
  isCandidate?: boolean,
  policy?: BeamCompressionPolicy,
): SatelliteBeamSnapshot[] {
  const renderable = beams.filter(
    (beam) =>
      beam.isActive
      || beam.role === 'serving'
      || beam.role === 'prepared'
      || beam.role === 'secondary'
      || beam.role === 'post-ho',
  );
  renderable.sort(rankBeamForRendering);

  if (isCandidate && policy?.compressCandidateLattice) {
    // Background candidates should stay explainable without exploding the
    // scene into a full secondary lattice.
    return renderable.slice(0, 1);
  }

  if (policy?.compressTier1BhLattice) {
    // BH-active tier-1 satellites stay readable by keeping all role beams and
    // a few neutral active beams as slot context, instead of collapsing the
    // lattice down to a single neutral beam.
    const roleBeams = renderable.filter((beam) => beam.role !== 'neutral');
    const neutralActiveBeams = renderable.filter(
      (beam) => beam.role === 'neutral' && beam.isActive,
    );
    return [
      ...roleBeams,
      ...neutralActiveBeams.slice(0, MAX_CONTEXT_NEUTRAL_ACTIVE_BEAMS),
    ];
  }

  return renderable;
}
