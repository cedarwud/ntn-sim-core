import type {
  ContinuityState,
  SimulationSnapshot,
} from '@/core/contracts/runtime-v1';

export type ContinuityNarrativePhase =
  | 'stable'
  | 'prepared'
  | 'dual-active'
  | 'post-switch';

export interface ContinuityNarrativeState {
  phase: ContinuityNarrativePhase;
  rawContinuityState: ContinuityState | null;
  rawDapsPhase: string | null;
  timeSec: number;
  phaseStartedAtSec: number;
  servingSatId: string | null;
  sourceSatId: string | null;
  targetSatId: string | null;
  postHoSatId: string | null;
  recentSourceSatId: string | null;
  sourceCooldownUntilSec: number | null;
  cooledDownSatIds: string[];
  cooldownSuppressedTargetSatId: string | null;
  handoverInProgress: boolean;
  narrativeSatIds: string[];
}

const PREPARED_TARGET_GAP_GRACE_SEC = 1.25;
const DUAL_ACTIVE_GAP_GRACE_SEC = 1.25;
const POST_SWITCH_HOLD_SEC = 2.4;
const SOURCE_COOLDOWN_SEC = 4.0;

function dedupeSatIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((satId): satId is string => typeof satId === 'string' && satId.length > 0))];
}

function classifyRawPhase(
  continuityState: ContinuityState | null,
  dapsPhase: string | null,
): ContinuityNarrativePhase {
  if (continuityState === 'dual-active' || dapsPhase === 'dual-active') {
    return 'dual-active';
  }
  if (continuityState === 'prepared' || dapsPhase === 'prepared') {
    return 'prepared';
  }
  if (continuityState === 'post-ho') {
    return 'post-switch';
  }
  return 'stable';
}

function carryForwardIfActive(
  previous: ContinuityNarrativeState | null | undefined,
  timeSec: number,
): Pick<ContinuityNarrativeState, 'recentSourceSatId' | 'sourceCooldownUntilSec' | 'cooledDownSatIds'> {
  if (
    !previous
    || previous.recentSourceSatId === null
    || previous.sourceCooldownUntilSec === null
    || previous.sourceCooldownUntilSec <= timeSec
  ) {
    return {
      recentSourceSatId: null,
      sourceCooldownUntilSec: null,
      cooledDownSatIds: [],
    };
  }

  return {
    recentSourceSatId: previous.recentSourceSatId,
    sourceCooldownUntilSec: previous.sourceCooldownUntilSec,
    cooledDownSatIds: [previous.recentSourceSatId],
  };
}

function buildBaseState(args: {
  phase: ContinuityNarrativePhase;
  timeSec: number;
  phaseStartedAtSec: number;
  rawContinuityState: ContinuityState | null;
  rawDapsPhase: string | null;
  servingSatId: string | null;
  sourceSatId: string | null;
  targetSatId: string | null;
  postHoSatId: string | null;
  recentSourceSatId: string | null;
  sourceCooldownUntilSec: number | null;
  cooledDownSatIds: string[];
  cooldownSuppressedTargetSatId: string | null;
}): ContinuityNarrativeState {
  const {
    phase,
    timeSec,
    phaseStartedAtSec,
    rawContinuityState,
    rawDapsPhase,
    servingSatId,
    sourceSatId,
    targetSatId,
    postHoSatId,
    recentSourceSatId,
    sourceCooldownUntilSec,
    cooledDownSatIds,
    cooldownSuppressedTargetSatId,
  } = args;

  return {
    phase,
    rawContinuityState,
    rawDapsPhase,
    timeSec,
    phaseStartedAtSec,
    servingSatId,
    sourceSatId,
    targetSatId,
    postHoSatId,
    recentSourceSatId,
    sourceCooldownUntilSec,
    cooledDownSatIds,
    cooldownSuppressedTargetSatId,
    handoverInProgress: phase !== 'stable',
    narrativeSatIds: dedupeSatIds([
      servingSatId,
      sourceSatId,
      targetSatId,
      postHoSatId,
    ]),
  };
}

