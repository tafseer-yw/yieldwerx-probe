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
  'validate-spec-reconciliation.mjs',
);
const fixture = path.join(root, 'tests', 'fixtures', 'spec-analysis', 'valid-reconciliation.md');

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
assert(valid.status === 0, `Valid reconciliation fixture failed:\n${valid.stderr}${valid.stdout}`);

const source = await readFile(fixture, 'utf8');
const work = await mkdtemp(path.join(tmpdir(), 'probe-reconciliation-validator-'));

try {
  const unsafeMigrationPath = path.join(work, 'unsafe-migration.md');
  await writeFile(
    unsafeMigrationPath,
    source
      .replace('**Mode:** reconcile', '**Mode:** migrate-format')
      .replace('**Result:** substantive', '**Result:** format-only'),
  );
  const unsafeMigration = run(unsafeMigrationPath);
  assert(unsafeMigration.status !== 0, 'migrate-format accepted a meaning change.');
  assert(
    unsafeMigration.stderr.includes(
      'migrate-format may contain only unchanged or format-only change rows.',
    ),
    `Unsafe-migration message was not clear:\n${unsafeMigration.stderr}`,
  );

  const missingReplacementPath = path.join(work, 'missing-replacement.md');
  await writeFile(missingReplacementPath, source.replace('AC-02 → AC-09', 'AC-02'));
  const missingReplacement = run(missingReplacementPath);
  assert(
    missingReplacement.status !== 0,
    'A meaning change without a replacement ID was accepted.',
  );
  assert(
    missingReplacement.stderr.includes(
      'AC-02 meaning-changed must name both old and new IDs with old → new.',
    ),
    `Missing-replacement message was not clear:\n${missingReplacement.stderr}`,
  );

  const missingImpactPath = path.join(work, 'missing-impact.md');
  await writeFile(
    missingImpactPath,
    source.replace('- **Design Gate:** Review and re-sign affected coverage\n', ''),
  );
  const missingImpact = run(missingImpactPath);
  assert(missingImpact.status !== 0, 'A report without Design Gate impact was accepted.');
  assert(
    missingImpact.stderr.includes('Downstream impact needs "**Design Gate:**".'),
    `Missing-impact message was not clear:\n${missingImpact.stderr}`,
  );
} finally {
  await rm(work, { recursive: true, force: true });
}

process.stdout.write(
  'Spec reconciliation validator tests passed: valid report, mode safety, replacement IDs, and downstream impact.\n',
);
