---
name: audit-scripts
user-invocable: true
description: Use when a scripting branch is ready for independent adversarial review across its applicable UI, API, data, queue, policy, audit, integration, and chart contracts. A named QA Lead or Automation Engineer may explicitly waive the exact audit scope through /bypass-gate; the audit skill itself never creates or hides a waiver. PROBE Script Audit stage.
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

# Script Audit

## Why

Prevent brittle, self-passing, unsafe, or insufficiently evidenced automation
from entering the stability and merge gates.

## What

Independently audit implemented tests, automation abstractions, assertions,
data handling, and evidence against the approved cases and active profile.

## When

Run after each Script Forge cycle and rerun whenever an audit-driven code
change invalidates the previous result, unless a named allrounder explicitly
waives the exact current commit/file-hash scope through `/bypass-gate`.

## Where

Inspect the consumer branch, selected feature files, implementation code,
observability contracts, and `60-scripts` evidence; write `70-script-audit`.

## How

Freeze the exact TC and commit scope, run configured static checks, delegate
read-only review to the script auditor, rank findings by PROBE severity, and
fail closed on any unresolved high-risk issue.

Adversarial review of the automation branch. Independence rule: use the
**script-auditor** agent or another fresh independent reviewer with read-only
tools. If none is available, block; the forging context never self-certifies.

This skill never silently skips itself. If a named QA Lead or Automation
Engineer says to bypass Script Audit, stop this workflow and route the request
to `/bypass-gate <feature> script-audit`. That skill records
`waived — allrounder Script Audit bypass`, the exact TC inventory and
commit/file-hash manifest, the real findings or missing review, and residual
risk. A bare `approved`, `continue`, or Merge Gate bypass is not an audit bypass.

## Preconditions

- Script Forge is `done` in the ledger; an exact local commit or file-hash
  manifest exists. A remote push is not required for review.

## Procedure

1. Parse and record the optional selector. Reject unknown values or an empty
   selection. Mark Script Audit `in-progress` and capture the exact selected TC
   inventory plus commit/file-hash manifest.
2. Run the configured `lintCases` command with the same selectors;
   approved procedural Gherkin remains part of the automation contract.
3. Launch the **script-auditor** agent with the feature slug, branch, selector,
   and exact TC inventory. If an
   independent reviewer is unavailable, mark the audit blocked; never self-pass.
   It
   diffs against main, runs lint/typecheck/bddgen, verifies every designed
   scenario retains `@manual`, and proves the generated scenario set equals
   the `@automated` set while manual-only scenarios stay excluded. It returns findings
   (severity | file:line | rule | problem | fix) + PASS/FAIL verdict.
4. Persist verbatim to
   `.probe/artifacts/<feature>/70-script-audit/script-audit.md` with date +
   branch commit hash. Re-audits append; history stays.
5. FAIL → hand the blocker/high list back to /forge-scripts for rework; the
   ledger shows Script Audit `blocked (FAIL — rework Script Forge)`.
6. PASS → record severity counts. A scoped result is `subset PASS` for exact
   TC ids and does not certify scripts outside the selector. Feature-level
   `done (PASS)` requires a complete audit of the current automated set.

## Reference severities (full ladder in PROBE doc)

- Self-passing test (step performs via API what it should verify from the UI)
  → `blocker`
- Domain data/decision/action asserted with no independent approved truth source → `blocker`
- Raw CSS/XPath locator · hard wait · missing render sync · single-layer P1 ·
  broken traceability → `high`
- Missing permanent `@manual` or manual-only emitted by bddgen → `high`
- `@automated` without runnable steps, or runnable `@automated` absent from
  bddgen output → `blocker`
- Tag/label mistakes, fat steps, assertions in POMs → `medium`
- Naming/style → `low`/`info`

Apply only relevant surface rules. Audit API contracts and replay safety,
queue terminal states, DB isolation/reconciliation, authorization bypass,
audit/event evidence, file/schema handling, clock/timezone control, external
stubs, and recovery where applicable. Locator/render-sync rules apply only to
UI/chart scenarios. Record file hashes when auditing an uncommitted tree.
