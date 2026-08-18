/**
 * AIO Tests case sync — pushes Design-Gate-authorized BDD scenarios to Jira AIO Tests as
 * BDD/Gherkin test cases (the engine behind the `/sync-cases` PROBE stage).
 *
 * WHY: AIO Tests is a third-party Jira app with its OWN REST API — the native
 * Atlassian MCP does not create AIO cases. Each designed scenario maps to one
 * durable AIO manual record (Script Type = BDD/Gherkin) that later automation
 * links its results back to; this tool creates/updates those records from the
 * committed feature files and writes the returned AIO key back into each
 * scenario's `# Traceability:` comment so re-runs UPDATE instead of duplicate.
 *
 * SAFETY (mirrors scripts/jira-bug-sync.ts):
 *   - Dry-run by DEFAULT: parses features and prints the exact create/update
 *     plan, writing `.probe/artifacts/<feature>/25-aio-sync/aio-sync.md`. Needs
 *     no token — safe to run anywhere.
 *   - Live requires `--live` (or AIO_SYNC_MODE=live) AND complete config/env:
 *     an HTTPS apiBaseUrl, a real projectKey, and AIO_API_TOKEN (+ AIO_EMAIL
 *     for basic auth). Fails closed on partial config.
 *   - Live refuses a scope without recorded human Design Gate approval or an
 *     explicit allrounder gate bypass — only human-authorized cases reach AIO.
 *     With `--category CAT-NN` the scope narrows to
 *     that category's scenarios and the gate check switches to that category's
 *     row in the ledger's per-category Design Gate table, so team members can
 *     sync approved categories independently.
 *
 * Secrets come from env ONLY (never config/JSON/code): AIO_API_TOKEN, AIO_EMAIL.
 * Non-secret conventions (projectKey, folder template, requirement map, field
 * defaults) live in config/aio-sync.json.
 *
 * TODO(env): the exact AIO create/update request-body field names could not be
 * verified against a live instance here. `buildCasePayload` is isolated and
 * marked so the first live run can be validated against the AIO Swagger
 * (https://tcms.aiojiraapps.com) on a single scenario before a bulk push.
 *
 * Run:  npm run sync:cases -- <feature-slug>            (dry-run plan)
 *       npm run sync:cases -- <feature-slug> --live      (create/update in AIO)
 */
import fs from 'node:fs';
import path from 'node:path';
import { authHeader, checkConnectivity, loadConfig, type SyncConfig } from './aio-lib.ts';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = process.cwd();

interface Step {
  keyword: string;
  text: string;
}
interface Scenario {
  featureFile: string;
  featureName: string;
  title: string;
  isOutline: boolean;
  tags: string[];
  tcId?: string;
  acs: string[];
  aioKey?: string;
  steps: Step[];
  examples: string[];
}

/**
 * API, contract, k6 performance, and retired scenarios stay repository-local.
 *
 * `@retired` matters for data integrity, not just scope. A retired scenario keeps
 * its AIO key so the remote record and its execution history survive — that is the
 * point of retiring rather than deleting. When a feature reassigns that key to a
 * replacement scenario, both carry it, and without this exclusion the sync writes
 * the same record twice in one run: the retired body wins and the reassignment
 * silently reverts.
 */
function aioExclusionReason(scenario: Scenario): string | undefined {
  const tags = new Set(scenario.tags.map((tag) => tag.toLowerCase()));
  if (tags.has('@retired')) return '@retired — superseded case; its AIO record is preserved as-is';
  if (tags.has('@testtype:performance')) return '@testtype:performance is repository-only';
  if (tags.has('@testtype:contract')) return '@testtype:contract is repository-only';
  if (tags.has('@testtype:api')) return '@testtype:api is repository-only';
  if (tags.has('@api')) return '@api marks API-only execution';
  return undefined;
}

/** An AIO key already assigned to a scenario (vs the design-time placeholder). */
const isRealAioKey = (token: string | undefined): token is string =>
  token !== undefined && /^[A-Z][A-Z0-9]+-TC-\d+$/.test(token);

/** Recursively collect `.feature` files under a directory. */
function walkFeatures(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFeatures(full));
    else if (e.name.endsWith('.feature')) out.push(full);
  }
  return out;
}

const STEP_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But', '*'];

/** Parse every scenario (with steps, background, traceability, examples) in a feature file. */
function parseFeature(file: string): Scenario[] {
  const rel = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);
  const scenarios: Scenario[] = [];
  let featureTags: string[] = [];
  let featureName = '';
  let background: Step[] = [];
  let pendingTags: string[] = [];
  // Non-nullable accumulators (see gen-coverage-report.ts for the same shape): the
  // case id and AIO key arrive as tags, the ACs as a `# AC:` comment.
  let pendingTcId: string | undefined;
  let pendingAcs: string[] = [];
  let pendingAioKey: string | undefined;
  const clearPending = (): void => {
    pendingTcId = undefined;
    pendingAcs = [];
    pendingAioKey = undefined;
  };
  let current: Scenario | null = null;
  let collecting: 'background' | 'scenario' | 'examples' | null = null;

  const stepOf = (line: string): Step | null => {
    const m = line.match(/^(\w+|\*)\s+(.*)$/);
    if (m && m[1] && STEP_KEYWORDS.includes(m[1])) return { keyword: m[1], text: m[2] ?? '' };
    return null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') continue;
    if (line.startsWith('#')) {
      // Current format: `# AC: AC-01,AC-02`. The case id and the AIO key are tags.
      const a = line.match(/^#\s*AC:\s*((?:AC-[\w-]+\s*,?\s*)+)/);
      if (a?.[1]) {
        pendingAcs = [...a[1].matchAll(/AC-[\w-]+/g)].map((m) => m[0]);
        continue;
      }
      // Legacy format (pre-2026-07 feature files): `# Traceability: TC-… / AC-NN / <AIO>`.
      const t = line.match(
        /Traceability:\s*(TC-[\w-]+)?\s*\/?\s*((?:AC-[\w-]+\s*,?\s*)+)?\/?\s*([\w-]+)?/,
      );
      if (t) {
        pendingTcId = t[1] ?? pendingTcId;
        pendingAcs = t[2] ? [...t[2].matchAll(/AC-[\w-]+/g)].map((m) => m[0]) : [];
        // `AIO-pending` is a placeholder, not a real key.
        pendingAioKey = isRealAioKey(t[3]) ? t[3] : undefined;
      }
      continue;
    }
    if (line.startsWith('@')) {
      const tags = line.split(/\s+/).filter((w) => w.startsWith('@'));
      pendingTags.push(...tags);
      // `@TC-<slug>-NNN` = the local case id; `@<PROJ>-TC-<n>` = the AIO key written
      // back by a previous sync. The project-prefixed shape is the discriminator.
      const idTag = tags.find((w) => /^@TC-[\w-]+-\d+$/.test(w));
      const keyTag = tags.find((w) => /^@[A-Z][A-Z0-9]*-TC-\d+$/.test(w));
      if (idTag) pendingTcId = idTag.slice(1);
      if (keyTag) {
        pendingAioKey = keyTag.slice(1);
        // Imported legacy/manual cases may use their verified AIO key as the
        // durable primary identity and therefore have no repository-local
        // @TC-<slug>-NNN tag. Preserve that identity; never synthesize one.
        pendingTcId ??= keyTag.slice(1);
      }
      continue;
    }
    if (line.startsWith('Feature:')) {
      featureName = line.slice('Feature:'.length).trim();
      featureTags = pendingTags;
      pendingTags = [];
      collecting = null;
      continue;
    }
    if (line.startsWith('Background:')) {
      collecting = 'background';
      background = [];
      pendingTags = [];
      continue;
    }
    if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
      const isOutline = line.startsWith('Scenario Outline:');
      current = {
        featureFile: rel,
        featureName,
        title: line.replace(/^Scenario(?: Outline)?:/, '').trim(),
        isOutline,
        tags: [...featureTags, ...pendingTags],
        tcId: pendingTcId,
        acs: pendingAcs,
        aioKey: pendingAioKey,
        steps: [...background],
        examples: [],
      };
      scenarios.push(current);
      pendingTags = [];
      clearPending();
      collecting = 'scenario';
      continue;
    }
    if (line.startsWith('Examples:')) {
      collecting = 'examples';
      continue;
    }
    if (collecting === 'examples' && line.startsWith('|') && current) {
      current.examples.push(line);
      continue;
    }
    const step = stepOf(line);
    if (step) {
      if (collecting === 'background') background.push(step);
      else if (collecting === 'scenario' && current) current.steps.push(step);
    }
  }
  return scenarios;
}

