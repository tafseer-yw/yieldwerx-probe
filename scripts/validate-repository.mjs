import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const pluginRoot = path.join(root, 'plugins', 'yieldwerx-probe');
const expectedSkills = [
  'api-recon',
  'ask-yieldwerx',
  'audit-scripts',
  'bug-report',
  'change-impact',
  'desktop-recon',
  'execute-cases',
  'flake-triage',
  'forge-api-tests',
  'forge-performance-tests',
  'forge-prd',
  'forge-desktop-scripts',
  'forge-security-tests',
  'forge-tech-design',
  'forge-unit-tests',
  'forge-migration',
  'forge-cases',
  'forge-oracle',
  'forge-scripts',
  'gate-design',
  'gate-merge',
  'gate-ops',
  'green-run',
  'log-exploratory',
  'handoff',
  'probe-implementation',
  'probe-spec',
  'sync-cases',
  'sync-styleguide',
  'testops-promote',
  'ui-recon',
  'update-yieldwerx-knowledge',
  'update-cases',
  // --- Development track (2.10.0) ------------------------------------------
  'build-feature',
  'fix-defect',
  'review-code',
  'review-pr',
  'revise-feature',
  'scaffold-app',
  'scan-security',
  'seed-testability',
  'ship-change',
];
const expectedAgents = [
  'desktop-recon-agent.md',
  'e2e-scripter.md',
  'flake-hunter.md',
  'implementation-prober.md',
  'plotly-specialist.md',
  'script-auditor.md',
  'security-analyst.md',
  'source-digester.md',
  'tech-designer.md',
  'testcomplete-scripter.md',
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
  'forge-tech-design',
  'review-pr',
  'forge-unit-tests',
  'forge-migration',
  'sync-styleguide',
  'fix-defect',
  'review-code',
  'review-pr',
  'revise-feature',
  'scaffold-app',
  'seed-testability',
  'ship-change',
];
const devAgents = [
  'build-verifier.md',
  'tech-designer.md',
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
// Dead once the plugin declares no dependencies, and worse than dead: an
// allowlist naming yieldwerx-company reads as sanction for re-adding the
// dependency that disabled the plugin for every user who cannot reach it.
if (marketplace.allowCrossMarketplaceDependenciesOn !== undefined) {
  errors.push(
    `marketplace must not allow cross-marketplace dependencies; the plugin declares none by design`,
  );
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
/**
 * The plugin must NOT declare a hard dependency on the knowledgebase.
 *
 * Through 2.13.1 the manifest required `yieldwerx-knowledgebase@yieldwerx-company`.
 * An unsatisfied dependency makes Claude Code disable the depending plugin
 * (`dependency-unsatisfied`), and that marketplace is an internal Azure DevOps
 * URL a QA workstation or a Cowork sync generally cannot reach. The result was
 * all 34 skills disabled on any account without the knowledgebase, while the
 * owner's machine — where it happens to be installed — looked perfectly healthy.
 *
 * Only ask-yieldwerx and update-yieldwerx-knowledge consult it, and both already
 * report the knowledgebase as missing or disabled instead of guessing. The
 * knowledgebase is a documented optional prerequisite, never an install gate on
 * the other 32 skills.
 */
if (manifest.dependencies !== undefined) {
  errors.push(
    `plugin manifest must not declare dependencies; an unsatisfiable knowledgebase dependency disabled all ${expectedSkills.length} skills for every user without internal Azure DevOps access through 2.13.1`,
  );
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
 * The hosted plugin must NOT contain a `commands/` directory.
 *
 * 2.13.0 added one shim per skill on the theory that Claude Code builds the `/`
 * menu from `skills/` while Claude Desktop builds it from `commands/`. That
 * theory is wrong. The loader merges both directories into a single registry,
 * so shipping both registered every name twice — `claude plugin details`
 * reported 68 skills for 34 entry points — and the duplicate-name collision
 * stopped the whole plugin from registering in Claude Desktop. Nothing loaded:
 * no skills, no commands. It also added ~4,100 always-on tokens to every
 * session, a 75% increase over the 34-skill payload.
 *
 * `skills/` alone is the correct and sufficient layout. Anyone re-adding
 * `commands/` to expose slash commands is re-creating a shipped outage, so this
 * fails loudly rather than letting it look like an untried idea. Verify a layout
 * change with `claude plugin details yw@yieldwerx` and confirm the skill count
 * equals the number of skill directories.
 */
const commandsRoot = path.join(pluginRoot, 'commands');
if (fs.existsSync(commandsRoot)) {
  errors.push(
    `plugins/yieldwerx-probe/commands/: must not exist; the loader merges commands/ into the same registry as skills/, so shipping both double-registers all ${actualSkills.length} names and broke plugin registration entirely in 2.13.0`,
  );
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
  'references/plain-language.md',
  'sole source of truth for requirements',
  'Reference context only — not a requirement',
  'Do not put a knowledgebase',
  // --- Plain language (P13) is enforced, not advised ------------------------
  // These three habits drifted back every time the rules were prose only.
  '**In plain words:**',
  '`## Terms` table',
  '**Labels are verbatim.**',
  'Never invent an acronym or initialism',
  '**Never abbreviate.**',
]);
requireContent('plugins/yieldwerx-probe/skills/probe-spec/references/plain-language.md', [
  '## Rule 1 — Labels are verbatim',
  '## Rule 2 — No invented acronyms or initialisms',
  '## Rule 3 — No abbreviations',
  '### Always exempt (never flagged)',
  '### Never exempt',
  '## Rule 5 — Every criterion gets an `In plain words` explanation',
]);
// The lexical machinery moved to the shared module in 3.1 so the PRD and spec
// validators cannot drift apart. Pin the module, and pin that the spec
// validator actually consumes it rather than re-growing a private copy.
requireContent('plugins/yieldwerx-probe/scripts/lib/plain-language.mjs', [
  'export const exemptAcronyms',
  'export const bannedAbbreviations',
  'export function acronymTokens',
  'export function parseTermsTable',
  'export function plainLanguageIssues',
  'export function averageSentenceLength',
]);
requireContent('plugins/yieldwerx-probe/skills/probe-spec/scripts/validate-spec-analysis.mjs', [
  "from '../../../scripts/lib/plain-language.mjs'",
  'function checkPlainLanguage',
  'In plain words',
]);
forbidContent('plugins/yieldwerx-probe/skills/probe-spec/scripts/validate-spec-analysis.mjs', [
  [
    'const exemptAcronyms',
    'the acronym allowlist lives in scripts/lib/plain-language.mjs; a private copy drifts',
  ],
  [
    'const bannedAbbreviations',
    'the abbreviation list lives in scripts/lib/plain-language.mjs; a private copy drifts',
  ],
]);
requireContent('plugins/yieldwerx-probe/agents/source-digester.md', [
  'Copy every name exactly, and never invent a short form',
  'character for character',
]);
requireContent('plugins/yieldwerx-probe/references/process/PROBE-PROCESS.md', [
  'both formats use the same readable shape',
  '**Summary:** Verify that ...',
  '**In plain words:**',
  'Three lexical rules are enforced, not advised',
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
  "Recorded by: Claude — transcribed from the human's direct approval",
  'never writes an approval the human did not state',
  '| Gate | Scope | Approved by | Role | Timestamp | Confirmed | Evidence |',
  'pending · in-progress · done · blocked · n/a',
  'governance/human-gates.md',
  '## Case amendments',
]);
requireContent('plugins/yieldwerx-probe/skills/gate-design/SKILL.md', [
  'governance/human-gates.md',
  'Gaps and open items',
  'No readiness stamp',
  'YYYY-MM-DD HH:MM',
  "Recorded by: Claude — transcribed from the human's direct approval",
  '**Claude never writes an approval the human did not state.**',
  '`continue`, `go ahead`, and `looks fine` are not',
  'For `--category CAT-NN`, fill only that',
  'falsified evidence',
]);
requireContent('plugins/yieldwerx-probe/references/process/PROBE-PROCESS.md', [
  '**Any role may approve any gate.**',
  'Claude never writes an approval the human did not',
  'Approving with known gaps is a real decision',
  'Severity is **classification, not control flow.**',
  'There is no waiver table, because nothing in the process can be waived',
  '### P4 — No scripting before the Design Gate',
  'human-gates.md',
]);
requireContent('plugins/yieldwerx-probe/skills/audit-scripts/SKILL.md', [
  '## This is advisory, not a gate',
  'It **blocks nothing**',
  'It **needs no waiver**',
  'file-hash manifest exists',
]);
requireContent('plugins/yieldwerx-probe/skills/green-run/SKILL.md', [
  'is advisory and is not a precondition',
  'green ×3',
]);
requireContent('plugins/yieldwerx-probe/skills/gate-merge/SKILL.md', [
  'governance/human-gates.md',
  'Gaps and open items',
  '**This gate never merges anything.**',
  'YYYY-MM-DD HH:MM',
  '**Claude never writes an approval the human did not state.**',
]);
requireContent('plugins/yieldwerx-probe/skills/gate-ops/SKILL.md', [
  'governance/human-gates.md',
  'Gaps and open items',
  "feature's automation outcome as **Done**",
  '**Claude never writes an approval the human did not state.**',
]);
requireContent('plugins/yieldwerx-probe/skills/forge-scripts/SKILL.md', [
  '**Gate approvals** table',
  'no audit verdict, no hash',
  'governance/human-gates.md',
]);
requireContent('plugins/yieldwerx-probe/skills/testops-promote/SKILL.md', [
  '**The Merge Gate has a recorded human approval.**',
  'normal repository authorization',
]);
requireContent('plugins/yieldwerx-probe/adapters/aio/scripts/aio-sync.ts', [
  'isDesignGateAuthorized',
  'isCategoryGateAuthorized',
  'function readGateApprovals',
  'function readLegacyDesignGateStatus',
  // The stage table also carries `DESIGN GATE | … | done`, so consulting the
  // pre-3.0 fallback when the approvals table exists but is empty authorized a
  // live production push from a ledger nobody had approved.
  'if (approvals !== null) {',
  'Design Gate authorized',
  'function aioExclusionReason',
  "tags.has('@testtype:api')",
  "tags.has('@testtype:contract')",
  "tags.has('@testtype:performance')",
  "tags.has('@api')",
  "tags.has('@retired')",
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
  // Every category is designed at both layers (3.0). Without an explicit
  // disposition the API layer is simply skipped and nobody notices.
  'API candidates: <TC ids or planned behaviours>',
  'API: N/A — <specific reason>',
  'Target forge',
]);
requireContent('plugins/yieldwerx-probe/skills/forge-cases/SKILL.md', [
  '## The API dimension — required per category',
  'API candidates: <TC ids or planned behaviours>',
  'API: N/A — <specific reason>',
  '<category>-api.feature',
  'Target forge',
  'repository-only by policy',
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
  'All 42 `yw:*` skills are explicitly user-invocable',
  'examples/node-ts-spa/probe.config.yaml',
  '## Gates are human decisions',
]);
requireContent('docs/SKILL-USAGE.md', ['There are no bypass, waiver, or override arguments']);
requireContent('plugins/yieldwerx-probe/agents/build-verifier.md', [
  'Report failures verbatim',
  'unmet obligations is still reported as `red`',
]);
requireContent('plugins/yieldwerx-probe/agents/code-reviewer.md', [
  'Test code belongs to `script-auditor`',
  'Never edit code',
]);

// --- Human gates (v3.0) ------------------------------------------------------
// A gate is a record of a human decision and nothing else. Each marker below is
// one of the properties that keeps it that way: facts instead of a verdict, every
// gap listed, a timestamped approval row, and the one hard rule that Claude never
// writes an approval a human did not state.
requireContent('plugins/yieldwerx-probe/references/governance/human-gates.md', [
  'each one is **a record of a human decision**',
  '**Assemble**',
  '**Facts, not verdicts.**',
  'Gaps are listed, never hidden and never softened',
  '`YYYY-MM-DD HH:MM` local time',
  '## The one hard rule',
  '## What is not a gate',
  'Repository controls are not PROBE',
]);
for (const gate of ['gate-design', 'gate-merge', 'gate-ops']) {
  requireContent(`plugins/yieldwerx-probe/skills/${gate}/SKILL.md`, [
    'governance/human-gates.md',
    'Gaps and open items',
    'YYYY-MM-DD HH:MM',
    '**Claude never writes an approval the human did not state.**',
  ]);
  // The mechanisms 3.0 removed. Asserting their ABSENCE is what stops a
  // well-meaning "restore the old gate behaviour" change from bringing back a
  // computed verdict and the four override systems that existed to argue with it.
  forbidContent(`plugins/yieldwerx-probe/skills/${gate}/SKILL.md`, [
    ['READY FOR APPROVAL', 'a gate reports facts, never a computed readiness verdict (v3.0)'],
    ['NOT READY', 'a gate reports facts, never a computed readiness verdict (v3.0)'],
    [
      'hibernat',
      'gate hibernation was removed in 3.0; gates no longer block, so there is nothing to suspend',
    ],
    [
      'allrounder',
      'the allrounder bypass roles were removed in 3.0; any role may approve any gate',
    ],
    [
      'bypass-gate',
      '/bypass-gate was removed in 3.0; a gate that is not approved is simply not approved',
    ],
    ['owner-bypass', '/owner-bypass was removed in 3.0; there is no computed blocker to override'],
  ]);
}
forbidContent('plugins/yieldwerx-probe/skills/probe-spec/references/ledger-template.md', [
  ['## Waivers', 'the waiver table was removed in 3.0; nothing in the process can be waived'],
  ['hibernat', 'gate hibernation was removed in 3.0'],
  ['waived', 'the `waived` ledger status was removed in 3.0'],
]);
forbidContent('plugins/yieldwerx-probe/references/process/PROBE-PROCESS.md', [
  ['### P17', 'P17 (gate hibernation) was removed in 3.0'],
]);
forbidContent('config/probe-config.schema.json', [
  [
    'governance',
    'governance.gates was removed in 3.0; gates no longer block, so there is nothing to configure',
  ],
]);
forbidContent('bin/probe.mjs', [['owner-bypass', 'the owner-bypass command was removed in 3.0']]);

// --- The no-shell adapter (v3.0) --------------------------------------------
// Every PROBE capability with an executable behind it was reachable only through
// a shell command, so in a host that gives the assistant no shell — Claude
// Desktop — /sync-cases had no engine at all and the validator, lint and coverage
// commands were unreachable for the same reason. These markers pin the fix:
// verbs rather than commands, an engine probe that never degrades silently, and
// the tool-side confirmation that replaces a Bash guard which cannot fire here.
requireContent('plugins/yieldwerx-probe/adapters/mcp/server.mjs', [
  "method === 'tools/list'",
  "method === 'tools/call'",
  'confirm !== true',
  'Refused: aio_sync writes to the production Jira tenant',
  'scriptEnvironment',
  'runConfiguredCommand',
]);
requireContent('plugins/yieldwerx-probe/references/integrations/case-management.md', [
  '## The six verbs',
  '`plan` needs no credentials and writes nothing',
  '`push` is refused without both',
  '### 3. Export bundle — neither is available',
  'never claim a sync happened',
]);
requireContent('plugins/yieldwerx-probe/skills/sync-cases/SKILL.md', [
  '## Step 0 — pick an engine for this host',
  '**Never silently degrade.**',
  'blocked — no sync engine available',
  'integrations/case-management.md',
]);
requireContent('plugins/yieldwerx-probe/references/configuration.md', [
  '## Hosts without a shell',
  'validated: inline (no shell host)',
  '**Never silently degrade.**',
]);
const pluginManifestText = fs.readFileSync(
  path.join(root, 'plugins', 'yieldwerx-probe', '.claude-plugin', 'plugin.json'),
  'utf8',
);
if (!pluginManifestText.includes('${CLAUDE_PLUGIN_ROOT}/adapters/mcp/server.mjs')) {
  errors.push(
    'plugin.json must declare the probe-tools MCP server; without it a no-shell host has no engine for Case Sync',
  );
}
if (!packageManifest.files?.includes('plugins/yieldwerx-probe/adapters/mcp/')) {
  errors.push('package.json files must ship plugins/yieldwerx-probe/adapters/mcp/');
}

// --- Security (3.1) ------------------------------------------------------------
// OWASP Top 10:2025 (verified against owasp.org 2026-08-19 — this is the 2025
// edition, and A03/A10 did not exist in 2021). Authored categories a scanner
// cannot judge, scanned categories through a swappable tool contract, and the
// authorization rule that active scanning is a live action.
requireContent('plugins/yieldwerx-probe/references/security/owasp-2025.md', [
  'A03 | Software Supply Chain Failures',
  'A10 | Mishandling of Exceptional Conditions',
  '**No scanner covers the Top Ten.**',
  '@owasp:A01',
  'An active scan sends attack traffic',
]);
requireContent('plugins/yieldwerx-probe/references/integrations/security-tools.md', [
  '## The five verbs',
  'need no target authorization',
  'refused without',
  'commands.securityFuzz',
]);
requireContent('plugins/yieldwerx-probe/skills/forge-security-tests/SKILL.md', [
  '@owasp:ANN',
  'A01 Broken Access Control',
  'never from what the app currently does',
  'security-coverage.md',
]);
requireContent('plugins/yieldwerx-probe/skills/scan-security/SKILL.md', [
  '## Authorization — the hard rule',
  'refused outright',
  '**Triage — the part that earns the skill.**',
  'repository-only',
]);

// --- Desktop track (3.1) --------------------------------------------------------
// TestComplete BDD against the WinForms client: one case of record across two
// runners, aliases-only identity, and the exit-code/interactive-session
// contract that makes desktop CI behave. Facts verified against the SmartBear
// documentation 2026-08-19; the pins keep a future edit from re-inventing them.
requireContent('plugins/yieldwerx-probe/references/profiles/testcomplete-winforms/README.md', [
  '**Scenarios**',
  'Python is fully supported for BDD',
  'NameMapping',
  '## The one case of record',
  'interactive session is required',
  // The desktop suite is maintained by a different team from the one that owns
  // the cases. All three hazards of that split are silent when they go wrong.
  '## Operating model — a separate team, a shared case of record',
  'refused, never guessed',
  'Never report them as `@automated`',
  '### What each team owns',
]);
// `@desktop` is a SURFACE, not a level. A behaviour reachable only through the
// desktop app is still e2e or component; the surface rides alongside exactly as
// `@visual`, `@a11y`, and `@api` do. Inventing a `@testtype:desktop` level
// breaks the level set's meaning and every count built on it.
forbidContent('plugins/yieldwerx-probe/skills/forge-cases/SKILL.md', [
  ['@testtype:desktop', '`desktop` is a surface tag, not a test level'],
]);
forbidContent('plugins/yieldwerx-probe/skills/probe-spec/SKILL.md', [
  ['@testtype:desktop', '`desktop` is a surface tag, not a test level'],
]);
forbidContent('plugins/yieldwerx-probe/agents/test-case-designer.md', [
  ['@testtype:desktop', '`desktop` is a surface tag, not a test level'],
]);
forbidContent('plugins/yieldwerx-probe/skills/forge-desktop-scripts/SKILL.md', [
  ['@testtype:desktop', '`desktop` is a surface tag, not a test level'],
]);
requireContent('plugins/yieldwerx-probe/skills/forge-cases/SKILL.md', [
  '**`@desktop` is a surface tag, not a level.**',
]);
requireContent(
  'plugins/yieldwerx-probe/references/profiles/testcomplete-winforms/rules/name-mapping-policy.md',
  [
    'WinFormsControlName',
    "omit a control's name from the executable",
    '**Aliases are the test-facing API.**',
  ],
);
requireContent(
  'plugins/yieldwerx-probe/references/profiles/testcomplete-winforms/docs/ci-testexecute.md',
  [
    'interactive user session is required',
    '/ExportSummary',
    '**only exit 2 counts against the stability streak.**',
  ],
);
requireContent('plugins/yieldwerx-probe/skills/forge-desktop-scripts/SKILL.md', [
  'Scenarios',
  'recorded human Design Gate approval',
  '**Import, never transcribe.**',
  '@automated',
]);
requireContent('plugins/yieldwerx-probe/skills/desktop-recon/SKILL.md', [
  'control-name-gaps.md',
  'name-mapping-inventory.md',
  '/seed-testability',
]);

// --- Dev design & build (3.1) --------------------------------------------------
// The dev track's design/build pipeline: design from the analysis (never the
// raw PRD), the routed-AC promise kept by unit tests, migration safety rules,
// and styleguide conformance against the repo's own authority.
requireContent('plugins/yieldwerx-probe/skills/forge-tech-design/SKILL.md', [
  '10-spec/spec-analysis.md',
  'NEEDS_INFO',
  'decisions/NNNN-<slug>.md',
  'threat sketch',
  'provisional',
]);
requireContent('plugins/yieldwerx-probe/skills/forge-unit-tests/SKILL.md', [
  'dev-handoff.md',
  'never read back from the code under test',
  'D12',
]);
requireContent('plugins/yieldwerx-probe/skills/forge-migration/SKILL.md', [
  '**Never edit an applied migration.**',
  '**Additive first.**',
  '**NOT NULL on a populated table is two steps.**',
  '**Seeds are idempotent.**',
  'forward-only',
]);
requireContent('plugins/yieldwerx-probe/skills/sync-styleguide/SKILL.md', [
  'plugin never bundles a copy',
  '**Conformance, not aesthetics.**',
  'commands.designCheck',
]);
requireContent('plugins/yieldwerx-probe/skills/build-feature/SKILL.md', [
  '--stack',
  '--layer',
  'fe-handoff.md',
  'D12',
]);
requireContent('plugins/yieldwerx-probe/agents/requirement-clarifier.md', [
  'recommended answer and one line of',
  'A question without a stance is a survey',
]);
requireContent('plugins/yieldwerx-probe/references/process/DEV-TRACK.md', [
  '### D12 — Every dev skill ends in exactly one of four states',
  'always carries a recommended default',
]);

// --- Requirements Forge (3.1) -------------------------------------------------
// The PRD is requirements truth for both tracks, its lifecycle lives in the
// filename, and sign-off is a recorded human decision. Pin the skill to the
// template/validator pair so the three cannot drift.
requireContent('plugins/yieldwerx-probe/skills/forge-prd/SKILL.md', [
  'references/prd-template.md',
  'plain-language.md',
  'validate-prd.mjs',
  'Claude records the',
  'never copy',
]);
requireContent('plugins/yieldwerx-probe/skills/forge-prd/references/prd-template.md', [
  '## Lifecycle — the filename is the state',
  'prd-signed-off.md',
  '**In plain words:**',
  '**Done means:**',
  '| Q | Question | Who can answer | Recommended answer | Why | Status |',
]);
requireContent('plugins/yieldwerx-probe/skills/forge-prd/scripts/validate-prd.mjs', [
  "from '../../../scripts/lib/plain-language.mjs'",
  'Sign-off is a recorded human decision',
  'Rename, never copy',
]);

// --- Two tracks, one spec, stack routing (3.1) -------------------------------
// The shared Spec Probe and profile-driven --stack routing are the mechanisms
// that keep dev and QA on one requirement and one skill set. Pin them so a
// future edit cannot quietly fork the analysis or hardcode a stack.
requireContent('plugins/yieldwerx-probe/skills/probe-spec/SKILL.md', [
  'track: cross',
  '## One analysis, two tracks',
  '**Neither track regenerates it.**',
  'Run by: <name>',
]);
requireContent('plugins/yieldwerx-probe/references/profiles/README.md', [
  '## How a stack is selected',
  '## What every profile MUST contain',
  '**Traps**',
  'provisional',
]);
requireContent('plugins/yieldwerx-probe/references/profiles/dotnet-legacy/README.md', [
  'Controller → BL (business logic) Service → DL (data logic) Service → Repository',
  'Lot_Sequence',
  'TODO(repo)',
  '## Traps',
]);
requireContent('plugins/yieldwerx-probe/references/profiles/dotnet-modern/README.md', [
  'PROVISIONAL',
  'No repository stands behind this profile yet',
  '## Graduating this profile',
]);
requireContent('plugins/yieldwerx-probe/references/configuration.md', [
  '## Application stacks (`--stack`)',
  'Never guess a stack',
]);
requireContent('plugins/yieldwerx-probe/references/process/DEV-TRACK.md', [
  '### D9 — One skill set, many stacks',
  '### D10 — Spec Probe is shared, and the analysis is jointly owned',
]);

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
if (!readme.includes('## All 42 public skills: arguments and composition')) {
  errors.push('README.md: missing the explicit all-42 public skill inventory heading');
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

// --- process documentation covers the payload --------------------------------
// The README and docs/SKILL-USAGE.md are already pinned to full skill
// coverage. The process documents were not, and had silently fallen behind:
// forge-api-tests and forge-performance-tests shipped in 2.8 and
// update-yieldwerx-knowledge later, and none of the three appeared in ANY
// process document - so the authority described a pipeline the payload no
// longer matched.
//
// Coverage is checked across the process directory as a whole, not per file,
// on purpose: the dev-track skills are gate-independent and are documented in
// DEV-TRACK.md rather than the stage playbook, which is correct. What must
// never happen is a skill that ships and is described nowhere.
{
  const processDir = path.join(root, 'plugins/yieldwerx-probe/references/process');
  const processText = fs
    .readdirSync(processDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => fs.readFileSync(path.join(processDir, f), 'utf8'))
    .join('\n');
  for (const skill of actualSkills) {
    if (!processText.includes(skill)) {
      errors.push(
        `references/process: no process document mentions '${skill}' - it ships and is described nowhere`,
      );
    }
  }
}

// --- shipped guards ---------------------------------------------------------
// The guards are enforcement, so absence is not a style problem: a declared
// guard that does not ship reads exactly like a guard that works.
//
// liveAioWrite / --live : the AIO adapter writes to a production Jira tenant,
//   and PROBE is dry-run by default - so --live is the only signal a write is
//   real, and keying on anything else fires on every harmless dry run.
// stripProsePayloads    : a commit message QUOTING a dangerous command is
//   prose; without this, `commit -am` describing a force push was denied as one.
// -d\b                  : three spellings delete a remote branch - --delete,
//   the -d shorthand, and the empty-source refspec.
// TOKEN|                : AIO_API_TOKEN on a command line is a credential and
//   must be redacted before the command is quoted back.
requireContent('plugins/yieldwerx-probe/scripts/lib/guards/blast-radius.mjs', [
  'liveAioWrite',
  '--live',
  'stripProsePayloads',
  '-d\\b',
  'TOKEN|',
]);

// A hook inherits the host environment, so an env prefix typed into a COMMAND
// never reaches process.env; without this the advertised override cannot work.
requireContent('plugins/yieldwerx-probe/scripts/guards/bash-guard.mjs', ['OVERRIDE_PREFIX']);

// A verdict written anywhere but stdout never reaches the model.
requireContent('plugins/yieldwerx-probe/scripts/lib/guards/hook-io.mjs', ['permissionDecision']);

// Every path the hooks manifest names must actually ship.
{
  const hooksPath = path.join(root, 'plugins/yieldwerx-probe/hooks/hooks.json');
  if (!fs.existsSync(hooksPath)) {
    errors.push(
      'plugins/yieldwerx-probe/hooks/hooks.json is missing - the guards are declared nowhere',
    );
  } else {
    const declaredHooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    for (const group of Object.values(declaredHooks.hooks ?? {}).flat()) {
      for (const hook of group.hooks ?? []) {
        for (const m of String(hook.command ?? '').matchAll(
          /\$\{CLAUDE_PLUGIN_ROOT\}\/([^"'\s]+)/g,
        )) {
          if (!fs.existsSync(path.join(root, 'plugins/yieldwerx-probe', m[1]))) {
            errors.push(`hooks.json names ${m[1]}, which does not ship`);
          }
        }
      }
    }
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
