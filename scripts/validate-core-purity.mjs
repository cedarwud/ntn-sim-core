/**
 * VAL-ARCH-001: src/core/** must not import React, Three.js, or R3F.
 * VAL-ARCH-002: physical parameters and visual-only parameters are separated.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const coreDir = path.join(rootDir, 'src', 'core');

const FORBIDDEN_IMPORTS = [
  /from\s+['"]react['"]/,
  /from\s+['"]react-dom['"]/,
  /from\s+['"]three['"]/,
  /from\s+['"]@react-three\//,
  /from\s+['"]@\/viz\//,
  /from\s+['"]@\/app\//,
  /from\s+['"]\.\.\/\.\.\/viz\//,
  /from\s+['"]\.\.\/\.\.\/app\//,
];

function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkDir(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

const errors = [];

for (const filePath of walkDir(coreDir)) {
  const content = readFileSync(filePath, 'utf8');
  const relative = path.relative(rootDir, filePath);

  // .tsx in core is suspicious
  if (filePath.endsWith('.tsx')) {
    errors.push(`${relative}: .tsx file in src/core/ (JSX not allowed in core layer)`);
  }

  for (const pattern of FORBIDDEN_IMPORTS) {
    if (pattern.test(content)) {
      errors.push(`${relative}: forbidden import matching ${pattern}`);
    }
  }
}

if (errors.length) {
  console.error('VAL-ARCH-001 FAILED: core layer purity violations:');
  for (const e of errors) {
    console.error(`  - ${e}`);
  }
  process.exit(1);
}

console.log('validate-core-purity (VAL-ARCH-001): OK');