/** Heuristic: does this feature have a human-authorized Design Gate decision? */
/**
 * The live feature-level Design Gate row in the ledger's stage table.
 *
 * Located and read by its OWN cells rather than by pattern-matching the file. A
 * ledger that honestly documents its gate history necessarily contains lines like
 * "W-01 — Design Gate signed by an allrounder solo"; a whole-file regex treats such
 * a waiver — recording a signature the ledger elsewhere declares spent — as a live
 * authorization for a destructive push. Rows struck through with `~~` are
 * superseded and skipped.
 */
function readDesignGateRow(slug: string): string | null {
  const ledger = path.join(REPO_ROOT, 'docs', 'qa', slug, 'LEDGER.md');
  if (!fs.existsSync(ledger)) return null;
  for (const line of fs.readFileSync(ledger, 'utf-8').split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = rowCells(line);
    const stage = (cells[0] ?? '').replace(/[*`]/g, '').trim();
    if (stage.includes('~~')) continue;
    if (!/^design gate$/i.test(stage)) continue;
    return (cells[2] ?? '').toLowerCase();
  }
  return null;
}

/**
 * The feature-level Design Gate authorizes a live push when its own status cell
 * records a human approval, or an explicit allrounder bypass whose supporting
 * waiver names the role and the recording method.
 */
function isDesignGateAuthorized(slug: string): boolean {
  const status = readDesignGateRow(slug);
  if (status === null) return false;

  // Check the bypass first: it is the more specific state, and a bypass row
  // legitimately explains itself using words like "not approved, not signed".
  const bypassed = /\bbypassed\b|waived\s+[—-]\s+allrounder gate bypass/.test(status);
  if (bypassed) {
    // The waiver detail lives in the ledger's waiver table, so these two clauses
    // are file-scoped by design; the DECISION above is row-scoped, which is the
    // part that must not be satisfiable by superseded history.
    const md = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'qa', slug, 'LEDGER.md'), 'utf-8');
    const namedAllrounder = /\b(QA Lead|Automation Engineer)\b/i.test(md);
    const directRecord = /transcribed from direct allrounder gate bypass/i.test(md);
    return namedAllrounder && directRecord;
  }

  return /\b(approved|signed|done)\b/.test(status);
}

/**
 * One category's row in the ledger's per-category Design Gate table — the
 * mechanism that lets team members sync approved categories independently.
 * `acs` is the category's acceptance-criteria set (the join used to select the
 * scenarios in scope); the remaining fields describe the human approval.
 */
interface CategoryGateRow {
  category: string;
  acs: Set<string>;
  signedBy: string;
  role: string;
  decision: string;
  recordedBy: string;
}

/** Expand an AC-set cell — "AC-01..AC-06" and/or "AC-01, AC-03" — into ids. */
function parseAcSet(spec: string): Set<string> {
  const out = new Set<string>();
  for (const part of spec.split(',')) {
    const range = part.match(/AC-(\d+)\s*\.\.\s*AC-(\d+)/i);
    if (range) {
      const lo = Number(range[1]);
      const hi = Number(range[2]);
      const width = Math.max(range[1].length, range[2].length);
      for (let n = lo; n <= hi; n++) out.add(`AC-${String(n).padStart(width, '0')}`);
      continue;
    }
    const single = part.match(/AC-[\w-]+/i);
    if (single) out.add(single[0].toUpperCase());
  }
  return out;
}

/** Cells of a markdown table row (between the outer pipes), trimmed. */
const rowCells = (line: string): string[] =>
  line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());

/**
 * Read one category's row from the ledger's per-category Design Gate table.
 * The table is located by its header (a row carrying `Category`, `Signed by`,
 * and `Decision`); columns are mapped by header name so column order is free.
 * Returns null when no ledger, no such table, or no matching category row.
 */
function readCategoryGate(slug: string, category: string): CategoryGateRow | null {
  const ledger = path.join(REPO_ROOT, 'docs', 'qa', slug, 'LEDGER.md');
  if (!fs.existsSync(ledger)) return null;
  const cat = category.toUpperCase();
  let cols: {
    category: number;
    acs: number;
    signedBy: number;
    role: number;
    decision: number;
    recordedBy: number;
  } | null = null;
  for (const line of fs.readFileSync(ledger, 'utf-8').split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = rowCells(line);
    const lower = cells.map((c) => c.toLowerCase());
    if (lower.includes('category') && lower.includes('signed by') && lower.includes('decision')) {
      cols = {
        category: lower.indexOf('category'),
        acs: lower.indexOf('acs'),
        signedBy: lower.indexOf('signed by'),
        role: lower.indexOf('role'),
        decision: lower.indexOf('decision'),
        recordedBy: lower.indexOf('recorded by'),
      };
      continue;
    }
    if (!cols) continue;
    if ((cells[cols.category] ?? '').toUpperCase() !== cat) continue;
    return {
      category: cat,
      acs: parseAcSet(cols.acs >= 0 ? (cells[cols.acs] ?? '') : ''),
      signedBy: cells[cols.signedBy] ?? '',
      role: cols.role >= 0 ? (cells[cols.role] ?? '') : '',
      decision: (cells[cols.decision] ?? '').toLowerCase(),
      recordedBy: cols.recordedBy >= 0 ? (cells[cols.recordedBy] ?? '') : '',
    };
  }
  return null;
}

/**
 * A category is authorized by a named human approval or by an explicit,
 * recorded allrounder gate bypass.
 */
function isCategoryGateAuthorized(row: CategoryGateRow | null): boolean {
  if (!row) return false;
  const signed = row.signedBy !== '' && !/^(_+|—|-|n\/?a|tbd|pending)$/i.test(row.signedBy);
  const approved = /\bapproved\b/.test(row.decision) && !/reject/.test(row.decision);
  const bypassed = /\bbypassed\b/.test(row.decision);
  if (!signed || (!approved && !bypassed)) return false;
  if (!/\bclaude\b/i.test(row.recordedBy)) return approved;
  return (
    /^(QA Lead|Automation Engineer)$/i.test(row.role.trim()) &&
    (approved
      ? /transcribed from direct allrounder approval/i.test(row.recordedBy)
      : /transcribed from direct allrounder gate bypass/i.test(row.recordedBy))
  );
}

/** Resolve the AIO folder path for a feature from the template. */
const folderFor = (cfg: SyncConfig, feature: string): string =>
  cfg.folderTemplate.replace('{feature}', feature);

/** A node in the AIO test-case folder tree (GET …/testcase/folder). */
interface AioFolder {
  ID: number;
  name: string;
  parentID: number | null;
  children?: AioFolder[];
}

/**
 * Resolve a "/"-separated folder path to its numeric AIO folder ID, creating any
 * missing segments in order (POST …/testcase/folder {name, parentID}). AIO
 * addresses folders by ID, so the create-case payload needs this ID, not the
 * path string. Live-only (performs writes when a segment is missing).
 */
async function resolveOrCreateFolderId(
  cfg: SyncConfig,
  token: string,
  email: string | undefined,
  folderPath: string,
): Promise<number> {
  const headers = {
    Authorization: authHeader(cfg, token, email),
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const base = `${cfg.apiBaseUrl}/project/${cfg.projectKey}/testcase/folder`;
  const treeRes = await fetch(base, { headers });
  if (!treeRes.ok) throw new Error(`could not read folder tree (${treeRes.status})`);
  const tree = (await treeRes.json()) as AioFolder[];
  // If the configured folder is a numeric AIO folder ID, target it directly:
  // verify it exists and never create (safest — no folder writes).
  if (/^\d+$/.test(folderPath.trim())) {
    const wanted = Number(folderPath.trim());
    const exists = (nodes: AioFolder[]): boolean =>
      nodes.some((n) => n.ID === wanted || exists(n.children ?? []));
    if (!exists(tree)) {
      throw new Error(
        `folder ID #${wanted} not found in project ${cfg.projectKey} — check config folderTemplate or create it in the AIO UI`,
      );
    }
    return wanted;
  }
  let level = tree;
  const segments = folderPath
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
  let parentID: number | null = null;
  let resolvedID: number | null = null;
  for (const seg of segments) {
    const match = level.find((f) => f.name === seg);
    if (match) {
      resolvedID = match.ID;
      parentID = match.ID;
      level = match.children ?? [];
      continue;
    }
    const res = await fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: seg, parentID }),
    });
    if (!res.ok) {
      throw new Error(
        `create folder "${seg}" failed (${res.status}): ${(await res.text().catch(() => '')).slice(0, 200)}`,
      );
    }
    const created = (await res.json()) as AioFolder;
    resolvedID = created.ID;
    parentID = created.ID;
    level = [];
  }
  if (resolvedID == null) throw new Error(`empty folder path "${folderPath}"`);
  return resolvedID;
}

