/**
 * Requirements-coverage report generator — "how much of the feature do our
 * cases and runs actually cover?"
 *
 * WHY: c8 (`npm run coverage:code`) measures which application CODE ran — it
 * cannot tell you how much of the FEATURE's requirements are covered. This
 * tool answers that by joining three artifacts the framework already produces:
 *
 *   requirement universe   ← spec-analysis.md (AC-NN / CAT-NN tables), or the
 *                            committed PRD headings as a fallback
 *   design + automation    ← the `# Traceability: TC-… / AC-NN / <AIO>` comment
 *                            and lifecycle tags on every scenario in features/
 *   execution + pass/fail  ← reports/junit.xml AND reports/allure-results/*.json
 *
 * It emits a coverage MATRIX (per acceptance criterion) with a four-rung
 * ladder — design → automation → execution → passing — rolled up to category
 * and feature. A single number hides whether a gap is undesigned, unautomated,
 * or failing; the ladder makes it actionable. Output is a committed evidence
 * artifact the PROBE gates consume (Design Gate: design 100%; Merge Gate:
 * automation + passing; Ops Gate: execution + passing).
 *
 * Join heuristic (v1): scenarios carry the AC in a comment, not in runtime
 * metadata, so results are matched to scenarios by scenario TITLE (junit
 * `<Feature› Scenario>` last segment; allure result `name`). Scenario Outline
 * examples are matched by title prefix and aggregated. Rename-proofing the join
 * (an `@AC:` tag surfaced as an Allure label) is a documented future option.
 *
 * Run:  npm run coverage:req -- <feature-slug>
 *       (run your tests first so junit/allure reflect the latest execution)
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = process.cwd();
const TYPE_TAGS = ['@positive', '@functional', '@negative', '@edge'] as const;

type ExecStatus = 'passed' | 'failed' | 'broken' | 'skipped';

interface AcDef {
  id: string;
  description: string;
}
interface CatDef {
  id: string;
  name: string;
  acs: string[];
}
interface Scenario {
  file: string;
  featureName: string;
  title: string;
  isOutline: boolean;
  tags: string[];
  tcId?: string;
  acs: string[];
}
interface ExecEntry {
  status: ExecStatus;
  source: 'junit' | 'allure' | 'both';
}
interface AcCoverage {
  id: string;
  description: string;
  tcIds: string[];
  types: string[];
  designed: number;
  automated: number;
  executed: number;
  passing: number;
  failing: number;
  status: string;
}

/** Normalize a scenario title for tolerant title-based joining. */
const norm = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Minimal XML entity decode for junit testcase names. */
const decode = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

/** Recursively collect `.feature` files under a directory. */
function walkFeatures(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFeatures(full));
    else if (entry.name.endsWith('.feature')) out.push(full);
  }
  return out;
}

/**
 * Requirement universe (denominator). Prefers the distilled spec-analysis.md
 * (canonical CAT/AC tables); falls back to the committed PRD's `### AC-NN`
 * headings when the (gitignored) spec artifact is absent (e.g. a fresh clone).
 */
