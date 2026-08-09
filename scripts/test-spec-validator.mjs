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
        'Given The user is on the Edit Profile screen',
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
} finally {
  await rm(work, { recursive: true, force: true });
}

process.stdout.write(
  'Spec validator tests passed: PRD authority, reference-only knowledge, valid Gherkin ACs, missing steps, summary format, legacy checklist, and weak rule.\n',
);
