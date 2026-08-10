# Changelog

All notable changes to YieldWerx PROBE are recorded here.

## 2.9.2 — 2026-08-05

- **Claude Desktop marketplace sync is now supported.** The portable npm CLI
  entry point moved to the repository-level `bin/` directory so the hosted
  plugin payload no longer contains a top-level executable directory that
  Claude Desktop rejects. The published `probe` command remains unchanged, and
  repository validation prevents the incompatible plugin layout from returning.
- **Fixed the repository guard that was enforcing known-broken AIO payload
  shapes.** `validate-repository.mjs` required the literal strings
  `tags: aioTags(cfg, scenario)` and `labels: aioLabels(cfg, scenario)` — the
  flat tag array AIO silently discards, and a `labels` field that does not exist
  in `CaseFullDetails` at all. Any correct fix therefore failed `npm test`, so
  correctness was repeatedly reverted to keep the build green. This is the root
  cause of the same three defects being rediscovered across three pins.
- Added `forbidContent()` and asserted the live-API payload contracts
  (`/detail`, `datasetParameters`, `dataSets`, `tag: { ID }`, `createOrGetTags`,
  429 backoff) so a re-pin cannot silently drop them again. Confirmed the new
  guard rejects the 2.9.1 adapter, which was missing all six markers.
- **Update route fixed:** `updateTestCase` is
  `PUT .../testcase/{caseKeyOrId}/detail`. Without `/detail` AIO answers 404 for
  every case whether or not it exists, which is indistinguishable from a deleted
  record.
- **Outline `Examples:` no longer destroyed on update.** `PUT .../detail`
  replaces the whole case body, so a payload omitting `datasetParameters` +
  `dataSets` deletes the data sets of every Outline it touches. Both halves are
  now always sent; `dataSets` alone is accepted and discarded.
- **Updates no longer clear unmanaged case metadata.** Because `PUT .../detail`
  replaces the whole body, a payload built from scratch silently wiped every
  writable field the sync does not set — `precondition`, `priority`,
  `jiraComponentIDs`, `jiraReleaseIDs`, `estimatedEffort`, `automationStatus`,
  `jiraRequirementIDs` — including values a human entered in the AIO UI. An
  update now reads the case first (`?fetchDataSets=true`, or the read itself
  would drop the data sets), overlays only the fields sync owns, and strips the
  read-only fields AIO returns on GET but rejects on write
  (`WRITABLE_CASE_FIELDS` / `writableCaseDetails`, adopted from the unmerged
  `wip/aio-casetype-and-tags`, plus `aioCaseUrl` as a testable URL builder).
- Added `sanity` to the pushed tag whitelist. The three execution tiers are a
  nested set (smoke ⊆ sanity ⊆ regression); a tier absent from the whitelist is
  dropped from the push, so the tag exists in the corpus but cannot be filtered
  in AIO — indistinguishable from never having been applied. Guarded.
- Stopped pushing `functional` as a tag. AIO already expresses it as the case
  **Type** (`{ID: 9, name: "Functional"}`, set from `@testtype:`), so a tag of
  the same name duplicated a built-in field and read as a second, conflicting
  classification. `@positive`/`@negative`/`@edge` still push: they
  sub-classify a functional test and have no AIO Type equivalent.
- **Tags now persist:** `tags` is `CaseTag[]` = `[{ tag: { ID } }]`. Names are
  resolved (and created when absent) through `POST /project/{id}/tag` first,
  because referencing an unknown tag by name returns 500 and a flat
  `[{ name }]` returns 200 while storing nothing. Resolution falls back to
  case-insensitive matching so an existing `Regression` is reused rather than
  duplicated.
- **`@testtype:` now reaches AIO as `Type`** (a `CaseType` lookup object)
  instead of the non-existent `labels` field; `component`/`e2e`/`contract` map
  to `Functional`, other levels map directly, overridable via
  `defaults.typeMap`.
- **Bulk pushes survive throttling:** 429 and 5xx retry with exponential
  backoff honouring `Retry-After`, instead of aborting a run half-applied.
- **Fixed a write-back that corrupted traceability.** The key was written by a
  greedy `[^\n]*/` match, so the unsynced placeholder
  `(AIO key pending /yw:sync-cases)` — which contains a slash — became
  `(AIO key pending /YWPD-TC-1234:sync-cases)`. That line no longer parses as a
  key, so the scenario was created again as a duplicate on every later sync.
  The traceability comment's fields are now rebuilt rather than pattern-matched.
- Category values are sent as `customFields [{name,value}]` when
  `defaults.categoryCustomField` names an existing AIO custom field; unset sends
  nothing, since an unknown custom-field name is rejected.
- Plan table columns now report only fields the push actually sends (Tags, Type,
  Category) — it previously advertised a Labels column that AIO discarded.

## 2.9.1 — 2026-08-05

