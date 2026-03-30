/**
 * Profile compose / decompose API for Phase 3 Scenario/Profile/Experiment Split.
 *
 * Provides:
 *   composeProfile(bundle, exp): ProfileConfig
 *     — assemble a flat ProfileConfig from a ProfileBundle + ExperimentBundle.
 *       This is the compatibility shim that lets engine.ts, loader.ts, and all runners
 *       continue to accept ProfileConfig without change.
 *
 *   decomposeProfile(config): { bundle, exp }
 *     — inverse of composeProfile. Used by VAL-PLAT-007 round-trip verification
 *       and by future loaders/editors that need the typed decomposition.
 *
 * Authority: sdd/phase3-scenario-profile-experiment-split.md §6
 *
 * Import rule: may only import from ./types and @/core/common/types or @/core/orbit/types.
 * Must NOT import from engine.ts, src/viz/, src/app/, src/runner/.
 */

import type {
  ProfileConfig,
  ProfileBundle,
  ExperimentBundle,
  ScenarioConfig,
} from './types';
import type { SpecMode } from '@/core/common/types';

// ---------------------------------------------------------------------------
// Static exposure preset lookup
// Populated from ControlPanel.PROFILE_OPTIONS (src/viz/overlays/ControlPanel.tsx)
// Phase 4 P4-7 will replace this with a getProfileList() API call.
// ---------------------------------------------------------------------------

export const PROFILE_EXPOSURE_PRESETS: Record<string, { tier: SpecMode; label: string }> = {
  'realistic-first-screen':       { tier: 'Realistic',    label: 'Realistic — Ka 20 GHz, A3 HO (spec §10)' },
  'case9-access-baseline':        { tier: 'Advanced',     label: 'Advanced — Case-9 Access (S-band A4)' },
  'hobs-multibeam-baseline':      { tier: 'Advanced',     label: 'Advanced — HOBS Multi-Beam (Ka 28 GHz)' },
  'bh-resource-baseline':         { tier: 'Advanced',     label: 'Advanced — BH Resource (Ka 20 GHz)' },
  'case9-daps-baseline':          { tier: 'Advanced',     label: 'Advanced — DAPS Dual-Active' },
  'real-trace-validation':        { tier: 'Advanced',     label: 'Advanced — Real-Trace (TLE/SGP4)' },
  'meo-constellation-baseline':   { tier: 'Advanced',     label: 'Advanced — MEO Constellation' },
  'geo-relay-baseline':           { tier: 'Advanced',     label: 'Advanced — GEO Relay' },
  'sinr-elevation-reproduction':  { tier: 'Sensitivity',  label: 'Sensitivity — SINR-Elevation Repro' },
  'hobs-reproduction':            { tier: 'Sensitivity',  label: 'Sensitivity — HOBS Repro' },
  'timer-cho-reproduction':       { tier: 'Sensitivity',  label: 'Sensitivity — Timer-CHO Repro' },
  'bh-pf-baseline':               { tier: 'Sensitivity',  label: 'Sensitivity — BH Proportional-Fair' },
  'bh-sinr-greedy-baseline':      { tier: 'Sensitivity',  label: 'Sensitivity — BH SINR-Greedy' },
  'bh-resource-energy-proof':     { tier: 'Sensitivity',  label: 'Sensitivity — BH Energy Proof' },
};

// ---------------------------------------------------------------------------
// composeProfile
// ---------------------------------------------------------------------------

/**
 * composeProfile — assemble a flat ProfileConfig from a ProfileBundle + ExperimentBundle.
 *
 * Rules:
 *   1. Every field of the returned ProfileConfig traces to exactly one source
 *      (bundle or exp) per the §5 mapping table. No value is hardcoded.
 *   2. The returned ProfileConfig must be structurally identical to what
 *      defaults.ts previously defined for the same profile. VAL-PLAT-007 verifies this.
 *   3. tier0_fspl is always true in the returned channel config.
 *   4. timeControl assembles epochUtcMs from bundle.scenario, durationSec/stepSec from exp.
 *   5. Undefined optional fields are omitted from the result (not set to undefined).
 *   6. The returned object shares NO mutable references with the inputs.
 *      All nested objects and arrays are shallow-copied. This is a pure transformation.
 *
 * Authority: phase3-scenario-profile-experiment-split.md §6.1 and §6.3
 */
