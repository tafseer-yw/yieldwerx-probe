#!/usr/bin/env node
/** PreToolUse guard for Bash: git history and live AIO writes. Silent unless something fires. */

import { pathToFileURL } from 'node:url';
import { readHookPayload, emitDecision, overridden } from '../lib/guards/hook-io.mjs';
import { blastRadiusVerdict } from '../lib/guards/blast-radius.mjs';

/**
 * The override rides on the command itself.
 *
 * The hook process inherits the host environment, so an env prefix typed into
 * a COMMAND never reaches process.env here. Without this the advertised
 * override would only work if exported before launching the session - an
 * override nobody would find. The prefix form is also better: it authorizes
 * exactly one command, visibly, in the transcript.
 */
const OVERRIDE_PREFIX = /^\s*PROBE_ALLOW_UNSAFE_GIT=(?:1|true)\s+/;

export function evaluate(payload, env = process.env) {
  const command = payload?.tool_input?.command;
  if (!command) return null;
  if (overridden('PROBE_ALLOW_UNSAFE_GIT', env)) return null;
  if (OVERRIDE_PREFIX.test(command)) return null;
  return blastRadiusVerdict({ command });
}

async function main() {
  const payload = await readHookPayload(process.stdin);
  if (!payload) return;
  try {
    emitDecision(evaluate(payload));
  } catch (e) {
    process.stderr.write(`PROBE bash guard crashed (command allowed): ${e.message}\n`);
  }
}

// pathToFileURL, not string concatenation: on Windows a mismatch means main()
// never runs, which is a guard that silently allows everything.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
