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
  'governance',
]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const gateModes = new Set(['active', 'hibernated']);
const gateScopes = new Set(['design', 'merge', 'ops']);

function stripComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if ((character === '"' || character === "'") && line[index - 1] !== '\\') {
      quote = quote === character ? null : (quote ?? character);
    }
    if (character === '#' && quote === null && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index).trimEnd();
    }
  }
  return line;
}

function splitFlowItems(value) {
  const items = [];
  let quote = null;
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if ((character === '"' || character === "'") && value[index - 1] !== '\\') {
      quote = quote === character ? null : (quote ?? character);
      continue;
    }
    if (quote !== null) continue;
    if (character === '[' || character === '{') depth += 1;
    else if (character === ']' || character === '}') depth -= 1;
    else if (character === ',' && depth === 0) {
      items.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  items.push(value.slice(start).trim());
  return items.filter(Boolean);
}

function parseScalar(raw) {
  const value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  // Inline flow sequence, e.g. `scope: [design, merge, ops]`. Added for
  // governance.gates.scope, the first array-valued key in the schema — without
  // it the value parses as the literal string "[design, merge, ops]" and every
  // scope check fails on a configuration that is actually correct.
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    return inner === '' ? [] : splitFlowItems(inner).map((item) => parseScalar(item));
  }
  if (value.startsWith('{') && value.endsWith('}')) {
    const inner = value.slice(1, -1).trim();
    if (inner === '') return {};
    const result = {};
    for (const item of splitFlowItems(inner)) {
      const match = item.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
      if (!match || match[2] === '') {
        throw new Error(`Invalid inline mapping entry '${item}'.`);
      }
      const [, key, rawValue] = match;
      if (Object.hasOwn(result, key)) {
        throw new Error(`Duplicate inline mapping key '${key}'.`);
      }
      result[key] = parseScalar(rawValue);
    }
    return result;
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
    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1);
    if (indent <= parent.indent) {
      throw new Error(`${source}:${index + 1}: invalid indentation`);
    }
    const trimmed = line.trim();
    if (trimmed.startsWith('-')) {
      if (!Array.isArray(parent.value)) {
        throw new Error(`${source}:${index + 1}: sequence item has no sequence parent`);
      }
      const item = trimmed.match(/^-\s+(.+)$/);
      if (!item) {
        throw new Error(`${source}:${index + 1}: expected a scalar sequence item`);
      }
      parent.value.push(parseScalar(item[1]));
      continue;
    }
    if (Array.isArray(parent.value)) {
      throw new Error(`${source}:${index + 1}: expected a sequence item`);
    }
    const match = trimmed.match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!match) {
      throw new Error(`${source}:${index + 1}: expected a mapping entry`);
    }
    const [, key, rawValue = ''] = match;
    if (Object.hasOwn(parent.value, key)) {
      throw new Error(`${source}:${index + 1}: duplicate key '${key}'`);
    }
    if (rawValue === '') {
      let nextContainer = {};
      for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
        const nextRawLine = lines[nextIndex];
        if (!nextRawLine.trim() || nextRawLine.trimStart().startsWith('#')) continue;
        const nextLine = stripComment(nextRawLine);
        if (!nextLine.trim()) continue;
        const nextIndent = nextLine.length - nextLine.trimStart().length;
        if (nextIndent > indent && nextLine.trim().startsWith('-')) nextContainer = [];
        break;
      }
      parent.value[key] = nextContainer;
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

  // Gate hibernation (PROBE policy P17). Hibernation suspends BLOCKING only, so
  // it must never be declarable as an anonymous switch: a suspension with no
  // named human and no reason is not a governance decision, and accepting one
  // would turn the mechanism into exactly the silent waiver it exists to avoid.
  const gates = config.governance?.gates;
  if (gates !== undefined) {
    if (!gateModes.has(gates.mode)) {
      errors.push("governance.gates.mode must be 'active' or 'hibernated'.");
    }
    if (gates.mode === 'hibernated') {
      const scope = Array.isArray(gates.scope) ? gates.scope : [];
      if (scope.length === 0) {
        errors.push('governance.gates.scope must list at least one gate when hibernated.');
      }
      for (const entry of scope) {
        if (!gateScopes.has(entry)) {
          errors.push(`governance.gates.scope has unknown gate '${entry}'.`);
        }
      }
      for (const field of ['name', 'email', 'role']) {
        if (!gates.authorizedBy?.[field]) {
          errors.push(`governance.gates.authorizedBy.${field} is required when hibernated.`);
        }
      }
      if (!gates.reason) errors.push('governance.gates.reason is required when hibernated.');
      if (!datePattern.test(gates.since ?? '')) {
        errors.push('governance.gates.since must be YYYY-MM-DD when hibernated.');
      }
      for (const field of ['until', 'reviewOn']) {
        const value = gates[field];
        if (value !== undefined && value !== null && !datePattern.test(String(value))) {
          errors.push(`governance.gates.${field} must be YYYY-MM-DD or null.`);
        }
      }
      // An expired hibernation is reported, never silently honoured.
      if (datePattern.test(String(gates.until ?? '')) && options.today) {
        if (String(gates.until) < options.today) {
          warnings.push(
            `Gate hibernation expired on ${gates.until}; gates are active. ` +
              'Renew governance.gates.until or set mode to active.',
          );
        }
      }
    }
  }

  return { errors, warnings };
}

export function resolveConsumerPath(root, relativePath) {
  return path.resolve(root, ...relativePath.split(/[\\/]/));
}