/** A Jira issue key (project-dash-number), excluding our AC-/TC-/CAT- ids. */
const isJiraKey = (s: string): boolean =>
  /^[A-Z][A-Z0-9]+-\d+$/.test(s) && !/^(AC|TC|CAT)-/.test(s);

interface Requirement {
  ref: string;
  jiraKey?: string;
  source: string;
}

/**
 * Derive the linked requirement for a feature (answer #2: from the PRD, not a
 * hardcoded map). Precedence: explicit requirementMap override → first Jira key
 * in docs/PRDs/<feature>.md → the PRD title → the feature slug. Only a real
 * Jira key is linked in AIO; a title/slug is carried as a label with a warning.
 */
function resolveRequirement(cfg: SyncConfig, slug: string): Requirement {
  const override = cfg.requirementMap[slug];
  if (override) {
    return isJiraKey(override)
      ? { ref: override, jiraKey: override, source: 'requirementMap' }
      : { ref: override, source: 'requirementMap' };
  }
  const prd = path.join(REPO_ROOT, cfg.requirement.prdPathTemplate.replace('{feature}', slug));
  if (fs.existsSync(prd)) {
    const md = fs.readFileSync(prd, 'utf-8');
    const key = [...md.matchAll(/\b[A-Z][A-Z0-9]+-\d+\b/g)].map((m) => m[0]).find(isJiraKey);
    if (key) return { ref: key, jiraKey: key, source: `PRD Jira key (${path.basename(prd)})` };
    const title = (md.match(/^#\s+(.+)$/m)?.[1] ?? slug).replace(/^PRD\s*[—–-]\s*/, '').trim();
    return { ref: title, source: `PRD title (${path.basename(prd)})` };
  }
  return { ref: slug, source: 'feature slug (no PRD found)' };
}

/** Map framework scenario tags → AIO tag labels (drop lifecycle/candidacy noise). */
export function aioTags(cfg: SyncConfig, scenario: Scenario): string[] {
  const keep = scenario.tags
    .filter((t) =>
      // `sanity` belongs here with smoke/regression: the three form a nested
      // execution-tier set (smoke ⊆ sanity ⊆ regression). A tier missing from
      // this whitelist is silently dropped from the AIO push, so the tag exists
      // in the corpus but nobody can filter by it in AIO.
      //
      // `functional` is deliberately NOT pushed. AIO expresses it as the case
      // Type (`{ID: 9, name: "Functional"}`, set from `@testtype:`), so a tag of
      // the same name duplicated a built-in field and read as a second,
      // conflicting classification. `@positive`/`@negative`/`@edge` stay: they
      // sub-classify a functional test and have no AIO Type equivalent.
      /^@(positive|negative|edge|smoke|sanity|regression|wafermap|ruleengine|visual|a11y)$/.test(
        t,
      ),
    )
    .map((t) => t.slice(1));
  return [...new Set([...cfg.defaults.tags, ...keep])];
}

/**
 * AIO **Labels** for a scenario: the test-level classification each scenario
 * carries as `@testtype:<level>` (the PROBE test-type dimension assigned in Case
 * Forge — unit/integration/api/component/e2e/contract/performance/security).
 * Pushed to the AIO case Labels field so cases are filterable by test level;
 * `defaults.labels` from config are merged in.
 */
function aioLabels(cfg: SyncConfig, scenario: Scenario): string[] {
  const testTypes = scenario.tags
    .filter((t) => /^@testtype:[\w-]+$/.test(t))
    .map((t) => t.slice(1)); // '@testtype:e2e' → 'testtype:e2e'
  return [...new Set([...cfg.defaults.labels, ...testTypes])];
}

/**
 * AIO **Type** for a scenario, as a CaseType lookup object.
 *
 * `labels` does not exist on CaseFullDetails, so the `@testtype:<level>`
 * dimension had nowhere to land and was silently dropped on every sync. AIO's
 * Type field is its natural home, which is the mapping this repository's
 * `config/aio-sync.json` already documented but nothing implemented.
 *
 * `defaults.type` remains the fallback when a scenario carries no @testtype.
 * A name absent from the project's configured Type list is rejected by AIO —
 * `GET /project/{id}/config/testcase/type` lists the valid names.
 */
const TESTTYPE_TO_AIO_TYPE: Record<string, string> = {
  unit: 'Unit',
  integration: 'Integration',
  api: 'API',
  performance: 'Performance',
  security: 'Security',
  // QA-owned UI levels have no distinct AIO Type; they are all functional tests.
  component: 'Functional',
  e2e: 'Functional',
  contract: 'Functional',
};

function aioTypeName(cfg: SyncConfig, scenario: Scenario): string | undefined {
  const override = (cfg as { defaults: { typeMap?: Record<string, string> } }).defaults.typeMap;
  const map = { ...TESTTYPE_TO_AIO_TYPE, ...(override ?? {}) };
  const level = scenario.tags
    .map((t) => t.match(/^@testtype:([\w-]+)$/)?.[1])
    .find((l): l is string => Boolean(l));
  return (level ? map[level] : undefined) ?? cfg.defaults.type ?? undefined;
}

export function aioType(cfg: SyncConfig, scenario: Scenario): { name: string } | undefined {
  const name = aioTypeName(cfg, scenario);
  return name ? { name } : undefined;
}

/**
 * Custom-field values, currently just the PROBE category (`@category:CAT-NN`).
 *
 * A CustomFieldValue is `{ name, value }`. The target field must already exist
 * in the AIO project — the API exposes no way to create one, so an AIO admin
 * adds it under project settings and its exact name goes in
 * `defaults.categoryCustomField`. Unset means send nothing, because posting an
 * unknown custom-field name is rejected. Authority: docs/aio-category-field.md.
 */
function aioCustomFields(
  cfg: SyncConfig,
  scenario: Scenario,
): Array<{ name: string; value: string }> | undefined {
  const fieldName = (cfg as { defaults: { categoryCustomField?: string } }).defaults
    .categoryCustomField;
  if (!fieldName) return undefined;
  const category = scenario.tags
    .map((t) => t.match(/^@category:(CAT-\d+)$/)?.[1])
    .find((c): c is string => Boolean(c));
  return category ? [{ name: fieldName, value: category }] : undefined;
}

/**
 * Build the AIO create/update request body for one scenario.
 *
 * Reconciled against the live YWPD AIO project (2026-07-29) by inspecting
 * existing cases: `folder`/`status`/`scriptType` are lookup objects (`{ID}` /
 * `{name}`), BDD/Gherkin content is a structured `steps` array (stepType +
 * bddStep) — NOT a `bddContent` string — and requires scriptType "BDD/Gherkin".
 * Optional `tags` and `labels` are included from the same normalized values
 * shown by the dry-run plan; validate their accepted live shape on one case
 * before a bulk push because older project observations did not expose them.
 * The requirement link remains a known gap: `jiraRequirementIDs` needs a
 * numeric Jira issue ID, not the "YWPD-…" key, so the folder name encodes the
 * requirement in the meantime. Outline Examples are stored as literal
 * `<placeholder>` steps (datasets TODO).
 */
/**
 * Resolve tag names to AIO tag IDs, creating any that do not exist.
 *
 * A case's `tags` entries must reference a Tag that already exists: posting
 * `[{ tag: { name } }]` for an unknown name makes AIO answer 500, not 400.
 * `POST /project/{id}/tag` (createOrGetTags) is idempotent — it returns the
 * existing tag when the name is already present — so it is safe to call with
 * the full set on every run. The response shape is undeclared in the spec, so
 * IDs are read back from `GET /project/{id}/tag` rather than trusted from POST.
 */
async function resolveTagIds(
  cfg: SyncConfig,
  token: string,
  email: string | undefined,
  names: string[],
): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  if (names.length === 0) return ids;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: authHeader(cfg, token, email),
  };
  const url = `${cfg.apiBaseUrl}/project/${cfg.projectKey}/tag`;

  const created = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(names.map((name) => ({ name }))),
  });
  if (!created.ok) {
    const text = await created.text();
    throw new Error(`AIO tag create/get failed (${created.status}): ${text}`);
  }

  type TagRow = { ID?: number; id?: number; name?: string };
  const harvest = (body: unknown): TagRow[] => {
    if (Array.isArray(body)) return body as TagRow[];
    const b = body as { items?: unknown[]; tags?: unknown[] };
    return (b.items ?? b.tags ?? []) as TagRow[];
  };
  const absorb = (rows: TagRow[]): number => {
    let added = 0;
    for (const row of rows) {
      const id = row.ID ?? row.id;
      if (row.name && typeof id === 'number' && !ids.has(row.name)) {
        ids.set(row.name, id);
        added++;
      }
    }
    return added;
  };

  // Prefer the POST response: it answers for exactly the names requested. The
  // project-wide GET is paginated (this project holds 400+ tags), so relying on
  // its first page silently dropped names that sorted beyond it.
  absorb(harvest(await created.json().catch(() => [])));

  // Fill any gap from the paginated list, following startAt until a page adds
  // nothing new or every requested name is resolved.
  const wanted = new Set(names);
  for (let startAt = 0; startAt < 5_000; startAt += 200) {
    if (names.every((n) => ids.has(n))) break;
    const listed = await fetch(`${url}?startAt=${startAt}&maxResults=200`, {
      method: 'GET',
      headers,
    });
    if (!listed.ok) break;
    const rows = harvest(await listed.json().catch(() => []));
    if (rows.length === 0) break;
    absorb(rows);
  }

  // Last resort: match case-insensitively, since AIO tag names are free text and
  // an existing "Regression" will not equal a requested "regression".
  if (!names.every((n) => ids.has(n))) {
    const lower = new Map([...ids].map(([n, id]) => [n.toLowerCase(), id]));
    for (const n of wanted) {
      const hit = lower.get(n.toLowerCase());
      if (!ids.has(n) && typeof hit === 'number') ids.set(n, hit);
    }
  }
  return ids;
}

