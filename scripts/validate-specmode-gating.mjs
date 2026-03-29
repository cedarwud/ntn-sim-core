/**
 * validate-specmode-gating.mjs
 *
 * Semantic validation for specMode / tier / source-id consistency in profile sourceMaps.
 *
 * Rules enforced (exit 1 on failure):
 *   Rule 1: Internal-only entries must never have tier='paper-backed' or 'standard-backed'
 *   Rule 2: Every assumption-backed entry's ID must be registered in paper-sources.json assumptions
 *   Rule 3: assumption-backed entry with specMode='Realistic' is a contradiction — FAIL
 *           (assumption-backed values are by definition not Realistic paper-backed defaults)
 *   Rule 4: standard-backed entry whose ID exists in the assumptions registry is a tier/id mismatch — FAIL
 *           (ASSUME-* IDs must never be tagged as standard-backed)
 *   Rule 5: realistic-first-screen sourceMap must contain NO entries with specMode='Advanced' — FAIL if found
 *           (Realistic preset must be clean for thesis baseline tables)
 *   Rule 6: any profile with layer1_enabled=true must have at least one energy sourceMap entry — FAIL if absent
 *           (P5/P6/P7 beam-state power assumptions must be disclosed in AssumptionSet)
 *   Rule 7: heuristic semantic consistency — for each ASSUME-* sourceMap entry that has a parameterPath,
 *           the registry description in paper-sources.json must contain at least one key term related to
 *           that parameterPath (e.g. 'noise_temperature' → registry must mention 'noise' or 'temperature';
 *           'bandwidth' → 'bandwidth', 'BW', or 'MHz'). Catches obvious mismatches where an ID is reused
 *           for an unrelated parameter. Heuristic only — does not guarantee full semantic equivalence.
 *
 * Warnings (exit 0 but reported):
 *   Warn A: assumption-backed entries without any specMode tag
 *   Warn B: profiles with tx_power_per_beam_dbm absent but eirp_density_dbw_per_mhz present
 *           (derived quantity used as primary signal-path input — Advanced/compatibility only)
 *
 * Exits 0 on pass, 1 on failure.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const paperSourcesPath = join(root, 'src/core/config/paper-sources.json');
const paperSources = JSON.parse(readFileSync(paperSourcesPath, 'utf8'));
const assumptionIds = new Set(Object.keys(paperSources.assumptions ?? {}));
const standardIds = new Set(Object.keys(paperSources.standards ?? {}));
const paperIds = new Set(Object.keys(paperSources.papers ?? {}));

const defaultsPath = join(root, 'src/core/profiles/defaults.ts');
const defaultsText = readFileSync(defaultsPath, 'utf8');

// Extract sourceMap entries using regex
const entryPattern = /\{\s*tier:\s*'([^']+)',\s*id:\s*'([^']+)'([^}]*)\}/g;

let failures = 0;
const entries = [];

let m;
while ((m = entryPattern.exec(defaultsText)) !== null) {
  const tier = m[1];
  const id = m[2];
  const rest = m[3];
  const specModeMatch = rest.match(/specMode:\s*'([^']+)'/);
  const specMode = specModeMatch ? specModeMatch[1] : undefined;
  entries.push({ tier, id, specMode, raw: m[0] });
}

console.log(`validate-specmode-gating: found ${entries.length} sourceMap entries`);

// --- Rule 1 ---
for (const e of entries) {
  if (e.specMode === 'Internal-only' && (e.tier === 'paper-backed' || e.tier === 'standard-backed')) {
    console.error(`  FAIL [Rule 1]: Internal-only entry has incompatible tier='${e.tier}': id='${e.id}'`);
    failures++;
  }
}

// --- Rule 2 ---
for (const e of entries) {
  if (e.tier === 'assumption-backed' && !assumptionIds.has(e.id)) {
    console.error(`  FAIL [Rule 2]: assumption-backed entry id='${e.id}' not in paper-sources.json assumptions`);
    failures++;
  }
}

// --- Rule 3: assumption-backed + specMode='Realistic' is a contradiction ---
for (const e of entries) {
  if (e.tier === 'assumption-backed' && e.specMode === 'Realistic') {
    console.error(`  FAIL [Rule 3]: assumption-backed entry tagged specMode='Realistic' — contradiction:`);
    console.error(`    id='${e.id}' (assumption-backed values are not Realistic paper-backed defaults)`);
    console.error(`    Entry: ${e.raw.slice(0, 160)}`);
    failures++;
  }
}

// --- Rule 4: standard-backed entry with ASSUME-* id (tier/id type mismatch) ---
for (const e of entries) {
  if (e.tier === 'standard-backed' && assumptionIds.has(e.id)) {
    console.error(`  FAIL [Rule 4]: standard-backed entry uses assumption-registry id='${e.id}' — tier/id mismatch`);
    console.error(`    ASSUME-* IDs must use tier='assumption-backed', not 'standard-backed'`);
    failures++;
  }
}

// --- Rule 5: realistic-first-screen must not contain specMode='Advanced' ---
// Extract the realistic-first-screen profile block
const rfScreenSourceMapBlock = (() => {
  // Find the block between 'realistic-first-screen' id and the next top-level export
  const match = defaultsText.match(/id:\s*'realistic-first-screen'[\s\S]*?(?=^export const |\nexport const )/m);
  return match ? match[0] : '';
})();

if (rfScreenSourceMapBlock) {
  // Find all sourceMap entries in this block
  const rfEntries = [];
  const rfPattern = /\{\s*tier:\s*'([^']+)',\s*id:\s*'([^']+)'([^}]*)\}/g;
  let rm;
  while ((rm = rfPattern.exec(rfScreenSourceMapBlock)) !== null) {
    const specModeMatch = rm[3].match(/specMode:\s*'([^']+)'/);
    const specMode = specModeMatch ? specModeMatch[1] : undefined;
    rfEntries.push({ tier: rm[1], id: rm[2], specMode });
  }
  for (const e of rfEntries) {
    if (e.specMode === 'Advanced') {
      console.error(`  FAIL [Rule 5]: realistic-first-screen contains specMode='Advanced' entry — violates Realistic preset governance`);
      console.error(`    id='${e.id}' tier='${e.tier}' — Advanced entries must not appear in Realistic first-screen`);
      failures++;
    }
  }
}

// --- Rule 6: layer1_enabled=true profile must have energy sourceMap entry ---
// Find all profile blocks and check layer1_enabled vs energy sourceMap coverage
const profileBlockPattern = /\{\s*id:\s*'([^']+)'[\s\S]*?(?=^\s*\{[^}]*id:\s*'[^']+|\Z)/mg;
// Use a simpler heuristic: scan for layer1_enabled: true occurrences and check nearby sourceMap
const layer1Matches = [...defaultsText.matchAll(/layer1_enabled\s*:\s*true/g)];
for (const lm of layer1Matches) {
  // Extract a window of 3000 chars around this occurrence to find the enclosing profile id and sourceMap
  const windowStart = Math.max(0, lm.index - 2000);
  const windowEnd = Math.min(defaultsText.length, lm.index + 5000);
  const window = defaultsText.slice(windowStart, windowEnd);
  // Find the nearest id: 'xxx' before this point
  const idMatches = [...window.slice(0, lm.index - windowStart).matchAll(/id:\s*'([^']+)'/g)];
  const profileId = idMatches.length > 0 ? idMatches[idMatches.length - 1][1] : '(unknown)';
  // Check if there's an energy-related sourceMap entry in this window
  // Also accept spread sourceMap inheritance (e.g. ...BH_RESOURCE_BASELINE.sourceMap)
  // which transitively includes the parent's energy entries
  const hasSpreaderSourceMap = /\.\.\.[A-Z_]+\.sourceMap/.test(window);
  const hasEnergyEntry = /ASSUME-ENERGY|ASSUME-ENE/i.test(window) ||
    /parameterPath:\s*'energy\./i.test(window) ||
    hasSpreaderSourceMap;
  if (!hasEnergyEntry) {
    console.error(`  FAIL [Rule 6]: profile id='${profileId}' has layer1_enabled=true but no energy-related sourceMap entry`);
    console.error(`    P5/P6/P7 beam-state power values must be disclosed (add ASSUME-ENERGY-001 or equivalent)`);
    failures++;
  }
}

// --- Rule 7: semantic consistency — ASSUME-* ID description must be plausibly related to parameterPath ---
// Heuristic: extract key terms from parameterPath and check registry description contains at least one.
// Only applied to entries that have both an ASSUME-* id and a parameterPath.
const paramPathPattern = /\{\s*tier:\s*'([^']+)',\s*id:\s*'([^']+)'[^}]*parameterPath:\s*'([^']+)'[^}]*\}/g;
const paramPathEntries = [];
let pp;
while ((pp = paramPathPattern.exec(defaultsText)) !== null) {
  paramPathEntries.push({ tier: pp[1], id: pp[2], parameterPath: pp[3] });
}

const termMap = {
  'noise_temperature': ['noise', 'temperature', 'T_ant', 'T_sys'],
  'noise_figure':      ['noise', 'figure', 'NF'],
  'path_loss':         ['path loss', 'path_loss', 'tier', 'FSPL', 'attenuation'],
  'frequency':         ['frequency', 'freq', 'GHz', 'band'],
  'bandwidth':         ['bandwidth', 'BW', 'MHz'],
  'tx_power':          ['power', 'dBm', 'dBW', 'P_tx', 'EIRP'],
  'eirp':              ['EIRP', 'power', 'dBW'],
  'energy':            ['energy', 'power', 'W', 'battery', 'solar'],
  'beam':              ['beam', 'antenna', 'gain'],
  'handover':          ['handover', 'HO', 'trigger', 'TTT', 'hysteresis'],
};

for (const e of paramPathEntries) {
  if (!e.id.startsWith('ASSUME-')) continue;
  const registryEntry = paperSources.assumptions[e.id];
  if (!registryEntry) continue; // Rule 2 already handles missing IDs
  // assumptions values may be strings or objects with a .description field
  const registryDesc = typeof registryEntry === 'string' ? registryEntry : (registryEntry.description ?? '');

  // Find which term group applies to this parameterPath
  const pathLower = e.parameterPath.toLowerCase();
  let expectedTerms = null;
  for (const [key, terms] of Object.entries(termMap)) {
    if (pathLower.includes(key)) {
      expectedTerms = terms;
      break;
    }
  }
  if (!expectedTerms) continue; // parameterPath not covered by heuristic — skip

  const descLower = registryDesc.toLowerCase();
  const matched = expectedTerms.some(t => descLower.includes(t.toLowerCase()));
  if (!matched) {
    console.error(`  FAIL [Rule 7]: ASSUME-* ID semantic mismatch:`);
    console.error(`    id='${e.id}' used on parameterPath='${e.parameterPath}'`);
    console.error(`    Registry description: "${registryDesc.slice(0, 100)}"`);
    console.error(`    Expected description to mention one of: ${expectedTerms.join(', ')}`);
    failures++;
  }
}

// --- Warn A: assumption-backed entries without specMode ---
let warnA = 0;
for (const e of entries) {
  if (e.tier === 'assumption-backed' && !e.specMode) {
    warnA++;
  }
}
if (warnA > 0) {
  console.log(`  WARN [A]: ${warnA} assumption-backed entries have no specMode — add Internal-only or Advanced before Phase 4`);
}

// --- Warn B: eirp_density present but tx_power_per_beam_dbm absent in realistic-first-screen ---
// Check by looking at the profile block for 'realistic-first-screen'
const rfScreenBlock = defaultsText.match(/id:\s*'realistic-first-screen'[\s\S]*?sourceMap:/);
if (rfScreenBlock) {
  const block = rfScreenBlock[0];
  const hasP1 = /tx_power_per_beam_dbm/.test(block);
  const hasEirp = /eirp_density_dbw_per_mhz/.test(block);
  if (hasEirp && !hasP1) {
    console.log(`  WARN [B]: realistic-first-screen specifies eirp_density_dbw_per_mhz without tx_power_per_beam_dbm`);
    console.log(`    eirp_density is a derived quantity (spec §8) — should not be primary input in Realistic profile`);
  }
}

if (failures > 0) {
  console.error(`\nvalidate-specmode-gating: FAIL (${failures} violation(s))`);
  process.exit(1);
} else {
  console.log(`validate-specmode-gating: OK`);
}
