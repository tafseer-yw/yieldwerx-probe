import fs from 'node:fs';
import path from 'node:path';

const semverPattern = /^\d+\.\d+\.\d+$/;
const topLevelKeys = new Set([
  'schemaVersion',
  'probeVersion',
  'profile',
  'stacks',
  'paths',
  'commands',
  'integrations',
  'policies',
]);

/**
 * Keys that existed and were deliberately removed, with what to do about it.
 *
 * A bare "Unknown top-level key" reads as a typo, and the natural response to a
 * suspected typo is to put the key back. These entries say the key is gone on
 * purpose and why, so an upgrade fails in a way that explains itself.
 */
const removedTopLevelKeys = new Map([
  [
    'governance',
    'governance.gates (gate hibernation) was removed in 3.0. Gates no longer block — ' +
      'each one records a human decision — so there is nothing to suspend. Delete the block.',
  ],
]);

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
  // Inline flow sequence, e.g. `levels: [design, merge, ops]`. Without it an
  // array value parses as the literal string "[design, merge, ops]" and every
  // check against it fails on a configuration that is actually correct.
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
    if (topLevelKeys.has(key)) continue;
    const removed = removedTopLevelKeys.get(key);
    errors.push(removed ? `${key}: ${removed}` : `Unknown top-level key: ${key}`);
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

  // Application stacks for dev-track --stack routing. The list is the
  // consumer's declaration of which stacks exist here; the first entry is the
  // default. Shape-only validation — profile directories are plugin- or
  // consumer-owned, so existence is checked by the skill that loads one.
  if (config.stacks !== undefined) {
    if (!Array.isArray(config.stacks) || config.stacks.length === 0) {
      errors.push('stacks must be a non-empty list of profile names.');
    } else {
      for (const entry of config.stacks) {
        if (typeof entry !== 'string' || !entry.trim()) {
          errors.push('stacks entries must be non-empty profile names.');
          break;
        }
      }
      const seen = new Set();
      for (const entry of config.stacks) {
        if (seen.has(entry)) {
          errors.push(`stacks lists '${entry}' more than once.`);
          break;
        }
        seen.add(entry);
      }
    }
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
