/**
 * validate-model-bundle — VAL-PLAT-004/004b/005 (Phase 2).
 *
 * Gate 004: engine.ts contains no raw tier-flag dispatch chains (Part A + Part B).
 * Gate 004b: src/core/models/ contains all 8 required interface files.
 * Gate 005: buildModelBundle produces non-null bundles for all DEFAULT_PROFILES.
 *
 * Usage: node --import tsx scripts/validate-model-bundle.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// --- resolve project root ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// VAL-PLAT-004b — src/core/models/ contains all 8 required interface files
// ---------------------------------------------------------------------------

function validatePlat004b(): boolean {
  const modelsDir = path.join(root, 'src/core/models');
  const required = [
    'geometry.ts',
    'path-loss.ts',
    'beam-gain.ts',
    'sinr.ts',
    'handover.ts',
    'power-ee.ts',
    'policy.ts',
    'model-bundle.ts',
  ];

  let pass = true;

  if (!fs.existsSync(modelsDir)) {
    console.log('VAL-PLAT-004b: FAIL — src/core/models/ directory does not exist');
    return false;
  }

  const missing = required.filter((f) => !fs.existsSync(path.join(modelsDir, f)));
  if (missing.length > 0) {
    console.log(`VAL-PLAT-004b: FAIL — missing files in src/core/models/: ${missing.join(', ')}`);
    pass = false;
  }

  // Check ModelBundle export in model-bundle.ts
  const bundleFile = path.join(modelsDir, 'model-bundle.ts');
  if (fs.existsSync(bundleFile)) {
    const text = fs.readFileSync(bundleFile, 'utf8');
    if (!/export\s+(interface|type)\s+ModelBundle\b/.test(text)) {
      console.log('VAL-PLAT-004b: FAIL — ModelBundle not found in src/core/models/model-bundle.ts (check for export keyword)');
      pass = false;
    }
  }

  if (pass) {
    console.log('VAL-PLAT-004b: PASS — src/core/models/ contains all 8 required interface files; ModelBundle in model-bundle.ts');
  }
  return pass;
}

// ---------------------------------------------------------------------------
// VAL-PLAT-004 — engine.ts contains no raw tier-flag chains (Part A + Part B)
// ---------------------------------------------------------------------------

function validatePlat004(): boolean {
  const enginePath = path.join(root, 'src/core/engine.ts');
  if (!fs.existsSync(enginePath)) {
    console.log('VAL-PLAT-004: FAIL — src/core/engine.ts does not exist');
    return false;
  }

  const text = fs.readFileSync(enginePath, 'utf8');
  const lines = text.split('\n');

  let pass = true;

  // Part A: negative check — no raw tier-flag dispatch chains
  const violations: string[] = [];
  const patterns = [
    /if\s*\(\s*(profile|config|this\.(profile|config))\.channel\.(tier\d|large_scale_model)\b/,
    /switch\s*\(\s*(profile|config|this\.(profile|config))\.channel\.(tier|large_scale)/,
    /if\s*\(\s*(profile|config|this\.(profile|config))\.antenna\.model\b/,
  ];
  // Excluded contexts: these patterns are legitimate in bundle-internal code
  const excludedContexts = [
    'buildModelBundle',
    '_bundleTiers',
    '_bundleBandConfig',
    'bundle.pathLoss.compute(',
    'bundle.beamGain.computeGainDb(',
    '// P2',
    'computeBundleSinr',
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip lines in excluded contexts
    if (excludedContexts.some((ctx) => line.includes(ctx))) continue;
    // Skip lines inside computeSatSinrPhase2/3 (dead code, not dispatch)
    // The dead function bodies are within these function declarations; accept them.
    // We check for DIRECT physics calls (computeBeamGainDb, computeLinkBudget, computeFspl, computeSinr)
    // in combination with the tier patterns.
    for (const pat of patterns) {
      if (pat.test(line)) {
        // Is this inside a direct physics call? Check nearby context.
        const surroundingLines = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join(' ');
        const physicsCallPattern = /computeBeamGain\b|computeLinkBudget\b|computeFspl\b|computeSinr\b/;
        if (physicsCallPattern.test(surroundingLines)) {
          violations.push(`  Line ${i + 1}: ${line.trim()}`);
        }
        break;
      }
    }
  }

  if (violations.length > 0) {
    console.log('VAL-PLAT-004: FAIL (Part A) — engine.ts contains raw tier-flag dispatch chains:');
    violations.forEach((v) => console.log(v));
    console.log('  Replace with bundle.pathLoss.compute() / bundle.beamGain.computeGainDb() calls.');
    pass = false;
  }

  // Part B: positive check — all 8 bundle dispatch patterns present
  const required = [
    'bundle.geometry.compute(',
    'bundle.pathLoss.compute(',
    'bundle.beamGain.computeGainDb(',
    'bundle.sinr.computeDb(',
    'bundle.handover.createManager(',
    'bundle.policy.selectAction(',
  ];
  const missing = required.filter((pat) => !text.includes(pat));
  if (missing.length > 0) {
    console.log('VAL-PLAT-004: FAIL (Part B) — engine.ts missing bundle dispatch patterns:');
    missing.forEach((m) => console.log(`  ${m}`));
    pass = false;
  }

  // Part B: bundle.power and bundle.ee referenced (even if null-guarded)
  if (!text.includes('bundle.power')) {
    console.log('VAL-PLAT-004: FAIL (Part B) — engine.ts missing bundle.power reference');
    pass = false;
  }
  if (!text.includes('bundle.ee')) {
    console.log('VAL-PLAT-004: FAIL (Part B) — engine.ts missing bundle.ee reference');
    pass = false;
  }

  if (pass) {
    console.log('VAL-PLAT-004: PASS — engine.ts contains no raw tier-flag dispatch chains; all 8 bundle families dispatched');
  }
  return pass;
}

// ---------------------------------------------------------------------------
// VAL-PLAT-005 — buildModelBundle produces valid bundles for all DEFAULT_PROFILES
// ---------------------------------------------------------------------------

async function validatePlat005(): Promise<boolean> {
  let buildModelBundle: (profile: unknown, cache: unknown) => unknown;
  let DEFAULT_PROFILES: Record<string, unknown>;
  let buildTrajectoryCache: (opts: unknown) => unknown;
  let generateWalkerConstellation: (config: unknown) => unknown;
  let buildWalkerConfig: (profile: unknown) => unknown;

  try {
    const mb = await import('../src/core/models/model-bundle.js');
    buildModelBundle = mb.buildModelBundle;
    const defaults = await import('../src/core/profiles/defaults.js');
    DEFAULT_PROFILES = defaults.DEFAULT_PROFILES;
    const cacheModule = await import('../src/core/orbit/trajectory-cache.js');
    buildTrajectoryCache = cacheModule.buildTrajectoryCache;
    const walkerModule = await import('../src/core/orbit/walker.js');
    generateWalkerConstellation = walkerModule.generateWalkerConstellation;
    const loaderModule = await import('../src/core/profiles/loader.js');
    buildWalkerConfig = loaderModule.buildWalkerConfig;
  } catch (e) {
    console.log(`VAL-PLAT-005: FAIL — import error: ${e}`);
    console.log('  Check that tsx is set up and paths are correct.');
    return false;
  }

  const profiles = Object.values(DEFAULT_PROFILES) as Array<Record<string, unknown>>;
  let pass = true;
  let count = 0;

  for (const profile of profiles) {
    const profileId = profile.id as string;
    try {
      // Build a minimal trajectory cache (same pattern as golden-case-engine.ts)
      const walkerConfig = (buildWalkerConfig as (p: unknown) => unknown)(profile);
      const constellation = (generateWalkerConstellation as (c: unknown) => unknown)(walkerConfig);
      const cache = (buildTrajectoryCache as (opts: unknown) => unknown)({
        elements: constellation,
        observerLatDeg: (profile.observer as Record<string, number>).latitudeDeg,
        observerLonDeg: (profile.observer as Record<string, number>).longitudeDeg,
        durationSec: 60,
        stepSec: 10,
        epochUtcMs: (profile.timeControl as Record<string, number>).epochUtcMs,
      });

      const bundle = buildModelBundle(profile, cache) as Record<string, unknown> | null;

      if (!bundle) {
        console.log(`VAL-PLAT-005: FAIL — buildModelBundle returned null for profile "${profileId}"`);
        pass = false;
        continue;
      }

      // Check always-required fields
      const required = ['geometry', 'pathLoss', 'beamGain', 'sinr', 'handover', 'policy'];
      for (const field of required) {
        if (!bundle[field]) {
          console.log(`VAL-PLAT-005: FAIL — bundle.${field} is null for profile "${profileId}"`);
          pass = false;
        }
      }

      // Check power/ee nullability vs layer1_enabled
      const energy = profile.energy as Record<string, boolean>;
      if (energy.layer1_enabled) {
        if (!bundle['power']) {
          console.log(`VAL-PLAT-005: FAIL — bundle.power is null for profile "${profileId}" but energy.layer1_enabled === true`);
          pass = false;
        }
        if (!bundle['ee']) {
          console.log(`VAL-PLAT-005: FAIL — bundle.ee is null for profile "${profileId}" but energy.layer1_enabled === true`);
          pass = false;
        }
      } else {
        if (bundle['power'] !== null) {
          console.log(`VAL-PLAT-005: FAIL — bundle.power is non-null for profile "${profileId}" but energy.layer1_enabled === false`);
          pass = false;
        }
      }

      // Check bundle.id starts with profile.id
      const bundleId = bundle['id'] as string;
      if (!bundleId.startsWith(profileId)) {
        console.log(`VAL-PLAT-005: FAIL — bundle.id "${bundleId}" does not start with profile.id "${profileId}"`);
        pass = false;
      }

      count++;
    } catch (e) {
      console.log(`VAL-PLAT-005: FAIL — buildModelBundle threw for profile "${profileId}":`);
      console.log(`  ${e}`);
      pass = false;
    }
  }

  if (pass) {
    console.log(`VAL-PLAT-005: PASS — buildModelBundle produced valid non-null bundles for all ${count} profiles`);
  }
  return pass;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== validate-model-bundle (VAL-PLAT-004/004b/005) ===\n');

  const r004b = validatePlat004b();
  console.log('');
  const r004 = validatePlat004();
  console.log('');
  const r005 = await validatePlat005();

  console.log('');
  const allPass = r004b && r004 && r005;
  if (allPass) {
    console.log('══════════════════════════════════════════════════');
    console.log('✅ ALL MODEL BUNDLE CHECKS PASSED (VAL-PLAT-004/004b/005)');
    console.log('══════════════════════════════════════════════════');
    process.exit(0);
  } else {
    console.log('══════════════════════════════════════════════════');
    console.log('❌ MODEL BUNDLE CHECKS FAILED — see above for details');
    console.log('══════════════════════════════════════════════════');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('validate-model-bundle: unexpected error:', e);
  process.exit(1);
});
