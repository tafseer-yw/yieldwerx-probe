/**
 * Generate the plugin's `commands/` dispatch shims from `skills/`.
 *
 * Why this exists
 * ---------------
 * Every public PROBE entry point is authored once, as `skills/<name>/SKILL.md`.
 * Claude Code resolves those into `/yw:<name>` slash commands, but not every
 * host does: Claude Desktop (and Claude Code under some marketplace/config
 * layouts) registers the `/` menu from a plugin's `commands/` directory only.
 * There, the skills still load for model invocation — they show up in the
 * Skills panel — while `/yw:probe-spec` answers `Unknown command`.
 *
 * So each skill gets a flat `commands/<name>.md` shim. A shim carries the
 * skill's own `description` and `argument-hint` so autocomplete is identical,
 * and its body does exactly one thing: tell Claude to read that skill's
 * SKILL.md and follow it. Process authority stays in the skill; the shim owns
 * no steps, so it does not matter which of the two a host resolves first.
 *
 * Run `npm run commands` after adding, renaming, or re-describing a skill.
 * `npm run validate` fails when the two directories drift.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const pluginRoot = path.join(root, 'plugins', 'yieldwerx-probe');
const skillsRoot = path.join(pluginRoot, 'skills');
const commandsRoot = path.join(pluginRoot, 'commands');

/**
 * Pull a single-line scalar out of a SKILL.md front-matter block, returning the
 * raw text after `key:`. Reusing the skill's own line verbatim keeps the shim's
 * YAML exactly as valid as the source it came from.
 */
export function readFrontmatterField(source, key) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!frontmatter) return null;
  const field = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm').exec(frontmatter[1]);
  if (!field) return null;
  const value = field[1].trim();
  return value === '' ? null : value;
}

export function renderCommand(name, description, argumentHint) {
  const frontmatter = [`description: ${description}`];
  if (argumentHint) frontmatter.push(`argument-hint: ${argumentHint}`);

  return `---
${frontmatter.join('\n')}
---

Run the PROBE \`${name}\` skill.

Read \`\${CLAUDE_PLUGIN_ROOT}/skills/${name}/SKILL.md\` and follow it exactly.
That file is the authority for this command and owns the procedure, track,
safety level, gate rules, evidence, and consumer contract. This file is dispatch
only: it adds no process, so never infer a step from it.

Arguments: $ARGUMENTS
`;
}

export function listSkills() {
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(skillsRoot, name, 'SKILL.md')))
    .sort();
}

function main() {
  const skills = listSkills();
  const errors = [];

  fs.mkdirSync(commandsRoot, { recursive: true });

  const expected = new Set(skills.map((name) => `${name}.md`));
  for (const stale of fs.readdirSync(commandsRoot)) {
    if (!expected.has(stale)) {
      fs.rmSync(path.join(commandsRoot, stale), { recursive: true, force: true });
      process.stdout.write(`removed stale commands/${stale}\n`);
    }
  }

  let written = 0;
  for (const name of skills) {
    const source = fs.readFileSync(path.join(skillsRoot, name, 'SKILL.md'), 'utf8');
    const description = readFrontmatterField(source, 'description');
    if (!description) {
      errors.push(`skills/${name}/SKILL.md: missing a single-line description`);
      continue;
    }
    const rendered = renderCommand(
      name,
      description,
      readFrontmatterField(source, 'argument-hint'),
    );
    const target = path.join(commandsRoot, `${name}.md`);
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
    if (current !== rendered) {
      fs.writeFileSync(target, rendered);
      written += 1;
    }
  }

  if (errors.length > 0) {
    process.stderr.write(`${errors.map((error) => `  - ${error}`).join('\n')}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `commands/ in sync with ${skills.length} skills (${written} file(s) rewritten)\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
