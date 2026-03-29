/**
 * validate-parameter-registry.mjs
 *
 * Implements VAL-PLAT-001, VAL-PLAT-002, VAL-PLAT-003 from
 * sdd/phase1-parameter-registry-sdd.md §6.
 *
 * VAL-PLAT-001  Coverage — all 58 canonical parameterPaths present, no PARAM-* entry missing.
 * VAL-PLAT-002  Source resolution — every binding.sourceId resolves in paper-sources.json.
 * VAL-PLAT-003  Namespace integrity — PARAM-* prefix, uniqueness, no collision with source IDs.
 *
 * Exit codes: 0 = all pass, 1 = one or more failures.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Load artefacts
// ---------------------------------------------------------------------------

/** Load paper-sources.json and flatten all nested source IDs into a Set.
 *  Only the three canonical sections are read: "papers", "standards", "assumptions".
 *  Other top-level keys (_comment, _format, or any future _meta section) are ignored.
 *  This matches phase1-parameter-registry-sdd.md §6 VAL-PLAT-002 implementation note.
 */
function loadSourceIds() {
  const raw = JSON.parse(
    readFileSync(join(ROOT, 'src/core/config/paper-sources.json'), 'utf8'),
  );
  const ids = new Set();
  for (const sectionName of ['papers', 'standards', 'assumptions']) {
    const section = raw[sectionName];
    if (section && typeof section === 'object') {
      for (const key of Object.keys(section)) {
        ids.add(key);
      }
    }
  }
  return ids;
}

/**
 * Load PARAMETER_REGISTRY from the compiled JS.
 * Because the source is TypeScript with path aliases, we transpile via tsx
 * at runtime by re-reading the file and stripping type annotations with a
 * simple regex approach — but that is fragile.  Instead, we parse the .ts
 * source statically: extract the PARAMETER_REGISTRY array literal as JSON-
 * compatible data by walking the file with a purpose-built extractor.
 *
 * Simpler and more robust: we read the .ts file and use Node's vm module to
 * evaluate a lightly-preprocessed version (strip type annotations, replace
 * import with a no-op).  This avoids any build dependency.
 */
import { createRequire } from 'module';
import vm from 'vm';

function loadRegistry() {
  const src = readFileSync(
    join(ROOT, 'src/core/config/parameter-registry.ts'),
    'utf8',
  );

  // Pre-process: remove TypeScript-specific syntax so plain Node can eval it.
  let js = src
    // Remove import type statements
    .replace(/^import\s+type\s+.*?;?\s*$/gm, '')
    // Remove generic type parameters on interfaces/type aliases
    .replace(/^export\s+(interface|type)\s+[\s\S]*?^}/gm, '')
    // Remove all remaining 'export interface ...' and 'export type ...' blocks
    .replace(/export\s+(?:interface|type)\s+\w+[\s\S]*?(?=\nexport|\n\/\/\s*-{3}|$)/g, '')
    // Remove TypeScript type annotations from object properties  e.g. `: 'km/h'` stays, `: SourceTier` gone
    // We keep string/number/boolean/null literals; remove bare identifier type annotations
    .replace(/:\s*(?:SourceTier|SpecMode|string|number|boolean|null)\s*(?=[,;\n\}])/g, '')
    // Remove `as const` casts
    .replace(/\bas\s+const\b/g, '')
    // Remove remaining 'as Type' casts
    .replace(/\s+as\s+\w+/g, '')
    // Replace `export const` with plain `const`
    .replace(/export\s+const\s+/g, 'const ');

  const context = vm.createContext({ module: { exports: {} } });
  try {
    vm.runInContext(js, context);
  } catch (e) {
    // If VM evaluation fails, fall back to regex-based extraction of entries
    return extractRegistryViaRegex(src);
  }

  // The registry variable should be in scope; search for it
  const names = Object.keys(context).filter(k => Array.isArray(context[k]) && context[k].length > 0 && context[k][0]?.spec?.id);
  if (names.length > 0) return context[names[0]];

  return extractRegistryViaRegex(src);
}

/**
 * Fallback: extract registry entries purely via regex on the TypeScript source.
 * Returns minimal objects: { spec: { id, parameterPath, isDerived }, bindings: [...] }
 */
