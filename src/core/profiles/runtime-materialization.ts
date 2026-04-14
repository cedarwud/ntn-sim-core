import type {
  ExperimentBundle,
  ProfileBundle,
  ProfileConfig,
} from './types';

/**
 * Phase 5 runtime materialization.
 * Ownership: authoring bundle + experiment -> runtime ProfileConfig.
 */

export function materializeRuntimeProfile(
  bundle: ProfileBundle,
  exp: ExperimentBundle,
): ProfileConfig {
  const { orbitalTopology } = bundle.scenario;

  const config: ProfileConfig = {
    id: bundle.id,
    family: bundle.family,
    version: bundle.version,
    orbitMode: bundle.scenario.orbitMode,
    beamSemantics: bundle.models.beamSemantics,
    observer: { ...bundle.scenario.observer },
    seed: exp.seed,
    timeControl: {
      epochUtcMs: bundle.scenario.epochUtcMs,
      durationSec: exp.timeControl.durationSec,
      stepSec: exp.timeControl.stepSec,
    },
    orbital: {
      altitude_km: bundle.orbital.altitude_km,
      inclination_deg: bundle.orbital.inclination_deg,
      num_planes: bundle.orbital.num_planes,
      sats_per_plane: bundle.orbital.sats_per_plane,
      raan_spread_deg: bundle.orbital.raan_spread_deg,
      phase_offset_deg: bundle.orbital.phase_offset_deg,
      ...(bundle.orbital.phasing_factor !== undefined && { phasing_factor: bundle.orbital.phasing_factor }),
      ...(orbitalTopology?.orbitType !== undefined && { orbitType: orbitalTopology.orbitType }),
      ...(orbitalTopology?.extra_shells !== undefined && { extra_shells: orbitalTopology.extra_shells.map((shell) => ({ ...shell })) }),
      ...(orbitalTopology?.geoSatellites !== undefined && { geoSatellites: orbitalTopology.geoSatellites.map((sat) => ({ ...sat })) }),
    },
    rf: {
      frequency_ghz: bundle.rf.frequency_ghz,
      bandwidth_mhz: bundle.rf.bandwidth_mhz,
      eirp_density_dbw_per_mhz: bundle.rf.eirp_density_dbw_per_mhz,
      ...(bundle.rf.tx_power_per_beam_dbm !== undefined && { tx_power_per_beam_dbm: bundle.rf.tx_power_per_beam_dbm }),
      max_tx_power_dbm: bundle.rf.max_tx_power_dbm,
      noise_temperature_k: bundle.rf.noise_temperature_k,
      ...(bundle.rf.noise_figure_db !== undefined && { noise_figure_db: bundle.rf.noise_figure_db }),
      ...(bundle.rf.implementation_loss_db !== undefined && { implementation_loss_db: bundle.rf.implementation_loss_db }),
      ...(bundle.rf.ue_antenna_gain_dbi !== undefined && { ue_antenna_gain_dbi: bundle.rf.ue_antenna_gain_dbi }),
    },
    antenna: {
      model: bundle.models.antenna.model,
      peak_gain_dbi: bundle.antenna.peak_gain_dbi,
      beam_diameter_km: bundle.antenna.beam_diameter_km,
    },
    beam: {
      num_beams: bundle.beam.num_beams,
      layout: bundle.models.beam.layout,
      ...(bundle.models.beam.tracking_mode !== undefined && { tracking_mode: bundle.models.beam.tracking_mode }),
      ...(bundle.beam.steering_bound_km !== undefined && { steering_bound_km: bundle.beam.steering_bound_km }),
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
    handover: {
      type: bundle.models.handover.type,
      trigger_threshold_db: bundle.handover.trigger_threshold_db,
      ttt_ms: bundle.handover.ttt_ms,
      hysteresis_db: bundle.handover.hysteresis_db,
      min_elevation_deg: bundle.handover.min_elevation_deg,
      ...(bundle.handover.a3_offset_db !== undefined && { a3_offset_db: bundle.handover.a3_offset_db }),
      ...(bundle.handover.pingPongWindowSec !== undefined && { pingPongWindowSec: bundle.handover.pingPongWindowSec }),
      ...(bundle.handover.daps_prepare_elevation_deg !== undefined && { daps_prepare_elevation_deg: bundle.handover.daps_prepare_elevation_deg }),
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
      ...(bundle.handover.sinr_offset_db !== undefined && { sinr_offset_db: bundle.handover.sinr_offset_db }),
      ...(bundle.handover.sinr_offset_trigger_time_sec !== undefined && { sinr_offset_trigger_time_sec: bundle.handover.sinr_offset_trigger_time_sec }),
      ...(bundle.handover.sinr_offset_pending_hold_sec !== undefined && { sinr_offset_pending_hold_sec: bundle.handover.sinr_offset_pending_hold_sec }),
      ...(bundle.handover.sinr_offset_smoothing_sec !== undefined && { sinr_offset_smoothing_sec: bundle.handover.sinr_offset_smoothing_sec }),
      ...(bundle.handover.sinr_offset_intra_switch_sec !== undefined && { sinr_offset_intra_switch_sec: bundle.handover.sinr_offset_intra_switch_sec }),
      ...(bundle.handover.rlf_qout_db !== undefined && { rlf_qout_db: bundle.handover.rlf_qout_db }),
      ...(bundle.handover.rlf_qin_db !== undefined && { rlf_qin_db: bundle.handover.rlf_qin_db }),
      ...(bundle.handover.rlf_n310 !== undefined && { rlf_n310: bundle.handover.rlf_n310 }),
      ...(bundle.handover.rlf_n311 !== undefined && { rlf_n311: bundle.handover.rlf_n311 }),
      ...(bundle.handover.rlf_t310_ms !== undefined && { rlf_t310_ms: bundle.handover.rlf_t310_ms }),
    },
    energy: {
      layer1_enabled: bundle.models.energy.layer1_enabled,
      layer2_enabled: bundle.models.energy.layer2_enabled,
      ...(bundle.energy.energy_per_handover_j !== undefined && { energy_per_handover_j: bundle.energy.energy_per_handover_j }),
      ...(bundle.energy.layer2_overrides !== undefined && { layer2_overrides: { ...bundle.energy.layer2_overrides } }),
    },
    ueConfig: {
      count: bundle.scenario.ueTopology.count,
      distribution: bundle.scenario.ueTopology.distribution,
      speed_kmh: bundle.ueConfig.speed_kmh,
      ...(bundle.models.ueConfig.independentHandover !== undefined && { independentHandover: bundle.models.ueConfig.independentHandover }),
    },
  };

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
