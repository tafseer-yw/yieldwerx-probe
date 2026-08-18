#!/usr/bin/env node
/**
 * Cover for the shipped PROBE guards.
 *
 * Equal weight to both failure modes: a guard that misses what it exists to
 * catch, and one that fires on ordinary work until somebody switches it off.
 * Every rule has a positive case AND the near-miss that must stay silent.
 *
 * Probe strings live in this file rather than on a command line, because a
 * shell invocation containing them is itself indistinguishable from the thing
 * being guarded against.
 */

import assert from 'node:assert/strict';
import {
  blastRadiusVerdict,
  liveAioWrite,
  targetBranches,
  redact,
} from '../plugins/yieldwerx-probe/scripts/lib/guards/blast-radius.mjs';
import {
  scanContent,
  secretPathRule,
} from '../plugins/yieldwerx-probe/scripts/lib/guards/secrets.mjs';
import { evaluate as evaluateBash } from '../plugins/yieldwerx-probe/scripts/guards/bash-guard.mjs';
import { evaluate as evaluateWrite } from '../plugins/yieldwerx-probe/scripts/guards/write-guard.mjs';
import { emitDecision, mask } from '../plugins/yieldwerx-probe/scripts/lib/guards/hook-io.mjs';

let failures = 0;
const check = (label, fn) => {
  try {
    fn();
    console.log(`ok    ${label}`);
  } catch (e) {
    console.error(`FAIL  ${label}\n      ${e.message.split('\n')[0]}`);
    failures++;
  }
};

const verdictOf = (command) => blastRadiusVerdict({ command })?.decision ?? null;
const G = 'git ';

// --- live AIO writes: the reason this guard exists here ---------------------

check('a live AIO sync asks - it writes to the production Jira tenant', () => {
  for (const c of [
    'probe aio sync wafer-map --live',
    'npm run sync:cases -- --live',
    'node aio-sync.ts --live',
  ]) {
    assert.equal(verdictOf(c), 'ask', c);
  }
});

check('the ask names the real risk', () => {
  const v = blastRadiusVerdict({ command: 'probe aio sync wafer-map --live' });
  assert.match(v.reason, /production Jira tenant/);
  assert.match(v.reason, /never executed by a test/);
});

check('a dry run is silent - PROBE is dry-run by default and that is the design', () => {
  for (const c of [
    'probe aio sync wafer-map',
    'npm run sync:cases',
    'probe aio check',
    'probe aio whoami',
    'probe aio folders',
  ]) {
    assert.equal(verdictOf(c), null, c);
  }
});

check('a credential on the command line is redacted before being quoted back', () => {
  const out = redact('AIO_API_TOKEN=abc123secret probe aio sync x --live');
  assert.ok(!out.includes('abc123secret'), out);
  assert.match(out, /AIO_API_TOKEN=\*\*\*/);
});

// --- git history -------------------------------------------------------------

check('history rewrites and shared-ref deletion are denied', () => {
  for (const c of [
    `${G}push --force origin main`,
    `${G}push -f`,
    `${G}push origin +main:main`,
    `${G}push --mirror backup`,
    `${G}filter-branch --tree-filter x HEAD`,
    `${G}reflog expire --expire=now --all`,
    `${G}push origin :main`,
    `${G}push -d origin main`,
  ]) {
    assert.equal(verdictOf(c), 'deny', c);
  }
});

check('working-tree destroyers ask', () => {
  for (const c of [
    `${G}reset --hard`,
    `${G}clean -fd`,
    `${G}clean --force`,
    `${G}checkout .`,
    `${G}branch -D old`,
    `${G}stash drop`,
    `${G}push --force-with-lease origin feat`,
  ]) {
    assert.equal(verdictOf(c), 'ask', c);
  }
});

check('ordinary work is silent', () => {
  for (const c of [
    `${G}status`,
    `${G}push origin feat/x`,
    `${G}commit -m 'fix: thing'`,
    `${G}log --oneline`,
    `${G}diff`,
    'npm test',
    'probe doctor',
  ]) {
    assert.equal(verdictOf(c), null, c);
  }
});

check('deleting an unprotected branch is not denied', () => {
  assert.notEqual(verdictOf(`${G}push origin :feat/throwaway`), 'deny');
});

check('a commit message quoting a dangerous command is prose', () => {
  assert.equal(verdictOf(`${G}commit -am 'ci: explain why ${G}push --force is refused'`), null);
});

check('colon-refspec branches are visible to the extractor', () => {
  assert.ok(targetBranches('push origin :main').includes('main'));
});

// --- credentials -------------------------------------------------------------

check('real credential shapes are found and masked', () => {
  const [f] = scanContent('token: "ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456"');
  assert.ok(f);
  assert.ok(!f.excerpt.includes('ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456'));
});

check('placeholders and env indirection are not credentials', () => {
  for (const line of [
    'password: "your_password_here"',
    'token: process.env.AIO_API_TOKEN',
    'password: "${DB_PASSWORD}"',
  ]) {
    assert.deepEqual(scanContent(line), [], line);
  }
});

check('credential-holding paths are refused, templates are not', () => {
  assert.ok(secretPathRule('/r/.env'));
  assert.equal(secretPathRule('/r/.env.example'), null);
});

// --- entry points and channel ------------------------------------------------

check('overrides are honoured, and only the matching one', () => {
  const cmd = { tool_input: { command: `${G}push --force origin main` } };
  assert.equal(evaluateBash(cmd, { PROBE_ALLOW_UNSAFE_GIT: '1' }), null);
  assert.equal(evaluateBash(cmd, {}).decision, 'deny');
  assert.equal(
    evaluateBash(
      { tool_input: { command: `PROBE_ALLOW_UNSAFE_GIT=1 ${G}push --force origin main` } },
      {},
    ),
    null,
  );
  const write = {
    tool_input: { file_path: '/r/x.ts', content: 'const k = "AKIA2E0ZTRPQHV4XN9WB"' },
  };
  assert.equal(evaluateWrite(write, {}).decision, 'deny');
  assert.equal(evaluateWrite(write, { PROBE_ALLOW_SECRET_WRITE: '1' }), null);
});

check('an empty payload is silent', () => {
  assert.equal(evaluateBash({ tool_input: {} }), null);
  assert.equal(evaluateWrite({ tool_input: {} }), null);
});

check('the emitted payload is the documented PreToolUse contract on stdout', () => {
  let out = '';
  emitDecision({ decision: 'ask', reason: 'because', findings: [] }, { write: (s) => (out += s) });
  const parsed = JSON.parse(out);
  assert.equal(parsed.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(parsed.hookSpecificOutput.permissionDecision, 'ask');
  assert.equal(mask('short'), '*****');
});

if (failures) {
  console.error(`\n${failures} guard test(s) failed.`);
  process.exit(1);
}
console.log('\nPROBE guard tests passed.');
