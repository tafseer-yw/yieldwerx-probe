---
name: forge-scripts
user-invocable: true
description: Use when the Design Gate has a recorded human approval or explicit allrounder bypass and the authorized cases must become automated scenarios — feature files, steps, page/component objects, API/DB/oracle assertions, tagged and traced to AIO ids. PROBE Script Forge stage.
track: scripting
safety: writes-local
produces: feature branch e2e/<feature-slug> with implemented steps, page objects, and @automated added to runnable scenarios while @manual remains; .probe/artifacts/<feature>/60-scripts/forge-notes.md
consumes: features/<feature-slug>/*.feature, 20-cases/case-details.md, 20-cases/automation-plan.md, applicable UI/API/event/DB/audit observability contracts
argument-hint: <feature-slug> [--scenario-type positive|functional|negative|edge|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Script Forge

## Why

Turn approved manual cases into maintainable automation without changing the
case's business meaning or leaking technical language into Gherkin.

## What

Implement the selected approved scenarios, their automation abstractions and
independent assertions, then add `@automated` while retaining `@manual`.

## When

Run only after the Design Gate has a recorded human approval or explicit
allrounder gate bypass, and only for its confirmed or bypass-recorded
automation-candidacy scope.

## Where

Change implementation files and eligible feature tags in the consumer branch;
write the cycle's handover to the configured `60-scripts` artifact.

## How

Freeze the exact TC scope, delegate implementation to the appropriate
scripter, follow the active profile, run all configured generation/static/test
commands, and refuse to re-author approved procedural steps.

Automate only the human-authorized cases. This is where the Design Gate
decision becomes enforceable.

## Preconditions — REFUSE (do not negotiate) if any fails

1. Ledger check: **the Design Gate has a recorded human approval or explicit
   allrounder Design Gate bypass**. Accept
   either a manually signed approval or an allrounder-only Claude transcription
   that names a QA Lead/Automation Engineer, says `Decision: approved`, has a
   date, confirms `@auto:now`, and includes the solo-allrounder waiver. Claude
   transcription for any other role is invalid. Also accept
   `waived — allrounder gate bypass` only when the gate report names the human
   allrounder, exact scope, date, reason, known gap/residual risk, and current
   `@auto:now` set or an explicit requested selector. If neither decision is
   present:
   > "Scripting is blocked until the Design Gate has a recorded human approval
   > or explicit allrounder gate bypass (PROBE rule 4)."
2. Case Audit verdict is PASS, or the exact audit scope has its own recorded
   allrounder Case Audit bypass. A Design Gate bypass does not silently waive
   Case Audit.
3. For UI scenarios, if UI Recon ran its locator inventory is present; if it
   was skipped, the ledger says so. Non-UI scenarios require their applicable
   API/event/DB/audit observability contract instead.
4. If the selected scope contains `@testtype:performance`, route those TCs to
   `/forge-performance-tests`; ordinary Script Forge must not create Playwright
   steps or repeated request loops for them.

## Procedure

The Gherkin already exists — Case Forge authored the `.feature` files (all
permanently `@manual`). Script Forge **implements the steps behind them**; it
does not delete or re-author scenarios.

If the eligible set contains `@visual`, explicitly load the active profile's
visual-testing guidance before implementation; plugin profile references do
not load automatically. For `playwright-bdd`, read
`${CLAUDE_PLUGIN_ROOT}/references/profiles/playwright-bdd/docs/visual-regression.md`.
If the active profile defines no deterministic visual runner, baseline
location/update workflow, or screenshot matcher, mark those TCs ineligible
with `TODO(env)` and stop their scripting cycle rather than inventing a host
workflow.

Optional selectors make an automation cycle intentionally small:

```
/forge-scripts <feature-slug> --scenario-type functional
/forge-scripts <feature-slug> --category CAT-03
/forge-scripts <feature-slug> --tc TC-<feature-slug>-012
/forge-scripts functional
```

Normalize the selector before making changes. Reject unknown values and an
empty selection. The work set is always:

`requested scope ∩ Design-Gate-confirmed automation set ∩ manual-only scenarios`.

The one-word form is a convenience alias for `--scenario-type functional`.
Use it only when the feature is unambiguous from the request or exactly one
active ledger; otherwise require the feature slug. The same alias rule applies
to `positive`, `negative`, and `edge`.

A selector never promotes `@auto:next|later`, invents a Design Gate decision,
or changes an authorized case. Report ineligible matches and their reasons. If
the team wants to promote a case into the current automation set, record that
human decision first through the ledger/amendment path.

1. Inspect the worktree, preserve unrelated user changes, then mark Script Forge
   `in-progress`; create/switch to branch `e2e/<feature-slug>` only when safe.
2. Determine the work set: the scenarios the Design Gate confirmed as
   **`@auto:now`** (see the ledger's confirmed automate-now list). Automate
   only those this cycle. Leave `@auto:next`/`@auto:later` scenarios manual-only
   (`@manual` without `@automated`) and untouched — they are the tracked
   backlog, not this cycle's work. Apply any requested selector after
   establishing this approved set. Record requested, matched, eligible,
   already-automated, implemented, and ineligible TC ids.
   For every eligible `@visual` scenario, resolve its named baseline,
   rendering-only expectation, approved deterministic runner, viewport/theme/
   locale/timezone/font state, and any dynamic-region masks from case details
   and the active profile. Missing information blocks that TC.
3. Delegate implementation to the **e2e-scripter** agent when available with: the `@auto:now`
   scenario list (P1/wrong-data-risk first per the automation-plan), the
   `case-details.md` literals, and the locator inventory. It implements step
   definitions + page/component objects, then **adds `@automated` while
   retaining `@manual`** on each scenario whose steps are now runnable.
   `bddgen` selects `@automated`; `@manual` is not an exclusion. It must NOT
   delete the case or change scenario wording, order, existing tags, or
   expected behavior (business intent is fixed at design — mismatches go back
   to Case Forge). If unavailable, implement locally using the same contract.
4. Consult a relevant specialist only for the surfaces involved; use the
   **plotly-specialist** solely for chart work beyond existing accessors.
5. Verify the scripter's handover yourself:
   the configured `lintCases`, `lintCode`, `typecheck`, and `generateTests`
   commands, then run exactly the newly `@automated`
   scenarios using exact TC tags.
   All clean before this Script Forge cycle is `done` — the auditor gets a
   green branch, not a draft. Confirm the generated scenario set equals the
   non-performance `@automated` set exactly, each automated performance TC maps
   to runnable k6 code/evidence, and every manual-only scenario remains excluded.
6. Write `.probe/artifacts/<feature>/60-scripts/forge-notes.md`: files
   created/changed, scenario ↔ AIO-id map, which scenarios gained `@automated`
   vs remain manual-only, designed/automated/manual-only counts before and
   after the cycle, proof that every automated scenario still links to its
   original Jira AIO manual record/status, mock vs live mode used, and every
   TODO(testid)/TODO(env)/TODO(domain) added. For `@visual` scenarios also
   record the baseline names and paths, masks, deterministic environment,
   update command, comparison command, and attached expected/actual/diff
   evidence.
7. Update the ledger: Script Forge cycle `done`, branch name, selector, scenarios
   automated this cycle, designed/automated/manual-only counts before and
   after, unresolved dispositions, and the next planned cycle. Successive cycles
   must reduce unresolved inventory; a scoped cycle never claims feature-level
   scripting completion merely because its subset is green. Approved
   manual-permanent/deferred/retired/
   waived cases are not accidental backlog.

## Boundaries

- **Implement, don't author.** Every scenario already exists as approved,
  audited, gate-approved Gherkin. Script Forge writes step definitions + page objects
  behind it. A scenario that exists in no approved `.feature` file must not
  appear — new behavior goes back to Case Forge, not invented here.
- **Never delete a designed case or change scenario wording, order, existing
  tags, or expected behavior to fit the code.** The only permitted scenario-tag
  mutation is adding `@automated` when its implementation is runnable;
  permanent `@manual` remains. A code/scenario mismatch is a design defect —
  hand it back to Case Forge/Case Audit.
- Preserve each original Jira AIO manual test record, its manual status, and
  stable id. Automation is an additive scenario/result link on that record;
  adding `@automated` never authorizes deleting, replacing, or duplicating it.
- Critical-path scenarios must use the independent evidence layers approved in
  spec-analysis/case-details. These may be UI/API/DB/chart, state models,
  decision tables, contracts, reconciliation, events, audit records, or external
  stubs; never force chart + DB + oracle on an unrelated feature.
- When an expectation is calculated or business-rule-derived, invoke
  `/forge-oracle <feature-slug>` unless an approved oracle with the identical
  input contract and rules already exists. The wafer demo oracle is not a
  general YieldWerx oracle.
- **Visual scenarios preserve `@visual`.** Implement their rendering-only
  expectation with the active profile's approved screenshot matcher and named
  baseline. Apply approved dynamic-region masks only; do not mask the behavior
  under test. Generate or update baselines only in the profile's deterministic
  environment, run the profile's comparison command, and attach its required
  expected/actual/diff evidence. Keep data/number assertions in their
  complementary non-visual scenarios.
