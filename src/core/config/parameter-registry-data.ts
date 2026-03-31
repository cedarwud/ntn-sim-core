import type { ParameterEntry } from './parameter-registry-schema';

import { FOUNDATION_PARAMETER_REGISTRY } from './parameter-registry-foundation-data';
import { BEAM_AND_CHANNEL_PARAMETER_REGISTRY } from './parameter-registry-beam-channel-data';
import { HANDOVER_PARAMETER_REGISTRY } from './parameter-registry-handover-data';
import { ENERGY_AND_UE_PARAMETER_REGISTRY } from './parameter-registry-energy-ue-data';

/**
 * Phase 5 Core Structural Split: Parameter Registry Data.
 * Ownership: Literal parameter dataset barrel.
 */

export const PARAMETER_REGISTRY: ParameterEntry[] = [
  ...FOUNDATION_PARAMETER_REGISTRY,
  ...BEAM_AND_CHANNEL_PARAMETER_REGISTRY,
  ...HANDOVER_PARAMETER_REGISTRY,
  ...ENERGY_AND_UE_PARAMETER_REGISTRY,
];
