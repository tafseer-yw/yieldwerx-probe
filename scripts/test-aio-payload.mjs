#!/usr/bin/env node
/**
 * Execute the AIO payload builders instead of grepping for them.
 *
 * adapters/aio/scripts/aio-sync.ts is the largest and most trap-laden code in
 * this repository, and it performs DESTRUCTIVE WRITES to a production Jira
 * tenant. Until now its nine documented traps were verified only by
 * string-presence markers in validate-repository.mjs - which catches a
 * reverted regression and cannot catch a new one. A payload built wrongly
 * still contains every pinned comment.
 *
 * Every case below is a trap recorded in the source with the incident that
 * produced it. These assert the resulting payload, so a refactor that keeps
 * the comments and breaks the shape goes red.
 *
 * No network: these are pure functions over a synthetic scenario.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  aioCaseUrl,
  aioDatasets,
  buildCasePayload,
  writableCaseDetails,
  bddStepType,
  definedOnly,
  isDesignGateAuthorized,
  readCategoryGate,
  isCategoryGateAuthorized,
} from '../plugins/yieldwerx-probe/adapters/aio/scripts/aio-sync.ts';

let failures = 0;
const check = (label, fn) => {
  try {
    fn();
    console.log(`ok    ${label}`);
  } catch (e) {
    console.error(`FAIL  ${label}\n      ${e.message.split('\n')[0]}`);
    failures++;
  }
};

const scenario = (over = {}) => ({
  title: 'Wafer map renders passing bins',
  featureFile: 'features/wafer-map.feature',
  tcId: 'TC-101',
  steps: [
    { keyword: 'Given', text: 'a wafer with 100 die' },
    { keyword: 'When', text: 'the map is rendered' },
    { keyword: 'Then', text: 'bins 0 and 1 show as passing' },
  ],
  examples: [],
  tags: [],
  ...over,
});

// Shaped like a real SyncConfig: defaults.tags and defaults.labels are
// iterated, so an object here fails with "not iterable" rather than a useful
// message - which is itself worth knowing about the config contract.
const cfg = {
  defaults: {
    status: 'Draft',
    owner: 'qa@yieldwerx.com',
    tags: [],
    labels: [],
    categoryCustomField: 'Category',
  },
  scriptType: 'BDD/Gherkin',
};
const requirement = { ref: 'AC-01' };

const build = (s, tagIds = new Map()) =>
  buildCasePayload(cfg, 'wafer-map', s, requirement, 42, tagIds);

// --- trap 1: the /detail suffix ---------------------------------------------
// Recorded in source: a PUT without /detail 404s every case, which "once
// triggered a multi-hour hunt for a non-existent mass delete".

check('an update targets the /detail resource, a create targets the collection', () => {
  assert.equal(aioCaseUrl('https://api/case', 'TC-9'), 'https://api/case/TC-9/detail');
  assert.equal(aioCaseUrl('https://api/case'), 'https://api/case');
});

// --- trap 2: datasetParameters and dataSets travel together ------------------
// A full-body replace: omitting either DELETES the outline examples.

check('an outline emits datasetParameters AND dataSets together', () => {
  const p = build(scenario({ examples: ['| bin | expected |', '| 0 | pass |', '| 4 | fail |'] }));
  assert.ok(Array.isArray(p.datasetParameters), 'datasetParameters missing');
  assert.ok(Array.isArray(p.dataSets), 'dataSets missing');
  assert.deepEqual(p.datasetParameters, [{ name: 'bin' }, { name: 'expected' }]);
  assert.deepEqual(p.dataSets, [
    { bin: '0', expected: 'pass' },
    { bin: '4', expected: 'fail' },
  ]);
});

check('a scenario with no examples emits neither, rather than one of the pair', () => {
  const p = build(scenario());
  assert.equal('datasetParameters' in p, false);
  assert.equal('dataSets' in p, false);
});

check('a repeated Examples header is not stored as a data row', () => {
  const d = aioDatasets(scenario({ examples: ['| bin |', '| 0 |', '| bin |', '| 4 |'] }));
  assert.deepEqual(d.dataSets, [{ bin: '0' }, { bin: '4' }], 'the repeated header must be dropped');
});

// --- trap 3: tags are CaseTag[], nested, and by ID ---------------------------
// A bare string fails loudly; a flat [{ name }] is accepted with 200 and
// silently stores nothing, which is why synced cases showed empty Tags.

check('tags are nested CaseTag objects referenced by ID', () => {
  const s = scenario({ tags: ['@smoke'] });
  const p = build(s, new Map([['smoke', 7]]));
  if (p.tags !== undefined) {
    for (const entry of p.tags) {
      assert.ok(entry.tag, 'each entry must nest a tag object, not be a flat {name}');
      assert.equal(typeof entry.tag.ID, 'number', 'the tag must be referenced by ID');
      assert.equal(
        'name' in entry.tag,
        false,
        'a name-only tag is answered with 500 when it does not exist',
      );
    }
  }
});

check('an unresolved tag name is dropped, never sent by name', () => {
  const p = build(scenario({ tags: ['@unknown'] }), new Map());
  assert.equal(p.tags, undefined, 'an unresolved name must be omitted, not posted');
});

// --- trap 4: labels is not a field of CaseFullDetails ------------------------

check('labels is never sent - it was discarded on every sync', () => {
  const p = build(scenario({ tags: ['@testtype:functional'] }), new Map());
  assert.equal('labels' in p, false);
});

// --- trap 5: lookup objects, not bare strings --------------------------------

check('folder, status and scriptType are lookup objects', () => {
  const p = build(scenario());
  assert.deepEqual(p.folder, { ID: 42 }, 'folder is referenced by numeric ID');
  assert.deepEqual(p.status, { name: 'Draft' });
  assert.deepEqual(p.scriptType, { name: 'BDD/Gherkin' });
});

// --- trap 6: BDD content is a structured steps array -------------------------
// A plain bddContent string is ignored.

check('steps are a structured array with BDD_ step types', () => {
  const p = build(scenario());
  assert.equal(p.steps.length, 3);
  for (const step of p.steps) {
    assert.ok(step.stepType.startsWith('BDD_'), `unexpected stepType ${step.stepType}`);
    assert.ok(typeof step.bddStep === 'string' && step.bddStep.length > 0);
  }
  assert.equal('bddContent' in p, false, 'a plain bddContent string is ignored by AIO');
  assert.equal(bddStepType('Given'), 'BDD_GIVEN');
  assert.equal(bddStepType('When'), 'BDD_WHEN');
  assert.equal(bddStepType('Then'), 'BDD_THEN');
});

// --- trap 7: read-only fields are stripped before a write --------------------
// A full-body PUT of a fetched case otherwise wipes precondition, priority,
// components and releases.

check('read-only GET fields are stripped, writable ones survive', () => {
  const fetched = {
    ID: 991,
    key: 'TC-9',
    version: 3,
    permission: 'RW',
    createdDate: '2026-01-01',
    isArchived: false,
    title: 'kept',
    precondition: 'kept',
    priority: { name: 'High' },
    jiraComponentIDs: [1],
    jiraReleaseIDs: [2],
    dataSets: [{ a: 'b' }],
  };
  const w = writableCaseDetails(fetched);
  for (const gone of ['ID', 'key', 'version', 'permission', 'createdDate', 'isArchived']) {
    assert.equal(gone in w, false, `${gone} is read-only and must be stripped`);
  }
  for (const kept of [
    'title',
    'precondition',
    'priority',
    'jiraComponentIDs',
    'jiraReleaseIDs',
    'dataSets',
  ]) {
    assert.ok(kept in w, `${kept} is writable and must survive - dropping it clears the field`);
  }
});

// --- trap 8: undefined means "not managed", not "clear it" -------------------

check('undefined fields are dropped rather than overwriting real values', () => {
  const merged = definedOnly({ title: 'new', precondition: undefined, priority: null });
  assert.equal('precondition' in merged, false, 'undefined must be dropped, not sent');
  assert.ok('priority' in merged, 'null is a deliberate value and is kept');
});

// --- trap 9: automationKey carries the TC id ---------------------------------

check('the TC id travels as automationKey so write-back can find the case', () => {
  assert.equal(build(scenario()).automationKey, 'TC-101');
});

// --- trap 10: only an approval row authorizes a live push --------------------
//
// `isDesignGateAuthorized` is the last thing between a tool call and a
// destructive write to the production Jira tenant, so it is executed here rather
// than asserted by string presence.
//
// The specific hazard: a 3.0 ledger's stage table also carries
// `DESIGN GATE | … | done`, which the gate skill sets when it records an
// approval. An earlier revision consulted the pre-3.0 stage-status fallback
// whenever the approvals table held no matching row — so a ledger built straight
// from the new template, with an empty approvals table, authorized a live push.

const fixtureSlug = 'probe-gate-authorization-fixture';
const fixtureDir = path.join(process.cwd(), 'docs', 'qa', fixtureSlug);

function withLedger(body, assertion) {
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(path.join(fixtureDir, 'LEDGER.md'), body);
  try {
    assertion();
  } finally {
    fs.rmSync(path.join(process.cwd(), 'docs', 'qa', fixtureSlug), {
      recursive: true,
      force: true,
    });
  }
}

const stageTable = `| Stage | Skill | Status |
| ----- | ----- | ------ |
| DESIGN GATE | /gate-design | done |
`;
const approvalsHeader = `
## Gate approvals (human decisions)

| Gate | Scope | Approved by | Role | Timestamp | Confirmed | Evidence |
| ---- | ----- | ----------- | ---- | --------- | --------- | -------- |
`;

check('a 3.0 ledger with an EMPTY approvals table does not authorize a push', () => {
  withLedger(
    `${stageTable}${approvalsHeader}|      |       |             |      |           |           |          |\n`,
    () => {
      assert.equal(
        isDesignGateAuthorized(fixtureSlug),
        false,
        'an empty approvals table plus a done stage row must never authorize',
      );
    },
  );
});

check('a 3.0 ledger with a named, timestamped approval row authorizes', () => {
  withLedger(
    `${stageTable}${approvalsHeader}| Design Gate | feature | A Reviewer | QA Lead | 2026-08-18 21:14 | Reviewed all cases | [report](x.md) |\n`,
    () => {
      assert.equal(isDesignGateAuthorized(fixtureSlug), true);
    },
  );
});

check('an approval row without a timestamp does not authorize', () => {
  withLedger(
    `${stageTable}${approvalsHeader}| Design Gate | feature | A Reviewer | QA Lead |  | Reviewed | x |\n`,
    () => {
      assert.equal(isDesignGateAuthorized(fixtureSlug), false);
    },
  );
});

check('a category-scoped approval does not authorize the whole feature', () => {
  withLedger(
    `${stageTable}${approvalsHeader}| Design Gate | CAT-01 | A Reviewer | QA Lead | 2026-08-18 21:14 | Reviewed CAT-01 | x |\n`,
    () => {
      assert.equal(isDesignGateAuthorized(fixtureSlug), false);
    },
  );
});

check('a pre-3.0 ledger with no approvals table still honours its stage status', () => {
  withLedger(stageTable, () => {
    assert.equal(isDesignGateAuthorized(fixtureSlug), true);
  });
});

check('a superseded (struck-through) category approval does not authorize a push', () => {
  withLedger(
    `## Gate approvals (human decisions)

| Category | ACs | Case Forge | Approved by | Role | Timestamp | Confirmed | \`@auto:now\` |
| -------- | --- | ---------- | ----------- | ---- | --------- | --------- | ----------- |
| CAT-01 | AC-01 | ~~done~~ | ~~Jane~~ | ~~QA Lead~~ | ~~2026-01-01 10:00~~ | ~~ok~~ | ~~TC-1~~ |
`,
    () => {
      assert.equal(
        isCategoryGateAuthorized(readCategoryGate(fixtureSlug, 'CAT-01')),
        false,
        'a revoked category approval must never authorize a live production write',
      );
    },
  );
});

check('a live category approval with a name and timestamp authorizes that category', () => {
  withLedger(
    `## Gate approvals (human decisions)

| Category | ACs | Case Forge | Approved by | Role | Timestamp | Confirmed | \`@auto:now\` |
| -------- | --- | ---------- | ----------- | ---- | --------- | --------- | ----------- |
| CAT-01 | AC-01 | done | A Reviewer | QA Lead | 2026-08-19 10:00 | ok | TC-1 |
`,
    () => {
      assert.equal(isCategoryGateAuthorized(readCategoryGate(fixtureSlug, 'CAT-01')), true);
    },
  );
});

check('an empty approvals table does not fall through to a later stage-table row', () => {
  withLedger(
    `## Gate approvals (human decisions)

| Gate | Scope | Approved by | Role | Timestamp | Confirmed | Evidence |
| ---- | ----- | ----------- | ---- | --------- | --------- | -------- |
|      |       |             |      |           |           |          |

## Stage table

| Stage | Skill | Status |
| ----- | ----- | ------ |
| DESIGN GATE | /gate-design | done |
`,
    () => {
      assert.equal(
        isDesignGateAuthorized(fixtureSlug),
        false,
        'a present-but-empty approvals table blocks the legacy fallback',
      );
    },
  );
});

check('a pre-3.0 bypass or hibernation never authorizes', () => {
  for (const status of ['waived — allrounder gate bypass', 'hibernated — evaluation mode']) {
    withLedger(
      `| Stage | Skill | Status |\n| ----- | ----- | ------ |\n| DESIGN GATE | /gate-design | ${status} |\n`,
      () => {
        assert.equal(
          isDesignGateAuthorized(fixtureSlug),
          false,
          `a retired override (${status}) must not authorize a live write`,
        );
      },
    );
  }
});

if (failures) {
  console.error(`\n${failures} AIO payload test(s) failed.`);
  process.exit(1);
}
console.log('\nAIO payload tests passed.');
