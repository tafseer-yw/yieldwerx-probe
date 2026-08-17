import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
// Shared with the generator on purpose: if the two disagreed on how a
// front-matter line is read, drift between a skill and its shim would be
// invisible to exactly the check meant to catch it.
import { readFrontmatterField as readSingleLineField } from './generate-commands.mjs';

const root = process.cwd();
const pluginRoot = path.join(root, 'plugins', 'yieldwerx-probe');
const expectedSkills = [
  'api-recon',
  'ask-yieldwerx',
  'audit-cases',
  'audit-scripts',
  'bypass-gate',
  'bug-report',
  'change-impact',
  'execute-cases',
  'flake-triage',
  'forge-api-tests',
  'forge-performance-tests',
  'forge-cases',
  'forge-oracle',
  'forge-scripts',
  'gate-design',
  'gate-merge',
  'gate-ops',
  'green-run',
  'log-exploratory',
  'owner-bypass',
  'probe-implementation',
  'probe-spec',
  'sync-cases',
  'testops-promote',
  'ui-recon',
  'update-yieldwerx-knowledge',
  'update-cases',
  // --- Development track (2.10.0) ------------------------------------------
  'build-feature',
  'fix-defect',
  'review-code',
  'revise-feature',
  'scaffold-app',
  'seed-testability',
  'ship-change',
];
const expectedAgents = [
  'e2e-scripter.md',
  'flake-hunter.md',
  'implementation-prober.md',
  'plotly-specialist.md',
  'script-auditor.md',
  'source-digester.md',
  'test-case-auditor.md',
  'test-case-designer.md',
  'testops-engineer.md',
  'ui-recon-agent.md',
  // --- Development track (2.10.0) ------------------------------------------
  'build-verifier.md',
  'code-reviewer.md',
  'requirement-clarifier.md',
  'testability-scout.md',
];
/**
 * Skills and agents on the development track. They carry the extra frontmatter
 * the QA track does not (yet) declare — `track: dev` plus a `graph:` block whose
 * edges are validated below, so a rename cannot leave a dangling reference.
 */
const devSkills = [
  'build-feature',
  'fix-defect',
  'review-code',
  'revise-feature',
  'scaffold-app',
  'seed-testability',
  'ship-change',
];
const devAgents = [
  'build-verifier.md',
  'code-reviewer.md',
  'requirement-clarifier.md',
  'testability-scout.md',
];
const graphNodePrefixes = [
  'skill',
  'agent',
  'artifact',
  'doc',
  'code',
  'contract',
  'profile',
  'input',
  'repo',
];

const errors = [];
const consumerContractMarker = '${CLAUDE_PLUGIN_ROOT}/references/configuration.md';

const hostedPluginBin = path.join(pluginRoot, 'bin');
if (fs.existsSync(hostedPluginBin) && fs.readdirSync(hostedPluginBin).length > 0) {
  errors.push(
    `hosted plugin must not contain a top-level bin/ directory; Claude Desktop rejects hidden executable entry points`,
  );
}

function readJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    errors.push(`${relativePath}: invalid or unreadable JSON (${error.message})`);
    return {};
  }
}

function requireContent(relativePath, markers) {
  const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
  for (const marker of markers) {
    if (!content.includes(marker)) {
      errors.push(`${relativePath}: missing required contract '${marker}'`);
    }
  }
}

/**
 * Assert that a file does NOT contain a marker.
 *
 * requireContent pins behaviour in place; this pins it OUT. Needed because a
 * shape proven wrong against a live API is otherwise indistinguishable from a
 * shape nobody has tried yet, and "restoring" it looks like a safe revert.
 * Each entry is [marker, why] so the failure explains itself.
 */
function forbidContent(relativePath, markers) {
  const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
  for (const [marker, why] of markers) {
    if (content.includes(marker)) {
      errors.push(`${relativePath}: must NOT contain '${marker}' — ${why}`);
    }
  }
}

