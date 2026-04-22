#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MODQN_REPRODUCTION_MANIFEST } from '../src/core/experiments/modqn-reproduction-manifest';
import { runModqnBaselineReproduction } from '../src/core/experiments/modqn-reproduction-runner';

interface CliOptions {
  readonly outputDir: string;
  readonly episodes: number;
  readonly heldOutWindows: number;
}

function parsePositiveInt(flag: string, raw: string | undefined): number {
  if (!raw) {
    throw new Error(`${flag} requires a numeric value`);
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} must be a positive integer, got ${raw}`);
  }
  return value;
}

function parseArgs(argv: readonly string[]): CliOptions {
  const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
  let outputDir = path.join(rootDir, 'artifacts', 'modqn-m2-checkpoint-smoke');
  let episodes = MODQN_REPRODUCTION_MANIFEST.sampling.trainEpisodesForSmoke;
  let heldOutWindows = 1;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--output-dir') {
      outputDir = path.resolve(rootDir, argv[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (arg === '--episodes') {
      episodes = parsePositiveInt(arg, argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--held-out-windows') {
      heldOutWindows = parsePositiveInt(arg, argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { outputDir, episodes, heldOutWindows };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = runModqnBaselineReproduction({
    trainingEpisodeLimit: options.episodes,
    heldOutEpisodeLimit: options.heldOutWindows,
    captureTrainerCheckpoint: true,
  });

  if (!result.trainerCheckpoint) {
    throw new Error('Trainer checkpoint capture was requested but no checkpoint was returned.');
  }

  await mkdir(options.outputDir, { recursive: true });

  const resultPath = path.join(options.outputDir, 'reproduction-result.json');
  const checkpointPath = path.join(options.outputDir, 'trainer-checkpoint.json');
  const summaryPath = path.join(options.outputDir, 'export-summary.json');

  const resultPayload = {
    ...result,
    trainerCheckpoint: undefined,
  };
  const summaryPayload = {
    experimentId: result.experimentId,
    trainingEpisodes: result.trainingSummary.totalEpisodes,
    heldOutWindows: result.heldOutEvaluation.windows.length,
    wallClockMs: result.wallClockMs,
    outputFiles: {
      result: path.basename(resultPath),
      checkpoint: path.basename(checkpointPath),
    },
  };

  await writeFile(resultPath, `${JSON.stringify(resultPayload, null, 2)}\n`, 'utf8');
  await writeFile(checkpointPath, `${JSON.stringify(result.trainerCheckpoint, null, 2)}\n`, 'utf8');
  await writeFile(summaryPath, `${JSON.stringify(summaryPayload, null, 2)}\n`, 'utf8');

  console.log(`Wrote reproduction result to ${resultPath}`);
  console.log(`Wrote trainer checkpoint to ${checkpointPath}`);
  console.log(`Wrote export summary to ${summaryPath}`);
}

main().catch((error) => {
  console.error('export-modqn-m2-checkpoint: FAILED');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