/**
 * Scenario Outline `Examples:` → AIO data sets.
 *
 * AIO needs BOTH halves in the same body: `datasetParameters` declares the
 * Examples header (the columns) and `dataSets` carries the rows. Sending
 * `dataSets` alone is accepted with 200 and silently discarded, because the
 * columns were never declared.
 *
 * Omitting these on an update is destructive, not merely incomplete:
 * `PUT …/{key}/detail` REPLACES the whole case body, so a payload without them
 * wipes the data sets off every Outline it touches. That is exactly what
 * happened on 2026-08-05 — this pin had parsed `examples` all along but never
 * sent it. Read back with `?fetchDataSets=true` (scripts/aio-verify-sync.ts);
 * a 200 from this API is not evidence the data landed.
 */
export function aioDatasets(scenario: Scenario): {
  datasetParameters?: Array<{ name: string }>;
  dataSets?: Array<Record<string, string>>;
} {
  const rows = scenario.examples
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))
    .map((line) =>
      line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim()),
    );
  if (rows.length < 2) return {};

  const header = rows[0];
  // A second `Examples:` block repeats the header; storing it would turn a
  // header into a data row.
  const dataRows = rows
    .slice(1)
    .filter((row) => !row.every((cell, i) => cell === header[i]));
  if (dataRows.length === 0) return {};

  return {
    datasetParameters: header.map((name) => ({ name })),
    dataSets: dataRows.map((row) =>
      Object.fromEntries(header.map((name, i) => [name, row[i] ?? ''])),
    ),
  };
}

