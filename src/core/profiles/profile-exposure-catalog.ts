import type { SpecMode } from '@/core/common/types';

import { PROFILE_AUTHORING_ENTRIES } from './profile-authoring-registry';

export interface ProfileExposureCatalogEntry {
  id: string;
  family: string;
  tier: Exclude<SpecMode, 'Internal-only'>;
  label: string;
}

export function getProfileExposureCatalog(): ProfileExposureCatalogEntry[] {
  const tierOrder: Record<ProfileExposureCatalogEntry['tier'], number> = {
    Realistic: 0,
    Advanced: 1,
    Sensitivity: 2,
  };

  return PROFILE_AUTHORING_ENTRIES
    .map((entry) => ({
      id: entry.id,
      family: String(entry.bundle.family),
      tier: entry.bundle.exposurePreset.tier,
      label: entry.bundle.exposurePreset.label,
    }))
    .filter((entry): entry is ProfileExposureCatalogEntry => entry.tier !== 'Internal-only')
    .sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
}
