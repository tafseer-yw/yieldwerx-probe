/**
 * Plain-language enforcement, shared by every PROBE document validator.
 *
 * The rules were advisory prose for four minor versions and drifted every time:
 * documents shortened the product's own control names, coined acronyms that
 * exist nowhere in the product, and restated one-line requirements as
 * architecture. A reader then cannot find the control being described, and
 * cannot tell whether a difference in wording is a typo or a different thing.
 *
 * This module is the single implementation behind `validate-spec-analysis.mjs`
 * (Spec Probe) and `validate-prd.mjs` (Requirements Forge). One implementation
 * on purpose: the user's core demand is that a PRD, its spec analysis, and the
 * cases derived from it read as ONE language, and two lexical checkers would
 * drift exactly the way two prose rulebooks did.
 *
 * Authority and reasoning: skills/probe-spec/references/plain-language.md.
 */

/** Words that promise nothing a tester can measure or see. */
export const vagueWords = /\b(fast|easy|properly|correctly|seamless|intuitive|user-friendly)\b/i;

/** Implementation words that do not belong in a requirement's prose. */
export const technicalWords =
  /\b(payload|persisted|persistence|DOM|locator|XPath|CSS selector|method|class|database schema|idempotent|operationalize|leverage)\b/i;

/**
 * Capital-letter runs that are never an invented acronym.
 *
 * Process ids, units, file/data formats, and the handful of universal technical
 * names a requirement can legitimately be about. Everything NOT on this list must
 * earn its short form with a `## Terms` row citing the source that uses it.
 */
export const exemptAcronyms = new Set([
  // process ids and structure
  'AC',
  'AMB',
  'OOS',
  'CAT',
  'DER',
  'TC',
  'US',
  'PRD',
  'ID',
  'IDS',
  'TODO',
  'N',
  'NN',
  'A',
  'I',
  // units
  'MB',
  'KB',
  'GB',
  'TB',
  'MS',
  'HZ',
  'RPM',
  'DPI',
  'PX',
  'C',
  'F',
  // file and data formats
  'CSV',
  'TSV',
  'JSON',
  'XML',
  'YAML',
  'PDF',
  'PNG',
  'JPEG',
  'JPG',
  'SVG',
  'GIF',
  'ZIP',
  'STDF',
  'ATDF',
  'WAT',
  'GDSII',
  'XLSX',
  'TXT',
  // universal technical names a requirement can be about
  'API',
  'URL',
  'URI',
  'HTTP',
  'HTTPS',
  'UI',
  'UX',
  'SQL',
  'UTC',
  'SLA',
  'SLO',
  'CI',
  'CD',
  'REST',
  'CRUD',
  'PII',
  'PHI',
  // statistics and test engineering — the real words for the things
  'CP',
  'CPK',
  'PPK',
  'SPC',
  'PAT',
  'GRR',
  'DUT',
  'ATE',
  'LSL',
  'USL',
  'UCL',
  'LCL',
]);

/**
 * Abbreviations that must be written out. `ID` is universal and exempt above.
 *
 * Kept in step with Rule 3 of plain-language.md, which claims this list enforces
 * it — a documented rule the checker does not apply is worse than no rule, because
 * it reads as enforced.
 *
 * A few entries here are legitimate words in some products (`admin`, `info`,
 * `spec`, `temp`). Those are cleared by a `## Terms` row, exactly like an acronym:
 * if the source uses the short form, declare it and it is allowed.
 */
export const bannedAbbreviations =
  /\b(configs?|auth|vals?|msgs?|qty|avg|nums?|calcs?|envs?|params?|props?|attrs?|dirs?|repos?|temp|init|dups?|seq|hrs|mins|secs|pct|specs?|docs?|admins?|info)\b/i;

/**
 * Every capital-letter run and camelCase identifier in a piece of prose, with the
 * process-id forms (`AC-01`, `US-03`, `TC-slug-007`, `YWPD-TC-1202`) removed
 * first so an id never reads as an invented acronym.
 */