/** AIO uses the collection URL for creates and the `/detail` resource for updates. */
export function aioCaseUrl(base: string, existingKey?: string): string {
  return existingKey ? `${base}/${existingKey}/detail` : base;
}

/**
 * Every field of CaseFullDetails that AIO accepts on a write. Anything else it
 * returns on a GET (ID, key, version, permission, createdDate, isArchived, …)
 * is read-only and must be stripped before sending the body back.
 */
const WRITABLE_CASE_FIELDS = [
  'title',
  'description',
  'precondition',
  'ownedByID',
  'folder',
  'status',
  'priority',
  'scriptType',
  'type',
  'jiraComponentIDs',
  'jiraReleaseIDs',
  'estimatedEffort',
  'customFields',
  'steps',
  'datasetParameters',
  'dataSets',
  'tags',
  'automationStatus',
  'automationOwnerID',
  'automationKey',
  'jiraRequirementIDs',
] as const;

/** Strip read-only GET fields before sending CaseFullDetails back to AIO. */
export function writableCaseDetails(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) =>
      (WRITABLE_CASE_FIELDS as readonly string[]).includes(key),
    ),
  );
}

/**
 * Drop keys whose value is `undefined`.
 *
 * `buildCasePayload` leaves a field `undefined` to mean "sync does not manage
 * this". Spreading such a payload over a fetched case would overwrite real
 * values with `undefined` and clear them — the opposite of the intent.
 */
export function definedOnly(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
}

export function buildCasePayload(
  cfg: SyncConfig,
  slug: string,
  scenario: Scenario,
  requirement: Requirement,
  folderId: number | null,
  tagIds: Map<string, number>,
): Record<string, unknown> {
  return {
    title: scenario.title,
    description: `Auto-synced from ${scenario.featureFile} (${scenario.tcId ?? 'no-TC'}). Requirement: ${requirement.ref}.`,
    // AIO references folders by numeric ID (PublicFolderTo), not a path string —
    // the path from `folderTemplate` is resolved to an ID via resolveOrCreateFolderId.
    folder: folderId != null ? { ID: folderId } : undefined,
    // status / scriptType are lookup objects (…To), not strings.
    status: cfg.defaults.status ? { name: cfg.defaults.status } : undefined,
    scriptType: cfg.scriptType ? { name: cfg.scriptType } : undefined,
    // CaseType is a lookup object, not a bare string. Derived from the
    // scenario's @testtype: dimension, which previously went to `labels`.
    type: aioType(cfg, scenario),
    owner: cfg.defaults.owner || undefined,
    automationKey: scenario.tcId,
    // `tags` is CaseTag[] = [{ tag: { name } }] — the Tag is NESTED. Posting a
    // bare string fails loudly ("Cannot construct instance of PublicTestTag
    // from String value"), but posting a flat `[{ name }]` is accepted with 200
    // and silently ignored, which is why synced cases showed an empty Tags
    // field. Verified against CaseTag/Tag in openapi.json (2026-08-05).
    // Reference each Tag by ID, resolved up-front by resolveTagIds. A name-only
    // `[{ tag: { name } }]` is answered with 500 when the tag does not already
    // exist, so an unresolved name is dropped rather than sent.
    tags: (() => {
      const entries = aioTags(cfg, scenario)
        .map((name) => tagIds.get(name))
        .filter((id): id is number => typeof id === 'number')
        .map((ID) => ({ tag: { ID } }));
      return entries.length > 0 ? entries : undefined;
    })(),
    // `labels` is NOT a field of CaseFullDetails. It was posted on every sync
    // and discarded every time, so the @testtype dimension never reached AIO.
    // It drives `type` above instead.
    customFields: aioCustomFields(cfg, scenario),
    // BDD/Gherkin content is a structured steps array (verified against live
    // cases) — a plain `bddContent` string is ignored, and it requires
    // scriptType "BDD/Gherkin". Each Gherkin keyword maps to a BDD_* stepType.
    steps: scenario.steps.map((s) => ({ stepType: bddStepType(s.keyword), bddStep: s.text })),
    // Outline Examples. MUST be present on every update: this is a full-body
    // replace, so omitting them deletes them.
    ...aioDatasets(scenario),
  };
}