- Added computed scenario tags and test-type labels to live AIO create/update
  payloads so live sync matches the dry-run plan.
- Excluded `@retired` scenarios from AIO sync, preserving superseded records and
  preventing reassigned AIO keys from being overwritten later in the same run.
- Scoped feature-level Design Gate authorization to the current ledger stage
  row so historical or superseded approval text cannot authorize a live push.
- Added repository validation guards for the retired-case, row-scoped gate, and
  live tag/label payload contracts.

## 2.9.0 — 2026-08-05

- Added `/yw:execute-cases` for one-browser Playwright MCP-assisted execution
  with isolated cases, exact Gherkin-step results, and shared failure evidence.
- Added UI-led `--with-case-execution` so UI Recon, API Recon, and assisted
  execution can share one coordinated browser walk and separate artifacts.
- Added a 27-skill argument and tandem guide with selectors, handoffs, recipes,
  and unsafe combinations.
- Upgraded Bug Report, Flake Triage, and Exploratory Run to consume the same
  redacted failure packet while keeping classification separate from confirmed,
  suspected, or unknown root cause.

## 2.8.0 — 2026-08-04

- Added `/yw:api-recon` to reconcile Swagger/OpenAPI with sanitized live
  traffic, payloads, authentication, dependencies, and contract drift.
- Added `/yw:forge-api-tests` for typed functional, contract, workflow,
  security-baseline, deterministic resiliency, and UI-interception automation.
- Added `/yw:forge-performance-tests` for guarded k6 smoke, load, spike,
  stress, and endurance workloads with approved SLOs and cleanup.
- Made observable API performance a QA-owned `@testtype:performance` level
  implemented by k6 rather than Playwright step definitions.
- Excluded `@api`, API/contract, and performance scenarios/results from Jira
  AIO before validation, remote writes, key write-back, or result linkage.
- Added sanitized UI network observations and strengthened API/performance
  routing across Case Forge, Script Forge, audits, gates, and TestOps.

## 2.7.1 — 2026-08-03

- Renamed the PROBE expansion to **Plan · Review · Observe · Build · Evaluate**
  ("Test with purpose. Release with proof."), replacing "Process for
  Review-gated Orchestrated BDD Engineering".
- Added a mapping from each of the five words to the named stages it covers, so
  the expansion describes real activities rather than serving as a mnemonic.
- Documentation only: no stage, gate, policy, severity, skill, agent, CLI
  command, or identifier changed. Consumers need no migration beyond the
  version pin.

## 2.7.0 — 2026-07-31

- Added `/yw:bypass-gate` for explicit allrounder bypass of the Design,
  Merge, Ops, or all applicable PROBE gates.
- Kept bypassed gate evidence honest: the report remains `READY`, `NOT READY`,
  or `not assembled`; the human decision is recorded separately as
  `bypassed`.
- Updated Case Sync, UI Recon, Exploratory Run, Script Forge, the AIO adapter,
  and TestOps Promotion to accept only the exact recorded gate-bypass scope.
- Made `bypass all gates` expand to separate Design, Merge, and Ops decisions
  and waiver rows.
- Kept stage/audit waivers, repository merges, external-system permissions,
  and security controls outside an ordinary gate bypass.

## 2.6.0 — 2026-07-31

- Allowed a named QA Lead or Automation Engineer allrounder to explicitly
  bypass a missing, blocked, or failed Case Audit for an exact feature or
  category while preserving findings and residual risk.
- Declared Tafseer Haider (`tafseer.haider@yieldwerx.com`) as PROBE Owner and
  allrounder with authority to waive any exact PROBE governance item.
- Added `/yw:owner-bypass` and the PIN-protected `probe owner-bypass` CLI.
  The PIN and generated signing key stay in the user's environment or
  gitignored `.env`; Claude receives only a short-lived, signed,
  scope-specific receipt.
- Added receipt integrity, expiry, one-time consumption, and regression tests.
- Kept OS/tool permissions, external authorization, secret handling, and
  company security controls outside PROBE override authority.

## 2.5.1 — 2026-07-30

- Stopped the read-only AIO access summary from printing any part of the
  personal API token.
- Kept the useful access diagnostics—API base, project, Jira project id, and
  permission level—without exposing credential characters.

## 2.5.0 — 2026-07-30

- Simplified Design Gate approval for QA Lead and Automation Engineer
  allrounders.
- Allowed Claude to transcribe a named allrounder's direct approval into the
  ready gate report and ledger, including the current date, confirmed
  `@auto:now` set, stage status, and standard solo-allrounder waiver.
- Kept the decision human-owned: Claude cannot approve its own report, accept
  a non-allrounder's shortcut, or approve a `NOT READY` gate.
- Left Domain Test Analyst, Merge Gate, and Ops Gate signing behavior
  unchanged.

