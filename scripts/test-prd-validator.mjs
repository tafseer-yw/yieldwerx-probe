import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

/**
 * Tests for the PRD validator.
 *
 * The PRD's one job is to be readable by an executive, a developer, and a QA
 * from the same words, and its lifecycle is a recorded human decision. Each
 * case below is one way that job quietly fails: jargon creeping in, an invented
 * acronym, a story with no plain-words line, a "signed-off" state nobody
 * actually signed, or a filename that disagrees with the state it claims.
 */

const root = process.cwd();
const validator = path.join(
  root,
  'plugins',
  'yieldwerx-probe',
  'skills',
  'forge-prd',
  'scripts',
  'validate-prd.mjs',
);
const fixture = path.join(root, 'tests', 'fixtures', 'prd', 'prd-signed-off.md');

function run(file) {
  return spawnSync(process.execPath, [validator, file], { cwd: root, encoding: 'utf8' });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const valid = run(fixture);
assert(valid.status === 0, `Valid PRD fixture failed:\n${valid.stderr}${valid.stdout}`);

const source = await readFile(fixture, 'utf8');
const work = await mkdtemp(path.join(tmpdir(), 'probe-prd-validator-'));

try {
  // A signed-off state with no recorded human decision. This is the PRD's
  // version of the gate rule: Claude records sign-off, never implies it.
  const unsignedPath = path.join(work, 'prd-signed-off.md');
  await writeFile(
    unsignedPath,
    source.replace('- **Signed off by:** Tafseer Haider — 2026-08-18 21:30\n', ''),
  );
  const unsigned = run(unsignedPath);
  assert(unsigned.status !== 0, 'A signed-off PRD without a signer was accepted.');
  assert(
    unsigned.stderr.includes('Sign-off is a recorded human decision'),
    `Unsigned message was not clear:\n${unsigned.stderr}`,
  );

  // The filename is the lifecycle: a draft file claiming signed-off is a copy
  // that escaped the rename rule.
  const wrongNamePath = path.join(work, 'prd-draft.md');
  await writeFile(wrongNamePath, source);
  const wrongName = run(wrongNamePath);
  assert(wrongName.status !== 0, 'A filename/state mismatch was accepted.');
  assert(
    wrongName.stderr.includes('Rename, never copy'),
    `Filename message was not clear:\n${wrongName.stderr}`,
  );

  // A draft must not pre-carry a signature.
  const draftSignedPath = path.join(work, 'prd-draft2.md');
  await writeFile(draftSignedPath, source.replace('- **State:** signed-off', '- **State:** draft'));
  const draftSigned = run(draftSignedPath);
  assert(draftSigned.status !== 0, 'A draft carrying a signature was accepted.');

  // Implementation jargon in the Problem section — the exact failure the
  // "consumable by all stakeholders" demand exists to stop.
  const jargonPath = path.join(work, 'prd-signed-off2.md');
  await writeFile(
    jargonPath,
    source.replace(
      'Engineers wait, guess, and re-upload files that were never',
      'Engineers wait for the payload to be persisted, and re-upload files that were never',
    ),
  );
  const jargon = run(jargonPath);
  assert(jargon.status !== 0, 'Implementation jargon in the Problem was accepted.');
  assert(
    jargon.stderr.includes('implementation word'),
    `Jargon message was not clear:\n${jargon.stderr}`,
  );

  // An invented acronym — the same shared detector that guards spec-analysis.
  const acronymPath = path.join(work, 'prd-signed-off3.md');
  await writeFile(
    acronymPath,
    source.replace('A "Upload Status" board', 'A USB ("Upload Status" board)'),
  );
  const acronym = run(acronymPath);
  assert(acronym.status !== 0, 'An invented acronym was accepted.');
  assert(acronym.stderr.includes('"USB"'), `Acronym message was not clear:\n${acronym.stderr}`);

  // A story with no plain-words explanation.
  const noPlainPath = path.join(work, 'prd-signed-off4.md');
  await writeFile(
    noPlainPath,
    source.replace(
      /\*\*In plain words:\*\* After sending a wafer data file[\s\S]*?simple list, like a parcel-tracking page, that says how far each file has got\.\n/,
      '',
    ),
  );
  const noPlain = run(noPlainPath);
  assert(noPlain.status !== 0, 'A story with no plain-words line was accepted.');
  assert(
    noPlain.stderr.includes('US-01 needs an "**In plain words:**"'),
    `Plain-words message was not clear:\n${noPlain.stderr}`,
  );

  // A missing story section entirely.
  const noStoriesPath = path.join(work, 'prd-signed-off5.md');
  await writeFile(noStoriesPath, source.replace(/### US-0\d[\s\S]*?(?=## Scope)/g, ''));
  const noStories = run(noStoriesPath);
  assert(noStories.status !== 0, 'A PRD with no stories was accepted.');
} finally {
  await rm(work, { recursive: true, force: true });
}

process.stdout.write(
  'PRD validator tests passed: valid document, unsigned sign-off, filename/state ' +
    'mismatch, premature signature, jargon, invented acronym, missing plain words, ' +
    'and missing stories.\n',
);
