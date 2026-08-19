#!/usr/bin/env node
/**
 * PROBE tools — a dependency-free stdio MCP server.
 *
 * WHY THIS EXISTS
 *
 * Every PROBE capability with an executable behind it is reached through a shell
 * command: `probe aio sync`, `probe validate-spec`, the consumer's configured
 * `lintCases` and `requirementsCoverage`. That works in Claude Code, which has a
 * Bash tool. It does not work in Claude Desktop, which gives the assistant no
 * shell at all — so `/sync-cases` had no engine there and simply failed, and the
 * spec validator, Gherkin lint, and coverage report were unreachable for the same
 * reason.
 *
 * The host still runs processes; it just does not let the *assistant* run them.
 * So the fix is to expose the same verbs as MCP tools that the host launches
 * itself. This file is that adapter. It reuses the bundled scripts verbatim
 * rather than reimplementing them — one engine, three front ends (CLI, MCP,
 * export bundle).
 *
 * SAFETY
 *
 * The Bash guard that asks before a live AIO write (scripts/guards/bash-guard.mjs
 * matching `--live`) is a PreToolUse hook on the Bash tool. On this path there is
 * no Bash call, so that guard never fires. `aio_sync` therefore carries its own
 * confirmation: it refuses without `confirm: true`, and the underlying adapter
 * still refuses without a recorded human Design Gate approval. Both checks must
 * pass; neither substitutes for the other.
 *
 * Secrets are read from the process environment and the consumer's gitignored
 * `.env`, exactly as the CLI does. They are never logged, never returned in a
 * tool result, and never written into a plugin manifest.
 *
 * PROTOCOL
 *
 * Newline-delimited JSON-RPC 2.0 over stdin/stdout — `initialize`,
 * `tools/list`, `tools/call`, and the `notifications/initialized` no-op. That is
 * the whole surface an MCP host needs from a stdio server, and implementing it
 * directly keeps this file dependency-free, which matters because it ships inside
 * a plugin that must install without a build step.
 *
 * Run: node server.mjs   (hosts launch it; there is nothing to run by hand)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * The consumer repository root.
 *
 * A host that does not substitute `${CLAUDE_PROJECT_DIR}` passes the literal
 * string through, and a literal is truthy — so a bare `|| process.cwd()` never
 * fires and every tool then fails with `spawnSync … ENOENT`, which reads as a
 * broken Node install rather than an unexpanded variable. Require a directory
 * that actually exists before trusting it.
 */
function resolveProjectDir() {
  const declared = process.env.CLAUDE_PROJECT_DIR;
  if (declared && !declared.includes('${') && fs.existsSync(declared)) {
    try {
      if (fs.statSync(declared).isDirectory()) return declared;
    } catch {
      // Fall through to the working directory.
    }
  }
  return process.cwd();
}

const projectDir = resolveProjectDir();
const PROTOCOL_VERSION = '2024-11-05';

const manifest = JSON.parse(
  fs.readFileSync(path.join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8'),
);

/**
 * Environment for a bundled script: the inherited environment plus the
 * consumer's gitignored `.env`, which never overrides a real environment
 * variable. Same precedence the CLI uses, so a token works identically in both.
 */
function scriptEnvironment() {
  const environment = { ...process.env };
  const envPath = path.join(projectDir, '.env');
  if (!fs.existsSync(envPath)) return environment;
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || environment[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    environment[match[1]] = value;
  }
  return environment;
}

/**
 * Run a bundled script and capture its output as text.
 *
 * Output is captured rather than inherited because it becomes the tool result.
 * A non-zero exit is reported as an error result with the output intact — a
 * refused live sync or a failing validator is information the caller needs, not
 * a transport failure.
 */
function runScript(relativePath, args) {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 18)) {
    return { ok: false, text: 'PROBE requires Node.js 22.18 or newer.' };
  }
  const script = path.join(pluginRoot, ...relativePath.split('/'));
  if (!fs.existsSync(script)) {
    return { ok: false, text: `Bundled script not found: ${relativePath}` };
  }
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: projectDir,
    encoding: 'utf8',
    env: scriptEnvironment(),
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) return { ok: false, text: result.error.message };
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  return {
    ok: (result.status ?? 1) === 0,
    text: text || `(no output; exit ${result.status ?? 'unknown'})`,
  };
}

/** Escape a string for literal use inside a regular expression. */
function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Run a command the consumer configured in `probe.config.yaml` under `commands`.
 *
 * PROBE never guesses a consumer command — an unconfigured capability is
 * reported as unavailable, which is a fact the caller can act on, rather than a
 * guessed npm script that fails confusingly.
 */
