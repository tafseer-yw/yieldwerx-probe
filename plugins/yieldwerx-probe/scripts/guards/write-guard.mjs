#!/usr/bin/env node
/** PreToolUse guard for Write/Edit: credentials. Silent unless something fires. */

import { pathToFileURL } from 'node:url';
import { readHookPayload, emitDecision, overridden } from '../lib/guards/hook-io.mjs';
import { secretsVerdict } from '../lib/guards/secrets.mjs';

/**
 * The written text, whichever tool is writing it.
 *
 * Write carries `content`, Edit carries `new_string`, NotebookEdit carries
 * `new_source`, and a multi-edit payload carries `edits[]`. Reading only
 * `content` would leave every Edit unscanned while the guard reported success.
 */
export function writtenText(toolInput = {}) {
  return [
    toolInput.content,
    toolInput.new_string,
    toolInput.new_source,
    ...(Array.isArray(toolInput.edits)
      ? toolInput.edits.map((e) => e?.new_string ?? e?.new_source)
      : []),
  ]
    .filter((p) => typeof p === 'string')
    .join('\n');
}

export function evaluate(payload, env = process.env) {
  const input = payload?.tool_input ?? {};
  const filePath = input.file_path ?? input.notebook_path ?? '';
  if (!filePath) return null;
  if (overridden('PROBE_ALLOW_SECRET_WRITE', env)) return null;
  return secretsVerdict({ filePath, content: writtenText(input) });
}

async function main() {
  const payload = await readHookPayload(process.stdin);
  if (!payload) return;
  try {
    emitDecision(evaluate(payload));
  } catch (e) {
    process.stderr.write(`PROBE write guard crashed (edit allowed): ${e.message}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
