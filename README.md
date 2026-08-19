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

## All 42 public skills: arguments and composition

The complete argument semantics, selector behavior, shared-session ownership,
tandem recipes, artifact chains, and unsafe combinations are in the
[skill usage and tandem guide](docs/SKILL-USAGE.md).

The table below lists every public `yw:*` skill this repository ships — 26 on
the QA track, 13 on the development track, and 3 shared by both (`probe-spec`,
`forge-prd`, `handoff`). The repository validator compares
this README with the actual skill directories and fails when a skill, accepted
argument contract, or full 5W1H catalog entry is missing.

| Skill                            | Accepted arguments                                                                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/yw:ask-yieldwerx`              | `<question>`                                                                                                                                        |
| `/yw:update-yieldwerx-knowledge` | `<approved-change-request>`                                                                                                                         |
| `/yw:forge-prd`                  | `<feature-slug> [<the idea or problem, or a path to notes>] [--review \| --sign-off "<name>"]`   |
| `/yw:probe-spec`                 | `<feature-slug> [<spec-path-or-text>] [--migrate-format \| --reconcile] [--compare-implementation <env-or-url>] [--role <role>] [--build <id>]`     |
| `/yw:probe-implementation`       | `<feature-slug> <env-or-url> [--role <role>] [--build <id>]`                                                                                        |
| `/yw:forge-cases`                | `<feature-slug> [--scenario-type positive\|functional\|negative\|edge\|all] [--category CAT-NN] [--ac AC-NN]`                                       |
| `/yw:forge-tech-design` | `<feature-slug> [--stack <profile-name>] [--ac AC-NN]` |
| `/yw:forge-unit-tests`  | `<feature-slug> [--stack <profile-name>] [--ac AC-NN]` |
| `/yw:forge-migration`   | `<feature-slug or change description> [--stack <profile-name>] [--data-only]` |
| `/yw:sync-styleguide`   | `<feature-slug or --all> [--stack <profile-name>] [--fix]` |
| `/yw:update-cases`               | `<feature-slug> -- <what needs to change>`                                                                                                          |
| `/yw:gate-design`                | `<feature-slug> [--category CAT-NN] [approved]`                                                                                                     |
| `/yw:sync-cases`                 | `<feature-slug> [--live] [--category CAT-NN]`                                                                                                       |
| `/yw:ui-recon`                   | `<feature-slug> [env] [--with-api-recon] [--spec <path-or-url>] [--with-case-execution] [--tc <id,id,...>] [--role <role>] [--continue-on-failure]` |
| `/yw:desktop-recon`              | `<feature-slug> [--build <id>] [--category CAT-NN]`                                                                                                 |
| `/yw:forge-desktop-scripts`      | `<feature-slug> [--category CAT-NN] [--tc TC-id]`                                                                                                   |
| `/yw:api-recon`                  | `<feature-slug> [env] [--spec <path-or-url>] [--capture-ui]`                                                                                        |
| `/yw:execute-cases`              | `<feature-slug> [env] [--tc <id,id,...>] [--role <role>] [--continue-on-failure]`                                                                   |
| `/yw:log-exploratory`            | `<feature-slug>`                                                                                                                                    |
| `/yw:forge-oracle`               | `<feature-slug>`                                                                                                                                    |
| `/yw:forge-scripts`              | `<feature-slug> [--scenario-type positive\|functional\|negative\|edge\|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]`                          |
| `/yw:forge-api-tests`            | `<feature-slug> [--stack <profile-name>] [--tc TC-id] [--operation operation-id] [--layer contract\|integration\|ui-interception\|fuzz\|all]`                                      |
| `/yw:forge-performance-tests`    | `<feature-slug> [--stack <profile-name>] [--profile smoke\|load\|spike\|stress\|endurance] [--operation operation-id]`                                                       |
| `/yw:audit-scripts`              | `<feature-slug> [branch] [--scenario-type positive\|functional\|negative\|edge\|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]`                 |
| `/yw:green-run`                  | `<feature-slug> [branch] [--scenario-type positive\|functional\|negative\|edge\|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]`                 |
| `/yw:gate-merge`                 | `<feature-slug>`                                                                                                                                    |
| `/yw:testops-promote`            | `<feature-slug>`                                                                                                                                    |
| `/yw:gate-ops`                   | `<feature-slug> [N-runs]`                                                                                                                           |
| `/yw:review-pr`                  | `<pr-number-or-url> [--repo <path>] [--post]`                                                                                                       |
| `/yw:handoff`                    | `'[<slug>] \| close <slug> \| list'`                                                                                                                 |
| `/yw:forge-security-tests`       | `<feature-slug> [--owasp A01,A07,...] [--category CAT-NN]`                                                                                          |
| `/yw:scan-security`              | `<scope> [--verbs deps-scan,sast,baseline-scan,api-scan,fuzz] [--target <url> --authorize] [--env <name>]`                                          |
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
| `/yw:build-feature`    | `<feature-slug> [--stack <profile-name>] [--layer backend\|frontend\|both] [--ac AC-NN] [--category CAT-NN] [--requirement <path>] [--no-requirement "<reason>"]`                                      |
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

## Gates are human decisions

PROBE has exactly three gates — Design, Merge, Ops — and each one is **a record of
a human decision**. Nothing else is a gate.

Each gate does the same four things: assemble an evidence digest of facts, present
it, record the human's decision, unlock the next stage. The digest carries counts,
coverage numbers, lint and run results, and a **Gaps and open items** section
listing everything missing or failing. It carries no verdict — no
`READY`/`NOT READY`, no ✅/❌ checklist, no recommendation.

```text
assemble facts  →  present  →  human states a decision  →  record + unlock
```

The approval row names the human, their role, a `YYYY-MM-DD HH:MM` timestamp, what
they said they reviewed, and the evidence link. Any role may approve any gate.
There is no waiver, bypass, hibernation, or override mechanism, because there is
nothing to argue with: a gate that has not been approved is simply not approved,
and the downstream stage stays locked.

**Approving with the listed gaps visible is a legitimate decision** and is recorded
as exactly that. Removing a gap from a digest to make the decision look cleaner is
falsified evidence and is `blocker` under the severity ladder.

**Claude never writes an approval a human did not state.** It may transcribe one
they did, recording `Recorded by: Claude — transcribed from the human's direct
approval`.

One gate genuinely blocks: `/forge-scripts` refuses until the ledger's Gate
approvals table has a Design Gate row naming a human with a timestamp for the scope
being scripted (policy P4). That is the only automatic block in the process, and it
blocks on exactly one thing — whether a human has looked at the design.

Full contract:
[human-gates.md](plugins/yieldwerx-probe/references/governance/human-gates.md).

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

### `forge-prd`

- **Why:** Requirements written in engineering language exclude the people
  funding the work; slideware excludes the people building it. One enforced
  plain-language document lets executives, developers, and QA agree on what was
  promised.
- **What:** A PRD in the fixed template — problem and cost, what will be built
  in product words, stable `US-NN` stories each with a plain-words explanation,
  scope, success measures, open questions with recommended answers, and a Terms
  table — validated by `validate-prd.mjs`.
- **When:** At the very start of a feature, before `/yw:probe-spec` and any
  design; again to amend, move to review, or record a human sign-off.
- **Where:** The configured PRDs home (`paths.prds`, falling back to
  `paths.requirements`), with the draft → in-review → signed-off lifecycle in
  the filename — renamed, never copied.
- **How:** Clarify without assuming, draft in the template with the shared
  plain-language rules enforced, validate, and record lifecycle moves; sign-off
  is a human decision Claude records with a name and timestamp, never makes.

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
- **What:** Create procedural Gherkin at the UI **and API** layer, plus case
  details, pacing, scope, per-category visual and API dispositions, and developer
  handoff.
- **When:** After valid spec analysis; parameters can restrict work to
  functional, positive, negative, edge, category, AC, or TC scope.
- **Where:** Write configured consumer feature files — `<category>.feature` and
  `<category>-api.feature` — and `20-cases` artifacts.
- **How:** Map ACs to categories; record visual candidates or a specific visual
  `N/A` **and** API candidates or a specific API `N/A` for every category; design
  the API dimensions that apply (functional, negative, boundary, authorization,
  contract, workload) rather than one shallow case per endpoint; use visible
  sequential actions, preserve IDs, lint, and fail closed on an empty selector.
  API cases stay repository-only.

### `forge-tech-design`

- **Why:** A build that starts without a design resolves every architectural
  question at the moment it is cheapest to get wrong; insecure design cannot be
  scanned for later.
- **What:** The layer-by-layer design for the declared stack — data model with a
  migration outline, API contract, tenancy/authorization/auditing/logging, the
  testability obligations the build must ship, a threat sketch, risks — plus
  ADR-shaped decision records.
- **When:** After `/yw:probe-spec` and before `/yw:build-feature`; again after a
  reconciliation changes in-scope acceptance criteria.
- **Where:** Reads the analysis and the active stack profile; writes
  `60-design/tech-design.md` and its decision records.
- **How:** Resolve the stack, delegate to the tech-designer agent with the
  sliced analysis, review the returned design for invention, persist, and close
  in one of the four dev-track states.

### `forge-unit-tests`

- **Why:** Case Forge routes calculation and internal-integration criteria to
  developers in `dev-handoff.md`, and until now nothing consumed that file — a
  routed criterion could quietly mean routed to nobody.
- **What:** Developer-owned tests in the stack's real framework, one per routed
  criterion, with expected values derived independently of the code under test,
  plus the criterion-to-test map.
- **When:** After `/yw:build-feature`, or test-first for a pure calculation;
  again when the hand-off gains rows.
- **Where:** Test files where the stack's conventions put them; the map under
  the feature's `70-build` artifacts.
- **How:** Resolve the stack, collect the routed set, write tests that would
  fail if the behavior broke, run the configured commands, and record the map.

### `forge-migration`

- **Why:** A schema change is the one part of a feature that cannot be reverted
  by deploying yesterday's build.
- **What:** Migration files in the stack's own convention plus notes carrying
  the safety argument on a populated database, the tenant scope, the rollback
  story, and the verification output.
- **When:** When the tech design's data model calls for schema or seed changes,
  before the dependent code merges.
- **Where:** Migration files where the stack keeps them; notes under the
  feature's `70-build` artifacts.
- **How:** Draft under the never-edit-applied / additive-first / two-step
  NOT NULL / idempotent-seed rules, register per the stack, verify with the
  configured command, and state the rollback story honestly.

### `sync-styleguide`

- **Why:** A design system dies by a thousand small exceptions; each is
  invisible alone and together they are why products look assembled from parts.
- **What:** A drift report reconciling implemented UI against the repository's
  own styleguide and token source — raw literals, off-scale spacing,
  unsanctioned variants, unapproved contrast pairs — with mechanical fixes
  applied under `--fix`.
- **When:** Before `/yw:review-code` on any change with UI in it, or
  periodically with `--all`.
- **Where:** Reads the repo-local design authority (never a bundled copy);
  writes the drift report under `70-build`.
- **How:** Run the repo's own design check first, sweep the scope for the drift
  classes, cite the violated rule for every finding, and fix only what is
  mechanical.

### `update-cases`

- **Why:** Correct existing cases without losing identity or review history.
- **What:** Amend affected scenarios and record downstream invalidations.
- **When:** After clarified requirements, review findings, specification/UI
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

### `gate-design`

- **Why:** Let a human decide whether this test design is good enough to build
  automation on, in a five-minute read, and record what they decided.
- **What:** An evidence digest of facts — AC and scenario counts, coverage
  numbers, lint results, known implementation differences, and every gap —
  followed by the human's recorded approval.
- **When:** After Spec Probe and Case Forge to assemble the digest, and again when
  a human states they have reviewed the cases and approve them.
- **Where:** Read configured design artifacts; commit the Design Gate report
  beside the consumer ledger.
- **How:** Recompute coverage, gather the facts, list every gap plainly, present,
  and stop — no verdict, no readiness stamp, no blocking checklist. On an explicit
  human approval, append the ledger row with name, role, timestamp, what they
  confirmed, and the evidence link, then unlock Case Sync and Script Forge. Claude
  never writes an approval the human did not state.

### `sync-cases`

- **Why:** Keep durable manual records and automation traceability synchronized.
- **What:** Create/update configured case-management records and stable IDs.
- **When:** After a recorded human Design Gate approval, and whenever the
  authorized cases change.
- **Where:** Read feature files, write `25-aio-sync`, and optionally call AIO.
- **How:** Check connectivity, dry-run idempotently, obtain human approval for
  `--live`, and review write-backs.

### `ui-recon`

- **Why:** Replace guessed selectors with observed UI contracts.
- **What:** Walk Design-Gate-approved cases,
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
- **When:** After a recorded human Design Gate approval when a live UI
  build is ready for assisted/manual execution.
- **Where:** Drive the configured environment and write under
  `50-exploratory/executions`; never sync results to AIO directly.
- **How:** Reuse the browser connection and same-role authentication, reset each
  independent case to a known state, capture failures before recovery, and
  route intermittent/app failures to Flake Triage or Bug Report.

### `desktop-recon`

- **Why:** Desktop scripting against unmapped objects rediscovers the
  application one brittle hierarchy walk at a time, and the unfixable gaps are
  one developer-set Name property away from being fixable.
- **What:** The walked scope with screenshots, a Name Mapping inventory with
  identification properties per the identity ladder, and the unnamed-control
  gap list — the desktop's testid-gaps.
- **When:** After the Design Gate approval and before
  `/yw:forge-desktop-scripts`; again when a build changes the screens in scope.
- **Where:** A reachable desktop build; artifacts under `40-desktop-recon`.
  Never edits the TestComplete project.
- **How:** Walk the approved cases' screens, record identity-ladder properties
  per control, propose role-named aliases, and route the gap list to
  `/yw:seed-testability`.

### `forge-desktop-scripts`

- **Why:** The desktop application produces the deliverable reports and had no
  scripted coverage path — every desktop case was manual forever by default.
- **What:** The approved `@desktop`-tagged scenarios imported unchanged into
  TestComplete's Scenarios item, Python step definitions bound to the case's
  own words, aliases-only object access, and `@automated` added only after a
  real run.
- **When:** After the Design Gate approval confirms the automation set, ideally
  after `/yw:desktop-recon`.
- **Where:** The team's TestComplete project and the feature's `60-scripts`
  artifacts.
- **How:** Freeze the TC scope, import without rewriting, bind Python steps per
  the profile conventions, map per the Name Mapping policy, run the tagged
  slice, and interpret exit codes per the CI contract.

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
- **When:** After the Design Gate whenever human testing occurs, or when the team
  records a decision not to do it.
- **Where:** Write the consumer feature's `50-exploratory` records.
- **How:** Define a charter, record build/data/results, route defects, and
  distinguish unexecuted work from a recorded decision to skip it.

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
- **When:** Only after a recorded human Design Gate approval, and only for the
  confirmed parameterized scope, such as functional cases.
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

- **Why:** A test that passes for the wrong reason is worse than no test, and the
  context that wrote the automation is the worst placed to notice.
- **What:** An independent read-only review of code, assertions, data, and
  evidence — findings for a human to weigh. **Advisory: it holds no ledger row and
  blocks nothing.**
- **When:** Whenever a fresh reading would help — after a Script Forge cycle,
  before the Merge Gate, or when a passing suite feels wrong. Optional.
- **Where:** Inspect consumer implementation plus `60-scripts`; write
  `70-script-audit`.
- **How:** Pin commit/TC scope, run configured checks, use a read-only reviewer,
  and report severity-ranked findings verbatim into the Merge Gate digest. A
  labelled self-review is useful when no independent reviewer exists; one presented
  as independent is not.

### `green-run`

- **Why:** Prove repeatable reliability rather than a single lucky pass.
- **What:** Produce a diagnosed consecutive-green execution record.
- **When:** After a Script Forge cycle has produced runnable scenarios; restart the
  streak after every automation fix.
- **Where:** Run in configured CI-equivalent conditions; write `80-green-run`.
- **How:** Execute exact scope three times green by default, record provenance,
  reset on failure, and route intermittent behavior to Flake Triage.

### `gate-merge`

- **Why:** Keep unstable or insufficiently evidenced automation out of main.
- **What:** An evidence digest of facts from Script Forge, the Stability Run,
  coverage, observability contracts, and any advisory review.
- **When:** After Script Forge and the Stability Run, and again when a human states
  they approve the merge.
- **Where:** Read consumer evidence; commit the Merge Gate report by the ledger.
- **How:** Cross-check the evidence against one commit manifest, refresh coverage,
  list every gap plainly, present, and stop. On an explicit human approval, append
  the ledger row with name, role, and timestamp. The approval is a QA decision — it
  never merges the branch or satisfies branch protection.

### `testops-promote`

- **Why:** Make merged automation reliable and observable in steady-state CI.
- **What:** Configure slices, reporting, retention, failure policy, and budgets.
- **When:** After a recorded human Merge Gate approval and the actual merge to the
  integration branch.
- **Where:** Change consumer CI/config on a branch and write `90-testops`.
- **How:** Run slices as CI will, validate reports/archives, measure duration,
  reject unexplained quarantine, and require a real pipeline run.

### `gate-ops`

- **Why:** Require durable proof before automation is declared complete.
- **What:** An evidence digest of facts — CI history, report history, flake rate,
  external sync state, coverage rungs, and the manual-only inventory with each
  disposition.
- **When:** After TestOps Promotion and the required real CI runs, and again when a
  human states they approve.
- **Where:** Read provider/consumer evidence; commit the Ops Gate report.
- **How:** Verify provenance, measure flake against actual executions, list every
  gap, present, and stop. On an explicit human approval, append the ledger row and
  record the automation as **Done**, carrying every outstanding expiry or backfill
  obligation into the outcome line.

### `review-pr`

- **Why:** A pull request carries claims — a description, a linked requirement,
  test evidence — and a tired approver skimming green checkmarks does not check
  them against the diff.
- **What:** A review artifact reconciling claims with the actual diff,
  requirement coverage by criterion id, severity-ranked findings, the
  downstream-invalidation list, and a GO / NO-GO recommendation.
- **When:** When a PR is opened or updated — after `/yw:ship-change`, or on a
  teammate's PR before approving.
- **Where:** Reads the PR through the host CLI (`gh` for GitHub, `az repos` for
  Azure DevOps); writes the artifact locally; posts to the host only under
  `--post` with explicit authorization.
- **How:** Freeze the head commit, verify every claim against the diff, review
  with the code-reviewer agent, check the evidence, and recommend — never
  merge.

### `handoff`

- **Why:** Skill-to-skill continuity works; session-to-session does not — an
  interrupted session loses which branch, which verification passed, and what
  the next move was, and the next session pays to rebuild it.
- **What:** A one-minute handoff the next session can act on: state, unverified
  versus verified work, open problems, decisions, rejected approaches, one next
  step, and a resume command.
- **When:** At any stopping point mid-work on either track; `close` when the
  work lands; `list` to see what is open.
- **Where:** The configured artifacts directory under `handoffs/`; committable,
  never carrying secrets or tenant data.
- **How:** Establish the facts from git and real verification output — never
  memory — write the fixed sections, and keep `not run` honest.

### `forge-security-tests`

- **Why:** A scanner tells you a header is missing; it cannot tell you a
  pharmacist can read another clinic's patients. The access-control,
  insecure-design, authentication, and logging categories are authored cases.
- **What:** Gherkin scenarios for the authored OWASP 2025 categories, each
  tagged `@testtype:security` and one `@owasp:ANN`, plus a coverage map
  reconciling every category to authored, scanned, or a specific N/A.
- **When:** After Spec Probe, ideally after `/yw:forge-tech-design` produced a
  threat sketch; alongside `/yw:forge-cases`.
- **Where:** `<category>-security.feature` files; the coverage map under
  `20-cases`. Repository-only.
- **How:** Design against the requirement's own permission/auth/logging rules —
  never the app's current behavior — tag by category, and route the scannable
  categories to `/yw:scan-security`.

### `scan-security`

- **Why:** The value is not in running a scanner but in driving the right
  verbs, mapping output to categories, and separating real findings from the
  noise that gets a scanner switched off.
- **What:** A triaged scan report — findings mapped to OWASP category and the
  PROBE severity ladder, sorted into confirmed / needs-review / noise, with the
  confirmed ones routed to `/yw:bug-report`.
- **When:** Dependency and SAST verbs freely (read-only); DAST and fuzz against
  an authorized target after a build is deployed.
- **Where:** Reads the repo or a running target; writes under `75-security`.
  Never a shared or production target without an approved window.
- **How:** Resolve verbs and engines from the swappable adapter contract,
  enforce target authorization on active verbs, run, normalize, triage, and
  route — failing closed on an unauthorized active scan.

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

All 42 `yw:*` skills are explicitly user-invocable and appear in the
slash-command menu. Repository validation fails if a public skill is hidden.

### One entry point per skill

Each public entry point is authored exactly once, as `skills/<name>/SKILL.md`.
The plugin deliberately ships **no** `commands/` directory, and repository
validation fails if one appears.

2.13.0 briefly added a `commands/<name>.md` shim per skill, on the theory that
Claude Desktop builds its `/` menu from `commands/` while Claude Code uses
`skills/`. That theory is wrong: the loader merges both directories into one
registry, so shipping both registered every name twice and the collision
stopped the plugin from registering anything at all in Claude Desktop — no
skills and no commands. It also added roughly 4,100 always-on tokens to every
session. 2.13.1 reverted it.

Verify any layout change with `claude plugin details yw@yieldwerx` and confirm
the reported skill count equals the number of directories under `skills/`.

## Hosts without a shell (Claude Desktop)

Every PROBE capability with an executable behind it — Case Sync, the spec
validator, Gherkin lint, the coverage report — used to be reachable only through a
shell command. Claude Code has a Bash tool, so that worked. **Claude Desktop runs
processes but gives the assistant no shell**, so on Desktop `/yw:sync-cases` had no
engine at all and the other three were unreachable for the same reason.

The plugin now ships a dependency-free stdio MCP server and declares it in its
manifest, so **installing the plugin is the whole setup**:

```json
"mcpServers": {
  "probe-tools": {
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/adapters/mcp/server.mjs"],
    "env": { "CLAUDE_PROJECT_DIR": "${CLAUDE_PROJECT_DIR}" }
  }
}
```

It exposes the sync verbs — `aio_check`, `aio_whoami`, `aio_folders`, `aio_cases`,
`aio_plan`, `aio_sync` — plus `probe_validate_spec`, `probe_lint_cases`, and
`probe_coverage`. Each one spawns the same bundled script the CLI runs, so a
capability behaves identically whichever front end reached it. Credentials come
from the environment or the consumer's gitignored `.env`, never from the manifest.

**The live write carries its own confirmation.** The guard that normally asks
before a live AIO sync is a PreToolUse hook on the *Bash* tool; on the MCP path
there is no Bash call, so it never fires. `aio_sync` therefore refuses without
`confirm: true`, and the adapter beneath it still refuses without a recorded human
Design Gate approval. Both must pass.

`/yw:sync-cases` probes the host and picks one of three engines — **CLI** when a
shell exists, **MCP** when the tools are present, and an **export bundle** when
neither, which writes an importable file plus the exact tag edits a later run will
apply and records the stage as `blocked`, never `done`. It always says which
engine it used: a quiet fallback looks exactly like a sync that worked. Contract:
[case-management.md](plugins/yieldwerx-probe/references/integrations/case-management.md).

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
/plugin marketplace add https://github.com/tafseer-yw/yieldwerx-knowledgebase.git
/plugin install yieldwerx-knowledgebase@yieldwerx-company
```

Add it from the **public GitHub source above**. The same marketplace is also
published to an internal Azure DevOps repository; do not use that one. It
requires VPN and Azure DevOps credentials, so a QA workstation or a Cowork sync
generally cannot reach it. Both sources declare the same marketplace name
(`yieldwerx-company`), so every `@yieldwerx-company` reference resolves
identically either way — only reachability differs.

It must not be a declared dependency. Claude Code disables a plugin whose
declared dependency is unsatisfied, and a dependency in a marketplace the user
has not added is left unresolved. Through 2.13.1 that disabled every `yw`
skills for every user without the knowledgebase — while an owner machine, where
it happens to be installed, looked completely healthy. Repository validation now
fails if either the manifest declares dependencies or the marketplace re-adds
`allowCrossMarketplaceDependenciesOn`.

Only `/yw:ask-yieldwerx` and `/yw:update-yieldwerx-knowledge` consult it. Their
small adapters forward to the authoritative knowledge skills, do not copy product
facts into this repository, and state plainly when the knowledgebase is missing
or disabled rather than guessing. The other 40 skills never touch it. In Spec
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