function runConfiguredCommand(key, extraArgs) {
  const configPath = path.join(projectDir, 'probe.config.yaml');
  if (!fs.existsSync(configPath)) {
    return {
      ok: false,
      text:
        `No probe.config.yaml in ${projectDir}, so the "${key}" command is not configured. ` +
        'Add one, or run this capability through the PROBE CLI.',
    };
  }
  const configText = fs.readFileSync(configPath, 'utf8');
  const commandsBlock = configText.match(/^commands:\s*$([\s\S]*?)(?=^\S|$(?![\s\S]))/m)?.[1] ?? '';
  const raw = commandsBlock.match(
    new RegExp(`^\\s+${escapeForRegExp(key)}:\\s*(.+?)\\s*$`, 'm'),
  )?.[1];
  if (!raw) {
    return {
      ok: false,
      text: `probe.config.yaml declares no "commands.${key}", so that capability is unavailable here.`,
    };
  }
  const command = raw.replace(/^["']|["']$/g, '');
  const parts = [...command.split(/\s+/), ...extraArgs].filter(Boolean);
  const result = spawnSync(parts[0], parts.slice(1), {
    cwd: projectDir,
    encoding: 'utf8',
    env: scriptEnvironment(),
    maxBuffer: 32 * 1024 * 1024,
    // Windows resolves `npm` only as `npm.cmd`, which spawn cannot find without a
    // shell — and the shipped example configs use `npm run …`. Without this the
    // adapter fails on the platform it most exists to serve.
    shell: process.platform === 'win32',
    windowsHide: true,
  });
  if (result.error) return { ok: false, text: `${command}: ${result.error.message}` };
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  return { ok: (result.status ?? 1) === 0, text: text || `(no output from \`${command}\`)` };
}

const featureSlug = {
  type: 'string',
  description: 'Feature slug in kebab-case, e.g. wafer-map-cluster-detection.',
};

/**
 * The verbs. Each one maps to exactly what the CLI runs, so a capability behaves
 * identically whichever front end reached it.
 */
const tools = [
  {
    name: 'aio_check',
    description:
      'Check AIO Tests connectivity: does the configured token authenticate against the configured project? Read-only; safe to run any time.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: () => runScript('adapters/aio/scripts/aio-check.ts', []),
  },
  {
    name: 'aio_whoami',
    description:
      'Report the AIO access context — base URL, project, account id, and permission. Read-only. Never prints the token.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: () => runScript('adapters/aio/scripts/aio-whoami.ts', []),
  },
  {
    name: 'aio_folders',
    description: 'List the AIO test-case folder tree, to confirm a sync target. Read-only.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: () => runScript('adapters/aio/scripts/aio-folders.ts', []),
  },
  {
    name: 'aio_cases',
    description:
      'List the cases already in an AIO folder, for a duplicate check before syncing. Read-only. A bare name lists candidate folders when ambiguous.',
    inputSchema: {
      type: 'object',
      properties: { folder: { type: 'string', description: 'Folder name or path.' } },
      additionalProperties: false,
    },
    run: (args) => runScript('adapters/aio/scripts/aio-cases.ts', [args.folder].filter(Boolean)),
  },
  {
    name: 'aio_plan',
    description:
      'Dry-run the Case Sync: parse the feature files and write the exact create/update plan to 25-aio-sync/aio-sync.md. Writes no remote data and needs no credentials. Always run this before aio_sync.',
    inputSchema: {
      type: 'object',
      properties: {
        feature: featureSlug,
        category: { type: 'string', description: 'Optional CAT-NN to narrow the scope.' },
      },
      required: ['feature'],
      additionalProperties: false,
    },
    run: (args) =>
      runScript('adapters/aio/scripts/aio-sync.ts', [
        args.feature,
        ...(args.category ? ['--category', args.category] : []),
      ]),
  },
  {
    name: 'aio_sync',
    description:
      'LIVE: create or update AIO test cases for a feature and write the returned keys back into the feature files. This writes to the production Jira tenant. Requires confirm=true AND a recorded human Design Gate approval in the ledger; both are checked and neither substitutes for the other. Run aio_plan first and have a human review that plan.',
    inputSchema: {
      type: 'object',
      properties: {
        feature: featureSlug,
        category: { type: 'string', description: 'Optional CAT-NN to narrow the scope.' },
        confirm: {
          type: 'boolean',
          description:
            'Must be true. Set it only after a human has reviewed the dry-run plan and asked for the live push.',
        },
      },
      required: ['feature', 'confirm'],
      additionalProperties: false,
    },
    run: (args) => {
      // The Bash blast-radius guard cannot see this call, so the confirmation
      // lives here. Without it a single tool call would write to the production
      // Jira tenant with nothing in between.
      if (args.confirm !== true) {
        return {
          ok: false,
          text:
            'Refused: aio_sync writes to the production Jira tenant. Run aio_plan, have a human ' +
            'review the plan, then call again with confirm=true. The adapter separately requires a ' +
            'recorded human Design Gate approval for this scope.',
        };
      }
      return runScript('adapters/aio/scripts/aio-sync.ts', [
        args.feature,
        ...(args.category ? ['--category', args.category] : []),
        '--live',
      ]);
    },
  },
  {
    name: 'probe_validate_spec',
    description:
      'Validate a spec-analysis.md against the Spec Probe contract: required sections, AC formats, plain-language rules, and requirement-authority sources. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'Path to the spec-analysis.md, relative to the project root. Defaults to the standard artifact path when a feature is given instead.',
        },
        feature: featureSlug,
      },
      additionalProperties: false,
    },
    run: (args) => {
      const target =
        args.path ??
        (args.feature
          ? path.join('.probe', 'artifacts', args.feature, '10-spec', 'spec-analysis.md')
          : null);
      if (!target) return { ok: false, text: 'Give either a path or a feature slug.' };
      return runScript('skills/probe-spec/scripts/validate-spec-analysis.mjs', [target]);
    },
  },
  {
    name: 'probe_validate_prd',
    description:
      'Validate a PRD against the Requirements Forge contract: sections, story format, lifecycle/signature consistency, and the plain-language rules. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the PRD file, relative to the project root.',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
    run: (args) => runScript('skills/forge-prd/scripts/validate-prd.mjs', [args.path]),
  },
  {
    name: 'probe_lint_cases',
    description:
      "Run the consumer's configured Gherkin lint over a feature's case set. Read-only. Reports the capability as unavailable when probe.config.yaml declares no lintCases command.",
    inputSchema: {
      type: 'object',
      properties: { feature: featureSlug },
      required: ['feature'],
      additionalProperties: false,
    },
    run: (args) => runConfiguredCommand('lintCases', [args.feature]),
  },
  {
    name: 'probe_coverage',
    description:
      "Generate the requirements-coverage report for a feature using the consumer's configured requirementsCoverage command. Writes docs/qa/<feature>/coverage.{md,json}.",
    inputSchema: {
      type: 'object',
      properties: { feature: featureSlug },
      required: ['feature'],
      additionalProperties: false,
    },
    run: (args) => runConfiguredCommand('requirementsCoverage', [args.feature]),
  },
];

