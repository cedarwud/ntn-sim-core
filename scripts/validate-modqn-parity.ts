#!/usr/bin/env node

import { MODQN_REPRODUCTION_MANIFEST } from '../src/core/experiments/modqn-reproduction-manifest';
import {
  formatModqnAnchorParityBundleMarkdown,
  runModqnAnchorParityBundle,
} from '../src/core/experiments/modqn-targeted-parity';

const failures: string[] = [];

function pass(label: string, detail?: string) {
  console.log(`[PASS] ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, detail: string) {
  failures.push(`${label}: ${detail}`);
  console.error(`[FAIL] ${label} — ${detail}`);
}

function check(label: string, condition: boolean, detail: string) {
  if (condition) {
    pass(label, detail);
  } else {
    fail(label, detail);
  }
}

function hasText(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function main() {
  const bundle = runModqnAnchorParityBundle({
    manifest: MODQN_REPRODUCTION_MANIFEST,
    trainingEpisodeLimit: MODQN_REPRODUCTION_MANIFEST.sampling.trainEpisodesForSmoke,
    heldOutEpisodeLimit: MODQN_REPRODUCTION_MANIFEST.sampling.heldOutWindowCount,
  });
  const markdown = formatModqnAnchorParityBundleMarkdown(bundle);

  console.log('\n== VAL-MODQN-004A: current-anchor parity bundle ==');
  check('anchor paper fixed', bundle.anchor.paperId === 'PAP-2024-MORL-MULTIBEAM', bundle.anchor.paperId);
  check('anchor profile fixed', bundle.anchor.profileId === 'modqn-paper-baseline', bundle.anchor.profileId);
  check('anchor family fixed', bundle.anchor.familyId === 'FAM-MODQN-SYNTH', bundle.anchor.familyId);
  check('base result stays on shipped truth surface', bundle.baseResult.metadata.paperId === bundle.anchor.paperId, bundle.baseResult.metadata.paperId);
  check('all expected parity targets exist', bundle.targets.length === 5, String(bundle.targets.length));

  const targetById = new Map(bundle.targets.map((target) => [target.id, target]));
  const comparisonRowById = new Map(bundle.comparisonRows.map((row) => [row.targetId, row]));
  const figureByTargetId = new Map(bundle.figures.map((figure) => [figure.id.replace(/-figure$/, ''), figure]));
  check('anchor-envelope is range-faithful', targetById.get('anchor-envelope')?.parityLabel === 'range-faithful', targetById.get('anchor-envelope')?.parityLabel ?? 'missing');
  check('user-count sweep stays qualitative-only under current shipped truth', targetById.get('weighted-reward-user-count')?.parityLabel === 'qualitative-only', targetById.get('weighted-reward-user-count')?.parityLabel ?? 'missing');
  check('satellite-count sweep stays qualitative-only under current shipped truth', targetById.get('weighted-reward-satellite-count')?.parityLabel === 'qualitative-only', targetById.get('weighted-reward-satellite-count')?.parityLabel ?? 'missing');
  check('user-speed sweep stays qualitative-only under current proxy ceiling', targetById.get('weighted-reward-user-speed')?.parityLabel === 'qualitative-only', targetById.get('weighted-reward-user-speed')?.parityLabel ?? 'missing');
  check('comparator ranking stays qualitative-only', targetById.get('baseline-comparator-ranking')?.parityLabel === 'qualitative-only', targetById.get('baseline-comparator-ranking')?.parityLabel ?? 'missing');
  for (const target of bundle.targets) {
    check(`${target.id} comparison mode present`, hasText(target.comparisonMode), target.comparisonMode ?? 'missing');
    check(`${target.id} parity label present`, hasText(target.parityLabel), target.parityLabel);
    check(
      `${target.id} deviation notes present`,
      target.deviationNotes.length > 0 && target.deviationNotes.every((note) => hasText(note)),
      `${target.deviationNotes.length} note(s)`,
    );

    const comparisonRow = comparisonRowById.get(target.id);
    check(`${target.id} comparison row exists`, Boolean(comparisonRow), comparisonRow?.targetId ?? 'missing');
    check(
      `${target.id} comparison row mirrors comparison mode`,
      comparisonRow?.comparisonMode === target.comparisonMode,
      comparisonRow ? `${comparisonRow.comparisonMode} vs ${target.comparisonMode}` : 'missing',
    );
    check(
      `${target.id} comparison row mirrors parity label`,
      comparisonRow?.parityLabel === target.parityLabel,
      comparisonRow ? `${comparisonRow.parityLabel} vs ${target.parityLabel}` : 'missing',
    );
    check(
      `${target.id} comparison row carries deviation summary`,
      comparisonRow?.deviationSummary === target.deviationNotes.join(' '),
      comparisonRow?.deviationSummary ?? 'missing',
    );

    if (target.kind === 'scalar-reward-trend') {
      const figure = figureByTargetId.get(target.id);
      const projectedPoints = target.points.map((point) => `${point.axisValue}:${point.result.heldOutEvaluation.scalarReward.toFixed(6)}`).join('|');
      const exportedPoints = (figure?.series[0]?.points ?? []).map((point) => `${point.x}:${point.y.toFixed(6)}`).join('|');
      check(`${target.id} figure export exists`, Boolean(figure), figure?.id ?? 'missing');
      check(
        `${target.id} figure export mirrors target label`,
        figure?.parityLabel === target.parityLabel,
        figure ? `${figure.parityLabel} vs ${target.parityLabel}` : 'missing',
      );
      check(
        `${target.id} figure export projects existing sweep points`,
        exportedPoints === projectedPoints,
        exportedPoints || 'missing',
      );
      check(
        `${target.id} figure export stays packaging-only`,
        hasText(figure?.note)
          && figure!.note.toLowerCase().includes('shipped modqn truth')
          && figure!.note.toLowerCase().includes('digitized paper-curve replacement'),
        figure?.note ?? 'missing',
      );
    }
  }

  const disclosures = bundle.disclosureNotes.map((entry) => entry.toLowerCase());
  check('bundle disclosure preserves 2x2 proxy ceiling', disclosures.some((entry) => entry.includes('2x2 proxy') || entry.includes('2 x 2')), '2 x 2 proxy');
  check('bundle disclosure preserves short-window ceiling', disclosures.some((entry) => entry.includes('10 s')), '10 s window');
  check('bundle disclosure preserves single-visible-satellite ceiling', disclosures.some((entry) => entry.includes('one visible satellite')), 'one visible satellite');
  check('bundle disclosure preserves ue-0 ceiling', disclosures.some((entry) => entry.includes('ue-0')), 'ue-0 control scope');
  check('bundle disclosure preserves epsilon-decay ceiling', disclosures.some((entry) => entry.includes('epsilon decay')), 'epsilon decay');

  console.log('\n== VAL-MODQN-004B: paper-ready export helper ==');
  check('comparison rows generated', bundle.comparisonRows.length === bundle.targets.length, `${bundle.comparisonRows.length} rows`);
  check(
    'figure exports generated for every sweep target',
    bundle.figures.length === bundle.targets.filter((target) => target.kind === 'scalar-reward-trend').length,
    String(bundle.figures.length),
  );
  check('markdown export contains anchor ids', markdown.includes('PAP-2024-MORL-MULTIBEAM') && markdown.includes('modqn-paper-baseline'), 'anchor ids present');
  const expectedParityLabels = Array.from(new Set(bundle.targets.map((target) => target.parityLabel)));
  check(
    'markdown export contains current target parity labels',
    expectedParityLabels.every((label) => markdown.includes(label)),
    expectedParityLabels.join(', '),
  );
  check('markdown export carries comparison modes', markdown.includes('paper-parameter-envelope') && markdown.includes('held-out-scalar-reward-trend'), 'comparison modes present');
  check('markdown export carries deviation notes section', markdown.includes('Deviation notes:'), 'deviation notes present');
  check('claim ceiling stays explicit', bundle.claimCeiling.toLowerCase().includes('range-faithful') && bundle.claimCeiling.toLowerCase().includes('qualitative-only'), bundle.claimCeiling);

  console.log('');
  if (failures.length > 0) {
    console.error(`validate-modqn-parity: FAILED (${failures.length} issue(s))`);
    process.exit(1);
  }

  console.log('validate-modqn-parity: OK');
}

main();