function checkFrontmatter(absolutePath, expectedName) {
  const relativePath = path.relative(root, absolutePath).replaceAll('\\', '/');
  const content = fs.readFileSync(absolutePath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    errors.push(`${relativePath}: missing YAML frontmatter`);
    return;
  }
  const name = match[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = match[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  if (!name) errors.push(`${relativePath}: missing name`);
  if (!description) errors.push(`${relativePath}: missing description`);
  if (expectedName && name !== expectedName) {
    errors.push(`${relativePath}: name '${name}' does not match '${expectedName}'`);
  }
  if (/[A-Z_ ]/.test(expectedName ?? '')) {
    errors.push(`${relativePath}: expected name is not lowercase hyphen-case`);
  }
  if (!content.includes(consumerContractMarker) && !content.includes('**Portability contract:**')) {
    errors.push(`${relativePath}: missing the portable consumer contract`);
  }
  if (relativePath.endsWith('/SKILL.md')) {
    if (!/^user-invocable:\s*true$/m.test(match[1])) {
      errors.push(`${relativePath}: must be visible in the slash-command menu`);
    }
    for (const heading of ['Why', 'What', 'When', 'Where', 'How']) {
      if (!new RegExp(`^## ${heading}$`, 'm').test(content)) {
        errors.push(`${relativePath}: missing required '## ${heading}' section`);
      }
    }
  }
}

/**
 * Validate the development track's extra frontmatter contract.
 *
 * Dev skills and agents declare their composition as typed edges so the track
 * is navigable without reading every file. The edges are only worth declaring
 * if they cannot rot, so this asserts: the `track: dev` marker, a well-formed
 * `graph:` block using known relations, node ids carrying a known kind prefix,
 * and — the part that actually catches mistakes — that every `skill:` and
 * `agent:` node names something this repository ships. A rename that leaves a
 * dangling edge fails here rather than in a session six weeks later.
 */
const graphRelations = new Set([
  'consumes',
  'produces',
  'next',
  'chains',
  'delegates',
  'used_by',
  'reads',
  'scope',
]);

function checkDevTrackFrontmatter(absolutePath, knownSkills, knownAgents) {
  const relativePath = path.relative(root, absolutePath).replaceAll('\\', '/');
  const content = fs.readFileSync(absolutePath, 'utf8');
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1];
  if (!frontmatter) return; // already reported by checkFrontmatter

  if (!/^track:\s*dev$/m.test(frontmatter)) {
    errors.push(`${relativePath}: development-track file must declare 'track: dev'`);
  }
  if (!/^safety:\s*(read-only|writes-local|writes-code)$/m.test(frontmatter)) {
    errors.push(`${relativePath}: must declare a known 'safety:' level`);
  }

  const graphStart = frontmatter.match(/^graph:\s*$/m);
  if (!graphStart) {
    errors.push(`${relativePath}: development-track file must declare a 'graph:' block`);
    return;
  }
  const lines = frontmatter.slice(graphStart.index).split(/\r?\n/).slice(1);
  let declaredEdges = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (!line.startsWith('  ') || line.trim() === '') break;
    let entry = line.match(/^ {2}(\w+):\s*\[(.*)]\s*$/);
    const wrappedRelation = line.match(/^ {2}(\w+):\s*$/);
    if (!entry && wrappedRelation) {
      const wrappedLines = [];
      while (lineIndex + 1 < lines.length && lines[lineIndex + 1].startsWith('    ')) {
        lineIndex += 1;
        wrappedLines.push(lines[lineIndex].trim());
        if (lines[lineIndex].trimEnd().endsWith(']')) break;
      }
      const wrappedArray = wrappedLines.join(' ').match(/^\[(.*)]$/);
      if (wrappedArray) entry = [line, wrappedRelation[1], wrappedArray[1]];
    }
    if (!entry) {
      errors.push(`${relativePath}: malformed graph entry '${line.trim()}'`);
      continue;
    }
    const [, relation, rawNodes] = entry;
    if (!graphRelations.has(relation)) {
      errors.push(`${relativePath}: unknown graph relation '${relation}'`);
      continue;
    }
    for (const node of rawNodes
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)) {
      declaredEdges += 1;
      const kind = node.split(':')[0];
      const target = node.slice(kind.length + 1).replace(/\?$/, '');
      if (!graphNodePrefixes.includes(kind)) {
        errors.push(`${relativePath}: graph node '${node}' has an unknown kind prefix`);
        continue;
      }
      if (kind === 'skill' && target !== '*' && !knownSkills.includes(target)) {
        errors.push(`${relativePath}: graph edge points at unknown skill '${target}'`);
      }
      if (kind === 'agent' && target !== '*' && !knownAgents.includes(target)) {
        errors.push(`${relativePath}: graph edge points at unknown agent '${target}'`);
      }
    }
  }
  if (declaredEdges === 0) {
    errors.push(`${relativePath}: 'graph:' block declares no edges`);
  }
}

const marketplace = readJson('.claude-plugin/marketplace.json');
if (marketplace.name !== 'yieldwerx') {
  errors.push(`marketplace name must be 'yieldwerx'`);
}
if (marketplace.owner?.name !== 'Tafseer Haider') {
  errors.push(`marketplace owner must be Tafseer Haider`);
}
if (!marketplace.allowCrossMarketplaceDependenciesOn?.includes('yieldwerx-company')) {
  errors.push(`marketplace must allow the yieldwerx-company dependency`);
}
if (marketplace.renames?.['yieldwerx-probe'] !== 'yw') {
  errors.push(`marketplace must migrate 'yieldwerx-probe' to 'yw'`);
}
const marketplacePlugin = marketplace.plugins?.find((plugin) => plugin.name === 'yw');
if (marketplacePlugin?.source !== './plugins/yieldwerx-probe') {
  errors.push(`marketplace must reference ./plugins/yieldwerx-probe`);
}
if (marketplacePlugin?.displayName !== 'yieldWerx PROBE') {
  errors.push(`marketplace plugin displayName must be 'yieldWerx PROBE'`);
}

const manifest = readJson('plugins/yieldwerx-probe/.claude-plugin/plugin.json');
if (manifest.name !== 'yw') {
  errors.push(`plugin manifest name must be 'yw'`);
}
if (manifest.displayName !== 'yieldWerx PROBE') {
  errors.push(`plugin displayName must be 'yieldWerx PROBE'`);
}
const knowledgeDependency = manifest.dependencies?.find(
  (dependency) =>
    dependency?.name === 'yieldwerx-knowledgebase' &&
    dependency?.marketplace === 'yieldwerx-company',
);
if (!knowledgeDependency) {
  errors.push(`plugin manifest must depend on yieldwerx-knowledgebase@yieldwerx-company`);
}
if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? '')) {
  errors.push(`plugin manifest version must be semantic major.minor.patch`);
}
const packageManifest = readJson('package.json');
if (packageManifest.version !== manifest.version) {
  errors.push(`package.json and plugin.json versions must match`);
}
if (packageManifest.name !== '@yieldwerx/probe-cli') {
  errors.push(`package name must be '@yieldwerx/probe-cli'`);
}
if (packageManifest.bin?.probe !== 'bin/probe.mjs') {
  errors.push(`package must expose the portable 'probe' CLI`);
}
if (packageManifest.engines?.node !== '>=22.18') {
  errors.push(`package Node.js engine must be '>=22.18'`);
}
if (
  packageManifest.author?.name !== 'Tafseer Haider' ||
  packageManifest.author?.email !== 'tafseer.haider@yieldwerx.com'
) {
  errors.push(`package author must be Tafseer Haider <tafseer.haider@yieldwerx.com>`);
}
if (manifest.author?.name !== 'Tafseer Haider') {
  errors.push(`plugin author must be Tafseer Haider`);
}