function loadRequirements(slug: string): {
  acs: AcDef[];
  cats: CatDef[];
  source: string;
} {
  const specPath = path.join(REPO_ROOT, '.probe', 'artifacts', slug, '10-spec', 'spec-analysis.md');
  if (fs.existsSync(specPath)) {
    const md = fs.readFileSync(specPath, 'utf-8');
    const acs: AcDef[] = [];
    const cats: CatDef[] = [];
    for (const line of md.split(/\r?\n/)) {
      const hybridAc = line.match(
        /^\|\s*(AC-[\w-]+)\s*\|\s*(?:Workflow|Simple Rule)\s*\|\s*([^|]+?)\s*\|/i,
      );
      const legacyAc = line.match(/^\|\s*(AC-[\w-]+)\s*\|\s*([^|]+?)\s*\|/);
      if (hybridAc?.[1] && hybridAc[2]) {
        acs.push({ id: hybridAc[1], description: hybridAc[2] });
      } else if (legacyAc?.[1] && legacyAc[2] && !/^-+$/.test(legacyAc[2])) {
        acs.push({ id: legacyAc[1], description: legacyAc[2] });
      }
      const cat = line.match(/^\|\s*(CAT-[\w-]+)\s*\|\s*([^|]+?)\s*\|\s*([^|]*)\|/);
      if (cat && cat[1] && cat[2]) {
        const catAcs = [...(cat[3] ?? '').matchAll(/AC-[\w-]+/g)].map((m) => m[0]);
        cats.push({ id: cat[1], name: cat[2].trim(), acs: catAcs });
      }
    }
    if (acs.length > 0) return { acs, cats, source: `spec-analysis.md (.probe/…/${slug}/10-spec)` };
  }
  const prdPath = path.join(REPO_ROOT, 'docs', 'PRDs', `${slug}.md`);
  if (fs.existsSync(prdPath)) {
    const acs: AcDef[] = [];
    for (const line of fs.readFileSync(prdPath, 'utf-8').split(/\r?\n/)) {
      const m = line.match(/^#{2,4}\s+(AC-[\w-]+)\s*[—–-]\s*(.+?)\s*$/);
      if (m && m[1] && m[2]) acs.push({ id: m[1], description: m[2] });
    }
    if (acs.length > 0)
      return { acs, cats: [], source: `docs/PRDs/${slug}.md (spec-analysis absent)` };
  }
  return { acs: [], cats: [], source: 'none (no spec-analysis or PRD found)' };
}

/** Parse every scenario in a feature file with its effective tags + traceability. */
function parseFeatureFile(file: string): Scenario[] {
  const rel = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);
  const scenarios: Scenario[] = [];
  let featureTags: string[] = [];
  let featureName = '';
  let pendingTags: string[] = [];
  // Non-nullable accumulators: a scenario may take its id from a @TC- tag and its
  // ACs from a separate `# AC:` comment, so both are carried forward until the
  // Scenario line consumes them. Reset via clearPending().
  let pendingTcId: string | undefined;
  let pendingAcs: string[] = [];
  const clearPending = (): void => {
    pendingTcId = undefined;
    pendingAcs = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') continue;
    if (line.startsWith('#')) {
      // Current format: `# AC: AC-01,AC-02` — the TC id lives in a @TC- tag/title.
      const a = line.match(/^#\s*AC:\s*((?:AC-[\w-]+\s*,?\s*)+)/);
      if (a?.[1]) {
        const acs = [...a[1].matchAll(/AC-[\w-]+/g)].map((m) => m[0]);
        pendingAcs = acs;
        continue;
      }
      // Legacy format (pre-2026-07 feature files): `# Traceability: TC-… / AC-NN / <AIO>`.
      const t = line.match(/Traceability:\s*(TC-[\w-]+)?\s*\/?\s*((?:AC-[\w-]+\s*,?\s*)+)?/);
      if (t) {
        const acs = t[2] ? [...t[2].matchAll(/AC-[\w-]+/g)].map((m) => m[0]) : [];
        pendingTcId = t[1] ?? pendingTcId;
        pendingAcs = acs;
      }
      continue;
    }
    if (line.startsWith('@')) {
      const tags = line.split(/\s+/).filter((w) => w.startsWith('@'));
      pendingTags.push(...tags);
      // Current format carries the case id as a `@TC-<slug>-NNN` tag. Never let it
      // override a legacy Traceability comment that already supplied one.
      const idTag = tags.find((w) => /^@TC-[\w-]+-\d+$/.test(w));
      const durableExternalTag = tags.find((w) => /^@[A-Z][A-Z0-9]*-TC-\d+$/.test(w));
      if (idTag && !pendingTcId) pendingTcId = idTag.slice(1);
      if (durableExternalTag && !pendingTcId) pendingTcId = durableExternalTag.slice(1);
      continue;
    }
    if (line.startsWith('Feature:')) {
      featureName = line.slice('Feature:'.length).trim();
      featureTags = pendingTags;
      pendingTags = [];
      clearPending();
      continue;
    }
    if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
      const isOutline = line.startsWith('Scenario Outline:');
      const title = line.replace(/^Scenario(?: Outline)?:/, '').trim();
      scenarios.push({
        file: rel,
        featureName,
        title,
        isOutline,
        tags: [...featureTags, ...pendingTags],
        tcId: pendingTcId,
        acs: pendingAcs,
      });
      pendingTags = [];
      clearPending();
      continue;
    }
    // Rule/Background/steps/tables/Examples end a tag+trace block that never
    // reached a scenario — clear so it can't leak onto a later scenario.
    pendingTags = [];
    clearPending();
  }
  return scenarios;
}