/** Map a Gherkin keyword to the AIO BDD step type. */
export function bddStepType(keyword: string): string {
  switch (keyword.trim().toLowerCase()) {
    case 'given':
      return 'BDD_GIVEN';
    case 'when':
      return 'BDD_WHEN';
    case 'then':
      return 'BDD_THEN';
    case 'but':
      return 'BDD_BUT';
    default:
      return 'BDD_AND';
  }
}

interface LiveResult {
  key: string;
}

/**
 * Read a case before updating it, so a full-body PUT preserves the fields the
 * sync does not manage.
 *
 * `dataSets` is only returned when explicitly requested, so a read that omits
 * `fetchDataSets=true` would hand back a case with no data sets and the
 * following PUT would delete them — the exact failure this read exists to
 * prevent. A failed read returns undefined and the caller falls back to the
 * constructed payload rather than skipping the case.
 */
async function fetchCaseForUpdate(
  cfg: SyncConfig,
  headers: Record<string, string>,
  base: string,
  existingKey: string,
): Promise<Record<string, unknown> | undefined> {
  const url = `${aioCaseUrl(base, existingKey)}?fetchDataSets=true`;
  try {
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) return undefined;
    const body: unknown = await res.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

/** Create or update one AIO case. Only called in --live mode. */
async function pushCase(
  cfg: SyncConfig,
  token: string,
  email: string | undefined,
  payload: Record<string, unknown>,
  existingKey: string | undefined,
): Promise<LiveResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: authHeader(cfg, token, email),
  };
  const base = `${cfg.apiBaseUrl}/project/${cfg.projectKey}/testcase`;
  // Create is POST on the collection; update is `updateTestCase`, which is
  // PUT .../testcase/{caseKeyOrId}/detail — the `/detail` suffix is REQUIRED.
  // Without it AIO answers 404 "Resource Not Found. Please check the URL." for
  // every case, existing or not, which reads exactly like a deleted record.
  // Verified against https://tcms.aiojiraapps.com/aio-tcms/api/v1/openapi.json
  // (2026-08-05): testCaseId accepts "Case key or id", so the key is fine.
  const url = aioCaseUrl(base, existingKey);

  // On update, PUT .../detail REPLACES the whole case body, so any writable
  // field absent from the request is CLEARED. Building a body from scratch
  // therefore wipes every field the sync does not manage — `precondition`,
  // `priority`, components, releases, `estimatedEffort`, `automationStatus`,
  // `jiraRequirementIDs` — including values a human set in the AIO UI.
  //
  // So read first, overlay only what sync owns, then strip the read-only fields
  // AIO returns on a GET but rejects on a write. `definedOnly` matters here: a
  // payload field left `undefined` means "not managed", and spreading it raw
  // would clear the very value we just fetched.
  let requestPayload = payload;
  if (existingKey) {
    const current = await fetchCaseForUpdate(cfg, headers, base, existingKey);
    requestPayload = writableCaseDetails(
      current ? { ...current, ...definedOnly(payload) } : definedOnly(payload),
    );
  }

  // AIO rate-limits bulk pushes (429). A feature-sized corpus reliably trips it
  // part-way, which used to abort the run and leave the push half-applied.
  // Retry 429/5xx with exponential backoff, honouring Retry-After when sent.
  const method = existingKey ? 'PUT' : 'POST';
  const requestBody = JSON.stringify(requestPayload);
  let res!: Response;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(url, { method, headers, body: requestBody });
    if (res.ok) break;

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= 5) {
      const text = await res.text();
      throw new Error(
        `AIO ${existingKey ? 'update' : 'create'} failed (${res.status}): ${text}`,
      );
    }
    const retryAfter = Number(res.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(30_000, 2_000 * 2 ** attempt);
    await res.text().catch(() => undefined);
    process.stdout.write(
      `    … ${res.status} on ${existingKey ?? 'create'} — retrying in ${Math.round(waitMs / 1000)}s\n`,
    );
    await new Promise((r) => setTimeout(r, waitMs));
  }
  const body: unknown = await res.json().catch(() => ({}));
  const key =
    (body as { key?: string }).key ?? existingKey ?? '(unknown — verify AIO response shape)';
  return { key };
}

/**
 * Record the AIO key on a scenario. Current format: the key is an ADDITIONAL tag
 * beside the local `@TC-<slug>-NNN` id — the title, the steps and the local id are
 * never touched, because the local id is the join key every other stage and
 * `coverage:req` rely on. A re-sync replaces an existing key tag in place rather
 * than appending a second one.
 *
 * Legacy files (`# Traceability: TC-… / AC-NN / <AIO>`) keep their comment updated
 * so previously synced features stay consistent.
 */
