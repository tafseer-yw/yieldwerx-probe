import { readFile } from 'node:fs/promises';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node validate-spec-reconciliation.mjs <spec-reconciliation.md>');
  process.exit(2);
}

let text;
try {
  text = await readFile(filePath, 'utf8');
} catch (error) {
  console.error(`ERROR: Cannot read ${filePath}: ${error.message}`);
  process.exit(2);
}

const errors = [];

const section = (name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(
    new RegExp(`^## ${escaped}\\s*$([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'mi'),
  );
  return match?.[1] ?? '';
};

const field = (content, label) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return content.match(new RegExp(`^- \\*\\*${escaped}:\\*\\*\\s*(.+?)\\s*$`, 'mi'))?.[1];
};

for (const name of [
  'Summary',
  'Sources compared',
  'Change register',
  'Downstream impact',
  'Validation',
]) {
  if (!section(name)) errors.push(`The "${name}" section is missing.`);
}

const summaryText = section('Summary');
const mode = field(summaryText, 'Mode');
const result = field(summaryText, 'Result');

if (!['migrate-format', 'reconcile'].includes(mode)) {
  errors.push('Summary needs "**Mode:** migrate-format" or "**Mode:** reconcile".');
}
if (!['no-change', 'format-only', 'substantive', 'blocked'].includes(result)) {
  errors.push(
    'Summary needs "**Result:** no-change", "format-only", "substantive", or "blocked".',
  );
}
for (const label of ['Feature', 'Run date']) {
  if (!field(summaryText, label)) errors.push(`Summary needs "**${label}:**".`);
}
const runDate = field(summaryText, 'Run date');
if (runDate && !/^\d{4}-\d{2}-\d{2}$/.test(runDate)) {
  errors.push('Run date must use YYYY-MM-DD.');
}

const sourcesText = section('Sources compared');
for (const label of [
  'Existing analysis',
  'Existing analysis revision',
  'Existing analysis SHA-256',
  'Approved source',
  'Approved source revision',
]) {
  if (!field(sourcesText, label)) errors.push(`Sources compared needs "**${label}:**".`);
}
const analysisHash = field(sourcesText, 'Existing analysis SHA-256');
if (analysisHash && !/^[a-f0-9]{64}$/.test(analysisHash)) {
  errors.push('Existing analysis SHA-256 must be 64 lowercase hexadecimal characters.');
}

const changeText = section('Change register');
const tableLines = changeText.split(/\r?\n/).filter((line) => /^\s*\|.*\|\s*$/.test(line));
const tableRows = tableLines.map((line) =>
  line
    .trim()
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim()),
);
const headerIndex = tableRows.findIndex(
  (cells) =>
    cells.length >= 6 &&
    cells[0].toLowerCase() === 'item' &&
    cells[1].toLowerCase() === 'change',
);
if (headerIndex < 0) {
  errors.push(
    'Change register needs the columns Item, Change, Old source, New source, Reason, and Downstream action.',
  );
}

const allowedChanges = new Set([
  'unchanged',
  'format-only',
  'added',
  'removed',
  'meaning-changed',
  'superseded',
]);
const itemId = '(?:AC|CAT|AMB|Q|DER|OOS)-\\d{2,}';
const itemPattern = new RegExp(`^${itemId}(?:\\s*(?:→|->)\\s*${itemId})?$`);
const changeRows =
  headerIndex < 0
    ? []
    : tableRows
        .slice(headerIndex + 1)
        .filter(
          (cells) =>
            cells.length >= 6 &&
            !cells.every((cell) => /^:?-{3,}:?$/.test(cell) || cell.length === 0),
        );

if (changeRows.length === 0) errors.push('Change register needs at least one item row.');

for (const cells of changeRows) {
  const [item, change, oldSource, newSource, reason, downstreamAction] = cells;
  if (!itemPattern.test(item)) {
    errors.push(`Change register item must use a stable ID or old → new IDs: ${item}`);
  }
  if (!allowedChanges.has(change)) {
    errors.push(`Change register has an unsupported change "${change}" for ${item}.`);
  }
  const hasArrow = /(?:→|->)/.test(item);
  if (['meaning-changed', 'superseded'].includes(change) && !hasArrow) {
    errors.push(`${item} ${change} must name both old and new IDs with old → new.`);
  }
  if (!['meaning-changed', 'superseded'].includes(change) && hasArrow) {
    errors.push(`${item} may use old → new only for meaning-changed or superseded.`);
  }
  if (![oldSource, newSource, reason, downstreamAction].every(Boolean)) {
    errors.push(`${item} needs old source, new source, reason, and downstream action.`);
  }
}

const changes = changeRows.map((cells) => cells[1]);
const hasSubstantiveChange = changes.some((change) =>
  ['added', 'removed', 'meaning-changed', 'superseded'].includes(change),
);
const hasFormatChange = changes.includes('format-only');

if (
  mode === 'migrate-format' &&
  changes.some((change) => !['unchanged', 'format-only'].includes(change))
) {
  errors.push('migrate-format may contain only unchanged or format-only change rows.');
}
if (mode === 'migrate-format' && !['no-change', 'format-only', 'blocked'].includes(result)) {
  errors.push('migrate-format result must be no-change, format-only, or blocked.');
}
if (result === 'substantive' && !hasSubstantiveChange) {
  errors.push('A substantive result needs at least one substantive change row.');
}
if (hasSubstantiveChange && !['substantive', 'blocked'].includes(result)) {
  errors.push('A substantive change row needs a substantive or blocked result.');
}
if (result === 'format-only' && !hasFormatChange) {
  errors.push('A format-only result needs at least one format-only change row.');
}

const impactText = section('Downstream impact');
for (const label of [
  'Cases',
  'Case Audit',
  'Design Gate',
  'Scripts and run evidence',
  'External case sync',
]) {
  if (!field(impactText, label)) errors.push(`Downstream impact needs "**${label}:**".`);
}

const validationText = section('Validation');
for (const label of [
  'Spec analysis validator',
  'Reconciliation validator',
  'Unresolved questions',
]) {
  if (!field(validationText, label)) errors.push(`Validation needs "**${label}:**".`);
}
for (const label of ['Spec analysis validator', 'Reconciliation validator']) {
  const value = field(validationText, label);
  if (value && !/^(?:pass|fail)$/.test(value)) {
    errors.push(`${label} must be "pass" or "fail".`);
  }
}
if (
  result &&
  result !== 'blocked' &&
  ['Spec analysis validator', 'Reconciliation validator'].some(
    (label) => field(validationText, label) !== 'pass',
  )
) {
  errors.push('A completed reconciliation needs both validators to pass.');
}

for (const message of errors) console.error(`ERROR: ${message}`);
console.log(`${errors.length} error(s)`);
process.exit(errors.length ? 1 : 0);