/** Build the execution index from junit.xml then reports/allure-results (allure wins). */
function loadExecutionIndex(): Map<string, ExecEntry> {
  const index = new Map<string, ExecEntry>();

  const junitPath = path.join(REPO_ROOT, 'reports', 'junit.xml');
  if (fs.existsSync(junitPath)) {
    const xml = fs.readFileSync(junitPath, 'utf-8');
    for (const block of xml.split('<testcase').slice(1)) {
      const nameMatch = block.match(/name="([^"]*)"/);
      if (!nameMatch || nameMatch[1] === undefined) continue;
      const body = block.split('</testcase>')[0] ?? '';
      const status: ExecStatus = /<failure|<error/.test(body)
        ? 'failed'
        : /<skipped/.test(body)
          ? 'skipped'
          : 'passed';
      const title = decode(nameMatch[1]).split(' › ').pop() ?? '';
      if (title) index.set(norm(title), { status, source: 'junit' });
    }
  }

  const allureDir = path.join(REPO_ROOT, 'reports', 'allure-results');
  if (fs.existsSync(allureDir)) {
    const latest = new Map<string, { status: ExecStatus; stop: number }>();
    for (const f of fs.readdirSync(allureDir)) {
      if (!f.endsWith('-result.json')) continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(allureDir, f), 'utf-8')) as {
          name?: string;
          status?: string;
          stop?: number;
        };
        if (!j.name || !j.status) continue;
        const key = norm(j.name);
        const stop = typeof j.stop === 'number' ? j.stop : 0;
        const prev = latest.get(key);
        if (!prev || stop >= prev.stop) latest.set(key, { status: j.status as ExecStatus, stop });
      } catch {
        // skip malformed/partial result files
      }
    }
    for (const [key, { status }] of latest) {
      index.set(key, { status, source: index.has(key) ? 'both' : 'allure' });
    }
  }
  return index;
}

/** Look up a scenario's execution status, with Scenario-Outline prefix aggregation. */
function statusFor(scenario: Scenario, index: Map<string, ExecEntry>): ExecEntry | undefined {
  const key = norm(scenario.title);
  const exact = index.get(key);
  if (exact) return exact;
  const matches = [...index.entries()].filter(([k]) => k.startsWith(key));
  if (matches.length === 0) return undefined;
  const statuses = matches.map(([, v]) => v.status);
  const status: ExecStatus = statuses.includes('failed')
    ? 'failed'
    : statuses.includes('broken')
      ? 'broken'
      : statuses.includes('passed')
        ? 'passed'
        : 'skipped';
  return { status, source: matches[0]?.[1].source ?? 'allure' };
}

const pct = (n: number, d: number): number => (d === 0 ? 0 : Math.round((n / d) * 100));

/** Compute per-AC coverage from the requirement set, scenarios, and results. */
function computeAcCoverage(
  acs: AcDef[],
  scenarios: Scenario[],
  index: Map<string, ExecEntry>,
): AcCoverage[] {
  return acs.map((ac) => {
    const covering = scenarios.filter((s) => s.acs.includes(ac.id));
    const types = TYPE_TAGS.filter((t) => covering.some((s) => s.tags.includes(t))).map((t) =>
      t.slice(1),
    );
    let automated = 0;
    let executed = 0;
    let passing = 0;
    let failing = 0;
    for (const s of covering) {
      if (s.tags.includes('@automated')) automated++;
      const st = statusFor(s, index);
      if (st) {
        executed++;
        if (st.status === 'passed') passing++;
        if (st.status === 'failed' || st.status === 'broken') failing++;
      }
    }
    let status: string;
    if (covering.length === 0) status = '⛔ GAP — no case';
    else if (failing > 0) status = '❌ failing';
    else if (passing > 0) status = '✅ passing';
    else if (automated > 0) status = '⚙ automated, not run';
    else status = '📝 designed (manual)';
    return {
      id: ac.id,
      description: ac.description,
      tcIds: covering.map((s) => s.tcId ?? '(no TC)'),
      types,
      designed: covering.length,
      automated,
      executed,
      passing,
      failing,
      status,
    };
  });
}

