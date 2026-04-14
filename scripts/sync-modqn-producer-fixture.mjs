#!/usr/bin/env node

import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODE_CHECK = 'check';
const MODE_SYNC = 'sync';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const workspaceRoot = path.resolve(repoRoot, '..');

const producerFixtureDir = path.join(
  workspaceRoot,
  'modqn-paper-reproduction',
  'tests',
  'fixtures',
  'sample-bundle-v1',
);

const consumerFixtureDir = path.join(repoRoot, 'fixtures', 'sample-bundle-v1');

const supportFiles = [
  {
    relativePath: 'evaluation/sweeps/.gitkeep',
    content: '',
    requiredProducerDir: 'evaluation/sweeps',
  },
];

function toPosixRelative(relativePath) {
  return relativePath === '' ? '' : relativePath.split(path.sep).join(path.posix.sep);
}

function sortByDepthDescending(left, right) {
  const leftDepth = left.split('/').length;
  const rightDepth = right.split('/').length;
  if (leftDepth !== rightDepth) {
    return rightDepth - leftDepth;
  }
  return left.localeCompare(right);
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectory(targetPath) {
  if (await pathExists(targetPath)) {
    const info = await stat(targetPath);
    if (!info.isDirectory()) {
      await rm(targetPath, { force: true, recursive: true });
    }
  }
  await mkdir(targetPath, { recursive: true });
}

async function scanTree(rootDir) {
  const files = new Map();
  const dirs = new Set(['']);

  if (!(await pathExists(rootDir))) {
    return { files, dirs };
  }

  async function walk(relativeDir) {
    const absoluteDir = relativeDir === '' ? rootDir : path.join(rootDir, relativeDir);
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const relativePath = toPosixRelative(path.join(relativeDir, entry.name));
      const absolutePath = path.join(absoluteDir, entry.name);

      if (entry.isDirectory()) {
        dirs.add(relativePath);
        await walk(relativePath);
        continue;
      }

      if (entry.isFile()) {
        files.set(relativePath, absolutePath);
        continue;
      }

      throw new Error(`Unsupported fixture entry type: ${absolutePath}`);
    }
  }

  await walk('');
  return { files, dirs };
}

async function fileContentsDiffer(leftPath, rightPath) {
  const [leftBytes, rightBytes] = await Promise.all([
    readFile(leftPath),
    readFile(rightPath),
  ]);
  return !leftBytes.equals(rightBytes);
}

async function validateSupportFiles(producerTree, consumerTree) {
  const missingSupportFiles = [];

  for (const entry of supportFiles) {
    if (!producerTree.dirs.has(entry.requiredProducerDir)) {
      continue;
    }

    if (!consumerTree.files.has(entry.relativePath)) {
      missingSupportFiles.push(entry.relativePath);
    }
  }

  return { missingSupportFiles };
}

function buildAllowedSupportExtras(producerTree) {
  const allowedExtraFiles = new Set();
  const allowedExtraDirs = new Set(['']);

  for (const entry of supportFiles) {
    if (!producerTree.dirs.has(entry.requiredProducerDir)) {
      continue;
    }

    allowedExtraFiles.add(entry.relativePath);

    let cursor = path.posix.dirname(entry.relativePath);
    while (cursor !== '.' && cursor !== '') {
      allowedExtraDirs.add(cursor);
      cursor = path.posix.dirname(cursor);
    }
  }

  return { allowedExtraDirs, allowedExtraFiles };
}

async function buildDriftReport() {
  const producerTree = await scanTree(producerFixtureDir);
  const consumerTree = await scanTree(consumerFixtureDir);
  const { allowedExtraDirs, allowedExtraFiles } = buildAllowedSupportExtras(producerTree);

  const missingFiles = [];
  const missingDirectories = [];
  const changedFiles = [];
  const extraFiles = [];
  const extraDirectories = [];

  for (const relativePath of producerTree.files.keys()) {
    if (!consumerTree.files.has(relativePath)) {
      missingFiles.push(relativePath);
      continue;
    }

    if (
      await fileContentsDiffer(
        producerTree.files.get(relativePath),
        consumerTree.files.get(relativePath),
      )
    ) {
      changedFiles.push(relativePath);
    }
  }

  for (const relativePath of producerTree.dirs) {
    if (relativePath === '') {
      continue;
    }
    if (!consumerTree.dirs.has(relativePath)) {
      missingDirectories.push(relativePath);
    }
  }

  for (const relativePath of consumerTree.files.keys()) {
    if (!producerTree.files.has(relativePath) && !allowedExtraFiles.has(relativePath)) {
      extraFiles.push(relativePath);
    }
  }

  for (const relativePath of consumerTree.dirs) {
    if (relativePath === '') {
      continue;
    }
    if (!producerTree.dirs.has(relativePath) && !allowedExtraDirs.has(relativePath)) {
      extraDirectories.push(relativePath);
    }
  }

  const { missingSupportFiles } = await validateSupportFiles(producerTree, consumerTree);

  return {
    changedFiles: changedFiles.sort(),
    extraDirectories: extraDirectories.sort(sortByDepthDescending),
    extraFiles: extraFiles.sort(),
    missingDirectories: missingDirectories.sort(),
    missingFiles: missingFiles.sort(),
    missingSupportFiles: missingSupportFiles.sort(),
    producerTree,
  };
}

