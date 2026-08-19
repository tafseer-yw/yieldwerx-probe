import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const validator = path.join(
  root,
  'plugins',
  'yieldwerx-probe',
  'skills',
  'probe-spec',
  'scripts',
  'validate-spec-analysis.mjs',
);
const fixture = path.join(root, 'tests', 'fixtures', 'spec-analysis', 'valid-hybrid.md');

function run(file) {
  return spawnSync(process.execPath, [validator, file], {
    cwd: root,
    encoding: 'utf8',
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const valid = run(fixture);
assert(valid.status === 0, `Valid hybrid fixture failed:\n${valid.stderr}${valid.stdout}`);

const source = await readFile(fixture, 'utf8');
const work = await mkdtemp(path.join(tmpdir(), 'probe-spec-validator-'));

try {
  const missingThenPath = path.join(work, 'missing-then.md');
  await writeFile(
    missingThenPath,
    source.replace(
      "Then The selected picture is saved\nAnd The picture is displayed on the user's profile",
      'And The selected picture is saved',
    ),
  );
  const missingThen = run(missingThenPath);
  assert(missingThen.status !== 0, 'A Workflow without Then was accepted.');
  assert(
    missingThen.stderr.includes('AC-01 Workflow is missing a Then step.'),
    `Missing-Then message was not clear:\n${missingThen.stderr}`,
  );

  const weakRulePath = path.join(work, 'weak-rule.md');
  await writeFile(
    weakRulePath,
    source.replace(
      'Then The picture must be in `.png` or `.jpeg` format',
      'Then The picture uses a user-friendly file format',
    ),
  );
  const weakRule = run(weakRulePath);
  assert(weakRule.status !== 0, 'A vague rule without must/must not was accepted.');
  assert(
    weakRule.stderr.includes('Simple Rule outcome must use "must" or "must not"') &&
      weakRule.stderr.includes('unclear word "user-friendly"'),
    `Weak-rule messages were not clear:\n${weakRule.stderr}`,
  );

  const knowledgeSourcedAcPath = path.join(work, 'knowledge-sourced-ac.md');
  await writeFile(
    knowledgeSourcedAcPath,
    source.replace(
      '| AC-02 | Simple Rule | Allow supported file types | §3.2   |',
      '| AC-02 | Simple Rule | Allow supported file types | yieldwerx-knowledgebase §5 |',
    ),
  );
  const knowledgeSourcedAc = run(knowledgeSourcedAcPath);
  assert(
    knowledgeSourcedAc.status !== 0,
    'An AC sourced from the knowledgebase was accepted as a requirement.',
  );
  assert(
    knowledgeSourcedAc.stderr.includes(
      'AC-02 Source must cite the provided PRD/story/specification, not reference context',
    ),
    `Knowledge-sourced-AC message was not clear:\n${knowledgeSourcedAc.stderr}`,
  );

  const knowledgeAsAuthorityPath = path.join(work, 'knowledge-as-authority.md');
  await writeFile(
    knowledgeAsAuthorityPath,
    source.replace(
      '**Requirement source of truth:** Profile_Picture_Requirements.docx, revision 3',
      '**Requirement source of truth:** yieldwerx-knowledgebase 1.1.0',
    ),
  );
  const knowledgeAsAuthority = run(knowledgeAsAuthorityPath);
  assert(
    knowledgeAsAuthority.status !== 0,
    'The knowledgebase was accepted as the requirement source of truth.',
  );
  assert(
    knowledgeAsAuthority.stderr.includes(
      'Requirement source of truth must name the provided PRD/story/specification',
    ),
    `Knowledge-as-authority message was not clear:\n${knowledgeAsAuthority.stderr}`,
  );

  const unlabeledReferenceContextPath = path.join(work, 'unlabeled-reference-context.md');
  await writeFile(
    unlabeledReferenceContextPath,
    source.replace(
      'yieldwerx-knowledgebase 1.1.0 — Reference context only — not a requirement',
      'yieldwerx-knowledgebase 1.1.0, terminology only',
    ),
  );
  const unlabeledReferenceContext = run(unlabeledReferenceContextPath);
  assert(
    unlabeledReferenceContext.status !== 0,
    'Knowledge context without a non-requirement label was accepted.',
  );
  assert(
    unlabeledReferenceContext.stderr.includes('Reference context only — not a requirement'),
    `Unlabeled-reference-context message was not clear:\n${unlabeledReferenceContext.stderr}`,
  );

  const missingSummaryPath = path.join(work, 'missing-summary.md');
  await writeFile(
    missingSummaryPath,
    source.replace(
      '**Summary:** Verify that only .png and .jpeg profile pictures are accepted.\n',
      '',
    ),
  );
  const missingSummary = run(missingSummaryPath);
  assert(missingSummary.status !== 0, 'An active AC without a Verify-that summary was accepted.');
  assert(
    missingSummary.stderr.includes(
      'AC-02 needs exactly one summary in the format "**Summary:** Verify that ...".',
    ),
    `Missing-summary message was not clear:\n${missingSummary.stderr}`,
  );

  const wrongSummaryOpeningPath = path.join(work, 'wrong-summary-opening.md');
  await writeFile(
    wrongSummaryOpeningPath,
    source.replace(
      '**Summary:** Verify that only .png and .jpeg profile pictures are accepted.',
      '**Summary:** Check whether only .png and .jpeg profile pictures are accepted.',
    ),
  );
  const wrongSummaryOpening = run(wrongSummaryOpeningPath);
  assert(
    wrongSummaryOpening.status !== 0,
    'An active AC whose summary did not start with "Verify that " was accepted.',
  );
  assert(
    wrongSummaryOpening.stderr.includes('AC-02 summary must start with "Verify that ".'),
    `Wrong-summary-opening message was not clear:\n${wrongSummaryOpening.stderr}`,
  );

  const missingSimpleWhenPath = path.join(work, 'missing-simple-when.md');
  await writeFile(
    missingSimpleWhenPath,
    source.replace('When The user selects a profile picture\n', ''),
  );
  const missingSimpleWhen = run(missingSimpleWhenPath);
  assert(missingSimpleWhen.status !== 0, 'A Simple Rule without When was accepted.');
  assert(
    missingSimpleWhen.stderr.includes('AC-02 Simple Rule is missing a When step.'),
    `Missing-Simple-Rule-When message was not clear:\n${missingSimpleWhen.stderr}`,
  );

  const legacyChecklistPath = path.join(work, 'legacy-checklist.md');
  await writeFile(
    legacyChecklistPath,
    source.replace(
      [
        '```gherkin',
        'Given The user is on the "Edit Profile" screen',
        'When The user selects a profile picture',
        'Then The picture must be in `.png` or `.jpeg` format',
        'And Every other file type must be rejected',
        '```',
      ].join('\n'),
      [
        '- The picture must be in `.png` or `.jpeg` format.',
        '- Every other file type must be rejected.',
      ].join('\n'),
    ),
  );
  const legacyChecklist = run(legacyChecklistPath);
  assert(legacyChecklist.status !== 0, 'A legacy Simple Rule checklist was accepted.');
  assert(
    legacyChecklist.stderr.includes('AC-02 needs exactly one fenced gherkin block.'),
    `Legacy-checklist message was not clear:\n${legacyChecklist.stderr}`,
  );
  // --- Plain language (P13) -------------------------------------------------
  // These four were advisory prose for four minor versions and drifted every
  // time. Each case is one of the habits the rules exist to stop.

  // An acronym the provided requirement never uses. This is the most common
  // failure: the analysis coins private vocabulary that exists nowhere in the
  // product, and a tester cannot find the control being described.
  const inventedAcronymPath = path.join(work, 'invented-acronym.md');
  await writeFile(
    inventedAcronymPath,
    source.replace(
      'Verify that a user can save a valid profile picture.',
      'Verify that a user can save a valid PPIC through the EPS screen.',
    ),
  );
  const inventedAcronym = run(inventedAcronymPath);
  assert(inventedAcronym.status !== 0, 'An invented acronym was accepted.');
  assert(
    inventedAcronym.stderr.includes('AC-01 summary uses "PPIC"'),
    `Invented-acronym message was not clear:\n${inventedAcronym.stderr}`,
  );

  // The same short form is legal once the provided requirement uses it and a
  // Terms row cites where — that is what the table is for.
  const declaredAcronymPath = path.join(work, 'declared-acronym.md');
  await writeFile(
    declaredAcronymPath,
    source
      .replace(
        '| Profile picture                        |',
        "| PPIC                                   | The source's short form for the profile picture. | §3.1   |\n| Profile picture                        |",
      )
      .replace(
        'Verify that a user can save a valid profile picture.',
        'Verify that a user can save a valid PPIC.',
      ),
  );
  const declaredAcronym = run(declaredAcronymPath);
  assert(
    declaredAcronym.status === 0,
    `A source-defined acronym with a Terms row was rejected:\n${declaredAcronym.stderr}`,
  );

  // A criterion with no explanation for a reader outside the domain.
  const missingPlainWordsPath = path.join(work, 'missing-plain-words.md');
  await writeFile(
    missingPlainWordsPath,
    source.replace(
      '**In plain words:** Every user has a small image shown next to their name. This\nlets them replace it with a picture from their own computer, as long as the file is\na supported image type and is not too large.\n',
      '',
    ),
  );
  const missingPlainWords = run(missingPlainWordsPath);
  assert(
    missingPlainWords.status !== 0,
    'A criterion with no plain-words explanation was accepted.',
  );
  assert(
    missingPlainWords.stderr.includes('AC-01 needs exactly one "**In plain words:**"'),
    `Missing-plain-words message was not clear:\n${missingPlainWords.stderr}`,
  );

  // An explanation that only restates the summary explains nothing.
  const restatedPlainWordsPath = path.join(work, 'restated-plain-words.md');
  await writeFile(
    restatedPlainWordsPath,
    source.replace(
      '**In plain words:** Every user has a small image shown next to their name. This\nlets them replace it with a picture from their own computer, as long as the file is\na supported image type and is not too large.',
      '**In plain words:** A user can save a valid profile picture on the profile screen when they choose one.',
    ),
  );
  const restatedPlainWords = run(restatedPlainWordsPath);
  assert(restatedPlainWords.status !== 0, 'A plain-words line restating the summary was accepted.');
  assert(
    restatedPlainWords.stderr.includes('AC-01 "In plain words" restates the summary'),
    `Restated-plain-words message was not clear:\n${restatedPlainWords.stderr}`,
  );

  // A shortened word inside a Gherkin step.
  const abbreviatedStepPath = path.join(work, 'abbreviated-step.md');
  await writeFile(
    abbreviatedStepPath,
    source.replace(
      'When The user clicks the "Save Profile" button',
      'When The user clicks the "Save Profile" button with the default config',
    ),
  );
  const abbreviatedStep = run(abbreviatedStepPath);
  assert(abbreviatedStep.status !== 0, 'An abbreviation inside a Gherkin step was accepted.');
  assert(
    abbreviatedStep.stderr.includes('abbreviates "config"'),
    `Abbreviation message was not clear:\n${abbreviatedStep.stderr}`,
  );

  // A simple requirement restated as architecture. This is the third reported
  // habit, and it was a warning for four minor versions, which is exactly how it
  // survived.
  const jargonSummaryPath = path.join(work, 'jargon-summary.md');
  await writeFile(
    jargonSummaryPath,
    source.replace(
      'Verify that a user can save a valid profile picture.',
      'Verify that profile image persistence is enforced on save.',
    ),
  );
  const jargonSummary = run(jargonSummaryPath);
  assert(jargonSummary.status !== 0, 'A jargon summary was accepted.');
  assert(
    jargonSummary.stderr.includes('AC-01 summary uses the technical word "persistence"'),
    `Jargon-summary message was not clear:\n${jargonSummary.stderr}`,
  );

  // The Terms section is required, because it is simultaneously the reader's
  // glossary and the acronym allowlist.
  const missingTermsPath = path.join(work, 'missing-terms.md');
  await writeFile(
    missingTermsPath,
    source.replace(/## Terms[\s\S]*?(?=## Testable categories)/, ''),
  );
  const missingTerms = run(missingTermsPath);
  assert(missingTerms.status !== 0, 'An analysis with no Terms section was accepted.');
  assert(
    missingTerms.stderr.includes('The "Terms" section is missing.'),
    `Missing-Terms message was not clear:\n${missingTerms.stderr}`,
  );
} finally {
  await rm(work, { recursive: true, force: true });
}

process.stdout.write(
  'Spec validator tests passed: PRD authority, reference-only knowledge, valid Gherkin ACs, ' +
    'missing steps, summary format, legacy checklist, weak rule, invented vs source-defined ' +
    'acronyms, missing and restated plain-words explanations, abbreviated steps, jargon ' +
    'summaries, and the required Terms section.\n',
);
