---
name: audit-scripts
user-invocable: true
description: Use when you want an independent adversarial review of a scripting branch across its applicable UI, API, data, queue, policy, audit, integration, and chart contracts — self-passing tests, missing independent truth, brittle locators, unsafe retries, traceability breaks. Advisory: it produces findings for a human to weigh, holds no ledger gate row, and blocks nothing. Run it when it is useful, before the Merge Gate.
track: scripting
safety: writes-local
produces: .probe/artifacts/<feature>/70-script-audit/script-audit.md
consumes: branch e2e/<feature-slug>, features/<feature-slug>/*.feature, 20-cases/case-details.md, applicable observability contracts (40-ui-recon/locator-inventory.md only for UI), ${CLAUDE_PLUGIN_ROOT}/references/profiles/playwright-bdd/rules/
argument-hint: <feature-slug> [branch] [--scenario-type positive|functional|negative|edge|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Script Review (advisory)

## Why

A test that passes for the wrong reason is worse than no test, and the context
that wrote the automation is the worst placed to notice. A fresh reader catches
self-passing steps, missing independent truth, and brittle synchronisation while
they are still cheap to fix.

## What

An independent, read-only review of implemented tests, automation abstractions,
assertions, data handling, and evidence against the approved cases and the active
profile — findings ranked by severity, for a human to weigh.

## When

Run when it is useful: after a Script Forge cycle, before the Merge Gate, or when
something about a passing suite feels wrong. Rerun after a fix if you want the
delta reviewed.

## Where

Inspect the consumer branch, selected feature files, implementation code,
observability contracts, and `60-scripts` evidence; write findings to
`70-script-audit`.

## How

Freeze the exact TC and commit scope, run the configured static checks, delegate
read-only review to the script auditor, rank findings on the PROBE severity
ladder, and report them.

## This is advisory, not a gate

- It holds **no ledger gate row** and no stage status. Its artifact is linked from
  the Merge Gate's evidence digest.
- It **blocks nothing**. `/green-run` runs without it and the Merge Gate assembles
  without it; a review that was never run is one line in that gate's digest.
- It **needs no waiver**. There is nothing to bypass — a human either wants the
  review or does not.
- Its findings are **facts for a human to weigh**, not a verdict. Report severity
  honestly and let the Merge Gate's signer decide what each one is worth.

Independence is still the point. Use the **script-auditor** agent or another fresh
reviewer with read-only tools. If none is available, say so in the artifact and
report the findings as a self-review — a labelled self-review is useful; one
presented as independent is not.

## Preconditions

- Script Forge has produced code to review, and an exact local commit or
  file-hash manifest exists. A remote push is not required.

## Procedure

1. Parse and record the optional selector. Reject unknown values or an empty
   selection. Capture the exact selected TC inventory plus the commit or
   file-hash manifest.
2. Run the configured `lintCases` command with the same selectors; approved
   procedural Gherkin is part of the automation contract.
3. Launch the **script-auditor** agent with the feature slug, branch, selector,
   and exact TC inventory. It diffs against main, runs lint/typecheck/generation,
   verifies every designed scenario retains `@manual`, and checks that the
   generated scenario set equals the `@automated` set with manual-only scenarios
   excluded. It returns findings as
   `severity | file:line | rule | problem | fix`.
4. Persist the findings verbatim to
   `.probe/artifacts/<feature>/70-script-audit/script-audit.md` with the date and
   the branch commit hash. Do not soften, dedupe away, or reclassify a severity.
   Re-reviews append a new section; history stays so convergence is visible.
5. Report the `blocker` and `high` findings in chat with the file and the fix, so
   they can be acted on now. Rework goes through `/forge-scripts`.
6. Record the review's scope in the artifact header — feature-level or the exact
   TC subset — so the Merge Gate's digest can state what was and was not reviewed.

## Reference severities (full ladder in PROBE-PROCESS §5)

Severity here is a description of consequence, not an instruction to halt.

- Self-passing test (a step performs via API what it should verify from the UI)
  → `blocker`
- Domain data, decision, or action asserted with no independent approved truth
  source → `blocker`
- `@automated` without runnable steps, or a runnable `@automated` scenario absent
  from the generated set → `blocker`
- Raw CSS/XPath locator · hard wait · missing render sync · single-layer
  wrong-data-risk scenario · broken traceability → `high`
- Missing permanent `@manual`, or a manual-only scenario emitted by the generator
  → `high`
- Tag or label mistakes, fat steps, assertions in page objects → `medium`
- Naming and style → `low` / `info`

Apply only the relevant surface rules. Review API contracts and replay safety,
queue terminal states, DB isolation and reconciliation, authorisation bypass,
audit and event evidence, file and schema handling, clock and timezone control,
external stubs, and recovery where applicable. Locator and render-sync rules apply
only to UI and chart scenarios. Record file hashes when reviewing an uncommitted
tree.
