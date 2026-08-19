/**
 * Contract tests for the stdio MCP adapter.
 *
 * This server exists because Claude Desktop runs processes but gives the
 * assistant no shell, so `/sync-cases` had no engine there at all. The tests
 * below pin the three properties that make it a safe replacement:
 *
 *   1. it speaks enough JSON-RPC for a host to connect and list tools;
 *   2. it actually executes the bundled scripts, rather than describing them;
 *   3. a live AIO write is refused without an explicit confirmation — because the
 *      Bash guard that normally asks cannot fire on this path.
 *
 * Property 3 is the one worth having a test for. Without it a single tool call
 * writes to the production Jira tenant with nothing in between.
 */
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

const root = process.cwd();
const server = path.join(root, 'plugins', 'yieldwerx-probe', 'adapters', 'mcp', 'server.mjs');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Send a batch of requests, collect the replies keyed by id. */
function exchange(requests) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [server], {
      cwd: root,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (err += chunk));
    child.on('error', reject);
    child.on('close', () => {
      const replies = new Map();
      const all = [];
      for (const line of out.split('\n')) {
        if (!line.trim()) continue;
        try {
          const message = JSON.parse(line);
          all.push(message);
          if (message.id !== undefined) replies.set(message.id, message);
        } catch (error) {
          reject(new Error(`Server emitted a non-JSON line: ${line}\n${error.message}`));
          return;
        }
      }
      resolve({ replies, all, stderr: err });
    });
    for (const request of requests) child.stdin.write(`${JSON.stringify(request)}\n`);
    child.stdin.end();
  });
}

const { replies, all } = await exchange([
  { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
  { jsonrpc: '2.0', method: 'notifications/initialized' },
  { jsonrpc: '2.0', id: 2, method: 'tools/list' },
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'probe_validate_spec',
      arguments: { path: 'tests/fixtures/spec-analysis/valid-hybrid.md' },
    },
  },
  {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'aio_sync', arguments: { feature: 'demo', confirm: false } },
  },
  {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'no_such_tool', arguments: {} },
  },
]);

// 1. Handshake.
const initialize = replies.get(1);
assert(initialize?.result?.protocolVersion, 'initialize returned no protocolVersion.');
assert(
  initialize.result.serverInfo?.name === 'probe-tools',
  `Unexpected server name: ${initialize.result.serverInfo?.name}`,
);
assert(initialize.result.capabilities?.tools, 'The server did not advertise tool capability.');
console.log('ok    the handshake reports a protocol version and tool capability');

// A notification carries no id and must never be answered. Counting every line
// the server emitted — not just the id-bearing ones — is what makes this a real
// check: filtering first would make it pass no matter what the server did.
assert(
  all.length === replies.size,
  `The server emitted ${all.length - replies.size} line(s) for a notification: ` +
    JSON.stringify(all.filter((message) => message.id === undefined)),
);
console.log('ok    a notification is not answered');

// 2. Tool inventory — the sync verbs plus the capabilities the same no-shell
//    constraint breaks.
const names = new Set((replies.get(2)?.result?.tools ?? []).map((tool) => tool.name));
for (const expected of [
  'aio_check',
  'aio_whoami',
  'aio_folders',
  'aio_cases',
  'aio_plan',
  'aio_sync',
  'probe_validate_spec',
  'probe_lint_cases',
  'probe_coverage',
]) {
  assert(names.has(expected), `tools/list is missing "${expected}".`);
}
for (const tool of replies.get(2).result.tools) {
  assert(tool.description?.length > 20, `${tool.name} has no usable description.`);
  assert(tool.inputSchema?.type === 'object', `${tool.name} has no object inputSchema.`);
}
console.log('ok    every verb is listed with a description and an input schema');

// 3. A tool call really runs the bundled script.
const validate = replies.get(3);
assert(validate?.result, 'probe_validate_spec returned no result.');
assert(validate.result.isError !== true, `probe_validate_spec failed: ${JSON.stringify(validate)}`);
assert(
  validate.result.content?.[0]?.text?.includes('0 error(s)'),
  `probe_validate_spec did not run the validator: ${JSON.stringify(validate.result)}`,
);
console.log('ok    a tool call executes the bundled script and returns its output');

// 4. The live write is refused without confirmation. The Bash blast-radius guard
//    is a PreToolUse hook on Bash; on this path it never fires, so this refusal
//    is the only thing between a tool call and the production Jira tenant.
const refused = replies.get(4);
assert(refused?.result?.isError === true, 'aio_sync without confirm was not refused.');
assert(
  /confirm=true/.test(refused.result.content?.[0]?.text ?? ''),
  `The refusal did not say how to proceed: ${JSON.stringify(refused.result)}`,
);
console.log('ok    a live sync without confirm=true is refused, and says why');

// 5. An unknown tool is a protocol error, not a silent success.
const unknown = replies.get(5);
assert(unknown?.error, 'An unknown tool did not produce an error.');
console.log('ok    an unknown tool is rejected');

// The notification check above is only worth having if it can fail, so prove it:
// a stream carrying an id-less reply must be rejected by the same comparison.
{
  const emitted = [{ id: 1, result: {} }, { result: {} }];
  const keyed = new Map(emitted.filter((m) => m.id !== undefined).map((m) => [m.id, m]));
  assert(emitted.length !== keyed.size, 'The notification check cannot detect a stray reply.');
  console.log('ok    the notification check would catch a stray reply');
}

process.stdout.write('\nPROBE MCP adapter tests passed.\n');
