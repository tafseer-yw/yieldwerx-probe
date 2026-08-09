# YieldWerx PROBE

PROBE is YieldWerx's review-gated QA delivery process. This repository is the
versioned source for its Claude Code plugin, workflow skills, specialist
agents, process authority, templates, schemas, compatibility profiles and
deterministic validation tools.

PROBE is independent of any one automation repository. Consumer repositories
own their requirements, feature files, scripts, test data, ledgers and
evidence; this repository owns how that work is designed, reviewed and gated.
See the [repository architecture](docs/ARCHITECTURE.md) for the core/profile/
adapter boundary.

## API and performance delivery route

PROBE 2.8 treats API behavior and API performance as QA-owned, approved test
surfaces. The normal route is:

```text
Swagger/OpenAPI + approved UI paths
  -> /yw:ui-recon (optional network handoff)
  -> /yw:api-recon (sanitized reconciled operation inventory)
  -> /yw:forge-api-tests and/or /yw:forge-performance-tests
  -> /yw:audit-scripts -> /yw:green-run -> gates
```

`api-recon` discovers and reconciles; it does not generate tests.
`forge-api-tests` owns functional, contract, workflow, security-baseline, and
deterministic resiliency coverage. `forge-performance-tests` owns guarded k6
smoke, load, spike, stress, and endurance workloads. Broad fuzzing, active
security scanning, destructive discovery, and production load always require
separate explicit authorization.

API, contract, and performance cases keep repository-local TC/AC traceability
but never create, update, link, or publish cases or results in Jira AIO Tests.

When UI and API evidence come from the same journey, use one shared-session
tandem entry point instead of reopening the app:

```text
/yw:ui-recon <feature> <env> --with-api-recon --spec <openapi.yaml>
# or, API-led:
/yw:api-recon <feature> <env> --spec <openapi.yaml> --capture-ui
```

Both forms register sanitized network observation before the approved UI walk.
They produce separate UI and API artifacts with separate ownership/status, but
reuse the same browser context and do not repeat covered actions.

## Playwright MCP-assisted case execution route

Execute an approved case batch through one browser connection, then compose
the evidence skills without reopening or re-driving the application:

```text
/yw:execute-cases <feature> <env> [--tc <ids>] [--continue-on-failure]
  -> standardized failure packet when needed
  -> /yw:flake-triage (intermittent) or /yw:bug-report (supported app defect)
  -> /yw:log-exploratory (consolidated stage record)
```

Browser/authentication reuse is limited to the same authorized role and tenant.
Every independent case still starts from a verified known state and executes
all of its own Gherkin steps. The executor creates assisted/manual evidence;
Playwright Test remains the automation and CI runner.

## All 27 public skills: arguments and composition

The complete argument semantics, selector behavior, shared-session ownership,
tandem recipes, artifact chains, and unsafe combinations are in the
[skill usage and tandem guide](docs/SKILL-USAGE.md).

The table below lists every public `yw:*` skill shipped by PROBE 2.9.1. The
repository validator compares this README with the actual skill directories and
fails when a skill, accepted argument contract, or full 5W1H catalog entry is
missing.