## 2.4.0 — 2026-07-30

- Made the provided PRD/story/specification package the sole feature
  requirement source of truth for Spec Probe.
- Limited knowledgebase use to YieldWerx terminology, modules, and business
  context; it cannot create, complete, resolve, or override a requirement.
- Required `AC`, `AMB`, and `OOS` sources to cite the provided requirement,
  while recording knowledge separately as reference context only.
- Added validator coverage that rejects knowledgebase or implementation
  references used as requirement authority.

## 2.3.0 — 2026-07-30

- Added `probe-spec --migrate-format` for presentation-only conversion of an
  existing spec analysis without changing meaning or downstream evidence.
- Added `probe-spec --reconcile` for source-based updates that preserve stable
  IDs, classify changes, and route substantive case work to Update Cases.
- Added the validated `10-spec/spec-reconciliation.md` evidence artifact with
  source hashes, per-item changes, downstream impact, and validation results.
- Made unqualified Spec Probe reruns fail closed when an analysis already
  exists.

## 2.2.0 — 2026-07-30

- Required every active acceptance criterion to start with
  `**Summary:** Verify that ...`.
- Required both Workflow and Simple Rule acceptance criteria to use fenced
  Given/When/Then Gherkin.
- Kept Simple Rule outcomes direct by requiring `must` or `must not`.
- Updated the Spec Probe validator, fixtures, tests, examples, and migration
  guidance for the new structure.

## 2.1.0 — 2026-07-29

- Required every selected Case Forge category to record visual candidates or a
  specific visual `N/A`, including named cross-category deferrals.
- Strengthened Case Audit so missing or unsupported visual dispositions block
  the Design Gate.
- Added an explicit Script Forge contract for named baselines, approved masks,
  deterministic visual runners, comparison commands, and visual evidence.
- Added repository checks that keep the visual design and scripting contracts
  present in future releases.

## 2.0.0 — 2026-07-29

- Changed the public Claude skill namespace from
  `yieldwerx-probe:<skill>` to the shorter `yw:<skill>`.
- Added marketplace migration metadata from `yieldwerx-probe` to `yw`.
- Added `yw:ask-yieldwerx` and `yw:update-yieldwerx-knowledge` adapters.
- Declared the independently versioned YieldWerx knowledgebase plugin as a
  cross-marketplace dependency instead of copying its knowledge.
- Updated PROBE Doctor and consumer examples for the `yw` plugin identity.

## 1.6.1 — 2026-07-29

- Fixed the portable coverage command so it runs correctly as an ES module,
  and added an end-to-end CLI regression test for its Markdown and JSON output.
- Fixed `probe doctor` on Windows installations that expose `claude.exe`
  instead of a command wrapper.

## 1.6.0 — 2026-07-29

- Added a dependency-free `probe` CLI for configuration checks, Spec Probe
  validation, procedural Gherkin lint, requirements coverage, and AIO
  operations.
- Added `probe doctor` to verify consumer paths, project plugin settings, and
  installed plugin versions before a workflow starts.
- Replaced copied product knowledge with a strict, versioned call to
  `yieldwerx-knowledgebase:ask-yieldwerx`.
- Added a fail-closed knowledge contract, source precedence, and simple source
  citations for QA artifacts.
- Made compatibility-profile loading explicit because Claude plugin reference
  files do not load automatically.
- Added a portable configuration parser, schema checks, CLI tests, package
  contents, migration guidance, and release documentation.
- Removed third-party runtime dependencies from the AIO adapter.

## 1.5.0 — 2026-07-29

- Added Workflow acceptance criteria using simple Given/When/Then wording.
- Added Simple Rule acceptance criteria using `must`/`must not` checklists.
- Kept the AC index stable for coverage and traceability.
- Replaced technical spec-analysis headings and columns with QA-friendly words.
- Added checks for missing Given/When/Then steps, weak rule wording, vague
  words, duplicate definitions, and missing category links.
- Added tests for a valid hybrid spec, a Workflow missing Then, and a weak rule.
- Updated Case Forge and its agents so requirement-level ACs are expanded into
  detailed procedural cases instead of copied.

## 1.4.1 — 2026-07-29

- Added skill-specific Why, What, When, Where, and How sections to every
  workflow skill.
- Added a complete 5W1H skill catalog to the repository README.
- Added validation that prevents skills from omitting the five sections.

## 1.4.0 — 2026-07-29

- Extracted PROBE from the YieldWerx Playwright BDD boilerplate.
- Added the optional Implementation Probe stage.
- Preserved 19 workflow skills and 10 operational specialist agents.
- Added a Claude Code plugin marketplace and consumer configuration contract.
- Retained Playwright BDD, AIO, Jenkins and Plotly behavior as compatibility
  profiles rather than mandatory core assumptions.
- Added repository validation and Azure Pipeline scaffolding.
