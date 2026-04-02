#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { PROFILE_AUTHORING_ENTRIES } from '../src/core/profiles/profile-authoring-registry.ts';

const ROOT = resolve(import.meta.dirname, '..');
const PAPERS_ROOT = resolve(ROOT, '..');
const SYSTEM_MODEL_REFS = resolve(PAPERS_ROOT, 'system-model-refs');

let failures = 0;

function pass(label: string, detail = '') {
  console.log(`  [PASS] ${label}${detail ? `: ${detail}` : ''}`);
}

function fail(label: string, detail = '') {
  failures += 1;
  console.log(`  [FAIL] ${label}${detail ? `: ${detail}` : ''}`);
}

function readRepo(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf8');
}

function readSystemModel(fileName: string): string {
  return readFileSync(join(SYSTEM_MODEL_REFS, fileName), 'utf8');
}

function requirePatterns(label: string, file: string, text: string, patterns: RegExp[]) {
  let ok = true;
  for (const pattern of patterns) {
    if (!pattern.test(text)) {
      fail(label, `missing ${pattern} in ${file}`);
      ok = false;
    }
  }
  if (ok) {
    pass(label, file);
  }
}

function check(label: string, condition: boolean, detail: string) {
  if (condition) {
    pass(label, detail);
  } else {
    fail(label, detail);
  }
}

console.log('\n=== VAL-EE-003: EE / Power Provenance Alignment ===\n');

const formulas = readSystemModel('system-model-formulas.md');
requirePatterns(
  'system-model-formulas carries the four-way EP1 semantic split',
  '../system-model-refs/system-model-formulas.md',
  formulas,
  [
    /### 3\.16 EP1 runtime \/ artifact mapping/,
    /active-TX-power-oriented EE/,
    /total communication power/,
    /handover-aware EE/,
    /utility-form fallback objective/,
    /kpiBundle\.systemEeBitsPerJoule/,
    /kpiBundle\.totalPowerW/,
  ],
);

const derivation = readSystemModel('system-model-derivation.md');
requirePatterns(
  'system-model-derivation keeps runtime denominator semantics and claim downgrade aligned',
  '../system-model-refs/system-model-derivation.md',
  derivation,
  [
    /systemEeBitsPerJoule.*active-TX-power-oriented/,
    /totalPowerW.*beam-state communication-power proxy/,
    /downgrade the energy result to robustness \/ sensitivity/,
  ],
);

const spec = readSystemModel('simulator-parameter-spec.md');
requirePatterns(
  'simulator-parameter-spec distinguishes active-TX EE from totalPowerW proxy',
  '../system-model-refs/simulator-parameter-spec.md',
  spec,
  [
    /runtime `systemEeBitsPerJoule` and runtime `totalPowerW` must not be treated as the same denominator surface/,
    /runtime `totalPowerW` must be labeled as a broader communication-power proxy, not as the active-TX EE denominator/,
    /handover-aware EE and utility-form claim paths must carry explicit disclosure and at least one sensitivity path/,
  ],
);

const provenance = readSystemModel('simulator-parameter-provenance-inventory.md');
requirePatterns(
  'provenance inventory records the EP1 runtime split',
  '../system-model-refs/simulator-parameter-provenance-inventory.md',
  provenance,
  [
    /systemEeBitsPerJoule` = active-TX-only EE/,
    /totalPowerW` = broader beam-state communication-power proxy/,
    /utility-form fallback` = safer paper path/,
    /totalPowerW` must not be described as the denominator of `systemEeBitsPerJoule`/,
  ],
);

const energyTypes = readRepo('src/core/energy/types.ts');
requirePatterns(
  'energy types expose explicit EP1 runtime and disclosure surfaces',
  'src/core/energy/types.ts',
  energyTypes,
  [
    /export interface EePowerDisclosure/,
    /activeTxPowerW: number;/,
    /totalCommunicationPowerW: number;/,
    /recommendedFallback: 'utility-form-fallback-objective' \| 'secondary-metric-only';/,
  ],
);

const energyLayer = readRepo('src/core/energy/layer1.ts');
requirePatterns(
  'energy layer encodes the runtime semantic split and disclosure mapping',
  'src/core/energy/layer1.ts',
  energyLayer,
  [
    /systemEeBitsPerJoule = active-TX-power-oriented EE/,
    /totalCommunicationPowerW \/ totalPowerW = broader beam-state communication-power proxy/,
    /buildEePowerDisclosureFromProfileSnapshot/,
    /runtimeField: layer1Enabled \? 'kpiBundle\.systemEeBitsPerJoule'/,
    /runtimeField: layer1Enabled \? 'kpiBundle\.totalPowerW'/,
  ],
);