| Skill                            | Accepted arguments                                                                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/yw:ask-yieldwerx`              | `<question>`                                                                                                                                        |
| `/yw:update-yieldwerx-knowledge` | `<approved-change-request>`                                                                                                                         |
| `/yw:probe-spec`                 | `<feature-slug> [<spec-path-or-text>] [--migrate-format \| --reconcile] [--compare-implementation <env-or-url>] [--role <role>] [--build <id>]`     |
| `/yw:probe-implementation`       | `<feature-slug> <env-or-url> [--role <role>] [--build <id>]`                                                                                        |
| `/yw:forge-cases`                | `<feature-slug> [--scenario-type positive\|functional\|negative\|edge\|all] [--category CAT-NN] [--ac AC-NN]`                                       |
| `/yw:update-cases`               | `<feature-slug> -- <what needs to change>`                                                                                                          |
| `/yw:audit-cases`                | `<feature-slug> [--scenario-type positive\|functional\|negative\|edge\|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]`                          |
| `/yw:gate-design`                | `<feature-slug> [--category CAT-NN] [approved] [bypass Case Audit] [bypass Design Gate] [--owner-receipt <path>]`                                   |
| `/yw:bypass-gate`                | `<feature-slug> <design\|merge\|ops\|all> [--category CAT-NN] [--reason "<reason>"]`                                                                |
| `/yw:owner-bypass`               | `<feature-slug> --item "<stage/gate/item>" --reason "<reason>" [--scope feature\|CAT-NN] [--receipt <path>]`                                        |
| `/yw:sync-cases`                 | `<feature-slug> [--live] [--category CAT-NN]`                                                                                                       |
| `/yw:ui-recon`                   | `<feature-slug> [env] [--with-api-recon] [--spec <path-or-url>] [--with-case-execution] [--tc <id,id,...>] [--role <role>] [--continue-on-failure]` |
| `/yw:api-recon`                  | `<feature-slug> [env] [--spec <path-or-url>] [--capture-ui]`                                                                                        |
| `/yw:execute-cases`              | `<feature-slug> [env] [--tc <id,id,...>] [--role <role>] [--continue-on-failure]`                                                                   |
| `/yw:log-exploratory`            | `<feature-slug>`                                                                                                                                    |
| `/yw:forge-oracle`               | `<feature-slug>`                                                                                                                                    |
| `/yw:forge-scripts`              | `<feature-slug> [--scenario-type positive\|functional\|negative\|edge\|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]`                          |
| `/yw:forge-api-tests`            | `<feature-slug> [--tc TC-id] [--operation operation-id] [--layer contract\|integration\|ui-interception\|all]`                                      |
| `/yw:forge-performance-tests`    | `<feature-slug> [--profile smoke\|load\|spike\|stress\|endurance] [--operation operation-id]`                                                       |
| `/yw:audit-scripts`              | `<feature-slug> [branch] [--scenario-type positive\|functional\|negative\|edge\|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]`                 |
| `/yw:green-run`                  | `<feature-slug> [branch] [--scenario-type positive\|functional\|negative\|edge\|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]`                 |
| `/yw:gate-merge`                 | `<feature-slug> [bypass Merge Gate]`                                                                                                                |
| `/yw:testops-promote`            | `<feature-slug>`                                                                                                                                    |
| `/yw:gate-ops`                   | `<feature-slug> [N-runs] [bypass Ops Gate]`                                                                                                         |
| `/yw:bug-report`                 | `<feature-slug> <one-line-symptom>`                                                                                                                 |
| `/yw:flake-triage`               | `<feature-slug-or-scenario> [evidence-path]`                                                                                                        |
| `/yw:change-impact`              | `[base-ref]`                                                                                                                                        |

For the most complete single-browser workflow:

```text
/yw:ui-recon <feature> <env> \
  --with-api-recon --spec <openapi-path-or-url> \
  --with-case-execution --tc <TC-id,TC-id> \
  --role <role> [--continue-on-failure]