function hasDrift(report) {
  return (
    report.missingFiles.length > 0 ||
    report.missingDirectories.length > 0 ||
    report.changedFiles.length > 0 ||
    report.extraFiles.length > 0 ||
    report.extraDirectories.length > 0 ||
    report.missingSupportFiles.length > 0
  );
}

function printList(title, entries) {
  if (entries.length === 0) {
    return;
  }
  console.error(`${title}:`);
  for (const entry of entries) {
    console.error(`  - ${entry}`);
  }
}

function printDriftReport(report) {
  console.error('sync-modqn-producer-fixture: drift detected');
  console.error(`  producer: ${producerFixtureDir}`);
  console.error(`  consumer: ${consumerFixtureDir}`);
  printList('Missing consumer mirror files', report.missingFiles);
  printList('Missing consumer mirror directories', report.missingDirectories);
  printList('Changed consumer mirror files', report.changedFiles);
  printList('Unexpected consumer extra files', report.extraFiles);
  printList('Unexpected consumer extra directories', report.extraDirectories);
  printList('Missing consumer support files', report.missingSupportFiles);
}

async function syncFixture() {
  if (!(await pathExists(producerFixtureDir))) {
    throw new Error(`Producer fixture directory missing: ${producerFixtureDir}`);
  }

  const before = await buildDriftReport();
  if (!hasDrift(before)) {
    console.log('sync-modqn-producer-fixture: already in sync');
    console.log(`  producer: ${producerFixtureDir}`);
    console.log(`  consumer: ${consumerFixtureDir}`);
    return;
  }

  await ensureDirectory(consumerFixtureDir);

  for (const relativePath of before.extraFiles) {
    await rm(path.join(consumerFixtureDir, relativePath), { force: true });
  }

  for (const relativePath of before.extraDirectories) {
    await rm(path.join(consumerFixtureDir, relativePath), {
      force: true,
      recursive: true,
    });
  }

  const sourceDirectories = [...before.producerTree.dirs].filter(Boolean).sort();
  for (const relativePath of sourceDirectories) {
    await ensureDirectory(path.join(consumerFixtureDir, relativePath));
  }

  const sourceFiles = [...before.producerTree.files.keys()].sort();
  for (const relativePath of sourceFiles) {
    const sourcePath = before.producerTree.files.get(relativePath);
    const targetPath = path.join(consumerFixtureDir, relativePath);
    await ensureDirectory(path.dirname(targetPath));
    await copyFile(sourcePath, targetPath);
  }

  for (const entry of supportFiles) {
    if (!before.producerTree.dirs.has(entry.requiredProducerDir)) {
      continue;
    }

    const targetPath = path.join(consumerFixtureDir, entry.relativePath);
    await ensureDirectory(path.dirname(targetPath));
    await writeFile(targetPath, entry.content, 'utf8');
  }

  const after = await buildDriftReport();
  if (hasDrift(after)) {
    printDriftReport(after);
    throw new Error('Fixture sync completed but drift remains');
  }

  console.log('sync-modqn-producer-fixture: synced consumer mirror from producer');
  console.log(`  producer: ${producerFixtureDir}`);
  console.log(`  consumer: ${consumerFixtureDir}`);
}

function printUsage() {
  console.log('Usage: node scripts/sync-modqn-producer-fixture.mjs <check|sync>');
}

async function main() {
  const mode = process.argv[2];

  if (mode !== MODE_CHECK && mode !== MODE_SYNC) {
    printUsage();
    process.exit(1);
  }

  if (!(await pathExists(producerFixtureDir))) {
    throw new Error(`Producer fixture directory missing: ${producerFixtureDir}`);
  }

  if (mode === MODE_SYNC) {
    await syncFixture();
    return;
  }

  const report = await buildDriftReport();
  if (hasDrift(report)) {
    printDriftReport(report);
    process.exit(1);
  }

  console.log('sync-modqn-producer-fixture: consumer fixture mirror is up to date');
  console.log(`  producer: ${producerFixtureDir}`);
  console.log(`  consumer: ${consumerFixtureDir}`);
}

main().catch((error) => {
  console.error('sync-modqn-producer-fixture: FAILED');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
