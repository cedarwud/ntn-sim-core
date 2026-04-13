/**
 * Profile Audit Tool — automated checks across all registered profiles.
 *
 * Checks:
 *   1. Required fields present (id, family, version, provenance)
 *   2. Profile id matches registry key
 *   3. Physical parameter plausibility (altitude, EIRP, BW, beam diameter)
 *   4. provenance has at least one paper-backed or assumption-backed entry
 *   5. beamSemantics is valid
 *   6. BH profiles have bh_strategy set
 *   7. Reproduction profiles have ≥1 assumption-backed provenance entry
 *   8. No duplicate profile ids
 *   9. ueConfig.count ≥ 1
 *  10. timeControl.durationSec > timeControl.stepSec
 *
 * Usage: npx tsx scripts/audit-profiles.ts
 */

import { DEFAULT_PROFILES } from '../src/core/profiles/defaults';
import type { ProfileConfig } from '../src/core/profiles/types';
import { getProfileProvenanceView } from '../src/core/config/profile-provenance-view';

let failures = 0;
let warnings = 0;

function fail(profileId: string, msg: string) {
  failures++;
  console.error(`  [FAIL] ${profileId}: ${msg}`);
}

function warn(profileId: string, msg: string) {
  warnings++;
  console.warn(`  [WARN] ${profileId}: ${msg}`);
}

function pass(profileId: string, msg: string) {
  console.log(`  [PASS] ${profileId}: ${msg}`);
}

// ---------------------------------------------------------------------------
// Run checks
// ---------------------------------------------------------------------------

console.log('\n=== Profile Audit ===');
console.log(`Total profiles: ${Object.keys(DEFAULT_PROFILES).length}\n`);

const seenIds = new Set<string>();

