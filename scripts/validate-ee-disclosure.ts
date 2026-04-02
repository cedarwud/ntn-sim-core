#!/usr/bin/env node

import {
  buildEePowerDisclosureFromProfileSnapshot,
  createEnergyLayer1,
  DEFAULT_ENERGY_LAYER1_CONFIG,
} from '../src/core/energy/layer1.ts';
import { getProfileProvenanceView } from '../src/core/config/profile-provenance-view.ts';
import { loadProfile } from '../src/core/profiles/loader.ts';
import {
  createResolvedConfig,
  createRunArtifactBundle,
  createRunManifest,
  createSourceTrace,
} from '../src/core/trace/factory.ts';

let failures = 0;

function pass(label: string, detail = '') {
  console.log(`  [PASS] ${label}${detail ? `: ${detail}` : ''}`);
}

function fail(label: string, detail = '') {
  failures += 1;
  console.log(`  [FAIL] ${label}${detail ? `: ${detail}` : ''}`);
}

function check(label: string, condition: boolean, detail: string) {
  if (condition) {
    pass(label, detail);
  } else {
    fail(label, detail);
  }
}

function checkApprox(label: string, actual: number, expected: number, tolerance: number, unit = '') {
  const diff = Math.abs(actual - expected);
  const ok = diff <= tolerance;
  if (ok) {
    pass(label, `${actual.toFixed(6)}${unit ? ` ${unit}` : ''}`);
  } else {
    fail(
      label,
      `actual=${actual.toFixed(6)} expected=${expected.toFixed(6)} tol=${tolerance.toExponential(2)}${unit ? ` ${unit}` : ''}`,
    );
  }
}

function buildArtifact(profileId: string) {
  const profile = loadProfile(profileId);
  const provenance = getProfileProvenanceView(profile.id);
  const manifest = createRunManifest({
    profileId: profile.id,
    profileFamily: profile.family,
    presentationMode: 'benchmark',
    orbitMode: profile.orbitMode,
    seed: profile.seed,
    durationSec: profile.timeControl.durationSec,
    stepSec: profile.timeControl.stepSec,
    engineVersion: 'validate-ee-disclosure',
    specModeIndex: provenance.specModeIndex,
  });
  const resolvedConfig = createResolvedConfig(
    manifest,
    profile as unknown as Record<string, unknown>,
    {},
  );
  const sourceTrace = createSourceTrace(provenance.sourceTraceEntries);
  const artifact = createRunArtifactBundle(
    manifest,
    resolvedConfig,
    sourceTrace,
    undefined,
    undefined,
    undefined,
    undefined,
    provenance.assumptionSet,
  );

  return { profile, provenance, artifact };
}

console.log('\n=== VAL-EE-004: EE / Power Disclosure and Sensitivity Guard ===\n');

const manager = createEnergyLayer1();
manager.updateBeamStates('sat-1', ['beam-1'], ['beam-1', 'beam-2']);
const runtimeMetrics = manager.computeMetrics(new Map([['beam-1', 1000]]));
const expectedActiveTxPowerW = Math.pow(
  10,
  (DEFAULT_ENERGY_LAYER1_CONFIG.txPowerPerBeamDbm - 30) / 10,
);
const expectedTotalPowerW =
  DEFAULT_ENERGY_LAYER1_CONFIG.activeBeamPowerW +
  DEFAULT_ENERGY_LAYER1_CONFIG.idlePowerW;

checkApprox(
  'runtime activeTxPowerW matches the active-TX EE denominator',
  runtimeMetrics.activeTxPowerW,
  expectedActiveTxPowerW,
  1e-9,
  'W',
);
checkApprox(
  'runtime totalPowerW remains the broader communication-power proxy',
  runtimeMetrics.totalPowerW,
  expectedTotalPowerW,
  1e-9,
  'W',
);
checkApprox(
  'systemEeBitsPerJoule divides by activeTxPowerW instead of totalPowerW',
  runtimeMetrics.systemEeBitsPerJoule,
  1000 / expectedActiveTxPowerW,
  1e-9,
  'bpj',
);
check(
  'runtime EE denominator is visibly distinct from the broader totalPowerW proxy',
  Math.abs(runtimeMetrics.systemEeBitsPerJoule - 1000 / runtimeMetrics.totalPowerW) > 1e-6,
  `systemEe=${runtimeMetrics.systemEeBitsPerJoule.toFixed(6)} totalProxyEe=${(1000 / runtimeMetrics.totalPowerW).toFixed(6)}`,
);
check(
  'runtime beam-state counters stay explicit',
  runtimeMetrics.activeBeamCount === 1 &&
    runtimeMetrics.idleBeamCount === 1 &&
    runtimeMetrics.offBeamCount === 0,
  `active=${runtimeMetrics.activeBeamCount} idle=${runtimeMetrics.idleBeamCount} off=${runtimeMetrics.offBeamCount}`,
);