export function acronymTokens(text) {
  const withoutIds = text
    .replace(/\b(?:AC|AMB|OOS|CAT|DER|Q|TC|US)-[\w-]+/gi, ' ')
    .replace(/\b[A-Z]{2,}-[A-Z]{2,}-\d+\b/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    // A Gherkin placeholder and its Examples header are structure, not prose, and
    // `<fileType>` has no long form to write out — flagging it would be an error
    // with no way to satisfy it.
    .replace(/<[^<>\s]+>/g, ' ');
  const tokens = new Set();
  for (const match of withoutIds.matchAll(/\b[A-Z][A-Z0-9]{1,7}s?\b/g)) {
    const bare = match[0].replace(/s$/, '').toUpperCase();
    if (!exemptAcronyms.has(bare)) tokens.add(match[0]);
  }
  for (const match of withoutIds.matchAll(/\b[a-z]+[A-Z][A-Za-z]*\b/g)) {
    tokens.add(match[0]);
  }
  return [...tokens];
}

/**
 * Parse a `## Terms` section's table into the allowlist it declares.
 *
 * Returns the declared terms (upper-cased, whole terms and their individual
 * words) plus what the caller needs to validate the table's shape. A term listed
 * here may appear in its source form anywhere in the document; that is the whole
 * point of requiring the table.
 */
export function parseTermsTable(termsText) {
  const declaredTerms = new Set();
  for (const line of termsText.split(/\r?\n/)) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line
      .trim()
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 3) continue;
    const term = cells[0];
    if (!term || /^-+$/.test(term) || /^Term\b/i.test(term)) continue;
    declaredTerms.add(term.toUpperCase());
    for (const word of term.split(/\s+/)) declaredTerms.add(word.toUpperCase());
  }
  // The header is the first pipe row, matched with the SAME leniency as hasTable
  // (leading indentation, trailing whitespace) — otherwise an indented or
  // trailing-space header yields header='' and the caller silently skips its
  // required-column checks.
  const header = termsText.match(/^\s*\|.*\|\s*$/m)?.[0]?.trim() ?? '';
  return { declaredTerms, header, hasTable: /^\s*\|/m.test(termsText) };
}

/**
 * The lexical findings for one piece of prose: invented acronyms and banned
 * abbreviations, each cleared by a Terms declaration. The caller owns severity
 * and message wording — this function owns only the detection, so the two
 * validators cannot disagree about what counts.
 */
export function plainLanguageIssues(text, declaredTerms) {
  const issues = [];
  for (const token of acronymTokens(text)) {
    if (declaredTerms.has(token.toUpperCase())) continue;
    issues.push({ type: 'acronym', token });
  }
  const abbreviation = text.match(bannedAbbreviations)?.[0];
  if (abbreviation && !declaredTerms.has(abbreviation.toUpperCase())) {
    issues.push({ type: 'abbreviation', token: abbreviation });
  }
  return issues;
}

/**
 * Whether a technical-word hit in `text` survives the Terms allowlist.
 *
 * `technicalWords` includes a few overloaded English words (`class`, `method`)
 * that have legitimate non-code meanings — "equivalence class", "payment
 * method". Treating every one as an un-escapable hard error blocks correct
 * prose with no way out. A `## Terms` declaration is that way out: if the
 * author consciously declared the word for their readers, it is intentional
 * vocabulary, exactly as a declared acronym is. Returns the offending word to
 * flag, or null when there is none or it was declared.
 */
export function technicalWordIssue(text, declaredTerms) {
  const hit = text.match(technicalWords)?.[0];
  if (!hit) return null;
  return declaredTerms.has(hit.toUpperCase()) ? null : hit;
}

/**
 * A cheap readability floor: the average sentence length of a prose block.
 * Long average sentences are the strongest single signal that a document was
 * written for its author rather than its reader. Callers warn above ~28.
 */
export function averageSentenceLength(text) {
  const prose = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/`[^`]*`/g, ' ');
  const sentences = prose
    // A bullet, heading, or blank line ends a sentence even without terminal
    // punctuation — otherwise a bullet list reads as one enormous sentence and
    // the floor fires on well-structured documents.
    .split(/\n\s*\n|\n(?=\s*(?:[-*#>|]|\d+\.))/)
    .flatMap((block) => block.split(/(?<=[.!?])\s+(?=[A-Z"'`(])/))
    .map((s) => s.replace(/^\s*(?:[-*>]|\d+\.)\s*/, '').trim())
    .filter((s) => s.split(/\s+/).length >= 3);
  if (sentences.length === 0) return 0;
  const words = sentences.reduce((sum, s) => sum + s.split(/\s+/).filter(Boolean).length, 0);
  return words / sentences.length;
}
