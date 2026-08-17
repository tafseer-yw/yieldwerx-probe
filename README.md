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

## All 34 public skills: arguments and composition

The complete argument semantics, selector behavior, shared-session ownership,
tandem recipes, artifact chains, and unsafe combinations are in the
[skill usage and tandem guide](docs/SKILL-USAGE.md).

The table below lists every public `yw:*` skill shipped by PROBE 2.10.0 — 27 on
the QA track and 7 on the development track. The repository validator compares
this README with the actual skill directories and fails when a skill, accepted
argument contract, or full 5W1H catalog entry is missing.

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
| `/yw:bypass-gate`                | `<feature-slug> <case-audit\|script-audit\|audits\|design\|merge\|ops\|all> [--category CAT-NN] [--reason "<reason>"]`                              |
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
| `/yw:gate-merge`                 | `<feature-slug> [bypass Script Audit] [bypass Merge Gate]`                                                                                          |
| `/yw:testops-promote`            | `<feature-slug>`                                                                                                                                    |
| `/yw:gate-ops`                   | `<feature-slug> [N-runs] [bypass Ops Gate]`                                                                                                         |
| `/yw:bug-report`                 | `<feature-slug> <one-line-symptom>`                                                                                                                 |
| `/yw:flake-triage`               | `<feature-slug-or-scenario> [evidence-path]`                                                                                                        |
| `/yw:change-impact`              | `[base-ref]`                                                                                                                                        |

The development track builds and corrects the application the QA track tests.
**It is gate-independent:** no development skill checks a ledger, waits on the
Design, Merge, or Ops Gate, or requires a QA artifact to exist, so every one of
them runs on a repository that has never used PROBE's QA process. Where a QA
artifact is present it is consumed as better input, never as a precondition.
Neither track edits the other's artifacts. Authority:
[DEV-TRACK.md](plugins/yieldwerx-probe/references/process/DEV-TRACK.md).

