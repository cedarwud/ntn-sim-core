import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

const governancePath = path.join(rootDir, 'agent-governance.md');
const agentsPath = path.join(rootDir, 'AGENTS.md');
const claudePath = path.join(rootDir, 'CLAUDE.md');
const geminiPath = path.join(rootDir, 'GEMINI.md');

const governance = readFileSync(governancePath, 'utf8');
const agents = readFileSync(agentsPath, 'utf8');
const claude = readFileSync(claudePath, 'utf8');
const gemini = readFileSync(geminiPath, 'utf8');

const versionMatch = governance.match(/\*\*Governance-Version:\*\*\s*`([^`]+)`/);
if (!versionMatch) {
  console.error('agent-governance.md missing Governance-Version');
  process.exit(1);
}

const version = versionMatch[1];

const files = [
  ['AGENTS.md', agents],
  ['CLAUDE.md', claude],
  ['GEMINI.md', gemini],
];

const requiredOpenSpecSkill = 'ntn-openspec-follow-on-kickoff';
const requiredWorkspaceSkillIndex = 'skills/README.md';

const forbiddenCanonicalSections = [
  '## 2. Authority Order',
  '## 3. Active Program Rule',
  '## 3. Downstream Promotion Rule',
  '## 4. Verification Rules',
  '## 5. Working Rules',
  '## 6. Architecture Expectations',
  '## 7. Validation Rules',
  '## 8. Documentation Sync Rules',
  '## 9. Provenance Rules',
  '## 10. Donor / External Project Rule',
];

let errors = [];

for (const [name, src] of files) {
  if (!src.includes(`**Governance-Version:** \`${version}\``)) {
    errors.push(`${name}: Governance-Version does not match agent-governance.md (${version})`);
  }
  if (!src.includes('agent-governance.md')) {
    errors.push(`${name}: does not reference agent-governance.md`);
  }
  if (!src.includes('thin wrapper')) {
    errors.push(`${name}: does not describe itself as a thin wrapper`);
  }
  if (!src.includes(requiredOpenSpecSkill)) {
    errors.push(`${name}: missing local OpenSpec follow-on skill reference (${requiredOpenSpecSkill})`);
  }
  if (!src.includes(requiredWorkspaceSkillIndex)) {
    errors.push(`${name}: missing workspace skill/reference index reference (${requiredWorkspaceSkillIndex})`);
  }
  for (const heading of forbiddenCanonicalSections) {
    if (src.includes(heading)) {
      errors.push(`${name}: reintroduces canonical section "${heading}" instead of delegating to agent-governance.md`);
    }
  }
}

if (errors.length) {
  console.error('Agent doc sync errors:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`validate-agent-doc-sync: OK (${version})`);
