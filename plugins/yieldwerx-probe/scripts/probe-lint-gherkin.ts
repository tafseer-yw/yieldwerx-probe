import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

type ScenarioType = 'positive' | 'functional' | 'negative' | 'edge';

interface Selector {
  featureSlug: string;
  scenarioType?: ScenarioType;
  category?: string;
  ac?: string;
  tc?: string;
  json: boolean;
}

interface Finding {
  severity: 'error' | 'warning';
  rule: string;
  file: string;
  line: number;
  scenario?: string;
  message: string;
}

interface Scenario {
  file: string;
  line: number;
  title: string;
  isOutline: boolean;
  tags: string[];
  acs: string[];
  description: string[];
  steps: Array<{ line: number; keyword: string; text: string }>;
  exampleHeaders: string[];
}

const scenarioTypes = new Set<ScenarioType>(['positive', 'functional', 'negative', 'edge']);
const stepPattern = /^(Given|When|Then|And|But)\s+(.+)$/i;
const technicalPattern =
  /\b(oracle|fixtures?|golden(?:\s+(?:file|data|wafer))?|locators?|test-?ids?|dom|css|xpath|waitforrender|render synchronization|seeded mocks?|page objects?|api clients?)\b/i;
const vaguePattern =
  /\b(correctly|as required|as per requirement|appropriate data|required data)\b/i;
const proceduralVerbPattern =
  /\b(open|click|select|enter|upload|choose|set|type|check|uncheck|wait|navigate|go|install|run|view|verify|confirm|ensure|observe|compare|record|download|save|create|add|remove|load|display|appear|becomes?|is|are|has|have|shows?|reports?|matches?)\b/i;
const setupAfterThenPattern =
  /\b(open|click|select|enter|upload|choose|set|type|install|run|navigate|go|create|add|remove|load)\b/i;

function usage(): never {
  process.stderr.write(
    'Usage: npm run probe:lint-gherkin -- <feature-slug> ' +
      '[--scenario-type positive|functional|negative|edge|all] ' +
      '[--category CAT-NN|file-slug] [--ac AC-NN] [--tc TC-id] [--json]\n',
  );
  process.exit(2);
}

function takeValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    process.stderr.write(`Missing value for ${option}\n`);
    usage();
  }
  return value;
}

function parseArgs(args: string[]): Selector {
  const featureSlug = args[0];
  if (!featureSlug || featureSlug.startsWith('--')) usage();

  const selector: Selector = { featureSlug, json: false };
  for (let index = 1; index < args.length; index += 1) {
    const option = args[index];
    if (option === '--json') {
      selector.json = true;
      continue;
    }
    if (option === '--scenario-type') {
      const value = takeValue(args, index, option).toLowerCase();
      index += 1;
      if (value !== 'all' && !scenarioTypes.has(value as ScenarioType)) {
        process.stderr.write(`Unknown scenario type: ${value}\n`);
        usage();
      }
      if (value !== 'all') selector.scenarioType = value as ScenarioType;
      continue;
    }
    if (option === '--category') {
      selector.category = takeValue(args, index, option);
      index += 1;
      continue;
    }
    if (option === '--ac') {
      const value = takeValue(args, index, option).toUpperCase();
      index += 1;
      if (!/^AC-\d+$/.test(value)) {
        process.stderr.write(`Invalid AC selector: ${value}\n`);
        usage();
      }
      selector.ac = value;
      continue;
    }
    if (option === '--tc') {
      selector.tc = takeValue(args, index, option).replace(/^@/, '');
      index += 1;
      continue;
    }
    process.stderr.write(`Unknown option: ${option}\n`);
    usage();
  }
  return selector;
}