const aioWhoamiPath = 'plugins/yieldwerx-probe/adapters/aio/scripts/aio-whoami.ts';
const aioWhoami = fs.readFileSync(path.join(root, aioWhoamiPath), 'utf8');
if (!aioWhoami.includes('token: loaded from environment')) {
  errors.push(`${aioWhoamiPath}: must confirm token loading without printing token characters`);
}
if (/token\.slice\s*\(/.test(aioWhoami)) {
  errors.push(`${aioWhoamiPath}: must not print any part of the AIO API token`);
}

const skillsRoot = path.join(pluginRoot, 'skills');
const actualSkills = fs
  .readdirSync(skillsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
if (actualSkills.join('|') !== [...expectedSkills].sort().join('|')) {
  errors.push(
    `skill inventory mismatch; expected ${expectedSkills.length}, found ${actualSkills.length}`,
  );
}
const knownAgentNames = fs
  .readdirSync(path.join(pluginRoot, 'agents'))
  .filter((entry) => entry.endsWith('.md'))
  .map((entry) => entry.replace(/\.md$/, ''));

for (const skill of actualSkills) {
  const skillFile = path.join(skillsRoot, skill, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    errors.push(`skills/${skill}: missing SKILL.md`);
  } else {
    checkFrontmatter(skillFile, skill);
    if (devSkills.includes(skill)) {
      checkDevTrackFrontmatter(skillFile, actualSkills, knownAgentNames);
    }
  }
}

/**
 * Every public skill must also ship a `commands/<skill>.md` dispatch shim.
 *
 * Claude Code resolves `skills/` into the `/` menu, but Claude Desktop — and
 * Claude Code under some marketplace/config layouts — builds the menu from
 * `commands/` alone. Without the shims the skills still load for model
 * invocation and appear in the Skills panel, while `/yw:probe-spec` answers
 * `Unknown command`, which is exactly how 2.12.0 shipped.
 *
 * A shim is dispatch only. It repeats the skill's `description` and
 * `argument-hint` so autocomplete is identical, then points at the SKILL.md and
 * stops. Because it carries no steps of its own, it does not matter which of the
 * two a host resolves first — so this asserts the shim stays a shim: same
 * description, same argument-hint, no duplicated process. Regenerate with
 * `npm run commands`.
 */
const commandsRoot = path.join(pluginRoot, 'commands');
if (!fs.existsSync(commandsRoot)) {
  errors.push(
    `plugins/yieldwerx-probe/commands/: missing; Claude Desktop builds its slash-command menu from this directory, so every skill needs a shim (npm run commands)`,
  );
} else {
  const actualCommands = fs
    .readdirSync(commandsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name.replace(/\.md$/, ''))
    .sort();
  if (actualCommands.join('|') !== actualSkills.join('|')) {
    const missing = actualSkills.filter((name) => !actualCommands.includes(name));
    const extra = actualCommands.filter((name) => !actualSkills.includes(name));
    errors.push(
      `commands/ must contain exactly one shim per skill (npm run commands)${
        missing.length ? `; missing: ${missing.join(', ')}` : ''
      }${extra.length ? `; orphaned: ${extra.join(', ')}` : ''}`,
    );
  }
  for (const command of actualCommands) {
    const commandPath = `plugins/yieldwerx-probe/commands/${command}.md`;
    const content = fs.readFileSync(path.join(commandsRoot, `${command}.md`), 'utf8');
    const skillPath = path.join(skillsRoot, command, 'SKILL.md');
    if (!content.includes(`\${CLAUDE_PLUGIN_ROOT}/skills/${command}/SKILL.md`)) {
      errors.push(`${commandPath}: must delegate to its own skill's SKILL.md`);
    }
    if (!content.includes('$ARGUMENTS')) {
      errors.push(`${commandPath}: must forward $ARGUMENTS to the skill`);
    }
    if (/^## (Why|What|When|Where|How)$/m.test(content)) {
      errors.push(
        `${commandPath}: must not restate the skill's process; a shim delegates and adds nothing`,
      );
    }
    if (content.length > 1200) {
      errors.push(
        `${commandPath}: shim is ${content.length} chars; dispatch only, keep it under 1200`,
      );
    }
    if (fs.existsSync(skillPath)) {
      const skillSource = fs.readFileSync(skillPath, 'utf8');
      for (const field of ['description', 'argument-hint']) {
        const fromSkill = readSingleLineField(skillSource, field);
        const fromCommand = readSingleLineField(content, field);
        if (fromSkill !== fromCommand) {
          errors.push(
            `${commandPath}: ${field} drifted from skills/${command}/SKILL.md (npm run commands)`,
          );
        }
      }
    }
  }
}

requireContent('plugins/yieldwerx-probe/skills/probe-spec/SKILL.md', [
  '**Summary:** Verify that ...',
  'Both Workflow and Simple',
  'Rule ACs use a fenced `gherkin` block',
  'Every `Then`/`And` result uses `must` or',
  '--migrate-format',
  '--reconcile',
  'references/existing-analysis-modes.md',
  'references/ledger-template.md',
  'sole source of truth for requirements',
  'Reference context only — not a requirement',
  'Do not put a knowledgebase',
]);
requireContent('plugins/yieldwerx-probe/references/process/PROBE-PROCESS.md', [
  'both formats use the same readable shape',
  '**Summary:** Verify that ...',
  '`Then`/`And` result uses `must` or `must not`',
  '### P16 — Existing spec analysis changes are explicit and traceable',
  '10-spec/spec-reconciliation.md',
  'routed to `/update-cases`',
  '### P14 — The PRD owns requirements; knowledge provides context',
  'the sole requirement source of',
  'truth. Every `AC`, `AMB`, and `OOS`',
]);
requireContent('plugins/yieldwerx-probe/references/integrations/knowledge.md', [
  'The only feature-requirement authority',
  'Reference context only',
  '`AC`, `AMB`, and `OOS` Source cells cite only',
]);
requireContent('plugins/yieldwerx-probe/agents/source-digester.md', [
  'Keep requirement authority literal',
  'must not add behavior, values,',
]);
requireContent('plugins/yieldwerx-probe/skills/probe-spec/references/existing-analysis-modes.md', [
  '## `--migrate-format`',
  '## `--reconcile`',
  'Never retain one AC ID across a meaning change',
  '## Reconciliation report format',
]);
requireContent('plugins/yieldwerx-probe/skills/probe-spec/references/ledger-template.md', [
  '## Spec reconciliations',
  'Gate approvals (human decisions)',
  'Per-category Design Gate approvals',
  'Claude — transcribed from direct allrounder approval',
  'this shortcut for an unknown role',
  'Allrounder Case Audit bypass',
  'Allrounder Script Audit bypass',
  'bypass all audits',
  'Allrounder gate bypass',
  'Decision: bypassed',
  'PROBE Owner override',
  'Known gap / residual risk',
  '## Waivers',
]);
requireContent('plugins/yieldwerx-probe/skills/gate-design/SKILL.md', [
  '`READY FOR APPROVAL`',
  '## Per-category approval (partial sync)',
  'fill only that category',
  'a direct statement such as',
  'transcribed from direct allrounder approval',
  'Allrounder solo approval under',
  'Allrounder Case Audit bypass',
  '/bypass-gate <feature> case-audit',
  'material input change makes',
  'Allrounder Design Gate bypass',
  'waived — allrounder gate bypass',
  'Do not treat a bare `approved` as an audit bypass',
  'PROBE Owner override',
  'covered by the exact allrounder audit waiver or PROBE Owner receipt',
]);
requireContent('plugins/yieldwerx-probe/references/process/PROBE-PROCESS.md', [
  'Case Audit bypass',
  'Script Audit bypass',
  '`bypass all audits`',
  'Gate bypass',
  '`/bypass-gate`',
  'Done — Ops Gate bypassed',
  'PROBE Owner override',
  'probe owner-bypass authorize',
  'Other roles still sign manually',
]);
requireContent('plugins/yieldwerx-probe/skills/bypass-gate/SKILL.md', [
  'bypass all gates',
  'bypass all audits',
  '`--category` with `merge`',
  'Reject `bypass everything`',
  'waived — allrounder Script Audit bypass',
  'Any material change to those inputs makes the waiver',
  'Script Audit bypass satisfies Stability Run and Merge Gate',
  'Design Gate bypass authorizes',
  'Merge Gate bypass satisfies',
  'Done — Ops Gate bypassed',
  'Claude — transcribed from direct allrounder bypass',
  'A gate bypass is not approval, and an audit bypass is not PASS',
]);
requireContent('plugins/yieldwerx-probe/skills/audit-scripts/SKILL.md', [
  '/bypass-gate <feature> script-audit',
  'waived — allrounder Script Audit bypass',
  'commit/file-hash manifest',
]);
requireContent('plugins/yieldwerx-probe/skills/green-run/SKILL.md', [
  'waived — allrounder Script Audit bypass',
  'changed manifest invalidates',
]);
requireContent('plugins/yieldwerx-probe/skills/gate-merge/SKILL.md', [
  'Allrounder Script Audit bypass',
  'exact stability-run manifest',
  'does not bypass the Merge Gate',
  'Allrounder Merge Gate bypass',
  'waived — allrounder gate bypass',
  'does not merge',
]);
requireContent('plugins/yieldwerx-probe/skills/gate-ops/SKILL.md', [
  'Allrounder Ops Gate bypass',
  'Done — Ops Gate bypassed',
]);
requireContent('plugins/yieldwerx-probe/skills/forge-scripts/SKILL.md', [
  'allrounder Design Gate bypass',
  'recorded case/spec hashes still match',
  'does not silently waive',
]);
requireContent('plugins/yieldwerx-probe/skills/testops-promote/SKILL.md', [
  'waived — allrounder gate bypass',
  'normal repository authorization',
]);
requireContent('plugins/yieldwerx-probe/adapters/aio/scripts/aio-sync.ts', [
  'isDesignGateAuthorized',
  'isCategoryGateAuthorized',
  'transcribed from direct allrounder gate bypass',
  'Design Gate authorized',
  'function aioExclusionReason',
  "tags.has('@testtype:api')",
  "tags.has('@testtype:contract')",
  "tags.has('@testtype:performance')",
  "tags.has('@api')",
  "tags.has('@retired')",
  'function readDesignGateRow',
  'No AIO-eligible scenarios',
  // --- Live-API payload contracts -----------------------------------------
  // Each marker below is a capability that was discovered against the live AIO
  // API, LOST in a later pin, and rediscovered at the cost of real data. They
  // are asserted so a re-pin cannot silently drop them again.
  //
  // Two of these markers previously asserted the OPPOSITE — this list required
  // `tags: aioTags(cfg, scenario)` and `labels: aioLabels(cfg, scenario)`, i.e.
  // it required the two shapes AIO discards. That made every correct fix fail
  // `npm test`, so correctness was reverted to keep the build green and the
  // adapter shipped bugs by contract. Verified against
  // https://tcms.aiojiraapps.com/aio-tcms/api/v1/openapi.json and by reading
  // cases back (scripts/aio-verify-sync.ts in the consumer repo) on 2026-08-05.

  // updateTestCase is PUT .../testcase/{caseKeyOrId}/detail. Without `/detail`
  // AIO answers 404 for every case, existing or not — which reads as a deleted
  // record and once triggered a multi-hour hunt for a non-existent mass delete.
  '/detail',
  // Full-body replace: a payload missing the Outline data sets DELETES them.
  // Both halves are required; `dataSets` alone is accepted and discarded.
  'datasetParameters',
  'dataSets',
  // `tags` is CaseTag[] = [{ tag: { ID } }]. A bare string 500s; a flat
  // `[{ name }]` returns 200 and stores nothing.
  'tag: { ID }',
  // Tags must exist before a case may reference them.
  'createOrGetTags',
  // AIO rate-limits bulk pushes; without backoff a run aborts half-applied.
  'res.status === 429',
  // A full-body PUT clears every writable field absent from the request, so an
  // update must read the case first and overlay only what sync owns. Without
  // this, precondition/priority/components/releases/estimatedEffort/
  // automationStatus/jiraRequirementIDs are silently wiped on every sync.
  'WRITABLE_CASE_FIELDS',
  'function writableCaseDetails',
  'fetchCaseForUpdate',
  // The pre-update read must ask for data sets; without the flag AIO omits them
  // and the following PUT deletes them.
  'fetchDataSets=true',
  // The three execution tiers are a nested set (smoke ⊆ sanity ⊆ regression).
  // A tier missing from the push whitelist still exists in the corpus but
  // becomes unfilterable in AIO, which looks like the tag was never applied.
  'smoke|sanity|regression',
]);
// Shapes proven wrong against the live API. Asserting their ABSENCE is the only
// thing that stops a well-meaning "restore the old behaviour" change.
forbidContent('plugins/yieldwerx-probe/adapters/aio/scripts/aio-sync.ts', [
  // AIO's CaseFullDetails has no `labels` field. Anything sent there is
  // silently discarded, which is how the @testtype dimension went missing for
  // months. It belongs in `type` (CaseType).
  ['labels: aioLabels(cfg, scenario)', 'AIO has no labels field; use type (CaseType)'],
  // The update URL without the `/detail` suffix.
  ['`${base}/${existingKey}`', 'update URL must end in /detail'],
  // The flat tag shape on the CASE payload, which returns 200 and stores
  // nothing. Must stay specific to the case payload: `[{ name }]` is the
  // CORRECT body for POST /project/{id}/tag (a Tag[]), so a loose marker here
  // fails on the very call that resolves the IDs.
  [
    'tags: aioTags(cfg, scenario).map((name) => ({ name }))',
    'tags must be CaseTag [{ tag: { ID } }], not a flat [{ name }]',
  ],
]);
requireContent('plugins/yieldwerx-probe/skills/sync-cases/SKILL.md', [
  '@testtype:api',
  '@testtype:contract',
  'repository-only',
  '`--live` cannot override it',
]);
requireContent('plugins/yieldwerx-probe/skills/execute-cases/SKILL.md', [
  'Reuse common step implementation, not common step results',
  'failure-evidence contract',
  'never adds `@automated`',
  'results directly to AIO',
  '`--continue-on-failure`',
  '`confirmed | suspected | unknown`',
]);
requireContent('plugins/yieldwerx-probe/skills/ui-recon/SKILL.md', [
  '--with-case-execution',
  'Capture each action once',
  '50-exploratory/executions/',
  'without syncing AIO directly',
]);
requireContent(
  'plugins/yieldwerx-probe/skills/execute-cases/references/failure-evidence-contract.md',
  [
    'Exact failing Gherkin step',
    'rootCauseStatus',
    'browser console output is not',
    'attach evidence externally without fresh human authorization',
  ],
);
requireContent('plugins/yieldwerx-probe/skills/bug-report/SKILL.md', [
  'exact failing Gherkin step',
  'failure-point screenshot',
  '`confirmed | suspected | unknown`',
  'Never auto-file from an execution failure',
]);
requireContent('plugins/yieldwerx-probe/skills/flake-triage/SKILL.md', [
  'Preserve its occurrence',
  'Never replace the first failure',
  'same evidence packet',
]);
requireContent('plugins/yieldwerx-probe/skills/owner-bypass/SKILL.md', [
  'Tafseer Haider',
  'tafseer.haider@yieldwerx.com',
  'PROBE_OWNER_BYPASS_PIN',
  'Never ask for, read, echo, log, or store the PIN',
  'probe owner-bypass consume',
]);
requireContent('plugins/yieldwerx-probe/scripts/owner-bypass.mjs', [
  'Enter PROBE Owner bypass PIN',
  'timingSafeEqual',
  'receipt has expired',
  "status: 'consumed'",
  'secretIncluded: false',
]);
requireContent('plugins/yieldwerx-probe/skills/forge-cases/SKILL.md', [
  '20-cases/coverage-notes.md',
  'Visual candidates: <TC ids or planned behaviors>',
  'Visual: N/A — <specific reason>',
  'cross-category visual deferral',
]);
requireContent('plugins/yieldwerx-probe/agents/test-case-designer.md', [
  'Visual candidates: <TC ids or planned behaviors>',
  'Visual: N/A — <specific reason>',
  'named cross-category deferral',
]);
requireContent('plugins/yieldwerx-probe/skills/audit-cases/SKILL.md', [
  '20-cases/coverage-notes.md',
  'Missing per-category visual disposition',
]);
requireContent('plugins/yieldwerx-probe/agents/test-case-auditor.md', [
  'Visual candidates: <TC ids or planned behaviors>',
  'Missing per-category visual disposition',
]);
requireContent('plugins/yieldwerx-probe/skills/forge-scripts/SKILL.md', [
  'For every eligible `@visual` scenario',
  'dynamic-region masks',
  'expected/actual/diff',
]);
requireContent('plugins/yieldwerx-probe/agents/e2e-scripter.md', [
  'For every `@visual` scenario',
  'dynamic-region masks',
  'expected/actual/diff',
]);
requireContent('plugins/yieldwerx-probe/references/process/PROBE-PROCESS.md', [
  '### P15 — Visual regression is explicitly designed and deterministically run',
  'Visual candidates: <TC ids or planned behaviors>',
  'deterministic environment',
]);
requireContent(
  'plugins/yieldwerx-probe/references/profiles/playwright-bdd/docs/visual-regression.md',
  [
    '20-cases/coverage-notes.md',
    'Script Forge preserves `@visual`',
    'expected/actual/diff evidence',
  ],
);

// --- Development track contracts -------------------------------------------
// Each marker is a separation the two tracks depend on. Losing one silently is
// how a dev skill starts amending feature files, or a build ships an endpoint
// its own API document has never heard of.
requireContent('plugins/yieldwerx-probe/references/process/DEV-TRACK.md', [
  '### D1 — The requirement owns behaviour; code never becomes the requirement',
  '### D2 — Testability is a build obligation, not a QA request',
  '### D3 — A defect fix starts with a failing test',
  '### D6 — Neither track edits the other',
  '### D8 — The development track never waits on a gate',
  'downstream-invalidation list',
  'A code review is not a PROBE gate',
  'The development track is gate-independent',
  'the dev track never waits for the QA track to decide anything',
]);
// The dev track must stay runnable on a repository that has never used PROBE's
// QA process. Two guards, because the failure mode is a slow drift rather than
// one bad edit: assert that gate-independence is stated where a reader will see
// it, and forbid the phrasings that would quietly reintroduce a dependency.
requireContent('plugins/yieldwerx-probe/skills/build-feature/SKILL.md', [
  'There is no fourth precondition',
  'This skill checks no gate, no ledger, and no approval',
  'Never read a gate for permission',
]);
requireContent('plugins/yieldwerx-probe/skills/seed-testability/SKILL.md', [
  'A recon pass is not a prerequisite',
]);
requireContent('plugins/yieldwerx-probe/skills/revise-feature/SKILL.md', [
  'Never read a gate for permission',
]);
requireContent('plugins/yieldwerx-probe/skills/ship-change/SKILL.md', ['No gate is consulted']);
requireContent('plugins/yieldwerx-probe/skills/fix-defect/SKILL.md', [
  'none of them is a prerequisite',
]);
requireContent('plugins/yieldwerx-probe/skills/review-code/SKILL.md', [
  'It consults no gate and no ledger',
]);
for (const devSkill of devSkills) {
  forbidContent(`plugins/yieldwerx-probe/skills/${devSkill}/SKILL.md`, [
    [
      'Design Gate has a recorded human approval',
      'the dev track must never gate building on a QA signature (D8)',
    ],
    [
      'REFUSE (do not negotiate)',
      'that refusal contract belongs to the QA track; dev preconditions are local only',
    ],
    ['Ledger check', 'no dev skill reads the ledger for permission (D8)'],
  ]);
}
requireContent('plugins/yieldwerx-probe/skills/build-feature/SKILL.md', [
  'Never edit a `.feature` file',
  'code never becomes the requirement',
  'testability-scout',
]);
requireContent('plugins/yieldwerx-probe/skills/revise-feature/SKILL.md', [
  'downstream-invalidation list',
  'Never edit the QA artifacts you invalidate',
  '--breaking-ok',
]);
requireContent('plugins/yieldwerx-probe/skills/fix-defect/SKILL.md', [
  'Write the failing test first',
  'Never close the bug candidate yourself',
  '--no-test',
]);
requireContent('plugins/yieldwerx-probe/skills/seed-testability/SKILL.md', [
  'Never edit a page object, a feature file, or a recon artifact',
  'value-named handle is a gap',
]);
requireContent('plugins/yieldwerx-probe/skills/review-code/SKILL.md', [
  'Never sign a gate',
  'Never edit code',
  'demoted to an observation',
  '`--depth` defaults to `thorough`',
  '`quick` narrows',
]);
requireContent('plugins/yieldwerx-probe/skills/ship-change/SKILL.md', [
  'Never merge, ever',
  'downstream-invalidation list',
  '`describe` prepares the pull-request body and ship notes without',
  'Use `--base <ref>`',
]);
requireContent('plugins/yieldwerx-probe/references/configuration.md', [
  'When `profile: node-ts-spa` is selected',
  'rules/selector-policy.md',
  'rules/service-conventions.md',
]);
requireContent('README.md', [
  'https://github.com/tafseer-yw/yieldwerx-probe.git',
  'All 34 `yw:*` skills are explicitly user-invocable',
  'examples/node-ts-spa/probe.config.yaml',
  '<case-audit\\|script-audit\\|audits\\|design\\|merge\\|ops\\|all>',
  '`audits` and `all` are deliberately separate',
]);
requireContent('docs/SKILL-USAGE.md', [
  '<case-audit\\|script-audit\\|audits\\|design\\|merge\\|ops\\|all>',
  '`all` means Design, Merge, and Ops gates only',
  'commit/file-hash manifest',
]);
requireContent('plugins/yieldwerx-probe/agents/build-verifier.md', [
  'Report failures verbatim',
  'unmet obligations is still reported as `red`',
]);
requireContent('plugins/yieldwerx-probe/agents/code-reviewer.md', [
  'Test code belongs to `script-auditor`',
  'Never edit code',
]);

// --- Gate hibernation (P17) -------------------------------------------------
// Hibernation is only safe because it suspends BLOCKING and nothing else. Each
// marker below is one of the properties that keeps it from becoming a silent
// waiver: evidence still assembled, verdict still honest, never rendered as
// approval, and every proceeding stage recorded so resumption has a debt list.
requireContent('plugins/yieldwerx-probe/references/governance/gate-hibernation.md', [
  'without pretending they passed',
  'The severity ladder is untouched',
  'No gate is ever reported as approved',
  'gate-debt list',
  'An expired hibernation is reported as expired',
]);
requireContent('plugins/yieldwerx-probe/references/process/PROBE-PROCESS.md', [
  '### P17 — Gates may be hibernated, never faked',
  'Hibernation suspends blocking and nothing else',
]);
for (const gate of ['gate-design', 'gate-merge', 'gate-ops']) {
  requireContent(`plugins/yieldwerx-probe/skills/${gate}/SKILL.md`, [
    '## Gate hibernation (evaluation mode)',
    'HIBERNATED — evidence assembled, not signed',
    'Assemble',
  ]);
  forbidContent(`plugins/yieldwerx-probe/skills/${gate}/SKILL.md`, [
    [
      'hibernated — approved',
      'a hibernated gate is never rendered as approval (P17); that is falsified evidence',
    ],
  ]);
}
requireContent('plugins/yieldwerx-probe/skills/forge-scripts/SKILL.md', [
  'Gate hibernation is checked first',
  'real readiness verdict',
]);
requireContent('plugins/yieldwerx-probe/skills/testops-promote/SKILL.md', [
  'or hibernated',
  'Hibernation never affects this',
]);
requireContent('plugins/yieldwerx-probe/skills/probe-spec/references/ledger-template.md', [
  '### Gate hibernation (repository-wide',
  'These rows are the gate-debt list',
  'hibernated — evaluation mode',
]);

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
if (!readme.includes('## All 34 public skills: arguments and composition')) {
  errors.push('README.md: missing the explicit all-34 public skill inventory heading');
}
const skillUsage = fs
  .readFileSync(path.join(root, 'docs', 'SKILL-USAGE.md'), 'utf8')
  .replaceAll('\\|', '|');
const normalizedReadme = readme.replaceAll('\\|', '|');
for (const skill of actualSkills) {
  const heading = `### \`${skill}\``;
  const start = readme.indexOf(heading);
  if (start < 0) {
    errors.push(`README.md: missing 5W1H catalog entry for '${skill}'`);
    continue;
  }
  const next = readme.indexOf('\n### ', start + heading.length);
  const section = readme.slice(start, next < 0 ? readme.length : next);
  for (const label of ['Why', 'What', 'When', 'Where', 'How']) {
    if (!section.includes(`- **${label}:**`)) {
      errors.push(`README.md: '${skill}' entry is missing '${label}'`);
    }
  }

  const skillContent = fs.readFileSync(path.join(skillsRoot, skill, 'SKILL.md'), 'utf8');
  const argumentHint = skillContent.match(/^argument-hint:\s*(.+)$/m)?.[1]?.trim();
  if (!argumentHint) {
    errors.push(`skills/${skill}/SKILL.md: missing argument-hint`);
    continue;
  }
  const command = `/yw:${skill}`;
  if (!skillUsage.includes(command) || !skillUsage.includes(argumentHint)) {
    errors.push(`docs/SKILL-USAGE.md: missing '${command}' or arguments '${argumentHint}'`);
  }
  if (!normalizedReadme.includes(command) || !normalizedReadme.includes(argumentHint)) {
    errors.push(`README.md: missing '${command}' or arguments '${argumentHint}'`);
  }
}

const agentsRoot = path.join(pluginRoot, 'agents');
const actualAgents = fs
  .readdirSync(agentsRoot)
  .filter((entry) => entry.endsWith('.md'))
  .sort();
if (actualAgents.join('|') !== [...expectedAgents].sort().join('|')) {
  errors.push(
    `agent inventory mismatch; expected ${expectedAgents.length}, found ${actualAgents.length}`,
  );
}
for (const agent of actualAgents) {
  checkFrontmatter(path.join(agentsRoot, agent), agent.replace(/\.md$/, ''));
  if (devAgents.includes(agent)) {
    checkDevTrackFrontmatter(path.join(agentsRoot, agent), actualSkills, knownAgentNames);
  }
}

for (const requiredPath of [
  'CLAUDE.md',
  'LICENSE.md',
  '.prettierrc.json',
  'config/probe-config.schema.json',
  'docs/ARCHITECTURE.md',
  'docs/CLI.md',
  'docs/SKILL-USAGE.md',
  'examples/generic/probe.config.yaml',
  'examples/node-ts-spa/probe.config.yaml',
  'examples/playwright-bdd/probe.config.yaml',
  'bin/probe.mjs',
  'plugins/yieldwerx-probe/lib/probe-config.mjs',
  'plugins/yieldwerx-probe/references/configuration.md',
  'plugins/yieldwerx-probe/references/integrations/knowledge.md',
  'plugins/yieldwerx-probe/references/process/PROBE-PROCESS.md',
  'plugins/yieldwerx-probe/references/process/PROBE-PLAYBOOK.md',
  'plugins/yieldwerx-probe/references/process/PROBE-QUICKREF.md',
  'plugins/yieldwerx-probe/references/process/DEV-TRACK.md',
  'plugins/yieldwerx-probe/references/profiles/node-ts-spa/README.md',
  'plugins/yieldwerx-probe/references/profiles/node-ts-spa/rules/selector-policy.md',
  'plugins/yieldwerx-probe/references/profiles/node-ts-spa/rules/service-conventions.md',
  'plugins/yieldwerx-probe/skills/probe-spec/references/existing-analysis-modes.md',
  'plugins/yieldwerx-probe/skills/probe-spec/references/ledger-template.md',
  'plugins/yieldwerx-probe/skills/probe-spec/scripts/validate-spec-reconciliation.mjs',
  'scripts/test-cli.mjs',
  'scripts/test-spec-reconciliation-validator.mjs',
  'scripts/test-spec-validator.mjs',
  'tests/fixtures/spec-analysis/valid-hybrid.md',
  'tests/fixtures/spec-analysis/valid-reconciliation.md',
]) {
  if (!fs.existsSync(path.join(root, requiredPath))) {
    errors.push(`${requiredPath}: required file is missing`);
  }
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath);
      continue;
    }
    if (!/\.(md|json|mjs|ts|ya?ml)$/i.test(entry.name)) continue;
    const relativePath = path.relative(root, absolutePath).replaceAll('\\', '/');
    const content = fs.readFileSync(absolutePath, 'utf8');
    if (
      /\b[A-Z]:\\(?:Users|Documents and Settings|Program Files(?: \(x86\))?|Windows|Temp|YW|YieldWerx)\b/i.test(
        content,
      )
    ) {
      errors.push(`${relativePath}: contains a machine-specific absolute path`);
    }
    if (content.includes('.claude/skills/probe-spec/scripts/')) {
      errors.push(`${relativePath}: uses the pre-plugin Spec Probe script path`);
    }
    if (/load(?:s|ed)? automatically[^\n]*references\//i.test(content)) {
      errors.push(`${relativePath}: incorrectly says plugin references auto-load`);
    }
    if (content.includes('[TODO:')) {
      errors.push(`${relativePath}: contains a scaffold TODO placeholder`);
    }
  }
}

