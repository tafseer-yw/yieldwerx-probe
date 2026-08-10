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

  // --- Gate hibernation (P17) ----------------------------------------------
  // These forms and safeguards are load-bearing: flow and block sequences plus
  // flow and block authorizer mappings must be accepted; expiry must surface;
  // and an anonymous hibernation must be rejected. Otherwise a valid governance
  // decision either fails to load or silently behaves unlike its declaration.
  const hibernationBase = `schemaVersion: 1
probeVersion: ${expectedVersion}
paths:
  features: features
  ledgers: docs/qa
  artifacts: .probe/artifacts
governance:
  gates:
`;
  const hibernated = path.join(temporaryRoot, 'hibernated.yaml');
  fs.writeFileSync(
    hibernated,
    `${hibernationBase}    mode: hibernated
    scope: [design, merge, ops]
    authorizedBy:
      name: Test Owner
      email: owner@example.com
      role: PROBE Owner
    reason: Evaluation period.
    since: 2026-08-10
    until: null
`,
  );
  const accepted = run(['validate-config', '--root', temporaryRoot, '--config', hibernated]);
  if (accepted.status !== 0) {
    throw new Error(`Complete hibernation was rejected: ${accepted.stderr || accepted.stdout}`);
  }

  const blockScope = path.join(temporaryRoot, 'hibernated-block-scope.yaml');
  fs.writeFileSync(
    blockScope,
    `${hibernationBase}    mode: hibernated
    scope:
      - design
      - merge
    authorizedBy:
      name: Test Owner
      email: owner@example.com
      role: PROBE Owner
    reason: Evaluation period.
    since: 2026-08-10
    until: null
`,
  );
  const blockScopeResult = run([
    'validate-config',
    '--root',
    temporaryRoot,
    '--config',
    blockScope,
  ]);
  if (blockScopeResult.status !== 0) {
    throw new Error(
      `Block-sequence hibernation was rejected: ${blockScopeResult.stderr || blockScopeResult.stdout}`,
    );
  }

  const inlineAuthorizer = path.join(temporaryRoot, 'hibernated-inline-authorizer.yaml');
  fs.writeFileSync(
    inlineAuthorizer,
    `${hibernationBase}    mode: hibernated
    scope: [design, merge, ops]
    authorizedBy: { name: Test Owner, email: owner@example.com, role: PROBE Owner }
    reason: Evaluation period.
    since: 2026-08-10
    until: null
`,
  );
  const inlineAuthorizerResult = run([
    'validate-config',
    '--root',
    temporaryRoot,
    '--config',
    inlineAuthorizer,
  ]);
  if (inlineAuthorizerResult.status !== 0) {
    throw new Error(
      `Inline-authorizer hibernation was rejected: ${inlineAuthorizerResult.stderr || inlineAuthorizerResult.stdout}`,
    );
  }

  const expired = path.join(temporaryRoot, 'hibernated-expired.yaml');
  fs.writeFileSync(
    expired,
    `${hibernationBase}    mode: hibernated
    scope: [design]
    authorizedBy: { name: Test Owner, email: owner@example.com, role: PROBE Owner }
    reason: Expiry test.
    since: 1999-01-01
    until: 2000-01-01
`,
  );
  const expiredResult = run(['validate-config', '--root', temporaryRoot, '--config', expired]);
  if (expiredResult.status !== 0 || !expiredResult.stdout.includes('expired on 2000-01-01')) {
    throw new Error(
      `Expired hibernation was not surfaced: ${expiredResult.stderr || expiredResult.stdout}`,
    );
  }

  const anonymous = path.join(temporaryRoot, 'anonymous.yaml');
  fs.writeFileSync(anonymous, `${hibernationBase}    mode: hibernated\n`);
  const anonymousResult = run([
    'validate-config',
    '--root',
    temporaryRoot,
    '--config',
    anonymous,
    '--json',
  ]);
  if (anonymousResult.status === 0) {
    throw new Error('Hibernation with no named authorizer was accepted.');
  }
  for (const required of ['authorizedBy.name', 'reason', 'since', 'scope']) {
    if (!anonymousResult.stdout.includes(required)) {
      throw new Error(`Anonymous hibernation did not report the missing '${required}'.`);
    }
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