const hobsArtifact = buildArtifact('hobs-multibeam-baseline');
const hobsDisclosure = hobsArtifact.artifact.eePowerDisclosure;
const hobsActiveSemantic = hobsDisclosure?.semantics.find(
  (semantic) => semantic.id === 'active-tx-power-oriented-ee',
);
const hobsTotalPowerSemantic = hobsDisclosure?.semantics.find(
  (semantic) => semantic.id === 'total-communication-power',
);

check(
  'energy-enabled artifact carries assumptionSet with ASSUME-ENERGY-001',
  hobsArtifact.artifact.assumptionSet?.some((record) => record.id === 'ASSUME-ENERGY-001') === true,
  'hobs-multibeam-baseline',
);
check(
  'energy-enabled artifact carries eePowerDisclosure',
  hobsDisclosure !== undefined,
  'hobs-multibeam-baseline',
);
check(
  'artifact disclosure ties active-TX EE to the frozen KPI field',
  hobsActiveSemantic?.runtimeStatus === 'reported' &&
    hobsActiveSemantic.runtimeField === 'kpiBundle.systemEeBitsPerJoule',
  hobsActiveSemantic?.runtimeField ?? 'missing active semantic',
);
check(
  'artifact disclosure keeps total communication power on the broader proxy field',
  hobsTotalPowerSemantic?.runtimeStatus === 'reported' &&
    hobsTotalPowerSemantic.runtimeField === 'kpiBundle.totalPowerW',
  hobsTotalPowerSemantic?.runtimeField ?? 'missing total-power semantic',
);
check(
  'artifact disclosure exposes assumption-backed denominator status and sensitivity guard',
  hobsDisclosure?.assumptionIds.includes('ASSUME-ENERGY-001') === true &&
    hobsDisclosure.headlineClaimStatus === 'robustness-or-sensitivity-only' &&
    hobsDisclosure.sensitivityRequirement.includes('at least one declared sensitivity path'),
  hobsDisclosure
    ? `${hobsDisclosure.headlineClaimStatus}; ${hobsDisclosure.sensitivityRequirement}`
    : 'missing disclosure',
);

const firstScreenArtifact = buildArtifact('realistic-first-screen');
check(
  'non-energy first-screen artifact omits the EP1 disclosure surface',
  firstScreenArtifact.artifact.eePowerDisclosure === undefined,
  'realistic-first-screen',
);

const hoEnergyProfile = loadProfile('hobs-multibeam-baseline');
const hoEnergySnapshot = JSON.parse(JSON.stringify(hoEnergyProfile)) as Record<string, unknown>;
const hoEnergyBlock = hoEnergySnapshot.energy as { energy_per_handover_j?: number };
hoEnergyBlock.energy_per_handover_j = 2.5;
const hoDisclosure = buildEePowerDisclosureFromProfileSnapshot(
  hoEnergySnapshot,
  ['ASSUME-ENERGY-001', 'ASSUME-HO-ENERGY-001'],
);
const hoAwareSemantic = hoDisclosure?.semantics.find(
  (semantic) => semantic.id === 'handover-aware-ee',
);

check(
  'handover-aware EE remains disclosure-only when HO energy is assumption-backed',
  hoAwareSemantic?.runtimeStatus === 'derived-disclosure-only',
  hoAwareSemantic?.runtimeStatus ?? 'missing handover-aware semantic',
);
check(
  'HO-energy disclosure forces the utility-form fallback recommendation',
  hoDisclosure?.recommendedFallback === 'utility-form-fallback-objective' &&
    hoDisclosure.assumptionIds.includes('ASSUME-HO-ENERGY-001'),
  hoDisclosure
    ? `${hoDisclosure.recommendedFallback}; assumptions=${hoDisclosure.assumptionIds.join(',')}`
    : 'missing disclosure',
);

if (failures > 0) {
  console.log(`\nEXIT 1 — VAL-EE-004 failed with ${failures} issue(s)\n`);
  process.exit(1);
}

console.log('\nEXIT 0 — VAL-EE-004 passed\n');
