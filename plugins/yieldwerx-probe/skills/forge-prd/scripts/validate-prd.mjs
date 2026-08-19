import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  vagueWords,
  technicalWordIssue,
  parseTermsTable,
  plainLanguageIssues,
  averageSentenceLength,
} from '../../../scripts/lib/plain-language.mjs';

/**
 * Validator for the PROBE PRD format (skills/forge-prd/references/prd-template.md).
 *
 * The PRD's one job is to be readable by an executive, a developer, and a QA
 * from the same words. The lexical rules are therefore the same shared module
 * that guards spec-analysis.md — one checker, so the two documents cannot
 * drift into different languages — plus the PRD's own structural rules: the
 * lifecycle lives in the Status section AND the filename, stories carry stable
 * ids and a plain-words line, and sign-off is a recorded human decision.
 */

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node validate-prd.mjs <prd-file.md>');
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

// --- Title and required sections ---------------------------------------------

if (!/^# PRD — \S/m.test(text)) {
  errors.push('The document must start with a "# PRD — <name>" title.');
}

const requiredSections = [
  'Status',
  'Problem',
  'What we will build',
  'Who it is for',
  'User stories',
  'Scope',
  'Out of scope',
  'Success measures',
  'Open questions',
  'Terms',
];
for (const name of requiredSections) {
  if (!section(name)) errors.push(`The "${name}" section is missing.`);
}

// --- Lifecycle: the Status section and the filename must agree ----------------

const statusText = section('Status');
const state = statusText.match(/^\s*-\s*\*\*State:\*\*\s*(\S+)/m)?.[1]?.toLowerCase();
const validStates = ['draft', 'in-review', 'signed-off'];
if (!state) {
  errors.push('Status needs "- **State:** draft | in-review | signed-off".');
} else if (!validStates.includes(state)) {
  errors.push(`Status state "${state}" is not one of: ${validStates.join(', ')}.`);
}
if (!/^\s*-\s*\*\*Owner:\*\*\s*\S/m.test(statusText)) {
  errors.push('Status needs "- **Owner:** <the accountable human>".');
}

const signedOffBy = statusText.match(/^\s*-\s*\*\*Signed off by:\*\*\s*(.+?)\s*$/m)?.[1];
if (state === 'signed-off') {
  // Sign-off is a recorded human decision: a name and a timestamp, or it did
  // not happen. This is the same rule as every PROBE gate approval row.
  if (!signedOffBy || !/\d{4}-\d{2}-\d{2}/.test(signedOffBy)) {
    errors.push(
      'A signed-off PRD needs "- **Signed off by:** <name> — <YYYY-MM-DD HH:MM>". ' +
        'Sign-off is a recorded human decision, never implied by the state alone.',
    );
  } else if (/^(_+|—|-|n\/?a|tbd|pending)\b/i.test(signedOffBy)) {
    errors.push('Signed off by must name the human; a placeholder is not a decision.');
  }
} else if (state && signedOffBy) {
  errors.push(
    `A ${state} PRD must not carry a "Signed off by" line — the signature appears when the decision is made, not before.`,
  );
}

const base = path.basename(filePath);
const expectedBase = state ? `prd-${state}.md` : null;
if (expectedBase && /^prd-/.test(base) && base !== expectedBase) {
  errors.push(
    `The filename is the lifecycle: state "${state}" must live in "${expectedBase}", not "${base}". Rename, never copy.`,
  );
}

// --- Terms: the glossary and the acronym allowlist ----------------------------

const termsText = section('Terms');
const { declaredTerms, header: termsHeader, hasTable: termsHasTable } = parseTermsTable(termsText);
if (termsText.trim() && !termsHasTable) {
  errors.push("The Terms section needs a table of the product's own words.");
} else if (termsHeader) {
  for (const column of ['Term', 'Plain meaning', 'Where used']) {
    if (!termsHeader.toLowerCase().includes(column.toLowerCase())) {
      errors.push(`The Terms table needs a "${column}" column.`);
    }
  }
}

