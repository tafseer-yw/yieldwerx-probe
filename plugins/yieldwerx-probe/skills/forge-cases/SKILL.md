---
name: forge-cases
user-invocable: true
description: Use when spec analysis is done and QA-owned UI, API, contract, security, or API-performance test cases must be designed as Gherkin feature files, in business-readable procedural style with automation pacing, candidacy, and a developer-owned unit/internal-integration hand-off. The AIO push is separate; amend existing cases with /update-cases. PROBE Case Forge stage.
track: design
safety: writes-shared
produces: features/<feature-slug>/<category>.feature (permanent @manual, no @automated at design, one per CAT), .probe/artifacts/<feature>/20-cases/case-details.md (terse tables), .probe/artifacts/<feature>/20-cases/automation-plan.md (TC/effort/tier/disposition), .probe/artifacts/<feature>/20-cases/dev-handoff.md, .probe/artifacts/<feature>/20-cases/scope-manifest.md, .probe/artifacts/<feature>/20-cases/coverage-notes.md (only what coverage:req cannot derive)
consumes: .probe/artifacts/<feature>/10-spec/spec-analysis.md, optional .probe/artifacts/<feature>/15-implementation-probe/implementation-comparison.md
argument-hint: <feature-slug> [--scenario-type positive|functional|negative|edge|all] [--category CAT-NN] [--ac AC-NN]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Case Forge (Gherkin)

## Why

Convert approved intent into UI or API test cases that a QA engineer and domain
reviewer can execute and understand without automation terminology.

## What

Create procedural Gherkin for the requested scenario types, plus expected-value
details, automation candidacy, scope, and developer-owned coverage handoff.

## When

Run after Spec Probe has produced valid analysis and open decisions needed by
the selected scope are resolved; use Update Cases for an existing case set.

## Where

Write feature files to the consumer's configured features location and
supporting design artifacts to its configured `20-cases` location.

## How

Resolve selectors such as `--scenario-type functional`, map ACs to categories,
write visible sequential actions and verifications, preserve stable IDs, run
configured Gherkin lint, and fail closed when the selected scope is empty.

Design the **QA-owned** test cases as Gherkin feature files, one per testable
category, plus the automation pacing/candidacy plan and the developer-owned
coverage hand-off. Case Sync handles Jira AIO.
Read `10-spec/spec-analysis.md` and, when present, the distilled
`15-implementation-probe/implementation-comparison.md` (PROBE policy P7 —
never the raw PRD).
When the selected scope includes a rendered UI, chart, map, or dashboard, also
read the active profile's visual-testing guidance when that profile provides
one. Plugin profile references do not load automatically.

**Use `/update-cases` to amend an existing scenario.** This skill authors a
category's cases the first time and may append a previously undesigned scoped
set. It never rewrites an existing scenario. Re-running it to change existing
scenarios would risk renumbering TC ids and orphaning AIO records.

## Optional design scope

The default is the complete QA-owned design set. A caller may request a bounded
initial-design slice:

```
/forge-cases <feature-slug> --scenario-type functional
/forge-cases <feature-slug> --category CAT-03
/forge-cases <feature-slug> --ac AC-05 --scenario-type negative
/forge-cases functional
```

`functional` means the scenario tag `@functional`; it is not the
`@testtype:e2e|component|security|api|contract|performance` test level. Normalize the selector into a
scope manifest before designing. Reject unknown values and an empty selection
rather than silently falling back to `all`.

The one-word form is a convenience alias for `--scenario-type functional`.
Use it only when the feature slug is unambiguous from the caller's named
feature or exactly one active feature ledger. Otherwise refuse and request the
feature slug; never guess across multiple active features. The same alias rule
applies to `positive`, `negative`, and `edge`.

A scoped run is an incremental authoring cycle, not feature completion:

- Design only the intersection of the requested selectors.
- Append new scenarios; never regenerate a feature file or edit an existing
  scenario. Existing-case changes go through `/update-cases`.
- Allocate each new TC id after the highest id ever allocated for the feature.
  Never fill gaps, renumber, or reuse retired ids.
- Merge rows into `case-details.md`, `automation-plan.md`, and
  `dev-handoff.md`; never replace evidence from an earlier cycle.
- Write/update `20-cases/scope-manifest.md` with requested, completed,
  not-applicable-with-reason, routed, and remaining scenario types, categories,
  and ACs. Mark Case Forge `in-progress — partial` while applicable inventory
  remains. Only a full reconciliation proving zero remaining inventory may set
  the feature-level stage to `done`.