export function buildContinuityNarrativeState(
  snapshot: SimulationSnapshot,
  previous: ContinuityNarrativeState | null,
): ContinuityNarrativeState {
  const timeSec = snapshot.timeSec;
  const primaryUe = snapshot.ues[0] ?? null;
  const rawContinuityState = primaryUe?.continuityState ?? null;
  const rawDapsPhase = snapshot.daps?.phase ?? null;
  const rawPhase = classifyRawPhase(rawContinuityState, rawDapsPhase);
  const currentServingSatId = primaryUe?.servingSatId ?? null;
  const rawTargetSatId = primaryUe?.targetSatId ?? null;
  const rawSecondarySatId = primaryUe?.secondarySatId ?? null;
  const publishedTransition = primaryUe?.servingTransition;
  const hasPublishedTransition = publishedTransition !== undefined;
  const servingChanged = hasPublishedTransition
    ? publishedTransition.kind === 'inter-satellite-handover'
    : Boolean(
      previous?.servingSatId
        && currentServingSatId
        && previous.servingSatId !== currentServingSatId,
    );
  const publishedPostSwitchSourceSatId = servingChanged
    ? publishedTransition?.sourceSatId ?? null
    : null;
  const publishedServiceState = primaryUe?.serviceState?.state ?? null;

  let {
    recentSourceSatId,
    sourceCooldownUntilSec,
    cooledDownSatIds,
  } = carryForwardIfActive(previous, timeSec);

  if (servingChanged && (publishedPostSwitchSourceSatId ?? previous?.servingSatId)) {
    recentSourceSatId = publishedPostSwitchSourceSatId ?? previous?.servingSatId ?? null;
    sourceCooldownUntilSec = timeSec + SOURCE_COOLDOWN_SEC;
    cooledDownSatIds = recentSourceSatId ? [recentSourceSatId] : [];
  }

  const cooldownSuppressedTargetSatId = (
    rawPhase !== 'post-switch'
    && recentSourceSatId !== null
    && rawTargetSatId === recentSourceSatId
    && sourceCooldownUntilSec !== null
    && sourceCooldownUntilSec > timeSec
  ) ? rawTargetSatId : null;

  const preparedTargetSatId = cooldownSuppressedTargetSatId ? null : rawTargetSatId;

  if (rawPhase === 'dual-active') {
    const sourceSatId = snapshot.daps?.sourceSatId
      ?? previous?.sourceSatId
      ?? currentServingSatId;
    const targetSatId = snapshot.daps?.targetSatId
      ?? rawSecondarySatId
      ?? preparedTargetSatId;
    return buildBaseState({
      phase: 'dual-active',
      timeSec,
      phaseStartedAtSec:
        previous?.phase === 'dual-active'
        && previous.targetSatId === targetSatId
        && previous.sourceSatId === sourceSatId
          ? previous.phaseStartedAtSec
          : timeSec,
      rawContinuityState,
      rawDapsPhase,
      servingSatId: currentServingSatId ?? sourceSatId,
      sourceSatId,
      targetSatId,
      postHoSatId: null,
      recentSourceSatId,
      sourceCooldownUntilSec,
      cooledDownSatIds,
      cooldownSuppressedTargetSatId,
    });
  }

  if (rawPhase === 'prepared' && preparedTargetSatId) {
    return buildBaseState({
      phase: 'prepared',
      timeSec,
      phaseStartedAtSec:
        previous?.phase === 'prepared'
        && previous.servingSatId === currentServingSatId
        && previous.targetSatId === preparedTargetSatId
          ? previous.phaseStartedAtSec
          : timeSec,
      rawContinuityState,
      rawDapsPhase,
      servingSatId: currentServingSatId,
      sourceSatId: currentServingSatId,
      targetSatId: preparedTargetSatId,
      postHoSatId: null,
      recentSourceSatId,
      sourceCooldownUntilSec,
      cooledDownSatIds,
      cooldownSuppressedTargetSatId,
    });
  }

  if (rawPhase === 'post-switch' || servingChanged) {
    const postHoSatId = publishedPostSwitchSourceSatId ?? rawTargetSatId ?? recentSourceSatId;
    return buildBaseState({
      phase: 'post-switch',
      timeSec,
      phaseStartedAtSec:
        previous?.phase === 'post-switch' && !servingChanged
          ? previous.phaseStartedAtSec
          : timeSec,
      rawContinuityState,
      rawDapsPhase,
      servingSatId: currentServingSatId,
      sourceSatId: postHoSatId,
      targetSatId: currentServingSatId,
      postHoSatId,
      recentSourceSatId,
      sourceCooldownUntilSec,
      cooledDownSatIds,
      cooldownSuppressedTargetSatId: null,
    });
  }

  if (publishedServiceState === 'no-service') {
    return buildBaseState({
      phase: 'stable',
      timeSec,
      phaseStartedAtSec:
        previous?.phase === 'stable' && previous.servingSatId === null
          ? previous.phaseStartedAtSec
          : timeSec,
      rawContinuityState,
      rawDapsPhase,
      servingSatId: null,
      sourceSatId: null,
      targetSatId: null,
      postHoSatId: null,
      recentSourceSatId,
      sourceCooldownUntilSec,
      cooledDownSatIds,
      cooldownSuppressedTargetSatId: null,
    });
  }

  if (
    previous?.phase === 'dual-active'
    && previous.targetSatId
    && currentServingSatId === previous.servingSatId
    && timeSec - previous.timeSec <= DUAL_ACTIVE_GAP_GRACE_SEC
  ) {
    return buildBaseState({
      ...previous,
      timeSec,
      rawContinuityState,
      rawDapsPhase,
      recentSourceSatId,
      sourceCooldownUntilSec,
      cooledDownSatIds,
      cooldownSuppressedTargetSatId,
    });
  }

  if (
    previous?.phase === 'prepared'
    && previous.targetSatId
    && currentServingSatId === previous.servingSatId
    && timeSec - previous.timeSec <= PREPARED_TARGET_GAP_GRACE_SEC
  ) {
    return buildBaseState({
      ...previous,
      timeSec,
      rawContinuityState,
      rawDapsPhase,
      recentSourceSatId,
      sourceCooldownUntilSec,
      cooledDownSatIds,
      cooldownSuppressedTargetSatId,
    });
  }

  if (
    previous?.phase === 'post-switch'
    && previous.postHoSatId
    && currentServingSatId === previous.servingSatId
    && timeSec - previous.phaseStartedAtSec <= POST_SWITCH_HOLD_SEC
  ) {
    return buildBaseState({
      ...previous,
      timeSec,
      rawContinuityState,
      rawDapsPhase,
      recentSourceSatId,
      sourceCooldownUntilSec,
      cooledDownSatIds,
      cooldownSuppressedTargetSatId: null,
    });
  }

  return buildBaseState({
    phase: 'stable',
    timeSec,
    phaseStartedAtSec: timeSec,
    rawContinuityState,
    rawDapsPhase,
    servingSatId: currentServingSatId,
    sourceSatId: null,
    targetSatId: null,
    postHoSatId: null,
    recentSourceSatId,
    sourceCooldownUntilSec,
    cooledDownSatIds,
    cooldownSuppressedTargetSatId,
  });
}

export function formatContinuityNarrativeLabel(
  narrative: ContinuityNarrativeState | null | undefined,
): string {
  switch (narrative?.phase) {
    case 'prepared':
      return 'Prepared / target visible';
    case 'dual-active':
      return 'Dual-active switch';
    case 'post-switch':
      return 'Post-switch hold';
    case 'stable':
    default:
      return 'Stable serving';
  }
}