export function composeProfile(bundle: ProfileBundle, exp: ExperimentBundle): ProfileConfig {
  const { orbitalTopology } = bundle.scenario;

  const config: ProfileConfig = {
    // ── Profile metadata (PM) ─────────────────────────────────────────
    id: bundle.id,
    family: bundle.family,
    version: bundle.version,

    // ── Scenario (S) top-level fields ─────────────────────────────────
    orbitMode: bundle.scenario.orbitMode,
    beamSemantics: bundle.models.beamSemantics,
    observer: { ...bundle.scenario.observer },

    // ── Experiment (E) top-level fields ───────────────────────────────
    seed: exp.seed,

    // ── timeControl: epoch from S, duration/step from E ───────────────
    timeControl: {
      epochUtcMs: bundle.scenario.epochUtcMs,
      durationSec: exp.timeControl.durationSec,
      stepSec: exp.timeControl.stepSec,
    },

    // ── orbital: P-params from bundle.orbital + S topology from scenario ──
    orbital: {
      altitude_km: bundle.orbital.altitude_km,
      inclination_deg: bundle.orbital.inclination_deg,
      num_planes: bundle.orbital.num_planes,
      sats_per_plane: bundle.orbital.sats_per_plane,
      raan_spread_deg: bundle.orbital.raan_spread_deg,
      phase_offset_deg: bundle.orbital.phase_offset_deg,
      ...(orbitalTopology?.orbitType !== undefined && { orbitType: orbitalTopology.orbitType }),
      ...(orbitalTopology?.extra_shells !== undefined && { extra_shells: orbitalTopology.extra_shells.map(s => ({ ...s })) }),
      ...(orbitalTopology?.geoSatellites !== undefined && { geoSatellites: orbitalTopology.geoSatellites.map(g => ({ ...g })) }),
    },

    // ── rf: all RfConfig fields are P-classified ───────────────────────
    rf: {
      frequency_ghz: bundle.rf.frequency_ghz,
      bandwidth_mhz: bundle.rf.bandwidth_mhz,
      eirp_density_dbw_per_mhz: bundle.rf.eirp_density_dbw_per_mhz,
      ...(bundle.rf.tx_power_per_beam_dbm !== undefined && { tx_power_per_beam_dbm: bundle.rf.tx_power_per_beam_dbm }),
      max_tx_power_dbm: bundle.rf.max_tx_power_dbm,
      noise_temperature_k: bundle.rf.noise_temperature_k,
      ...(bundle.rf.noise_figure_db !== undefined && { noise_figure_db: bundle.rf.noise_figure_db }),
      ...(bundle.rf.implementation_loss_db !== undefined && { implementation_loss_db: bundle.rf.implementation_loss_db }),
    },

    // ── antenna: model from MB, P-params from bundle.antenna ──────────
    antenna: {
      model: bundle.models.antenna.model,
      peak_gain_dbi: bundle.antenna.peak_gain_dbi,
      beam_diameter_km: bundle.antenna.beam_diameter_km,
    },

    // ── beam: P-params from bundle.beam + MB selections from models ───
    beam: {
      num_beams: bundle.beam.num_beams,
      layout: bundle.models.beam.layout,
      frf: bundle.beam.frf,
      interference_beams: bundle.beam.interference_beams,
      ...(bundle.beam.bh_max_active_per_slot !== undefined && { bh_max_active_per_slot: bundle.beam.bh_max_active_per_slot }),
      ...(bundle.beam.bh_frame_duration_sec !== undefined && { bh_frame_duration_sec: bundle.beam.bh_frame_duration_sec }),
      ...(bundle.beam.bh_slots_per_frame !== undefined && { bh_slots_per_frame: bundle.beam.bh_slots_per_frame }),
      ...(bundle.models.beam.bh_strategy !== undefined && { bh_strategy: bundle.models.beam.bh_strategy }),
      ...(bundle.beam.bh_power_budget_w !== undefined && { bh_power_budget_w: bundle.beam.bh_power_budget_w }),
      ...(bundle.models.beam.bh_traffic_model !== undefined && { bh_traffic_model: bundle.models.beam.bh_traffic_model }),
      ...(bundle.beam.bh_traffic_arrival_rate !== undefined && { bh_traffic_arrival_rate: bundle.beam.bh_traffic_arrival_rate }),
    },

    // ── channel: MB tier flags from models + P-params from bundle ─────
    channel: {
      tier0_fspl: true,
      tier1_large_scale: bundle.models.channel.tier1_large_scale,
      tier2_clutter: bundle.models.channel.tier2_clutter,
      tier3_beam_gain: bundle.models.channel.tier3_beam_gain,
      tier4_atmospheric: bundle.models.channel.tier4_atmospheric,
      tier5_fading: bundle.models.channel.tier5_fading,
      ...(bundle.models.channel.tier6_doppler !== undefined && { tier6_doppler: bundle.models.channel.tier6_doppler }),
      ...(bundle.models.channel.large_scale_model !== undefined && { large_scale_model: bundle.models.channel.large_scale_model }),
      ...(bundle.channel.deployment_environment !== undefined && { deployment_environment: bundle.channel.deployment_environment }),
      ...(bundle.channel.los_elevation_deg !== undefined && { los_elevation_deg: bundle.channel.los_elevation_deg }),
      ...(bundle.channel.subcarrier_spacing_khz !== undefined && { subcarrier_spacing_khz: bundle.channel.subcarrier_spacing_khz }),
    },

    // ── handover: type from MB, P-params from bundle.handover ─────────
    handover: {
      type: bundle.models.handover.type,
      trigger_threshold_db: bundle.handover.trigger_threshold_db,
      ttt_ms: bundle.handover.ttt_ms,
      hysteresis_db: bundle.handover.hysteresis_db,
      min_elevation_deg: bundle.handover.min_elevation_deg,
      ...(bundle.handover.a3_offset_db !== undefined && { a3_offset_db: bundle.handover.a3_offset_db }),
      ...(bundle.handover.pingPongWindowSec !== undefined && { pingPongWindowSec: bundle.handover.pingPongWindowSec }),
      ...(bundle.handover.cho_offset_db !== undefined && { cho_offset_db: bundle.handover.cho_offset_db }),
      ...(bundle.handover.cho_alpha !== undefined && { cho_alpha: bundle.handover.cho_alpha }),
      ...(bundle.handover.cho_filter_k !== undefined && { cho_filter_k: bundle.handover.cho_filter_k }),
      ...(bundle.handover.daps_preparation_time_sec !== undefined && { daps_preparation_time_sec: bundle.handover.daps_preparation_time_sec }),
      ...(bundle.handover.daps_max_dual_active_sec !== undefined && { daps_max_dual_active_sec: bundle.handover.daps_max_dual_active_sec }),
      ...(bundle.handover.mc_max_dual_sec !== undefined && { mc_max_dual_sec: bundle.handover.mc_max_dual_sec }),
      ...(bundle.handover.mc_packet_duplication !== undefined && { mc_packet_duplication: bundle.handover.mc_packet_duplication }),
      ...(bundle.handover.d2_serving_dist_km !== undefined && { d2_serving_dist_km: bundle.handover.d2_serving_dist_km }),
      ...(bundle.handover.d2_target_dist_km !== undefined && { d2_target_dist_km: bundle.handover.d2_target_dist_km }),
      ...(bundle.handover.sinr_ema_alpha !== undefined && { sinr_ema_alpha: bundle.handover.sinr_ema_alpha }),
      ...(bundle.handover.rlf_qout_db !== undefined && { rlf_qout_db: bundle.handover.rlf_qout_db }),
      ...(bundle.handover.rlf_qin_db !== undefined && { rlf_qin_db: bundle.handover.rlf_qin_db }),
      ...(bundle.handover.rlf_n310 !== undefined && { rlf_n310: bundle.handover.rlf_n310 }),
      ...(bundle.handover.rlf_n311 !== undefined && { rlf_n311: bundle.handover.rlf_n311 }),
      ...(bundle.handover.rlf_t310_ms !== undefined && { rlf_t310_ms: bundle.handover.rlf_t310_ms }),
    },

    // ── energy: MB flags from models + P-params from bundle ───────────
    energy: {
      layer1_enabled: bundle.models.energy.layer1_enabled,
      layer2_enabled: bundle.models.energy.layer2_enabled,
      ...(bundle.energy.energy_per_handover_j !== undefined && { energy_per_handover_j: bundle.energy.energy_per_handover_j }),
      ...(bundle.energy.layer2_overrides !== undefined && { layer2_overrides: { ...bundle.energy.layer2_overrides } }),
    },

    // ── ueConfig: count/distribution from S, speed from P, independentHO from MB ──
    ueConfig: {
      count: bundle.scenario.ueTopology.count,
      distribution: bundle.scenario.ueTopology.distribution,
      speed_kmh: bundle.ueConfig.speed_kmh,
      ...(bundle.models.ueConfig.independentHandover !== undefined && { independentHandover: bundle.models.ueConfig.independentHandover }),
    },

    // ── sourceMap: PM transitional (shallow-copy each entry to avoid aliasing) ──
    sourceMap: bundle.sourceMap.map(ref => ({ ...ref })),
  };

  // ── optional top-level E and S fields ─────────────────────────────────
  if (bundle.scenario.tleDataPath !== undefined) {
    config.tleDataPath = bundle.scenario.tleDataPath;
  }
  if (exp.tleMaxSatellites !== undefined) {
    config.tleMaxSatellites = exp.tleMaxSatellites;
  }
  if (bundle.models.policy?.policyId !== undefined) {
    config.policyId = bundle.models.policy.policyId;
  }

  return config;
}