function writeBackKey(featureFileRel: string, tcId: string | undefined, newKey: string): void {
  if (!tcId) return;
  const abs = path.join(REPO_ROOT, featureFileRel);
  const src = fs.readFileSync(abs, 'utf-8');
  const esc = tcId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Legacy comment form first — if present, that is where the key belongs.
  // The comment is `# Traceability: <tc> / <acs> / <key-or-placeholder>`, so the
  // key is the THIRD slash-separated field. Do not pattern-match the trailing
  // field with a greedy `[^\n]*/`: the unsynced placeholder is
  // `(AIO key pending /yw:sync-cases)`, whose own slash made the greedy form
  // overwrite `yw` and produce `(AIO key pending /YWPD-TC-1234:sync-cases)` —
  // a line that no longer parses as a key, so the scenario was created again
  // on every later sync. Rebuild the fields instead.
  const lineRe = new RegExp(
    `^[ \\t]*#[ \\t]*Traceability:[^\\n]*\\b${esc}\\b[^\\n]*$`,
    'm',
  );
  const lineMatch = src.match(lineRe);
  if (lineMatch) {
    const line = lineMatch[0];
    const parts = line.split('/');
    const rebuilt =
      parts.length >= 3
        ? `${parts[0].replace(/\s+$/, '')} / ${parts[1].trim()} / ${newKey}`
        : `${line.replace(/\s+$/, '')} / ${newKey}`;
    if (rebuilt !== line) fs.writeFileSync(abs, src.replace(line, rebuilt));
    return;
  }

  // Current tag form: find the tag line carrying @<tcId> and set the key tag on it.
  const tagLine = new RegExp(`^([ \\t]*@${esc}\\b[^\\n]*)$`, 'm');
  const m = src.match(tagLine);
  if (!m?.[1]) return;
  const existingKey = /(@[A-Z][A-Z0-9]*-TC-\d+)/;
  const replaced = existingKey.test(m[1])
    ? m[1].replace(existingKey, `@${newKey}`)
    : m[1].replace(new RegExp(`(@${esc})`), `$1 @${newKey}`);
  if (replaced !== m[1]) fs.writeFileSync(abs, src.replace(tagLine, replaced));
}

