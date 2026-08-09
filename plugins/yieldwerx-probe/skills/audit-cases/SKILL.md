---
name: audit-cases
user-invocable: true
description: Use when designed test cases need adversarial review before the Design Gate — coverage vs spec, traceability completeness, step atomicity, negative/boundary depth, data feasibility. PROBE Case Audit stage. A named QA Lead or Automation Engineer may explicitly waive this stage through gate-design; the audit skill itself never creates or hides a waiver.
track: design
safety: writes-local
produces: .probe/artifacts/<feature>/30-case-audit/case-audit.md
consumes: features/<feature-slug>/*.feature (permanent @manual Gherkin; no @automated before scripting), 10-spec/spec-analysis.md, 20-cases/case-details.md, 20-cases/automation-plan.md, 20-cases/coverage-notes.md
argument-hint: <feature-slug> [--scenario-type positive|functional|negative|edge|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Case Audit

## Why

Catch missing coverage, unclear procedures, weak expected results, and
untraceable cases before a human approves the design.

## What

Perform an independent, read-only, adversarial review of the selected Gherkin
cases against approved requirements and case-design artifacts.

## When

Run after Case Forge and before the Design Gate, and rerun after any material
case amendment or failed audit, unless a named allrounder explicitly waives the
exact feature/category audit through `/gate-design`.

## Where

Read the configured consumer feature files plus `10-spec` and `20-cases`
artifacts; write findings to the feature's `30-case-audit` artifact and update
its ledger status.

## How

Resolve paths and selectors from consumer configuration, lint the exact scope,
delegate to the independent case auditor, classify actionable findings by
severity, and reconcile every finding without editing cases during the audit.

Adversarial review of the manual test cases. Run by a DIFFERENT mind than the
designer: delegate to the **test-case-auditor** agent. If an independent
reviewer is unavailable, mark the audit blocked; do not self-certify work from
the same context.

This skill never silently skips itself. If a named QA Lead or Automation
Engineer says to bypass Case Audit, stop this workflow and route the request to
`/gate-design`, which records `waived — allrounder Case Audit bypass`, the
reason, missing or failed evidence, and residual risk. A bare `approved`
statement is not an audit bypass.

## Preconditions

- For a feature-level audit, Case Forge is `done` in the ledger.
- For a scoped audit, the matching Case Forge cycle is complete, its scope
  manifest exists, and both input artifacts contain the selected TC ids.
  Refuse otherwise.

## Procedure

1. Parse the same selector contract as Case Forge. Reject an unknown or empty
   scope. Mark Case Audit `in-progress` and record whether it is subset or
   feature-level.
2. Run the configured `lintCases` command with the same selectors.
   Gherkin lint errors are audit findings and prevent PASS.
3. Launch the **test-case-auditor** agent with the feature slug and exact TC
   inventory selected. Require it to reconcile each selected category's
   `Visual candidates: ...` or `Visual: N/A — ...` disposition against the
   AC definitions, risk dimensions, **Where to check** entries, implementation
   observations, feature tags, and named baselines. It returns
   findings (severity | id | problem | fix) plus a PASS/FAIL verdict.
4. Write the findings verbatim to
   `.probe/artifacts/<feature>/30-case-audit/case-audit.md` — do not soften,
   dedupe away, or reclassify severities. Add a header with date and inputs'
   file hashes so the gate can prove what was audited.
5. If verdict is FAIL: list the `blocker`/`high` items in chat and hand back
   to `/update-cases` for existing-case rework, or `/forge-cases` only when the
   finding requires a genuinely new scenario. The audit re-runs after rework — append a new
   audit section, keep the old one (the trail shows convergence).
6. Update the ledger with per-severity counts. A scoped result is
   `subset PASS/FAIL` and lists exact TC ids; it never changes the feature-level
   Case Audit to `done`. Only the complete reconciled audit may record
   `done (PASS)`.

## Severity anchors (from the PROBE ladder)

- Uncovered wrong-data-risk AC (incorrect data, decision, persistence, action,
  authorization, alert, export, or lineage) → `blocker`
- Missing applicable risk case / broken traceability / infeasible evidence or
  truth strategy / a category missing a scenario type with no `N/A` reason /
  wrong-data-risk scenario parked
  `@auto:later` unjustified → `high`
- Missing permanent `@manual`, or premature `@automated` before runnable
  Script Forge implementation exists → `high`
- Rendering-only requirement (colorscale/legend/ink z-order/notch/layout) with
  no `@visual` scenario → `high` if the spec names it, else `medium`; a
  data/number assertion misfiled as a `@visual` pixel check → `high`
- Missing per-category visual disposition, a generic visual `N/A`, or an
  unnamed cross-category deferral → `high`; a named deferral whose target
  category is outside a scoped audit remains open and cannot be treated as
  feature-level proof
- Non-procedural steps a manual tester cannot execute, automation jargon in
  Gherkin, undefined Examples placeholders, or a vague expected value → `high`;
  a long but genuinely end-to-end procedural workflow is a reviewable `medium`,
  not an automatic failure
- Style/naming → `low`/`info`

Audit the feature dimensions recorded by Probe Spec: states, roles, versions,
ordering, retries, concurrency, auditability, isolation, contracts, recovery,
and observability where applicable. Validate approved terminal dispositions;
do not demand automation for a deliberately manual case merely because it exists.