walk(pluginRoot);

function checkMarkdownLinks(absolutePath) {
  const relativePath = path.relative(root, absolutePath).replaceAll('\\', '/');
  const content = fs.readFileSync(absolutePath, 'utf8');
  for (const match of content.matchAll(/!?\[[^\]]*]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '');
    if (
      /^(?:https?:|mailto:|#)/i.test(rawTarget) ||
      rawTarget.includes('<') ||
      rawTarget.includes('*')
    ) {
      continue;
    }
    const fileTarget = decodeURIComponent(rawTarget.split('#')[0]);
    if (!fileTarget) continue;
    const resolved = path.resolve(path.dirname(absolutePath), fileTarget);
    if (!fs.existsSync(resolved)) {
      errors.push(`${relativePath}: broken relative link '${rawTarget}'`);
    }
  }
}

for (const relativePath of [
  'README.md',
  'CONTRIBUTING.md',
  'MIGRATION.md',
  'docs/ARCHITECTURE.md',
  'docs/CLI.md',
  'docs/SKILL-USAGE.md',
  'plugins/yieldwerx-probe/references/configuration.md',
  'plugins/yieldwerx-probe/references/integrations/knowledge.md',
  'plugins/yieldwerx-probe/references/process/PROBE-PROCESS.md',
  'plugins/yieldwerx-probe/references/process/PROBE-PLAYBOOK.md',
  'plugins/yieldwerx-probe/references/process/PROBE-QUICKREF.md',
]) {
  checkMarkdownLinks(path.join(root, relativePath));
}