const powerEeModel = readRepo('src/core/models/power-ee.ts');
requirePatterns(
  'power-ee model keeps total communication power separate from the EE denominator',
  'src/core/models/power-ee.ts',
  powerEeModel,
  [
    /total communication power is a broader beam-state proxy/,
    /totalCommunicationPowerW/,
    /denominatorPowerW/,
  ],
);

const kpiProjectors = readRepo('src/viz/view-models/kpi-bundle-projectors.ts');
requirePatterns(
  'KPI projector labels keep the EP1 denominator split visible',
  'src/viz/view-models/kpi-bundle-projectors.ts',
  kpiProjectors,
  [
    /System EE \(active-TX only\)/,
    /Total Power Proxy/,
  ],
);

const benchmarkHook = readRepo('src/app/hooks/useBenchmarkResult.ts');
requirePatterns(
  'benchmark hook materializes eePowerDisclosure for viewer-facing report surfaces',
  'src/app/hooks/useBenchmarkResult.ts',
  benchmarkHook,
  [
    /buildEePowerDisclosureFromProfileSnapshot/,
    /getProfileProvenanceView/,
    /eePowerDisclosure: EePowerDisclosure \| null;/,
  ],
);

const baselinePanel = readRepo('src/viz/overlays/BaselineResultPanel.tsx');
requirePatterns(
  'baseline result panel discloses EP1 runtime semantics and claim bar',
  'src/viz/overlays/BaselineResultPanel.tsx',
  baselinePanel,
  [
    /EE \/ Power Disclosure/,
    /systemEeBitsPerJoule` remains active-TX-only EE/,
    /totalPowerW` remains the broader communication-power proxy/,
    /Claim bar:/,
    /Assumptions:/,
  ],
);

const paperSources = JSON.parse(readRepo('src/core/config/paper-sources.json')) as {
  assumptions?: Record<string, string>;
};
const assumeEnergy = paperSources.assumptions?.['ASSUME-ENERGY-001'] ?? '';
check(
  'ASSUME-ENERGY-001 registry note carries the EP1 semantic rule',
  assumeEnergy.includes('systemEeBitsPerJoule is active-TX-only EE') &&
    assumeEnergy.includes('runtime totalPowerW is a broader beam-state communication-power proxy') &&
    assumeEnergy.includes('must not be labeled paper-backed'),
  'paper-sources.json assumption wording',
);

const energyAssumptionEntries = PROFILE_AUTHORING_ENTRIES.filter((entry) =>
  entry.sourceMap.some((source) => source.id === 'ASSUME-ENERGY-001'),
);
check(
  'energy-enabled authored profiles still declare ASSUME-ENERGY-001',
  energyAssumptionEntries.length >= 4,
  `profiles with ASSUME-ENERGY-001 = ${energyAssumptionEntries.length}`,
);

for (const entry of energyAssumptionEntries) {
  const assumeEntry = entry.sourceMap.find((source) => source.id === 'ASSUME-ENERGY-001');
  const note = assumeEntry?.note ?? '';
  check(
    `${entry.id} keeps ASSUME-ENERGY-001 as an Internal-only assumption-backed note`,
    assumeEntry?.tier === 'assumption-backed' &&
      assumeEntry.specMode === 'Internal-only' &&
      note.includes('systemEeBitsPerJoule is active-TX-only EE') &&
      /totalPowerW is (?:a|the) broader beam-state communication-power proxy/.test(note) &&
      entry.bundle.models.energy.layer1_enabled === true,
    entry.id,
  );
  check(
    `${entry.id} does not surface assumption-backed Layer-1 power as a Realistic preset`,
    entry.bundle.exposurePreset.tier !== 'Realistic',
    entry.bundle.exposurePreset.tier,
  );
}

const realisticEnergyProfiles = PROFILE_AUTHORING_ENTRIES.filter(
  (entry) => entry.bundle.models.energy.layer1_enabled && entry.bundle.exposurePreset.tier === 'Realistic',
);
check(
  'no authored Realistic profile exposes assumption-backed Layer-1 energy defaults',
  realisticEnergyProfiles.length === 0,
  realisticEnergyProfiles.length === 0
    ? '0 Realistic energy-enabled profiles'
    : realisticEnergyProfiles.map((entry) => entry.id).join(', '),
);

const realisticFirstScreen = PROFILE_AUTHORING_ENTRIES.find(
  (entry) => entry.id === 'realistic-first-screen',
);
check(
  'realistic-first-screen keeps Layer-1 energy disabled to avoid false Realistic EE packaging',
  realisticFirstScreen?.bundle.models.energy.layer1_enabled === false,
  realisticFirstScreen
    ? `layer1_enabled=${String(realisticFirstScreen.bundle.models.energy.layer1_enabled)}`
    : 'missing realistic-first-screen',
);

if (failures > 0) {
  console.log(`\nEXIT 1 — VAL-EE-003 failed with ${failures} issue(s)\n`);
  process.exit(1);
}

console.log('\nEXIT 0 — VAL-EE-003 passed\n');