// ---------------------------------------------------------------------------
// decomposeProfile
// ---------------------------------------------------------------------------

/**
 * decomposeProfile — extract ProfileBundle + ExperimentBundle from a flat ProfileConfig.
 *
 * Inverse of composeProfile. Used by:
 *   1. VAL-PLAT-007 to verify round-trip identity.
 *   2. Future loaders/editors that need the typed decomposition.
 *
 * Rules:
 *   1. For every field in ProfileConfig, the §5 mapping table is the authority.
 *   2. composeProfile(decomposeProfile(config).bundle, decomposeProfile(config).exp)
 *      must deep-equal the original config for all 14 profiles (VAL-PLAT-007).
 *   3. Absent optional fields become absent in bundle/exp (not set to undefined).
 *   4. bundle.exposurePreset is derived from the static PROFILE_EXPOSURE_PRESETS lookup;
 *      defaults to { tier: 'Advanced', label: config.id } for unknown profile IDs.
 *   5. The returned objects share NO mutable references with the input config.
 *      All nested objects and arrays are shallow-copied. This is a pure transformation.
 *
 * Authority: phase3-scenario-profile-experiment-split.md §6.2
 */
export function decomposeProfile(config: ProfileConfig): { bundle: ProfileBundle; exp: ExperimentBundle } {
  // Derive exposurePreset from static lookup (not in ProfileConfig).
  // Shallow-copy to avoid aliasing the global PROFILE_EXPOSURE_PRESETS entry.
  const presetRef = PROFILE_EXPOSURE_PRESETS[config.id];
  const exposurePreset = presetRef
    ? { ...presetRef }
    : { tier: 'Advanced' as SpecMode, label: config.id };

  // Reconstruct orbital topology from the optional S-fields in OrbitalConfig
  const hasTopology = (
    config.orbital.orbitType !== undefined ||
    config.orbital.extra_shells !== undefined ||
    config.orbital.geoSatellites !== undefined
  );
  const orbitalTopology: ScenarioConfig['orbitalTopology'] = hasTopology
    ? {
        ...(config.orbital.orbitType !== undefined && { orbitType: config.orbital.orbitType }),
        ...(config.orbital.extra_shells !== undefined && { extra_shells: config.orbital.extra_shells.map(s => ({ ...s })) }),
        ...(config.orbital.geoSatellites !== undefined && { geoSatellites: config.orbital.geoSatellites.map(g => ({ ...g })) }),
      }
    : undefined;

  const bundle: ProfileBundle = {
    // ── PM ───────────────────────────────────────────────────────────
    id: config.id,
    family: config.family,
    version: config.version,
    exposurePreset,

    // ── S ────────────────────────────────────────────────────────────
    scenario: {
      orbitMode: config.orbitMode,
      ...(config.tleDataPath !== undefined && { tleDataPath: config.tleDataPath }),
      observer: { ...config.observer },
      epochUtcMs: config.timeControl.epochUtcMs,
      ...(orbitalTopology !== undefined && { orbitalTopology }),
      ueTopology: {
        count: config.ueConfig.count,
        distribution: config.ueConfig.distribution,
      },
    },

    // ── MB ───────────────────────────────────────────────────────────
    models: {
      beamSemantics: config.beamSemantics,
      antenna: { model: config.antenna.model },
      beam: {
        layout: config.beam.layout,
        ...(config.beam.bh_strategy !== undefined && { bh_strategy: config.beam.bh_strategy }),
        ...(config.beam.bh_traffic_model !== undefined && { bh_traffic_model: config.beam.bh_traffic_model }),
      },
      channel: {
        tier0_fspl: true,
        tier1_large_scale: config.channel.tier1_large_scale,
        tier2_clutter: config.channel.tier2_clutter,
        tier3_beam_gain: config.channel.tier3_beam_gain,
        tier4_atmospheric: config.channel.tier4_atmospheric,
        tier5_fading: config.channel.tier5_fading,
        ...(config.channel.tier6_doppler !== undefined && { tier6_doppler: config.channel.tier6_doppler }),
        ...(config.channel.large_scale_model !== undefined && { large_scale_model: config.channel.large_scale_model }),
      },
      handover: { type: config.handover.type },
      energy: {
        layer1_enabled: config.energy.layer1_enabled,
        layer2_enabled: config.energy.layer2_enabled,
      },
      ueConfig: {
        ...(config.ueConfig.independentHandover !== undefined && { independentHandover: config.ueConfig.independentHandover }),
      },
      ...(config.policyId !== undefined && { policy: { policyId: config.policyId } }),
    },

    // ── P params ─────────────────────────────────────────────────────
    orbital: {
      altitude_km: config.orbital.altitude_km,
      inclination_deg: config.orbital.inclination_deg,
      num_planes: config.orbital.num_planes,
      sats_per_plane: config.orbital.sats_per_plane,
      raan_spread_deg: config.orbital.raan_spread_deg,
      phase_offset_deg: config.orbital.phase_offset_deg,
    },

    rf: {
      frequency_ghz: config.rf.frequency_ghz,
      bandwidth_mhz: config.rf.bandwidth_mhz,
      eirp_density_dbw_per_mhz: config.rf.eirp_density_dbw_per_mhz,
      ...(config.rf.tx_power_per_beam_dbm !== undefined && { tx_power_per_beam_dbm: config.rf.tx_power_per_beam_dbm }),
      max_tx_power_dbm: config.rf.max_tx_power_dbm,
      noise_temperature_k: config.rf.noise_temperature_k,
      ...(config.rf.noise_figure_db !== undefined && { noise_figure_db: config.rf.noise_figure_db }),
      ...(config.rf.implementation_loss_db !== undefined && { implementation_loss_db: config.rf.implementation_loss_db }),
    },

    antenna: {
      peak_gain_dbi: config.antenna.peak_gain_dbi,
      beam_diameter_km: config.antenna.beam_diameter_km,
    },

    beam: {
      num_beams: config.beam.num_beams,
      frf: config.beam.frf,
      interference_beams: config.beam.interference_beams,
      ...(config.beam.bh_max_active_per_slot !== undefined && { bh_max_active_per_slot: config.beam.bh_max_active_per_slot }),
      ...(config.beam.bh_frame_duration_sec !== undefined && { bh_frame_duration_sec: config.beam.bh_frame_duration_sec }),
      ...(config.beam.bh_slots_per_frame !== undefined && { bh_slots_per_frame: config.beam.bh_slots_per_frame }),
      ...(config.beam.bh_power_budget_w !== undefined && { bh_power_budget_w: config.beam.bh_power_budget_w }),
      ...(config.beam.bh_traffic_arrival_rate !== undefined && { bh_traffic_arrival_rate: config.beam.bh_traffic_arrival_rate }),
    },

    channel: {
      ...(config.channel.deployment_environment !== undefined && { deployment_environment: config.channel.deployment_environment }),
      ...(config.channel.los_elevation_deg !== undefined && { los_elevation_deg: config.channel.los_elevation_deg }),
      ...(config.channel.subcarrier_spacing_khz !== undefined && { subcarrier_spacing_khz: config.channel.subcarrier_spacing_khz }),
    },

    handover: {
      trigger_threshold_db: config.handover.trigger_threshold_db,
      ttt_ms: config.handover.ttt_ms,
      hysteresis_db: config.handover.hysteresis_db,
      min_elevation_deg: config.handover.min_elevation_deg,
      ...(config.handover.a3_offset_db !== undefined && { a3_offset_db: config.handover.a3_offset_db }),
      ...(config.handover.pingPongWindowSec !== undefined && { pingPongWindowSec: config.handover.pingPongWindowSec }),
      ...(config.handover.cho_offset_db !== undefined && { cho_offset_db: config.handover.cho_offset_db }),
      ...(config.handover.cho_alpha !== undefined && { cho_alpha: config.handover.cho_alpha }),
      ...(config.handover.cho_filter_k !== undefined && { cho_filter_k: config.handover.cho_filter_k }),
      ...(config.handover.daps_preparation_time_sec !== undefined && { daps_preparation_time_sec: config.handover.daps_preparation_time_sec }),
      ...(config.handover.daps_max_dual_active_sec !== undefined && { daps_max_dual_active_sec: config.handover.daps_max_dual_active_sec }),
      ...(config.handover.mc_max_dual_sec !== undefined && { mc_max_dual_sec: config.handover.mc_max_dual_sec }),
      ...(config.handover.mc_packet_duplication !== undefined && { mc_packet_duplication: config.handover.mc_packet_duplication }),
      ...(config.handover.d2_serving_dist_km !== undefined && { d2_serving_dist_km: config.handover.d2_serving_dist_km }),
      ...(config.handover.d2_target_dist_km !== undefined && { d2_target_dist_km: config.handover.d2_target_dist_km }),
      ...(config.handover.sinr_ema_alpha !== undefined && { sinr_ema_alpha: config.handover.sinr_ema_alpha }),
      ...(config.handover.rlf_qout_db !== undefined && { rlf_qout_db: config.handover.rlf_qout_db }),
      ...(config.handover.rlf_qin_db !== undefined && { rlf_qin_db: config.handover.rlf_qin_db }),
      ...(config.handover.rlf_n310 !== undefined && { rlf_n310: config.handover.rlf_n310 }),
      ...(config.handover.rlf_n311 !== undefined && { rlf_n311: config.handover.rlf_n311 }),
      ...(config.handover.rlf_t310_ms !== undefined && { rlf_t310_ms: config.handover.rlf_t310_ms }),
    },

    energy: {
      ...(config.energy.energy_per_handover_j !== undefined && { energy_per_handover_j: config.energy.energy_per_handover_j }),
      ...(config.energy.layer2_overrides !== undefined && { layer2_overrides: { ...config.energy.layer2_overrides } }),
    },

    ueConfig: {
      speed_kmh: config.ueConfig.speed_kmh,
    },

    sourceMap: config.sourceMap.map(ref => ({ ...ref })),
  };

  const exp: ExperimentBundle = {
    seed: config.seed,
    timeControl: {
      durationSec: config.timeControl.durationSec,
      stepSec: config.timeControl.stepSec,
    },
    ...(config.tleMaxSatellites !== undefined && { tleMaxSatellites: config.tleMaxSatellites }),
  };

  return { bundle, exp };
}
