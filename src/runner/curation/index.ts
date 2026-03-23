/**
 * Curation module — deterministic showcase window selection.
 *
 * Governance: SDD $10 (Benchmark vs Showcase Curation)
 */

export {
  rankPasses,
  DEFAULT_RANK_CRITERIA,
} from './pass-ranker';
export type { PassRankCriteria, RankedPass } from './pass-ranker';

export {
  selectBestWindow,
  createReplayManifestFromWindow,
} from './window-selector';
export type {
  WindowSelectionConfig,
  SelectedWindow,
} from './window-selector';
