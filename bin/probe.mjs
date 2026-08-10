#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  loadProbeConfig,
  resolveConsumerPath,
  validateProbeConfig,
} from '../plugins/yieldwerx-probe/lib/probe-config.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(packageRoot, 'plugins', 'yieldwerx-probe');
const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const cliVersion = packageJson.version;

function usage(exitCode = 0) {
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`YieldWerx PROBE CLI ${cliVersion}

Usage:
  probe doctor [--root <path>] [--config <path>] [--json] [--skip-plugin-check]
  probe validate-config [--root <path>] [--config <path>] [--json]
  probe validate-spec <spec-analysis.md>
  probe lint-gherkin <feature-slug> [selectors]
  probe coverage <feature-slug>
  probe owner-bypass authorize|verify|consume [arguments]
  probe aio check|whoami|folders|cases|sync [arguments]
  probe --version
`);
  process.exit(exitCode);
}

function parseCommonOptions(args) {
  const options = {
    root: process.cwd(),
    config: 'probe.config.yaml',
    json: false,
    skipPluginCheck: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === '--json') options.json = true;
    else if (option === '--skip-plugin-check') options.skipPluginCheck = true;
    else if (option === '--root' || option === '--config') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${option}.`);
      }
      options[option.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${option}`);
    }
  }
  options.root = path.resolve(options.root);
  options.config = path.resolve(options.root, options.config);
  return options;
}

function readProjectSettings(root) {
  const settingsPath = path.join(root, '.claude', 'settings.json');
  if (!fs.existsSync(settingsPath)) return { settingsPath, settings: null };
  try {
    return {
      settingsPath,
      settings: JSON.parse(fs.readFileSync(settingsPath, 'utf8')),
    };
  } catch (error) {
    return { settingsPath, settings: null, error: error.message };
  }
}

function installedPlugins() {
  const executable = process.platform === 'win32' ? 'claude.exe' : 'claude';
  const result = spawnSync(executable, ['plugin', 'list', '--json'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error) return { available: false, error: result.error.message, plugins: [] };
  if (result.status !== 0) {
    return {
      available: true,
      error: (result.stderr || result.stdout || `exit ${result.status}`).trim(),
      plugins: [],
    };
  }
  try {
    const parsed = JSON.parse(result.stdout);
    return { available: true, plugins: Array.isArray(parsed) ? parsed : parsed.plugins ?? [] };
  } catch {
    return { available: true, error: 'Claude plugin list did not return JSON.', plugins: [] };
  }
}

function findPluginVersion(value, name) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPluginVersion(item, name);
      if (found !== null) return found;
    }
  } else if (value && typeof value === 'object') {
    const identity = value.name ?? value.id ?? value.plugin ?? value.pluginId;
    if (typeof identity === 'string' && identity.includes(name)) {
      return value.version ?? value.resolvedVersion ?? 'unknown';
    }
    for (const item of Object.values(value)) {
      const found = findPluginVersion(item, name);
      if (found !== null) return found;
    }
  }
  return null;
}