- A subset may be audited, but it can never make the Design Gate ready by
  itself. Feature-level gates still require every applicable risk dimension to
  be designed, routed, marked `N/A` with a reason, or human-waived.

## Scope — QA designs observable UI and API contracts

**QA is responsible for observable UI behavior, service/API behavior,
consumer-facing HTTP contracts, and approved API performance workloads.
Developers retain unit and implementation-internal integration testing.**

- Author scenarios at `@testtype:e2e`, `@testtype:component`,
  `@testtype:security`, `@testtype:api`, `@testtype:contract`, or
  `@testtype:performance`. Performance design maps to k6, not Playwright steps.
- Route `unit` and implementation-internal `integration` to
  `dev-handoff.md`; do not invent a UI/API path and do not drop the AC.
- The routing test: **can QA observe the behavior through a supported product
  interface or declared API contract?** If yes it is a QA case; if it requires
  implementation internals, route it.
- Restricting scope must not shrink **coverage**. Every AC ends up either in a QA
  scenario or in the hand-off table; an AC in neither is a `blocker` at Case Audit.
- Verification depth is unchanged: a QA `e2e` scenario still asserts against
  independent truth (oracle / DB / API) for wrong-data-risk ACs. The _level_ is
  UI-driven; the _truth layers_ are not. What moves to developers is the
  standalone non-UI case, never the oracle.

## Preconditions (check the ledger; refuse if unmet)

- Spec Probe is `done` and `10-spec/spec-analysis.md` exists with a **Testable
  categories** section (`CAT-NN`) plus an AC index and one Workflow or Simple
  Rule definition for every active `AC-NN`.
- Implementation Probe is optional. If the caller explicitly requested it,
  require `done`, `blocked` with the exact reason, `waived`, or a
  human-recorded skip before designing. A default `pending — optional` row
  does not block Case Forge when no comparison was requested.
- If spec-analysis lists unresolved `blocker`-ish ambiguities on the behaviors
  being designed, stop and ask for answers first — cases built on ambiguity
  are rework.

## Procedure

1. Parse and record the requested scope, then mark Case Forge `in-progress`
   (`in-progress — partial` for a scoped run) in the ledger.
2. **Route the ACs first, before delegating.** From the **Best test level** column, split
   the ACs into QA-owned (`e2e`/`component`/`security`/`api`/`contract`/`performance`) and developer-owned. Write
   `20-cases/dev-handoff.md` yourself — it is cheap, needs no design work, and
   shrinks what the designers must consider. Only the QA-owned categories go out.
   For every selected category, inspect its AC definitions, risk dimensions,
   **Where to check** entries, and applicable Implementation Probe observations.
   Record exactly one visual disposition in `20-cases/coverage-notes.md`:
   `Visual candidates: <TC ids or planned behaviors>` or
   `Visual: N/A — <specific reason>`. A visual clue such as a map outline,
   colorscale, legend, z-order, notch, or layout must be explicitly accepted,
   assigned to a named target category, or rejected with a reason; it may not
   disappear between Spec Probe and case design.
   If an Implementation Probe report exists, carry `divergent` and
   `not-implemented` results into case details as **known expected failures**.
   Design from the approved expectation, not from the observed result. Treat
   an implementation finding that exposes unclear intent as an open question;
   it blocks only the affected design scope until a human decides.
3. Delegate design to the **test-case-designer** agent when available (fall back to
   designing locally, and record that independence will come from Case Audit).
   **Token discipline for the fan-out — this stage is the most expensive in PROBE:**
   - **Slice the spec per agent.** Do not send the whole `spec-analysis.md`; give
     each agent only its `CAT-NN` rows, the AC index rows and definitions those
     categories own, and the confirmed decisions/open questions they reference.
     A 20k-token analysis becomes ~3k per agent.
   - **Batch categories, don't fan out per category.** Group cohesive categories so
     each agent writes several files; every extra agent re-pays the domain-map and
     house-style read.
   - Point agents at one house-style example file, not a directory to explore.
   - State the TC id range per agent so ids stay unique without coordination.
   - Include only the Implementation Probe rows for the ACs in that slice.
     Label observed mismatches as known expected failures; never ask the
     designer to copy current behavior into the expected result.
4. Review the returned set for holes before persisting (coverage per AC,
   negative/edge present, ordering sane, identity tag matches the title, one
   QA-owned `@testtype:` per scenario, and one explicit visual disposition per
   selected category). A cross-category visual deferral must name the target
   `CAT-NN` and the rendering behavior that category will cover.