| Skill                  | Accepted arguments                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/yw:scaffold-app`     | `<app-slug> [--stack <profile-name>] [--surfaces api,ui,db,auth,queue] [--dry-run]`                                                         |
| `/yw:build-feature`    | `<feature-slug> [--ac AC-NN] [--category CAT-NN] [--requirement <path>] [--no-requirement "<reason>"]`                                      |
| `/yw:revise-feature`   | `<feature-slug> -- <what must change> [--breaking-ok "<authorization>"] [--ac AC-NN]`                                                       |
| `/yw:fix-defect`       | `<feature-slug> "<defect-slug-or-symptom>" [--candidate <path>] [--tc TC-id] [--no-test "<reason>"]`                                        |
| `/yw:seed-testability` | `<feature-slug> [--from-recon <path>] [--surface ui\|api\|results\|all] [--rank high\|medium\|all]`                                         |
| `/yw:review-code`      | `<feature-slug> [branch\|--staged\|--files <path,...>] [--focus correctness\|security\|data\|observability\|all] [--depth quick\|thorough]` |
| `/yw:ship-change`      | `<feature-slug> [commit\|describe\|both] [--push] [--open-pr] [--base <ref>]`                                                               |

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

## Gate hibernation (evaluation mode)

A consumer repository may suspend the Design, Merge and Ops Gates by declaring
`governance.gates` in `probe.config.yaml`. This exists so a team can run PROBE
end to end before agreeing to be bound by it.

**Hibernation suspends blocking and nothing else.** The gate still runs, still
assembles evidence, and still reports `READY` or `NOT READY` with every failing
item intact; its decision line reads
`HIBERNATED — evidence assembled, not signed`. It is never `approved`,
`passed`, or `signed` — rendering it as one is falsified evidence and is
`blocker` under the severity ladder.

Not suspended: the severity ladder (a `blocker` still halts, and wrong business
data is still `blocker`), Case Audit and Script Audit verdicts, the traceability
chain, external-write authorization, and the repository's own branch protection.

`mode: hibernated` requires a named `authorizedBy`, a `reason`, a `scope`, and a
`since` date. Every stage that proceeds writes a ledger row carrying the
authorizer and the gate's real readiness verdict; when gates resume, those rows
are the gate-debt list. Resume with `mode: active`, or delete the block.

Full contract:
[gate-hibernation.md](plugins/yieldwerx-probe/references/governance/gate-hibernation.md)
· policy P17.

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

- **Why:** Let an accountable allrounder move past a gate or audit without
  pretending missing or failed evidence passed.
- **What:** Bypass Case Audit, Script Audit, both audits, Design Gate, Merge
  Gate, Ops Gate, or all three gates for an exact feature/category scope.
- **When:** Only after a named QA Lead or Automation Engineer explicitly says
  to bypass the named audit/gate, all audits, or all gates.
- **Where:** Update each applicable audit/gate report and the feature ledger,
  with one waiver row per scope.
- **How:** Preserve the real verdict and findings, record human identity,
  reason, gaps, and residual risk, then let downstream stages accept only that
  exact waiver. Script Audit waivers are bound to the exact TC inventory and
  commit/file-hash manifest. `audits` and `all` are deliberately separate.

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
- **When:** After each Script Forge cycle and after material fixes, unless a
  named allrounder explicitly waives the exact current manifest.
- **Where:** Inspect consumer implementation plus `60-scripts`; write
  `70-script-audit`.
- **How:** Pin commit/TC scope, run configured checks, use a read-only auditor,
  and fail closed on unresolved high-risk findings. An explicit bypass routes
  through `bypass-gate` and preserves the real findings and risk.

### `green-run`

- **Why:** Prove repeatable reliability rather than a single lucky pass.
- **What:** Produce a diagnosed consecutive-green execution record.
- **When:** After Script Audit passes or an exact manifest-bound allrounder
  Script Audit waiver is current; restart after every automation fix.
- **Where:** Run in configured CI-equivalent conditions; write `80-green-run`.
- **How:** Execute exact scope three times green by default, record provenance,
  reset on failure, and route intermittent behavior to Flake Triage.

### `gate-merge`

- **Why:** Keep unstable or insufficiently evidenced automation out of main.
- **What:** Assemble scripting, audit, stability, coverage, and observability
  evidence.
- **When:** After complete Script Forge, a Script Audit PASS or exact current
  waiver, and Stability Run.
- **Where:** Read consumer evidence; commit the Merge Gate report by the ledger.
- **How:** Cross-check current-commit evidence, regenerate coverage, expose
  gaps, and request human sign-off. A Script Audit waiver satisfies only that
  audit prerequisite; any resulting Merge Gate waiver is a separate explicit
  decision. Every bypass keeps the real readiness and residual risk visible.

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

### `scaffold-app`

- **Why:** Every expensive early QA finding is a missing foundation — no API
  document to reconcile, no roles so authorization has no coverage, no reset so
  scenarios contaminate each other, no selector policy so the first hundred
  controls ship unaddressable.
- **What:** A runnable skeleton with no business features and every QA contract
  already present, proven by one trivial vertical slice.
- **When:** Once, at the start of an application under test. Never over code
  that already exists.
- **Where:** A new consumer repository; the report goes to the configured
  `70-build` artifact directory.
- **How:** Confirm stack and surfaces, lay down datastore, roles, documented API,
  selector policy and async surface in dependency order, prove the slice, and
  hand over the exact commands and `probe.config.yaml` entries PROBE will need.

### `build-feature`

- **Why:** PROBE governed how a feature is tested but never how it is built, so
  the tracks drifted — unaddressable controls and undocumented routes discovered
  a quarter later by recon.
- **What:** One verified capability on its own branch, with a report naming the
  acceptance criteria satisfied, the files changed, and the observability added.
- **When:** For new capability, after the requirement exists. Use
  `/yw:revise-feature` to change behavior and `/yw:fix-defect` for defects.
- **Where:** Application code on `feat/<feature-slug>`; never in `docs/qa/`.
- **How:** Clarify without assuming, design onto the repository's real layers,
  split into bounded tasks, implement whole journeys with their observability
  obligations, and loop on verbatim failures until green.

### `revise-feature`

- **Why:** Changing working behavior is more dangerous than adding new behavior,
  because a caller, a stored row, and an approved case already depend on it.
- **What:** A behavior change with its current state documented first,
  compatibility preserved unless a break is authorized, and an explicit list of
  the QA artifacts it invalidates.
- **When:** When behavior that exists must work differently — a renamed label, a
  changed default, a different calculation.
- **Where:** Application code on `feat/<feature-slug>`; the invalidation list
  goes in the revision report.
- **How:** Inventory current behavior and its dependents before editing, design
  the transition rather than only the end state, migrate stored data, verify,
  and route every invalidated artifact rather than amending it.

### `fix-defect`

- **Why:** PROBE files defects and the trail stops; the fix happens under no
  process and no evidence returns.
- **What:** The smallest correct change for one defect, a regression test that
  demonstrably failed before it, and a report the QA track can close against.
- **When:** When a defect is reproducible. Intermittent behavior goes to
  `/yw:flake-triage` first.
- **Where:** Application code on `fix/<defect-slug>`; the test lands at the
  cheapest level that pins the defect.
- **How:** Read the evidence not the title, reproduce, write the failing test
  first and record its failure, state the mechanism with citations, make the
  minimal change, check sibling paths, and verify.

### `seed-testability`

- **Why:** Recon regularly finds a build with no automation contracts at all —
  each gap cheap to fix in the code and expensive to work around in the tests.
- **What:** Stable selector contracts, an API document that matches the
  implementation, and machine-readable access to asserted values.
- **When:** As a sweep over code predating the obligation, to measure how
  automatable a build currently is, or from a recon gap list. A recon pass is
  optional — the scout scans the code directly.
- **Where:** Application code; never a page object, feature file, or recon
  artifact.
- **How:** Take the scout's code scan as the base list, union any recon list
  over it, close gaps by rank without changing behavior, verify the suite is
  unchanged, and map every closure back to the finding that raised it.

### `review-code`

- **Why:** PROBE reviews automation adversarially and application code not at
  all — yet that is where a wrong calculation costs a customer a wrong number.
- **What:** An independent review with a `GO`/`NO-GO` verdict, ranked findings
  each carrying a concrete failure case, and the unmet obligations.
- **When:** Before `/yw:ship-change`, on any dev-track branch. Automation goes to
  `/yw:audit-scripts` instead.
- **Where:** Reads the consumer repository; writes only the review artifact.
- **How:** Freeze the change set, read the intent before the diff, delegate to
  the code reviewer, verify every finding is concrete before reporting it, rank
  on the configured ladder, and decide.

### `ship-change`

- **Why:** The last mile is where a good change becomes unreviewable — a commit
  that says "fixes", no evidence, and no mention that forty cases are now stale.
- **What:** The requested shipping output: clean local commits, a pull-request
  body carrying the intent and evidence, or both.
- **When:** After `/yw:review-code` returns `GO`.
- **Where:** The consumer working tree and its configured remote; ship notes go
  to `70-build`.
- **How:** Resolve `commit`, `describe`, or `both` plus the comparison base;
  scan for what must never be committed, run the hygiene set, create only the
  requested local outputs, and stop at the boundary of any outward action.

## Install in Claude Code or Claude Desktop

Add the public GitHub marketplace:

```text
/plugin marketplace add https://github.com/tafseer-yw/yieldwerx-probe.git
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