function parseFeature(file: string): Scenario[] {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const scenarios: Scenario[] = [];
  let pendingTags: string[] = [];
  let pendingAcs: string[] = [];
  let current: Scenario | undefined;
  let inExamples = false;

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = (lines[index] ?? '').trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('@')) {
      pendingTags.push(...trimmed.split(/\s+/).filter((token) => token.startsWith('@')));
      continue;
    }

    if (trimmed.startsWith('#')) {
      const acs = trimmed.match(/\bAC-\d+\b/gi) ?? [];
      if (acs.length > 0) pendingAcs = acs.map((ac) => ac.toUpperCase());
      continue;
    }

    const scenarioMatch = trimmed.match(/^Scenario(?: Outline)?:\s*(.+)$/i);
    if (scenarioMatch) {
      current = {
        file,
        line: index + 1,
        title: scenarioMatch[1]!.trim(),
        isOutline: /^Scenario Outline:/i.test(trimmed),
        tags: [...pendingTags],
        acs: [...pendingAcs],
        description: [],
        steps: [],
        exampleHeaders: [],
      };
      scenarios.push(current);
      pendingTags = [];
      pendingAcs = [];
      inExamples = false;
      continue;
    }

    if (!current) continue;

    if (/^Examples:/i.test(trimmed)) {
      inExamples = true;
      continue;
    }

    if (inExamples && trimmed.startsWith('|') && current.exampleHeaders.length === 0) {
      current.exampleHeaders = trimmed
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim())
        .filter(Boolean);
      continue;
    }

    const stepMatch = trimmed.match(stepPattern);
    if (stepMatch) {
      current.steps.push({ line: index + 1, keyword: stepMatch[1]!, text: stepMatch[2]! });
      inExamples = false;
      continue;
    }

    if (current.steps.length === 0 && !inExamples && !trimmed.startsWith('|')) {
      current.description.push(trimmed);
    }
  }
  return scenarios;
}

function categoryAcMap(featureSlug: string): Map<string, string[]> {
  const analysis = path.join('.probe', 'artifacts', featureSlug, '10-spec', 'spec-analysis.md');
  const result = new Map<string, string[]>();
  try {
    const lines = readFileSync(analysis, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*\|\s*(CAT-\d+)\s*\|.*?\|\s*((?:AC-\d+\s*,?\s*)+)\|/i);
      if (match) {
        result.set(
          match[1]!.toUpperCase(),
          (match[2]!.match(/AC-\d+/gi) ?? []).map((ac) => ac.toUpperCase()),
        );
      }
    }
  } catch {
    // A file-slug category selector remains available without spec analysis.
  }
  return result;
}

function tcId(scenario: Scenario): string | undefined {
  const tags = scenario.tags.map((tag) => tag.slice(1));
  return (
    tags.find((tag) => /^TC-[A-Za-z0-9_-]+-\d+$/i.test(tag)) ??
    tags.find((tag) => /^[A-Z][A-Z0-9]*-TC-\d+$/i.test(tag))
  );
}

function selected(
  scenario: Scenario,
  selector: Selector,
  categoryMap: Map<string, string[]>,
): boolean {
  if (
    selector.scenarioType &&
    !scenario.tags.some((tag) => tag.toLowerCase() === `@${selector.scenarioType}`)
  ) {
    return false;
  }
  if (selector.ac && !scenario.acs.includes(selector.ac)) return false;
  if (selector.tc && tcId(scenario)?.toLowerCase() !== selector.tc.toLowerCase()) return false;
  if (selector.category) {
    const normalized = selector.category.toUpperCase();
    const mappedAcs = categoryMap.get(normalized);
    if (mappedAcs) {
      if (!scenario.acs.some((ac) => mappedAcs.includes(ac))) return false;
    } else if (
      path.basename(scenario.file, '.feature').toLowerCase() !== selector.category.toLowerCase()
    ) {
      return false;
    }
  }
  return true;
}