5. Write or append to the feature files at
   **`features/<feature-slug>/<category>.feature`**,
   one per `CAT-NN`. **Every scenario carries permanent `@manual`**, and Case
   Forge never adds `@automated`. It is therefore manual-only at design time,
   and `bddgen` skips it because generation selects `@automated`, not because
   `@manual` excludes it. Also write `20-cases/case-details.md` (terse tables of
   literal expected values) and `20-cases/automation-plan.md` (`TC · Effort · Tier ·
Disposition` only). **Do not write a coverage matrix** —
   the configured `requirementsCoverage` command generates it. Write
   `20-cases/coverage-notes.md` only for what that tool cannot derive:
   type-`N/A` rationale, the mandatory per-category visual disposition, and
   routing reconciliation.
6. **Hand off AIO-eligible non-API cases to `/sync-cases`.** Case Forge does not
   push to AIO. API/contract/performance scenarios (`@api`, `@testtype:api`,
   `@testtype:contract`, or `@testtype:performance`) remain repository-only and
   must not receive AIO keys.
   For eligible scenarios, leave the AIO
   key **absent** (only the configured local `@<TC-id>` tag is present).
   `/sync-cases` creates/updates the durable AIO BDD records via AIO's REST API
   (not the Atlassian MCP), links the Jira requirement, sets the folder, and adds
   the stable AIO key as a **second scenario tag** — leaving the title, the steps
   and the local id untouched. Note in the ledger that Case Sync is pending.
   Each AIO record stays authoritative after automation: Script Forge/TestOps
   later link the automated scenario and results to the same record — never
   deleted, replaced, or cloned merely because `@automated` is added.
7. Run the configured `lintCases` command against the resulting
   case set. Any error blocks the cycle; warnings require a recorded review.