```

UI Recon is the only browser driver in that composition. API Recon observes
network behavior, while Execute Cases records exact step verdicts and failure
evidence from the same actions. Each skill writes and owns its own artifacts.

## Skill catalog: Why, What, When, Where, and How

The summary below explains each skill's purpose and operating boundary. The
authoritative procedure remains inside the corresponding `SKILL.md`.

### `ask-yieldwerx`

- **Why:** Give everyone one short command for approved product knowledge.
- **What:** Forward a question to the independently maintained knowledgebase.
- **When:** Use it for YieldWerx product, module, workflow, data, UI, report,
  calculation, QA, and onboarding questions.
- **Where:** Read through the installed
  `yieldwerx-knowledgebase@yieldwerx-company` dependency.
- **How:** Pass the exact question to the authoritative knowledge skill and
  return its simple, source-based answer.

### `probe-spec`

- **Why:** Make requirements testable and expose ambiguity before case design.
- **What:** Produce stable ACs with a `Verify that ...` summary and
  Given/When/Then, plus categories, questions, domain/data needs, the feature
  ledger, and an optional reconciliation report.
- **When:** Start every feature here. Use `--migrate-format` for presentation-
  only conversion of an old analysis, or `--reconcile` to compare it with a
  complete approved source.
- **Where:** Read the supplied requirement as the source of truth and use the
  knowledge provider only for terminology and business context; write
  configured `10-spec` and ledger artifacts in the consumer repository.
- **How:** Distill without inventing behavior, classify each AC as Workflow or
  Simple Rule, write its summary and Gherkin in simple QA words, preserve
  stable IDs, report downstream impact, validate the artifacts, and optionally
  chain runtime comparison.

Spec Probe starts every active AC with `**Summary:** Verify that ...`, then
writes it in Gherkin. It keeps one of two classifications:

- **Workflow:** use `Given`, `When`, and `Then` when a user or system action
  causes a result.
- **Simple Rule:** also use `Given`, `When`, and `Then` for layout, limits,
  allowed values, data rules, calculations, or measurable performance rules.
  Keep the context and action small, and write each result with `must` or
  `must not`.

Use short product words and exact values. The AC says what must happen; Case
Forge later writes the detailed manual steps.

The provided PRD/story/specification is the sole requirement authority.
Knowledgebase material is labeled reference context only. It may explain
YieldWerx terminology and the business picture, but it cannot create an AC,
fill a missing value or result, resolve unclear wording, or appear in an
`AC`/`AMB`/`OOS` Source field.

For an existing analysis, choose a mode explicitly:

```text
/yw:probe-spec <feature-slug> --migrate-format
/yw:probe-spec <feature-slug> <complete-approved-spec> --reconcile
```

`--migrate-format` changes presentation only and does not invalidate cases or
evidence. `--reconcile` records unchanged, format-only, added, removed,
meaning-changed, and superseded items in `10-spec/spec-reconciliation.md`.
Substantive case changes are routed to `/yw:update-cases`.

### `probe-implementation`

- **Why:** Find requirement/build gaps without treating current behavior as
  intended behavior.
- **What:** Classify each observable AC as aligned, divergent, absent,
  unobservable, or blocked.
- **When:** After Spec Probe and before Case Forge when a build is reachable.
- **Where:** Observe the configured environment; write `15-implementation-probe`.
- **How:** Pin build/role/data, use the runtime connector, capture evidence per
  AC, and separate undocumented behavior.

### `forge-cases`

- **Why:** Give manual QA and reviewers understandable, executable cases.
- **What:** Create procedural Gherkin plus case details, pacing, scope,
  per-category visual dispositions, and developer handoff.
- **When:** After valid spec analysis; parameters can restrict work to
  functional, positive, negative, edge, category, AC, or TC scope.
- **Where:** Write configured consumer feature files and `20-cases` artifacts.
- **How:** Map ACs to categories, record visual candidates or a specific visual
  `N/A`, use visible sequential actions, preserve IDs, lint, and fail closed on
  an empty selector.

### `update-cases`

- **Why:** Correct existing cases without losing identity or review history.
- **What:** Amend affected scenarios and record downstream invalidations.
- **When:** After clarified requirements, audit findings, specification/UI
  changes, or incorrect expected values.
- **Where:** Edit configured feature and `20-cases` files in place; write an
  amendment record.
- **How:** Select exact ACs/TCs, make the smallest procedural change, preserve
  keys, lint, and reopen invalidated stages.

### `update-yieldwerx-knowledge`

- **Why:** Give maintainers one short command without weakening knowledge
  ownership or review.
- **What:** Forward an approved knowledge change to the maintained knowledgebase
  workflow.
- **When:** Use it after an approved PRD, handbook edition, product decision, or
  domain correction.
- **Where:** Write through the installed
  `yieldwerx-knowledgebase@yieldwerx-company` dependency.
- **How:** Pass the exact request to the authoritative update skill and preserve
  its source, validation, and human-review rules.

### `audit-cases`

- **Why:** Catch design defects before human approval.
- **What:** Independently review coverage, traceability, procedure, boundaries,
  and data feasibility.
- **When:** After Case Forge and after material amendments, before Design Gate,
  unless a named allrounder explicitly waives the exact audit scope.
- **Where:** Read feature, `10-spec`, and `20-cases`; write `30-case-audit`.
- **How:** Freeze scope, lint it, use the independent auditor, classify
  findings, and never edit cases during the audit.

### `gate-design`

- **Why:** Prevent automation of incomplete or unapproved test design.
- **What:** Assemble the design-stage evidence into a decision-ready report.
- **When:** After Spec Probe and Case Forge, when Case Audit has passed or an
  authorized human has explicitly waived it.
- **Where:** Read configured design artifacts; commit the Design Gate report
  beside the consumer ledger.
- **How:** Recompute checks and expose gaps. A Domain Test Analyst signs
  manually. If a named QA Lead or Automation Engineer allrounder directly says
  the ready gate is approved, Claude records the human's name, role, decision,
  date, confirmed automation set, ledger status, and waiver. The allrounder may
  explicitly bypass Case Audit or the Design Gate while preserving every
  finding and residual risk; a bare `approved` does not imply either bypass.

### `bypass-gate`

- **Why:** Let an accountable allrounder move past a gate without pretending
  missing or failed evidence passed.
- **What:** Bypass the Design, Merge, Ops, or all applicable PROBE gates for an
  exact feature/category scope.
- **When:** Only after a named QA Lead or Automation Engineer explicitly says
  to bypass the named gate or all gates.
- **Where:** Update each committed gate report and the feature ledger, with one
  waiver row per gate.
- **How:** Preserve the real evidence verdict, record `Decision: bypassed`,
  human identity, reason, gaps, and residual risk, then let downstream stages
  accept only that exact `waived — allrounder gate bypass` scope.

### `owner-bypass`

- **Why:** Let the PROBE owner make an explicit exception without exposing a
  secret or silently weakening the process.
- **What:** Authorize Tafseer Haider (`tafseer.haider@yieldwerx.com`) to waive
  any exact PROBE stage, gate, audit, checklist, evidence, or ordering item.
- **When:** Only when Tafseer directly requests a specific owner override.
- **Where:** Keep the PIN and generated signing key in the user environment or
  gitignored `.env`; keep the short-lived receipt under
  `.probe/authorizations`; commit only the ledger waiver.
- **How:** Tafseer runs `probe owner-bypass setup` once, then enters the PIN
  through the hidden local authorization prompt. Claude verifies the signed,
  scope-specific receipt, records the reason and residual risk, applies only
  that bypass, and consumes the receipt.

### `sync-cases`

- **Why:** Keep durable manual records and automation traceability synchronized.
- **What:** Create/update configured case-management records and stable IDs.
- **When:** After Design Gate approval or explicit allrounder bypass, and
  whenever the authorized cases change.
- **Where:** Read feature files, write `25-aio-sync`, and optionally call AIO.
- **How:** Check connectivity, dry-run idempotently, obtain human approval for
  `--live`, and review write-backs.

### `ui-recon`

- **Why:** Replace guessed selectors with observed UI contracts.
- **What:** Walk Design-Gate-approved or explicitly bypass-authorized cases,
  capture states, inventory selectors, log observability gaps, and optionally
  coordinate API Recon and assisted execution during the same actions.
- **When:** After Design Gate and before Script Forge for reachable UI scope.
- **Where:** Observe the configured app; write `40-ui-recon` evidence.
- **How:** Use the browser connector and safe data, record approved selectors,
  optionally register API/execution companions before the first action,
  prepare gap tickets, and mark inaccessible paths blocked.

### `execute-cases`

- **Why:** Execute approved UI cases efficiently without reopening the app or
  allowing shared state to hide defects.
- **What:** Run exact Gherkin steps through Playwright MCP in one controlled
  browser batch and capture step-level results plus standardized failure
  evidence.
- **When:** After Design Gate approval or exact allrounder bypass when a live UI
  build is ready for assisted/manual execution.
- **Where:** Drive the configured environment and write under
  `50-exploratory/executions`; never sync results to AIO directly.
- **How:** Reuse the browser connection and same-role authentication, reset each
  independent case to a known state, capture failures before recovery, and
  route intermittent/app failures to Flake Triage or Bug Report.

### `api-recon`

- **Why:** Replace guessed endpoints and payloads with reconciled evidence.
- **What:** Combine Swagger/OpenAPI with sanitized observed traffic into an API
  inventory, drift report, samples, and per-case executability verdicts.
- **When:** Before API automation or whenever UI flows need API assertions,
  setup, synchronization, or deterministic interception.
- **Where:** Read declared and authorized live sources; write `40-api-recon`.
- **How:** Normalize operations, preserve provenance, redact secrets, compare
  declared versus observed behavior, and report conflicts without guessing.

### `log-exploratory`

- **Why:** Preserve manual evidence and learning outside scripted checks.
- **What:** Record exploratory sessions, findings, and approved-case executions.
- **When:** After Design Gate whenever human testing occurs or is consciously
  waived.
- **Where:** Write the consumer feature's `50-exploratory` records.
- **How:** Define a charter, record build/data/results, route defects, and
  distinguish unexecuted work from signed risk acceptance.

### `forge-oracle`

- **Why:** Keep expected results independent of the implementation under test.
- **What:** Build a reviewed oracle for derived business outcomes.
- **When:** After case approval and before derived-value assertions are scripted.
- **Where:** Put code in approved consumer test support and provenance in
  `60-scripts`.
- **How:** Trace approved rules, define deterministic contracts and boundaries,
  add hand-worked self-tests, and obtain domain review.

### `forge-scripts`

- **Why:** Automate approved cases without changing their business meaning.
- **What:** Implement selected scenarios and add `@automated` while retaining
  `@manual` and any `@visual` intent.
- **When:** Only after Design Gate approval or explicit allrounder bypass and
  for the confirmed parameterized scope, such as functional cases.
- **Where:** Change consumer automation code/eligible tags and write
  `60-scripts` evidence.
- **How:** Freeze TC scope, apply the active profile, implement visual cases
  with named baselines, approved masks, and a deterministic runner, then run
  configured generation, lint, type, and test commands.

### `forge-api-tests`

- **Why:** Turn approved API behavior into deterministic, runtime-validated tests.
- **What:** Build typed domain clients, schemas, role/data fixtures, API tests,
  UI interception, cleanup, and execution evidence.
- **When:** After API Recon and the applicable case/design authorization.
- **Where:** Change profile-defined consumer code and write `60-api-scripts`.
- **How:** Intersect approved cases with reconciled operations, select contract,
  integration, or interception layers, then run the exact configured checks.

### `forge-performance-tests`

- **Why:** Turn approved API performance risk into reproducible, gated evidence.
- **What:** Build safe k6 smoke, load, spike, stress, and endurance workloads
  with thresholds, isolated data, cleanup, summaries, and target guards.
- **When:** After API Recon and approval of the workload, SLO, environment,
  intensity, and cleanup strategy.
- **Where:** Change profile-defined consumer performance code and write
  `60-performance-scripts` evidence.
- **How:** Map approved cases to realistic operation mixes, validate at minimal
  load, then run only the explicitly authorized profile and target.

### `audit-scripts`

- **Why:** Block brittle, unsafe, or self-passing automation.
- **What:** Independently audit code, assertions, data, and evidence.
- **When:** After each Script Forge cycle and after material fixes.
- **Where:** Inspect consumer implementation plus `60-scripts`; write
  `70-script-audit`.
- **How:** Pin commit/TC scope, run configured checks, use a read-only auditor,
  and fail closed on unresolved high-risk findings.

### `green-run`

- **Why:** Prove repeatable reliability rather than a single lucky pass.
- **What:** Produce a diagnosed consecutive-green execution record.
- **When:** After Script Audit passes; restart after every automation fix.
- **Where:** Run in configured CI-equivalent conditions; write `80-green-run`.
- **How:** Execute exact scope three times green by default, record provenance,
  reset on failure, and route intermittent behavior to Flake Triage.

### `gate-merge`

- **Why:** Keep unstable or insufficiently evidenced automation out of main.
- **What:** Assemble scripting, audit, stability, coverage, and observability
  evidence.
- **When:** After complete Script Forge, Script Audit, and Stability Run.
- **Where:** Read consumer evidence; commit the Merge Gate report by the ledger.
- **How:** Cross-check current-commit evidence, regenerate coverage, expose
  gaps, and request human sign-off. A named allrounder may explicitly bypass
  the gate while keeping its real readiness and residual risk visible.

### `testops-promote`

- **Why:** Make merged automation reliable and observable in steady-state CI.
- **What:** Configure slices, reporting, retention, failure policy, and budgets.
- **When:** After a signed or explicitly allrounder-bypassed Merge Gate and the
  actual merge to the integration branch.
- **Where:** Change consumer CI/config on a branch and write `90-testops`.
- **How:** Run slices as CI will, validate reports/archives, measure duration,
  reject unexplained quarantine, and require a real pipeline run.

### `gate-ops`

- **Why:** Require durable proof before automation is declared complete.
- **What:** Assemble CI history, reports, flake rate, sync, evidence retention,
  and manual-only inventory.
- **When:** After TestOps Promotion and the required real CI runs.
- **Where:** Read provider/consumer evidence; commit the Ops Gate report.
- **How:** Verify provenance and thresholds, enumerate exceptions, leave
  signatures blank, and require human approval. A named allrounder may
  explicitly bypass the gate; record `Done — Ops Gate bypassed` and retain the
  residual risk.

### `bug-report`

- **Why:** Produce consistent defects without confusing app and test failures.
- **What:** Create a reproducible bug artifact and optional tracker candidate.
- **When:** From any stage after evidence indicates an application defect.
- **Where:** Write configured bug/candidate artifacts; optionally sync externally.
- **How:** Reproduce, redact, classify, fingerprint, preview, and require fresh
  human authorization before filing.

### `flake-triage`

- **Why:** Keep intermittent failures visible without weakening gates.
- **What:** Classify cause, control quarantine, and collect exit evidence.
- **When:** Immediately after inconsistent local or CI behavior.
- **Where:** Use consumer runs/traces and write a stable `FLAKE-NN` artifact.
- **How:** Repeat under controlled conditions, use the flake hunter, quarantine
  by policy, and require the configured green exit streak.

### `change-impact`

- **Why:** Detect test drift caused by frontend changes before regression.
- **What:** Map source and selector-contract changes to cases and scripts.
- **When:** During relevant UI changes or before a developer pushes them.
- **Where:** Analyze the configured Git diff/maps and write change-impact
  evidence.
- **How:** Run configured impact checks, inspect hunks, map affected tests, and
  propose rather than silently apply case/script changes.

## Install in Claude Code

Add the private Azure Repos marketplace using the clone URL shown by Azure:

```text
/plugin marketplace add https://dev.azure.com/<organization>/<project>/_git/yieldwerx-probe
/plugin install yw@yieldwerx
/reload-plugins
```

Installed commands are namespaced, for example:

```text
/yw:probe-spec
/yw:probe-implementation
/yw:forge-cases functional
/yw:gate-design
/yw:ask-yieldwerx
/yw:update-yieldwerx-knowledge
```

All 27 `yw:*` skills are explicitly user-invocable and appear in Claude Code's
slash-command menu. Repository validation fails if a public skill is hidden.

## Consumer contract

Each consumer supplies `probe.config.yaml`. See
[`examples/generic/probe.config.yaml`](examples/generic/probe.config.yaml) and
[`examples/playwright-bdd/probe.config.yaml`](examples/playwright-bdd/probe.config.yaml).
Plugin-owned references stay inside the plugin; feature artifacts are always
written into the consumer repository.

The `yw` plugin depends on the separately versioned
`yieldwerx-knowledgebase@yieldwerx-company` plugin. Public commands use
`/yw:ask-yieldwerx` and `/yw:update-yieldwerx-knowledge`; their small adapters
forward to the authoritative knowledge skills and do not copy product facts
into this repository. In Spec Probe, that knowledge is context only; the
provided requirement remains the sole requirement authority. If required
knowledge is unavailable, the workflow records the missing context instead of
guessing from the application.
See the
[knowledge integration contract](plugins/yieldwerx-probe/references/integrations/knowledge.md).

Plugin reference files do not load automatically. Every skill must explicitly
read the relevant compatibility-profile rules before it performs
framework-specific work.

## Portable CLI

The dependency-free `@yieldwerx/probe-cli` package lets a consumer run PROBE
validation, Gherkin lint, requirements coverage, and AIO commands without
copying scripts from this repository. It requires Node.js 22.18 or newer.

Start with:

```text
probe doctor
```

The doctor checks the consumer configuration, paths, enabled Claude plugins,
and installed plugin versions. Read the [CLI guide](docs/CLI.md) for commands
and consumer package scripts.

## Validate

```text
npm test
claude plugin validate .
```

`npm test` has no third-party runtime dependency. Claude's validator is an
additional release check when the Claude Code CLI is available.

## Releases

`plugin.json` uses semantic versions. Every published change must update the
version and `CHANGELOG.md`, pass the repository pipeline, and be tagged
`v<major>.<minor>.<patch>`. Version 2 changes the public plugin identity from
`yieldwerx-probe` to `yw`; the marketplace rename map migrates editable Claude
Code settings on supported versions.

The first extraction retains Playwright BDD, AIO, Jenkins and Plotly material
as compatibility profiles. They are not mandatory core capabilities.
