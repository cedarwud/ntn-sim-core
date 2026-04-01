#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSimEngine } from '../src/core/engine';
import { ModqnBaselineAdapter } from '../src/core/algorithms/modqn-baseline-adapter';
import {
  MODQN_BASELINE_OBJECTIVE_WEIGHTS,
  MODQN_BASELINE_TRAINING_PROTOCOL,
  type ModqnBaselineObservation,
  type ModqnObjectiveQValue,
} from '../src/core/contracts/modqn-contracts';
import { CASE9_ACCESS_BASELINE } from '../src/core/profiles/defaults-access';
import {
  MODQN_PAPER_BASELINE,
  MODQN_PAPER_BASELINE_BUNDLE,
  MODQN_PAPER_BASELINE_DEFAULT_EXP,
} from '../src/core/profiles/defaults-modqn';
import { buildProfileTrajectoryCache, resolveProfileOrbitElements } from '../src/core/orbit/profile-runtime';
import type { Policy, PolicyObservation } from '../src/core/policy/types';
import type { ProfileConfig } from '../src/core/profiles/types';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const failures: string[] = [];

function pass(label: string, detail?: string) {
  console.log(`[PASS] ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, detail: string) {
  failures.push(`${label}: ${detail}`);
  console.error(`[FAIL] ${label} — ${detail}`);
}

function check(label: string, condition: boolean, detail: string) {
  if (condition) {
    pass(label, detail);
  } else {
    fail(label, detail);
  }
}

function approxEqual(actual: number, expected: number, tolerance = 1e-6): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

function checkNumber(label: string, actual: number, expected: number, tolerance = 1e-6) {
  check(label, approxEqual(actual, expected, tolerance), `expected ${expected}, got ${actual}`);
}

function checkJson(label: string, actual: unknown, expected: unknown) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  check(label, actualJson === expectedJson, `expected ${expectedJson}, got ${actualJson}`);
}

function makeGenericObservation(): PolicyObservation {
  return {
    tick: 7,
    timeSec: 7,
    satellites: [],
    ues: [
      {
        ueId: 'ue-0',
        sinrDb: 8,
        servingSatId: 'sat-a',
        distanceFromCenterKm: 0,
      },
    ],
    global: {
      totalActiveSatellites: 2,
      totalActiveBeams: 2,
      totalPowerW: 0,
      meanSinrDb: 8,
    },
  };
}

function makeBaselineObservation(): ModqnBaselineObservation {
  return {
    tick: 7,
    timeSec: 7,
    userId: 'ue-0',
    currentSatId: 'sat-a',
    currentBeamId: 'sat-a-b0',
    beams: [
      {
        satId: 'sat-a',
        beamId: 'sat-a-b0',
        beamIndex: 0,
        channelGainLinear: 1.5,
        snrLinear: 8,
        beamCenterEastKm: 0,
        beamCenterNorthKm: 0,
        userCount: 10,
        beamThroughputMbps: 11,
      },
      {
        satId: 'sat-b',
        beamId: 'sat-b-b3',
        beamIndex: 1,
        channelGainLinear: 3.1,
        snrLinear: 12,
        beamCenterEastKm: 20,
        beamCenterNorthKm: -10,
        userCount: 2,
        beamThroughputMbps: 17,
      },
    ],
  };
}

function validateTrainingProtocol() {
  console.log('\n== VAL-MODQN-001A: training protocol ==');
  checkJson('objective weights constant', MODQN_BASELINE_OBJECTIVE_WEIGHTS, [0.5, 0.3, 0.2]);
  checkJson('training hidden layers', MODQN_BASELINE_TRAINING_PROTOCOL.hiddenLayers, [100, 50, 50]);
  check('training activation', MODQN_BASELINE_TRAINING_PROTOCOL.activation === 'tanh', MODQN_BASELINE_TRAINING_PROTOCOL.activation);
  check('training optimizer', MODQN_BASELINE_TRAINING_PROTOCOL.optimizer === 'Adam', MODQN_BASELINE_TRAINING_PROTOCOL.optimizer);
  check('training exploration', MODQN_BASELINE_TRAINING_PROTOCOL.exploration === 'epsilon-greedy', MODQN_BASELINE_TRAINING_PROTOCOL.exploration);
  checkNumber('training learning rate', MODQN_BASELINE_TRAINING_PROTOCOL.learningRate, 0.01);
  checkNumber('training discount factor', MODQN_BASELINE_TRAINING_PROTOCOL.discountFactor, 0.9);
  check('training batch size', MODQN_BASELINE_TRAINING_PROTOCOL.batchSize === 128, String(MODQN_BASELINE_TRAINING_PROTOCOL.batchSize));
  check('training slot sec', MODQN_BASELINE_TRAINING_PROTOCOL.timeSlotSec === 1, String(MODQN_BASELINE_TRAINING_PROTOCOL.timeSlotSec));
  check('training episode duration', MODQN_BASELINE_TRAINING_PROTOCOL.episodeDurationSec === 10, String(MODQN_BASELINE_TRAINING_PROTOCOL.episodeDurationSec));
  check('training episodes', MODQN_BASELINE_TRAINING_PROTOCOL.episodes === 9000, String(MODQN_BASELINE_TRAINING_PROTOCOL.episodes));
  checkJson('training weights binding', MODQN_BASELINE_TRAINING_PROTOCOL.weights, MODQN_BASELINE_OBJECTIVE_WEIGHTS);
}

function validateProfileEnvelope() {
  console.log('\n== VAL-MODQN-001B: profile envelope ==');
  check('profile id', MODQN_PAPER_BASELINE.id === 'modqn-paper-baseline', MODQN_PAPER_BASELINE.id);
  check('profile family', MODQN_PAPER_BASELINE.family === 'modqn-paper-baseline', String(MODQN_PAPER_BASELINE.family));
  check('profile policy id', MODQN_PAPER_BASELINE.policyId === 'modqn-baseline', String(MODQN_PAPER_BASELINE.policyId));
  check('profile independent handover', MODQN_PAPER_BASELINE.ueConfig.independentHandover === true, String(MODQN_PAPER_BASELINE.ueConfig.independentHandover));
  check('profile ue count', MODQN_PAPER_BASELINE.ueConfig.count === 100, String(MODQN_PAPER_BASELINE.ueConfig.count));
  check('profile ue distribution', MODQN_PAPER_BASELINE.ueConfig.distribution === 'uniform', MODQN_PAPER_BASELINE.ueConfig.distribution);
  check('profile episode epoch', MODQN_PAPER_BASELINE.timeControl.epochUtcMs === Date.UTC(2026, 0, 1, 3, 36, 0), new Date(MODQN_PAPER_BASELINE.timeControl.epochUtcMs).toISOString());
  checkNumber('profile orbital altitude', MODQN_PAPER_BASELINE.orbital.altitude_km, 780);
  checkNumber('profile orbital inclination', MODQN_PAPER_BASELINE.orbital.inclination_deg, 53);
  check('profile orbit shell size', MODQN_PAPER_BASELINE.orbital.num_planes === 2 && MODQN_PAPER_BASELINE.orbital.sats_per_plane === 2, `${MODQN_PAPER_BASELINE.orbital.num_planes}x${MODQN_PAPER_BASELINE.orbital.sats_per_plane}`);
  checkNumber('profile carrier frequency', MODQN_PAPER_BASELINE.rf.frequency_ghz, 20);
  checkNumber('profile bandwidth', MODQN_PAPER_BASELINE.rf.bandwidth_mhz, 500);
  checkNumber('profile tx power per beam', MODQN_PAPER_BASELINE.rf.tx_power_per_beam_dbm ?? Number.NaN, 33.0103, 1e-4);
  checkNumber('profile noise figure', MODQN_PAPER_BASELINE.rf.noise_figure_db, 0);
  checkNumber('profile implementation loss', MODQN_PAPER_BASELINE.rf.implementation_loss_db, 0);
  checkNumber('profile antenna gain', MODQN_PAPER_BASELINE.antenna.peak_gain_dbi, 60);
  checkNumber('profile beam diameter', MODQN_PAPER_BASELINE.antenna.beam_diameter_km, 90);
  check('profile beam layout', MODQN_PAPER_BASELINE.beam.num_beams === 7 && MODQN_PAPER_BASELINE.beam.frf === 1, `${MODQN_PAPER_BASELINE.beam.num_beams} beams, frf ${MODQN_PAPER_BASELINE.beam.frf}`);
  check('profile handover type', MODQN_PAPER_BASELINE.handover.type === 'hard-ho', MODQN_PAPER_BASELINE.handover.type);
  checkNumber('profile trigger threshold', MODQN_PAPER_BASELINE.handover.trigger_threshold_db, -30);
  checkNumber('profile ttt', MODQN_PAPER_BASELINE.handover.ttt_ms, 0);
  checkNumber('profile hysteresis', MODQN_PAPER_BASELINE.handover.hysteresis_db, 0);
  checkNumber('profile min elevation', MODQN_PAPER_BASELINE.handover.min_elevation_deg, 10);
  checkNumber('profile ping-pong window', MODQN_PAPER_BASELINE.handover.pingPongWindowSec ?? Number.NaN, 10);
  checkNumber('profile speed', MODQN_PAPER_BASELINE.ueConfig.speed_kmh, 30);
  check('profile experiment duration', MODQN_PAPER_BASELINE.timeControl.durationSec === 10, String(MODQN_PAPER_BASELINE.timeControl.durationSec));
  check('profile experiment step', MODQN_PAPER_BASELINE.timeControl.stepSec === 1, String(MODQN_PAPER_BASELINE.timeControl.stepSec));
  check('profile experiment seed', MODQN_PAPER_BASELINE.seed === 42, String(MODQN_PAPER_BASELINE.seed));
  check('bundle exposure tier', MODQN_PAPER_BASELINE_BUNDLE.exposurePreset.tier === 'Advanced', MODQN_PAPER_BASELINE_BUNDLE.exposurePreset.tier);
  check('bundle experiment duration', MODQN_PAPER_BASELINE_DEFAULT_EXP.timeControl.durationSec === 10, String(MODQN_PAPER_BASELINE_DEFAULT_EXP.timeControl.durationSec));
  check('bundle experiment step', MODQN_PAPER_BASELINE_DEFAULT_EXP.timeControl.stepSec === 1, String(MODQN_PAPER_BASELINE_DEFAULT_EXP.timeControl.stepSec));

  const allowedSourceIds = new Set([
    'PAP-2024-MORL-MULTIBEAM',
    'ASSUME-MODQN-ORBIT',
    'ASSUME-MODQN-BEAM',
    'ASSUME-MODQN-RUNTIME',
  ]);
  const disallowed = MODQN_PAPER_BASELINE_BUNDLE.sourceMap.filter((entry) => !allowedSourceIds.has(entry.id));
  check('source map allowed ids', disallowed.length === 0, disallowed.map((entry) => entry.id).join(', ') || 'all allowed');
}

function validateImportBoundaries() {
  console.log('\n== VAL-MODQN-001C: import boundaries ==');

  const specs = [
    'src/core/algorithms/modqn-baseline-adapter.ts',
    'src/core/algorithms/modqn-baseline-types.ts',
  ];
  const importPattern = /from\s+['"]([^'"]+)['"]/g;

  for (const relativePath of specs) {
    const content = readFileSync(path.join(rootDir, relativePath), 'utf8');
    const imports = Array.from(content.matchAll(importPattern), (match) => match[1]);
    const violations = imports.filter((importPath) => (
      importPath.startsWith('@/core/')
      && !importPath.startsWith('@/core/contracts/')
    ));
    check(relativePath, violations.length === 0, violations.join(', ') || 'contracts-only core imports');
  }
}

function validateAdapterLogic() {
  console.log('\n== VAL-MODQN-001D: adapter logic ==');

  const baselineObservation = makeBaselineObservation();
  const adapter = new ModqnBaselineAdapter();
  const state = adapter.buildPaperState(baselineObservation);
  checkJson('paper state access vector', state.accessVector, [1, 0]);
  checkJson('paper state gains', state.channelGainsLinear, [1.5, 3.1]);
  checkJson('paper state locations', state.beamLocationsKm, [
    { eastKm: 0, northKm: 0 },
    { eastKm: 20, northKm: -10 },
  ]);
  checkJson('paper state users per beam', state.usersPerBeam, [10, 2]);

  const qValues: ModqnObjectiveQValue[] = [
    {
      satId: 'sat-a',
      beamId: 'sat-a-b0',
      beamIndex: 0,
      throughputQ: 1,
      handoverQ: 0,
      loadBalanceQ: 0,
    },
    {
      satId: 'sat-b',
      beamId: 'sat-b-b3',
      beamIndex: 1,
      throughputQ: 0.7,
      handoverQ: 0.5,
      loadBalanceQ: 0.5,
    },
  ];
  const paperDecision = adapter.selectPaperAction(baselineObservation, qValues);
  check('selectPaperAction winner index', paperDecision.action.selectedIndex === 1, String(paperDecision.action.selectedIndex));
  check('selectPaperAction winner sat', paperDecision.action.satId === 'sat-b', paperDecision.action.satId);
  checkJson('selectPaperAction one-hot', paperDecision.action.oneHot, [0, 1]);

  const deferAction = adapter.buildPolicyAction(
    {
      selectedIndex: 0,
      satId: 'sat-a',
      beamId: 'sat-a-b0',
      oneHot: [1, 0],
    },
    baselineObservation,
  );
  check('buildPolicyAction same beam defer', deferAction.handoverAction.mode === 'defer', deferAction.handoverAction.mode);
  check('buildPolicyAction same beam no sat action', deferAction.satelliteActions.length === 0, String(deferAction.satelliteActions.length));

  const triggerAction = adapter.buildPolicyAction(
    {
      selectedIndex: 1,
      satId: 'sat-b',
      beamId: 'sat-b-b3',
      oneHot: [0, 1],
    },
    baselineObservation,
  );
  check('buildPolicyAction trigger mode', triggerAction.handoverAction.mode === 'trigger', triggerAction.handoverAction.mode);
  check('buildPolicyAction target sat', triggerAction.handoverAction.targetSatId === 'sat-b', String(triggerAction.handoverAction.targetSatId));
  checkJson('buildPolicyAction selected beam bridge', triggerAction.satelliteActions[0]?.activeBeamIds ?? [], ['sat-b-b3']);

  const noHoReward = adapter.buildRewardVector({
    previousSatId: 'sat-a',
    previousBeamId: 'sat-a-b0',
    selectedSatId: 'sat-a',
    selectedBeamId: 'sat-a-b0',
    userThroughputMbps: 12,
    beamThroughputsMbps: [12, 5, 9],
    totalUsers: 3,
    intraSatellitePenalty: 1,
    interSatellitePenalty: 2,
  });
  checkNumber('reward throughput', noHoReward.throughput, 12);
  checkNumber('reward no-HO penalty', noHoReward.handoverPenalty, 0);
  checkNumber('reward load balance', noHoReward.loadBalance, -(7 / 3));

  const intraReward = adapter.buildRewardVector({
    previousSatId: 'sat-a',
    previousBeamId: 'sat-a-b0',
    selectedSatId: 'sat-a',
    selectedBeamId: 'sat-a-b1',
    userThroughputMbps: 12,
    beamThroughputsMbps: [12, 5, 9],
    totalUsers: 3,
    intraSatellitePenalty: 1,
    interSatellitePenalty: 2,
  });
  checkNumber('reward intra-satellite penalty', intraReward.handoverPenalty, -1);

  const interReward = adapter.buildRewardVector({
    previousSatId: 'sat-a',
    previousBeamId: 'sat-a-b0',
    selectedSatId: 'sat-b',
    selectedBeamId: 'sat-b-b3',
    userThroughputMbps: 12,
    beamThroughputsMbps: [12, 5, 9],
    totalUsers: 3,
    intraSatellitePenalty: 1,
    interSatellitePenalty: 2,
  });
  checkNumber('reward inter-satellite penalty', interReward.handoverPenalty, -2);

  const truthSourceAdapter = new ModqnBaselineAdapter({
    truthSource: {
      getObservation: () => baselineObservation,
    },
  });
  const selectedAction = truthSourceAdapter.selectAction(makeGenericObservation());
  check('selectAction truth-source trigger', selectedAction.handoverAction.mode === 'trigger', selectedAction.handoverAction.mode);
  check('selectAction truth-source target', selectedAction.handoverAction.targetSatId === 'sat-b', String(selectedAction.handoverAction.targetSatId));
  checkJson('selectAction truth-source beam bridge', selectedAction.satelliteActions[0]?.activeBeamIds ?? [], ['sat-b-b3']);

  const autoAction = adapter.selectAction(makeGenericObservation());
  check('selectAction fallback auto', autoAction.handoverAction.mode === 'auto', autoAction.handoverAction.mode);
}

function buildSmokeProfile(): ProfileConfig {
  return CASE9_ACCESS_BASELINE;
}

function validatePolicyQueueSmoke() {
  console.log('\n== VAL-MODQN-001E: pendingPolicyAction runtime smoke ==');

  const profile = buildSmokeProfile();
  const elements = resolveProfileOrbitElements(profile);
  const trajectoryCache = buildProfileTrajectoryCache(profile, elements);
  let firstQueuedTargetSatId: string | null = null;
  let lastQueuedTargetSatId: string | null = null;

  const policy: Policy = {
    name: 'modqn-smoke-policy',
    selectAction(obs) {
      const servingSatId = obs.ues[0]?.servingSatId ?? null;
      const target = obs.satellites.find((sat) => (
        sat.elevationDeg >= profile.handover.min_elevation_deg
        && sat.satId !== servingSatId
      ));
      lastQueuedTargetSatId = target?.satId ?? null;
      if (firstQueuedTargetSatId === null) {
        firstQueuedTargetSatId = lastQueuedTargetSatId;
      }
      return lastQueuedTargetSatId
        ? {
            satelliteActions: [],
            handoverAction: { mode: 'trigger', targetSatId: lastQueuedTargetSatId },
          }
        : {
            satelliteActions: [],
            handoverAction: { mode: 'auto' },
          };
    },
    reset() {},
  };

  const engine = createSimEngine({ profile, trajectoryCache, policy });
  const snapshot0 = engine.tick(0, 0);
  const initialServing = snapshot0.ues[0]?.servingSatId ?? null;
  const snapshot1 = engine.tick(1, 1);
  const nextServing = snapshot1.ues[0]?.servingSatId ?? null;

  check('policy smoke target discovered', firstQueuedTargetSatId !== null, String(firstQueuedTargetSatId));
  check('policy smoke target differs from initial serving', firstQueuedTargetSatId !== initialServing, `serving=${initialServing}, target=${firstQueuedTargetSatId}`);
  check('policy smoke consumed queued action', nextServing === firstQueuedTargetSatId, `serving=${nextServing}, target=${firstQueuedTargetSatId}`);
}

function validateExternalOverrideSmoke() {
  console.log('\n== VAL-MODQN-001F: pendingExternalAction runtime smoke ==');

  const profile = buildSmokeProfile();
  const elements = resolveProfileOrbitElements(profile);
  const trajectoryCache = buildProfileTrajectoryCache(profile, elements);
  const engine = createSimEngine({ profile, trajectoryCache });
  const snapshot0 = engine.tick(0, 0);
  const initialServing = snapshot0.ues[0]?.servingSatId ?? null;
  const target = snapshot0.satellites.find((sat) => (
    sat.isVisible
    && sat.elevationDeg >= profile.handover.min_elevation_deg
    && sat.id !== initialServing
  ));

  check('external smoke target discovered', Boolean(target), target?.id ?? 'none');
  if (!target) {
    return;
  }

  engine.applyAction({
    satelliteActions: [],
    handoverAction: {
      mode: 'trigger',
      targetSatId: target.id,
    },
  });
  const snapshot1 = engine.tick(1, 1);
  const nextServing = snapshot1.ues[0]?.servingSatId ?? null;
  check('external smoke consumed queued action', nextServing === target.id, `serving=${nextServing}, target=${target.id}`);
}

function validateModqnRuntimeViability() {
  console.log('\n== VAL-MODQN-001G: modqn profile runtime viability ==');

  const profile = MODQN_PAPER_BASELINE;
  const elements = resolveProfileOrbitElements(profile);
  const trajectoryCache = buildProfileTrajectoryCache(profile, elements);
  const passCount = [...trajectoryCache.passesBySatId.values()].reduce((sum, entries) => sum + entries.length, 0);
  check('modqn cache has passes', passCount > 0, String(passCount));

  const engine = createSimEngine({ profile, trajectoryCache });
  const snapshot0 = engine.tick(0, 0);
  const visibleCount = snapshot0.satellites.filter((sat) => sat.isVisible).length;
  check('modqn runtime has visible satellites', visibleCount > 0, String(visibleCount));
  check('modqn runtime attaches UE', snapshot0.ues.some((ue) => ue.servingSatId !== null), snapshot0.ues[0]?.servingSatId ?? 'none');
}

function main() {
  validateTrainingProtocol();
  validateProfileEnvelope();
  validateImportBoundaries();
  validateAdapterLogic();
  validatePolicyQueueSmoke();
  validateExternalOverrideSmoke();
  validateModqnRuntimeViability();

  console.log('');
  if (failures.length > 0) {
    console.error(`validate-modqn-baseline: FAILED (${failures.length} issue(s))`);
    process.exit(1);
  }

  console.log('validate-modqn-baseline: OK');
}

main();