/** The PRD message wording over the shared detector. */
function checkPlainLanguage(id, where, prose) {
  for (const issue of plainLanguageIssues(prose, declaredTerms)) {
    if (issue.type === 'acronym') {
      errors.push(
        `${id} ${where} uses "${issue.token}", which the product does not define here. ` +
          'Write the words out in full, or add a Terms row citing where the product uses it.',
      );
    } else {
      errors.push(
        `${id} ${where} abbreviates "${issue.token}". Write the whole word, or add a Terms ` +
          'row if the product itself uses that short form.',
      );
    }
  }
  const vague = prose.match(vagueWords)?.[0];
  if (vague) {
    errors.push(
      `${id} ${where} uses the unclear word "${vague}". Replace it with something a reader can measure or see.`,
    );
  }
  const technical = technicalWordIssue(prose, declaredTerms);
  if (technical) {
    errors.push(
      `${id} ${where} uses the implementation word "${technical}". A PRD names what the user sees; ` +
        'the technical design names the rest.',
    );
  }
}

// --- Problem and What we will build -------------------------------------------

const problemText = section('Problem');
if (problemText.trim()) {
  checkPlainLanguage('The', 'Problem section', problemText);
  if (problemText.split(/\s+/).filter(Boolean).length < 20) {
    errors.push(
      'The Problem section is too short to say who is affected and what it costs. ' +
        'Two or three real sentences.',
    );
  }
}
const buildText = section('What we will build');
if (buildText.trim()) checkPlainLanguage('The', '"What we will build" section', buildText);

// --- User stories -------------------------------------------------------------

const storiesText = section('User stories');
const storyPattern =
  /^###\s+(US-\d{2,})\s+[—–-]\s+(.+?)\s*$([\s\S]*?)(?=^###\s+US-\d{2,}\s+[—–-]|$(?![\s\S]))/gim;
const storyIds = [];
for (const match of storiesText.matchAll(storyPattern)) {
  const id = match[1];
  const body = match[3];
  storyIds.push(id);

  if (!/\*\*As a\*\*[\s\S]*?\*\*I want\*\*[\s\S]*?\*\*so that\*\*/i.test(body)) {
    errors.push(`${id} needs the "**As a** … **I want** … **so that** …" line.`);
  }
  const plainWords = body.match(/^\*\*In plain words:\*\*\s*([\s\S]*?)(?=^\*\*|$(?![\s\S]))/m)?.[1];
  if (!plainWords || !plainWords.trim()) {
    errors.push(
      `${id} needs an "**In plain words:**" explanation for a reader with no domain knowledge.`,
    );
  } else if (plainWords.split(/\s+/).filter(Boolean).length < 8) {
    errors.push(`${id} "In plain words" is too short to explain anything.`);
  }
  if (!/\*\*Done means:\*\*/i.test(body)) {
    errors.push(`${id} needs a "**Done means:**" block of checkable statements.`);
  }
  checkPlainLanguage(id, 'story', body);
}
if (storyIds.length === 0) {
  errors.push('User stories needs at least one "### US-NN — <name>" story.');
}
const duplicateStories = [...new Set(storyIds.filter((id, i, all) => all.indexOf(id) !== i))];
for (const id of duplicateStories) errors.push(`${id} appears more than once.`);

// --- Scope, success measures, open questions ----------------------------------

const outOfScope = section('Out of scope');
if (outOfScope && !outOfScope.trim()) {
  errors.push('Out of scope must name the deliberate omissions, or say "None declared."');
}

const successText = section('Success measures');
if (successText.trim() && !/^\s*\|/m.test(successText)) {
  warnings.push('Success measures reads best as the Measure/Today/Target table.');
}

const questionsText = section('Open questions');
if (/\bQ-?\d/.test(questionsText) || /^\s*\|\s*Q/m.test(questionsText)) {
  for (const column of ['Who can answer', 'Recommended answer', 'Why', 'Status']) {
    if (!new RegExp(column, 'i').test(questionsText)) {
      errors.push(`The Open questions table needs a "${column}" column.`);
    }
  }
}

// --- Readability floor ---------------------------------------------------------

const proseSections = `${problemText}\n${buildText}\n${storiesText}`;
const average = averageSentenceLength(proseSections);
if (average > 28) {
  warnings.push(
    `Average sentence length is ${average.toFixed(1)} words. Long sentences are the ` +
      'strongest signal a document was written for its author; aim under 28.',
  );
}

for (const message of errors) console.error(`ERROR: ${message}`);
for (const message of warnings) console.warn(`WARN: ${message}`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
