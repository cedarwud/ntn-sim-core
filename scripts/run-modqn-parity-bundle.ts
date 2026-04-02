#!/usr/bin/env node

import { MODQN_REPRODUCTION_MANIFEST } from '../src/core/experiments/modqn-reproduction-manifest';
import {
  formatModqnAnchorParityBundleMarkdown,
  runModqnAnchorParityBundle,
} from '../src/core/experiments/modqn-targeted-parity';

const bundle = runModqnAnchorParityBundle({
  manifest: MODQN_REPRODUCTION_MANIFEST,
  trainingEpisodeLimit: MODQN_REPRODUCTION_MANIFEST.sampling.trainEpisodesForSmoke,
  heldOutEpisodeLimit: MODQN_REPRODUCTION_MANIFEST.sampling.heldOutWindowCount,
});

console.log(formatModqnAnchorParityBundleMarkdown(bundle));