function extractRegistryViaRegex(src) {
  const entries = [];

  // Match each top-level object block between `{` and the closing `},` that has a spec.id
  // We'll use a simpler approach: find all id: 'PARAM-...' occurrences and parameterPath occurrences
  const idMatches = [...src.matchAll(/id:\s*'(PARAM-[^']+)'/g)].map(m => m[1]);
  const pathMatches = [...src.matchAll(/parameterPath:\s*'([^']+)'/g)].map(m => m[1]);
  const isDerivedMatches = [...src.matchAll(/isDerived:\s*(true|false)/g)].map(m => m[1] === 'true');
  const sourceIdMatches = [...src.matchAll(/sourceId:\s*'([^']+)'/g)].map(m => m[1]);

  // Pair up: we assume one id per entry (spec.id), and bindings follow
  // Build entries from the parallel arrays
  for (let i = 0; i < idMatches.length; i++) {
    entries.push({
      spec: {
        id: idMatches[i],
        parameterPath: pathMatches[i] ?? '(unknown)',
        isDerived: isDerivedMatches[i] ?? false,
      },
      bindings: [], // populated separately below
    });
  }

  // Attach sourceIds to entries by scanning binding blocks
  // Each binding block has: parameterId, profileId, sourceId
  const bindingPattern = /parameterId:\s*'(PARAM-[^']+)'[\s\S]*?sourceId:\s*'([^']+)'/g;
  const bindingMap = new Map();
  let bm;
  while ((bm = bindingPattern.exec(src)) !== null) {
    const pid = bm[1];
    const sid = bm[2];
    if (!bindingMap.has(pid)) bindingMap.set(pid, []);
    bindingMap.get(pid).push({ parameterId: pid, sourceId: sid });
  }
  for (const entry of entries) {
    entry.bindings = bindingMap.get(entry.spec.id) ?? [];
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Canonical 58-path list (from phase0-architecture-spec.md §0B.6 + phase1 SDD)
// ---------------------------------------------------------------------------

const CANONICAL_PATHS = new Set([
  // Orbital (6)
  'orbital.altitude_km',
  'orbital.inclination_deg',
  'orbital.num_planes',
  'orbital.sats_per_plane',
  'orbital.raan_spread_deg',
  'orbital.phase_offset_deg',
  // RF (8)
  'rf.frequency_ghz',
  'rf.bandwidth_mhz',
  'rf.eirp_density_dbw_per_mhz',
  'rf.tx_power_per_beam_dbm',
  'rf.max_tx_power_dbm',
  'rf.noise_temperature_k',
  'rf.noise_figure_db',
  'rf.implementation_loss_db',
  // Antenna (2)
  'antenna.peak_gain_dbi',
  'antenna.beam_diameter_km',
  // Beam (8)
  'beam.num_beams',
  'beam.frf',
  'beam.interference_beams',
  'beam.bh_max_active_per_slot',
  'beam.bh_frame_duration_sec',
  'beam.bh_slots_per_frame',
  'beam.bh_power_budget_w',
  'beam.bh_traffic_arrival_rate',
  // Channel (3)
  'channel.deployment_environment',
  'channel.los_elevation_deg',
  'channel.subcarrier_spacing_khz',
  // Handover (21)
  'handover.trigger_threshold_db',
  'handover.a3_offset_db',
  'handover.ttt_ms',
  'handover.hysteresis_db',
  'handover.min_elevation_deg',
  'handover.pingPongWindowSec',
  'handover.cho_offset_db',
  'handover.cho_alpha',
  'handover.cho_filter_k',
  'handover.daps_preparation_time_sec',
  'handover.daps_max_dual_active_sec',
  'handover.mc_max_dual_sec',
  'handover.mc_packet_duplication',
  'handover.d2_serving_dist_km',
  'handover.d2_target_dist_km',
  'handover.sinr_ema_alpha',
  'handover.rlf_qout_db',
  'handover.rlf_qin_db',
  'handover.rlf_n310',
  'handover.rlf_n311',
  'handover.rlf_t310_ms',
  // Energy (9: 1 top-level + 8 layer2_overrides)
  'energy.energy_per_handover_j',
  'energy.layer2_overrides.batteryCapacityWh',
  'energy.layer2_overrides.initialSoc',
  'energy.layer2_overrides.solarPowerW',
  'energy.layer2_overrides.blockingThresholdSoc',
  'energy.layer2_overrides.orbitalPeriodSec',
  'energy.layer2_overrides.shadowFraction',
  'energy.layer2_overrides.altitudeKm',
  'energy.layer2_overrides.betaAngleDeg',
  // UE (1)
  'ueConfig.speed_kmh',
]);

// ---------------------------------------------------------------------------
// Validation runners
// ---------------------------------------------------------------------------

let failures = 0;

function fail(msg) {
  console.error(`  FAIL  ${msg}`);
  failures++;
}

function pass(msg) {
  console.log(`  PASS  ${msg}`);
}

function section(name) {
  console.log(`\n── ${name} ──`);
}

// ---------------------------------------------------------------------------
// VAL-PLAT-001: Coverage
// ---------------------------------------------------------------------------

function valPlat001(registry) {
  section('VAL-PLAT-001  Coverage (58 P-classified parameterPaths)');

  const registeredPaths = new Set(registry.map(e => e.spec.parameterPath));

  // Check canonical paths present in registry
  let missingCount = 0;
  for (const path of CANONICAL_PATHS) {
    if (!registeredPaths.has(path)) {
      fail(`parameterPath '${path}' missing from PARAMETER_REGISTRY`);
      missingCount++;
    }
  }

  // Check no unexpected paths in registry (warn only — not a hard failure)
  const extraPaths = [...registeredPaths].filter(p => !CANONICAL_PATHS.has(p));
  if (extraPaths.length > 0) {
    console.warn(`  WARN  ${extraPaths.length} extra parameterPath(s) in registry (not in canonical list): ${extraPaths.join(', ')}`);
  }

  if (missingCount === 0) {
    pass(`All ${CANONICAL_PATHS.size} canonical parameterPaths present (${registeredPaths.size} total in registry)`);
  } else {
    fail(`${missingCount}/${CANONICAL_PATHS.size} canonical parameterPaths missing`);
  }

  // Check registry is non-empty
  if (registry.length === 0) {
    fail('PARAMETER_REGISTRY is empty');
  } else {
    pass(`PARAMETER_REGISTRY has ${registry.length} entries`);
  }

  // Check every entry has at least one binding (SDD §6 VAL-PLAT-001 check 3)
  let zeroBindingCount = 0;
  for (const entry of registry) {
    if (!entry.bindings || entry.bindings.length === 0) {
      fail(`ParameterEntry '${entry.spec.id}' (${entry.spec.parameterPath}) has no bindings`);
      zeroBindingCount++;
    }
  }
  if (zeroBindingCount === 0) {
    pass(`All ${registry.length} entries have at least one binding`);
  }
}

// ---------------------------------------------------------------------------
// VAL-PLAT-002: Source resolution
// ---------------------------------------------------------------------------

function valPlat002(registry, sourceIds) {
  section('VAL-PLAT-002  Source resolution (all sourceIds in paper-sources.json)');

  let badCount = 0;
  const seen = new Set();

  for (const entry of registry) {
    for (const binding of entry.bindings) {
      const sid = binding.sourceId;
      if (seen.has(sid)) continue;
      seen.add(sid);

      if (!sourceIds.has(sid)) {
        fail(`sourceId '${sid}' (used by PARAM '${entry.spec.id}') not found in paper-sources.json`);
        badCount++;
      }
    }
  }

  if (badCount === 0) {
    pass(`All ${seen.size} distinct sourceIds resolve in paper-sources.json`);
  }
}

// ---------------------------------------------------------------------------
// VAL-PLAT-003: Namespace integrity
// ---------------------------------------------------------------------------

function valPlat003(registry, sourceIds) {
  section('VAL-PLAT-003  Namespace integrity (PARAM-* prefix, uniqueness, no collision)');

  const specIds = registry.map(e => e.spec.id);
  let bad = 0;

  // All spec.id must start with PARAM-
  for (const id of specIds) {
    if (!id.startsWith('PARAM-')) {
      fail(`spec.id '${id}' does not start with 'PARAM-'`);
      bad++;
    }
  }

  // Uniqueness
  const seen = new Set();
  for (const id of specIds) {
    if (seen.has(id)) {
      fail(`Duplicate spec.id '${id}'`);
      bad++;
    }
    seen.add(id);
  }

  // No collision with source ID namespace
  for (const id of specIds) {
    if (sourceIds.has(id)) {
      fail(`spec.id '${id}' collides with a key in paper-sources.json`);
      bad++;
    }
  }

  // All binding.parameterId must match their parent spec.id
  for (const entry of registry) {
    for (const binding of entry.bindings) {
      if (binding.parameterId !== entry.spec.id) {
        fail(`Binding parameterId '${binding.parameterId}' does not match parent spec.id '${entry.spec.id}'`);
        bad++;
      }
    }
  }

  if (bad === 0) {
    pass(`${specIds.length} spec IDs: all PARAM-* prefixed, unique, no source-namespace collision`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('=== validate-parameter-registry (VAL-PLAT-001/002/003) ===');

let registry, sourceIds;

try {
  registry = loadRegistry();
} catch (e) {
  console.error('ERROR loading parameter-registry.ts:', e.message);
  process.exit(1);
}

try {
  sourceIds = loadSourceIds();
} catch (e) {
  console.error('ERROR loading paper-sources.json:', e.message);
  process.exit(1);
}

console.log(`\nLoaded ${registry.length} registry entries, ${sourceIds.size} source IDs`);

valPlat001(registry);
valPlat002(registry, sourceIds);
valPlat003(registry, sourceIds);

console.log('\n' + '='.repeat(55));
if (failures === 0) {
  console.log('RESULT  ALL PASS — VAL-PLAT-001/002/003 satisfied');
  process.exit(0);
} else {
  console.log(`RESULT  ${failures} FAILURE(S) — see above`);
  process.exit(1);
}