8. Update the ledger: Case Forge `done` only after full reconciliation, or
   `in-progress — partial` for a valid scoped cycle; include artifact links and scenario count per
   category, `AIO synced: yes/pending`, designed/automated/manual-only counts
   (automation is zero and manual-only equals designed here), the count of
   `@visual` scenarios, a **`@testtype:` breakdown** over the QA-owned levels
   (e.g. `e2e 9 / component 12 / security 2`), the **routing reconciliation**
   (`<n> ACs in QA scenarios · <m> routed to developers · 0 uncovered`) with a
   link to `dev-handoff.md`, and a one-line pacing summary (e.g. "23 scenarios,
   ~N days at the configured rate; 6 @auto:now; 2 @visual").

## Quality bar (the auditor will check these — save a round-trip)

- **Gherkin discipline — house manual-execution style.** These files are the test
  case of record: a QA executes them by hand and a PO reads them for coverage, so
  each file must be executable without opening a second document.
  A Workflow AC is a short requirement, not a finished test case. Expand it
  into the visible steps a manual QA follows. A Simple Rule may need positive,
  negative, and edge cases. Never copy either AC format and call the case design
  complete.
  - `Feature:` named for the **module/surface** (`Feature: ClusterPolicy`), not an
    "As a… I want…" sentence; narrative goes in the feature description block.
  - Scenario title: `<TC-id> - Verify that <behavior>`. Use a verified existing
    durable id such as `YWPD-TC-1202` when the case already exists in AIO;
    otherwise allocate the repository-local `TC-<feature-slug>-NNN`. Never
    invent an external/AIO key.
  - **A description block under every scenario title** stating the objective.
    Mandatory — its absence is what forces the executor into a second document.
  - **Imperative, procedural steps** a tester can execute. UI affordances use
    **visible labels** (`When Click the "New Policy" button`). API cases use
    domain operations/outcomes rather than raw URLs, generic HTTP verbs,
    clients, or fixtures. **Never** a locator, testId, CSS selector or DOM id.
    Strict Given/When/Then purity is not required and a
    workflow scenario may run long; avoid a `Then` followed by further setup.
  - Use product/domain language. UI cases use `Open`, `Click`, `Select`,
    `Enter`, `Upload`, `Wait until`, and `Verify`; API cases name supported
    business operations and observable outcomes. Automation architecture is
    not Gherkin vocabulary.
  - Do not put `oracle`, `fixture`, `locator`, `testId`, `DOM`, CSS/XPath,
    `waitForRender`, render synchronization, seeded mocks, page objects, or
    implementation method names in manual steps. Put the technical truth source
    and automation mechanism in `case-details.md` and the eventual script.
  - Do not say `correctly`, `as required`, `appropriate data`, `required data`,
    or offer an `A or B` choice without selecting the exact value in the step or
    Examples row.
  - `Scenario Outline` + `Examples` for parameterized/boundary cases; a `@visual`
    outline names its **baseline per Examples row**.
    Every `<placeholder>` must have an Examples header, and every Examples
    header must be used by the scenario or identified as metadata-only.
  - `Background` only for genuinely shared setup.
- **Identity is first-class, not a comment:** an `@<TC-id>` tag whose id matches
  the one opening the title (for example `@YWPD-TC-1202`), plus a
  `# AC: AC-NN` comment for
  requirement traceability. Leave the AIO key absent — `/sync-cases` **adds** it as
  a second tag and never rewrites the title. TC ids are never renumbered.
- Every AC → at least one direct scenario plus the applicable risk dimensions
  from spec-analysis (boundary, failure recovery, authorization, state,
  concurrency, integration, or negative behavior). Do not manufacture irrelevant
  cases merely to satisfy a tag quota.
- Use scenario types (`@positive`, `@functional`, `@negative`, `@edge`) where
  meaningful. Mark an inapplicable type `N/A` with a risk-based rationale.
- **Test type on every scenario, from the QA-owned set only.** Exactly one primary
  `@testtype:` per scenario: `e2e` (workflow across screens/systems), `component`
  (one UI surface), `security` (observable authorization), `api` (business
  workflow/service behavior through HTTP), `contract` (status/header/schema
  compatibility), or `performance` (approved API workload and SLO mapped to
  k6). `unit` and internal `integration` remain developer-owned.
  `@visual`/`@a11y` are orthogonal quality
  tags, not levels, and may coexist with any `@testtype:`. The value is pushed to
  the AIO test case **Labels** field by `/sync-cases` only for AIO-eligible
  scenarios. API/contract/performance scenarios are excluded from AIO.
- **Developer-owned coverage hand-off (`dev-handoff.md`) is a required output.**
  Every AC whose right level is developer-owned gets a row: AC, behavior,
  recommended level, why it is not a QA case (specific to the behavior — not
  "developer-owned"), suggested owner, suggested suite/repo. Flag routed
  wrong-data risks so the receiving developer knows they carry `blocker` severity.
  Reconcile at the end: `<n> ACs in QA scenarios · <m> routed · <k> uncovered`,
  and **`k` must be 0** — an AC in neither place is a Case Audit `blocker`.
- **Visual candidacy:** rendering-only correctness (colorscale mapping, legend
  rendering, ink-overlay z-order, notch geometry, SPC control-limit/violation
  line rendering, histogram bin coloring, dashboard tile layout, CSS bleed,
  Plotly-upgrade drift — see the configured knowledge provider for the module
  concepts) is covered by a dedicated `@visual` scenario (tagged
  `@visual @manual` + type + candidacy) that pins a NAMED baseline —
  **complementing, not replacing** the data-layer scenario (a wrong number
  stays an oracle/DB `blocker`). `@visual` scenarios assert the image only, name
  their baseline in `case-details.md`, and are container-only; the `@visual` tag
  alone routes them to the `visual` project. Don't fabricate `@visual` cases
  where the data layer already proves correctness. Authority:
  `docs/visual-regression.md`.
  Every selected category must also record either
  `Visual candidates: <TC ids or planned behaviors>` or
  `Visual: N/A — <specific reason>` in `coverage-notes.md`. If the candidate is
  deferred to another category, name that `CAT-NN` and the exact rendering
  behavior there. A generic "covered elsewhere" is not enough.
- Scenarios ordered **easy → hard** within each feature file.
- Expected results are exact, independently derivable outcomes from each
  category's approved test data and way to know the correct result. Literals, states,
  decisions, events, permissions, or contract results live in `case-details.md`;
  never invent them or copy expected truth from the system under test.
- Every scenario tagged with priority-driving domain tags, its scenario-**type**
  tag, its `@testtype:` **test-level** tag, an **automation-candidacy** tag
  (`@auto:now|next|later`), and a `# Traceability:` comment
  (`TC-<slug>-NNN / AC-NN / <AIO id or pending>`).
- Every designed scenario carries `@manual` permanently. Script Forge adds the
  orthogonal `@automated` tag when runnable; permanent `@manual` remains.
- Give every scenario an approved target disposition: `automate-now`,
  `automate-next`, `automate-later`, `manual-permanent`, `deferred-until:<condition/date>`,
  `retired`, or `waived`. Permanent/deferred/waived dispositions require a
  rationale, owner, and human confirmation; no case may remain unowned.