All 34 `yw:*` skills are explicitly user-invocable and appear in the
slash-command menu. Repository validation fails if a public skill is hidden.

### One entry point per skill

Each public entry point is authored exactly once, as `skills/<name>/SKILL.md`.
The plugin deliberately ships **no** `commands/` directory, and repository
validation fails if one appears.

2.13.0 briefly added a `commands/<name>.md` shim per skill, on the theory that
Claude Desktop builds its `/` menu from `commands/` while Claude Code uses
`skills/`. That theory is wrong: the loader merges both directories into one
registry, so shipping both registered all 34 names twice and the collision
stopped the plugin from registering anything at all in Claude Desktop — no
skills and no commands. It also added roughly 4,100 always-on tokens to every
session. 2.13.1 reverted it.

Verify any layout change with `claude plugin details yw@yieldwerx` and confirm
the reported skill count equals the number of directories under `skills/`.

## Consumer contract

Each consumer supplies `probe.config.yaml`. See
[`examples/generic/probe.config.yaml`](examples/generic/probe.config.yaml) and
[`examples/playwright-bdd/probe.config.yaml`](examples/playwright-bdd/probe.config.yaml).
Applications using the development track can start from
[`examples/node-ts-spa/probe.config.yaml`](examples/node-ts-spa/probe.config.yaml).
Plugin-owned references stay inside the plugin; feature artifacts are always
written into the consumer repository.

The `yw` plugin consumes the separately versioned
`yieldwerx-knowledgebase@yieldwerx-company` plugin as an **optional
prerequisite**, and deliberately declares **no** `dependencies` in its manifest.
Install the knowledgebase separately if you need product knowledge:

```text
/plugin install yieldwerx-knowledgebase@yieldwerx-company
```

It must not be a declared dependency. An unsatisfied dependency makes Claude
Code disable the depending plugin, and `yieldwerx-company` is an internal Azure
DevOps marketplace that a QA workstation or a Cowork sync generally cannot
reach. Through 2.13.1 that disabled all 34 `yw` skills for every user without
that access — while an owner machine, where the knowledgebase happens to be
installed, looked completely healthy. Repository validation now fails if either
the manifest declares dependencies or the marketplace re-adds
`allowCrossMarketplaceDependenciesOn`.

Only `/yw:ask-yieldwerx` and `/yw:update-yieldwerx-knowledge` consult it. Their
small adapters forward to the authoritative knowledge skills, do not copy product
facts into this repository, and state plainly when the knowledgebase is missing
or disabled rather than guessing. The other 32 skills never touch it. In Spec
Probe, that knowledge is context only; the provided requirement remains the sole
requirement authority. If required knowledge is unavailable, the workflow records
the missing context instead of guessing from the application.
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