/** Value of a `--flag value` argument, or undefined. */
const flagValue = (args: string[], name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  // Slug is the first positional arg that is not a value consumed by a flag
  // (so `--category CAT-01` never gets mistaken for the feature slug).
  const valueFlags = new Set(['--case', '--limit', '--category']);
  const slug = args.find((a, i) => !a.startsWith('-') && !valueFlags.has(args[i - 1]));
  const live = args.includes('--live') || process.env.AIO_SYNC_MODE === 'live';
  // --validate: push a SINGLE case to check connectivity/payload against the
  // live Swagger, bypassing the Design-Gate-approved requirement (loud warning).
  const validate = args.includes('--validate');
  const caseId = flagValue(args, '--case');
  // --category CAT-NN: scope to one category's scenarios and gate on that
  // category's ledger row, so approved categories sync independently.
  const category = flagValue(args, '--category')?.toUpperCase();
  const limit = Number(flagValue(args, '--limit') ?? (validate ? '1' : '0')) || 0;

  if (!slug) {
    process.stdout.write(
      'Usage: npm run sync:cases -- <feature-slug> [--live] [--category CAT-NN] [--case <TC>] [--validate] [--limit N]\n',
    );
    process.exitCode = 1;
    return;
  }

  const cfg = loadConfig();
  let scenarios = walkFeatures(path.join(REPO_ROOT, 'features', slug)).flatMap(parseFeature);

  // Category scope: select scenarios whose ACs fall in the category's AC set
  // (read from the ledger's per-category Design Gate table).
  let categoryRow: CategoryGateRow | null = null;
  if (category) {
    categoryRow = readCategoryGate(slug, category);
    if (!categoryRow) {
      process.stdout.write(
        `No "${category}" row in docs/qa/${slug}/LEDGER.md per-category Design Gate table — ` +
          `add the category (with its AC set) before a scoped sync.\n`,
      );
      process.exitCode = 1;
      return;
    }
    scenarios = scenarios.filter((s) => s.acs.some((a) => categoryRow!.acs.has(a.toUpperCase())));
    if (scenarios.length === 0) {
      process.stdout.write(
        `No scenarios under features/${slug}/ map to ${category} ` +
          `(ACs ${[...categoryRow.acs].join(', ') || 'none listed in ledger'}).\n`,
      );
      process.exitCode = 1;
      return;
    }
  }

  if (caseId) {
    scenarios = scenarios.filter((s) => s.tcId === caseId || s.title.includes(caseId));
  }
  if (scenarios.length === 0) {
    process.stdout.write(`No matching scenarios under features/${slug}/.\n`);
    process.exitCode = 1;
    return;
  }

  // This filter is unconditional: --live and --validate cannot bypass it.
  const excludedScenarios = scenarios.flatMap((scenario) => {
    const reason = aioExclusionReason(scenario);
    return reason ? [{ scenario, reason }] : [];
  });
  scenarios = scenarios.filter((scenario) => aioExclusionReason(scenario) === undefined);
  if (limit > 0) scenarios = scenarios.slice(0, limit);

  const requirement = resolveRequirement(cfg, slug);
  const toCreate = scenarios.filter((s) => !isRealAioKey(s.aioKey));
  const toUpdate = scenarios.filter((s) => isRealAioKey(s.aioKey));
  // Live gate: a category scope gates on that category's signed ledger row;
  // an unscoped run keeps the whole-feature Design Gate check.
  const authorized = category
    ? isCategoryGateAuthorized(categoryRow)
    : isDesignGateAuthorized(slug);
  const gateScope = category ? `category ${category}` : 'feature';
  const reqLine = requirement.jiraKey
    ? `${requirement.jiraKey} (linkable — ${requirement.source})`
    : `${requirement.ref} (LABEL ONLY — no Jira key in ${requirement.source}; add one to link)`;

  // Plan artifact (always written — the durable dry-run/pre-flight evidence).
  const planDir = path.join(REPO_ROOT, '.probe', 'artifacts', slug, '25-aio-sync');
  fs.mkdirSync(planDir, { recursive: true });
  const plan: string[] = [];
  plan.push(`# AIO sync plan — ${slug}${category ? ` · ${category}` : ''}`);
  plan.push('');
  plan.push(
    `- Mode: ${live ? (validate ? 'LIVE (validate)' : 'LIVE') : 'dry-run'} · Project: ${cfg.projectKey} · Folder: ${folderFor(cfg, slug)}`,
  );
  plan.push(
    `- Scope: ${category ? `${category} (ACs ${[...(categoryRow?.acs ?? [])].join(', ') || 'none listed'})` : 'whole feature'}`,
  );
  plan.push(`- Design Gate authorized (${gateScope}, ledger): ${authorized ? 'yes' : 'NO'}`);
  plan.push(`- Requirement: ${reqLine}`);
  plan.push(
    `- ${toCreate.length} to create · ${toUpdate.length} to update · ${scenarios.length} AIO-eligible · ${excludedScenarios.length} excluded`,
  );
  plan.push('');
  // Columns must name only fields the push actually sends: AIO has no Labels
  // field, so reporting one advertised data that was always discarded.
  plan.push('| Action | Scenario | TC | ACs | AIO key | Tags | Type | Category |');
  plan.push('|--------|----------|----|----|---------|------|--------|');
  for (const s of scenarios) {
    const action = isRealAioKey(s.aioKey) ? 'update' : 'create';
    plan.push(
      `| ${action} | ${s.title} | ${s.tcId ?? '—'} | ${s.acs.join(',') || '—'} | ${s.aioKey ?? '—'} | ${aioTags(cfg, s).join(', ')} | ${aioTypeName(cfg, s) ?? '—'} | ${aioCustomFields(cfg, s)?.[0]?.value ?? 'not configured'} |`,
    );
  }
  if (excludedScenarios.length > 0) {
    plan.push('');
    plan.push('## Excluded from AIO');
    plan.push('');
    plan.push('| Scenario | TC | Reason |');
    plan.push('|----------|----|--------|');
    for (const { scenario, reason } of excludedScenarios) {
      plan.push(`| ${scenario.title} | ${scenario.tcId ?? '—'} | ${reason} |`);
    }
  }
  plan.push('');
  // Per-category runs write a category-scoped plan file so members syncing
  // different categories in parallel never clobber each other's evidence.
  const planFile = category ? `aio-sync-${category}.md` : 'aio-sync.md';
  fs.writeFileSync(path.join(planDir, planFile), plan.join('\n') + '\n');

  process.stdout.write(
    `AIO sync — ${slug}${category ? ` · ${category}` : ''} (${live ? (validate ? 'LIVE validate' : 'LIVE') : 'dry-run'})\n` +
      `  ${toCreate.length} create · ${toUpdate.length} update · ${excludedScenarios.length} API/contract/performance excluded · folder "${folderFor(cfg, slug)}"\n` +
      `  requirement: ${reqLine}\n` +
      `  → plan: .probe/artifacts/${slug}/25-aio-sync/${planFile}\n`,
  );

  if (scenarios.length === 0) {
    process.stdout.write(
      '  No AIO-eligible scenarios — API/contract/performance cases remain repository-only.\n',
    );
    return;
  }

  if (!live) {
    process.stdout.write('  Dry run — nothing pushed. Add --live (with AIO_API_TOKEN) to sync.\n');
    return;
  }

  // ---- Live guardrails (fail closed) ----
  const token = process.env.AIO_API_TOKEN;
  const email = process.env.AIO_EMAIL;
  const problems: string[] = [];
  if (!token) problems.push('AIO_API_TOKEN is not set');
  if (!cfg.apiBaseUrl.startsWith('https://')) problems.push('apiBaseUrl must be https://');
  if (/TODO|your |example/i.test(cfg.projectKey))
    problems.push('projectKey is still a placeholder');
  if (cfg.auth === 'basic' && !email) problems.push('basic auth needs AIO_EMAIL');
  if (!authorized && !validate) {
    problems.push(
      category
        ? `${category} Design Gate row for "${slug}" has no recorded human approval or allrounder bypass in docs/qa/${slug}/LEDGER.md — authorize that category row (or pass --validate for a single-case connectivity test)`
        : `Design Gate for "${slug}" has no recorded human approval or allrounder bypass — pass --validate for a single-case connectivity test`,
    );
  }
  if (problems.length > 0) {
    process.stdout.write(
      `  LIVE refused (fail-closed):\n${problems.map((p) => `    - ${p}`).join('\n')}\n`,
    );
    process.exitCode = 1;
    return;
  }
  if (!token) return; // narrowing for the type checker

  // Pre-flight connectivity (same probe as `npm run aio:check`) — never push
  // into a bad token/base/project.
  const conn = await checkConnectivity(cfg, token, email);
  if (!conn.ok) {
    process.stdout.write(`  LIVE refused — AIO connectivity check failed: ${conn.detail}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`  ✓ AIO reachable — ${conn.detail}\n`);

  if (validate) {
    process.stdout.write(
      `  ⚠ --validate: pushing ${scenarios.length} case(s) WITHOUT a recorded Design Gate approval — connectivity/payload check only. Verify the result in AIO and reconcile buildCasePayload against the Swagger.\n`,
    );
  }

  // Resolve the configured folder path to a numeric AIO folder ID (creating any
  // missing segments), so the create payload carries a real folder reference.
  const folderId = await resolveOrCreateFolderId(cfg, token, email, folderFor(cfg, slug));
  process.stdout.write(`  ✓ folder resolved — "${folderFor(cfg, slug)}" → #${folderId}\n`);

  // Tags must exist before a case may reference them, so resolve the whole set
  // once (idempotent) instead of per case.
  const tagNames = [...new Set(scenarios.flatMap((s) => aioTags(cfg, s)))].sort();
  const tagIds = await resolveTagIds(cfg, token, email, tagNames);
  // Report resolution of the names this feature needs — tagIds also holds every
  // other tag in the project, so its raw size would be a meaningless number.
  const resolved = tagNames.filter((n) => tagIds.has(n));
  const missing = tagNames.filter((n) => !tagIds.has(n));
  process.stdout.write(
    `  ✓ tags resolved — ${resolved.length}/${tagNames.length}: ${resolved.join(', ') || '(none)'}` +
      `${missing.length > 0 ? ` — UNRESOLVED, will not be sent: ${missing.join(', ')}` : ''}\n`,
  );

  let created = 0;
  let updated = 0;
  for (const s of scenarios) {
    const payload = buildCasePayload(cfg, slug, s, requirement, folderId, tagIds);
    const existing = isRealAioKey(s.aioKey) ? s.aioKey : undefined;
    const { key } = await pushCase(cfg, token, email, payload, existing);
    if (existing) {
      updated++;
      process.stdout.write(`    ~ ${key}  ${s.title}\n`);
    } else {
      created++;
      writeBackKey(s.featureFile, s.tcId, key);
      process.stdout.write(`    + ${key}  ${s.title}\n`);
    }
  }
  process.stdout.write(
    `  LIVE done — ${created} created, ${updated} updated. Review feature-file write-backs before commit.\n`,
  );
}

// Run only when invoked as the entry point. bin/probe.mjs spawns this with
// spawnSync(process.execPath, [script, ...args]), so argv[1] is this file and
// the CLI is unaffected - but the payload builders above can now be imported
// and asserted directly, instead of being verified by grepping the source for
// strings.
//
// pathToFileURL, not string concatenation: on Windows `file://` + `E:/...`
// does not equal import.meta.url and main() would never run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((err: unknown) => {
    process.stderr.write(`aio-sync failed: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  });
}