function validateScenario(scenario: Scenario): Finding[] {
  const findings: Finding[] = [];
  const add = (
    severity: Finding['severity'],
    rule: string,
    line: number,
    message: string,
  ): void => {
    findings.push({
      severity,
      rule,
      file: scenario.file.replaceAll('\\', '/'),
      line,
      scenario: scenario.title,
      message,
    });
  };

  const id = tcId(scenario);
  if (!id) {
    add('error', 'identity', scenario.line, 'Scenario has no stable @…TC-… identity tag.');
  } else if (!scenario.title.toLowerCase().startsWith(id.toLowerCase())) {
    add('error', 'identity', scenario.line, `Title must start with the tagged id "${id}".`);
  }

  const presentTypes = [...scenarioTypes].filter((type) =>
    scenario.tags.some((tag) => tag.toLowerCase() === `@${type}`),
  );
  if (presentTypes.length !== 1) {
    add(
      'error',
      'scenario-type',
      scenario.line,
      `Expected exactly one scenario type tag; found ${presentTypes.length}.`,
    );
  }

  if (scenario.description.join(' ').trim().length === 0) {
    add(
      'error',
      'objective',
      scenario.line,
      'Add an objective description below the scenario title.',
    );
  }
  if (scenario.steps.length === 0) {
    add('error', 'procedure', scenario.line, 'Scenario has no executable procedural steps.');
  }

  const placeholderSource = [
    scenario.title,
    ...scenario.description,
    ...scenario.steps.map((step) => step.text),
  ].join(' ');
  const placeholders = new Set(
    [...placeholderSource.matchAll(/<([^>]+)>/g)].map((match) => match[1]!.trim()),
  );
  if (placeholders.size > 0 && !scenario.isOutline) {
    add('error', 'examples', scenario.line, 'Placeholders require Scenario Outline and Examples.');
  }
  for (const placeholder of placeholders) {
    if (!scenario.exampleHeaders.includes(placeholder)) {
      add('error', 'examples', scenario.line, `Undefined Examples placeholder: <${placeholder}>.`);
    }
  }
  for (const header of scenario.exampleHeaders) {
    if (!placeholders.has(header)) {
      add('warning', 'examples', scenario.line, `Unused Examples column: "${header}".`);
    }
  }

  let thenSeen = false;
  for (const step of scenario.steps) {
    if (/^then$/i.test(step.keyword)) thenSeen = true;
    if (technicalPattern.test(step.text)) {
      add(
        'error',
        'plain-language',
        step.line,
        'Move automation/framework terminology out of the manual Gherkin step.',
      );
    }
    if (vaguePattern.test(step.text)) {
      add(
        'error',
        'exact-values',
        step.line,
        'Replace vague wording with an exact value or placeholder.',
      );
    }
    if (!proceduralVerbPattern.test(step.text)) {
      add(
        'warning',
        'procedure',
        step.line,
        'Step has no recognizable manual action, state, or verification verb.',
      );
    }
    if (/\b(?:public|private|overwrite|rename|create new|error out)\b.*\bor\b/i.test(step.text)) {
      add(
        'warning',
        'exact-values',
        step.line,
        'Select one exact option through a literal or Examples placeholder.',
      );
    }
    if (
      thenSeen &&
      /^(when|and|but)$/i.test(step.keyword) &&
      setupAfterThenPattern.test(step.text)
    ) {
      add(
        'warning',
        'checkpoint-order',
        step.line,
        'Action/setup follows a Then checkpoint; confirm the earlier assertion cannot hide later coverage.',
      );
    }
  }

  if (scenario.steps.length > 25) {
    add(
      'warning',
      'scenario-size',
      scenario.line,
      `Long workflow (${scenario.steps.length} steps): keep only if this complete journey is the intended test case.`,
    );
  }

  return findings;
}

const selector = parseArgs(process.argv.slice(2));
const featureDirectory = path.join('features', selector.featureSlug);
try {
  if (!statSync(featureDirectory).isDirectory()) usage();
} catch {
  process.stderr.write(`Feature directory not found: ${featureDirectory}\n`);
  process.exit(2);
}

const files = readdirSync(featureDirectory)
  .filter((name) => name.endsWith('.feature'))
  .map((name) => path.join(featureDirectory, name));
const allScenarios = files.flatMap(parseFeature);
const categoryMap = categoryAcMap(selector.featureSlug);
const scopedScenarios = allScenarios.filter((scenario) =>
  selected(scenario, selector, categoryMap),
);

if (scopedScenarios.length === 0) {
  process.stderr.write('Selector matched zero scenarios; refusing to widen the scope.\n');
  process.exit(2);
}

const findings = scopedScenarios.flatMap(validateScenario);
const errors = findings.filter((finding) => finding.severity === 'error').length;
const warnings = findings.length - errors;

if (selector.json) {
  process.stdout.write(
    `${JSON.stringify(
      {
        feature: selector.featureSlug,
        selector,
        scenarios: scopedScenarios.map((scenario) => tcId(scenario) ?? scenario.title),
        summary: { checked: scopedScenarios.length, errors, warnings },
        findings,
      },
      null,
      2,
    )}\n`,
  );
} else {
  for (const finding of findings) {
    process.stdout.write(
      `${finding.severity.toUpperCase()} ${finding.rule} ${finding.file}:${finding.line} — ${finding.message}\n`,
    );
  }
  process.stdout.write(
    `PROBE Gherkin lint — ${scopedScenarios.length} scenario(s), ${errors} error(s), ${warnings} warning(s)\n`,
  );
}

process.exitCode = errors > 0 ? 1 : 0;
