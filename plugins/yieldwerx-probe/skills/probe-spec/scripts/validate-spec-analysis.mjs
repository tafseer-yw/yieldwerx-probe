import { readFile } from 'node:fs/promises';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node validate-spec-analysis.mjs <spec-analysis.md>');
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
const warnings = [];

const section = (name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(
    new RegExp(`^## ${escaped}\\s*$([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'mi'),
  );
  return match?.[1] ?? '';
};

const requiredSections = [
  'Summary',
  'Sources and revisions',
  'Testable categories',
  'Acceptance criteria',
  'Other things to consider',
  'Where to check each requirement',
  'Unclear wording',
  'Open questions',
  'Product and test data notes',
  'Out of scope',
];

for (const name of requiredSections) {
  if (!section(name)) errors.push(`The "${name}" section is missing.`);
}

const forbiddenRequirementSource =
  /\b(knowledgebase|knowledge base|handbook|domain map|yw:ask-yieldwerx|observed implementation|current implementation|running application)\b/i;
const sourcesText = section('Sources and revisions');
const sourceField = (label) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return sourcesText.match(new RegExp(`^[-*]\\s+\\*\\*${escaped}:\\*\\*\\s*(.+?)\\s*$`, 'mi'))?.[1];
};
const requirementAuthority = sourceField('Requirement source of truth');
const referenceContext = sourceField('Reference context consulted');
if (!requirementAuthority) {
  errors.push('Sources and revisions need "**Requirement source of truth:**".');
} else if (
  /^(?:N\/A|none|unknown|TODO)\b/i.test(requirementAuthority) ||
  forbiddenRequirementSource.test(requirementAuthority)
) {
  errors.push(
    'Requirement source of truth must name the provided PRD/story/specification, not knowledge or implementation context.',
  );
}
if (!referenceContext) {
  errors.push(
    'Sources and revisions need "**Reference context consulted:**" with a knowledge reference or N/A.',
  );
} else if (
  !/^N\/A\b/i.test(referenceContext) &&
  !(/reference context only/i.test(referenceContext) && /not a requirement/i.test(referenceContext))
) {
  errors.push(
    '"**Reference context consulted:**" must be N/A or explicitly labeled "Reference context only — not a requirement".',
  );
}

const acceptanceText = section('Acceptance criteria');
const categoryText = section('Testable categories');

const indexRows = [];
for (const line of acceptanceText.split(/\r?\n/)) {
  const match = line.match(
    /^\|\s*(AC-\d{2,})\s*\|\s*(Workflow|Simple Rule)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(active|superseded|removed)\s*\|$/i,
  );
  if (!match) continue;
  indexRows.push({
    id: match[1],
    format: match[2].toLowerCase(),
    requirement: match[3].trim(),
    source: match[4].trim(),
    status: match[7].toLowerCase(),
  });
}

const acHeader = acceptanceText.match(/^\|[^\n]+\|$/m)?.[0] ?? '';
for (const column of [
  'AC',
  'Format',
  'Requirement',
  'Source',
  'Where to check',
  'Best test level',
  'Status',
]) {
  if (!acHeader.toLowerCase().includes(column.toLowerCase())) {
    errors.push(`The Acceptance criteria table needs a "${column}" column.`);
  }
}

if (indexRows.length === 0) {
  errors.push(
    'The Acceptance criteria table has no AC rows. Use Workflow or Simple Rule in the Format column.',
  );
}

const duplicateIndexIds = [
  ...new Set(indexRows.map((row) => row.id).filter((id, index, all) => all.indexOf(id) !== index)),
];
for (const id of duplicateIndexIds) {
  errors.push(`${id} appears more than once in the Acceptance criteria table.`);
}

const validateRequirementSources = (content, idPattern) => {
  const rows = content
    .split(/\r?\n/)
    .filter((line) => /^\s*\|.*\|\s*$/.test(line))
    .map((line) =>
      line
        .trim()
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
  const header = rows.find((cells) => cells.some((cell) => /^Source$/i.test(cell)));
  const sourceIndex = header?.findIndex((cell) => /^Source$/i.test(cell)) ?? -1;
  if (sourceIndex < 0) return;
  for (const cells of rows) {
    if (!idPattern.test(cells[0] ?? '')) continue;
    const source = cells[sourceIndex] ?? '';
    if (forbiddenRequirementSource.test(source)) {
      errors.push(
        `${cells[0]} Source must cite the provided PRD/story/specification, not reference context: ${source}`,
      );
    }
  }
};

validateRequirementSources(acceptanceText, /^AC-\d{2,}$/);
validateRequirementSources(section('Unclear wording'), /^AMB-\d{2,}$/);
validateRequirementSources(section('Out of scope'), /^OOS-\d{2,}$/);

const definitions = new Map();
const definitionPattern =
  /^###\s+(AC-\d{2,})\s+[—–-]\s+(.+?)\s*$([\s\S]*?)(?=^###\s+AC-\d{2,}\s+[—–-]|^##\s|$(?![\s\S]))/gim;
for (const match of acceptanceText.matchAll(definitionPattern)) {
  const id = match[1];
  const body = match[3];
  const format = body.match(/^\*\*Format:\*\*\s*(Workflow|Simple Rule)\s*$/im)?.[1]?.toLowerCase();
  const summaryLines = [...body.matchAll(/^\*\*Summary:\*\*\s*(.*?)\s*$/gm)].map((item) =>
    item[1].trim(),
  );
  const gherkinBlocks = [...body.matchAll(/```gherkin\s*([\s\S]*?)```/gi)].map((item) =>
    item[1].trim(),
  );
  const current = definitions.get(id) ?? [];
  const definitionSource = body.match(/^\*\*Source:\*\*\s*(.*?)\s*$/im)?.[1]?.trim();
  current.push({ format, summaryLines, gherkinBlocks, definitionSource, body });
  definitions.set(id, current);
}

const vagueWords = /\b(fast|easy|properly|correctly|seamless|intuitive|user-friendly)\b/i;
const technicalWords =
  /\b(payload|persisted|persistence|DOM|locator|XPath|CSS selector|method|class|database schema|idempotent|operationalize|leverage)\b/i;

for (const row of indexRows) {
  const items = definitions.get(row.id) ?? [];
  if (row.status === 'active' && items.length !== 1) {
    errors.push(
      `${row.id} must have exactly one definition below the AC table; found ${items.length}.`,
    );
    continue;
  }
  if (items.length === 0) continue;

  const definition = items[0];
  if (!definition.format) {
    errors.push(`${row.id} needs "**Format:** Workflow" or "**Format:** Simple Rule".`);
    continue;
  }
  if (definition.format !== row.format) {
    errors.push(`${row.id} uses different formats in the table and its definition.`);
  }
  if (definition.definitionSource && forbiddenRequirementSource.test(definition.definitionSource)) {
    errors.push(
      `${row.id} definition Source must cite the provided PRD/story/specification, not reference context: ${definition.definitionSource}`,
    );
  }

  if (row.status === 'active') {
    if (definition.summaryLines.length !== 1) {
      errors.push(
        `${row.id} needs exactly one summary in the format "**Summary:** Verify that ...".`,
      );
    } else if (!/^Verify that \S/.test(definition.summaryLines[0])) {
      errors.push(`${row.id} summary must start with "Verify that ".`);
    }

    if (definition.gherkinBlocks.length !== 1) {
      errors.push(`${row.id} needs exactly one fenced gherkin block.`);
    }
  }

  const gherkin = definition.gherkinBlocks[0] ?? '';
  if (row.status === 'active' && gherkin) {
    const formatName = row.format === 'workflow' ? 'Workflow' : 'Simple Rule';
    const given = gherkin.search(/^\s*Given\s+\S/im);
    const when = gherkin.search(/^\s*When\s+\S/im);
    const then = gherkin.search(/^\s*Then\s+\S/im);
    if (given < 0) errors.push(`${row.id} ${formatName} is missing a Given step.`);
    if (when < 0) errors.push(`${row.id} ${formatName} is missing a When step.`);
    if (then < 0) errors.push(`${row.id} ${formatName} is missing a Then step.`);
    if (given >= 0 && when >= 0 && then >= 0 && !(given < when && when < then)) {
      errors.push(`${row.id} ${formatName} must use Given, then When, then Then.`);
    }

    if (definition.format === 'simple rule' && then >= 0) {
      const outcomeLines = gherkin
        .slice(then)
        .split(/\r?\n/)
        .filter((line) => /^\s*(?:Then|And|But)\s+\S/i.test(line));
      for (const outcome of outcomeLines) {
        if (!/\bmust(?:\s+not)?\b/i.test(outcome)) {
          errors.push(
            `${row.id} Simple Rule outcome must use "must" or "must not": ${outcome.trim()}`,
          );
        }
      }
    }
  }

  const vague = definition.body.match(vagueWords)?.[0];
  if (vague) {
    errors.push(
      `${row.id} uses the unclear word "${vague}". Replace it with something a QA can measure or see.`,
    );
  }
  const technical = definition.body.match(technicalWords)?.[0];
  if (technical) {
    warnings.push(
      `${row.id} uses the technical word "${technical}". Use a product word unless the approved requirement needs it.`,
    );
  }
  if (
    /automatically[\s\S]{0,80}\b(click|select|press)\b/i.test(definition.body) ||
    /\b(click|select|press)\b[\s\S]{0,80}automatically/i.test(definition.body)
  ) {
    warnings.push(
      `${row.id} mixes "automatically" with a user action. Check whether the wording is unclear.`,
    );
  }
}

for (const id of definitions.keys()) {
  if (!indexRows.some((row) => row.id === id)) {
    errors.push(`${id} has a definition but is missing from the AC table.`);
  }
}

for (const row of indexRows) {
  const count = [...categoryText.matchAll(new RegExp(`\\b${row.id}\\b`, 'g'))].length;
  if (count !== 1) {
    errors.push(`${row.id} must appear in exactly one testable category; found ${count}.`);
  }
}

const catHeader = categoryText.match(/^\|[^\n]+\|$/m)?.[0] ?? '';
for (const column of [
  'ACs',
  'Where to check',
  'Product terms',
  'Test data needed',
  'How to know the correct result',
  'Difficulty',
]) {
  if (!catHeader.toLowerCase().includes(column.toLowerCase())) {
    errors.push(`The Testable categories table needs a "${column}" column.`);
  }
}

const productDataText = section('Product and test data notes');
for (const field of [
  'Feature group',
  'Items and IDs',
  'Required order and dependencies',
  'Where to check results',
]) {
  if (!productDataText.toLowerCase().includes(field.toLowerCase())) {
    errors.push(`Product and test data notes need "${field}".`);
  }
}

const questionText = section('Open questions');
if (/\bQ-\d{2,}\b/.test(questionText)) {
  for (const field of ['Who can answer', 'Suggested answer', 'Why', 'How sure', 'Status']) {
    if (!new RegExp(field, 'i').test(questionText)) {
      errors.push(`The Open questions table needs a "${field}" column.`);
    }
  }
}

const outOfScopeText = section('Out of scope');
if (/\bOOS-\d{2,}\b/.test(outOfScopeText)) {
  for (const field of ['Source', 'Type']) {
    if (!new RegExp(field, 'i').test(outOfScopeText)) {
      errors.push(`The Out of scope table needs a "${field}" column.`);
    }
  }
} else if (!/none declared in source/i.test(outOfScopeText)) {
  errors.push('Out of scope must use OOS-NN rows or say "None declared in source."');
}

if (/Recorded answer/i.test(questionText)) {
  warnings.push(
    'Use "Suggested answer" or cite the confirmed decision instead of "Recorded answer".',
  );
}
if (/TODO\((?:spec|domain)\)/i.test(outOfScopeText)) {
  errors.push('Do not put TODO(spec) or TODO(domain) in Out of scope.');
}

for (const message of errors) console.error(`ERROR: ${message}`);
for (const message of warnings) console.warn(`WARN: ${message}`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