function inspectConsumer(options, includeRuntimePlugins, includeConsumerChecks) {
  let config;
  const errors = [];
  const warnings = [];
  try {
    config = loadProbeConfig(options.config);
  } catch (error) {
    return { config: null, errors: [error.message], warnings, checks: {} };
  }
  const validated = validateProbeConfig(config, { expectedVersion: cliVersion });
  errors.push(...validated.errors);
  warnings.push(...validated.warnings);

  const checks = {
    root: options.root,
    config: options.config,
    cliVersion,
    paths: {},
    projectPlugins: {},
    installedPlugins: {},
  };
  if (!includeConsumerChecks) {
    return { config, errors, warnings, checks };
  }
  for (const [name, relativePath] of Object.entries(config.paths ?? {})) {
    const resolved = resolveConsumerPath(options.root, relativePath);
    const exists = fs.existsSync(resolved);
    checks.paths[name] = { path: relativePath, exists };
    if (!exists && ['features', 'ledgers'].includes(name)) {
      warnings.push(`Configured ${name} path does not exist yet: ${relativePath}`);
    }
  }

  const { settingsPath, settings, error } = readProjectSettings(options.root);
  if (error) errors.push(`${settingsPath}: invalid JSON (${error})`);
  const expectedPlugins = ['yw@yieldwerx'];
  const knowledge = config.integrations?.knowledge;
  if (knowledge?.source === 'claude-plugin') {
    expectedPlugins.push(`${knowledge.plugin}@${knowledge.marketplace}`);
  }
  for (const plugin of expectedPlugins) {
    const enabled = settings?.enabledPlugins?.[plugin] === true;
    checks.projectPlugins[plugin] = enabled;
    if (!enabled) errors.push(`Project plugin is not enabled in .claude/settings.json: ${plugin}`);
  }

  if (includeRuntimePlugins) {
    const runtime = installedPlugins();
    if (!runtime.available) {
      warnings.push(`Claude CLI is unavailable; installed-plugin check skipped (${runtime.error}).`);
    } else if (runtime.error) {
      warnings.push(`Could not inspect installed Claude plugins: ${runtime.error}`);
    } else {
      for (const plugin of expectedPlugins) {
        const name = plugin.split('@')[0];
        const version = findPluginVersion(runtime.plugins, name);
        checks.installedPlugins[plugin] = version;
        if (version === null) errors.push(`Claude plugin is not installed: ${plugin}`);
        if (name === 'yw' && version !== null && version !== cliVersion) {
          errors.push(`Installed PROBE plugin ${version} does not match CLI ${cliVersion}.`);
        }
        if (
          name === knowledge?.plugin &&
          version !== null &&
          version !== 'unknown' &&
          version !== knowledge.revision
        ) {
          errors.push(
            `Installed knowledge plugin ${version} does not match configured ${knowledge.revision}.`,
          );
        }
      }
    }
  }
  return { config, errors, warnings, checks };
}

function printInspection(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(
      `PROBE ${cliVersion}: ${result.errors.length} error(s), ${result.warnings.length} warning(s)\n`,
    );
    for (const error of result.errors) process.stderr.write(`ERROR: ${error}\n`);
    for (const warning of result.warnings) process.stdout.write(`WARN: ${warning}\n`);
  }
  if (result.errors.length) process.exitCode = 1;
}

function environmentWithLocalFile() {
  const environment = { ...process.env };
  const envPath = path.join(process.cwd(), '.env');
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

function runBundled(relativePath, args, environment = process.env) {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 18)) {
    process.stderr.write('PROBE CLI requires Node.js 22.18 or newer.\n');
    process.exit(1);
  }
  const script = path.join(pluginRoot, ...relativePath.split('/'));
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: environment,
    windowsHide: true,
  });
  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

const [command, ...args] = process.argv.slice(2);
if (!command || command === 'help' || command === '--help' || command === '-h') usage();
if (command === '--version' || command === '-v') {
  process.stdout.write(`${cliVersion}\n`);
} else if (command === 'doctor' || command === 'validate-config') {
  try {
    const options = parseCommonOptions(args);
    const result = inspectConsumer(
      options,
      command === 'doctor' && !options.skipPluginCheck,
      command === 'doctor',
    );
    printInspection(result, options.json);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(2);
  }
} else if (command === 'validate-spec') {
  runBundled('skills/probe-spec/scripts/validate-spec-analysis.mjs', args);
} else if (command === 'lint-gherkin') {
  runBundled('scripts/probe-lint-gherkin.ts', args);
} else if (command === 'coverage') {
  runBundled('scripts/gen-coverage-report.ts', args);
} else if (command === 'owner-bypass') {
  runBundled('scripts/owner-bypass.mjs', args, environmentWithLocalFile());
} else if (command === 'aio') {
  const [action, ...actionArgs] = args;
  const scripts = {
    help: 'adapters/aio/scripts/aio-help.ts',
    check: 'adapters/aio/scripts/aio-check.ts',
    whoami: 'adapters/aio/scripts/aio-whoami.ts',
    folders: 'adapters/aio/scripts/aio-folders.ts',
    cases: 'adapters/aio/scripts/aio-cases.ts',
    sync: 'adapters/aio/scripts/aio-sync.ts',
  };
  if (!scripts[action]) usage(2);
  runBundled(scripts[action], actionArgs, environmentWithLocalFile());
} else {
  usage(2);
}