const byName = new Map(tools.map((tool) => [tool.name, tool]));

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function reply(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function replyError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

function handle(request) {
  const { id, method, params } = request;

  if (method === 'initialize') {
    reply(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: 'probe-tools', version: manifest.version ?? '0.0.0' },
    });
    return;
  }

  // Notifications carry no id and must never be answered.
  if (method === 'notifications/initialized' || method === 'initialized') return;

  if (method === 'ping') {
    reply(id, {});
    return;
  }

  if (method === 'tools/list') {
    reply(id, {
      tools: tools.map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      })),
    });
    return;
  }

  if (method === 'tools/call') {
    const tool = byName.get(params?.name);
    if (!tool) {
      replyError(id, -32602, `Unknown tool: ${params?.name}`);
      return;
    }
    let outcome;
    try {
      outcome = tool.run(params?.arguments ?? {});
    } catch (error) {
      outcome = { ok: false, text: `${tool.name} failed: ${error.message}` };
    }
    // A failing script is a normal result with isError set, not a protocol
    // error: the caller needs the refusal text, which is where the reason is.
    reply(id, { content: [{ type: 'text', text: outcome.text }], isError: !outcome.ok });
    return;
  }

  if (id !== undefined) replyError(id, -32601, `Unsupported method: ${method}`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let newline = buffer.indexOf('\n');
  while (newline !== -1) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (line) {
      try {
        handle(JSON.parse(line));
      } catch {
        // A malformed line has no id to answer against, so there is nobody to
        // tell. Staying up is strictly better than exiting the transport.
      }
    }
    newline = buffer.indexOf('\n');
  }
});
process.stdin.on('end', () => process.exit(0));