const playwrightConfig = fs.readFileSync(
  path.join(root, 'examples', 'playwright-bdd', 'probe.config.yaml'),
  'utf8',
);
for (const expectedLine of [
  'provider: yieldwerx-knowledgebase',
  'source: claude-plugin',
  'marketplace: yieldwerx-company',
  'plugin: yieldwerx-knowledgebase',
  'skill: ask-yieldwerx',
  'revision: 1.1.0',
]) {
  if (!playwrightConfig.includes(expectedLine)) {
    errors.push(`examples/playwright-bdd/probe.config.yaml: missing '${expectedLine}'`);
  }
}

const nodeSpaConfig = fs.readFileSync(
  path.join(root, 'examples', 'node-ts-spa', 'probe.config.yaml'),
  'utf8',
);
for (const expectedLine of [
  `probeVersion: ${manifest.version}`,
  'profile: node-ts-spa',
  'documentUrl: http://127.0.0.1:3000/openapi.json',
  'testIdRequired: true',
]) {
  if (!nodeSpaConfig.includes(expectedLine)) {
    errors.push(`examples/node-ts-spa/probe.config.yaml: missing '${expectedLine}'`);
  }
}

if (errors.length > 0) {
  process.stderr.write(`PROBE repository validation failed (${errors.length}):\n`);
  for (const error of errors) process.stderr.write(`- ${error}\n`);
  process.exit(1);
}

process.stdout.write(
  `PROBE repository valid: ${actualSkills.length} skills, ` +
    `${actualAgents.length} agents, plugin ${manifest.version}.\n`,
);
