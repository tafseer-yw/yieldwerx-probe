# PROBE skill usage and tandem guide

This is the operator reference for all public `yw:*` skills. The corresponding
`SKILL.md` remains authoritative for procedure and safety.

## Contents

- [Command notation](#command-notation)
- [Complete command reference](#complete-command-reference)
- [Detailed argument behavior](#detailed-argument-behavior)
- [Tandem and composition model](#tandem-and-composition-model)
- [Tandem recipes](#tandem-recipes)
- [Unsafe or misleading combinations](#unsafe-or-misleading-combinations)

## Command notation

- `<value>` is required; `[value]` is optional.
- `a|b` means choose one listed value.
- Quote free text that contains spaces.
- `feature-slug` is the stable kebab-case feature identity.
- Selectors intersect. A command with `--category CAT-02 --tc TC-004` selects
  only `TC-004` when it is in `CAT-02`; zero matches fail closed.
- `functional` is the case type. `positive`, `negative`, and `edge` describe
  scenario intent and do not become implicit members of `functional`.
- Omit `[env]` or `[branch]` only when the consumer configuration makes the
  default unambiguous.
- Slash commands accept natural-language context after the formal arguments,
  but natural language does not override a safety gate, approval, or selector.

## Complete command reference

### Knowledge and specification

| Skill                            | Accepted arguments                                                                                                                              | Typical use and handoff                                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `/yw:ask-yieldwerx`              | `<question>`                                                                                                                                    | Ask an exact product/domain question. Read-only; returns sourced context to the invoking stage.                                        |
| `/yw:update-yieldwerx-knowledge` | `<approved-change-request>`                                                                                                                     | Forward an approved correction or addition to the knowledge-maintenance workflow; its own review rules control writes.                 |
| `/yw:forge-prd`   | `<feature-slug> [<the idea or problem, or a path to notes>] [--review \| --sign-off "<name>"]` | Write or advance the plain-language PRD both tracks read; sign-off is a recorded human decision.                     |
| `/yw:probe-spec`                 | `<feature-slug> [<spec-path-or-text>] [--migrate-format \| --reconcile] [--compare-implementation <env-or-url>] [--role <role>] [--build <id>]` | Create, migrate, or reconcile `10-spec`; optionally chain an implementation comparison.                                                |
| `/yw:probe-implementation`       | `<feature-slug> <env-or-url> [--role <role>] [--build <id>]`                                                                                    | Compare approved ACs with a reachable build and write `15-implementation-probe`; current behavior never becomes requirement authority. |

### Case design and authorization

| Skill              | Accepted arguments                                                                                                         | Typical use and handoff                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/yw:forge-cases`  | `<feature-slug> [--scenario-type positive\|functional\|negative\|edge\|all] [--category CAT-NN] [--ac AC-NN]`              | Create new QA-owned cases at the UI and API layer; every category records a visual and an API disposition. Use `/yw:update-cases` for an existing set. |
| `/yw:update-cases` | `<feature-slug> -- <what needs to change>`                                                                                 | Amend affected cases in place while preserving TC/AIO identity and invalidating stale downstream evidence.                     |
| `/yw:gate-design`  | `<feature-slug> [--category CAT-NN] [approved]`                                                                            | Assemble the evidence digest; record a human's stated approval with a timestamp and unlock the next stages.                     |
| `/yw:sync-cases`   | `<feature-slug> [--live] [--category CAT-NN]`                                                                              | Dry-run AIO sync by default. `--live` requires explicit approval. API, contract, and performance cases remain repository-only. |

### Reconnaissance and assisted execution

| Skill                 | Accepted arguments                                                                                                                                  | Typical use and handoff                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `/yw:ui-recon`        | `<feature-slug> [env] [--with-api-recon] [--spec <path-or-url>] [--with-case-execution] [--tc <id,id,...>] [--role <role>] [--continue-on-failure]` | Harvest UI contracts. Optional flags coordinate API evidence and case execution in the same browser walk.                              |
| `/yw:desktop-recon` | `<feature-slug> [--build <id>] [--category CAT-NN]` | Survey the WinForms app: Name Mapping inventory plus the unnamed-control gap list. |
| `/yw:forge-desktop-scripts` | `<feature-slug> [--category CAT-NN] [--tc TC-id]` | Automate approved desktop cases in TestComplete BDD with Python steps; import, never transcribe. |
| `/yw:api-recon`       | `<feature-slug> [env] [--spec <path-or-url>] [--capture-ui]`                                                                                        | Reconcile declared API contracts and sanitized observations. `--capture-ui` makes API Recon the coordinator of one supporting UI walk. |
| `/yw:execute-cases`   | `<feature-slug> [env] [--tc <id,id,...>] [--role <role>] [--continue-on-failure]`                                                                   | Execute exact approved Gherkin through one MCP browser batch with isolated independent cases and step-level evidence.                  |
| `/yw:log-exploratory` | `<feature-slug>`                                                                                                                                    | Consolidate human or assisted execution into `50-exploratory`; it does not re-drive the application.                                   |

### Automation and performance

| Skill                         | Accepted arguments                                                                                                                  | Typical use and handoff                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/yw:forge-oracle`            | `<feature-slug>`                                                                                                                    | Build independent expected-result logic before assertions use derived business values.                    |
| `/yw:forge-scripts`           | `<feature-slug> [--scenario-type positive\|functional\|negative\|edge\|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]`          | Implement approved UI/general scenarios and add `@automated` when runnable.                               |
| `/yw:forge-api-tests`         | `<feature-slug> [--stack <profile-name>] [--tc TC-id] [--operation operation-id] [--layer contract\|integration\|ui-interception\|fuzz\|all]`                      | Implement API coverage from approved cases plus `40-api-recon`; never sync API cases to AIO.              |
| `/yw:forge-performance-tests` | `<feature-slug> [--stack <profile-name>] [--profile smoke\|load\|spike\|stress\|endurance] [--operation operation-id]`                                       | Implement guarded k6 workloads for an authorized target, profile, load, SLO, and cleanup plan.            |
| `/yw:audit-scripts`           | `<feature-slug> [branch] [--scenario-type positive\|functional\|negative\|edge\|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]` | ADVISORY independent review of the selected implementation; never a gate, blocks nothing.                 |
| `/yw:green-run`               | `<feature-slug> [branch] [--scenario-type positive\|functional\|negative\|edge\|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]` | Prove green x3 on the selected scope; every run recorded and every failure classified.                     |

### Merge, operations, and cross-track diagnosis

| Skill                 | Accepted arguments                                         | Typical use and handoff                                                                                                            |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/yw:gate-merge`      | `<feature-slug>`                                           | Assemble the evidence digest; record a human's stated approval. The approval is never itself a merge.                              |
| `/yw:testops-promote` | `<feature-slug>`                                           | Wire approved, merged automation into CI, reporting, slicing, and quarantine observation.                                          |
| `/yw:gate-ops`        | `<feature-slug> [N-runs]`                                  | Assemble operational evidence using the supplied run threshold or configured default; record a human's stated approval.            |
| `/yw:forge-security-tests` | `<feature-slug> [--owasp A01,A07,...] [--category CAT-NN]` | Author the OWASP 2025 categories a scanner cannot judge; tagged by category, repository-only. |
| `/yw:scan-security` | `<scope> [--verbs deps-scan,sast,baseline-scan,api-scan,fuzz] [--target <url> --authorize] [--env <name>]` | Drive and triage the security toolchain; active scans require explicit target authorization. |
| `/yw:bug-report`      | `<feature-slug> <one-line-symptom>`                        | Consume failure evidence, classify an application defect, create a local candidate, and require fresh approval before Jira writes. |
| `/yw:flake-triage`    | `<feature-slug-or-scenario> [evidence-path]`               | Classify intermittent behavior and control quarantine/exit evidence.                                                               |
| `/yw:change-impact`   | `[base-ref]`                                               | Compare frontend changes against the given Git base reference or configured default and propose affected tests.                    |

### Development track

**Gate-independent.** No skill here checks a ledger, waits on the Design, Merge,
or Ops Gate, or requires a QA artifact to exist; each one runs on a repository
that has never used the QA track. A spec analysis, a bug candidate, and a recon
gap list are better input where they exist, never preconditions. Neither track
edits the other's artifacts. Authority: `references/process/DEV-TRACK.md`.

| Skill                  | Accepted arguments                                                                                                                          | Typical use and handoff                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/yw:forge-tech-design` | `<feature-slug> [--stack <profile-name>] [--ac AC-NN]` | Design the declared stack solution from the spec analysis; refuses while blocking questions are open. |
| `/yw:forge-unit-tests` | `<feature-slug> [--stack <profile-name>] [--ac AC-NN]` | Write the developer-owned tests the spec routed to unit/integration level. |
| `/yw:forge-migration` | `<feature-slug or change description> [--stack <profile-name>] [--data-only]` | Author safe, registered database migrations with an honest rollback story. |
| `/yw:sync-styleguide` | `<feature-slug or --all> [--stack <profile-name>] [--fix]` | Reconcile implemented UI against the repo styleguide/tokens and report or fix the drift. |
| `/yw:review-pr` | `<pr-number-or-url> [--repo <path>] [--post]` | Review a pull request as its reviewer; GO / NO-GO evidence for the human approver, never a merge. |
| `/yw:handoff` | `'[<slug>] \| close <slug> \| list'` | Write the session-to-session handoff; close it when the work lands. |
| `/yw:scaffold-app`     | `<app-slug> [--stack <profile-name>] [--surfaces api,ui,db,auth,queue] [--dry-run]`                                                         | Stand up an application whose QA contracts exist from the first commit. Once per application; refuses over existing code. |
| `/yw:build-feature`    | `<feature-slug> [--stack <profile-name>] [--layer backend\|frontend\|both] [--ac AC-NN] [--category CAT-NN] [--requirement <path>] [--no-requirement "<reason>"]`                                      | Approved requirement to verified capability on `feat/<slug>`. Clears its own observability obligations before it closes.  |
| `/yw:revise-feature`   | `<feature-slug> -- <what must change> [--breaking-ok "<authorization>"] [--ac AC-NN]`                                                       | Change existing behavior compatibly; hands the QA track a downstream-invalidation list routed to `/yw:update-cases`.      |
| `/yw:fix-defect`       | `<feature-slug> "<defect-slug-or-symptom>" [--candidate <path>] [--tc TC-id] [--no-test "<reason>"]`                                        | Close the loop from `/yw:bug-report`. Failing test first; never closes the candidate itself.                              |
| `/yw:seed-testability` | `<feature-slug> [--from-recon <path>] [--surface ui\|api\|results\|all] [--rank high\|medium\|all]`                                         | Turn a recon gap list into shipped selector and API-document contracts. Changes observability, never behavior.            |
| `/yw:review-code`      | `<feature-slug> [branch\|--staged\|--files <path,...>] [--focus correctness\|security\|data\|observability\|all] [--depth quick\|thorough]` | Independent adversarial review of application code. Routes automation to `/yw:audit-scripts`; never signs a gate.         |
| `/yw:ship-change`      | `<feature-slug> [commit\|describe\|both] [--push] [--open-pr] [--base <ref>]`                                                               | Hygiene plus the selected commit and/or PR-description output. Outward actions need explicit authorization; never merges. |

## Detailed argument behavior

### Development review and shipping modes

- `/yw:review-code --depth quick` checks the frozen diff and the immediate
  context needed to prove findings; `--depth thorough` (the default) traces all
  affected dependents, migrations, owning suites, and profile obligations.
- `/yw:ship-change commit` creates local commits only; `describe` prepares the
  pull-request body without staging or committing; `both` does both and is the
  default. `--base` is the comparison and pull-request target. `--push` is
  invalid with `describe`, and `--open-pr` is invalid with `commit`.

### Shared selectors

`--scenario-type`, `--category`, `--ac`, and `--tc` restrict the current cycle;
they never imply that a complete stage passed. A restricted run must be labeled
`SUBSET PASS` or `SUBSET FAIL`. Use repeated invocations for multiple categories
unless a skill explicitly accepts a comma-separated list.

`--tc <id,id,...>` on UI Recon/Execute Cases accepts a comma-separated batch.
The singular `--tc TC-id` on forge/audit/green commands selects one TC per
invocation unless the active profile explicitly documents another syntax.

### Spec and implementation modes

- `--migrate-format` changes presentation only. It cannot change AC meaning,
  IDs, cases, evidence, or approvals.
- `--reconcile` requires the complete revised approved source and records
  unchanged, changed, added, removed, and superseded requirements.
- `--compare-implementation <env-or-url>` chains Implementation Probe after
  Spec Probe using the same AC set. `--role` and `--build` pin that observation.

### Recon and browser execution

- `env` identifies a configured safe target; it is not an arbitrary permission
  to browse or mutate another environment.
- `--spec` supplies OpenAPI/Swagger by local path or authorized URL.
- `--with-api-recon` is UI-led tandem mode. UI Recon opens and drives the page;
  API Recon observes and reconciles without a second browser driver.
- `--capture-ui` is API-led tandem mode. Use it only when a current UI network
  handoff does not already cover the approved paths.
- `--with-case-execution` records exact case/step results during the UI Recon
  walk. The actions are not repeated for the execution record.
- `--role` selects an authorized role. A different identity, tenant, role,
  locale, or security boundary requires a separate browser context.
- `--continue-on-failure` captures the complete first-failure packet before
  cleanup. It continues only after successful cleanup and a verified known
  start state; otherwise the remaining cases are blocked.

### API and performance creation

- `--operation operation-id` selects the reconciled OpenAPI operation identity,
  not a guessed URL.
- `--layer contract` validates schema/contract; `integration` validates service
  behavior/workflows; `ui-interception` adds deterministic UI-level network
  observation or stubbing; `all` implements every approved applicable layer.
- `--profile` selects one k6 workload shape. `stress` and `endurance` never run
  merely because their code was generated; target and load authorization remain
  separate.

### Gate and external-write arguments

- Plain `approved` is accepted only as a direct human statement about the gate
  digest in front of them. `continue`, `go ahead`, and `looks fine` are not
  approvals — ask which is meant.
- A gate approval is scoped: a feature approval covers the feature, a
  `--category CAT-NN` approval covers that category only.
- There are no bypass, waiver, or override arguments. A gate that has not been
  approved is simply not approved.
- `--live` is the only Case Sync write mode. It cannot override the Design Gate
  approval check, the category scope, the API exclusion, credentials, or
  connectivity.
- Bug Report previews candidates locally. External issue creation, comments,
  and attachments require a current evidence review and explicit live approval.

## Tandem and composition model

There are three kinds of composition:

1. **Shared-session tandem:** one coordinator owns the browser while companion
   skills observe or record the same actions.
2. **Artifact chain:** one skill completes and the next consumes its files. The
   application does not need to remain open.
3. **Parallel downstream work:** two skills consume the same approved artifact
   but write separate code/evidence. They must not mutate the same files or live
   data concurrently.

Never start two browser-driving skills independently against the same page.

| Goal                                   | Recommended entry point                                              | Companion/handoff                                                                 | Composition type         |
| -------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------ |
| UI selectors plus API inventory        | `/yw:ui-recon ... --with-api-recon --spec ...`                       | API Recon consumes the registered network observer                                | Shared-session tandem    |
| API-first discovery with supporting UI | `/yw:api-recon ... --capture-ui --spec ...`                          | One coordinated UI Recon walk                                                     | Shared-session tandem    |
| UI selectors plus assisted execution   | `/yw:ui-recon ... --with-case-execution --tc ...`                    | Execute Cases records the same actions                                            | Shared-session tandem    |
| UI, API, and case results together     | `/yw:ui-recon ... --with-api-recon --with-case-execution --spec ...` | Three independently owned artifact sets                                           | Shared-session tandem    |
| Assisted failure to defect             | `/yw:execute-cases ...`                                              | Flake Triage or Bug Report consumes `evidence.json`; Log Exploratory consolidates | Artifact chain           |
| API inventory to API and k6 code       | `/yw:api-recon ...`                                                  | Forge API Tests and Forge Performance Tests consume `40-api-recon`                | Parallel downstream work |
| Spec plus current-build comparison     | `/yw:probe-spec ... --compare-implementation ...`                    | Implementation Probe uses the newly produced AC set                               | Artifact chain           |
| Stable runner failure                  | `/yw:green-run ...`                                                  | Flake Triage consumes trace/history; Bug Report consumes confirmed app defects    | Artifact chain           |

## Tandem recipes

### One browser walk for UI, API, and approved case execution

```text
/yw:ui-recon ml-yield-policies local \
  --with-api-recon --spec docs/api/ml-yield.openapi.yaml \
  --with-case-execution --tc TC-MLYP-001,TC-MLYP-004 \
  --role policy-admin --continue-on-failure
```

Order inside the coordinator:

1. Resolve Design Gate scope, target, role, build, and safe data.
2. Register sanitized network observation.
3. Open the application once.
4. Execute every selected case step while harvesting UI and API evidence.
5. Capture failures before reset; isolate the next independent case.
6. Write `40-ui-recon`, `40-api-recon`, and
   `50-exploratory/executions` independently.

### Execute cases, diagnose failures, and consolidate the run

```text
/yw:execute-cases ml-yield-policies local --role policy-admin \
  --tc TC-MLYP-001,TC-MLYP-004 --continue-on-failure
/yw:flake-triage ml-yield-policies .probe/artifacts/ml-yield-policies/50-exploratory/executions/failures/<fingerprint>/evidence.json
/yw:bug-report ml-yield-policies "Policy save returns success but the new policy is absent"
/yw:log-exploratory ml-yield-policies
```

Run Flake Triage only for inconsistent behavior. Run Bug Report only after the
evidence supports `app-bug`; it reuses the same packet and fingerprint. Log
Exploratory imports the summary rather than reopening the application.

### Generate API and performance foundations from one inventory

```text
/yw:api-recon ml-yield-policies local --spec docs/api/ml-yield.openapi.yaml --capture-ui
/yw:forge-api-tests ml-yield-policies --layer all
/yw:forge-performance-tests ml-yield-policies --profile smoke
```

The forge skills may proceed as separate work after recon is complete. API and
performance cases remain excluded from AIO. Running generated load requires
separate target and load authorization.

## Unsafe or misleading combinations

- Do not invoke UI Recon and Execute Cases as two concurrent browser drivers;
  use `--with-case-execution`.
- Do not invoke UI Recon and API Recon as two concurrent browser drivers; choose
  UI-led `--with-api-recon` or API-led `--capture-ui`.
- Do not treat shared authentication as permission to share tenant/role state.
- Do not use `--continue-on-failure` after failed cleanup or session corruption.
- Do not run Script Forge before a recorded human Design Gate approval.
- Do not use Case Sync for API, contract, or performance cases.
- Do not treat Bug Report generation as authorization to file Jira issues.
- Do not run stress/endurance workloads against a target authorized only for a
  smoke test.