/** Render the committed markdown report. */
function renderMarkdown(
  slug: string,
  source: string,
  acCov: AcCoverage[],
  cats: CatDef[],
  scenarios: Scenario[],
  orphansNoAc: Scenario[],
  unknownAc: { scenario: Scenario; ac: string }[],
): string {
  const total = acCov.length;
  const designPct = pct(acCov.filter((a) => a.designed > 0).length, total);
  const autoPct = pct(acCov.filter((a) => a.automated > 0).length, total);
  const execPct = pct(acCov.filter((a) => a.executed > 0).length, total);
  const passPct = pct(acCov.filter((a) => a.passing > 0 && a.failing === 0).length, total);
  const date = new Date().toISOString().slice(0, 10);

  const scn = scenarios.length;
  const autoN = scenarios.filter((s) => s.tags.includes('@automated')).length;
  const visN = scenarios.filter((s) => s.tags.includes('@visual')).length;

  const L: string[] = [];
  L.push(`# Requirements coverage — ${slug}`);
  L.push('');
  L.push(`> Generated by \`npm run coverage:req\` on ${date}. Denominator: ${source}.`);
  L.push('> Report-only evidence — join is title-based (see the generator header).');
  L.push('');
  L.push('## Coverage ladder (by acceptance criterion)');
  L.push('');
  L.push(`- **Design coverage:** ${designPct}% — ACs with ≥1 designed case`);
  L.push(`- **Automation coverage:** ${autoPct}% — ACs with ≥1 \`@automated\` case`);
  L.push(`- **Execution coverage:** ${execPct}% — ACs with ≥1 case that ran`);
  L.push(`- **Passing/verified coverage:** ${passPct}% — ACs green (≥1 pass, 0 fail)`);
  L.push('');
  L.push(
    `Scenarios: ${scn} total · ${autoN} automated · ${scn - autoN} manual-only · ${visN} visual.`,
  );
  L.push('');
  L.push('## Matrix');
  L.push('');
  L.push('| AC | Requirement | Cases | Types | Automated | Executed | Passing | Status |');
  L.push('|----|-------------|-------|-------|-----------|----------|---------|--------|');
  for (const a of acCov) {
    const cases = a.tcIds.length ? a.tcIds.join(', ') : '—';
    const types = a.types.length ? a.types.join(', ') : '—';
    L.push(
      `| ${a.id} | ${a.description} | ${cases} | ${types} | ${a.automated}/${a.designed} | ${a.executed}/${a.designed} | ${a.passing}/${a.designed} | ${a.status} |`,
    );
  }
  L.push('');

  if (cats.length > 0) {
    L.push('## By category');
    L.push('');
    L.push('| CAT | Name | ACs | Design | Passing |');
    L.push('|-----|------|-----|--------|---------|');
    for (const c of cats) {
      const members = acCov.filter((a) => c.acs.includes(a.id));
      const d = pct(members.filter((a) => a.designed > 0).length, members.length);
      const p = pct(members.filter((a) => a.passing > 0 && a.failing === 0).length, members.length);
      L.push(`| ${c.id} | ${c.name} | ${c.acs.join(', ')} | ${d}% | ${p}% |`);
    }
    L.push('');
  }

  const gaps = acCov.filter((a) => a.designed === 0);
  if (gaps.length > 0) {
    L.push('## ⛔ Uncovered requirements (no designed case)');
    L.push('');
    for (const g of gaps) L.push(`- **${g.id}** — ${g.description}`);
    L.push('');
  }
  if (orphansNoAc.length > 0) {
    L.push('## ⚠ Scenarios missing an AC in their traceability comment');
    L.push('');
    for (const s of orphansNoAc) L.push(`- \`${s.tcId ?? s.title}\` — ${s.file}`);
    L.push('');
  }
  if (unknownAc.length > 0) {
    L.push('## ⚠ Scenarios referencing an AC not in the requirement set');
    L.push('');
    for (const u of unknownAc)
      L.push(`- \`${u.scenario.tcId ?? u.scenario.title}\` → **${u.ac}** (not in denominator)`);
    L.push('');
  }
  return L.join('\n') + '\n';
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const slug = process.argv[2];
  if (!slug) {
    const dirs = fs.existsSync(path.join(REPO_ROOT, 'features'))
      ? fs
          .readdirSync(path.join(REPO_ROOT, 'features'), { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
      : [];
    process.stdout.write(
      'Usage: npm run coverage:req -- <feature-slug>\n' +
        `Available feature folders: ${dirs.join(', ') || '(none)'}\n`,
    );
    process.exitCode = 1;
  } else {
    const { acs, cats, source } = loadRequirements(slug);
    if (acs.length === 0) {
      process.stdout.write(
        `No acceptance criteria found for "${slug}" (looked in spec-analysis.md and docs/PRDs/${slug}.md).\n` +
          'Requirements coverage needs a denominator — run Spec Probe or add a PRD with `### AC-NN` headings.\n',
      );
      process.exitCode = 1;
    } else {
      const scenarios = walkFeatures(path.join(REPO_ROOT, 'features', slug)).flatMap(
        parseFeatureFile,
      );
      const index = loadExecutionIndex();
      const acCov = computeAcCoverage(acs, scenarios, index);
      const acIds = new Set(acs.map((a) => a.id));
      const orphansNoAc = scenarios.filter((s) => s.acs.length === 0);
      const unknownAc = scenarios.flatMap((s) =>
        s.acs.filter((a) => !acIds.has(a)).map((ac) => ({ scenario: s, ac })),
      );

      const outDir = path.join(REPO_ROOT, 'docs', 'qa', slug);
      fs.mkdirSync(outDir, { recursive: true });
      const md = renderMarkdown(slug, source, acCov, cats, scenarios, orphansNoAc, unknownAc);
      fs.writeFileSync(path.join(outDir, 'coverage.md'), md);
      fs.writeFileSync(
        path.join(outDir, 'coverage.json'),
        JSON.stringify(
          {
            feature: slug,
            denominatorSource: source,
            generated: new Date().toISOString().slice(0, 10),
            totals: {
              acs: acCov.length,
              designPct: pct(acCov.filter((a) => a.designed > 0).length, acCov.length),
              automationPct: pct(acCov.filter((a) => a.automated > 0).length, acCov.length),
              executionPct: pct(acCov.filter((a) => a.executed > 0).length, acCov.length),
              passingPct: pct(
                acCov.filter((a) => a.passing > 0 && a.failing === 0).length,
                acCov.length,
              ),
              scenarios: scenarios.length,
              automatedScenarios: scenarios.filter((s) => s.tags.includes('@automated')).length,
            },
            acs: acCov,
            categories: cats,
            gaps: acCov.filter((a) => a.designed === 0).map((a) => a.id),
            orphansMissingAc: orphansNoAc.map((s) => s.tcId ?? s.title),
            unknownAc: unknownAc.map((u) => ({
              tc: u.scenario.tcId ?? u.scenario.title,
              ac: u.ac,
            })),
          },
          null,
          2,
        ) + '\n',
      );

      const t = acCov.length;
      process.stdout.write(
        `Requirements coverage — ${slug} (${source})\n` +
          `  Design ${pct(acCov.filter((a) => a.designed > 0).length, t)}% · ` +
          `Automation ${pct(acCov.filter((a) => a.automated > 0).length, t)}% · ` +
          `Execution ${pct(acCov.filter((a) => a.executed > 0).length, t)}% · ` +
          `Passing ${pct(acCov.filter((a) => a.passing > 0 && a.failing === 0).length, t)}%\n` +
          `  ${acCov.filter((a) => a.designed === 0).length} uncovered AC · ` +
          `${orphansNoAc.length} scenario(s) missing an AC · ${unknownAc.length} unknown-AC ref(s)\n` +
          `  → docs/qa/${slug}/coverage.md + coverage.json\n`,
      );
    }
  }
}
