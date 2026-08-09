import fs from 'node:fs';
import path from 'node:path';

const semverPattern = /^\d+\.\d+\.\d+$/;
const topLevelKeys = new Set([
  'schemaVersion',
  'probeVersion',
  'profile',
  'paths',
  'commands',
  'integrations',
  'policies',
]);

function stripComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if ((character === '"' || character === "'") && line[index - 1] !== '\\') {
      quote = quote === character ? null : quote ?? character;
    }
    if (character === '#' && quote === null && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index).trimEnd();
    }
  }
  return line;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

export function parseSimpleYaml(content, source = 'probe.config.yaml') {
  const result = {};
  const stack = [{ indent: -1, value: result }];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) continue;
    if (rawLine.includes('\t')) {
      throw new Error(`${source}:${index + 1}: tabs are not allowed`);
    }
    const line = stripComment(rawLine);
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const match = line.trim().match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!match) {
      throw new Error(`${source}:${index + 1}: expected a mapping entry`);
    }
    const [, key, rawValue = ''] = match;
    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1);
    if (indent <= parent.indent) {
      throw new Error(`${source}:${index + 1}: invalid indentation`);
    }
    if (Object.hasOwn(parent.value, key)) {
      throw new Error(`${source}:${index + 1}: duplicate key '${key}'`);
    }
    if (rawValue === '') {
      parent.value[key] = {};
      stack.push({ indent, value: parent.value[key] });
    } else {
      parent.value[key] = parseScalar(rawValue);
    }
  }
  return result;
}

export function loadProbeConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  return parseSimpleYaml(fs.readFileSync(configPath, 'utf8'), configPath);
}

function isRelativeConsumerPath(value) {
  return (
    typeof value === 'string' &&
    value.trim() !== '' &&
    !path.isAbsolute(value) &&
    !path.win32.isAbsolute(value) &&
    !value.split(/[\\/]/).includes('..')
  );
}

export function validateProbeConfig(config, options = {}) {
  const errors = [];
  const warnings = [];
  const expectedVersion = options.expectedVersion;

  for (const key of Object.keys(config)) {
    if (!topLevelKeys.has(key)) errors.push(`Unknown top-level key: ${key}`);
  }
  if (config.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (!semverPattern.test(config.probeVersion ?? '')) {
    errors.push('probeVersion must use major.minor.patch.');
  } else if (expectedVersion && config.probeVersion !== expectedVersion) {
    errors.push(
      `probeVersion ${config.probeVersion} does not match installed CLI ${expectedVersion}.`,
    );
  }
  if (typeof config.profile !== 'string' || !config.profile) {
    warnings.push("profile is missing; PROBE will use 'generic'.");
  }

  if (!config.paths || typeof config.paths !== 'object') {
    errors.push('paths must be a mapping.');
  } else {
    for (const key of ['features', 'ledgers', 'artifacts']) {
      if (!isRelativeConsumerPath(config.paths[key])) {
        errors.push(`paths.${key} must be a non-empty path inside the consumer repository.`);
      }
    }
    for (const key of ['requirements', 'testData']) {
      if (config.paths[key] !== undefined && !isRelativeConsumerPath(config.paths[key])) {
        errors.push(`paths.${key} must stay inside the consumer repository.`);
      }
    }
  }

  if (config.commands !== undefined) {
    if (!config.commands || typeof config.commands !== 'object') {
      errors.push('commands must be a mapping.');
    } else {
      for (const [name, command] of Object.entries(config.commands)) {
        if (typeof command !== 'string' || command.trim() === '') {
          errors.push(`commands.${name} must be a non-empty command.`);
        }
      }
    }
  }

  const knowledge = config.integrations?.knowledge;
  if (knowledge?.required === true && !knowledge.provider) {
    errors.push('integrations.knowledge.provider is required.');
  }
  if (knowledge?.source === 'claude-plugin') {
    const expected = {
      provider: 'yieldwerx-knowledgebase',
      marketplace: 'yieldwerx-company',
      plugin: 'yieldwerx-knowledgebase',
      skill: 'ask-yieldwerx',
    };
    for (const [key, value] of Object.entries(expected)) {
      if (knowledge[key] !== value) {
        errors.push(`integrations.knowledge.${key} must be '${value}'.`);
      }
    }
    if (!semverPattern.test(knowledge.revision ?? '')) {
      errors.push('integrations.knowledge.revision must use major.minor.patch.');
    }
  } else if (knowledge?.required === true) {
    warnings.push(
      "Required knowledge is not using source 'claude-plugin'; verify the provider manually.",
    );
  }

  return { errors, warnings };
}

export function resolveConsumerPath(root, relativePath) {
  return path.resolve(root, ...relativePath.split(/[\\/]/));
}
