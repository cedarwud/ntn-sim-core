#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

let failures = 0;

function pass(label, detail = '') {
  console.log(`  [PASS] ${label}${detail ? `: ${detail}` : ''}`);
}

function fail(label, detail = '') {
  failures += 1;
  console.log(`  [FAIL] ${label}${detail ? `: ${detail}` : ''}`);
}

function runCheck({ label, file, required = [], forbidden = [] }) {
  const fullPath = join(ROOT, file);
  const text = readFileSync(fullPath, 'utf8');

  let ok = true;
  for (const pattern of required) {
    if (!pattern.test(text)) {
      fail(label, `missing required pattern ${pattern} in ${file}`);
      ok = false;
    }
  }

  for (const pattern of forbidden) {
    if (pattern.test(text)) {
      fail(label, `found forbidden pattern ${pattern} in ${file}`);
      ok = false;
    }
  }

  if (ok) {
    pass(label, file);
  }
}

console.log('\n=== VAL-RT-004: Real-Trace Wording / Provenance Alignment ===\n');

const checks = [
  {
    label: 'defaults describe OMM/TLE ingest plus SGP4-sampled cache truth',
    file: 'src/core/profiles/defaults-misc.ts',
    required: [
      /Advanced — Real-Trace \(OMM\/TLE\)/,
      /cache samples use SatRec-backed SGP4 propagation/,
    ],
  },
  {
    label: 'registry note matches the shipped real-trace truth path',
    file: 'src/core/config/parameter-registry-foundation-data.ts',
    required: [/cache samples use SatRec-backed SGP4 propagation/],
  },
  {
    label: 'geometry comment keeps cache-backed consume semantics truthful',
    file: 'src/core/models/geometry.ts',
    required: [/real-trace[\s\S]*SGP4-sampled cache path/],
  },
  {
    label: 'model bundle comment names the SGP4-sampled real-trace family truthfully',
    file: 'src/core/models/model-bundle.ts',
    required: [/SGP4-sampled cache-backed real-trace geometry family/],
  },
  {
    label: 'ui exposure wording no longer overstates generic SGP4 runtime',
    file: 'sdd/ntn-sim-core-ui-exposure-spec.md',
    required: [
      /Walker propagation or the real-trace SGP4-sampled cache path/,
      /SGP4-sampled cache-backed validation-sized envelope/,
    ],
    forbidden: [/SGP4\/Walker propagation/],
  },
  {
    label: 'implementation status records the landed SGP4-sampled cache path',
    file: 'sdd/ntn-sim-core-implementation-status.md',
    required: [
      /SGP4-sampled real-trace cache\/replay path/,
      /SatRec-backed SGP4 truth during cache construction/,
    ],
    forbidden: [/deterministic SGP4\/showcase paths/],
  },
  {
    label: 'profile baselines describe cache-backed SGP4 sampling rather than preferred-only wording',
    file: 'sdd/ntn-sim-core-profile-baselines.md',
    required: [/SGP4-sampled cache-backed path/],
    forbidden: [/SGP4 preferred/],
  },
  {
    label: 'paper family matrix uses the corrected orbit-truth wording',
    file: 'sdd/ntn-sim-core-paper-family-matrix.md',
    required: [/OMM\/TLE ingest \+ SGP4-sampled cache/],
    forbidden: [
      /real-trace TLE \/ SGP4 or offline precompute/,
      /Phase 4 wiring gaps/,
    ],
  },
  {
    label: 'validation matrix enforces VAL-RT-003 and VAL-RT-004 through concrete scripts',
    file: 'sdd/ntn-sim-core-validation-matrix.md',
    required: [
      /validate-real-trace-truth-path\.ts/,
      /validate-real-trace-wording\.mjs/,
      /\| `VAL-RT-003` \| T1 \| ✅ PASS \| 2026-04-01 \|/,
      /\| `VAL-RT-004` \| T1 \| ✅ PASS \| 2026-04-01 \|/,
    ],
    forbidden: [
      /planned for T1/,
      /reserved `VAL-RT-003` \/ `VAL-RT-004` acceptance gates/,
      /\| `VAL-RT-003` \| T1 \| ⏳ planned \|/,
      /\| `VAL-RT-004` \| T1 \| ⏳ planned \|/,
    ],
  },
  {
    label: 'validate-model-bundle uses the real SatRec-backed element conversion path',
    file: 'scripts/validate-model-bundle.ts',
    required: [/satrecsToOrbitElements\(/],
    forbidden: [/passed through for SGP4 propagation/],
  },
];

for (const check of checks) {
  runCheck(check);
}

if (failures > 0) {
  console.log(`\nEXIT 1 — VAL-RT-004 failed with ${failures} issue(s)\n`);
  process.exit(1);
}

console.log('\nEXIT 0 — VAL-RT-004 passed\n');
