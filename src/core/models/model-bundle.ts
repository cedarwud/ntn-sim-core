/**
 * ModelBundle — Phase 2 model-bundle composition type and factory (P2-13).
 *
 * This is the ONLY place where ProfileConfig MB-classified fields are
 * translated into concrete model-family implementations.
 *
 * Layer: L2 (src/core/models/)
 * Authority: phase2-model-bundle-sdd.md §6
 *
 * Exception: this file may type-import ProfileConfig from profiles/types.ts
 * because it is the single translation point from profile config to model
 * family selection. All other files in src/core/models/ must NOT import
 * from profiles/. See phase2-model-bundle-sdd.md §3.1.
 *
 * DP-2 resolved: internal build; SimEngineConfig signature unchanged.
 * engine.ts calls buildModelBundle(profile) internally and stores the result.
 * DP-5 resolved: NO_OP_POLICY default; engine overrides bundle.policy when
 * config.policy is provided.
 */

import type { ProfileConfig } from '../profiles/types.js';
import type { TrajectoryCache } from '../orbit/types.js';
import type { GeometryModel } from './geometry.js';
import type { PathLossModel } from './path-loss.js';
import type { BeamGainModel } from './beam-gain.js';
import type { SinrModel } from './sinr.js';
import type { HandoverModel } from './handover.js';
import type { PowerModel, EeModel } from './power-ee.js';
import type { PolicyModel } from './policy.js';

import { WalkerAnalyticGeometry, Sgp4TleGeometry } from './geometry.js';
import { ThreegppBaselinePathLoss } from './path-loss.js';
import { RpsatBeamGainModel } from './beam-gain.js';
import { StandardSinrModel } from './sinr.js';
import { DefaultHandoverModel } from './handover.js';
import { BasicPowerModel, BpjEeModel } from './power-ee.js';
import { NO_OP_POLICY } from '../policy/plugins/no-op.js';

// ---------------------------------------------------------------------------
// ModelBundle type
// ---------------------------------------------------------------------------

/**
 * ModelBundle — declarative composition of all 8 model-family selections
 * for one simulation run. Built once at engine construction from ProfileConfig.
 *
 * NOT a Phase 3 type. Phase 3 will add ModelBundleSelection as a sub-object
 * of the decomposed ProfileConfig. ModelBundle is the RUNTIME object;
 * ModelBundleSelection (Phase 3) is the declarative config record.
 *
 * Storage: src/core/models/model-bundle.ts (NOT src/core/config/)
 * Authority: phase0-architecture-spec.md §0B.5 + phase0-architecture-spec.md §0C.3 VAL-PLAT-004b
 */
export interface ModelBundle {
  readonly id: string;
  readonly geometry: GeometryModel;
  readonly pathLoss: PathLossModel;
  readonly beamGain: BeamGainModel;
  readonly sinr: SinrModel;
  readonly handover: HandoverModel;
  readonly power: PowerModel | null;
  readonly ee: EeModel | null;
  readonly policy: PolicyModel;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * buildModelBundle — construct a ModelBundle from a ProfileConfig.
 *
 * This is the ONLY place where ProfileConfig MB-classified fields are
 * translated into concrete model-family implementations. After Phase 2,
 * engine.ts calls this once at construction and stores the result.
 *
 * Policy override is handled by the engine AFTER calling buildModelBundle,
 * not as a factory parameter. See DP-5 ruling in §5.7.
 *
 * Unknown orbitMode values fall back to WalkerAnalyticGeometry (no throw).
 */
// DP-5 resolved: NO_OP_POLICY default; engine overrides after buildModelBundle
export function buildModelBundle(
  profile: ProfileConfig,
  trajectoryCache: TrajectoryCache,
): ModelBundle {
  // --- geometry ---
  let geometry: GeometryModel;
  // OrbitMode = 'synthetic' | 'real-trace'; 'real-trace' uses the current
  // cache-backed real-trace geometry family.
  if (profile.orbitMode === 'real-trace') {
    geometry = new Sgp4TleGeometry(trajectoryCache);
  } else {
    // 'synthetic' → WalkerAnalyticGeometry
    geometry = new WalkerAnalyticGeometry(trajectoryCache);
  }

  // --- pathLoss ---
  const pathLoss: PathLossModel = new ThreegppBaselinePathLoss();

  // --- beamGain ---
  const beamGain: BeamGainModel = new RpsatBeamGainModel(profile.antenna.model);

  // --- sinr --- always StandardSinrModel (DP-6: DAPS inline in engine)
  const sinr: SinrModel = new StandardSinrModel();

  // --- handover ---
  const handover: HandoverModel = new DefaultHandoverModel(profile.handover.type);

  // --- power + ee ---
  let power: PowerModel | null = null;
  let ee: EeModel | null = null;
  if (profile.energy.layer1_enabled) {
    power = new BasicPowerModel();
    ee = new BpjEeModel();
  }

  // --- policy: default NO_OP; engine overrides when config.policy is provided (DP-5) ---
  const policy: PolicyModel = NO_OP_POLICY;

  return {
    id: `${profile.id}@${profile.version ?? '0'}`,
    geometry,
    pathLoss,
    beamGain,
    sinr,
    handover,
    power,
    ee,
    policy,
  };
}
