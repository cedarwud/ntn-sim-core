/**
 * Phase 03A Consumer Adapter — Bundle loader + reader interface.
 *
 * The library itself is fully I/O-agnostic so the adapter can be used from
 * the browser (fetch reader), Node CLI / tests (fs reader), or an in-memory
 * mock. Concrete reader implementations live next to the consumer:
 *   - browser/fetch reader → `src/app/hooks/...` (added by Slice C)
 *   - node fs reader       → `scripts/validate-modqn-bundle-adapter.ts`
 *
 * Governance:
 *   - Consumer SDD: sdd/modqn-bundle-replay-consumer-sdd.md
 *   - Rule: this file is the ONLY place that orchestrates bundle parsing;
 *     downstream code should consume the returned `ModqnReplayBundle` rather
 *     than re-parse the raw files.
 */

import {
  REQUIRED_BUNDLE_DIRECTORIES,
  REQUIRED_BUNDLE_FILES,
} from './constants';
import {
  buildReplayFrames,
  indexFramesBySlot,
} from './replay-frame-adapter';
import { ModqnBundleSchemaError, assertManifestShape } from './schema-guard';
import { parseTimelineJsonl } from './timeline-parser';
import type {
  ModqnReplayBundle,
  ModqnTrainingEpisodeMetricRow,
  ModqnTrainingLossCurveRow,
} from './types';

// ---------------------------------------------------------------------------
// Reader interface
// ---------------------------------------------------------------------------

export interface ModqnBundleFileReader {
  /** Read a bundle-relative text file. Throw if it does not exist. */
  readText(relativePath: string): Promise<string>;
  /** Report bundle-relative file existence without reading. */
  exists(relativePath: string): Promise<boolean>;
  /**
   * Report bundle-relative directory existence. Distinct from `exists` so
   * that the loader can enforce the producer's directory-shaped contract
   * surfaces (for example `evaluation/sweeps/`) without coercing them into
   * fake files. The memory reader treats any entry under `${path}/` as a
   * directory hit; a node reader should use `fs.stat` + `isDirectory()`.
   */
  existsDirectory(relativePath: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// In-memory reader — used by tests and inline fixtures
// ---------------------------------------------------------------------------

/**
 * Minimal reader backed by an in-memory map. Useful for tests and for
 * fetch-based consumers that have already pulled payloads into memory.
 *
 * Directory presence is modelled by the convention "any key starting with
 * `${relativePath}/` implies the directory exists". Callers that need to
 * advertise an empty directory can seed a sentinel entry whose key ends
 * with a slash (for example `evaluation/sweeps/`) — such entries are NOT
 * readable as text, they only signal directory presence.
 */
export function createMemoryFileReader(
  files: Record<string, string>,
): ModqnBundleFileReader {
  const directoryMarkers = new Set<string>();
  for (const key of Object.keys(files)) {
    if (key.endsWith('/')) {
      directoryMarkers.add(key.slice(0, -1));
      continue;
    }
    const segments = key.split('/');
    for (let i = 1; i < segments.length; i += 1) {
      directoryMarkers.add(segments.slice(0, i).join('/'));
    }
  }

  return {
    async readText(relativePath: string) {
      if (!(relativePath in files) || relativePath.endsWith('/')) {
        throw new Error(`Bundle memory reader: missing ${relativePath}`);
      }
      return files[relativePath];
    },
    async exists(relativePath: string) {
      if (relativePath.endsWith('/')) return false;
      return relativePath in files;
    },
    async existsDirectory(relativePath: string) {
      const normalized = relativePath.replace(/\/$/, '');
      return directoryMarkers.has(normalized);
    },
  };
}

// ---------------------------------------------------------------------------
// Core loader
// ---------------------------------------------------------------------------

async function requireText(
  reader: ModqnBundleFileReader,
  relativePath: string,
): Promise<string> {
  if (!(await reader.exists(relativePath))) {
    throw new ModqnBundleSchemaError(
      'BUNDLE_MISSING_FILE',
      `Bundle is missing required file: ${relativePath}`,
      { relativePath },
    );
  }
  return reader.readText(relativePath);
}

function parseJsonObject(
  text: string,
  relativePath: string,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new ModqnBundleSchemaError(
      'BUNDLE_JSON_PARSE',
      `${relativePath}: JSON parse failed: ${(err as Error).message}`,
      { relativePath },
    );
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ModqnBundleSchemaError(
      'BUNDLE_JSON_SHAPE',
      `${relativePath}: root must be a JSON object.`,
      { relativePath },
    );
  }
  return parsed as Record<string, unknown>;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

function parseCsvTable(
  text: string,
  relativePath: string,
): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line, lineIndex) => {
    const values = parseCsvLine(line);
    if (values.length !== header.length) {
      throw new ModqnBundleSchemaError(
        'BUNDLE_CSV_SHAPE',
        `${relativePath}: row ${lineIndex + 2} has ${values.length} columns; expected ${header.length}.`,
        { relativePath, line: lineIndex + 2 },
      );
    }
    return Object.fromEntries(header.map((key, index) => [key, values[index]]));
  });
}

function parseOptionalNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseLossArray(
  raw: string | undefined,
  relativePath: string,
  rowNumber: number,
): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'number')) {
      throw new Error('losses must be a number array');
    }
    return parsed;
  } catch (error) {
    throw new ModqnBundleSchemaError(
      'BUNDLE_CSV_PARSE',
      `${relativePath}: row ${rowNumber} has invalid losses payload: ${(error as Error).message}`,
      { relativePath, rowNumber },
    );
  }
}

function parseTrainingEpisodeMetrics(
  text: string,
  relativePath: string,
): ModqnTrainingEpisodeMetricRow[] {
  const rows = parseCsvTable(text, relativePath);
  return rows.map((row, index) => ({
    episode: parseOptionalNumber(row.episode) ?? 0,
    epsilon: parseOptionalNumber(row.epsilon),
    r1Mean: parseOptionalNumber(row.r1_mean),
    r2Mean: parseOptionalNumber(row.r2_mean),
    r3Mean: parseOptionalNumber(row.r3_mean),
    scalarReward: parseOptionalNumber(row.scalar_reward),
    totalHandovers: parseOptionalNumber(row.total_handovers),
    replaySize: parseOptionalNumber(row.replay_size),
    losses: parseLossArray(row.losses, relativePath, index + 2),
  }));
}

function parseTrainingLossCurves(
  text: string,
  relativePath: string,
): ModqnTrainingLossCurveRow[] {
  const rows = parseCsvTable(text, relativePath);
  return rows.map((row) => ({
    episode: parseOptionalNumber(row.episode) ?? 0,
    lossQ1: parseOptionalNumber(row.loss_q1),
    lossQ2: parseOptionalNumber(row.loss_q2),
    lossQ3: parseOptionalNumber(row.loss_q3),
  }));
}

/**
 * Load and validate a replay bundle through a reader.
 *
 * Throws `ModqnBundleSchemaError` on any contract violation; callers should
 * surface the error to the user rather than silently falling back to native
 * simulator truth.
 */
export async function loadModqnReplayBundle(
  reader: ModqnBundleFileReader,
): Promise<ModqnReplayBundle> {
  // 1. Presence check for all required files + directories.
  const missing: string[] = [];
  for (const relative of REQUIRED_BUNDLE_FILES) {
    if (!(await reader.exists(relative))) {
      missing.push(relative);
    }
  }
  for (const relative of REQUIRED_BUNDLE_DIRECTORIES) {
    if (!(await reader.existsDirectory(relative))) {
      missing.push(`${relative}/`);
    }
  }
  if (missing.length > 0) {
    throw new ModqnBundleSchemaError(
      'BUNDLE_INCOMPLETE',
      `Bundle is missing required files: ${missing.join(', ')}`,
      { missing },
    );
  }

  // 2. Manifest + schema guard.
  const manifestText = await requireText(reader, 'manifest.json');
  const manifest = assertManifestShape(parseJsonObject(manifestText, 'manifest.json'));

  // 3. Config / assumptions / provenance / evaluation summary.
  const configResolved = parseJsonObject(
    await requireText(reader, 'config-resolved.json'),
    'config-resolved.json',
  );
  const assumptions = parseJsonObject(
    await requireText(reader, 'assumptions.json'),
    'assumptions.json',
  );
  const provenanceMap = parseJsonObject(
    await requireText(reader, 'provenance-map.json'),
    'provenance-map.json',
  );
  const evaluationSummary = parseJsonObject(
    await requireText(reader, 'evaluation/summary.json'),
    'evaluation/summary.json',
  );
  const trainingEpisodeMetrics = parseTrainingEpisodeMetrics(
    await requireText(reader, 'training/episode_metrics.csv'),
    'training/episode_metrics.csv',
  );
  const trainingLossCurves = parseTrainingLossCurves(
    await requireText(reader, 'training/loss_curves.csv'),
    'training/loss_curves.csv',
  );

  // 4. Timeline.
  const timelineText = await requireText(reader, 'timeline/step-trace.jsonl');
  const rows = parseTimelineJsonl(timelineText);
  const frames = buildReplayFrames(rows);
  const frameBySlotIndex = indexFramesBySlot(frames);

  const userIds = new Set<string>();
  for (const frame of frames) {
    for (const record of frame.users) {
      userIds.add(record.userId);
    }
  }

  return {
    manifest,
    configResolved,
    assumptions,
    provenanceMap,
    evaluationSummary,
    trainingEpisodeMetrics,
    trainingLossCurves,
    frames,
    frameBySlotIndex,
    slotCount: frames.length,
    userCount: userIds.size,
    rowCount: rows.length,
  };
}