for (const [registryKey, profile] of Object.entries(DEFAULT_PROFILES)) {
  const pid = profile.id ?? '(no id)';

  // 1. id present and matches registry key
  if (!profile.id) {
    fail(registryKey, 'missing id');
  } else if (profile.id !== registryKey) {
    fail(registryKey, `id="${profile.id}" does not match registry key "${registryKey}"`);
  }

  // 8. No duplicate ids
  if (seenIds.has(pid)) {
    fail(pid, 'duplicate profile id');
  }
  seenIds.add(pid);

  // 1. Required top-level fields
  if (!profile.family) fail(pid, 'missing family');
  if (!profile.version) fail(pid, 'missing version');
  else if (!/^\d+\.\d+\.\d+$/.test(profile.version)) warn(pid, `version "${profile.version}" is not semver`);

  // 4. provenance
  const sources = getProfileProvenanceView(pid).sourceMap;
  if (!sources || sources.length === 0) {
    fail(pid, 'missing provenance entries (must have at least one source)');
  } else {
    const hasPaperOrAssumption = sources.some(
      (s) => s.tier === 'paper-backed' || s.tier === 'assumption-backed',
    );
    if (!hasPaperOrAssumption) {
      fail(pid, 'provenance has no paper-backed or assumption-backed entries');
    }
  }

  const hasParameterSource = (parameterPath: string, tier?: string): boolean =>
    (sources ?? []).some((s) => s.parameterPath === parameterPath && (tier === undefined || s.tier === tier));

  // 2. Physical: orbital altitude
  const altKm = profile.orbital?.altitude_km;
  if (altKm === undefined) {
    fail(pid, 'orbital.altitude_km missing');
  } else {
    const orbitType = profile.orbital?.orbitType ?? 'leo';
    if (orbitType === 'leo' && (altKm < 200 || altKm > 2000)) {
      fail(pid, `LEO altitude_km=${altKm} out of range [200, 2000]`);
    } else if (orbitType === 'meo' && (altKm < 2000 || altKm > 35000)) {
      warn(pid, `MEO altitude_km=${altKm} out of range [2000, 35000]`);
    } else if (orbitType === 'geo' && (altKm < 35000 || altKm > 36500)) {
      warn(pid, `GEO altitude_km=${altKm} out of range [35000, 36500]`);
    }
  }

  // 2. Physical: RF bandwidth
  const bwMhz = profile.rf?.bandwidth_mhz;
  if (bwMhz === undefined) {
    fail(pid, 'rf.bandwidth_mhz missing');
  } else if (bwMhz <= 0 || bwMhz > 5000) {
    fail(pid, `bandwidth_mhz=${bwMhz} out of range (0, 5000]`);
  }

  // 2. Physical: EIRP density
  const eirp = profile.rf?.eirp_density_dbw_per_mhz;
  if (eirp === undefined) {
    fail(pid, 'rf.eirp_density_dbw_per_mhz missing');
  } else if (eirp < -20 || eirp > 60) {
    warn(pid, `eirp_density_dbw_per_mhz=${eirp} outside typical range [-20, 60]`);
  }

  // 2. Physical: beam diameter
  const beamDiam = profile.antenna?.beam_diameter_km;
  if (beamDiam === undefined) {
    fail(pid, 'antenna.beam_diameter_km missing');
  } else if (beamDiam <= 0 || beamDiam > 5000) {
    fail(pid, `beam_diameter_km=${beamDiam} out of range (0, 5000]`);
  }

  // 5. beamSemantics
  const validSemantics = ['earth-moving', 'earth-fixed-bh'];
  const semantics = (profile as any).beamSemantics as string | undefined;
  if (!semantics) {
    warn(pid, 'missing beamSemantics');
  } else if (!validSemantics.includes(semantics)) {
    warn(pid, `beamSemantics="${semantics}" not in known set [${validSemantics.join(', ')}]`);
  }

  // 6. Profiles with BH scheduling must have bh_strategy and bh_max_active_per_slot
  const hasBhParams = profile.beam.bh_max_active_per_slot !== undefined;
  if (semantics === 'earth-fixed-bh' || hasBhParams) {
    if (!profile.beam.bh_strategy) {
      fail(pid, 'profile with BH scheduling missing beam.bh_strategy');
    }
    const maxActive = profile.beam.bh_max_active_per_slot;
    if (maxActive === undefined || maxActive < 1) {
      fail(pid, `bh_max_active_per_slot=${maxActive} must be ≥ 1 for profiles with BH scheduling`);
    }
  }

  // Provenance: if aggregate satellite TX power is profile-declared, it must
  // be parameter-level sourced so it cannot silently drift into a stale value.
  if (profile.rf?.max_tx_power_dbm !== null && profile.rf?.max_tx_power_dbm !== undefined) {
    if (!hasParameterSource('rf.max_tx_power_dbm')) {
      fail(pid, 'rf.max_tx_power_dbm is set but provenance lacks parameterPath="rf.max_tx_power_dbm"');
    }
  }

  // Provenance: HO energy is a scenario assumption, never a paper-backed
  // baseline constant. When enabled, require an assumption-backed parameterPath.
  if (profile.energy?.energy_per_handover_j !== undefined) {
    if (!hasParameterSource('energy.energy_per_handover_j', 'assumption-backed')) {
      fail(pid, 'energy.energy_per_handover_j is set but provenance lacks assumption-backed parameterPath="energy.energy_per_handover_j"');
    }
  }

  // 9. ueConfig.count
  const ueCount = profile.ueConfig?.count ?? 0;
  if (ueCount < 1) {
    fail(pid, `ueConfig.count=${ueCount} must be ≥ 1`);
  }

  // 10. timeControl sanity
  const dur = profile.timeControl?.durationSec;
  const step = profile.timeControl?.stepSec;
  if (!dur || !step) {
    fail(pid, 'timeControl.durationSec or stepSec missing');
  } else if (dur <= step) {
    fail(pid, `durationSec=${dur} must be > stepSec=${step}`);
  } else if (step <= 0) {
    fail(pid, `stepSec=${step} must be > 0`);
  }

  // 7. Reproduction profiles: must have assumption-backed entries
  if (pid.includes('reproduction')) {
    const hasAssumption = sources?.some((s) => s.tier === 'assumption-backed') ?? false;
    if (!hasAssumption) {
      warn(pid, 'reproduction profile should have assumption-backed provenance entries documenting gaps');
    }
  }

  // Print per-profile summary
  const issues = (failures > 0 || warnings > 0) ? '' : '';
  console.log(`  [OK ] ${pid} (${semantics ?? '?'}, alt=${altKm}km, bw=${bwMhz}MHz, ue=${ueCount})`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${'═'.repeat(50)}`);
if (failures === 0 && warnings === 0) {
  console.log(`✅ ALL ${Object.keys(DEFAULT_PROFILES).length} PROFILES PASSED AUDIT`);
} else {
  if (failures > 0) console.error(`❌ ${failures} audit failure(s)`);
  if (warnings > 0) console.warn(`⚠️  ${warnings} audit warning(s)`);
}
console.log('═'.repeat(50));

process.exit(failures > 0 ? 1 : 0);
