import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const cli = path.join(root, 'bin', 'probe.mjs');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-cli-'));

function run(args, cwd = root) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
  });
}

try {
  // Read the expected version rather than hardcoding it: a literal here means
  // every release bump fails this test for a reason unrelated to the change,
  // which trains people to edit the test instead of trusting it. Comparing the
  // CLI's own output against package.json is the assertion that matters.
  const expectedVersion = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
  ).version;
  const version = run(['--version']);
  if (version.status !== 0 || version.stdout.trim() !== expectedVersion) {
    throw new Error(`Version command failed: ${version.stderr || version.stdout}`);
  }

  const example = run([
    'validate-config',
    '--root',
    root,
    '--config',
    'examples/playwright-bdd/probe.config.yaml',
    '--json',
  ]);
  if (example.status !== 0) {
    throw new Error(`Example config failed: ${example.stderr || example.stdout}`);
  }

  fs.mkdirSync(path.join(temporaryRoot, '.claude'), { recursive: true });
  fs.writeFileSync(
    path.join(temporaryRoot, 'probe.config.yaml'),
    // Interpolated, not hardcoded: this fixture must track the CLI version so
    // `doctor` sees a MATCHING consumer pin. A literal made every release bump
    // fail here. The deliberate-mismatch case below keeps its own fixed version.
    `schemaVersion: 1
probeVersion: ${expectedVersion}
profile: generic
paths:
  features: features
  ledgers: docs/qa
  artifacts: .probe/artifacts
integrations:
  knowledge:
    provider: yieldwerx-knowledgebase
    required: true
    source: claude-plugin
    marketplace: yieldwerx-company
    plugin: yieldwerx-knowledgebase
    skill: ask-yieldwerx
    revision: 1.1.0
`,
  );
  fs.writeFileSync(
    path.join(temporaryRoot, '.claude', 'settings.json'),
    `${JSON.stringify(
      {
        enabledPlugins: {
          'yw@yieldwerx': true,
          'yieldwerx-knowledgebase@yieldwerx-company': true,
        },
      },
      null,
      2,
    )}\n`,
  );
  const doctor = run(['doctor', '--root', temporaryRoot, '--skip-plugin-check', '--json']);
  if (doctor.status !== 0) {
    throw new Error(`Doctor failed: ${doctor.stderr || doctor.stdout}`);
  }

  const invalid = path.join(temporaryRoot, 'invalid.yaml');
  fs.writeFileSync(
    invalid,
    `schemaVersion: 1
probeVersion: 1.5.0
paths:
  features: ../outside
  ledgers: docs/qa
  artifacts: .probe/artifacts
`,
  );
  const rejected = run(['validate-config', '--root', temporaryRoot, '--config', invalid]);
  if (rejected.status === 0) throw new Error('Invalid configuration was accepted.');

  // A removed key must fail in a way that explains itself. A bare "unknown key"
  // reads as a typo, and the natural response to a suspected typo is to put the
  // key back — which is how a retired mechanism gets resurrected on upgrade.
  const removedKey = path.join(temporaryRoot, 'removed-key.yaml');
  fs.writeFileSync(
    removedKey,
    `schemaVersion: 1
probeVersion: ${expectedVersion}
paths:
  features: features
  ledgers: docs/qa
  artifacts: .probe/artifacts
governance:
  gates:
    mode: hibernated
`,
  );
  const removed = run(['validate-config', '--root', temporaryRoot, '--config', removedKey]);
  if (removed.status === 0) throw new Error('A removed governance block was accepted.');
  if (!removed.stderr.includes('was removed in 3.0')) {
    throw new Error(`The removed-key error did not explain itself:\n${removed.stderr}`);
  }

  // Stacks: a valid list is accepted; an empty or duplicated one is rejected.
  const stacksOk = path.join(temporaryRoot, 'stacks-ok.yaml');
  fs.writeFileSync(
    stacksOk,
    `schemaVersion: 1
probeVersion: ${expectedVersion}
paths:
  features: features
  ledgers: docs/qa
  artifacts: .probe/artifacts
stacks: [node-ts-spa, dotnet-legacy]
`,
  );
  const stacksOkResult = run(['validate-config', '--root', temporaryRoot, '--config', stacksOk]);
  if (stacksOkResult.status !== 0) {
    throw new Error(
      `A valid stacks list was rejected:\n${stacksOkResult.stderr || stacksOkResult.stdout}`,
    );
  }

  const stacksBad = path.join(temporaryRoot, 'stacks-bad.yaml');
  fs.writeFileSync(
    stacksBad,
    `schemaVersion: 1
probeVersion: ${expectedVersion}
paths:
  features: features
  ledgers: docs/qa
  artifacts: .probe/artifacts
stacks: [node-ts-spa, node-ts-spa]
`,
  );
  const stacksBadResult = run(['validate-config', '--root', temporaryRoot, '--config', stacksBad]);
  if (stacksBadResult.status === 0 || !stacksBadResult.stderr.includes('more than once')) {
    throw new Error(
      `A duplicated stacks list was not rejected clearly:\n${stacksBadResult.stderr || stacksBadResult.stdout}`,
    );
  }

  fs.mkdirSync(path.join(temporaryRoot, 'docs', 'PRDs'), { recursive: true });
  fs.mkdirSync(path.join(temporaryRoot, 'features', 'sample'), { recursive: true });
  fs.writeFileSync(
    path.join(temporaryRoot, 'docs', 'PRDs', 'sample.md'),
    `# Sample requirement

### AC-01 - Show the saved value
`,
  );
  fs.writeFileSync(
    path.join(temporaryRoot, 'features', 'sample', 'sample.feature'),
    `@manual @functional @auto:now @testtype:e2e
Feature: Sample

  # AC: AC-01
  @TC-sample-001
  Scenario: TC-sample-001 - Verify that the saved value is shown
    Given The user opened the sample page
    When The user saves the value
    Then The saved value is shown
`,
  );
  const coverage = run(['coverage', 'sample'], temporaryRoot);
  if (coverage.status !== 0) {
    throw new Error(`Coverage command failed: ${coverage.stderr || coverage.stdout}`);
  }
  for (const file of ['coverage.md', 'coverage.json']) {
    if (!fs.existsSync(path.join(temporaryRoot, 'docs', 'qa', 'sample', file))) {
      throw new Error(`Coverage command did not create docs/qa/sample/${file}.`);
    }
  }

  process.stdout.write('PROBE CLI tests passed.\n');
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
