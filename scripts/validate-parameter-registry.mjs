/**
 * validate-parameter-registry.mjs
 *
 * Implements VAL-PLAT-001, VAL-PLAT-002, VAL-PLAT-003 from
 * sdd/phase1-parameter-registry-sdd.md §6.
 *
 * VAL-PLAT-001  Coverage + runtime parity — all canonical parameterPaths
 *               present, every entry has at least one binding, and every
 *               profile-specific binding.defaultValue matches DEFAULT_PROFILES
 *               at spec.parameterPath.
 * VAL-PLAT-002  Source resolution — every binding.sourceId resolves in
 *               paper-sources.json.
 * VAL-PLAT-003  Namespace integrity — PARAM-* prefix, uniqueness, no collision
 *               with source-registry namespaces.
 *
 * Run via: node --import tsx scripts/validate-parameter-registry.mjs
 * Exit codes: 0 = all pass, 1 = one or more failures.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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

const CANONICAL_PATHS = new Set([
  'orbital.altitude_km',
  'orbital.inclination_deg',
  'orbital.num_planes',
  'orbital.sats_per_plane',
  'orbital.raan_spread_deg',
  'orbital.phase_offset_deg',
  'rf.frequency_ghz',
  'rf.bandwidth_mhz',
  'rf.eirp_density_dbw_per_mhz',
  'rf.tx_power_per_beam_dbm',
  'rf.max_tx_power_dbm',
  'rf.noise_temperature_k',
  'rf.noise_figure_db',
  'rf.implementation_loss_db',
  'rf.ue_antenna_gain_dbi',
  'antenna.peak_gain_dbi',
  'antenna.beam_diameter_km',
  'beam.num_beams',
  'beam.frf',
  'beam.interference_beams',
  'beam.bh_max_active_per_slot',
  'beam.bh_frame_duration_sec',
  'beam.bh_slots_per_frame',
  'beam.bh_power_budget_w',
  'beam.bh_traffic_arrival_rate',
  'channel.deployment_environment',
  'channel.los_elevation_deg',
  'channel.subcarrier_spacing_khz',
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
  'handover.daps_prepare_elevation_deg',
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
  'energy.energy_per_handover_j',
  'energy.layer2_overrides.batteryCapacityWh',
  'energy.layer2_overrides.initialSoc',
  'energy.layer2_overrides.solarPowerW',
  'energy.layer2_overrides.blockingThresholdSoc',
  'energy.layer2_overrides.orbitalPeriodSec',
  'energy.layer2_overrides.shadowFraction',
  'energy.layer2_overrides.altitudeKm',
  'energy.layer2_overrides.betaAngleDeg',
  'ueConfig.speed_kmh',
]);

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

function getValueAtPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function formatValue(value) {
  if (typeof value === 'string') return `"${value}"`;
  if (value === undefined) return 'undefined';
  return JSON.stringify(value);
}

function valPlat001(registry, defaultProfiles) {
  section('VAL-PLAT-001  Coverage + runtime parity');

  const registeredPaths = new Set(registry.map((entry) => entry.spec.parameterPath));

  let missingCount = 0;
  for (const path of CANONICAL_PATHS) {
    if (!registeredPaths.has(path)) {
      fail(`parameterPath '${path}' missing from PARAMETER_REGISTRY`);
      missingCount++;
    }
  }

  const extraPaths = [...registeredPaths].filter((path) => !CANONICAL_PATHS.has(path));
  if (extraPaths.length > 0) {
    console.warn(`  WARN  ${extraPaths.length} extra parameterPath(s) in registry (not in canonical list): ${extraPaths.join(', ')}`);
  }

  if (missingCount === 0) {
    pass(`All ${CANONICAL_PATHS.size} canonical parameterPaths present (${registeredPaths.size} total in registry)`);
  } else {
    fail(`${missingCount}/${CANONICAL_PATHS.size} canonical parameterPaths missing`);
  }

  if (registry.length === 0) {
    fail('PARAMETER_REGISTRY is empty');
  } else {
    pass(`PARAMETER_REGISTRY has ${registry.length} entries`);
  }

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

  let parityFailures = 0;
  for (const entry of registry) {
    for (const binding of entry.bindings ?? []) {
      if (binding.profileId === '__universal__') continue;
      const profile = defaultProfiles[binding.profileId];
      if (!profile) {
        fail(`binding '${entry.spec.id}' references unknown profileId '${binding.profileId}'`);
        parityFailures++;
        continue;
      }

      const actual = getValueAtPath(profile, entry.spec.parameterPath);
      if (!Object.is(actual, binding.defaultValue)) {
        fail(
          `binding '${entry.spec.id}' (${binding.profileId} → ${entry.spec.parameterPath}) defaultValue=${formatValue(binding.defaultValue)} does not match runtime=${formatValue(actual)}`,
        );
        parityFailures++;
      }
    }
  }

  if (parityFailures === 0) {
    pass('All profile-specific binding.defaultValue entries match DEFAULT_PROFILES at their parameterPath');
  }
}

function valPlat002(registry, sourceIds) {
  section('VAL-PLAT-002  Source resolution (all sourceIds in paper-sources.json)');

  let badCount = 0;
  const seen = new Set();

  for (const entry of registry) {
    for (const binding of entry.bindings ?? []) {
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

function valPlat003(registry, sourceIds) {
  section('VAL-PLAT-003  Namespace integrity (PARAM-* prefix, uniqueness, no collision)');

  const specIds = registry.map((entry) => entry.spec.id);
  let bad = 0;

  for (const id of specIds) {
    if (!id.startsWith('PARAM-')) {
      fail(`spec.id '${id}' does not start with 'PARAM-'`);
      bad++;
    }
  }

  const seen = new Set();
  for (const id of specIds) {
    if (seen.has(id)) {
      fail(`Duplicate spec.id '${id}'`);
      bad++;
    }
    seen.add(id);
  }

  for (const id of specIds) {
    if (sourceIds.has(id)) {
      fail(`spec.id '${id}' collides with a key in paper-sources.json`);
      bad++;
    }
  }

  for (const entry of registry) {
    for (const binding of entry.bindings ?? []) {
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

console.log('=== validate-parameter-registry (VAL-PLAT-001/002/003) ===');

let registry;
let defaultProfiles;
let sourceIds;

try {
  ({ PARAMETER_REGISTRY: registry } = await import('../src/core/config/parameter-registry.ts'));
} catch (e) {
  console.error('ERROR loading parameter-registry.ts:', e.message);
  process.exit(1);
}

try {
  ({ DEFAULT_PROFILES: defaultProfiles } = await import('../src/core/profiles/defaults.ts'));
} catch (e) {
  console.error('ERROR loading defaults.ts:', e.message);
  process.exit(1);
}

try {
  sourceIds = loadSourceIds();
} catch (e) {
  console.error('ERROR loading paper-sources.json:', e.message);
  process.exit(1);
}

console.log(`\nLoaded ${registry.length} registry entries, ${Object.keys(defaultProfiles).length} runtime profiles, ${sourceIds.size} source IDs`);

valPlat001(registry, defaultProfiles);
valPlat002(registry, sourceIds);
valPlat003(registry, sourceIds);

console.log('\n' + '='.repeat(55));
if (failures === 0) {
  console.log('RESULT  ALL PASS — VAL-PLAT-001/002/003 satisfied');
  process.exit(0);
}

console.log(`RESULT  ${failures} FAILURE(S) — see above`);
process.exit(1);
